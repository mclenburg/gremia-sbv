import { describe, expect, it, vi } from "vitest";
import { registerGremiaBrIpc } from "../../../electron/ipc/gremiaBrIpc";
import { IPC_CHANNELS } from "../../../electron/ipc/channels";
import { ApplicationError } from "../../../src/domain/models/application-error.model";
import { GremiaBrCacheService } from "../../../services/gremiaBr/gremiaBrCacheService";
import { GremiaBrHttpError } from '../../../services/gremiaBr/gremiaBrHttpClient';

type RegisteredHandler = (event: object, ...args: unknown[]) => Promise<unknown>;

function createIpcRecorder() {
  const handlers = new Map<string, RegisteredHandler>();
  return {
    handlers,
    ipcMain: {
      handle: vi.fn((channel: string, handler: RegisteredHandler) => {
        handlers.set(channel, handler);
      }),
    },
  };
}

function createLockedStartupServices() {
  return {
    gremiaBrSettings: {
      getPublicSettings: vi.fn(() => ({ enabled: false })),
      saveSettings: vi.fn(),
      saveRelevanceSettings: vi.fn(),
      clearCredentials: vi.fn(),
      getRelevanceSettings: vi.fn(() => ({ groups: [] })),
    },
    gremiaBrAuth: {
      clearToken: vi.fn(),
      testConnection: vi.fn(),
      getReadContext: vi.fn(() => ({ apiMode: "legacy_read_bridge", selectedBodyId: undefined as string | undefined })),
      get: vi.fn(),
      post: vi.fn(),
    },
    gremiaBrCache: {
      clear: vi.fn(),
      getOverview: vi.fn(),
      getDashboardOverview: vi.fn(() => ({})),
      refresh: vi.fn(),
    },
    gremiaBrReferences: {
      suggestBrDecisions: vi.fn(),
      listForCase: vi.fn(),
      createOrUpdate: vi.fn(),
      delete: vi.fn(),
    },
    gremiaBrWorkspaceActions: vi.fn(() => {
      throw new ApplicationError("SECURITY_OPERATION_FAILED", "Tresor ist noch gesperrt.");
    }),
  };
}

