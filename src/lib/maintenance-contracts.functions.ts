import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { nextSequence } from "@/lib/sequence";
import {
  SYSTEM_TYPES,
  contractStatus,
  countVisits,
  visitDate,
  type SystemType,
} from "@/lib/maintenance-contracts";

/**
 * Keeps the pending maintenance visits of a contract in sync so every upcoming
 * visit shows up in "Maintenance Pending" and gets a reminder when it is due.
 */
export async function syncContractTasks(supabase: any, contractId: string) {
  const { data: c } = await supabase
    .from("maintenance_contracts")
    .select("*")
    .eq("id", contractId)
    .maybeSingle();
  if (!c || !c.start_date || !c.interval_months) return;

  const total = countVisits(c.start_date, c.end_date, c.interval_months);
  if (!total) return;

  const { count } = await supabase
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("contract_id", contractId);
  const done = (count ?? 0) + (Number(c.prior_visits_done) || 0);

  // Existing rows for this contract (any status) so completed history is kept.
  const { data: existing } = await supabase
    .from("maintenance_tasks")
    .select("id, sequence, status")
    .eq("contract_id", contractId);
  const rowsBySeq = new Map<number, any>();
  for (const t of existing ?? []) rowsBySeq.set(t.sequence, t);

  // Drop pending rows that fall outside the contract's visit plan.
  const stale = (existing ?? [])
    .filter((t: any) => t.status === "pending" && (t.sequence > total || t.sequence <= done))
    .map((t: any) => t.id);
  if (stale.length)
    await supabase.from("maintenance_tasks").delete().in("id", stale);

  const rows = [];
  for (let n = done + 1; n <= total; n++) {
    if (rowsBySeq.has(n)) continue; // keep what is already there
    rows.push({
      contract_id: contractId,
      created_by: c.created_by,
      sequence: n,
      due_date: visitDate(c.start_date, c.interval_months, n),
      status: "pending",
      client_name: c.customer_name || "",
      project: c.project_name || "",
      site_location: c.site_location || "",
    });
  }
  if (rows.length) {
    const { error } = await supabase.from("maintenance_tasks").insert(rows);
    if (error) throw new Error(error.message);
  }
}

/** Refresh the pending visits of every contract sharing an MSR number. */
export async function syncContractTasksForMsr(supabase: any, msrNo: string) {
  const msr = (msrNo || "").trim();
  if (!msr) return;
  const { data } = await supabase
    .from("maintenance_contracts")
    .select("id")
    .eq("msr_no", msr);
  for (const c of data ?? []) await syncContractTasks(supabase, c.id);
}

/**
 * Self-healing: make sure every contract has its scheduled visits so the
 * "Maintenance Pending" list always reflects the contract list.
 */
export async function ensureAllContractTasks(supabase: any) {
  const { data } = await supabase.from("maintenance_contracts").select("id");
  for (const c of data ?? []) {
    try {
      await syncContractTasks(supabase, c.id);
    } catch {
      /* one bad contract must not break the list */
    }
  }
}

/** Existing contract number already used for this project name, if any. */
async function contractNoForProject(supabase: any, projectName: string): Promise<string> {
  const key = (projectName || "").trim().toLowerCase();
  if (!key) return "";
  const { data } = await supabase
    .from("maintenance_contracts")
    .select("project_name, contract_no")
    .order("created_at", { ascending: true });
  const hit = (data ?? []).find(
    (c: any) => String(c.project_name ?? "").trim().toLowerCase() === key && c.contract_no,
  );
  return hit?.contract_no ?? "";
}

const normKey = (s: string) => (s || "").trim().toLowerCase();
/** Same contract number only when project, customer and site all match. */
const contractKey = (c: { project_name?: string; customer_name?: string; site_location?: string }) =>
  [c.project_name, c.customer_name, c.site_location].map((v) => normKey(v ?? "")).join("|");

/**
 * One contract number per project name: the same project always reuses its
 * number, and a number already used by a different project is never reused.
 */
