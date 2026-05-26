import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { User, MapPin, DollarSign, Building, Heart, MessageSquare, LogOut, Settings, ChevronRight, Star, Pencil, Check } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Agent, Match } from "@shared/schema";

type MatchWithAgent = Match & { agent: Agent };

const formatBudget = (v: any) => {
  const n = Number(v);
  if (!v || isNaN(n)) return v;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
};

export default function ProfilePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showEdit, setShowEdit] = useState(false);

  const { data: matches = [] } = useQuery<MatchWithAgent[]>({
    queryKey: ["/api/matches"],
  });

  const logoutMutation = useMutation({
    mutationFn: () => fetch("/api/auth/logout", { method: "POST", credentials: "include" }).then(r => r.json()),
    onSuccess: () => { queryClient.clear(); window.location.href = "/"; },
  });

  const profileFields = [
    { icon: MapPin, label: "Location", value: user?.location },
    { icon: DollarSign, label: "Budget", value: formatBudget(user?.budget) },
    { icon: Building, label: "Property Type", value: user?.propertyType },
    { icon: Heart, label: "Preferred Style", value: user?.preferredStyle },
    { icon: MessageSquare, label: "Communication", value: user?.communicationStyle },
  ].filter(f => f.value);

  const userName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email?.split("@")[0] || "User";
  const userInitials = userName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-background">
      {/* Hero gradient banner */}
      <div className="relative flex-shrink-0 bg-gradient-to-br from-primary via-primary/90 to-primary/70 px-5 pt-6 pb-8 overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/5 rounded-full" />
        <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-white/5 rounded-full" />
        <div className="absolute top-4 right-20 w-16 h-16 bg-white/5 rounded-full" />

        <div className="relative flex items-end gap-4">
          <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center flex-shrink-0 shadow-lg">
            <span className="text-2xl font-black text-white">{userInitials}</span>
          </div>
          <div className="flex-1 min-w-0 pb-1">
            <h2 className="text-xl font-bold text-white leading-tight truncate">{userName}</h2>
            {user?.email && <p className="text-sm text-white/70 truncate mt-0.5">{user.email}</p>}
            <Badge className="mt-2 bg-white/20 text-white border-0 text-xs font-medium capitalize">
              {user?.role || "Consumer"}
            </Badge>
          </div>
          {/* Edit button */}
          <button
            onClick={() => setShowEdit(true)}
            className="flex-shrink-0 w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
            data-testid="button-edit-profile"
            aria-label="Edit profile"
          >
            <Pencil className="w-4 h-4" />
          </button>
        </div>

        {/* Stats row */}
        <div className="relative mt-5 grid grid-cols-3 gap-2">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-white/10">
            <div className="text-2xl font-black text-white">{matches.length}</div>
            <div className="text-[10px] text-white/70 mt-0.5 font-medium">Matches</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-white/10">
            <div className="text-xl font-black text-white">{user?.onboardingCompleted ? "✓" : "—"}</div>
            <div className="text-[10px] text-white/70 mt-0.5 font-medium">Onboarding</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-white/10">
            <div className="flex items-center justify-center gap-0.5">
              <Star className="w-4 h-4 fill-amber-300 text-amber-300" />
              <span className="text-lg font-black text-white">
                {matches.length > 0
                  ? (matches.reduce((sum, m) => sum + (m.agent?.rating ?? 0), 0) / matches.length).toFixed(1)
                  : "—"}
              </span>
            </div>
            <div className="text-[10px] text-white/70 mt-0.5 font-medium">Avg Match Rating</div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 -mt-1">
        {/* Preferences */}
        <Card className="shadow-xs border-border/60">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-primary/10 rounded-md flex items-center justify-center">
                  <Settings className="w-3.5 h-3.5 text-primary" />
                </div>
                Your Preferences
              </div>
              <button
                onClick={() => setShowEdit(true)}
                className="text-xs text-primary font-medium flex items-center gap-1 hover:underline"
                data-testid="button-edit-preferences"
              >
                <Pencil className="w-3 h-3" />
                Edit
              </button>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-0">
            {profileFields.length === 0 ? (
              <button
                onClick={() => setShowEdit(true)}
                className="w-full py-4 text-sm text-muted-foreground text-center hover:text-primary transition-colors"
              >
                Tap Edit to add your preferences →
              </button>
            ) : (
              profileFields.map(({ icon: Icon, label, value }, i) => (
                <div key={label}>
                  {i > 0 && <Separator className="my-0" />}
                  <div className="flex items-center gap-3 py-3">
                    <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-muted-foreground">{label}</div>
                      <div className="text-sm font-semibold text-foreground">{value}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Sign out */}
        <Card className="shadow-xs border-border/60 overflow-hidden">
          <CardContent className="p-0">
            <button
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              className="w-full flex items-center gap-3 px-4 py-4 text-destructive hover:bg-destructive/5 transition-colors disabled:opacity-60"
              data-testid="button-logout"
            >
              <div className="w-8 h-8 bg-destructive/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <LogOut className="w-4 h-4 text-destructive" />
              </div>
              <span className="text-sm font-semibold flex-1 text-left">
                {logoutMutation.isPending ? "Signing out..." : "Sign Out"}
              </span>
              <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
            </button>
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      {showEdit && (
        <EditProfileDialog
          user={user}
          onClose={() => setShowEdit(false)}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
            setShowEdit(false);
            toast({ title: "Profile updated", description: "Your preferences have been saved." });
          }}
        />
      )}
    </div>
  );
}

