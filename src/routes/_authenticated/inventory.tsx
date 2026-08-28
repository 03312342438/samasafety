import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Boxes, Plus, Pencil, Trash2, PackageCheck, Truck, ArrowDownUp, ShieldAlert } from "lucide-react";
import { useProfile } from "@/hooks/use-profile";
import { AppHeader } from "@/components/AppHeader";
import { SearchInput } from "@/components/SearchInput";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { listProjects, listJobNumbers } from "@/lib/projects.functions";
import { listBoms } from "@/lib/engineering.functions";
import { submitApproval } from "@/lib/approvals.functions";
import {
  listStockItems, saveStockItem, deleteStockItem,
  listMaterialRequests, saveMaterialRequest, deleteMaterialRequest,
  allocateMaterialRequest, issueMaterialRequest,
  listStockMovements, recordStockMovement,
} from "@/lib/inventory.functions";
import { humanize, statusBadgeClass } from "@/lib/workflow";

export const Route = createFileRoute("/_authenticated/inventory")({
  component: InventoryPage,
  head: () => ({
    meta: [
      { title: "Store & Material Control | SAMA Fire & Safety" },
      { name: "description", content: "Track stock on hand, allocate and issue material against job numbers, and record every store receipt, return and adjustment." },
      { property: "og:title", content: "Store & Material Control | SAMA Fire & Safety" },
      { property: "og:description", content: "Track stock on hand, allocate and issue material against job numbers, and record every store receipt, return and adjustment." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type LineRow = {
  stock_item_id: string; description: string; unit: string;
  quantity_requested: string; unit_cost: string; remarks: string;
};

const emptyLine: LineRow = { stock_item_id: "", description: "", unit: "pcs", quantity_requested: "1", unit_cost: "0", remarks: "" };

const emptyStock = {
  item_code: "", description: "", category: "", unit: "pcs",
  quantity_on_hand: "0", reorder_level: "0", unit_cost: "0",
  store_location: "", supplier: "", status: "active", notes: "",
};

const emptyRequest = {
  project_id: "", job_number_id: "", bom_id: "", title: "",
  required_date: "", site_location: "", notes: "",
};

const emptyMovement = {
  stock_item_id: "", movement_type: "receipt", quantity: "1", unit_cost: "0",
  project_id: "", job_number_id: "", reference: "", remarks: "",
};

function InventoryPage() {
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const [tab, setTab] = useState("stock");
  const [query, setQuery] = useState("");

  const fetchStock = useServerFn(listStockItems);
  const fetchRequests = useServerFn(listMaterialRequests);
  const fetchMovements = useServerFn(listStockMovements);
  const fetchProjects = useServerFn(listProjects);
  const fetchJobs = useServerFn(listJobNumbers);
  const fetchBoms = useServerFn(listBoms);
  const persistStock = useServerFn(saveStockItem);
  const removeStock = useServerFn(deleteStockItem);
  const persistRequest = useServerFn(saveMaterialRequest);
  const removeRequest = useServerFn(deleteMaterialRequest);
  const allocate = useServerFn(allocateMaterialRequest);
  const issue = useServerFn(issueMaterialRequest);
  const move = useServerFn(recordStockMovement);
  const requestApproval = useServerFn(submitApproval);

  const { data: stock } = useQuery({ queryKey: ["stock-items"], queryFn: () => fetchStock() });
  const { data: requests } = useQuery({ queryKey: ["material-requests"], queryFn: () => fetchRequests() });
  const { data: movements } = useQuery({ queryKey: ["stock-movements"], queryFn: () => fetchMovements() });
  const { data: projects } = useQuery({ queryKey: ["projects"], queryFn: () => fetchProjects() });
  const { data: jobs } = useQuery({ queryKey: ["job-numbers"], queryFn: () => fetchJobs() });
  const { data: boms } = useQuery({ queryKey: ["boms"], queryFn: () => fetchBoms() });

  const [stockOpen, setStockOpen] = useState(false);
  const [stockForm, setStockForm] = useState<any>(emptyStock);
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestForm, setRequestForm] = useState<any>(emptyRequest);
  const [lines, setLines] = useState<LineRow[]>([{ ...emptyLine }]);
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveForm, setMoveForm] = useState<any>(emptyMovement);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["stock-items"] });
    qc.invalidateQueries({ queryKey: ["material-requests"] });
    qc.invalidateQueries({ queryKey: ["stock-movements"] });
    qc.invalidateQueries({ queryKey: ["approvals"] });
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };

  const stockOptions = useMemo(
    () =>
      [["", "— free text —"] as [string, string]].concat(
        ((stock as any[]) ?? []).map((s) => [s.id, `${s.item_code} — ${s.description}`] as [string, string]),
      ),
    [stock],
  );

  const filter = (rows: any[], keys: (r: any) => (string | undefined)[]) => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => keys(r).filter(Boolean).join(" ").toLowerCase().includes(q));
  };

  const stockList = filter((stock as any[]) ?? [], (s) => [s.item_code, s.description, s.category, s.store_location]);
  const requestList = filter((requests as any[]) ?? [], (r) => [r.reference, r.title, r.projects?.project_number, r.job_numbers?.job_number]);
  const movementList = filter((movements as any[]) ?? [], (m) => [m.reference, m.description, m.movement_type]);

  const lowStock = ((stock as any[]) ?? []).filter(
    (s) => Number(s.quantity_on_hand ?? 0) <= Number(s.reorder_level ?? 0),
  );

  const submitStock = async () => {
    try {
      await persistStock({
        data: {
          ...stockForm,
          id: stockForm.id || undefined,
          quantity_on_hand: Number(stockForm.quantity_on_hand || 0),
          reorder_level: Number(stockForm.reorder_level || 0),
          unit_cost: Number(stockForm.unit_cost || 0),
        },
      });
      toast.success(stockForm.id ? "Item updated" : "Item added to store");
      setStockOpen(false);
      setStockForm(emptyStock);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save item");
    }
  };

  const submitRequest = async () => {
    try {
      const res: any = await persistRequest({
        data: {
          ...requestForm,
          id: requestForm.id || undefined,
          project_id: requestForm.project_id || null,
          job_number_id: requestForm.job_number_id || null,
          bom_id: requestForm.bom_id || null,
          required_date: requestForm.required_date || null,
          items: lines
            .filter((l) => l.description.trim() || l.stock_item_id)
            .map((l) => {
              const picked = ((stock as any[]) ?? []).find((s) => s.id === l.stock_item_id);
              return {
                stock_item_id: l.stock_item_id || null,
                description: l.description || picked?.description || "",
                unit: l.unit || picked?.unit || "pcs",
                quantity_requested: Number(l.quantity_requested || 0),
                unit_cost: Number(l.unit_cost || picked?.unit_cost || 0),
                remarks: l.remarks,
              };
            }),
        },
      });
      toast.success(requestForm.id ? "Request updated" : `Request ${res?.reference ?? ""} created`);
      setRequestOpen(false);
      setRequestForm(emptyRequest);
      setLines([{ ...emptyLine }]);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save request");
    }
  };

  const editRequest = (r: any) => {
    setRequestForm({
      ...emptyRequest, ...r,
      project_id: r.project_id ?? "", job_number_id: r.job_number_id ?? "", bom_id: r.bom_id ?? "",
      required_date: r.required_date ?? "",
    });
    const rows = [...(r.material_request_items ?? [])].sort((a: any, c: any) => a.sequence - c.sequence);
    setLines(
      rows.length
        ? rows.map((l: any) => ({
            stock_item_id: l.stock_item_id ?? "", description: l.description ?? "", unit: l.unit ?? "pcs",
            quantity_requested: String(l.quantity_requested ?? 0), unit_cost: String(l.unit_cost ?? 0),
            remarks: l.remarks ?? "",
          }))
        : [{ ...emptyLine }],
    );
    setRequestOpen(true);
  };

  const submitMovement = async () => {
    try {
      await move({
        data: {
          ...moveForm,
          quantity: Number(moveForm.quantity || 0),
          unit_cost: Number(moveForm.unit_cost || 0),
          project_id: moveForm.project_id || null,
          job_number_id: moveForm.job_number_id || null,
        },
      });
      toast.success("Stock movement recorded");
      setMoveOpen(false);
      setMoveForm(emptyMovement);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not record movement");
    }
  };

  const requestExtra = async (r: any) => {
    try {
      const amount = (r.material_request_items ?? []).reduce(
        (s: number, l: any) => s + Number(l.quantity_requested ?? 0) * Number(l.unit_cost ?? 0),
        0,
      );
      await requestApproval({
        data: {
          approval_type: "additional_material",
          title: `A5 — Additional material ${r.reference}`,
          details: `${r.title} · shortage / extra material requested`,
          project_id: r.project_id ?? null,
          job_number_id: r.job_number_id ?? null,
          entity_table: "material_requests",
          entity_id: r.id,
          amount,
        },
      });
      toast.success("Sent for A5 approval");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not request approval");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader isAdmin={profile?.isAdmin} name={profile?.profile?.full_name} roles={profile?.roles} />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Store & Material Control</h1>
            <p className="text-sm text-muted-foreground">
              Stock is reserved against an approved job, issued to site with a signature trail, and
              every receipt, return and adjustment stays on record.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <SearchInput value={query} onChange={setQuery} placeholder="Search…" />
            {tab === "stock" && (
              <Dialog open={stockOpen} onOpenChange={(o) => { setStockOpen(o); if (!o) setStockForm(emptyStock); }}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="mr-1 h-4 w-4" /> New item</Button>
                </DialogTrigger>
                <DialogContent className="max-h-[85vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>{stockForm.id ? "Edit stock item" : "New stock item"}</DialogTitle></DialogHeader>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Item code (auto if blank)" value={stockForm.item_code} onChange={(v) => setStockForm({ ...stockForm, item_code: v })} />
                    <Field label="Description" value={stockForm.description} onChange={(v) => setStockForm({ ...stockForm, description: v })} />
                    <Field label="Category" value={stockForm.category} onChange={(v) => setStockForm({ ...stockForm, category: v })} />
                    <Field label="Unit" value={stockForm.unit} onChange={(v) => setStockForm({ ...stockForm, unit: v })} />
                    <Field label="Quantity on hand" value={stockForm.quantity_on_hand} onChange={(v) => setStockForm({ ...stockForm, quantity_on_hand: v })} />
                    <Field label="Reorder level" value={stockForm.reorder_level} onChange={(v) => setStockForm({ ...stockForm, reorder_level: v })} />
                    <Field label="Unit cost" value={stockForm.unit_cost} onChange={(v) => setStockForm({ ...stockForm, unit_cost: v })} />
                    <Field label="Store location" value={stockForm.store_location} onChange={(v) => setStockForm({ ...stockForm, store_location: v })} />
                    <Field label="Supplier" value={stockForm.supplier} onChange={(v) => setStockForm({ ...stockForm, supplier: v })} />
                    <Select label="Status" value={stockForm.status} onChange={(v) => setStockForm({ ...stockForm, status: v })}
                      options={[["active", "Active"], ["inactive", "Inactive"]]} />
                    <div className="sm:col-span-2">
                      <Label className="text-xs">Notes</Label>
                      <Textarea rows={2} value={stockForm.notes} onChange={(e) => setStockForm({ ...stockForm, notes: e.target.value })} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={submitStock} disabled={!stockForm.description.trim()}>Save</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
            {tab === "requests" && (
              <Dialog open={requestOpen} onOpenChange={(o) => { setRequestOpen(o); if (!o) { setRequestForm(emptyRequest); setLines([{ ...emptyLine }]); } }}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="mr-1 h-4 w-4" /> New request</Button>
                </DialogTrigger>
                <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
                  <DialogHeader><DialogTitle>{requestForm.id ? "Edit material request" : "New material request"}</DialogTitle></DialogHeader>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Title" value={requestForm.title} onChange={(v) => setRequestForm({ ...requestForm, title: v })} />
                    <Field label="Required date" type="date" value={requestForm.required_date} onChange={(v) => setRequestForm({ ...requestForm, required_date: v })} />
                    <Select label="Project" value={requestForm.project_id} onChange={(v) => setRequestForm({ ...requestForm, project_id: v })}
                      options={[["", "— none —"], ...((projects as any[]) ?? []).map((p) => [p.id, `${p.project_number} — ${p.name}`] as [string, string])]} />
                    <Select label="Job number" value={requestForm.job_number_id} onChange={(v) => setRequestForm({ ...requestForm, job_number_id: v })}
                      options={[["", "— none —"], ...((jobs as any[]) ?? []).map((j) => [j.id, j.job_number] as [string, string])]} />
                    <Select label="Source BOM / BOS" value={requestForm.bom_id} onChange={(v) => setRequestForm({ ...requestForm, bom_id: v })}
                      options={[["", "— none —"], ...((boms as any[]) ?? []).map((b) => [b.id, `${b.reference} — ${b.title}`] as [string, string])]} />
                    <Field label="Site location" value={requestForm.site_location} onChange={(v) => setRequestForm({ ...requestForm, site_location: v })} />
                    <div className="sm:col-span-2">
                      <Label className="text-xs">Notes</Label>
                      <Textarea rows={2} value={requestForm.notes} onChange={(e) => setRequestForm({ ...requestForm, notes: e.target.value })} />
                    </div>
                  </div>

                  <div className="mt-2">
                    <div className="mb-2 flex items-center justify-between">
                      <Label className="text-xs">Requested material</Label>
                      <Button variant="outline" size="sm" onClick={() => setLines([...lines, { ...emptyLine }])}>
                        <Plus className="mr-1 h-3.5 w-3.5" /> Add line
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {lines.map((l, idx) => (
                        <div key={idx} className="grid gap-2 rounded-md border p-2 sm:grid-cols-12">
                          <select
                            className="h-9 rounded-md border bg-background px-2 text-sm sm:col-span-4"
                            value={l.stock_item_id}
                            onChange={(e) => {
                              const picked = ((stock as any[]) ?? []).find((s) => s.id === e.target.value);
                              setLines(lines.map((r, i) => (i === idx
                                ? { ...r, stock_item_id: e.target.value, description: picked?.description ?? r.description, unit: picked?.unit ?? r.unit, unit_cost: String(picked?.unit_cost ?? r.unit_cost) }
                                : r)));
                            }}
                          >
                            {stockOptions.map(([v, lb]) => <option key={v} value={v}>{lb}</option>)}
                          </select>
                          <Input className="sm:col-span-3" placeholder="Description" value={l.description}
                            onChange={(e) => setLines(lines.map((r, i) => (i === idx ? { ...r, description: e.target.value } : r)))} />
                          <Input className="sm:col-span-1" placeholder="Unit" value={l.unit}
                            onChange={(e) => setLines(lines.map((r, i) => (i === idx ? { ...r, unit: e.target.value } : r)))} />
                          <Input className="sm:col-span-2" placeholder="Qty" value={l.quantity_requested}
                            onChange={(e) => setLines(lines.map((r, i) => (i === idx ? { ...r, quantity_requested: e.target.value } : r)))} />
                          <Input className="sm:col-span-1" placeholder="Cost" value={l.unit_cost}
                            onChange={(e) => setLines(lines.map((r, i) => (i === idx ? { ...r, unit_cost: e.target.value } : r)))} />
                          <Button variant="ghost" size="sm" className="sm:col-span-1"
                            onClick={() => setLines(lines.length > 1 ? lines.filter((_, i) => i !== idx) : lines)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <DialogFooter>
                    <Button onClick={submitRequest} disabled={!requestForm.title.trim()}>Save</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
            {tab === "movements" && (
              <Dialog open={moveOpen} onOpenChange={(o) => { setMoveOpen(o); if (!o) setMoveForm(emptyMovement); }}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="mr-1 h-4 w-4" /> Record movement</Button>
                </DialogTrigger>
                <DialogContent className="max-h-[85vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>Record stock movement</DialogTitle></DialogHeader>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Select label="Stock item" value={moveForm.stock_item_id} onChange={(v) => setMoveForm({ ...moveForm, stock_item_id: v })}
                      options={((stock as any[]) ?? []).map((s) => [s.id, `${s.item_code} — ${s.description}`] as [string, string])} />
                    <Select label="Type" value={moveForm.movement_type} onChange={(v) => setMoveForm({ ...moveForm, movement_type: v })}
                      options={[["receipt", "Receipt (in)"], ["return", "Site return (in)"], ["adjustment", "Adjustment (in)"], ["issue", "Manual issue (out)"]]} />
                    <Field label="Quantity" value={moveForm.quantity} onChange={(v) => setMoveForm({ ...moveForm, quantity: v })} />
                    <Field label="Unit cost" value={moveForm.unit_cost} onChange={(v) => setMoveForm({ ...moveForm, unit_cost: v })} />
                    <Select label="Project" value={moveForm.project_id} onChange={(v) => setMoveForm({ ...moveForm, project_id: v })}
                      options={[["", "— none —"], ...((projects as any[]) ?? []).map((p) => [p.id, p.project_number] as [string, string])]} />
                    <Select label="Job number" value={moveForm.job_number_id} onChange={(v) => setMoveForm({ ...moveForm, job_number_id: v })}
                      options={[["", "— none —"], ...((jobs as any[]) ?? []).map((j) => [j.id, j.job_number] as [string, string])]} />
                    <Field label="Reference (DN / invoice)" value={moveForm.reference} onChange={(v) => setMoveForm({ ...moveForm, reference: v })} />
                    <div className="sm:col-span-2">
                      <Label className="text-xs">Remarks</Label>
                      <Textarea rows={2} value={moveForm.remarks} onChange={(e) => setMoveForm({ ...moveForm, remarks: e.target.value })} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={submitMovement} disabled={!moveForm.stock_item_id}>Record</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {lowStock.length > 0 && (
          <div className="mb-4 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
            <ShieldAlert className="mt-0.5 h-4 w-4 text-destructive" />
            <span>
              <span className="font-medium text-destructive">{lowStock.length}</span> item(s) at or below reorder level:{" "}
              {lowStock.slice(0, 4).map((s: any) => s.item_code).join(", ")}
              {lowStock.length > 4 ? "…" : ""}
            </span>
          </div>
        )}

        <SegmentedTabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "stock", label: "Stock" },
            { value: "requests", label: "Material requests" },
            { value: "movements", label: "Movements" },
          ]}
        />

        <div className="mt-4 space-y-3">
          {tab === "stock" &&
            stockList.map((s: any) => (
              <Card key={s.id}>
                <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Boxes className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{s.item_code}</span>
                      <span className="text-sm text-muted-foreground">{s.description}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] ${statusBadgeClass(s.status)}`}>{humanize(s.status)}</span>
                    </div>
                    <p className="mt-1 text-sm">
                      On hand <span className="font-medium">{s.quantity_on_hand} {s.unit}</span> · reserved {s.quantity_reserved} · reorder at {s.reorder_level}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {[s.category, s.store_location, s.supplier].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setStockForm({ ...emptyStock, ...s, quantity_on_hand: String(s.quantity_on_hand ?? 0), reorder_level: String(s.reorder_level ?? 0), unit_cost: String(s.unit_cost ?? 0) }); setStockOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={async () => {
                      try { await removeStock({ data: { id: s.id } }); toast.success("Item deleted"); refresh(); }
                      catch (e) { toast.error(e instanceof Error ? e.message : "Could not delete"); }
                    }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

          {tab === "requests" &&
            requestList.map((r: any) => (
              <Card key={r.id}>
                <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <PackageCheck className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{r.reference}</span>
                      <span className="text-sm text-muted-foreground">{r.title}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] ${statusBadgeClass(r.status)}`}>{humanize(r.status)}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] ${statusBadgeClass(r.stage)}`}>{humanize(r.stage)}</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {[r.projects?.project_number, r.job_numbers?.job_number, r.boms?.reference].filter(Boolean).join(" · ") || "—"}
                      {r.required_date ? ` · required ${r.required_date}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(r.material_request_items ?? []).length} line(s) · issued to {r.received_by || "—"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => allocate({ data: { id: r.id } }).then((res: any) => {
                      toast[res?.shortages?.length ? "warning" : "success"](res?.shortages?.length ? `Shortage: ${res.shortages.join(" · ")}` : "Stock allocated");
                      refresh();
                    }).catch((e) => toast.error(e instanceof Error ? e.message : "Could not allocate"))}>
                      <ArrowDownUp className="mr-1 h-4 w-4" /> Allocate
                    </Button>
                    <Button variant="outline" size="sm" onClick={async () => {
                      const who = window.prompt("Received by (site engineer / technician)") ?? "";
                      try { await issue({ data: { id: r.id, received_by: who } }); toast.success("Material issued to site"); refresh(); }
                      catch (e) { toast.error(e instanceof Error ? e.message : "Could not issue"); }
                    }}>
                      <Truck className="mr-1 h-4 w-4" /> Issue
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => requestExtra(r)}>A5</Button>
                    <Button variant="outline" size="sm" onClick={() => editRequest(r)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="outline" size="sm" onClick={async () => {
                      try { await removeRequest({ data: { id: r.id } }); toast.success("Request deleted"); refresh(); }
                      catch (e) { toast.error(e instanceof Error ? e.message : "Could not delete"); }
                    }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

          {tab === "movements" &&
            movementList.map((m: any) => (
              <Card key={m.id}>
                <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <ArrowDownUp className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{m.stock_items?.item_code ?? m.description}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] ${statusBadgeClass(m.movement_type)}`}>{humanize(m.movement_type)}</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {m.quantity} {m.unit} · {m.reference || "—"} · {[m.projects?.project_number, m.job_numbers?.job_number].filter(Boolean).join(" · ") || "no job"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(m.created_at).toLocaleString()} {m.remarks ? `· ${m.remarks}` : ""}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}

          {((tab === "stock" && stockList.length === 0) ||
            (tab === "requests" && requestList.length === 0) ||
            (tab === "movements" && movementList.length === 0)) && (
            <p className="py-10 text-center text-sm text-muted-foreground">Nothing here yet.</p>
          )}
        </div>
      </main>
    </div>
  );
}

function Field({
  label, value, onChange, type = "text",
}: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input className="mt-1" type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Select({
  label, value, onChange, options,
}: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <select
        className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    </div>
  );
}
