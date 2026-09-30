"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ProjectCombobox } from "@/components/ProjectCombobox";
import { Alert, Button, Card, PageShell, Spinner, Subtitle, Title, inputClass } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { employeeAuth, solmatNotes } from "@/lib/storage";
import type { Project } from "@/lib/types";

interface OptionsResponse {
  status: "ok";
  projects: Project[];
}

interface CreateResponse {
  status: "ok";
  solmat_id: number;
  name: string;
}

interface Line {
  key: number;
  note: string;
  quantity: string;
}

let nextKey = 1;

function emptyLine(): Line {
  return { key: nextKey++, note: "", quantity: "1" };
}

function NoteInput({
  value,
  suggestions,
  onChange,
}: {
  value: string;
  suggestions: string[];
  onChange: (note: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const matches = useMemo(() => {
    const term = value.trim().toLowerCase();
    if (!term) return [];
    return suggestions
      .filter((s) => s.toLowerCase().includes(term) && s.toLowerCase() !== term)
      .slice(0, 8);
  }, [suggestions, value]);

  return (
    <div className="relative w-full">
      <input
        className={inputClass}
        placeholder="Nota"
        aria-label="Nota"
        autoComplete="off"
        value={value}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
      />
      {open && matches.length > 0 ? (
        <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {matches.map((s) => (
            <li key={s}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(s);
                  setOpen(false);
                }}
                className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export default function SolmatPage() {
  const router = useRouter();
  const token = employeeAuth.getToken();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<number | "">("");
  const [lines, setLines] = useState<Line[]>(() => [emptyLine()]);
  const [submitting, setSubmitting] = useState(false);
  const [createdName, setCreatedName] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>(() => solmatNotes.get());

  useEffect(() => {
    api
      .get<OptionsResponse>("/api/asistencia/gestion/options", token)
      .then((res) => setProjects(res.projects))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Error de conexión"))
      .finally(() => setLoading(false));
  }, [token]);

  function updateLine(key: number, changes: Partial<Line>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...changes } : l)));
  }

  function removeLine(key: number) {
    setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.key !== key) : [emptyLine()]));
  }

  async function handleSubmit() {
    setError(null);
    if (!projectId) {
      setError("Selecciona un proyecto");
      return;
    }
    const filled = lines.filter((l) => l.note.trim());
    if (filled.length === 0) {
      setError("Añade al menos una línea con nota");
      return;
    }
    if (filled.some((l) => !(Number(l.quantity) > 0))) {
      setError("La cantidad debe ser mayor que cero");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post<CreateResponse>(
        "/api/asistencia/solmat",
        {
          project_id: projectId,
          lines: filled.map((l) => ({
            note: l.note.trim(),
            quantity: Number(l.quantity),
          })),
        },
        token
      );
      solmatNotes.add(filled.map((l) => l.note));
      setSuggestions(solmatNotes.get());
      setCreatedName(res.name);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error de conexión");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <Spinner />;

  if (createdName) {
    return (
      <PageShell>
        <Card className="flex flex-col items-center gap-4 text-center">
          <Title>Material solicitado</Title>
          <Subtitle>Se ha creado la solicitud {createdName}.</Subtitle>
          <Button
            onClick={() => {
              setLines([emptyLine()]);
              setCreatedName(null);
            }}
          >
            Solicitar más material
          </Button>
          <Button variant="secondary" onClick={() => router.push("/asistencia/gestion")}>
            Volver a Gestión
          </Button>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <Card className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <Title>Solicitar material</Title>
          <Subtitle>Proyectos en los que eres encargado</Subtitle>
        </div>

        <ProjectCombobox
          projects={projects}
          value={projectId}
          onChange={setProjectId}
          placeholder="Seleccionar proyecto…"
        />

        {projects.length === 0 && !error ? (
          <Alert type="info">No eres encargado en ningún presupuesto.</Alert>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                    <th className="py-1 pr-2">Nota</th>
                    <th className="w-24 py-1 pr-2 text-right">Cant.</th>
                    <th className="w-8 py-1" />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => (
                    <tr key={line.key} className="border-b border-slate-100">
                      <td className="py-1 pr-2">
                        <NoteInput
                          value={line.note}
                          suggestions={suggestions}
                          onChange={(note) => updateLine(line.key, { note })}
                        />
                      </td>
                      <td className="py-1 pr-2">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          inputMode="decimal"
                          className={`${inputClass} text-right`}
                          aria-label="Cantidad"
                          value={line.quantity}
                          onChange={(e) => updateLine(line.key, { quantity: e.target.value })}
                        />
                      </td>
                      <td className="py-1 text-center">
                        <button
                          type="button"
                          className="rounded px-2 py-1 text-red-600 hover:bg-red-50"
                          aria-label="Quitar línea"
                          onClick={() => removeLine(line.key)}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button
                type="button"
                className="self-start text-sm font-medium text-blue-600 hover:underline"
                onClick={() => setLines((prev) => [...prev, emptyLine()])}
              >
                Añadir línea
              </button>
            </div>
          </>
        )}

        {error ? <Alert type="error">{error}</Alert> : null}

        {projects.length > 0 ? (
          <Button variant="success" onClick={handleSubmit} disabled={submitting || !projectId}>
            {submitting ? "Enviando…" : "Solicitar"}
          </Button>
        ) : null}
        <Button onClick={() => router.push("/asistencia/gestion/solmat/solicitudes")}>
          Ver mis solicitudes
        </Button>
        <Button variant="secondary" onClick={() => router.push("/asistencia/gestion")}>
          Volver
        </Button>
      </Card>
    </PageShell>
  );
}
