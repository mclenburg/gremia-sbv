import fs from 'node:fs';
import path from 'node:path';

export const CASE_HANDOVER_FILE_EXTENSION = '.gsbvtransfer';
export const CASE_HANDOVER_MAX_FILE_SIZE_BYTES = 250 * 1024 * 1024;

export type CaseHandoverFileInspection = {
  filePath: string;
  fileName: string;
  sizeBytes: number;
  isNetworkPath: boolean;
  warnings: string[];
};

function isLikelyWindowsUncPath(filePath: string): boolean {
  return /^\\\\[^\\/]+[\\/][^\\/]+/.test(filePath);
}

function isLikelyPosixNetworkMount(filePath: string): boolean {
  return /^\/(mnt|media|net|Volumes)\//.test(filePath);
}

export function isLikelyNetworkPath(filePath: string): boolean {
  return isLikelyWindowsUncPath(filePath) || isLikelyPosixNetworkMount(filePath);
}

export function inspectCaseHandoverFilePath(filePath: string): CaseHandoverFileInspection {
  const trimmed = filePath.trim();
  if (!trimmed) throw new Error('Bitte eine Gremia.SBV-Übergabedatei auswählen.');
  if (!path.isAbsolute(trimmed)) throw new Error('Fallübergabedateien müssen über einen absoluten Dateipfad geöffnet werden.');
  if (path.extname(trimmed).toLowerCase() !== CASE_HANDOVER_FILE_EXTENSION) throw new Error('Bitte eine Gremia.SBV-Übergabedatei (*.gsbvtransfer) auswählen.');

  let stats: fs.Stats;
  try {
    stats = fs.statSync(trimmed);
  } catch {
    throw new Error('Die ausgewählte Übergabedatei konnte nicht gelesen werden.');
  }
  if (!stats.isFile()) throw new Error('Die ausgewählte Übergabedatei ist keine reguläre Datei.');
  if (stats.size <= 0) throw new Error('Die ausgewählte Übergabedatei ist leer.');
  if (stats.size > CASE_HANDOVER_MAX_FILE_SIZE_BYTES) throw new Error('Die ausgewählte Übergabedatei ist zu groß. Bitte eine neue Übergabedatei erstellen.');

  const networkPath = isLikelyNetworkPath(trimmed);
  return {
    filePath: trimmed,
    fileName: path.basename(trimmed),
    sizeBytes: stats.size,
    isNetworkPath: networkPath,
    warnings: networkPath
      ? ['Die Übergabedatei liegt auf einem möglichen Netzwerkpfad. Empfohlen wird eine lokale Kopie auf einem kontrollierten Datenträger; die kryptografische Integritätsprüfung wird dennoch durchgeführt.']
      : [],
  };
}
