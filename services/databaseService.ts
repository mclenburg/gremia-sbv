import fs from 'node:fs';
import path from 'node:path';

export interface DatabaseAdapter {
  prepare<T = unknown>(sql: string): {
    all(...params: unknown[]): T[];
    get(...params: unknown[]): T | undefined;
    run(...params: unknown[]): unknown;
  };
  exec(sql: string): void;
  pragma(sql: string): unknown;
  close(): void;
}

type DatabaseConstructor = new (file: string) => DatabaseAdapter;

function resolveDatabaseConstructor(moduleValue: unknown): DatabaseConstructor {
  const maybeModule = moduleValue as { default?: unknown };
  const candidate = maybeModule.default ?? moduleValue;

  if (typeof candidate !== 'function') {
    throw new Error('SQLCipher-Datenbankmodul konnte nicht geladen werden. Erwartet wurde ein Konstruktor.');
  }

  return candidate as DatabaseConstructor;
}

export class DatabaseService {
  private db?: DatabaseAdapter;

  async open(databasePath: string, keyHex: string): Promise<DatabaseAdapter> {
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });

    // Native Abhängigkeit bewusst dynamisch laden, damit Tests/IDE ohne Binary starten können.
    // Produktiv muss dieses Modul vorhanden sein; andernfalls wird der Tresor nicht geöffnet.
    const moduleName = 'better-sqlite3-multiple-ciphers';
    const Database = resolveDatabaseConstructor(await import(moduleName));

    const db = new Database(databasePath);
    db.pragma("cipher='sqlcipher'");
    db.pragma('cipher_compatibility = 4');
    db.pragma(`key = "x'${keyHex}'"`);
    db.pragma('foreign_keys = ON');

    // Erzwingt eine echte Leseoperation. Bei falschem Schlüssel oder kopierter DB ohne passenden
    // Schlüssel schlägt diese Operation fehl, statt später unklar zu scheitern.
    db.prepare('SELECT count(*) AS count FROM sqlite_master').get();

    this.db = db;
    return db;
  }

  get active(): DatabaseAdapter {
    if (!this.db) throw new Error('Database is not open. Unlock application first.');
    return this.db;
  }

  close(): void {
    this.db?.close();
    this.db = undefined;
  }
}
