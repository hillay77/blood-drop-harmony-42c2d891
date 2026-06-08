import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Droplets, LayoutDashboard, Boxes, Snowflake, TrendingDown, Ambulance, Radio, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type NavItem = { to: string; label: string; icon: typeof Droplets; exact?: boolean };
const nav: NavItem[] = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/app/inventory", label: "Inventory", icon: Boxes },
  { to: "/app/cold-chain", label: "Cold Chain", icon: Snowflake },
  { to: "/app/forecasts", label: "Forecasts", icon: TrendingDown },
  { to: "/app/requests", label: "Requests", icon: Ambulance },
  { to: "/app/alerts", label: "SMS Alerts", icon: Radio },
];

export function AppShell({ children, email }: { children: ReactNode; email?: string | null }) {
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden md:flex w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <div className="px-5 h-16 flex items-center gap-2 border-b border-sidebar-border">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-primary">
            <Droplets className="h-4 w-4 text-sidebar-primary-foreground" />
          </div>
          <span className="font-display font-bold">Nakandulo</span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map(({ to, label, icon: Icon, exact }: NavItem) => {
            const active = exact ? path === to : path.startsWith(to);
            return (
              <Link key={to} to={to} className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active ? "bg-sidebar-primary text-sidebar-primary-foreground" : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}>
                <Icon className="h-4 w-4" /> {label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <div className="px-3 py-2 text-xs text-sidebar-foreground/70 truncate">{email}</div>
          <Button variant="ghost" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden h-14 border-b border-border flex items-center justify-between px-4 bg-card">
          <div className="flex items-center gap-2">
            <Droplets className="h-5 w-5 text-primary" />
            <span className="font-display font-bold">Nakandulo</span>
          </div>
          <Button size="sm" variant="ghost" onClick={signOut}><LogOut className="h-4 w-4" /></Button>
        </header>
        <main className="flex-1 p-4 md:p-8 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
