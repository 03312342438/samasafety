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
