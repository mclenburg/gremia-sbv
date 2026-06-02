export interface StartupPerformanceMark {
  phase: string;
  atMs: number;
  deltaMs: number;
}

const STARTUP_TIMING_ENV = 'GREMIA_SBV_STARTUP_TIMING';
const STARTUP_DIAGNOSTICS_ENV = 'GREMIA_SBV_STARTUP_DIAGNOSTICS';
const originMs = nowMs();
const marks: StartupPerformanceMark[] = [];

function nowMs(): number {
  return globalThis.performance?.now?.() ?? Date.now();
}

function isStartupTimingEnabled(): boolean {
  return process.env[STARTUP_TIMING_ENV] === '1' || process.env[STARTUP_DIAGNOSTICS_ENV] === '1';
}

function roundMs(value: number): number {
  return Math.round(value * 10) / 10;
}

export function markStartupPhase(phase: string): StartupPerformanceMark {
  const atMs = nowMs();
  const previous = marks.at(-1);
  const mark: StartupPerformanceMark = {
    phase,
    atMs: roundMs(atMs - originMs),
    deltaMs: roundMs(previous ? atMs - originMs - previous.atMs : atMs - originMs),
  };
  marks.push(mark);

  if (isStartupTimingEnabled()) {
    console.info(`Gremia.SBV startup ${mark.phase}: +${mark.deltaMs}ms (${mark.atMs}ms)`);
  }

  return mark;
}

export function readStartupTimeline(): readonly StartupPerformanceMark[] {
  return marks.map((mark) => ({ ...mark }));
}

export function logStartupTimeline(reason = 'startup-ready'): void {
  if (!isStartupTimingEnabled()) return;
  console.info('Gremia.SBV startup timeline', {
    reason,
    totalMs: marks.at(-1)?.atMs ?? 0,
    marks: readStartupTimeline(),
  });
}
