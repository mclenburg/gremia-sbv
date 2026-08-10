import type { DatabaseAdapter } from "./databaseService.js";
import { FIRST_NAMES, LAST_NAMES, CONTACT_CATEGORIES, daysFromNow, id, run } from "./demoSeedSupport.js";
export function seedProtectedPersons(db: DatabaseAdapter, timestamp: string): void {
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

export function seedContacts(db: DatabaseAdapter, timestamp: string): void {
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

