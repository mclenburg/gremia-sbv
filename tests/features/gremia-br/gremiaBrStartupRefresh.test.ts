import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { MigrationService } from '../../../services/migrationService';
import { GremiaBrSettingsService } from '../../../services/gremiaBr/gremiaBrSettingsService';
import { GremiaBrStartupRefreshService } from '../../../services/gremiaBr/gremiaBrStartupRefreshService';
import { openTestDatabase } from '../../helpers/openTestDatabase';

describe('Opt-in für Gremia.BR-Startabruf', () => {
  it('bleibt für bestehende Datenbestände aus und führt ohne Opt-in keinen Remote-Abruf aus', async () => {
    const db = await openTestDatabase();
    try {
      new MigrationService(db, path.resolve('database/schema.sql'), path.resolve('database/migrations')).migrate();
      const settings = new GremiaBrSettingsService(() => db, () => Buffer.alloc(32, 7));
      const cache = { refresh: vi.fn() };
      const startup = new GremiaBrStartupRefreshService(settings, {} as never, cache as never);
      expect(settings.getPublicSettings().autoRefreshOnStartup).toBe(false);
      expect(await startup.run()).toMatchObject({ started: false });
      expect(cache.refresh).not.toHaveBeenCalled();
    } finally { db.close(); }
  });

  it('führt nach bewusster Aktivierung genau einen Gesamt-Refresh pro Programmstart aus', async () => {
    const db = await openTestDatabase();
    try {
      new MigrationService(db, path.resolve('database/schema.sql'), path.resolve('database/migrations')).migrate();
      const settings = new GremiaBrSettingsService(() => db, () => Buffer.alloc(32, 7));
      settings.saveSettings({ enabled: true, serverUrl: 'https://br.example.invalid', username: 'sbv@example.invalid', password: 'secret', autoRefreshOnStartup: true });
      const cache = { refresh: vi.fn().mockResolvedValue({ message: 'Aktualisiert' }) };
      const startup = new GremiaBrStartupRefreshService(settings, {} as never, cache as never);
      expect(settings.getPublicSettings().autoRefreshOnStartup).toBe(true);
      expect(await startup.run()).toMatchObject({ started: true, message: 'Aktualisiert' });
      expect(await startup.run()).toMatchObject({ started: false });
      expect(cache.refresh).toHaveBeenCalledOnce();
      settings.clearCredentials();
      expect(settings.getPublicSettings().autoRefreshOnStartup).toBe(false);
    } finally { db.close(); }
  });
});
