import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Star, MapPin, Globe, ThumbsUp, X, Award, TrendingUp, Clock, DollarSign } from "lucide-react";
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

export default function AgentDetailModal({ agent, onClose, onLike, onPass }: AgentDetailModalProps) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0">
        <div className="relative">
          {agent.photo ? (
            <img src={agent.photo} alt={agent.name} className="w-full h-56 object-cover object-top" />
          ) : (
            <div className="w-full h-56 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <Avatar className="w-24 h-24">
                <AvatarFallback className="text-3xl font-bold text-primary">{agent.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
              </Avatar>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-4 left-5 right-5">
            <h2 className="text-2xl font-bold text-white">{agent.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
              <span className="text-white font-semibold text-sm">{agent.rating?.toFixed(1)}</span>
              <span className="text-white/70 text-xs">({agent.reviewCount} reviews)</span>
              <span className="text-white/50">·</span>
              <span className="text-white/70 text-xs">{agent.yearsExperience} years experience</span>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-5">
          <div className="grid grid-cols-4 gap-3">
            {[
              { icon: TrendingUp, label: "Transactions", value: String(agent.transactionCount) },
              { icon: Clock, label: "Avg Days", value: `${agent.avgDaysOnMarket}d` },
              { icon: Star, label: "Sale/List", value: `${((agent.saleToListRatio || 1) * 100).toFixed(0)}%` },
              { icon: Award, label: "Reviews", value: String(agent.reviewCount) },
            ].map((stat) => (
              <div key={stat.label} className="text-center p-3 rounded-md bg-muted/50">
                <div className="w-6 h-6 bg-primary/10 rounded flex items-center justify-center mx-auto mb-1">
                  <stat.icon className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="text-sm font-bold text-foreground">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>

          {agent.bio && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">About</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{agent.bio}</p>
            </div>
          )}

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

          {agent.serviceAreas && agent.serviceAreas.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                Service Areas
              </h3>
              <div className="flex flex-wrap gap-2">
                {agent.serviceAreas.map((area) => (
                  <span key={area} className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground">{area}</span>
                ))}
              </div>
            </div>
          )}

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

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1 gap-2 border-red-200 text-red-500" onClick={onPass} data-testid="button-modal-pass">
              <X className="w-4 h-4" />
              Pass
            </Button>
            <Button className="flex-1 gap-2 bg-green-600 text-white" onClick={onLike} data-testid="button-modal-like">
              <ThumbsUp className="w-4 h-4" />
              Like
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
