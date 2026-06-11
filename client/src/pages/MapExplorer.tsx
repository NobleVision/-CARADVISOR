import { NavBar } from "@/components/NavBar";
import { PageHero } from "@/components/PageHero";
import { SiteFooter } from "@/components/SiteFooter";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ALL_BODY_STYLES, formatUSD, type BodyStyle } from "@/lib/inventory";
import { trpc } from "@/lib/trpc";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import "./map-explorer.css";
import { MapPin, ShieldAlert } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";

type MapItem = {
  id: string;
  vin: string;
  label: string;
  trim: string;
  condition: "New" | "Used";
  price: number;
  mileage: number;
  bodyStyle: string;
  fuel: string;
  photo: string | null;
  dealerName: string;
  sellerType: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  qualityScore: number;
  qualityGrade: string;
  riskLevel: "clear" | "caution" | "high";
};

function popupNode(item: MapItem, onView: () => void): HTMLElement {
  const el = document.createElement("div");
  el.className = "w-[260px]";
  el.innerHTML = `
    ${item.photo ? `<img src="${item.photo}" alt="" loading="lazy" class="h-28 w-full object-cover" />` : ""}
    <div class="space-y-1.5 p-3">
      <p class="text-sm font-semibold leading-snug">${item.label}${item.trim ? ` <span class="font-normal text-muted-foreground">${item.trim}</span>` : ""}</p>
      <div class="flex items-center justify-between text-xs">
        <span class="font-semibold text-primary">${formatUSD(item.price)}</span>
        <span class="text-muted-foreground">${item.condition === "New" ? "New" : `${Math.round(item.mileage / 1000)}k mi`}</span>
      </div>
      <p class="text-[11px] text-muted-foreground">${item.dealerName} · ${item.city}, ${item.state}</p>
      <div class="flex items-center gap-1.5 pt-0.5">
        <span class="rounded-md bg-secondary px-1.5 py-0.5 text-[10px]">${item.qualityScore}/100 · ${item.qualityGrade}</span>
        ${item.riskLevel === "high" ? '<span class="rounded-md border border-red-500/40 bg-red-500/10 px-1.5 py-0.5 text-[10px] text-red-300">Known issues</span>' : ""}
        ${item.riskLevel === "caution" ? '<span class="rounded-md border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-300">Caution</span>' : ""}
      </div>
      <button data-view class="mt-1.5 w-full rounded-md border border-primary/40 bg-primary/10 px-2 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20">View full report →</button>
    </div>`;
  el.querySelector("[data-view]")?.addEventListener("click", onView);
  return el;
}

/**
 * /map — interactive Mapbox explorer of every inventory listing, pinned at
 * its (jittered) ZIP centroid with gold price pills, popup report cards, and
 * client-side filters. Degrades to a branded notice + link back to Find My
 * Car when MAPBOX_TOKEN is absent.
 */
