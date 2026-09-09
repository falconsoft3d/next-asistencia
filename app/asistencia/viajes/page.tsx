"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, PageShell, Spinner, Subtitle, Title, inputClass } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { employeeAuth } from "@/lib/storage";
import type { Project, Vehicle } from "@/lib/types";

interface OptionsResponse {
  status: "ok";
  today: string;
  projects: Project[];
  vehicles: Vehicle[];
}

function daysBetween(start: string, end: string) {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.round(ms / 86400000) + 1;
}

export default function ViajesPage() {
  const token = employeeAuth.getToken();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [projects, setProjects] = useState<Project[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [fromProject, setFromProject] = useState<number | "">("");
  const [toProject, setToProject] = useState<number | "">("");
  const [vehicleId, setVehicleId] = useState<number | "">("");
  const [parkedInWorkshop, setParkedInWorkshop] = useState(false);
  const [km, setKm] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    api
      .get<OptionsResponse>("/api/asistencia/shipment/options", token)
      .then((res) => {
        setProjects(res.projects);
        setVehicles(res.vehicles);
        setDateStart(res.today);
        setDateEnd(res.today);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Error de conexión"))
      .finally(() => setLoading(false));
  }, [token]);

  const vehicle = vehicles.find((v) => v.id === vehicleId);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-filling from the newly selected vehicle's data
    if (vehicle) setParkedInWorkshop(vehicle.parked_in_workshop);
  }, [vehicle]);

  const { kmPrevisto, desvio } = useMemo(() => {
    const fromKms = projects.find((p) => p.id === fromProject)?.kms || 0;
    const toKms = projects.find((p) => p.id === toProject)?.kms || 0;
    if (!dateStart || !dateEnd) return { kmPrevisto: 0, desvio: 0 };
    const days = daysBetween(dateStart, dateEnd);
    const total = (fromKms + toKms) * days;
    const qty = Number(km || 0) - (vehicle?.odometer || 0);
    const dev = total > 0 ? ((qty - total) / total) * 100 : 0;
    return { kmPrevisto: total, desvio: dev };
  }, [projects, fromProject, toProject, dateStart, dateEnd, km, vehicle]);

  async function handleSubmit() {
    setError(null);
    if (!fromProject || !toProject || !vehicleId || !km) {
      setError("Completa origen, destino, vehículo y km");
      return;
    }
    if (new Date(dateEnd) < new Date(dateStart)) {
      setError("La fecha fin no puede ser anterior a la fecha inicio");
      return;
    }
    setSubmitting(true);
    try {
      await api.post(
        "/api/asistencia/shipment",
        {
          vehicle_id: vehicleId,
          from_project_id: fromProject,
          to_project_id: toProject,
          km: Number(km),
          note,
          parked_in_workshop: parkedInWorkshop,
          date_start: dateStart,
          date_end: dateEnd,
        },
        token
      );
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error de conexión");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <Spinner />;

  if (success) {
    return (
      <PageShell>
        <Card className="flex flex-col items-center gap-4 text-center">
          <Title>Viaje registrado</Title>
          <Button onClick={() => setSuccess(false)}>Registrar otro viaje</Button>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <Card className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <Title>Viajes</Title>
          <Subtitle>Registrar desplazamiento de vehículo</Subtitle>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Fecha Inicio</span>
            <input type="date" className={inputClass} value={dateStart} onChange={(e) => setDateStart(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Fecha Fin</span>
            <input type="date" className={inputClass} value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} />
          </label>
        </div>

        <select className={inputClass} value={fromProject} onChange={(e) => setFromProject(Number(e.target.value))}>
          <option value="">ORIG…</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              [{p.name}] - {p.nombre}
            </option>
          ))}
        </select>
        <select className={inputClass} value={toProject} onChange={(e) => setToProject(Number(e.target.value))}>
          <option value="">DEST…</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              [{p.name}] - {p.nombre}
            </option>
          ))}
        </select>
        <select className={inputClass} value={vehicleId} onChange={(e) => setVehicleId(Number(e.target.value))}>
          <option value="">Vehículo…</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name} - {v.odometer}
            </option>
          ))}
        </select>

        {vehicleId ? (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={parkedInWorkshop} onChange={(e) => setParkedInWorkshop(e.target.checked)} />
            Estacionado en taller
          </label>
        ) : null}

        <input
          type="number"
          className={inputClass}
          placeholder="Km Actual"
          value={km}
          onChange={(e) => setKm(e.target.value)}
        />
        <textarea
          className={inputClass}
          placeholder="Campo de texto para notas"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
        />

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex flex-col gap-1">
            <span className="font-medium text-slate-700">Km Previsto</span>
            <div className={`${inputClass} bg-slate-100`}>{kmPrevisto.toFixed(2)}</div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-medium text-slate-700">Desvío (%)</span>
            <div className={`${inputClass} bg-slate-100 ${desvio > 0 ? "text-red-600" : "text-green-600"}`}>
              {desvio.toFixed(2)}
            </div>
          </div>
        </div>
        {desvio > 0 ? (
          <Alert type="error">El kilometraje registrado se desvía un {desvio.toFixed(2)}% de lo previsto.</Alert>
        ) : null}

        {error ? <Alert type="error">{error}</Alert> : null}

        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Registrando…" : "Registrar Viaje"}
        </Button>
      </Card>
    </PageShell>
  );
}
