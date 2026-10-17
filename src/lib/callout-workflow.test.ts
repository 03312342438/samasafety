import { describe, expect, it } from "vitest";
import { calloutQuotationState } from "./callout-workflow";

const first = { hasParts: true, finalize: false, quotationApproved: false, hasSavedReport: false };
describe("call-out spare parts submission", () => {
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