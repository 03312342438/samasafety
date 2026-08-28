import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { logActivity, notifyDepartments } from "@/lib/activity";
import { nextSequence } from "@/lib/sequence";
import { assertCan, assertMutable } from "@/lib/permissions";

export const listProjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("projects")
      .select("*, customers(name), job_numbers(id, job_number, status)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getProject = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const [{ data: project }, { data: jobs }, { data: approvals }, { data: reports }, { data: tasks }] =
      await Promise.all([
        supabase.from("projects").select("*, customers(*)").eq("id", data.id).maybeSingle(),
        supabase.from("job_numbers").select("*").eq("project_id", data.id).order("created_at"),
        supabase.from("approvals").select("*").eq("project_id", data.id).order("submitted_at", { ascending: false }),
        supabase.from("reports").select("*").eq("project_id", data.id).order("created_at", { ascending: false }),
        supabase.from("maintenance_tasks").select("*").eq("project_id", data.id).order("due_date"),
      ]);
    if (!project) throw new Error("Project not found");
    return {
      project,
      jobs: jobs ?? [],
      approvals: approvals ?? [],
      reports: reports ?? [],
      tasks: tasks ?? [],
    };
  });

export const saveProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid().optional(),
        project_number: z.string().trim().max(60).default(""),
        name: z.string().trim().min(1).max(300),
        customer_id: z.string().uuid().nullable().default(null),
        site_location: z.string().max(500).default(""),
        project_type: z.enum(["installation", "maintenance", "both"]).default("installation"),
        stage: z.string().max(60).default("project_initiated"),
        status: z.enum(["active", "on_hold", "closed"]).default("active"),
        contract_value: z.number().min(0).default(0),
        currency: z.string().max(10).default("BHD"),
        estimated_cost: z.number().min(0).default(0),
        start_date: z.string().max(40).nullable().default(null),
        target_date: z.string().max(40).nullable().default(null),
        project_manager_id: z.string().uuid().nullable().default(null),
        progress_percent: z.number().int().min(0).max(100).default(0),
        notes: z.string().max(4000).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { id, ...raw } = data;
    const fields = {
      ...raw,
      start_date: raw.start_date || null,
      target_date: raw.target_date || null,
    };

    if (id) {
      const { data: prev } = await supabase.from("projects").select("*").eq("id", id).maybeSingle();
      const { error } = await supabase.from("projects").update(fields).eq("id", id);
      if (error) throw new Error(error.message);
      await logActivity(supabase, userId, {
        action: "edit",
        entity_table: "projects",
        entity_id: id,
        entity_label: prev?.project_number ?? fields.name,
        previous_value: prev,
        new_value: fields,
      });
      return { ok: true, id };
    }

    const projectNumber = fields.project_number || (await nextSequence(supabase, "projects", "project_number", "PRJ"));
    const { data: created, error } = await supabase
      .from("projects")
      .insert({ ...fields, project_number: projectNumber, created_by: userId })
      .select("id, project_number")
      .single();
    if (error) throw new Error(error.message);
    await logActivity(supabase, userId, {
      action: "create",
      entity_table: "projects",
      entity_id: created.id,
      entity_label: created.project_number,
      new_value: fields,
    });
    await notifyDepartments(supabase, ["admin", "project_manager"], {
      title: `Project ${created.project_number} created`,
      message: fields.name,
      category: "project",
      link: "/projects",
      entity_table: "projects",
      entity_id: created.id,
    });
    return { ok: true, id: created.id };
  });

export const deleteProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: prev } = await supabase.from("projects").select("*").eq("id", data.id).maybeSingle();
    const { error } = await supabase.from("projects").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logActivity(supabase, userId, {
      action: "delete",
      entity_table: "projects",
      entity_id: data.id,
      entity_label: prev?.project_number ?? "",
      previous_value: prev,
    });
    return { ok: true };
  });

// ----------------------------------------------------------- job numbers ----

