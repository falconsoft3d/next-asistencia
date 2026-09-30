"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert, Button, Card, PageShell, Subtitle, Title, inputClass } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { employeeAuth } from "@/lib/storage";
import type { Project, PurchaseOrder } from "@/lib/types";

interface OptionsResponse {
  status: "ok";
  projects: Project[];
}

interface OrdersResponse {
  status: "ok";
  orders: PurchaseOrder[];
}

function fmtDate(value: string | false) {
  if (!value) return "—";
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

function fmtQty(value: number) {
  return value.toLocaleString("es-ES", { maximumFractionDigits: 3 });
}

export default function PedidosPage() {
  const router = useRouter();
  const token = employeeAuth.getToken();

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<number | "">("");
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<OptionsResponse>("/api/asistencia/gestion/options", token)
      .then((res) => setProjects(res.projects))
      .catch(() => setProjects([]));
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    api
      .get<OrdersResponse>(`/api/asistencia/gestion/pedidos?project_id=${projectId || 0}`, token)
      .then((res) => {
        if (cancelled) return;
        setOrders(res.orders);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setOrders([]);
        setError(err instanceof ApiError ? err.message : "Error de conexión");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, token]);

  return (
    <PageShell>
      <Card className="max-w-2xl flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <Title>Pedidos</Title>
          <Subtitle>Pedidos de compra de tus proyectos</Subtitle>
        </div>

        <select
          className={inputClass}
          aria-label="Proyecto"
          value={projectId}
          onChange={(e) => {
            setLoading(true);
            setProjectId(Number(e.target.value) || "");
          }}
        >
          <option value="">Todos mis proyectos</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              [{p.name}] {p.nombre}
            </option>
          ))}
        </select>

        {error ? <Alert type="error">{error}</Alert> : null}

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {orders.map((order) => (
              <div key={order.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-800">{order.name}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    {order.state_label}
                  </span>
                </div>
                <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                  <dt className="text-slate-500">Proveedor</dt>
                  <dd className="text-slate-800">{order.partner_name || "—"}</dd>
                  <dt className="text-slate-500">Proyecto</dt>
                  <dd className="text-slate-800">{order.project_name || "—"}</dd>
                  <dt className="text-slate-500">Fecha esperada</dt>
                  <dd className="text-slate-800">{fmtDate(order.date_planned)}</dd>
                </dl>
                <table className="mt-3 w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-left uppercase text-slate-500">
                      <th className="py-1 pr-2">Descripción</th>
                      <th className="py-1 pr-2 text-right">Cant.</th>
                      <th className="py-1 text-right">Despachado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.lines.map((line) => {
                      const dispatched = line.quantity > 0 && line.qty_received >= line.quantity;
                      return (
                        <tr
                          key={line.id}
                          className={`border-b border-slate-100 align-top ${dispatched ? "bg-green-100" : ""}`}
                        >
                          <td className="whitespace-pre-line py-1 pr-2 pl-1">{line.name}</td>
                          <td className="whitespace-nowrap py-1 pr-2 text-right">
                            {fmtQty(line.quantity)} {line.uom}
                          </td>
                          <td className="whitespace-nowrap py-1 pr-1 text-right">{fmtQty(line.qty_received)}</td>
                        </tr>
                      );
                    })}
                    {order.lines.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-2 text-center text-slate-400">
                          Sin líneas
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            ))}
            {orders.length === 0 && !error ? (
              <p className="text-center text-sm text-slate-400">Sin pedidos</p>
            ) : null}
          </div>
        )}

        <Button variant="secondary" onClick={() => router.push("/asistencia/gestion")}>
          Volver
        </Button>
      </Card>
    </PageShell>
  );
}
