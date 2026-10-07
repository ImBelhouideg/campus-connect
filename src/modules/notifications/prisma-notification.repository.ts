import type { PrismaClient } from '@prisma/client';
import type { Notification, NotificationRepository } from './notification.repository';

export class PrismaNotificationRepository implements NotificationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async add(userId: string, message: string) {
    await this.prisma.notification.create({ data: { userId, message } });
  }

  listFor(userId: string): Promise<Notification[]> {
    return this.prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }
}
