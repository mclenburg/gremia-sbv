export type CsvEncodingId = 'utf-8' | 'utf-8-bom' | 'windows-1252' | 'iso-8859-1' | 'cp850';

export interface CsvEncodingDetectionResult {
  encoding: CsvEncodingId;
  confidence: 'high' | 'medium' | 'low';
  decodedText: string;
  warnings: string[];
}

const CP850_SPECIALS: Record<number, string> = {
  0x80: 'Ç', 0x81: 'ü', 0x82: 'é', 0x83: 'â', 0x84: 'ä', 0x85: 'à', 0x86: 'å', 0x87: 'ç',
  0x88: 'ê', 0x89: 'ë', 0x8a: 'è', 0x8b: 'ï', 0x8c: 'î', 0x8d: 'ì', 0x8e: 'Ä', 0x8f: 'Å',
  0x90: 'É', 0x91: 'æ', 0x92: 'Æ', 0x93: 'ô', 0x94: 'ö', 0x95: 'ò', 0x96: 'û', 0x97: 'ù',
  0x98: 'ÿ', 0x99: 'Ö', 0x9a: 'Ü', 0x9b: 'ø', 0x9c: '£', 0x9d: 'Ø', 0x9e: '×', 0x9f: 'ƒ',
  0xa0: 'á', 0xa1: 'í', 0xa2: 'ó', 0xa3: 'ú', 0xa4: 'ñ', 0xa5: 'Ñ', 0xa6: 'ª', 0xa7: 'º',
  0xa8: '¿', 0xa9: '®', 0xaa: '¬', 0xab: '½', 0xac: '¼', 0xad: '¡', 0xae: '«', 0xaf: '»',
  0xe0: 'Ó', 0xe1: 'ß', 0xe2: 'Ô', 0xe3: 'Ò', 0xe4: 'õ', 0xe5: 'Õ', 0xe6: 'µ', 0xe7: 'þ',
  0xe8: 'Þ', 0xe9: 'Ú', 0xea: 'Û', 0xeb: 'Ù', 0xec: 'ý', 0xed: 'Ý', 0xee: '¯', 0xef: '´',
  0xf0: '≡', 0xf1: '±', 0xf2: '‗', 0xf3: '¾', 0xf4: '¶', 0xf5: '§', 0xf6: '÷', 0xf7: '¸',
  0xf8: '°', 0xf9: '¨', 0xfa: '·', 0xfb: '¹', 0xfc: '³', 0xfd: '²', 0xfe: '■', 0xff: ' '
};

function decodeWithTextDecoder(buffer: Buffer, encoding: string): string {
  return new TextDecoder(encoding, { fatal: false }).decode(buffer);
}

export function decodeCp850(buffer: Buffer): string {
  let text = '';
  for (const byte of buffer) {
    if (byte < 0x80) text += String.fromCharCode(byte);
    else text += CP850_SPECIALS[byte] ?? String.fromCharCode(byte);
  }
  return text;
}

function scoreDecodedCsv(text: string): number {
  const lower = text.toLowerCase();
  let score = 0;
  score -= (text.match(/�/g) ?? []).length * 40;
  score -= (text.match(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g) ?? []).length * 10;
  score -= (text.match(/Ã.|Â.|¤|œ|ž/g) ?? []).length * 12;
  score += (text.match(/[äöüÄÖÜß]/g) ?? []).length * 8;
  score += (text.match(/[;,	]/g) ?? []).length;
  if (/vorname|nachname|gültig|gueltig|beschäftigung|beschaeftigung|schutzstatus|e-mail|personal/.test(lower)) score += 20;
  if (/muster|gleichgestellt|schwerbehindert|antrag|abgelaufen/.test(lower)) score += 12;
  return score;
}

export function detectCsvEncoding(buffer: Buffer): CsvEncodingDetectionResult {
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return { encoding: 'utf-8-bom', confidence: 'high', decodedText: decodeWithTextDecoder(buffer.subarray(3), 'utf-8'), warnings: ['CSV-Zeichenkodierung erkannt: UTF-8 mit BOM.'] };
  }
  const candidates: { encoding: CsvEncodingId; decodedText: string }[] = [
    { encoding: 'utf-8', decodedText: decodeWithTextDecoder(buffer, 'utf-8') },
    { encoding: 'windows-1252', decodedText: decodeWithTextDecoder(buffer, 'windows-1252') },
    { encoding: 'iso-8859-1', decodedText: decodeWithTextDecoder(buffer, 'iso-8859-1') },
    { encoding: 'cp850', decodedText: decodeCp850(buffer) }
  ];
  const ranked = candidates.map((candidate) => ({ ...candidate, score: scoreDecodedCsv(candidate.decodedText) })).sort((a, b) => b.score - a.score);
  const best = ranked[0];
  const second = ranked[1];
  const confidence = best.score - second.score > 18 ? 'high' : best.score - second.score > 6 ? 'medium' : 'low';
  return {
    encoding: best.encoding,
    confidence,
    decodedText: best.decodedText,
    warnings: [`CSV-Zeichenkodierung erkannt: ${best.encoding}${confidence === 'low' ? ' (unsicher)' : ''}.`]
  };
}
