(() => {
  const now = new Date('2026-05-05T10:00:00.000Z').toISOString();
  const cases = [
    {
      id: 'case-test-0001',
      caseNumber: 'TEST-0001',
      displayName: 'Testperson Alpha',
      category: 'bem',
      status: 'offen',
      priority: 'normal',
      openedAt: '2026-05-05',
      summary: 'Synthetischer E2E-Testfall ohne Echtdaten.',
      isPseudonymized: true,
      isLocked: false,
      protectedPersonId: 'person-test-0001',
      personBindingState: 'active',
      privacyReviewRequired: false,
    },
    {
      id: 'case-test-0002',
      caseNumber: 'TEST-0002',
      displayName: 'Testperson Beta',
      category: 'arbeitsplatzgestaltung',
      status: 'offen',
      priority: 'wichtig',
      openedAt: '2026-05-05',
      summary: 'Synthetischer Testfall Arbeitsplatzgestaltung.',
      isPseudonymized: true,
      isLocked: false,
      personBindingState: 'legacy_unlinked',
      privacyReviewRequired: true,
      privacyReviewReason: 'no_person_link',
    },
    {
      id: 'case-test-0003',
      caseNumber: 'TEST-0003',
      displayName: 'Abgeschlossener Altfall',
      category: 'sonstiges',
      status: 'abgeschlossen',
      priority: 'normal',
      openedAt: '2024-01-05',
      closedAt: '2024-02-05',
      summary: 'Synthetischer abgeschlossener Altfall für Bulk-Datenschutzprüfung.',
      isPseudonymized: true,
      isLocked: false,
      personBindingState: 'legacy_unlinked',
      privacyReviewRequired: true,
      privacyReviewReason: 'no_person_link',
      anonymizationRecommended: false,
    },
  ];


  const persons = [
    {
      id: 'person-test-0001',
      firstName: 'Max',
      lastName: 'Mustermann',
      workEmail: 'max.mustermann@example.invalid',
      organizationalUnit: 'Demo-Team',
      location: 'Demo-Standort',
      employmentState: 'active_employee',
      protectionStatus: 'equivalent',
      statusValidUntil: '2026-06-01',
      statusSource: 'employer_list',
      lifecycleState: 'expiring_soon',
      createdAt: now,
      updatedAt: now,
    },
  ];

  const deadlines = [
    {
      id: 'deadline-test-0001',
      caseId: 'case-test-0001',
      processType: 'case',
      deadlineType: 'follow_up',
      title: 'Synthetische Wiedervorlage',
      dueAt: '2026-05-12T10:00:00.000Z',
      severity: 'normal',
      status: 'open',
      calculationMode: 'manual',
      isLegalDeadline: false,
      isUserEditable: true,
      warningThresholdHours: 72,
      criticalThresholdHours: 24,
      createdAt: now,
      updatedAt: now,
      dashboardState: 'upcoming',
      hoursRemaining: 168,
      safeTitle: 'Synthetische Wiedervorlage',
      actionHint: 'Nachfassen',
    },
  ];


  const notes = [
    {
      id: 'note-test-0001',
      caseIds: ['case-test-0001'],
      caseNumbers: ['TEST-0001'],
      title: 'Synthetische Notiz mit Aktenbezug',
      noteDate: '2026-05-05',
      noteType: 'gespraech',
      participants: 'SBV, Testperson',
      content: 'Synthetische Notiz ohne Echtdaten mit internem BEM-Aktenbezug.',
      nextSteps: 'E2E prüft nur Oberfläche und Labels.',
      containsHealthData: false,
      confidentialLevel: 'normal',
      createdAt: now,
      updatedAt: now,
      links: [
        {
          id: 'link-test-0001',
          caseNoteId: 'note-test-0001',
          caseId: 'case-test-0001',
          targetType: 'bem',
          targetId: 'bem-test-0001',
          label: 'BEM-Testvorgang',
          accessibleLabel: 'Aktenbezug BEM-Testvorgang öffnen',
          textStart: 0,
          textEnd: 4,
          createdAt: now,
          isMissingTarget: false,
        },
      ],
    },
  ];

  const bemProcesses = [
    {
      id: 'bem-test-0001',
      caseId: 'case-test-0001',
      status: 'angebot_versendet',
      triggerType: 'sechs_wochen_au',
      triggerDescription: 'Synthetischer BEM-Anlass Alpha.',
      employeeResponse: 'offen',
      bemOfferedAt: '2026-05-05T09:00:00.000Z',
      responseDueAt: '2026-05-12T09:00:00.000Z',
      consentScope: '',
      title: 'BEM-Testvorgang Alpha',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'bem-test-0002',
      caseId: 'case-test-0002',
      status: 'reaktion_abwarten',
      triggerType: 'praeventiv',
      triggerDescription: 'Synthetischer BEM-Anlass Beta.',
      employeeResponse: 'offen',
      bemOfferedAt: '2026-05-06T09:00:00.000Z',
      responseDueAt: '2026-05-13T09:00:00.000Z',
      consentScope: '',
      title: 'BEM-Testvorgang Beta',
      createdAt: now,
      updatedAt: now,
    },
  ];

  const measures = [
    {
      id: 'measure-test-0001',
      caseId: 'case-test-0001',
      type: 'bem',
      title: 'BEM-Testmaßnahme',
      status: 'open',
      riskLevel: 'normal',
      createdFrom: 'manual',
      summary: 'Synthetische Maßnahme für UI-Smoke-Tests.',
      nextStep: 'Testweise prüfen.',
      openedAt: now,
      requiresFollowUp: false,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const privacyReviews = [
    {
      id: 'privacy-review-test-0001',
      caseId: 'case-test-0001',
      protectedPersonId: 'person-test-0001',
      reason: 'status_expired',
      priority: 'critical',
      dueAt: now,
      freeTextReviewRequired: true,
      status: 'open',
      createdAt: now,
      updatedAt: now,
      context: {
        person: persons[0],
        caseFile: cases[0],
        openDeadlineCount: 1,
        runningMeasureCount: 1,
        linkedDocumentCount: 0,
        lastActivityAt: now,
        freeTextReviewRequired: true,
      },
    },
  ];

  const emptyList = async () => [];
  const createRecord = async (input) => ({ id: `created-${Date.now()}`, ...input, createdAt: now, updatedAt: now });

  window.__GREMIA_SBV_E2E_ICAL_EXPORTS = [];

  window.__GREMIA_SBV_E2E = {
    active: true,
    dataDir: '__GREMIA_SBV_E2E_DATA_DIR__',
    note: 'Synthetische Browser-E2E-Umgebung. Keine produktive Datenbank.'
  };

  window.gremiaSbv = {
    security: {
      status: async () => ({ initialized: true, unlocked: true, databaseProtected: true, recoveryRequired: false }),
      lock: async () => ({ unlocked: false }),
      temporaryFileStatus: async () => ({ remaining: 0, files: [] }),
      purgeTemporaryFiles: async () => ({ removed: 0, remaining: 0 }),
    },
    cases: {
      list: async () => cases,
      create: async (input) => { const row = { id: `case-${Date.now()}`, status: 'offen', priority: 'normal', openedAt: now, isLocked: false, ...input, createdAt: now, updatedAt: now }; cases.unshift(row); return row; },
      bindLegacyCase: async (input) => { const row = cases.find((item) => item.id === input.caseId); Object.assign(row, { protectedPersonId: input.protectedPersonId, personBindingState: 'active', privacyReviewRequired: false }); return { caseId: input.caseId, protectedPersonId: input.protectedPersonId, personBindingState: 'active', privacyReviewRequired: false }; },
      listNotes: async () => notes,
      listDocuments: emptyList,
      createNote: createRecord,
      deleteNote: async () => ({ deleted: true }),
      selectAndImportDocuments: emptyList,
      openDocument: async () => ({ opened: true }),
      exportDocument: async () => ({ exported: true }),
      deleteDocument: async () => ({ deleted: true }),
    },

    compliance: {
      auditChainStatus: async () => ({ ok: true, checked: 3, firstSequence: 1, lastSequence: 3, latestHash: 'abc123def4567890', algorithm: 'sha256', chainVersion: 1, issueCount: 0, issues: [] }),
      databaseIntegrityStatus: async () => ({ ok: true, schemaVersion: '0025', appliedSchemaVersion: '0025', missingTables: [], missingColumns: {}, issueCount: 0, issues: [], repairRequired: false }),
    },

    persons: {
      list: async () => persons,
      create: async (input) => { const row = { id: `person-${Date.now()}`, ...input, createdAt: now, updatedAt: now, lifecycleState: 'active' }; persons.push(row); return row; },
      createAnonymousRequest: async (label) => { const row = { id: `person-anon-${Date.now()}`, recordKind: 'pseudonymous_request', firstName: '', lastName: '', pseudonymLabel: label || 'Anonyme Anfrage 2026-0001', employmentState: 'unknown', protectionStatus: 'unclear', statusSource: 'manual', lifecycleState: 'active', createdAt: now, updatedAt: now }; persons.push(row); return row; },
      update: async (id, input) => { const row = persons.find((person) => person.id === id); Object.assign(row, input, { updatedAt: now }); return row; },
      linkCase: async (personId, caseId) => ({ id: `link-${Date.now()}`, protectedPersonId: personId, caseFileId: caseId, linkState: 'active', createdAt: now }),
      previewImport: async (input) => {
        const lines = String(input?.csvText || 'Name;Status\nImportperson, Ida;gleichgestellt').trim().split(/\r?\n/);
        const columns = lines[0].split(';');
        const rows = lines.slice(1).filter(Boolean).map((line, index) => {
          const values = line.split(';');
          const name = values[columns.indexOf(input?.mapping?.fullName || 'Name')] || values[0] || '';
          const [lastName, firstName] = name.includes(',') ? name.split(',').map((part) => part.trim()) : ['', name.trim()];
          return { rowNumber: index + 2, firstName, lastName, protectionStatus: 'equivalent', statusValidUntil: values[2], validationErrors: [], rawPreview: {} };
        });
        return { columns, rows, warnings: ['CSV-Zeichenkodierung erkannt: utf-8.'], detectedEncoding: 'utf-8', encodingConfidence: 'high' };
      },
      executeImport: async (input) => {
        const lines = String(input?.csvText || 'Name;Status\nImportperson, Ida;gleichgestellt').trim().split(/\r?\n/);
        const name = (lines[1] || 'Importperson, Ida').split(';')[0];
        const [lastName, firstName] = name.includes(',') ? name.split(',').map((part) => part.trim()) : ['', name.trim()];
        const importedPerson = { id: `person-${Date.now()}`, firstName, lastName, employmentState: 'active_employee', protectionStatus: 'equivalent', statusSource: 'employer_list', lifecycleState: 'active', createdAt: now, updatedAt: now };
        persons.push(importedPerson);
        return { run: { id: `run-${Date.now()}`, totalRows: 1, createdCount: 1, updatedCount: 0, unchangedCount: 0, conflictCount: 0, skippedCount: 0, missingCount: 0, sourceFileName: 'e2e.csv', sourceFileHash: 'synthetic', importedAt: now }, imported: [importedPerson] };
      },
      selectImportFile: async () => null,
      evaluateExpiry: async () => ({ expiringSoon: persons, expiredReviewRequired: [] }),
      anonymize: async (id, reason) => {
        const row = persons.find((person) => person.id === id);
        const affected = cases.filter((item) => item.protectedPersonId === id);
        if (row) Object.assign(row, { firstName: '', lastName: '', workEmail: undefined, personnelNumber: undefined, organizationalUnit: undefined, location: undefined, notes: undefined, pseudonymLabel: 'Anonymisierte Person #e2e', recordKind: 'pseudonymous_request', lifecycleState: 'anonymized', anonymizationReason: reason, updatedAt: now });
        for (const item of affected) Object.assign(item, { personBindingState: 'anonymized', privacyReviewRequired: true, privacyReviewReason: 'linked_person_anonymized' });
        return { person: row, affectedCaseIds: affected.map((item) => item.id), anonymizedLinks: affected.length, reason };
      },
      delete: async (id, reason) => {
        const affected = cases.filter((item) => item.protectedPersonId === id);
        for (const item of affected) Object.assign(item, { protectedPersonId: undefined, personBindingState: 'person_deleted', privacyReviewRequired: true, privacyReviewReason: 'linked_person_deleted' });
        const index = persons.findIndex((person) => person.id === id);
        if (index >= 0) persons.splice(index, 1);
        return { ok: true, affectedCaseIds: affected.map((item) => item.id), deletedPersonId: id, reason };
      },
    },

    privacyReview: {
      listOpenForPerson: async (personId) => privacyReviews.filter((item) => item.protectedPersonId === personId && item.status === 'open'),
      documentRetention: async (input) => {
        privacyReviews.forEach((item) => { if (item.caseId === input.caseId && item.status === 'open') item.status = 'retention_documented'; });
        return { ok: true, message: 'Fortspeicherung wurde dokumentiert.' };
      },
      scheduleLater: async () => ({ ok: true, message: 'Datenschutzprüfung wurde erneut terminiert.' }),
      clearCase: async (input) => {
        privacyReviews.forEach((item) => { if (item.caseId === input.caseId && item.status === 'open') item.status = 'cleared'; });
        return { ok: true, message: 'Datenschutzprüfung wurde abgeschlossen.' };
      },
      anonymizeCase: async (input) => {
        const row = cases.find((item) => item.id === input.caseId);
        if (row) Object.assign(row, { personBindingState: 'anonymized', privacyReviewRequired: true, privacyReviewReason: 'linked_person_anonymized', anonymizedAt: now });
        privacyReviews.forEach((item) => { if (item.caseId === input.caseId && item.status === 'open') item.status = 'anonymized'; });
        return { ok: true, message: 'Fallakte wurde anonymisiert.', affectedRows: 1, affectedFiles: 0 };
      },
      deleteCase: async (input) => {
        const index = cases.findIndex((item) => item.id === input.caseId);
        if (index >= 0) cases.splice(index, 1);
        return { ok: true, message: 'Fallakte wurde gelöscht.', affectedRows: 1, affectedFiles: 0 };
      },
      bulkMarkClosedLegacy: async () => {
        let marked = 0;
        for (const row of cases) {
          if (row.status === 'abgeschlossen' && row.personBindingState === 'legacy_unlinked' && !row.anonymizationRecommended) {
            row.anonymizationRecommended = true;
            row.privacyReviewRequired = true;
            row.privacyReviewPriority = 'low';
            marked += 1;
          }
        }
        return { ok: true, reviewed: marked, marked, skipped: 0, message: `${marked} abgeschlossene Altakten wurden zur Datenschutzprüfung vorgemerkt.` };
      },
    },
    contacts: { list: emptyList, create: createRecord, delete: async () => ({ deleted: true, anonymizedReferences: 0 }) },
    deadlines: {
      list: async () => deadlines,
      dashboard: async () => deadlines,
      create: createRecord,
      update: createRecord,
      complete: async () => ({ completed: true }),
      exportIcal: async (filters, privacyLevel) => {
        const level = privacyLevel || 'process_type';
        const summary = level === 'privacy_first'
          ? 'Gremia.SBV Wiedervorlage'
          : level === 'case_reference'
            ? 'Gremia.SBV: BEM-Wiedervorlage – Fall TEST-0001'
            : 'Gremia.SBV: BEM-Wiedervorlage';
        const ics = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nSUMMARY:${summary}\r\nDESCRIPTION:Bitte Vorgang in Gremia.SBV prüfen.\r\nEND:VCALENDAR\r\n`;
        window.__GREMIA_SBV_E2E_ICAL_EXPORTS.push({ filters, privacyLevel: level, ics });
        return ics;
      },
    },
    caseMeasures: { list: async () => measures, create: createRecord, update: createRecord, listNotes: async () => [], createNote: createRecord, updateNote: createRecord, deleteNote: async () => ({ deleted: true }) },
    knowledge: { listCaseReferences: emptyList, search: emptyList, list: emptyList },
    prevention: { list: emptyList, create: createRecord, update: createRecord },
    bem: { list: async (caseId) => caseId ? bemProcesses.filter((item) => item.caseId === caseId) : bemProcesses, create: createRecord, update: createRecord },
    equalization: { list: emptyList, create: createRecord, update: createRecord },
    termination: { list: emptyList, create: createRecord, update: createRecord },
    participation: { list: emptyList, create: createRecord, update: createRecord, warnings: emptyList },
    workplaceAccommodation: { list: emptyList, create: createRecord, update: createRecord },
    reports: { generate: async () => ({ ok: true, path: 'synthetic-e2e-report.gsbvpdf' }) },
    templates: { list: emptyList },
  };
})();