async function assignContractNo(
  supabase: any,
  target: { project_name: string; customer_name: string; site_location: string },
  requested: string,
  excludeId: string | null,
): Promise<string> {
  const { data } = await supabase
    .from("maintenance_contracts")
    .select("id, project_name, customer_name, site_location, contract_no")
    .order("created_at", { ascending: true });
  const rows = ((data ?? []) as any[]).filter((c) => c.id !== excludeId && c.contract_no);
  const key = contractKey(target);
  const own = key.replace(/\|/g, "") ? rows.find((c) => contractKey(c) === key) : undefined;
  if (own) return own.contract_no;
  const req = (requested || "").trim();
  if (req && !rows.some((c) => normKey(c.contract_no) === normKey(req))) return req;
  let max = 0;
  for (const c of rows) {
    const m = /^CN-\d{4}-(\d+)$/i.exec(String(c.contract_no));
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `CN-${new Date().getFullYear()}-${String(max + 1).padStart(4, "0")}`;
}

/**
 * Repairs old data: one contract number per (project + customer + site).
 * Rows with the same three values share a number; a number used by more than
 * one combination is kept only by the earliest one, the others get new numbers.
 * Mutates `rows` in place and saves the changes. Returns number of rows fixed.
 */
async function normalizeContractNumbers(supabase: any, rows: any[]): Promise<number> {
  const ordered = [...rows].sort((a, b) =>
    String(a.created_at).localeCompare(String(b.created_at)),
  );
  let max = 0;
  for (const c of ordered) {
    const m = /^CN-\d{4}-(\d+)$/i.exec(String(c.contract_no ?? ""));
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  const prefix = `CN-${new Date().getFullYear()}-`;
  const numberByKey = new Map<string, string>();
  const ownerByNumber = new Map<string, string>();
  const changes = new Map<string, string[]>(); // new number -> row ids
  for (const c of ordered) {
    const key = contractKey(c);
    let no = numberByKey.get(key);
    if (!no) {
      const current = String(c.contract_no ?? "").trim();
      const owner = current ? ownerByNumber.get(normKey(current)) : undefined;
      no = current && (owner === undefined || owner === key)
        ? current
        : `${prefix}${String(++max).padStart(4, "0")}`;
      numberByKey.set(key, no);
      ownerByNumber.set(normKey(no), key);
    }
    if (c.contract_no !== no) {
      c.contract_no = no;
      const ids = changes.get(no) ?? [];
      ids.push(c.id);
      changes.set(no, ids);
    }
  }
  let fixed = 0;
  for (const [no, ids] of changes) {
    const { error } = await supabase
      .from("maintenance_contracts")
      .update({ contract_no: no })
      .in("id", ids);
    if (!error) fixed += ids.length;
  }
  return fixed;
}

const contractSchema = z.object({
  msr_no: z.string().trim().max(100).default(""),
  contract_no: z.string().trim().max(100).default(""),
  customer_name: z.string().trim().max(300).default(""),
  project_name: z.string().trim().max(300).default(""),
  site_location: z.string().trim().max(300).default(""),
  start_date: z.string().max(40).default(""),
  end_date: z.string().max(40).default(""),
  system_type: z.string().max(20).default("FF"),
  interval_months: z.number().int().min(1).max(60).default(6),
  notes: z.string().trim().max(1000).default(""),
  prior_visits_done: z.number().int().min(0).max(1000).optional(),
  prior_last_visit: z.string().max(40).optional(),
});

/** Contracts with every derived column (last visit, upcoming, remaining, status). */
export const listContracts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("maintenance_contracts")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    if (!rows.length) return [];
    try {
      await normalizeContractNumbers(supabase, rows);
    } catch {
      /* never block the list on a numbering repair */
    }


    const { data: reps } = await supabase
      .from("reports")
      .select("id, contract_id, report_date, date_completed, created_at")
      .in("contract_id", rows.map((r: any) => r.id));
    const reports: any[] = reps ?? [];

    // Client email comes from the customer record, so the maintenance report
    // can be emailed to the client without anyone retyping the address.
    const { data: customers } = await supabase.from("customers").select("name, email");
    const emailByCustomer: Record<string, string> = {};
    for (const cu of customers ?? []) {
      const key = String(cu.name ?? "").trim().toLowerCase();
      if (key && cu.email) emailByCustomer[key] = String(cu.email).trim();
    }

    const visitsByMsr: Record<string, string[]> = {};
    for (const r of reports) {
      const key = r.contract_id;
      if (!key) continue;
      const d = r.date_completed || r.report_date || String(r.created_at).slice(0, 10);
      (visitsByMsr[key] ??= []).push(String(d).slice(0, 10));
    }
    for (const k of Object.keys(visitsByMsr)) visitsByMsr[k].sort();

    return rows.map((c: any) => {
      const visits = visitsByMsr[c.id] ?? [];
      const prior = Number(c.prior_visits_done) || 0;
      const total = countVisits(c.start_date, c.end_date, c.interval_months);
      const doneRaw = visits.length + prior;
      const done = Math.min(doneRaw, total || doneRaw);
      const lastVisit = visits.length
        ? visits[visits.length - 1]
        : c.prior_last_visit ? String(c.prior_last_visit).slice(0, 10) : "";
      const remaining = Math.max(total - done, 0);
      // The first visit falls on the contract start date itself.
      const upcoming =
        remaining > 0 && c.start_date ? visitDate(c.start_date, c.interval_months, done + 1) : "";
      return {
        ...c,
        customer_email:
          emailByCustomer[String(c.customer_name ?? "").trim().toLowerCase()] ?? "",
        last_visit: lastVisit,
        completed_count: done,
        total_visits: total,
        remaining_count: remaining,
        upcoming_visit: upcoming,
        status: contractStatus({ endDate: c.end_date, upcoming, remaining }),
      };
    });
  });

