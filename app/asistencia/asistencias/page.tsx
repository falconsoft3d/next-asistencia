"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Alert, Card, PageShell, Spinner, Subtitle, Title } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { employeeAuth } from "@/lib/storage";
import type { AttendanceRow } from "@/lib/types";

interface AttendancesResponse {
  status: "ok";
  attendances: AttendanceRow[];
}

function fmt(dt: string) {
  return new Date(dt).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function AsistenciasPage() {
  const token = employeeAuth.getToken();
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<AttendancesResponse>("/api/asistencia/attendances", token)
      .then((res) => setRows(res.attendances))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Error de conexión"))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <Spinner />;

  return (
    <PageShell>
      <Card className="max-w-2xl flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <Title>Ver Asistencias</Title>
          <Subtitle>Últimos 60 días</Subtitle>
        </div>
        {error ? <Alert type="error">{error}</Alert> : null}
        <div className="flex flex-col gap-2">
          {rows.map((row) => (
            <div key={row.id} className="rounded-lg border border-slate-200 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-800">{fmt(row.check_in)}</span>
                <span className="text-slate-500">→ {fmt(row.check_out)}</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span>{row.project_name}</span>
                <span>UD {row.ud.toFixed(2)} · Total HH {row.total_hh.toFixed(2)}</span>
              </div>
              {row.note ? <p className="mt-1 text-xs text-slate-500">{row.note}</p> : null}
              <div className="mt-2">
                {row.diary_part_id ? (
                  <Link href={`/asistencia/partes/${row.diary_part_id}`} className="text-blue-600 hover:underline">
                    {row.diary_part_name}
                  </Link>
                ) : (
                  <Link
                    href={`/asistencia/parte-diario?attendance_id=${row.id}`}
                    className="font-semibold text-blue-600 hover:underline"
                  >
                    + Crear parte
                  </Link>
                )}
              </div>
            </div>
          ))}
          {rows.length === 0 ? <p className="text-center text-sm text-slate-400">Sin registros</p> : null}
        </div>
      </Card>
    </PageShell>
  );
}
