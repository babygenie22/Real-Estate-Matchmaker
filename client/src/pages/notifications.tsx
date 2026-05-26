import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, Heart, MessageSquare, Calendar, CheckCheck, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";
import type { Notification } from "@shared/schema";
import { relativeTime } from "@/lib/dateUtils";

const typeIcon: Record<string, React.ElementType> = {
  match: Heart,
  message: MessageSquare,
  booking: Calendar,
  booking_update: CheckCircle,
};

const typeColor: Record<string, string> = {
  match: "bg-green-500/15 text-green-500",
  message: "bg-blue-500/15 text-blue-500",
  booking: "bg-amber-500/15 text-amber-500",
  booking_update: "bg-emerald-500/15 text-emerald-500",
};

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
  });

  const readAllMutation = useMutation({
    mutationFn: () => apiRequest("PUT", "/api/notifications/read-all"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  const readOneMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PUT", `/api/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3 bg-background">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground tracking-tight">Notifications</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {unreadCount > 0 ? `${unreadCount} unread message${unreadCount !== 1 ? "s" : ""}` : "You're all caught up"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => readAllMutation.mutate()}
                disabled={readAllMutation.isPending}
                data-testid="button-mark-all-read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-5 text-center pt-8">
            <div className="w-24 h-24 bg-gradient-to-br from-muted to-muted/50 rounded-3xl flex items-center justify-center">
              <Bell className="w-11 h-11 text-muted-foreground/50" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground mb-1.5">All quiet here</h3>
              <p className="text-sm text-muted-foreground max-w-xs">Activity from matches, messages, and bookings will appear here.</p>
            </div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            <div className="space-y-2 pt-1">
              {notifications.map((n) => {
                const Icon = typeIcon[n.type] ?? Bell;
                const colorClass = typeColor[n.type] ?? "bg-muted text-muted-foreground";
                return (
                  <motion.div
                    key={n.id}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex gap-3 p-3.5 rounded-2xl cursor-pointer transition-all border ${
                      !n.read
                        ? "bg-primary/5 border-primary/15 hover:bg-primary/8"
                        : "bg-card border-border/60 hover:bg-muted/40"
                    }`}
                    onClick={() => {
                      if (!n.read) readOneMutation.mutate(n.id);
                      if (n.type === "match" || n.type === "message") setLocation("/matches");
                      else if (n.type === "booking" || n.type === "booking_update") setLocation("/profile");
                    }}
                    data-testid={`notification-${n.id}`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground leading-tight">{n.title}</p>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {!n.read && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-0.5" />}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-snug line-clamp-2">{n.body}</p>
                      <p className="text-[10px] text-muted-foreground/50 mt-1.5">
                        {relativeTime(n.createdAt)}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
