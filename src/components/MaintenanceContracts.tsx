import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMaintenanceContracts } from "@/lib/maintenance.functions";
import { Card, CardContent } from "@/components/ui/card";

function pretty(d: string) {
  if (!d) return "—";
  const dt = new Date(`${d}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function MaintenanceContracts() {
  const fetchContracts = useServerFn(listMaintenanceContracts);
  const { data, isLoading } = useQuery({
    queryKey: ["maintenance-contracts"],
    queryFn: () => fetchContracts(),
  });
  const rows = (data as any[]) ?? [];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Loading maintenance contracts…
        </CardContent>
      </Card>
    );
  }

  if (!rows.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No maintenance contracts yet. They are created from maintenance job numbers.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="overflow-x-auto p-0">
        <table className="w-full min-w-[1000px] text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2">Project</th>
              <th className="px-3 py-2">Site</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Every</th>
              <th className="px-3 py-2">Total</th>
              <th className="px-3 py-2">Completed</th>
              <th className="px-3 py-2">Remaining</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-t align-top">
                <td className="px-3 py-3 font-medium">{c.customer_name}</td>
                <td className="px-3 py-3">
                  {c.project_name}
                  <div className="text-xs text-muted-foreground">{c.job_number}</div>
                </td>
                <td className="px-3 py-3">{c.site_location}</td>
                <td className="px-3 py-3">{c.maintenance_type}</td>
                <td className="px-3 py-3">{c.interval_months} month(s)</td>
                <td className="px-3 py-3">{c.total_count}</td>
                <td className="px-3 py-3">
                  <span className="font-medium text-emerald-700">{c.completed_count}</span>
                  {c.completed.length > 0 && (
                    <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                      {c.completed.map((v: any) => (
                        <li key={v.sequence}>
                          #{v.sequence} · {pretty(v.completed_date)}
                          {v.msr_no ? ` · MSR ${v.msr_no}` : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
                <td className="px-3 py-3">
                  <span className="font-medium">{c.remaining_count}</span>
                  {c.remaining.length > 0 && (
                    <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                      {c.remaining.map((v: any) => (
                        <li key={v.sequence}>
                          #{v.sequence} · due {pretty(v.due_date)}
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
