import { useRef, useState } from "react";
import { toast } from "sonner";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadElementAsPdf } from "@/lib/generate-pdf";
import { SAMA_LOGO_BASE64 } from "@/lib/logo";
import { CURRENCY } from "@/lib/workflow";

const money = (v: unknown) =>
  Number(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 });

const DEFAULT_PAYMENT_TERMS = "50% Advance, 40% on progress and 10% after testing & commissioning";

/** Generates the official SAMA quotation PDF for one quotation record. */
export function QuotationPdfButton({ quotation, customerName }: { quotation: any; customerName?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  const handle = async () => {
    if (!ref.current) return;
    setBusy(true);
    try {
      const name = (quotation.reference || "quotation").replace(/[^a-z0-9-_ ]/gi, "-").trim();
      await downloadElementAsPdf(ref.current, `${name}.pdf`);
    } catch (e) {
      console.error(e);
      toast.error("Could not generate the quotation PDF");
    } finally {
      setBusy(false);
    }
  };

  const items = ((quotation.quotation_items ?? []) as any[]).slice().sort((a, b) => a.sequence - b.sequence);
  const bomItems = ((quotation.boms?.bom_items ?? []) as any[])
    .slice()
    .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
  const projectName =
    quotation.projects?.name || quotation.boms?.title || quotation.site_location || "—";
  const cur = quotation.currency || CURRENCY;
  const preparer = quotation.prepared_by_profile ?? {};
  const preparerName = preparer.full_name || "";
  const preparerPhone = preparer.phone || "";
  const validity = quotation.validity_days ?? 30;
  const paymentTerms = quotation.payment_terms || DEFAULT_PAYMENT_TERMS;

  const net = Math.max(Number(quotation.subtotal ?? 0) - Number(quotation.discount_amount ?? 0), 0);
  const vatAmount = Number(quotation.total_amount ?? 0) - net;
  const approvedStatuses = ["approved", "customer_accepted", "accepted", "won"];
  const isApproved = approvedStatuses.includes(String(quotation.status ?? "").toLowerCase());

  return (
    <>
      <Button variant="outline" size="sm" onClick={handle} disabled={busy}>
        {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Download className="mr-1 h-4 w-4" />}
        Generate PDF
      </Button>

      <div style={{ position: "fixed", left: -10000, top: 0, pointerEvents: "none" }} aria-hidden>
        <div
          ref={ref}
          style={{
            width: 794,
            padding: 40,
            background: "#ffffff",
            color: "#0f172a",
            fontFamily: "Helvetica, Arial, sans-serif",
            fontSize: 12,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "3px solid #103a52", paddingBottom: 10 }}>
            <img src={SAMA_LOGO_BASE64} alt="Sama Safety &amp; Security" style={{ height: 70 }} />
            <div style={{ textAlign: "right", fontSize: 11 }}>
              <div style={{ fontWeight: 700, color: "#103a52" }}>Fire Alarm &amp; Fire Fighting Specialist</div>
              <div>Approved by Bahrain Civil Defence</div>
              <div style={{ marginTop: 4, fontWeight: 700 }}>VAT No. 220000996700002</div>
            </div>
          </div>

          <table style={{ width: "100%", marginTop: 14, borderCollapse: "collapse", fontSize: 12 }}>
            <tbody>
              <tr>
                <td style={{ width: "60%", verticalAlign: "top" }}>
                  <div><strong>Ref No:</strong> {quotation.reference}{quotation.revision ? `-R${quotation.revision}` : ""}</div>
                  <div style={{ marginTop: 6 }}><strong>Client Name:</strong> {customerName || quotation.customers?.name || "—"}</div>
                  <div><strong>ATTN.:</strong> {quotation.attention || quotation.customers?.contact_person || ""}</div>
                </td>
                <td style={{ width: "40%", verticalAlign: "top", textAlign: "right" }}>
                  <div><strong>Date:</strong> {new Date(quotation.created_at ?? Date.now()).toLocaleDateString("en-GB")}</div>
                </td>
              </tr>
            </tbody>
          </table>

          <p style={{ marginTop: 12 }}>Dear Sir/Madam,</p>
          <div><strong>PROJECT</strong> : {projectName}</div>
          <div><strong>SUBJECT</strong> : {quotation.title || "—"}</div>

          <p style={{ marginTop: 12, fontSize: 11 }}>
            Further to the above mentioned subject &amp; Based on your inquiry we are please to submit our best
            offer for the above mention project. Please find attached our financial offer for details of the
            following system.
          </p>

          <div style={{ textAlign: "center", marginTop: 12 }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: "#103a52", letterSpacing: 1 }}>QUOTATION</span>
            {!isApproved && (
              <div style={{ marginTop: 4, fontSize: 14, fontWeight: 700, color: "#b91c1c", letterSpacing: 2 }}>
                NOT APPROVED
              </div>
            )}
          </div>


          {(bomItems.length > 0 || items.length > 0) && (
            <table style={{ width: "100%", marginTop: 10, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#103a52", color: "#ffffff" }}>
                  <th style={th}>SI NO</th>
                  <th style={{ ...th, textAlign: "left" }}>DESCRIPTION</th>
                  <th style={th}>QTY</th>
                  <th style={th}>UNIT</th>
                </tr>
              </thead>
              <tbody>
                {[...bomItems, ...items].map((it: any, i: number) => (
                  <tr key={it.id ?? i}>
                    <td style={td}>{i + 1}</td>
                    <td style={{ ...td, textAlign: "left" }}>{it.description}</td>
                    <td style={td}>{it.quantity}</td>
                    <td style={td}>{it.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <table style={{ marginTop: 12, marginLeft: "auto", borderCollapse: "collapse", minWidth: 340 }}>
            <tbody>
              <Row label="Subtotal (Excluding VAT)" value={`${cur} ${money(quotation.subtotal)}`} />
              {Number(quotation.discount_amount ?? 0) > 0 && (
                <Row label="Discount" value={`- ${cur} ${money(quotation.discount_amount)}`} />
              )}
              <Row label="Lumpsum Price (Excluding VAT)" value={`${cur} ${money(net)}`} />
              <Row label={`${Number(quotation.vat_percent ?? 0)}% VAT`} value={`${cur} ${money(vatAmount)}`} />
              <tr>
                <td style={{ ...td, textAlign: "left", fontWeight: 700, background: "#e2e8f0" }}>Grand Total (Including VAT)</td>
                <td style={{ ...td, fontWeight: 700, background: "#e2e8f0" }}>{cur} {money(quotation.total_amount)}</td>
              </tr>
            </tbody>
          </table>

          <div style={{ marginTop: 16, fontSize: 11 }}>
            <div style={{ fontWeight: 700, textDecoration: "underline", color: "#103a52" }}>TERMS &amp; CONDITIONS</div>
            <div style={{ marginTop: 6 }}><strong>Validity</strong> : {validity} Days</div>
            <div><strong>Payment</strong> : {paymentTerms}</div>
            {quotation.delivery_terms && <div><strong>Delivery</strong> : {quotation.delivery_terms}</div>}
            {quotation.scope_notes && <div><strong>Note</strong> : {quotation.scope_notes}</div>}
          </div>

          <p style={{ marginTop: 14, fontSize: 11 }}>
            We trust our requirement and looking forward for your valued order for the above project. Should you
            require any further clarification or assistance, please do not hesitate to contact to
            {" "}Mr. <strong>{preparerName || "our office"}</strong>
            {preparerPhone ? <> on <strong>{preparerPhone}</strong></> : null}.
          </p>

          {isApproved && (
            <div style={{ marginTop: 16, padding: 8, border: "1px solid #103a52", background: "#f0f9ff", fontSize: 11, color: "#103a52" }}>
              <strong>Note:</strong> Quotation is generated and Approved by the System.
            </div>
          )}

          <div style={{ marginTop: 24, fontSize: 11 }}>
            <p style={{ margin: 0 }}>Thanks &amp; Best Regards,</p>
            <p style={{ margin: 0 }}>Sincerely,</p>
            <p style={{ margin: 0 }}>For, SAMA Safety &amp; Security,</p>
            <p style={{ margin: "12px 0 0", fontWeight: 700 }}>Mr Ali Yousif Awachi</p>
            <p style={{ margin: 0 }}>General Manager</p>
            <p style={{ margin: 0 }}>Ph: +973 39400147</p>
          </div>
        </div>
      </div>
    </>
  );
}

const th: React.CSSProperties = { border: "1px solid #103a52", padding: "6px 8px", fontSize: 11, textAlign: "center" };
const td: React.CSSProperties = { border: "1px solid #cbd5e1", padding: "6px 8px", fontSize: 11, textAlign: "center" };

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td style={{ ...td, textAlign: "left" }}>{label}</td>
      <td style={td}>{value}</td>
    </tr>
  );
}
