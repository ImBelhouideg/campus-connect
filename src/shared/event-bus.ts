export type EventType =
  | 'TicketCreated'
  | 'TicketQualified'
  | 'TicketRejected'
  | 'TicketAssigned'
  | 'TicketStarted'
  | 'TicketResolved'
  | 'TicketClosed'
  | 'TicketReopened';

export interface DomainEvent {
  type: EventType;
  ticketId: string;
  ticketTitle: string;
  actorId: string;
  reporterId: string;
  technicianId: string | null;
  data: Record<string, unknown> | null;
  at: Date;
}

export type NewDomainEvent = Omit<DomainEvent, 'at'>;
type Handler = (event: DomainEvent) => Promise<void> | void;

/**
 * Pattern Observer / Pub-Sub : le métier publie, les autres modules
 * (historique, notifications...) s'abonnent sans que le service les connaisse.
 */
export class EventBus {
  private handlers: { type: EventType | '*'; handler: Handler }[] = [];

  subscribe(type: EventType | '*', handler: Handler): void {
    this.handlers.push({ type, handler });
  }

  async publish(input: NewDomainEvent): Promise<DomainEvent> {
    const event: DomainEvent = { ...input, at: new Date() };
    const matching = this.handlers.filter((h) => h.type === '*' || h.type === event.type);
    const results = await Promise.allSettled(matching.map(async (h) => h.handler(event)));
    for (const r of results) {
      if (r.status === 'rejected') console.error('[EventBus] handler en erreur :', r.reason);
    }
    return event;
  }
}
