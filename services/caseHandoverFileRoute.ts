import fs from 'node:fs';
import { inspectCaseHandoverFilePath } from './caseHandoverFilePolicy.js';

export type CaseHandoverFileRoute = {
  formatVersion: number;
  kind: 'legacy' | 'vacation_v5' | 'return_v5';
};

export function classifyCaseHandoverFile(filePath: string): CaseHandoverFileRoute {
  const file = inspectCaseHandoverFilePath(filePath);
  let parsed: unknown;
  try { parsed = JSON.parse(fs.readFileSync(file.filePath, 'utf8')); }
  catch { throw new Error('Die Übergabedatei ist kein gültiges JSON-Paket.'); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Die Übergabedatei enthält keine gültige Pakethülle.');
  }
  const envelope = parsed as Record<string, unknown>;
  if (envelope.format !== 'gremia-sbv-case-handover'
    || !Number.isSafeInteger(envelope.version) || Number(envelope.version) < 1) {
    throw new Error('Das Übergabeformat wird nicht unterstützt.');
  }
  const formatVersion = Number(envelope.version);
  if (formatVersion > 5) {
    throw new Error(`Dieses Paket verwendet das neuere Format ${formatVersion}. Bitte Gremia.SBV aktualisieren und die Datei erneut öffnen.`);
  }
  if (formatVersion < 5) return { formatVersion, kind: 'legacy' };
  const proof = envelope.senderProof;
  const packageType = proof && typeof proof === 'object' && !Array.isArray(proof)
    ? (proof as Record<string, unknown>).packageType : undefined;
  if (packageType === 'vacation_handover') return { formatVersion, kind: 'vacation_v5' };
  if (packageType === 'return_delta') return { formatVersion, kind: 'return_v5' };
  throw new Error('Der Pakettyp der Format-5-Datei ist ungültig.');
}
