"use client";

import { Geolocation } from "@capacitor/geolocation";

export default function GetLocationButton() {
  const getLocation = async () => {
    const perm = await Geolocation.requestPermissions();

    if (perm.location === "granted") {
      const pos = await Geolocation.getCurrentPosition();

      console.log(pos.coords.latitude);
      console.log(pos.coords.longitude);
    }
  };

  return <button onClick={getLocation}>Detect My Location</button>;
}
