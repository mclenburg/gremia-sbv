import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('case handover placement 0.9.2', () => {
  it('platziert Import global in der Fallliste und Export in der Fallakten-Suchzeile', () => {
    const register = readFileSync('src/app/features/cases/CaseRegister.tsx', 'utf8');
    const detailPanel = readFileSync('src/app/features/cases/CaseDetailPanel.tsx', 'utf8');
    const overview = readFileSync('src/app/features/cases/CaseOverviewDetail.tsx', 'utf8');

    expect(register).toContain('onImportHandover');
    expect(register).toContain('Übergabe importieren');
    expect(detailPanel).toContain('onExportHandover');
    expect(detailPanel).toContain('case-detail-search-actions');
    expect(detailPanel).toContain('case-detail-handover-export-button');
    expect(overview).not.toContain('Übergabe importieren');
    expect(overview).not.toContain('Fallübergabe / Vertretung</strong>');
  });

  it('nutzt modale Übergabe-Dialoge statt stiller Browser-Prompts', () => {
    const casesView = readFileSync('src/app/features/cases/CasesView.tsx', 'utf8');
    const dialog = readFileSync('src/app/features/cases/CaseHandoverTransferDialogs.tsx', 'utf8');

    expect(casesView).toContain('CaseHandoverTransferDialogs');
    expect(casesView).not.toContain('window.prompt(\'Transport-Passphrase');
    expect(dialog).toContain('Datei auswählen');
    expect(dialog).toContain('Paket prüfen');
    expect(dialog).toContain('Bitte zuerst eine Übergabedatei auswählen.');
    expect(dialog).toContain('onSelectImportFile');
    expect(dialog).toContain('onInspectImport(importFile.filePath, importPassphrase)');
    expect(dialog).not.toContain('Paket auswählen und prüfen');
    expect(dialog).not.toContain('onInspectImport(importPassphrase)');
    expect(dialog).not.toContain('disabled={importBusy || !importPassphrase.trim()}');
    expect(dialog).toContain('Als neue lokale Übergabeakte anlegen');
    expect(dialog).toContain('Mit bestehender Fallakte zusammenführen/aktualisieren');
  });
  it('trennt Dateiauswahl und Passphrase-Prüfung im Importablauf', () => {
    const ipc = readFileSync('electron/ipc/caseHandoverIpc.ts', 'utf8');
    const preload = readFileSync('electron/preload.ts', 'utf8');
    const casesView = readFileSync('src/app/features/cases/CasesView.tsx', 'utf8');

    expect(ipc).toContain("caseHandover:select-file");
    expect(ipc).toContain("caseHandover:inspect");
    expect(preload).toContain('selectFile: ()');
    expect(preload).toContain('inspect: (filePath: string, passphrase: string)');
    expect(casesView).toContain('selectCaseHandoverFile');
    expect(casesView).toContain('caseHandover.inspect(filePath, passphrase)');
  });

});
