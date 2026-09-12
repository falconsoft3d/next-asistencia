"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, PageShell, Spinner, Subtitle, Title, inputClass } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { employeeAuth } from "@/lib/storage";
import type { Budget, ConceptNode, ImputarPartidaLine } from "@/lib/types";

interface OptionsResponse {
  status: "ok";
  budgets: Budget[];
  lines: ImputarPartidaLine[];
}

function ConceptTree({
  nodes,
  onSelect,
}: {
  nodes: ConceptNode[];
  onSelect: (id: number, label: string) => void;
}) {
  const [openChapters, setOpenChapters] = useState<Set<string>>(new Set());

  function toggle(key: string) {
    setOpenChapters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <ul className="flex flex-col gap-1 text-sm">
      {nodes.map((node, idx) => {
        const key = `${node.code}-${idx}`;
        if (node.type === "departure") {
          return (
            <li key={key}>
              <button
                type="button"
                className="w-full rounded px-2 py-1 text-left hover:bg-blue-50"
                onClick={() => onSelect(node.id as number, `[${node.code}] ${node.name}`)}
              >
                [{node.code}] {node.name}
              </button>
            </li>
          );
        }
        const open = openChapters.has(key);
        return (
          <li key={key}>
            <button
              type="button"
              className="flex w-full items-center gap-1 rounded px-2 py-1 text-left font-medium hover:bg-slate-100"
              onClick={() => toggle(key)}
            >
              <span>{open ? "▾" : "▸"}</span>
              [{node.code}] {node.name}
            </button>
            {open ? (
              <div className="ml-4 border-l border-slate-200 pl-2">
                <ConceptTree nodes={node.children} onSelect={onSelect} />
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export default function ImputarPartidaPage() {
  const token = employeeAuth.getToken();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [lines, setLines] = useState<ImputarPartidaLine[]>([]);

  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterBudget, setFilterBudget] = useState<number | "">("");
  const [filterProduct, setFilterProduct] = useState<number | "">("");
  const [filterEmployee, setFilterEmployee] = useState("");
  const [hideWithConcept, setHideWithConcept] = useState(false);

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [tree, setTree] = useState<ConceptNode[]>([]);
  const [treeOpen, setTreeOpen] = useState(false);
  const [conceptSelected, setConceptSelected] = useState<{ id: number; label: string } | null>(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    api
      .get<OptionsResponse>("/api/asistencia/imputar-partida/options", token)
      .then((res) => {
        setBudgets(res.budgets);
        setLines(res.lines);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Error de conexión"))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting derived selection when the budget filter changes
    setConceptSelected(null);
    setTree([]);
    if (!filterBudget) return;
    api
      .get<{ status: "ok"; tree: ConceptNode[] }>(`/api/asistencia/imputar-partida/conceptos/${filterBudget}`, token)
      .then((res) => setTree(res.tree))
      .catch(() => setTree([]));
  }, [filterBudget, token]);

  function matchesDateRange(line: ImputarPartidaLine) {
    if (!filterDateFrom && !filterDateTo) return true;
    const date = line.datetime ? line.datetime.slice(0, 10) : "";
    if (!date) return false;
    if (filterDateFrom && date < filterDateFrom) return false;
    if (filterDateTo && date > filterDateTo) return false;
    return true;
  }

  const filteredLines = useMemo(() => {
    return lines.filter((line) => {
      if (filterBudget && line.budget_id !== filterBudget) return false;
      if (filterProduct && line.product_id !== filterProduct) return false;
      if (filterEmployee && line.employee_name !== filterEmployee) return false;
      if (hideWithConcept && line.concept_name) return false;
      if (!matchesDateRange(line)) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, filterBudget, filterProduct, filterEmployee, hideWithConcept, filterDateFrom, filterDateTo]);

  const productOptions = useMemo(() => {
    const seen = new Map<number, string>();
    lines.forEach((line) => {
      if (filterBudget && line.budget_id !== filterBudget) return;
      if (filterEmployee && line.employee_name !== filterEmployee) return;
      if (hideWithConcept && line.concept_name) return;
      if (!matchesDateRange(line)) return;
      if (line.product_id && !seen.has(line.product_id)) seen.set(line.product_id, line.product_name);
    });
    return Array.from(seen, ([id, name]) => ({ id, name }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, filterBudget, filterEmployee, hideWithConcept, filterDateFrom, filterDateTo]);

  const employeeOptions = useMemo(() => {
    const seen = new Set<string>();
    lines.forEach((line) => {
      if (filterBudget && line.budget_id !== filterBudget) return;
      if (filterProduct && line.product_id !== filterProduct) return;
      if (hideWithConcept && line.concept_name) return;
      if (!matchesDateRange(line)) return;
      if (line.employee_name) seen.add(line.employee_name);
    });
    return Array.from(seen).sort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, filterBudget, filterProduct, hideWithConcept, filterDateFrom, filterDateTo]);

  useEffect(() => {
    if (filterProduct && !productOptions.some((p) => p.id === filterProduct)) setFilterProduct("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productOptions]);

  useEffect(() => {
    if (filterEmployee && !employeeOptions.includes(filterEmployee)) setFilterEmployee("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeOptions]);

  const visibleIds = new Set(filteredLines.map((l) => l.id));
  const allVisibleSelected = filteredLines.length > 0 && filteredLines.every((l) => selected.has(l.id));

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        filteredLines.forEach((l) => next.delete(l.id));
      } else {
        filteredLines.forEach((l) => next.add(l.id));
      }
      return next;
    });
  }

  function toggleOne(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function applyConcept() {
    if (!conceptSelected || selected.size === 0) return;
    setApplying(true);
    setError(null);
    try {
      const lineIds = Array.from(selected).filter((id) => visibleIds.has(id));
      const res = await api.post<{ status: "ok"; updated: number; concept_name: string }>(
        "/api/asistencia/imputar-partida",
        { concept_id: conceptSelected.id, line_ids: lineIds },
        token
      );
      setLines((prev) =>
        prev.map((l) => (lineIds.includes(l.id) ? { ...l, concept_name: res.concept_name } : l))
      );
      setSelected(new Set());
      setMessage(`Partida aplicada a ${res.updated} líneas`);
      setTimeout(() => setMessage(null), 4000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error de conexión");
    } finally {
      setApplying(false);
    }
  }

  if (loading) return <Spinner />;

  return (
    <PageShell>
      <Card className="max-w-3xl flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <Title>Imputar Partida</Title>
          <Subtitle>Asigna partidas del presupuesto a líneas de parte</Subtitle>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Desde</span>
            <input
              type="date"
              className={inputClass}
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Hasta</span>
            <input
              type="date"
              className={inputClass}
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <select className={inputClass} value={filterBudget} onChange={(e) => setFilterBudget(Number(e.target.value) || "")}>
            <option value="">Presupuesto…</option>
            {budgets.map((b) => (
              <option key={b.id} value={b.id}>
                [{b.code}] {b.name}
              </option>
            ))}
          </select>
          <select className={inputClass} value={filterProduct} onChange={(e) => setFilterProduct(Number(e.target.value) || "")}>
            <option value="">Producto…</option>
            {productOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select className={inputClass} value={filterEmployee} onChange={(e) => setFilterEmployee(e.target.value)}>
            <option value="">Empleado…</option>
            {employeeOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={hideWithConcept} onChange={(e) => setHideWithConcept(e.target.checked)} />
          Ocultar con partida actual
        </label>

        <div className="relative flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            className="w-auto"
            disabled={!filterBudget}
            onClick={() => setTreeOpen((v) => !v)}
          >
            {conceptSelected ? conceptSelected.label : "Selecciona partida"}
          </Button>
          <span className="text-sm text-slate-500">{selected.size} seleccionadas</span>
          <Button
            type="button"
            className="w-auto"
            disabled={!conceptSelected || selected.size === 0 || applying}
            onClick={applyConcept}
          >
            {applying ? "Aplicando…" : "Aplicar"}
          </Button>
          {treeOpen ? (
            <div className="absolute top-full z-10 mt-1 max-h-80 w-80 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
              <ConceptTree
                nodes={tree}
                onSelect={(id, label) => {
                  setConceptSelected({ id, label });
                  setTreeOpen(false);
                }}
              />
            </div>
          ) : null}
        </div>

        {message ? <Alert type="success">{message}</Alert> : null}
        {error ? <Alert type="error">{error}</Alert> : null}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                <th className="py-1 pr-2">
                  <input type="checkbox" checked={allVisibleSelected} onChange={toggleAll} />
                </th>
                <th className="py-1 pr-2">Fecha</th>
                <th className="py-1 pr-2">Categoría</th>
                <th className="py-1 text-right">Horas</th>
                <th className="py-1 pr-2">Empleado</th>
                <th className="py-1 pr-2">Partida actual</th>
                <th className="py-1 pr-2">Presupuesto</th>
                <th className="py-1 text-right">%</th>
              </tr>
            </thead>
            <tbody>
              {filteredLines.map((line) => (
                <tr
                  key={line.id}
                  className={`border-b border-slate-100 ${line.concept_name ? "bg-green-100" : ""}`}
                >
                  <td className="py-1 pr-2">
                    <input type="checkbox" checked={selected.has(line.id)} onChange={() => toggleOne(line.id)} />
                  </td>
                  <td className="py-1 pr-2">{line.datetime || "—"}</td>
                  <td className="py-1 pr-2">{line.product_name}</td>
                  <td className="py-1 text-right">{line.horas.toFixed(2)}</td>
                  <td className="py-1 pr-2">{line.employee_name}</td>
                  <td className="py-1 pr-2">{line.concept_name || "—"}</td>
                  <td className="py-1 pr-2">{line.budget_name}</td>
                  <td className="py-1 text-right">{line.percentage}</td>
                </tr>
              ))}
              {filteredLines.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-4 text-center text-slate-400">
                    Sin líneas
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </PageShell>
  );
}
