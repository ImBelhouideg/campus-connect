import { DashboardService } from './modules/dashboard/dashboard.service';
import type { DirectoryRepository } from './modules/directory/directory.repository';
import { InMemoryDirectoryRepository } from './modules/directory/in-memory-directory.repository';
import { EmailConsoleChannel, InAppChannel, type NotificationChannel } from './modules/notifications/channels';
import { InMemoryNotificationRepository } from './modules/notifications/in-memory-notification.repository';
import { NotificationService } from './modules/notifications/notification.service';
import type { NotificationRepository } from './modules/notifications/notification.repository';
import { InMemoryTicketRepository } from './modules/tickets/in-memory-ticket.repository';
import { TicketService } from './modules/tickets/ticket.service';
import type { TicketRepository } from './modules/tickets/ticket.repository';
import { EventBus } from './shared/event-bus';

export type DataMode = 'memory' | 'prisma';

export interface Container {
  mode: DataMode;
  directory: DirectoryRepository;
  notifications: NotificationRepository;
  tickets: TicketService;
  dashboard: DashboardService;
  shutdown: () => Promise<void>;
}

/**
 * Composition root : seul endroit qui connaît les implémentations concrètes
 * (injection de dépendances « à la main »).
 */
export async function buildContainer(
  mode: DataMode = (process.env.DATA_MODE as DataMode) ?? 'memory',
  options: { emailConsole?: boolean } = {},
): Promise<Container> {
  let ticketRepo: TicketRepository;
  let directory: DirectoryRepository;
  let notificationRepo: NotificationRepository;
  let shutdown = async () => {};

  if (mode === 'prisma') {
    // Imports dynamiques : le mode memory fonctionne sans client Prisma généré
    const { PrismaClient } = await import('@prisma/client');
    const { PrismaTicketRepository } = await import('./modules/tickets/prisma-ticket.repository');
    const { PrismaDirectoryRepository } = await import('./modules/directory/prisma-directory.repository');
    const { PrismaNotificationRepository } = await import('./modules/notifications/prisma-notification.repository');
    const prisma = new PrismaClient();
    ticketRepo = new PrismaTicketRepository(prisma);
    directory = new PrismaDirectoryRepository(prisma);
    notificationRepo = new PrismaNotificationRepository(prisma);
    shutdown = () => prisma.$disconnect();
  } else {
    ticketRepo = new InMemoryTicketRepository();
    directory = new InMemoryDirectoryRepository();
    notificationRepo = new InMemoryNotificationRepository();
  }

  const events = new EventBus();

  // Abonné 1 : l'historique (TicketEvent)
  events.subscribe('*', (e) =>
    ticketRepo.addEvent({
      ticketId: e.ticketId,
      type: e.type,
      actorId: e.actorId,
      data: e.data,
      at: e.at,
    }),
  );

  // Abonné 2 : les notifications, via des canaux interchangeables
  const channels: NotificationChannel[] = [new InAppChannel(notificationRepo)];
  if (options.emailConsole) channels.push(new EmailConsoleChannel(directory));
  const notificationService = new NotificationService(directory, channels);
  events.subscribe('*', (e) => notificationService.handle(e));

  return {
    mode,
    directory,
    notifications: notificationRepo,
    tickets: new TicketService(ticketRepo, directory, events),
    dashboard: new DashboardService(ticketRepo, directory),
    shutdown,
  };
}
