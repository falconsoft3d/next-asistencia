"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AsistenciaNav } from "@/components/AsistenciaNav";
import { GeoGate } from "@/components/GeoGate";
import { ProjectCombobox } from "@/components/ProjectCombobox";
import { Alert, Button, Card, PageShell, Spinner, Subtitle, Title, inputClass } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { employeeAuth } from "@/lib/storage";
import type { Company, Employee, Project } from "@/lib/types";

interface OptionsResponse {
  status: "ok";
  companies: Company[];
  default_company_id: number | false;
  projects: Project[];
}

interface MeResponse {
  status: "ok";
  employee: Employee;
  open_attendance: { id: number } | null;
}

export default function EntrarPage() {
  const router = useRouter();
  const token = employeeAuth.getToken();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [companyId, setCompanyId] = useState<number | "">("");
  const [projectId, setProjectId] = useState<number | "">("");
  const [mode, setMode] = useState<"directo" | "desplazamiento">("directo");
  const [geoVerified, setGeoVerified] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      api.get<OptionsResponse>("/api/asistencia/checkin/options", token),
      api.get<MeResponse>("/api/asistencia/me", token),
    ])
      .then(([options, me]) => {
        setCompanies(options.companies);
        setProjects(options.projects);
        setCompanyId(options.default_company_id || options.companies[0]?.id || "");
        setEmployee(me.employee);
        if (me.open_attendance) router.replace("/asistencia/salir");
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Error de conexión"))
      .finally(() => setLoading(false));
  }, [router, token]);

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => !companyId || p.company_id === companyId);
  }, [projects, companyId]);

  async function verifyPosition(latitude: number, longitude: number) {
    if (!projectId) throw new Error("Selecciona primero un proyecto");
    await api.post("/api/asistencia/position/check", { project_id: projectId, latitude, longitude }, token);
    setGeoVerified(true);
  }

  async function handleCheckin() {
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/api/asistencia/checkin", { project_id: projectId, mode }, token);
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error de conexión");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <Spinner />;

  if (done) {
    return (
      <PageShell>
        <Card className="flex flex-col items-center gap-4 text-center">
          <Title>Entrada registrada</Title>
          <Subtitle>Tu asistencia ha quedado registrada correctamente.</Subtitle>
          <Button onClick={() => router.replace("/asistencia/salir")}>Ir a Salir</Button>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <Card className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <Title>{employee?.name}</Title>
          <Subtitle>Fichar entrada</Subtitle>
        </div>

        {!geoVerified ? (
          <>
            {companies.length > 1 ? (
              <select
                className={inputClass}
                value={companyId}
                onChange={(e) => setCompanyId(Number(e.target.value))}
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            ) : null}
            <ProjectCombobox
              projects={filteredProjects}
              value={projectId}
              onChange={setProjectId}
              placeholder="Buscar proyecto…"
            />
          </>
        ) : null}

        {error ? <Alert type="error">{error}</Alert> : null}

        {!geoVerified ? (
          <GeoGate
            disabled={!projectId}
            disabledHint="Selecciona un proyecto para continuar"
            onVerify={verifyPosition}
          />
        ) : null}

        {geoVerified ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={mode === "directo"}
                  onChange={() => setMode("directo")}
                />
                Directo
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={mode === "desplazamiento"}
                  onChange={() => setMode("desplazamiento")}
                />
                Desplazamiento
              </label>
            </div>
            <Button variant="success" onClick={handleCheckin} disabled={submitting}>
              {submitting ? "Registrando…" : "Entrar"}
            </Button>
          </div>
        ) : null}

        {!geoVerified ? <AsistenciaNav showShipment={!!employee?.shipment} /> : null}
      </Card>
    </PageShell>
  );
}
