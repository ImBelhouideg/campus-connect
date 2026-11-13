import { ForbiddenError, NotFoundError, ValidationError } from '../../shared/errors';
import type { EventBus, EventType } from '../../shared/event-bus';
import type { DirectoryRepository, User } from '../directory/directory.repository';
import { Ticket } from './domain/ticket';
import type { TicketStatus } from './domain/ticket.types';
import type { AssignDto, CreateTicketDto, FeedbackDto, QualifyDto } from './dto';
import { buildStrategy, type Technician } from './strategies/assignment';
import type { FeedbackRecord, TicketEventRecord, TicketRepository } from './ticket.repository';

export interface TicketDetails {
  ticket: Ticket;
  events: TicketEventRecord[];
  feedback: FeedbackRecord | null;
}

const OPEN_STATUSES: TicketStatus[] = ['ASSIGNED', 'IN_PROGRESS'];

/**
 * Orchestre les cas d'utilisation : charger → appeler le domaine → sauvegarder → publier.
 * Aucune règle de transition ici : elles sont dans les états du Ticket.
 */
export class TicketService {
  constructor(
    private readonly repo: TicketRepository,
    private readonly directory: DirectoryRepository,
    private readonly events: EventBus,
  ) {}

  async create(actor: User, dto: CreateTicketDto): Promise<Ticket> {
    if (!(await this.directory.findLocation(dto.locationId))) {
      throw new ValidationError(`Localisation inconnue : ${dto.locationId}`);
    }
    const ticket = Ticket.create({ ...dto, reporterId: actor.id });
    await this.commit(ticket, 'TicketCreated', actor);
    return ticket;
  }

  async list(actor: User, status?: TicketStatus): Promise<Ticket[]> {
    if (actor.role === 'REPORTER') return this.repo.findAll({ status, reporterId: actor.id });
    if (actor.role === 'TECHNICIAN') return this.repo.findAll({ status, technicianId: actor.id });
    return this.repo.findAll({ status });
  }

  async get(actor: User, id: string): Promise<TicketDetails> {
    const ticket = await this.load(id);
    this.assertCanView(actor, ticket);
    const [events, feedback] = await Promise.all([this.repo.listEvents(id), this.repo.findFeedback(id)]);
    return { ticket, events, feedback };
  }

  async qualify(actor: User, id: string, dto: QualifyDto): Promise<Ticket> {
    if (!(await this.directory.findCategory(dto.categoryId))) {
      throw new ValidationError(`Catégorie inconnue : ${dto.categoryId}`);
    }
    const ticket = await this.load(id);
    ticket.qualify(dto);
    await this.commit(ticket, 'TicketQualified', actor, dto);
    return ticket;
  }

  async reject(actor: User, id: string, reason: string): Promise<Ticket> {
    const ticket = await this.load(id);
    ticket.reject();
    await this.commit(ticket, 'TicketRejected', actor, { reason });
    return ticket;
  }

  async assign(actor: User, id: string, dto: AssignDto): Promise<Ticket> {
    const ticket = await this.load(id);
    const strategy = buildStrategy(dto.strategy, dto.technicianId);
    const technician = strategy.pickTechnician(ticket, await this.technicians());
    ticket.assign(technician.id);
    await this.commit(ticket, 'TicketAssigned', actor, {
      strategy: strategy.name,
      technicianId: technician.id,
      technicianName: technician.name,
    });
    return ticket;
  }

  async start(actor: User, id: string): Promise<Ticket> {
    const ticket = await this.load(id);
    this.assertAssignee(actor, ticket);
    ticket.start();
    await this.commit(ticket, 'TicketStarted', actor);
    return ticket;
  }

  async resolve(actor: User, id: string, comment?: string): Promise<Ticket> {
    const ticket = await this.load(id);
    this.assertAssignee(actor, ticket);
    ticket.resolve();
    await this.commit(ticket, 'TicketResolved', actor, comment ? { comment } : undefined);
    return ticket;
  }

  /** Le signaleur confirme et note : le ticket passe à CLOSED. */
  async submitFeedback(actor: User, id: string, dto: FeedbackDto): Promise<Ticket> {
    const ticket = await this.load(id);
    this.assertReporter(actor, ticket);
    ticket.close();
    await this.repo.saveFeedback({
      ticketId: id,
      rating: dto.rating,
      comment: dto.comment ?? null,
      createdAt: new Date(),
    });
    await this.commit(ticket, 'TicketClosed', actor, { rating: dto.rating });
    return ticket;
  }

  async reopen(actor: User, id: string, reason: string): Promise<Ticket> {
    const ticket = await this.load(id);
    this.assertReporter(actor, ticket);
    ticket.reopen();
    await this.commit(ticket, 'TicketReopened', actor, { reason });
    return ticket;
  }

  // --- helpers -------------------------------------------------------------

  private async load(id: string): Promise<Ticket> {
    const ticket = await this.repo.findById(id);
    if (!ticket) throw new NotFoundError(`Ticket introuvable : ${id}`);
    return ticket;
  }

  private async commit(ticket: Ticket, type: EventType, actor: User, data?: Record<string, unknown>) {
    await this.repo.save(ticket);
    await this.events.publish({
      type,
      ticketId: ticket.id,
      ticketTitle: ticket.title,
      actorId: actor.id,
      reporterId: ticket.reporterId,
      technicianId: ticket.technicianId,
      data: data ?? null,
    });
  }

  /** Techniciens avec leur charge actuelle (tickets assignés ou en cours). */
  private async technicians(): Promise<Technician[]> {
    const [users, all] = await Promise.all([this.directory.listByRole('TECHNICIAN'), this.repo.findAll()]);
    return users.map((u) => ({
      id: u.id,
      name: u.name,
      skills: u.skills,
      openTickets: all.filter((t) => t.technicianId === u.id && OPEN_STATUSES.includes(t.status)).length,
    }));
  }

  private assertCanView(actor: User, ticket: Ticket) {
    if (actor.role === 'REPORTER' && ticket.reporterId !== actor.id) throw new ForbiddenError('Ce ticket ne vous appartient pas');
    if (actor.role === 'TECHNICIAN' && ticket.technicianId !== actor.id) throw new ForbiddenError('Ce ticket ne vous est pas assigné');
  }

  private assertAssignee(actor: User, ticket: Ticket) {
    if (ticket.technicianId !== actor.id) throw new ForbiddenError('Seul le technicien assigné peut faire cette action');
  }

  private assertReporter(actor: User, ticket: Ticket) {
    if (ticket.reporterId !== actor.id) throw new ForbiddenError('Seul le signaleur peut faire cette action');
  }
}
