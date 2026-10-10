import { describe, expect, it } from "vitest";
import { contractStatus, scheduledVisitDate } from "./maintenance-contracts";

describe("dynamic maintenance scheduling", () => {
  it("uses the contract schedule before any visit is done", () => {
    expect(scheduledVisitDate("2026-01-01", 3, 2, 0, null)).toBe("2026-04-01");
  });
  it("visit 2 done on 1 May -> next visits 1 Aug and 1 Nov", () => {
    expect(scheduledVisitDate("2026-01-01", 3, 3, 2, "2026-05-01")).toBe("2026-08-01");
    expect(scheduledVisitDate("2026-01-01", 3, 4, 2, "2026-05-01")).toBe("2026-11-01");
  });
  it("visit 3 done on 15 Aug -> next visit 15 Nov", () => {
    expect(scheduledVisitDate("2026-01-01", 3, 4, 3, "2026-08-15")).toBe("2026-11-15");
  });
  it("expired contract with visits left shows remaining count", () => {
    expect(contractStatus({ endDate: "2020-01-01", upcoming: "2020-06-01", remaining: 2 })).toBe(
      "Expired – 2 Visits Remaining",
    );
  });
});
