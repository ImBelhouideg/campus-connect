import type { Category, Location, User } from './directory.repository';

// Données de démonstration, partagées par le mode « memory » et le seed Prisma.
export const CATEGORIES: Category[] = [
  { id: 'cat-electricity', name: 'Électricité' },
  { id: 'cat-plumbing', name: 'Plomberie' },
  { id: 'cat-it', name: 'Informatique / Réseau' },
  { id: 'cat-hvac', name: 'Climatisation' },
];

export const LOCATIONS: Location[] = [
  { id: 'loc-a-101', building: 'Bâtiment A', floor: '1er étage', room: 'Salle 101' },
  { id: 'loc-a-203', building: 'Bâtiment A', floor: '2e étage', room: 'Salle 203' },
  { id: 'loc-b-amphi', building: 'Bâtiment B', floor: 'Rez-de-chaussée', room: 'Amphi 1' },
  { id: 'loc-lib-hall', building: 'Bibliothèque', floor: 'Rez-de-chaussée', room: 'Hall' },
];

export const USERS: User[] = [
  { id: 'u-student', name: 'Sara (étudiante)', email: 'sara@campus.test', role: 'REPORTER', skills: [] },
  { id: 'u-dispatcher', name: 'Karim (dispatcher)', email: 'karim@campus.test', role: 'DISPATCHER', skills: [] },
  { id: 'u-tech-elec', name: 'Youssef (technicien élec.)', email: 'youssef@campus.test', role: 'TECHNICIAN', skills: ['cat-electricity', 'cat-hvac'] },
  { id: 'u-tech-it', name: 'Nadia (technicienne IT)', email: 'nadia@campus.test', role: 'TECHNICIAN', skills: ['cat-it'] },
  { id: 'u-admin', name: 'Admin', email: 'admin@campus.test', role: 'ADMIN', skills: [] },
];
