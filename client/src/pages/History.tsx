import { NavBar } from "@/components/NavBar";
import { PageHero } from "@/components/PageHero";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { scoreColor } from "@/lib/vehicle";
import { Clock, History as HistoryIcon, Search, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function History() {
  const { isAuthenticated, loading } = useAuth();
  const utils = trpc.useUtils();
  const historyQuery = trpc.vehicle.history.useQuery(undefined, { enabled: isAuthenticated });

  const deleteItem = trpc.vehicle.deleteHistoryItem.useMutation({
    onSuccess: () => utils.vehicle.history.invalidate(),
  });
  const clearAll = trpc.vehicle.clearHistory.useMutation({
    onSuccess: () => {
      utils.vehicle.history.invalidate();
      toast.success("History cleared");
    },
  });

  return (
    <div className="min-h-screen">
      <NavBar />
      <PageHero
        eyebrow="Search History"
        icon={<HistoryIcon className="size-4" />}
        title="Every VIN, remembered."
        description="Every vehicle you've decoded, newest first — jump back into any report."
        actions={
          isAuthenticated && (historyQuery.data?.length ?? 0) > 0 ? (
            <Button variant="outline" className="gap-2 bg-card" onClick={() => clearAll.mutate()} disabled={clearAll.isPending}>
              <Trash2 className="size-4" /> Clear all
            </Button>
          ) : undefined
        }
      />
      <div className="container py-10">

        {!isAuthenticated && !loading ? (
          <SignInPrompt />
        ) : historyQuery.isLoading ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : (historyQuery.data?.length ?? 0) === 0 ? (
          <Empty className="py-16">
            <EmptyHeader>
              <EmptyMedia variant="icon"><HistoryIcon /></EmptyMedia>
              <EmptyTitle>No searches yet</EmptyTitle>
              <EmptyDescription>Decode your first VIN to start building your history.</EmptyDescription>
            </EmptyHeader>
            <Link href="/lookup"><Button className="mt-2 gap-2"><Search className="size-4" /> Decode a VIN</Button></Link>
          </Empty>
        ) : (
          <div className="space-y-3">
            {historyQuery.data!.map((h) => (
              <Card key={h.id} className="transition-[border-color,transform] duration-200 hover:border-primary/40 motion-safe:hover:translate-x-0.5">
                <CardContent className="flex items-center justify-between gap-4 p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex size-12 flex-col items-center justify-center rounded-lg bg-secondary">
                      <span className={`font-serif text-lg font-semibold ${scoreColor(h.score ?? 0)}`}>{h.score ?? "—"}</span>
                    </div>
                    <div>
                      <p className="font-medium">
                        {[h.modelYear, h.make, h.model].filter(Boolean).join(" ") || "Unknown vehicle"}
                      </p>
                      <p className="font-mono text-xs text-muted-foreground">{h.vin}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {h.grade && <Badge variant="secondary">{h.grade}</Badge>}
                    <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
                      <Clock className="size-3.5" />
                      {new Date(h.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <Link href={`/vehicle/${h.vin}${h.mileage ? `?mileage=${h.mileage}` : ""}`}>
                      <Button variant="ghost" size="sm">View</Button>
                    </Link>
                    <Button variant="ghost" size="icon" onClick={() => deleteItem.mutate({ id: h.id })}>
                      <Trash2 className="size-4 text-muted-foreground" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <SiteFooter compact />
    </div>
  );
}

function SignInPrompt() {
  return (
    <Empty className="py-16">
      <EmptyHeader>
        <EmptyMedia variant="icon"><HistoryIcon /></EmptyMedia>
        <EmptyTitle>Sign in to view your history</EmptyTitle>
        <EmptyDescription>Your search history is saved to your account so you can pick up where you left off.</EmptyDescription>
      </EmptyHeader>
      <Button className="mt-2" onClick={() => (window.location.href = getLoginUrl())}>Sign in</Button>
    </Empty>
  );
}
