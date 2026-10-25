export const MAIN_SYSTEMS = ["Fire Alarm", "Fire Fighting", "CCTV"] as const;
export type MainSystem = (typeof MAIN_SYSTEMS)[number];
export const ALARM_RESULTS = ["OK", "Fault", "N/A"];
export const CONDITIONS = ["Good", "Requires Rectification", "Defective", "Not Checked"];
export const EXTINGUISHER_TYPES = ["DCP", "CO2", "Water", "Foam", "ADCP", "Other"];
export const SUBSYSTEMS: Record<MainSystem, string[]> = {
  "Fire Alarm": ["Fire Alarm System", "Gas Detection System"],
  "Fire Fighting": ["Fire Extinguishers", "Fire Suppression System", "Fire Hose Reel", "Fire Pump", "Sprinkler System"],
  CCTV: [],
};
export const INSPECTION_POINTS: Record<string, string[]> = {
  "Fire Alarm System": ["Control Panel", "Detectors", "Manual Call Points", "Sounders & Flashers", "Power Supply & Batteries", "System Testing"],
  "Gas Detection System": ["Gas Detection Control Panel", "Gas Detectors", "Emergency Stop Button", "Automatic Gas Shut-Off Solenoid Valve", "Power Supply & Batteries", "System Testing"],
};
export const inspectionKey = (system: string, field: string) => `inspection::${system}::${field}`;
export const isModernInspection = (answers: Record<string, string>) => answers["inspection::version"] === "2";
export const mainSelected = (answers: Record<string, string>, main: string) => answers[inspectionKey(main, "selected")] === "yes";
export const selectedSubsystems = (answers: Record<string, string>, main: MainSystem) =>
  mainSelected(answers, main) ? SUBSYSTEMS[main].filter((sub) => answers[inspectionKey(sub, "selected")] === "yes") : [];

export function toggleInspection(answers: Record<string, string>, system: string, selected: boolean): Record<string, string> {
  const next = { ...answers, "inspection::version": "2", [inspectionKey(system, "selected")]: selected ? "yes" : "" };
  if (!selected) {
    const descendants = SUBSYSTEMS[system as MainSystem] ?? [];
    for (const key of Object.keys(next)) {
      if (key.startsWith(`inspection::${system}::`) || descendants.some((sub) => key.startsWith(`inspection::${sub}::`))) delete next[key];
    }
  }
  return next;
}

export function inspectionDefaults(types: string[]): Record<string, string> {
  let answers: Record<string, string> = { "inspection::version": "2" };
  const mapping: Record<string, [MainSystem, string[]]> = {
    FA: ["Fire Alarm", ["Fire Alarm System"]], GAS: ["Fire Alarm", ["Gas Detection System"]],
    FF: ["Fire Fighting", ["Fire Hose Reel", "Fire Pump", "Sprinkler System"]],
    FE: ["Fire Fighting", ["Fire Extinguishers"]], FS: ["Fire Fighting", ["Fire Suppression System"]],
    FSCP: ["Fire Fighting", ["Fire Suppression System"]], FSC: ["Fire Fighting", ["Fire Suppression System"]], CCTV: ["CCTV", []],
  };
  for (const type of types) {
    const mapped = mapping[type];
    if (!mapped) continue;
    answers = toggleInspection(answers, mapped[0], true);
    for (const sub of mapped[1]) answers = toggleInspection(answers, sub, true);
  }
  return answers;
}

export function inspectionDefects(answers: Record<string, string>): string[] {
  const defects: string[] = [];
  for (const main of MAIN_SYSTEMS) {
    if (!mainSelected(answers, main)) continue;
    for (const sub of main === "CCTV" ? ["CCTV"] : selectedSubsystems(answers, main)) {
      const points = INSPECTION_POINTS[sub];
      if (points) {
        const faulty = points.filter((point) => answers[inspectionKey(sub, point)] === "Fault");
        if (faulty.length) defects.push(`${sub} - ${faulty.join(", ")}`);
      } else if (["Requires Rectification", "Defective"].includes(answers[inspectionKey(sub, "Condition")])) defects.push(sub);
    }
  }
  return defects;
}

export type InspectionRow = { label: string; value: string };
export function inspectionRows(answers: Record<string, string>, main: MainSystem): InspectionRow[] {
  const rows: InspectionRow[] = [];
  for (const sub of main === "CCTV" ? ["CCTV"] : selectedSubsystems(answers, main)) {
    const get = (field: string) => answers[inspectionKey(sub, field)] || "-";
    if (INSPECTION_POINTS[sub]) {
      rows.push({ label: sub, value: `${sub === "Fire Alarm System" ? `Type: ${get("System Type")} | ` : ""}Brand: ${get("Brand")}` });
      for (const point of INSPECTION_POINTS[sub]) rows.push({ label: point, value: get(point) });
    } else {
      const details = sub === "Fire Suppression System" ? `Type: ${get("System Type")} | ` : sub === "Fire Hose Reel" ? `QTY: ${get("QTY")} | ` : "";
      rows.push({ label: sub, value: `${details}${get("Condition")}` });
    }
  }
  return rows;
}