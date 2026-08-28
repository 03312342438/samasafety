import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SAMA_LOGO_BASE64 } from "@/lib/logo";
import { Button } from "@/components/ui/button";
import { MaintenanceReminder } from "@/components/MaintenanceReminder";
import { ChangePasswordDialog } from "@/components/ChangePasswordDialog";
import { NotificationBell } from "@/components/NotificationBell";
import { LogOut } from "lucide-react";
import { hasDept } from "@/lib/workflow";

export function AppHeader({
  isAdmin,
  name,
  roles,
}: {
  isAdmin?: boolean;
  name?: string;
  roles?: string[];
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const canSeeCustomers = hasDept(roles, "sales") || hasDept(roles, "project_manager");
  const canSeeProjects =
    canSeeCustomers ||
    hasDept(roles, "inventory") ||
    hasDept(roles, "technician") ||
    hasDept(roles, "accounts");

  return (
    <header className="sticky top-0 z-10 border-b bg-card/95 shadow-[var(--shadow-card)] backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2.5">
        <Link to="/dashboard" className="flex items-center gap-3">
          <img src={SAMA_LOGO_BASE64} alt="Sama Safety & Security" className="h-12 w-auto" />
        </Link>
        <nav className="flex flex-wrap items-center gap-1 sm:gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/dashboard">Reports</Link>
          </Button>
          {(isAdmin || canSeeCustomers) && (
            <Button asChild variant="ghost" size="sm">
              <Link to="/customers">Customers</Link>
            </Button>
          )}
          {(isAdmin || hasDept(roles, "sales") || hasDept(roles, "project_manager")) && (
            <Button asChild variant="ghost" size="sm">
              <Link to="/sales">Sales</Link>
            </Button>
          )}

          {(isAdmin || canSeeProjects) && (
            <Button asChild variant="ghost" size="sm">
              <Link to="/projects">Projects</Link>
            </Button>
          )}
          {(isAdmin || hasDept(roles, "project_manager") || hasDept(roles, "inventory")) && (
            <Button asChild variant="ghost" size="sm">
              <Link to="/engineering">Planning</Link>
            </Button>
          )}
          <Button asChild variant="ghost" size="sm">
            <Link to="/approvals">Approvals</Link>
          </Button>
          {isAdmin && (
            <Button asChild variant="ghost" size="sm">
              <Link to="/admin">Admin</Link>
            </Button>
          )}
          {name && <span className="hidden text-sm text-muted-foreground sm:inline">{name}</span>}
          <NotificationBell />
          <ChangePasswordDialog />
          <MaintenanceReminder />
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut className="mr-1 h-4 w-4" /> Sign out
          </Button>
        </nav>
      </div>
    </header>
  );
}
