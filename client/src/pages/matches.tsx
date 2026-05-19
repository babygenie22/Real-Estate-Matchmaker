import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Star, MapPin, Heart, ChevronRight } from "lucide-react";
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
          <Skeleton key={i} className="h-28 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-5 text-center p-8">
        <div className="w-24 h-24 bg-gradient-to-br from-primary/20 to-primary/5 rounded-3xl flex items-center justify-center">
          <Heart className="w-11 h-11 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-foreground mb-1.5">No matches yet</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Swipe right on agents in Discover to create matches and unlock messaging.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Page header */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3 bg-background">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground tracking-tight">Your Matches</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{matches.length} agent{matches.length !== 1 ? "s" : ""} ready to chat</p>
          </div>
          <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
            <Heart className="w-4.5 h-4.5 text-primary fill-primary/30" />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3 pt-2">
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
    <div
      className="group relative overflow-hidden rounded-2xl bg-card border border-border shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer active:scale-[0.99]"
      onClick={onMessage}
      data-testid={`card-match-${match.id}`}
    >
      <div className="flex items-stretch">
        {/* Photo strip */}
        <div className="w-24 flex-shrink-0 relative overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5">
          {agent.photo ? (
            <img
              src={agent.photo}
              alt={agent.name}
              className="w-full h-full object-cover object-top"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-2xl font-black text-primary/60">
                {agent.name.split(" ").map(n => n[0]).join("")}
              </span>
            </div>
          )}
          {/* Online dot indicator */}
          <div className="absolute bottom-2 right-2 w-3 h-3 bg-green-400 rounded-full border-2 border-card shadow-sm" />
        </div>

        {/* Content */}
        <div className="flex-1 px-3.5 py-3 flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-foreground text-[15px] leading-tight">{agent.name}</h3>
              <div className="flex items-center gap-0.5 flex-shrink-0 mt-0.5">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span className="text-xs font-bold text-foreground">{agent.rating?.toFixed(1)}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 mt-1">
              <MapPin className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              <span className="text-xs text-muted-foreground truncate">{agent.serviceAreas?.filter(a => !/^\d+$/.test(a)).slice(0, 2).join(", ")}</span>
            </div>
          </div>

          <div className="flex items-center justify-between mt-2.5">
            <div className="flex gap-1.5 flex-wrap">
              {agent.specialties?.slice(0, 2).map((s) => (
                <span key={s} className="text-[10px] font-medium text-primary bg-primary/8 px-2 py-0.5 rounded-full">{s}</span>
              ))}
            </div>
            <button
              className="flex items-center gap-1 text-xs font-semibold text-primary bg-primary/8 hover:bg-primary/15 px-3 py-1.5 rounded-xl transition-colors"
              onClick={(e) => { e.stopPropagation(); onMessage(); }}
              data-testid={`button-message-${match.id}`}
            >
              <MessageSquare className="w-3 h-3" />
              Chat
            </button>
          </div>
        </div>

        {/* Right chevron */}
        <div className="flex items-center pr-2">
          <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
        </div>
      </div>
    </div>
  );
}
