import { SYSTEM_TYPES, SYSTEM_INTERVAL, defaultEndDate, type SystemType } from "@/lib/maintenance-contracts";

const HEADERS = [
  "Contract No. (leave blank to auto-generate)",
  "Customer / Client",
  "Project Name",
  "Site Location",
  "Contract Start (YYYY-MM-DD)",
  "Contract End (YYYY-MM-DD)",
  "System (FF/FA/CCTV/GAS/FS/FE)",
  "Visit Interval (months)",
  "Notes",
];

/** Download a ready-to-fill Excel template for bulk contract upload. */
export async function downloadContractTemplate() {
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  wb.creator = "Sama Safety & Security";
  wb.created = new Date();
  const ws = wb.addWorksheet("Contracts");

  ws.columns = [
    { width: 26 },
    { width: 28 },
    { width: 28 },
    { width: 28 },
    { width: 24 },
    { width: 24 },
    { width: 26 },
    { width: 20 },
    { width: 34 },
  ];

  const header = ws.getRow(1);
  HEADERS.forEach((h, i) => {
    const cell = header.getCell(i + 1);
    cell.value = h;
    cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF103A52" } };
    cell.alignment = { vertical: "middle", horizontal: "left", indent: 1, wrapText: true };
  });
  header.height = 30;
  ws.views = [{ state: "frozen", ySplit: 1 }];

  const sample = ws.addRow([
    "MSR-0001",
    "CN-2026-001",
    "Example Customer",
    "Example Project",
    "Manama, Bahrain",
    "2026-01-01",
    "2026-12-31",
    "FF",
    6,
    "Leave Contract End blank to use one year after the start date.",
  ]);
  sample.font = { name: "Calibri", size: 10, italic: true, color: { argb: "FF6B7280" } };

  for (let r = 2; r <= 500; r++) {
    ws.getCell(r, 8).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [`"${SYSTEM_TYPES.join(",")}"`],
    };
  }

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "sama-maintenance-contracts-template.xlsx";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function toText(v: any): string {
  if (v == null) return "";
  if (typeof v === "object") {
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    if ("text" in v) return String(v.text ?? "").trim();
    if ("result" in v) return String(v.result ?? "").trim();
    if ("richText" in v) return (v.richText ?? []).map((t: any) => t.text).join("").trim();
    if ("hyperlink" in v) return String(v.text ?? "").trim();
  }
  return String(v).trim();
}

function toDate(v: any): string {
  const t = toText(v);
  if (!t) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);
  const d = new Date(t);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  // dd/mm/yyyy
  const m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (m) return `${m[3]}-${m[2]!.padStart(2, "0")}-${m[1]!.padStart(2, "0")}`;
  return "";
}

export type ParsedContract = {
  msr_no: string;
  contract_no: string;
  customer_name: string;
  project_name: string;
  site_location: string;
  start_date: string;
  end_date: string;
  system_type: SystemType;
  interval_months: number;
  notes: string;
};

/** Read a filled-in template back into contract rows. */
export async function parseContractWorkbook(file: File): Promise<ParsedContract[]> {
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const ws = wb.worksheets[0];
  if (!ws) return [];

  const out: ParsedContract[] = [];
  ws.eachRow((row, idx) => {
    if (idx === 1) return; // header
    const c = (n: number) => toText(row.getCell(n).value);
    const msr = c(1);
    const customer = c(3);
    const project = c(4);
    const start = toDate(row.getCell(6).value);
    if (!msr && !customer && !project && !start) return; // blank row
    const rawType = c(8).toUpperCase();
    const system_type = ((SYSTEM_TYPES as readonly string[]).includes(rawType)
      ? rawType
      : "FF") as SystemType;
    const interval = Number(c(9)) || SYSTEM_INTERVAL[system_type];
    out.push({
      msr_no: msr,
      contract_no: c(2),
      customer_name: customer,
      project_name: project,
      site_location: c(5),
      start_date: start,
      end_date: toDate(row.getCell(7).value) || (start ? defaultEndDate(start) : ""),
      system_type,
      interval_months: Math.min(Math.max(Math.round(interval), 1), 60),
      notes: c(10),
    });
  });
  return out;
}
