import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { FolderKanban, Plus, Pencil, Trash2, Hash, ShieldCheck } from "lucide-react";
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
import { listCustomers } from "@/lib/crm.functions";
import {
  listProjects, saveProject, deleteProject,
  listJobNumbers, saveJobNumber, deleteJobNumber,
} from "@/lib/projects.functions";
import { submitApproval } from "@/lib/approvals.functions";
import { LIFECYCLE_STAGES, humanize, statusBadgeClass } from "@/lib/workflow";

export const Route = createFileRoute("/_authenticated/projects")({
  component: ProjectsPage,
  head: () => ({
    meta: [
      { title: "Projects & Job Numbers | SAMA Fire & Safety" },
      { name: "description", content: "Track SAMA fire-safety projects through every stage and control job numbers with management approval." },
      { property: "og:title", content: "Projects & Job Numbers | SAMA Fire & Safety" },
      { property: "og:description", content: "Track SAMA fire-safety projects through every stage and control job numbers with management approval." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const emptyProject = {
  project_number: "", name: "", customer_id: "", site_location: "",
  project_type: "installation", stage: "project_initiated", status: "active",
  contract_value: "", currency: "BHD", estimated_cost: "", start_date: "",
  target_date: "", progress_percent: "0", notes: "",
};

const emptyJob = {
  project_id: "", scope_type: "installation", description: "",
  site_location: "", start_date: "", target_date: "",
};

function ProjectsPage() {
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const [tab, setTab] = useState("projects");
  const [query, setQuery] = useState("");

  const fetchProjects = useServerFn(listProjects);
  const fetchJobs = useServerFn(listJobNumbers);
  const fetchCustomers = useServerFn(listCustomers);
  const save = useServerFn(saveProject);
  const remove = useServerFn(deleteProject);
  const saveJob = useServerFn(saveJobNumber);
  const removeJob = useServerFn(deleteJobNumber);
  const requestApproval = useServerFn(submitApproval);

  const { data: projects } = useQuery({ queryKey: ["projects"], queryFn: () => fetchProjects() });
  const { data: jobs } = useQuery({ queryKey: ["job-numbers"], queryFn: () => fetchJobs() });
  const { data: customers } = useQuery({ queryKey: ["customers"], queryFn: () => fetchCustomers() });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(emptyProject);
  const [jobOpen, setJobOpen] = useState(false);
  const [jobForm, setJobForm] = useState<any>(emptyJob);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["projects"] });
    qc.invalidateQueries({ queryKey: ["job-numbers"] });
    qc.invalidateQueries({ queryKey: ["approvals"] });
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };

  const submitProject = async () => {
    try {
      await save({
        data: {
          ...form,
          id: form.id || undefined,
          customer_id: form.customer_id || null,
          contract_value: Number(form.contract_value || 0),
          estimated_cost: Number(form.estimated_cost || 0),
          progress_percent: Number(form.progress_percent || 0),
        },
      });
      toast.success(form.id ? "Project updated" : "Project created");
      setOpen(false);
      setForm(emptyProject);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save project");
    }
  };

  const submitJob = async () => {
    try {
      const res: any = await saveJob({ data: { ...jobForm, id: jobForm.id || undefined } });
      toast.success(res?.job_number ? `Job number ${res.job_number} created` : "Job number updated");
      setJobOpen(false);
      setJobForm(emptyJob);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save job number");
    }
  };

  const sendForApproval = async (job: any) => {
    try {
      await requestApproval({
        data: {
          approval_type: "job_number",
          title: `Job number ${job.job_number}`,
          details: job.description ?? "",
          project_id: job.project_id,
          job_number_id: job.id,
          amount: 0,
        },
      });
      toast.success("Sent to management for approval");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not submit for approval");
    }
  };

  const q = query.trim().toLowerCase();
  const projectList = ((projects as any[]) ?? []).filter(
    (p) => !q || [p.project_number, p.name, p.customers?.name, p.site_location].join(" ").toLowerCase().includes(q),
  );
  const jobList = ((jobs as any[]) ?? []).filter(
    (j) => !q || [j.job_number, j.projects?.project_number, j.description, j.site_location].join(" ").toLowerCase().includes(q),
  );

  return (
    <div className="min-h-screen bg-secondary/40">
      <AppHeader isAdmin={profile?.isAdmin} name={profile?.profile?.full_name} roles={profile?.roles} />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Projects & Job Numbers</h1>
            <p className="text-sm text-muted-foreground">
              Every job number is unique, approved by management, and the only key materials and
              costs can be booked against.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <SearchInput value={query} onChange={setQuery} placeholder="Search…" />
            {tab === "projects" ? (
              <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setForm(emptyProject); }}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="mr-1 h-4 w-4" /> New project</Button>
                </DialogTrigger>
                <DialogContent className="max-h-[85vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>{form.id ? "Edit project" : "New project"}</DialogTitle></DialogHeader>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Project name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
                    <div>
                      <Label className="text-xs">Customer</Label>
                      <select
                        className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm"
                        value={form.customer_id}
                        onChange={(e) => setForm({ ...form, customer_id: e.target.value })}
                      >
                        <option value="">— none —</option>
                        {((customers as any[]) ?? []).map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <Field label="Site location" value={form.site_location} onChange={(v) => setForm({ ...form, site_location: v })} />
                    <div>
                      <Label className="text-xs">Type</Label>
                      <select
                        className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm"
                        value={form.project_type}
                        onChange={(e) => setForm({ ...form, project_type: e.target.value })}
                      >
                        <option value="installation">Installation</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="both">Installation + Maintenance</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs">Stage</Label>
                      <select
                        className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm"
                        value={form.stage}
                        onChange={(e) => setForm({ ...form, stage: e.target.value })}
                      >
                        {LIFECYCLE_STAGES.map((s) => (
                          <option key={s} value={s}>{humanize(s)}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs">Status</Label>
                      <select
                        className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm"
                        value={form.status}
                        onChange={(e) => setForm({ ...form, status: e.target.value })}
                      >
                        <option value="active">Active</option>
                        <option value="on_hold">On hold</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>
                    <Field label="Contract value" value={form.contract_value} onChange={(v) => setForm({ ...form, contract_value: v })} />
                    <Field label="Estimated cost" value={form.estimated_cost} onChange={(v) => setForm({ ...form, estimated_cost: v })} />
                    <Field label="Start date" type="date" value={form.start_date} onChange={(v) => setForm({ ...form, start_date: v })} />
                    <Field label="Target date" type="date" value={form.target_date} onChange={(v) => setForm({ ...form, target_date: v })} />
                    <Field label="Progress %" value={form.progress_percent} onChange={(v) => setForm({ ...form, progress_percent: v })} />
                    <div className="sm:col-span-2">
                      <Label className="text-xs">Notes</Label>
                      <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={submitProject} disabled={!form.name.trim()}>Save</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            ) : (
              <Dialog open={jobOpen} onOpenChange={(o) => { setJobOpen(o); if (!o) setJobForm(emptyJob); }}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="mr-1 h-4 w-4" /> New job number</Button>
                </DialogTrigger>
                <DialogContent className="max-h-[85vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>{jobForm.id ? "Edit job number" : "New job number"}</DialogTitle></DialogHeader>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Label className="text-xs">Project</Label>
                      <select
                        className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm"
                        value={jobForm.project_id}
                        onChange={(e) => setJobForm({ ...jobForm, project_id: e.target.value })}
                      >
                        <option value="">— select project —</option>
                        {((projects as any[]) ?? []).map((p) => (
                          <option key={p.id} value={p.id}>{p.project_number} — {p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs">Scope</Label>
                      <select
                        className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm"
                        value={jobForm.scope_type}
                        onChange={(e) => setJobForm({ ...jobForm, scope_type: e.target.value })}
                      >
                        <option value="installation">Installation</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="service">Service</option>
                        <option value="repair">Repair</option>
                      </select>
                    </div>
                    <Field label="Site location" value={jobForm.site_location} onChange={(v) => setJobForm({ ...jobForm, site_location: v })} />
                    <Field label="Start date" type="date" value={jobForm.start_date} onChange={(v) => setJobForm({ ...jobForm, start_date: v })} />
                    <Field label="Target date" type="date" value={jobForm.target_date} onChange={(v) => setJobForm({ ...jobForm, target_date: v })} />
                    <div className="sm:col-span-2">
                      <Label className="text-xs">Scope description</Label>
                      <Textarea rows={3} value={jobForm.description} onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={submitJob} disabled={!jobForm.project_id}>Save</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        <SegmentedTabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "projects", label: `Projects (${projectList.length})` },
            { value: "jobs", label: `Job numbers (${jobList.length})` },
          ]}
        />

        <div className="mt-4 space-y-3">
          {tab === "projects" &&
            projectList.map((p) => (
              <Card key={p.id}>
                <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <FolderKanban className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{p.project_number}</span>
                      <span className="text-sm">{p.name}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] ${statusBadgeClass(p.stage)}`}>{humanize(p.stage)}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] ${statusBadgeClass(p.status)}`}>{humanize(p.status)}</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {[p.customers?.name, p.site_location].filter(Boolean).join(" · ") || "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(p.job_numbers ?? []).length} job number(s) · progress {p.progress_percent ?? 0}%
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setForm({ ...emptyProject, ...p, customer_id: p.customer_id ?? "", contract_value: p.contract_value ?? "", estimated_cost: p.estimated_cost ?? "", start_date: p.start_date ?? "", target_date: p.target_date ?? "", progress_percent: String(p.progress_percent ?? 0) }); setOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try { await remove({ data: { id: p.id } }); refresh(); toast.success("Project deleted"); }
                        catch (e) { toast.error(e instanceof Error ? e.message : "Could not delete"); }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

          {tab === "jobs" &&
            jobList.map((j) => (
              <Card key={j.id}>
                <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Hash className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{j.job_number}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] ${statusBadgeClass(j.status)}`}>{humanize(j.status)}</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {[j.projects?.project_number, j.customers?.name, j.scope_type, j.site_location].filter(Boolean).join(" · ")}
                    </p>
                    {j.description && <p className="text-xs text-muted-foreground">{j.description}</p>}
                  </div>
                  <div className="flex gap-2">
                    {j.status === "draft" && (
                      <Button variant="secondary" size="sm" onClick={() => sendForApproval(j)}>
                        <ShieldCheck className="mr-1 h-4 w-4" /> Send for approval
                      </Button>
                    )}
                    {j.status !== "approved" && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => { setJobForm({ ...emptyJob, ...j, start_date: j.start_date ?? "", target_date: j.target_date ?? "" }); setJobOpen(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            try { await removeJob({ data: { id: j.id } }); refresh(); toast.success("Job number deleted"); }
                            catch (e) { toast.error(e instanceof Error ? e.message : "Could not delete"); }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

          {((tab === "projects" && projectList.length === 0) || (tab === "jobs" && jobList.length === 0)) && (
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
