import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  hasMoreThanTwoIdenticalCharactersInARow,
  validateAppPassword,
} from "../services/passwordPolicy";

function source(path: string): string {
  return readFileSync(path, "utf8");
}

describe("Passwortsicherheitsregel P10b", () => {
  it("akzeptiert lange Passwörter ohne Zeichenklassenzwang", () => {
    expect(validateAppPassword("korrekt-pferd-batterie")).toBeNull();
    expect(validateAppPassword("nurkleinbuchstabenlang")).toBeNull();
    expect(validateAppPassword("112233445566")).toBeNull();
  });

  it("verwirft kurze Passwörter und mehr als zwei identische Zeichen in Folge", () => {
    expect(validateAppPassword("zu-kurz")).toContain("mindestens 12 Zeichen");
    expect(validateAppPassword("Passwort!!!2026")).toContain(
      "nicht mehr als zwei identische Zeichen",
    );
    expect(validateAppPassword("aaa-besser-nicht")).toContain(
      "nicht mehr als zwei identische Zeichen",
    );
  });

  it("behandelt zwei identische Zeichen in Folge bewusst als zulässig", () => {
    expect(hasMoreThanTwoIdenticalCharactersInARow("aa-bb-cc-dd-2026")).toBe(false);
    expect(hasMoreThanTwoIdenticalCharactersInARow("aaabesser-nicht")).toBe(true);
  });

  it("nutzt dieselbe Regel im Login, in den Einstellungen und im Security-Service", () => {
    expect(source("src/app/features/auth/LoginGate.tsx")).toContain(
      "validateAppPassword",
    );
    expect(source("src/app/features/settings/passwordValidation.ts")).toContain(
      "validateAppPassword as validatePassword",
    );
    expect(source("services/securityService.ts")).toContain(
      "validateAppPassword",
    );
  });
});
