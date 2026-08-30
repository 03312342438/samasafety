import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const num = (v: unknown) => Number(v ?? 0) || 0;

function monthKey(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function lastTwelveMonths() {
  const out: { key: string; label: string }[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    out.push({
      key: monthKey(d),
      label: d.toLocaleString("en", { month: "short", year: "2-digit", timeZone: "UTC" }),
    });
  }
  return out;
}

const SENT_STAGES = [
  "quotation_sent",
  "follow_up",
  "negotiation",
  "customer_accepted",
  "po_received",
  "po_verification",
];

/**
 * Sales-desk analytics: quotations sent vs customer POs received, by count and
 * by value, for the last 30 days and the last 12 months, plus the value of
 * quotations still waiting for a PO (potential business).
 */
export const getSalesAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ potentialMonths: z.number().int().min(1).max(36).default(6) }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const [qRes, pRes] = await Promise.all([
      supabase.from("quotations").select("id, reference, title, stage, total_amount, created_at, sent_at"),
      supabase.from("customer_pos").select("id, quotation_id, po_value, po_date, created_at"),
    ]);
    if (qRes.error) throw new Error(qRes.error.message);
    if (pRes.error) throw new Error(pRes.error.message);

    const quotations = qRes.data ?? [];
    const pos = pRes.data ?? [];

    const sent = quotations.filter((q: any) => SENT_STAGES.includes(q.stage));
    const sentDate = (q: any) => new Date(q.sent_at ?? q.created_at);
    const poDate = (p: any) => new Date(p.po_date ?? p.created_at);

    const now = Date.now();
    const since30 = now - 30 * 24 * 60 * 60 * 1000;

    const sent30 = sent.filter((q: any) => sentDate(q).getTime() >= since30);
    const po30 = pos.filter((p: any) => poDate(p).getTime() >= since30);

    const last30Counts = [
      { name: "Quotations sent", value: sent30.length },
      { name: "POs received", value: po30.length },
    ];
    const last30Values = [
      { name: "Quotations sent", value: sent30.reduce((a: number, q: any) => a + num(q.total_amount), 0) },
      { name: "POs received", value: po30.reduce((a: number, p: any) => a + num(p.po_value), 0) },
    ];

    const monthly = lastTwelveMonths().map(({ key, label }) => {
      const qs = sent.filter((q: any) => monthKey(sentDate(q)) === key);
      const ps = pos.filter((p: any) => monthKey(poDate(p)) === key);
      return {
        month: label,
        quotations: qs.length,
        pos: ps.length,
        quotedValue: qs.reduce((a: number, q: any) => a + num(q.total_amount), 0),
        poValue: ps.reduce((a: number, p: any) => a + num(p.po_value), 0),
      };
    });

    // ---- potential business ------------------------------------------------
    const withPo = new Set(pos.map((p: any) => p.quotation_id).filter(Boolean));
    const cutoff = new Date();
    cutoff.setUTCMonth(cutoff.getUTCMonth() - data.potentialMonths);
    const openQuotes = sent.filter(
      (q: any) => !withPo.has(q.id) && sentDate(q).getTime() >= cutoff.getTime(),
    );

    return {
      last30Counts,
      last30Values,
      monthly,
      potential: {
        months: data.potentialMonths,
        count: openQuotes.length,
        value: openQuotes.reduce((a: number, q: any) => a + num(q.total_amount), 0),
        items: openQuotes
          .sort((a: any, b: any) => sentDate(b).getTime() - sentDate(a).getTime())
          .slice(0, 10)
          .map((q: any) => ({
            id: q.id,
            reference: q.reference,
            title: q.title,
            value: num(q.total_amount),
            sent_on: (q.sent_at ?? q.created_at ?? "").slice(0, 10),
          })),
      },
    };
  });
