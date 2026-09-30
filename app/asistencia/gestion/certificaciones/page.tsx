"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert, Button, Card, PageShell, Subtitle, Title, inputClass } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { employeeAuth } from "@/lib/storage";
import type { Budget, Certification } from "@/lib/types";

interface CertificationsResponse {
  status: "ok";
  budgets: Budget[];
  certifications: Certification[];
}

// Se recuerda el presupuesto elegido para no perderlo al volver del detalle
const FILTER_KEY = "asistencia_certificaciones_budget";

function readBudgetFilter(): number | "" {
  if (typeof window === "undefined") return "";
  return Number(window.sessionStorage.getItem(FILTER_KEY)) || "";
}

function fmtDate(value: string | false) {
  if (!value) return "—";
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

export default function CertificacionesPage() {
  const router = useRouter();
  const token = employeeAuth.getToken();

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [budgetId, setBudgetId] = useState<number | "">(readBudgetFilter);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get<CertificationsResponse>(`/api/asistencia/gestion/certificaciones?budget_id=${budgetId || 0}`, token)
      .then((res) => {
        if (cancelled) return;
        setBudgets(res.budgets);
        setCertifications(res.certifications);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setCertifications([]);
        setError(err instanceof ApiError ? err.message : "Error de conexión");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [budgetId, token]);

  function changeBudget(value: number | "") {
    window.sessionStorage.setItem(FILTER_KEY, String(value));
    setLoading(true);
    setBudgetId(value);
  }

  return (
    <PageShell>
      <Card className="max-w-2xl flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <Title>Certificaciones</Title>
          <Subtitle>Presupuestos en los que eres encargado</Subtitle>
        </div>

        <select
          className={inputClass}
          aria-label="Presupuesto"
          value={budgetId}
          onChange={(e) => changeBudget(Number(e.target.value) || "")}
        >
          <option value="">Todos mis presupuestos</option>
          {budgets.map((b) => (
            <option key={b.id} value={b.id}>
              [{b.code}] {b.name}
            </option>
          ))}
        </select>

        {error ? <Alert type="error">{error}</Alert> : null}

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-slate-100 rounded-lg border border-slate-200">
            {certifications.map((certification) => (
              <li key={certification.id}>
                <Link
                  href={`/asistencia/gestion/certificaciones/${certification.id}`}
                  className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-slate-50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-semibold text-slate-800">{certification.name}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          certification.editable ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {certification.state_label}
                      </span>
                    </div>
                    <p className="truncate text-xs text-slate-600">{certification.budget_name}</p>
                    <p className="truncate text-xs text-slate-500">
                      {certification.stage_name
                        ? `Etapa ${certification.stage_name} · ${fmtDate(certification.stage_date_start)} – ${fmtDate(
                            certification.stage_date_stop
                          )}`
                        : "Sin etapa"}
                    </p>
                  </div>
                  <span aria-hidden className="text-slate-400">
                    ›
                  </span>
                </Link>
              </li>
            ))}
            {certifications.length === 0 && !error ? (
              <li className="px-3 py-4 text-center text-sm text-slate-400">Sin certificaciones</li>
            ) : null}
          </ul>
        )}

        <Button variant="secondary" onClick={() => router.push("/asistencia/gestion")}>
          Volver
        </Button>
      </Card>
    </PageShell>
  );
}
