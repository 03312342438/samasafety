// ============================================================================
// SAMA master workflow reference.
// ONE source of truth for departments, lifecycle stages, statuses and badges.
// Every module must use these constants instead of inventing its own strings.
// ============================================================================

export type Department =
  | "admin"
  | "sales"
  | "project_manager"
  | "inventory"
  | "technician"
  | "accounts"
  | "employee";

export const DEPARTMENTS: { value: Department; label: string; description: string }[] = [
  { value: "admin", label: "Management", description: "Full visibility and approval authority" },
  { value: "sales", label: "Sales", description: "Inquiries, quotations, customer POs" },
  { value: "project_manager", label: "Project Manager", description: "Planning, BOM/BOS, job numbers" },
  { value: "inventory", label: "Inventory / Store", description: "Stock, reservations, material issue" },
  { value: "technician", label: "Installation & Maintenance", description: "Site work, reports, daily progress" },
  { value: "accounts", label: "Accounts", description: "Invoices, payments, project costs" },
];

export const DEPARTMENT_LABELS: Record<string, string> = {
  admin: "Management",
  sales: "Sales",
  project_manager: "Project Manager",
  inventory: "Inventory",
  technician: "Technician",
  accounts: "Accounts",
  employee: "Technician",
};

/** Legacy "employee" accounts are technicians in the unified workflow. */
export function normalizeRoles(roles: string[] | undefined): Department[] {
  const set = new Set<Department>();
  (roles ?? []).forEach((r) => {
    if (r === "employee") set.add("technician");
    set.add(r as Department);
  });
  return [...set];
}

export function hasDept(roles: string[] | undefined, dept: Department): boolean {
  return normalizeRoles(roles).includes(dept);
}

// --------------------------------------------------------------------------
// Master lifecycle — the single controlled status list (section 22).
// --------------------------------------------------------------------------
export const LIFECYCLE_STAGES = [
  "inquiry",
  "requirement_review",
  "quotation_draft",
  "technical_review",
  "quotation_approval",
  "quotation_sent",
  "follow_up",
  "negotiation",
  "customer_accepted",
  "po_received",
  "po_verification",
  "clarification_required",
  "project_approval",
  "project_initiated",
  "project_planning",
  "bom_bos_preparation",
  "bom_bos_approval",
  "job_number_created",
  "job_number_approval",
  "material_planning",
  "material_allocation",
  "material_issued",
  "in_progress",
  "service_report",
  "customer_confirmation",
  "pm_review",
  "billing",
  "payment",
  "final_review",
  "closed",
] as const;

export type LifecycleStage = (typeof LIFECYCLE_STAGES)[number];

export const STAGE_LABELS: Record<string, string> = {
  inquiry: "Inquiry",
  requirement_review: "Requirement Review",
  quotation_draft: "Quotation Draft",
  technical_review: "Technical Review",
  quotation_approval: "Quotation Approval",
  quotation_sent: "Quotation Sent",
  follow_up: "Follow-up",
  negotiation: "Negotiation / Revision",
  customer_accepted: "Customer Accepted",
  po_received: "Customer PO Received",
  po_verification: "PO Verification",
  clarification_required: "Clarification Required",
  project_approval: "Management Project Approval",
  project_initiated: "Project Initiated",
  project_planning: "Project Planning",
  bom_bos_preparation: "BOM/BOS Preparation",
  bom_bos_approval: "BOM/BOS Approval",
  job_number_created: "Job Number Created",
  job_number_approval: "Job Number Approval",
  material_planning: "Material Planning",
  material_allocation: "Material Allocation",
  material_issued: "Material Issued",
  in_progress: "Installation / Maintenance In Progress",
  service_report: "Service Report",
  customer_confirmation: "Customer Confirmation",
  pm_review: "Project Manager Review",
  billing: "Billing",
  payment: "Payment",
  final_review: "Final Management Review",
  closed: "Project Closure",
};

// --------------------------------------------------------------------------
// Approval gates A1 - A6 (section 6).
// --------------------------------------------------------------------------
export const APPROVAL_TYPES = {
  A1: "quotation_commercial",
  A2: "project_initiation",
  A3: "bom_bos",
  A4: "job_number",
  A5: "additional_material",
  A6: "final_review",
} as const;

export const APPROVAL_TYPE_LABELS: Record<string, string> = {
  quotation_commercial: "A1 — Quotation / Commercial Exception",
  project_initiation: "A2 — Customer Order / Project Initiation",
  bom_bos: "A3 — BOM / BOS",
  job_number: "A4 — Job Number",
  additional_material: "A5 — Additional Material / Cost",
  final_review: "A6 — Final Project / Commercial Review",
};

export type ApprovalDecision = "pending" | "approved" | "rejected" | "revision_requested";

export const DECISION_LABELS: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  revision_requested: "Revision Requested",
};

// --------------------------------------------------------------------------
// Shared status badge styling (semantic tokens only).
// --------------------------------------------------------------------------
export function statusBadgeClass(status: string): string {
  const s = (status ?? "").toLowerCase();
  if (["approved", "completed", "closed", "active", "paid", "verified", "ok"].includes(s))
    return "bg-primary/10 text-primary ring-1 ring-primary/20";
  if (["rejected", "clarification_required", "overdue", "shortage", "faulty"].includes(s))
    return "bg-destructive/10 text-destructive ring-1 ring-destructive/20";
  if (["pending", "revision_requested", "draft", "on_hold"].includes(s))
    return "bg-muted text-muted-foreground ring-1 ring-border";
  return "bg-accent/60 text-accent-foreground ring-1 ring-border";
}

export function humanize(value: string | null | undefined): string {
  if (!value) return "—";
  return (
    STAGE_LABELS[value] ??
    DECISION_LABELS[value] ??
    value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}
