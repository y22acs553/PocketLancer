/**
 * Get precise GPS coordinates from browser
 */
export function getCurrentLocation(): Promise<{
  latitude: number;
  longitude: number;
}> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        console.log("Geo error:", error.code, error.message);
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 60000,
        maximumAge: 60000,
      },
    );
  });
}

/**
 * Reverse geocode coordinates → city & country
 * Uses OpenStreetMap (no API key)
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<{ city: string; country: string }> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
  );

  if (!res.ok) {
    throw new Error("Failed to reverse geocode location");
  }

  const data = await res.json();

  return {
    city: data.address.city || data.address.town || data.address.village || "",
    country: data.address.country || "",
  };
}
