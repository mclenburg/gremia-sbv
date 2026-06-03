import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');
const pkg = JSON.parse(read('package.json')) as { scripts: Record<string, string> };

describe('Pre-1.0 Release-Hardening', () => {
  it('stellt lokale E2E-, Visual- und Axe-Abnahme als bewusstes Release-Gate bereit', () => {
    expect(pkg.scripts['release:local-e2e']).toBe('node scripts/run-local-release-e2e.cjs');
    const script = read('scripts/run-local-release-e2e.cjs');

    for (const command of [
      'test:e2e:setup',
      'test:e2e:visual',
      'test:e2e:core-ui-flows',
      'test:e2e:complete-tour',
      'test:e2e:a11y',
    ]) {
      expect(script).toContain(command);
    }

    expect(read('.github/workflows/build-release.yml')).not.toContain('test:e2e:');
    expect(read('docs/QUALITY_GATE.md')).toContain('npm run release:local-e2e');
    expect(read('docs/E2E_TESTS.md')).toContain('npm run release:local-e2e');
  });

  it('macht den App-Start lokal messbar, ohne Telemetrie einzubauen', () => {
    expect(read('electron/startupPerformance.ts')).toContain('GREMIA_SBV_STARTUP_TIMING');
    expect(read('electron/startupPerformance.ts')).toContain('readStartupTimeline');
    expect(read('electron/startupPerformance.ts')).toContain('logStartupTimeline');

    const bootstrap = read('electron/main.ts');
    expect(bootstrap).toContain('markStartupPhase("bootstrap:module-loaded")');
    expect(bootstrap).toContain('markStartupPhase("splash:visible");');
    expect(bootstrap).toContain('show: true');
    expect(bootstrap).not.toContain('await splash.loadURL');
    expect(bootstrap).toContain('markStartupPhase("runtime:import-start")');
    expect(bootstrap).toContain('markStartupPhase("runtime:import-complete")');
    expect(bootstrap.indexOf('await showStartupSplash("app")')).toBeLessThan(bootstrap.indexOf('await import("./appRuntime.js")'));

    const runtime = read('electron/appRuntime.ts');
    expect(runtime).toContain('markStartupPhase("runtime:security-service-ready")');
    expect(runtime).toContain('markStartupPhase("runtime:ipc-registered")');
    expect(runtime).toContain('markStartupPhase("main-window:visible")');
    expect(runtime).toContain('logStartupTimeline(`main-window-visible-${reason}`)');
    expect(runtime).toContain('prepareDemoVaultInBackground');
    expect(runtime).toContain('scheduleDemoVaultPreparation');
    expect(runtime).toContain('main-window:did-finish-load');
    expect(runtime).toContain('main-window:load-complete');
    expect(runtime).toContain('setTimeout(() => revealMainWindow("fallback"), 900)');
    expect(runtime.indexOf('await createWindow()')).toBeLessThan(runtime.indexOf('scheduleDemoVaultPreparation(dataDirectory)'));
    expect(runtime.indexOf('markStartupPhase("main-window:visible")')).toBeLessThan(runtime.indexOf('scheduleDemoVaultPreparation(dataDirectory)'));
    expect(read('docs/ARCHITECTURE.md')).toContain('GREMIA_SBV_STARTUP_TIMING=1');
  });

  it('stellt einen statischen Sweep gegen native ungestylte Formular-Controls bereit', () => {
    expect(pkg.scripts['ui:control-sweep']).toBe('node scripts/check-industrial-ui-control-chrome.cjs');
    const sweep = read('scripts/check-industrial-ui-control-chrome.cjs');

    for (const selector of [
      '.industrial-modal input:not([type="checkbox"]):not([type="radio"])',
      '.industrial-modal select',
      '.industrial-modal textarea',
      '.industrial-field input',
      '.industrial-field textarea',
      '.case-detail-inline-form input',
    ]) {
      expect(sweep).toContain(selector);
    }

    const textCommandTextarea = read('src/app/shared/textCommands/TextCommandTextarea.tsx');
    expect(textCommandTextarea).toContain('industrial-textarea-input');
    expect(textCommandTextarea).toContain('text-command-textarea');
    expect(read('docs/UI_VISUAL_QA.md')).toContain('npm run ui:control-sweep');
  });

  it('bindet einen schnellen Backup-/Restore-Prozesscheck in das Release-Gate ein', () => {
    expect(pkg.scripts['release:check:backup-restore']).toBe('npm run version:generate && tsx scripts/check-backup-restore-release.ts');
    expect(pkg.scripts['release:check']).toBe('npm run rc:check && npm run release:check:backup-restore && npm run test:coverage && npm run build:app');

    const backupCheck = read('scripts/check-backup-restore-release.ts');
    expect(backupCheck).toContain('createBackup');
    expect(backupCheck).toContain('inspectBackup');
    expect(backupCheck).toContain('restoreBackup');
    expect(backupCheck).toContain('documents/case-42/attest.gsbvdoc');
    expect(backupCheck).toContain('tmp/');
    expect(backupCheck).toContain('backups/');
    expect(read('docs/BACKUP_RESTORE.md')).toContain('npm run release:check:backup-restore');
  });
});
