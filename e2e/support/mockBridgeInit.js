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

  const activityJournalEntries = [
    {
      id: 'journal-e2e-0001',
      entryDate: '2026-04-20',
      durationMinutes: 45,
      timeMode: 'duration',
      category: 'documentation',
      title: 'Tätigkeitsbericht vorbereitet',
      confidentialityLevel: 'confidential',
      status: 'final',
      createdFrom: 'manual',
      performedOutsideContractWorkTime: false,
      createdAt: now,
      updatedAt: now,
      links: [],
    },
  ];
  const activityJournalPreferences = {};
  function activityJournalSummary() {
    const totalMinutes = activityJournalEntries.reduce((sum, entry) => sum + (entry.durationMinutes || 0), 0);
    return {
      totalEntries: activityJournalEntries.length,
      entriesWithTime: activityJournalEntries.filter((entry) => entry.durationMinutes || entry.startedAt || entry.endedAt).length,
      totalMinutes,
      todayMinutes: 0,
      weekMinutes: 0,
      monthMinutes: totalMinutes,
      byCategory: [{ category: 'documentation', count: activityJournalEntries.length, minutes: totalMinutes }],
      byReferenceType: [{ referenceType: 'fallfrei', count: activityJournalEntries.length, minutes: totalMinutes }],
      openFollowUps: activityJournalEntries.filter((entry) => entry.status === 'follow_up_open'),
    };
  }
  function activityJournalPrefill(context) {
    const category = context.category || activityJournalPreferences[context.contextType] || (context.contextType === 'case' ? 'case_work' : context.contextType === 'bem_process' ? 'bem_preparation' : context.contextType === 'prevention_process' ? 'prevention' : context.contextType === 'sbv_participation' || context.contextType === 'termination_hearing' ? 'participation' : 'documentation');
    return {
      sourceLabel: context.title || context.caseNumber || context.contextType,
      privacyNotice: 'Vorbelegung aus bereits geöffnetem Kontext. Es wurde noch kein Journaleintrag gespeichert.',
      preferenceContextType: context.contextType,
      entry: {
        entryDate: now.slice(0, 10),
        timeMode: 'none',
        category,
        title: context.caseNumber ? `${context.caseNumber}: Tätigkeit dokumentiert` : context.contextType === 'prevention_process' ? 'Prävention: Sachstand dokumentiert' : 'SBV-Tätigkeit dokumentiert',
        confidentialityLevel: 'confidential',
        status: 'final',
        createdFrom: 'context_prefill',
      },
    };
  }



  const recruitingParticipations = [
    {
      id: 'recruiting-e2e-0001',
      vacancyTitle: 'E2E Systemadministration',
      vacancyReference: 'SBV-2026-01',
      department: 'IT-Betrieb',
      location: 'Rostock',
      status: 'hearing_pending',
      employerNoticeDate: '2026-05-01T12:00:00.000Z',
      documentsReceivedDate: '2026-05-02T12:00:00.000Z',
      documentsComplete: false,
      hasSeverelyDisabledApplicants: true,
      severelyDisabledApplicantCount: 1,
      sbvInvitedToAllKnownInterviews: true,
      sbvParticipated: true,
      hearingRequestedDate: '2026-05-03T12:00:00.000Z',
      hearingDueDate: '2026-05-10T12:00:00.000Z',
      statementSubmittedDate: undefined,
      decisionKnownDate: undefined,
      decisionBeforeHearing: false,
      brProcedureDate: undefined,
      flaggedForViolationReview: false,
      violationReviewReason: undefined,
      notes: 'Synthetischer Recruiting-Vorgang ohne Echtdaten.',
      interviewCount: 1,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const recruitingInterviews = [
    {
      id: 'recruiting-interview-e2e-0001',
      recruitingParticipationId: 'recruiting-e2e-0001',
      interviewDate: '2026-05-04T12:00:00.000Z',
      applicantRef: 'Bewerbung 1',
      applicantReferenceMode: 'anonymous_reference',
      applicantStatus: 'severely_disabled',
      sbvInvited: true,
      sbvInvitationDate: '2026-05-02T12:00:00.000Z',
      sbvAttended: true,
      accessibilityCheckStatus: 'checked_no_issue',
      followUpNeeded: false,
      proceduralNote: undefined,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const participationViolations = [
    {
      id: 'violation-e2e-0001',
      stage: 'request',
      status: 'open',
      violationType: 'incomplete_information',
      sourceContextType: 'case_measure_participation',
      sourceContextId: 'measure-participation-e2e-0001',
      relatedCaseMeasureId: 'measure-participation-e2e-0001',
      caseId: 'case-test-0001',
      subject: 'E2E Beteiligungsverstoß aus Maßnahme',
      measureDescription: 'Synthetischer Ausgangsverstoß ohne Echtdaten.',
      wrongBehavior: 'Unterrichtung unvollständig.',
      requiredBehavior: 'Vor Entscheidung vollständig unterrichten und anhören.',
      legalBasis: '§ 178 Abs. 2 Satz 1 und Satz 2 SGB IX; § 238 Abs. 1 Nr. 8 SGB IX',
      createdAt: now,
      updatedAt: now,
    },
  ];

  const sbvResources = [];

  const templates = [
    {
      id: 'template-test-0001',
      key: 'e2e-template-beteiligung',
      title: 'E2E Beteiligungsvorlage',
      category: 'beteiligung',
      description: 'Synthetische Vorlage für vollständige E2E-Abdeckung.',
      subject: 'SBV-Beteiligung – {{fall.aktenzeichen}}',
      body: 'Sehr geehrte Damen und Herren, bitte beteiligen Sie die SBV ordnungsgemäß.',
      legalBasis: ['§ 178 Abs. 2 Satz 1 SGB IX'],
      tags: ['e2e', 'beteiligung'],
      isSystem: false,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const knowledgeNorms = [
    {
      id: 'knowledge-test-178',
      source: 'SGB IX',
      paragraph: '§ 178 SGB IX',
      title: 'Aufgaben der Schwerbehindertenvertretung',
      shortText: 'Zentrale Beteiligungs-, Überwachungs- und Unterstützungsrechte der SBV.',
      sbvMeaning: 'Die SBV muss frühzeitig, vollständig und vor Entscheidungen beteiligt werden.',
      practiceNote: 'Beteiligung dokumentieren und fehlende Unterrichtung freundlich, aber bestimmt rügen.',
      typicalCases: 'Personelle Einzelmaßnahmen, BEM, Prävention, Arbeitsplatzgestaltung.',
      tags: ['SBV', 'Beteiligung', 'E2E'],
      createdAt: now,
      updatedAt: now,
    },
  ];
  const knowledgeReferences = [];
  const knowledgeComments = [];
  const knowledgeCaseLaw = [];
  const knowledgeChecklist = [];

  const reportDescriptors = [
    {
      type: 'activity',
      title: 'Tätigkeitsbericht',
      shortTitle: 'Tätigkeitsbericht',
      description: 'Synthetischer Tätigkeitsbericht für die E2E-Abdeckung.',
      confidentiality: 'anonymized',
      group: 'sbv',
    },
    {
      type: 'system_integrity',
      title: 'Systemintegrität',
      shortTitle: 'Systemintegrität',
      description: 'Technischer Prüfbericht für Build- und Release-Checks.',
      confidentiality: 'technical',
      group: 'system',
    },
  ];
  const reportHistory = [];


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


  const ocrTexts = [
    {
      id: 'ocr-test-0001',
      caseId: 'case-test-0001',
      caseNumber: 'TEST-0001',
      title: 'Scan mit OCR',
      content: 'Synthetischer OCR-Text mit eindeutigem ScanFund.',
      sourceType: 'document_ocr',
      sourceLabel: 'OCR-Text',
      extractionQuality: 'ocr',
    },
  ];

  const createExcerptSegments = (text, query) => {
    const lowerText = String(text || '').toLowerCase();
    const lowerQuery = String(query || '').toLowerCase();
    const index = lowerText.indexOf(lowerQuery);
    if (index < 0 || !lowerQuery) return [{ text: String(text || ''), match: false }];
    return [
      { text: String(text).slice(0, index), match: false },
      { text: String(text).slice(index, index + String(query).length), match: true },
      { text: String(text).slice(index + String(query).length), match: false },
    ].filter((segment) => segment.text.length > 0);
  };

  const toSearchResult = (item, query, rank) => ({
    sourceType: item.sourceType,
    sourceId: item.id,
    sourceLabel: item.sourceLabel,
    caseId: item.caseId,
    caseNumber: item.caseNumber,
    caseNumbers: item.caseNumber ? [item.caseNumber] : undefined,
    title: item.title,
    excerpt: item.content,
    excerptSegments: createExcerptSegments(item.content, query),
    extractionQuality: item.extractionQuality || 'structured',
    navigationKind: item.navigationKind || 'process',
    navigationId: item.id,
    rank,
  });

  const syntheticSearchDocuments = () => [
    ...notes.flatMap((note) => note.caseIds.map((caseId, index) => ({
      id: note.id,
      caseId,
      caseNumber: note.caseNumbers[index],
      title: note.title,
      content: [note.content, note.nextSteps].filter(Boolean).join(' '),
      sourceType: 'note',
      sourceLabel: 'Fallnotiz',
      navigationKind: 'note',
    }))),
    ...bemProcesses.map((process) => ({
      id: process.id,
      caseId: process.caseId,
      caseNumber: cases.find((item) => item.id === process.caseId)?.caseNumber,
      title: process.title,
      content: process.triggerDescription,
      sourceType: 'bem',
      sourceLabel: 'BEM',
      navigationKind: 'process',
    })),
    ...ocrTexts,
  ];

  const searchSyntheticCaseContent = async (input) => {
    window.__GREMIA_SBV_E2E_SEARCH_CALLS = window.__GREMIA_SBV_E2E_SEARCH_CALLS || [];
    const call = {
      query: input.query,
      caseId: input.caseId,
      sourceTypes: input.sourceTypes,
    };
    window.__GREMIA_SBV_E2E_SEARCH_CALLS.push(call);
    const query = String(input.query || '').trim().toLowerCase();
    const sourceTypes = Array.isArray(input.sourceTypes) ? input.sourceTypes : [];
    return syntheticSearchDocuments()
      .filter((item) => !input.caseId || item.caseId === input.caseId)
      .filter((item) => !sourceTypes.length || sourceTypes.includes(item.sourceType))
      .filter((item) => `${item.title} ${item.content}`.toLowerCase().includes(query))
      .slice(0, input.limit || 80)
      .map((item, index) => toSearchResult(item, input.query, index + 1));
  };

  let gremiaBrSettings = { enabled: false, serverUrl: '', username: '', hasStoredCredentials: false, relevanceSettings: { groups: [] } };
  let gremiaBrCache = { upcomingMeetings: [], meetingAgendas: {}, decisions: [], dueDecisions: [], overdueDecisions: [] };
  const gremiaBrSampleCache = () => ({
    nextMeeting: { id: 'br-meeting-2026-05-29', title: 'BR-Sitzung Mai', date: '2026-05-29T09:00:00.000Z' },
    upcomingMeetings: [{ id: 'br-meeting-2026-05-29', title: 'BR-Sitzung Mai', date: '2026-05-29T09:00:00.000Z' }],
    meetingAgendas: {
      'br-meeting-2026-05-29': [
        { id: 'top-1', title: 'TOP 1: Arbeitsplatzausstattung' },
        { id: 'top-2', title: 'TOP 2: Mobiles Arbeiten' },
      ],
    },
    decisions: [],
    dueDecisions: [],
    overdueDecisions: [],
    lastFetchedAt: now,
    cacheAgeLabel: 'gerade aktualisiert',
  });

  const gremiaBrDashboardOverview = () => ({
    ...gremiaBrCache,
    relevanceSettings: gremiaBrSettings.relevanceSettings || { groups: [] },
    relevantMeetings: (gremiaBrCache.upcomingMeetings || []).length ? [{ item: gremiaBrCache.upcomingMeetings[0], agendaItems: gremiaBrCache.meetingAgendas['br-meeting-2026-05-29'] || [], matchedGroups: ['SBV'], matchedKeywords: ['Arbeitsplatz'] }] : [],
    openDecisionCount: 0,
    dueDecisionCount: 0,
    overdueDecisionCount: 0,
  });

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
  const contacts = [];

  const createRecord = async (input) => ({ id: `created-${Date.now()}`, ...input, createdAt: now, updatedAt: now });
  const createContactRecord = async (input) => {
    const contact = {
      id: `contact-${Date.now()}`,
      firstName: input.firstName || '',
      lastName: input.lastName || '',
      organization: input.organization,
      role: input.role,
      category: input.category || 'sonstiges',
      email: input.email,
      phone: input.phone,
      notes: input.notes,
      createdAt: now,
      updatedAt: now,
    };
    contacts.unshift(contact);
    return contact;
  };
  const deleteContactRecord = async (id) => {
    const index = contacts.findIndex((contact) => contact.id === id);
    if (index >= 0) contacts.splice(index, 1);
    return { deleted: true, anonymizedReferences: 0, touchedNotes: 0 };
  };

  window.__GREMIA_SBV_E2E_ICAL_EXPORTS = [];


  const authSearchParams = new URLSearchParams(window.location.search || '');
  const authScenario = authSearchParams.get('auth') || 'unlocked';
  let securityState = {
    initialized: authScenario !== 'setup',
    unlocked: authScenario !== 'locked' && authScenario !== 'recovery-required' && authScenario !== 'setup',
    recoveryRequired: authScenario === 'recovery-required',
    password: 'korrekt-pferd-batterie',
    recoveryKey: 'ABCD-EFGH-IJKL-MNOP',
    destroyed: false,
    resetCalls: [],
  };

  window.__GREMIA_SBV_E2E = {
    active: true,
    dataDir: '__GREMIA_SBV_E2E_DATA_DIR__',
    note: 'Synthetische Browser-E2E-Umgebung. Keine produktive Datenbank.'
  };

  window.gremiaSbv = {
    security: {
      status: async () => ({
        initialized: securityState.initialized,
        unlocked: securityState.unlocked,
        databaseProtected: true,
        recoveryRequired: securityState.recoveryRequired,
      }),
      unlock: async (password) => {
        if (!securityState.initialized || securityState.destroyed) {
          return { ok: false, unlocked: false, error: 'Kein initialisierter Datenbestand.' };
        }
        if (password !== securityState.password) {
          return { ok: false, unlocked: false, error: 'Entsperren fehlgeschlagen.' };
        }
        securityState.unlocked = true;
        securityState.recoveryRequired = false;
        return { ok: true, initialized: true, unlocked: true };
      },
      setupInitialPassword: async (password) => {
        securityState.initialized = true;
        securityState.unlocked = true;
        securityState.password = password;
        securityState.recoveryRequired = false;
        return { ok: true, initialized: true, unlocked: true, recoveryKey: securityState.recoveryKey };
      },
      resetPasswordWithRecoveryKey: async (recoveryKey, newPassword) => {
        securityState.resetCalls.push({ recoveryKey, newPassword });
        const normalized = String(recoveryKey || '').trim().replace(/\s+/g, '').replace(/-/g, '').toUpperCase();
        if (normalized !== securityState.recoveryKey.replace(/-/g, '')) {
          return { ok: false, initialized: true, unlocked: false, error: 'Recovery-Key ist ungültig.' };
        }
        securityState.password = newPassword;
        securityState.unlocked = true;
        securityState.recoveryRequired = false;
        return { ok: true, initialized: true, unlocked: true };
      },
      destroyLocalVault: async (confirmation) => {
        if (confirmation !== 'DATENBESTAND LÖSCHEN') {
          return { ok: false, error: 'Bestätigung fehlt.' };
        }
        securityState.destroyed = true;
        securityState.initialized = false;
        securityState.unlocked = false;
        securityState.recoveryRequired = false;
        return { ok: true, initialized: false, unlocked: false };
      },
      lock: async () => {
        securityState.unlocked = false;
        return { unlocked: false };
      },
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
      search: searchSyntheticCaseContent,
    },


    gremiaBr: {
      getSettings: async () => ({ ...gremiaBrSettings }),
      saveSettings: async (input) => {
        gremiaBrSettings = {
          enabled: !!input.enabled,
          serverUrl: input.serverUrl || '',
          username: input.username || '',
          hasStoredCredentials: !!input.password || gremiaBrSettings.hasStoredCredentials,
          relevanceSettings: input.relevanceSettings || { groups: [] },
          updatedAt: now,
        };
        return { ...gremiaBrSettings };
      },
      clearCredentials: async () => {
        gremiaBrSettings = { enabled: false, serverUrl: '', username: '', hasStoredCredentials: false, relevanceSettings: { groups: [] }, updatedAt: now };
        gremiaBrCache = { upcomingMeetings: [], meetingAgendas: {}, decisions: [], dueDecisions: [], overdueDecisions: [] };
        return { ...gremiaBrSettings };
      },
      saveRelevanceSettings: async (input) => {
        gremiaBrSettings = { ...gremiaBrSettings, relevanceSettings: input, updatedAt: now };
        return { ...gremiaBrSettings };
      },
      testConnection: async () => gremiaBrSettings.enabled
        ? ({ status: 'ok', message: 'Die Gremia.BR-Lesebrücke ist erreichbar.', checkedAt: now, profileDisplayName: 'SBV E2E', profileRole: 'read-only' })
        : ({ status: 'disabled', message: 'Die Gremia.BR-Anbindung ist deaktiviert.', checkedAt: now }),
      getCachedOverview: async () => ({ ...gremiaBrCache }),
      getDashboardOverview: async () => gremiaBrDashboardOverview(),
      refreshCache: async () => {
        if (!gremiaBrSettings.enabled) {
          return { status: 'disabled', message: 'Die Gremia.BR-Anbindung ist deaktiviert.', checkedAt: now, refreshedKeys: [], cached: gremiaBrDashboardOverview() };
        }
        gremiaBrCache = gremiaBrSampleCache();
        return { status: 'ok', message: 'Gremia.BR-Lesecache wurde manuell aktualisiert.', checkedAt: now, refreshedKeys: ['next_meeting', 'upcoming_meetings', 'meeting_agendas'], cached: gremiaBrDashboardOverview() };
      },
      suggestInlineReferences: async (query) => String(query || '').length < 2 ? [] : [{ sourceSystem: 'gremia_br', sourceType: 'beschluss', sourceId: 'BR-B-2026-012', title: 'Betriebsvereinbarung Homeoffice', label: 'BR-Beschluss · Betriebsvereinbarung Homeoffice' }],
      listExternalReferences: async () => [],
      saveExternalReference: async (input) => ({ id: `gremia-br-ref-${Date.now()}`, sourceSystem: 'gremia_br', fetchedAt: now, createdAt: now, updatedAt: now, ...input }),
      deleteExternalReference: async () => ({ deleted: true }),
    },

    compliance: {
      auditChainStatus: async () => ({ ok: true, checked: 3, firstSequence: 1, lastSequence: 3, latestHash: 'abc123def4567890', algorithm: 'sha256', chainVersion: 1, issueCount: 0, issues: [] }),
      databaseIntegrityStatus: async () => ({ ok: true, schemaVersion: '0035', appliedSchemaVersion: '0035', missingTables: [], missingColumns: {}, issueCount: 0, issues: [], repairRequired: false }),
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
    contacts: { list: async () => contacts, create: createContactRecord, delete: deleteContactRecord },
    activityJournal: {
      list: async (filter = {}) => {
        const from = filter.from || '';
        const to = filter.to || '';
        return activityJournalEntries.filter((entry) => (!from || entry.entryDate >= from) && (!to || entry.entryDate < to)).slice(0, filter.limit || activityJournalEntries.length);
      },
      get: async (id) => activityJournalEntries.find((entry) => entry.id === id) || null,
      create: async (input) => {
        const row = { id: `journal-${Date.now()}`, entryDate: input.entryDate || now.slice(0, 10), timeMode: input.timeMode || 'none', category: input.category || 'documentation', title: input.title, description: input.description, resultNote: input.resultNote, durationMinutes: input.durationMinutes, startedAt: input.startedAt, endedAt: input.endedAt, confidentialityLevel: input.confidentialityLevel || 'confidential', status: input.status || 'final', createdFrom: input.createdFrom || 'manual', followUpDueAt: input.followUpDueAt, performedOutsideContractWorkTime: !!input.performedOutsideContractWorkTime, createdAt: now, updatedAt: now, links: input.links || [] };
        activityJournalEntries.unshift(row);
        return row;
      },
      update: async (id, input) => {
        const row = activityJournalEntries.find((entry) => entry.id === id);
        Object.assign(row, input, { updatedAt: now });
        return row;
      },
      delete: async (id) => {
        const index = activityJournalEntries.findIndex((entry) => entry.id === id);
        if (index >= 0) activityJournalEntries.splice(index, 1);
        return { deleted: index >= 0 };
      },
      listLinks: async (entryId) => (activityJournalEntries.find((entry) => entry.id === entryId)?.links || []),
      addLink: async () => ({ id: `journal-link-${Date.now()}`, entryId: 'journal-e2e-0001', targetType: 'case', targetId: 'case-test-0001', createdAt: now }),
      removeLink: async () => ({ deleted: true }),
      summary: async () => activityJournalSummary(),
      export: async () => ({ generatedAt: now, mode: 'summary', heading: 'SBV-Tätigkeitsnachweis – Eigenaufzeichnung', notice: 'Eigenaufzeichnung der Schwerbehindertenvertretung.', totalEntries: activityJournalEntries.length, totalMinutes: activityJournalSummary().totalMinutes, text: 'SBV-Tätigkeitsnachweis – Eigenaufzeichnung', entries: [] }),
      buildPrefillFromContext: async (context) => activityJournalPrefill(context),
      buildPrefillFromDeadline: async (deadline) => activityJournalPrefill({ contextType: 'deadline', contextId: deadline.id, title: deadline.title }),
      buildPrefillFromClosedDeadline: async (deadline) => ({ ...activityJournalPrefill({ contextType: 'deadline', contextId: deadline.id, title: deadline.title }), entry: { ...activityJournalPrefill({ contextType: 'deadline', contextId: deadline.id, title: deadline.title }).entry, title: 'Journal-Wiedervorlage: Ergebnis dokumentiert', resultNote: deadline.title } }),
      getPreferredCategory: async (contextType) => activityJournalPreferences[contextType],
      rememberCategory: async (contextType, category) => {
        activityJournalPreferences[contextType] = category;
        return { contextType, category, updatedAt: now };
      },
    },
    deadlines: {
      list: async () => deadlines,
      dashboard: async () => deadlines,
      create: async (input) => { const row = { id: `deadline-${Date.now()}`, status: 'open', dashboardState: 'upcoming', hoursRemaining: 168, safeTitle: input.confidentialTitle || input.title, actionHint: 'Nachfassen', createdAt: now, updatedAt: now, ...input }; deadlines.unshift(row); return row; },
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
    knowledge: {
      listNorms: async (input) => {
        const query = String(input?.query || '').toLowerCase();
        const source = String(input?.source || '');
        return knowledgeNorms.filter((norm) => {
          const sourceMatches = !source || norm.source === source;
          const queryMatches = !query || [norm.paragraph, norm.title, norm.shortText, ...(norm.tags || [])].join(' ').toLowerCase().includes(query);
          return sourceMatches && queryMatches;
        });
      },
      search: async (input) => {
        const query = String(input?.query || '').toLowerCase();
        return knowledgeNorms.filter((norm) => !query || [norm.paragraph, norm.title, norm.shortText].join(' ').toLowerCase().includes(query));
      },
      list: async () => knowledgeNorms,
      listCaseReferences: async (caseId) => knowledgeReferences.filter((item) => !caseId || item.caseId === caseId),
      linkNormToCase: async (input) => {
        const norm = knowledgeNorms.find((item) => item.id === input.legalNormId) || knowledgeNorms[0];
        const caseFile = cases.find((item) => item.id === input.caseId) || cases[0];
        const row = { id: `knowledge-ref-${Date.now()}`, caseId: caseFile.id, caseNumber: caseFile.caseNumber, legalNormId: norm.id, paragraph: norm.paragraph, source: norm.source, title: norm.title, note: input.note, createdAt: now };
        knowledgeReferences.push(row);
        return row;
      },
      listComments: async (normId) => knowledgeComments.filter((item) => item.legalNormId === normId),
      createComment: async (input) => { const row = { id: `knowledge-comment-${Date.now()}`, ...input, createdAt: now, updatedAt: now }; knowledgeComments.push(row); return row; },
      listCaseLaw: async (normId) => knowledgeCaseLaw.filter((item) => item.legalNormId === normId),
      createCaseLaw: async (input) => { const row = { id: `knowledge-case-law-${Date.now()}`, ...input, createdAt: now, updatedAt: now }; knowledgeCaseLaw.push(row); return row; },
      listChecklist: async (normId) => knowledgeChecklist.filter((item) => item.legalNormId === normId),
      createChecklistItem: async (input) => { const row = { id: `knowledge-check-${Date.now()}`, legalNormId: input.legalNormId, text: input.text, sortOrder: input.sortOrder || knowledgeChecklist.length + 1, createdAt: now, updatedAt: now }; knowledgeChecklist.push(row); return row; },
    },
    prevention: { list: emptyList, create: createRecord, update: createRecord },
    bem: { list: async (caseId) => caseId ? bemProcesses.filter((item) => item.caseId === caseId) : bemProcesses, create: createRecord, update: createRecord },
    equalization: { list: emptyList, create: createRecord, update: createRecord },
    termination: { list: emptyList, create: createRecord, update: createRecord },
    participation: { list: emptyList, create: createRecord, update: createRecord, warnings: emptyList },
    recruitingParticipations: {
      list: async () => recruitingParticipations.map((row) => ({ ...row, interviewCount: recruitingInterviews.filter((item) => item.recruitingParticipationId === row.id).length })),
      get: async (id) => recruitingParticipations.find((item) => item.id === id) || null,
      create: async (input) => {
        const row = {
          id: `recruiting-${Date.now()}`,
          status: input.status || 'draft',
          documentsComplete: Boolean(input.documentsComplete),
          hasSeverelyDisabledApplicants: input.hasSeverelyDisabledApplicants !== false,
          sbvInvitedToAllKnownInterviews: Boolean(input.sbvInvitedToAllKnownInterviews),
          sbvParticipated: Boolean(input.sbvParticipated),
          decisionBeforeHearing: Boolean(input.decisionBeforeHearing),
          flaggedForViolationReview: Boolean(input.flaggedForViolationReview),
          interviewCount: 0,
          createdAt: now,
          updatedAt: now,
          ...input,
        };
        recruitingParticipations.unshift(row);
        return row;
      },
      update: async (id, input) => {
        const row = recruitingParticipations.find((item) => item.id === id);
        if (!row) throw new Error('Stellenbesetzung nicht gefunden.');
        Object.assign(row, input, { updatedAt: now });
        return row;
      },
      delete: async (id) => {
        const index = recruitingParticipations.findIndex((item) => item.id === id);
        if (index >= 0) recruitingParticipations.splice(index, 1);
        for (let i = recruitingInterviews.length - 1; i >= 0; i -= 1) {
          if (recruitingInterviews[i].recruitingParticipationId === id) recruitingInterviews.splice(i, 1);
        }
        return { deleted: index >= 0 };
      },
      listInterviews: async (recruitingParticipationId) => recruitingInterviews.filter((item) => item.recruitingParticipationId === recruitingParticipationId),
      addInterview: async (input) => {
        const row = { id: `recruiting-interview-${Date.now()}`, createdAt: now, updatedAt: now, ...input };
        recruitingInterviews.unshift(row);
        const parent = recruitingParticipations.find((item) => item.id === input.recruitingParticipationId);
        if (parent) parent.interviewCount = recruitingInterviews.filter((item) => item.recruitingParticipationId === parent.id).length;
        return row;
      },
      updateInterview: async (id, input) => {
        const row = recruitingInterviews.find((item) => item.id === id);
        if (!row) throw new Error('Vorstellungsgespräch nicht gefunden.');
        Object.assign(row, input, { updatedAt: now });
        return row;
      },
      deleteInterview: async (id) => {
        const index = recruitingInterviews.findIndex((item) => item.id === id);
        if (index >= 0) recruitingInterviews.splice(index, 1);
        return { deleted: index >= 0 };
      },
    },
    sbvParticipationViolations: {
      list: async () => participationViolations,
      get: async (id) => participationViolations.find((item) => item.id === id) || null,
      listEvents: async () => [],
      create: async (input) => {
        const row = { id: `violation-${Date.now()}`, status: input.status || 'draft', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...input };
        participationViolations.unshift(row);
        return row;
      },
      update: async (id, input) => {
        const row = participationViolations.find((item) => item.id === id);
        if (!row) throw new Error('Beteiligungsverstoß nicht gefunden.');
        Object.assign(row, input, { updatedAt: new Date().toISOString() });
        return row;
      },
      changeStatus: async (id, input) => {
        const row = participationViolations.find((item) => item.id === id);
        if (!row) throw new Error('Beteiligungsverstoß nicht gefunden.');
        Object.assign(row, { status: input.status, updatedAt: new Date().toISOString() });
        return row;
      },
      generateDocument: async (id) => ({ violationId: id, filename: 'beteiligungsverstoss-e2e.docx', documentId: `document-${Date.now()}`, sizeBytes: 1024, sha256: 'e2e-sha256' }),
      listDocuments: async () => [],
      createFollowUp: async (id) => {
        const dueAt = '2026-05-12T10:00:00.000Z';
        const row = participationViolations.find((item) => item.id === id);
        if (row) row.relatedDeadlineId = `deadline-${Date.now()}`;
        return { violationId: id, deadlineId: row?.relatedDeadlineId || `deadline-${Date.now()}`, dueAt };
      },
      buildJournalPrefill: async (id) => activityJournalPrefill({ contextType: 'sbv_participation_violation', contextId: id, title: 'Beteiligungsverstoß dokumentiert', category: 'participation' }),
      delete: async (id) => {
        const index = participationViolations.findIndex((item) => item.id === id);
        if (index >= 0) participationViolations.splice(index, 1);
        return { deleted: true };
      },
    },
    sbvResources: {
      list: async () => sbvResources,
      dashboard: async () => ({ total: sbvResources.length, openRequests: sbvResources.filter((item) => item.status === 'planned' || item.status === 'requested').length, byKind: {}, byStatus: {} }),
      create: async (input) => {
        const row = { id: `sbv-resource-${Date.now()}`, ...input, createdAt: now, updatedAt: now };
        sbvResources.unshift(row);
        return row;
      },
      update: async (id, input) => {
        const row = sbvResources.find((item) => item.id === id);
        if (!row) throw new Error('Nachweis nicht gefunden.');
        Object.assign(row, input, { updatedAt: now });
        return row;
      },
      delete: async (id) => {
        const index = sbvResources.findIndex((item) => item.id === id);
        if (index >= 0) sbvResources.splice(index, 1);
        return { deleted: true };
      },
    },
    workplaceAccommodation: { list: emptyList, create: createRecord, update: createRecord },
    reports: {
      descriptors: async () => reportDescriptors,
      history: async () => reportHistory,
      generate: async (input) => {
        const descriptor = reportDescriptors.find((item) => item.type === input?.type) || reportDescriptors[0];
        const result = { ok: true, reportType: descriptor.type, title: descriptor.title, fileName: `${descriptor.type}-e2e.pdf`, filePath: `/tmp/${descriptor.type}-e2e.pdf`, generatedAt: now, warnings: [], metrics: { synthetic: 'true' } };
        reportHistory.unshift({ id: `report-history-${Date.now()}`, reportType: descriptor.type, title: descriptor.title, fileName: result.fileName, filePath: result.filePath, generatedAt: now, periodStart: input?.periodStart, periodEnd: input?.periodEnd, warningCount: 0 });
        return result;
      },
      openExportFolder: async () => ({ opened: true }),
    },
    templates: {
      list: async (input) => {
        const query = String(input?.query || '').toLowerCase();
        const category = input?.category;
        return templates.filter((template) => {
          const categoryMatches = !category || template.category === category;
          const queryMatches = !query || [template.title, template.description, template.subject, template.body, ...(template.tags || [])].join(' ').toLowerCase().includes(query);
          return categoryMatches && queryMatches;
        });
      },
      create: async (input) => {
        const row = { id: `template-${Date.now()}`, key: input.key || `template-e2e-${Date.now()}`, isSystem: false, createdAt: now, updatedAt: now, legalBasis: [], tags: [], ...input };
        templates.unshift(row);
        return row;
      },
      update: async (id, input) => {
        const row = templates.find((item) => item.id === id);
        if (!row) throw new Error('Vorlage nicht gefunden.');
        Object.assign(row, input, { updatedAt: now });
        return row;
      },
      delete: async (id) => {
        const index = templates.findIndex((item) => item.id === id);
        if (index >= 0) templates.splice(index, 1);
        return { deleted: true };
      },
    },
  };
})();
