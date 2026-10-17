import { describe, expect, it } from "vitest";
import { calloutQuotationState, canDeleteCalloutHistory, calloutSignatureDate, approvedCalloutQuotation } from "./callout-workflow";

const first = { hasParts: true, finalize: false, quotationApproved: false, hasSavedReport: false };
describe("call-out spare parts submission", () => {
  it("only Project Managers can delete closed call-outs", () => {
    expect(canDeleteCalloutHistory(["project_manager"], "closed")).toBe(true);
    expect(canDeleteCalloutHistory(["admin"], "closed")).toBe(false);
    expect(canDeleteCalloutHistory(["project_manager"], "pending")).toBe(false);
  });
  it("Maintenance logins cannot delete call-outs", () => {
    expect(canDeleteCalloutHistory(["maintenance"], "closed")).toBe(false);
    expect(canDeleteCalloutHistory(["maintenance", "project_manager"], "closed")).toBe(false);
  });
  it("signature dates default to the present day", () => {
    expect(calloutSignatureDate(new Date(2026, 9, 17, 10, 40))).toBe("2026-10-17");
  });
  it("entered quotation numbers must refer to an approved quotation", () => {
    const quotes = [{ reference: "QT-0042", status: "approved" }, { reference: "QT-0043", status: "draft" }];
    expect(approvedCalloutQuotation(quotes, " qt-0042 ").reference).toBe("QT-0042");
    expect(() => approvedCalloutQuotation(quotes, "QT-0043")).toThrow("approved");
    expect(() => approvedCalloutQuotation(quotes, "QT-9999")).toThrow("approved");
  });
  it("first submission with spare parts requests a quotation", () => {
    expect(calloutQuotationState(first)).toBe("requested");
  });
  it("requires an approved quotation on the second submission", () => {
    expect(() => calloutQuotationState({ ...first, previous: "requested", finalize: true, hasSavedReport: true })).toThrow("approved spare parts quotation");
  });
  it("second submission with approval records approved spare parts quotation", () => {
    expect(calloutQuotationState({ ...first, previous: "requested", finalize: true, hasSavedReport: true, quotationApproved: true })).toBe("approved");
  });
  it("without parts there is no second submission requirement", () => {
    expect(calloutQuotationState({ ...first, hasParts: false })).toBe("none");
  });
  it("cannot skip the first submission", () => {
    expect(() => calloutQuotationState({ ...first, finalize: true, quotationApproved: true })).toThrow("request first");
  });
  it("removing parts cannot bypass an existing quotation request", () => {
    expect(calloutQuotationState({ ...first, hasParts: false, previous: "requested", hasSavedReport: true })).toBe("requested");
  });
});