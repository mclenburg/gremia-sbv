import {
  ELECTION_LEGAL_RULE_VERSION,
  type ElectionDeadlineRuleKey,
  type ElectionDeadlineRuleSnapshot,
} from '../src/app/core/models/election.model.js';

const MS_PER_DAY = 86_400_000;

const RULE_META: Record<ElectionDeadlineRuleKey, { legalReference: string; calculationBasis: string }> = {
  'formal.board.appoint': { legalReference: '§ 1 Abs. 1 SchwbVWO', calculationBasis: 'spätestens 8 Wochen vor Amtszeitende' },
  'formal.election.target': { legalReference: '§ 2 Abs. 3 SchwbVWO', calculationBasis: 'binnen 6 Wochen; bei laufender Amtszeit spätestens 1 Woche vor Amtszeitende' },
  'formal.notice.publish': { legalReference: '§ 5 Abs. 1 SchwbVWO', calculationBasis: 'spätestens 6 Wochen vor Wahltag' },
  'formal.voterlist.objection': { legalReference: '§ 4 Abs. 1 SchwbVWO', calculationBasis: '2 Wochen seit Erlass des Wahlausschreibens' },
  'formal.proposal.submit': { legalReference: '§ 6 Abs. 1 SchwbVWO', calculationBasis: '2 Wochen seit Erlass des Wahlausschreibens' },
  'formal.proposal.correction': { legalReference: '§ 6 Abs. 3 und 4 SchwbVWO', calculationBasis: '3 Arbeitstage nach Zugang der Aufforderung' },
  'formal.proposal.grace': { legalReference: '§ 7 SchwbVWO', calculationBasis: '1 Woche' },
  'formal.candidates.publish': { legalReference: '§ 8 SchwbVWO', calculationBasis: 'spätestens 1 Woche vor Beginn der Stimmabgabe' },
  'result.acceptance': { legalReference: '§ 14 SchwbVWO', calculationBasis: '3 Arbeitstage nach Zugang der Benachrichtigung' },
  'result.announcement': { legalReference: '§ 15 SchwbVWO', calculationBasis: '2 Wochen Aushang' },
  'mailballot.late.destroy': { legalReference: '§ 12 Abs. 2 SchwbVWO', calculationBasis: '1 Monat nach Bekanntgabe des Wahlergebnisses, sofern nicht angefochten' },
  'simplified.invitation': { legalReference: '§ 19 Abs. 1 SchwbVWO', calculationBasis: 'spätestens 3 Wochen vor Amtszeitende' },
  'meeting.suspension': { legalReference: '§ 178 Abs. 4 Satz 2 SGB IX', calculationBasis: '1 Woche ab Beschlussfassung' },
  'employer.report': { legalReference: '§ 163 Abs. 2 SGB IX', calculationBasis: '31.03. für das Vorjahr' },
  'election.records.retain': { legalReference: '§ 16 SchwbVWO', calculationBasis: 'mindestens bis zur Beendigung der Wahlperiode; Legal Hold bei offenem Verfahren' },
};

