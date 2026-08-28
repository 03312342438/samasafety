import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { logActivity, notifyDepartments } from "@/lib/activity";
import { nextSequence } from "@/lib/sequence";

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
        scope_type: z.enum(["installation", "maintenance", "service", "repair"]).default("installation"),
        description: z.string().max(2000).default(""),
        site_location: z.string().max(500).default(""),
        start_date: z.string().max(40).nullable().default(null),
        target_date: z.string().max(40).nullable().default(null),
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
      const { data: existing } = await supabase
        .from("job_numbers")
        .select("status, job_number")
        .eq("id", id)
        .maybeSingle();
      if (existing?.status === "approved") {
        throw new Error("An approved job number can no longer be edited.");
      }
      const { error } = await supabase.from("job_numbers").update(fields).eq("id", id);
      if (error) throw new Error(error.message);
      await logActivity(supabase, userId, {
        action: "edit",
        entity_table: "job_numbers",
        entity_id: id,
        entity_label: existing?.job_number ?? "",
        new_value: fields,
      });
      return { ok: true, id };
    }

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

    await logActivity(supabase, userId, {
      action: "create",
      entity_table: "job_numbers",
      entity_id: created.id,
      entity_label: created.job_number,
      new_value: fields,
    });
    await notifyDepartments(supabase, ["admin"], {
      title: `Job number ${created.job_number} created`,
      message: `Project ${project.project_number} — awaiting submission for approval`,
      category: "job_number",
      link: "/projects",
      entity_table: "job_numbers",
      entity_id: created.id,
    });
    return { ok: true, id: created.id, job_number: created.job_number };
  });

export const deleteJobNumber = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: prev } = await supabase.from("job_numbers").select("*").eq("id", data.id).maybeSingle();
    if (prev?.status === "approved") throw new Error("An approved job number cannot be deleted.");
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
