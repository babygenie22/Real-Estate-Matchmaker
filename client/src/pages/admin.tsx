import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Building2, Heart, CreditCard, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Agent } from "@shared/schema";

export default function AdminPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stats, isLoading: statsLoading } = useQuery<{
    totalUsers: number;
    totalAgents: number;
    totalMatches: number;
    activeSubscriptions: number;
  }>({ queryKey: ["/api/admin/stats"] });

  const { data: pending = [], isLoading: pendingLoading } = useQuery<Agent[]>({
    queryKey: ["/api/admin/pending-agents"],
  });

  const approveMutation = useMutation({
    mutationFn: async (agentId: string) => {
      const res = await apiRequest("POST", `/api/admin/agents/${agentId}/approve`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-agents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "Agent approved", description: "Agent is now visible to users." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to approve agent.", variant: "destructive" });
    },
  });

  const statCards = [
    { title: "Total Users", value: stats?.totalUsers, icon: Users, color: "text-blue-500" },
    { title: "Total Agents", value: stats?.totalAgents, icon: Building2, color: "text-purple-500" },
    { title: "Total Matches", value: stats?.totalMatches, icon: Heart, color: "text-pink-500" },
    { title: "Active Subscriptions", value: stats?.activeSubscriptions, icon: CreditCard, color: "text-green-500" },
  ];

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="flex-shrink-0 px-5 pt-5 pb-4 border-b border-border">
        <h2 className="text-xl font-bold text-foreground">Admin Dashboard</h2>
        <p className="text-sm text-muted-foreground">Platform overview and management</p>
      </div>

      <div className="p-5 space-y-6">
        <div className="grid grid-cols-2 gap-3">
          {statCards.map((stat) => (
            <Card key={stat.title} data-testid={`stat-card-${stat.title.toLowerCase().replace(/ /g, "-")}`}>
              <CardContent className="p-4">
                {statsLoading ? (
                  <Skeleton className="h-12 w-full" />
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-muted rounded-md flex items-center justify-center">
                      <stat.icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-foreground">{stat.value ?? 0}</div>
                      <div className="text-xs text-muted-foreground">{stat.title}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div>
          <h3 className="text-base font-semibold text-foreground mb-3">
            Pending Agent Approvals
            {pending.length > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs">{pending.length}</Badge>
            )}
          </h3>

          {pendingLoading ? (
            <div className="space-y-2">
              {[1, 2].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
            </div>
          ) : pending.length === 0 ? (
            <div className="flex items-center gap-2 p-4 rounded-lg bg-muted/50 text-muted-foreground text-sm">
              <CheckCircle className="w-4 h-4 text-green-500" />
              No pending approvals. All agents are approved.
            </div>
          ) : (
            <div className="space-y-2">
              {pending.map((agent) => (
                <Card key={agent.id} data-testid={`card-pending-agent-${agent.id}`}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                      {agent.name.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-foreground">{agent.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{agent.serviceAreas?.join(", ")}</div>
                    </div>
                    <Button
                      size="sm"
                      className="flex-shrink-0"
                      onClick={() => approveMutation.mutate(agent.id)}
                      disabled={approveMutation.isPending}
                      data-testid={`button-approve-${agent.id}`}
                    >
                      Approve
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
