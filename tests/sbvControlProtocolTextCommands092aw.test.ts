import { describe, expect, it } from 'vitest';
import {
  applyProtocolFollowUpTextCommand,
  buildProtocolFollowUpText,
  parseProtocolFollowUpCommandArgument,
  updateProtocolFormValue,
  type ProtocolFormState,
} from '../src/app/features/sbv-control/sbvControlLogic';
import { TEXT_COMMAND_REGISTRY } from '../services/textCommandPolicy';

describe('SBV-Steuerungsprotokoll-Kurzbefehle', () => {
  it('setzt aus // eine uebergreifende Wiedervorlage ohne Fallbezug im Protokollformular', () => {
    const value = 'AG sagt Entwurf zu. // 2026-07-01 Rueckmeldung Arbeitgeber nachhalten';
    const index = value.indexOf('//');

    const applied = applyProtocolFollowUpTextCommand('nextSteps', value, index, '//');

    expect(applied).toMatchObject({
      target: 'nextSteps',
      followUpDueAt: '2026-07-01',
    });
    expect(applied?.value).toBe('AG sagt Entwurf zu. Frist bis 1.7.2026: Rueckmeldung Arbeitgeber nachhalten');
  });

  it('unterstuetzt deutsche Datumsangaben fuer /wv und laesst nicht-Frist-Befehle unberuehrt', () => {
    const value = 'Bitte /wv 05.08.2026 BR-Ruecklauf klaeren';
    const applied = applyProtocolFollowUpTextCommand('discussion', value, value.indexOf('/wv'), '/wv');

    expect(applied?.followUpDueAt).toBe('2026-08-05');
    expect(applied?.value).toContain('Wiedervorlage bis 5.8.2026: BR-Ruecklauf klaeren');
    expect(applyProtocolFollowUpTextCommand('discussion', 'Bitte @@ Kontakt', 6, '@@')).toBeNull();
  });

  it('validiert Datum und formatiert Fallback-Titel zentral', () => {
    expect(parseProtocolFollowUpCommandArgument('2026-02-31 unmoeglich')).toBeNull();
    expect(parseProtocolFollowUpCommandArgument('2026-09-15')).toEqual({ followUpDueAt: '2026-09-15', title: 'Wiedervorlage' });
    expect(buildProtocolFollowUpText('/frist', '2026-09-15', '')).toBe('Frist bis 15.9.2026: Wiedervorlage');
  });

  it('kann die erkannte Wiedervorlage in den Formularzustand uebernehmen', () => {
    const form: ProtocolFormState = {
      title: 'Regelung nachhalten',
      partner: 'works_council',
      topic: 'workplace_rules',
      meetingAt: '2026-06-03',
      discussion: '',
      result: '',
      nextSteps: 'Bitte // 2026-07-10 Entwurf anfordern',
      followUpDueAt: '',
      status: 'documented',
    };
    const applied = applyProtocolFollowUpTextCommand('nextSteps', form.nextSteps ?? '', 6, '//');
    expect(applied).not.toBeNull();

    const withText = updateProtocolFormValue(form, 'nextSteps', applied?.value ?? '');
    const withDate = updateProtocolFormValue(withText, 'followUpDueAt', applied?.followUpDueAt ?? '');

    expect(withDate.nextSteps).toContain('Frist bis 10.7.2026');
    expect(withDate.followUpDueAt).toBe('2026-07-10');
  });

  it('kennzeichnet Frist- und Wiedervorlage-Kurzbefehle nicht mehr als zwingend fallgebunden', () => {
    const deadline = TEXT_COMMAND_REGISTRY.find((item) => item.kind === 'deadline');
    const followUp = TEXT_COMMAND_REGISTRY.find((item) => item.kind === 'follow_up');

    expect(deadline?.requiresCase).toBe(false);
    expect(followUp?.requiresCase).toBe(false);
  });
});
