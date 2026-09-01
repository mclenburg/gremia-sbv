import { describe, expect, it, vi } from "vitest";
import { registerGremiaBrIpc } from "../../../electron/ipc/gremiaBrIpc";
import { IPC_CHANNELS } from "../../../electron/ipc/channels";
import { ApplicationError } from "../../../src/domain/models/application-error.model";

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
      getReadContext: vi.fn(() => ({ apiMode: "legacy_read_bridge" })),
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
