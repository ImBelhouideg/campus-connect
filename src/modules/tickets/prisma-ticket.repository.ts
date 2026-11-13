import type { Prisma, PrismaClient } from '@prisma/client';
import { Ticket } from './domain/ticket';
import type { FeedbackRecord, TicketEventRecord, TicketFilter, TicketRepository } from './ticket.repository';

export class PrismaTicketRepository implements TicketRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(ticket: Ticket) {
    const { id, ...fields } = ticket.toSnapshot();
    await this.prisma.ticket.upsert({
      where: { id },
      create: { id, ...fields },
      update: fields,
    });
  }

  async findById(id: string) {
    const row = await this.prisma.ticket.findUnique({ where: { id } });
    return row ? Ticket.rehydrate(row) : null;
  }

  async findAll(filter: TicketFilter = {}) {
    const rows = await this.prisma.ticket.findMany({
      where: {
        status: filter.status,
        reporterId: filter.reporterId,
        technicianId: filter.technicianId,
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => Ticket.rehydrate(r));
  }

  async addEvent(e: TicketEventRecord) {
    await this.prisma.ticketEvent.create({
      data: {
        ticketId: e.ticketId,
        type: e.type,
        actorId: e.actorId,
        data: (e.data ?? undefined) as Prisma.InputJsonValue | undefined,
        at: e.at,
      },
    });
  }

  async listEvents(ticketId: string): Promise<TicketEventRecord[]> {
    const rows = await this.prisma.ticketEvent.findMany({ where: { ticketId }, orderBy: { at: 'asc' } });
    return rows.map((r) => ({
      ticketId: r.ticketId,
      type: r.type,
      actorId: r.actorId,
      data: r.data as Record<string, unknown> | null,
      at: r.at,
    }));
  }

  async saveFeedback(f: FeedbackRecord) {
    await this.prisma.feedback.upsert({
      where: { ticketId: f.ticketId },
      create: { ticketId: f.ticketId, rating: f.rating, comment: f.comment },
      update: { rating: f.rating, comment: f.comment },
    });
  }

  async findFeedback(ticketId: string): Promise<FeedbackRecord | null> {
    return this.prisma.feedback.findUnique({ where: { ticketId } });
  }

  async listFeedback(): Promise<FeedbackRecord[]> {
    return this.prisma.feedback.findMany();
  }
}
