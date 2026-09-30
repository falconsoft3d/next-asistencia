"use client";

import { useParams, useRouter } from "next/navigation";
import { Fragment, useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, PageShell, Spinner, Subtitle, Title, inputClass } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { employeeAuth } from "@/lib/storage";
import type { Certification, CertificationLine } from "@/lib/types";

interface CertificationResponse {
  status: "ok";
  certification: Certification;
  lines: CertificationLine[];
}

function fmtDate(value: string | false) {
  if (!value) return "—";
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

function fmtQty(value: number) {
  return value.toLocaleString("es-ES", { maximumFractionDigits: 4 });
}

function LineRow({
  line,
  editable,
  certificationId,
  token,
  onSaved,
}: {
  line: CertificationLine;
  editable: boolean;
  certificationId: number;
  token: string | null;
  onSaved: (line: CertificationLine) => void;
}) {
  const [value, setValue] = useState(String(line.quantity_to_cert));
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  // Se guarda al salir del campo, solo si la cantidad ha cambiado
  async function save() {
    const quantity = Number(value);
    if (value.trim() === "" || Number.isNaN(quantity)) {
      setValue(String(line.quantity_to_cert));
      return;
    }
    if (quantity === line.quantity_to_cert) return;
    if (quantity < 0) {
      setError("No puede ser negativa");
      return;
    }
    setError(null);
    setStatus("saving");
    try {
      const res = await api.post<{ status: "ok"; line: CertificationLine }>(
        `/api/asistencia/gestion/certificaciones/${certificationId}/lineas/${line.id}`,
        { quantity_to_cert: quantity },
        token
      );
      onSaved(res.line);
      setValue(String(res.line.quantity_to_cert));
      setStatus("saved");
    } catch (err) {
      setStatus("idle");
      setError(err instanceof ApiError ? err.message : "Error de conexión");
    }
  }

  return (
    <tr className="border-b border-slate-100 align-top">
      <td className="py-2 pr-2">{line.concept}</td>
      <td className="whitespace-nowrap py-2 pr-2 text-right">{fmtQty(line.budget_qty)}</td>
      <td className="whitespace-nowrap py-2 pr-2 text-right">{fmtQty(line.quantity_to_cert_o)}</td>
      <td className="py-2 pr-2 text-right">
        {editable ? (
          <>
            <input
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              className={`${inputClass} w-16! px-2! py-1! text-right [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
              aria-label={`CanAct de ${line.concept}`}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setStatus("idle");
              }}
              onBlur={save}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
            />
            {status === "saving" ? <span className="block text-xs text-slate-500">Guardando…</span> : null}
            {status === "saved" ? <span className="block text-xs text-green-700">Guardado</span> : null}
            {error ? <span className="block text-xs text-red-600">{error}</span> : null}
          </>
        ) : (
          <span className="whitespace-nowrap">{fmtQty(line.quantity_to_cert)}</span>
        )}
      </td>
      <td className="whitespace-nowrap py-2 text-right">{fmtQty(line.qty_acc)}</td>
    </tr>
  );
}

export default function CertificacionPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const token = employeeAuth.getToken();

  const [certification, setCertification] = useState<Certification | null>(null);
  const [lines, setLines] = useState<CertificationLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Los capítulos salen plegados; aquí van los que el usuario ha abierto
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleChapter(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  useEffect(() => {
    api
      .get<CertificationResponse>(`/api/asistencia/gestion/certificaciones/${params.id}`, token)
      .then((res) => {
        setCertification(res.certification);
        setLines(res.lines);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Error de conexión"))
      .finally(() => setLoading(false));
  }, [params.id, token]);

  // Las líneas llegan ordenadas por capítulo: se agrupan conservando ese orden
  const chapters = useMemo(() => {
    const groups: { chapter: string; lines: CertificationLine[] }[] = [];
    for (const line of lines) {
      const last = groups[groups.length - 1];
      if (last && last.chapter === line.chapter) last.lines.push(line);
      else groups.push({ chapter: line.chapter, lines: [line] });
    }
    return groups;
  }, [lines]);

  if (loading) return <Spinner />;

  return (
    <PageShell>
      <Card className="max-w-3xl flex flex-col gap-4">
        {certification ? (
          <>
            <div className="flex flex-col items-center gap-2">
              <Title>{certification.name}</Title>
              <Subtitle>{certification.budget_name}</Subtitle>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  certification.editable ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"
                }`}
              >
                {certification.state_label}
              </span>
            </div>

            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
              <dt className="text-slate-500">Etapa</dt>
              <dd className="text-slate-800">{certification.stage_name || "—"}</dd>
              <dt className="text-slate-500">Fechas de la etapa</dt>
              <dd className="text-slate-800">
                {fmtDate(certification.stage_date_start)} – {fmtDate(certification.stage_date_stop)}
              </dd>
            </dl>

            {certification.editable ? (
              <Alert type="info">
                La certificación está en Cargado: puedes modificar CanAct. Se guarda al salir de cada campo.
              </Alert>
            ) : null}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                    <th className="py-1 pr-2">Partida</th>
                    <th className="py-1 pr-2 text-right">CanPres</th>
                    <th className="py-1 pr-2 text-right">CanOrig</th>
                    <th className="py-1 pr-2 text-right">CanAct</th>
                    <th className="py-1 text-right">CanAnt</th>
                  </tr>
                </thead>
                <tbody>
                  {chapters.map((group, idx) => {
                    const key = `${group.chapter}-${idx}`;
                    const open = expanded.has(key);
                    return (
                      <Fragment key={key}>
                        <tr className="border-b border-white bg-slate-100">
                          <td colSpan={5} className="p-0">
                            <button
                              type="button"
                              className="flex w-full items-center gap-1 px-2 py-2 text-left text-xs font-semibold text-slate-700"
                              aria-expanded={open}
                              onClick={() => toggleChapter(key)}
                            >
                              <span className="w-3 shrink-0">{open ? "▾" : "▸"}</span>
                              <span className="flex-1">{group.chapter || "Sin capítulo"}</span>
                              <span className="shrink-0 whitespace-nowrap font-normal text-slate-500">
                                {group.lines.length} {group.lines.length === 1 ? "partida" : "partidas"}
                              </span>
                            </button>
                          </td>
                        </tr>
                        {open
                          ? group.lines.map((line) => (
                              <LineRow
                                key={line.id}
                                line={line}
                                editable={certification.editable}
                                certificationId={certification.id}
                                token={token}
                                onSaved={(saved) =>
                                  setLines((prev) => prev.map((l) => (l.id === saved.id ? saved : l)))
                                }
                              />
                            ))
                          : null}
                      </Fragment>
                    );
                  })}
                  {lines.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-slate-400">
                        Sin líneas
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </>
        ) : null}

        {error ? <Alert type="error">{error}</Alert> : null}

        <Button variant="secondary" onClick={() => router.push("/asistencia/gestion/certificaciones")}>
          Volver
        </Button>
      </Card>
    </PageShell>
  );
}
