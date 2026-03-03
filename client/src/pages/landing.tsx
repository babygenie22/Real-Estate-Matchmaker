import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Home, Star, Users, TrendingUp, Heart, MessageSquare, MapPin, ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
              <Home className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg text-foreground">HomeMatch</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="/api/login" data-testid="link-login">
              <Button variant="ghost">Log in</Button>
            </a>
            <a href="/api/login" data-testid="link-signup">
              <Button>Get Started</Button>
            </a>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
        <div className="absolute top-20 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-20 w-64 h-64 bg-primary/8 rounded-full blur-2xl" />

        <div className="relative max-w-6xl mx-auto px-6 pt-24 pb-32">
          <div className="max-w-3xl">
            <Badge className="mb-6" data-testid="badge-tagline">
              The smarter way to find your agent
            </Badge>
            <h1 className="text-5xl sm:text-6xl font-bold text-foreground leading-tight mb-6">
              Swipe Right on Your
              <span className="text-primary"> Dream Agent</span>
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed mb-10 max-w-2xl">
              HomeMatch uses intelligent matching to connect you with top-rated real estate agents based on your preferences, budget, and local expertise. Like Tinder — but for finding your perfect real estate partner.
            </p>
            <div className="flex flex-wrap gap-4">
              <a href="/api/login" data-testid="link-cta-primary">
                <Button size="lg" className="gap-2">
                  Start Matching <ArrowRight className="w-4 h-4" />
                </Button>
              </a>
              <a href="/api/login" data-testid="link-cta-secondary">
                <Button size="lg" variant="outline">
                  Browse Agents
                </Button>
              </a>
            </div>
            <div className="flex flex-wrap gap-8 mt-14">
              {[
                { label: "Active Agents", value: "2,400+" },
                { label: "Happy Buyers", value: "18,000+" },
                { label: "Avg. Days to Match", value: "< 2" },
              ].map((stat) => (
                <div key={stat.label} data-testid={`stat-${stat.label.toLowerCase().replace(/ /g, "-")}`}>
                  <div className="text-3xl font-bold text-foreground">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-card/50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4">How It Works</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Three simple steps to find your perfect real estate agent</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Users,
                step: "1",
                title: "Tell Us What You Need",
                desc: "Answer a quick questionnaire about your budget, location, property type, and preferred agent personality."
              },
              {
                icon: Heart,
                step: "2",
                title: "Swipe & Discover",
                desc: "Browse agent cards ranked by our smart algorithm. Like agents that catch your eye, pass on the rest."
              },
              {
                icon: MessageSquare,
                step: "3",
                title: "Connect & Close",
                desc: "Chat directly with your matched agents, schedule consultations, and find your perfect home."
              },
            ].map((item) => (
              <div key={item.step} className="flex flex-col items-start p-6 rounded-lg bg-background border border-border" data-testid={`card-step-${item.step}`}>
                <div className="w-12 h-12 bg-primary/10 rounded-md flex items-center justify-center mb-4">
                  <item.icon className="w-6 h-6 text-primary" />
                </div>
                <div className="text-xs font-semibold text-muted-foreground mb-2">STEP {item.step}</div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4">Why HomeMatch?</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: TrendingUp, title: "Data-Driven Matching", desc: "Our algorithm weighs sale-to-list ratio, days on market, transaction volume, and reviews to surface the best agents." },
              { icon: Star, title: "Verified Professionals", desc: "Every agent is vetted and licensed. We check credentials, review histories, and ensure quality standards." },
              { icon: MapPin, title: "Hyperlocal Expertise", desc: "Agents are matched based on their specific service areas, ZIP codes, and neighborhood expertise." },
              { icon: MessageSquare, title: "Real-Time Chat", desc: "Message matched agents instantly. Schedule consultations directly within the platform." },
            ].map((feature) => (
              <div key={feature.title} className="flex gap-4 p-6 rounded-lg bg-card border border-card-border" data-testid={`feature-${feature.title.toLowerCase().replace(/ /g, "-")}`}>
                <div className="w-10 h-10 bg-primary/10 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-primary">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-primary-foreground mb-4">Ready to Find Your Agent?</h2>
          <p className="text-primary-foreground/80 mb-8">Join thousands of homebuyers and sellers who found their perfect match on HomeMatch.</p>
          <a href="/api/login" data-testid="link-cta-footer">
            <Button size="lg" variant="secondary" className="gap-2">
              Get Started Free <ArrowRight className="w-4 h-4" />
            </Button>
          </a>
        </div>
      </section>

      <footer className="py-8 border-t border-border">
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
              <Home className="w-3 h-3 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground text-sm">HomeMatch</span>
          </div>
          <p className="text-xs text-muted-foreground">© 2026 HomeMatch. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
