import fs from 'node:fs';

const CHUNK_BYTES = 64 * 1024;
const MAX_FIELD_BYTES = 4096;
const INVALID_JSON = 'Die Übergabedatei ist kein gültiges JSON-Paket.';

class FileCursor {
  private readonly descriptor: number;
  private readonly buffer = Buffer.allocUnsafe(CHUNK_BYTES);
  private offset = 0;
  private length = 0;
  private ended = false;

  constructor(filePath: string) { this.descriptor = fs.openSync(filePath, 'r'); }
  close(): void { fs.closeSync(this.descriptor); }
  peek(): number {
    if (this.offset < this.length) return this.buffer[this.offset];
    if (this.ended) return -1;
    this.length = fs.readSync(this.descriptor, this.buffer, 0, CHUNK_BYTES, null);
    this.offset = 0;
    if (!this.length) { this.ended = true; return -1; }
    return this.buffer[0];
  }
  take(): number { const value = this.peek(); if (value !== -1) this.offset += 1; return value; }
  whitespace(): void { while ([9, 10, 13, 32].includes(this.peek())) this.take(); }
  expect(byte: number): void { this.whitespace(); if (this.take() !== byte) throw new Error(INVALID_JSON); }

  string(collect = false): string {
    if (this.take() !== 34) throw new Error(INVALID_JSON);
    const bytes: number[] = [];
    let escaped = false;
    for (;;) {
      const byte = this.take();
      if (byte < 0) throw new Error(INVALID_JSON);
      if (byte === 34 && !escaped) break;
      if (collect) {
        if (bytes.length >= MAX_FIELD_BYTES) throw new Error('Die Pakethülle enthält ein zu langes Feld.');
        bytes.push(byte);
      }
      if (byte === 92 && !escaped) escaped = true;
      else escaped = false;
    }
    if (!collect) return '';
    try { return JSON.parse(`"${Buffer.from(bytes).toString('utf8')}"`) as string; }
    catch { throw new Error(INVALID_JSON); }
  }

  scalar(): unknown {
    this.whitespace();
    if (this.peek() === 34) return this.string(true);
    const bytes: number[] = [];
    while (this.peek() >= 0 && ![9, 10, 13, 32, 44, 93, 125].includes(this.peek())) {
      if (bytes.length >= MAX_FIELD_BYTES) throw new Error('Die Pakethülle enthält ein zu langes Feld.');
      bytes.push(this.take());
    }
    try { return JSON.parse(Buffer.from(bytes).toString('utf8')) as unknown; }
    catch { throw new Error(INVALID_JSON); }
  }

  skipValue(): void {
    this.whitespace();
    const first = this.peek();
    if (first === 34) { this.string(); return; }
    if (first === 123 || first === 91) {
      const stack = [first === 123 ? 125 : 93]; this.take();
      while (stack.length) {
        const byte = this.peek();
        if (byte < 0) throw new Error(INVALID_JSON);
        if (byte === 34) { this.string(); continue; }
        this.take();
        if (byte === 123) stack.push(125);
        else if (byte === 91) stack.push(93);
        else if (byte === 125 || byte === 93) {
          if (stack.pop() !== byte) throw new Error(INVALID_JSON);
        }
      }
      return;
    }
    this.scalar();
  }

  object(visit: (key: string) => void): void {
    this.expect(123); this.whitespace();
    if (this.peek() === 125) { this.take(); return; }
    for (;;) {
      this.whitespace();
      const key = this.string(true);
      this.expect(58);
      visit(key);
      this.whitespace();
      const separator = this.take();
      if (separator === 125) return;
      if (separator !== 44) throw new Error(INVALID_JSON);
    }
  }
}

export function readCaseHandoverEnvelopeHeader(filePath: string): {
  format: unknown; version: unknown; packageType: unknown;
} {
  const cursor = new FileCursor(filePath);
  try {
    let format: unknown; let version: unknown; let packageType: unknown;
    cursor.object((key) => {
      if (key === 'format') format = cursor.scalar();
      else if (key === 'version') version = cursor.scalar();
      else if (key === 'senderProof') {
        cursor.whitespace();
        if (cursor.peek() === 123) cursor.object((proofKey) => {
          if (proofKey === 'packageType') packageType = cursor.scalar();
          else cursor.skipValue();
        });
        else cursor.skipValue();
      } else cursor.skipValue();
    });
    cursor.whitespace();
    if (cursor.peek() !== -1) throw new Error(INVALID_JSON);
    return { format, version, packageType };
  } finally { cursor.close(); }
}
