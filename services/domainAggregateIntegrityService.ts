import type { DatabaseAdapter } from './databaseService.js';
import { DOMAIN_AGGREGATES } from './domainAggregateRegistry.js';

export interface DomainAggregateIntegrityIssue {
  extensionTable: string;
  issue: 'orphan_extension' | 'wrong_root_type';
  count: number;
}

export class DomainAggregateIntegrityError extends Error {
  constructor(readonly issues: readonly DomainAggregateIntegrityIssue[]) {
    super(`Fachmodell-Integrität verletzt: ${issues.map((issue) => `${issue.extensionTable}:${issue.issue}=${issue.count}`).join(', ')}`);
    this.name = 'DomainAggregateIntegrityError';
  }
}

export class DomainAggregateIntegrityService {
  constructor(private readonly db: DatabaseAdapter) {}

  verify(): { checkedExtensions: number } {
    const issues: DomainAggregateIntegrityIssue[] = [];
    let checkedExtensions = 0;
    for (const aggregate of DOMAIN_AGGREGATES) {
      for (const extension of aggregate.extensions) {
        checkedExtensions += 1;
        const orphan = this.db.prepare<{ count: number }>(`
          SELECT COUNT(*) AS count
          FROM ${extension.table} e
          LEFT JOIN ${aggregate.rootTable} r ON r.${aggregate.idColumn} = e.${extension.foreignKey}
          WHERE r.${aggregate.idColumn} IS NULL
        `).get()?.count ?? 0;
        if (orphan > 0) issues.push({ extensionTable: extension.table, issue: 'orphan_extension', count: orphan });

        if (extension.discriminatorColumn && extension.discriminatorValue) {
          const wrongType = this.db.prepare<{ count: number }>(`
            SELECT COUNT(*) AS count
            FROM ${extension.table} e
            JOIN ${aggregate.rootTable} r ON r.${aggregate.idColumn} = e.${extension.foreignKey}
            WHERE r.${extension.discriminatorColumn} <> ?
          `).get(extension.discriminatorValue)?.count ?? 0;
          if (wrongType > 0) issues.push({ extensionTable: extension.table, issue: 'wrong_root_type', count: wrongType });
        }
      }
    }
    if (issues.length > 0) throw new DomainAggregateIntegrityError(issues);
    return { checkedExtensions };
  }
}
