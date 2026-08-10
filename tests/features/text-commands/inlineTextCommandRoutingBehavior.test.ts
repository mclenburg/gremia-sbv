import { describe, expect, it, vi } from 'vitest';
import type { Dispatch, SetStateAction } from 'react';
import type { InlineCommandRuntime } from '../../../src/app/features/cases/inlineCommands/inlineCommandRuntime';
import { useInlineTextCommandRouting } from '../../../src/app/features/cases/inlineCommands/useInlineTextCommandRouting';

function asSetter<T>(mock: ReturnType<typeof vi.fn>): Dispatch<SetStateAction<T>> {
  return mock as Dispatch<SetStateAction<T>>;
}

function createRuntime() {
  const setContent = vi.fn();
  const setNextSteps = vi.fn();
  const setNoteInfo = vi.fn();

  const runtime = {
    setContent: asSetter<string>(setContent),
    setNextSteps: asSetter<string>(setNextSteps),
    setNoteInfo: asSetter<string>(setNoteInfo),
  } as InlineCommandRuntime;

  return { runtime, setContent, setNextSteps, setNoteInfo };
}

describe('Inline-Textkommando-Routing – Verhalten', () => {
  it('leitet Textänderungen an das richtige Feld weiter und löscht alte Hinweise', () => {
    const { runtime, setContent, setNextSteps, setNoteInfo } = createRuntime();
    const routing = useInlineTextCommandRouting(runtime, vi.fn(), () => false);

    routing.handleProtocolTextChange('content', 'Neue Gesprächsnotiz');
    expect(setNoteInfo).toHaveBeenCalledWith('');
    expect(setContent).toHaveBeenCalledWith('Neue Gesprächsnotiz');
    expect(setNextSteps).not.toHaveBeenCalled();

    setContent.mockClear();
    setNextSteps.mockClear();
    setNoteInfo.mockClear();

    routing.handleProtocolTextChange('nextSteps', 'Unterlagen bis Freitag anfordern');
    expect(setNoteInfo).toHaveBeenCalledWith('');
    expect(setNextSteps).toHaveBeenCalledWith('Unterlagen bis Freitag anfordern');
    expect(setContent).not.toHaveBeenCalled();
  });

  it('öffnet ein erkanntes Kommando mit vollständig übergebenem Kontext', () => {
    const { runtime, setNoteInfo } = createRuntime();
    const openCommand = vi.fn();
    const routing = useInlineTextCommandRouting(runtime, openCommand, () => false);

    routing.handleProtocolTextCommand('content', {
      token: '/frist',
      index: 12,
      value: '/frist 20.08.2026 Stellungnahme',
      fieldId: 'case-note-content',
    });

    expect(setNoteInfo).toHaveBeenCalledWith('');
    expect(openCommand).toHaveBeenCalledTimes(1);
    expect(openCommand).toHaveBeenCalledWith(
      'content',
      '/frist',
      12,
      '/frist 20.08.2026 Stellungnahme',
    );
  });

  it('öffnet kein zweites Kommando, solange bereits ein Inline-Overlay aktiv ist', () => {
    const { runtime, setNoteInfo } = createRuntime();
    const openCommand = vi.fn();
    const routing = useInlineTextCommandRouting(runtime, openCommand, () => true);

    routing.handleProtocolTextCommand('nextSteps', {
      token: '/kontakt',
      index: 0,
      value: '/kontakt Integrationsamt',
    });

    expect(setNoteInfo).toHaveBeenCalledWith('');
    expect(openCommand).not.toHaveBeenCalled();
  });
});
