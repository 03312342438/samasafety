import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
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
  let done = 0;
  const msr = (c.msr_no || "").trim();
  if (msr) {
    const { count } = await supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("msr_no", msr);
    done = count ?? 0;
  }

  await supabase
    .from("maintenance_tasks")
    .delete()
    .eq("contract_id", contractId)
    .eq("status", "pending");

  const rows = [];
  for (let n = done + 1; n <= total; n++) {
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
  if (rows.length) await supabase.from("maintenance_tasks").insert(rows);
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

    const msrs = Array.from(
      new Set(rows.map((r: any) => (r.msr_no || "").trim()).filter(Boolean)),
    );
    let reports: any[] = [];
    if (msrs.length) {
      const { data: reps } = await supabase
        .from("reports")
        .select("id, msr_no, report_date, date_completed, created_at")
        .in("msr_no", msrs);
      reports = reps ?? [];
    }

    const visitsByMsr: Record<string, string[]> = {};
    for (const r of reports) {
      const key = (r.msr_no || "").trim();
      if (!key) continue;
      const d = r.date_completed || r.report_date || String(r.created_at).slice(0, 10);
      (visitsByMsr[key] ??= []).push(String(d).slice(0, 10));
    }
    for (const k of Object.keys(visitsByMsr)) visitsByMsr[k].sort();

    return rows.map((c: any) => {
      const visits = visitsByMsr[(c.msr_no || "").trim()] ?? [];
      const total = countVisits(c.start_date, c.end_date, c.interval_months);
      const done = Math.min(visits.length, total || visits.length);
      const remaining = Math.max(total - done, 0);
      // The first visit falls on the contract start date itself.
      const upcoming =
        remaining > 0 && c.start_date ? visitDate(c.start_date, c.interval_months, done + 1) : "";
      return {
        ...c,
        last_visit: visits.length ? visits[visits.length - 1] : "",
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
    const payload = {
      ...fields,
      system_type: (SYSTEM_TYPES as readonly string[]).includes(fields.system_type)
        ? (fields.system_type as SystemType)
        : "FF",
      start_date: fields.start_date || null,
      end_date: fields.end_date || null,
    };
    if (id) {
      const { error } = await supabase
        .from("maintenance_contracts")
        .update(payload)
        .eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: row, error } = await supabase
      .from("maintenance_contracts")
      .insert({ ...payload, created_by: userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
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
