import { describe, expect, it, vi } from "vitest";
import { registerGremiaBrIpc } from "../../../electron/ipc/gremiaBrIpc";
import { IPC_CHANNELS } from "../../../electron/ipc/channels";
import { ApplicationError } from "../../../src/domain/models/application-error.model";
import { GremiaBrCacheService } from "../../../services/gremiaBr/gremiaBrCacheService";

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
  it("ruft bei jedem bewussten Gesamt-Refresh einen neuen V2-Stand ab", async () => {
    const { ipcMain, handlers } = createIpcRecorder();
    const services = createLockedStartupServices();
    const cache = new GremiaBrCacheService();
    let meetingId = "m1";
    services.gremiaBrAuth.getReadContext.mockReturnValue({ apiMode: "gremia_br_v2", selectedBodyId: "sbv" });
    services.gremiaBrAuth.get.mockImplementation(async (path: string) => {
      if (path === "/api/v1/tasks") return { items: [], total: 0 };
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
