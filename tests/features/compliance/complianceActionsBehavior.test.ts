import { afterEach, describe, expect, it, vi } from 'vitest';
import { waitForBridge } from '../../../src/app/core/bridge/waitForBridge';
import { createComplianceDocumentActions, createComplianceIncidentActions } from '../../../src/app/features/compliance/complianceActions';
import { renderComplianceDocument } from '../../../src/domain/compliance/complianceCenterService';
import type { CreateComplianceIncidentInput } from '../../../src/domain/models/compliance.model';

vi.mock('../../../src/app/core/bridge/waitForBridge', () => ({ waitForBridge: vi.fn() }));

const incident: CreateComplianceIncidentInput = {
  occurredAt: '2024-01-01T12:00:00Z', discoveredAt: '2024-01-01T13:00:00Z',
  category: 'other', riskLevel: 'low', summary: 'Datenschutzvorfall',
};

function setup() {
  const reports = {
    generate: vi.fn().mockResolvedValue({ ok: true, fileName: 'toms.pdf' }),
    openExportFolder: vi.fn().mockResolvedValue({ opened: true }),
  };
  const compliance = { createIncident: vi.fn().mockResolvedValue({ id: 'incident-1' }), updateIncident: vi.fn().mockResolvedValue({ id: 'incident-1' }) };
  vi.mocked(waitForBridge).mockResolvedValue({ reports, compliance } as unknown as NonNullable<Window['gremiaSbv']>);
  const setMessage = vi.fn();
  const announce = vi.fn();
  const setDocument = vi.fn();
  const setSelectedType = vi.fn();
  const refreshIncidents = vi.fn().mockResolvedValue(undefined);
  const refreshSelfCheck = vi.fn().mockResolvedValue(undefined);
  const document = renderComplianceDocument('toms');
  const documents = createComplianceDocumentActions({ document, setDocument, setSelectedType, setMessage, announce });
  const incidents = createComplianceIncidentActions({ refreshIncidents, refreshSelfCheck, setMessage, announce });
  return { documents, incidents, reports, compliance, setMessage, announce, setDocument, setSelectedType, refreshIncidents, refreshSelfCheck, document };
}