function EditProfileDialog({ user, onClose, onSaved }: { user: any; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    location: user?.location || "",
    budget: user?.budget || "",
    propertyType: user?.propertyType || "",
    preferredStyle: user?.preferredStyle || "",
    communicationStyle: user?.communicationStyle || "",
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await apiRequest("PATCH", "/api/user/profile", data);
      return res.json();
    },
    onSuccess: onSaved,
  });

  const set = (key: keyof typeof form) => (val: string) => setForm(f => ({ ...f, [key]: val }));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto rounded-2xl p-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border">
          <DialogTitle className="text-base font-bold">Edit Preferences</DialogTitle>
        </DialogHeader>

        <div className="px-5 py-4 space-y-4">
          {/* Name row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">First Name</Label>
              <Input
                value={form.firstName}
                onChange={e => set("firstName")(e.target.value)}
                placeholder="Jane"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Last Name</Label>
              <Input
                value={form.lastName}
                onChange={e => set("lastName")(e.target.value)}
                placeholder="Doe"
                className="h-9 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Location
            </Label>
            <Input
              value={form.location}
              onChange={e => set("location")(e.target.value)}
              placeholder="e.g. Detroit, MI"
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <DollarSign className="w-3 h-3" /> Budget
            </Label>
            <Select value={form.budget} onValueChange={set("budget")}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select budget range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="200000">Under $200K</SelectItem>
                <SelectItem value="350000">$200K – $350K</SelectItem>
                <SelectItem value="500000">$350K – $500K</SelectItem>
                <SelectItem value="750000">$500K – $750K</SelectItem>
                <SelectItem value="1000000">$750K – $1M</SelectItem>
                <SelectItem value="2000000">$1M+</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Building className="w-3 h-3" /> Property Type
            </Label>
            <Select value={form.propertyType} onValueChange={set("propertyType")}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select property type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single-family">Single Family</SelectItem>
                <SelectItem value="condo">Condo / Townhouse</SelectItem>
                <SelectItem value="multi-family">Multi-Family</SelectItem>
                <SelectItem value="commercial">Commercial</SelectItem>
                <SelectItem value="land">Land</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Heart className="w-3 h-3" /> Agent Style
            </Label>
            <Select value={form.preferredStyle} onValueChange={set("preferredStyle")}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="How do you want to work?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Data-Driven">Data-Driven</SelectItem>
                <SelectItem value="Patient & Educational">Patient & Educational</SelectItem>
                <SelectItem value="Aggressive Negotiator">Aggressive Negotiator</SelectItem>
                <SelectItem value="Luxury Specialist">Luxury Specialist</SelectItem>
                <SelectItem value="First-Time Buyer Friendly">First-Time Buyer Friendly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <MessageSquare className="w-3 h-3" /> Communication Style
            </Label>
            <Select value={form.communicationStyle} onValueChange={set("communicationStyle")}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="How do you prefer to communicate?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Text / Chat">Text / Chat</SelectItem>
                <SelectItem value="Phone Calls">Phone Calls</SelectItem>
                <SelectItem value="Email">Email</SelectItem>
                <SelectItem value="Video Calls">Video Calls</SelectItem>
                <SelectItem value="In-Person">In-Person Meetings</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="px-5 pb-5 pt-1 flex gap-3 border-t border-border">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={saveMutation.isPending}>
            Cancel
          </Button>
          <Button
            className="flex-1 gap-2"
            onClick={() => saveMutation.mutate(form)}
            disabled={saveMutation.isPending}
            data-testid="button-save-profile"
          >
            {saveMutation.isPending ? (
              "Saving..."
            ) : (
              <>
                <Check className="w-4 h-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
