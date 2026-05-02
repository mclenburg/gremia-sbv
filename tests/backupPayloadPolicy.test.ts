import { describe, expect, it } from 'vitest';
import { DEFAULT_RETENTION_SETTINGS } from '../services/retentionPolicy';

describe('test baseline for privacy-sensitive features', () => {
  it('keeps report minimum group size above one to reduce re-identification risk', () => {
    expect(DEFAULT_RETENTION_SETTINGS.minimumGroupSizeForReports).toBeGreaterThanOrEqual(3);
  });
});
