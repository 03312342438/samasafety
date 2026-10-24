// Pure helpers for the manually-kept maintenance contract list.

export const SYSTEM_TYPES = ["FF", "FA", "CCTV", "GAS", "FS", "FE", "FSCP", "FSC"] as const;
export type SystemType = (typeof SYSTEM_TYPES)[number];

export const SYSTEM_LABELS: Record<SystemType, string> = {
  FF: "FF - Fire Fighting",
  FA: "FA - Fire Alarm",
  CCTV: "CCTV",
  GAS: "GAS Suppression",
  FS: "FS - Fire Suppression",
  FE: "FE - Fire Extinguisher",
  FSCP: "FSCP - Fire Suppression Control Panel",
  FSC: "FSC - Fire Suppression Cylinder",
};

/** Default months between two visits for each system. */
export const SYSTEM_INTERVAL: Record<SystemType, number> = {
  FF: 6,
  FA: 3,
  CCTV: 3,
  GAS: 3,
  FS: 6,
  FE: 12,
  FSCP: 3,
  FSC: 6,
};

export function addMonths(date: string, months: number): string {
  if (!date) return "";
  const d = new Date(`${String(date).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) d.setDate(0); // clamp to end of shorter month
  return d.toISOString().slice(0, 10);
}

/** Contracts run for one year by default. */
export function defaultEndDate(start: string): string {
  return addMonths(start, 12);
}

/**
 * Visits run from the contract start date itself and then every interval,
 * never counting a visit on the contract end date.
 * e.g. start 1 Jan, 3-month interval, 1-year contract -> Jan, Apr, Jul, Oct = 4.
 */
export function countVisits(
  start: string | null,
  end: string | null,
  intervalMonths: number,
): number {
  if (!start || !end || !intervalMonths) return 0;
  const s = new Date(`${String(start).slice(0, 10)}T00:00:00`);
  const e = new Date(`${String(end).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 0;
  const months =
    (e.getFullYear() - s.getFullYear()) * 12 +
    (e.getMonth() - s.getMonth()) +
    (e.getDate() >= s.getDate() ? 0 : -1);
  if (months <= 0) return 0;
  // Contracts are yearly: a period of up to 12 months (even when the end date
  // was entered a few months early) is one full year of visits.
  const years = Math.max(1, Math.round(months / 12));
  return years * Math.ceil(12 / intervalMonths);
}

export function contractVisitCounts(c: { start_date: string | null; end_date: string | null; interval_months: number; total_visits_override?: number | null; completed_visits_override?: number | null; completed_reports_at_override?: number; prior_visits_done?: number }, reportCount: number) {
  const total = c.total_visits_override ?? countVisits(c.start_date, c.end_date, c.interval_months);
  const rawDone = c.completed_visits_override != null
    ? c.completed_visits_override + Math.max(0, reportCount - (c.completed_reports_at_override ?? 0))
    : reportCount + (c.prior_visits_done ?? 0);
  const done = Math.min(total, Math.max(0, rawDone));
  return { total, done, remaining: Math.max(0, total - done) };
}

/** Due date of visit number `n` (1-based); the first visit is the start date. */
export function visitDate(start: string | null, intervalMonths: number, n: number): string {
  if (!start || n < 1) return "";
  return addMonths(String(start).slice(0, 10), intervalMonths * (n - 1));
}

/**
 * Due date of visit `n` once `done` visits are completed. After a completed
 * visit, later visits follow the actual date of the last completed visit
 * (e.g. visit 2 done on 1 May with a 3-month interval -> 1 Aug, 1 Nov).
 * Before any visit is done, the original contract schedule applies.
 */
export function scheduledVisitDate(
  start: string | null,
  intervalMonths: number,
  n: number,
  done: number,
  lastDone: string | null | undefined,
): string {
  if (lastDone && n > done) {
    return addMonths(String(lastDone).slice(0, 10), intervalMonths * (n - done));
  }
  return visitDate(start, intervalMonths, n);
}

export function contractStatus(opts: {
  endDate: string | null;
  upcoming: string;
  remaining: number;
}): string {
  const today = new Date().toISOString().slice(0, 10);
  if (opts.remaining <= 0) return "Completed";
  // Every contracted visit must still be done after the contract ends.
  if (opts.endDate && String(opts.endDate).slice(0, 10) < today)
    return `Expired – ${opts.remaining} Visit${opts.remaining === 1 ? "" : "s"} Remaining`;
  if (opts.upcoming && opts.upcoming < today) return "Overdue";
  if (opts.upcoming && opts.upcoming <= addDays(today, 30)) return "Due soon";
  return "On schedule";
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export type VisitStatusInput = {
  status?: string | null;
  due_date?: string | null;
  contract_end_date?: string | null;
  contract_remaining?: number | null;
};

/** True when the visit's contract has already ended. */
export function isExpiredContract(
  t: VisitStatusInput,
  today = new Date().toISOString().slice(0, 10),
): boolean {
  return Boolean(t.contract_end_date) && String(t.contract_end_date).slice(0, 10) < today;
}

/**
 * Label of a pending visit whose contract has already ended: "Expired", or
 * "Expired – N Visits Remaining" while contracted visits are still outstanding.
 * Empty when the contract is still running (or there is no contract).
 */
export function expiredVisitLabel(
  t: VisitStatusInput,
  today = new Date().toISOString().slice(0, 10),
): string {
  if (!isExpiredContract(t, today)) return "";
  const remaining = t.contract_remaining ?? 0;
  return remaining > 0 ? `Expired – ${remaining} Visit${remaining === 1 ? "" : "s"} Remaining` : "Expired";
}

/**
 * Status label of a scheduled visit in Maintenance Pending: Completed,
 * Expired (or "Expired – N Visits Remaining" when visits are still outstanding),
 * Overdue, Due soon or Upcoming.
 */
export function visitStatusLabel(
  t: VisitStatusInput,
  today = new Date().toISOString().slice(0, 10),
): string {
  if (t.status === "completed") return "Completed";
  const expired = expiredVisitLabel(t, today);
  if (expired) return expired;
  if (!t.due_date) return "Upcoming";
  if (t.due_date < today) return "Overdue";
  const days = Math.round(
    (new Date(`${t.due_date}T00:00:00Z`).getTime() - new Date(`${today}T00:00:00Z`).getTime()) / 86400000,
  );
  return days <= 7 ? "Due soon" : "Upcoming";
}

/** Statuses the Maintenance Pending status filter always offers. */
export const VISIT_FILTER_STATUSES = ["Expired", "Overdue", "Due soon", "Upcoming", "Completed"] as const;

/**
 * Status used by the Maintenance Pending status filter. Every visit of an ended
 * contract is "Expired", whether or not visits are still outstanding, so the
 * filter has a single Expired entry instead of one per remaining count.
 */
export function visitFilterStatus(
  t: VisitStatusInput,
  today = new Date().toISOString().slice(0, 10),
): string {
  if (t.status === "completed") return "Completed";
  if (isExpiredContract(t, today)) return "Expired";
  return visitStatusLabel(t, today);
}

/** Dropdown options for the status filter: "All statuses" plus every status. */
export function visitStatusOptions(
  tasks: VisitStatusInput[],
  today = new Date().toISOString().slice(0, 10),
): [string, string][] {
  const present = new Set(tasks.map((t) => visitFilterStatus(t, today)));
  const extras = [...present]
    .filter((s) => !(VISIT_FILTER_STATUSES as readonly string[]).includes(s))
    .sort();
  return [
    ["", "All statuses"],
    ...[...VISIT_FILTER_STATUSES, ...extras].map((s): [string, string] => [s, s]),
  ];
}

export function prettyDate(d?: string | null): string {
  if (!d) return "";
  const dt = new Date(`${String(d).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
