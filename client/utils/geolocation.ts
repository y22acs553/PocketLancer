// client/utils/geolocation.ts

/** True when running inside a Capacitor native app (Android/iOS) */
function isNative(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as any).Capacitor;
  return !!(cap?.isNativePlatform?.() || cap?.Plugins?.Geolocation);
}

/** Get precise GPS coordinates — uses Capacitor on Android, browser API on web */
export async function getCurrentLocation(): Promise<{
  latitude: number;
  longitude: number;
}> {
  if (isNative()) {
    const { Geolocation } = await import("@capacitor/geolocation");

    const perm = await Geolocation.requestPermissions();

    // ✅ FIX: "prompt" means Android will show the dialog when we call
    // getCurrentPosition — it is NOT a denial. Only hard-fail on "denied".
    if (perm.location === "denied") {
      throw new Error(
        "Location permission denied. Please enable it in Settings → App → Permissions.",
      );
    }

    // Race against a hard 12-second timeout so the UI never hangs forever.
    // On a cold GPS fix Android can take several seconds — 10 s is too tight.
    const pos = await Promise.race([
      Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error("GPS timed out — please step outside or try again."),
            ),
          12000,
        ),
      ),
    ]);

    return {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
    };
  }

  // ── Web / browser fallback ────────────────────────────────────────
  return new Promise((resolve, reject) => {
    if (!navigator?.geolocation) {
      reject(new Error("Geolocation is not supported by this browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }),
      (err) => {
        // Translate browser error codes into readable messages
        const msgs: Record<number, string> = {
          1: "Location permission denied by browser.",
          2: "Location unavailable — check your connection or GPS.",
          3: "Location request timed out.",
        };
        reject(new Error(msgs[err.code] ?? err.message));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  });
}

/**
 * Reverse geocode coordinates → city & country (OpenStreetMap, no API key)
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<{ city: string; country: string }> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
    { headers: { "Accept-Language": "en" } },
  );
  if (!res.ok) throw new Error("Reverse geocode failed");
  const data = await res.json();
  return {
    city:
      data.address?.city || data.address?.town || data.address?.village || "",
    country: data.address?.country || "",
  };
}

/**
 * Haversine distance in kilometres between two coordinates.
 * Used to verify freelancer arrival proximity.
 */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
