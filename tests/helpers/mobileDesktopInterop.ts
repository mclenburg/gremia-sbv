/** JVM integration-test peer. Only synthetic data in a fresh in-memory database. */
import { createInterface } from 'node:readline';
import { MigrationService } from '../../services/migrationService';
import { MobileCompanionService } from '../../services/mobileCompanionService';
import { MobileCompanionReturnService } from '../../services/mobileCompanionReturnService';
import { openTestDatabase } from './openTestDatabase';

async function main() {
  const database = await openTestDatabase();
  const input = createInterface({ input: process.stdin, crlfDelay: Infinity });
  try {
    new MigrationService(database, 'database/schema.sql', 'database/migrations').migrate();
    const now = new Date().toISOString();
    database.prepare(`
      INSERT INTO cases (
        id, case_number, display_name, category, status, priority, opened_at,
        is_pseudonymized, is_locked, person_binding_state, created_at, updated_at
      ) VALUES ('interop-case', 'TEST-2026', 'Änne Übung', 'beteiligung', 'offen', 'hoch',
        ?, 0, 0, 'active', ?, ?)
    `).run(now, now, now);
    const mobile = new MobileCompanionService(database);
    const returns = new MobileCompanionReturnService(database);
    for await (const line of input) {
      const request = JSON.parse(line);
      let response: unknown;
      switch (request.action) {
        case 'pairing':
          response = mobile.createPairingRequest();
          break;
        case 'snapshot': {
          const device = mobile.saveDevice({
            label: 'Interop-Testgerät',
            pairingResponse: request.pairingResponse,
            securityCode: request.securityCode,
          });
          response = mobile.createSnapshot({ deviceId: device.id, caseIds: ['interop-case'], uiThemeMode: 'light' });
          break;
        }
        case 'inspect':
          response = returns.inspectEnvelopeText(request.envelope);
          break;
        case 'inspectRejected':
          try {
            returns.inspectEnvelopeText(request.envelope);
            response = { rejected: false };
          } catch {
            response = { rejected: true };
          }
          break;
        case 'import':
          response = await returns.importEnvelopeText(request.envelope);
          break;
        case 'state':
          response = {
            notes: database.prepare('SELECT title, content, next_steps FROM case_notes').all(),
            audit: database.prepare('SELECT metadata_json FROM personal_data_audit_log').all(),
          };
          break;
        default:
          throw new Error('Unknown integration-test operation');
      }
      process.stdout.write(`${JSON.stringify(response)}\n`);
    }
  } finally {
    input.close();
    process.stdin.pause();
    database.close();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : 'Desktop interop failed'}\n`);
  process.exitCode = 1;
});
