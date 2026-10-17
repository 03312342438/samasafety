import type { SparePart } from "@/lib/report-constants";

export const emptyCalloutPart = (): SparePart => ({ spare_no: "", description: "", qty: "", unit_price: "", total: "" });
export const hasCalloutParts = (parts: SparePart[]) => parts.some((p) => Boolean(p.spare_no.trim() || p.description.trim()));
export const quotationMessage = (status?: string) => status === "requested" ? "Spare parts quotation is requested" : status === "approved" ? "Approved spare parts quotation" : "";

export function calloutQuotationState(input: { hasParts: boolean; previous?: string; finalize: boolean; quotationApproved: boolean; hasSavedReport: boolean }) {
  if (input.finalize) {
    if (!input.hasSavedReport || !["requested", "approved"].includes(input.previous ?? "")) throw new Error("Submit the spare parts request first");
    if (!input.quotationApproved) throw new Error("Select an approved spare parts quotation before submitting again");
    return "approved";
  }
  if (input.previous === "approved") return "approved";
  if (input.hasParts || input.previous === "requested") return "requested";
  return "none";
}