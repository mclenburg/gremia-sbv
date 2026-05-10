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
      status: 'angeboten',
      invitationDate: '2026-05-05',
      consentStatus: 'offen',
      title: 'BEM-Testvorgang',
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

  const emptyList = async () => [];
  const createRecord = async (input) => ({ id: `created-${Date.now()}`, ...input, createdAt: now, updatedAt: now });

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
      create: createRecord,
      listNotes: async () => notes,
      listDocuments: emptyList,
      createNote: createRecord,
      deleteNote: async () => ({ deleted: true }),
      selectAndImportDocuments: emptyList,
      openDocument: async () => ({ opened: true }),
      exportDocument: async () => ({ exported: true }),
      deleteDocument: async () => ({ deleted: true }),
    },

    persons: {
      list: async () => persons,
      create: async (input) => { const row = { id: `person-${Date.now()}`, ...input, createdAt: now, updatedAt: now, lifecycleState: 'active' }; persons.push(row); return row; },
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
        return { columns, rows, warnings: [] };
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
      anonymize: async (id, reason) => ({ person: persons.find((person) => person.id === id), affectedCaseIds: [], anonymizedLinks: 0, reason }),
    },
    contacts: { list: emptyList, create: createRecord, delete: async () => ({ deleted: true, anonymizedReferences: 0 }) },
    deadlines: {
      list: async () => deadlines,
      dashboard: async () => deadlines,
      create: createRecord,
      update: createRecord,
      complete: async () => ({ completed: true }),
      exportIcal: async () => "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR\r\n",
    },
    caseMeasures: { list: async () => measures, create: createRecord, update: createRecord },
    knowledge: { listCaseReferences: emptyList, search: emptyList, list: emptyList },
    prevention: { list: emptyList, create: createRecord, update: createRecord },
    bem: { list: async () => bemProcesses, create: createRecord, update: createRecord },
    equalization: { list: emptyList, create: createRecord, update: createRecord },
    termination: { list: emptyList, create: createRecord, update: createRecord },
    participation: { list: emptyList, create: createRecord, update: createRecord, warnings: emptyList },
    workplaceAccommodation: { list: emptyList, create: createRecord, update: createRecord },
    reports: { generate: async () => ({ ok: true, path: 'synthetic-e2e-report.gsbvpdf' }) },
    templates: { list: emptyList },
  };
})();
