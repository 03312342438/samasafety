import { forwardRef, type CSSProperties, type ReactNode } from "react";
import { SAMA_LOGO_BASE64 } from "@/lib/logo";
import { devicesFor, deviceKey, type ReportData } from "@/lib/report-constants";
import { intervalLabel } from "@/lib/maintenance-schedule";
import { SYSTEM_LABELS, type SystemType } from "@/lib/maintenance-contracts";

const BLUE = "#579bd3";
const NAVY = "#113f57";
const RED = "#d82332";
const INK = "#111827";
const LINE = "#26343d";
const SOFT = "#eef5f8";
const WHITE = "#ffffff";

function fmtDate(value: string) {
  if (!value) return "—";
  const parts = value.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return value;
}

const box: CSSProperties = {
  border: `1px solid ${LINE}`,
  minHeight: 20,
  padding: "4px 6px",
  boxSizing: "border-box",
  overflowWrap: "anywhere",
};

function Value({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ ...box, color: INK, fontSize: 9, fontWeight: 600, ...style }}>{children || "—"}</div>;
}

function Label({ children, accent = false }: { children: ReactNode; accent?: boolean }) {
  return (
    <div
      style={{
        color: accent ? RED : INK,
        fontSize: 8,
        fontWeight: 800,
        lineHeight: 1.15,
        textTransform: "uppercase",
      }}
    >
      {children}
    </div>
  );
}

function Field({ label, value, accent = false }: { label: string; value: ReactNode; accent?: boolean }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "82px 1fr", alignItems: "center", gap: 5, minWidth: 0 }}>
      <Label accent={accent}>{label}</Label>
      <Value>{value}</Value>
    </div>
  );
}

function RuledSection({
  title,
  children,
  minHeight = 48,
  grow = 1,
}: {
  title: string;
  children: ReactNode;
  minHeight?: number;
  grow?: number;
}) {
  return (
    <section
      data-pdf-section="true"
      style={{
        border: `1px solid ${LINE}`,
        borderTop: 0,
        minHeight,
        padding: "5px 6px",
        flex: `${grow} 1 ${minHeight}px`,
      }}
    >
      <Label>{title}</Label>
      <div style={{ marginTop: 4 }}>{children}</div>
    </section>
  );
}

type Props = { data: ReportData };

