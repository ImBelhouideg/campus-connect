export type Role = 'REPORTER' | 'DISPATCHER' | 'TECHNICIAN' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  skills: string[];
}

export interface Location {
  id: string;
  building: string;
  floor: string;
  room: string;
}

export interface Category {
  id: string;
  name: string;
}

/** Utilisateurs et référentiels (localisations, catégories). */
export interface DirectoryRepository {
  findUser(id: string): Promise<User | null>;
  listByRole(role: Role): Promise<User[]>;
  listLocations(): Promise<Location[]>;
  findLocation(id: string): Promise<Location | null>;
  listCategories(): Promise<Category[]>;
  findCategory(id: string): Promise<Category | null>;
}
