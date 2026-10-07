import { NotFoundError, ValidationError } from '../../../shared/errors';
import type { Ticket } from '../domain/ticket';

export interface Technician {
  id: string;
  name: string;
  skills: string[];
  openTickets: number;
}

/** Pattern Strategy : plusieurs façons de choisir un technicien, interchangeables. */
export interface AssignmentStrategy {
  readonly name: string;
  pickTechnician(ticket: Ticket, technicians: Technician[]): Technician;
}

function leastLoaded(technicians: Technician[]): Technician {
  if (technicians.length === 0) throw new ValidationError('Aucun technicien disponible');
  return technicians.reduce((a, b) => (b.openTickets < a.openTickets ? b : a));
}

export class ManualStrategy implements AssignmentStrategy {
  readonly name = 'manual';
  constructor(private readonly technicianId: string | undefined) {}
  pickTechnician(_ticket: Ticket, technicians: Technician[]): Technician {
    if (!this.technicianId) throw new ValidationError('technicianId requis pour une affectation manuelle');
    const tech = technicians.find((t) => t.id === this.technicianId);
    if (!tech) throw new NotFoundError(`Technicien introuvable : ${this.technicianId}`);
    return tech;
  }
}

export class LeastLoadedStrategy implements AssignmentStrategy {
  readonly name = 'least-loaded';
  pickTechnician(_ticket: Ticket, technicians: Technician[]): Technician {
    return leastLoaded(technicians);
  }
}

/** Préfère les techniciens compétents dans la catégorie du ticket, puis le moins chargé. */
export class CategorySkillStrategy implements AssignmentStrategy {
  readonly name = 'category';
  pickTechnician(ticket: Ticket, technicians: Technician[]): Technician {
    const skilled = technicians.filter((t) => ticket.categoryId && t.skills.includes(ticket.categoryId));
    return leastLoaded(skilled.length > 0 ? skilled : technicians);
  }
}

export type StrategyName = 'manual' | 'least-loaded' | 'category';

export function buildStrategy(name: StrategyName, technicianId?: string): AssignmentStrategy {
  switch (name) {
    case 'manual':
      return new ManualStrategy(technicianId);
    case 'category':
      return new CategorySkillStrategy();
    case 'least-loaded':
      return new LeastLoadedStrategy();
  }
}
