import { useState, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Star, MapPin, Clock, TrendingUp, ThumbsUp, X, Info } from "lucide-react";
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
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const likeOpacity = useTransform(x, [30, 100], [0, 1]);
  const passOpacity = useTransform(x, [-100, -30], [1, 0]);

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
        style={{ x, rotate }}
        drag={isTop ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        whileDrag={{ scale: 1.03 }}
        data-testid={`card-agent-${agent.id}`}
      >
        <div className="relative h-full rounded-xl overflow-hidden shadow-xl bg-card border border-card-border">
          {agent.photo ? (
            <img
              src={agent.photo}
              alt={agent.name}
              className="absolute inset-0 w-full h-full object-cover"
              draggable="false"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <Avatar className="w-32 h-32">
                <AvatarFallback className="text-4xl font-bold text-primary bg-primary/10">
                  {agent.name.split(" ").map(n => n[0]).join("")}
                </AvatarFallback>
              </Avatar>
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

          <motion.div
            className="absolute top-6 left-6 bg-green-500 text-white font-bold text-xl px-4 py-2 rounded-lg border-4 border-green-400"
            style={{ opacity: likeOpacity, rotate: -12 }}
          >
            LIKE
          </motion.div>
          <motion.div
            className="absolute top-6 right-6 bg-red-500 text-white font-bold text-xl px-4 py-2 rounded-lg border-4 border-red-400"
            style={{ opacity: passOpacity, rotate: 12 }}
          >
            PASS
          </motion.div>

          <div className="absolute bottom-0 left-0 right-0 p-5">
            <div className="flex items-end justify-between gap-2 mb-3">
              <div>
                <h3 className="text-2xl font-bold text-white">{agent.name}</h3>
                <div className="flex items-center gap-1.5 mt-1">
                  <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                  <span className="text-white font-semibold text-sm">{agent.rating?.toFixed(1)}</span>
                  <span className="text-white/70 text-xs">({agent.reviewCount} reviews)</span>
                  <span className="text-white/50 text-xs">·</span>
                  <span className="text-white/70 text-xs">{agent.yearsExperience}yr exp</span>
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setShowDetail(true); }}
                data-testid={`button-detail-${agent.id}`}
                className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white border border-white/30"
              >
                <Info className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-3">
              {agent.serviceAreas?.slice(0, 3).map((area) => (
                <div key={area} className="flex items-center gap-1 text-xs text-white/80 bg-white/10 backdrop-blur-sm rounded-full px-2 py-0.5">
                  <MapPin className="w-2.5 h-2.5" />
                  {area}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-md p-2 text-center">
                <div className="text-white font-bold text-sm">{agent.transactionCount}</div>
                <div className="text-white/60 text-xs">Transactions</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-md p-2 text-center">
                <div className="text-white font-bold text-sm">{agent.avgDaysOnMarket}d</div>
                <div className="text-white/60 text-xs">Avg on Market</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-md p-2 text-center">
                <div className="text-white font-bold text-sm">{((agent.saleToListRatio || 1) * 100).toFixed(0)}%</div>
                <div className="text-white/60 text-xs">Sale/List</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-4">
              {agent.personalityTags?.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs bg-white/20 text-white border-white/20">
                  {tag}
                </Badge>
              ))}
            </div>

            {isTop && (
              <div className="flex gap-3">
                <Button
                  size="lg"
                  variant="outline"
                  className="flex-1 bg-white/10 backdrop-blur-sm border-white/30 text-white gap-2"
                  onClick={() => onPass(agent.id)}
                  data-testid={`button-pass-${agent.id}`}
                >
                  <X className="w-5 h-5 text-red-400" />
                  Pass
                </Button>
                <Button
                  size="lg"
                  className="flex-1 gap-2 bg-green-500 text-white border-green-400"
                  onClick={() => onLike(agent.id)}
                  data-testid={`button-like-${agent.id}`}
                >
                  <ThumbsUp className="w-5 h-5" />
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
