import type { DatabaseAdapter } from "./databaseService.js";

const DEMO_SEED_MARKER_KEY = "demo.seed.version";
const DEMO_SEED_VERSION = "1.0.0-demo-001";

function nowIso(): string {
  return new Date().toISOString();
}

function daysFromNow(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function id(prefix: string, index: number): string {
  return `demo-${prefix}-${String(index).padStart(2, "0")}`;
}

function run(db: DatabaseAdapter, sql: string, ...params: unknown[]): void {
  db.prepare(sql).run(...params);
}

function json(value: unknown): string {
  return JSON.stringify(value);
}

const FIRST_NAMES = [
  "Mara",
  "Jonas",
  "Aylin",
  "Henrik",
  "Samira",
  "Tobias",
  "Leonie",
  "Malik",
  "Katharina",
  "Noah",
  "Sofia",
  "Lennart",
  "Mina",
  "Felix",
  "Nora",
  "Oskar",
  "Amira",
  "David",
  "Jule",
  "Ben",
  "Elif",
  "Paul",
  "Romy",
  "Yasin",
  "Lara",
  "Milan",
  "Tilda",
  "Luis",
  "Greta",
  "Anton",
];

const LAST_NAMES = [
  "Sommer",
  "Neumann",
  "Kaya",
  "Brandt",
  "Schuster",
  "Nguyen",
  "Fischer",
  "Hoffmann",
  "Wagner",
  "Becker",
  "Schneider",
  "Klein",
  "Wolf",
  "Scholz",
  "Krüger",
  "Hartmann",
  "Meier",
  "Koch",
  "Richter",
  "Bauer",
  "Lang",
  "Werner",
  "Schwarz",
  "Lorenz",
  "Zimmer",
  "Krause",
  "Vogel",
  "Engel",
  "Roth",
  "Seidel",
];

const CONTACT_CATEGORIES = [
  "inklusionsamt",
  "agentur_fuer_arbeit",
  "betriebsarzt",
  "reha",
  "anwalt",
  "arbeitgeber",
  "betriebsrat",
  "beratung",
  "intern",
  "sonstiges",
];

const CASE_CATEGORIES = [
  "bem",
  "praevention",
  "kuendigung",
  "gleichstellung",
  "gdb",
  "nachteilsausgleich",
  "diskriminierung",
  "arbeitsplatzgestaltung",
  "teilzeit",
  "sonstiges",
];

const CASE_MEASURE_TYPES = [
  "prevention",
  "bem",
  "termination_hearing",
  "equalization",
  "participation",
  "workplace_accommodation",
];

function seedProtectedPersons(db: DatabaseAdapter, timestamp: string): void {
  const protectionStatuses = [
    "severely_disabled",
    "equivalent",
    "application_pending",
    "unclear",
    "expired",
    "inactive",
  ];
  const lifecycleStates = [
    "active",
    "expiring_soon",
    "expired_review_required",
    "retention_documented",
    "anonymization_pending",
  ];

  for (let index = 1; index <= 30; index += 1) {
    const firstName = FIRST_NAMES[index - 1];
    const lastName = LAST_NAMES[index - 1];
    const protectionStatus = protectionStatuses[(index - 1) % protectionStatuses.length];
    run(
      db,
      `INSERT INTO protected_persons (
        id, created_at, updated_at, record_kind, pseudonym_label, first_name, last_name,
        personnel_number, work_email, organizational_unit, location, employment_state,
        protection_status, status_valid_from, status_valid_until, evidence_checked_at,
        status_source, lifecycle_state, expiry_review_due_at, notes
      ) VALUES (?, ?, ?, 'identified_person', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id("person", index),
      timestamp,
      timestamp,
      `Demo-Person ${index}`,
      firstName,
      lastName,
      `P-${String(1000 + index)}`,
      `${firstName.toLowerCase()}.${lastName.toLowerCase().replace("ü", "ue")}@demo.example`,
      ["IT-Betrieb", "Service Desk", "Entwicklung", "Personal", "Finanzen"][index % 5],
      ["Rostock", "Schwerin", "Greifswald", "Neubrandenburg"][index % 4],
      index % 9 === 0 ? "left_company" : "active_employee",
      protectionStatus,
      daysFromNow(-120 - index),
      daysFromNow(index % 6 === 0 ? -index : 30 + index),
      daysFromNow(-20 - index),
      ["employer_list", "manual", "self_disclosure", "document_presented"][index % 4],
      lifecycleStates[(index - 1) % lifecycleStates.length],
      daysFromNow(20 + index),
      "Synthetischer Demo-Datensatz ohne reale Person."
    );

    run(
      db,
      `INSERT INTO persons (
        id, first_name, last_name, display_name, department, email, phone,
        sb_status, gdb, marks, valid_until, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id("legacy-person", index),
      firstName,
      lastName,
      `${firstName} ${lastName}`,
      ["IT-Betrieb", "Service Desk", "Entwicklung", "Personal", "Finanzen"][index % 5],
      `${firstName.toLowerCase()}.${lastName.toLowerCase().replace("ü", "ue")}@demo.example`,
      `0381 000-${String(index).padStart(3, "0")}`,
      ["schwerbehindert", "gleichgestellt", "beantragt", "unbekannt"][index % 4],
      index % 4 === 0 ? 30 : 50 + (index % 5) * 10,
      index % 3 === 0 ? "G" : "",
      daysFromNow(180 + index),
      "Kompatibler Demo-Datensatz für ältere Listenansichten.",
      timestamp,
      timestamp
    );
  }
}

function seedContacts(db: DatabaseAdapter, timestamp: string): void {
  for (let index = 1; index <= 30; index += 1) {
    run(
      db,
      `INSERT INTO contacts (
        id, first_name, last_name, organization, role, category, email, phone, notes,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id("contact", index),
      ["Anja", "Bernd", "Clara", "Deniz", "Eva", "Frank"][index % 6],
      LAST_NAMES[30 - index],
      [
        "Inklusionsamt Demo",
        "Agentur für Arbeit Demo",
        "Betriebsärztlicher Dienst Demo",
        "Reha-Träger Demo",
        "Kanzlei Muster",
        "Arbeitgeberseite Demo",
      ][index % 6],
      ["Fallberatung", "Reha-Koordination", "Betriebsarzt", "Juristische Beratung", "BR-Ansprechperson"][index % 5],
      CONTACT_CATEGORIES[(index - 1) % CONTACT_CATEGORIES.length],
      `kontakt.${index}@demo.example`,
      `0381 100-${String(index).padStart(3, "0")}`,
      "Synthetischer Demo-Kontakt für Schulung und Präsentation.",
      timestamp,
      timestamp
    );
  }
}

function seedCasesAndProcesses(db: DatabaseAdapter, timestamp: string): void {
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
      daysFromNow(index % 4 === 0 ? -2 : 5 + index),
      daysFromNow(2 + index),
      index % 3 === 0 ? "§ 178 Abs. 2 Satz 1 SGB IX" : "§ 164 Abs. 4 SGB IX",
      "demo_seed",
      ["normal", "important", "critical", "fatal"][index % 4],
      index % 6 === 0 ? "completed" : "open",
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
      type,
      measureId,
      "Demo-Maßnahmennotiz",
      daysFromNow(-2 - offset),
      "SBV",
      "Synthetische Notiz zur Maßnahme.",
      "Status im nächsten Termin prüfen.",
      timestamp,
      timestamp
    );

    if (type === "participation") {
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

function seedSbvResources(db: DatabaseAdapter, timestamp: string): void {
  const kinds = ["training", "deputy_involvement", "equipment", "other"];
  for (let index = 1; index <= 12; index += 1) {
    run(
      db,
      `INSERT INTO sbv_resource_records (
        id, kind, title, legal_basis, started_at, ended_at, provider,
        participants, task_context, necessity_reason, employer_reaction,
        cost_note, status, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id("resource", index),
      kinds[(index - 1) % kinds.length],
      `Demo-Ressource ${index}`,
      "§ 179 Abs. 4 Satz 3 SGB IX",
      daysFromNow(-30 - index),
      index % 3 === 0 ? daysFromNow(-20 - index) : null,
      ["Integrationsamt", "Gewerkschaft", "Fachverlag", "Interne IT"][index % 4],
      "Vertrauensperson, stellvertretende Mitglieder",
      "Demo-Onboarding und laufende SBV-Fallarbeit.",
      "Erforderlich zur sachgerechten Amtsausübung und Barrierefreiheit.",
      index % 4 === 0 ? "Nachfrage des Arbeitgebers dokumentiert." : "Akzeptiert.",
      "Synthetischer Kostenhinweis.",
      ["documented", "requested", "approved", "rejected"][index % 4],
      "Demo-Nachweis ohne reale Kostendaten.",
      timestamp,
      timestamp
    );
  }
}

function seedCompliance(db: DatabaseAdapter, timestamp: string): void {
  for (let index = 1; index <= 5; index += 1) {
    run(
      db,
      `INSERT INTO compliance_incidents (
        id, occurred_at, discovered_at, category, risk_level, status, summary,
        affected_data_categories, immediate_measures, dsb_notified_at,
        authority_notification_checked, data_subjects_informed_at, closed_at,
        lessons_learned, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id("compliance", index),
      daysFromNow(-20 - index),
      daysFromNow(-18 - index),
      ["wrong_export", "lost_backup", "unauthorized_access_suspected", "wrong_recipient", "vault_integrity"][index % 5],
      ["low", "medium", "high"][index % 3],
      ["open", "in_review", "closed"][index % 3],
      `Demo-Datenschutzereignis ${index}`,
      "Fallnotizen, Kontaktmetadaten",
      "Zugriff gesperrt, Sachverhalt dokumentiert, DSB eingebunden.",
      index % 2 === 0 ? daysFromNow(-17 - index) : null,
      1,
      index % 3 === 0 ? daysFromNow(-15 - index) : null,
      index % 3 === 0 ? daysFromNow(-10 - index) : null,
      "Demo-Lerneffekt: Vier-Augen-Prüfung vor Exporten.",
      timestamp,
      timestamp
    );
  }
}

function seedTemplates(db: DatabaseAdapter, timestamp: string): void {
  const templates = [
    ["demo-bem-einladung", "BEM-Einladung", "bem", "Einladung zum BEM-Gespräch", "Sehr geehrte/r {{person.name}},\n\nwir bieten Ihnen ein Betriebliches Eingliederungsmanagement an."],
    ["demo-sbv-anhoerung", "SBV-Anhörung einfordern", "beteiligung", "Anforderung vollständiger Unterrichtung", "Sehr geehrte Damen und Herren,\n\nbitte unterrichten Sie die SBV vollständig nach § 178 Abs. 2 Satz 1 SGB IX."],
    ["demo-arbeitsplatz", "Arbeitsplatzanpassung", "arbeitsplatz", "Antrag auf behinderungsgerechte Arbeitsplatzgestaltung", "Die SBV bittet um Prüfung der erforderlichen Maßnahmen nach § 164 Abs. 4 SGB IX."],
  ];

  templates.forEach(([key, title, category, subject, body], index) => {
    run(
      db,
      `INSERT INTO document_templates (
        id, template_key, title, category, description, subject, body,
        legal_basis_json, tags_json, is_system, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      id("template", index + 1),
      key,
      title,
      category,
      "Synthetische Demo-Vorlage.",
      subject,
      body,
      json(["§ 178 Abs. 2 Satz 1 SGB IX", "§ 164 Abs. 4 SGB IX"]),
      json(["demo", category]),
      timestamp,
      timestamp
    );
  });
}

export function seedDemoDatabase(db: DatabaseAdapter): void {
  const existing = db
    .prepare<{ value: string }>("SELECT value FROM settings WHERE key = ?")
    .get(DEMO_SEED_MARKER_KEY);
  if (existing?.value === DEMO_SEED_VERSION) return;

  const timestamp = nowIso();
  db.exec("BEGIN");
  try {
    seedProtectedPersons(db, timestamp);
    seedContacts(db, timestamp);
    seedCasesAndProcesses(db, timestamp);
    seedSbvResources(db, timestamp);
    seedCompliance(db, timestamp);
    seedTemplates(db, timestamp);
    run(
      db,
      `INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)`,
      DEMO_SEED_MARKER_KEY,
      DEMO_SEED_VERSION,
      timestamp
    );
    run(
      db,
      `INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('demo.mode', 'true', ?)`,
      timestamp
    );
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
