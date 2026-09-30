"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert, Button, Card, PageShell, Spinner, Subtitle, Title } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { employeeAuth } from "@/lib/storage";
import type { Solmat } from "@/lib/types";

interface SolmatsResponse {
  status: "ok";
  solmats: Solmat[];
}

const STATE_CLASSES: Record<Solmat["state"], string> = {
  draft: "bg-slate-100 text-slate-600",
  requested: "bg-amber-100 text-amber-800",
  done: "bg-green-100 text-green-800",
};

function fmtDate(value: string | false) {
  if (!value) return "—";
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

function fmtQty(value: number) {
  return value.toLocaleString("es-ES", { maximumFractionDigits: 3 });
}

export default function SolicitudesPage() {
  const router = useRouter();
  const token = employeeAuth.getToken();
  const [solmats, setSolmats] = useState<Solmat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<SolmatsResponse>("/api/asistencia/solmat", token)
      .then((res) => setSolmats(res.solmats))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Error de conexión"))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <Spinner />;

  return (
    <PageShell>
      <Card className="max-w-2xl flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <Title>Mis solicitudes</Title>
          <Subtitle>Material que has solicitado</Subtitle>
        </div>

        {error ? <Alert type="error">{error}</Alert> : null}

        <div className="flex flex-col gap-3">
          {solmats.map((solmat) => (
            <div key={solmat.id} className="rounded-lg border border-slate-200 p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-slate-800">{solmat.name}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATE_CLASSES[solmat.state] ?? STATE_CLASSES.draft}`}
                >
                  {solmat.state_label}
                </span>
              </div>
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                <dt className="text-slate-500">Fecha</dt>
                <dd className="text-slate-800">{fmtDate(solmat.date)}</dd>
                <dt className="text-slate-500">Proyecto</dt>
                <dd className="text-slate-800">{solmat.project_name || "—"}</dd>
                {solmat.purchase_order_name ? (
                  <>
                    <dt className="text-slate-500">Pedido</dt>
                    <dd className="text-slate-800">{solmat.purchase_order_name}</dd>
                  </>
                ) : null}
              </dl>
              <table className="mt-3 w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-left uppercase text-slate-500">
                    <th className="py-1 pr-2">Nota</th>
                    <th className="py-1 text-right">Cant.</th>
                  </tr>
                </thead>
                <tbody>
                  {solmat.lines.map((line) => (
                    <tr key={line.id} className="border-b border-slate-100 align-top">
                      <td className="py-1 pr-2">
                        {line.note || "—"}
                        {line.product_name ? (
                          <span className="block text-slate-500">{line.product_name}</span>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap py-1 text-right">{fmtQty(line.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          {solmats.length === 0 && !error ? (
            <p className="text-center text-sm text-slate-400">Sin solicitudes</p>
          ) : null}
        </div>

        <Button variant="secondary" onClick={() => router.push("/asistencia/gestion/solmat")}>
          Volver
        </Button>
      </Card>
    </PageShell>
  );
}
