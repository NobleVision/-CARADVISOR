import { NavBar } from "@/components/NavBar";
import { SiteFooter } from "@/components/SiteFooter";
import { VehicleResult } from "@/components/VehicleResult";
import { AdvisorChat } from "@/components/AdvisorChat";
import { ChecklistCard } from "@/components/ChecklistCard";
import { ContactSellerDialog } from "@/components/ContactSellerDialog";
import { FromTheWeb } from "@/components/FromTheWeb";
import { PublicRecords } from "@/components/PublicRecords";
import { SimilarVehicles } from "@/components/SimilarVehicles";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import type { DecodeResult } from "@/lib/vehicle";
import { ArrowLeft, AlertTriangle, MapPin, Store, DollarSign, Gauge } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";

type ListingContext = {
  id: string;
  sellerType: string;
  year: number;
  make: string;
  model: string;
  dealerName: string;
  city: string;
  state: string;
  price: number;
  mileage: number;
  regionFlags?: string[];
};

export default function VehicleDetail() {
  const params = useParams();
  const vin = (params.vin ?? "").toUpperCase();
  const mileageParam = useMemo(() => {
    const sp = new URLSearchParams(window.location.search);
    const m = parseInt(sp.get("mileage") ?? "", 10);
    return Number.isFinite(m) && m > 0 ? m : undefined;
  }, []);

  const { isAuthenticated } = useAuth();
  const [result, setResult] = useState<DecodeResult | null>(null);
  const [listing, setListing] = useState<ListingContext | null>(null);
  const [saved, setSaved] = useState(false);
  const [showAdvisor, setShowAdvisor] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const advisorRef = useRef<HTMLDivElement>(null);

  // 1. First check whether this VIN belongs to our local inventory (seeded
  //    listings have synthetic VINs that won't resolve against NHTSA).
  const inventoryReport = trpc.find.reportByVin.useQuery(
    { vin },
    { enabled: vin.length > 0, retry: false },
  );

  const decode = trpc.vehicle.decode.useMutation({
    onSuccess: (data) => setResult(data),
    onError: (err) => {
      setNotFound(true);
      toast.error("Could not decode VIN", { description: err.message });
    },
  });

  const saveMutation = trpc.vehicle.save.useMutation({
    onSuccess: () => {
      setSaved(true);
      toast.success("Saved to your Garage");
    },
    onError: (err) => toast.error("Could not save", { description: err.message }),
  });

  // 2. Route the lookup: inventory hit -> use it; inventory miss -> NHTSA decode.
  const routedRef = useRef(false);
  useEffect(() => {
    if (routedRef.current) return;
    if (inventoryReport.isLoading) return;

    if (inventoryReport.data) {
      routedRef.current = true;
      const r = inventoryReport.data;
      setResult({ vehicle: r.vehicle, score: r.score, mileage: r.listing.mileage });
      setListing({
        id: r.listing.id,
        sellerType: r.listing.sellerType,
        year: r.listing.year,
        make: r.listing.make,
        model: r.listing.model,
        dealerName: r.listing.dealerName,
        city: r.listing.city,
        state: r.listing.state,
        price: r.listing.price,
        mileage: r.listing.mileage,
        regionFlags: r.listing.regionFlags,
      });
    } else {
      // inventory miss (data === null) or query errored — fall back to NHTSA
      routedRef.current = true;
      decode.mutate({ vin, mileage: mileageParam });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inventoryReport.isLoading, inventoryReport.data]);

  useEffect(() => {
    if (showAdvisor && advisorRef.current) {
      advisorRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [showAdvisor]);

  const handleSave = () => {
    if (!isAuthenticated) {
      toast("Sign in to save vehicles", {
        action: { label: "Sign in", onClick: () => (window.location.href = getLoginUrl()) },
      });
      return;
    }
    if (!result) return;
    saveMutation.mutate({ vehicle: result.vehicle, score: result.score, mileage: result.mileage ?? undefined });
  };

  const loading = inventoryReport.isLoading || decode.isPending;

  return (
    <div className="min-h-screen">
      <NavBar />
      <div className="container py-8">
        <Link href="/find">
          <Button variant="ghost" size="sm" className="mb-6 gap-2 text-muted-foreground">
            <ArrowLeft className="size-4" /> Back
          </Button>
        </Link>

        {loading ? (
          <div className="flex flex-col items-center gap-3 py-24 text-muted-foreground">
            <Spinner /> <span className="text-sm">Decoding {vin}…</span>
          </div>
        ) : result ? (
          <>
            {listing && (
              <div className="mb-6 rounded-xl border border-border/60 bg-card/40 p-5">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
                  <span className="inline-flex items-center gap-2 font-medium">
                    <DollarSign className="size-4 text-primary" />
                    ${listing.price.toLocaleString()}
                  </span>
                  <span className="inline-flex items-center gap-2 text-muted-foreground">
                    <Gauge className="size-4" />
                    {listing.mileage.toLocaleString()} mi
                  </span>
                  <span className="inline-flex items-center gap-2 text-muted-foreground">
                    <Store className="size-4" />
                    {listing.dealerName}
                  </span>
                  <span className="inline-flex items-center gap-2 text-muted-foreground">
                    <MapPin className="size-4" />
                    {listing.city}, {listing.state}
                  </span>
                </div>
                {listing.regionFlags && listing.regionFlags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {listing.regionFlags.map((flag, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="gap-1.5 border-amber-500/40 bg-amber-500/10 text-amber-300"
                      >
                        <AlertTriangle className="size-3.5" /> {flag}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="mt-4 border-t border-border/50 pt-4">
                  <ContactSellerDialog
                    listingId={listing.id}
                    vin={vin}
                    vehicle={`${listing.year} ${listing.make} ${listing.model}`}
                    sellerType={listing.sellerType}
                  />
                </div>
              </div>
            )}
            <VehicleResult
              result={result}
              source={listing ? "inventory" : "nhtsa"}
              onAskAdvisor={() => setShowAdvisor(true)}
              onSave={handleSave}
              isSaved={saved}
              isSaving={saveMutation.isPending}
            />

            {/* Free public records + the personalized pre-purchase action plan */}
            <div className="mt-6 space-y-6">
              <PublicRecords
                make={result.vehicle.make}
                model={result.vehicle.model}
                modelYear={result.vehicle.modelYear}
              />
              <ChecklistCard
                listingId={listing?.id}
                vehicle={
                  !listing && Number.isFinite(parseInt(result.vehicle.modelYear, 10))
                    ? {
                        year: parseInt(result.vehicle.modelYear, 10),
                        make: result.vehicle.make,
                        model: result.vehicle.model,
                        mileage: result.mileage ?? undefined,
                        transmissionStyle: result.vehicle.transmissionStyle || undefined,
                        engineDisplacementL: result.vehicle.engineDisplacementL || undefined,
                      }
                    : undefined
                }
              />
              {/* Real owner-reported intel from the web (Brave; hidden when keyless) */}
              <FromTheWeb
                make={result.vehicle.make}
                model={result.vehicle.model}
                modelYear={result.vehicle.modelYear}
              />
              {/* Semantic nearest neighbors (Pinecone; deterministic fallback) */}
              <SimilarVehicles vin={vin} />
            </div>

            {showAdvisor && (
              <div ref={advisorRef} className="mt-10 scroll-mt-20">
                <h3 className="mb-4 font-serif text-2xl font-semibold">AI Advisor</h3>
                <AdvisorChat result={result} />
              </div>
            )}
          </>
        ) : notFound ? (
          <div className="py-24 text-center">
            <p className="text-muted-foreground">This VIN could not be decoded.</p>
            <Link href="/lookup"><Button className="mt-4">Try another VIN</Button></Link>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-24 text-muted-foreground">
            <Spinner /> <span className="text-sm">Decoding {vin}…</span>
          </div>
        )}
      </div>
      <SiteFooter compact />
    </div>
  );
}
