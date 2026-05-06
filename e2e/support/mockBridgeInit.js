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
    contacts: { list: emptyList, create: createRecord, delete: async () => ({ deleted: true, anonymizedReferences: 0 }) },
    deadlines: {
      list: async () => deadlines,
      dashboard: async () => deadlines,
      create: createRecord,
      update: createRecord,
      complete: async () => ({ completed: true }),
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
