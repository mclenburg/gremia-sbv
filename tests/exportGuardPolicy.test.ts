import { describe, expect, it } from 'vitest';
import { buildExportWarningMessage, scanSensitiveExportText } from '../services/exportGuardPolicy';

describe('exportGuardPolicy', () => {
  it('fordert auch ohne Treffer eine ausdrückliche Bestätigung', () => {
    const scan = scanSensitiveExportText('Allgemeiner Hinweis ohne Personendaten', { context: 'Vorlagenexport' });
    expect(scan.requiresExplicitConfirmation).toBe(true);
    expect(scan.riskLevel).toBe('none');
  });

  it('erkennt Gesundheits- und Behinderungsbezüge als kritisches Exportrisiko', () => {
    const scan = scanSensitiveExportText('BEM wegen Arbeitsunfähigkeit und GdB 50', { context: 'PDF-Export' });
    expect(scan.riskLevel).toBe('critical');
    expect(scan.findings).toContain('möglicher Gesundheits-/Behinderungsbezug');
  });

  it('erzeugt eine klare deutschsprachige Warnung', () => {
    const scan = scanSensitiveExportText('Herr Mustermann', { context: 'Zwischenablage', target: 'Entwurf' });
    expect(buildExportWarningMessage(scan)).toContain('Export bestätigen');
    expect(buildExportWarningMessage(scan)).toContain('außerhalb des geschützten Tresors');
  });
});
