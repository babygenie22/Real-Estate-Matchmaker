import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { User, MapPin, DollarSign, Building, Heart, MessageSquare, LogOut, Settings, ChevronRight } from "lucide-react";
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

  const userName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "User";
  const userInitials = userName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="flex-shrink-0 px-5 pt-5 pb-4 border-b border-border">
        <h2 className="text-xl font-bold text-foreground">My Profile</h2>
      </div>

      <div className="p-5 space-y-5">
        <Card className="shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="w-16 h-16 ring-2 ring-primary/20 ring-offset-2">
                  {user?.profileImageUrl ? (
                    <AvatarImage src={user.profileImageUrl} alt={userName} />
                  ) : null}
                  <AvatarFallback className="text-xl font-bold text-primary bg-primary/10">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-foreground truncate">{userName}</h3>
                {user?.email && (
                  <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                )}
                <Badge variant="secondary" className="mt-1.5 text-xs capitalize bg-primary/10 text-primary border-primary/20">
                  {user?.role || "Consumer"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {profileFields.length > 0 && (
          <Card className="shadow-sm">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Settings className="w-4 h-4 text-primary" />
                Your Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4 space-y-3">
              {profileFields.map(({ icon: Icon, label, value }, i) => (
                <div key={label}>
                  {i > 0 && <Separator className="mb-3" />}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">{label}</div>
                      <div className="text-sm font-semibold text-foreground">{value}</div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card className="shadow-sm">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-semibold text-foreground">Match Summary</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-primary/5 rounded-xl p-4 text-center border border-primary/10">
                <div className="text-3xl font-bold text-primary">{matches.length}</div>
                <div className="text-xs text-muted-foreground mt-1">Matches</div>
              </div>
              <div className="bg-muted/50 rounded-xl p-4 text-center border border-border">
                <div className={`text-xl font-bold ${user?.onboardingCompleted ? "text-green-600" : "text-amber-500"}`}>
                  {user?.onboardingCompleted ? "✓ Done" : "Pending"}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Onboarding</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <button
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              className="w-full flex items-center gap-3 px-5 py-4 text-destructive hover:bg-destructive/5 transition-colors rounded-lg disabled:opacity-60"
              data-testid="button-logout"
            >
              <div className="w-8 h-8 bg-destructive/10 rounded-lg flex items-center justify-center">
                <LogOut className="w-4 h-4 text-destructive" />
              </div>
              <span className="text-sm font-semibold">Sign Out</span>
              <ChevronRight className="w-4 h-4 ml-auto text-muted-foreground" />
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
