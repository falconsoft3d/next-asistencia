"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GeoDisplay } from "@/components/GeoDisplay";
import { Alert, Button, Card, Field, PageShell, Subtitle, Title, inputClass } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { employeeAuth, rememberedEmployeeCode } from "@/lib/storage";

interface LoginResponse {
  status: "ok";
  token: string;
  employee: { id: number; name: string; shipment: boolean };
  open_attendance: boolean;
}

export default function EmployeeLoginPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = rememberedEmployeeCode.get();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading a browser storage API, not derivable at render time
    if (saved) setCode(saved);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.post<LoginResponse>("/api/asistencia/auth/login", { code });
      employeeAuth.setToken(res.token);
      if (remember) rememberedEmployeeCode.set(code);
      else rememberedEmployeeCode.clear();
      router.replace(res.open_attendance ? "/asistencia/salir" : "/asistencia/entrar");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error de conexión");
      setLoading(false);
    }
  }

  return (
    <PageShell>
      <Card className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <Title>Asistencia</Title>
          <Subtitle>Introduce tu código de fichaje</Subtitle>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Código">
            <input
              className={inputClass}
              type="password"
              inputMode="numeric"
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
          </Field>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            Recuérdame
          </label>
          {error ? <Alert type="error">{error}</Alert> : null}
          <Button type="submit" disabled={loading || !code}>
            {loading ? "Entrando…" : "Iniciar"}
          </Button>
        </form>
        <GeoDisplay />
      </Card>
    </PageShell>
  );
}
