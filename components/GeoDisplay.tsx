"use client";

import { useEffect, useState } from "react";

export function GeoDisplay() {
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- feature-detecting a browser API, not derivable at render time
      setError(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => setCoords({ lat: position.coords.latitude, lon: position.coords.longitude }),
      () => setError(true)
    );
  }, []);

  if (error) return null;

  return (
    <p className="text-center text-xs text-slate-400">
      Usamos la ubicación para geolocalizarte:
      <br />
      Latitud: <b>{coords ? coords.lat : "…"}</b> · Longitud: <b>{coords ? coords.lon : "…"}</b>
    </p>
  );
}
