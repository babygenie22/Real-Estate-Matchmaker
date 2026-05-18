import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Home, Star, Users, TrendingUp, Heart, MessageSquare, MapPin, ArrowRight, Eye, EyeOff, Shield, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

async function apiFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

function AuthDialog({ open, onClose, defaultTab }: { open: boolean; onClose: () => void; defaultTab: "login" | "register" }) {
  const [showPassword, setShowPassword] = useState(false);
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [registerData, setRegisterData] = useState({ email: "", password: "", firstName: "", lastName: "" });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const loginMutation = useMutation({
    mutationFn: () => apiFetch("/api/auth/login", { method: "POST", body: JSON.stringify(loginData) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      onClose();
      // login success: cache invalidation drives re-render
    },
    onError: (err: Error) => toast({ title: "Login failed", description: err.message, variant: "destructive" }),
  });

  const registerMutation = useMutation({
    mutationFn: () => apiFetch("/api/auth/register", { method: "POST", body: JSON.stringify(registerData) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      onClose();
      // login success: cache invalidation drives re-render
    },
    onError: (err: Error) => toast({ title: "Registration failed", description: err.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center shadow-sm">
              <Home className="w-4 h-4 text-primary-foreground" />
            </div>
            HomeMatch
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue={defaultTab} className="mt-2">
          <TabsList className="w-full">
            <TabsTrigger value="login" className="flex-1">Log In</TabsTrigger>
            <TabsTrigger value="register" className="flex-1">Create Account</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                type="email"
                placeholder="you@example.com"
                value={loginData.email}
                onChange={(e) => setLoginData((d) => ({ ...d, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">Password</Label>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={loginData.password}
                  onChange={(e) => setLoginData((d) => ({ ...d, password: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && loginMutation.mutate()}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button
              className="w-full shadow-md"
              onClick={() => loginMutation.mutate()}
              disabled={loginMutation.isPending || !loginData.email || !loginData.password}
            >
              {loginMutation.isPending ? "Logging in…" : "Log In"}
            </Button>
          </TabsContent>

          <TabsContent value="register" className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="reg-first">First Name</Label>
                <Input
                  id="reg-first"
                  placeholder="Jane"
                  value={registerData.firstName}
                  onChange={(e) => setRegisterData((d) => ({ ...d, firstName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-last">Last Name</Label>
                <Input
                  id="reg-last"
                  placeholder="Smith"
                  value={registerData.lastName}
                  onChange={(e) => setRegisterData((d) => ({ ...d, lastName: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-email">Email</Label>
              <Input
                id="reg-email"
                type="email"
                placeholder="you@example.com"
                value={registerData.email}
                onChange={(e) => setRegisterData((d) => ({ ...d, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-password">Password <span className="text-muted-foreground text-xs">(min 6 characters)</span></Label>
              <div className="relative">
                <Input
                  id="reg-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={registerData.password}
                  onChange={(e) => setRegisterData((d) => ({ ...d, password: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && registerMutation.mutate()}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button
              className="w-full shadow-md"
              onClick={() => registerMutation.mutate()}
              disabled={registerMutation.isPending || !registerData.email || !registerData.password}
            >
              {registerMutation.isPending ? "Creating account…" : "Create Account"}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] },
  }),
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

export default function LandingPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTab, setDialogTab] = useState<"login" | "register">("login");

  const openLogin = () => { setDialogTab("login"); setDialogOpen(true); };
  const openRegister = () => { setDialogTab("register"); setDialogOpen(true); };

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border"
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-sm">
              <Home className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg text-foreground">HomeMatch</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={openLogin} data-testid="link-login">Log in</Button>
            <Button onClick={openRegister} className="shadow-sm" data-testid="link-signup">Get Started</Button>
          </div>
        </div>
      </motion.nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
        <div className="absolute top-16 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-6 pt-24 pb-32">
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="max-w-3xl"
          >
            <motion.div variants={fadeUp}>
              <Badge className="mb-6 bg-primary/10 text-primary border-primary/20 shadow-sm" data-testid="badge-tagline">
                <Zap className="w-3 h-3 mr-1" />
                The smarter way to find your agent
              </Badge>
            </motion.div>
            <motion.h1 variants={fadeUp} className="text-5xl sm:text-6xl font-bold text-foreground leading-tight mb-6">
              Swipe Right on Your
              <span className="text-primary"> Dream Agent</span>
            </motion.h1>
            <motion.p variants={fadeUp} className="text-xl text-muted-foreground leading-relaxed mb-10 max-w-2xl">
              HomeMatch uses intelligent matching to connect you with top-rated real estate agents based on your preferences, budget, and local expertise. Like Tinder — but for finding your perfect real estate partner.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-wrap gap-4">
              <Button size="lg" className="gap-2 shadow-md" onClick={openRegister} data-testid="link-cta-primary">
                Start Matching <ArrowRight className="w-4 h-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={openLogin} className="shadow-sm" data-testid="link-cta-secondary">
                Browse Agents
              </Button>
            </motion.div>
            <motion.div variants={stagger} className="flex flex-wrap gap-10 mt-14">
              {[
                { label: "Active Agents", value: "2,400+" },
                { label: "Happy Buyers", value: "18,000+" },
                { label: "Avg. Days to Match", value: "< 2" },
              ].map((stat, i) => (
                <motion.div key={stat.label} variants={fadeUp} custom={i} data-testid={`stat-${stat.label.toLowerCase().replace(/ /g, "-")}`}>
                  <div className="text-3xl font-bold text-foreground">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 bg-card/40 border-y border-border">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl font-bold text-foreground mb-4">How It Works</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Three simple steps to find your perfect real estate agent</p>
          </motion.div>
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid md:grid-cols-3 gap-6"
          >
            {[
              { icon: Users, step: "1", title: "Tell Us What You Need", desc: "Answer a quick questionnaire about your budget, location, property type, and preferred agent personality." },
              { icon: Heart, step: "2", title: "Swipe & Discover", desc: "Browse agent cards ranked by our smart algorithm. Like agents that catch your eye, pass on the rest." },
              { icon: MessageSquare, step: "3", title: "Connect & Close", desc: "Chat directly with your matched agents, schedule consultations, and find your perfect home." },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                variants={fadeUp}
                custom={i}
                className="flex flex-col items-start p-6 rounded-xl bg-background border border-border shadow-sm hover:shadow-md transition-shadow duration-300"
                data-testid={`card-step-${item.step}`}
              >
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 shadow-xs">
                  <item.icon className="w-6 h-6 text-primary" />
                </div>
                <div className="text-xs font-bold text-primary/60 tracking-widest mb-2">STEP {item.step}</div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl font-bold text-foreground mb-4">Why HomeMatch?</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Built with intelligence and designed for results</p>
          </motion.div>
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 gap-5"
          >
            {[
              { icon: TrendingUp, title: "Data-Driven Matching", desc: "Our algorithm weighs sale-to-list ratio, days on market, transaction volume, and reviews to surface the best agents." },
              { icon: Shield, title: "Verified Professionals", desc: "Every agent is vetted and licensed. We check credentials, review histories, and ensure quality standards." },
              { icon: MapPin, title: "Hyperlocal Expertise", desc: "Agents are matched based on their specific service areas, ZIP codes, and neighborhood expertise." },
              { icon: MessageSquare, title: "Real-Time Chat", desc: "Message matched agents instantly. Schedule consultations directly within the platform." },
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                variants={fadeUp}
                custom={i}
                className="flex gap-4 p-6 rounded-xl bg-card border border-border shadow-xs hover:shadow-md transition-shadow duration-300"
                data-testid={`feature-${feature.title.toLowerCase().replace(/ /g, "-")}`}
              >
                <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-xs">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-blue-700 opacity-90" />
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative max-w-3xl mx-auto px-6 text-center"
        >
          <h2 className="text-3xl font-bold text-primary-foreground mb-4">Ready to Find Your Agent?</h2>
          <p className="text-primary-foreground/80 mb-8 text-lg">Join thousands of homebuyers and sellers who found their perfect match on HomeMatch.</p>
          <Button size="lg" variant="secondary" className="gap-2 shadow-lg" onClick={openRegister} data-testid="link-cta-footer">
            Get Started Free <ArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>
      </section>

      <footer className="py-8 border-t border-border bg-card/30">
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center shadow-xs">
              <Home className="w-3 h-3 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground text-sm">HomeMatch</span>
          </div>
          <p className="text-xs text-muted-foreground">© 2026 HomeMatch. All rights reserved.</p>
          <a href="/agent-register" className="text-xs text-primary font-medium hover:underline">
            Are you a real estate agent? Join HomeMatch →
          </a>
        </div>
      </footer>

      <AuthDialog open={dialogOpen} onClose={() => setDialogOpen(false)} defaultTab={dialogTab} />
    </div>
  );
}