export const ReportDocument = forwardRef<HTMLDivElement, Props>(({ data }, ref) => {
  const systemTypes = data.system_types?.length
    ? data.system_types
    : data.system_type
      ? data.system_type.split(",").map((item) => item.trim()).filter(Boolean)
      : [];
  const filledSpares = data.spare_parts.filter(
    (part) => part.spare_no || part.description || part.qty || part.unit_price || part.total,
  );
  const total = filledSpares.reduce((sum, part) => {
    const value = Number.parseFloat(part.total);
    return sum + (Number.isNaN(value) ? 0 : value);
  }, 0);
  const faulty = systemTypes.flatMap((system) =>
    devicesFor(system)
      .filter((device) => data.devices[deviceKey(system, device.name)] === "faulty")
      .map((device) => {
        const quantity = data.devices[deviceKey(system, device.name, "qty")];
        return `${system} — ${device.name}${quantity ? ` (Qty ${quantity})` : ""}`;
      }),
  );
  const reportNo = data.msr_no || "Pending";

  return (
    <div
      ref={ref}
      data-pdf-one-page="true"
      style={{
        width: 794,
        height: 1123,
        background: WHITE,
        color: INK,
        fontFamily: "Arial, Helvetica, sans-serif",
        padding: "28px 36px 0",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <section data-pdf-section="true">
        <header style={{ display: "grid", gridTemplateColumns: "190px 1fr 210px", alignItems: "center", gap: 14 }}>
          <img src={SAMA_LOGO_BASE64} alt="Sama Safety & Security" style={{ width: 166, height: "auto" }} />
          <div style={{ color: INK, fontSize: 16, fontWeight: 800, lineHeight: 1.05, textAlign: "center" }}>
            Maintenance &amp; Job
            <br />
            Completion Report
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, fontWeight: 800 }}>Sama Safety &amp; Security</div>
            <div style={{ color: "#6b7280", fontSize: 7.5, marginTop: 4 }}>
              Fire Alarm&nbsp; | &nbsp;Fire Fighting&nbsp; | &nbsp;Extinguishers&nbsp; | &nbsp;Maintenance
            </div>
          </div>
        </header>
        <div style={{ height: 3, background: BLUE, margin: "10px 0 7px" }} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, alignItems: "center", marginBottom: 6 }}>
          <Field label="M.S.R No." value={reportNo} accent />
          <Field label="Our Ref" value={data.our_ref_no} accent />
          <Field label="Order No." value={data.order_no} accent />
        </div>

        <div style={{ border: `1px solid ${LINE}`, padding: 6 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: 8 }}>
            <Field label="Customer M/s" value={data.client_name} />
            <Field label="Site" value={data.site_location} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: 8, marginTop: 5 }}>
            <Field label="Project" value={data.project} />
            <Field label="Date" value={fmtDate(data.report_date)} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: 8, marginTop: 5 }}>
            <Field label="Contract No." value={data.contract} />
            <Field label="Completed" value={fmtDate(data.date_completed || data.report_date)} />
          </div>
        </div>
      </section>

      <section data-pdf-section="true" style={{ border: `1px solid ${LINE}`, borderTop: 0, padding: "6px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "92px 1fr", gap: 7 }}>
          <Label>System details</Label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px" }}>
            {(systemTypes.length ? systemTypes : ["General"]).map((system) => (
              <span key={system} style={{ fontSize: 8.5, fontWeight: 700 }}>
                <span style={{ color: RED, marginRight: 4 }}>■</span>
                {SYSTEM_LABELS[system as SystemType] ?? system}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section data-pdf-section="true" style={{ border: `1px solid ${LINE}`, borderTop: 0, padding: "5px 6px" }}>
        <Label>Inspection checklist</Label>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: systemTypes.length > 1 ? "1fr 1fr" : "1fr",
            gap: 5,
            marginTop: 4,
          }}
        >
          {(systemTypes.length ? systemTypes : [""]).map((system) => (
            <div key={system || "general"} style={{ border: `1px solid ${LINE}`, breakInside: "avoid" }}>
              <div style={{ background: SOFT, borderBottom: `1px solid ${LINE}`, padding: "3px 5px", fontSize: 8, fontWeight: 800 }}>
                {system ? SYSTEM_LABELS[system as SystemType] ?? system : "GENERAL SYSTEM"}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 38px 42px 36px", fontSize: 7.4 }}>
                <strong style={{ padding: "2px 4px" }}>DEVICE / POINT</strong>
                <strong style={{ padding: "2px", textAlign: "center" }}>OK</strong>
                <strong style={{ padding: "2px", textAlign: "center" }}>FAULT</strong>
                <strong style={{ padding: "2px", textAlign: "center" }}>QTY</strong>
                {devicesFor(system).map((device) => {
                  const key = system ? deviceKey(system, device.name) : device.name;
                  const status = data.devices[key];
                  const qty = data.devices[deviceKey(system, device.name, "qty")] ?? "";
                  return (
                    <div key={key} style={{ display: "contents" }}>
                      <span style={{ borderTop: `1px solid ${LINE}`, padding: "2px 4px", fontWeight: 600 }}>{device.name}</span>
                      <span style={{ borderLeft: `1px solid ${LINE}`, borderTop: `1px solid ${LINE}`, padding: 2, textAlign: "center", color: status === "ok" ? NAVY : INK }}>
                        {status === "ok" ? "✓" : ""}
                      </span>
                      <span style={{ borderLeft: `1px solid ${LINE}`, borderTop: `1px solid ${LINE}`, padding: 2, textAlign: "center", color: status === "faulty" ? RED : INK }}>
                        {status === "faulty" ? "✓" : ""}
                      </span>
                      <span style={{ borderLeft: `1px solid ${LINE}`, borderTop: `1px solid ${LINE}`, padding: 2, textAlign: "center", fontWeight: 700 }}>{qty}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <RuledSection title="Defects" minHeight={44} grow={1.35}>
        <div style={{ fontSize: 8.5, lineHeight: 1.35, whiteSpace: "pre-wrap" }}>
          {faulty.length ? faulty.join("; ") : "No defects recorded."}
        </div>
      </RuledSection>

      <RuledSection title="Action taken" minHeight={52} grow={1}>
        <div style={{ fontSize: 8.5, lineHeight: 1.4, whiteSpace: "pre-wrap" }}>{data.action_taken || "No action details recorded."}</div>
      </RuledSection>

      <RuledSection title="Comments / remarks" minHeight={42} grow={0.75}>
        <div style={{ fontSize: 8.5, lineHeight: 1.4, whiteSpace: "pre-wrap" }}>{data.remarks || "—"}</div>
      </RuledSection>

      <section data-pdf-section="true" style={{ border: `1px solid ${LINE}`, borderTop: 0 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
          <div style={{ padding: "5px 6px", borderRight: `1px solid ${LINE}` }}>
            <Label>Spare parts / consumables</Label>
            <div style={{ marginTop: 4, fontSize: 8, lineHeight: 1.4 }}>
              {filledSpares.length
                ? filledSpares.map((part) => `${part.spare_no || "—"} · ${part.description || "—"} · Qty ${part.qty || "—"}`).join("\n")
                : "None used"}
            </div>
          </div>
          <div style={{ padding: "5px 6px" }}>
            <Label>Next maintenance</Label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginTop: 4, fontSize: 8 }}>
              <span><strong>Interval:</strong> {intervalLabel(data.maintenance_interval_value, data.maintenance_interval_unit)}</span>
              <span><strong>Visits:</strong> {data.maintenance_count || "—"}</span>
              <span style={{ gridColumn: "span 2" }}><strong>Notes:</strong> {data.next_maintenance || "—"}</span>
              {filledSpares.length ? <span style={{ gridColumn: "span 2" }}><strong>Parts total:</strong> {total.toFixed(2)}</span> : null}
            </div>
          </div>
        </div>
      </section>

      <section data-pdf-section="true" style={{ border: `1px solid ${LINE}`, borderTop: 0 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
          <div style={{ padding: "6px", borderRight: `1px solid ${LINE}` }}>
            <Label accent>To be filled by technician</Label>
            <div style={{ height: 38, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {data.employee_signature ? <img src={data.employee_signature} alt="Employee signature" style={{ maxHeight: 35, maxWidth: "75%" }} /> : null}
            </div>
            <Field label="Engineer" value={data.performed_by} />
          </div>
          <div style={{ padding: "6px" }}>
            <Label>Client acknowledgement</Label>
            <div style={{ height: 38, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {data.client_signature ? <img src={data.client_signature} alt="Client signature" style={{ maxHeight: 35, maxWidth: "75%" }} /> : null}
            </div>
            <Field label="Client name" value={`${data.client_sign_name || "—"}${data.client_designation ? ` · ${data.client_designation}` : ""}`} />
          </div>
        </div>
      </section>

      <div style={{ marginTop: "auto" }}>
        <div style={{ border: `1px solid ${LINE}`, borderBottom: 0, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", padding: "5px 6px", fontSize: 7.5 }}>
          <span><strong>Issue No.</strong> 01</span>
          <span style={{ textAlign: "center" }}><strong>Revision:</strong> 00</span>
          <span style={{ textAlign: "right" }}><strong>Document No.</strong> SAMA-MSR-001</span>
        </div>
        <div
          data-pdf-footer="true"
          style={{
            borderTop: `3px solid ${BLUE}`,
            background: NAVY,
            color: WHITE,
            textAlign: "center",
            fontSize: 8,
            padding: "9px 8px 10px",
            lineHeight: 1.5,
          }}
        >
          Tel: 00973 17684492 · Fax: 00973 17684856 · P.O. Box 75873, Juffair, Kingdom of Bahrain
          <br />
          CR No. 67898-1 · sama@samasafety.net · www.samasafety.net
        </div>
      </div>
    </div>
  );
});

ReportDocument.displayName = "ReportDocument";