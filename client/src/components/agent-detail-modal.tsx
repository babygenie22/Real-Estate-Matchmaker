import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, MapPin, Globe, Heart, X, Award, TrendingUp, Clock, DollarSign } from "lucide-react";
import type { Agent } from "@shared/schema";

interface AgentDetailModalProps {
  agent: Agent;
  onClose: () => void;
  onLike: () => void;
  onPass: () => void;
}

const formatPrice = (n: number) => {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  return `$${(n / 1000).toFixed(0)}K`;
};

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${i <= Math.round(rating) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

export default function AgentDetailModal({ agent, onClose, onLike, onPass }: AgentDetailModalProps) {
  const { data: reviews = [], isLoading: reviewsLoading } = useQuery<any[]>({
    queryKey: [`/api/agents/${agent.id}/reviews`],
    queryFn: async () => {
      const res = await fetch(`/api/agents/${agent.id}/reviews`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0 rounded-2xl">
        {/* Hero */}
        <div className="relative">
          {agent.photo ? (
            <img src={agent.photo} alt={agent.name} className="w-full h-60 object-cover object-top" />
          ) : (
            <div className="w-full h-60 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-3xl font-bold text-primary">
                {agent.name.split(" ").map(n => n[0]).join("")}
              </div>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <div className="absolute bottom-4 left-5 right-5">
            <h2 className="text-2xl font-bold text-white">{agent.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <StarRow rating={agent.rating || 0} />
              <span className="text-white font-semibold text-sm">{agent.rating?.toFixed(1)}</span>
              <span className="text-white/60 text-xs">({agent.reviewCount} reviews)</span>
              <span className="text-white/40">·</span>
              <span className="text-white/70 text-xs">{agent.yearsExperience} yrs exp</span>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { icon: TrendingUp, label: "Deals", value: agent.transactionCount != null ? String(agent.transactionCount) : "—" },
              { icon: Clock, label: "Avg Days", value: agent.avgDaysOnMarket != null ? `${agent.avgDaysOnMarket}d` : "—" },
              { icon: Star, label: "Sale/List", value: `${((agent.saleToListRatio || 1) * 100).toFixed(0)}%` },
              { icon: Award, label: "Reviews", value: String(agent.reviewCount) },
            ].map((stat) => (
              <div key={stat.label} className="text-center p-3 rounded-xl bg-muted/50 border border-border">
                <div className="w-6 h-6 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-1.5">
                  <stat.icon className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="text-sm font-bold text-foreground">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Bio */}
          {agent.bio && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">About</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{agent.bio}</p>
            </div>
          )}

          {/* Specialties */}
          {agent.specialties && agent.specialties.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">Specialties</h3>
              <div className="flex flex-wrap gap-2">
                {agent.specialties.map((s) => (
                  <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Service Areas */}
          {agent.serviceAreas && agent.serviceAreas.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                Service Areas
              </h3>
              <div className="flex flex-wrap gap-2">
                {agent.serviceAreas.map((area) => (
                  <span key={area} className="text-xs px-2.5 py-1 rounded-lg bg-muted text-muted-foreground border border-border">{area}</span>
                ))}
              </div>
            </div>
          )}

          {/* Languages */}
          {agent.languages && agent.languages.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-primary" />
                Languages
              </h3>
              <div className="flex flex-wrap gap-2">
                {agent.languages.map((lang) => (
                  <Badge key={lang} variant="outline" className="text-xs">{lang}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Price Range */}
          {agent.priceRangeMin && agent.priceRangeMax && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-primary" />
                Price Range
              </h3>
              <p className="text-sm text-muted-foreground">
                {formatPrice(agent.priceRangeMin)} – {formatPrice(agent.priceRangeMax)}
              </p>
            </div>
          )}

          {/* Agent Style */}
          {agent.personalityTags && agent.personalityTags.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">Agent Style</h3>
              <div className="flex flex-wrap gap-2">
                {agent.personalityTags.map((tag) => (
                  <Badge key={tag} className="text-xs bg-primary/10 text-primary border-primary/20">{tag}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Reviews */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
              Client Reviews
              {reviews.length > 0 && <span className="text-muted-foreground font-normal">({reviews.length})</span>}
            </h3>
            {reviewsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-16 rounded-xl" />
                <Skeleton className="h-16 rounded-xl" />
              </div>
            ) : reviews.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No reviews yet — be the first to leave one after working with this agent.</p>
            ) : (
              <div className="space-y-3">
                {reviews.map((review: any) => (
                  <div key={review.id} className="p-3.5 rounded-xl bg-muted/40 border border-border">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-foreground">{review.userName || "Client"}</span>
                      <StarRow rating={review.rating} />
                    </div>
                    {review.text && <p className="text-xs text-muted-foreground leading-relaxed">"{review.text}"</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1 gap-2 border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600"
              onClick={onPass}
              data-testid="button-modal-pass"
            >
              <X className="w-4 h-4" />
              Pass
            </Button>
            <Button
              className="flex-1 gap-2 bg-green-500 hover:bg-green-600 text-white border-0 shadow-sm"
              onClick={onLike}
              data-testid="button-modal-like"
            >
              <Heart className="w-4 h-4 fill-white" />
              Like
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
