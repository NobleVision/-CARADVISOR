import { ENV, SERVICES } from "../_core/env";
import { publicProcedure, router } from "../_core/trpc";

/**
 * Public, non-secret client configuration.
 *
 * Exposes only (a) booleans describing which optional cloud services are
 * live, so the UI can show/hide service-backed panels, and (b) the Mapbox
 * public token — pk tokens are designed to ship to browsers (restrict it by
 * URL in the Mapbox dashboard). No other credential may ever be added here.
 */
export const configRouter = router({
  public: publicProcedure.query(() => ({
    mapboxToken: ENV.mapboxToken || null,
    services: { ...SERVICES },
  })),
});
