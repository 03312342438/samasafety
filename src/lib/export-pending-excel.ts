const NAVY = "FF103A52";

export type PendingRow = { due_date: string; status?: string; [k: string]: any };

/** Priority rank: 0 overdue, 1 due within 7 days, 2 due within 30 days, 3 later. */
export function pendingPriority(due: string, today = new Date().toISOString().slice(0, 10)) {
  if (due < today) return { rank: 0, label: "Overdue" };
  const days = Math.round((new Date(`${due}T00:00:00Z`).getTime() - new Date(`${today}T00:00:00Z`).getTime()) / 86400000);
  if (days <= 7) return { rank: 1, label: "Due this week" };
  if (days <= 30) return { rank: 2, label: "Due this month" };
  return { rank: 3, label: "Upcoming" };
}

/** Most urgent first (overdue, oldest due date on top), least urgent last. */
export function sortPendingByPriority<T extends PendingRow>(rows: T[], today?: string) {
  return [...rows].sort((a, b) => pendingPriority(a.due_date, today).rank - pendingPriority(b.due_date, today).rank || a.due_date.localeCompare(b.due_date));
}

const fmt = (d?: string) => d ? new Date(`${d}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "";

export async function downloadPendingExcel(rows: PendingRow[]) {
  const { default: ExcelJS } = await import("exceljs");
  const today = new Date().toISOString().slice(0, 10);
  const sorted = sortPendingByPriority(rows, today);
  const wb = new ExcelJS.Workbook();
  wb.creator = "Sama Safety & Security";
  const ws = wb.addWorksheet("Maintenance Pending", { views: [{ state: "frozen", ySplit: 3 }], pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
  const cols = [
    ["#", 6], ["Priority", 16], ["Due Date", 15], ["Days", 9], ["System", 10], ["Client", 28], ["Project", 26], ["Site / Location", 26], ["Contract No.", 16], ["Visit #", 9], ["Assigned To", 20],
  ] as const;
  ws.columns = cols.map(([, w]) => ({ width: w }));
  ws.mergeCells(1, 1, 1, cols.length);
  const t = ws.getCell(1, 1);
  t.value = "Sama Safety & Security — Maintenance Pending";
  t.font = { name: "Calibri", size: 15, bold: true, color: { argb: "FFFFFFFF" } };
  t.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
  t.alignment = { vertical: "middle", indent: 1 };
  ws.getRow(1).height = 30;
  ws.mergeCells(2, 1, 2, cols.length);
  const overdue = sorted.filter((r) => r.due_date < today).length;
  ws.getCell(2, 1).value = `${sorted.length} pending visit${sorted.length === 1 ? "" : "s"} · ${overdue} overdue · Exported ${fmt(today)}`;
  ws.getCell(2, 1).font = { name: "Calibri", size: 10, italic: true, color: { argb: "FF5B6B73" } };
  ws.getCell(2, 1).alignment = { indent: 1 };
  const h = ws.getRow(3);
  cols.forEach(([name], i) => {
    const c = h.getCell(i + 1);
    c.value = name;
    c.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    c.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  });
  h.height = 24;
  const tones: Record<number, [string, string]> = { 0: ["FFFDE2E2", "FFB42318"], 1: ["FFFEF0C7", "FFB54708"], 2: ["FFE7EEF2", "FF103A52"], 3: ["FFFFFFFF", "FF1F2937"] };
  sorted.forEach((r, i) => {
    const p = pendingPriority(r.due_date, today);
    const days = Math.round((new Date(`${r.due_date}T00:00:00Z`).getTime() - new Date(`${today}T00:00:00Z`).getTime()) / 86400000);
    const row = ws.addRow([i + 1, p.label, fmt(r.due_date), days, r.system_type ?? "", r.client_name ?? "", r.project ?? "", r.site_location ?? "", r.contract_no ?? "", r.sequence ?? "", r.employee_name ?? ""]);
    row.height = 20;
    row.eachCell((c, n) => {
      c.font = { name: "Calibri", size: 10, color: { argb: n === 2 ? tones[p.rank][1] : "FF1F2937" }, bold: n === 2 };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: tones[p.rank][0] } };
      c.alignment = { vertical: "middle", horizontal: "left", indent: 1, wrapText: true };
      c.border = { bottom: { style: "thin", color: { argb: "FFD3DDE2" } } };
    });
  });
  ws.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: cols.length } };
  const buf = await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `sama-maintenance-pending-${today}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
