"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Alert, Button, Card, PageShell, Spinner, Subtitle, Title, inputClass } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { employeeAuth } from "@/lib/storage";
import type { LeaveRow } from "@/lib/types";

interface VacacionesResponse {
  status: "ok";
  available_days: number;
  max_days: number;
  used_days: number;
  leave_type_name: string;
  leaves: LeaveRow[];
}

const STATE_BADGE: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  confirm: "bg-amber-100 text-amber-700",
  validate1: "bg-amber-100 text-amber-700",
  validate: "bg-green-100 text-green-700",
  refuse: "bg-red-100 text-red-700",
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function VacacionesPage() {
  const token = employeeAuth.getToken();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<VacacionesResponse | null>(null);

  const [dateFrom, setDateFrom] = useState(today());
  const [dateTo, setDateTo] = useState(today());
  const [description, setDescription] = useState("");
  const [days, setDays] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function load() {
    api
      .get<VacacionesResponse>("/api/asistencia/vacaciones", token)
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Error de conexión"))
      .finally(() => setLoading(false));
  }

  useEffect(load, [token]);

  useEffect(() => {
    if (!dateFrom || !dateTo) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      api
        .post<{ status: "ok"; days: number }>("/api/asistencia/vacaciones/calcular-dias", { date_from: dateFrom, date_to: dateTo }, token)
        .then((res) => setDays(res.days))
        .catch(() => setDays(null));
    }, 400);
  }, [dateFrom, dateTo, token]);

  async function handleSolicitar() {
    if (new Date(dateTo) < new Date(dateFrom)) {
      setError("La fecha fin no puede ser anterior a la fecha inicio");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/api/asistencia/vacaciones", { date_from: dateFrom, date_to: dateTo, description }, token);
      setDescription("");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error de conexión");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancelar(id: number) {
    if (!confirm("¿Cancelar esta solicitud?")) return;
    try {
      await api.post(`/api/asistencia/vacaciones/${id}/cancelar`, {}, token);
      setData((prev) => (prev ? { ...prev, leaves: prev.leaves.filter((l) => l.id !== id) } : prev));
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Error de conexión");
    }
  }

  if (loading || !data) return <Spinner />;

  return (
    <PageShell>
      <Card className="flex flex-col gap-4">
        <Title>{data.leave_type_name}</Title>

        <div className="rounded-xl bg-green-50 p-4 text-center">
          <p className="text-xs font-medium uppercase text-green-700">{data.leave_type_name}</p>
          <p className="text-3xl font-bold text-green-700">{data.available_days.toFixed(2)}</p>
          <p className="text-xs font-medium uppercase text-green-700">Días disponibles</p>
          <p className="mt-1 text-sm text-green-800">
            Asignados: <b>{data.max_days.toFixed(2)}</b> · Usados: <b>{data.used_days.toFixed(2)}</b>
          </p>
        </div>

        <Link
          href="/asistencia/vacaciones/calendario"
          className="w-full rounded-lg bg-slate-800 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-slate-900"
        >
          Ver Calendario Anual
        </Link>

        <div className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3">
          <Subtitle>Nueva solicitud</Subtitle>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Desde</span>
            <input type="date" min={today()} className={inputClass} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Hasta</span>
            <input type="date" min={dateFrom} className={inputClass} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </label>
          {days !== null ? (
            <Alert type="info">
              Duración: <b>{days}</b> día(s) laborable(s)
            </Alert>
          ) : null}
          <input
            className={inputClass}
            placeholder="Descripción (opcional)"
            maxLength={200}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          {error ? <Alert type="error">{error}</Alert> : null}
          <Button onClick={handleSolicitar} disabled={submitting}>
            {submitting ? "Enviando…" : "Solicitar Vacaciones"}
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          <Subtitle>Mis solicitudes</Subtitle>
          {data.leaves.map((leave) => (
            <div key={leave.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-sm">
              <div>
                <p className="font-medium text-slate-800">
                  {leave.date_from}
                  {leave.date_to !== leave.date_from ? ` → ${leave.date_to}` : ""}
                </p>
                <p className="text-xs text-slate-500">
                  {leave.days} día(s){leave.description ? ` · ${leave.description}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-1 text-xs font-semibold ${STATE_BADGE[leave.state] || ""}`}>
                  {leave.state_label}
                </span>
                {leave.state === "draft" || leave.state === "confirm" ? (
                  <button onClick={() => handleCancelar(leave.id)} className="text-xs font-medium text-red-600 hover:underline">
                    Cancelar
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </PageShell>
  );
}
