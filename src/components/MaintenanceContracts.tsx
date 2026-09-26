import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listContracts,
  saveContract,
  deleteContract,
  deleteAllContracts,
  importContracts,
} from "@/lib/maintenance-contracts.functions";
import {
  downloadContractTemplate,
  parseContractWorkbook,
} from "@/lib/maintenance-contract-template";
import {
  SYSTEM_TYPES,
  SYSTEM_LABELS,
  SYSTEM_INTERVAL,
  defaultEndDate,
  prettyDate,
  type SystemType,
} from "@/lib/maintenance-contracts";
import { FilterTable, type Column } from "@/components/FilterTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Download, RefreshCw, Pencil, Plus, Trash2, Upload } from "lucide-react";

type Row = Record<string, any>;

const emptyForm = () => ({
  id: null as string | null,
  msr_no: "",
  contract_no: "",
  customer_name: "",
  project_name: "",
  site_location: "",
  start_date: "",
  end_date: "",
  system_type: "FF" as SystemType,
  interval_months: SYSTEM_INTERVAL.FF,
  notes: "",
});

const statusClass = (s: string) =>
  s === "Overdue" || s === "Expired"
    ? "bg-destructive/10 text-destructive"
    : s === "Due soon"
      ? "bg-amber-100 text-amber-700"
      : s === "Completed"
        ? "bg-emerald-100 text-emerald-700"
        : "bg-muted text-muted-foreground";

