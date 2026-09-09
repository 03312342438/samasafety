import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent } from "@/components/ui/card";
import { receivablesSummary } from "@/lib/receivables.functions";
import { CURRENCY, humanize, statusBadgeClass } from "@/lib/workflow";
import { TRIGGER_LABELS } from "@/lib/payment-terms";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

const money = (n: unknown) => `${Number(n ?? 0).toFixed(2)} ${CURRENCY}`;
const COLORS = { invoiced: "#16a34a", paid: "#2563eb", remaining: "#f59e0b" };

function useReceivables() {
  const fetchSummary = useServerFn(receivablesSummary);
  return useQuery({ queryKey: ["receivables"], queryFn: () => fetchSummary() });
}

function Kpi({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-lg font-semibold" style={color ? { color } : undefined}>{value}</p>
      </CardContent>
    </Card>
  );
}

/** Green = invoiced, blue = paid, grey remainder = not yet invoiced. */
function PaymentBar({ row }: { row: any }) {
  const paidPct = Math.min(100, row.percent_paid);
  const invoicedOnlyPct = Math.max(0, Math.min(100 - paidPct, row.percent_invoiced - paidPct));
  const remainingPct = Math.max(0, 100 - paidPct - invoicedOnlyPct);
  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
        <div style={{ width: `${paidPct}%`, background: COLORS.paid }} />
        <div style={{ width: `${invoicedOnlyPct}%`, background: COLORS.invoiced }} />
        <div style={{ width: `${remainingPct}%`, background: COLORS.remaining, opacity: 0.35 }} />
      </div>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span style={{ color: COLORS.invoiced }}>
          Invoiced {row.percent_invoiced}% · {money(row.invoiced)}
        </span>
        <span style={{ color: COLORS.paid }}>Paid {row.percent_paid}% · {money(row.paid)}</span>
        <span style={{ color: COLORS.remaining }}>
          Not yet invoiced {row.percent_remaining}% · {money(row.remaining_to_invoice)}
        </span>
      </div>
    </div>
  );
}

/** Charts + ongoing project payment progress. Used by Accounts and Management. */
export function ReceivablesOverview() {
  const { data } = useReceivables();
  const s = data as any;
  if (!s) return <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>;

  const chart = [
    { name: "Total invoiced", value: s.totals.invoiced, fill: COLORS.invoiced },
    { name: "Remaining to invoice", value: s.totals.remaining_to_invoice, fill: COLORS.remaining },
    { name: "Paid by customers", value: s.totals.paid, fill: COLORS.paid },
  ];
  const hasValues = chart.some((c) => c.value > 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Total project value" value={money(s.totals.value)} />
        <Kpi label="Total invoiced" value={money(s.totals.invoiced)} color={COLORS.invoiced} />
        <Kpi label="Paid by customers" value={money(s.totals.paid)} color={COLORS.paid} />
        <Kpi label="Remaining to invoice" value={money(s.totals.remaining_to_invoice)} color={COLORS.remaining} />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <p className="mb-2 text-sm font-medium">Invoicing split</p>
            {!hasValues ? (
              <p className="text-xs text-muted-foreground">No invoices raised yet.</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chart} dataKey="value" nameKey="name" outerRadius={90}
                      label={(e: any) => `${e.name}: ${money(e.value)}`}>
                      {chart.map((c) => <Cell key={c.name} fill={c.fill} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => money(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="mb-2 text-sm font-medium">Invoiced vs remaining vs paid</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} width={55} />
                  <Tooltip formatter={(v: any) => money(v)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="value" name={CURRENCY} radius={[3, 3, 0, 0]}>
                    {chart.map((c) => <Cell key={c.name} fill={c.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {s.dueTerms.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="mb-2 text-sm font-medium">Milestones ready to invoice</p>
            <div className="space-y-1">
              {s.dueTerms.map((t: any) => (
                <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2 text-xs">
                  <span className="font-medium">
                    {t.project_number} · {t.percent}% — {t.milestone || TRIGGER_LABELS[t.trigger_type]}
                  </span>
                  <span className="text-muted-foreground">{money(t.amount)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4">
          <p className="mb-3 text-sm font-medium">Ongoing projects — payment progress</p>
          {s.ongoing.length === 0 && <p className="text-xs text-muted-foreground">No ongoing projects.</p>}
          <div className="space-y-4">
            {s.ongoing.map((r: any) => (
              <div key={r.id}>
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-medium">
                    {r.project_number} — {r.name}
                    {r.customer ? ` · ${r.customer}` : ""}
                  </span>
                  <span className="text-muted-foreground">
                    value {money(r.value)} · work {r.progress_percent}%
                  </span>
                </div>
                <PaymentBar row={r} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/** Project-by-project receivables with overall totals. */
export function ReceivablesTable() {
  const { data } = useReceivables();
  const s = data as any;
  if (!s) return <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>;

  const rows = s.receivables as any[];
  const totals = rows.reduce(
    (acc, r) => ({
      invoiced: acc.invoiced + r.invoiced,
      paid: acc.paid + r.paid,
      outstanding: acc.outstanding + r.outstanding,
    }),
    { invoiced: 0, paid: 0, outstanding: 0 },
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi label="Invoiced" value={money(totals.invoiced)} color={COLORS.invoiced} />
        <Kpi label="Amount paid" value={money(totals.paid)} color={COLORS.paid} />
        <Kpi label="Remaining to collect" value={money(totals.outstanding)} color={COLORS.remaining} />
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            A project appears here as soon as its first invoice is raised.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {r.project_number} — {r.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {[r.customer, `${r.invoice_count} invoice(s)`].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] ${statusBadgeClass(r.status)}`}>
                    {humanize(r.status)}
                  </span>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-4">
                  <Cell2 label="Project value" value={money(r.value)} />
                  <Cell2 label="Invoice amount" value={money(r.invoiced)} />
                  <Cell2 label="Amount paid" value={money(r.paid)} />
                  <Cell2 label="Remaining amount" value={money(r.outstanding)} />
                </div>

                <div className="mt-3">
                  <PaymentBar row={r} />
                </div>

                {r.terms.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {r.terms.map((t: any) => (
                      <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2 text-[11px]">
                        <span>
                          {t.percent}% — {t.milestone || TRIGGER_LABELS[t.trigger_type]}
                          <span className="ml-1 text-muted-foreground">
                            ({TRIGGER_LABELS[t.trigger_type]}
                            {t.trigger_type === "steps_completed" ? ` · ${t.trigger_steps} steps` : ""})
                          </span>
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="text-muted-foreground">{money(t.amount)}</span>
                          <span className={`rounded-full px-2 py-0.5 ${statusBadgeClass(t.status)}`}>
                            {t.status === "due" ? "Ready to invoice" : humanize(t.status)}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Cell2({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
