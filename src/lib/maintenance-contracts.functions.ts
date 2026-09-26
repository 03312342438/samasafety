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
  prior_visits_done: z.number().int().min(0).max(1000).default(0),
  prior_last_visit: z.string().max(40).default(""),
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
    if (!fields.contract_no)
      fields.contract_no = await nextSequence(supabase, "maintenance_contracts", "contract_no", "CN");
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
        prior_last_visit: r.prior_last_visit || null,
        start_date: r.start_date || null,
        end_date: r.end_date || null,
        created_by: userId,
      }));
    if (!payload.length) return { added: 0 };
    let nextNo = 0;
    const prefix = `CN-${new Date().getFullYear()}-`;
    for (const r of payload) {
      if (r.contract_no) continue;
      if (!nextNo) {
        const first = await nextSequence(supabase, "maintenance_contracts", "contract_no", "CN");
        nextNo = parseInt(first.split("-").pop() ?? "1", 10);
      }
      r.contract_no = `${prefix}${String(nextNo++).padStart(4, "0")}`;
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
