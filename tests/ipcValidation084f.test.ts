import { describe, expect, it } from "vitest";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  assertExtension,
  assertOptionalPositiveInteger,
  assertPlainObject,
  assertString,
  ensurePathInside,
  sanitizeDialogFileName,
} from "../electron/ipc/ipcValidation";

describe("Patch 0.8.4-f IPC validation baseline", () => {
  it("rejects missing or malformed primitive arguments before service access", () => {
    expect(() => assertString(undefined, "cases:documents:open", "Dokument-ID")).toThrow(/Ungültige Eingabe/);
    expect(() => assertString("", "cases:documents:open", "Dokument-ID", { minLength: 1 })).toThrow(/zu kurz/);
    expect(() => assertPlainObject([], "cases:create")).toThrow(/muss ein Objekt sein/);
  });

  it("sanitizes suggested export file names to basename only", () => {
    expect(sanitizeDialogFileName("../Akten/person.pdf", "cases:documents:export", "Dateiname")).toBe("person.pdf");
    expect(() => sanitizeDialogFileName("..", "cases:documents:export", "Dateiname")).toThrow(/kein gültiger Dateiname/);
  });

  it("keeps report-open paths inside the encrypted export area", () => {
    const root = path.join(tmpdir(), "gremia-sbv", "data", "exports");
    const inside = path.join(root, "bericht.gsbvpdf");
    const outside = path.join(tmpdir(), "gremia-sbv", "data", "vault.db");

    expect(ensurePathInside(inside, root, "reports:open-export-folder")).toBe(inside);
    expect(() => ensurePathInside(outside, root, "reports:open-export-folder")).toThrow(/außerhalb/);
  });

  it("allows only explicit encrypted report extension for report previews", () => {
    expect(assertExtension("bericht.gsbvpdf", "reports:open-export-folder", ["gsbvpdf"])).toBe("bericht.gsbvpdf");
    expect(() => assertExtension("bericht.pdf", "reports:open-export-folder", ["gsbvpdf"])).toThrow(/nicht zulässig/);
  });

  it("caps optional positive integer limits", () => {
    expect(assertOptionalPositiveInteger(undefined, "reports:history", "Limit", { max: 500 })).toBeUndefined();
    expect(assertOptionalPositiveInteger(25, "reports:history", "Limit", { max: 500 })).toBe(25);
    expect(() => assertOptionalPositiveInteger(1000, "reports:history", "Limit", { max: 500 })).toThrow(/zu groß/);
  });
});