export const listJobNumbers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("job_numbers")
      .select("*, projects(project_number, name), customers(name)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveJobNumber = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid().optional(),
        project_id: z.string().uuid(),
        job_kind: z.enum(["installation", "maintenance"]).default("installation"),
        scope_type: z.enum(["installation", "maintenance", "service", "repair"]).default("installation"),
        maintenance_interval_months: z.number().int().min(1).max(120).nullable().default(null),
        bom_id: z.string().uuid().nullable().default(null),
        description: z.string().max(2000).default(""),
        site_location: z.string().max(500).default(""),
        start_date: z.string().max(40).nullable().default(null),
        target_date: z.string().max(40).nullable().default(null),
        steps: z
          .array(
            z.object({
              title: z.string().trim().min(1).max(300),
              expected_date: z.string().max(40).nullable().default(null),
            }),
          )
          .default([]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { id, steps, ...raw } = data;
    const fields = {
      ...raw,
      scope_type: raw.job_kind === "maintenance" ? "maintenance" : raw.scope_type,
      maintenance_interval_months:
        raw.job_kind === "maintenance" ? raw.maintenance_interval_months : null,
      bom_id: raw.bom_id || null,
      start_date: raw.start_date || null,
      target_date: raw.target_date || null,
    };

    if (!fields.bom_id) throw new Error("A linked BOM/BOS reference is required for a job number.");
    if (fields.job_kind === "maintenance" && !fields.maintenance_interval_months) {
      throw new Error("Select the maintenance interval (in months).");
    }
    if (fields.job_kind === "installation" && steps.length === 0) {
      throw new Error("Add at least one installation step with an expected completion date.");
    }

    const writeSteps = async (jobId: string) => {
      await supabase.from("job_installation_steps").delete().eq("job_number_id", jobId);
      if (steps.length === 0) return;
      await supabase.from("job_installation_steps").insert(
        steps.map((s, i) => ({
          job_number_id: jobId,
          sequence: i + 1,
          title: s.title,
          expected_date: s.expected_date || null,
          status: "pending",
        })),
      );
    };

    if (id) {
      const { data: existing } = await supabase
        .from("job_numbers")
        .select("status, job_number")
        .eq("id", id)
        .maybeSingle();
      await assertMutable(supabase, userId, {
        approved: existing?.status === "approved",
        label: `Job number ${existing?.job_number ?? ""}`.trim(),
      });
      const { error } = await supabase.from("job_numbers").update(fields).eq("id", id);
      if (error) throw new Error(error.message);
      await writeSteps(id);
      await logActivity(supabase, userId, {
        action: "edit",
        entity_table: "job_numbers",
        entity_id: id,
        entity_label: existing?.job_number ?? "",
        new_value: fields,
      });
      return { ok: true, id };
    }

    await assertCan(supabase, userId, "jobnumber.create");

    // A job number may only be created once the project itself is initiated
    // (management approval A2 sets the project stage).
    const { data: project } = await supabase
      .from("projects")
      .select("id, customer_id, stage, project_number")
      .eq("id", fields.project_id)
      .maybeSingle();
    if (!project) throw new Error("Project not found");

    const jobNumber = await nextSequence(supabase, "job_numbers", "job_number", "SAMA");
    const { data: created, error } = await supabase
      .from("job_numbers")
      .insert({
        ...fields,
        job_number: jobNumber,
        customer_id: project.customer_id,
        status: "draft",
        created_by: userId,
      })
      .select("id, job_number")
      .single();
    if (error) throw new Error(error.message);
    await writeSteps(created.id);

    await logActivity(supabase, userId, {
      action: "create",
      entity_table: "job_numbers",
      entity_id: created.id,
      entity_label: created.job_number,
      new_value: fields,
    });
    await notifyDepartments(supabase, ["admin", "project_manager"], {
      title: `Job number ${created.job_number} created`,
      message: `Project ${project.project_number} — awaiting Project Manager approval`,
      category: "job_number",
      link: "/projects",
      entity_table: "job_numbers",
      entity_id: created.id,
    });
    return { ok: true, id: created.id, job_number: created.job_number };
  });

// --------------------------------------------------- installation steps ----

export const listInstallationSteps = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ job_number_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("job_installation_steps")
      .select("*")
      .eq("job_number_id", data.job_number_id)
      .order("sequence");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const setInstallationStepStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["pending", "in_progress", "completed"]),
        completed_date: z.string().max(40).nullable().default(null),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const completed =
      data.status === "completed"
        ? data.completed_date || new Date().toISOString().slice(0, 10)
        : null;
    const { error } = await supabase
      .from("job_installation_steps")
      .update({ status: data.status, completed_date: completed })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    // Roll the job progress up from its steps.
    const { data: step } = await supabase
      .from("job_installation_steps")
      .select("job_number_id")
      .eq("id", data.id)
      .maybeSingle();
    if (step?.job_number_id) {
      const { data: all } = await supabase
        .from("job_installation_steps")
        .select("status")
        .eq("job_number_id", step.job_number_id);
      const rows = all ?? [];
      const done = rows.filter((r: any) => r.status === "completed").length;
      const pct = rows.length ? Math.round((done / rows.length) * 100) : 0;
      await supabase.from("job_numbers").update({ progress_percent: pct }).eq("id", step.job_number_id);
    }

    await logActivity(supabase, userId, {
      action: "edit",
      entity_table: "job_installation_steps",
      entity_id: data.id,
      entity_label: data.status,
      new_value: { status: data.status },
    });
    return { ok: true };
  });


export const deleteJobNumber = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: prev } = await supabase.from("job_numbers").select("*").eq("id", data.id).maybeSingle();
    await assertMutable(supabase, userId, {
      approved: prev?.status === "approved",
      label: `Job number ${prev?.job_number ?? ""}`.trim(),
      action: "delete",
    });
    const { error } = await supabase.from("job_numbers").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logActivity(supabase, userId, {
      action: "delete",
      entity_table: "job_numbers",
      entity_id: data.id,
      entity_label: prev?.job_number ?? "",
      previous_value: prev,
    });
    return { ok: true };
  });
