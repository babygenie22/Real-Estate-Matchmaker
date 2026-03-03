import { useLocation, Link } from "wouter";
import { Home, Heart, MessageSquare, User, Shield, Compass } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const NAV_ITEMS = [
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/matches", label: "Matches", icon: Heart },
  { href: "/profile", label: "Profile", icon: User },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user } = useAuth();

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <header className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-border bg-background z-10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center">
            <Home className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
          <span className="font-bold text-base text-foreground">HomeMatch</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin">
            <button
              className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${location === "/admin" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
              data-testid="button-nav-admin"
            >
              <Shield className="w-4 h-4" />
            </button>
          </Link>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        {children}
      </main>

      <nav className="flex-shrink-0 border-t border-border bg-background/80 backdrop-blur-md">
        <div className="flex">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = location === href || (href === "/discover" && location === "/");
            return (
              <Link key={href} href={href} className="flex-1">
                <button
                  className={`w-full py-3 flex flex-col items-center gap-1 transition-colors ${isActive ? "text-primary" : "text-muted-foreground"}`}
                  data-testid={`button-nav-${label.toLowerCase()}`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? "fill-primary/10" : ""}`} />
                  <span className="text-xs font-medium">{label}</span>
                </button>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
