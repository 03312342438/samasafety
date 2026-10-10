// Pure helpers for the manually-kept maintenance contract list.

export const SYSTEM_TYPES = ["FF", "FA", "CCTV", "GAS", "FS", "FE", "FSCP", "FSC"] as const;
export type SystemType = (typeof SYSTEM_TYPES)[number];

export const SYSTEM_LABELS: Record<SystemType, string> = {
  FF: "FF — Fire Fighting",
  FA: "FA — Fire Alarm",
  CCTV: "CCTV",
  GAS: "GAS Suppression",
  FS: "FS — Fire Suppression",
  FE: "FE — Fire Extinguisher",
  FSCP: "FSCP — Fire Suppression Control Panel",
  FSC: "FSC — Fire Suppression Cylinder",
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
  return Math.max(Math.ceil(months / intervalMonths), 0);
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
  if (lastDone && done > 0 && n > done) {
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

export function prettyDate(d?: string | null): string {
  if (!d) return "";
  const dt = new Date(`${String(d).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
