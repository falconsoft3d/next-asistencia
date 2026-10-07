"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AsistenciaNav } from "@/components/AsistenciaNav";
import { GeoGate } from "@/components/GeoGate";
import { Alert, Button, Card, PageShell, Spinner, Subtitle, Title, inputClass } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { employeeAuth, parteDraft } from "@/lib/storage";
import type { Budget, Company, Employee, Product, Project } from "@/lib/types";

interface OptionsResponse {
  status: "ok";
  open_attendance: { id: number; project: Project } | null;
  // Opcional: un servidor sin actualizar todavía no lo envía
  companies?: Company[];
  projects: Project[];
}

interface MeResponse {
  status: "ok";
  employee: Employee;
}

interface CheckoutResponse {
  status: "ok";
  attendance_id: number;
  worked_hours: number;
  budgets: Budget[];
  products: Product[];
}

type ModeOut = "directo" | "desplazamiento" | "otra_obra";

export default function SalirPage() {
  const router = useRouter();
  const token = employeeAuth.getToken();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState<number | "">("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<number | "">("");
  const [geoVerified, setGeoVerified] = useState(false);
  const [modeOut, setModeOut] = useState<ModeOut>("directo");
  const [almorzado, setAlmorzado] = useState(true);
  const [hecomido, setHecomido] = useState(false);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      api.get<OptionsResponse>("/api/asistencia/checkout/options", token),
      api.get<MeResponse>("/api/asistencia/me", token),
    ])
      .then(([options, me]) => {
        if (!options.open_attendance) {
          router.replace("/asistencia/entrar");
          return;
        }
        const companies = options.companies ?? [];
        setCompanies(companies);
        // Se parte de la compañía y el proyecto con los que se fichó la entrada
        const entryCompanyId = options.open_attendance.project.company_id;
        setCompanyId(
          (companies.some((c) => c.id === entryCompanyId) && entryCompanyId) || companies[0]?.id || ""
        );
        setProjects(options.projects);
        setProjectId(options.open_attendance.project.id);
        setEmployee(me.employee);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Error de conexión"))
      .finally(() => setLoading(false));
  }, [router, token]);

  const filteredProjects = useMemo(
    () => projects.filter((p) => !companyId || p.company_id === companyId),
    [projects, companyId]
  );

  async function verifyPosition(latitude: number, longitude: number) {
    if (!projectId) throw new Error("Selecciona un proyecto");
    await api.post("/api/asistencia/position/check", { project_id: projectId, latitude, longitude }, token);
    setGeoVerified(true);
  }

  async function handleCheckout() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.post<CheckoutResponse>(
        "/api/asistencia/checkout",
        { project_id: projectId, mode_out: modeOut, almorzado, hecomido, note },
        token
      );
      parteDraft.set({
        attendanceId: res.attendance_id,
        workedHours: res.worked_hours,
        budgets: res.budgets,
        products: res.products,
      });
      router.push(`/asistencia/parte-diario?attendance_id=${res.attendance_id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error de conexión");
      setSubmitting(false);
    }
  }

  if (loading) return <Spinner />;

  return (
    <PageShell>
      <Card className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <Title>{employee?.name}</Title>
          <Subtitle>Fichar salida</Subtitle>
        </div>

        {!geoVerified ? (
          <>
            <select
              className={inputClass}
              aria-label="Compañía"
              value={companyId}
              onChange={(e) => {
                setCompanyId(Number(e.target.value));
                // Los proyectos dependen de la compañía
                setProjectId("");
              }}
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              className={inputClass}
              aria-label="Proyecto"
              value={projectId}
              onChange={(e) => setProjectId(Number(e.target.value) || "")}
            >
              <option value="">Seleccionar…</option>
              {filteredProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.name}] {p.nombre}
                </option>
              ))}
            </select>
          </>
        ) : null}

        {error ? <Alert type="error">{error}</Alert> : null}

        {!geoVerified ? (
          <GeoGate disabled={!projectId} disabledHint="Selecciona un proyecto para continuar" onVerify={verifyPosition} />
        ) : null}

        {geoVerified ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2 text-sm">
              {(["directo", "desplazamiento", "otra_obra"] as ModeOut[]).map((m) => (
                <label key={m} className="flex items-center gap-2">
                  <input type="radio" checked={modeOut === m} onChange={() => setModeOut(m)} />
                  {m === "directo" ? "Directo" : m === "desplazamiento" ? "Desplazamiento" : "Voy a otra obra"}
                </label>
              ))}
            </div>
            <div className="flex flex-col gap-2 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={almorzado} onChange={(e) => setAlmorzado(e.target.checked)} />
                He Almorzado
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={hecomido} onChange={(e) => setHecomido(e.target.checked)} />
                He Comido
              </label>
            </div>
            <textarea
              className={inputClass}
              placeholder="Campo de texto para notas"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
            <Button variant="danger" onClick={handleCheckout} disabled={submitting}>
              {submitting ? "Registrando…" : "Salir"}
            </Button>
          </div>
        ) : null}

        {!geoVerified ? <AsistenciaNav showShipment={!!employee?.shipment} /> : null}
      </Card>
    </PageShell>
  );
}
