import { describe, expect, it, vi } from "vitest";
import { createIpcInvoker, RendererApplicationError } from "../../electron/preload/invoke";
import { createPreloadApi } from "../../electron/preload/index";
import { IPC_CHANNELS } from "../../electron/ipc/channels";
import { registerIpcHandler } from "../../electron/ipc/ipcHandler";
import { ApplicationError } from "../../src/domain/models/application-error.model";

describe("Patch 5 modular preload and IPC contracts", () => {
  it("invokes a declared channel and returns a serializable result", async () => {
    const invoke = vi.fn().mockResolvedValue({ initialized: true });
    const ipc = createIpcInvoker({ invoke });
    await expect(ipc(IPC_CHANNELS.securityStatus)).resolves.toEqual({ initialized: true });
    expect(invoke).toHaveBeenCalledWith("security:status");
  });

  it("rejects non-serializable renderer input before IPC", async () => {
    const invoke = vi.fn();
    const ipc = createIpcInvoker({ invoke });
    await expect(ipc(IPC_CHANNELS.casesCreate, { callback: () => undefined })).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
    expect(invoke).not.toHaveBeenCalled();
  });

  it("maps missing handlers and unknown main errors to a safe renderer error", async () => {
    const ipc = createIpcInvoker({ invoke: vi.fn().mockRejectedValue(new Error("No handler registered for secret/internal/path")) });
    await expect(ipc(IPC_CHANNELS.securityStatus)).rejects.toEqual(expect.objectContaining({
      code: "UNEXPECTED_ERROR",
      message: "Die angeforderte Aktion konnte nicht ausgeführt werden.",
      operation: "security:status",
    }));
  });

  it("rejects a non-serializable handler result with a safe application error", async () => {
    let registered: ((event: object) => Promise<unknown>) | undefined;
    const ipcMain = { handle: (_channel: string, handler: (event: object) => Promise<unknown>) => { registered = handler; } };
    registerIpcHandler(ipcMain as never, IPC_CHANNELS.securityStatus, async () => ({ value: () => undefined }));
    await expect(registered?.({ senderFrame: { url: "file:///app/index.html" } })).rejects.toThrow(/GREMIA_SBV_APPLICATION_ERROR/);
  });

  it("rejects calls from an untrusted renderer origin", async () => {
    let registered: ((event: object) => Promise<unknown>) | undefined;
    const ipcMain = { handle: (_channel: string, handler: (event: object) => Promise<unknown>) => { registered = handler; } };
    registerIpcHandler(ipcMain as never, IPC_CHANNELS.securityStatus, async () => ({ ok: true }));
    await expect(registered?.({ senderFrame: { url: "https://example.invalid/attack" } })).rejects.toThrow(/VALIDATION_FAILED/);
  });

  it("deep-freezes the exposed API without changing its public namespaces", () => {
    const api = createPreloadApi(async () => undefined as never, "2026-08-06T12:00:00.000Z");
    expect(Object.isFrozen(api)).toBe(true);
    expect(Object.isFrozen(api.security)).toBe(true);
    expect(Object.isFrozen(api.cases)).toBe(true);
    expect(api.diagnostics).toEqual({ bridgeReady: true, preloadLoadedAt: "2026-08-06T12:00:00.000Z" });
    expect(() => Object.assign(api.security, { unlock: undefined })).toThrow();
  });

  it("does not serialize unexpected internal main-process details", async () => {
    let registered: ((event: object) => Promise<unknown>) | undefined;
    const ipcMain = { handle: (_channel: string, handler: (event: object) => Promise<unknown>) => { registered = handler; } };
    registerIpcHandler(ipcMain as never, IPC_CHANNELS.securityStatus, async () => {
      throw new Error("SQLITE_SECRET_INTERNAL_PATH=/private/vault.db");
    });
    const error = await registered?.({ senderFrame: { url: "file:///app/index.html" } }).catch((cause: unknown) => cause);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain("Die angeforderte Aktion konnte nicht ausgeführt werden.");
    expect((error as Error).message).not.toContain("SQLITE_SECRET_INTERNAL_PATH");
  });

  it("uses a structured safe main-process error without leaking its cause", async () => {
    const payload = 'GREMIA_SBV_APPLICATION_ERROR:{"code":"NOT_FOUND","message":"Datensatz nicht gefunden.","operation":"cases:list"}';
    const ipc = createIpcInvoker({ invoke: vi.fn().mockRejectedValue(new Error(payload)) });
    await expect(ipc(IPC_CHANNELS.casesList)).rejects.toBeInstanceOf(RendererApplicationError);
    await expect(ipc(IPC_CHANNELS.casesList)).rejects.toMatchObject({ code: "NOT_FOUND", message: "Datensatz nicht gefunden." });
  });

  it("preserves a typed security failure across the main-process and preload boundary", async () => {
    let registered: ((event: object) => Promise<unknown>) | undefined;
    registerIpcHandler(
      { handle: (_channel: string, handler: (event: object) => Promise<unknown>) => { registered = handler; } } as never,
      IPC_CHANNELS.casesList,
      async () => { throw new ApplicationError("SECURITY_OPERATION_FAILED", "Tresor ist gesperrt."); },
    );
    const ipc = createIpcInvoker({
      invoke: vi.fn(async () => registered?.({ senderFrame: { url: "file:///app/index.html" } })),
    });

    await expect(ipc(IPC_CHANNELS.casesList)).rejects.toMatchObject({
      code: "SECURITY_OPERATION_FAILED",
      operation: "cases:list",
    });
  });
});
