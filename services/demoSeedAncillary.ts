import type { DatabaseAdapter } from "./databaseService.js";
import { daysFromNow, id, json, run } from "./demoSeedSupport.js";
export function seedSbvResources(db: DatabaseAdapter, timestamp: string): void {
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

export function seedCompliance(db: DatabaseAdapter, timestamp: string): void {
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

export function seedTemplates(db: DatabaseAdapter, timestamp: string): void {
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

