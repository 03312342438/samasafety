import { forwardRef, type CSSProperties, type ReactNode } from "react";
import { SAMA_LOGO_BASE64 } from "@/lib/logo";
import { LEFT_DEVICES, RIGHT_DEVICES, devicesFor, deviceKey, type ReportData } from "@/lib/report-constants";
import { intervalLabel } from "@/lib/maintenance-schedule";
import { SYSTEM_LABELS, type SystemType } from "@/lib/maintenance-contracts";

const NAVY = "#123f5a";
const BLUE = "#51a9d6";
const INK = "#172b3a";
const MUTED = "#657785";
const LINE = "#d7e1e7";
const PALE = "#f3f7f9";
const WHITE = "#ffffff";

function fmtDate(value: string) {
  if (!value) return "—";
  const parts = value.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return value;
}

const cell: CSSProperties = {
  borderBottom: `1px solid ${LINE}`,
  padding: "7px 9px",
  fontSize: 10.5,
  verticalAlign: "middle",
  color: INK,
  wordBreak: "break-word",
};

const headCell: CSSProperties = {
  ...cell,
  background: PALE,
  color: NAVY,
  fontSize: 9,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const sectionStyle: CSSProperties = {
  border: `1px solid ${LINE}`,
  borderRadius: 4,
  overflow: "hidden",
  marginBottom: 11,
  breakInside: "avoid",
  pageBreakInside: "avoid",
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section data-pdf-section="true" style={sectionStyle}>
      <div
        style={{
          borderLeft: `4px solid ${BLUE}`,
          background: PALE,
          color: NAVY,
          fontSize: 9.5,
          fontWeight: 700,
          letterSpacing: "0.09em",
          padding: "8px 10px",
          textTransform: "uppercase",
        }}
      >
        {title}
      </div>
      {children}
    </section>
  );
}

function Detail({ label, value, wide = false }: { label: string; value: ReactNode; wide?: boolean }) {
  return (
    <div style={{ gridColumn: wide ? "span 2" : undefined, minWidth: 0 }}>
      <div style={{ color: MUTED, fontSize: 8, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ color: INK, fontSize: 10.5, fontWeight: 600, marginTop: 3, minHeight: 14, wordBreak: "break-word" }}>
        {value || "—"}
      </div>
    </div>
  );
}

type Props = { data: ReportData };

