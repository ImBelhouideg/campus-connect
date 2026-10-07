import { z } from 'zod';
import { PRIORITIES, TICKET_STATUSES } from './domain/ticket.types';

export const createTicketDto = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(5).max(2000),
  locationId: z.string().min(1),
});
export const qualifyDto = z.object({
  priority: z.enum(PRIORITIES),
  categoryId: z.string().min(1),
});
export const rejectDto = z.object({ reason: z.string().trim().min(3).max(500) });
export const assignDto = z.object({
  strategy: z.enum(['manual', 'least-loaded', 'category']).default('least-loaded'),
  technicianId: z.string().optional(),
});
export const resolveDto = z.object({ comment: z.string().trim().max(1000).optional() });
export const feedbackDto = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional(),
});
export const reopenDto = z.object({ reason: z.string().trim().min(3).max(500) });
export const listQuery = z.object({ status: z.enum(TICKET_STATUSES).optional() });

export type CreateTicketDto = z.infer<typeof createTicketDto>;
export type QualifyDto = z.infer<typeof qualifyDto>;
export type AssignDto = z.infer<typeof assignDto>;
export type FeedbackDto = z.infer<typeof feedbackDto>;
