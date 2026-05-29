import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout/Layout";

import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import ServicesList from "@/pages/ServicesList";
import ServiceDetail from "@/pages/ServiceDetail";
import RoiSummary from "@/pages/RoiSummary";
import FlakySignals from "@/pages/FlakySignals";
import EvidencePackets from "@/pages/EvidencePackets";
import Continuity from "@/pages/Continuity";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/services" component={ServicesList} />
        <Route path="/services/:id" component={ServiceDetail} />
        <Route path="/roi" component={RoiSummary} />
        <Route path="/flaky" component={FlakySignals} />
        <Route path="/evidence" component={EvidencePackets} />
        <Route path="/continuity" component={Continuity} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
