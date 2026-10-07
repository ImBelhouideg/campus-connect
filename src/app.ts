import express, { Router } from 'express';
import type { Container } from './container';
import { ticketRoutes } from './modules/tickets/ticket.routes';
import { asyncHandler, authenticate, currentUser, errorHandler, notFoundHandler, requireRole } from './shared/middlewares';
import path from 'node:path';

export function createApp(c: Container) {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => res.json({ status: 'ok', mode: c.mode }));

  const api = Router();
  api.use(authenticate(c.directory));

  // Référentiels (pour les listes déroulantes du formulaire de signalement)
  api.get('/locations', asyncHandler(async (_req, res) => res.json(await c.directory.listLocations())));
  api.get('/categories', asyncHandler(async (_req, res) => res.json(await c.directory.listCategories())));
  api.get('/technicians', requireRole('DISPATCHER', 'ADMIN'), asyncHandler(async (_req, res) => {
    const techs = await c.directory.listByRole('TECHNICIAN');
    res.json(techs.map(({ id, name, skills }) => ({ id, name, skills })));
  }));

  api.use('/tickets', ticketRoutes(c.tickets));

  api.get('/notifications', asyncHandler(async (req, res) => {
    res.json(await c.notifications.listFor(currentUser(req).id));
  }));

  api.get('/dashboard', requireRole('DISPATCHER', 'ADMIN'), asyncHandler(async (_req, res) => {
    res.json(await c.dashboard.summary());
  }));

  app.use('/api', api);
  app.use(express.static(path.join(process.cwd(), 'public')));  
  const publicDir = path.join(process.cwd(), 'public');
  app.use(express.static(publicDir));
  app.get('/', (_req, res) => res.sendFile(path.join(publicDir, 'index.html')));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
