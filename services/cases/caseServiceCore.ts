import path from "node:path";
import type { DatabaseAdapter } from "../databaseService.js";
import { PersonalDataAuditLogService } from "../auditLogService.js";

export class CaseServiceCore {
  protected readonly dbProvider: () => DatabaseAdapter;
  protected readonly dataDirProvider: () => string;

  constructor(
      databaseProvider: () => DatabaseAdapter,
      dataDirectoryProvider: () => string = () =>
        path.join(process.cwd(), "data"),
    ) {
      this.dbProvider = databaseProvider;
      this.dataDirProvider = dataDirectoryProvider;
    }

  protected audit(
      db: DatabaseAdapter,
      input: Parameters<PersonalDataAuditLogService["append"]>[0],
    ): void {
      try {
        new PersonalDataAuditLogService(db).append(input);
      } catch (error) {
        console.warn("Gremia.SBV audit log write failed", error instanceof Error ? error.name : 'UnknownError');
      }
    }

  protected getSafeDb(): DatabaseAdapter { return this.dbProvider(); }
}
