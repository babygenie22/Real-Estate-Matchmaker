import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Send, Star, MapPin, Phone } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import type { Agent, Match, Message } from "@shared/schema";
import { io } from "socket.io-client";
import { format, isToday, isYesterday, isSameDay } from "date-fns";

type MatchWithAgent = Match & { agent: Agent };

const QUICK_REPLIES = [
  "Hi! I'm looking for a home 👋",
  "What's the market like?",
  "Can we schedule a call?",
  "What areas do you cover?",
];

function DateSeparator({ date }: { date: Date }) {
  let label: string;
  if (isToday(date)) label = "Today";
  else if (isYesterday(date)) label = "Yesterday";
  else label = format(date, "MMMM d, yyyy");

  return (
    <div className="flex items-center gap-2 py-1">
      <div className="flex-1 h-px bg-border/60" />
      <span className="text-[10px] font-semibold text-muted-foreground/60 px-1 uppercase tracking-wide">{label}</span>
      <div className="flex-1 h-px bg-border/60" />
    </div>
  );
}

export default function ChatPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const { toast } = useToast();

  const { data: matches = [], isLoading: matchesLoading } = useQuery<MatchWithAgent[]>({
    queryKey: ["/api/matches"],
  });

  const match = matches.find(m => m.id === matchId);
  const agent = match?.agent;

  useEffect(() => {
    if (!matchesLoading && !match) {
      setLocation("/matches");
    }
  }, [matchesLoading, match, setLocation]);

  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: ["/api/matches", matchId, "messages"],
    queryFn: async () => {
      const res = await fetch(`/api/matches/${matchId}/messages`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
    enabled: !!matchId,
  });

  useEffect(() => {
    if (messages.length > 0 && !initializedRef.current) {
      initializedRef.current = true;
      setLocalMessages(messages);
    }
  }, [messages]);

  useEffect(() => {
    const s = io(window.location.origin, { withCredentials: true });
    s.emit("join-match", matchId);

    const handler = (msg: Message) => {
      if (msg.matchId === matchId && msg.senderType !== "user") {
        setLocalMessages(prev => {
          const exists = prev.find(m => m.id === msg.id);
          if (exists) return prev;
          return [...prev, msg];
        });
      }
    };

    s.on("new-message", handler);
    return () => { s.off("new-message", handler); s.disconnect(); };
  }, [matchId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages]);

  const sendMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await apiRequest("POST", "/api/messages", {
        matchId,
        content: text,
        senderId: user?.id,
        senderType: "user",
      });
      return res.json();
    },
    onSuccess: (savedMsg: Message) => {
      setLocalMessages(prev => {
        const withoutTemp = prev.filter(m => !m.id.startsWith("temp-"));
        const exists = withoutTemp.find(m => m.id === savedMsg.id);
        if (exists) return withoutTemp;
        return [...withoutTemp, savedMsg];
      });
    },
    onError: () => {
      setLocalMessages(prev => prev.filter(m => !m.id.startsWith("temp-")));
      toast({ title: "Error", description: "Failed to send message", variant: "destructive" });
    },
  });

  const handleSend = (text?: string) => {
    const msg = (text ?? content).trim();
    if (!msg || !user) return;
    setContent("");

    const tempId = `temp-${Date.now()}`;
    const optimistic: Message = {
      id: tempId,
      matchId: matchId!,
      senderId: user?.id || "",
      senderType: "user",
      content: msg,
      createdAt: new Date(),
    };
    setLocalMessages(prev => [...prev, optimistic]);
    sendMutation.mutate(msg);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Build message list with date separators
  const messageItems: Array<{ type: "date"; date: Date } | { type: "message"; msg: Message }> = [];
  let lastDate: Date | null = null;
  for (const msg of localMessages) {
    const msgDate = new Date(msg.createdAt ?? Date.now());
    if (!lastDate || !isSameDay(lastDate, msgDate)) {
      messageItems.push({ type: "date", date: msgDate });
      lastDate = msgDate;
    }
    messageItems.push({ type: "message", msg });
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-3 px-3 py-2.5 border-b border-border bg-background shadow-xs">
        <Button size="icon" variant="ghost" className="w-8 h-8 rounded-xl" onClick={() => setLocation("/matches")} data-testid="button-back-matches">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        {agent ? (
          <>
            <Avatar className="w-9 h-9 flex-shrink-0">
              {agent.photo ? <AvatarImage src={agent.photo} className="object-cover object-top" alt={agent.name} /> : null}
              <AvatarFallback className="text-sm font-bold text-primary bg-primary/10">
                {agent.name.split(" ").map(n => n[0]).join("")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm text-foreground leading-tight truncate">{agent.name}</div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  <span className="text-xs text-muted-foreground">{agent.rating?.toFixed(1)}</span>
                </div>
                {agent.serviceAreas?.filter(a => !/^\d+$/.test(a))[0] && (
                  <>
                    <span className="text-muted-foreground/30 text-xs">·</span>
                    <div className="flex items-center gap-0.5">
                      <MapPin className="w-2.5 h-2.5 text-muted-foreground/60" />
                      <span className="text-xs text-muted-foreground/70 truncate max-w-[120px]">
                        {agent.serviceAreas.filter(a => !/^\d+$/.test(a))[0]}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
            {agent.phone && (
              <a
                href={`tel:${agent.phone}`}
                className="w-8 h-8 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center text-green-600 hover:bg-green-100 transition-colors flex-shrink-0"
                aria-label="Call agent"
              >
                <Phone className="w-3.5 h-3.5" />
              </a>
            )}
          </>
        ) : (
          <Skeleton className="h-9 w-48" />
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2" data-testid="messages-container">
        {isLoading ? (
          <div className="space-y-3 pt-2">
            {[1, 2, 3].map(i => (
              <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
                <Skeleton className="h-10 rounded-xl" style={{ width: `${Math.random() * 100 + 100}px` }} />
              </div>
            ))}
          </div>
        ) : localMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-8 px-6">
            <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl flex items-center justify-center border border-primary/10">
              <Send className="w-7 h-7 text-primary" />
            </div>
            <div>
              <p className="text-base font-bold text-foreground">Say hello to {agent?.name?.split(" ")[0] ?? "your agent"}!</p>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                Introduce yourself and ask about homes in {agent?.serviceAreas?.filter(a => !/^\d+$/.test(a))[0] ?? "your area"}.
              </p>
            </div>
          </div>
        ) : (
          messageItems.map((item, idx) => {
            if (item.type === "date") {
              return <DateSeparator key={`date-${idx}`} date={item.date} />;
            }
            const { msg } = item;
            const isMe = msg.senderType === "user";
            return (
              <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`} data-testid={`message-${msg.id}`}>
                {!isMe && (
                  <Avatar className="w-6 h-6 flex-shrink-0 mr-1.5 mt-0.5">
                    {agent?.photo ? <AvatarImage src={agent.photo} className="object-cover object-top" /> : null}
                    <AvatarFallback className="text-[9px] font-bold text-primary bg-primary/10">
                      {agent?.name?.split(" ").map(n => n[0]).join("") ?? "A"}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  isMe
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-muted text-foreground rounded-bl-sm"
                }`}>
                  <p>{msg.content}</p>
                  {msg.createdAt && (
                    <p className={`text-[10px] mt-1 ${isMe ? "text-primary-foreground/60" : "text-muted-foreground/70"}`}>
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

      {/* Quick reply chips — only when there are messages (empty state has its own suggestions) */}
      {localMessages.length > 0 && (
        <div className="flex-shrink-0 px-3 py-2 border-t border-border/50 bg-background/80 backdrop-blur-sm overflow-x-auto">
          <div className="flex gap-1.5 min-w-max">
            {QUICK_REPLIES.map(reply => (
              <button
                key={reply}
                onClick={() => handleSend(reply)}
                className="text-xs text-primary bg-primary/[0.08] hover:bg-primary/[0.15] border border-primary/15 px-3 py-1.5 rounded-full whitespace-nowrap transition-colors font-medium"
              >
                {reply}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="flex-shrink-0 flex items-center gap-2 px-4 py-3 bg-background border-t border-border">
        <Input
          placeholder="Type a message..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 rounded-xl bg-muted/40 border-border/50 text-sm"
          data-testid="input-message"
        />
        <Button
          size="icon"
          onClick={() => handleSend()}
          disabled={!content.trim() || sendMutation.isPending}
          className={`w-10 h-10 rounded-xl flex-shrink-0 transition-all ${content.trim() ? "bg-primary shadow-sm" : "bg-muted text-muted-foreground"}`}
          data-testid="button-send-message"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
