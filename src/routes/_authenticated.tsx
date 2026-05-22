import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRole } from "@/hooks/use-role";
import { Sprout, LayoutDashboard, Users, Banknote, LogOut, Gift, User, Inbox, Settings, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated")({
  component: AuthLayout,
});

function AuthLayout() {
  const { session, loading, signOut, user } = useAuth();
  const { isTreasurer } = useRole();
  const navigate = useNavigate();
  const { location } = useRouterState();

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/login" });
  }, [loading, session, navigate]);

  if (loading || !session) {
    return (
      <div className="grid min-h-screen place-items-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  const nav = [
    { to: "/portal", label: "My Portal", icon: User },
    { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { to: "/community", label: "Community", icon: MessageSquare },
    { to: "/members", label: "Members", icon: Users },
    { to: "/loans", label: "Loans", icon: Banknote },
    ...(isTreasurer
      ? ([{ to: "/applications", label: "Applications", icon: Inbox }] as const)
      : []),
    { to: "/share-out", label: "Share-out", icon: Gift },
    ...(isTreasurer
      ? ([{ to: "/settings", label: "Settings", icon: Settings }] as const)
      : []),
  ] as const;

  const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="space-y-1">
      {nav.map(({ to, label, icon: Icon }) => {
        const active = location.pathname === to;
        return (
          <Link
            key={to}
            to={to}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
              active
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-7xl gap-6 p-4 lg:p-6">
        <aside className="hidden w-60 shrink-0 lg:block">
          <div className="sticky top-6 rounded-2xl bg-sidebar p-5 text-sidebar-foreground">
            <Link to="/dashboard" className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                <Sprout className="h-5 w-5" />
              </span>
              <span className="font-display text-lg font-semibold">Kijiji</span>
            </Link>
            <div className="mt-8">
              <NavLinks />
            </div>
            <div className="mt-10 border-t border-sidebar-border pt-4 text-xs text-sidebar-foreground/70">
              <p className="truncate">{user?.email}</p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 h-8 w-full justify-start gap-2 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                onClick={async () => {
                  await signOut();
                  navigate({ to: "/" });
                }}
              >
                <LogOut className="h-4 w-4" /> Sign out
              </Button>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="sticky top-0 z-40 -mx-4 mb-4 border-b bg-background/95 backdrop-blur lg:hidden">
            <div className="flex items-center justify-between px-4 py-2">
              <Link to="/dashboard" className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
                  <Sprout className="h-4 w-4" />
                </span>
                <span className="font-display font-semibold">Kijiji</span>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 px-2 text-xs text-muted-foreground"
                onClick={async () => {
                  await signOut();
                  navigate({ to: "/" });
                }}
              >
                <LogOut className="h-4 w-4" /> Sign out
              </Button>
            </div>
            <nav className="flex items-center gap-1 overflow-x-auto px-2 pb-2">
              {nav.map(({ to, label, icon: Icon }) => {
                const active = location.pathname === to;
                return (
                  <Link
                    key={to}
                    to={to}
                    className={`flex min-w-[64px] shrink-0 flex-col items-center gap-1 rounded-md px-2 py-1.5 text-[10px] font-medium transition-colors ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