export default function MapExplorer() {
  const [, navigate] = useLocation();
  const config = trpc.config.public.useQuery(undefined, { staleTime: Infinity });
  const listings = trpc.find.mapListings.useQuery(undefined, { staleTime: 5 * 60 * 1000 });

  const [priceRange, setPriceRange] = useState<[number, number]>([0, 70000]);
  const [bodyStyles, setBodyStyles] = useState<BodyStyle[]>([]);
  const [hideHighRisk, setHideHighRisk] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const fittedRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);

  const token = config.data?.mapboxToken ?? null;
  const items = useMemo(() => (listings.data?.items ?? []) as MapItem[], [listings.data]);

  const filtered = useMemo(
    () =>
      items.filter(
        (i) =>
          i.price >= priceRange[0] &&
          i.price <= priceRange[1] &&
          (bodyStyles.length === 0 || bodyStyles.includes(i.bodyStyle as BodyStyle)) &&
          (!hideHighRisk || i.riskLevel !== "high"),
      ),
    [items, priceRange, bodyStyles, hideHighRisk],
  );

  // ── Map lifecycle ──
  useEffect(() => {
    if (!token || !containerRef.current || mapRef.current) return;
    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [-77.15, 38.92], // DC metro — where the inventory lives
      zoom: 9,
      attributionControl: true,
    });
    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: false }), "top-right");
    map.addControl(
      new mapboxgl.GeolocateControl({ positionOptions: { enableHighAccuracy: false } }),
      "top-right",
    );
    map.on("load", () => setMapReady(true));
    mapRef.current = map;
    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
      setMapReady(false);
      fittedRef.current = false;
    };
  }, [token]);

  // ── Markers follow the filtered set ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = filtered.map((item) => {
      const pin = document.createElement("button");
      pin.type = "button";
      pin.className = "gg-pin";
      pin.dataset.risk = item.riskLevel;
      pin.textContent = `$${Math.round(item.price / 1000)}k`;
      pin.setAttribute("aria-label", `${item.label}, ${formatUSD(item.price)}`);
      const popup = new mapboxgl.Popup({ offset: 16, maxWidth: "280px" }).setDOMContent(
        popupNode(item, () => navigate(`/vehicle/${item.vin}`)),
      );
      return new mapboxgl.Marker({ element: pin, anchor: "center" })
        .setLngLat([item.lng, item.lat])
        .setPopup(popup)
        .addTo(map);
    });
    if (!fittedRef.current && filtered.length > 0) {
      fittedRef.current = true;
      const bounds = new mapboxgl.LngLatBounds();
      filtered.forEach((i) => bounds.extend([i.lng, i.lat]));
      map.fitBounds(bounds, { padding: 56, maxZoom: 11, duration: 0 });
    }
  }, [filtered, mapReady, navigate]);

  const toggleBody = (b: BodyStyle) =>
    setBodyStyles((prev) => (prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]));

  const configLoading = config.isLoading;

  return (
    <div className="min-h-screen">
      <NavBar />
      <PageHero
        eyebrow="Inventory Map"
        icon={<MapPin className="size-4" />}
        title="Every car, on the map."
        description="All scanned listings pinned where they're actually parked — filter by price, body style, and risk, then click a pin for the report."
      />

      <div className="container space-y-4 py-8">
        {/* Filters */}
        <Card className="border-border/60 bg-card/50">
          <CardContent className="flex flex-wrap items-center gap-x-8 gap-y-4 p-4">
            <div className="min-w-56 flex-1">
              <div className="mb-2 flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Price range</Label>
                <span className="text-sm font-semibold">
                  {formatUSD(priceRange[0])} – {formatUSD(priceRange[1])}
                </span>
              </div>
              <Slider
                value={priceRange}
                min={0}
                max={70000}
                step={1000}
                minStepsBetweenThumbs={1}
                onValueChange={(v) => setPriceRange([v[0], v[1]])}
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ALL_BODY_STYLES.map((b) => {
                const active = bodyStyles.includes(b);
                return (
                  <button
                    key={b}
                    type="button"
                    onClick={() => toggleBody(b)}
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                      active
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    {b}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <Switch id="hide-high-risk" checked={hideHighRisk} onCheckedChange={setHideHighRisk} />
              <Label htmlFor="hide-high-risk" className="flex items-center gap-1.5 text-xs">
                <ShieldAlert className="size-3.5 text-amber-300" /> Hide known-defect models
              </Label>
            </div>
            <Badge variant="outline" className="ml-auto bg-transparent text-xs font-normal text-muted-foreground">
              {filtered.length} of {items.length} cars
            </Badge>
          </CardContent>
        </Card>

        {/* Map / fallback */}
        {configLoading || listings.isLoading ? (
          <Card className="border-border/60 bg-card/40">
            <CardContent className="flex items-center justify-center gap-3 py-32 text-muted-foreground">
              <Spinner /> <span className="text-sm">Loading the map…</span>
            </CardContent>
          </Card>
        ) : token ? (
          <div className="gg-map relative overflow-hidden rounded-xl border border-border/60">
            <div ref={containerRef} className="h-[62vh] min-h-[420px] w-full" />
          </div>
        ) : (
          <Card className="border-dashed border-border/60 bg-card/30">
            <CardContent className="flex flex-col items-center gap-3 py-20 text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
                <MapPin className="size-7 text-primary" />
              </div>
              <h3 className="font-serif text-xl font-semibold">Map unavailable</h3>
              <p className="max-w-md text-sm text-muted-foreground">
                Set <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">MAPBOX_TOKEN</code> to
                light up the interactive inventory map. Until then, every listing is still searchable
                in{" "}
                <Link href="/find" className="text-primary underline-offset-2 hover:underline">
                  Find My Car
                </Link>
                .
              </p>
            </CardContent>
          </Card>
        )}

        <p className="text-center text-[11px] text-muted-foreground">
          Pin locations are approximate (seller ZIP area) — confirm the exact address with the seller
          before visiting.
        </p>
      </div>
      <SiteFooter compact />
    </div>
  );
}
