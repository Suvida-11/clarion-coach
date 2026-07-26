import { Bell, Search, Command } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Link, useRouterState } from "@tanstack/react-router";
import { Fragment } from "react";
import { useCurrentUser, clearCurrentUser, initials, firstName } from "@/lib/user";

function useCrumbs() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const parts = pathname.split("/").filter(Boolean);
  return parts.map((p, i) => ({
    label: p.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase()),
    href: "/" + parts.slice(0, i + 1).join("/"),
    last: i === parts.length - 1,
  }));
}

export function Topbar() {
  const crumbs = useCrumbs();
  const user = useCurrentUser();
  const displayName = user?.name ?? "Guest";
  const displayEmail = user?.email ?? "";
  const short = user ? firstName(user.name) : "Guest";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/70 px-4 backdrop-blur-xl md:px-6">
      <nav className="hidden min-w-0 flex-1 items-center gap-1.5 text-sm text-muted-foreground md:flex">
        {crumbs.map((c, i) => (
          <Fragment key={c.href}>
            {i > 0 && <span className="opacity-50">/</span>}
            {c.last ? (
              <span className="truncate font-medium text-foreground">{c.label}</span>
            ) : (
              <Link to={c.href} className="truncate hover:text-foreground">
                {c.label}
              </Link>
            )}
          </Fragment>
        ))}
      </nav>

      <div className="relative hidden max-w-md flex-1 md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search sessions, knowledge, agents…"
          className="h-9 border-border bg-muted/40 pl-9 pr-14 text-sm"
        />
        <kbd className="pointer-events-none absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
          <Command className="h-3 w-3" />K
        </kbd>
      </div>

      <div className="ml-auto flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-destructive" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="flex-col items-start gap-0.5">
              <div className="text-sm font-medium">High escalation risk detected</div>
              <div className="text-xs text-muted-foreground">
                Session sess_a91k2 · 2 min ago
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex-col items-start gap-0.5">
              <div className="text-sm font-medium">Knowledge base updated</div>
              <div className="text-xs text-muted-foreground">
                refund-policy-v3.pdf · 1h ago
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 gap-2 pr-2 pl-1.5">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-brand text-xs font-bold text-primary-foreground">
                  MK
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium sm:inline">Maya K.</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="font-medium">Maya Kensington</div>
              <div className="text-xs font-normal text-muted-foreground">
                maya@clario.ai
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/app/settings">Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuItem>Team</DropdownMenuItem>
            <DropdownMenuItem>Billing</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/">Sign out</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
