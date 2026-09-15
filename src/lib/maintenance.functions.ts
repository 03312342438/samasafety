import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildSchedule } from "@/lib/maintenance-schedule";

// ---------- Maintenance contracts ----------
// A maintenance contract is a maintenance job number: it carries the type of
// maintenance, the interval between visits and how many visits are covered.
// Completed visits are the maintenance reports filed against that job.
export const listMaintenanceContracts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data: jobs, error } = await supabase
      .from("job_numbers")
      .select(
        "id, job_number, project_id, customer_id, site_location, description, job_kind, maintenance_type, maintenance_interval_months, maintenance_total_count, maintenance_start_date, start_date, created_at, customers(name), projects(project_number, name, site_location)",
      )
      .eq("job_kind", "maintenance")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const list = jobs ?? [];
    if (!list.length) return [];

    const { data: reports } = await supabase
      .from("reports")
      .select("id, job_number_id, msr_no, report_date, date_completed, created_at")
      .in(
        "job_number_id",
        list.map((j: any) => j.id),
      );

    const byJob: Record<string, any[]> = {};
    for (const r of reports ?? []) {
      if (!r.job_number_id) continue;
      (byJob[r.job_number_id] ??= []).push(r);
    }

    return list.map((j: any) => {
      const done = (byJob[j.id] ?? []).sort((a, b) =>
        String(a.date_completed || a.report_date || a.created_at).localeCompare(
          String(b.date_completed || b.report_date || b.created_at),
        ),
      );
      const total = j.maintenance_total_count ?? 0;
      const schedule = buildSchedule({
        baseDate:
          j.maintenance_start_date || j.start_date || String(j.created_at).slice(0, 10),
        intervalValue: j.maintenance_interval_months ?? 0,
        intervalUnit: "months",
        count: total,
      });
      const completed = schedule.slice(0, done.length).map((s, i) => ({
        sequence: s.sequence,
        due_date: s.due_date,
        completed_date:
          done[i]?.date_completed || done[i]?.report_date || String(done[i]?.created_at ?? "").slice(0, 10),
        msr_no: done[i]?.msr_no ?? "",
      }));
      const remaining = schedule.slice(done.length);
      return {
        id: j.id,
        job_number: j.job_number,
        customer_name: j.customers?.name ?? "—",
        project_id: j.project_id,
        customer_id: j.customer_id,
        project_name: j.projects
          ? `${j.projects.project_number} — ${j.projects.name}`
          : "—",
        project_label: j.projects?.name ?? "",
        site_location: j.site_location || j.projects?.site_location || "—",
        maintenance_type: j.maintenance_type || "General maintenance",
        interval_months: j.maintenance_interval_months ?? 0,
        total_count: total,
        completed_count: completed.length,
        remaining_count: Math.max(remaining.length, 0),
        completed,
        remaining,
        next_due: remaining[0]?.due_date ?? "",
        next_sequence: remaining[0]?.sequence ?? null,
      };
    });
  });

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin access required");
}

// ---------- Maintenance tasks ----------

// Attach report fields (msr_no, order_no, contract, our_ref_no, report_date)
// to tasks so they can be searched by those values in the UI.
async function attachReportFields(supabase: any, tasks: any[]) {
  const reportIds = Array.from(new Set(tasks.map((t: any) => t.report_id).filter(Boolean)));
  if (!reportIds.length) return tasks;
  const { data: reports } = await supabase
    .from("reports")
    .select("id, msr_no, order_no, contract, our_ref_no, report_date")
    .in("id", reportIds);
  const byId = Object.fromEntries((reports ?? []).map((r: any) => [r.id, r]));
  return tasks.map((t: any) => {
    const r = byId[t.report_id] ?? {};
    return {
      ...t,
      msr_no: r.msr_no ?? "",
      order_no: r.order_no ?? "",
      contract: r.contract ?? "",
      our_ref_no: r.our_ref_no ?? "",
      report_date: r.report_date ?? "",
    };
  });
}

export const listMyMaintenanceTasks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("maintenance_tasks")
      .select("*")
      .eq("created_by", userId)
      .order("due_date", { ascending: true });
    if (error) throw new Error(error.message);
    return await attachReportFields(supabase, data ?? []);
  });

export const listAllMaintenanceTasks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { data, error } = await supabase
      .from("maintenance_tasks")
      .select("*")
      .order("due_date", { ascending: true });
    if (error) throw new Error(error.message);
    const tasks = data ?? [];

    // Attach the responsible employee's name.
    const ids = Array.from(new Set(tasks.map((t: any) => t.created_by)));
    let nameById: Record<string, string> = {};
    if (ids.length) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", ids);
      nameById = Object.fromEntries(
        (profiles ?? []).map((p: any) => [p.id, p.full_name || p.email || "—"]),
      );
    }
    const enriched = await attachReportFields(supabase, tasks);
    return enriched.map((t: any) => ({ ...t, employee_name: nameById[t.created_by] ?? "—" }));
  });


export const setMaintenanceTaskStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({ id: z.string().uuid(), status: z.enum(["pending", "completed"]) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("maintenance_tasks")
      .update({
        status: data.status,
        completed_at: data.status === "completed" ? new Date().toISOString() : null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteMaintenanceTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { error } = await supabase
      .from("maintenance_tasks")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Reminder email list ----------

export const listReminderEmails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("maintenance_reminder_emails")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const addEmailSchema = z.object({
  email: z.string().trim().email().max(255),
  label: z.string().trim().max(120).default(""),
});

export const addReminderEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => addEmailSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { error } = await supabase
      .from("maintenance_reminder_emails")
      .insert({ email: data.email.toLowerCase(), label: data.label });
    if (error) {
      if (error.code === "23505") throw new Error("That email is already in the list.");
      throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteReminderEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { error } = await supabase
      .from("maintenance_reminder_emails")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
