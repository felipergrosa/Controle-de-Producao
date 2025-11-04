import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import ImportProducts from "./pages/ImportProducts";
import ProductionEntry from "./pages/ProductionEntry";
import ProductionReport from "./pages/ProductionReport";
import ProductsQuery from "./pages/ProductsQuery";
import AuditLogs from "./pages/AuditLogs";
import Login from "./pages/Login";
import Users from "./pages/Users";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Login} />
      <Route path={"/login"} component={Login} />
      <Route path={"/dashboard"}>
        {() => (
          <DashboardLayout>
            <Dashboard />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/import"}>
        {() => (
          <DashboardLayout>
            <ImportProducts />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/production"}>
        {() => (
          <DashboardLayout>
            <ProductionEntry />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/report"}>
        {() => (
          <DashboardLayout>
            <ProductionReport />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/products"}>
        {() => (
          <DashboardLayout>
            <ProductsQuery />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/audit-logs"}>
        {() => (
          <DashboardLayout>
            <AuditLogs />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/users"}>
        {() => (
          <DashboardLayout>
            <Users />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
