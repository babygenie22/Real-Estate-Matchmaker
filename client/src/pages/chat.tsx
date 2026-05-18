import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Send, Star } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import type { Agent, Match, Message } from "@shared/schema";
import { io, Socket } from "socket.io-client";
import { format } from "date-fns";

type MatchWithAgent = Match & { agent: Agent };

let socket: Socket | null = null;

const getSocket = () => {
  if (!socket) {
    socket = io(window.location.origin, { withCredentials: true });
  }
  return socket;
};

export default function ChatPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { data: matches = [], isLoading: matchesLoading } = useQuery<MatchWithAgent[]>({
    queryKey: ["/api/matches"],
  });

  const match = matches.find(m => m.id === matchId);
  const agent = match?.agent;

  // Redirect if matches loaded but this matchId doesn't belong to the user
  useEffect(() => {
    if (!matchesLoading && matches.length > 0 && !match) {
      setLocation("/matches");
    }
  }, [matchesLoading, matches, match, setLocation]);

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
    setLocalMessages(messages);
  }, [messages]);

  useEffect(() => {
    const s = getSocket();
    s.emit("join-match", matchId);

    s.on("new-message", (msg: Message) => {
      if (msg.matchId === matchId && msg.senderType !== "user") {
        setLocalMessages(prev => {
          const exists = prev.find(m => m.id === msg.id);
          if (exists) return prev;
          return [...prev, msg];
        });
      }
    });

    return () => {
      s.off("new-message");
    };
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

  const handleSend = () => {
    if (!content.trim()) return;
    const text = content.trim();
    setContent("");

    const tempId = `temp-${Date.now()}`;
    const optimistic: Message = {
      id: tempId,
      matchId: matchId!,
      senderId: user?.id || "",
      senderType: "user",
      content: text,
      createdAt: new Date(),
    };
    setLocalMessages(prev => [...prev, optimistic]);
    sendMutation.mutate(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b border-border bg-background">
        <Button size="icon" variant="ghost" onClick={() => setLocation("/matches")} data-testid="button-back-matches">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        {agent ? (
          <>
            <Avatar className="w-9 h-9">
              {agent.photo ? <AvatarImage src={agent.photo} alt={agent.name} /> : null}
              <AvatarFallback className="text-sm font-bold text-primary bg-primary/10">
                {agent.name.split(" ").map(n => n[0]).join("")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-foreground truncate">{agent.name}</div>
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                <span className="text-xs text-muted-foreground">{agent.rating?.toFixed(1)} · {agent.yearsExperience}yr exp</span>
              </div>
            </div>
          </>
        ) : (
          <Skeleton className="h-9 w-48" />
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3" data-testid="messages-container">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-64 rounded-xl" />)}
          </div>
        ) : localMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-10">
            <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center">
              <Send className="w-7 h-7 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Start the conversation!</p>
              <p className="text-xs text-muted-foreground mt-1">Introduce yourself and ask about their availability.</p>
            </div>
          </div>
        ) : (
          localMessages.map((msg) => {
            const isMe = msg.senderType === "user";
            return (
              <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`} data-testid={`message-${msg.id}`}>
                <div className={`max-w-[75%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
                  isMe
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-muted text-foreground rounded-bl-sm"
                }`}>
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

      <div className="flex-shrink-0 flex items-center gap-2 px-4 py-3 border-t border-border bg-background">
        <Input
          placeholder="Type a message..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1"
          data-testid="input-message"
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!content.trim() || sendMutation.isPending}
          data-testid="button-send-message"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
