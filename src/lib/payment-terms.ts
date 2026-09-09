// Payment-term milestone tracking.
// A project carries a list of billing milestones (percentage + trigger). When a
// trigger is met the milestone becomes "due" and Accounts is notified that an
// invoice should be raised. Takes an already-authenticated Supabase client.

import { notifyDepartments } from "@/lib/activity";

type AnyClient = any;

export const TRIGGER_TYPES = ["project_start", "steps_completed", "project_completed"] as const;
export type TriggerType = (typeof TRIGGER_TYPES)[number];

export const TRIGGER_LABELS: Record<string, string> = {
  project_start: "Project initiation",
  steps_completed: "Job number steps completed",
  project_completed: "Project completed",
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Default milestone set offered when a project is created. */
export const DEFAULT_PAYMENT_TERMS = [
  { percent: "30", milestone: "Project initiation", trigger_type: "project_start", trigger_steps: "0" },
  { percent: "50", milestone: "Mid-project", trigger_type: "steps_completed", trigger_steps: "3" },
  { percent: "20", milestone: "Project finalization", trigger_type: "project_completed", trigger_steps: "0" },
];

/**
 * Re-check every milestone of a project and mark the ones whose condition is
 * now satisfied as due, notifying Accounts once per milestone.
 */
export async function evaluateProjectPaymentTerms(
  supabase: AnyClient,
  projectId: string | null | undefined,
): Promise<void> {
  if (!projectId) return;
  try {
    const [{ data: terms }, { data: project }, { data: jobs }] = await Promise.all([
      supabase.from("project_payment_terms").select("*").eq("project_id", projectId).order("sequence"),
      supabase
        .from("projects")
        .select("id, project_number, name, contract_value, currency, status, progress_percent")
        .eq("id", projectId)
        .maybeSingle(),
      supabase.from("job_numbers").select("id").eq("project_id", projectId),
    ]);
    if (!project || !(terms ?? []).length) return;

    const jobIds = ((jobs ?? []) as any[]).map((j) => j.id);
    let totalSteps = 0;
    let completedSteps = 0;
    if (jobIds.length) {
      const { data: steps } = await supabase
        .from("job_installation_steps")
        .select("status")
        .in("job_number_id", jobIds);
      const rows = (steps ?? []) as any[];
      totalSteps = rows.length;
      completedSteps = rows.filter((s) => s.status === "completed").length;
    }
    const projectCompleted =
      project.status === "closed" ||
      Number(project.progress_percent ?? 0) >= 100 ||
      (totalSteps > 0 && completedSteps === totalSteps);

    for (const term of (terms ?? []) as any[]) {
      if (term.status !== "pending") continue;
      const needed = Math.max(1, Number(term.trigger_steps ?? 0) || 1);
      const due =
        term.trigger_type === "project_start"
          ? true
          : term.trigger_type === "steps_completed"
            ? completedSteps >= needed
            : projectCompleted;
      if (!due) continue;

      const amount = round2((Number(project.contract_value ?? 0) * Number(term.percent ?? 0)) / 100);
      await supabase
        .from("project_payment_terms")
        .update({ status: "due", notified_at: new Date().toISOString() })
        .eq("id", term.id);

      await notifyDepartments(supabase, ["accounts", "admin"], {
        title: `Invoice due — ${project.project_number} ${term.percent}%`,
        message: `${term.milestone || TRIGGER_LABELS[term.trigger_type] || "Milestone"} reached on ${
          project.name
        }. Raise an invoice for ${amount} ${project.currency || "BHD"}.`,
        category: "accounts",
        link: "/accounts",
        entity_table: "projects",
        entity_id: project.id,
      });
    }
  } catch {
    /* milestone tracking must never block the caller */
  }
}