describe('compliance action workflows', () => {
  afterEach(() => vi.resetAllMocks());

  it('renders the selected compliance document and announces its availability', () => {
    const state = setup();
    state.documents.render('data_protection_notice');
    expect(state.setSelectedType).toHaveBeenCalledExactlyOnceWith('data_protection_notice');
    expect(state.setDocument).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ type: 'data_protection_notice' }));
    expect(state.announce).toHaveBeenCalledWith(expect.any(String), 'polite');
  });

  it('generates the selected document through the report service without requesting a preview by default', async () => {
    const state = setup();
    await state.documents.exportPdfCurrent();
    expect(state.reports.generate).toHaveBeenCalledOnce();
    expect(state.reports.generate.mock.calls[0][0]).toMatchObject({ type: 'compliance_document', complianceTitle: state.document.title, complianceBody: state.document.body });
    expect(state.reports.openExportFolder).not.toHaveBeenCalled();
    expect(state.setMessage).toHaveBeenCalledWith(expect.stringMatching(/verschlüsselter PDF-Report/));
    expect(state.announce).toHaveBeenCalledExactlyOnceWith(expect.any(String), 'polite');
  });

  it('requests the generated file for external preview only after successful generation', async () => {
    const state = setup();
    let generated!: (result: { ok: boolean; fileName: string }) => void;
    state.reports.generate.mockImplementation(() => new Promise((resolve) => { generated = resolve; }));
    const pending = state.documents.exportPdfCurrent(true);
    await vi.waitFor(() => expect(state.reports.generate).toHaveBeenCalled());
    expect(state.reports.openExportFolder).not.toHaveBeenCalled();
    expect(state.announce).not.toHaveBeenCalled();
    generated({ ok: true, fileName: 'toms.pdf' });
    await pending;
    expect(state.reports.openExportFolder).toHaveBeenCalledExactlyOnceWith('toms.pdf');
    expect(state.announce).toHaveBeenCalledWith(expect.stringMatching(/externe Vorschau übergeben/), 'polite');
  });

  it('keeps confirmed PDF storage visible when the external preview is unavailable', async () => {
    const state = setup();
    state.reports.openExportFolder.mockResolvedValue({ opened: false, error: 'Keine Vorschau verfügbar' });
    await state.documents.exportPdfCurrent(true);
    expect(state.setMessage).toHaveBeenCalledWith(expect.stringMatching(/verschlüsselter PDF-Report erzeugt;.*Keine Vorschau verfügbar/));
    expect(state.announce).toHaveBeenCalledExactlyOnceWith(expect.any(String), 'assertive');
  });

  it('reports a failed generation without requesting preview or announcing success', async () => {
    const state = setup();
    state.reports.generate.mockResolvedValue({ ok: false, error: 'Erzeugung fehlgeschlagen' });
    await state.documents.exportPdfCurrent(true);
    expect(state.reports.openExportFolder).not.toHaveBeenCalled();
    expect(state.setMessage).toHaveBeenCalledWith('Erzeugung fehlgeschlagen');
    expect(state.announce).toHaveBeenCalledExactlyOnceWith('Erzeugung fehlgeschlagen', 'assertive');
  });

  it.each(['create', 'update'] as const)('refreshes incidents and the self check only after confirmed %s', async (mode) => {
    const state = setup();
    const saved = mode === 'create'
      ? await state.incidents.createIncident(incident)
      : await state.incidents.updateIncident('incident-1', { status: 'closed', authorityNotificationChecked: true });
    expect(saved).toBe(true);
    if (mode === 'create') expect(state.compliance.createIncident).toHaveBeenCalledExactlyOnceWith(incident);
    else expect(state.compliance.updateIncident).toHaveBeenCalledExactlyOnceWith('incident-1', { status: 'closed', authorityNotificationChecked: true });
    expect(state.refreshIncidents).toHaveBeenCalledOnce();
    expect(state.refreshSelfCheck).toHaveBeenCalledOnce();
    expect(state.announce).toHaveBeenCalledExactlyOnceWith(expect.any(String), 'polite');
    expect(state.setMessage).toHaveBeenCalledTimes(mode === 'create' ? 1 : 0);
  });

  it.each(['create', 'update'] as const)('preserves existing views and reports rejected incident %s assertively', async (mode) => {
    const state = setup();
    state.compliance.createIncident.mockRejectedValue(new Error('Speichern fehlgeschlagen'));
    state.compliance.updateIncident.mockRejectedValue(new Error('Speichern fehlgeschlagen'));
    const saved = mode === 'create'
      ? await state.incidents.createIncident(incident)
      : await state.incidents.updateIncident('incident-1', { summary: 'Korrektur' });
    expect(saved).toBe(false);
    expect(state.refreshIncidents).not.toHaveBeenCalled();
    expect(state.refreshSelfCheck).not.toHaveBeenCalled();
    expect(state.setMessage).toHaveBeenCalledExactlyOnceWith('Speichern fehlgeschlagen');
    expect(state.announce).toHaveBeenCalledExactlyOnceWith('Speichern fehlgeschlagen', 'assertive');
  });

  it('does not refresh or announce success while an incident is still being saved', async () => {
    const state = setup();
    let saved!: (result: { id: string }) => void;
    state.compliance.createIncident.mockImplementation(() => new Promise((resolve) => { saved = resolve; }));
    const pending = state.incidents.createIncident(incident);
    await vi.waitFor(() => expect(state.compliance.createIncident).toHaveBeenCalled());
    expect(state.refreshIncidents).not.toHaveBeenCalled();
    expect(state.announce).not.toHaveBeenCalled();
    saved({ id: 'incident-1' });
    await pending;
    expect(state.refreshIncidents).toHaveBeenCalledOnce();
  });

  it('reports unavailable report and incident services through assertive messages', async () => {
    const state = setup();
    vi.mocked(waitForBridge).mockResolvedValue(null);
    await state.documents.exportPdfCurrent();
    expect(state.announce).toHaveBeenLastCalledWith('Berichtsdienst ist nicht erreichbar.', 'assertive');
    await state.incidents.createIncident(incident);
    expect(state.announce).toHaveBeenLastCalledWith('Vorfallservice ist nicht erreichbar.', 'assertive');
  });

  it('waits for the refreshed self check before announcing incident completion', async () => {
    const state = setup();
    let complete!: () => void;
    state.refreshSelfCheck.mockImplementation(() => new Promise<void>((resolve) => { complete = resolve; }));
    const pending = state.incidents.updateIncident('incident-1', { status: 'in_review' });
    await vi.waitFor(() => expect(state.refreshSelfCheck).toHaveBeenCalled());
    expect(state.refreshIncidents).toHaveBeenCalledOnce();
    expect(state.announce).not.toHaveBeenCalled();
    complete();
    await pending;
    expect(state.announce).toHaveBeenCalledExactlyOnceWith(expect.any(String), 'polite');
  });
});
