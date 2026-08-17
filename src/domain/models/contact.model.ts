export type ContactCategory =
  | 'inklusionsamt'
  | 'agentur_fuer_arbeit'
  | 'betriebsarzt'
  | 'reha'
  | 'anwalt'
  | 'arbeitgeber'
  | 'betriebsrat'
  | 'beratung'
  | 'intern'
  | 'sonstiges';

export interface ContactRecord {
  id: string;
  firstName: string;
  lastName: string;
  organization?: string;
  role?: string;
  category: ContactCategory;
  email?: string;
  phone?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContactInput {
  firstName: string;
  lastName: string;
  organization?: string;
  role?: string;
  category?: ContactCategory;
  email?: string;
  phone?: string;
  notes?: string;
}

export interface UpdateContactInput {
  firstName?: string;
  lastName?: string;
  organization?: string;
  role?: string;
  category?: ContactCategory;
  email?: string;
  phone?: string;
  notes?: string;
}

export interface ContactListFilters {
  query?: string;
  category?: ContactCategory;
  limit?: number;
}

export interface DeleteContactResult {
  deleted: boolean;
  anonymizedReferences: number;
  touchedNotes: number;
}
