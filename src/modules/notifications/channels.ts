import type { DirectoryRepository } from '../directory/directory.repository';
import type { NotificationRepository } from './notification.repository';

/** Pattern Adapter : chaque moyen d'envoi se cache derrière la même interface. */
export interface NotificationChannel {
  readonly name: string;
  send(userId: string, message: string): Promise<void>;
}

/** Centre de notifications dans l'application. */
export class InAppChannel implements NotificationChannel {
  readonly name = 'in-app';
  constructor(private readonly repo: NotificationRepository) {}
  async send(userId: string, message: string) {
    await this.repo.add(userId, message);
  }
}

/** Simule un email en l'affichant dans la console (à remplacer par nodemailer / un SMTP). */
export class EmailConsoleChannel implements NotificationChannel {
  readonly name = 'email-console';
  constructor(private readonly directory: DirectoryRepository) {}
  async send(userId: string, message: string) {
    const user = await this.directory.findUser(userId);
    if (user) console.log(`[email → ${user.email}] ${message}`);
  }
}
