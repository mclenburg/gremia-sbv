export interface PortableProfile {
  id: 'default';
  isPortableMode: boolean;
  dataRoot: string;
  documentRoot: string;
  backupRoot: string;
  lastPathCheckAt?: string;
  notes?: string;
}
