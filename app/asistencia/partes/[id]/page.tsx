"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert, Card, PageShell, Spinner, Subtitle, Title } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { employeeAuth } from "@/lib/storage";
import type { Parte } from "@/lib/types";

interface ParteResponse {
  status: "ok";
  parte: Parte;
}

export default function VerPartePage() {
  const params = useParams<{ id: string }>();
  const token = employeeAuth.getToken();
  const [parte, setParte] = useState<Parte | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<ParteResponse>(`/api/asistencia/partes/${params.id}`, token)
      .then((res) => setParte(res.parte))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Error de conexión"))
      .finally(() => setLoading(false));
  }, [params.id, token]);

  if (loading) return <Spinner />;

  return (
    <PageShell>
      <Card className="max-w-xl flex flex-col gap-4">
        <Link href="/asistencia/asistencias" className="text-sm text-blue-600 hover:underline">
          ← Volver
        </Link>
        {error || !parte ? (
          <Alert type="error">{error || "Parte no encontrado"}</Alert>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <Title>{parte.name}</Title>
              <Subtitle>
                {new Date(parte.datetime).toLocaleString("es-ES")} · {parte.employee_name}
              </Subtitle>
            </div>
            <p className="text-sm text-slate-600">
              <span className="font-medium">Presupuesto:</span> {parte.budget_name || "—"}
            </p>
            {parte.notes ? <p className="text-sm text-slate-600">{parte.notes}</p> : null}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                    <th className="py-1 pr-2">Partida</th>
                    <th className="py-1 pr-2">Producto</th>
                    <th className="py-1 pr-2 text-right">%</th>
                    <th className="py-1 pr-2 text-right">Horas</th>
                    <th className="py-1 pr-2 text-right">Objetivo</th>
                    <th className="py-1 text-right">Hecho</th>
                  </tr>
                </thead>
                <tbody>
                  {parte.lines.map((line, idx) => (
                    <tr key={idx} className="border-b border-slate-100">
                      <td className="py-1 pr-2">{line.concept_name || "—"}</td>
                      <td className="py-1 pr-2">{line.product_name}</td>
                      <td className="py-1 pr-2 text-right">{line.percentage.toFixed(2)}</td>
                      <td className="py-1 pr-2 text-right">{line.horas_efectivas.toFixed(2)}</td>
                      <td className="py-1 pr-2 text-right">{line.objective_qty}</td>
                      <td className="py-1 text-right">{line.done_qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </PageShell>
  );
}
