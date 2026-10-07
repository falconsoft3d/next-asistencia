"use client";

import { useCallback, useEffect, useState } from "react";

export function GeoDisplay() {
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    if (!navigator.geolocation) {
      setError(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ lat: position.coords.latitude, lon: position.coords.longitude });
        setError(false);
        setLoading(false);
      },
      () => {
        setError(true);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading a browser API on mount, not derivable at render time
    refresh();
  }, [refresh]);

  return (
    <p className="text-center text-xs text-slate-400">
      Usamos la ubicación para geolocalizarte:
      <br />
      {error && !loading ? (
        <span>No se pudo obtener la ubicación</span>
      ) : (
        <>
          Latitud: <b>{coords ? coords.lat : "…"}</b> · Longitud: <b>{coords ? coords.lon : "…"}</b>
        </>
      )}
      <button
        type="button"
        onClick={refresh}
        disabled={loading}
        title="Actualizar ubicación"
        aria-label="Actualizar ubicación"
        className="ml-1 inline-flex align-middle text-slate-500 hover:text-slate-700 disabled:opacity-50"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
        >
          <path d="M21 12a9 9 0 1 1-2.64-6.36" />
          <path d="M21 3v6h-6" />
        </svg>
      </button>
    </p>
  );
}
