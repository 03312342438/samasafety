import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { MAIN_SYSTEMS, SUBSYSTEMS, INSPECTION_POINTS, ALARM_RESULTS, CONDITIONS, EXTINGUISHER_TYPES, inspectionKey, mainSelected, selectedSubsystems, toggleInspection, inspectionDefects } from "@/lib/report-inspections";

function Result({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <Select value={value || "unanswered"} onValueChange={(v) => onChange(v === "unanswered" ? "" : v)}><SelectTrigger className="min-w-0 [&>span]:min-w-0 [&>svg]:shrink-0" aria-label={label}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="unanswered">-</SelectItem>{options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select>;
}

function AlarmResult({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const toggle = (stored: string) => onChange(value === stored ? "" : stored);
  return <div className="flex shrink-0 gap-1.5" role="group" aria-label={label}>{[["OK", "OK"], ["Faulty", "Fault"]].map(([labelText, stored]) => <Button key={stored} type="button" variant={value === stored ? "default" : "outline"} size="sm" className={value === stored ? "h-8 px-3 text-xs font-semibold" : "h-8 px-3 text-xs"} aria-pressed={value === stored} aria-label={`${label} ${labelText}`} onClick={() => toggle(stored)}>{labelText}</Button>)}</div>;
}

export function ReportInspections({ answers, onChange }: { answers: Record<string, string>; onChange: (answers: Record<string, string>) => void }) {
  const set = (system: string, field: string, value: string) => onChange({ ...answers, [inspectionKey(system, field)]: value });
  const input = (sub: string, field: string, numeric = false) => <Input aria-label={`${sub} ${field}`} type={numeric ? "number" : "text"} min={numeric ? 0 : undefined} step={numeric ? 1 : undefined} maxLength={numeric ? undefined : 50} value={answers[inspectionKey(sub, field)] ?? ""} onChange={(e) => set(sub, field, e.target.value)} />;
  const defects = inspectionDefects(answers);
  return <div className="@container min-w-0 space-y-5">
    <div className="flex flex-wrap gap-5">{MAIN_SYSTEMS.map((main) => <label key={main} className="flex items-center gap-2 text-sm font-semibold"><Checkbox checked={mainSelected(answers, main)} onCheckedChange={(checked) => onChange(toggleInspection(answers, main, checked === true))} />{main}</label>)}</div>
    {MAIN_SYSTEMS.filter((main) => mainSelected(answers, main)).map((main) => <section key={main} className="border-t pt-4 space-y-4"><h4 className="font-semibold">{main}</h4>
      {main !== "CCTV" && <div className="flex flex-wrap gap-x-5 gap-y-3">{SUBSYSTEMS[main].map((sub) => <label key={sub} className="flex items-center gap-2 text-sm"><Checkbox checked={selectedSubsystems(answers, main).includes(sub)} onCheckedChange={(checked) => onChange(toggleInspection(answers, sub, checked === true))} />{sub}</label>)}</div>}
      {(main === "CCTV" ? ["CCTV"] : selectedSubsystems(answers, main)).map((sub) => <div key={sub} className="space-y-3"><h5 className="text-sm font-medium">{sub}</h5>
        {INSPECTION_POINTS[sub] ? <><div className="grid gap-3 @min-[30rem]:grid-cols-2">{sub === "Fire Alarm System" && <label className="min-w-0 space-y-1 text-sm">System Type<Result label={`${sub} System Type`} value={answers[inspectionKey(sub, "System Type")]} options={["Addressable", "Conventional", "Both"]} onChange={(v) => set(sub, "System Type", v)} /></label>}<label className="min-w-0 space-y-1 text-sm">Brand{input(sub, "Brand")}</label></div><div className="grid gap-x-6 gap-y-2 @min-[42rem]:grid-cols-2">{INSPECTION_POINTS[sub].map((point) => <div key={point} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border/60 py-2 text-sm"><span className="min-w-0 break-words">{point}</span><AlarmResult label={`${sub} ${point}`} value={answers[inspectionKey(sub, point)]} onChange={(v) => set(sub, point, v)} /></div>)}</div></> : <>
          {sub === "Fire Extinguishers" && <div className="space-y-3"><div className="grid grid-cols-3 gap-3 @min-[30rem]:grid-cols-6">{EXTINGUISHER_TYPES.map((type) => <label key={type} className="min-w-0 space-y-1 text-xs font-medium">{type}{input(sub, `${type} QTY`, true)}</label>)}</div></div>}
          {sub === "Fire Suppression System" && <label className="block text-sm space-y-1">System Type{input(sub, "System Type")}</label>}
          {sub === "Fire Hose Reel" && <label className="block text-sm space-y-1">QTY{input(sub, "QTY", true)}</label>}
          <label className="grid min-w-0 gap-2 text-sm @min-[24rem]:grid-cols-[minmax(0,1fr)_240px] @min-[24rem]:items-center"><span>Condition</span><Result label={`${sub} Condition`} value={answers[inspectionKey(sub, "Condition")]} options={CONDITIONS} onChange={(v) => set(sub, "Condition", v)} /></label>
        </>}
      </div>)}
    </section>)}
    <div className="border-t pt-3 text-sm"><h4 className="font-semibold mb-2">There are defects in:</h4>{defects.length ? <ul className="space-y-1">{defects.map((defect) => <li key={defect}>{defect}</li>)}</ul> : <p className="text-muted-foreground">No Defects Reported</p>}</div>
  </div>;
}