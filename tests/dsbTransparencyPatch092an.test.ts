import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { listComplianceDocuments, renderComplianceDocument } from '../services/complianceCenterService';

const read = (path: string) => readFileSync(path, 'utf8');

describe('DSB-Transparenzpatch 0.9.2', () => {
  it('stellt eine Art.-13/14-Datenschutzinformation als Compliance-Dokument bereit', () => {
    const descriptors = listComplianceDocuments();
    expect(descriptors.some((item) => item.type === 'data_protection_notice')).toBe(true);

    const notice = renderComplianceDocument('data_protection_notice');
    expect(notice.title).toContain('Art. 13/14 DSGVO');
    expect(notice.body).toContain('Art. 13 DSGVO');
    expect(notice.body).toContain('Art. 14 DSGVO');
    expect(notice.body).toContain('§ 178 Abs. 1 SGB IX');
    expect(notice.body).toContain('§ 178 Abs. 2 Satz 1 SGB IX');
    expect(notice.body).toContain('muss vor Verwendung organisatorisch, fachlich und datenschutzrechtlich geprüft und freigegeben werden');
    expect(notice.body).toContain('Gremia.SBV versendet diese Information nicht automatisch');
  });

  it('führt die Datenschutzinformation auch als dauerhafte Markdown-Vorlage', () => {
    expect(existsSync('docs/DATENSCHUTZINFORMATION_ART_13_14_TEMPLATE.md')).toBe(true);
    const template = read('docs/DATENSCHUTZINFORMATION_ART_13_14_TEMPLATE.md');
    expect(template).toContain('Art. 13/14 DSGVO');
    expect(template).toContain('besondere Kategorien personenbezogener Daten nach Art. 9 Abs. 1 DSGVO');
    expect(template).toContain('§ 26 Abs. 3 BDSG');
    expect(template).toContain('Anpassungsvermerk');
    expect(read('docs/README.md')).toContain('DATENSCHUTZINFORMATION_ART_13_14_TEMPLATE.md');
    expect(read('docs/FREIGABE_DSB_IT_SECURITY.md')).toContain('DATENSCHUTZINFORMATION_ART_13_14_TEMPLATE.md');
  });

  it('zentralisiert den Audit-Hinweis und bindet ihn in destruktive Datenschutzdialoge ein', () => {
    const noticeSource = read('src/app/core/copy/privacyNotices.ts');
    const lifecycleDialog = read('src/app/features/persons/PersonLifecycleReviewDialog.tsx');
    const personDialog = read('src/app/features/persons/PersonPrivacyActionDialog.tsx');
    const retentionPanel = read('src/app/features/settings/RetentionSettingsPanel.tsx');

    expect(noticeSource).toContain('Sicherheitseinträge im Audit-Log bleiben aus Integritätsgründen erhalten');
    expect(noticeSource).toContain('keine Direktidentifikatoren');
    for (const source of [lifecycleDialog, personDialog, retentionPanel]) {
      expect(source).toContain('AUDIT_LOG_RETENTION_NOTICE');
      expect(source).toContain('audit-log-retention-notice');
    }
  });

  it('dokumentiert den Audit-Hinweis im Datenschutz- und Sicherheitskonzept', () => {
    expect(read('docs/DATENSCHUTZKONZEPT.md')).toContain('Audit-Hinweis bei Löschung und Anonymisierung');
    expect(read('docs/PRIVACY_AND_SECURITY.md')).toContain('Bei Lösch- und Anonymisierungsvorgängen zeigt die Oberfläche einen Hinweis');
    expect(read('docs/SECURITY.md')).toContain('Destruktive Datenschutzdialoge weisen darauf hin');
    expect(read('docs/LOESCHKONZEPT_SBV.md')).toContain('Hinweis in Lösch- und Anonymisierungsdialogen');
  });
});
