import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, MapPin, RotateCcw, Trash2 } from "lucide-react";
import { SearchSelect } from "@/components/SearchSelect";

/**
 * Split pending visits: a visit is "carried over" once a later visit of the
 * same contract has already become due (its time passed and it wasn't done).
 */
export function splitCarriedOver<T extends { status?: string; contract_id?: string | null; sequence?: number; due_date?: string }>(
  tasks: T[],
) {
  const today = new Date().toISOString().slice(0, 10);
  const latestDueSeq = new Map<string, number>();
  for (const t of tasks) {
    if (t.status !== "pending" || !t.contract_id || !t.due_date || t.due_date > today) continue;
    latestDueSeq.set(t.contract_id, Math.max(latestDueSeq.get(t.contract_id) ?? 0, Number(t.sequence) || 0));
  }
  const pending: T[] = [];
  const carried: T[] = [];
  for (const t of tasks) {
    if (t.status !== "pending") continue;
    const latest = t.contract_id ? latestDueSeq.get(t.contract_id) : undefined;
    if (latest !== undefined && (Number(t.sequence) || 0) < latest) carried.push(t);
    else pending.push(t);
  }
  return { pending, carried };
}

const siteKey =  (s: unknown) => String(s ?? "").trim().toLowerCase();

/** Keep only tasks at the chosen site location ("" = all sites). */
export function filterBySite<T extends { site_location?: string | null }>(tasks: T[], site: string) {
  if (!site) return tasks;
  return tasks.filter((t) => siteKey(t.site_location) === site);
}

/** Searchable dropdown listing every site location found in the tasks. */
export function SiteFilter({
  tasks,
  value,
  onChange,
}: {
  tasks: { site_location?: string | null }[];
  value: string;
  onChange: (v: string) => void;
}) {
  const sites = new Map<string, string>();
  for (const t of tasks) {
    const label = String(t.site_location ?? "").trim();
    if (label && !sites.has(siteKey(label))) sites.set(siteKey(label), label);
  }
  const options: [string, string][] = [
    ["", "All site locations"],
    ...[...sites.entries()].sort((a, b) => a[1].localeCompare(b[1])),
  ];
  return (
    <div className="flex items-center gap-2">
      <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
      <SearchSelect
        value={value}
        onChange={onChange}
        options={options}
        placeholder="All site locations"
        searchPlaceholder="Search site location…"
        className="max-w-sm"
      />
    </div>
  );
}


export function MaintenanceTaskList({
  tasks,
  showEmployee,
  onToggle,
  onDelete,
}: {
  tasks: any[];
  showEmployee?: boolean;
  onToggle: (id: string, status: "pending" | "completed") => void;
  onDelete?: (id: string) => void;
}) {
  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No maintenance tasks.
        </CardContent>
      </Card>
    );
  }
  const today = new Date().toISOString().slice(0, 10);
  const soonCutoff = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
  return (
    <div className="space-y-3">
      {tasks.map((t) => {
        const overdue = t.status === "pending" && t.due_date < today;
        const dueSoon =
          t.status === "pending" && t.due_date >= today && t.due_date <= soonCutoff;
        return (
          <Card key={t.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div>
                <p className="font-semibold">
                  {t.client_name || "—"}
                  {t.project ? ` · ${t.project}` : ""}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    Visit #{t.sequence}
                  </span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {t.site_location && `${t.site_location} · `}
                  Due{" "}
                  {new Date(`${t.due_date}T00:00:00`).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                  {showEmployee && ` · Pending with ${t.employee_name ?? "—"}`}
                </p>
                <div className="mt-1 flex gap-2">
                  {overdue && (
                    <span className="rounded bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                      Overdue
                    </span>
                  )}
                  {dueSoon && !overdue && (
                    <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                      Due soon
                    </span>
                  )}
                  {t.status === "completed" && (
                    <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      Completed
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {t.status === "pending" ? (
                  <Button size="sm" variant="secondary" onClick={() => onToggle(t.id, "completed")}>
                    <CheckCircle2 className="mr-1 h-4 w-4" /> Mark done
                  </Button>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => onToggle(t.id, "pending")}>
                    <RotateCcw className="mr-1 h-4 w-4" /> Reopen
                  </Button>
                )}
                {onDelete && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => onDelete(t.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
