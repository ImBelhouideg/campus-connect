export const TICKET_STATUSES = [
  'NEW',
  'QUALIFIED',
  'ASSIGNED',
  'IN_PROGRESS',
  'RESOLVED',
  'CLOSED',
  'REJECTED',
] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
export type Priority = (typeof PRIORITIES)[number];

export interface QualifyData {
  priority: Priority;
  categoryId: string;
}

/** Représentation « à plat » du ticket (ce qui est stocké en base). */
export interface TicketSnapshot {
  id: string;
  title: string;
  description: string;
  locationId: string;
  categoryId: string | null;
  priority: Priority;
  status: TicketStatus;
  reporterId: string;
  technicianId: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
}
