"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, PageShell, Subtitle, Title, inputClass } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { employeeAuth } from "@/lib/storage";
import type { PickingSummary, Project } from "@/lib/types";

interface OptionsResponse {
  status: "ok";
  projects: Project[];
}

interface PickingsResponse {
  status: "ok";
  pickings: PickingSummary[];
}

type Scope = "ready" | "all";

interface Filter {
  projectId: number | "";
  scope: Scope;
}

// Se recuerdan el filtro y los pedidos desplegados para no perderlos al volver del detalle
const FILTER_KEY = "asistencia_albaranes_filter";
const EXPANDED_KEY = "asistencia_albaranes_expanded";

function readFilter(): Filter {
  const fallback: Filter = { projectId: "", scope: "ready" };
  if (typeof window === "undefined") return fallback;
  try {
    const saved = JSON.parse(window.sessionStorage.getItem(FILTER_KEY) || "null");
    if (!saved) return fallback;
    return { projectId: Number(saved.projectId) || "", scope: saved.scope === "all" ? "all" : "ready" };
  } catch {
    return fallback;
  }
}

function readExpanded(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = JSON.parse(window.sessionStorage.getItem(EXPANDED_KEY) || "[]");
    return Array.isArray(saved) ? saved.filter((key): key is string => typeof key === "string") : [];
  } catch {
    return [];
  }
}

function fmtDate(value: string | false) {
  if (!value) return "—";
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

const STATE_BADGE: Record<string, string> = {
  done: "bg-green-100 text-green-800",
  assigned: "bg-yellow-100 text-yellow-800",
};

interface PurchaseGroup {
  key: string;
  purchaseName: string;
  partnerName: string;
  pickings: PickingSummary[];
}

// Agrupa por pedido respetando el orden en que llegan; los albaranes sin pedido van al final
function groupByPurchase(pickings: PickingSummary[]): PurchaseGroup[] {
  const groups = new Map<string, PurchaseGroup>();
  for (const picking of pickings) {
    const key = picking.purchase_name || "";
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        purchaseName: picking.purchase_name,
        partnerName: picking.purchase_partner_name || picking.partner_name,
        pickings: [],
      };
      groups.set(key, group);
    }
    group.pickings.push(picking);
  }
  const withoutPurchase = groups.get("");
  groups.delete("");
  return withoutPurchase ? [...groups.values(), withoutPurchase] : [...groups.values()];
}

function PickingRow({ picking }: { picking: PickingSummary }) {
  return (
    <Link
      href={`/asistencia/gestion/albaranes/${picking.id}`}
      className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-slate-50"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-semibold text-slate-800">{picking.name}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              picking.type === "incoming" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"
            }`}
          >
            {picking.type_label}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              STATE_BADGE[picking.state] ?? "bg-slate-100 text-slate-600"
            }`}
          >
            {picking.state_label}
          </span>
        </div>
        <p className="truncate text-xs text-slate-600">{picking.partner_name || "—"}</p>
        <p className="truncate text-xs text-slate-500">{picking.project_name}</p>
      </div>
      <div className="shrink-0 text-right text-xs text-slate-500">
        <p className="text-slate-800">{fmtDate(picking.scheduled_date)}</p>
        <p>
          {picking.line_count} {picking.line_count === 1 ? "línea" : "líneas"}
        </p>
      </div>
      <span aria-hidden className="text-slate-400">
        ›
      </span>
    </Link>
  );
}

export default function AlbaranesPage() {
  const router = useRouter();
  const token = employeeAuth.getToken();

  const [projects, setProjects] = useState<Project[]>([]);
  const [filter, setFilter] = useState<Filter>(readFilter);
  const [pickings, setPickings] = useState<PickingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string[]>(readExpanded);

  useEffect(() => {
    api
      .get<OptionsResponse>("/api/asistencia/gestion/options", token)
      .then((res) => setProjects(res.projects))
      .catch(() => setProjects([]));
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    api
      .get<PickingsResponse>(
        `/api/asistencia/gestion/albaranes?project_id=${filter.projectId || 0}&scope=${filter.scope}`,
        token
      )
      .then((res) => {
        if (cancelled) return;
        setPickings(res.pickings);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setPickings([]);
        setError(err instanceof ApiError ? err.message : "Error de conexión");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filter, token]);

  const groups = useMemo(() => groupByPurchase(pickings), [pickings]);

  function toggleGroup(key: string) {
    const next = expanded.includes(key) ? expanded.filter((k) => k !== key) : [...expanded, key];
    try {
      window.sessionStorage.setItem(EXPANDED_KEY, JSON.stringify(next));
    } catch {
      // sin almacenamiento solo se pierde el estado al volver
    }
    setExpanded(next);
  }

  function changeFilter(changes: Partial<Filter>) {
    const next = { ...filter, ...changes };
    window.sessionStorage.setItem(FILTER_KEY, JSON.stringify(next));
    setLoading(true);
    setFilter(next);
  }

  return (
    <PageShell>
      <Card className="max-w-2xl flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <Title>Recibir material</Title>
          <Subtitle>Recepciones y devoluciones de tus proyectos</Subtitle>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
          <select
            className={inputClass}
            aria-label="Proyecto"
            value={filter.projectId}
            onChange={(e) => changeFilter({ projectId: Number(e.target.value) || "" })}
          >
            <option value="">Todos mis proyectos</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                [{p.name}] {p.nombre}
              </option>
            ))}
          </select>
          <select
            className={inputClass}
            aria-label="Estado"
            value={filter.scope}
            onChange={(e) => changeFilter({ scope: e.target.value as Scope })}
          >
            <option value="ready">Preparados</option>
            <option value="all">Todos</option>
          </select>
        </div>

        {error ? <Alert type="error">{error}</Alert> : null}

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-slate-100 rounded-lg border border-slate-200">
            {groups.map((group) => {
              const key = group.key || "sin-pedido";
              const isOpen = expanded.includes(key);
              return (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => toggleGroup(key)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center gap-2 bg-slate-50 px-3 py-2 text-left text-xs hover:bg-slate-100"
                  >
                    <span
                      aria-hidden
                      className={`text-slate-400 transition-transform ${isOpen ? "rotate-90" : ""}`}
                    >
                      ›
                    </span>
                    <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2">
                      <span className="font-semibold text-slate-800">
                        {group.purchaseName ? `Pedido ${group.purchaseName}` : "Sin pedido"}
                      </span>
                      {group.purchaseName && group.partnerName ? (
                        <span className="text-slate-600">{group.partnerName}</span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-slate-400">{group.pickings.length}</span>
                  </button>
                  {isOpen ? (
                    <ul className="divide-y divide-slate-100">
                      {group.pickings.map((picking) => (
                        <li key={picking.id}>
                          <PickingRow picking={picking} />
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
            {pickings.length === 0 && !error ? (
              <li className="px-3 py-4 text-center text-sm text-slate-400">Sin albaranes</li>
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
