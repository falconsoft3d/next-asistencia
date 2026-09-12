"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GeoGate } from "@/components/GeoGate";
import { Alert, Button, Card, PageShell, Spinner, Subtitle, Title, inputClass } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { partnerAuth } from "@/lib/storage";
import type { Contract, Partner } from "@/lib/types";

interface OptionsResponse {
  status: "ok";
  contracts: Contract[];
}

interface MeResponse {
  status: "ok";
  partner: Partner;
  open_attendance: { id: number } | null;
}

export default function PartnerEntrarPage() {
  const router = useRouter();
  const token = partnerAuth.getToken();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [partner, setPartner] = useState<Partner | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [projectId, setProjectId] = useState<number | "">("");
  const [geoVerified, setGeoVerified] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      api.get<OptionsResponse>("/api/asistencia-partner/checkin/options", token),
      api.get<MeResponse>("/api/asistencia-partner/me", token),
    ])
      .then(([options, me]) => {
        setContracts(options.contracts);
        setPartner(me.partner);
        if (me.open_attendance) router.replace("/asistencia-partner/salir");
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Error de conexión"))
      .finally(() => setLoading(false));
  }, [router, token]);

  async function verifyPosition(latitude: number, longitude: number) {
    if (!projectId) throw new Error("Selecciona primero un proyecto");
    await api.post("/api/asistencia-partner/position/check", { project_id: projectId, latitude, longitude }, token);
    setGeoVerified(true);
  }

  async function handleCheckin() {
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/api/asistencia-partner/checkin", { project_id: projectId }, token);
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error de conexión");
    } finally {
      setSubmitting(false);
    }
  }

  function logout() {
    partnerAuth.clear();
    router.replace("/asistencia-partner/login");
  }

  if (loading) return <Spinner />;

  if (done) {
    return (
      <PageShell>
        <Card className="flex flex-col items-center gap-4 text-center">
          <Title>Entrada registrada</Title>
          <Button onClick={() => router.replace("/asistencia-partner/salir")}>Ir a Salir</Button>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <Card className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <Title>{partner?.name}</Title>
          <Subtitle>Fichar entrada</Subtitle>
        </div>

        {!geoVerified ? (
          <select className={inputClass} value={projectId} onChange={(e) => setProjectId(Number(e.target.value))}>
            <option value="">Seleccionar…</option>
            {contracts.map((c) => (
              <option key={c.id} value={c.project_id}>
                [{c.project_name}] {c.project_nombre}
              </option>
            ))}
          </select>
        ) : null}

        {error ? <Alert type="error">{error}</Alert> : null}

        {!geoVerified ? (
          <GeoGate disabled={!projectId} disabledHint="Selecciona un proyecto para continuar" onVerify={verifyPosition} />
        ) : null}

        {geoVerified ? (
          <Button onClick={handleCheckin} disabled={submitting}>
            {submitting ? "Registrando…" : "Entrar"}
          </Button>
        ) : (
          <button onClick={logout} className="text-center text-sm font-medium text-red-600 hover:underline">
            Cerrar sesión
          </button>
        )}
      </Card>
    </PageShell>
  );
}
