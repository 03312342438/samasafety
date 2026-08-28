import { can, type Capability } from "@/lib/workflow";

type AnyClient = any;

/** Read the caller's department roles (server side). */
export async function myRoles(supabase: AnyClient, userId: string): Promise<string[]> {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  return (data ?? []).map((r: any) => r.role as string);
}

export async function isManagement(supabase: AnyClient, userId: string): Promise<boolean> {
  return (await myRoles(supabase, userId)).includes("admin");
}

const MESSAGES: Partial<Record<Capability, string>> = {
  "report.fill": "Only Installation & Maintenance / Technician staff can submit service reports.",
  "sales.manage": "Only the Sales department can manage inquiries, quotations and customer POs.",
  "project.create": "Only the Project Manager can create projects and project numbers.",
  "bom.create": "Only the Project Manager can create a BOM/BOS.",
  "jobnumber.create": "Only Installation & Maintenance can create a job number.",
  "jobnumber.approve_pm": "Only the Project Manager can approve a job number.",
  "stock.item.create": "Only the Project Manager can add a new inventory item.",
  "stock.receive": "Only the Store can receive stock.",
  "stock.issue": "Only the Store can release material.",
  "accounts.manage": "Only the Accounts department can handle invoices and payments.",
};

/** Throw unless the caller's department allows this action. */
export async function assertCan(
  supabase: AnyClient,
  userId: string,
  cap: Capability,
): Promise<string[]> {
  const roles = await myRoles(supabase, userId);
  if (!can(roles, cap)) {
    throw new Error(MESSAGES[cap] ?? "You do not have permission to do this.");
  }
  return roles;
}
