import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Boxes, PackageSearch } from "lucide-react";
import { useProfile } from "@/hooks/use-profile";
import { AppHeader } from "@/components/AppHeader";
import { SearchInput } from "@/components/SearchInput";
import { ItemImage } from "@/components/ItemImage";
import { Card, CardContent } from "@/components/ui/card";
import { listStockItems } from "@/lib/inventory.functions";
import { statusBadgeClass } from "@/lib/workflow";

export const Route = createFileRoute("/_authenticated/stock")({
  component: StockPage,
  head: () => ({
    meta: [
      { title: "Stock Lookup | SAMA Fire & Safety" },
      { name: "description", content: "Search any item code and see exactly how much stock is on hand, reserved and available in the SAMA store." },
      { property: "og:title", content: "Stock Lookup | SAMA Fire & Safety" },
      { property: "og:description", content: "Search any item code and see exactly how much stock is on hand, reserved and available in the SAMA store." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function StockPage() {
  const { data: profile } = useProfile();
  const [query, setQuery] = useState("");
  const fetchStock = useServerFn(listStockItems);
  const { data: stock } = useQuery({ queryKey: ["stock-items"], queryFn: () => fetchStock() });

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = ((stock as any[]) ?? []);
    if (!q) return all;
    return all.filter((s) =>
      [s.item_code, s.description, s.category, s.store_location, s.supplier]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [stock, query]);

  return (
    <div className="min-h-screen bg-secondary/40">
      <AppHeader isAdmin={profile?.isAdmin} name={profile?.profile?.full_name} roles={profile?.roles} />
      <main className="mx-auto max-w-[1100px] px-4 py-6">
        <div className="mb-5">
          <h1 className="text-xl font-semibold">Stock Lookup</h1>
          <p className="text-sm text-muted-foreground">
            Search any item and see how much is in the store right now.
          </p>
        </div>

        <div className="mb-4 max-w-xl">
          <SearchInput value={query} onChange={setQuery} placeholder="Search item code, description, category…" />
        </div>

        <div className="space-y-3">
          {rows.map((s: any) => {
            const onHand = Number(s.quantity_on_hand ?? 0);
            const reserved = Number(s.quantity_reserved ?? 0);
            const available = Math.round((onHand - reserved) * 100) / 100;
            const low = onHand <= Number(s.reorder_level ?? 0);
            return (
              <Card key={s.id}>
                <CardContent className="flex flex-wrap items-center gap-4 p-4">
                  <ItemImage path={s.image_url} alt={s.description} className="h-16 w-16" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Boxes className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{s.item_code}</span>
                      <span className="text-sm text-muted-foreground">{s.description}</span>
                      {low && (
                        <span className={`rounded-full px-2 py-0.5 text-[11px] ${statusBadgeClass("shortage")}`}>
                          Low stock
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {[s.category, s.store_location].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <Stat label="On hand" value={`${onHand} ${s.unit}`} />
                    <Stat label="Reserved" value={`${reserved}`} />
                    <Stat label="Available" value={`${available}`} strong />
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {rows.length === 0 && (
            <div className="py-16 text-center text-sm text-muted-foreground">
              <PackageSearch className="mx-auto mb-2 h-8 w-8" />
              No item matches this search.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={strong ? "text-base font-semibold text-primary" : "text-base font-medium"}>{value}</p>
    </div>
  );
}
