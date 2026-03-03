import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Star, MapPin, Heart } from "lucide-react";
import type { Agent, Match } from "@shared/schema";

type MatchWithAgent = Match & { agent: Agent };

export default function MatchesPage() {
  const [, setLocation] = useLocation();

  const { data: matches = [], isLoading } = useQuery<MatchWithAgent[]>({
    queryKey: ["/api/matches"],
  });

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-6">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
          <Heart className="w-10 h-10 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-1">No matches yet</h3>
          <p className="text-sm text-muted-foreground">Like agents in the Discover tab to create matches and unlock messaging.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-border">
        <h2 className="text-lg font-bold text-foreground">Your Matches</h2>
        <p className="text-sm text-muted-foreground">{matches.length} agent{matches.length !== 1 ? "s" : ""} matched</p>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {matches.map((match) => (
          <MatchCard
            key={match.id}
            match={match}
            onMessage={() => setLocation(`/chat/${match.id}`)}
          />
        ))}
      </div>
    </div>
  );
}

function MatchCard({ match, onMessage }: { match: MatchWithAgent; onMessage: () => void }) {
  const agent = match.agent;
  return (
    <Card className="hover-elevate cursor-pointer" onClick={onMessage} data-testid={`card-match-${match.id}`}>
      <CardContent className="p-4 flex items-center gap-4">
        <Avatar className="w-14 h-14 flex-shrink-0">
          {agent.photo ? (
            <AvatarImage src={agent.photo} alt={agent.name} />
          ) : null}
          <AvatarFallback className="text-lg font-bold text-primary bg-primary/10">
            {agent.name.split(" ").map(n => n[0]).join("")}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-foreground text-sm">{agent.name}</h3>
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              <span className="text-xs text-muted-foreground">{agent.rating?.toFixed(1)}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3 text-muted-foreground" />
            <p className="text-xs text-muted-foreground truncate">{agent.serviceAreas?.slice(0, 2).join(", ")}</p>
          </div>
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {agent.specialties?.slice(0, 2).map((s) => (
              <Badge key={s} variant="secondary" className="text-xs py-0">{s}</Badge>
            ))}
          </div>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5 flex-shrink-0" onClick={(e) => { e.stopPropagation(); onMessage(); }} data-testid={`button-message-${match.id}`}>
          <MessageSquare className="w-3.5 h-3.5" />
          Chat
        </Button>
      </CardContent>
    </Card>
  );
}