export function MaintenanceContracts() {
  const qc = useQueryClient();
  const fetchContracts = useServerFn(listContracts);
  const save = useServerFn(saveContract);
  const remove = useServerFn(deleteContract);
  const removeAll = useServerFn(deleteAllContracts);
  const [deletingAll, setDeletingAll] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["maintenance-contracts"],
    queryFn: () => fetchContracts(),
  });
  const rows = ((data as Row[]) ?? []) as Row[];

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const bulkImport = useServerFn(importContracts);
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const onDownloadTemplate = async () => {
    try {
      await downloadContractTemplate();
      toast.success("Maintenance contract template downloaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create the template");
    }
  };

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImporting(true);
    try {
      const parsed = await parseContractWorkbook(file);
      if (!parsed.length) {
        toast.error("No contract rows found in that file");
        return;
      }
      const res: any = await bulkImport({ data: { rows: parsed } });
      qc.invalidateQueries({ queryKey: ["maintenance-contracts"] });
      qc.invalidateQueries({ queryKey: ["my-maintenance-tasks"] });
      qc.invalidateQueries({ queryKey: ["all-maintenance-tasks"] });
      toast.success(`${res?.added ?? parsed.length} contract(s) added from the file`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read that file");
    } finally {
      setImporting(false);
    }
  };

  const set = (patch: Partial<ReturnType<typeof emptyForm>>) =>
    setForm((f) => ({ ...f, ...patch }));

  const openNew = () => {
    setForm(emptyForm());
    setRenewOf("");
    setOpen(true);
  };

  const openEdit = (r: Row) => {
    setRenewOf("");
    setForm({
      id: r.id,
      msr_no: r.msr_no ?? "",
      contract_no: r.contract_no ?? "",
      customer_name: r.customer_name ?? "",
      project_name: r.project_name ?? "",
      site_location: r.site_location ?? "",
      start_date: r.start_date ?? "",
      end_date: r.end_date ?? "",
      system_type: (r.system_type ?? "FF") as SystemType,
      interval_months: r.interval_months ?? 6,
      notes: r.notes ?? "",
    });
    setOpen(true);
  };

  // Renewal: a new contract for the next period with the same site details.
  const [renewOf, setRenewOf] = useState<string>("");
  const openRenew = (r: Row) => {
    const start = r.end_date || r.start_date || new Date().toISOString().slice(0, 10);
    setRenewOf(r.contract_no || "");
    setForm({
      ...emptyForm(),
      customer_name: r.customer_name ?? "",
      project_name: r.project_name ?? "",
      site_location: r.site_location ?? "",
      start_date: start,
      end_date: defaultEndDate(start),
      system_type: (r.system_type ?? "FF") as SystemType,
      interval_months: r.interval_months ?? 6,
      notes: r.contract_no ? `Renewal of ${r.contract_no}` : "Renewal",
    });
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await save({ data: form });
      qc.invalidateQueries({ queryKey: ["maintenance-contracts"] });
      qc.invalidateQueries({ queryKey: ["my-maintenance-tasks"] });
      qc.invalidateQueries({ queryKey: ["all-maintenance-tasks"] });
      toast.success(form.id ? "Contract updated" : "Contract added");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save contract");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Remove this contract from the list?")) return;
    try {
      await remove({ data: { id } });
      qc.invalidateQueries({ queryKey: ["maintenance-contracts"] });
      qc.invalidateQueries({ queryKey: ["my-maintenance-tasks"] });
      qc.invalidateQueries({ queryKey: ["all-maintenance-tasks"] });
      toast.success("Contract removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove contract");
    }
  };

  const columns: Column<Row>[] = [
    { key: "contract_no", header: "Contract No.", value: (r) => r.contract_no },
    { key: "customer_name", header: "Customer / Client", value: (r) => r.customer_name },
    { key: "project_name", header: "Project Name", value: (r) => r.project_name },
    { key: "site_location", header: "Site Location", value: (r) => r.site_location },
    {
      key: "start_date",
      header: "Contract Start",
      value: (r) => r.start_date,
      cell: (r) => prettyDate(r.start_date) || "—",
    },
    {
      key: "end_date",
      header: "Contract End",
      value: (r) => r.end_date,
      cell: (r) => prettyDate(r.end_date) || "—",
    },
    { key: "system_type", header: "System", value: (r) => r.system_type },
    {
      key: "interval_months",
      header: "Visit Interval",
      value: (r) => r.interval_months,
      cell: (r) => `${r.interval_months} month(s)`,
    },
    {
      key: "last_visit",
      header: "Last Visit",
      value: (r) => r.last_visit,
      cell: (r) => prettyDate(r.last_visit) || "—",
    },
    {
      key: "upcoming_visit",
      header: "Upcoming Visit",
      value: (r) => r.upcoming_visit,
      cell: (r) => prettyDate(r.upcoming_visit) || "—",
    },
    {
      key: "remaining_count",
      header: "Visits Remaining",
      value: (r) => r.remaining_count,
      cell: (r) => `${r.remaining_count} of ${r.total_visits}`,
    },
    {
      key: "status",
      header: "Status",
      value: (r) => r.status,
      cell: (r) => (
        <span className={`rounded px-2 py-0.5 text-xs font-medium ${statusClass(r.status)}`}>
          {r.status}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-sm text-muted-foreground">
          Maintenance contracts are added manually. Visits, due dates and status update
          automatically from the reports filed against each contract.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={onUpload}
          />
          <Button type="button" variant="outline" onClick={onDownloadTemplate}>
            <Download className="mr-1 h-4 w-4" /> Template
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={importing}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="mr-1 h-4 w-4" />
            {importing ? "Uploading…" : "Upload Excel"}
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew}>
                <Plus className="mr-1 h-4 w-4" /> Add contract
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{form.id
                    ? "Edit contract"
                    : renewOf
                      ? `Renew contract ${renewOf}`
                      : "New maintenance contract"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Contract No.</Label>
                  <Input
                    value={form.contract_no}
                    placeholder="Leave blank to auto-generate"
                    onChange={(e) => set({ contract_no: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Customer / Client name</Label>
                  <Input
                    value={form.customer_name}
                    onChange={(e) => set({ customer_name: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Project name</Label>
                  <Input
                    value={form.project_name}
                    onChange={(e) => set({ project_name: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Site location</Label>
                  <Input
                    value={form.site_location}
                    onChange={(e) => set({ site_location: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Contract start date</Label>
                  <Input
                    type="date"
                    value={form.start_date}
                    onChange={(e) =>
                      set({ start_date: e.target.value, end_date: defaultEndDate(e.target.value) })
                    }
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Contract end date</Label>
                  <Input
                    type="date"
                    value={form.end_date}
                    onChange={(e) => set({ end_date: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Filled automatically one year after the start date.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label>System</Label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={form.system_type}
                    onChange={(e) => {
                      const t = e.target.value as SystemType;
                      set({ system_type: t, interval_months: SYSTEM_INTERVAL[t] });
                    }}
                  >
                    {SYSTEM_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {SYSTEM_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Visit interval (months)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.interval_months}
                    onChange={(e) => set({ interval_months: Number(e.target.value) || 1 })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Set automatically from the system type.
                  </p>
                </div>
                <DialogFooter className="sm:col-span-2">
                  <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? "Saving…" : form.id ? "Save changes" : "Add contract"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Loading maintenance contracts…
          </CardContent>
        </Card>
      ) : (
        <FilterTable
          columns={columns}
          rows={rows}
          empty="No maintenance contracts yet. Use “Add contract” to build the list."
          actions={(r) => (
            <div className="flex justify-end gap-1">
              <Button
                size="sm"
                variant="outline"
                title="Renew contract for the next period"
                onClick={() => openRenew(r)}
              >
                <RefreshCw className="mr-1 h-4 w-4" /> Renew
              </Button>
              <Button size="icon" variant="ghost" onClick={() => openEdit(r)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => onDelete(r.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        />
      )}
    </div>
  );
}
