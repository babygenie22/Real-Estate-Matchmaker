import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Star, MapPin, Globe, Heart, X, Award, TrendingUp, Clock, DollarSign,
  Phone, Linkedin, BadgeCheck, BarChart2, Languages, Sparkles, ChevronRight,
} from "lucide-react";
import type { Agent } from "@shared/schema";
import { cityAreas as getCityAreas, initials as getInitials, formatPrice } from "@/lib/agentUtils";

interface AgentDetailModalProps {
  agent: Agent & { matchScore?: number };
  onClose: () => void;
  onLike: () => void;
  onPass: () => void;
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${i <= Math.round(rating) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

function SectionHeading({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
      <Icon className="w-3.5 h-3.5 text-primary" />
      {label}
    </h3>
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

  const cityAreas = getCityAreas(agent.serviceAreas);
  const initials = getInitials(agent.name);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm max-h-[92vh] overflow-y-auto p-0 rounded-2xl border-0 shadow-2xl">

        {/* ── HERO ─────────────────────────────────────────────────── */}
        <div className="relative">
          {/* Photo — contained, not full bleed */}
          <div className="relative h-52 bg-gradient-to-br from-primary/20 via-primary/10 to-muted overflow-hidden rounded-t-2xl">
            {agent.photo ? (
              <img
                src={agent.photo}
                alt={agent.name}
                className="w-full h-full object-cover object-top"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-24 h-24 rounded-full bg-primary/15 border-4 border-primary/20 flex items-center justify-center text-3xl font-black text-primary">
                  {initials}
                </div>
              </div>
            )}
            {/* Gradient for text legibility */}
            <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/80 to-transparent" />

            {/* Match score pill */}
            {agent.matchScore != null && (
              <div className="absolute top-3 left-3 flex items-center gap-1 bg-green-500/90 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-full shadow border border-green-400/40">
                ✦ {agent.matchScore}% Match
              </div>
            )}

            {/* License badge */}
            {agent.licenseNumber && (
              <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/40 backdrop-blur-sm text-white/90 text-[10px] font-semibold px-2 py-1 rounded-full border border-white/20">
                <BadgeCheck className="w-3 h-3 text-blue-300" />
                Licensed
              </div>
            )}

            {/* Name + rating overlay */}
            <div className="absolute bottom-3 left-4 right-4">
              <h2 className="text-xl font-bold text-white leading-tight">{agent.name}</h2>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <StarRow rating={agent.rating || 0} />
                <span className="text-white font-semibold text-sm">{agent.rating?.toFixed(1)}</span>
                <span className="text-white/60 text-xs">({agent.reviewCount} reviews)</span>
                <span className="text-white/40">·</span>
                <span className="text-white/70 text-xs">{agent.yearsExperience} yrs exp</span>
              </div>
            </div>
          </div>

          {/* ── Match score progress bar ──────────────────────────── */}
          {agent.matchScore != null && (
            <div className="px-4 pt-3 pb-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-foreground">Match Strength</span>
                <span className="text-xs font-bold text-green-600">{agent.matchScore}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all duration-500"
                  style={{ width: `${agent.matchScore}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="p-4 space-y-5">

          {/* ── STATS GRID ───────────────────────────────────────────── */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { icon: TrendingUp, label: "Deals", value: agent.transactionCount != null ? String(agent.transactionCount) : "—" },
              { icon: Clock, label: "Avg DOM", value: agent.avgDaysOnMarket != null ? `${agent.avgDaysOnMarket}d` : "—" },
              { icon: BarChart2, label: "S/L Ratio", value: `${((agent.saleToListRatio || 1) * 100).toFixed(0)}%` },
              { icon: Award, label: "Reviews", value: String(agent.reviewCount) },
            ].map(stat => (
              <div key={stat.label} className="text-center p-2.5 rounded-xl bg-muted/50 border border-border">
                <div className="w-6 h-6 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-1.5">
                  <stat.icon className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="text-sm font-bold text-foreground">{stat.value}</div>
                <div className="text-[10px] text-muted-foreground leading-tight">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* ── CONTACT ─────────────────────────────────────────────── */}
          {(agent.phone || agent.website || agent.linkedinUrl) && (
            <div>
              <SectionHeading icon={Phone} label="Contact" />
              <div className="space-y-2">
                {agent.phone && (
                  <a
                    href={`tel:${agent.phone}`}
                    className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border hover:bg-primary/5 hover:border-primary/20 transition-colors group"
                  >
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Phone className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] text-muted-foreground font-medium">Phone</div>
                      <div className="text-sm font-semibold text-foreground">{agent.phone}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                  </a>
                )}
                {agent.website && (
                  <a
                    href={agent.website.startsWith("http") ? agent.website : `https://${agent.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border hover:bg-primary/5 hover:border-primary/20 transition-colors group"
                  >
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Globe className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] text-muted-foreground font-medium">Website</div>
                      <div className="text-sm font-semibold text-foreground truncate">{agent.website.replace(/^https?:\/\//, "")}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                  </a>
                )}
                {agent.linkedinUrl && (
                  <a
                    href={agent.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border hover:bg-primary/5 hover:border-primary/20 transition-colors group"
                  >
                    <div className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Linkedin className="w-4 h-4 text-sky-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] text-muted-foreground font-medium">LinkedIn</div>
                      <div className="text-sm font-semibold text-foreground truncate">View Profile</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* ── LICENSE ─────────────────────────────────────────────── */}
          {agent.licenseNumber && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 border border-blue-100">
              <BadgeCheck className="w-5 h-5 text-blue-500 flex-shrink-0" />
              <div>
                <div className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide">Michigan License</div>
                <div className="text-sm font-bold text-foreground">{agent.licenseNumber}</div>
              </div>
            </div>
          )}

          {/* ── BIO ─────────────────────────────────────────────────── */}
          {agent.bio && (
            <div>
              <SectionHeading icon={Sparkles} label="About" />
              <p className="text-sm text-muted-foreground leading-relaxed">{agent.bio}</p>
            </div>
          )}

          {/* ── SPECIALTIES ─────────────────────────────────────────── */}
          {agent.specialties && agent.specialties.length > 0 && (
            <div>
              <SectionHeading icon={Award} label="Specialties" />
              <div className="flex flex-wrap gap-2">
                {agent.specialties.map(s => (
                  <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* ── SERVICE AREAS ───────────────────────────────────────── */}
          {cityAreas.length > 0 && (
            <div>
              <SectionHeading icon={MapPin} label="Service Areas" />
              <div className="flex flex-wrap gap-2">
                {cityAreas.map(area => (
                  <span key={area} className="text-xs px-2.5 py-1 rounded-lg bg-muted text-muted-foreground border border-border flex items-center gap-1">
                    <MapPin className="w-2.5 h-2.5" />{area}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── LANGUAGES ───────────────────────────────────────────── */}
          {agent.languages && agent.languages.length > 0 && (
            <div>
              <SectionHeading icon={Languages} label="Languages" />
              <div className="flex flex-wrap gap-2">
                {agent.languages.map(lang => (
                  <Badge key={lang} variant="outline" className="text-xs">{lang}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* ── PRICE RANGE ─────────────────────────────────────────── */}
          {agent.priceRangeMin && agent.priceRangeMax && (
            <div>
              <SectionHeading icon={DollarSign} label="Price Range" />
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border">
                <div className="text-sm font-semibold text-foreground">{formatPrice(agent.priceRangeMin)}</div>
                <div className="flex-1 h-1.5 bg-border rounded-full relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/40 to-primary rounded-full" />
                </div>
                <div className="text-sm font-semibold text-foreground">{formatPrice(agent.priceRangeMax)}</div>
              </div>
            </div>
          )}

          {/* ── AGENT STYLE ─────────────────────────────────────────── */}
          {agent.personalityTags && agent.personalityTags.length > 0 && (
            <div>
              <SectionHeading icon={Sparkles} label="Agent Style" />
              <div className="flex flex-wrap gap-2">
                {agent.personalityTags.map(tag => (
                  <Badge key={tag} className="text-xs bg-primary/10 text-primary border-primary/20">{tag}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* ── REVIEWS ─────────────────────────────────────────────── */}
          <div>
            <SectionHeading icon={Star} label={`Client Reviews${reviews.length > 0 ? ` (${reviews.length})` : ""}`} />
            {reviewsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-16 rounded-xl" />
                <Skeleton className="h-16 rounded-xl" />
              </div>
            ) : reviews.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-2">No reviews yet — be the first after working with this agent.</p>
            ) : (
              <div className="space-y-2.5">
                {reviews.map((review: any) => (
                  <div key={review.id} className="p-3.5 rounded-xl bg-muted/40 border border-border">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-foreground">{review.userName || "Client"}</span>
                      <StarRow rating={review.rating} />
                    </div>
                    {review.text && <p className="text-xs text-muted-foreground leading-relaxed">"{review.text}"</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── ACTION BUTTONS ──────────────────────────────────────── */}
          <div className="flex gap-3 pt-1 pb-1">
            <Button
              variant="outline"
              className="flex-1 gap-2 h-11 border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-xl"
              onClick={onPass}
              data-testid="button-modal-pass"
            >
              <X className="w-4 h-4" /> Pass
            </Button>
            <Button
              className="flex-1 gap-2 h-11 bg-green-500 hover:bg-green-600 text-white border-0 shadow-sm rounded-xl"
              onClick={onLike}
              data-testid="button-modal-like"
            >
              <Heart className="w-4 h-4 fill-white" /> Like Agent
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
