import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

/**
 * Dropdown with a type-ahead search box. Used wherever the list of choices can
 * get long (material / item codes), so the user can find a line by typing.
 */
export function SearchSelect({
  value,
  onChange,
  options,
  placeholder = "— select —",
  searchPlaceholder = "Search…",
  className,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find(([v]) => v === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          disabled={disabled}
          className={cn("h-9 w-full justify-between px-2 text-left text-sm font-normal", className)}
        >
          <span className={cn("truncate", !selected && "text-muted-foreground")}>
            {selected ? selected[1] : placeholder}
          </span>
          <ChevronsUpDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(28rem,90vw)] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>No match found.</CommandEmpty>
            <CommandGroup>
              {options.map(([v, label]) => (
                <CommandItem
                  key={v || "__empty"}
                  value={`${label} ${v}`}
                  onSelect={() => {
                    onChange(v);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", v === value ? "opacity-100" : "opacity-0")} />
                  <span className="truncate">{label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
