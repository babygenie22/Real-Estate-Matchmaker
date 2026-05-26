import { useLocation, Link } from "wouter";
import { Home, Heart, User, Shield, Compass, Bell } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Notification, Match } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

const NAV_ITEMS = [
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/matches", label: "Matches", icon: Heart },
  { href: "/notifications", label: "Alerts", icon: Bell },
  { href: "/profile", label: "Profile", icon: User },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user } = useAuth();

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    refetchInterval: 30000,
  });

  const { data: matches = [] } = useQuery<Match[]>({
    queryKey: ["/api/matches"],
  });

  const unreadNotifs = notifications.filter((n) => !n.read).length;

  // Badge helpers per nav item
  const getBadge = (href: string) => {
    if (href === "/notifications") return unreadNotifs > 0 ? (unreadNotifs > 9 ? "9+" : String(unreadNotifs)) : null;
    if (href === "/matches") return matches.length > 0 ? String(matches.length) : null;
    return null;
  };

  const getBadgeColor = (href: string) => {
    if (href === "/notifications") return "bg-destructive text-destructive-foreground";
    if (href === "/matches") return "bg-primary text-primary-foreground";
    return "";
  };

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between px-4 py-2.5 bg-background/95 backdrop-blur-lg border-b border-border/60 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center shadow-sm">
            <Home className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <span className="font-bold text-base text-foreground tracking-tight">HomeMatch</span>
            <span className="text-[10px] text-muted-foreground block -mt-0.5 tracking-wide uppercase">Michigan</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {user?.role === "admin" && (
            <Link href="/admin">
              <button
                aria-label="Admin dashboard"
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${location === "/admin" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
                data-testid="button-nav-admin"
              >
                <Shield className="w-4 h-4" />
              </button>
            </Link>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="flex-shrink-0 bg-background/95 backdrop-blur-lg border-t border-border/60 safe-area-bottom">
        <div className="flex items-center px-1 py-1.5">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = location === href || (href === "/discover" && location === "/");
            const badge = getBadge(href);
            return (
              <Link key={href} href={href} className="flex-1">
                <button
                  className="w-full flex flex-col items-center gap-0.5 py-1 transition-all"
                  data-testid={`button-nav-${label.toLowerCase()}`}
                >
                  <div className={`relative flex items-center justify-center w-12 h-8 rounded-2xl transition-all duration-200 ${isActive ? "bg-primary/[0.15]" : ""}`}>
                    <Icon className={`w-[19px] h-[19px] transition-all duration-200 ${isActive ? "text-primary stroke-[2.2px]" : "text-muted-foreground stroke-[1.8px]"}`} />
                    {badge && !isActive && (
                      <span className={`absolute -top-0.5 -right-0.5 min-w-[16px] h-4 text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 ${getBadgeColor(href)}`}>
                        {badge}
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] font-medium transition-colors duration-200 ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                    {label}
                  </span>
                </button>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
