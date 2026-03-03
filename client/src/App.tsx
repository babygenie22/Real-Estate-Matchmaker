import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import OnboardingPage from "@/pages/onboarding";
import DiscoverPage from "@/pages/discover";
import MatchesPage from "@/pages/matches";
import ChatPage from "@/pages/chat";
import AdminPage from "@/pages/admin";
import ProfilePage from "@/pages/profile";
import AppLayout from "@/components/app-layout";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { Home } from "lucide-react";

function AuthenticatedApp() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
            <Home className="w-6 h-6 text-primary-foreground" />
          </div>
          <div className="text-sm text-muted-foreground">Loading HomeMatch...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LandingPage />;
  }

  if (user && !user.onboardingCompleted && location !== "/onboarding") {
    window.location.href = "/onboarding";
    return null;
  }

  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={DiscoverPage} />
        <Route path="/discover" component={DiscoverPage} />
        <Route path="/matches" component={MatchesPage} />
        <Route path="/chat/:matchId" component={ChatPage} />
        <Route path="/admin" component={AdminPage} />
        <Route path="/profile" component={ProfilePage} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function Router() {
  const [location] = useLocation();

  if (location === "/onboarding") {
    return <OnboardingPage />;
  }

  return <AuthenticatedApp />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
