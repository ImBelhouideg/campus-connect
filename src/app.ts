import path from 'node:path';
import express, { Router } from 'express';
import type { Container } from './container';
import { ticketRoutes } from './modules/tickets/ticket.routes';
import { metricsMiddleware, register } from './observability/metrics';
import {
  asyncHandler,
  authenticate,
  currentUser,
  errorHandler,
  notFoundHandler,
  requireRole,
} from './shared/middlewares';

export function createApp(c: Container) {
  const app = express();
  app.use(metricsMiddleware);

  app.get('/metrics', async (_req, res, next) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    next(error);
  }
  });
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

  // Interface web
  const publicDir = path.join(process.cwd(), 'public');
  app.use(express.static(publicDir));
  app.get('/', (_req, res) => res.sendFile(path.join(publicDir, 'index.html')));
  
  // Gestion des routes inconnues et des erreurs
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

