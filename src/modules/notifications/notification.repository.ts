export interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

export interface NotificationRepository {
  add(userId: string, message: string): Promise<void>;
  listFor(userId: string): Promise<Notification[]>;
}
