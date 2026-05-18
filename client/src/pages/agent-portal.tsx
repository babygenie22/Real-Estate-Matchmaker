import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import {
  Home, Star, MessageSquare, Calendar, User, BarChart3,
  CheckCircle, XCircle, Clock, LogOut, Edit2,
  Phone, Globe, Linkedin, MapPin, Award, Users, TrendingUp,
  AlertCircle, Save, X, MessageCircle, ArrowLeft, Send,
} from "lucide-react";

async function apiFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" }, credentials: "include", ...options });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

const SPECIALTIES = ["Luxury Homes","First-Time Buyers","Investment Properties","New Construction","Commercial","Foreclosures","Condos","Multi-Family","Land","Relocation"];
const LANGUAGES = ["English","Spanish","Mandarin","French","Portuguese","Hindi","Arabic","Korean","Vietnamese","Tagalog"];

type Tab = "overview" | "matches" | "bookings" | "profile";

// ─── Inline Chat Panel (agent side) ────────────────────────────────────────
function AgentChatPanel({ matchId, onBack }: { matchId: string; onBack: () => void }) {
  const [content, setContent] = useState("");
  const [localMessages, setLocalMessages] = useState<any[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { data: messages = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/agent-portal/messages", matchId],
    queryFn: async () => {
      const res = await fetch(`/api/matches/${matchId}/messages`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load messages");
      return res.json();
    },
    refetchInterval: 5000,
  });

  useEffect(() => { setLocalMessages(messages); }, [messages]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [localMessages]);

  const sendMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await fetch("/api/agent-portal/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ matchId, content: text }),
      });
      if (!res.ok) throw new Error("Failed to send");
      return res.json();
    },
    onSuccess: (msg: any) => {
      setLocalMessages(prev => {
        const without = prev.filter(m => !m.id?.startsWith("temp-"));
        return without.find(m => m.id === msg.id) ? without : [...without, msg];
      });
    },
    onError: () => {
      setLocalMessages(prev => prev.filter(m => !m.id?.startsWith("temp-")));
      toast({ title: "Error", description: "Failed to send message", variant: "destructive" });
    },
  });

  const handleSend = () => {
    if (!content.trim()) return;
    const text = content.trim();
    setContent("");
    const tempMsg = { id: `temp-${Date.now()}`, matchId, senderId: "agent", senderType: "agent", content: text, createdAt: new Date() };
    setLocalMessages(prev => [...prev, tempMsg]);
    sendMutation.mutate(text);
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background shadow-sm">
        <Button size="icon" variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">C</div>
        <div>
          <div className="font-semibold text-sm text-foreground">Client Chat</div>
          <div className="text-xs text-muted-foreground">Match #{matchId.slice(0, 8)}</div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-64 rounded-xl" />)}</div>
        ) : localMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center">
              <MessageSquare className="w-7 h-7 text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground">No messages yet</p>
            <p className="text-xs text-muted-foreground">Send a message to start the conversation.</p>
          </div>
        ) : (
          localMessages.map((msg: any) => {
            const isMe = msg.senderType === "agent";
            return (
              <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] px-3 py-2 rounded-xl text-sm leading-relaxed ${isMe ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm"}`}>
                  <p>{msg.content}</p>
                  {msg.createdAt && (
                    <p className={`text-xs mt-1 ${isMe ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      {format(new Date(msg.createdAt), "h:mm a")}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
      <div className="flex items-center gap-2 px-4 py-3 border-t border-border bg-background">
        <Input
          placeholder="Type a message..."
          value={content}
          onChange={e => setContent(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          className="flex-1"
        />
        <Button size="icon" onClick={handleSend} disabled={!content.trim() || sendMutation.isPending}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, color = "blue" }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string; color?: string;
}) {
  const colors: Record<string, string> = {
    blue: "bg-blue-500/15 text-blue-500",
    green: "bg-green-500/15 text-green-500",
    amber: "bg-amber-500/15 text-amber-500",
    purple: "bg-purple-500/15 text-purple-500",
  };
  return (
    <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 shadow-sm">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[color]}`}>
        {icon}
      </div>
      <div>
        <div className="text-xl font-bold text-foreground leading-none">{value}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
        {sub && <div className="text-xs text-muted-foreground/70">{sub}</div>}
      </div>
    </div>
  );
}

export default function AgentPortalPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Inline chat — agent portal navigates to /agent-portal/chat/:matchId
  const chatMatchId = location.startsWith("/agent-portal/chat/")
    ? location.slice("/agent-portal/chat/".length).split("?")[0]
    : null;

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "/";
  }

  // Booking decline/confirm state
  const [bookingAction, setBookingAction] = useState<{ id: string; mode: "confirm" | "decline" } | null>(null);
  const [confirmDate, setConfirmDate] = useState("");
  const [confirmTime, setConfirmTime] = useState("");
  const [agentNotes, setAgentNotes] = useState("");

  // Profile edit state
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState<Record<string, any>>({});

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/agent-portal/stats"],
    queryFn: () => apiFetch("/api/agent-portal/stats"),
    retry: false,
  });

  const { data: matches = [], isLoading: matchesLoading } = useQuery<any[]>({
    queryKey: ["/api/agent-portal/matches"],
    queryFn: () => apiFetch("/api/agent-portal/matches"),
    enabled: tab === "matches" || tab === "overview",
    retry: false,
  });

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery<any[]>({
    queryKey: ["/api/agent-portal/bookings"],
    queryFn: () => apiFetch("/api/agent-portal/bookings"),
    enabled: tab === "bookings" || tab === "overview",
    retry: false,
  });

  const { data: profile, isLoading: profileLoading } = useQuery<any>({
    queryKey: ["/api/agent-portal/me"],
    queryFn: () => apiFetch("/api/agent-portal/me"),
    retry: false,
  });

  useEffect(() => {
    if (profile && !editingProfile) {
      setProfileForm({
        name: profile.name || "",
        phone: profile.phone || "",
        bio: profile.bio || "",
        photo: profile.photo || "",
        website: profile.website || "",
        linkedinUrl: profile.linkedinUrl || "",
        yearsExperience: profile.yearsExperience || "",
        specialties: profile.specialties || [],
        languages: profile.languages || [],
        serviceAreas: profile.serviceAreas?.length ? profile.serviceAreas : [""],
        priceRangeMin: profile.priceRangeMin || "",
        priceRangeMax: profile.priceRangeMax || "",
      });
    }
  }, [profile, editingProfile]);

  const bookingMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) =>
      apiFetch(`/api/agent-portal/bookings/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent-portal/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agent-portal/stats"] });
      setBookingAction(null);
      setConfirmDate(""); setConfirmTime(""); setAgentNotes("");
      toast({ title: "Booking updated", description: "The client has been notified." });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const profileMutation = useMutation({
    mutationFn: (body: any) => apiFetch("/api/agent-portal/profile", { method: "PUT", body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent-portal/me"] });
      setEditingProfile(false);
      toast({ title: "Profile updated", description: "Your changes are live." });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  function toggleTag(field: "specialties" | "languages", val: string) {
    setProfileForm((f: any) => {
      const arr = (f[field] as string[]) || [];
      return { ...f, [field]: arr.includes(val) ? arr.filter((v: string) => v !== val) : [...arr, val] };
    });
  }

  const pendingBookings = bookings.filter((b: any) => b.status === "pending");

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Overview", icon: <BarChart3 className="w-4 h-4" /> },
    { id: "matches", label: "Clients", icon: <Users className="w-4 h-4" /> },
    { id: "bookings", label: "Bookings", icon: <Calendar className="w-4 h-4" /> },
    { id: "profile", label: "Profile", icon: <User className="w-4 h-4" /> },
  ];

  // Inline chat view for agent-portal/chat/:matchId
  if (chatMatchId) {
    return <AgentChatPanel matchId={chatMatchId} onBack={() => setLocation("/agent-portal")} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-background">
      <div className="max-w-3xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-sm">
              <Home className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-foreground leading-none">Agent Portal</h1>
              <p className="text-xs text-muted-foreground mt-0.5">HomeMatch Pro Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {stats && !stats.isApproved && (
              <Badge variant="outline" className="text-amber-500 border-amber-500/30 bg-amber-500/10 gap-1 text-xs">
                <AlertCircle className="w-3 h-3" /> Pending Approval
              </Badge>
            )}
            {stats?.isApproved && (
              <Badge className="bg-green-500/15 text-green-500 border-green-500/30 gap-1 text-xs">
                <CheckCircle className="w-3 h-3" /> Approved
              </Badge>
            )}
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Agent info strip */}
        {profile && (
          <div className="flex items-center gap-3 bg-card border border-border rounded-2xl p-3 mb-5 shadow-sm">
            {profile.photo ? (
              <img src={profile.photo} alt={profile.name} className="w-12 h-12 rounded-full object-cover border-2 border-primary/20" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                {profile.name?.[0] || "A"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-foreground truncate">{profile.name}</div>
              <div className="text-xs text-muted-foreground">License: {profile.licenseNumber}</div>
              {profile.rating > 0 && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span className="text-xs font-medium text-foreground">{Number(profile.rating).toFixed(1)}</span>
                  <span className="text-xs text-muted-foreground">({profile.reviewCount} reviews)</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-muted/60 rounded-xl p-1 mb-5">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                tab === t.id
                  ? "bg-card shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.icon}
              <span className="hidden sm:inline">{t.label}</span>
              {t.id === "bookings" && pendingBookings.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-destructive text-white text-[10px] flex items-center justify-center">{pendingBookings.length}</span>
              )}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>

            {/* OVERVIEW TAB */}
            {tab === "overview" && (
              <div className="space-y-4">
                {statsLoading ? (
                  <div className="grid grid-cols-2 gap-3">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
                  </div>
                ) : stats ? (
                  <div className="grid grid-cols-2 gap-3">
                    <StatCard icon={<Users className="w-5 h-5" />} label="Total Clients" value={stats.totalMatches} color="blue" />
                    <StatCard icon={<Clock className="w-5 h-5" />} label="Pending Bookings" value={stats.pendingBookings} color="amber" />
                    <StatCard icon={<CheckCircle className="w-5 h-5" />} label="Confirmed Meetings" value={stats.confirmedBookings} color="green" />
                    <StatCard icon={<Star className="w-5 h-5" />} label="Average Rating" value={stats.averageRating > 0 ? Number(stats.averageRating).toFixed(1) : "—"} sub={`${stats.totalReviews} reviews`} color="purple" />
                  </div>
                ) : null}

                {pendingBookings.length > 0 && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="w-4 h-4 text-amber-500" />
                      <span className="font-semibold text-amber-500 text-sm">Action Required</span>
                    </div>
                    <div className="space-y-2">
                      {pendingBookings.slice(0, 3).map((b: any) => (
                        <div key={b.id} className="flex items-center justify-between bg-card rounded-xl px-3 py-2 border border-border">
                          <div>
                            <div className="text-sm font-medium text-foreground">{b.userName || "Client"}</div>
                            <div className="text-xs text-muted-foreground">{b.proposedDate} · {b.proposedTime}</div>
                          </div>
                          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => { setTab("bookings"); setBookingAction({ id: b.id, mode: "confirm" }); }}>
                            Respond
                          </Button>
                        </div>
                      ))}
                    </div>
                    {pendingBookings.length > 3 && (
                      <button onClick={() => setTab("bookings")} className="text-xs text-amber-500 font-medium mt-2 hover:underline">
                        +{pendingBookings.length - 3} more →
                      </button>
                    )}
                  </div>
                )}

                {matches.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-foreground">Recent Clients</span>
                      <button onClick={() => setTab("matches")} className="text-xs text-primary font-medium hover:underline">View all</button>
                    </div>
                    <div className="space-y-2">
                      {matches.slice(0, 3).map((m: any) => (
                        <div key={m.id} className="flex items-center gap-3 bg-card border border-border rounded-xl p-3 shadow-sm">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold flex-shrink-0">
                            {m.userName?.[0] || "C"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-foreground truncate">{m.userName || "Client"}</div>
                            <div className="text-xs text-muted-foreground">Matched {new Date(m.createdAt).toLocaleDateString()}</div>
                          </div>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground" onClick={() => setLocation(`/agent-portal/chat/${m.id}`)}>
                            <MessageCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!statsLoading && stats?.totalMatches === 0 && (
                  <div className="text-center py-10 text-muted-foreground">
                    <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium text-foreground">No clients yet</p>
                    <p className="text-xs mt-1">Once your profile is approved, clients will start discovering you.</p>
                  </div>
                )}
              </div>
            )}

            {/* CLIENTS TAB */}
            {tab === "matches" && (
              <div className="space-y-3">
                <div className="text-sm font-semibold text-foreground mb-1">{matches.length} Matched Clients</div>
                {matchesLoading ? (
                  [...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)
                ) : matches.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium text-foreground">No clients yet</p>
                    <p className="text-xs mt-1">You'll see matched clients here once they swipe right on you.</p>
                  </div>
                ) : (
                  matches.map((m: any) => (
                    <div key={m.id} className="flex items-center gap-3 bg-card border border-border rounded-2xl p-3 shadow-sm">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                        {m.userName?.[0] || "C"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-foreground truncate">{m.userName || "Client"}</div>
                        <div className="text-xs text-muted-foreground">Matched {new Date(m.createdAt).toLocaleDateString()}</div>
                      </div>
                      <Button size="sm" className="gap-1.5 h-8 text-xs shadow-sm" onClick={() => setLocation(`/agent-portal/chat/${m.id}`)}>
                        <MessageSquare className="w-3.5 h-3.5" /> Chat
                      </Button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* BOOKINGS TAB */}
            {tab === "bookings" && (
              <div className="space-y-4">
                {bookingsLoading ? (
                  [...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
                ) : bookings.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium text-foreground">No booking requests</p>
                    <p className="text-xs mt-1">Clients can request a consultation from your profile.</p>
                  </div>
                ) : (
                  bookings.map((b: any) => {
                    const isActive = bookingAction?.id === b.id;
                    const statusColors: Record<string, string> = {
                      pending: "text-amber-500 bg-amber-500/15 border-amber-500/30",
                      confirmed: "text-green-500 bg-green-500/15 border-green-500/30",
                      declined: "text-red-500 bg-red-500/15 border-red-500/30",
                      rescheduled: "text-blue-500 bg-blue-500/15 border-blue-500/30",
                    };
                    return (
                      <div key={b.id} className="bg-card border border-border rounded-2xl p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <div className="font-medium text-foreground">{b.userName || "Client"}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              Requested: <strong>{b.proposedDate}</strong> at <strong>{b.proposedTime}</strong>
                            </div>
                            {b.confirmedDate && (
                              <div className="text-xs text-green-700 mt-0.5">
                                Confirmed: {b.confirmedDate} at {b.confirmedTime}
                              </div>
                            )}
                            {b.message && <div className="text-xs text-muted-foreground mt-1 italic">"{b.message}"</div>}
                          </div>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusColors[b.status] || "text-muted-foreground bg-muted border-border"}`}>
                            {b.status}
                          </span>
                        </div>

                        {b.status === "pending" && (
                          <>
                            {!isActive ? (
                              <div className="flex gap-2 mt-3">
                                <Button size="sm" className="flex-1 gap-1.5 h-8 text-xs bg-green-500 hover:bg-green-600 text-white shadow-sm"
                                  onClick={() => { setBookingAction({ id: b.id, mode: "confirm" }); setConfirmDate(b.proposedDate); setConfirmTime(b.proposedTime); }}>
                                  <CheckCircle className="w-3.5 h-3.5" /> Confirm
                                </Button>
                                <Button size="sm" variant="outline" className="flex-1 gap-1.5 h-8 text-xs text-destructive border-destructive/30 hover:bg-destructive/5"
                                  onClick={() => setBookingAction({ id: b.id, mode: "decline" })}>
                                  <XCircle className="w-3.5 h-3.5" /> Decline
                                </Button>
                              </div>
                            ) : (
                              <AnimatePresence mode="wait">
                                <motion.div
                                  key={bookingAction.mode}
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="mt-3 space-y-2"
                                >
                                  {bookingAction.mode === "confirm" ? (
                                    <>
                                      <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                          <Label className="text-xs">Confirmed Date</Label>
                                          <Input type="date" className="h-8 text-xs" value={confirmDate} onChange={e => setConfirmDate(e.target.value)} />
                                        </div>
                                        <div className="space-y-1">
                                          <Label className="text-xs">Confirmed Time</Label>
                                          <Input type="time" className="h-8 text-xs" value={confirmTime} onChange={e => setConfirmTime(e.target.value)} />
                                        </div>
                                      </div>
                                      <div className="space-y-1">
                                        <Label className="text-xs">Note to client (optional)</Label>
                                        <Input className="h-8 text-xs" placeholder="e.g. We'll meet at 123 Main St lobby" value={agentNotes} onChange={e => setAgentNotes(e.target.value)} />
                                      </div>
                                    </>
                                  ) : (
                                    <div className="space-y-1">
                                      <Label className="text-xs">Reason for declining (optional)</Label>
                                      <Input className="h-8 text-xs" placeholder="e.g. Not available that day" value={agentNotes} onChange={e => setAgentNotes(e.target.value)} />
                                    </div>
                                  )}
                                  <div className="flex gap-2">
                                    <Button size="sm" className="flex-1 h-8 text-xs shadow-sm"
                                      disabled={bookingMutation.isPending}
                                      onClick={() => bookingMutation.mutate({
                                        id: b.id,
                                        body: bookingAction.mode === "confirm"
                                          ? { status: "confirmed", confirmedDate: confirmDate, confirmedTime: confirmTime, agentNotes: agentNotes || undefined }
                                          : { status: "declined", agentNotes: agentNotes || undefined },
                                      })}>
                                      {bookingMutation.isPending ? "Saving…" : bookingAction.mode === "confirm" ? "Confirm Meeting" : "Decline Request"}
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => { setBookingAction(null); setAgentNotes(""); }}>
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </motion.div>
                              </AnimatePresence>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* PROFILE TAB */}
            {tab === "profile" && (
              <div className="space-y-4">
                {profileLoading ? (
                  <Skeleton className="h-64 rounded-2xl" />
                ) : profile ? (
                  <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-foreground">Your Profile</h3>
                      {!editingProfile ? (
                        <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => setEditingProfile(true)}>
                          <Edit2 className="w-3.5 h-3.5" /> Edit
                        </Button>
                      ) : (
                        <div className="flex gap-2">
                          <Button size="sm" className="gap-1.5 h-8 text-xs shadow-sm" disabled={profileMutation.isPending}
                            onClick={() => profileMutation.mutate({
                              name: profileForm.name,
                              phone: profileForm.phone || undefined,
                              bio: profileForm.bio || undefined,
                              photo: profileForm.photo || undefined,
                              website: profileForm.website || undefined,
                              linkedinUrl: profileForm.linkedinUrl || undefined,
                              yearsExperience: profileForm.yearsExperience ? Number(profileForm.yearsExperience) : undefined,
                              specialties: profileForm.specialties,
                              languages: profileForm.languages,
                              serviceAreas: (profileForm.serviceAreas as string[]).filter(Boolean),
                              priceRangeMin: profileForm.priceRangeMin ? Number(profileForm.priceRangeMin) : undefined,
                              priceRangeMax: profileForm.priceRangeMax ? Number(profileForm.priceRangeMax) : undefined,
                            })}>
                            <Save className="w-3.5 h-3.5" /> {profileMutation.isPending ? "Saving…" : "Save"}
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setEditingProfile(false)}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {!editingProfile ? (
                      /* View mode */
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          {profile.photo ? (
                            <img src={profile.photo} alt={profile.name} className="w-16 h-16 rounded-full object-cover border-2 border-primary/20" />
                          ) : (
                            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl">{profile.name?.[0]}</div>
                          )}
                          <div>
                            <div className="font-bold text-foreground">{profile.name}</div>
                            <div className="text-xs text-muted-foreground">License: {profile.licenseNumber}</div>
                            {profile.yearsExperience && <div className="text-xs text-muted-foreground">{profile.yearsExperience} years experience</div>}
                          </div>
                        </div>
                        {profile.bio && <p className="text-sm text-muted-foreground">{profile.bio}</p>}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {profile.phone && <div className="flex items-center gap-1.5 text-muted-foreground"><Phone className="w-3.5 h-3.5" />{profile.phone}</div>}
                          {profile.website && <div className="flex items-center gap-1.5 text-muted-foreground"><Globe className="w-3.5 h-3.5" /><a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">Website</a></div>}
                          {profile.linkedinUrl && <div className="flex items-center gap-1.5 text-muted-foreground"><Linkedin className="w-3.5 h-3.5" /><a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">LinkedIn</a></div>}
                        </div>
                        {profile.serviceAreas?.length > 0 && (
                          <div>
                            <div className="text-xs font-medium text-foreground mb-1 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />Service Areas</div>
                            <div className="flex flex-wrap gap-1">{profile.serviceAreas.map((a: string) => <Badge key={a} variant="outline" className="text-xs">{a}</Badge>)}</div>
                          </div>
                        )}
                        {profile.specialties?.length > 0 && (
                          <div>
                            <div className="text-xs font-medium text-foreground mb-1 flex items-center gap-1"><Award className="w-3.5 h-3.5" />Specialties</div>
                            <div className="flex flex-wrap gap-1">{profile.specialties.map((s: string) => <Badge key={s} className="text-xs">{s}</Badge>)}</div>
                          </div>
                        )}
                        {profile.languages?.length > 0 && (
                          <div>
                            <div className="text-xs font-medium text-foreground mb-1">Languages</div>
                            <div className="flex flex-wrap gap-1">{profile.languages.map((l: string) => <Badge key={l} variant="secondary" className="text-xs">{l}</Badge>)}</div>
                          </div>
                        )}
                        {(profile.priceRangeMin || profile.priceRangeMax) && (
                          <div className="text-xs text-muted-foreground">
                            Price range: ${Number(profile.priceRangeMin || 0).toLocaleString()} – ${Number(profile.priceRangeMax || 0).toLocaleString()}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Edit mode */
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1 col-span-2">
                            <Label className="text-xs">Full Name</Label>
                            <Input className="h-8 text-sm" value={profileForm.name || ""} onChange={e => setProfileForm((f: any) => ({ ...f, name: e.target.value }))} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Phone</Label>
                            <Input className="h-8 text-sm" placeholder="+1 (555) 000-0000" value={profileForm.phone || ""} onChange={e => setProfileForm((f: any) => ({ ...f, phone: e.target.value }))} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Years Experience</Label>
                            <Input type="number" className="h-8 text-sm" value={profileForm.yearsExperience || ""} onChange={e => setProfileForm((f: any) => ({ ...f, yearsExperience: e.target.value }))} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Profile Photo URL</Label>
                            <Input className="h-8 text-sm" placeholder="https://..." value={profileForm.photo || ""} onChange={e => setProfileForm((f: any) => ({ ...f, photo: e.target.value }))} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Website</Label>
                            <Input className="h-8 text-sm" placeholder="https://..." value={profileForm.website || ""} onChange={e => setProfileForm((f: any) => ({ ...f, website: e.target.value }))} />
                          </div>
                          <div className="space-y-1 col-span-2">
                            <Label className="text-xs">LinkedIn URL</Label>
                            <Input className="h-8 text-sm" placeholder="https://linkedin.com/in/..." value={profileForm.linkedinUrl || ""} onChange={e => setProfileForm((f: any) => ({ ...f, linkedinUrl: e.target.value }))} />
                          </div>
                          <div className="space-y-1 col-span-2">
                            <Label className="text-xs">Bio</Label>
                            <Textarea rows={3} className="text-sm" value={profileForm.bio || ""} onChange={e => setProfileForm((f: any) => ({ ...f, bio: e.target.value }))} />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Service Areas</Label>
                          {(profileForm.serviceAreas as string[])?.map((area: string, i: number) => (
                            <div key={i} className="flex gap-2">
                              <Input className="h-8 text-sm" placeholder="e.g. Ann Arbor, MI" value={area}
                                onChange={e => { const arr = [...(profileForm.serviceAreas as string[])]; arr[i] = e.target.value; setProfileForm((f: any) => ({ ...f, serviceAreas: arr })); }} />
                              {(profileForm.serviceAreas as string[]).length > 1 && (
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setProfileForm((f: any) => ({ ...f, serviceAreas: (f.serviceAreas as string[]).filter((_: any, j: number) => j !== i) }))}>✕</Button>
                              )}
                            </div>
                          ))}
                          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setProfileForm((f: any) => ({ ...f, serviceAreas: [...(f.serviceAreas as string[]), ""] }))}>+ Add area</Button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Min Price</Label>
                            <Input type="number" className="h-8 text-sm" placeholder="200000" value={profileForm.priceRangeMin || ""} onChange={e => setProfileForm((f: any) => ({ ...f, priceRangeMin: e.target.value }))} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Max Price</Label>
                            <Input type="number" className="h-8 text-sm" placeholder="2000000" value={profileForm.priceRangeMax || ""} onChange={e => setProfileForm((f: any) => ({ ...f, priceRangeMax: e.target.value }))} />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Specialties</Label>
                          <div className="flex flex-wrap gap-1.5">
                            {SPECIALTIES.map(s => (
                              <Badge key={s} variant={(profileForm.specialties as string[])?.includes(s) ? "default" : "outline"} className="cursor-pointer select-none text-xs" onClick={() => toggleTag("specialties", s)}>{s}</Badge>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Languages</Label>
                          <div className="flex flex-wrap gap-1.5">
                            {LANGUAGES.map(l => (
                              <Badge key={l} variant={(profileForm.languages as string[])?.includes(l) ? "default" : "outline"} className="cursor-pointer select-none text-xs" onClick={() => toggleTag("languages", l)}>{l}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
