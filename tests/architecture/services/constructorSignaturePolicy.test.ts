import { describe, expect, it } from 'vitest';
import { ApplicationServices } from '../../../electron/applicationServices.js';
import type { DatabaseAdapter } from '../../../services/databaseService.js';
import type { SecurityService } from '../../../services/securityService.js';

function serviceDb(label: string): DatabaseAdapter {
  return {
    prepare: () => {
      throw new Error(`Unexpected SQL access while resolving ${label} service`);
    },
    exec: () => undefined,
    pragma: () => undefined,
    close: () => undefined,
  } as unknown as DatabaseAdapter;
}

function applicationServicesForDatabases(databases: { active: DatabaseAdapter }): ApplicationServices {
  const testDataDirectory = 'gremia-sbv-test-data';
  const security = {
    getActiveDatabase: () => databases.active,
    getDataDirectory: () => testDataDirectory,
    getActiveDatabaseKey: () => Buffer.alloc(32),
  } as unknown as SecurityService;
  return new ApplicationServices(security, () => testDataDirectory);
}

describe('datenbankgebundene Service-Komposition', () => {
  it('scoped fachlich datenbankgebundene Services je aktivem Tresor statt sie als Singleton mit Lazy-Provider zu halten', () => {
    const firstDatabase = serviceDb('first');
    const secondDatabase = serviceDb('second');
    const state = { active: firstDatabase };
    const services = applicationServicesForDatabases(state);

    const firstScope = {
      handover: services.caseHandover(),
      caseAnonymization: services.caseAnonymization(),
      contacts: services.contacts(),
      knowledge: services.knowledge(),
      retention: services.retention(),
      templates: services.templates(),
      templateDefaults: services.templateDefaults(),
    };
    const repeatedFirstScope = {
      handover: services.caseHandover(),
      caseAnonymization: services.caseAnonymization(),
      contacts: services.contacts(),
      knowledge: services.knowledge(),
      retention: services.retention(),
      templates: services.templates(),
      templateDefaults: services.templateDefaults(),
    };
    state.active = secondDatabase;
    const secondScope = {
      handover: services.caseHandover(),
      caseAnonymization: services.caseAnonymization(),
      contacts: services.contacts(),
      knowledge: services.knowledge(),
      retention: services.retention(),
      templates: services.templates(),
      templateDefaults: services.templateDefaults(),
    };

    expect(repeatedFirstScope).toEqual(firstScope);
    expect(secondScope.handover).not.toBe(firstScope.handover);
    expect(secondScope.caseAnonymization).not.toBe(firstScope.caseAnonymization);
    expect(secondScope.contacts).not.toBe(firstScope.contacts);
    expect(secondScope.knowledge).not.toBe(firstScope.knowledge);
    expect(secondScope.retention).not.toBe(firstScope.retention);
    expect(secondScope.templates).not.toBe(firstScope.templates);
    expect(secondScope.templateDefaults).not.toBe(firstScope.templateDefaults);
  });
});
