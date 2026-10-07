import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { after, before, describe, test } from 'node:test';
import { createApp } from '../app';
import { buildContainer, type Container } from '../container';
import { Ticket } from '../modules/tickets/domain/ticket';
import { LeastLoadedStrategy } from '../modules/tickets/strategies/assignment';

// Les tests tournent en mode « memory » : pas besoin de PostgreSQL.
let container: Container;
let close: () => Promise<void>;
let base: string;

async function call(user: string | null, method: string, path: string, body?: unknown) {
  const res = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', ...(user ? { 'x-user-id': user } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { status: res.status, body: (await res.json()) as any };
}

before(async () => {
  container = await buildContainer('memory');
  const server = createApp(container).listen(0);
  await new Promise<void>((resolve) => server.once('listening', () => resolve()));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
  close = () => new Promise<void>((resolve) => server.close(() => resolve()));
});
after(async () => close());

describe('scénario principal de la démo', () => {
  test('signalement → qualification → affectation → traitement → résolution → clôture', async () => {
    // 1. L'étudiante signale une panne
    const created = await call('u-student', 'POST', '/tickets', {
      title: 'Projecteur en panne',
      description: 'Le projecteur de la salle 101 ne démarre plus',
      locationId: 'loc-a-101',
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.status, 'NEW');
    const id = created.body.id as string;

    // Le dispatcher a été notifié
    const dispatcherNotifs = await call('u-dispatcher', 'GET', '/notifications');
    assert.ok(dispatcherNotifs.body.some((n: { message: string }) => n.message.includes('Projecteur en panne')));

    // 2. Qualification
    const qualified = await call('u-dispatcher', 'PATCH', `/tickets/${id}/qualify`, {
      priority: 'HIGH',
      categoryId: 'cat-electricity',
    });
    assert.equal(qualified.body.status, 'QUALIFIED');
    assert.equal(qualified.body.priority, 'HIGH');

    // 3. Affectation automatique selon la compétence (stratégie « category »)
    const assigned = await call('u-dispatcher', 'POST', `/tickets/${id}/assign`, { strategy: 'category' });
    assert.equal(assigned.body.status, 'ASSIGNED');
    assert.equal(assigned.body.technicianId, 'u-tech-elec');

    // 4. Le technicien traite et résout
    assert.equal((await call('u-tech-elec', 'POST', `/tickets/${id}/start`)).body.status, 'IN_PROGRESS');
    const resolved = await call('u-tech-elec', 'POST', `/tickets/${id}/resolve`, { comment: 'Lampe remplacée' });
    assert.equal(resolved.body.status, 'RESOLVED');

    // La signaleuse est notifiée
    const studentNotifs = await call('u-student', 'GET', '/notifications');
    assert.ok(studentNotifs.body.some((n: { message: string }) => n.message.includes('est résolu')));

    // 5. Retour de la signaleuse : clôture + note
    const closed = await call('u-student', 'POST', `/tickets/${id}/feedback`, { rating: 5, comment: 'Rapide !' });
    assert.equal(closed.body.status, 'CLOSED');

    // Historique complet
    const detail = await call('u-student', 'GET', `/tickets/${id}`);
    assert.deepEqual(
      detail.body.events.map((e: { type: string }) => e.type),
      ['TicketCreated', 'TicketQualified', 'TicketAssigned', 'TicketStarted', 'TicketResolved', 'TicketClosed'],
    );
    assert.equal(detail.body.feedback.rating, 5);

    // 6. Dashboard
    const dash = await call('u-dispatcher', 'GET', '/dashboard');
    assert.equal(dash.status, 200);
    assert.equal(dash.body.byStatus.CLOSED, 1);
    assert.equal(dash.body.avgRating, 5);
  });

  test('une transition interdite est refusée par le pattern State (409)', async () => {
    const created = await call('u-student', 'POST', '/tickets', {
      title: 'Fuite dans les toilettes',
      description: 'Une fuite au rez-de-chaussée',
      locationId: 'loc-lib-hall',
    });
    // Affecter un ticket jamais qualifié est impossible
    const res = await call('u-dispatcher', 'POST', `/tickets/${created.body.id}/assign`, { strategy: 'least-loaded' });
    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, 'INVALID_TRANSITION');
  });

  test('une résolution refusée peut être rouverte par le signaleur', async () => {
    const { body } = await call('u-student', 'POST', '/tickets', {
      title: 'Wifi instable',
      description: 'Le wifi coupe toutes les 5 minutes',
      locationId: 'loc-b-amphi',
    });
    await call('u-dispatcher', 'PATCH', `/tickets/${body.id}/qualify`, { priority: 'MEDIUM', categoryId: 'cat-it' });
    await call('u-dispatcher', 'POST', `/tickets/${body.id}/assign`, { strategy: 'manual', technicianId: 'u-tech-it' });
    await call('u-tech-it', 'POST', `/tickets/${body.id}/start`);
    await call('u-tech-it', 'POST', `/tickets/${body.id}/resolve`, {});
    const reopened = await call('u-student', 'POST', `/tickets/${body.id}/reopen`, { reason: 'Toujours instable' });
    assert.equal(reopened.body.status, 'ASSIGNED');
    assert.equal(reopened.body.resolvedAt, null);
  });
});

describe('sécurité et validation', () => {
  test('sans en-tête x-user-id → 401', async () => {
    assert.equal((await call(null, 'GET', '/tickets')).status, 401);
  });

  test('un signaleur ne peut pas qualifier un ticket → 403', async () => {
    const res = await call('u-student', 'PATCH', '/tickets/xxx/qualify', { priority: 'LOW', categoryId: 'cat-it' });
    assert.equal(res.status, 403);
  });

  test('un signaleur ne voit que ses propres tickets', async () => {
    const mine = await call('u-student', 'GET', '/tickets');
    assert.ok(mine.body.every((t: { reporterId: string }) => t.reporterId === 'u-student'));
  });

  test('données invalides → 400', async () => {
    const res = await call('u-student', 'POST', '/tickets', { title: 'x', description: '', locationId: 'loc-a-101' });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });
});

describe('stratégies d’affectation', () => {
  test('LeastLoadedStrategy choisit le technicien le moins chargé', () => {
    const ticket = Ticket.create({ title: 't', description: 'desc', locationId: 'l', reporterId: 'r' });
    const picked = new LeastLoadedStrategy().pickTechnician(ticket, [
      { id: 'a', name: 'A', skills: [], openTickets: 4 },
      { id: 'b', name: 'B', skills: [], openTickets: 1 },
    ]);
    assert.equal(picked.id, 'b');
  });
});
