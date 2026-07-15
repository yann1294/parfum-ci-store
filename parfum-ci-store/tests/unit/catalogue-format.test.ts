import { describe, expect, it } from "vitest";

import { formatXof, parseNotes, parseXofInput } from "@/lib/catalogue/format";

describe("catalogue formatting", () => {
  it("formats XOF amounts for French admin UI", () => {
    expect(formatXof(25000)).toBe("25 000 F CFA");
    expect(formatXof(120000)).toBe("120 000 F CFA");
  });

  it("parses integer XOF input without floating point arithmetic", () => {
    expect(parseXofInput("25 000 F CFA")).toBe(25000);
    expect(parseXofInput("120000")).toBe(120000);
  });

  it("normalizes note lists", () => {
    expect(parseNotes("bergamote, jasmin\nmusc")).toEqual(["bergamote", "jasmin", "musc"]);
  });
});
