import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  MessageSquareText,
  BookOpen,
  BarChart3,
  Settings as SettingsIcon,
  PlusCircle,
  FileText,
} from "lucide-react";
import { Logo } from "@/components/logo";

const nav = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/app/new-session", label: "New Session", icon: PlusCircle },
  { to: "/app/console/sess_a91k2", label: "Live Console", icon: MessageSquareText },
  { to: "/app/knowledge", label: "Knowledge Base", icon: BookOpen },
  { to: "/app/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/app/reports/sess_88f0x", label: "Reports", icon: FileText },
  { to: "/app/settings", label: "Settings", icon: SettingsIcon },
] as const;

export function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
      <div className="flex h-16 items-center px-6">
        <Link to="/app">
          <Logo />
        </Link>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {nav.map(({ to, label, icon: Icon, exact }) => {
          const active = exact ? pathname === to : pathname.startsWith(to.split("/").slice(0, 3).join("/"));
          return (
            <Link
              key={to}
              to={to}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{label}</span>
              {active && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border p-4">
        <div className="glass rounded-xl p-3 text-xs">
          <div className="mb-1 flex items-center gap-1.5 font-semibold">
            <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-success" />
            AI Agents online
          </div>
          <p className="text-muted-foreground">6 agents active · Gemini 1.5 Pro</p>
        </div>
      </div>
    </aside>
  );
}
