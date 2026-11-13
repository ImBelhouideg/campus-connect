import type { Ticket } from './domain/ticket';
import type { TicketStatus } from './domain/ticket.types';

export interface TicketFilter {
  status?: TicketStatus;
  reporterId?: string;
  technicianId?: string;
}

export interface TicketEventRecord {
  ticketId: string;
  type: string;
  actorId: string;
  data: Record<string, unknown> | null;
  at: Date;
}

export interface FeedbackRecord {
  ticketId: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
}

/**
 * Pattern Repository : le service ne connaît que ce contrat.
 * Implémentations : PrismaTicketRepository (PostgreSQL) et InMemoryTicketRepository (tests / démo rapide).
 */
export interface TicketRepository {
  save(ticket: Ticket): Promise<void>; // insert ou update
  findById(id: string): Promise<Ticket | null>;
  findAll(filter?: TicketFilter): Promise<Ticket[]>;
  addEvent(event: TicketEventRecord): Promise<void>;
  listEvents(ticketId: string): Promise<TicketEventRecord[]>;
  saveFeedback(feedback: FeedbackRecord): Promise<void>;
  findFeedback(ticketId: string): Promise<FeedbackRecord | null>;
  listFeedback(): Promise<FeedbackRecord[]>;
}
