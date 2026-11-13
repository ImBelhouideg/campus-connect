import { InvalidTransitionError } from '../../../shared/errors';
import type { Ticket } from './ticket';
import type { QualifyData, TicketStatus } from './ticket.types';

/**
 * Pattern State : chaque statut est une classe qui sait quelles transitions
 * il autorise. Le Ticket délègue à son état courant, sans if/else sur le statut.
 */
export interface TicketState {
  readonly status: TicketStatus;
  qualify(ticket: Ticket, data: QualifyData): void;
  reject(ticket: Ticket): void;
  assign(ticket: Ticket, technicianId: string): void;
  start(ticket: Ticket): void;
  resolve(ticket: Ticket): void;
  close(ticket: Ticket): void;
  reopen(ticket: Ticket): void;
}

/** Refuse toutes les transitions par défaut ; les états concrets redéfinissent les leurs. */
abstract class BaseState implements TicketState {
  abstract readonly status: TicketStatus;
  qualify(_t: Ticket, _d: QualifyData): void { throw new InvalidTransitionError(this.status, 'qualify'); }
  reject(_t: Ticket): void { throw new InvalidTransitionError(this.status, 'reject'); }
  assign(_t: Ticket, _id: string): void { throw new InvalidTransitionError(this.status, 'assign'); }
  start(_t: Ticket): void { throw new InvalidTransitionError(this.status, 'start'); }
  resolve(_t: Ticket): void { throw new InvalidTransitionError(this.status, 'resolve'); }
  close(_t: Ticket): void { throw new InvalidTransitionError(this.status, 'close'); }
  reopen(_t: Ticket): void { throw new InvalidTransitionError(this.status, 'reopen'); }
}

export class NewState extends BaseState {
  readonly status = 'NEW' as const;
  qualify(t: Ticket, d: QualifyData) {
    t.priority = d.priority;
    t.categoryId = d.categoryId;
    t.setState(new QualifiedState());
  }
  reject(t: Ticket) {
    t.setState(new RejectedState());
  }
}

export class QualifiedState extends BaseState {
  readonly status = 'QUALIFIED' as const;
  qualify(t: Ticket, d: QualifyData) {
    t.priority = d.priority;
    t.categoryId = d.categoryId;
  }
  reject(t: Ticket) {
    t.setState(new RejectedState());
  }
  assign(t: Ticket, technicianId: string) {
    t.technicianId = technicianId;
    t.setState(new AssignedState());
  }
}

export class AssignedState extends BaseState {
  readonly status = 'ASSIGNED' as const;
  assign(t: Ticket, technicianId: string) {
    t.technicianId = technicianId; // réaffectation
  }
  start(t: Ticket) {
    t.setState(new InProgressState());
  }
}

export class InProgressState extends BaseState {
  readonly status = 'IN_PROGRESS' as const;
  resolve(t: Ticket) {
    t.resolvedAt = new Date();
    t.setState(new ResolvedState());
  }
}

export class ResolvedState extends BaseState {
  readonly status = 'RESOLVED' as const;
  close(t: Ticket) {
    t.setState(new ClosedState());
  }
  reopen(t: Ticket) {
    t.resolvedAt = null;
    t.setState(new AssignedState()); // retourne chez le même technicien
  }
}

export class ClosedState extends BaseState {
  readonly status = 'CLOSED' as const;
}

export class RejectedState extends BaseState {
  readonly status = 'REJECTED' as const;
}

const FACTORY: Record<TicketStatus, () => TicketState> = {
  NEW: () => new NewState(),
  QUALIFIED: () => new QualifiedState(),
  ASSIGNED: () => new AssignedState(),
  IN_PROGRESS: () => new InProgressState(),
  RESOLVED: () => new ResolvedState(),
  CLOSED: () => new ClosedState(),
  REJECTED: () => new RejectedState(),
};

/** Reconstruit l'objet état à partir du statut stocké en base. */
export function stateFromStatus(status: TicketStatus): TicketState {
  return FACTORY[status]();
}
