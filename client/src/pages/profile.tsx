import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, MapPin, DollarSign, Building, Heart, MessageSquare, LogOut, Settings, ChevronRight, Star } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import type { Agent, Match } from "@shared/schema";

type MatchWithAgent = Match & { agent: Agent };

const formatBudget = (v: any) => {
  const n = Number(v);
  if (!v || isNaN(n)) return v;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
};

export default function ProfilePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: matches = [] } = useQuery<MatchWithAgent[]>({
    queryKey: ["/api/matches"],
  });

  const logoutMutation = useMutation({
    mutationFn: () => fetch("/api/auth/logout", { method: "POST", credentials: "include" }).then(r => r.json()),
    onSuccess: () => { queryClient.clear(); window.location.href = "/"; },
  });

  const profileFields = [
    { icon: MapPin, label: "Location", value: user?.location },
    { icon: DollarSign, label: "Budget", value: formatBudget(user?.budget) },
    { icon: Building, label: "Property Type", value: user?.propertyType },
    { icon: Heart, label: "Preferred Style", value: user?.preferredStyle },
    { icon: MessageSquare, label: "Communication", value: user?.communicationStyle },
  ].filter(f => f.value);

  const userName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email?.split("@")[0] || "User";
  const userInitials = userName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-background">
      {/* Hero gradient banner */}
      <div className="relative flex-shrink-0 bg-gradient-to-br from-primary via-primary/90 to-primary/70 px-5 pt-6 pb-8 overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/5 rounded-full" />
        <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-white/5 rounded-full" />
        <div className="absolute top-4 right-20 w-16 h-16 bg-white/5 rounded-full" />

        <div className="relative flex items-end gap-4">
          <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center flex-shrink-0 shadow-lg">
            <span className="text-2xl font-black text-white">{userInitials}</span>
          </div>
          <div className="flex-1 min-w-0 pb-1">
            <h2 className="text-xl font-bold text-white leading-tight truncate">{userName}</h2>
            {user?.email && <p className="text-sm text-white/70 truncate mt-0.5">{user.email}</p>}
            <Badge className="mt-2 bg-white/20 text-white border-0 text-xs font-medium capitalize">
              {user?.role || "Consumer"}
            </Badge>
          </div>
        </div>

        {/* Stats row */}
        <div className="relative mt-5 grid grid-cols-3 gap-2">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-white/10">
            <div className="text-2xl font-black text-white">{matches.length}</div>
            <div className="text-[10px] text-white/70 mt-0.5 font-medium">Matches</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-white/10">
            <div className="text-xl font-black text-white">{user?.onboardingCompleted ? "✓" : "—"}</div>
            <div className="text-[10px] text-white/70 mt-0.5 font-medium">Onboarding</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-white/10">
            <div className="flex items-center justify-center gap-0.5">
              <Star className="w-4 h-4 fill-amber-300 text-amber-300" />
              <span className="text-lg font-black text-white">4.8</span>
            </div>
            <div className="text-[10px] text-white/70 mt-0.5 font-medium">Avg Rating</div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 -mt-1">
        {/* Preferences */}
        {profileFields.length > 0 && (
          <Card className="shadow-xs border-border/60">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <div className="w-6 h-6 bg-primary/10 rounded-md flex items-center justify-center">
                  <Settings className="w-3.5 h-3.5 text-primary" />
                </div>
                Your Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-0">
              {profileFields.map(({ icon: Icon, label, value }, i) => (
                <div key={label}>
                  {i > 0 && <Separator className="my-0" />}
                  <div className="flex items-center gap-3 py-3">
                    <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-muted-foreground">{label}</div>
                      <div className="text-sm font-semibold text-foreground">{value}</div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Sign out */}
        <Card className="shadow-xs border-border/60 overflow-hidden">
          <CardContent className="p-0">
            <button
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              className="w-full flex items-center gap-3 px-4 py-4 text-destructive hover:bg-destructive/5 transition-colors disabled:opacity-60"
              data-testid="button-logout"
            >
              <div className="w-8 h-8 bg-destructive/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <LogOut className="w-4 h-4 text-destructive" />
              </div>
              <span className="text-sm font-semibold flex-1 text-left">
                {logoutMutation.isPending ? "Signing out..." : "Sign Out"}
              </span>
              <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
