import { forwardRef, useRef, useState, type CSSProperties, type ReactNode } from "react";
import samaLogo from "@/assets/sama-logo.png.asset.json";
import { SYSTEM_LABELS, type SystemType } from "@/lib/maintenance-contracts";
import { downloadElementAsPdf } from "@/lib/generate-pdf";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

// Fixed print palette matching the SAMA maintenance report (PDF output, not themed UI).
const BLUE = "#579bd3";
const NAVY = "#113f57";
const RED = "#d82332";
const INK = "#111827";
const LINE = "#26343d";
const WHITE = "#ffffff";

const fmtDate = (v?: string | null) => {
  if (!v) return "—";
  const p = String(v).slice(0, 10).split("-");
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : String(v);
};
const fmtDateTime = (v?: string | null) => {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

const box: CSSProperties = { border: `1px solid ${LINE}`, minHeight: 20, padding: "4px 6px", boxSizing: "border-box", overflowWrap: "anywhere" };
const Lbl = ({ children, accent }: { children: ReactNode; accent?: boolean }) => (
  <div style={{ color: accent ? RED : INK, fontSize: 8, fontWeight: 800, textTransform: "uppercase", lineHeight: 1.15 }}>{children}</div>
);
const Field = ({ label, value, accent }: { label: string; value: ReactNode; accent?: boolean }) => (
  <div style={{ display: "grid", gridTemplateColumns: "88px 1fr", alignItems: "center", gap: 5, minWidth: 0 }}>
    <Lbl accent={accent}>{label}</Lbl>
    <div style={{ ...box, fontSize: 9, fontWeight: 600 }}>{value || "—"}</div>
  </div>
);
const Ruled = ({ title, text, grow = 1 }: { title: string; text?: string; grow?: number }) => (
  <section style={{ border: `1px solid ${LINE}`, borderTop: 0, padding: "5px 6px", flex: `${grow} 1 60px`, minHeight: 60 }}>
    <Lbl>{title}</Lbl>
    <div style={{ marginTop: 4, fontSize: 9, whiteSpace: "pre-wrap", lineHeight: 1.4 }}>{text || "—"}</div>
  </section>
);

const STATUS: Record<string, string> = { pending: "Not attended", follow_up: "Needs follow-up", closed: "Closed" };

export const CalloutDocument = forwardRef<HTMLDivElement, { data: any }>(({ data }, ref) => {
  const sys = data.system_type ? SYSTEM_LABELS[data.system_type as SystemType] ?? data.system_type : "—";
  const Sign = ({ who, name, sig, date }: { who: string; name: string; sig: string; date: string }) => (
    <div style={{ padding: 6 }}>
      <Lbl>{who}</Lbl>
      <div style={{ display: "grid", gridTemplateColumns: "50px 1fr", gap: 5, alignItems: "center", marginTop: 5, fontSize: 9 }}>
        <span style={{ fontWeight: 700 }}>Name</span><div style={box}>{name || ""}</div>
        <span style={{ fontWeight: 700 }}>Signature</span>
        <div style={{ ...box, height: 46, display: "flex", alignItems: "center" }}>
          {sig ? <img src={sig} alt={`${who} signature`} style={{ maxHeight: 40, maxWidth: "80%" }} /> : null}
        </div>
        <span style={{ fontWeight: 700 }}>Date</span><div style={box}>{date ? fmtDate(date) : ""}</div>
      </div>
    </div>
  );
  return (
    <div
      ref={ref}
      data-pdf-one-page="true"
      style={{ width: 794, height: 1123, background: WHITE, color: INK, fontFamily: "Arial, Helvetica, sans-serif", padding: "28px 36px 0", boxSizing: "border-box", display: "flex", flexDirection: "column", overflow: "hidden" }}
    >
      <header style={{ display: "grid", gridTemplateColumns: "190px 1fr 210px", alignItems: "center", gap: 14 }}>
        <img src={samaLogo.url} alt="Sama Safety & Security" style={{ width: 166, height: "auto" }} />
        <div style={{ fontSize: 16, fontWeight: 800, textAlign: "center" }}>Call-out Report</div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 10, fontWeight: 800 }}>Sama Safety &amp; Security</div>
          <div style={{ color: "#6b7280", fontSize: 7.5, marginTop: 4 }}>Fire Alarm | Fire Fighting | Extinguishers | Maintenance</div>
        </div>
      </header>
      <div style={{ height: 3, background: BLUE, margin: "10px 0 7px" }} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 6 }}>
        <Field label="Call-out No." value={data.reference} accent />
        <Field label="Priority" value={String(data.priority || "normal").toUpperCase()} accent />
        <Field label="Status" value={STATUS[data.status] ?? data.status} accent />
      </div>

      <div style={{ border: `1px solid ${LINE}`, padding: 6, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
        <Field label="Customer M/s" value={data.client_name} />
        <Field label="Site" value={data.site_location} />
        <Field label="Project" value={data.project} />
        <Field label="System Type" value={sys} />
        <Field label="Contact" value={data.contact_person} />
        <Field label="Phone" value={data.contact_phone} />
        <Field label="Call Received" value={fmtDateTime(data.call_received_at)} />
        <Field label="Arrival" value={fmtDateTime(data.arrival_at)} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <Ruled title="Reported Problem" text={data.reported_problem} />
        <Ruled title="Findings" text={data.findings} />
        <Ruled title="Action Taken" text={data.action_taken} />
        <Ruled title="Follow-up Required" text={data.follow_up_notes} />
      </div>

      <section style={{ border: `1px solid ${LINE}`, borderTop: 0, display: "grid", gridTemplateColumns: "1fr 1fr" }}>
        <div style={{ borderRight: `1px solid ${LINE}` }}>
          <Sign who="Technician" name={data.performed_by || data.technician_sign_name} sig={data.technician_signature} date={data.technician_sign_date} />
        </div>
        <Sign who="Client" name={data.client_sign_name} sig={data.client_signature} date={data.client_sign_date} />
      </section>

      <div style={{ marginTop: 10 }}>
        <div style={{ border: `1px solid ${LINE}`, borderBottom: 0, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", padding: "5px 6px", fontSize: 7.5 }}>
          <span><strong>Issue No.</strong> 01</span>
          <span style={{ textAlign: "center" }}><strong>Revision:</strong> 00</span>
          <span style={{ textAlign: "right" }}><strong>Document No.</strong> SAMA-COR-001</span>
        </div>
        <div data-pdf-footer="true" style={{ borderTop: `3px solid ${BLUE}`, background: NAVY, color: WHITE, textAlign: "center", fontSize: 8, padding: "9px 8px 10px", lineHeight: 1.5 }}>
          Tel: 00973 17684492 · Fax: 00973 17684856 · P.O. Box 75873, Juffair, Kingdom of Bahrain
          <br />
          CR No. 67898-1 · sama@samasafety.net · www.samasafety.net
        </div>
      </div>
    </div>
  );
});
CalloutDocument.displayName = "CalloutDocument";

export function CalloutDownloadButton({ data, size = "default" }: { data: any; size?: "default" | "sm" }) {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const handle = async () => {
    if (!ref.current) return;
    setBusy(true);
    try {
      const name = String(data.reference || data.client_name || "callout").replace(/[^a-z0-9-_ ]/gi, "").trim() || "callout";
      await downloadElementAsPdf(ref.current, `Callout_${name}.pdf`);
    } catch (e) {
      console.error(e);
      toast.error("Could not generate PDF");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Button type="button" variant="outline" size={size} onClick={handle} disabled={busy}>
        {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Download className="mr-1 h-4 w-4" />} PDF
      </Button>
      <div style={{ position: "fixed", left: -10000, top: 0, pointerEvents: "none" }} aria-hidden>
        <CalloutDocument ref={ref} data={data} />
      </div>
    </>
  );
}
