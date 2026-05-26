import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Star, MapPin, Heart, ChevronRight, Info } from "lucide-react";
import AgentDetailModal from "@/components/agent-detail-modal";
import { relativeTime } from "@/lib/dateUtils";
import { cityAreas as getCityAreas, initials as getInitials } from "@/lib/agentUtils";
import type { Agent, Match, Message } from "@shared/schema";

type MatchWithAgent = Match & { agent: Agent; lastMessage?: Message };

export default function MatchesPage() {
  const [, setLocation] = useLocation();
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

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
            <Heart className="w-4 h-4 text-primary fill-primary/30" />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2.5 pt-1">
        {matches.map((match) => (
          <MatchCard
            key={match.id}
            match={match}
            onMessage={() => setLocation(`/chat/${match.id}`)}
            onViewProfile={() => setSelectedAgent(match.agent)}
          />
        ))}
      </div>

      {/* Agent detail modal */}
      {selectedAgent && (
        <AgentDetailModal
          agent={selectedAgent}
          onClose={() => setSelectedAgent(null)}
          onLike={() => setSelectedAgent(null)}
          onPass={() => setSelectedAgent(null)}
        />
      )}
    </div>
  );
}

function MatchCard({
  match,
  onMessage,
  onViewProfile,
}: {
  match: MatchWithAgent;
  onMessage: () => void;
  onViewProfile: () => void;
}) {
  const agent = match.agent;
  const lastMsg = match.lastMessage;
  const hasUnread = lastMsg && lastMsg.senderType === "agent";

  return (
    <div
      className="group relative overflow-hidden rounded-2xl bg-card border border-border shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.99]"
      data-testid={`card-match-${match.id}`}
    >
      <div className="flex items-stretch">
        {/* Photo strip — click opens profile */}
        <button
          className="w-[88px] flex-shrink-0 relative overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 focus:outline-none"
          onClick={onViewProfile}
          aria-label={`View ${agent.name}'s profile`}
        >
          {agent.photo ? (
            <img
              src={agent.photo}
              alt={agent.name}
              className="w-full h-full object-cover object-top"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-2xl font-black text-primary/60">
                {getInitials(agent.name)}
              </span>
            </div>
          )}
          {/* Online dot */}
          <div className="absolute bottom-2 right-2 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-card shadow-sm" />
          {/* Info overlay on hover */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <Info className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
          </div>
        </button>

        {/* Content — click opens profile */}
        <button
          className="flex-1 px-3 py-3 flex flex-col justify-between min-w-0 text-left focus:outline-none"
          onClick={onViewProfile}
        >
          <div>
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-foreground text-[15px] leading-tight">{agent.name}</h3>
              <div className="flex items-center gap-0.5 flex-shrink-0 mt-0.5">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span className="text-xs font-bold text-foreground">{agent.rating?.toFixed(1)}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              <span className="text-xs text-muted-foreground truncate">
                {getCityAreas(agent.serviceAreas).slice(0, 2).join(", ")}
              </span>
            </div>

            {/* Last message preview */}
            {lastMsg ? (
              <div className="flex items-center gap-1.5 mt-1.5">
                {hasUnread && (
                  <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                )}
                <p className={`text-xs truncate ${hasUnread ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                  {lastMsg.senderType === "user" ? "You: " : ""}{lastMsg.content}
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground/60 italic mt-1.5">No messages yet — say hello!</p>
            )}
          </div>

          {/* Timestamp */}
          {lastMsg?.createdAt && (
            <p className="text-[10px] text-muted-foreground/50 mt-1">
              {relativeTime(lastMsg.createdAt)}
            </p>
          )}
        </button>

        {/* Right action column */}
        <div className="flex flex-col items-center justify-between pr-3 py-3 gap-2 flex-shrink-0">
          <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
          <button
            className="flex items-center gap-1 text-xs font-semibold text-primary bg-primary/[0.08] hover:bg-primary/[0.15] px-2.5 py-1.5 rounded-xl transition-colors"
            onClick={(e) => { e.stopPropagation(); onMessage(); }}
            data-testid={`button-message-${match.id}`}
          >
            <MessageSquare className="w-3 h-3" />
            Chat
          </button>
        </div>
      </div>
    </div>
  );
}
