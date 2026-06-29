import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

describe('Stellenbesetzungen 0.9.5-d Härtung', () => {
  it('öffnet die Verstoßprüfung nur als Prefill und persistiert nicht direkt aus der Recruiting-Ansicht', () => {
    const view = read('src/app/features/recruiting/RecruitingParticipationsView.tsx');
    const app = read('src/app/App.tsx');

    expect(view).toContain('onOpenParticipationViolationPrefill');
    expect(view).toContain('Speichern erfolgt erst in der Verstoßansicht');
    expect(view).not.toContain('bridge.sbvParticipationViolations.create(prefill.form)');
    expect(app).toContain('setParticipationViolationPrefill(prefill)');
    expect(app).toContain('setCurrentView("participation_violations")');
  });

  it('übernimmt applicantRef nicht in den Journal-Prefill für Vorstellungsgespräche', () => {
    const view = read('src/app/features/recruiting/RecruitingParticipationsView.tsx');

    expect(view).toContain("title: 'Vorstellungsgespräch: SBV-Teilnahme dokumentiert'");
    expect(view).not.toContain('title: `Vorstellungsgespräch ${interview.applicantRef}`');
  });

  it('blockiert das Löschen von Stellenbesetzungen mit abhängigen Nachweisobjekten service-seitig', () => {
    const service = read('services/recruitingParticipationService.ts');

    expect(service).toContain('ensureParticipationCanBeDeleted');
    expect(service).toContain('sbv_participation_violations');
    expect(service).toContain('deadlines');
    expect(service).toContain('activity_journal_links');
    expect(service).toContain('Stellenbesetzung kann nicht gelöscht werden');
  });
});