export const ReportDocument = forwardRef<HTMLDivElement, Props>(({ data }, ref) => {
  const total = data.spare_parts.reduce((sum, part) => {
    const value = Number.parseFloat(part.total);
    return sum + (Number.isNaN(value) ? 0 : value);
  }, 0);
  const filledSpares = data.spare_parts.filter(
    (part) => part.spare_no || part.description || part.qty || part.unit_price || part.total,
  );
  const spareRows = filledSpares.length
    ? filledSpares
    : [{ spare_no: "", description: "No spare parts or consumables used", qty: "", unit_price: "", total: "" }];
  const systemTypes = data.system_types?.length
    ? data.system_types
    : data.system_type
      ? [data.system_type]
      : [];
  const systemNames = systemTypes
    .map((system) => SYSTEM_LABELS[system as SystemType] ?? system)
    .join(", ");

  const deviceMark = (name: string, faulty: boolean) => {
    const status = data.devices[name];
    if (faulty) return status === "faulty" ? "FAULTY" : "";
    return status === "ok" ? "OK" : "";
  };

  const statusMark = (active: boolean, faulty = false) => (
    active ? (
      <span
        style={{
          display: "inline-block",
          minWidth: 37,
          borderRadius: 10,
          background: faulty ? "#fdebec" : "#e8f4ee",
          color: faulty ? "#a43b43" : "#2f6f52",
          fontSize: 8,
          fontWeight: 700,
          padding: "3px 6px",
        }}
      >
        {faulty ? "FAULTY" : "OK"}
      </span>
    ) : ""
  );

  return (
    <div
      ref={ref}
      style={{
        width: 794,
        minHeight: 1123,
        background: WHITE,
        color: INK,
        fontFamily: "Arial, Helvetica, sans-serif",
        padding: "30px 32px 34px",
        boxSizing: "border-box",
      }}
    >
      <section data-pdf-section="true" style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
        <header style={{ borderBottom: `3px solid ${NAVY}`, paddingBottom: 13, marginBottom: 13 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
            <img src={SAMA_LOGO_BASE64} alt="Sama Safety & Security" style={{ width: 158, height: "auto" }} />
            <div style={{ textAlign: "right" }}>
              <div style={{ color: NAVY, fontSize: 20, fontWeight: 700, letterSpacing: "0.02em", textTransform: "uppercase" }}>
                Maintenance Service Report
              </div>
              <div style={{ color: MUTED, fontSize: 9.5, marginTop: 5 }}>
                MSR {data.msr_no || "Pending"} &nbsp;•&nbsp; Our Ref. {data.our_ref_no || "Pending"}
              </div>
            </div>
          </div>
        </header>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "13px 20px",
            background: PALE,
            border: `1px solid ${LINE}`,
            borderRadius: 4,
            padding: "13px 15px",
            marginBottom: 11,
          }}
        >
          <Detail label="Client" value={data.client_name} />
          <Detail label="Project" value={data.project} />
          <Detail label="Service Date" value={fmtDate(data.report_date)} />
          <Detail label="Contract No." value={data.contract} />
          <Detail label="Order No." value={data.order_no} />
          <Detail label="Date Completed" value={fmtDate(data.date_completed || data.report_date)} />
          <Detail label="Site / Location" value={data.site_location} />
          <Detail label="System Type" value={systemNames || "General system"} wide />
          <Detail label="Client Email" value={data.client_email} wide />
        </div>
      </section>

      {systemTypes.length ? (
        systemTypes.map((system) => (
          <Section key={system} title={`${SYSTEM_LABELS[system as SystemType] ?? system} · Inspection checklist`}>
            <table style={{ borderCollapse: "collapse", width: "100%", tableLayout: "fixed" }}>
              <thead>
                <tr>
                  <th style={headCell}>Device / Inspection Point</th>
                  <th style={{ ...headCell, width: 67, textAlign: "center" }}>OK</th>
                  <th style={{ ...headCell, width: 67, textAlign: "center" }}>Faulty</th>
                  <th style={{ ...headCell, width: 58, textAlign: "center" }}>Qty</th>
                </tr>
              </thead>
              <tbody>
                {devicesFor(system).map((device) => {
                  const status = data.devices[deviceKey(system, device.name)];
                  return (
                    <tr key={device.name}>
                      <td style={{ ...cell, fontWeight: 600 }}>{device.name}</td>
                      <td style={{ ...cell, textAlign: "center" }}>
                        {device.kind !== "qty" ? statusMark(status === "ok") : ""}
                      </td>
                      <td style={{ ...cell, textAlign: "center" }}>
                        {device.kind !== "qty" ? statusMark(status === "faulty", true) : ""}
                      </td>
                      <td style={{ ...cell, textAlign: "center", fontWeight: 600 }}>
                        {device.kind !== "status" ? data.devices[deviceKey(system, device.name, "qty")] ?? "" : ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Section>
        ))
      ) : (
        <Section title="Inspection checklist">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
            {[LEFT_DEVICES, RIGHT_DEVICES].map((items, columnIndex) => (
              <table
                key={columnIndex}
                style={{ borderCollapse: "collapse", width: "100%", tableLayout: "fixed", borderLeft: columnIndex ? `1px solid ${LINE}` : undefined }}
              >
                <thead>
                  <tr>
                    <th style={headCell}>Device</th>
                    <th style={{ ...headCell, width: 55, textAlign: "center" }}>OK</th>
                    <th style={{ ...headCell, width: 62, textAlign: "center" }}>Faulty</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((name) => (
                    <tr key={name}>
                      <td style={{ ...cell, fontWeight: 600 }}>{name}</td>
                      <td style={{ ...cell, textAlign: "center" }}>{statusMark(deviceMark(name, false) === "OK")}</td>
                      <td style={{ ...cell, textAlign: "center" }}>{statusMark(deviceMark(name, true) === "FAULTY", true)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ))}
          </div>
        </Section>
      )}

      <Section title="Spare parts & consumables">
        <table style={{ borderCollapse: "collapse", width: "100%", tableLayout: "fixed" }}>
          <thead>
            <tr>
              <th style={{ ...headCell, width: 88 }}>Item No.</th>
              <th style={headCell}>Description</th>
              <th style={{ ...headCell, width: 55, textAlign: "center" }}>Qty</th>
              <th style={{ ...headCell, width: 78, textAlign: "right" }}>Unit Price</th>
              <th style={{ ...headCell, width: 78, textAlign: "right" }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {spareRows.map((part, index) => (
              <tr key={index}>
                <td style={cell}>{part.spare_no}</td>
                <td style={cell}>{part.description}</td>
                <td style={{ ...cell, textAlign: "center" }}>{part.qty}</td>
                <td style={{ ...cell, textAlign: "right" }}>{part.unit_price}</td>
                <td style={{ ...cell, textAlign: "right" }}>{part.total}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={3} style={{ ...cell, borderBottom: 0 }} />
              <td style={{ ...headCell, textAlign: "right", borderBottom: 0 }}>Total</td>
              <td style={{ ...cell, textAlign: "right", borderBottom: 0, fontWeight: 700 }}>{total.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section title="Maintenance schedule">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px", padding: "12px 14px" }}>
          <Detail label="Maintenance Interval" value={intervalLabel(data.maintenance_interval_value, data.maintenance_interval_unit)} />
          <Detail label="No. of Maintenances" value={data.maintenance_count} />
          {data.next_maintenance ? <Detail label="Notes" value={data.next_maintenance} wide /> : null}
        </div>
      </Section>

      <Section title="Service summary">
        <div style={{ minHeight: 62, padding: "11px 13px", fontSize: 10.5, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
          {data.action_taken || "No action details recorded."}
        </div>
        {data.remarks ? (
          <div style={{ borderTop: `1px solid ${LINE}`, padding: "9px 13px", fontSize: 10, lineHeight: 1.45 }}>
            <strong style={{ color: NAVY }}>Remarks: </strong>{data.remarks}
          </div>
        ) : null}
      </Section>

      <section data-pdf-section="true" style={{ ...sectionStyle, marginBottom: 0 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
          <div style={{ borderRight: `1px solid ${LINE}`, padding: "13px 15px" }}>
            <div style={{ color: NAVY, fontSize: 9, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase" }}>
              Technician validation
            </div>
            <div style={{ height: 58, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {data.employee_signature ? <img src={data.employee_signature} alt="Employee signature" style={{ maxHeight: 52, maxWidth: "78%" }} /> : null}
            </div>
            <div style={{ borderTop: `1px solid ${LINE}`, paddingTop: 8, fontSize: 10 }}>
              <strong>{data.performed_by || "—"}</strong>
              <div style={{ color: MUTED, fontSize: 8.5, marginTop: 2 }}>Performed by</div>
            </div>
          </div>
          <div style={{ padding: "13px 15px" }}>
            <div style={{ color: NAVY, fontSize: 9, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase" }}>
              Client acknowledgement
            </div>
            <div style={{ height: 58, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {data.client_signature ? <img src={data.client_signature} alt="Client signature" style={{ maxHeight: 52, maxWidth: "78%" }} /> : null}
            </div>
            <div style={{ borderTop: `1px solid ${LINE}`, paddingTop: 8, fontSize: 10 }}>
              <strong>{data.client_sign_name || "—"}</strong>
              <span style={{ color: MUTED }}> · {data.client_designation || "Designation not stated"}</span>
              <div style={{ color: MUTED, fontSize: 8.5, marginTop: 2 }}>Completed {fmtDate(data.date_completed || data.report_date)}</div>
            </div>
          </div>
        </div>
      </section>

      <div
        data-pdf-footer="true"
        style={{
          borderTop: `3px solid ${BLUE}`,
          background: NAVY,
          color: WHITE,
          textAlign: "center",
          fontSize: 8.5,
          padding: "9px 8px",
          lineHeight: 1.45,
          marginTop: 13,
        }}
      >
        Tel: 00973 17684492 · Fax: 00973 17684856 · P.O. Box 75873, Juffair, Kingdom of Bahrain
        <br />
        CR No. 67898-1 · sama@samasafety.net · www.samasafety.net
      </div>
    </div>
  );
});

ReportDocument.displayName = "ReportDocument";