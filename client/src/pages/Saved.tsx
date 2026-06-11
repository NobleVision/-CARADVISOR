import { NavBar } from "@/components/NavBar";
import { PageHero } from "@/components/PageHero";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { SavedSearches } from "@/components/SavedSearches";
import { PriceTrend } from "@/components/PriceTrend";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { scoreColor } from "@/lib/vehicle";
import { Bookmark, GitCompare, Search, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function Saved() {
  const { isAuthenticated, loading } = useAuth();
  const utils = trpc.useUtils();
  const savedQuery = trpc.vehicle.saved.useQuery(undefined, { enabled: isAuthenticated });

  const unsave = trpc.vehicle.unsave.useMutation({
    onSuccess: () => {
      utils.vehicle.saved.invalidate();
      toast.success("Removed from Garage");
    },
  });

  return (
    <div className="min-h-screen">
      <NavBar />
      <PageHero
        eyebrow="My Garage"
        icon={<Bookmark className="size-4" />}
        title="Your shortlist, on watch."
        description="Vehicles you've saved to track and compare — price drops surface here automatically."
        actions={
          isAuthenticated && (savedQuery.data?.length ?? 0) >= 2 ? (
            <Link href="/compare">
              <Button variant="outline" className="gap-2 bg-card">
                <GitCompare className="size-4" /> Compare saved
              </Button>
            </Link>
          ) : undefined
        }
      />
      <div className="container py-10">

        {isAuthenticated && <SavedSearches />}

        {!isAuthenticated && !loading ? (
          <Empty className="py-16">
            <EmptyHeader>
              <EmptyMedia variant="icon"><Bookmark /></EmptyMedia>
              <EmptyTitle>Sign in to view your Garage</EmptyTitle>
              <EmptyDescription>Saved vehicles are tied to your account and sync across sessions.</EmptyDescription>
            </EmptyHeader>
            <Button className="mt-2" onClick={() => (window.location.href = getLoginUrl())}>Sign in</Button>
          </Empty>
        ) : savedQuery.isLoading ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : (savedQuery.data?.length ?? 0) === 0 ? (
          <Empty className="py-16">
            <EmptyHeader>
              <EmptyMedia variant="icon"><Bookmark /></EmptyMedia>
              <EmptyTitle>Your Garage is empty</EmptyTitle>
              <EmptyDescription>Decode a VIN and tap "Save to Garage" to keep it here.</EmptyDescription>
            </EmptyHeader>
            <Link href="/lookup"><Button className="mt-2 gap-2"><Search className="size-4" /> Decode a VIN</Button></Link>
          </Empty>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {savedQuery.data!.map((v, i) => (
              <Card
                key={v.id}
                className="card-lift flex flex-col motion-safe:fade-rise"
                style={{ animationDelay: `${Math.min(i * 60, 360)}ms` }}
              >
                <CardContent className="flex flex-1 flex-col p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex size-14 flex-col items-center justify-center rounded-xl bg-secondary">
                      <span className={`font-serif text-xl font-semibold ${scoreColor(v.score ?? 0)}`}>{v.score ?? "—"}</span>
                      {v.grade && <span className="text-[10px] text-muted-foreground">{v.grade}</span>}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => unsave.mutate({ id: v.id })}>
                      <Trash2 className="size-4 text-muted-foreground" />
                    </Button>
                  </div>
                  <h3 className="mt-3 font-medium">
                    {v.nickname || [v.modelYear, v.make, v.model].filter(Boolean).join(" ") || "Saved vehicle"}
                  </h3>
                  <p className="font-mono text-xs text-muted-foreground">{v.vin}</p>
                  {v.mileage != null && (
                    <Badge variant="secondary" className="mt-2 w-fit font-normal">{v.mileage.toLocaleString()} mi</Badge>
                  )}
                  <PriceTrend
                    listingId={v.listingId}
                    priceAtSave={v.priceAtSave}
                    lastKnownPrice={v.lastKnownPrice}
                  />
                  <div className="mt-auto pt-4">
                    <Link href={`/vehicle/${v.vin}${v.mileage ? `?mileage=${v.mileage}` : ""}`}>
                      <Button variant="outline" size="sm" className="w-full bg-card">View details</Button>
                    </Link>
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
