import type { Category, DirectoryRepository, Location, Role, User } from './directory.repository';
import { CATEGORIES, LOCATIONS, USERS } from './seed-data';

export class InMemoryDirectoryRepository implements DirectoryRepository {
  async findUser(id: string): Promise<User | null> {
    return USERS.find((u) => u.id === id) ?? null;
  }
  async listByRole(role: Role): Promise<User[]> {
    return USERS.filter((u) => u.role === role);
  }
  async listLocations(): Promise<Location[]> {
    return LOCATIONS;
  }
  async findLocation(id: string): Promise<Location | null> {
    return LOCATIONS.find((l) => l.id === id) ?? null;
  }
  async listCategories(): Promise<Category[]> {
    return CATEGORIES;
  }
  async findCategory(id: string): Promise<Category | null> {
    return CATEGORIES.find((c) => c.id === id) ?? null;
  }
}
