import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { afterEach, describe, expect, it } from 'vitest';
import { ensurePersonalDataAuditSchema, PersonalDataAuditLogService } from '../../services/auditLogService';
import { ensureKnowledgeSchema, KnowledgeService } from '../../services/knowledgeService';
import { GremiaBrExternalReferenceService } from '../../services/gremiaBr/gremiaBrExternalReferenceService';
import { VaultDatabaseRuntime } from '../../services/security/vaultDatabaseRuntime';
import type { DatabaseAdapter } from '../../services/databaseService';
import { openTestDatabase } from '../helpers/openTestDatabase';

const require = createRequire(import.meta.url);
const zeroCoverage = require('../../scripts/check-no-zero-coverage.cjs') as {
  findZeroCoveredFiles(coverage: Record<string, unknown>): string[];
};

const auditChecker = require('../../scripts/check-personal-data-audit-completeness.cjs') as {
  discoverPersonalMutations(root: string, config: { personalTables: string[] }): Array<{ key: string; tables: string[] }>;
  methodHasDirectAudit(body: string): boolean;
  mutationActions(body: string, tables: Set<string>): { actions: string[]; tables: string[] };
  validateAuditCompleteness(root?: string): { discovered: Array<{ key: string; directAudit: boolean }>; violations: string[] };
};

const tempDirectories: string[] = [];
afterEach(() => {
  while (tempDirectories.length) rmSync(tempDirectories.pop()!, { recursive: true, force: true });
});

describe('Phase 4 – personenbezogene Audit-Vollständigkeit', () => {
  it('lässt vollständig ungetestete Dateien im Coverage-Scope nicht mehr durch', () => {
    expect(zeroCoverage.findZeroCoveredFiles({
      '/tested.ts': { s: { 0: 1, 1: 0 } },
      '/untested.ts': { s: { 0: 0, 1: 0 } },
    })).toEqual(['/untested.ts']);
  });

  it('erkennt personenbezogene Mutationen ohne Audit und akzeptiert direkte Audit-Owner', () => {
    const personalTables = new Set(['protected_persons']);
    expect(auditChecker.mutationActions(`db.prepare('INSERT INTO protected_persons (id) VALUES (?)').run(id)`, personalTables))
      .toEqual({ actions: ['create'], tables: ['protected_persons'] });
    expect(auditChecker.methodHasDirectAudit(`this.audit('create', id, undefined, 'Person angelegt')`)).toBe(true);
    expect(auditChecker.methodHasDirectAudit(`db.prepare('UPDATE protected_persons SET x = 1').run()`)).toBe(false);
  });

  it('klassifiziert jede aktuell entdeckte personenbezogene Mutationsmethode vollständig', () => {
    const result = auditChecker.validateAuditCompleteness();
    expect(result.discovered.length).toBeGreaterThan(80);
    expect(result.violations).toEqual([]);
  });

  it('erfasst nach Service-Zerlegungen auch personenbezogene Mutationen in Modul-Funktionen', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'gremia-sbv-audit-function-'));
    tempDirectories.push(root);
    mkdirSync(path.join(root, 'services'), { recursive: true });
    writeFileSync(
      path.join(root, 'services', 'seed.ts'),
      `export function seed(db: { prepare(sql: string): { run(): void } }) { db.prepare('INSERT INTO protected_persons (id) VALUES (?)').run(); }`,
      'utf8',
    );

    const discovered = auditChecker.discoverPersonalMutations(root, { personalTables: ['protected_persons'] });
    expect(discovered).toEqual([
      expect.objectContaining({ key: 'services/seed.ts#<module>.seed', tables: ['protected_persons'] }),
    ]);
  });

  it('auditiert Anlegen und Entfernen einer Rechtsnorm-Verknüpfung ohne Notizinhalt im Audit', async () => {
    const db = await openTestDatabase();
    try {
      db.exec('CREATE TABLE cases (id TEXT PRIMARY KEY, case_number TEXT NOT NULL);');
      db.prepare('INSERT INTO cases (id, case_number) VALUES (?, ?)').run('case-1', 'A-1');
      ensureKnowledgeSchema(db);
      ensurePersonalDataAuditSchema(db);
      const service = new KnowledgeService(() => db);
      const norm = await service.createNorm({ source: 'SGB IX', paragraph: '§ 178', title: 'SBV', shortText: 'Beteiligung' });
      const linked = await service.linkNormToCase({ caseId: 'case-1', legalNormId: norm.id, note: 'vertrauliche interne Notiz' });
      expect((await service.unlinkNormFromCase('case-1', norm.id)).deleted).toBe(true);

      const audit = new PersonalDataAuditLogService(db).listForCase('case-1');
      expect(audit.map((entry) => [entry.action, entry.subjectType, entry.subjectId])).toEqual([
        ['delete', 'case_legal_reference', linked.id],
        ['create', 'case_legal_reference', linked.id],
      ]);
      expect(audit.map((entry) => entry.metadataJson).join('\n')).not.toContain('vertrauliche interne Notiz');
    } finally {
      db.close();
    }
  });

  it('auditiert Gremia.BR-Fallreferenzen bei Create, Update und Delete', async () => {
    const db = await openTestDatabase();
    try {
      ensurePersonalDataAuditSchema(db);
      db.exec(`
        CREATE TABLE case_external_references (
          id TEXT PRIMARY KEY,
          case_id TEXT NOT NULL,
          source_system TEXT NOT NULL,
          source_type TEXT NOT NULL,
          source_id TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          source_url TEXT,
          fetched_at TEXT NOT NULL,
          snapshot_json TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          UNIQUE(case_id, source_system, source_type, source_id)
        );
      `);
      const service = new GremiaBrExternalReferenceService(() => db);
      const created = service.createOrUpdate({ caseId: 'case-1', sourceType: 'beschluss', sourceId: 'B-1', title: 'Erster Titel' });
      const updated = service.createOrUpdate({ caseId: 'case-1', sourceType: 'beschluss', sourceId: 'B-1', title: 'Neuer Titel' });
      expect(updated.id).toBe(created.id);
      expect(service.delete(created.id)).toEqual({ deleted: true });

      const audit = new PersonalDataAuditLogService(db).listForCase('case-1');
      expect(audit.map((entry) => entry.action)).toEqual(['delete', 'update', 'create']);
      expect(audit.every((entry) => entry.subjectType === 'case_external_reference')).toBe(true);
    } finally {
      db.close();
    }
  });
});