export const saveContract = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    contractSchema.extend({ id: z.string().uuid().nullable().default(null) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { id, ...fields } = data;
    fields.contract_no = await assignContractNo(
      supabase,
      fields,
      fields.contract_no,
      id,
    );
    const payload = {
      ...fields,
      system_type: (SYSTEM_TYPES as readonly string[]).includes(fields.system_type)
        ? (fields.system_type as SystemType)
        : "FF",
      prior_last_visit: fields.prior_last_visit || null,
      start_date: fields.start_date || null,
      end_date: fields.end_date || null,
    };
    if (id) {
      const { error } = await supabase
        .from("maintenance_contracts")
        .update(payload)
        .eq("id", id);
      if (error) throw new Error(error.message);
      await syncContractTasks(supabase, id);
      return { id };
    }
    const { data: row, error } = await supabase
      .from("maintenance_contracts")
      .insert({ ...payload, created_by: userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await syncContractTasks(supabase, row.id);
    return { id: row.id };
  });

/** Bulk-add contracts coming from the filled-in Excel template. */
export const importContracts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ rows: z.array(contractSchema).max(1000) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload = data.rows
      .filter((r) => r.contract_no || r.customer_name || r.project_name)
      .map((r) => ({
        ...r,
        system_type: (SYSTEM_TYPES as readonly string[]).includes(r.system_type)
          ? (r.system_type as SystemType)
          : "FF",
        prior_visits_done: r.prior_visits_done ?? 0,
        prior_last_visit: r.prior_last_visit || null,
        start_date: r.start_date || null,
        end_date: r.end_date || null,
        created_by: userId,
      }));
    if (!payload.length) return { added: 0 };
    // Existing numbers: project -> number, and number -> project.
    const { data: existingRows } = await supabase
      .from("maintenance_contracts")
      .select("project_name, customer_name, site_location, contract_no")
      .order("created_at", { ascending: true });
    const byProject = new Map<string, string>();
    const usedBy = new Map<string, string>();
    let maxNo = 0;
    const remember = (row: any, no: string) => {
      const pk = contractKey(row).replace(/^\|+$/, "");
      if (pk && !byProject.has(pk)) byProject.set(pk, no);
      if (!usedBy.has(normKey(no))) usedBy.set(normKey(no), pk);
      const m = /^CN-\d{4}-(\d+)$/i.exec(no);
      if (m) maxNo = Math.max(maxNo, parseInt(m[1], 10));
    };
    for (const c of existingRows ?? []) if (c.contract_no) remember(c, c.contract_no);
    const prefix = `CN-${new Date().getFullYear()}-`;
    for (const r of payload) {
      const key = contractKey(r).replace(/^\|+$/, "");
      if (key && byProject.has(key)) {
        r.contract_no = byProject.get(key)!;
      } else {
        const req = (r.contract_no || "").trim();
        const owner = req ? usedBy.get(normKey(req)) : undefined;
        r.contract_no =
          req && (owner === undefined || owner === key)
            ? req
            : `${prefix}${String(++maxNo).padStart(4, "0")}`;
      }
      remember(r, r.contract_no);
    }
    const { data: inserted, error } = await supabase
      .from("maintenance_contracts")
      .insert(payload)
      .select("id");
    if (error) throw new Error(error.message);
    for (const c of inserted ?? []) {
      try {
        await syncContractTasks(supabase, c.id);
      } catch {
        /* keep importing the rest */
      }
    }
    return { added: (inserted ?? []).length };
  });

export const deleteContract = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("maintenance_contracts")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAllContracts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // RLS limits this to contracts the caller is allowed to delete
    // (own contracts, or any contract for Management/admin).
    const { data: deleted, error } = await context.supabase
      .from("maintenance_contracts")
      .delete()
      .not("id", "is", null)
      .select("id");
    if (error) throw new Error(error.message);
    return { deleted: (deleted ?? []).length };
  });
