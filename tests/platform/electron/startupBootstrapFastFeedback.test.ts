import { describe, expect, it } from 'vitest';
import { bootstrapSplashWindowOptions, startWithVisibleSplash } from '../../../electron/startupBootstrap';

describe('Startup-Bootstrap für sofortige sichtbare Rückmeldung', () => {
  it('zeigt ein geschütztes Splash-Fenster unmittelbar an', () => {
    const options = bootstrapSplashWindowOptions();
    expect(options.show).toBe(true);
    expect(options.webPreferences).toMatchObject({
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    });
  });

  it('lädt die Runtime erst nach dem Splash und startet die App danach mit demselben Fenster', async () => {
    const events: string[] = [];
    const splash = { id: 'visible-splash' };
    let showSplash: (value: typeof splash) => void = () => { throw new Error('Splash noch nicht initialisiert'); };
    const splashReady = new Promise<typeof splash>((resolve) => { showSplash = resolve; });

    const startup = startWithVisibleSplash(
      () => { events.push('splash requested'); return splashReady; },
      async () => {
        events.push('runtime imported');
        return { startApplication: async (received: typeof splash) => {
          expect(received).toBe(splash);
          events.push('app started');
        } };
      },
      (phase) => events.push(phase),
    );

    expect(events).toEqual(['splash requested']);
    showSplash(splash);
    await startup;
    expect(events).toEqual([
      'splash requested',
      'runtime:import-start',
      'runtime imported',
      'runtime:import-complete',
      'app started',
    ]);
  });
});
