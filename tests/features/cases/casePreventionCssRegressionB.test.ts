import { describe, expect, it } from 'vitest';
import { findFirstTextCommand } from '../../../services/textCommandPolicy';

describe('Globale Textbefehle – Verhalten', () => {
  it('findet den ersten Textbefehl unabhängig von nachfolgenden Befehlen', () => {
    expect(findFirstTextCommand('Gespräch @@ Kontakt und // Frist')).toEqual({ token: '@@', index: 9 });
    expect(findFirstTextCommand('Ohne strukturierten Befehl')).toBeNull();
  });
});
