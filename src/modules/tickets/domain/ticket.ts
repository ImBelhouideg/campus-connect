import { randomUUID } from 'node:crypto';
import { stateFromStatus, type TicketState } from './states';
import type { Priority, QualifyData, TicketSnapshot, TicketStatus } from './ticket.types';

/** Entité du domaine : les règles de transition vivent dans les états. */
export class Ticket {
  readonly id: string;
  title: string;
  description: string;
  readonly locationId: string;
  readonly reporterId: string;
  readonly createdAt: Date;
  categoryId: string | null;
  priority: Priority;
  technicianId: string | null;
  resolvedAt: Date | null;
  private state: TicketState;

  private constructor(s: TicketSnapshot) {
    this.id = s.id;
    this.title = s.title;
    this.description = s.description;
    this.locationId = s.locationId;
    this.reporterId = s.reporterId;
    this.createdAt = s.createdAt;
    this.categoryId = s.categoryId;
    this.priority = s.priority;
    this.technicianId = s.technicianId;
    this.resolvedAt = s.resolvedAt;
    this.state = stateFromStatus(s.status);
  }

  static create(input: { title: string; description: string; locationId: string; reporterId: string }): Ticket {
    return new Ticket({
      id: randomUUID(),
      ...input,
      categoryId: null,
      priority: 'MEDIUM',
      status: 'NEW',
      technicianId: null,
      createdAt: new Date(),
      resolvedAt: null,
    });
  }

  static rehydrate(snapshot: TicketSnapshot): Ticket {
    return new Ticket(snapshot);
  }

  get status(): TicketStatus {
    return this.state.status;
  }

  // Les actions sont déléguées à l'état courant
  qualify(data: QualifyData) { this.state.qualify(this, data); }
  reject() { this.state.reject(this); }
  assign(technicianId: string) { this.state.assign(this, technicianId); }
  start() { this.state.start(this); }
  resolve() { this.state.resolve(this); }
  close() { this.state.close(this); }
  reopen() { this.state.reopen(this); }

  /** Appelé par les états uniquement. */
  setState(state: TicketState) {
    this.state = state;
  }

  toSnapshot(): TicketSnapshot {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      locationId: this.locationId,
      categoryId: this.categoryId,
      priority: this.priority,
      status: this.status,
      reporterId: this.reporterId,
      technicianId: this.technicianId,
      createdAt: this.createdAt,
      resolvedAt: this.resolvedAt,
    };
  }

  toJSON() {
    return this.toSnapshot();
  }
}
