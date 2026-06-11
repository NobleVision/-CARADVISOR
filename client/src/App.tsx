import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import { Suspense, lazy, useLayoutEffect } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { Logo } from "./components/Logo";
import Lookup from "./pages/Lookup";
import Login from "./pages/Login";
import Compare from "./pages/Compare";
import History from "./pages/History";
import Saved from "./pages/Saved";
import Premium from "./pages/Premium";
import VehicleDetail from "./pages/VehicleDetail";
import FindMyCar from "./pages/FindMyCar";
import NewCars from "./pages/NewCars";

// The landing page carries GSAP + the Three.js hero — lazy-loaded so none of
// it lands in the main app chunk.
const Landing = lazy(() => import("./pages/Landing"));
// The map explorer carries mapbox-gl (~230KB gz) — same lazy-chunk treatment.
const MapExplorer = lazy(() => import("./pages/MapExplorer"));

/** wouter has no scroll restoration — reset to top on every route change. */
function ScrollToTop() {
  const [location] = useLocation();
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);
  return null;
}

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <span className="motion-safe:animate-pulse">
        <Logo size={56} />
      </span>
    </div>
  );
}

function Router() {
  // NOTE: keep <Route> elements as DIRECT children of <Switch> — the local
  // wouter patch reads element.props.path off Switch's children. Suspense
  // must wrap outside the Switch, never between Switch and Routes.
  return (
    <Suspense fallback={<RouteFallback />}>
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/lookup" component={Lookup} />
        <Route path="/login" component={Login} />
        <Route path="/find" component={FindMyCar} />
        <Route path="/map" component={MapExplorer} />
        <Route path="/new-cars" component={NewCars} />
        <Route path="/compare" component={Compare} />
        <Route path="/saved" component={Saved} />
        <Route path="/history" component={History} />
        <Route path="/premium" component={Premium} />
        <Route path="/vehicle/:vin" component={VehicleDetail} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <ScrollToTop />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
