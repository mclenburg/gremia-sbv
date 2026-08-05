import { execFileSync } from 'node:child_process';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  logStartupTimeline,
  markStartupPhase,
  readStartupTimeline,
} from '../electron/startupPerformance';

const originalTiming = process.env.GREMIA_SBV_STARTUP_TIMING;
const originalDiagnostics = process.env.GREMIA_SBV_STARTUP_DIAGNOSTICS;

afterEach(() => {
  if (originalTiming === undefined) delete process.env.GREMIA_SBV_STARTUP_TIMING;
  else process.env.GREMIA_SBV_STARTUP_TIMING = originalTiming;

  if (originalDiagnostics === undefined) delete process.env.GREMIA_SBV_STARTUP_DIAGNOSTICS;
  else process.env.GREMIA_SBV_STARTUP_DIAGNOSTICS = originalDiagnostics;

  vi.restoreAllMocks();
});

describe('Pre-1.0 Release-Hardening', () => {
  it('führt den Industrial-UI-Control-Sweep gegen den aktuellen Produktcode erfolgreich aus', () => {
    const output = execFileSync(process.execPath, ['scripts/check-industrial-ui-control-chrome.cjs'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });

    expect(output).toMatch(/Industrial-UI-Control-Chrome OK:/);
  });

  it('erfasst Startup-Phasen über die öffentliche Laufzeit-API und liefert defensive Kopien', () => {
    const first = markStartupPhase('test:release-hardening:first');
    const second = markStartupPhase('test:release-hardening:second');
    const timeline = readStartupTimeline();

    expect(first.phase).toBe('test:release-hardening:first');
    expect(second.phase).toBe('test:release-hardening:second');
    expect(second.atMs).toBeGreaterThanOrEqual(first.atMs);
    expect(second.deltaMs).toBeGreaterThanOrEqual(0);
    expect(timeline.at(-2)?.phase).toBe(first.phase);
    expect(timeline.at(-1)?.phase).toBe(second.phase);

    const mutableCopy = timeline.map((mark) => ({ ...mark }));
    const last = mutableCopy.at(-1);
    if (last) last.phase = 'mutated-outside-service';

    expect(readStartupTimeline().at(-1)?.phase).toBe(second.phase);
  });

  it('protokolliert die Startup-Timeline nur bei ausdrücklich aktivierter Diagnose', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);

    delete process.env.GREMIA_SBV_STARTUP_TIMING;
    delete process.env.GREMIA_SBV_STARTUP_DIAGNOSTICS;
    logStartupTimeline('disabled');
    expect(info).not.toHaveBeenCalled();

    process.env.GREMIA_SBV_STARTUP_TIMING = '1';
    logStartupTimeline('enabled');
    expect(info).toHaveBeenCalledWith(
      'Gremia.SBV startup timeline',
      expect.objectContaining({ reason: 'enabled', marks: expect.any(Array) }),
    );
  });
});
