import type { SparePart } from "@/lib/report-constants";

export const emptyCalloutPart = (): SparePart => ({ spare_no: "", description: "", qty: "", unit_price: "", total: "" });
export const hasCalloutParts = (parts: SparePart[]) => parts.some((p) => Boolean(p.spare_no.trim() || p.description.trim()));
export const quotationMessage = (status?: string) => status === "requested" ? "Spare parts quotation is requested" : status === "approved" ? "Approved spare parts quotation" : "";

export const canDeleteCalloutHistory = (roles: string[], status: string) =>
  status === "closed" && roles.includes("project_manager") && !roles.includes("maintenance");

export function calloutSignatureDate(date = new Date()) {
  const local = new Date(date);
  local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
  return local.toISOString().slice(0, 10);
}

export function approvedCalloutQuotation<T extends { reference: string; status: string }>(quotations: T[], reference: string): T {
  const match = quotations.find((quote) => quote.reference.trim().toLowerCase() === reference.trim().toLowerCase());
  if (!match || !["approved", "accepted", "won"].includes(match.status)) throw new Error("Enter an approved spare parts quotation number");
  return match;
}

export function calloutQuotationState(input: { hasParts: boolean; previous?: string; finalize: boolean; quotationApproved: boolean; hasSavedReport: boolean }) {
  if (input.finalize) {
    if (!input.hasSavedReport || !["requested", "approved"].includes(input.previous ?? "")) throw new Error("Submit the spare parts request first");
    if (!input.quotationApproved) throw new Error("Enter an approved spare parts quotation number before submitting again");
    return "approved";
  }
  if (input.previous === "approved") return "approved";
  if (input.hasParts || input.previous === "requested") return "requested";
  return "none";
}