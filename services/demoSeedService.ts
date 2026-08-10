import type { DatabaseAdapter } from "./databaseService.js";
import { DEMO_SEED_MARKER_KEY, DEMO_SEED_VERSION, nowIso, run } from "./demoSeedSupport.js";
import { seedProtectedPersons, seedContacts } from "./demoSeedPeople.js";
import { seedCasesAndProcesses } from "./demoSeedCases.js";
import { seedSbvResources, seedCompliance, seedTemplates } from "./demoSeedAncillary.js";
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
