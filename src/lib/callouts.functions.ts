import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
  status: z.enum(["pending", "follow_up", "closed"]),
});
export type CalloutInput = z.infer<typeof calloutSchema>;

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
    const { id, ...row } = data;
    const payload: any = {
      ...row,
      arrival_at: row.arrival_at || null,
      date_completed: row.status === "closed" ? new Date().toISOString().slice(0, 10) : null,
    };
    if (id) {
      const { error } = await sb.from("callout_reports").update(payload).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
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
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: ins.id, reference };
  });
