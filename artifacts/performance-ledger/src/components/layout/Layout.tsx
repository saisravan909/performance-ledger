import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Server,
  LineChart,
  AlertTriangle,
  FileCheck,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";

const coreNav = [
  { name: "Dashboard",     href: "/",        icon: LayoutDashboard },
  { name: "Services",      href: "/services", icon: Server },
  { name: "ROI Summary",   href: "/roi",      icon: LineChart },
  { name: "Flaky Signals", href: "/flaky",    icon: AlertTriangle },
  { name: "Evidence",      href: "/evidence", icon: FileCheck },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const isContinuity =
    location === "/continuity" || location.startsWith("/continuity");

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar */}
      <div className="w-64 border-r border-border bg-sidebar flex-shrink-0 flex flex-col">

        {/* Wordmark */}
        <div className="h-16 flex items-center px-6 border-b border-border">
          <ShieldCheck className="w-6 h-6 text-primary mr-3" />
          <span className="font-semibold tracking-tight text-white">Performance Ledger</span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {/* Core nav */}
          {coreNav.map((item) => {
            const isActive =
              location === item.href ||
              (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.name} href={item.href}>
                <div
                  className={cn(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-md cursor-pointer transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                  data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <item.icon
                    className={cn(
                      "mr-3 flex-shrink-0 h-5 w-5",
                      isActive ? "text-primary" : "text-muted-foreground",
                    )}
                    aria-hidden="true"
                  />
                  {item.name}
                </div>
              </Link>
            );
          })}

          {/* Divider before Continuity Ledger */}
          <div className="pt-4 pb-2 px-3">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-amber-500/20" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500/50">
                Resilience
              </span>
              <div className="flex-1 h-px bg-amber-500/20" />
            </div>
          </div>

          {/* Continuity Ledger — distinct amber identity */}
          <Link href="/continuity">
            <div
              className={cn(
                "flex items-center px-3 py-2 text-sm font-medium rounded-md cursor-pointer transition-colors",
                isContinuity
                  ? "bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20"
                  : "text-amber-500/70 hover:bg-amber-500/8 hover:text-amber-400",
              )}
              data-testid="nav-continuity-ledger"
            >
              <ShieldAlert
                className={cn(
                  "mr-3 flex-shrink-0 h-5 w-5",
                  isContinuity ? "text-amber-400" : "text-amber-500/60",
                )}
                aria-hidden="true"
              />
              Continuity Ledger
            </div>
          </Link>
        </nav>

        {/* Footer label */}
        <div className="px-6 py-4 border-t border-border">
          <p className="text-xs text-muted-foreground/40 leading-tight">
            Performance &amp; Operational Resilience Governance
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-background/50">
        {children}
      </main>
    </div>
  );
}
