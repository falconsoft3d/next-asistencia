"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Alert, Button, Card, PageShell, Spinner, Subtitle, Title, inputClass } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { employeeAuth } from "@/lib/storage";
import type { Picking } from "@/lib/types";

interface PickingResponse {
  status: "ok";
  picking: Picking;
}

interface UpdateResponse {
  status: "ok";
  picking: Picking;
  backorder_name: string;
}

function fmtDate(value: string | false) {
  if (!value) return "—";
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

function fmtQty(value: number) {
  return value.toLocaleString("es-ES", { maximumFractionDigits: 3 });
}

const PHOTO_MAX_SIDE = 1600;

// Reduce la foto en el móvil antes de enviarla: las de cámara pesan varios MB
async function toJpegBase64(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, PHOTO_MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.85).split(",")[1];
}

function todayLocal() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function quantitiesOf(picking: Picking): Record<number, string> {
  return Object.fromEntries(picking.lines.map((l) => [l.id, String(l.quantity)]));
}

export default function AlbaranPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const token = employeeAuth.getToken();

  const [picking, setPicking] = useState<Picking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [supplierRef, setSupplierRef] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [quantities, setQuantities] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<"save" | "validate" | "photo" | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const [confirming, setConfirming] = useState(false);

  function load(next: Picking) {
    setPicking(next);
    setSupplierRef(next.supplier_reference);
    setScheduledDate(next.scheduled_date ? next.scheduled_date.slice(0, 10) : "");
    setQuantities(quantitiesOf(next));
  }

  useEffect(() => {
    api
      .get<PickingResponse>(`/api/asistencia/gestion/albaranes/${params.id}`, token)
      .then((res) => load(res.picking))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Error de conexión"))
      .finally(() => setLoading(false));
  }, [params.id, token]);

  async function send(validate: boolean) {
    if (!picking) return;
    setError(null);
    setMessage(null);
    setConfirming(false);
    setBusy(validate ? "validate" : "save");
    try {
      const res = await api.post<UpdateResponse>(
        `/api/asistencia/gestion/albaranes/${picking.id}${validate ? "/validar" : ""}`,
        {
          supplier_reference: supplierRef,
          scheduled_date: scheduledDate,
          lines: picking.lines.map((l) => ({ id: l.id, quantity: Number(quantities[l.id] || 0) })),
        },
        token
      );
      load(res.picking);
      if (!validate) setMessage("Cambios guardados");
      else if (res.backorder_name)
        setMessage(`Validado como entrega parcial. Lo pendiente queda en ${res.backorder_name}.`);
      else setMessage("Albarán validado.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error de conexión");
    } finally {
      setBusy(null);
    }
  }

  async function sendPhoto(file: File) {
    if (!picking) return;
    setError(null);
    setMessage(null);
    setBusy("photo");
    try {
      let data: string;
      try {
        data = await toJpegBase64(file);
      } catch {
        throw new ApiError("No se pudo leer la imagen");
      }
      const res = await api.post<PickingResponse>(
        `/api/asistencia/gestion/albaranes/${picking.id}/foto`,
        { data },
        token
      );
      // Solo se actualiza el contador: recargar el albarán borraría cantidades sin guardar
      setPicking((prev) => (prev ? { ...prev, photo_count: res.picking.photo_count } : prev));
      setMessage("Foto adjuntada");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error de conexión");
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <Spinner />;

  const partial = !!picking && picking.lines.some((l) => Number(quantities[l.id] || 0) < l.demand);
  const missing = [
    supplierRef.trim() ? null : "la referencia del proveedor",
    picking && picking.photo_count > 0 ? null : "una foto",
  ].filter(Boolean);

  return (
    <PageShell>
      <Card className="max-w-2xl flex flex-col gap-4">
        {picking ? (
          <>
            <div className="flex flex-col items-center gap-2">
              <Title>{picking.name}</Title>
              <Subtitle>{picking.project_name}</Subtitle>
              <span className="flex gap-1">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    picking.type === "incoming" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"
                  }`}
                >
                  {picking.type_label}
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                  {picking.state_label}
                </span>
              </span>
            </div>

            <dl className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 text-sm">
              <dt className="text-slate-500">Proveedor</dt>
              <dd className="text-slate-800">{picking.partner_name || "—"}</dd>
              <dt className="text-slate-500">Pedido de compra</dt>
              <dd className="text-slate-800">{picking.purchase_name || "—"}</dd>
              <dt className="text-slate-500">Fecha prevista</dt>
              <dd className="text-slate-800">
                {picking.editable ? (
                  <div className="flex gap-2">
                    <input
                      type="date"
                      className={inputClass}
                      aria-label="Fecha prevista"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-auto! py-2!"
                      onClick={() => setScheduledDate(todayLocal())}
                    >
                      Hoy
                    </Button>
                  </div>
                ) : (
                  fmtDate(picking.scheduled_date)
                )}
              </dd>
              <dt className="text-slate-500">Fotos adjuntas</dt>
              <dd className="text-slate-800">{picking.photo_count}</dd>
              <dt className="text-slate-500">Ref. proveedor</dt>
              <dd className="text-slate-800">
                {picking.editable ? (
                  <input
                    className={inputClass}
                    aria-label="Referencia del proveedor"
                    placeholder="Referencia del proveedor"
                    value={supplierRef}
                    onChange={(e) => setSupplierRef(e.target.value)}
                  />
                ) : (
                  picking.supplier_reference || "—"
                )}
              </dd>
            </dl>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                  <th className="py-1 pr-2">Descripción</th>
                  <th className="w-28 py-1 text-right">Cant.</th>
                </tr>
              </thead>
              <tbody>
                {picking.lines.map((line) => (
                  <tr key={line.id} className="border-b border-slate-100 align-top">
                    <td className="whitespace-pre-line py-2 pr-2">{line.name}</td>
                    <td className="py-2 text-right">
                      {picking.editable ? (
                        <>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            inputMode="decimal"
                            className={`${inputClass} text-right`}
                            aria-label="Cantidad"
                            value={quantities[line.id] ?? ""}
                            onChange={(e) => setQuantities((prev) => ({ ...prev, [line.id]: e.target.value }))}
                          />
                          <span className="mt-0.5 block whitespace-nowrap text-xs text-slate-500">
                            de {fmtQty(line.demand)} {line.uom}
                          </span>
                        </>
                      ) : (
                        <span className="whitespace-nowrap">
                          {fmtQty(line.quantity)} {line.uom}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {picking.lines.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="py-2 text-center text-slate-400">
                      Sin líneas
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </>
        ) : null}

        {message ? <Alert type="success">{message}</Alert> : null}
        {error ? <Alert type="error">{error}</Alert> : null}

        {picking?.editable ? (
          confirming ? (
            <>
              <Alert type="info">
                {partial
                  ? "Se validará como entrega parcial y lo pendiente pasará a un albarán nuevo. No se puede deshacer."
                  : "Se validará como entrega total. No se puede deshacer."}
              </Alert>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="secondary" onClick={() => setConfirming(false)}>
                  Cancelar
                </Button>
                <Button variant="success" onClick={() => send(true)}>
                  Confirmar
                </Button>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Button disabled={busy !== null} onClick={() => send(false)}>
                {busy === "save" ? "Guardando…" : "Guardar"}
              </Button>
              <Button
                variant="success"
                disabled={busy !== null || missing.length > 0}
                onClick={() => setConfirming(true)}
              >
                {busy === "validate" ? "Validando…" : "Validar"}
              </Button>
              {missing.length > 0 ? (
                <p className="col-span-2 text-center text-xs text-slate-500">
                  Para validar falta {missing.join(" y ")}.
                </p>
              ) : null}
            </div>
          )
        ) : null}

        {picking ? (
          <>
            <input
              ref={photoInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) sendPhoto(file);
              }}
            />
            <Button
              className="bg-slate-700! hover:bg-slate-800! disabled:bg-slate-400!"
              disabled={busy !== null}
              onClick={() => photoInput.current?.click()}
            >
              {busy === "photo" ? "Subiendo foto…" : "Adjuntar foto"}
            </Button>
          </>
        ) : null}

        <Button variant="secondary" onClick={() => router.push("/asistencia/gestion/albaranes")}>
          Volver
        </Button>
      </Card>
    </PageShell>
  );
}
