import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./lib/auth";
import { ProtectedRoute } from "./components/auth/protected-route";
import { RedirectIfAuthenticated } from "./components/auth/redirect-if-authenticated";
import { Navbar } from "./components/layout/navbar";
import { Footer } from "./components/layout/footer";
import { DashboardNav } from "./components/layout/dashboard-nav";

// Pages
import Landing from "@/pages/landing";
import Login from "@/pages/auth/login";
import Register from "@/pages/auth/register";
import Subscribe from "@/pages/subscribe";
import Chat from "@/pages/chat";
import DashboardOverview from "@/pages/dashboard/overview";
import Portfolio from "@/pages/dashboard/portfolio";
import Analysis from "@/pages/dashboard/analysis";
import ChatbotBuilder from "@/pages/dashboard/chatbot-builder";
import ShortsGenerator from "@/pages/dashboard/shorts-generator";
import Billing from "@/pages/dashboard/billing";
import Settings from "@/pages/dashboard/settings";
import NotFound from "@/pages/not-found";
import Signals from "@/pages/dashboard/signals";

function DashboardLayout() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <DashboardNav onNavigate={setLocation} />
      <main className="max-w-7xl mx-auto px-6 pb-8">
        <Switch>
          <Route path="/portfolio" component={Portfolio} />
          <Route path="/analysis" component={Analysis} />
          <Route path="/signals" component={Signals} />
          <Route path="/chatbot-builder" component={ChatbotBuilder} />
          <Route path="/shorts-generator" component={ShortsGenerator} />
          <Route path="/billing" component={Billing} />
          <Route path="/settings" component={Settings} />
          <Route path="/" component={DashboardOverview} />
          <Route component={DashboardOverview} />
        </Switch>
      </main>
    </div>
  );
}

function Router() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      
      <div className="min-h-[calc(100vh-4rem)]">
        <Switch>
          <Route path="/" component={Landing} />
          <Route path="/chat/:botId" component={Chat} />
          <Route path="/login">
            <RedirectIfAuthenticated>
              <Login />
            </RedirectIfAuthenticated>
          </Route>
          <Route path="/register">
            <RedirectIfAuthenticated>
              <Register />
            </RedirectIfAuthenticated>
          </Route>
          <Route path="/subscribe">
            <ProtectedRoute>
              <Subscribe />
            </ProtectedRoute>
          </Route>
          <Route path="/dashboard" nest>
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          </Route>
          <Route component={NotFound} />
        </Switch>
      </div>
      
      <Footer />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Router />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
