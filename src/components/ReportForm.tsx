import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import {
  LEFT_DEVICES,
  RIGHT_DEVICES,
  emptyReport,
  recordToForm,
  type ReportData,
  type ReportRecord,
  type DeviceStatus,
  devicesFor,
  deviceKey,
  type SparePart,
} from "@/lib/report-constants";
import { createReport, updateReport } from "@/lib/reports.functions";
import { listContracts } from "@/lib/maintenance-contracts.functions";
import { listStockItems } from "@/lib/inventory.functions";
import { SearchSelect } from "@/components/SearchSelect";
import { prettyDate } from "@/lib/maintenance-contracts";
import { useQuery } from "@tanstack/react-query";
import { buildSchedule, INTERVAL_UNITS } from "@/lib/maintenance-schedule";
import { emailReport } from "@/lib/email.functions";
import { elementToPdfBase64 } from "@/lib/generate-pdf";
import { ReportDocument } from "@/components/ReportDocument";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SignaturePad } from "@/components/SignaturePad";
import { ReportDownloadButton } from "@/components/ReportDownloadButton";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, CheckCircle2 } from "lucide-react";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      {children}
    </div>
  );
}

// The server expects real UUIDs or nulls for the contract links.
function toPayload(form: ReportData) {
  return {
    ...form,
    job_number_id: form.job_number_id || null,
    customer_id: form.customer_id || null,
    project_id: form.project_id || null,
  };
}

