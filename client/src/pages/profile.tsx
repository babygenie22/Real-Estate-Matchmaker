import { useState } from "react";
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

export default function ProfilePage() {
  const { user } = useAuth();

  const { data: matches = [] } = useQuery<MatchWithAgent[]>({
    queryKey: ["/api/matches"],
  });

  const profileFields = [
    { icon: MapPin, label: "Location", value: user?.location },
    { icon: DollarSign, label: "Budget", value: user?.budget },
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
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16">
                {user?.profileImageUrl ? (
                  <AvatarImage src={user.profileImageUrl} alt={userName} />
                ) : null}
                <AvatarFallback className="text-xl font-bold text-primary bg-primary/10">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-foreground truncate">{userName}</h3>
                {user?.email && (
                  <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                )}
                <Badge variant="secondary" className="mt-1.5 text-xs capitalize">
                  {user?.role || "Consumer"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {profileFields.length > 0 && (
          <Card>
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-semibold text-foreground">Your Preferences</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4 space-y-3">
              {profileFields.map(({ icon: Icon, label, value }, i) => (
                <div key={label}>
                  {i > 0 && <Separator className="mb-3" />}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-md flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">{label}</div>
                      <div className="text-sm font-medium text-foreground">{value}</div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-semibold text-foreground">Match Summary</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/50 rounded-md p-3 text-center">
                <div className="text-2xl font-bold text-foreground">{matches.length}</div>
                <div className="text-xs text-muted-foreground">Matches</div>
              </div>
              <div className="bg-muted/50 rounded-md p-3 text-center">
                <div className="text-2xl font-bold text-foreground">
                  {user?.onboardingCompleted ? "Done" : "Pending"}
                </div>
                <div className="text-xs text-muted-foreground">Onboarding</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <a
              href="/api/logout"
              className="flex items-center gap-3 px-5 py-4 text-destructive hover-elevate rounded-lg"
              data-testid="link-logout"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium">Sign Out</span>
              <ChevronRight className="w-4 h-4 ml-auto" />
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