function parseDateOnly(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/.exec(value);
  if (!match) throw new Error('Datum muss als ISO-Datum vorliegen.');
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (date.getUTCFullYear() !== Number(match[1]) || date.getUTCMonth() !== Number(match[2]) - 1 || date.getUTCDate() !== Number(match[3])) {
    throw new Error('Datum ist ungültig.');
  }
  return date;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addCalendarDays(source: Date, days: number): Date {
  return new Date(source.getTime() + days * MS_PER_DAY);
}

function addCalendarMonthClamped(source: Date): Date {
  const year = source.getUTCFullYear();
  const month = source.getUTCMonth();
  const day = source.getUTCDate();
  const targetMonthStart = new Date(Date.UTC(year, month + 1, 1));
  const targetMonthEnd = new Date(Date.UTC(targetMonthStart.getUTCFullYear(), targetMonthStart.getUTCMonth() + 1, 0));
  return new Date(Date.UTC(targetMonthStart.getUTCFullYear(), targetMonthStart.getUTCMonth(), Math.min(day, targetMonthEnd.getUTCDate())));
}

export class WorkingDayCalendar {
  private readonly holidays: ReadonlySet<string>;

  constructor(holidays: Iterable<string> = []) {
    this.holidays = new Set(Array.from(holidays, (value) => isoDate(parseDateOnly(value))));
  }

  isWorkingDay(value: string | Date): boolean {
    const date = typeof value === 'string' ? parseDateOnly(value) : value;
    const weekday = date.getUTCDay();
    return weekday !== 0 && weekday !== 6 && !this.holidays.has(isoDate(date));
  }

  addWorkingDays(sourceDate: string, workingDays: number): string {
    if (!Number.isInteger(workingDays)) throw new Error('Arbeitstage müssen ganzzahlig sein.');
    if (workingDays === 0) return isoDate(parseDateOnly(sourceDate));
    const direction = workingDays > 0 ? 1 : -1;
    let remaining = Math.abs(workingDays);
    let cursor = parseDateOnly(sourceDate);
    while (remaining > 0) {
      cursor = addCalendarDays(cursor, direction);
      if (this.isWorkingDay(cursor)) remaining -= 1;
    }
    return isoDate(cursor);
  }
}

export function addWorkingDays(sourceDate: string, workingDays: number, holidays: ReadonlySet<string> = new Set()): string {
  return new WorkingDayCalendar(holidays).addWorkingDays(sourceDate, workingDays);
}

function snapshot(ruleKey: ElectionDeadlineRuleKey, sourceDate: string, dueOn: string): ElectionDeadlineRuleSnapshot {
  return {
    ruleKey,
    sourceDate: isoDate(parseDateOnly(sourceDate)),
    originalDueOn: dueOn,
    dueOn,
    legalReference: RULE_META[ruleKey].legalReference,
    calculationBasis: RULE_META[ruleKey].calculationBasis,
    legalRuleVersion: ELECTION_LEGAL_RULE_VERSION,
  };
}

export class ElectionDeadlinePolicy {
  readonly legalRuleVersion = ELECTION_LEGAL_RULE_VERSION;

  calculate(
    ruleKey: ElectionDeadlineRuleKey,
    sourceDate: string,
    options: { workingDayCalendar?: WorkingDayCalendar; calendarYear?: number; incumbentTermEnd?: string } = {},
  ): ElectionDeadlineRuleSnapshot {
    const source = parseDateOnly(sourceDate);
    const workingDays = options.workingDayCalendar ?? new WorkingDayCalendar();
    let dueOn: string;
    switch (ruleKey) {
      case 'formal.board.appoint': dueOn = isoDate(addCalendarDays(source, -56)); break;
      case 'formal.election.target': {
        const sixWeeks = addCalendarDays(source, 42);
        const latestBeforeTermEnd = options.incumbentTermEnd ? addCalendarDays(parseDateOnly(options.incumbentTermEnd), -7) : sixWeeks;
        dueOn = isoDate(sixWeeks.getTime() <= latestBeforeTermEnd.getTime() ? sixWeeks : latestBeforeTermEnd);
        break;
      }
      case 'formal.notice.publish': dueOn = isoDate(addCalendarDays(source, -42)); break;
      case 'formal.voterlist.objection': dueOn = isoDate(addCalendarDays(source, 14)); break;
      case 'formal.proposal.submit': dueOn = isoDate(addCalendarDays(source, 14)); break;
      case 'formal.proposal.correction': dueOn = workingDays.addWorkingDays(sourceDate, 3); break;
      case 'formal.proposal.grace': dueOn = isoDate(addCalendarDays(source, 7)); break;
      case 'formal.candidates.publish': dueOn = isoDate(addCalendarDays(source, -7)); break;
      case 'result.acceptance': dueOn = workingDays.addWorkingDays(sourceDate, 3); break;
      case 'result.announcement': dueOn = isoDate(addCalendarDays(source, 14)); break;
      case 'mailballot.late.destroy': dueOn = isoDate(addCalendarMonthClamped(source)); break;
      case 'simplified.invitation': dueOn = isoDate(addCalendarDays(source, -21)); break;
      case 'meeting.suspension': dueOn = isoDate(addCalendarDays(source, 7)); break;
      case 'employer.report': dueOn = `${options.calendarYear ?? source.getUTCFullYear()}-03-31`; break;
      case 'election.records.retain': dueOn = isoDate(source); break;
      default: {
        const exhaustive: never = ruleKey;
        throw new Error(`Nicht unterstützte Fristenregel: ${String(exhaustive)}`);
      }
    }
    return snapshot(ruleKey, sourceDate, dueOn);
  }

  correct(value: ElectionDeadlineRuleSnapshot, correctedDueOn: string, reason: string): ElectionDeadlineRuleSnapshot {
    const normalizedReason = reason.trim();
    if (!normalizedReason) throw new Error('Eine manuelle Fristenkorrektur benötigt eine Begründung.');
    return { ...value, dueOn: isoDate(parseDateOnly(correctedDueOn)), manualCorrectionReason: normalizedReason };
  }
}
