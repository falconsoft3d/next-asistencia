"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ParteDiarioForm } from "@/components/ParteDiarioForm";
import { Alert, Card, PageShell, Spinner, Subtitle, Title } from "@/components/ui";
import { api } from "@/lib/api";
import { partnerAuth, parteDraftPartner } from "@/lib/storage";
import type { Budget, Product } from "@/lib/types";

export default function PartnerParteDiarioPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <PartnerParteDiarioContent />
    </Suspense>
  );
}

function PartnerParteDiarioContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = partnerAuth.getToken();
  const attendanceIdParam = searchParams.get("attendance_id");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attendanceId, setAttendanceId] = useState<number | null>(null);
  const [workedHours, setWorkedHours] = useState(0);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (!attendanceIdParam) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reading route search params, not derivable at render time
      setError("Falta la asistencia a completar");
      setLoading(false);
      return;
    }
    const id = Number(attendanceIdParam);
    const draft = parteDraftPartner.get();
    if (draft && draft.attendanceId === id) {
      setAttendanceId(draft.attendanceId);
      setWorkedHours(draft.workedHours);
      setBudgets(draft.budgets);
      setProducts(draft.products);
      setLoading(false);
      return;
    }
    setError("No se encontró el borrador del parte");
    setLoading(false);
  }, [attendanceIdParam]);

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
              `/api/asistencia-partner/parte-diario/objetivo/${budgetId}/${productId}`,
              token
            );
            return res.qty;
          }}
          onSubmit={async (payload) => {
            await api.post(
              "/api/asistencia-partner/parte-diario",
              { attendance_id: attendanceId, ...payload },
              token
            );
            parteDraftPartner.clear();
            partnerAuth.clear();
            router.replace("/");
          }}
        />
      </Card>
    </PageShell>
  );
}
