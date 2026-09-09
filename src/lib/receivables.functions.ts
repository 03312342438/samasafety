import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CURRENCY } from "@/lib/workflow";

const num = (v: unknown) => Number(v ?? 0) || 0;
const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Receivables, project by project: what the project is worth, what has been
 * invoiced against it, what the customer has paid and what is still open.
 * Everything is derived from projects, invoices, payments and payment terms.
 */
export const receivablesSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const [projectsRes, invoicesRes, quotationsRes, bomsRes, posRes, termsRes] = await Promise.all([
      supabase
        .from("projects")
        .select("id, project_number, name, status, stage, currency, contract_value, progress_percent, customer_id, customers(name)")
        .limit(500),
      supabase
        .from("invoices")
        .select("id, project_id, reference, invoice_number, total_amount, amount_paid, status, stage, invoice_date")
        .limit(1000),
      supabase.from("quotations").select("id, bom_id, total_amount"),
      supabase.from("boms").select("id, project_id"),
      supabase.from("customer_pos").select("quotation_id, project_id"),
      supabase.from("project_payment_terms").select("*").order("sequence"),
    ]);

    const projects = (projectsRes.data ?? []) as any[];
    const invoices = (invoicesRes.data ?? []) as any[];
    const terms = (termsRes.data ?? []) as any[];

    // Contract value falls back to the quotation raised against the project.
    const bomProject = new Map(((bomsRes.data ?? []) as any[]).map((b) => [b.id, b.project_id]));
    const poProject = new Map(
      ((posRes.data ?? []) as any[]).filter((p) => p.quotation_id).map((p) => [p.quotation_id, p.project_id]),
    );
    const quoted = new Map<string, number>();
    for (const q of (quotationsRes.data ?? []) as any[]) {
      const pid = poProject.get(q.id) ?? (q.bom_id ? bomProject.get(q.bom_id) : null);
      if (!pid) continue;
      quoted.set(pid, round2((quoted.get(pid) ?? 0) + num(q.total_amount)));
    }

    const byProject = new Map<string, { invoiced: number; paid: number; count: number }>();
    invoices.forEach((i) => {
      if (!i.project_id) return;
      const cur = byProject.get(i.project_id) ?? { invoiced: 0, paid: 0, count: 0 };
      cur.invoiced = round2(cur.invoiced + num(i.total_amount));
      cur.paid = round2(cur.paid + num(i.amount_paid));
      cur.count += 1;
      byProject.set(i.project_id, cur);
    });

    const termsByProject = new Map<string, any[]>();
    terms.forEach((t) => {
      const list = termsByProject.get(t.project_id) ?? [];
      list.push(t);
      termsByProject.set(t.project_id, list);
    });

    const rows = projects
      .map((p) => {
        const agg = byProject.get(p.id) ?? { invoiced: 0, paid: 0, count: 0 };
        const value = round2(Math.max(num(p.contract_value), quoted.get(p.id) ?? 0, agg.invoiced));
        const remainingToInvoice = round2(Math.max(0, value - agg.invoiced));
        const outstanding = round2(Math.max(0, agg.invoiced - agg.paid));
        const pct = (n: number) => (value > 0 ? Math.min(100, round2((n / value) * 100)) : 0);
        return {
          id: p.id,
          project_number: p.project_number,
          name: p.name,
          customer: p.customers?.name ?? "",
          status: p.status,
          stage: p.stage,
          currency: p.currency || CURRENCY,
          progress_percent: Number(p.progress_percent ?? 0),
          value,
          invoiced: agg.invoiced,
          paid: agg.paid,
          outstanding,
          remaining_to_invoice: remainingToInvoice,
          invoice_count: agg.count,
          percent_invoiced: pct(agg.invoiced),
          percent_paid: pct(agg.paid),
          percent_remaining: pct(remainingToInvoice),
          terms: (termsByProject.get(p.id) ?? []).map((t) => ({
            id: t.id,
            sequence: t.sequence,
            percent: num(t.percent),
            milestone: t.milestone,
            trigger_type: t.trigger_type,
            trigger_steps: Number(t.trigger_steps ?? 0),
            status: t.status,
            amount: round2((value * num(t.percent)) / 100),
          })),
        };
      })
      .sort((a, b) => b.outstanding - a.outstanding);

    const receivables = rows.filter((r) => r.invoice_count > 0);
    const ongoing = rows.filter((r) => r.status !== "closed");

    const totals = {
      value: round2(rows.reduce((s, r) => s + r.value, 0)),
      invoiced: round2(rows.reduce((s, r) => s + r.invoiced, 0)),
      paid: round2(rows.reduce((s, r) => s + r.paid, 0)),
      outstanding: round2(rows.reduce((s, r) => s + r.outstanding, 0)),
      remaining_to_invoice: round2(rows.reduce((s, r) => s + r.remaining_to_invoice, 0)),
    };

    const dueTerms = rows.flatMap((r) =>
      r.terms
        .filter((t) => t.status === "due")
        .map((t) => ({ ...t, project_number: r.project_number, project_name: r.name, currency: r.currency })),
    );

    return { currency: CURRENCY, totals, receivables, ongoing, dueTerms };
  });
