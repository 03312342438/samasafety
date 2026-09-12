import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { listMyNotifications, markNotificationRead } from "@/lib/notifications.functions";

export function NotificationBell() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const fetchNotifications = useServerFn(listMyNotifications);
  const markRead = useServerFn(markNotificationRead);

  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => fetchNotifications(),
    refetchInterval: 60_000,
  });

  const items = (data ?? []) as any[];
  const pending = items.filter((n) => !n.read_at);
  const earlier = items.filter((n) => n.read_at);

  // Anything unread the user has not been shown yet pops the window open —
  // at sign-in for notifications that arrived while offline, and live after that.
  const shown = useRef<Set<string>>(new Set());
  const pendingKey = pending.map((n) => n.id).join(",");
  useEffect(() => {
    if (!pending.length) return;
    const unseen = pending.filter((n) => !shown.current.has(n.id));
    if (!unseen.length) return;
    unseen.forEach((n) => shown.current.add(n.id));
    setOpen(true);
  }, [pendingKey]);

  const clearAll = async () => {
    await markRead({ data: {} });
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };

  const clearOne = async (id: string) => {
    await markRead({ data: { id } });
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };

  const row = (n: any, isPending: boolean) => (
    <div
      key={n.id}
      className={`flex items-start justify-between gap-3 rounded-lg border p-3 ${
        isPending ? "bg-accent/30" : "opacity-70"
      }`}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium">{n.title}</p>
        {n.message && <p className="text-xs text-muted-foreground">{n.message}</p>}
        <p className="mt-1 text-[11px] text-muted-foreground">
          {new Date(n.created_at).toLocaleString()}
        </p>
      </div>
      {isPending && (
        <Button variant="ghost" size="sm" onClick={() => clearOne(n.id)} aria-label="Mark as read">
          <Check className="h-4 w-4" />
        </Button>
      )}
    </div>
  );

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="relative"
        aria-label="Notifications"
        onClick={() => setOpen(true)}
      >
        <Bell className="h-4 w-4" />
        {pending.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
            {pending.length > 9 ? "9+" : pending.length}
          </span>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] w-full max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Notifications</DialogTitle>
            <DialogDescription>
              {pending.length > 0
                ? `${pending.length} pending notification${pending.length === 1 ? "" : "s"}`
                : "You're all caught up."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Pending ({pending.length})</h3>
                {pending.length > 0 && (
                  <Button variant="outline" size="sm" onClick={clearAll}>
                    Mark all read
                  </Button>
                )}
              </div>
              {pending.length === 0 ? (
                <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                  Nothing pending.
                </p>
              ) : (
                <div className="space-y-2">{pending.map((n) => row(n, true))}</div>
              )}
            </div>

            {earlier.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
                  Earlier ({earlier.length})
                </h3>
                <div className="space-y-2">{earlier.map((n) => row(n, false))}</div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
