import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BellRing, Trash2 } from "lucide-react";
import { toast } from "sonner";

export function SavedSearches() {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const q = trpc.find.savedSearches.useQuery(undefined, { enabled: isAuthenticated });
  const toggle = trpc.find.toggleSavedSearch.useMutation({
    onSuccess: () => utils.find.savedSearches.invalidate(),
  });
  const del = trpc.find.deleteSavedSearch.useMutation({
    onSuccess: () => {
      utils.find.savedSearches.invalidate();
      toast.success("Saved search removed");
    },
  });

  if (!isAuthenticated) return null;
  const searches = q.data ?? [];
  if (searches.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <BellRing className="size-4 text-primary" />
        <h2 className="font-serif text-lg font-semibold">Search alerts</h2>
        <span className="text-xs text-muted-foreground">
          We'll notify you when new matching cars appear.
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {searches.map((s) => (
          <Card key={s.id} className="flex items-center justify-between gap-3 p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{s.name ?? "Saved search"}</p>
              <p className="text-[11px] text-muted-foreground">
                {s.active ? "Alerts on" : "Paused"}
                {s.lastCheckedAt
                  ? ` · checked ${new Date(s.lastCheckedAt).toLocaleDateString()}`
                  : " · not checked yet"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Switch
                checked={s.active}
                onCheckedChange={(v) => toggle.mutate({ id: s.id, active: v })}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => del.mutate({ id: s.id })}
                aria-label="Delete saved search"
              >
                <Trash2 className="size-4 text-muted-foreground" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
