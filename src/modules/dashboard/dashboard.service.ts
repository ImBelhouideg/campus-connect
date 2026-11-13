import type { DirectoryRepository } from '../directory/directory.repository';
import { PRIORITIES, TICKET_STATUSES } from '../tickets/domain/ticket.types';
import type { TicketRepository } from '../tickets/ticket.repository';

const round = (n: number, digits = 2) => Math.round(n * 10 ** digits) / 10 ** digits;

export class DashboardService {
  constructor(
    private readonly repo: TicketRepository,
    private readonly directory: DirectoryRepository,
  ) {}

  async summary() {
    const [tickets, categories, feedback] = await Promise.all([
      this.repo.findAll(),
      this.directory.listCategories(),
      this.repo.listFeedback(),
    ]);

    const byStatus = Object.fromEntries(TICKET_STATUSES.map((s) => [s, tickets.filter((t) => t.status === s).length]));
    const byPriority = Object.fromEntries(PRIORITIES.map((p) => [p, tickets.filter((t) => t.priority === p).length]));
    const byCategory = categories.map((c) => ({
      category: c.name,
      count: tickets.filter((t) => t.categoryId === c.id).length,
    }));

    const durationsH = tickets
      .filter((t) => t.resolvedAt)
      .map((t) => (t.resolvedAt!.getTime() - t.createdAt.getTime()) / 3_600_000);

    return {
      total: tickets.length,
      open: tickets.filter((t) => !['CLOSED', 'REJECTED'].includes(t.status)).length,
      byStatus,
      byPriority,
      byCategory,
      avgResolutionHours: durationsH.length ? round(durationsH.reduce((a, b) => a + b, 0) / durationsH.length) : null,
      avgRating: feedback.length ? round(feedback.reduce((a, f) => a + f.rating, 0) / feedback.length) : null,
      feedbackCount: feedback.length,
    };
  }
}
