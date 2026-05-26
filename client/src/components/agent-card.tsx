import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, MapPin, Heart, X, Info, TrendingUp, Clock, BarChart2 } from "lucide-react";
import type { Agent } from "@shared/schema";
import { motion, type PanInfo, useMotionValue, useTransform } from "framer-motion";
import AgentDetailModal from "./agent-detail-modal";
import { cityAreas as getCityAreas, initials as getInitials } from "@/lib/agentUtils";

interface AgentCardProps {
  agent: Agent & { matchScore?: number };
  onLike: (agentId: string) => void;
  onPass: (agentId: string) => void;
  isTop?: boolean;
}

export default function AgentCard({ agent, onLike, onPass, isTop }: AgentCardProps) {
  const [showDetail, setShowDetail] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-12, 12]);
  const likeOpacity = useTransform(x, [40, 120], [0, 1]);
  const passOpacity = useTransform(x, [-120, -40], [1, 0]);
  const cardScale = useTransform(x, [-150, 0, 150], [0.97, 1, 0.97]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    setIsDragging(false);
    if (info.offset.x > 100) onLike(agent.id);
    else if (info.offset.x < -100) onPass(agent.id);
  };

  const cityAreas = getCityAreas(agent.serviceAreas);
  const initials = getInitials(agent.name);

  return (
    <>
      <motion.div
        className="absolute inset-0 cursor-grab active:cursor-grabbing select-none"
        style={{ x, rotate, scale: cardScale }}
        drag={isTop ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.12}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        data-testid={`card-agent-${agent.id}`}
      >
        <div className="relative h-full rounded-2xl overflow-hidden shadow-xl bg-card border border-border flex flex-col">

          {/* ── PHOTO SECTION (top 56%) ─────────────────────────────── */}
          <div className="relative flex-shrink-0" style={{ height: "56%" }}>
            {agent.photo ? (
              <img
                src={agent.photo}
                alt={agent.name}
                className="w-full h-full object-cover object-top"
                draggable="false"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/25 via-primary/10 to-primary/5 flex items-center justify-center">
                <div className="w-24 h-24 rounded-full bg-primary/15 border-4 border-primary/20 flex items-center justify-center text-3xl font-black text-primary">
                  {initials}
                </div>
              </div>
            )}

            {/* Subtle bottom fade into the card panel */}
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card to-transparent" />

            {/* LIKE / PASS stamps */}
            <motion.div
              className="absolute top-6 left-5 flex items-center gap-2 bg-green-500 text-white font-black text-xl px-4 py-2 rounded-xl border-4 border-green-400 shadow-lg"
              style={{ opacity: likeOpacity, rotate: -10 }}
            >
              <Heart className="w-5 h-5 fill-white" /> LIKE
            </motion.div>
            <motion.div
              className="absolute top-6 right-5 flex items-center gap-2 bg-red-500 text-white font-black text-xl px-4 py-2 rounded-xl border-4 border-red-400 shadow-lg"
              style={{ opacity: passOpacity, rotate: 10 }}
            >
              PASS <X className="w-5 h-5" />
            </motion.div>

            {/* Match score badge — top left */}
            {agent.matchScore != null && (
              <div className="absolute top-3 left-3 z-10 flex items-center gap-1 bg-green-500/90 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-md border border-green-400/40">
                ✦ {agent.matchScore}% Match
              </div>
            )}

            {/* Info button — top right */}
            <button
              onClick={(e) => { e.stopPropagation(); if (!isDragging) setShowDetail(true); }}
              data-testid={`button-detail-${agent.id}`}
              aria-label="View agent details"
              className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/25 backdrop-blur-sm flex items-center justify-center text-white border border-white/20 hover:bg-black/45 transition-colors"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>

          {/* ── INFO PANEL (bottom 44%) ──────────────────────────────── */}
          <div className="flex flex-col flex-1 px-4 pt-3 pb-4 min-h-0 overflow-hidden">
            {/* Name + rating */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-foreground leading-tight truncate">{agent.name}</h3>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <div className="flex items-center gap-0.5">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span className="text-sm font-bold text-foreground">{agent.rating?.toFixed(1)}</span>
                    <span className="text-xs text-muted-foreground ml-0.5">({agent.reviewCount})</span>
                  </div>
                  <span className="text-muted-foreground/40 text-xs">·</span>
                  <span className="text-xs text-muted-foreground">{agent.yearsExperience} yrs exp</span>
                </div>
              </div>
              {/* License badge */}
              {agent.licenseNumber && (
                <span className="flex-shrink-0 text-[9px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border mt-0.5">
                  Licensed
                </span>
              )}
            </div>

            {/* Service areas */}
            {cityAreas.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2.5">
                {cityAreas.slice(0, 3).map(area => (
                  <div key={area} className="flex items-center gap-0.5 text-[10px] text-muted-foreground bg-muted/60 rounded-full px-2 py-0.5 border border-border/60">
                    <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                    {area}
                  </div>
                ))}
              </div>
            )}

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-1.5 mb-2.5">
              <div className="bg-muted/50 rounded-xl p-2 text-center border border-border/50">
                <div className="flex items-center justify-center gap-0.5 mb-0.5">
                  <TrendingUp className="w-2.5 h-2.5 text-primary" />
                </div>
                <div className="text-sm font-bold text-foreground">{agent.transactionCount ?? "—"}</div>
                <div className="text-[9px] text-muted-foreground leading-tight">Deals</div>
              </div>
              <div className="bg-muted/50 rounded-xl p-2 text-center border border-border/50">
                <div className="flex items-center justify-center gap-0.5 mb-0.5">
                  <Clock className="w-2.5 h-2.5 text-primary" />
                </div>
                <div className="text-sm font-bold text-foreground">{agent.avgDaysOnMarket != null ? `${agent.avgDaysOnMarket}d` : "—"}</div>
                <div className="text-[9px] text-muted-foreground leading-tight">Avg DOM</div>
              </div>
              <div className="bg-muted/50 rounded-xl p-2 text-center border border-border/50">
                <div className="flex items-center justify-center gap-0.5 mb-0.5">
                  <BarChart2 className="w-2.5 h-2.5 text-primary" />
                </div>
                <div className="text-sm font-bold text-foreground">{agent.saleToListRatio != null ? `${(agent.saleToListRatio * 100).toFixed(0)}%` : "—"}</div>
                <div className="text-[9px] text-muted-foreground leading-tight">S/L Ratio</div>
              </div>
            </div>

            {/* Personality tags */}
            {agent.personalityTags && agent.personalityTags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {agent.personalityTags.slice(0, 3).map(tag => (
                  <Badge key={tag} variant="secondary" className="text-[10px] px-2 py-0 h-5 bg-primary/8 text-primary border-primary/15">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Action buttons */}
            {isTop && (
              <div className="flex gap-2 mt-auto">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 gap-1.5 border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-all h-9"
                  onClick={() => onPass(agent.id)}
                  data-testid={`button-pass-${agent.id}`}
                >
                  <X className="w-4 h-4" /> Pass
                </Button>
                <Button
                  size="sm"
                  className="flex-1 gap-1.5 bg-green-500 hover:bg-green-600 text-white border-0 shadow-sm transition-all h-9"
                  onClick={() => onLike(agent.id)}
                  data-testid={`button-like-${agent.id}`}
                >
                  <Heart className="w-4 h-4 fill-white" /> Like
                </Button>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {showDetail && (
        <AgentDetailModal
          agent={agent}
          onClose={() => setShowDetail(false)}
          onLike={() => { setShowDetail(false); onLike(agent.id); }}
          onPass={() => { setShowDetail(false); onPass(agent.id); }}
        />
      )}
    </>
  );
}
