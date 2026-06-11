import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Compass, LogOut, Menu, Sparkles } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { SignInDialog } from "./SignInDialog";
import { NotificationsBell } from "./NotificationsBell";
import { Logo } from "./Logo";
import { HelpMenu } from "@/tour/HelpMenu";
import { useTour } from "@/tour/TourProvider";

const links = [
  { href: "/lookup", label: "Lookup" },
  { href: "/find", label: "Find My Car" },
  { href: "/map", label: "Map" },
  { href: "/new-cars", label: "New Cars" },
  { href: "/compare", label: "Compare" },
  { href: "/saved", label: "Garage" },
  { href: "/history", label: "History" },
  { href: "/premium", label: "Premium" },
];

export function NavBar() {
  const { user, isAuthenticated, logout, refresh } = useAuth();
  const { startTour } = useTour();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5" aria-label="GOGETTER home">
          <Logo size={36} />
          <div className="leading-none">
            <span className="block font-serif text-lg font-semibold tracking-tight">GOGETTER</span>
            <span className="block text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Car Advisor
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => {
            const active = location === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  // 8 links must fit the 768px container — tighter at md, roomy at lg.
                  "relative rounded-md px-2 py-2 text-[13px] transition-colors lg:px-3.5 lg:text-sm",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {l.label === "Premium" && <Sparkles className="mr-1 inline size-3.5 text-primary" />}
                {l.label}
                {active && (
                  <span className="absolute inset-x-3 -bottom-px h-px bg-primary" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <HelpMenu />
          <NotificationsBell />
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <div className="flex size-7 items-center justify-center rounded-full bg-primary/15 text-xs font-medium text-primary">
                    {(user?.name?.[0] ?? "U").toUpperCase()}
                  </div>
                  <span className="hidden max-w-[120px] truncate text-sm sm:inline">{user?.name ?? "Account"}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5 text-xs text-muted-foreground">{user?.email ?? "Signed in"}</div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => startTour("full")}>
                  <Compass className="mr-2 size-4" /> Take the tour
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => logout()}>
                  <LogOut className="mr-2 size-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button size="sm" onClick={() => setSignInOpen(true)}>
              Sign in
            </Button>
          )}

          <SignInDialog
            open={signInOpen}
            onOpenChange={setSignInOpen}
            onSuccess={() => refresh()}
          />

          <DropdownMenu open={mobileOpen} onOpenChange={setMobileOpen}>
            <DropdownMenuTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="size-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 md:hidden">
              {links.map((l) => (
                <DropdownMenuItem key={l.href} asChild>
                  <Link href={l.href}>{l.label}</Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