describe("Gremia.BR IPC-Startup-Grenze", () => {
  it('verknüpft nur ein Verfahren aus dem manuell geladenen berechtigten Arbeitsstand', async () => {
    const { ipcMain, handlers } = createIpcRecorder();
    const services = createLockedStartupServices();
    services.gremiaBrCache.getOverview.mockReturnValue({
      accessibleCases: [{ id: 'remote-case-1', reference: 'BR-2026-17', subject: 'Arbeitsplatzgestaltung', procedureIds: ['procedure-1'] }],
    });
    registerGremiaBrIpc(ipcMain as never, {} as never, services as never);
    const save = handlers.get(IPC_CHANNELS.gremiaBrReferencesCreate)!;
    const event = { senderFrame: { url: 'file:///app/index.html' } };

    await expect(save(event, { caseId: 'local-case-1', sourceType: 'verfahren', sourceId: 'procedure-2', title: 'Fremd' })).rejects.toThrow();
    expect(services.gremiaBrReferences.createOrUpdate).not.toHaveBeenCalled();
    await save(event, { caseId: 'local-case-1', sourceType: 'verfahren', sourceId: 'procedure-1', title: 'Manipuliert', snapshot: { secret: true } });
    expect(services.gremiaBrReferences.createOrUpdate).toHaveBeenCalledWith({
      caseId: 'local-case-1', sourceType: 'verfahren', sourceId: 'procedure-1', title: 'BR-2026-17 · Arbeitsplatzgestaltung',
    });
    expect(services.gremiaBrAuth.get).not.toHaveBeenCalled();
  });

  it('lädt Verfahrensdetails erst nach eigener Auswahl aus dem berechtigten Arbeitsstand', async () => {
    const { ipcMain, handlers } = createIpcRecorder();
    const services = createLockedStartupServices();
    services.gremiaBrCache.getOverview.mockReturnValue({
      accessibleCases: [{ id: 'remote-case-1', reference: 'BR-2026-17', subject: 'Arbeitsplatzgestaltung', procedureIds: ['procedure-1'] }],
    });
    services.gremiaBrAuth.get.mockResolvedValue({
      id: 'procedure-1', masterCaseId: 'remote-case-1', procedureType: 'SBV_PARTICIPATION', state: 'UNDER_REVIEW',
      workflow: 'STANDARD', openedAt: '2026-09-20T10:00:00.000Z', version: 2, confidential: 'nicht übernehmen',
    });
    registerGremiaBrIpc(ipcMain as never, {} as never, services as never);
    const detail = handlers.get(IPC_CHANNELS.gremiaBrProcedureDetailGet)!;
    const event = { senderFrame: { url: 'file:///app/index.html' } };

    expect(services.gremiaBrAuth.get).not.toHaveBeenCalled();
    await expect(detail(event, 'procedure-2')).rejects.toThrow();
    expect(services.gremiaBrAuth.get).not.toHaveBeenCalled();
    expect(await detail(event, 'procedure-1')).toEqual({
      id: 'procedure-1', masterCaseId: 'remote-case-1', procedureType: 'SBV_PARTICIPATION', state: 'UNDER_REVIEW',
      workflow: 'STANDARD', openedAt: '2026-09-20T10:00:00.000Z', version: 2,
    });
    expect(services.gremiaBrAuth.get).toHaveBeenCalledWith('/api/v1/procedures/procedure-1');
  });

  it('liest Informationsanforderungen nur zu einem lokal verknüpften und weiterhin berechtigten Verfahren', async () => {
    const { ipcMain, handlers } = createIpcRecorder();
    const services = createLockedStartupServices();
    services.gremiaBrCache.getOverview.mockReturnValue({
      accessibleCases: [{ id: 'remote-case-1', reference: 'BR-2026-17', subject: 'Arbeitsplatzgestaltung', procedureIds: ['procedure-1'] }],
    });
    services.gremiaBrReferences.listForCase.mockReturnValue([]);
    services.gremiaBrAuth.get.mockResolvedValue([]);
    registerGremiaBrIpc(ipcMain as never, {} as never, services as never);
    const list = handlers.get(IPC_CHANNELS.gremiaBrInformationRequestsList)!;
    const event = { senderFrame: { url: 'file:///app/index.html' } };

    await expect(list(event, 'local-case-1', 'procedure-1')).rejects.toThrow();
    expect(services.gremiaBrAuth.get).not.toHaveBeenCalled();
    services.gremiaBrReferences.listForCase.mockReturnValue([{ sourceType: 'verfahren', sourceId: 'procedure-1' }]);
    expect(await list(event, 'local-case-1', 'procedure-1')).toEqual([]);
    expect(services.gremiaBrAuth.get).toHaveBeenCalledWith('/api/v1/procedures/procedure-1/information-requests');
  });

  it('legt Informationsanforderungen nur für ein verknüpftes berechtigtes Verfahren an', async () => {
    const { ipcMain, handlers } = createIpcRecorder();
    const services = createLockedStartupServices();
    services.gremiaBrCache.getOverview.mockReturnValue({
      accessibleCases: [{ id: 'remote-case-1', reference: 'BR-2026-17', subject: 'Arbeitsplatzgestaltung', procedureIds: ['procedure-1'] }],
    });
    services.gremiaBrReferences.listForCase.mockReturnValue([]);
    services.gremiaBrAuth.post.mockResolvedValue({ id: 'request-1', procedureId: 'procedure-1', status: 'OPEN', requestedAt: '2026-09-29T12:00:00.000Z', version: 1 });
    registerGremiaBrIpc(ipcMain as never, {} as never, services as never);
    const create = handlers.get(IPC_CHANNELS.gremiaBrInformationRequestCreate)!;
    const event = { senderFrame: { url: 'file:///app/index.html' } };
    const input = { caseId: 'local-case-1', procedureId: 'procedure-1', items: 'Unterlage' };

    await expect(create(event, input)).rejects.toThrow();
    expect(services.gremiaBrAuth.post).not.toHaveBeenCalled();
    services.gremiaBrReferences.listForCase.mockReturnValue([{ sourceType: 'verfahren', sourceId: 'procedure-1' }]);
    expect(await create(event, input)).toMatchObject({ status: 'OPEN' });
    expect(services.gremiaBrAuth.post).toHaveBeenCalledTimes(1);
  });

  it('fragt Details nur für eine Aufgabe aus dem eigenen manuellen Snapshot ab', async () => {
    const { ipcMain, handlers } = createIpcRecorder();
    const services = createLockedStartupServices();
    services.gremiaBrAuth.getReadContext.mockReturnValue({ apiMode: 'gremia_br_v2', selectedBodyId: 'sbv' });
    services.gremiaBrAuth.get.mockImplementation(async (path: string) => {
      if (path === '/api/v1/tasks/task-1') return { id: 'task-1', title: 'Prüfung', status: 'OPEN', version: 3, description: 'Details' };
      throw new Error(`Unerwarteter Pfad: ${path}`);
    });
    services.gremiaBrCache.getOverview.mockReturnValue({ ownTasks: [{ id: 'task-1' }] });
    registerGremiaBrIpc(ipcMain as never, {} as never, services as never);
    const event = { senderFrame: { url: 'file:///app/index.html' } };
    const detail = handlers.get(IPC_CHANNELS.gremiaBrOwnTaskDetailGet)!;

    expect(services.gremiaBrAuth.get).not.toHaveBeenCalled();
    await expect(detail(event, 'task-2')).rejects.toThrow();
    expect(services.gremiaBrAuth.get).not.toHaveBeenCalled();
    expect(await detail(event, 'task-1')).toMatchObject({ title: 'Prüfung', description: 'Details' });
    expect(services.gremiaBrAuth.get).toHaveBeenCalledTimes(1);
  });

  it('liest und ändert Aufgabenstatus nur nach eigenen IPC-Aktionen für den aktuellen Arbeitsstand', async () => {
    const { ipcMain, handlers } = createIpcRecorder();
    const services = createLockedStartupServices();
    services.gremiaBrCache.getOverview.mockReturnValue({ ownTasks: [{ id: 'task-1' }] });
    services.gremiaBrAuth.get.mockResolvedValue({ from: 'OPEN', allowed: ['IN_PROGRESS'] });
    services.gremiaBrAuth.post.mockResolvedValue({ id: 'task-1', title: 'Prüfung', status: 'IN_PROGRESS', version: 4 });
    registerGremiaBrIpc(ipcMain as never, {} as never, services as never);
    const event = { senderFrame: { url: 'file:///app/index.html' } };
    const options = handlers.get(IPC_CHANNELS.gremiaBrOwnTaskTransitionsGet)!;
    const transition = handlers.get(IPC_CHANNELS.gremiaBrOwnTaskTransitionPost)!;

    expect(services.gremiaBrAuth.get).not.toHaveBeenCalled();
    await expect(options(event, 'task-2')).rejects.toThrow();
    expect(services.gremiaBrAuth.get).not.toHaveBeenCalled();
    expect(await options(event, 'task-1')).toEqual({ from: 'OPEN', allowed: ['IN_PROGRESS'] });
    await expect(transition(event, { taskId: 'task-2', to: 'IN_PROGRESS', expectedVersion: 3 })).rejects.toThrow();
    expect(services.gremiaBrAuth.post).not.toHaveBeenCalled();
    expect(await transition(event, { taskId: 'task-1', to: 'IN_PROGRESS', expectedVersion: 3 }))
      .toMatchObject({ status: 'IN_PROGRESS', version: 4 });
    expect(services.gremiaBrAuth.post).toHaveBeenCalledTimes(1);
    services.gremiaBrAuth.post.mockRejectedValueOnce(new GremiaBrHttpError('Konflikt', 409, 'POST /api/v1/procedures/tasks/{taskId}/transitions'));
    await expect(transition(event, { taskId: 'task-1', to: 'IN_PROGRESS', expectedVersion: 3 }))
      .rejects.toThrow('zwischenzeitlich geändert');
  });

  it("ruft bei jedem bewussten Gesamt-Refresh einen neuen V2-Stand ab", async () => {
    const { ipcMain, handlers } = createIpcRecorder();
    const services = createLockedStartupServices();
    const cache = new GremiaBrCacheService();
    let meetingId = "m1";
    services.gremiaBrAuth.getReadContext.mockReturnValue({ apiMode: "gremia_br_v2", selectedBodyId: "sbv" });
    services.gremiaBrAuth.get.mockImplementation(async (path: string) => {
      if (path === "/api/v1/cases") return { items: [], total: 0 };
      if (path === "/api/v1/tasks") return { items: [], total: 0 };
      if (path === "/api/v1/access-approvals/mine") return [];
      if (path === "/api/v1/bodies/sbv/meetings") {
        return [{ id: meetingId, plannedStart: "2099-01-01T10:00:00.000Z", status: "PLANNED" }];
      }
      if (path.endsWith("/agenda") || path.endsWith("/decisions")) return [];
      throw new Error(`Unerwarteter Pfad: ${path}`);
    });
    registerGremiaBrIpc(ipcMain as never, {} as never, { ...services, gremiaBrCache: cache } as never);
    const event = { senderFrame: { url: "file:///app/index.html" } };
    const refresh = handlers.get(IPC_CHANNELS.gremiaBrCacheRefresh)!;

    await refresh(event);
    expect(cache.getOverview().upcomingMeetings).toMatchObject([{ id: "m1" }]);
    meetingId = "m2";
    await refresh(event);

    expect(cache.getOverview().upcomingMeetings).toMatchObject([{ id: "m2" }]);
    expect(services.gremiaBrAuth.get.mock.calls.filter(([path]) => path === "/api/v1/bodies/sbv/meetings")).toHaveLength(2);
  });

  it("verwirft den Remote-Arbeitsstand bei Konfigurationswechsel und gelöschten Zugangsdaten", async () => {
    const { ipcMain, handlers } = createIpcRecorder();
    const services = createLockedStartupServices();
    services.gremiaBrSettings.saveSettings.mockReturnValue({ enabled: true });
    registerGremiaBrIpc(ipcMain as never, {} as never, services as never);
    const event = { senderFrame: { url: "file:///app/index.html" } };

    await handlers.get(IPC_CHANNELS.gremiaBrSettingsSave)?.(event, { enabled: true });
    expect(services.gremiaBrCache.clear).toHaveBeenCalledTimes(1);
    await handlers.get(IPC_CHANNELS.gremiaBrCredentialsClear)?.(event);
    expect(services.gremiaBrCache.clear).toHaveBeenCalledTimes(2);
  });

  it("registriert Handler ohne datenbankgebundene Workspace-Actions beim App-Start zu erzeugen", async () => {
    const { ipcMain, handlers } = createIpcRecorder();
    const services = createLockedStartupServices();

    expect(() => registerGremiaBrIpc(ipcMain as never, {} as never, services as never)).not.toThrow();

    expect(services.gremiaBrWorkspaceActions).not.toHaveBeenCalled();
    expect(handlers.has(IPC_CHANNELS.gremiaBrSettingsGet)).toBe(true);

    await expect(handlers.get(IPC_CHANNELS.gremiaBrDocumentsList)?.({ senderFrame: { url: "file:///app/index.html" } }, 10))
      .rejects.toThrow("SECURITY_OPERATION_FAILED");
    expect(services.gremiaBrWorkspaceActions).toHaveBeenCalledTimes(1);
  });
});
