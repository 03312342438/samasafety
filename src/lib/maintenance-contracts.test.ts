import { describe, expect, it } from "vitest";
import { contractStatus, scheduledVisitDate, contractVisitCounts } from "./maintenance-contracts";

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

describe("editable contracted visit counts", () => {
  const contract = { start_date: "2026-01-01", end_date: "2027-01-01", interval_months: 3, total_visits_override: 6, completed_visits_override: 2, completed_reports_at_override: 1 };
  it("uses the edited total and completed counts rather than the original four-visit schedule", () => {
    expect(contractVisitCounts(contract, 1)).toEqual({ total: 6, done: 2, remaining: 4 });
  });
  it("increments the edited completed baseline when another report is submitted", () => {
    expect(contractVisitCounts(contract, 2)).toEqual({ total: 6, done: 3, remaining: 3 });
  });
  it("supports resetting completed visits without deleting issued reports", () => {
    expect(contractVisitCounts({ ...contract, completed_visits_override: 0, completed_reports_at_override: 3 }, 3)).toEqual({ total: 6, done: 0, remaining: 6 });
  });
});
