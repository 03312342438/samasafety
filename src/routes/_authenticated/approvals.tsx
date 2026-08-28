import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ShieldCheck, Plus, History } from "lucide-react";
import { useProfile } from "@/hooks/use-profile";
import { AppHeader } from "@/components/AppHeader";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { listApprovals, submitApproval, decideApproval } from "@/lib/approvals.functions";
import { listActivity } from "@/lib/notifications.functions";
import { listProjects } from "@/lib/projects.functions";
import { APPROVAL_TYPE_LABELS, humanize, statusBadgeClass } from "@/lib/workflow";

export const Route = createFileRoute("/_authenticated/approvals")({
  component: ApprovalsPage,
  head: () => ({
    meta: [
      { title: "Approvals & Activity | SAMA Fire & Safety" },
      { name: "description", content: "Management approval gates A1-A6 and the full append-only activity trail for SAMA operations." },
      { property: "og:title", content: "Approvals & Activity | SAMA Fire & Safety" },
      { property: "og:description", content: "Management approval gates A1-A6 and the full append-only activity trail for SAMA operations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const emptyRequest = {
  approval_type: "quotation_commercial",
  title: "",
  details: "",
  project_id: "",
  amount: "",
};

function ApprovalsPage() {
  const { data: profile } = useProfile();
  const isAdmin = !!profile?.isAdmin;
  const qc = useQueryClient();
  const [tab, setTab] = useState("pending");

  const fetchApprovals = useServerFn(listApprovals);
  const fetchActivity = useServerFn(listActivity);
  const fetchProjects = useServerFn(listProjects);
  const submit = useServerFn(submitApproval);
  const decide = useServerFn(decideApproval);

  const { data: approvals } = useQuery({ queryKey: ["approvals"], queryFn: () => fetchApprovals() });
  const { data: projects } = useQuery({ queryKey: ["projects"], queryFn: () => fetchProjects() });
  const { data: activity } = useQuery({
    queryKey: ["activity"],
    queryFn: () => fetchActivity(),
    enabled: tab === "activity",
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(emptyRequest);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["approvals"] });
    qc.invalidateQueries({ queryKey: ["notifications"] });
    qc.invalidateQueries({ queryKey: ["job-numbers"] });
    qc.invalidateQueries({ queryKey: ["projects"] });
  };

  const send = async () => {
    try {
      await submit({
        data: {
          approval_type: form.approval_type,
          title: form.title,
          details: form.details,
          project_id: form.project_id || null,
          job_number_id: null,
          amount: Number(form.amount || 0),
        },
      });
      toast.success("Approval request sent to management");
      setOpen(false);
      setForm(emptyRequest);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not submit request");
    }
  };

  const act = async (id: string, decision: "approved" | "rejected" | "revision_requested") => {
    try {
      await decide({ data: { id, decision, decision_notes: notes[id] ?? "" } });
      toast.success(`Request ${decision.replace("_", " ")}`);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not record decision");
    }
  };

  const all = (approvals as any[]) ?? [];
  const pending = all.filter((a) => a.decision === "pending");
  const decided = all.filter((a) => a.decision !== "pending");

  return (
    <div className="min-h-screen bg-secondary/40">
      <AppHeader isAdmin={isAdmin} name={profile?.profile?.full_name} roles={profile?.roles} />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Approvals</h1>
            <p className="text-sm text-muted-foreground">
              {isAdmin
                ? "Every request raised by the departments lands here for your decision."
                : "Approval gates A1–A6. Nothing downstream may proceed until management decides."}
            </p>
          </div>
          {/* Management decides on requests — it never raises them. */}
          {!isAdmin && (
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setForm(emptyRequest); }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="mr-1 h-4 w-4" /> Request approval</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Request management approval</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <div>
                  <Label className="text-xs">Approval gate</Label>
                  <select
                    className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm"
                    value={form.approval_type}
                    onChange={(e) => setForm({ ...form, approval_type: e.target.value })}
                  >
                    {Object.entries(APPROVAL_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Project (optional)</Label>
                  <select
                    className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm"
                    value={form.project_id}
                    onChange={(e) => setForm({ ...form, project_id: e.target.value })}
                  >
                    <option value="">— none —</option>
                    {((projects as any[]) ?? []).map((p) => (
                      <option key={p.id} value={p.id}>{p.project_number} — {p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Title</Label>
                  <Input className="mt-1" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Amount (if commercial)</Label>
                  <Input className="mt-1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Details / justification</Label>
                  <Textarea rows={3} value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={send} disabled={!form.title.trim()}>Send request</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          )}
        </div>

        <SegmentedTabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "pending", label: `Pending (${pending.length})` },
            { value: "decided", label: `Decided (${decided.length})` },
            { value: "activity", label: "Activity log" },
          ]}
        />

        <div className="mt-4 space-y-3">
          {tab !== "activity" &&
            (tab === "pending" ? pending : decided).map((a) => (
              <Card key={a.id}>
                <CardContent className="space-y-2 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{a.title}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] ${statusBadgeClass(a.decision)}`}>
                      {humanize(a.decision)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {APPROVAL_TYPE_LABELS[a.approval_type] ?? a.approval_type}
                    {a.projects?.project_number ? ` · ${a.projects.project_number}` : ""}
                    {a.job_numbers?.job_number ? ` · ${a.job_numbers.job_number}` : ""}
                    {Number(a.amount) > 0 ? ` · ${a.amount}` : ""}
                  </p>
                  {a.details && <p className="text-sm">{a.details}</p>}
                  {a.decision_notes && (
                    <p className="text-xs text-muted-foreground">Decision note: {a.decision_notes}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    Submitted {new Date(a.submitted_at).toLocaleString()}
                  </p>

                  {isAdmin && a.decision === "pending" && (
                    <div className="space-y-2 pt-1">
                      <Textarea
                        rows={2}
                        placeholder="Decision note (optional)"
                        value={notes[a.id] ?? ""}
                        onChange={(e) => setNotes({ ...notes, [a.id]: e.target.value })}
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => act(a.id, "approved")}>Approve</Button>
                        <Button size="sm" variant="secondary" onClick={() => act(a.id, "revision_requested")}>
                          Request revision
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => act(a.id, "rejected")}>
                          Reject
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

          {tab === "activity" &&
            ((activity as any[]) ?? []).map((e) => (
              <Card key={e.id}>
                <CardContent className="flex items-start gap-3 p-3">
                  <History className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 text-sm">
                    <p>
                      <span className="font-medium">{e.user_name || "Someone"}</span>{" "}
                      {humanize(e.action).toLowerCase()}{" "}
                      {e.entity_label ? <span className="font-medium">{e.entity_label}</span> : e.entity_table}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(e.created_at).toLocaleString()}
                      {e.department ? ` · ${e.department}` : ""}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}

          {tab === "pending" && pending.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">No approvals waiting.</p>
          )}
        </div>
      </main>
    </div>
  );
}
