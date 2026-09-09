import Link from "next/link";
import { Card, PageShell, Subtitle, Title } from "@/components/ui";

export default function HomePage() {
  return (
    <PageShell>
      <Card className="flex flex-col items-center gap-6 py-10">
        <div className="flex flex-col gap-1">
          <Title>Asistencia</Title>
          <Subtitle>Selecciona cómo quieres fichar</Subtitle>
        </div>
        <div className="flex w-full flex-col gap-3">
          <Link
            href="/asistencia"
            className="w-full rounded-lg bg-blue-600 px-4 py-4 text-center text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            Soy empleado
          </Link>
          <Link
            href="/asistencia-partner"
            className="w-full rounded-lg bg-slate-800 px-4 py-4 text-center text-sm font-semibold text-white shadow-sm hover:bg-slate-900"
          >
            Soy contacto / subcontrata
          </Link>
        </div>
      </Card>
    </PageShell>
  );
}
