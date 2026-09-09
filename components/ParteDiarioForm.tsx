"use client";

import { useMemo, useRef, useState } from "react";
import { Alert, Button, inputClass } from "./ui";
import type { Budget, Product } from "@/lib/types";

interface Line {
  key: string;
  productId: number | "";
  percentage: number;
  doneQty: number;
  objetivo: number | null;
}

function newLine(): Line {
  return { key: Math.random().toString(36).slice(2), productId: "", percentage: 0, doneQty: 0, objetivo: null };
}

interface ParteDiarioFormProps {
  workedHours: number;
  budgets: Budget[];
  products: Product[];
  fetchObjetivo: (budgetId: number, productId: number) => Promise<number>;
  onSubmit: (payload: {
    budget_id: number | null;
    notas: string;
    lines: { product_id: number; percentage: number; done_qty: number }[];
  }) => Promise<void>;
}

export function ParteDiarioForm({ workedHours, budgets, products, fetchObjetivo, onSubmit }: ParteDiarioFormProps) {
  const [budgetId, setBudgetId] = useState<number | "">(budgets.length === 1 ? budgets[0].id : "");
  const [notas, setNotas] = useState("");
  const [lines, setLines] = useState<Line[]>([newLine()]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const objectiveCache = useRef<Map<string, number>>(new Map());

  const budgetCompanyId = budgets.find((b) => b.id === budgetId)?.company_id ?? false;

  const availableProducts = useMemo(
    () => products.filter((p) => p.company_ids.length === 0 || (budgetCompanyId && p.company_ids.includes(budgetCompanyId))),
    [products, budgetCompanyId]
  );

  const totalPct = lines.reduce((sum, l) => sum + (Number(l.percentage) || 0), 0);
  const pctOk = Math.abs(totalPct - 100) < 0.01;
  const hasLineData = lines.some((l) => l.productId !== "");
  const canSubmit = !!budgetId && hasLineData && pctOk && notas.trim().length > 0 && !submitting;

  function updateLine(key: string, patch: Partial<Line>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function removeLine(key: string) {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }

  async function handleProductChange(key: string, productId: number) {
    updateLine(key, { productId, objetivo: null });
    if (!budgetId) return;
    const cacheKey = `${budgetId}:${productId}`;
    const cached = objectiveCache.current.get(cacheKey);
    if (cached !== undefined) {
      updateLine(key, { objetivo: cached });
      return;
    }
    const qty = await fetchObjetivo(budgetId, productId);
    objectiveCache.current.set(cacheKey, qty);
    updateLine(key, { objetivo: qty });
  }

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        budget_id: budgetId || null,
        notas,
        lines: lines
          .filter((l) => l.productId !== "")
          .map((l) => ({ product_id: Number(l.productId), percentage: Number(l.percentage), done_qty: Number(l.doneQty) })),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de conexión");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Alert type="info">Total horas trabajadas: {workedHours.toFixed(2)} h</Alert>

      <select
        className={inputClass}
        value={budgetId}
        onChange={(e) => setBudgetId(e.target.value ? Number(e.target.value) : "")}
      >
        <option value="">Presupuesto…</option>
        {budgets.map((b) => (
          <option key={b.id} value={b.id}>
            [{b.code}] {b.name}
          </option>
        ))}
      </select>

      <div className="flex flex-col gap-3">
        {lines.map((line) => (
          <div key={line.key} className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3">
            <div className="flex items-center gap-2">
              <select
                className={`${inputClass} flex-1`}
                value={line.productId}
                onChange={(e) => handleProductChange(line.key, Number(e.target.value))}
              >
                <option value="">Producto…</option>
                {availableProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => removeLine(line.key)}
                className="text-red-500 hover:text-red-700"
                aria-label="Eliminar línea"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <label className="flex flex-col gap-1">
                <span className="font-medium text-slate-600">%</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  className={inputClass}
                  value={line.percentage}
                  onChange={(e) => updateLine(line.key, { percentage: Number(e.target.value) })}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-medium text-slate-600">Objetivo</span>
                <input readOnly className={`${inputClass} bg-amber-50`} value={line.objetivo ?? ""} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-medium text-slate-600">Hecho (ud.)</span>
                <input
                  type="number"
                  step={0.01}
                  className={inputClass}
                  value={line.doneQty}
                  onChange={(e) => updateLine(line.key, { doneQty: Number(e.target.value) })}
                />
              </label>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setLines((prev) => [...prev, newLine()])}
        className="text-sm font-medium text-blue-600 hover:text-blue-800"
      >
        + Añadir categoría
      </button>

      <p className={`text-sm font-medium ${pctOk ? "text-green-600" : "text-red-600"}`}>Total %: {totalPct.toFixed(2)}</p>

      <textarea
        className={inputClass}
        placeholder="Notas"
        value={notas}
        onChange={(e) => setNotas(e.target.value)}
        rows={3}
      />

      {error ? <Alert type="error">{error}</Alert> : null}

      <Button onClick={handleSubmit} disabled={!canSubmit}>
        {submitting ? "Registrando…" : "Registrar"}
      </Button>
    </div>
  );
}
