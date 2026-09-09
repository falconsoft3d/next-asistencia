"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ParteDiarioForm } from "@/components/ParteDiarioForm";
import { Alert, Card, PageShell, Spinner, Subtitle, Title } from "@/components/ui";
import { api } from "@/lib/api";
import { employeeAuth, parteDraft } from "@/lib/storage";
import type { Budget, Product } from "@/lib/types";

interface HistoricoOptionsResponse {
  status: "ok";
  attendance_id: number;
  worked_hours: number;
  budgets: Budget[];
  products: Product[];
}

export default function ParteDiarioPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <ParteDiarioContent />
    </Suspense>
  );
}

function ParteDiarioContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = employeeAuth.getToken();
  const attendanceIdParam = searchParams.get("attendance_id");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attendanceId, setAttendanceId] = useState<number | null>(null);
  const [workedHours, setWorkedHours] = useState(0);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [fromCheckout, setFromCheckout] = useState(false);

  useEffect(() => {
    if (!attendanceIdParam) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reading route search params, not derivable at render time
      setError("Falta la asistencia a completar");
      setLoading(false);
      return;
    }
    const id = Number(attendanceIdParam);
    const draft = parteDraft.get();
    if (draft && draft.attendanceId === id) {
      setAttendanceId(draft.attendanceId);
      setWorkedHours(draft.workedHours);
      setBudgets(draft.budgets);
      setProducts(draft.products);
      setFromCheckout(true);
      setLoading(false);
      return;
    }
    api
      .get<HistoricoOptionsResponse>(`/api/asistencia/attendances/${id}/parte-diario/options`, token)
      .then((res) => {
        setAttendanceId(res.attendance_id);
        setWorkedHours(res.worked_hours);
        setBudgets(res.budgets);
        setProducts(res.products);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error de conexión"))
      .finally(() => setLoading(false));
  }, [attendanceIdParam, token]);

  if (loading) return <Spinner />;

  if (error || !attendanceId) {
    return (
      <PageShell>
        <Card>
          <Alert type="error">{error || "Asistencia no encontrada"}</Alert>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <Card className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <Title>Parte de trabajo</Title>
          <Subtitle>Registra en qué has trabajado</Subtitle>
        </div>
        <ParteDiarioForm
          workedHours={workedHours}
          budgets={budgets}
          products={products}
          fetchObjetivo={async (budgetId, productId) => {
            const res = await api.get<{ qty: number }>(
              `/api/asistencia/parte-diario/objetivo/${budgetId}/${productId}`,
              token
            );
            return res.qty;
          }}
          onSubmit={async (payload) => {
            await api.post(
              "/api/asistencia/parte-diario",
              { attendance_id: attendanceId, ...payload },
              token
            );
            parteDraft.clear();
            if (fromCheckout) {
              employeeAuth.clear();
              router.replace("/");
            } else {
              router.replace("/asistencia/asistencias");
            }
          }}
        />
      </Card>
    </PageShell>
  );
}
