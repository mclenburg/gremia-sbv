import { describe, expect, it } from "vitest";
import { validatePassword as validateSettingsPassword } from "../../../src/app/features/settings/passwordValidation";
import { validatePassword as validateServicePassword } from "../../../services/security/securitySupport";
import {
  hasMoreThanTwoIdenticalCharactersInARow,
  validateAppPassword,
} from "../../../services/passwordPolicy";

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

  it.each(["zu-kurz", "Passwort!!!2026", "aaa-besser-nicht", "aa-bb-cc-dd-2026", "112233445566", "nurkleinbuchstabenlang"])("wendet die Passwortregel für %s auch in Einstellungen und Service an", (password) => {
    expect(validateSettingsPassword(password)).toEqual(validateAppPassword(password));
    expect(validateServicePassword(password)).toEqual(validateAppPassword(password));
  });
});
