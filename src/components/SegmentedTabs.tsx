import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Tab = { value: string; label: React.ReactNode };

export function SegmentedTabs({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: Tab[];
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex w-full min-w-0 flex-wrap items-stretch gap-1 rounded-lg bg-muted p-1 text-muted-foreground",
        className,
      )}
    >
      {tabs.map((t) => (
        <Button
          key={t.value}
          type="button"
          variant="ghost"
          aria-pressed={value === t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            "h-auto min-h-10 min-w-0 flex-auto justify-center whitespace-normal rounded-md px-3 py-2 text-sm font-medium [&_svg]:shrink-0",
            value === t.value
              ? "bg-card text-foreground shadow-sm hover:bg-card hover:text-foreground"
              : "hover:bg-card/50 hover:text-foreground",
          )}
        >
          {t.label}
        </Button>
      ))}
    </div>
  );
}