function prettyScheduleDate(s: string) {
  const d = new Date(`${s}T00:00:00`);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function ReportForm({
  defaultPerformedBy,
  onSaved,
  initial,
  onCancel,
}: {
  defaultPerformedBy?: string;
  onSaved?: () => void;
  initial?: ReportRecord;
  onCancel?: () => void;
}) {
  const isEdit = !!initial;
  const [form, setForm] = useState<ReportData>(() =>
    initial
      ? recordToForm(initial)
      : { ...emptyReport(), performed_by: defaultPerformedBy ?? "" },
  );
  const [saving, setSaving] = useState(false);
  const [savedData, setSavedData] = useState<ReportData | null>(null);
  const save = useServerFn(createReport);
  const fetchContracts = useServerFn(listContracts);
  const { data: contracts } = useQuery({
    queryKey: ["maintenance-contracts"],
    queryFn: () => fetchContracts(),
  });
  // A contract number can cover several systems (one contract row per system).
  const [contractNo, setContractNo] = useState("");
  const localToday = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60_000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 10);
  };
  const today = localToday();
  const activeContracts = ((contracts as any[]) ?? []).filter(
    (c) => (!c.end_date || c.end_date >= today) && c.remaining_count > 0,
  );
  const groupKey = (c: any) =>
    c.contract_no ||
    [c.customer_name, c.project_name, c.site_location].join("|").toLowerCase();
  const groups = new Map<string, any[]>();
  for (const c of activeContracts) {
    const k = groupKey(c);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(c);
  }
  const groupContracts = groups.get(contractNo) ?? [];
  const contractId = form.contract_ids[0] ?? "";
  const selectedContracts = groupContracts.filter((c) => form.contract_ids.includes(c.id));

  // Store catalogue, used to pick spare parts instead of typing them.
  const fetchStock = useServerFn(listStockItems);
  const { data: stock } = useQuery({
    queryKey: ["stock-items"],
    queryFn: () => fetchStock(),
  });
  const stockList = (stock as any[]) ?? [];
  const stockOptions: [string, string][] = stockList.map((s) => [
    s.item_code,
    `${s.item_code} — ${s.description}${s.unit ? ` (${s.unit})` : ""}`,
  ]);

  // Picking a contract fills in everything known about the site and schedules
  // the visit on the next maintenance still outstanding.
  const pickContract = (key: string) => {
    setContractNo(key);
    const list = groups.get(key) ?? [];
    const c = list[0];
    if (!c) {
      setForm((f) => ({ ...f, contract_ids: [], system_types: [], system_type: "" }));
      return;
    }
    // Start with every system of the contract ticked; the user can untick.
    setForm((f) => ({
      ...f,
      contract_ids: list.map((x) => x.id),
      system_types: list.map((x) => x.system_type),
      system_type: list.map((x) => x.system_type).join(", "),
      client_name: c.customer_name || f.client_name,
      client_email: c.customer_email || f.client_email,
      project: c.project_name || f.project,
      site_location: c.site_location || f.site_location,
      contract: c.contract_no || f.contract,
      // The contract's due date identifies the visit, but an issued report
      // must show the day the work is actually reported and completed.
      report_date: today,
      date_completed: today,
      maintenance_interval_value: c.interval_months ? String(c.interval_months) : "",
      maintenance_interval_unit: "months",
      maintenance_count: "",
    }));
  };
  const update = useServerFn(updateReport);
  const sendEmail = useServerFn(emailReport);
  const docRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  const set = <K extends keyof ReportData>(k: K, v: ReportData[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const schedulePreview = buildSchedule({
    baseDate: form.date_completed || form.report_date || new Date().toISOString().slice(0, 10),
    intervalValue: parseInt(form.maintenance_interval_value, 10) || 0,
    intervalUnit: form.maintenance_interval_unit || "months",
    count: parseInt(form.maintenance_count, 10) || 0,
  });

  const setDevice = (name: string, status: string) =>
    setForm((f) => ({ ...f, devices: { ...f.devices, [name]: status } }));

  const toggleSystem = (c: any) =>
    setForm((f) => {
      const on = f.contract_ids.includes(c.id);
      const ids = on ? f.contract_ids.filter((x) => x !== c.id) : [...f.contract_ids, c.id];
      const sys = groupContracts.filter((x) => ids.includes(x.id)).map((x) => x.system_type);
      const first = groupContracts.find((x) => x.id === ids[0]);
      return {
        ...f,
        contract_ids: ids,
        system_types: sys,
        system_type: sys.join(", "),
        maintenance_interval_value: first?.interval_months
          ? String(first.interval_months)
          : f.maintenance_interval_value,
      };
    });

  const setSpare = (i: number, k: keyof SparePart, v: string) =>
    setForm((f) => {
      const parts = f.spare_parts.map((p, idx) => (idx === i ? { ...p, [k]: v } : p));
      if (k === "qty" || k === "unit_price") {
        const q = parseFloat(parts[i].qty);
        const u = parseFloat(parts[i].unit_price);
        if (!isNaN(q) && !isNaN(u)) parts[i].total = String(+(q * u).toFixed(2));
      }
      return { ...f, spare_parts: parts };
    });

  // Choosing a store item fills the part number, description and unit price.
  const pickStockItem = (i: number, code: string) =>
    setForm((f) => {
      const item = stockList.find((s) => s.item_code === code);
      const parts = f.spare_parts.map((p, idx) => {
        if (idx !== i) return p;
        const unit_price = item?.unit_cost != null ? String(item.unit_cost) : p.unit_price;
        const q = parseFloat(p.qty);
        const u = parseFloat(unit_price);
        return {
          ...p,
          spare_no: code,
          description: item?.description ?? p.description,
          unit_price,
          total: !isNaN(q) && !isNaN(u) ? String(+(q * u).toFixed(2)) : p.total,
        };
      });
      return { ...f, spare_parts: parts };
    });

  const addSpare = () =>
    setForm((f) => ({
      ...f,
      spare_parts: [...f.spare_parts, { spare_no: "", description: "", qty: "", unit_price: "", total: "" }],
    }));

  const removeSpare = (i: number) =>
    setForm((f) => ({ ...f, spare_parts: f.spare_parts.filter((_, idx) => idx !== i) }));

  // Blocks a second submit while the first one is still running, so a
  // double-click can never file the same report twice.
  const submittingRef = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSaving(true);
    try {
      if (isEdit && initial) {
        await update({ data: { ...toPayload(form), id: initial.id } });
        qc.invalidateQueries({ queryKey: ["my-reports"] });
        qc.invalidateQueries({ queryKey: ["all-reports"] });
        toast.success("Report updated");
        onSaved?.();
      } else {
        const submission = { ...form, report_date: today, date_completed: today };
        const res: any = await save({
          data: { ...toPayload(submission), contract_id: contractId || null } as any,
        });
        const saved = { ...submission, msr_no: res?.msr_no || submission.msr_no };
        setForm(saved);
        await new Promise((r) => setTimeout(r, 80));
        // Generate the PDF while the offscreen document is still rendered.
        let pdfBase64 = "";
        if (docRef.current) {
          try {
            pdfBase64 = await elementToPdfBase64(docRef.current);
          } catch {
            /* ignore PDF errors; the report is still saved */
          }
        }
        setSavedData(saved);
        qc.invalidateQueries({ queryKey: ["my-reports"] });
        qc.invalidateQueries({ queryKey: ["all-reports"] });
        qc.invalidateQueries({ queryKey: ["maintenance-contracts"] });
        toast.success("Report submitted");
        // Empty the sheet so the same report can't be submitted twice.
        setForm({ ...emptyReport(), performed_by: defaultPerformedBy ?? "" });
        setContractNo("");
        onSaved?.();
        // Send even when the PDF could not be produced, so the client and the
        // recipient list still get the report notification.
        void emailToRecipients(saved, pdfBase64);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save report");
    } finally {
      submittingRef.current = false;
      setSaving(false);
    }
  };

  const emailToRecipients = async (data: ReportData, pdfBase64: string) => {
    try {
      const label =
        (data.msr_no || data.client_name || "report")
          .replace(/[^a-z0-9-_ ]/gi, "")
          .trim() || "report";
      const res = await sendEmail({
        data: {
          pdf_base64: pdfBase64,
          file_name: `MSR_${label}.pdf`,
          client_name: data.client_name,
          client_email: data.client_email,
          msr_no: data.msr_no,
          project: data.project,
          performed_by: data.performed_by,
        },
      });
      if (res.sent) {
        toast.success("Report emailed", {
          description: res.to?.length ? `Sent to: ${res.to.join(", ")}` : undefined,
        });
      }
      // Show any address that was rejected, instead of failing silently.
      if (res.failed?.length) {
        toast.error("Some addresses did not receive the report", {
          description: res.failed.join(" | "),
        });
      }
      if (!res.sent && !res.failed?.length) {
        toast.error("The report was not emailed: no recipient address is set.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not email the report");
    }
  };



  if (savedData) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <CheckCircle2 className="h-14 w-14 text-primary" />
          <div>
            <h3 className="text-lg font-semibold">Report submitted successfully</h3>
            <p className="text-sm text-muted-foreground">
              Download the PDF or start a new report.
            </p>
          </div>
          <div className="flex gap-3">
            <ReportDownloadButton data={savedData} fileLabel={savedData.msr_no || savedData.client_name} />
            <Button
              variant="outline"
              onClick={() => {
                setSavedData(null);
                setForm({ ...emptyReport(), performed_by: defaultPerformedBy ?? "" });
              }}
            >
              New Report
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Only the checklists of the selected systems are shown; reports without a
  // system keep the general checklist.
  const checklistSystems = form.system_types.length ? form.system_types : [""];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Report Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Contract number">
              <SearchSelect
                className="h-10"
                value={contractNo}
                onChange={pickContract}
                placeholder="— not linked to a contract —"
                searchPlaceholder="Search contract no., client, project, location…"
                options={[
                  ["", "— not linked to a contract —"],
                  ...[...groups.entries()].map(([k, list]): [string, string] => {
                    const c = list[0];
                    const sys = list.map((x: any) => x.system_type).join(", ");
                    return [
                      k,
                      `${c.contract_no || "—"} · ${c.customer_name} — ${c.project_name} — ${c.site_location} [${sys}]`,
                    ];
                  }),
                ]}
              />
            </Field>
            {groupContracts.length > 0 && (
              <div className="mt-3 space-y-2">
                <Label className="text-sm">System types in this report</Label>
                <div className="flex flex-wrap gap-2">
                  {groupContracts.map((c: any) => {
                    const on = form.contract_ids.includes(c.id);
                    return (
                      <Button
                        key={c.id}
                        type="button"
                        size="sm"
                        variant={on ? "default" : "outline"}
                        onClick={() => toggleSystem(c)}
                      >
                        {on && <CheckCircle2 className="mr-1 h-4 w-4" />}
                        {c.system_type}
                      </Button>
                    );
                  })}
                </div>
                {selectedContracts.map((c: any) => (
                  <p key={c.id} className="text-xs text-muted-foreground">
                    {c.system_type} · every {c.interval_months} month(s) · visit{" "}
                    {c.completed_count + 1} of {c.total_visits} · due{" "}
                    {c.upcoming_visit ? prettyDate(c.upcoming_visit) : "—"}
                  </p>
                ))}
              </div>
            )}
          </div>
          <Field label="Client Name">
            <Input value={form.client_name} onChange={(e) => set("client_name", e.target.value)} />
          </Field>
          <Field label="Client Email">
            <Input
              type="email"
              placeholder="client@example.com"
              value={form.client_email}
              onChange={(e) => set("client_email", e.target.value)}
            />
          </Field>
          <Field label="Contract">
            <Input value={form.contract} onChange={(e) => set("contract", e.target.value)} />
          </Field>
          <Field label="Order No.">
            <Input value={form.order_no} onChange={(e) => set("order_no", e.target.value)} />
          </Field>
          <Field label="Project">
            <Input value={form.project} onChange={(e) => set("project", e.target.value)} />
          </Field>
          <Field label="Site / Location">
            <Input value={form.site_location} onChange={(e) => set("site_location", e.target.value)} />
          </Field>
          <Field label="M.S.R No.">
            <Input
              value={form.msr_no}
              readOnly={!isEdit}
              placeholder="Auto-generated on submit"
              onChange={(e) => set("msr_no", e.target.value)}
            />
          </Field>
          <Field label="Our Ref No.">
            <Input
              value={form.our_ref_no}
              readOnly={!isEdit}
              placeholder="Auto-generated per project"
              onChange={(e) => set("our_ref_no", e.target.value)}
            />
          </Field>
          <Field label="Date">
            <Input type="date" value={form.report_date} onChange={(e) => set("report_date", e.target.value)} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Device Checklist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {checklistSystems.map((sys) => (
            <div key={sys || "general"} className="space-y-2">
              {sys && <h4 className="text-sm font-semibold">{sys}</h4>}
              <div className="grid gap-2 md:grid-cols-2">
                {devicesFor(sys).map((d) => {
                  const k = sys ? deviceKey(sys, d.name) : d.name;
                  const qk = deviceKey(sys, d.name, "qty");
                  return (
                    <div
                      key={k}
                      className="flex items-center justify-between gap-3 rounded-md border p-2.5"
                    >
                      <span className="text-sm font-medium">{d.name}</span>
                      <div className="flex shrink-0 items-center gap-1">
                        {d.kind !== "qty" &&
                          (["ok", "faulty"] as DeviceStatus[]).map((s) => (
                            <Button
                              key={s}
                              type="button"
                              size="sm"
                              variant={form.devices[k] === s ? (s === "ok" ? "default" : "destructive") : "outline"}
                              onClick={() => setDevice(k, s)}
                            >
                              {s === "ok" ? "OK" : "Faulty"}
                            </Button>
                          ))}
                        {d.kind !== "status" && (
                          <Input
                            className="h-8 w-20"
                            inputMode="numeric"
                            placeholder={d.kind === "qty" ? "Qty" : "Def. qty"}
                            value={form.devices[qk] ?? ""}
                            onChange={(e) => setDevice(qk, e.target.value)}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Spare Parts / Consumables</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {form.spare_parts.map((p, i) => (
            <div key={i} className="grid grid-cols-1 gap-2 rounded-md border p-3 sm:grid-cols-12">
              <div className="sm:col-span-6">
                <SearchSelect
                  value={p.spare_no}
                  onChange={(code) => pickStockItem(i, code)}
                  options={stockOptions}
                  placeholder="— select item from store —"
                  searchPlaceholder="Search store items…"
                />
              </div>
              <Input
                className="sm:col-span-6 sm:col-start-1"
                placeholder="Description"
                value={p.description}
                onChange={(e) => setSpare(i, "description", e.target.value)}
              />
              <Input className="sm:col-span-2" placeholder="Qty" value={p.qty} onChange={(e) => setSpare(i, "qty", e.target.value)} />
              <Input className="sm:col-span-2" placeholder="Unit Price" value={p.unit_price} onChange={(e) => setSpare(i, "unit_price", e.target.value)} />
              <div className="flex gap-2 sm:col-span-2">
                <Input placeholder="Total" value={p.total} onChange={(e) => setSpare(i, "total", e.target.value)} />
                <Button type="button" variant="ghost" size="icon" onClick={() => removeSpare(i)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addSpare}>
            <Plus className="mr-1 h-4 w-4" /> Add Row
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Action & Remarks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Action Taken">
            <Textarea rows={4} value={form.action_taken} onChange={(e) => set("action_taken", e.target.value)} />
          </Field>
          <Field label="Remarks">
            <Textarea rows={2} value={form.remarks} onChange={(e) => set("remarks", e.target.value)} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Next Maintenance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Time between maintenances">
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="1"
                  placeholder="e.g. 3"
                  value={form.maintenance_interval_value}
                  readOnly
                  className="bg-muted"
                  onChange={(e) => set("maintenance_interval_value", e.target.value)}
                />
                <select
                  className="h-10 rounded-md border border-input bg-muted px-3 text-sm"
                  disabled
                  value={form.maintenance_interval_unit}
                  onChange={(e) => set("maintenance_interval_unit", e.target.value)}
                >
                  {INTERVAL_UNITS.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </div>
            </Field>
            <Field label="No. of Maintenances">
              <Input
                type="number"
                min="0"
                placeholder="e.g. 4"
                value={form.maintenance_count}
                readOnly
                className="bg-muted"
                onChange={(e) => set("maintenance_count", e.target.value)}
              />
            </Field>
          </div>
          <Field label="Notes (optional)">
            <Input
              placeholder="e.g. Quarterly visits, coordinate with site team"
              value={form.next_maintenance}
              readOnly
              className="bg-muted"
              onChange={(e) => set("next_maintenance", e.target.value)}
            />
          </Field>
          {schedulePreview.length > 0 && (
            <div className="rounded-md bg-muted/50 p-3 text-sm">
              <p className="mb-1 font-medium">Scheduled reminders ({schedulePreview.length}):</p>
              <p className="text-muted-foreground">
                {schedulePreview.map((s) => prettyScheduleDate(s.due_date)).join("  •  ")}
              </p>
            </div>
          )}
        </CardContent>
      </Card>


      <Card>
        <CardHeader>
          <CardTitle>Sign Off</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <Field label="Performed by">
              <Input value={form.performed_by} onChange={(e) => set("performed_by", e.target.value)} />
            </Field>
            <SignaturePad
              label="Employee Signature"
              value={form.employee_signature}
              onChange={(v) => set("employee_signature", v)}
            />
          </div>
          <div className="space-y-4">
            <Field label="Client Name (signatory)">
              <Input value={form.client_sign_name} onChange={(e) => set("client_sign_name", e.target.value)} />
            </Field>
            <Field label="Designation">
              <Input value={form.client_designation} onChange={(e) => set("client_designation", e.target.value)} />
            </Field>
            <Field label="Date Completed">
              <Input type="date" value={form.date_completed} onChange={(e) => set("date_completed", e.target.value)} />
            </Field>
            <SignaturePad
              label="Client Signature"
              value={form.client_signature}
              onChange={(v) => set("client_signature", v)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        {isEdit && onCancel && (
          <Button type="button" variant="outline" size="lg" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        )}
        <Button type="submit" size="lg" disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEdit ? "Save Changes" : "Submit Report"}
        </Button>
      </div>

      {/* Offscreen render target used to generate the PDF for emailing on submit. */}
      <div style={{ position: "fixed", left: -10000, top: 0, pointerEvents: "none" }} aria-hidden>
        <ReportDocument ref={docRef} data={form} />
      </div>
    </form>
  );
}
