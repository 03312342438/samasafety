import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SAMA_LOGO_BASE64 } from "@/lib/logo";
import { Button } from "@/components/ui/button";
import { MaintenanceReminder } from "@/components/MaintenanceReminder";
import { ChangePasswordDialog } from "@/components/ChangePasswordDialog";
import { LogOut } from "lucide-react";

export function AppHeader({ isAdmin, name }: { isAdmin?: boolean; name?: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <header className="sticky top-0 z-10 border-b bg-card/95 shadow-[var(--shadow-card)] backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-2.5">
        <Link to="/dashboard" className="flex items-center gap-3">
          <img src={SAMA_LOGO_BASE64} alt="Sama Safety & Security" className="h-12 w-auto" />
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/dashboard">My Reports</Link>
          </Button>
          {isAdmin && (
            <Button asChild variant="ghost" size="sm">
              <Link to="/admin">Admin</Link>
            </Button>
          )}
          {name && <span className="hidden text-sm text-muted-foreground sm:inline">{name}</span>}
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
