import { Ticket } from './domain/ticket';
import type { TicketSnapshot } from './domain/ticket.types';
import type { FeedbackRecord, TicketEventRecord, TicketFilter, TicketRepository } from './ticket.repository';

export class InMemoryTicketRepository implements TicketRepository {
  private tickets = new Map<string, TicketSnapshot>();
  private events: TicketEventRecord[] = [];
  private feedbacks = new Map<string, FeedbackRecord>();

  async save(ticket: Ticket) {
    this.tickets.set(ticket.id, ticket.toSnapshot());
  }

  async findById(id: string) {
    const snap = this.tickets.get(id);
    return snap ? Ticket.rehydrate({ ...snap }) : null; // copie : comme une vraie base
  }

  async findAll(filter: TicketFilter = {}) {
    return [...this.tickets.values()]
      .filter((s) => !filter.status || s.status === filter.status)
      .filter((s) => !filter.reporterId || s.reporterId === filter.reporterId)
      .filter((s) => !filter.technicianId || s.technicianId === filter.technicianId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((s) => Ticket.rehydrate({ ...s }));
  }

  async addEvent(event: TicketEventRecord) {
    this.events.push(event);
  }

  async listEvents(ticketId: string) {
    return this.events.filter((e) => e.ticketId === ticketId);
  }

  async saveFeedback(feedback: FeedbackRecord) {
    this.feedbacks.set(feedback.ticketId, feedback);
  }

  async findFeedback(ticketId: string) {
    return this.feedbacks.get(ticketId) ?? null;
  }

  async listFeedback() {
    return [...this.feedbacks.values()];
  }
}
