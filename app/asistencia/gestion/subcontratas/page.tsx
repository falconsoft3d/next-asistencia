"use client";

import { useRouter } from "next/navigation";
import { Fragment, useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, PageShell, Subtitle, Title, inputClass } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { employeeAuth } from "@/lib/storage";
import type { PartnerAttendance, Project } from "@/lib/types";

interface OptionsResponse {
  status: "ok";
  projects: Project[];
}

interface AttendancesResponse {
  status: "ok";
  attendances: PartnerAttendance[];
}

const STATE_CLASSES: Record<PartnerAttendance["state"], string> = {
  draft: "bg-slate-100 text-slate-600",
  validated: "bg-green-100 text-green-800",
  invoiced: "bg-blue-100 text-blue-800",
};

// Las fechas llegan como 'YYYY-MM-DDTHH:MM' en hora local
function fmtDateTime(value: string) {
  if (!value) return "—";
  const [date, time] = value.split("T");
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year} ${time}`;
}

function fmtHours(value: number) {
  return value.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

interface Group {
  key: string;
  label: string;
  ids: number[];
  drafts: number;
  hours: number;
  children: Group[];
  rows: PartnerAttendance[];
}

// Agrupa en niveles sucesivos (mes > empresa > proyecto); las filas quedan en el último nivel
function groupBy(
  rows: PartnerAttendance[],
  levels: ((a: PartnerAttendance) => { id: string; label: string })[],
  parentKey = ""
): Group[] {
  const [level, ...rest] = levels;
  const groups = new Map<string, Group>();
  for (const row of rows) {
    const { id, label } = level(row);
    let group = groups.get(id);
    if (!group) {
      group = { key: `${parentKey}/${id}`, label, ids: [], drafts: 0, hours: 0, children: [], rows: [] };
      groups.set(id, group);
    }
    group.ids.push(row.id);
    if (row.state === "draft") group.drafts += 1;
    group.hours += row.tiempo_total_calculado;
    group.rows.push(row);
  }
  const result = Array.from(groups.values());
  if (rest.length > 0) {
    for (const group of result) {
      group.children = groupBy(group.rows, rest, group.key).sort((a, b) => a.label.localeCompare(b.label));
      group.rows = [];
    }
  }
  return result;
}

const GROUP_LEVELS = [
  (a: PartnerAttendance) => {
    const month = a.check_in.slice(0, 7);
    const [year, number] = month.split("-");
    return { id: month, label: `${MONTHS[Number(number) - 1] ?? month} ${year}` };
  },
  (a: PartnerAttendance) => ({ id: a.partner_parent_name, label: a.partner_parent_name || "Sin empresa" }),
  (a: PartnerAttendance) => ({ id: a.project_name, label: a.project_name || "Sin proyecto" }),
];

const LEVEL_CLASSES = ["font-semibold", "pl-6 font-medium", "pl-10"];
const LEVEL_PENDING = ["bg-slate-200", "bg-slate-100", "bg-slate-50"];
// Verde cuando el grupo ya no tiene ninguna asistencia en Borrador
const LEVEL_VALIDATED = ["bg-green-200", "bg-green-100", "bg-green-50"];

export default function SubcontratasPage() {
  const router = useRouter();
  const token = employeeAuth.getToken();

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<number | "">("");
  const [stateFilter, setStateFilter] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [attendances, setAttendances] = useState<PartnerAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState<"validate" | "duplicate" | "save" | null>(null);
  const [confirming, setConfirming] = useState(false);

  // Todos los grupos salen plegados; aquí van los que el usuario ha abierto
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editIn, setEditIn] = useState("");
  const [editOut, setEditOut] = useState("");

  useEffect(() => {
    api
      .get<OptionsResponse>("/api/asistencia/gestion/options", token)
      .then((res) => setProjects(res.projects))
      .catch(() => setProjects([]));
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    api
      .get<AttendancesResponse>(
        `/api/asistencia/gestion/subcontratas?project_id=${projectId || 0}&state=${stateFilter}`,
        token
      )
      .then((res) => {
        if (cancelled) return;
        setAttendances(res.attendances);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setAttendances([]);
        setError(err instanceof ApiError ? err.message : "Error de conexión");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, stateFilter, reloadKey, token]);

  function reload() {
    setSelected(new Set());
    setEditingId(null);
    setConfirming(false);
    setLoading(true);
    setReloadKey((k) => k + 1);
  }

  // El servidor ya ordena por entrada descendente, así que los meses salen del más reciente al más antiguo
  const groups = useMemo(() => groupBy(attendances, GROUP_LEVELS), [attendances]);

  const selectedIds = attendances.filter((a) => selected.has(a.id)).map((a) => a.id);
  const selectedDrafts = attendances.filter((a) => selected.has(a.id) && a.state === "draft").length;

  function toggleGroup(ids: number[]) {
    setConfirming(false);
    setSelected((prev) => {
      const next = new Set(prev);
      const all = ids.every((id) => next.has(id));
      ids.forEach((id) => (all ? next.delete(id) : next.add(id)));
      return next;
    });
  }

  function toggleOpen(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function renderRows(rows: PartnerAttendance[]) {
    return (
      <div className="overflow-x-auto py-1 pl-10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
              <th className="py-1 pr-2" />
              <th className="py-1 pr-2">Estado</th>
              <th className="py-1 pr-2">Partner</th>
              <th className="py-1 pr-2 text-right">Total calc.</th>
              <th className="py-1 pr-2">Entrada</th>
              <th className="py-1 pr-2">Salida</th>
              <th className="py-1 text-right">Descanso</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((attendance) => (
              <Fragment key={attendance.id}>
                <tr className="border-b border-slate-100">
                  <td className="py-2 pr-2">
                    <input
                      type="checkbox"
                      aria-label={`Seleccionar ${attendance.partner_name}`}
                      checked={selected.has(attendance.id)}
                      onChange={() => toggleOne(attendance.id)}
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
                          STATE_CLASSES[attendance.state] ?? STATE_CLASSES.draft
                        }`}
                      >
                        {attendance.state_label}
                      </span>
                      {attendance.editable && editingId !== attendance.id ? (
                        <button
                          type="button"
                          className="text-blue-600 hover:underline"
                          onClick={() => startEdit(attendance)}
                        >
                          Editar
                        </button>
                      ) : null}
                    </div>
                  </td>
                  <td className="py-2 pr-2">{attendance.partner_name}</td>
                  <td className="py-2 pr-2 text-right">{fmtHours(attendance.tiempo_total_calculado)}</td>
                  <td className="whitespace-nowrap py-2 pr-2">{fmtDateTime(attendance.check_in)}</td>
                  <td className="whitespace-nowrap py-2 pr-2">{fmtDateTime(attendance.check_out)}</td>
                  <td className="py-2 text-right">{fmtHours(attendance.hours_of_rest)}</td>
                </tr>
                {editingId === attendance.id ? (
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <td colSpan={7} className="p-3">
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <label className="flex flex-col gap-1 text-sm">
                          <span className="font-medium text-slate-700">Entrada</span>
                          <input
                            type="datetime-local"
                            className={`${inputClass} bg-white`}
                            value={editIn}
                            onChange={(e) => setEditIn(e.target.value)}
                          />
                        </label>
                        <label className="flex flex-col gap-1 text-sm">
                          <span className="font-medium text-slate-700">Salida</span>
                          <input
                            type="datetime-local"
                            className={`${inputClass} bg-white`}
                            value={editOut}
                            onChange={(e) => setEditOut(e.target.value)}
                          />
                        </label>
                        <Button variant="secondary" className="py-2!" onClick={() => setEditingId(null)}>
                          Cancelar
                        </Button>
                        <Button className="py-2!" disabled={busy !== null} onClick={saveEdit}>
                          {busy === "save" ? "Guardando…" : "Guardar"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function renderGroup(group: Group, level: number) {
    const isLeaf = group.children.length === 0;
    const open = expanded.has(group.key);
    const count = group.ids.filter((id) => selected.has(id)).length;
    return (
      <div key={group.key}>
        <div
          className={`flex items-center gap-2 border-b border-white px-2 py-2 text-sm ${LEVEL_CLASSES[level]} ${
            (group.drafts === 0 ? LEVEL_VALIDATED : LEVEL_PENDING)[level]
          }`}
        >
          {/* Solo se selecciona en bloque a nivel de proyecto, para evitar validar de más por error */}
          {isLeaf ? (
            <input
              type="checkbox"
              aria-label={`Seleccionar ${group.label}`}
              checked={count === group.ids.length}
              ref={(el) => {
                if (el) el.indeterminate = count > 0 && count < group.ids.length;
              }}
              onChange={() => toggleGroup(group.ids)}
            />
          ) : null}
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-1 text-left"
            aria-expanded={open}
            onClick={() => toggleOpen(group.key)}
          >
            <span className="w-3 shrink-0">{open ? "▾" : "▸"}</span>
            <span className="truncate">{group.label}</span>
          </button>
          <span className="shrink-0 whitespace-nowrap text-xs font-normal text-slate-500">
            {group.ids.length} · {fmtHours(group.hours)} h
          </span>
        </div>
        {open ? (isLeaf ? renderRows(group.rows) : group.children.map((child) => renderGroup(child, level + 1))) : null}
      </div>
    );
  }

  function toggleOne(id: number) {
    setConfirming(false);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function runAction(action: "validate" | "duplicate") {
    setError(null);
    setMessage(null);
    setConfirming(false);
    setBusy(action);
    try {
      if (action === "validate") {
        const res = await api.post<{ status: "ok"; updated: number }>(
          "/api/asistencia/gestion/subcontratas/validar",
          { ids: selectedIds },
          token
        );
        setMessage(`${res.updated} ${res.updated === 1 ? "asistencia validada" : "asistencias validadas"}`);
      } else {
        const res = await api.post<{ status: "ok"; created: number }>(
          "/api/asistencia/gestion/subcontratas/duplicar",
          { ids: selectedIds },
          token
        );
        setMessage(
          `${res.created} ${res.created === 1 ? "asistencia duplicada" : "asistencias duplicadas"} en Borrador`
        );
      }
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error de conexión");
    } finally {
      setBusy(null);
    }
  }

  function startEdit(attendance: PartnerAttendance) {
    setError(null);
    setMessage(null);
    setEditingId(attendance.id);
    setEditIn(attendance.check_in);
    setEditOut(attendance.check_out);
  }

  async function saveEdit() {
    if (editingId === null) return;
    setError(null);
    setMessage(null);
    if (!editIn) {
      setError("La entrada es obligatoria");
      return;
    }
    if (editOut && editOut < editIn) {
      setError("La salida no puede ser anterior a la entrada");
      return;
    }
    setBusy("save");
    try {
      const res = await api.post<{ status: "ok"; attendance: PartnerAttendance }>(
        `/api/asistencia/gestion/subcontratas/${editingId}`,
        { check_in: editIn, check_out: editOut },
        token
      );
      setAttendances((prev) => prev.map((a) => (a.id === res.attendance.id ? res.attendance : a)));
      setEditingId(null);
      setMessage("Asistencia actualizada");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error de conexión");
    } finally {
      setBusy(null);
    }
  }

  return (
    <PageShell>
      <Card className="max-w-3xl flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <Title>Subcontratas</Title>
          <Subtitle>Asistencias de partner de tus proyectos</Subtitle>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
          <select
            className={inputClass}
            aria-label="Proyecto"
            value={projectId}
            onChange={(e) => {
              setProjectId(Number(e.target.value) || "");
              reload();
            }}
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
            value={stateFilter}
            onChange={(e) => {
              setStateFilter(e.target.value);
              reload();
            }}
          >
            <option value="">Todos los estados</option>
            <option value="draft">Borrador</option>
            <option value="validated">Validado</option>
            <option value="invoiced">Facturado</option>
          </select>
        </div>

        {confirming ? (
          <>
            <Alert type="info">
              Se validarán {selectedDrafts} {selectedDrafts === 1 ? "asistencia" : "asistencias"} en Borrador.
              Después ya no podrás modificarlas desde aquí.
            </Alert>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => setConfirming(false)}>
                Cancelar
              </Button>
              <Button variant="success" onClick={() => runAction("validate")}>
                Confirmar
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-500">{selectedIds.length} seleccionadas</span>
            <Button
              variant="success"
              className="w-auto py-2!"
              disabled={busy !== null || selectedDrafts === 0}
              onClick={() => setConfirming(true)}
            >
              {busy === "validate" ? "Validando…" : "Validar"}
            </Button>
            <Button
              className="w-auto py-2!"
              disabled={busy !== null || selectedIds.length === 0}
              onClick={() => runAction("duplicate")}
            >
              {busy === "duplicate" ? "Duplicando…" : "Duplicar"}
            </Button>
          </div>
        )}

        {message ? <Alert type="success">{message}</Alert> : null}
        {error ? <Alert type="error">{error}</Alert> : null}

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
          </div>
        ) : (
          <div className="flex flex-col">
            {groups.map((group) => renderGroup(group, 0))}
            {attendances.length === 0 && !error ? (
              <p className="py-4 text-center text-sm text-slate-400">Sin asistencias</p>
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
