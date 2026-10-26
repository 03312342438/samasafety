import { describe, expect, it } from "vitest";
import { inspectionDefaults, inspectionKey, inspectionDefects, toggleInspection, inspectionRows } from "./report-inspections";

describe("requested inspection rules", () => {
  it("groups multiple faulty points under one alarm system", () => {
    const answers = inspectionDefaults(["FA", "GAS"]);
    answers[inspectionKey("Fire Alarm System", "Detectors")] = "Fault";
    answers[inspectionKey("Fire Alarm System", "Control Panel")] = "Fault";
    answers[inspectionKey("Gas Detection System", "Emergency Stop Button")] = "Fault";
    expect(inspectionDefects(answers)).toEqual(["Fire Alarm System - Control Panel, Detectors", "Gas Detection System - Emergency Stop Button"]);
  });
  it("removes defects after OK or N/A", () => {
    const answers = inspectionDefaults(["FA"]);
    answers[inspectionKey("Fire Alarm System", "Detectors")] = "Fault";
    expect(inspectionDefects(answers)).toHaveLength(1);
    for (const result of ["OK"]) {
      answers[inspectionKey("Fire Alarm System", "Detectors")] = result;
      expect(inspectionDefects(answers)).toEqual([]);
    }
  });
  it("includes only defective or rectification conditions", () => {
    const answers = inspectionDefaults(["FF", "CCTV"]);
    for (const condition of ["Defective", "Requires Rectification"]) {
      answers[inspectionKey("Fire Hose Reel", "Condition")] = condition;
      answers[inspectionKey("CCTV", "Condition")] = condition;
      expect(inspectionDefects(answers)).toEqual(["Fire Hose Reel", "CCTV"]);
    }
    for (const condition of ["Good", "Not Checked"]) {
      answers[inspectionKey("Fire Hose Reel", "Condition")] = condition;
      answers[inspectionKey("CCTV", "Condition")] = condition;
      expect(inspectionDefects(answers)).toEqual([]);
    }
  });
  it("removing sub-system or main system clears its answers and defects", () => {
    const answers = inspectionDefaults(["FA"]);
    answers[inspectionKey("Fire Alarm System", "Detectors")] = "Fault";
    for (const system of ["Fire Alarm System", "Fire Alarm"]) {
      const next = toggleInspection(answers, system, false);
      expect(inspectionDefects(next)).toEqual([]);
      expect(next[inspectionKey("Fire Alarm System", "Detectors")]).toBeUndefined();
      expect(inspectionRows(next, "Fire Alarm")).toEqual([]);
    }
  });
  it("uses one shared extinguisher condition with Other type and quantity", () => {
    const answers = inspectionDefaults(["FE"]);
    answers[inspectionKey("Fire Extinguishers", "Other Type")] = "Wet chemical";
    answers[inspectionKey("Fire Extinguishers", "Other QTY")] = "3";
    answers[inspectionKey("Fire Extinguishers", "Condition")] = "Defective";
    expect(inspectionRows(answers, "Fire Fighting")).toEqual([{ label: "Fire Extinguishers", value: "Defective" }]);
    expect(answers[inspectionKey("Fire Extinguishers", "Other Type")]).toBe("Wet chemical");
    expect(answers[inspectionKey("Fire Extinguishers", "Other QTY")]).toBe("3");
    expect(inspectionDefects(answers)).toEqual(["Fire Extinguishers"]);
  });
});