import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, SlidersHorizontal, X, CheckCircle, RefreshCw, TrendingUp, ChevronDown, ChevronUp } from "lucide-react";
import AgentCard from "@/components/agent-card";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Agent } from "@shared/schema";
import { AnimatePresence, motion } from "framer-motion";

interface Filters {
  search: string;
  specialty: string;
  language: string;
  zipCode: string;
}

const fmt = (n: number) => n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : `$${(n / 1000).toFixed(0)}K`;

function MarketWidget({ zipCode }: { zipCode: string }) {
  const [expanded, setExpanded] = useState(false);
  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/market-data", zipCode],
    queryFn: async () => {
      const res = await fetch(`/api/market-data?zipCode=${zipCode}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: zipCode.length === 5,
    staleTime: 5 * 60 * 1000,
  });

  if (!zipCode || zipCode.length !== 5) return null;
  if (isLoading) return <div className="h-8 bg-muted animate-pulse rounded-xl mt-2" />;
  if (!data) return null;

  const change = data.monthOverMonthChange;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="mt-2"
    >
      <button
        className="w-full flex items-center gap-2 px-3 py-2 bg-primary/8 border border-primary/15 rounded-xl text-left"
        onClick={() => setExpanded(v => !v)}
      >
        <TrendingUp className="w-3.5 h-3.5 text-primary flex-shrink-0" />
        <span className="text-xs font-medium text-primary flex-1">
          {data.city || zipCode} Market · Median {fmt(data.medianListPrice || 0)}
          {change !== null && (
            <span className={`ml-1.5 ${change >= 0 ? "text-green-600" : "text-red-500"}`}>
              {change >= 0 ? "↑" : "↓"}{Math.abs(change).toFixed(1)}% MoM
            </span>
          )}
        </span>
        {expanded ? <ChevronUp className="w-3 h-3 text-primary/60" /> : <ChevronDown className="w-3 h-3 text-primary/60" />}
      </button>
      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="grid grid-cols-4 gap-1.5 mt-1.5"
        >
          {[
            { label: "List Price", value: fmt(data.medianListPrice || 0) },
            { label: "Sale Price", value: fmt(data.medianSalePrice || 0) },
            { label: "Days on Mkt", value: `${data.averageDaysOnMarket}d` },
            { label: "Price/sqft", value: `$${data.pricePerSqft}` },
          ].map(s => (
            <div key={s.label} className="bg-background rounded-lg border border-border p-2 text-center">
              <div className="text-xs font-bold text-foreground">{s.value}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{s.label}</div>
            </div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}

export default function DiscoverPage() {
  const [filters, setFilters] = useState<Filters>({ search: "", specialty: "", language: "", zipCode: "" });
  const [showFilters, setShowFilters] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [matchAnimation, setMatchAnimation] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: agents = [], isLoading } = useQuery<Agent[]>({
    // Include filters in queryKey so React Query refetches when filters change
    queryKey: ["/api/agents", { scored: "true", ...filters }],
    queryFn: async () => {
      const params = new URLSearchParams({ scored: "true" });
      if (filters.search) params.append("search", filters.search);
      if (filters.specialty) params.append("specialty", filters.specialty);
      if (filters.language) params.append("language", filters.language);
      const res = await fetch(`/api/agents?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch agents");
      return res.json();
    },
  });

  const likeMutation = useMutation({
    mutationFn: async ({ agentId, liked }: { agentId: string; liked: boolean }) => {
      const res = await apiRequest("POST", "/api/likes", { agentId, liked });
      return res.json();
    },
    onSuccess: (_, variables) => {
      if (variables.liked) {
        setMatchAnimation(true);
        setTimeout(() => setMatchAnimation(false), 2000);
        queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      }
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to record swipe", variant: "destructive" });
    },
  });

  const handleLike = useCallback((agentId: string) => {
    setDismissed(prev => new Set(prev).add(agentId));
    likeMutation.mutate({ agentId, liked: true });
  }, [likeMutation]);

  const handlePass = useCallback((agentId: string) => {
    setDismissed(prev => new Set(prev).add(agentId));
    likeMutation.mutate({ agentId, liked: false });
  }, [likeMutation]);

  const visibleAgents = agents.filter(a => !dismissed.has(a.id));
  const topAgents = visibleAgents.slice(0, 3);

  const handleReset = () => {
    setDismissed(new Set());
    queryClient.invalidateQueries({ queryKey: ["/api/agents", { scored: "true", ...filters }] });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0 px-4 pt-3 pb-3 border-b border-border/60 bg-background">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search agents..."
              className="pl-9"
              value={filters.search}
              onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
              data-testid="input-search-agents"
            />
          </div>
          <Button
            variant={showFilters ? "default" : "outline"}
            size="icon"
            onClick={() => setShowFilters(v => !v)}
            data-testid="button-toggle-filters"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </Button>
        </div>

        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex gap-2 mt-2 flex-wrap"
          >
            <Select value={filters.specialty} onValueChange={(v) => setFilters(f => ({ ...f, specialty: v === "all" ? "" : v }))}>
              <SelectTrigger className="w-44 h-9 text-xs" data-testid="select-specialty">
                <SelectValue placeholder="Specialty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Specialties</SelectItem>
                <SelectItem value="Luxury Homes">Luxury Homes</SelectItem>
                <SelectItem value="First-Time Buyers">First-Time Buyers</SelectItem>
                <SelectItem value="Investment Properties">Investment Properties</SelectItem>
                <SelectItem value="New Construction">New Construction</SelectItem>
                <SelectItem value="Commercial">Commercial</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.language} onValueChange={(v) => setFilters(f => ({ ...f, language: v === "all" ? "" : v }))}>
              <SelectTrigger className="w-36 h-9 text-xs" data-testid="select-language">
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Languages</SelectItem>
                <SelectItem value="English">English</SelectItem>
                <SelectItem value="Spanish">Spanish</SelectItem>
                <SelectItem value="Mandarin">Mandarin</SelectItem>
                <SelectItem value="Hindi">Hindi</SelectItem>
                <SelectItem value="Portuguese">Portuguese</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="ZIP code"
              className="w-24 h-9 text-xs"
              maxLength={5}
              value={filters.zipCode}
              onChange={e => setFilters(f => ({ ...f, zipCode: e.target.value.replace(/\D/g, "") }))}
            />
            {(filters.specialty || filters.language || filters.search || filters.zipCode) && (
              <Button variant="ghost" size="sm" className="h-9 gap-1.5 text-xs text-muted-foreground" onClick={() => setFilters({ search: "", specialty: "", language: "", zipCode: "" })}>
                <X className="w-3 h-3" />
                Clear
              </Button>
            )}
          </motion.div>
        )}
        <MarketWidget zipCode={filters.zipCode} />
      </div>

      <div className="flex-1 relative flex items-center justify-center overflow-hidden p-4">
        <AnimatePresence>
          {matchAnimation && (
            <motion.div
              key="match-animation"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.2, opacity: 0 }}
              className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
            >
              <div className="flex flex-col items-center gap-3">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: 2, duration: 0.4 }}
                  className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center"
                >
                  <CheckCircle className="w-12 h-12 text-white" />
                </motion.div>
                <div className="text-2xl font-bold text-foreground">It's a Match!</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {isLoading ? (
          <div className="w-full max-w-sm">
            <Skeleton className="w-full aspect-[3/4] rounded-xl" />
          </div>
        ) : visibleAgents.length === 0 ? (
          <div className="flex flex-col items-center gap-5 text-center max-w-xs">
            <div className="w-28 h-28 bg-gradient-to-br from-primary/15 to-primary/5 rounded-3xl flex items-center justify-center border border-primary/10">
              <Search className="w-12 h-12 text-primary/40" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground mb-2">You've seen them all!</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">You've browsed all available Michigan agents. Reset your deck to rediscover great matches.</p>
            </div>
            <Button onClick={handleReset} className="gap-2 rounded-xl px-6 shadow-sm" data-testid="button-reset-discover">
              <RefreshCw className="w-4 h-4" />
              Reset Deck
            </Button>
          </div>
        ) : (
          <div className="relative w-full max-w-sm" style={{ height: "min(70vh, 520px)" }}>
            <AnimatePresence mode="popLayout">
              {topAgents.map((agent, i) => (
                <motion.div
                  key={agent.id}
                  className="absolute inset-0"
                  style={{
                    zIndex: topAgents.length - i,
                    transform: `scale(${1 - i * 0.04}) translateY(${i * -12}px)`,
                    transformOrigin: "bottom center",
                  }}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
                >
                  <AgentCard
                    agent={agent}
                    onLike={handleLike}
                    onPass={handlePass}
                    isTop={i === 0}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {visibleAgents.length > 0 && (
        <div className="flex-shrink-0 px-4 pb-4 pt-2 border-t border-border bg-background/80 backdrop-blur">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{visibleAgents.length} agents remaining</span>
            <div className="flex gap-1">
              {visibleAgents.slice(0, 5).map((_, i) => (
                <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === 0 ? "bg-primary" : "bg-muted-foreground/30"}`} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
