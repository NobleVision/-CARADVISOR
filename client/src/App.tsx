import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Compare from "./pages/Compare";
import History from "./pages/History";
import Saved from "./pages/Saved";
import Premium from "./pages/Premium";
import VehicleDetail from "./pages/VehicleDetail";
import FindMyCar from "./pages/FindMyCar";
import NewCars from "./pages/NewCars";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/find" component={FindMyCar} />
      <Route path="/new-cars" component={NewCars} />
      <Route path="/compare" component={Compare} />
      <Route path="/saved" component={Saved} />
      <Route path="/history" component={History} />
      <Route path="/premium" component={Premium} />
      <Route path="/vehicle/:vin" component={VehicleDetail} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
