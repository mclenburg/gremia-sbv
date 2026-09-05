(() => {
  const now = new Date('2026-05-05T10:00:00.000Z').toISOString();
  const cloneForIpc = (value) => structuredClone(value);
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
      sourceLabel: context.title || context.caseNumber || ({ case: 'Fallakte', person: 'Person', bem_process: 'BEM-Verfahren', prevention_process: 'Präventionsverfahren', sbv_participation: 'SBV-Beteiligung', termination_hearing: 'Kündigungsanhörung', equalization_process: 'Gleichstellungsverfahren', sbv_control_protocol: 'SBV-Dokumentation', recruiting_participation: 'Stellenbesetzung', recruiting_interview: 'Vorstellungsgespräch', deadline: 'Wiedervorlage', document: 'Dokument', journal: 'Tätigkeitsjournal', fallfrei: 'SBV-Tätigkeit' }[context.contextType] || 'SBV-Tätigkeit'),
      privacyNotice: 'Vorbelegung aus bereits geöffnetem Kontext. Es wurde noch kein Journaleintrag gespeichert.',
      preferenceContextType: context.contextType,
      entry: {
        entryDate: now.slice(0, 10),
        timeMode: 'none',
        category,
        title: context.title || (context.caseNumber ? `${context.caseNumber}: Tätigkeit dokumentiert` : context.contextType === 'prevention_process' ? 'Prävention: Sachstand dokumentiert' : 'SBV-Tätigkeit dokumentiert'),
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
  const sbvElections = [];
  const sbvOfficeMeetings = [];
  const sbvOfficeAssemblies = [];
  const sbvOfficeObligations = [];
  const sbvOfficeOfficers = [];
  const sbvOfficeAgreements = [];
  const sbvOfficeComplaints = [];

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
    {
      id: 'measure-participation-e2e-0002',
      caseId: 'case-test-0001',
      type: 'sbv_participation',
      title: 'Beteiligung zur allgemeinen Arbeitszeitregelung',
      status: 'open',
      riskLevel: 'erhoeht',
      createdFrom: 'manual',
      summary: 'Synthetische SBV-Beteiligungsmaßnahme für die filterbare E2E-Auswahl.',
      nextStep: 'Ordnungsgemäße Beteiligung prüfen.',
      openedAt: now,
      requiresFollowUp: true,
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

  let gremiaBrSettings = { enabled: false, serverUrl: '', username: '', hasStoredCredentials: false, apiMode: 'legacy_read_bridge', relevanceSettings: { groups: [] } };
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
  const createCaseNoteRecord = async (input) => {
    const noteId = `note-${Date.now()}`;
    const inlineLinks = [];
    for (const [index, action] of (input.inlineActions || []).entries()) {
      if (action?.kind !== 'deadline') continue;
      const deadlineId = `deadline-inline-${Date.now()}-${index}`;
      const deadlineInput = action.input || {};
      const deadline = {
        id: deadlineId,
        status: 'open',
        dashboardState: 'upcoming',
        hoursRemaining: 168,
        safeTitle: deadlineInput.confidentialTitle || deadlineInput.title,
        actionHint: 'Nachfassen',
        createdAt: now,
        updatedAt: now,
        ...deadlineInput,
      };
      deadlines.unshift(deadline);
      inlineLinks.push({
        id: `link-inline-${Date.now()}-${index}`,
        caseNoteId: noteId,
        caseId: input.caseId,
        targetType: 'deadline',
        targetId: deadlineId,
        label: action.linkLabel || deadline.title,
        accessibleLabel: action.accessibleLabel || `Frist öffnen: ${deadline.title}`,
        textStart: 0,
        textEnd: String(action.linkLabel || deadline.title || '').length,
        createdAt: now,
        isMissingTarget: false,
      });
    }
    const note = {
      id: noteId,
      ...input,
      caseIds: input.caseIds || [input.caseId],
      createdAt: now,
      updatedAt: now,
      links: [...(input.links || []), ...inlineLinks],
    };
    notes.unshift(note);
    return note;
  };
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
  const startsLocked = authScenario === 'locked' || authScenario === 'locked-cleanup-warning';
  let securityState = {
    initialized: authScenario !== 'setup',
    unlocked: !startsLocked && authScenario !== 'recovery-required' && authScenario !== 'setup',
    recoveryRequired: authScenario === 'recovery-required',
    password: 'korrekt-pferd-batterie',
    maintenanceWarning: authScenario === 'locked-cleanup-warning'
      ? 'Die automatische Klartextbereinigung konnte 1 Datei nicht sicher abschließen. Die Originaldatei blieb unverändert und wird in der Datenschutzprüfung angezeigt.'
      : undefined,
    recoveryKey: 'ABCD-EFGH-IJKL-MNOP',
    destroyed: false,
    resetCalls: [],
  };

  const resettableCollections = [
    cases,
    persons,
    deadlines,
    activityJournalEntries,
    recruitingParticipations,
    recruitingInterviews,
    participationViolations,
    sbvResources,
    sbvElections,
    sbvOfficeMeetings,
    sbvOfficeAssemblies,
    sbvOfficeObligations,
    sbvOfficeOfficers,
    sbvOfficeAgreements,
    sbvOfficeComplaints,
    templates,
    knowledgeNorms,
    knowledgeReferences,
    knowledgeComments,
    knowledgeCaseLaw,
    knowledgeChecklist,
    reportDescriptors,
    reportHistory,
    notes,
    bemProcesses,
    measures,
    ocrTexts,
    privacyReviews,
    contacts,
  ];
  const resettableCollectionSnapshots = resettableCollections.map((collection) => cloneForIpc(collection));
  const activityJournalPreferencesSnapshot = cloneForIpc(activityJournalPreferences);
  const gremiaBrSettingsSnapshot = cloneForIpc(gremiaBrSettings);
  const gremiaBrCacheSnapshot = cloneForIpc(gremiaBrCache);
  const securityStateSnapshot = cloneForIpc(securityState);

  const resetObject = (target, snapshot) => {
    for (const key of Object.keys(target)) delete target[key];
    Object.assign(target, cloneForIpc(snapshot));
  };

  window.__GREMIA_SBV_E2E_RESET = () => {
    resettableCollections.forEach((collection, index) => {
      collection.splice(0, collection.length, ...cloneForIpc(resettableCollectionSnapshots[index]));
    });
    resetObject(activityJournalPreferences, activityJournalPreferencesSnapshot);
    gremiaBrSettings = cloneForIpc(gremiaBrSettingsSnapshot);
    gremiaBrCache = cloneForIpc(gremiaBrCacheSnapshot);
    securityState = cloneForIpc(securityStateSnapshot);
    window.__GREMIA_SBV_E2E_ICAL_EXPORTS.splice(0, window.__GREMIA_SBV_E2E_ICAL_EXPORTS.length);
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
        return { ok: true, initialized: true, unlocked: true, warning: securityState.maintenanceWarning };
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
      createNote: createCaseNoteRecord,
      deleteNote: async () => ({ deleted: true }),
      selectAndImportDocuments: emptyList,
      openDocument: async () => ({ opened: true }),
      exportDocument: async () => ({ exported: true }),
      deleteDocument: async () => ({ deleted: true }),
      search: searchSyntheticCaseContent,
    },

    caseHandover: {
      cockpit: async () => ({
        activeVacationCount: 0,
        expiredVacationCount: 0,
        returnableCount: 0,
        officeHandoverCount: 0,
        officeInventory: { templateCount: 0, deadlineTemplateCount: 0, electionCount: 0, electionDocumentCount: 0, privacyReviewCount: 0, activityJournalIncluded: false },
        outgoing: [],
        incoming: [],
      }),
      export: async () => ({ exported: false, filePath: '', packageId: '', packageType: 'vacation_handover', caseCount: 0, measureCount: 0, documentCount: 0, deadlineCount: 0 }),
      exportReturnDelta: async () => ({ exported: false, filePath: '', packageId: '', packageType: 'return_delta', caseCount: 0, measureCount: 0, documentCount: 0, deadlineCount: 0 }),
      selectFile: async () => ({ canceled: true }),
      inspect: async () => { throw new Error('In der Browser-Testumgebung wurde keine Übergabedatei ausgewählt.'); },
      selectAndInspect: async () => ({ canceled: true }),
      import: async () => { throw new Error('In der Browser-Testumgebung wurde keine Übergabedatei ausgewählt.'); },
      continueExpired: async (caseId) => ({ caseId, confirmed: true, confirmedAt: now }),
    },


    gremiaBr: {
      getSettings: async () => ({ ...gremiaBrSettings }),
      saveSettings: async (input) => {
        gremiaBrSettings = {
          enabled: !!input.enabled,
          serverUrl: input.serverUrl || '',
          username: input.username || '',
          hasStoredCredentials: !!input.password || gremiaBrSettings.hasStoredCredentials,
          apiMode: input.apiMode || gremiaBrSettings.apiMode || 'legacy_read_bridge',
          selectedBodyId: input.selectedBodyId || gremiaBrSettings.selectedBodyId,
          selectedBodyName: input.selectedBodyName || gremiaBrSettings.selectedBodyName,
          selectedOrganizationId: input.selectedOrganizationId || gremiaBrSettings.selectedOrganizationId,
          selectedSecurityDomain: input.selectedSecurityDomain || gremiaBrSettings.selectedSecurityDomain,
          relevanceSettings: input.relevanceSettings || { groups: [] },
          updatedAt: now,
        };
        return { ...gremiaBrSettings };
      },
      clearCredentials: async () => {
        gremiaBrSettings = { enabled: false, serverUrl: '', username: '', hasStoredCredentials: false, apiMode: 'legacy_read_bridge', relevanceSettings: { groups: [] }, updatedAt: now };
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
      listWorkspaceBodies: async () => [
        {
          bodyId: 'sbv-body-e2e',
          bodyName: 'Schwerbehindertenvertretung E2E',
          bodyType: 'SEVERELY_DISABLED_REPRESENTATION',
          organizationId: 'org-e2e',
          securityDomain: 'sbv-e2e',
          contentProtectionClass: 'HIGH',
        },
      ],
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

    retention: {
      dashboard: async () => ({
        generatedAt: now,
        settings: { closedCaseReviewMonths: 36, inactiveOpenCaseMonths: 36, orphanContactReviewDays: 0, completedDeadlineRetentionMonths: 36, activityJournalReviewMonths: 36, participationViolationReviewMonths: 36, minimumGroupSizeForReports: 5 },
        policies: [],
        candidates: [
          { id: 'retention-case-test-0003', type: 'closed_case_review', riskLevel: 'critical', title: 'Abgeschlossene Fallakte prüfen', reference: 'TEST-0003', description: 'Die Aufbewahrungsfrist ist abgelaufen.', recommendedAction: 'anonymisieren', dueSince: '2026-02-05T00:00:00.000Z', entityType: 'case', entityId: 'case-test-0003', privacyReviewRequired: true, legalBasis: 'Art. 5 Abs. 1 lit. e DSGVO' },
          { id: 'retention-deadline-test-0001', type: 'free_deadline_review', riskLevel: 'warning', title: 'Erledigte Frist prüfen', reference: 'Wiedervorlage', description: 'Die Frist benötigt eine manuelle Prüfung.', recommendedAction: 'loeschen', dueSince: '2026-04-01T00:00:00.000Z', entityType: 'deadline', entityId: 'deadline-test-0001', privacyReviewRequired: true, legalBasis: 'Art. 5 Abs. 1 lit. e DSGVO' },
        ],
        counts: { total: 2, critical: 1, warning: 1, info: 0 },
      }),
      getSettings: async () => ({ closedCaseReviewMonths: 36, inactiveOpenCaseMonths: 36, orphanContactReviewDays: 0, completedDeadlineRetentionMonths: 36, activityJournalReviewMonths: 36, participationViolationReviewMonths: 36, minimumGroupSizeForReports: 5 }),
      updateSettings: async (settings) => settings,
      anonymizeCase: async () => ({ ok: true, action: 'case_anonymized', message: 'Fallakte wurde anonymisiert.' }),
      deleteCase: async () => ({ ok: true, action: 'case_deleted', message: 'Fallakte wurde gelöscht.' }),
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
        const modeLabel = input.anonymizationMode === 'replace_all_free_text'
          ? 'alle Freitexte ersetzt'
          : 'nur vorgemerkte Freitexte';
        return { ok: true, message: `Fallakte wurde anonymisiert (${modeLabel}).`, affectedRows: 1, affectedFiles: 0 };
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
      generateDocument: async (id) => ({ violationId: id, filename: 'beteiligungsverstoss-e2e.pdf', documentId: `document-${Date.now()}`, sizeBytes: 1024, sha256: 'e2e-sha256', previewStatus: 'requested' }),
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
    elections: {
      list: async () => sbvElections,
      get: async (id) => sbvElections.find((item) => item.id === id),
      create: async (input) => { const row = { id: `election-${Date.now()}`, legalRuleVersion: 'SGBIX-2026-01-16|SchwbVWO-2022-03-18', status: 'draft', eligibleDisabledEmployeeCount: 0, minimumThresholdMet: false, spatiallySeparated: false, eligibleCountSnapshot: 0, deputyCount: 1, voters: [], boardMembers: [], boardSessions: [], candidates: [], proposals: [], objections: [], createdAt: now, updatedAt: now, ...input }; if (input.kind === 'deputy_by_election') row.officeTermEnd = input.incumbentTermEnd || input.officeTermEnd; sbvElections.unshift(row); return row; },
      configureSetup: async (id, input) => { const row = sbvElections.find((item) => item.id === id); const count = Number(input.confirmedSeverelyDisabledCount || 0) + Number(input.confirmedEqualizedCount || 0); const suggested = count < 50 && !input.spatiallySeparated ? 'simplified' : 'formal'; Object.assign(row, { procedure: input.procedure || suggested, status: count >= 5 ? 'procedure_confirmed' : 'draft', eligibilityCheckDate: input.eligibilityCheckDate, eligibleDisabledEmployeeCount: count, minimumThresholdMet: count >= 5, spatiallySeparated: Boolean(input.spatiallySeparated), eligibleCountSnapshot: count, deputyCount: input.deputyCount || row.deputyCount, electionDate: input.electionDate || row.electionDate, eligibilityCheckBasis: JSON.stringify({ confirmedSeverelyDisabledCount: input.confirmedSeverelyDisabledCount, confirmedEqualizedCount: input.confirmedEqualizedCount, pendingEqualizationCount: input.pendingEqualizationCount || 0 }), updatedAt: now }); return { eligibleCountSnapshot: count, minimumThresholdMet: count >= 5, suggestedProcedure: suggested, selectedProcedure: row.procedure, procedureDiffersFromSuggestion: row.procedure !== suggested, regularElectionDateValid: true, startReady: count >= 5, legalRuleVersion: row.legalRuleVersion }; },
      overview: async (id) => { const election = sbvElections.find((item) => item.id === id); const conflicts = []; if (!election.minimumThresholdMet) conflicts.push('Mindestschwelle von fünf bestätigten Wahlberechtigten ist nicht erfüllt.'); if (!election.procedure) conflicts.push('Wahlverfahren ist noch nicht bestätigt.'); return { election, voters: election.voters, boardMembers: election.boardMembers, boardSessions: election.boardSessions, candidates: election.candidates, proposals: election.proposals, objections: election.objections, conflicts }; },
      saveVoter: async (id, input) => { const e = sbvElections.find((item) => item.id === id); const eligible = input.eligibilityBasis === 'severely_disabled_confirmed' || input.eligibilityBasis === 'equalized_confirmed'; const row = { id: input.id || `voter-${Date.now()}`, electionId: id, listStatus: eligible ? 'eligible' : 'not_eligible', createdAt: now, updatedAt: now, ...input }; e.voters.push(row); return row; },
      syncVotersFromPersons: async (id) => { const e = sbvElections.find((item) => item.id === id); const eligiblePersons = persons.filter((person) => person.recordKind !== 'pseudonymous_request' && person.employmentState === 'active_employee' && ['severely_disabled', 'equivalent'].includes(person.protectionStatus)); let created = 0; let updated = 0; let unchanged = 0; for (const person of eligiblePersons) { const voterId = `person-${id}-${person.id}`; let row = e.voters.find((item) => item.id === voterId); const next = { id: voterId, electionId: id, lastName: person.lastName, firstName: person.firstName, orgUnit: person.organizationalUnit, eligibilityBasis: person.protectionStatus === 'equivalent' ? 'equalized_confirmed' : 'severely_disabled_confirmed', eligibilityVerifiedAt: person.evidenceCheckedAt, listStatus: 'eligible', updatedAt: now }; if (!row) { row = { ...next, createdAt: now }; e.voters.push(row); created += 1; } else { Object.assign(row, next); updated += 1; } } return { eligiblePersons: eligiblePersons.length, created, updated, unchanged }; },
      selectVoterImportFile: async () => ({ canceled: true }),
      previewVoterImport: async () => ({ columns: ['Name', 'Status'], rows: [], warnings: [] }),
      importVotersFromPersonFile: async (id) => { const e = sbvElections.find((item) => item.id === id); const row = { id: `file-voter-${Date.now()}`, electionId: id, lastName: 'Importperson', firstName: 'Ida', eligibilityBasis: 'equalized_confirmed', listStatus: 'eligible', createdAt: now, updatedAt: now }; e.voters.push(row); return { totalRows: 1, imported: 1, skipped: 0, warnings: [] }; },
      saveBoardMember: async (id, input) => { const e = sbvElections.find((item) => item.id === id); const row = { id: input.id || `member-${Date.now()}-${e.boardMembers.length}`, electionId: id, createdAt: now, updatedAt: now, ...input }; e.boardMembers.push(row); return row; },
      saveBoardSession: async (id, input) => { const e = sbvElections.find((item) => item.id === id); const row = { id: `session-${Date.now()}`, electionId: id, createdAt: now, updatedAt: now, ...input }; e.boardSessions.push(row); return row; },
      saveObjection: async (id, input) => { const e = sbvElections.find((item) => item.id === id); let row = input.id ? e.objections.find((item) => item.id === input.id) : null; if (!row) { row = { id: `objection-${Date.now()}`, electionId: id, createdAt: now }; e.objections.push(row); } Object.assign(row, input, { updatedAt: now }); return row; },
      saveCandidate: async (id, input) => { const e = sbvElections.find((item) => item.id === id); const row = { id: input.id || `candidate-${Date.now()}`, electionId: id, personSnapshot: input.personSnapshot, officeType: input.officeType, eligibilityStatus: input.ageOnElectionDay >= 18 ? 'policy_eligible' : 'policy_conflict', createdAt: now, updatedAt: now }; e.candidates.push(row); e.deputyCountLockedAt = now; return row; },
      saveProposal: async (id, input) => { const e = sbvElections.find((item) => item.id === id); const row = { id: input.id || `proposal-${Date.now()}`, electionId: id, validityStatus: input.validityStatus || 'received', candidateIds: input.candidateIds || [], supporterVoterIds: input.supporterVoterIds || [], createdAt: now, updatedAt: now, ...input }; e.proposals.push(row); return row; },
      startGracePeriod: async (id, sourceDate) => { const e = sbvElections.find((item) => item.id === id); const row = { id: `proposal-grace-${Date.now()}`, electionId: id, receivedAt: sourceDate, validityStatus: 'grace_period', candidateIds: [], supporterVoterIds: [], correctionDueAt: new Date(new Date(sourceDate).getTime() + 7 * 86400000).toISOString().slice(0, 10), createdAt: now, updatedAt: now }; e.proposals.push(row); return row; },
      recordNoticeIssued: async () => ({ recorded: true }),
      markPreparation: async (id) => { const e = sbvElections.find((item) => item.id === id); e.status = 'preparation'; return e; },
      journalPrefill: async (id, activity) => { const labels = { preparation: 'Wahlvorbereitung', board_work: 'Arbeit des Wahlorgans', voter_list: 'Wählerliste', nominations: 'Wahlvorschläge', voting: 'Stimmabgabe', counting: 'Auszählung', result: 'Wahlergebnis', archive: 'Wahlabschluss' }; return activityJournalPrefill({ contextType: 'fallfrei', contextId: id, title: `SBV-Wahl: ${labels[activity] || 'Wahltätigkeit'}`, category: 'sbv_self_organization' }); },
      generateDocument: async (id, input) => ({ document: { id: `election-doc-${Date.now()}`, filename: `${input.kind}-${id}.pdf`, sha256: 'c'.repeat(64) }, previewStatus: 'requested' }),
      executionOverview: async (id) => { const e = sbvElections.find((item) => item.id === id); e.mailBallots ||= []; e.voteTotals ||= []; e.results ||= []; e.physicalRecords ||= []; e.events ||= []; return { mailBallots: e.mailBallots, voteTotals: e.voteTotals, results: e.results, physicalRecords: e.physicalRecords, events: e.events }; },
      recordElectionDayChecklist: async (id, input) => { const e = sbvElections.find((item) => item.id === id); e.events ||= []; e.events.push({ eventType: 'election_day_checklist', occurredAt: input.recordedAt, metadata: { ...input } }); return { mailBallots: e.mailBallots || [], voteTotals: e.voteTotals || [], results: e.results || [], physicalRecords: e.physicalRecords || [], events: e.events }; },
      saveMailBallot: async (id, input) => { const e = sbvElections.find((item) => item.id === id); e.mailBallots ||= []; let row = e.mailBallots.find((item) => item.voterId === input.voterId); if (!row) { row = { id: `mail-${Date.now()}`, electionId: id, voterId: input.voterId, createdAt: now }; e.mailBallots.push(row); } Object.assign(row, input, { destroyDueAt: input.lateReceivedAt && input.announcementDate ? new Date(new Date(input.announcementDate).getTime() + 30 * 86400000).toISOString().slice(0, 10) : row.destroyDueAt, updatedAt: now }); return row; },
      recordTotals: async (id, input) => { const e = sbvElections.find((item) => item.id === id); e.voteTotals ||= []; e.results ||= []; e.voteTotals = e.voteTotals.filter((item) => item.officeType !== input.officeType); e.results = e.results.filter((item) => item.officeType !== input.officeType); const sorted = [...input.candidateVotes].sort((a, b) => b.votes - a.votes); const maxRank = input.officeType === 'representative' ? 1 : Number(e.deputyCount || 1); sorted.forEach((candidateVote, index) => { const previous = sorted[index - 1]; const rank = previous && previous.votes === candidateVote.votes ? (e.voteTotals.find((item) => item.candidateId === previous.candidateId)?.rank || index + 1) : index + 1; e.voteTotals.push({ id: `total-${Date.now()}-${index}`, electionId: id, officeType: input.officeType, candidateId: candidateVote.candidateId, votes: candidateVote.votes, rank, createdAt: now, updatedAt: now }); const tie = sorted.some((other, otherIndex) => otherIndex !== index && other.votes === candidateVote.votes && rank <= maxRank); e.results.push({ id: `result-${Date.now()}-${index}`, electionId: id, officeType: input.officeType, candidateId: candidateVote.candidateId, electedRank: rank <= maxRank ? rank : undefined, lotRequired: tie, acceptanceStatus: rank <= maxRank ? 'pending' : 'replaced', createdAt: now, updatedAt: now }); }); return { mailBallots: e.mailBallots || [], voteTotals: e.voteTotals, results: e.results, physicalRecords: e.physicalRecords || [], events: e.events || [] }; },
      recordLotDecision: async (id, input) => { const e = sbvElections.find((item) => item.id === id); const result = (e.results || []).find((item) => item.officeType === input.officeType && item.candidateId === input.candidateId); if (result) { result.lotRequired = false; result.lotDecidedAt = input.decidedAt; result.electedRank = 1; result.acceptanceStatus = 'pending'; } (e.results || []).filter((item) => item.officeType === input.officeType && item.candidateId !== input.candidateId && item.electedRank === 1).forEach((item) => { item.electedRank = undefined; item.acceptanceStatus = 'replaced'; item.lotRequired = false; }); return result; },
      recordAcceptance: async (id, input) => { const e = sbvElections.find((item) => item.id === id); const result = (e.results || []).find((item) => item.id === input.resultId); if (result) Object.assign(result, { notifiedAt: input.notifiedAt, acceptanceStatus: input.status, updatedAt: now }); return { mailBallots: e.mailBallots || [], voteTotals: e.voteTotals || [], results: e.results || [], physicalRecords: e.physicalRecords || [], events: e.events || [] }; },
      savePhysicalRecord: async (id, input) => { const e = sbvElections.find((item) => item.id === id); e.physicalRecords ||= []; const row = { id: input.id || `physical-${Date.now()}`, electionId: id, quantity: input.quantity || 1, originalRequired: input.originalRequired !== false, createdAt: now, updatedAt: now, ...input }; e.physicalRecords.push(row); return row; },
      close: async (id, input) => { const e = sbvElections.find((item) => item.id === id); Object.assign(e, { status: 'closed', retentionUntil: input.retentionUntil, legalHoldStatus: input.challengePending ? 'active' : 'none', updatedAt: now }); return { closed: true }; },
      generateExecutionDocument: async (id, input) => ({ document: { id: `election-exec-doc-${Date.now()}`, filename: `${input.kind}-${id}.pdf`, sha256: 'd'.repeat(64) }, previewStatus: 'requested' }),
      exportPdfArchive: async (id) => ({ document: { id: `election-archive-${Date.now()}`, filename: `wahlakte-${id}.pdf`, sha256: 'e'.repeat(64) }, previewStatus: 'requested' }),
      exportDocument: async (_documentId, suggestedFileName) => ({ exported: true, fileName: suggestedFileName || 'wahlunterlage.pdf', sizeBytes: 2048 }),
      exportTransferFile: async (id) => ({ exported: true, fileName: `wahlakte-${id}.gsbvelection`, packageId: `election_pkg_${Date.now()}`, electionId: id, createdAt: now, formatVersion: 1, legalRuleVersion: 'SGBIX-2026-01-16|SchwbVWO-2022-03-18', itemCount: 1, manifestHash: 'f'.repeat(64) }),
      selectTransferFile: async () => ({ canceled: true }),
      importTransferFile: async () => ({ importId: `import-${Date.now()}`, packageId: 'election_pkg', electionId: `election-import-${Date.now()}`, manifestHash: 'f'.repeat(64) }),
    },
    sbvOffice: {
      meetings: {
        list: async () => cloneForIpc(sbvOfficeMeetings),
        create: async (input) => { const row = { id: `meeting-${Date.now()}`, attendanceStatus: 'planned', agenda: [], createdAt: now, updatedAt: now, ...input }; sbvOfficeMeetings.unshift(row); return cloneForIpc(row); },
        update: async (id, input) => { const row = sbvOfficeMeetings.find((item) => item.id === id); Object.assign(row, input, { updatedAt: now }); return cloneForIpc(row); },
        journalPrefill: async (id, activity) => {
          const meeting = sbvOfficeMeetings.find((item) => item.id === id);
          const labels = { attendance: 'Teilnahme', preparation: 'Vorbereitung', top_request: 'TOP-Antrag', suspension: 'Aussetzung' };
          return activityJournalPrefill({
            contextType: 'fallfrei',
            contextId: id,
            title: `${labels[activity] || 'Sitzung'}: ${meeting?.title || 'Sitzung'}`,
            category: activity === 'attendance' || activity === 'preparation' ? 'committee_work' : 'sbv_steering',
          });
        },
        saveAgenda: async (id, input) => { const row = sbvOfficeMeetings.find((item) => item.id === id); let agenda = input.id ? row.agenda.find((item) => item.id === input.id) : null; if (!agenda) { agenda = { id: input.id || `agenda-${Date.now()}`, meetingId: id, position: input.position || row.agenda.length + 1, sbvRelevance: false, requestedBySbv: false, significantImpairment: false, nonParticipation: false, status: 'open' }; row.agenda.push(agenda); } Object.assign(agenda, input); if (agenda.suspensionRequestedAt && agenda.resolutionAt && (agenda.significantImpairment || agenda.nonParticipation) && !agenda.suspensionDueAt) agenda.suspensionDueAt = new Date(new Date(agenda.resolutionAt).getTime() + 7 * 86400000).toISOString(); return cloneForIpc(agenda); },
        createAgendaFollowUp: async (agendaId, dueAt) => ({ id: `deadline-${Date.now()}`, processId: agendaId, dueAt, status: 'open' }),
      },
      assemblies: {
        list: async () => cloneForIpc(sbvOfficeAssemblies),
        annualWarning: async (year) => new Date().getMonth() >= 9 && !sbvOfficeAssemblies.some((item) => item.year === year && (item.scheduledAt || item.status === 'held' || item.status === 'closed')),
        createFollowUp: async (id, dueAt) => ({ id: `deadline-${Date.now()}`, processId: id, dueAt, status: 'open' }),
        save: async (input) => { let row = input.id ? sbvOfficeAssemblies.find((item) => item.id === input.id) : null; if (!row) { row = { id: `assembly-${Date.now()}`, createdAt: now }; sbvOfficeAssemblies.unshift(row); } Object.assign(row, input, { updatedAt: now }); return cloneForIpc(row); },
        generateDocument: async (id, kind) => ({ document: { id: `doc-${Date.now()}`, filename: `assembly-${id}-${kind}.pdf`, sha256: 'a'.repeat(64) }, previewStatus: 'requested' }),
      },
      obligations: { list: async () => cloneForIpc(sbvOfficeObligations), ensureAnnual: async (year) => { if (!sbvOfficeObligations.some((item) => item.periodYear === year)) sbvOfficeObligations.push({ id: `obligation-${year}`, obligationKey: 'employment_report_163_2', periodYear: year, scopeKey: 'company', status: 'not_due', dueAt: `${year + 1}-03-31T23:59:59.000Z`, createdAt: now, updatedAt: now }); return cloneForIpc(sbvOfficeObligations); }, save: async (input) => { const row = sbvOfficeObligations.find((item) => item.id === input.id); if (!row) throw new Error('Prüfvorgang nicht gefunden.'); Object.assign(row, input, { updatedAt: now }); return cloneForIpc(row); } },
      officers: { list: async () => cloneForIpc(sbvOfficeOfficers), save: async (input) => { const row = { id: `officer-${Date.now()}`, status: 'not_appointed', createdAt: now, updatedAt: now, ...input }; sbvOfficeOfficers.unshift(row); return cloneForIpc(row); } },
      agreements: { list: async () => cloneForIpc(sbvOfficeAgreements), requestDraft: async (dueAt) => ({ text: `Verhandlungsanforderung${dueAt ? ` bis ${dueAt}` : ''}`, responseDueAt: dueAt }), createResponseDeadline: async (id, dueAt) => ({ id: `deadline-${Date.now()}`, processId: id, dueAt, status: 'open' }), save: async (input) => { let row = input.id ? sbvOfficeAgreements.find((item) => item.id === input.id) : null; if (!row) { const id = `agreement-${Date.now()}`; row = { id, topics: [{"id": "topic-0", "agreementId": "", "topicKey": "personnel_planning", "status": "open"}, {"id": "topic-1", "agreementId": "", "topicKey": "workplace_design", "status": "open"}, {"id": "topic-2", "agreementId": "", "topicKey": "work_environment", "status": "open"}, {"id": "topic-3", "agreementId": "", "topicKey": "work_organization", "status": "open"}, {"id": "topic-4", "agreementId": "", "topicKey": "working_time", "status": "open"}, {"id": "topic-5", "agreementId": "", "topicKey": "vacancies", "status": "open"}, {"id": "topic-6", "agreementId": "", "topicKey": "employment_quota", "status": "open"}, {"id": "topic-7", "agreementId": "", "topicKey": "part_time", "status": "open"}, {"id": "topic-8", "agreementId": "", "topicKey": "training_youth", "status": "open"}, {"id": "topic-9", "agreementId": "", "topicKey": "prevention_bem_health", "status": "open"}, {"id": "topic-10", "agreementId": "", "topicKey": "occupational_physician", "status": "open"}].map((topic) => ({ ...topic, agreementId: id })), createdAt: now }; sbvOfficeAgreements.unshift(row); } Object.assign(row, input, { updatedAt: now }); return cloneForIpc(row); }, saveTopic: async (id, input) => { const row = sbvOfficeAgreements.find((item) => item.id === id); if (!row) throw new Error('Inklusionsvereinbarung nicht gefunden.'); const topic = row.topics.find((item) => item.topicKey === input.topicKey); if (!topic) throw new Error('Themenfeld nicht gefunden.'); Object.assign(topic, input); return cloneForIpc(topic); } },
      documents: { selectAndAttach: async (_ownerType, ownerId) => [{ id: `office-doc-${Date.now()}`, ownerId, filename: 'nachweis.pdf', sha256: 'b'.repeat(64) }] },
      complaints: { list: async () => cloneForIpc(sbvOfficeComplaints), save: async (input) => { const row = { id: `complaint-${Date.now()}`, status: 'open', createdAt: now, updatedAt: now, ...input }; sbvOfficeComplaints.unshift(row); return cloneForIpc(row); }, templates: async () => [{ key: 'additional_leave', title: 'Zusatzurlaub', legalBasis: '§ 208 SGB IX', checklist: ['Anspruch prüfen'] }] },
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
