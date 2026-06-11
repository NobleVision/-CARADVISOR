import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Compass, HelpCircle, Sparkles } from "lucide-react";
import { useTour } from "./TourProvider";

/** Always-available "?" menu in the NavBar to (re-)launch either tour. */
export function HelpMenu() {
  const { startTour, isTourActive } = useTour();
  if (isTourActive) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Help and guided tours"
          data-tour="help-menu"
        >
          <HelpCircle className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Guided tours — sample data, no live lookups
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => startTour("quick")}>
          <Sparkles className="mr-2 size-4 text-primary" /> Quick tour · 2 min
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => startTour("full")}>
          <Compass className="mr-2 size-4 text-primary" /> Full tour · 5 min
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
