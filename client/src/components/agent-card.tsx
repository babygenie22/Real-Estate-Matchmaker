import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, MapPin, Heart, X, Info } from "lucide-react";
import type { Agent } from "@shared/schema";
import { motion, type PanInfo, useMotionValue, useTransform } from "framer-motion";
import AgentDetailModal from "./agent-detail-modal";

interface AgentCardProps {
  agent: Agent;
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
    if (info.offset.x > 100) {
      onLike(agent.id);
    } else if (info.offset.x < -100) {
      onPass(agent.id);
    }
  };

  const formatPrice = (n: number) => {
    if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
    return `$${(n / 1000).toFixed(0)}K`;
  };

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
        <div className="relative h-full rounded-2xl overflow-hidden shadow-xl bg-card border border-card-border">
          {agent.photo ? (
            <img
              src={agent.photo}
              alt={agent.name}
              className="absolute inset-0 w-full h-full object-cover"
              draggable="false"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center text-4xl font-bold text-primary">
                {agent.name.split(" ").map(n => n[0]).join("")}
              </div>
            </div>
          )}

          {/* gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent h-32" />

          {/* LIKE / PASS stamps */}
          <motion.div
            className="absolute top-8 left-6 flex items-center gap-2 bg-green-500 text-white font-black text-2xl px-5 py-2.5 rounded-xl border-4 border-green-400 shadow-lg"
            style={{ opacity: likeOpacity, rotate: -10 }}
          >
            <Heart className="w-6 h-6 fill-white" />
            LIKE
          </motion.div>
          <motion.div
            className="absolute top-8 right-6 flex items-center gap-2 bg-red-500 text-white font-black text-2xl px-5 py-2.5 rounded-xl border-4 border-red-400 shadow-lg"
            style={{ opacity: passOpacity, rotate: 10 }}
          >
            PASS
            <X className="w-6 h-6" />
          </motion.div>

          {/* Info button */}
          <button
            onClick={(e) => { e.stopPropagation(); if (!isDragging) setShowDetail(true); }}
            data-testid={`button-detail-${agent.id}`}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white border border-white/20 hover:bg-black/50 transition-colors z-10"
          >
            <Info className="w-4 h-4" />
          </button>

          {/* Card body */}
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <div className="mb-2">
              <h3 className="text-2xl font-bold text-white leading-tight">{agent.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                  <span className="text-white font-semibold text-sm">{agent.rating?.toFixed(1)}</span>
                  <span className="text-white/60 text-xs">({agent.reviewCount})</span>
                </div>
                <span className="text-white/30">·</span>
                <span className="text-white/70 text-xs">{agent.yearsExperience}yr exp</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-3">
              {agent.serviceAreas?.slice(0, 3).map((area) => (
                <div key={area} className="flex items-center gap-1 text-xs text-white/80 bg-white/10 backdrop-blur-sm rounded-full px-2.5 py-0.5 border border-white/10">
                  <MapPin className="w-2.5 h-2.5" />
                  {area}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2.5 text-center border border-white/10">
                <div className="text-white font-bold text-sm">{agent.transactionCount ?? "—"}</div>
                <div className="text-white/55 text-xs">Deals</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2.5 text-center border border-white/10">
                <div className="text-white font-bold text-sm">{agent.avgDaysOnMarket != null ? `${agent.avgDaysOnMarket}d` : "—"}</div>
                <div className="text-white/55 text-xs">Avg DOM</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2.5 text-center border border-white/10">
                <div className="text-white font-bold text-sm">{agent.saleToListRatio != null ? `${(agent.saleToListRatio * 100).toFixed(0)}%` : "—"}</div>
                <div className="text-white/55 text-xs">S/L Ratio</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-4">
              {agent.personalityTags?.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs bg-white/15 text-white border-white/15 backdrop-blur-sm">
                  {tag}
                </Badge>
              ))}
            </div>

            {isTop && (
              <div className="flex gap-3">
                <Button
                  size="lg"
                  variant="outline"
                  className="flex-1 bg-white/10 backdrop-blur-sm border-white/25 text-white hover:bg-red-500/80 hover:border-red-400 hover:text-white gap-2 transition-all"
                  onClick={() => onPass(agent.id)}
                  data-testid={`button-pass-${agent.id}`}
                >
                  <X className="w-5 h-5" />
                  Pass
                </Button>
                <Button
                  size="lg"
                  className="flex-1 gap-2 bg-green-500 hover:bg-green-600 text-white border-0 shadow-lg transition-all"
                  onClick={() => onLike(agent.id)}
                  data-testid={`button-like-${agent.id}`}
                >
                  <Heart className="w-5 h-5 fill-white" />
                  Like
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
