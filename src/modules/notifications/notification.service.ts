import type { DomainEvent } from '../../shared/event-bus';
import type { DirectoryRepository } from '../directory/directory.repository';
import type { NotificationChannel } from './channels';

/** Abonné de l'EventBus : transforme un événement métier en notifications. */
export class NotificationService {
  constructor(
    private readonly directory: DirectoryRepository,
    private readonly channels: NotificationChannel[],
  ) {}

  async handle(event: DomainEvent): Promise<void> {
    const recipients = [...new Set(await this.recipients(event))].filter((id) => id !== event.actorId);
    const message = this.message(event);
    for (const userId of recipients) {
      for (const channel of this.channels) await channel.send(userId, message);
    }
  }

  private async recipients(e: DomainEvent): Promise<string[]> {
    switch (e.type) {
      case 'TicketCreated':
        return (await this.directory.listByRole('DISPATCHER')).map((u) => u.id);
      case 'TicketQualified':
      case 'TicketRejected':
      case 'TicketStarted':
      case 'TicketResolved':
        return [e.reporterId];
      case 'TicketAssigned':
        return [e.reporterId, ...(e.technicianId ? [e.technicianId] : [])];
      case 'TicketClosed':
      case 'TicketReopened':
        return e.technicianId ? [e.technicianId] : [];
    }
  }

  private message(e: DomainEvent): string {
    const t = `« ${e.ticketTitle} »`;
    switch (e.type) {
      case 'TicketCreated': return `Nouveau ticket à traiter : ${t}`;
      case 'TicketQualified': return `Votre ticket ${t} a été qualifié`;
      case 'TicketRejected': return `Votre ticket ${t} a été rejeté`;
      case 'TicketAssigned': return `Le ticket ${t} a été assigné à un technicien`;
      case 'TicketStarted': return `Le traitement de ${t} a commencé`;
      case 'TicketResolved': return `Votre ticket ${t} est résolu : merci de confirmer et de le noter`;
      case 'TicketClosed': return `Le ticket ${t} a été clôturé`;
      case 'TicketReopened': return `Le ticket ${t} a été rouvert, il est de nouveau à traiter`;
    }
  }
}
