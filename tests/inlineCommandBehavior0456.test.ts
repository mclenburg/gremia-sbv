import { describe, expect, it } from "vitest";
import { formatLegalNormText } from "../services/textCommandPolicy";

describe("0.4.57a inline command behavior typing fix", () => {
  it("formats legal norms with the expected minimal suggestion shape", () => {
    const result = formatLegalNormText({
      paragraph: "§ 178 Abs. 2 Satz 1 SGB IX",
      title: "Unterrichtung und Anhörung"
    });

    expect(result).toContain("§ 178 Abs. 2 Satz 1 SGB IX");
    expect(result).toContain("Unterrichtung und Anhörung");
  });
});