describe('Phase 4 – VaultDatabaseRuntime besitzt echte Verhaltensabdeckung', () => {
  it('öffnet und initialisiert die Vault-Datenbank über die extrahierte Runtime', async () => {
    const dataDir = mkdtempSync(path.join(tmpdir(), 'gremia-sbv-vault-runtime-'));
    tempDirectories.push(dataDir);
    const db = await openTestDatabase();

    class TestVaultDatabaseRuntime extends VaultDatabaseRuntime {
      public schemaPath(): string { return this.resolveSchemaPath(); }
      public migrationsPath(): string { return this.resolveMigrationsDir(); }
      public open(databaseKey: Buffer): Promise<void> { return this.openAndInitializeVaultDatabase(databaseKey); }
      public replaceDatabaseService(openedDb: DatabaseAdapter): void {
        Object.defineProperty(this, 'databaseService', {
          configurable: true,
          value: { open: async () => openedDb },
        });
      }
    }

    const runtime = new TestVaultDatabaseRuntime(dataDir);
    runtime.replaceDatabaseService(db);
    expect(runtime.schemaPath()).toMatch(/database[/\\]schema\.sql$/);
    expect(runtime.migrationsPath()).toMatch(/database[/\\]migrations$/);
    await runtime.open(Buffer.alloc(32, 7));
    expect(Number(db.prepare<{ value: number }>("SELECT COUNT(*) AS value FROM sqlite_master WHERE type = 'table' AND name = 'cases'").get()?.value ?? 0)).toBe(1);
    db.close();
  });
});
