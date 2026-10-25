import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { MAIN_SYSTEMS, SUBSYSTEMS, INSPECTION_POINTS, ALARM_RESULTS, CONDITIONS, EXTINGUISHER_TYPES, inspectionKey, mainSelected, selectedSubsystems, toggleInspection, inspectionDefects } from "@/lib/report-inspections";

function Result({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <Select value={value || "unanswered"} onValueChange={(v) => onChange(v === "unanswered" ? "" : v)}><SelectTrigger aria-label={label}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="unanswered">-</SelectItem>{options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select>;
}

export function ReportInspections({ answers, onChange }: { answers: Record<string, string>; onChange: (answers: Record<string, string>) => void }) {
  const set = (system: string, field: string, value: string) => onChange({ ...answers, [inspectionKey(system, field)]: value });
  const input = (sub: string, field: string, numeric = false) => <Input aria-label={`${sub} ${field}`} type={numeric ? "number" : "text"} min={numeric ? 0 : undefined} step={numeric ? 1 : undefined} maxLength={numeric ? undefined : 50} value={answers[inspectionKey(sub, field)] ?? ""} onChange={(e) => set(sub, field, e.target.value)} />;
  const defects = inspectionDefects(answers);
  return <div className="space-y-5">
    <div className="flex flex-wrap gap-5">{MAIN_SYSTEMS.map((main) => <label key={main} className="flex items-center gap-2 text-sm font-semibold"><Checkbox checked={mainSelected(answers, main)} onCheckedChange={(checked) => onChange(toggleInspection(answers, main, checked === true))} />{main}</label>)}</div>
    {MAIN_SYSTEMS.filter((main) => mainSelected(answers, main)).map((main) => <section key={main} className="border-t pt-4 space-y-4"><h4 className="font-semibold">{main}</h4>
      {main !== "CCTV" && <div className="flex flex-wrap gap-x-5 gap-y-3">{SUBSYSTEMS[main].map((sub) => <label key={sub} className="flex items-center gap-2 text-sm"><Checkbox checked={selectedSubsystems(answers, main).includes(sub)} onCheckedChange={(checked) => onChange(toggleInspection(answers, sub, checked === true))} />{sub}</label>)}</div>}
      {(main === "CCTV" ? ["CCTV"] : selectedSubsystems(answers, main)).map((sub) => <div key={sub} className="space-y-3"><h5 className="text-sm font-medium">{sub}</h5>
        {INSPECTION_POINTS[sub] ? <><div className="grid gap-3 sm:grid-cols-2">{sub === "Fire Alarm System" && <label className="space-y-1 text-sm">System Type<Result label={`${sub} System Type`} value={answers[inspectionKey(sub, "System Type")]} options={["Addressable", "Conventional", "Both"]} onChange={(v) => set(sub, "System Type", v)} /></label>}<label className="space-y-1 text-sm">Brand{input(sub, "Brand")}</label></div><div className="grid gap-3 sm:grid-cols-2">{INSPECTION_POINTS[sub].map((point) => <label key={point} className="grid grid-cols-[minmax(0,1fr)_100px] items-center gap-3 text-sm"><span>{point}</span><Result label={`${sub} ${point}`} value={answers[inspectionKey(sub, point)]} options={ALARM_RESULTS} onChange={(v) => set(sub, point, v)} /></label>)}</div></> : <>
          {sub === "Fire Extinguishers" && <div className="overflow-x-auto"><div className="grid grid-cols-6 gap-2 min-w-[540px]">{EXTINGUISHER_TYPES.map((type) => <label key={type} className="space-y-1 text-xs font-medium">{type}{type === "Other" && input(sub, "Other Type")}{input(sub, `${type} QTY`, true)}</label>)}</div></div>}
          {sub === "Fire Suppression System" && <label className="block text-sm space-y-1">System Type{input(sub, "System Type")}</label>}
          {sub === "Fire Hose Reel" && <label className="block text-sm space-y-1">QTY{input(sub, "QTY", true)}</label>}
          <label className="grid grid-cols-[minmax(0,1fr)_minmax(160px,240px)] items-center gap-3 text-sm"><span>Condition</span><Result label={`${sub} Condition`} value={answers[inspectionKey(sub, "Condition")]} options={CONDITIONS} onChange={(v) => set(sub, "Condition", v)} /></label>
        </>}
      </div>)}
    </section>)}
    <div className="border-t pt-3 text-sm"><h4 className="font-semibold mb-2">There are defects in:</h4>{defects.length ? <ul className="space-y-1">{defects.map((defect) => <li key={defect}>{defect}</li>)}</ul> : <p className="text-muted-foreground">No Defects Reported</p>}</div>
  </div>;
}