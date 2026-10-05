import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

const NAVY = { r: 0x10, g: 0x3a, b: 0x52 };
const FOOTER_LINES = [
  "Tel: 00973 17684492, FAX: 0097317684856, PO.BOX 75873 - Juffair, Kingdom of Bahrain.",
  "CR.No. 67898-1; Email: sama@samasafety.net - www.samasafety.net",
];
const FOOTER_H = 18; // mm reserved for the footer band on every page
const FOOTER_GAP = 6; // mm gap between content and footer
const FOOTER_MARGIN = 7.5; // mm white margin boundary around the footer

type PixelRange = { top: number; bottom: number };

function drawFooter(pdf: jsPDF, pageW: number, pageH: number) {
  const totalFooterH = FOOTER_H + FOOTER_MARGIN * 2;
  const y = pageH - totalFooterH;

  // White margin boundary background
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, y, pageW, totalFooterH, "F");

  // Navy footer band (inset by margin)
  pdf.setFillColor(NAVY.r, NAVY.g, NAVY.b);
  pdf.rect(FOOTER_MARGIN, y + FOOTER_MARGIN, pageW - FOOTER_MARGIN * 2, FOOTER_H, "F");

  // Footer text
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.text(FOOTER_LINES[0], pageW / 2, y + FOOTER_MARGIN + 6, { align: "center" });
  pdf.text(FOOTER_LINES[1], pageW / 2, y + FOOTER_MARGIN + 12, { align: "center" });
}

async function elementToPdf(el: HTMLElement): Promise<jsPDF> {
  const onePage = el.dataset.pdfOnePage === "true";
  const canvas = await html2canvas(el, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
    // Multi-page documents receive a repeated PDF footer. One-page report
    // sheets keep the footer that is already part of their fixed layout.
    ignoreElements: (node) => !onePage && (node as HTMLElement).dataset?.pdfFooter === "true",
  });

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  if (onePage) {
    pdf.addImage(canvas.toDataURL("image/jpeg", 0.97), "JPEG", 0, 0, pageW, pageH);
    return pdf;
  }

  const usableH = pageH - FOOTER_H - FOOTER_GAP; // content area per page (mm)
  const pxPerMm = canvas.width / pageW;
  const slicePx = Math.floor(usableH * pxPerMm); // content height per page (px)

  // Report sections advertise safe page boundaries. Their DOM positions are
  // converted to canvas pixels so a section that fits on one page is never
  // cut between two PDF pages.
  const rootRect = el.getBoundingClientRect();
  const domToCanvas = canvas.width / rootRect.width;
  const sections: PixelRange[] = Array.from(el.querySelectorAll<HTMLElement>("[data-pdf-section='true']"))
    .map((section) => {
      const rect = section.getBoundingClientRect();
      return {
        top: Math.max(0, Math.round((rect.top - rootRect.top) * domToCanvas)),
        bottom: Math.min(canvas.height, Math.round((rect.bottom - rootRect.top) * domToCanvas)),
      };
    })
    .filter((range) => range.bottom > range.top)
    .sort((a, b) => a.top - b.top);

  let renderedPx = 0;
  let page = 0;
  while (renderedPx < canvas.height) {
    if (page > 0) pdf.addPage();

    let sliceHpx = Math.min(slicePx, canvas.height - renderedPx);
    const proposedEnd = renderedPx + sliceHpx;
    const crossing = sections.find(
      (range) => range.top > renderedPx && range.top < proposedEnd && range.bottom > proposedEnd,
    );
    if (crossing && crossing.bottom - crossing.top <= slicePx) {
      sliceHpx = crossing.top - renderedPx;
    }

    const tmp = document.createElement("canvas");
    tmp.width = canvas.width;
    tmp.height = sliceHpx;
    const ctx = tmp.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, tmp.width, tmp.height);
    ctx.drawImage(canvas, 0, renderedPx, canvas.width, sliceHpx, 0, 0, canvas.width, sliceHpx);

    const sliceData = tmp.toDataURL("image/jpeg", 0.95);
    const sliceHmm = sliceHpx / pxPerMm;
    pdf.addImage(sliceData, "JPEG", 0, 0, pageW, sliceHmm);

    drawFooter(pdf, pageW, pageH);

    renderedPx += sliceHpx;
    page++;
  }

  return pdf;
}


/**
 * Renders a DOM node to an A4 PDF and triggers a download.
 */
export async function downloadElementAsPdf(el: HTMLElement, filename: string) {
  const pdf = await elementToPdf(el);
  pdf.save(filename);
}

/**
 * Renders a DOM node to an A4 PDF and returns the raw base64 string (no data: prefix).
 */
export async function elementToPdfBase64(el: HTMLElement): Promise<string> {
  const pdf = await elementToPdf(el);
  const dataUrl = pdf.output("dataurlstring");
  return dataUrl.split(",")[1] ?? "";
}
