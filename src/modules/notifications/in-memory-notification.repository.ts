import { randomUUID } from 'node:crypto';
import type { Notification, NotificationRepository } from './notification.repository';

export class InMemoryNotificationRepository implements NotificationRepository {
  private items: Notification[] = [];

  async add(userId: string, message: string) {
    this.items.push({ id: randomUUID(), userId, message, read: false, createdAt: new Date() });
  }

  async listFor(userId: string) {
    return this.items.filter((n) => n.userId === userId).reverse();
  }
}
