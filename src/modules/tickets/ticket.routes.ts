import { Router } from 'express';
import { asyncHandler, currentUser, requireRole } from '../../shared/middlewares';
import {
  assignDto,
  createTicketDto,
  feedbackDto,
  listQuery,
  qualifyDto,
  rejectDto,
  reopenDto,
  resolveDto,
} from './dto';
import type { TicketService } from './ticket.service';

/**
 * Couche Controller : traduit HTTP ↔ service (validation, rôles, codes de réponse).
 * Aucune logique métier ici.
 */
export function ticketRoutes(service: TicketService): Router {
  const r = Router();
  const dispatcher = requireRole('DISPATCHER', 'ADMIN');

  r.post('/', asyncHandler(async (req, res) => {
    const ticket = await service.create(currentUser(req), createTicketDto.parse(req.body));
    res.status(201).json(ticket);
  }));

  r.get('/', asyncHandler(async (req, res) => {
    const { status } = listQuery.parse(req.query);
    res.json(await service.list(currentUser(req), status));
  }));

  r.get('/:id', asyncHandler(async (req, res) => {
    const { ticket, events, feedback } = await service.get(currentUser(req), String(req.params.id));
    res.json({ ...ticket.toSnapshot(), events, feedback });
  }));

  r.patch('/:id/qualify', dispatcher, asyncHandler(async (req, res) => {
    res.json(await service.qualify(currentUser(req), String(req.params.id), qualifyDto.parse(req.body)));
  }));

  r.post('/:id/reject', dispatcher, asyncHandler(async (req, res) => {
    res.json(await service.reject(currentUser(req), String(req.params.id), rejectDto.parse(req.body).reason));
  }));

  r.post('/:id/assign', dispatcher, asyncHandler(async (req, res) => {
    res.json(await service.assign(currentUser(req), String(req.params.id), assignDto.parse(req.body)));
  }));

  r.post('/:id/start', requireRole('TECHNICIAN'), asyncHandler(async (req, res) => {
    res.json(await service.start(currentUser(req), String(req.params.id)));
  }));

  r.post('/:id/resolve', requireRole('TECHNICIAN'), asyncHandler(async (req, res) => {
    const { comment } = resolveDto.parse(req.body ?? {});
    res.json(await service.resolve(currentUser(req), String(req.params.id), comment));
  }));

  r.post('/:id/feedback', requireRole('REPORTER'), asyncHandler(async (req, res) => {
    res.json(await service.submitFeedback(currentUser(req), String(req.params.id), feedbackDto.parse(req.body)));
  }));

  r.post('/:id/reopen', requireRole('REPORTER'), asyncHandler(async (req, res) => {
    res.json(await service.reopen(currentUser(req), String(req.params.id), reopenDto.parse(req.body).reason));
  }));

  return r;
}
