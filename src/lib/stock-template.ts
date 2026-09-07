import { STOCK_CATEGORIES } from "@/lib/workflow";

const HEADERS = ["Item Code", "Description", "Catagory", "Unit", "Status", "Picture", "Notes"];

/** Download a ready-to-fill Excel template for bulk item upload. */
export async function downloadStockTemplate() {
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  wb.creator = "Sama Safety & Security";
  wb.created = new Date();
  const ws = wb.addWorksheet("Items");

  ws.columns = [
    { width: 18 },
    { width: 42 },
    { width: 20 },
    { width: 10 },
    { width: 12 },
    { width: 48 },
    { width: 30 },
  ];

  const header = ws.getRow(1);
  HEADERS.forEach((h, i) => {
    const cell = header.getCell(i + 1);
    cell.value = h;
    cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF103A52" } };
    cell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  });
  header.height = 24;
  ws.views = [{ state: "frozen", ySplit: 1 }];

  ws.addRow([
    "",
    "Smoke detector, photoelectric, 2-wire",
    STOCK_CATEGORIES[0] ?? "Consumables",
    "pcs",
    "active",
    "https://example.com/photo.jpg",
    "Leave Item Code blank to auto-generate. Picture can be a link or left blank.",
  ]);
  ws.getRow(2).font = { name: "Calibri", size: 10, italic: true, color: { argb: "FF6B7280" } };

  const notes = ws.addRow([]);
  notes.getCell(1).value = "";

  // Category drop-down for the first 500 data rows.
  for (let r = 2; r <= 500; r++) {
    ws.getCell(r, 3).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [`"${STOCK_CATEGORIES.join(",")}"`],
    };
    ws.getCell(r, 5).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ['"active,inactive"'],
    };
  }

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "sama-stock-items-template.xlsx";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
