import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Home, CheckCircle, ChevronRight, ChevronLeft, Loader2, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

async function apiFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" }, credentials: "include", ...options });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

const SPECIALTIES = ["Luxury Homes","First-Time Buyers","Investment Properties","New Construction","Commercial","Foreclosures","Condos","Multi-Family","Land","Relocation"];
const LANGUAGES = ["English","Spanish","Mandarin","French","Portuguese","Hindi","Arabic","Korean","Vietnamese","Tagalog"];
const PERSONALITY_TAGS = ["Analytical","Bold","Patient","Tech-Savvy","Negotiator","Educational","Responsive","Detail-Oriented","Community-Focused","Luxury Specialist"];

type Step = 1 | 2 | 3 | 4;

export default function AgentRegisterPage() {
  const [step, setStep] = useState<Step>(1);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [form, setForm] = useState({
    // Account
    email: "", password: "", confirmPassword: "",
    // Profile
    name: "", licenseNumber: "", phone: "", photo: "", website: "", linkedinUrl: "",
    bio: "", yearsExperience: "",
    // Service
    serviceAreas: [""],
    priceRangeMin: "", priceRangeMax: "",
    // Preferences
    specialties: [] as string[],
    languages: ["English"],
    personalityTags: [] as string[],
  });

  function set(field: string, value: any) { setForm(f => ({ ...f, [field]: value })); }

  function toggleArrayItem(field: "specialties" | "languages" | "personalityTags", value: string) {
    setForm(f => {
      const arr = f[field] as string[];
      return { ...f, [field]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] };
    });
  }

  const registerMutation = useMutation({
    mutationFn: () => apiFetch("/api/agent-portal/register", {
      method: "POST",
      body: JSON.stringify({
        email: form.email,
        password: form.password,
        name: form.name,
        licenseNumber: form.licenseNumber,
        phone: form.phone || undefined,
        bio: form.bio || undefined,
        photo: form.photo || undefined,
        website: form.website || undefined,
        linkedinUrl: form.linkedinUrl || undefined,
        yearsExperience: form.yearsExperience ? Number(form.yearsExperience) : undefined,
        specialties: form.specialties,
        serviceAreas: form.serviceAreas.filter(Boolean),
        languages: form.languages,
        personalityTags: form.personalityTags,
        priceRangeMin: form.priceRangeMin ? Number(form.priceRangeMin) : undefined,
        priceRangeMax: form.priceRangeMax ? Number(form.priceRangeMax) : undefined,
      }),
    }),
    onSuccess: () => { setStep(4); },
    onError: (e: Error) => toast({ title: "Registration failed", description: e.message, variant: "destructive" }),
  });

  function canProceed() {
    if (step === 1) return form.email && form.password.length >= 6 && form.password === form.confirmPassword;
    if (step === 2) return form.name.length >= 2 && form.licenseNumber.length >= 3;
    if (step === 3) return form.serviceAreas.some(Boolean);
    return true;
  }

  const steps = [
    { n: 1, label: "Account" },
    { n: 2, label: "Profile" },
    { n: 3, label: "Service" },
    { n: 4, label: "Done" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-background">
      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-sm">
            <Home className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-xl text-foreground">Join HomeMatch as an Agent</h1>
            <p className="text-sm text-muted-foreground">Connect with serious buyers and sellers in your area</p>
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={s.n} className="flex items-center gap-2 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                s.n < step ? "bg-primary text-white" :
                s.n === step ? "bg-primary text-white ring-4 ring-primary/20" :
                "bg-muted text-muted-foreground"
              }`}>
                {s.n < step ? <CheckCircle className="w-4 h-4" /> : s.n}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${s.n === step ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</span>
              {i < steps.length - 1 && <div className={`flex-1 h-0.5 ${s.n < step ? "bg-primary" : "bg-border"}`} />}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="bg-card border border-card-border rounded-2xl p-6 shadow-md"
          >
            {/* STEP 1: Account */}
            {step === 1 && (
              <div className="space-y-4">
                <div><h2 className="text-lg font-bold text-foreground">Create your account</h2><p className="text-sm text-muted-foreground mt-1">You'll use this to manage your profile and leads</p></div>
                <div className="space-y-2">
                  <Label>Email address</Label>
                  <Input type="email" placeholder="agent@example.com" value={form.email} onChange={e => set("email", e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input type="password" placeholder="Min 6 characters" value={form.password} onChange={e => set("password", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Confirm Password</Label>
                    <Input type="password" placeholder="Match password" value={form.confirmPassword} onChange={e => set("confirmPassword", e.target.value)} />
                  </div>
                </div>
                {form.password && form.confirmPassword && form.password !== form.confirmPassword && (
                  <p className="text-xs text-destructive">Passwords don't match</p>
                )}
                <div className="bg-primary/5 rounded-xl p-4 border border-primary/15 text-sm text-muted-foreground">
                  🆓 <strong className="text-foreground">Free 30-day trial</strong> — No credit card required. Start connecting with clients today.
                </div>
              </div>
            )}

            {/* STEP 2: Profile */}
            {step === 2 && (
              <div className="space-y-4">
                <div><h2 className="text-lg font-bold text-foreground">Your professional profile</h2><p className="text-sm text-muted-foreground mt-1">This is what clients will see when they discover you</p></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2 col-span-2">
                    <Label>Full Name *</Label>
                    <Input placeholder="Jane Smith" value={form.name} onChange={e => set("name", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>License Number *</Label>
                    <Input placeholder="e.g. DRE-12345678" value={form.licenseNumber} onChange={e => set("licenseNumber", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Years of Experience</Label>
                    <Input type="number" placeholder="5" value={form.yearsExperience} onChange={e => set("yearsExperience", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input type="tel" placeholder="+1 (555) 000-0000" value={form.phone} onChange={e => set("phone", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Profile Photo URL</Label>
                    <Input type="url" placeholder="https://..." value={form.photo} onChange={e => set("photo", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Website</Label>
                    <Input type="url" placeholder="https://yoursite.com" value={form.website} onChange={e => set("website", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>LinkedIn URL</Label>
                    <Input type="url" placeholder="https://linkedin.com/in/..." value={form.linkedinUrl} onChange={e => set("linkedinUrl", e.target.value)} />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Bio <span className="text-muted-foreground text-xs">(tell clients about yourself)</span></Label>
                    <Textarea placeholder="I'm a licensed real estate agent with 10+ years helping families find their dream homes in the Bay Area..." rows={3} value={form.bio} onChange={e => set("bio", e.target.value)} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Agent Style <span className="text-muted-foreground text-xs">(pick up to 3)</span></Label>
                  <div className="flex flex-wrap gap-2">
                    {PERSONALITY_TAGS.map(tag => (
                      <Badge
                        key={tag}
                        variant={form.personalityTags.includes(tag) ? "default" : "outline"}
                        className="cursor-pointer select-none"
                        onClick={() => form.personalityTags.length < 3 || form.personalityTags.includes(tag) ? toggleArrayItem("personalityTags", tag) : undefined}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Service Details */}
            {step === 3 && (
              <div className="space-y-5">
                <div><h2 className="text-lg font-bold text-foreground">Service details</h2><p className="text-sm text-muted-foreground mt-1">Help clients find you based on where and what you sell</p></div>

                <div className="space-y-2">
                  <Label>Service Areas * <span className="text-muted-foreground text-xs">(city, neighborhood, or ZIP)</span></Label>
                  {form.serviceAreas.map((area, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        placeholder="e.g. San Francisco, CA 94102"
                        value={area}
                        onChange={e => {
                          const arr = [...form.serviceAreas];
                          arr[i] = e.target.value;
                          set("serviceAreas", arr);
                        }}
                      />
                      {form.serviceAreas.length > 1 && (
                        <Button variant="ghost" size="sm" onClick={() => set("serviceAreas", form.serviceAreas.filter((_, j) => j !== i))}>✕</Button>
                      )}
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => set("serviceAreas", [...form.serviceAreas, ""])}>+ Add area</Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Min Price Range</Label>
                    <Input type="number" placeholder="200000" value={form.priceRangeMin} onChange={e => set("priceRangeMin", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Price Range</Label>
                    <Input type="number" placeholder="2000000" value={form.priceRangeMax} onChange={e => set("priceRangeMax", e.target.value)} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Specialties</Label>
                  <div className="flex flex-wrap gap-2">
                    {SPECIALTIES.map(s => (
                      <Badge key={s} variant={form.specialties.includes(s) ? "default" : "outline"} className="cursor-pointer select-none" onClick={() => toggleArrayItem("specialties", s)}>
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Languages Spoken</Label>
                  <div className="flex flex-wrap gap-2">
                    {LANGUAGES.map(l => (
                      <Badge key={l} variant={form.languages.includes(l) ? "default" : "outline"} className="cursor-pointer select-none" onClick={() => toggleArrayItem("languages", l)}>
                        {l}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: Success */}
            {step === 4 && (
              <div className="text-center py-6">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-3">Profile submitted!</h2>
                <p className="text-muted-foreground mb-2">Your agent profile is under review. We typically approve profiles within <strong>24–48 hours</strong>.</p>
                <p className="text-muted-foreground text-sm mb-6">Check your email for a confirmation and next steps.</p>
                <div className="bg-muted/50 rounded-xl p-4 text-sm text-muted-foreground mb-6 text-left space-y-2">
                  <p className="font-semibold text-foreground">While you wait:</p>
                  <p>✓ Log in to your agent portal to complete your profile</p>
                  <p>✓ Add more service areas and specialties</p>
                  <p>✓ Upload a professional headshot</p>
                </div>
                <Button className="w-full shadow-sm" onClick={() => setLocation("/agent-portal")}>
                  Go to Agent Portal →
                </Button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        {step < 4 && (
          <div className="flex gap-3 mt-5">
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep(s => (s - 1) as Step)} className="gap-2">
                <ChevronLeft className="w-4 h-4" /> Back
              </Button>
            )}
            <Button
              className="flex-1 gap-2 shadow-sm"
              disabled={!canProceed() || registerMutation.isPending}
              onClick={() => {
                if (step < 3) setStep(s => (s + 1) as Step);
                else registerMutation.mutate();
              }}
            >
              {registerMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
              ) : step === 3 ? (
                <>Submit Profile <CheckCircle className="w-4 h-4" /></>
              ) : (
                <>Continue <ChevronRight className="w-4 h-4" /></>
              )}
            </Button>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground mt-6">
          Already have an agent account?{" "}
          <button onClick={() => setLocation("/")} className="text-primary font-semibold">Log in</button>
        </p>
      </div>
    </div>
  );
}
