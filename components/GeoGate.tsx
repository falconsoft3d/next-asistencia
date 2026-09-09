"use client";

import { useState } from "react";
import { Alert, Button } from "./ui";

interface GeoGateProps {
  disabled?: boolean;
  disabledHint?: string;
  label?: string;
  onVerify: (latitude: number, longitude: number) => Promise<void>;
}

export function GeoGate({ disabled, disabledHint, label = "Geolocalizar", onVerify }: GeoGateProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (disabled || loading) return;
    setError(null);
    if (!navigator.geolocation) {
      setError("Este dispositivo no soporta geolocalización");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await onVerify(position.coords.latitude, position.coords.longitude);
        } catch (err) {
          setError(err instanceof Error ? err.message : "No se pudo verificar la ubicación");
        } finally {
          setLoading(false);
        }
      },
      () => {
        setError("No se pudo obtener tu ubicación. Activa el GPS y vuelve a intentarlo.");
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <Button type="button" onClick={handleClick} disabled={disabled || loading}>
        {loading ? "Comprobando ubicación…" : label}
      </Button>
      {disabled && disabledHint ? <p className="text-center text-xs text-slate-400">{disabledHint}</p> : null}
      {error ? <Alert type="error">{error}</Alert> : null}
    </div>
  );
}
