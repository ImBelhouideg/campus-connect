import type { PrismaClient } from '@prisma/client';
import type { Category, DirectoryRepository, Location, Role, User } from './directory.repository';

export class PrismaDirectoryRepository implements DirectoryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findUser(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }
  listByRole(role: Role): Promise<User[]> {
    return this.prisma.user.findMany({ where: { role }, orderBy: { name: 'asc' } });
  }
  listLocations(): Promise<Location[]> {
    return this.prisma.location.findMany({ orderBy: [{ building: 'asc' }, { room: 'asc' }] });
  }
  findLocation(id: string): Promise<Location | null> {
    return this.prisma.location.findUnique({ where: { id } });
  }
  listCategories(): Promise<Category[]> {
    return this.prisma.category.findMany({ orderBy: { name: 'asc' } });
  }
  findCategory(id: string): Promise<Category | null> {
    return this.prisma.category.findUnique({ where: { id } });
  }
}
