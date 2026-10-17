import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { calloutQuotationState, hasCalloutParts } from "@/lib/callout-workflow";

const calloutSchema = z.object({
  id: z.string().uuid().optional(),
  client_name: z.string().max(300).default(""),
  client_email: z.string().max(300).default(""),
  contact_person: z.string().max(300).default(""),
  contact_phone: z.string().max(100).default(""),
  project: z.string().max(300).default(""),
  site_location: z.string().max(300).default(""),
  system_type: z.string().max(50).default(""),
  call_received_at: z.string().max(40),
  reported_problem: z.string().max(5000).default(""),
  priority: z.enum(["low", "normal", "urgent"]).default("normal"),
  arrival_at: z.string().max(40).nullable().optional(),
  findings: z.string().max(5000).default(""),
  action_taken: z.string().max(5000).default(""),
  follow_up_notes: z.string().max(5000).default(""),
  performed_by: z.string().max(300).default(""),
  client_sign_name: z.string().max(300).default(""),
  technician_sign_name: z.string().max(300).default(""),
  technician_sign_date: z.string().max(40).nullable().optional(),
  client_sign_date: z.string().max(40).nullable().optional(),
  technician_signature: z.string().max(500000).default(""),
  client_signature: z.string().max(500000).default(""),
  status: z.enum(["pending", "follow_up", "closed"]),
  spare_parts: z.array(z.object({ spare_no: z.string().max(300), description: z.string().max(500), qty: z.string().max(40), unit_price: z.string().max(40), total: z.string().max(40) })).max(30).default([]),
  spare_parts_quotation_id: z.string().uuid().nullable().optional(),
  finalize_spare_parts: z.boolean().default(false),
});
export type CalloutInput = z.infer<typeof calloutSchema>;

export const listApprovedCalloutQuotations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("quotations")
      .select("id, reference, title, site_location, customers(name), projects(name)")
      .in("status", ["approved", "accepted", "won"]).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listCallouts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any)
      .from("callout_reports")
      .select("*")
      .order("call_received_at", { ascending: false })
      .limit(1000);
    if (error) throw new Error(error.message);
    return (data ?? []) as any[];
  });

export const saveCallout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => calloutSchema.parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { id, finalize_spare_parts, ...row } = data;
    const previousResult = id ? await sb.from("callout_reports").select("*").eq("id", id).single() : null;
    if (previousResult?.error) throw new Error(previousResult.error.message);
    const previous = previousResult?.data;
    const quotationId = row.spare_parts_quotation_id || previous?.spare_parts_quotation_id || null;
    const quoteResult = quotationId ? await context.supabase.from("quotations").select("id, reference, status").eq("id", quotationId).single() : null;
    if (quoteResult?.error) throw new Error(quoteResult.error.message);
    const quotationStatus = calloutQuotationState({
      hasParts: hasCalloutParts(row.spare_parts), previous: previous?.spare_parts_quotation_status,
      finalize: finalize_spare_parts, quotationApproved: ["approved", "accepted", "won"].includes(quoteResult?.data?.status ?? ""), hasSavedReport: Boolean(id),
    });
    const status = quotationStatus === "requested" ? "follow_up" : row.status;
    const payload: any = {
      ...row,
      spare_parts: row.spare_parts.filter((p) => p.spare_no.trim() || p.description.trim()).map((p) => ({ ...p, total: String(Number((Number(p.qty || 0) * Number(p.unit_price || 0)).toFixed(2))) })),
      spare_parts_quotation_status: quotationStatus,
      spare_parts_quotation_id: quotationStatus === "approved" ? quotationId : null,
      spare_parts_quotation_reference: quotationStatus === "approved" ? quoteResult?.data?.reference ?? "" : "",
      status,
      arrival_at: row.arrival_at || null,
      technician_sign_date: row.technician_sign_date || null,
      client_sign_date: row.client_sign_date || null,
      date_completed: status === "closed" ? new Date().toISOString().slice(0, 10) : null,
    };
    if (id) {
      const { data: updated, error } = await sb.from("callout_reports").update(payload).eq("id", id).select("*").single();
      if (error) throw new Error(error.message);
      return updated;
    }
    const { data: last } = await sb.from("callout_reports").select("reference");
    const max = Math.max(
      0,
      ...((last ?? []) as any[]).map((r) => Number(String(r.reference).replace(/\D/g, "")) || 0),
    );
    const reference = `CO-${String(max + 1).padStart(4, "0")}`;
    const { data: ins, error } = await sb
      .from("callout_reports")
      .insert({ ...payload, reference, created_by: context.userId })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return ins;
  });
