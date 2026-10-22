import { describe, expect, it } from "vitest";
import { countVisits, contractStatus, scheduledVisitDate, contractVisitCounts, visitStatusLabel } from "./maintenance-contracts";

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

describe("visit counts and next dates", () => {
  it("FA every 3 months is 4 visits per year even with a short end date", () => {
    expect(countVisits("2026-06-01", "2026-12-01", 3)).toBe(4);
    expect(countVisits("2026-01-01", "2026-12-01", 3)).toBe(4);
    expect(countVisits("2026-01-01", "2027-01-01", 6)).toBe(2);
  });
  it("FF last visit 18 May with no counted visits -> next 18 Nov", () => {
    expect(scheduledVisitDate("2026-06-01", 6, 1, 0, "2026-05-18")).toBe("2026-11-18");
  });
  it("a visit marked done today counts on the contract and the next visit follows today", () => {
    const c = { start_date: "2026-01-01", end_date: "2027-01-01", interval_months: 3 };
    // one filed report plus one visit marked done in Maintenance Pending
    expect(contractVisitCounts(c, 2)).toEqual({ total: 4, done: 2, remaining: 2 });
    expect(scheduledVisitDate(c.start_date, c.interval_months, 3, 2, "2026-10-21")).toBe(
      "2027-01-21",
    );
  });
});

describe("pending visit status labels", () => {
  it("a completed visit is labelled Completed", () => {
    expect(visitStatusLabel({ status: "completed", due_date: "2020-01-01" }, "2026-10-22")).toBe("Completed");
  });
  it("an expired contract with visits left labels the visit with the remaining count", () => {
    expect(
      visitStatusLabel({ status: "pending", due_date: "2020-06-01", contract_end_date: "2020-01-01", contract_remaining: 3 }, "2026-10-22"),
    ).toBe("Expired – 3 Visits Remaining");
  });
  it("an expired contract with no remaining visits falls back to the due date", () => {
    expect(
      visitStatusLabel({ status: "pending", due_date: "2020-06-01", contract_end_date: "2020-01-01", contract_remaining: 0 }, "2026-10-22"),
    ).toBe("Overdue");
  });
  it("due dates within the next week are Due soon and later ones Upcoming", () => {
    expect(visitStatusLabel({ status: "pending", due_date: "2026-10-25" }, "2026-10-22")).toBe("Due soon");
    expect(visitStatusLabel({ status: "pending", due_date: "2026-12-01" }, "2026-10-22")).toBe("Upcoming");
  });
});
