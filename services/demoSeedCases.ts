import type { DatabaseAdapter } from "./databaseService.js";
import { CASE_CATEGORIES, CASE_MEASURE_TYPES, daysFromNow, id, noteMeasureTypeFor, run } from "./demoSeedSupport.js";
export function seedCasesAndProcesses(db: DatabaseAdapter, timestamp: string): void {
  const statuses = ["offen", "in_bearbeitung", "ruhend", "abgeschlossen"];
  const priorities = ["normal", "wichtig", "kritisch"];
  const riskLevels = ["normal", "warning", "critical", "problem"];

  for (let index = 1; index <= 20; index += 1) {
    const caseId = id("case", index);
    const personIndex = ((index - 1) % 30) + 1;
    const caseNumber = `SBV-DEMO-${String(index).padStart(3, "0")}`;
    run(
      db,
      `INSERT INTO cases (
        id, case_number, person_id, display_name, category, status, priority,
        opened_at, closed_at, summary, risk_level, is_pseudonymized, is_locked,
        review_at, created_at, updated_at, protected_person_id, person_binding_state,
        privacy_review_required, privacy_review_reason, privacy_review_due_at,
        privacy_review_priority, anonymization_recommended
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?)`,
      caseId,
      caseNumber,
      id("legacy-person", personIndex),
      `Demo-Fall ${index}: ${CASE_CATEGORIES[(index - 1) % CASE_CATEGORIES.length]}`,
      CASE_CATEGORIES[(index - 1) % CASE_CATEGORIES.length],
      statuses[(index - 1) % statuses.length],
      priorities[(index - 1) % priorities.length],
      daysFromNow(-45 - index),
      index % 7 === 0 ? daysFromNow(-index) : null,
      "Synthetischer Fall für Demo, Schulung und UI-Prüfung. Enthält keine realen personenbezogenen Daten.",
      riskLevels[(index - 1) % riskLevels.length],
      1,
      daysFromNow(14 + index),
      timestamp,
      timestamp,
      id("person", personIndex),
      index % 5 === 0 ? 1 : 0,
      index % 5 === 0 ? "Demo-Prüfung: Aufbewahrung und Anonymisierung bewerten." : null,
      daysFromNow(30 + index),
      index % 5 === 0 ? "high" : "normal",
      index % 6 === 0 ? 1 : 0
    );

    run(
      db,
      `INSERT INTO person_case_links (id, protected_person_id, case_file_id, link_state, created_at, link_reason)
       VALUES (?, ?, ?, 'active', ?, ?)`,
      id("person-case-link", index),
      id("person", personIndex),
      caseId,
      timestamp,
      "Demo-Verknüpfung"
    );

    run(
      db,
      `INSERT INTO case_notes (
        id, case_id, title, note_date, note_type, participants, content, next_steps,
        contains_health_data, confidential_level, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id("note", index),
      caseId,
      "Demo-Erstkontakt",
      daysFromNow(-20 - index),
      "beratung",
      "SBV, betroffene Person",
      "Demo-Notiz: Anliegen aufgenommen, Arbeitsbedingungen und mögliche Unterstützungsbedarfe strukturiert geklärt.",
      "Nächsten Termin vereinbaren und passende Maßnahme prüfen.",
      1,
      index % 4 === 0 ? "hoch_sensibel" : "sensibel",
      timestamp,
      timestamp
    );

    run(
      db,
      `INSERT INTO case_note_cases (note_id, case_id, is_primary, created_at) VALUES (?, ?, 1, ?)`,
      id("note", index),
      caseId,
      timestamp
    );

    const deadlineStatus = index % 6 === 0 ? "completed" : "open";
    const deadlineDueAt = deadlineStatus === "completed" ? daysFromNow(-2 - index) : daysFromNow(5 + index);

    run(
      db,
      `INSERT INTO deadlines (
        id, case_id, person_id, process_id, process_type, deadline_type, title,
        confidential_title, description, due_at, reminder_at, legal_basis,
        source_event, severity, status, calculation_mode, is_legal_deadline,
        dashboard_from_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual', ?, ?, ?, ?)`,
      id("deadline", index),
      caseId,
      id("legacy-person", personIndex),
      caseId,
      CASE_CATEGORIES[(index - 1) % CASE_CATEGORIES.length],
      index % 3 === 0 ? "legal_deadline" : "follow_up",
      `Demo-Frist ${index}`,
      `Vertrauliche Demo-Frist ${index}`,
      "Synthetische Wiedervorlage für Demo-Dashboard.",
      deadlineDueAt,
      deadlineStatus === "completed" ? daysFromNow(-3 - index) : daysFromNow(2 + index),
      index % 3 === 0 ? "§ 178 Abs. 2 Satz 1 SGB IX" : "§ 164 Abs. 4 SGB IX",
      "demo_seed",
      ["normal", "important", "critical", "fatal"][index % 4],
      deadlineStatus,
      index % 3 === 0 ? 1 : 0,
      daysFromNow(-3),
      timestamp,
      timestamp
    );

    seedProcessRows(db, caseId, index, timestamp);
    seedMeasures(db, caseId, index, timestamp);
  }
}

function seedProcessRows(db: DatabaseAdapter, caseId: string, index: number, timestamp: string): void {
  run(
    db,
    `INSERT INTO bem_processes (
      id, case_id, status, title, trigger_type, trigger_description,
      sickness_days_twelve_months, bem_offered_at, response_due_at,
      employee_response, privacy_notice_at, first_meeting_at, participants,
      measures, next_review_at, result, confidential_notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'au_zeiten', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id("bem", index),
    caseId,
    ["zu_pruefen", "angeboten", "laufend", "abgeschlossen"][index % 4],
    `Demo-BEM ${index}`,
    "Mehr als sechs Wochen Arbeitsunfähigkeit innerhalb von zwölf Monaten.",
    42 + index,
    daysFromNow(-10 - index),
    daysFromNow(7 + index),
    ["offen", "zugestimmt", "abgelehnt"][index % 3],
    daysFromNow(-9 - index),
    daysFromNow(4 + index),
    "SBV, BEM-Team, betroffene Person",
    "Arbeitszeit, technische Hilfen, Aufgabenklärung",
    daysFromNow(30 + index),
    index % 4 === 0 ? "abgeschlossen_mit_massnahmen" : null,
    "Demo-BEM ohne reale Gesundheitsdaten.",
    timestamp,
    timestamp
  );

  run(
    db,
    `INSERT INTO prevention_processes (
      id, case_id, status, first_knowledge_at, requested_at, employer_response_due_at,
      integration_office_involved_at, difficulty_type, risk_type, person_status,
      hazard_description, employer_request_summary, measures, result,
      next_review_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id("prevention", index),
    caseId,
    ["zu_pruefen", "angefordert", "laufend", "abgeschlossen"][index % 4],
    daysFromNow(-18 - index),
    daysFromNow(-15 - index),
    daysFromNow(5 + index),
    index % 2 === 0 ? daysFromNow(-5) : null,
    ["personenbedingt", "verhaltensbedingt", "betriebsbedingt", "sonstiges"][index % 4],
    ["arbeitsplatz", "gesundheit", "konflikt", "sonstiges"][index % 4],
    ["schwerbehindert", "gleichgestellt", "beantragt", "unklar"][index % 4],
    "Demo-Gefährdung des Beschäftigungsverhältnisses erkannt.",
    "Arbeitgeber soll Präventionsverfahren strukturiert durchführen.",
    "Klärung Arbeitsplatz, Belastungen und externe Hilfen.",
    index % 3 === 0 ? "Maßnahmen vereinbart" : null,
    daysFromNow(21 + index),
    timestamp,
    timestamp
  );

  run(
    db,
    `INSERT INTO equalization_processes (
      id, case_id, application_status, agency_reference, application_submitted_at,
      decision_received_at, objection_due_at, outcome, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id("equalization", index),
    caseId,
    ["beratung", "vorbereitung", "eingereicht", "nachfrage", "bewilligt", "abgelehnt", "widerspruch", "abgeschlossen"][index % 8],
    `GL-${String(2000 + index)}`,
    daysFromNow(-12 - index),
    index % 4 === 0 ? daysFromNow(-2) : null,
    daysFromNow(25 + index),
    index % 4 === 0 ? "Gleichstellung bewilligt" : null,
    "Demo-Gleichstellungsprozess.",
    timestamp,
    timestamp
  );

  run(
    db,
    `INSERT INTO termination_hearings (
      id, case_id, status, termination_type, protection_status, received_at,
      employer_deadline_at, sbv_statement_due_at, works_council_hearing_at,
      integration_office_requested_at, employer_reason, missing_information,
      sbv_assessment, statement, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id("termination", index),
    caseId,
    ["eingang", "informationen_offen", "stellungnahme", "abgeschlossen"][index % 4],
    ["ordentlich", "ausserordentlich", "aenderung", "sonstiges"][index % 4],
    ["schwerbehindert", "gleichgestellt", "beantragt", "unklar"][index % 4],
    daysFromNow(-3 - index),
    daysFromNow(10 + index),
    daysFromNow(6 + index),
    daysFromNow(-2 - index),
    index % 2 === 0 ? daysFromNow(-1) : null,
    "Demo-Arbeitgeberbegründung mit offenem Klärungsbedarf.",
    "Sozialdaten, leidensgerechte Alternativen und BEM-Verlauf fehlen.",
    "SBV sieht erheblichen Prüf- und Beteiligungsbedarf.",
    "Demo-Stellungnahme: Kündigung ohne vollständige Prüfung ablehnen.",
    timestamp,
    timestamp
  );

  run(
    db,
    `INSERT INTO sbv_participations (
      id, case_id, title, measure_type, status, risk_level, person_status,
      decision_stage, first_known_at, information_received_at, hearing_requested_at,
      statement_due_at, information_complete, hearing_before_decision,
      decision_notified, violation_summary, sbv_position, next_step, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id("participation", index),
    caseId,
    `Demo-Beteiligung ${index}`,
    ["versetzung", "arbeitszeit", "arbeitsplatz", "kuendigung", "sonstiges"][index % 5],
    ["neu", "angehoert", "stellungnahme", "abgeschlossen"][index % 4],
    ["normal", "warning", "critical"][index % 3],
    ["schwerbehindert", "gleichgestellt", "beantragt", "unklar"][index % 4],
    ["vor_planung", "vor_entscheidung", "nach_entscheidung", "unklar"][index % 4],
    daysFromNow(-8 - index),
    daysFromNow(-7 - index),
    daysFromNow(-6 - index),
    daysFromNow(4 + index),
    index % 2,
    index % 3 === 0 ? 0 : 1,
    index % 4 === 0 ? 0 : 1,
    index % 3 === 0 ? "Beteiligung möglicherweise verspätet." : null,
    "SBV fordert vollständige Unterrichtung vor Entscheidung.",
    "Unterlagen prüfen und Stellungnahme vorbereiten.",
    timestamp,
    timestamp
  );
}

function seedMeasures(db: DatabaseAdapter, caseId: string, caseIndex: number, timestamp: string): void {
  CASE_MEASURE_TYPES.forEach((type, offset) => {
    const index = caseIndex * 10 + offset;
    const measureId = `demo-measure-${String(caseIndex).padStart(2, "0")}-${type}`;
    run(
      db,
      `INSERT INTO case_measures (
        id, case_id, type, title, status, risk_level, created_from,
        summary, next_step, due_at, opened_at, requires_follow_up,
        source_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'demo_seed', ?, ?, ?, ?, ?, ?, ?, ?)`,
      measureId,
      caseId,
      type,
      `Demo-Maßnahme ${type.replace(/_/g, " ")}`,
      ["open", "in_progress", "done"][offset % 3],
      ["normal", "warning", "critical"][offset % 3],
      "Synthetische Maßnahme für Demo der Prozessmodule.",
      "Nächsten Schritt prüfen und dokumentieren.",
      daysFromNow(8 + offset + caseIndex),
      daysFromNow(-12 - caseIndex),
      offset % 2,
      id(type, caseIndex),
      timestamp,
      timestamp
    );

    run(
      db,
      `INSERT INTO case_measure_notes (
        id, case_id, measure_type, measure_id, title, note_at, participants,
        content, next_steps, contains_health_data, confidential_level, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'sensibel', ?, ?)`,
      `demo-measure-note-${String(index).padStart(3, "0")}`,
      caseId,
      noteMeasureTypeFor(type),
      measureId,
      "Demo-Maßnahmennotiz",
      daysFromNow(-2 - offset),
      "SBV",
      "Synthetische Notiz zur Maßnahme.",
      "Status im nächsten Termin prüfen.",
      timestamp,
      timestamp
    );

    if (type === "sbv_participation") {
      run(
        db,
        `INSERT INTO case_measure_participation (
          measure_id, employer_measure_type, person_status, decision_stage,
          participation_status, sbv_knowledge_at, employer_information_at,
          hearing_requested_at, sbv_statement_due_at, information_complete,
          hearing_before_decision, decision_notified, violation_summary,
          sbv_position, created_at, updated_at
        ) VALUES (?, 'versetzung', 'schwerbehindert', 'vor_entscheidung', 'neu', ?, ?, ?, ?, 1, 1, 0, ?, ?, ?, ?)`,
        measureId,
        daysFromNow(-5),
        daysFromNow(-4),
        daysFromNow(-3),
        daysFromNow(5),
        "Demo: Entscheidung noch nicht vollständig mitgeteilt.",
        "SBV fordert Unterrichtung und Anhörung vor Umsetzung.",
        timestamp,
        timestamp
      );
    }

    if (type === "workplace_accommodation") {
      run(
        db,
        `INSERT INTO case_measure_workplace_accommodation (
          measure_id, category, accommodation_status, requested_adjustment,
          legal_basis, barrier_or_limitation, workplace_context, proposed_solution,
          technical_aid_needed, organizational_adjustment_needed,
          working_time_adjustment_needed, fixed_workplace_needed,
          homeoffice_or_mobile_work_relevant, inclusion_office_involved,
          employer_response_status, implementation_status, effectiveness_review_at,
          outcome, created_at, updated_at
        ) VALUES (?, 'ergonomie', 'beantragt', ?, '§ 164 Abs. 4 SGB IX', ?, ?, ?, 1, 1, 1, 1, 1, 1, 'offen', 'nicht_begonnen', ?, ?, ?, ?)`,
        measureId,
        "Ergonomischer Arbeitsplatz, feste Desk-Zuordnung und angepasste Arbeitsorganisation.",
        "Belastungen durch wechselnde Arbeitsplätze und lange Wege.",
        "IT-Arbeitsplatz im Demo-Teamkontext.",
        "Fester Arbeitsplatz, Hilfsmittelprüfung, Homeofficeanteil und Reviewtermin.",
        daysFromNow(45),
        "Demo-Ergebnis offen.",
        timestamp,
        timestamp
      );
    }
  });
}

