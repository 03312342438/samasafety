import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/SearchSelect";
import { listStockItems } from "@/lib/inventory.functions";
import { CURRENCY } from "@/lib/workflow";
import { cn } from "@/lib/utils";

export type PrelimLine = {
  stock_item_id: string;
  description: string;
  unit: string;
  quantity: string;
  unit_cost: string;
};

export const emptyPrelimLine: PrelimLine = {
  stock_item_id: "", description: "", unit: "", quantity: "1", unit_cost: "0",
};

const num = (v: unknown) => Number(v ?? 0) || 0;

/**
 * Preliminary BOM/BOS material list captured while the project is created.
 * Prices come from the latest approved store price of the picked item.
 */
export function PreliminaryBomFields({
  lines,
  setLines,
}: {
  lines: PrelimLine[];
  setLines: (next: PrelimLine[]) => void;
}) {
  const fetchStock = useServerFn(listStockItems);
  const { data: stock } = useQuery({ queryKey: ["stock-items"], queryFn: () => fetchStock() });
  const approvedStock = ((stock as any[]) ?? []).filter((s) => s.approval_status === "approved");

  const patch = (idx: number, next: Partial<PrelimLine>) =>
    setLines(lines.map((l, i) => (i === idx ? { ...l, ...next } : l)));

  const pickItem = (idx: number, stockItemId: string) => {
    const item = approvedStock.find((s) => s.id === stockItemId);
    patch(idx, {
      stock_item_id: stockItemId,
      description: item?.description ?? "",
      unit: item?.unit ?? "",
      unit_cost: item ? String(item.unit_cost ?? 0) : lines[idx].unit_cost,
    });
  };

  const stockOnHand = (stockItemId: string) => {
    const item = approvedStock.find((s) => s.id === stockItemId);
    if (!item) return null;
    return num(item.quantity_on_hand) - num(item.quantity_reserved);
  };

  const total = lines.reduce((s, l) => s + num(l.quantity) * num(l.unit_cost), 0);

  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold">Preliminary BOM / BOS</Label>
        <Button variant="outline" size="sm" onClick={() => setLines([...lines, { ...emptyPrelimLine }])}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Add item
        </Button>
      </div>
      {lines.map((l, idx) => {
        const available = stockOnHand(l.stock_item_id);
        const short = available !== null && num(l.quantity) > available;
        return (
          <div key={idx} className="grid grid-cols-12 items-center gap-2">
            <div className="col-span-4">
              <SearchSelect
                value={l.stock_item_id}
                placeholder="— item code / description —"
                searchPlaceholder="Search item code or description…"
                options={[
                  ["", "— item code / description —"] as [string, string],
                  ...approvedStock.map(
                    (s) => [s.id, `${s.item_code} — ${s.description}`] as [string, string],
                  ),
                ]}
                onChange={(v) => pickItem(idx, v)}
              />
            </div>
            <Input className="col-span-2" readOnly placeholder="Description" value={l.description} />
            <Input className="col-span-1" readOnly placeholder="UOM" value={l.unit} />
            <Input
              className={cn("col-span-1", short && "border-orange-500 bg-orange-50 text-orange-700")}
              placeholder="Qty"
              value={l.quantity}
              onChange={(e) => patch(idx, { quantity: e.target.value })}
              title={short ? `Only ${available} available in stock` : undefined}
            />
            <Input
              className="col-span-2"
              placeholder="Unit price"
              value={l.unit_cost}
              readOnly={Boolean(l.stock_item_id)}
              title={l.stock_item_id ? "Latest store price from the most recent approved lot" : undefined}
              onChange={(e) => patch(idx, { unit_cost: e.target.value })}
            />
            <div className="col-span-1 text-right text-xs tabular-nums">
              {(num(l.quantity) * num(l.unit_cost)).toFixed(3)}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="col-span-1"
              onClick={() => setLines(lines.filter((_, i) => i !== idx))}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      })}
      {lines.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Add the materials expected for this project — this becomes the preliminary BOM/BOS.
        </p>
      )}
      <p className="text-right text-sm">
        Total material cost{" "}
        <span className="font-semibold">{`${CURRENCY} ${total.toFixed(3)}`}</span>
      </p>
    </div>
  );
}
