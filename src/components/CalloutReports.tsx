import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Clock, FileText, Pencil } from "lucide-react";
import { listCallouts, saveCallout, type CalloutInput } from "@/lib/callouts.functions";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { SearchInput } from "@/components/SearchInput";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { SYSTEM_TYPES, SYSTEM_LABELS } from "@/lib/maintenance-contracts";
import { SignaturePad } from "@/components/SignaturePad";
import { CalloutDownloadButton } from "@/components/CalloutDocument";

const nowLocal = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};
const toLocal = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

const empty = (performedBy: string): CalloutInput => ({
  client_name: "", client_email: "", contact_person: "", contact_phone: "",
  project: "", site_location: "", system_type: "", call_received_at: nowLocal(),
  reported_problem: "", priority: "normal", arrival_at: "", findings: "",
  action_taken: "", follow_up_notes: "", performed_by: performedBy,
  client_sign_name: "", status: "pending",
  technician_sign_name: performedBy, technician_sign_date: "", client_sign_date: "",
  technician_signature: "", client_signature: "",
});

const STATUS_LABEL: Record<string, string> = {
  pending: "Not attended", follow_up: "Needs follow-up", closed: "Closed",
};

export function CalloutReports({ performedBy, canEdit = true }: { performedBy: string; canEdit?: boolean }) {
  const fetchAll = useServerFn(listCallouts);
  const { data } = useQuery({ queryKey: ["callouts"], queryFn: () => fetchAll() });
  const rows = (data as any[]) ?? [];
  const [tab, setTab] = useState("new");
  const [editing, setEditing] = useState<any | null>(null);
  const [q, setQ] = useState("");
  const match = (r: any) =>
    !q || [r.reference, r.client_name, r.project, r.site_location, r.system_type, r.reported_problem]
      .join(" ").toLowerCase().includes(q.toLowerCase());
  const pending = rows.filter((r) => r.status !== "closed").filter(match);
  const history = rows.filter((r) => r.status === "closed").filter(match);

  if (editing) {
    return (
      <CalloutForm
        initial={editing}
        performedBy={performedBy}
        onDone={() => setEditing(null)}
        onCancel={() => setEditing(null)}
      />
    );
  }

  const List = ({ items }: { items: any[] }) =>
    items.length ? (
      <div className="space-y-2">
        {items.map((r) => (
          <Card key={r.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div>
                <p className="font-semibold">
                  {r.system_type && <Badge variant="secondary" className="mr-2">{r.system_type}</Badge>}
                  {r.client_name || "Untitled"} <span className="text-muted-foreground">· {r.reference}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {r.project || r.site_location || "—"} · Call {new Date(r.call_received_at).toLocaleString()}
                </p>
                {r.reported_problem && <p className="mt-1 text-sm">{r.reported_problem}</p>}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={r.status === "closed" ? "outline" : r.priority === "urgent" ? "destructive" : "default"}>
                  {STATUS_LABEL[r.status]}{r.priority === "urgent" && r.status !== "closed" ? " · Urgent" : ""}
                </Badge>
                <CalloutDownloadButton data={r} size="sm" />
                {(canEdit || r.status !== "closed") && (
                  <Button size="sm" variant="outline" onClick={() => setEditing(r)}>
                    <Pencil className="mr-1 h-4 w-4" /> {r.status === "closed" ? "View / Edit" : "Attend"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    ) : (
      <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Nothing here.</CardContent></Card>
    );

  return (
    <div className="space-y-4">
      <SegmentedTabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "new", label: (<><Plus className="mr-1 h-4 w-4" /> New Call-out</>) },
          { value: "pending", label: (<><Clock className="mr-1 h-4 w-4" /> Pending ({rows.filter((r) => r.status !== "closed").length})</>) },
          { value: "history", label: (<><FileText className="mr-1 h-4 w-4" /> History ({rows.filter((r) => r.status === "closed").length})</>) },
        ]}
      />
      {tab === "new" && (
        <CalloutForm key="new" performedBy={performedBy} onDone={() => setTab("pending")} />
      )}
      {tab !== "new" && (
        <SearchInput value={q} onChange={setQ} placeholder="Search reference, client, project, site, problem…" />
      )}
      {tab === "pending" && <List items={pending} />}
      {tab === "history" && <List items={history} />}
    </div>
  );
}

function CalloutForm({
  initial, performedBy, onDone, onCancel,
}: { initial?: any; performedBy: string; onDone: () => void; onCancel?: () => void }) {
  const save = useServerFn(saveCallout);
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState<CalloutInput>(() =>
    initial
      ? { ...empty(performedBy), ...initial, call_received_at: toLocal(initial.call_received_at), arrival_at: toLocal(initial.arrival_at) }
      : empty(performedBy),
  );
  const set = (k: keyof CalloutInput) => (e: any) => setF((p) => ({ ...p, [k]: e.target.value }));

  const submit = async (status: CalloutInput["status"]) => {
    if (busy) return;
    if (!f.client_name.trim()) return toast.error("Enter the client name");
    setBusy(true);
    try {
      const res: any = await save({
        data: {
          ...f,
          id: initial?.id,
          status,
          call_received_at: new Date(f.call_received_at).toISOString(),
          arrival_at: f.arrival_at ? new Date(f.arrival_at).toISOString() : null,
        } as any,
      });
      qc.invalidateQueries({ queryKey: ["callouts"] });
      toast.success(res.reference ? `Call-out ${res.reference} saved` : "Call-out saved");
      if (!initial) setF(empty(performedBy));
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  };

  const field = (label: string, k: keyof CalloutInput, type = "text") => (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input type={type} value={(f[k] as string) ?? ""} onChange={set(k)} />
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{initial ? `Call-out ${initial.reference}` : "New Call-out Report"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          {field("Client name", "client_name")}
          {field("Client email", "client_email", "email")}
          {field("Contact person", "contact_person")}
          {field("Contact phone", "contact_phone")}
          {field("Project", "project")}
          {field("Site location", "site_location")}
          <div className="space-y-1">
            <Label>System type</Label>
            <select className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={f.system_type} onChange={set("system_type")}>
              <option value="">—</option>
              {SYSTEM_TYPES.map((s) => <option key={s} value={s}>{SYSTEM_LABELS[s] ?? s}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Priority</Label>
            <select className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={f.priority} onChange={set("priority")}>
              <option value="low">Low</option><option value="normal">Normal</option><option value="urgent">Urgent</option>
            </select>
          </div>
          {field("Call received", "call_received_at", "datetime-local")}
          {field("Arrival on site", "arrival_at", "datetime-local")}
        </div>
        <div className="space-y-1"><Label>Reported problem</Label><Textarea value={f.reported_problem} onChange={set("reported_problem")} /></div>
        <div className="space-y-1"><Label>Findings</Label><Textarea value={f.findings} onChange={set("findings")} /></div>
        <div className="space-y-1"><Label>Action taken</Label><Textarea value={f.action_taken} onChange={set("action_taken")} /></div>
        <div className="space-y-1"><Label>Follow-up needed (parts, return visit…)</Label><Textarea value={f.follow_up_notes} onChange={set("follow_up_notes")} /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 rounded-md border p-3">
            <p className="text-sm font-semibold">Technician</p>
            {field("Name", "performed_by")}
            <SignaturePad label="Technician signature" value={f.technician_signature ?? ""} onChange={(v) => setF((p) => ({ ...p, technician_signature: v }))} />
            {field("Date", "technician_sign_date", "date")}
          </div>
          <div className="space-y-2 rounded-md border p-3">
            <p className="text-sm font-semibold">Client</p>
            {field("Name", "client_sign_name")}
            <SignaturePad label="Client signature" value={f.client_signature ?? ""} onChange={(v) => setF((p) => ({ ...p, client_signature: v }))} />
            {field("Date", "client_sign_date", "date")}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={busy} onClick={() => submit("pending")}>Log call (not attended)</Button>
          <Button variant="outline" disabled={busy} onClick={() => submit("follow_up")}>Attended – needs follow-up</Button>
          <Button disabled={busy} onClick={() => submit("closed")}>Attended – close call</Button>
          {initial?.id && <CalloutDownloadButton data={{ ...initial, ...f, reference: initial.reference }} />}
          {onCancel && <Button variant="ghost" onClick={onCancel}>Cancel</Button>}
        </div>
      </CardContent>
    </Card>
  );
}
