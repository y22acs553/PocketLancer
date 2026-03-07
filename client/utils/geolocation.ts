// client/utils/geolocation.ts

/** True when running inside a Capacitor native app (Android/iOS) */
function isNative(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as any).Capacitor;
  return !!(cap?.isNativePlatform?.() || cap?.Plugins?.Geolocation);
}

/**
 * Extracts lat/lng from a Capacitor GeolocationPosition, throwing a clear
 * error if the position or coords are undefined (happens on some Android
 * devices where getCurrentPosition resolves but returns a malformed object).
 */
function extractCoords(pos: any): { latitude: number; longitude: number } {
  const lat = pos?.coords?.latitude;
  const lng = pos?.coords?.longitude;
  if (
    typeof lat !== "number" ||
    typeof lng !== "number" ||
    isNaN(lat) ||
    isNaN(lng)
  ) {
    throw new Error("GPS returned an invalid position — please try again.");
  }
  return { latitude: lat, longitude: lng };
}

/**
 * Get GPS coordinates — uses Capacitor on Android/iOS, browser API on web.
 *
 * Strategy: try a fast coarse (network/cell-tower) fix first.
 * This responds in <2 s and is accurate enough for a 10 km radius search.
 * High-accuracy GPS is only used as a fallback because a cold Android GPS
 * takes 20–60 s and reliably times out indoors.
 */
export async function getCurrentLocation(): Promise<{
  latitude: number;
  longitude: number;
}> {
  if (isNative()) {
    const { Geolocation } = await import("@capacitor/geolocation");

    const perm = await Geolocation.requestPermissions();

    // "prompt" = Android will show the dialog on the next call — not a denial.
    // Only hard-fail on "denied".
    if (perm.location === "denied") {
      throw new Error(
        "Location permission denied. Please enable it in Settings → App → Permissions.",
      );
    }

    // ── Step 1: fast coarse fix (cell tower / WiFi, usually <2 s) ──
    // maximumAge:60000 allows a recently cached position so repeat searches
    // are instant.
    try {
      const coarse = await Promise.race([
        Geolocation.getCurrentPosition({
          enableHighAccuracy: false,
          timeout: 8000,
          maximumAge: 60000,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("Coarse location timed out")),
            10000,
          ),
        ),
      ]);
      // ✅ Null-check coords — some Android devices resolve with undefined coords
      return extractCoords(coarse);
    } catch {
      // Coarse failed — fall through to high-accuracy GPS
    }

    // ── Step 2: high-accuracy GPS fallback ──────────────────────────
    // Cold GPS start needs up to 30 s — give it proper room.
    const precise = await Promise.race([
      Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 25000,
        maximumAge: 0,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error("GPS timed out — please step outside or try again."),
            ),
          28000,
        ),
      ),
    ]);

    // ✅ Null-check here too
    return extractCoords(precise);
  }

  // ── Web / browser fallback ────────────────────────────────────────
  return new Promise((resolve, reject) => {
    if (!navigator?.geolocation) {
      reject(new Error("Geolocation is not supported by this browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        try {
          resolve(extractCoords(pos));
        } catch (e: any) {
          reject(e);
        }
      },
      (err) => {
        const msgs: Record<number, string> = {
          1: "Location permission denied by browser.",
          2: "Location unavailable — check your connection or GPS.",
          3: "Location request timed out.",
        };
        reject(new Error(msgs[err.code] ?? err.message));
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  });
}
