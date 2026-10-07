"use client";

import { useMemo, useRef, useState } from "react";
import { Alert, Button, inputClass } from "./ui";
import type { Budget, Product } from "@/lib/types";

interface Line {
  key: string;
  productId: number | "";
  // Se guardan como texto para poder vaciar el campo mientras se escribe
  percentage: string;
  doneQty: string;
  objetivo: number | null;
  note: string;
}

function newLine(): Line {
  return {
    key: Math.random().toString(36).slice(2),
    productId: "",
    percentage: "",
    doneQty: "",
    objetivo: null,
    note: "",
  };
}

interface ParteDiarioFormProps {
  workedHours: number;
  budgets: Budget[];
  products: Product[];
  fetchObjetivo: (budgetId: number, productId: number) => Promise<number>;
  onSubmit: (payload: {
    budget_id: number | null;
    lines: { product_id: number; percentage: number; done_qty: number; note: string }[];
  }) => Promise<void>;
}

export function ParteDiarioForm({ workedHours, budgets, products, fetchObjetivo, onSubmit }: ParteDiarioFormProps) {
  const [budgetId, setBudgetId] = useState<number | "">(budgets.length === 1 ? budgets[0].id : "");
  const [lines, setLines] = useState<Line[]>([newLine()]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const objectiveCache = useRef<Map<string, number>>(new Map());

  const budgetCompanyId = budgets.find((b) => b.id === budgetId)?.company_id ?? false;

  const availableProducts = useMemo(
    () =>
      products.filter(
        (p) => p.company_ids.length === 0 || (budgetCompanyId && p.company_ids.includes(budgetCompanyId))
      ),
    [products, budgetCompanyId]
  );

  const totalPct = lines.reduce((sum, l) => sum + (Number(l.percentage) || 0), 0);
  const pctOk = Math.abs(totalPct - 100) < 0.01;
  const hasLineData = lines.some((l) => l.productId !== "");
  // Cada línea que se registra (con producto) necesita su nota
  const hasNotas = lines.every((l) => l.productId === "" || l.note.trim().length > 0);
  const canSubmit = !!budgetId && hasLineData && pctOk && hasNotas && !submitting;

  const validationMessages = [
    !hasNotas && "Te falta poner una nota en la línea: describe el material y la zona de la obra donde lo has trabajado",
    !pctOk && "El total debe ser el 100%",
    !hasLineData && "Debes al menos llenar una línea",
  ].filter((msg): msg is string => !!msg);

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
        lines: lines
          .filter((l) => l.productId !== "")
          .map((l) => ({
            product_id: Number(l.productId),
            percentage: Number(l.percentage) || 0,
            done_qty: Number(l.doneQty) || 0,
            note: l.note.trim(),
          })),
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
                  placeholder="0"
                  onChange={(e) => updateLine(line.key, { percentage: e.target.value })}
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
                  placeholder="0"
                  onChange={(e) => updateLine(line.key, { doneQty: e.target.value })}
                />
              </label>
            </div>
            <input
              type="text"
              className={`${inputClass} ${line.productId !== "" && !line.note.trim() ? "border-red-300" : ""}`}
              placeholder="Nota (obligatoria)"
              value={line.note}
              onChange={(e) => updateLine(line.key, { note: e.target.value })}
            />
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

      <p className={`text-sm font-medium ${pctOk ? "text-green-600" : "text-red-600"}`}>
        Total %: {totalPct.toFixed(2)}
      </p>

      {error ? <Alert type="error">{error}</Alert> : null}

      <Button onClick={handleSubmit} disabled={!canSubmit}>
        {submitting ? "Registrando…" : "Registrar"}
      </Button>

      {validationMessages.length > 0 ? (
        <ul className="flex flex-col gap-1 text-xs text-red-600">
          {validationMessages.map((msg) => (
            <li key={msg}>{msg}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
