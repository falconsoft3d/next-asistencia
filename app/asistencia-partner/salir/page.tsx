"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GeoGate } from "@/components/GeoGate";
import { Alert, Button, Card, PageShell, Spinner, Subtitle, Title, inputClass } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { partnerAuth, parteDraftPartner } from "@/lib/storage";
import type { Budget, Contract, Product } from "@/lib/types";

interface OptionsResponse {
  status: "ok";
  open_attendance: { id: number; project: { id: number } } | null;
  contracts: Contract[];
}

interface CheckoutResponse {
  status: "ok";
  attendance_id: number;
  worked_hours: number;
  budgets: Budget[];
  products: Product[];
}

export default function PartnerSalirPage() {
  const router = useRouter();
  const token = partnerAuth.getToken();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [projectId, setProjectId] = useState<number | "">("");
  const [geoVerified, setGeoVerified] = useState(false);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    api
      .get<OptionsResponse>("/api/asistencia-partner/checkout/options", token)
      .then((options) => {
        if (!options.open_attendance) {
          router.replace("/asistencia-partner/entrar");
          return;
        }
        setContracts(options.contracts);
        setProjectId(options.open_attendance.project.id);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Error de conexión"))
      .finally(() => setLoading(false));
  }, [router, token]);

  async function verifyPosition(latitude: number, longitude: number) {
    if (!projectId) throw new Error("Selecciona un proyecto");
    await api.post("/api/asistencia-partner/position/check", { project_id: projectId, latitude, longitude }, token);
    setGeoVerified(true);
  }

  async function handleCheckout() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.post<CheckoutResponse>("/api/asistencia-partner/checkout", { note }, token);
      parteDraftPartner.set({
        attendanceId: res.attendance_id,
        workedHours: res.worked_hours,
        budgets: res.budgets,
        products: res.products,
      });
      router.push(`/asistencia-partner/parte-diario?attendance_id=${res.attendance_id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error de conexión");
      setSubmitting(false);
    }
  }

  function logout() {
    partnerAuth.clear();
    router.replace("/asistencia-partner/login");
  }

  if (loading) return <Spinner />;

  return (
    <PageShell>
      <Card className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <Title>Fichar salida</Title>
          <Subtitle>Confirma tu ubicación para registrar la salida</Subtitle>
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

        <GeoGate disabled={!projectId} disabledHint="Selecciona un proyecto para continuar" onVerify={verifyPosition} />

        {geoVerified ? (
          <div className="flex flex-col gap-3">
            <textarea
              className={inputClass}
              placeholder="Campo de texto para notas"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
            <Button variant="danger" onClick={handleCheckout} disabled={submitting}>
              {submitting ? "Registrando…" : "Salir"}
            </Button>
          </div>
        ) : (
          <button onClick={logout} className="text-center text-sm font-medium text-red-600 hover:underline">
            Cerrar sesión
          </button>
        )}
      </Card>
    </PageShell>
  );
}
