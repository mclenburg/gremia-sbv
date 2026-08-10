import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import type { DatabaseAdapter } from '../../../services/databaseService.js';
import { ActivityJournalPreferenceService } from '../../../services/activityJournalPreferenceService.js';
import { ActivityJournalService } from '../../../services/activityJournalService.js';
import { PersonalDataAuditLogService } from '../../../services/auditLogService.js';
import { BemService } from '../../../services/bemService.js';
import { CaseMeasureService } from '../../../services/caseMeasureService.js';
import { ComplianceIncidentService } from '../../../services/complianceIncidentService.js';
import { DeadlineService } from '../../../services/deadlineService.js';
import { EqualizationService } from '../../../services/equalizationService.js';
import { ParticipationService } from '../../../services/participationService.js';
import { PreventionService } from '../../../services/preventionService.js';
import { RecruitingParticipationService } from '../../../services/recruitingParticipationService.js';
import { SbvControlProtocolService } from '../../../services/sbvControlProtocolService.js';
import { SbvParticipationViolationService } from '../../../services/sbvParticipationViolationService.js';
import { SbvParticipationViolationDocumentService } from '../../../services/sbvParticipationViolationDocumentService.js';
import { SbvResourceService } from '../../../services/sbvResourceService.js';
import { TerminationService } from '../../../services/terminationService.js';
import { WorkplaceAccommodationService } from '../../../services/workplaceAccommodationService.js';
import { ApplicationServices } from '../../../electron/applicationServices.js';
import type { SecurityService } from '../../../services/securityService.js';

const require = createRequire(import.meta.url);
const constructorCheck = require('../../../scripts/check-service-constructor-purity.cjs') as {
  analyzeSource(filePath: string, sourceText: string, infrastructureExceptions?: Record<string, string>): {
    services: Array<{ className: string; relativePath: string; infrastructure: boolean }>;
    violations: Array<{ className: string; kind: string; expression: string; relativePath: string }>;
  };
  scanProject(): {
    services: Array<{ className: string; relativePath: string; infrastructure: boolean }>;
    violations: Array<{ className: string; kind: string; expression: string; relativePath: string }>;
    staleExceptions: string[];
  };
};

function databaseThatRejectsAccess(): DatabaseAdapter {
  return new Proxy({} as DatabaseAdapter, {
    get(_target, property) {
      throw new Error(`Database access during service construction: ${String(property)}`);
    },
  });
}

function securityThatRejectsResolution(): SecurityService {
  return new Proxy({} as SecurityService, {
    get(_target, property) {
      throw new Error(`Security/Vault access during application service construction: ${String(property)}`);
    },
  });
}

describe('database-bound service construction', () => {
  it('does not read or mutate the database', () => {
    const db = databaseThatRejectsAccess();
    const factories = [
      () => new ActivityJournalPreferenceService(db),
      () => new ActivityJournalService(db),
      () => new PersonalDataAuditLogService(db),
      () => new BemService(db),
      () => new CaseMeasureService(db),
      () => new ComplianceIncidentService(db),
      () => new DeadlineService(db),
      () => new EqualizationService(db),
      () => new ParticipationService(db),
      () => new PreventionService(db),
      () => new RecruitingParticipationService(db),
      () => new SbvControlProtocolService(db),
      () => new SbvParticipationViolationService(db),
      () => new SbvParticipationViolationDocumentService(db, () => ''),
      () => new SbvResourceService(db),
      () => new TerminationService(db),
      () => new WorkplaceAccommodationService(db),
    ];

    expect(() => factories.forEach((factory) => factory())).not.toThrow();
  });

  it('does not resolve vault or data-directory providers while wiring the composition root', () => {
    const security = securityThatRejectsResolution();
    const dataDirectoryProvider = () => { throw new Error('Data directory provider resolved during construction'); };
    expect(() => new ApplicationServices(security, dataDirectoryProvider)).not.toThrow();
  });
});

describe('complete service constructor architecture contract', () => {
  it('discovers exported service classes automatically and finds no Fachservice constructor side effects', () => {
    const report = constructorCheck.scanProject();
    expect(report.services.length).toBeGreaterThan(20);
    expect(report.staleExceptions).toEqual([]);
    expect(report.violations).toEqual([]);
  });

  it('detects SQL, schema/lifecycle and provider resolution in a constructor before it can enter the codebase', () => {
    const source = `
      export class UnsafeFeatureService {
        constructor(private readonly dbProvider: () => unknown) {
          const db = dbProvider();
          db.exec('CREATE TABLE unsafe(id TEXT)');
          this.ensureSchema();
        }
        ensureSchema() {}
      }
    `;
    const report = constructorCheck.analyzeSource('services/unsafeFeatureService.ts', source, {});
    expect(report.services.map((entry) => entry.className)).toEqual(['UnsafeFeatureService']);
    expect(report.violations.map((entry) => entry.kind)).toContain('provider-resolution');
    expect(report.violations.some((entry) => entry.expression.includes('.exec('))).toBe(true);
    expect(report.violations.some((entry) => entry.expression.includes('ensureSchema'))).toBe(true);
  });

  it('accepts dependency wiring and pure path/configuration assignments', () => {
    const source = `
      export class CleanFeatureService {
        constructor(private readonly dbProvider: () => unknown, private readonly label: string) {
          this.label = label.trim();
        }
      }
    `;
    const report = constructorCheck.analyzeSource('services/cleanFeatureService.ts', source, {});
    expect(report.violations).toEqual([]);
  });
});
