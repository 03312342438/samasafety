export const LEFT_DEVICES = [
  "Control Equipment",
  "Sounder Monitoring",
  "Line Monitoring",
  "Indicators",
  "Controls",
  "Fire Brigade Signaling",
] as const;

export const RIGHT_DEVICES = [
  "Power supply",
  "Battery Volage (Qulescent)",
  "Battery Volage (Alarm)",
  "Charging Current",
  "Battery Monitoring",
  "Charger Monitoring",
] as const;

export const ALL_DEVICES = [...LEFT_DEVICES, ...RIGHT_DEVICES];

export type DeviceStatus = "ok" | "faulty";

/**
 * Checklist per system type. "status" = OK / Faulty, "qty" = quantity only,
 * "status_qty" = OK / Faulty plus quantity of defective units.
 */
export type DeviceKind = "status" | "qty" | "status_qty";
export type DeviceDef = { name: string; kind: DeviceKind };

const st = (name: string): DeviceDef => ({ name, kind: "status" });

export const SYSTEM_DEVICES: Record<string, DeviceDef[]> = {
  FA: [
    "Control Equipment",
    "Sounder Monitoring",
    "Line Monitoring",
    "Indicators",
    "Controls",
    "Fire Brigade Signaling",
    "Power Supply",
    "Battery Voltage (Alarm)",
    "Charging Current",
    "Battery Monitoring",
    "Charger Monitoring",
  ].map(st),
  FE: [
    { name: "Type: DCP (qty)", kind: "qty" },
    { name: "Type: Water (qty)", kind: "qty" },
    { name: "Type: CO2 (qty)", kind: "qty" },
    { name: "Type: Foam (qty)", kind: "qty" },
    { name: "Type: ADCP (qty)", kind: "qty" },
    { name: "Pressure and Capacity", kind: "status_qty" },
    { name: "Safety Seal", kind: "status_qty" },
    { name: "Safety Pin", kind: "status_qty" },
  ],
  FF: [
    { name: "Hose Reel (qty)", kind: "qty" },
    ...[
      "Hose Condition",
      "Gate Valve Condition",
      "Box Condition",
      "Electrical Pump",
      "Jockey Pump",
      "Diesel Pump",
      "Pump Battery",
      "Pressure Gauge",
      "Battery Charger",
      "Control Board",
      "Valves",
      "Sprinklers Condition",
    ].map(st),
  ],
  FSCP: [st("Fire Suppression Control Panel")],
  FSC: ["Cylinders Condition", "Cylinder Head", "Discharge Nozzle"].map(st),
};

/** Devices for a system; systems without their own list use the general list. */
export function devicesFor(system: string): DeviceDef[] {
  return SYSTEM_DEVICES[system] ?? ALL_DEVICES.map(st);
}

/** Storage key of a device answer inside report.devices. */
export const deviceKey = (system: string, name: string, part: "status" | "qty" = "status") =>
  `${system}::${name}${part === "qty" ? "::qty" : ""}`;

export type SparePart = {
  spare_no: string;
  description: string;
  qty: string;
  unit_price: string;
  total: string;
};

export type VisitSummary = {
  system_type: string;
  completed: number;
  remaining: number;
  next_visit: string;
};

export type ReportData = {
  client_name: string;
  client_email: string;
  contract: string;
  /** System type of the maintenance contract this visit belongs to (FF, FA, FE, CCTV, …). */
  system_type: string;
  order_no: string;
  project: string;
  site_location: string;
  msr_no: string;
  our_ref_no: string;
  report_date: string;
  devices: Record<string, string>;
  /** Systems covered by this report (FA, FF, FE, …). Empty on older reports. */
  system_types: string[];
  /** Contracts (one per system) this visit counts against. */
  contract_ids: string[];
  /** Issued-report snapshot of each system's maintenance progress. */
  visit_summary: VisitSummary[];
  spare_parts: SparePart[];
  action_taken: string;
  remarks: string;
  next_maintenance: string;
  maintenance_count: string;
  maintenance_interval_value: string;
  maintenance_interval_unit: string;
  performed_by: string;
  employee_signature: string;
  client_signature: string;
  client_sign_name: string;
  client_designation: string;
  date_completed: string;
  job_number_id: string;
  customer_id: string;
  project_id: string;
};

export type ReportRecord = ReportData & {
  id: string;
  created_by: string;
  created_at: string;
};

export function recordToForm(r: ReportRecord): ReportData {
  return {
    client_name: r.client_name ?? "",
    client_email: r.client_email ?? "",
    contract: r.contract ?? "",
    system_type: r.system_type ?? "",
    order_no: r.order_no ?? "",
    project: r.project ?? "",
    site_location: r.site_location ?? "",
    msr_no: r.msr_no ?? "",
    our_ref_no: r.our_ref_no ?? "",
    report_date: r.report_date ?? "",
    devices: r.devices ?? {},
    system_types: (r as any).system_types ?? [],
    contract_ids: (r as any).contract_ids ?? [],
    visit_summary: (r as any).visit_summary ?? [],
    spare_parts:
      r.spare_parts && r.spare_parts.length
        ? r.spare_parts
        : [{ spare_no: "", description: "", qty: "", unit_price: "", total: "" }],
    action_taken: r.action_taken ?? "",
    remarks: r.remarks ?? "",
    next_maintenance: r.next_maintenance ?? "",
    maintenance_count: r.maintenance_count ?? "",
    maintenance_interval_value:
      r.maintenance_interval_value === "" || r.maintenance_interval_value == null
        ? ""
        : String(r.maintenance_interval_value),
    maintenance_interval_unit: r.maintenance_interval_unit ?? "months",
    performed_by: r.performed_by ?? "",
    employee_signature: r.employee_signature ?? "",
    client_signature: r.client_signature ?? "",
    client_sign_name: r.client_sign_name ?? "",
    client_designation: r.client_designation ?? "",
    date_completed: r.date_completed ?? "",
    job_number_id: (r as any).job_number_id ?? "",
    customer_id: (r as any).customer_id ?? "",
    project_id: (r as any).project_id ?? "",
  };
}

export function emptyReport(): ReportData {
  const today = new Date().toISOString().slice(0, 10);
  return {
    client_name: "",
    client_email: "",
    contract: "",
    system_type: "",
    order_no: "",
    project: "",
    site_location: "",
    msr_no: "",
    our_ref_no: "",
    report_date: today,
    devices: {},
    system_types: [],
    contract_ids: [],
    visit_summary: [],
    spare_parts: [{ spare_no: "", description: "", qty: "", unit_price: "", total: "" }],
    action_taken: "",
    remarks: "",
    next_maintenance: "",
    maintenance_count: "",
    maintenance_interval_value: "",
    maintenance_interval_unit: "months",
    performed_by: "",
    employee_signature: "",
    client_signature: "",
    client_sign_name: "",
    client_designation: "",
    date_completed: "",
    job_number_id: "",
    customer_id: "",
    project_id: "",
  };
}
