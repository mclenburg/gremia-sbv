import type { GremiaBrAuthService } from './gremiaBrAuthService.js';
import type { GremiaBrCacheService } from './gremiaBrCacheService.js';
import type { GremiaBrSettingsService } from './gremiaBrSettingsService.js';
import { GremiaBrHttpReadAdapter } from './gremiaBrHttpReadAdapter.js';

export class GremiaBrStartupRefreshService {
  private attempted = false;

  constructor(
    private readonly settings: Pick<GremiaBrSettingsService, 'getPublicSettings'>,
    private readonly auth: GremiaBrAuthService,
    private readonly cache: Pick<GremiaBrCacheService, 'refresh'>,
  ) {}

  async run(): Promise<{ started: boolean; message: string }> {
    if (this.attempted) return { started: false, message: 'Der Startabruf wurde in diesem Programmstart bereits geprüft.' };
    this.attempted = true;
    const settings = this.settings.getPublicSettings();
    if (!settings.enabled || !settings.autoRefreshOnStartup || !settings.hasStoredCredentials) {
      return { started: false, message: 'Der automatische Gremia.BR-Startabruf ist nicht aktiviert.' };
    }
    const result = await this.cache.refresh(new GremiaBrHttpReadAdapter(this.auth));
    return { started: true, message: result.message };
  }
}
