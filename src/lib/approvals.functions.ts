import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { logActivity, notifyDepartments, notifyUsers } from "@/lib/activity";

export const listApprovals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("approvals")
      .select("*, projects(project_number, name), job_numbers(job_number)")
      .order("submitted_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/** Full detail of the record a request is attached to, for the approver. */
export const getApprovalEntity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: approval } = await supabase
      .from("approvals")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (!approval) throw new Error("Approval not found");
    if (!approval.entity_id) return { kind: "none" as const, approval };

    if (approval.entity_table === "quotations") {
      const [{ data: quotation }, { data: items }] = await Promise.all([
        supabase
          .from("quotations")
          .select("*, customers(name, customer_number)")
          .eq("id", approval.entity_id)
          .maybeSingle(),
        supabase
          .from("quotation_items")
          .select("*")
          .eq("quotation_id", approval.entity_id)
          .order("sequence"),
      ]);
      return { kind: "quotation" as const, approval, quotation, items: items ?? [] };
    }
    if (approval.entity_table === "customer_pos") {
      const { data: po } = await supabase
        .from("customer_pos")
        .select("*, customers(name, customer_number), quotations(reference, total_amount)")
        .eq("id", approval.entity_id)
        .maybeSingle();
      return { kind: "customer_po" as const, approval, po };
    }
    return { kind: "none" as const, approval };
  });

/** Management may clear a decided request out of the record. */
export const deleteApproval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: myRoles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    if (!(myRoles ?? []).some((r) => r.role === "admin")) {
      throw new Error("Only Management can delete an approval record.");
    }
    const { data: prev } = await supabase.from("approvals").select("*").eq("id", data.id).maybeSingle();
    const { error } = await supabase.from("approvals").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logActivity(supabase, userId, {
      action: "delete",
      entity_table: "approvals",
      entity_id: data.id,
      entity_label: prev?.title ?? "",
      previous_value: prev,
    });
    return { ok: true };
  });

/** Raise an approval request (A1 - A6). Management is notified immediately. */
export const submitApproval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        approval_type: z.enum([
          "quotation_commercial",
          "project_initiation",
          "bom_bos",
          "job_number",
          "additional_material",
          "final_review",
          "customer_po",
          "commercial_review",
        ]),
        title: z.string().trim().min(1).max(300),
        details: z.string().max(4000).default(""),
        project_id: z.string().uuid().nullable().default(null),
        job_number_id: z.string().uuid().nullable().default(null),
        entity_table: z.string().max(60).optional(),
        entity_id: z.string().uuid().nullable().optional(),
        amount: z.number().min(0).default(0),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { entity_table, entity_id, ...fields } = data;
    const { data: created, error } = await supabase
      .from("approvals")
      .insert({
        ...fields,
        decision: "pending",
        submitted_by: userId,
        entity_table: entity_table ?? (data.job_number_id ? "job_numbers" : "projects"),
        entity_id: entity_id ?? data.job_number_id ?? data.project_id,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    if (data.job_number_id) {
      await supabase.from("job_numbers").update({ status: "pending_approval" }).eq("id", data.job_number_id);
    }

    await logActivity(supabase, userId, {
      action: "approval_requested",
      entity_table: "approvals",
      entity_id: created.id,
      entity_label: data.title,
      new_value: data,
    });
    await notifyDepartments(supabase, ["admin"], {
      title: "Approval required",
      message: data.title,
      category: "approval",
      link: "/approvals",
      entity_table: "approvals",
      entity_id: created.id,
    });
    return { ok: true, id: created.id };
  });

/** Management decision. Nothing downstream may proceed until this is approved. */
export const decideApproval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        decision: z.enum(["approved", "rejected", "revision_requested"]),
        decision_notes: z.string().max(4000).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: myRoles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (!(myRoles ?? []).some((r) => r.role === "admin")) {
      throw new Error("Only management can decide approvals.");
    }

    const { data: approval } = await supabase
      .from("approvals")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (!approval) throw new Error("Approval not found");
    if (approval.decision !== "pending") throw new Error("This request has already been decided.");

    const { error } = await supabase
      .from("approvals")
      .update({
        decision: data.decision,
        decision_comments: data.decision_notes,
        rejection_reason: data.decision === "rejected" ? data.decision_notes : "",
        revision_requested: data.decision === "revision_requested",
        approver_id: userId,
        decided_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    // Propagate the decision to the gated record.
    if (approval.job_number_id) {
      await supabase
        .from("job_numbers")
        .update({
          status:
            data.decision === "approved" ? "approved" : data.decision === "rejected" ? "rejected" : "draft",
          approved_by: data.decision === "approved" ? userId : null,
          approved_at: data.decision === "approved" ? new Date().toISOString() : null,
        })
        .eq("id", approval.job_number_id);
    }
    if (approval.project_id && data.decision === "approved") {
      const stageByType: Record<string, string> = {
        project_initiation: "project_initiated",
        bom_bos: "job_number_created",
        job_number: "material_planning",
        final_review: "closed",
      };
      const stage = stageByType[approval.approval_type];
      if (stage) await supabase.from("projects").update({ stage }).eq("id", approval.project_id);
    }

    await logActivity(supabase, userId, {
      action: `approval_${data.decision}`,
      entity_table: "approvals",
      entity_id: data.id,
      entity_label: approval.title,
      previous_value: { decision: approval.decision },
      new_value: { decision: data.decision, notes: data.decision_notes },
    });
    await notifyUsers(supabase, [approval.submitted_by], {
      title: `Approval ${data.decision.replace("_", " ")}`,
      message: approval.title,
      category: "approval",
      link: "/approvals",
      entity_table: "approvals",
      entity_id: data.id,
    });
    return { ok: true };
  });
