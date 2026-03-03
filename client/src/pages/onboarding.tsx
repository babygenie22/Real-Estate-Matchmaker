import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Home, MapPin, DollarSign, Building, Heart, MessageSquare, ChevronRight, ChevronLeft } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const STEPS = [
  {
    id: "role",
    title: "What brings you here?",
    subtitle: "Tell us your primary goal",
    icon: Home,
  },
  {
    id: "location",
    title: "Where are you looking?",
    subtitle: "Enter your target city or area",
    icon: MapPin,
  },
  {
    id: "budget",
    title: "What's your budget?",
    subtitle: "This helps us match you with the right agents",
    icon: DollarSign,
  },
  {
    id: "propertyType",
    title: "What type of property?",
    subtitle: "Select all that apply",
    icon: Building,
  },
  {
    id: "style",
    title: "What's your preferred agent style?",
    subtitle: "Choose the personality that resonates with you",
    icon: Heart,
  },
  {
    id: "communication",
    title: "How do you prefer to communicate?",
    subtitle: "We'll match you with agents who work the same way",
    icon: MessageSquare,
  },
];

const BUDGETS = ["Under $300K", "$300K - $500K", "$500K - $800K", "$800K - $1.2M", "$1.2M - $2M", "$2M+"];
const PROPERTY_TYPES = ["Single Family Home", "Condo/Apartment", "Townhouse", "Multi-Family", "Land/Lot", "Commercial"];
const STYLES = ["Analytical", "Bold", "Patient", "Energetic", "Straightforward", "Tech-Savvy"];
const COMM_STYLES = ["Phone Calls", "Text Messages", "Email", "In-Person Meetings", "Video Calls"];
const ROLES = [
  { value: "buyer", label: "Buying a home", icon: "🏠" },
  { value: "seller", label: "Selling a home", icon: "💰" },
  { value: "both", label: "Buying & Selling", icon: "🔄" },
  { value: "investor", label: "Investing", icon: "📈" },
];

export default function OnboardingPage() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(0);
  const [data, setData] = useState({
    role: "",
    location: "",
    budget: "",
    propertyType: "",
    preferredStyle: "",
    communicationStyle: "",
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (prefs: typeof data) => {
      const res = await apiRequest("PUT", "/api/users/preferences", prefs);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setLocation("/discover");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save preferences", variant: "destructive" });
    },
  });

  const currentStep = STEPS[step];
  const progress = ((step + 1) / STEPS.length) * 100;

  const canProceed = () => {
    if (step === 0) return !!data.role;
    if (step === 1) return data.location.length >= 2;
    if (step === 2) return !!data.budget;
    if (step === 3) return !!data.propertyType;
    if (step === 4) return !!data.preferredStyle;
    if (step === 5) return !!data.communicationStyle;
    return true;
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      mutation.mutate(data);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-xl">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
            <Home className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg text-foreground">HomeMatch</span>
        </div>

        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-muted-foreground">Step {step + 1} of {STEPS.length}</span>
            <span className="text-xs text-muted-foreground">{Math.round(progress)}% complete</span>
          </div>
          <Progress value={progress} className="h-1.5" data-testid="progress-onboarding" />
        </div>

        <Card className="shadow-sm">
          <CardContent className="pt-8 pb-8 px-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-primary/10 rounded-md flex items-center justify-center">
                <currentStep.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">{currentStep.title}</h2>
                <p className="text-sm text-muted-foreground">{currentStep.subtitle}</p>
              </div>
            </div>

            {step === 0 && (
              <div className="grid grid-cols-2 gap-3">
                {ROLES.map((role) => (
                  <button
                    key={role.value}
                    data-testid={`option-role-${role.value}`}
                    onClick={() => setData(d => ({ ...d, role: role.value }))}
                    className={`p-4 rounded-md border text-left transition-all hover-elevate ${data.role === role.value ? "border-primary bg-primary/5" : "border-border bg-card"}`}
                  >
                    <div className="text-2xl mb-2">{role.icon}</div>
                    <div className="text-sm font-medium text-foreground">{role.label}</div>
                  </button>
                ))}
              </div>
            )}

            {step === 1 && (
              <div>
                <input
                  type="text"
                  placeholder="e.g. San Francisco, CA or 94102"
                  value={data.location}
                  onChange={(e) => setData(d => ({ ...d, location: e.target.value }))}
                  data-testid="input-location"
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent text-sm"
                />
              </div>
            )}

            {step === 2 && (
              <div className="grid grid-cols-2 gap-3">
                {BUDGETS.map((budget) => (
                  <button
                    key={budget}
                    data-testid={`option-budget-${budget.replace(/[^a-zA-Z0-9]/g, "-")}`}
                    onClick={() => setData(d => ({ ...d, budget }))}
                    className={`p-3 rounded-md border text-sm text-center font-medium transition-all hover-elevate ${data.budget === budget ? "border-primary bg-primary/5 text-primary" : "border-border text-foreground"}`}
                  >
                    {budget}
                  </button>
                ))}
              </div>
            )}

            {step === 3 && (
              <div className="grid grid-cols-2 gap-3">
                {PROPERTY_TYPES.map((type) => (
                  <button
                    key={type}
                    data-testid={`option-property-${type.replace(/[^a-zA-Z0-9]/g, "-")}`}
                    onClick={() => setData(d => ({ ...d, propertyType: type }))}
                    className={`p-3 rounded-md border text-sm font-medium transition-all hover-elevate ${data.propertyType === type ? "border-primary bg-primary/5 text-primary" : "border-border text-foreground"}`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            )}

            {step === 4 && (
              <div className="flex flex-wrap gap-3">
                {STYLES.map((style) => (
                  <button
                    key={style}
                    data-testid={`option-style-${style.toLowerCase()}`}
                    onClick={() => setData(d => ({ ...d, preferredStyle: style }))}
                    className={`px-4 py-2 rounded-full border text-sm font-medium transition-all hover-elevate ${data.preferredStyle === style ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground"}`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            )}

            {step === 5 && (
              <div className="flex flex-col gap-3">
                {COMM_STYLES.map((style) => (
                  <button
                    key={style}
                    data-testid={`option-comm-${style.toLowerCase().replace(/ /g, "-")}`}
                    onClick={() => setData(d => ({ ...d, communicationStyle: style }))}
                    className={`p-3 rounded-md border text-sm font-medium text-left transition-all hover-elevate ${data.communicationStyle === style ? "border-primary bg-primary/5 text-primary" : "border-border text-foreground"}`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-3 mt-8">
              {step > 0 && (
                <Button variant="outline" onClick={() => setStep(s => s - 1)} data-testid="button-back">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              )}
              <Button
                className="flex-1 gap-2"
                onClick={handleNext}
                disabled={!canProceed() || mutation.isPending}
                data-testid="button-next"
              >
                {step === STEPS.length - 1
                  ? mutation.isPending ? "Saving..." : "Find My Agents"
                  : "Continue"
                }
                {step < STEPS.length - 1 && <ChevronRight className="w-4 h-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
