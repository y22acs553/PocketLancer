// client/utils/geolocation.ts

/** True when running inside a Capacitor native app (Android/iOS) */
function isNative(): boolean {
  return (
    typeof window !== "undefined" &&
    !!(window as any).Capacitor?.isNativePlatform?.()
  );
}

/** Get precise GPS coordinates — uses Capacitor on Android, browser API on web */
export async function getCurrentLocation(): Promise<{
  latitude: number;
  longitude: number;
}> {
  if (isNative()) {
    const { Geolocation } = await import("@capacitor/geolocation");
    const perm = await Geolocation.requestPermissions();
    if (perm.location !== "granted") {
      throw new Error("Location permission denied");
    }
    const pos = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 15000,
    });
    return {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
    };
  }

  return new Promise((resolve, reject) => {
    if (!navigator?.geolocation) {
      reject(new Error("Geolocation is not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }),
      (err) => reject(err),
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
