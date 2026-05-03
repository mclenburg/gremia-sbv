import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { findFirstTextCommand, replaceCommandMarker } from "../services/textCommandPolicy";

describe("0.4.57 inline command integration contracts", () => {
  it("detects commands used by large text fields", () => {
    expect(findFirstTextCommand("Bitte // Frist setzen")?.token).toBe("//");
    expect(findFirstTextCommand("Kontakt @@ ergänzen")?.token).toBe("@@");
    expect(findFirstTextCommand("Fall ## verknüpfen")?.token).toBe("##");
    expect(findFirstTextCommand("Norm §§ auswählen")?.token).toBe("§§");
    expect(findFirstTextCommand("Risiko !! markieren")?.token).toBe("!!");
    expect(findFirstTextCommand("Aufgabe >> vormerken")?.token).toBe(">>");
    expect(findFirstTextCommand("Stufe ^^ setzen")?.token).toBe("^^");
    expect(findFirstTextCommand("Name ~~ vormerken")?.token).toBe("~~");
  });

  it("connects TextCommandTextarea to global command detection", () => {
    const textarea = readFileSync("src/app/shared/textCommands/TextCommandTextarea.tsx", "utf8");

    expect(textarea).toContain("findFirstTextCommand(event.target.value)");
    expect(textarea).toContain("onTextCommand?.(payload)");
    expect(textarea).toContain("gremia-sbv:text-command-detected");
    expect(textarea).toContain("data-text-command-enabled");
  });

  it("wires all inline commands to case actions", () => {
    const hook = readFileSync("src/app/features/cases/inlineCommands/useInlineCommands.ts", "utf8");

    for (const action of [
      "createInlineDeadlineFromProtocol",
      "createAndInsertContactFromProtocol",
      "insertExistingContactFromProtocol",
      "insertCaseReferenceFromProtocol",
      "insertLegalNormFromProtocol",
      "insertRiskFromProtocol",
      "createOpenTaskFromProtocol",
      "applyConfidentialityFromProtocol",
      "applyAnonymizationMarkerFromProtocol"
    ]) {
      expect(hook).toContain(action);
    }
  });

  it("replaces command markers without deleting surrounding protocol text", () => {
    expect(replaceCommandMarker("Vorher §§ nachher", "Vorher ".length, "§§", "§ 178 Abs. 2 Satz 1 SGB IX"))
      .toBe("Vorher § 178 Abs. 2 Satz 1 SGB IX nachher");
  });
});
