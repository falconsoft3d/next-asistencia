"use client";

import { useRouter } from "next/navigation";
import { Card, PageShell, Title } from "@/components/ui";

const YELLOW = "border-yellow-400 bg-yellow-200 hover:bg-yellow-300";
const ROSE = "border-rose-400 bg-rose-200 hover:bg-rose-300";
const SKY = "border-sky-400 bg-sky-200 hover:bg-sky-300";
const GREEN = "border-green-400 bg-green-200 hover:bg-green-300";

// Se pintan en dos columnas, en este orden de lectura
const ACTIONS = [
  { label: "Solicitar material", icon: "⬆️", href: "/asistencia/gestion/solmat", color: YELLOW },
  { label: "Subcontratas", icon: "👷", href: "/asistencia/gestion/subcontratas", color: ROSE },
  { label: "Recibir material", icon: "⬇️", href: "/asistencia/gestion/albaranes", color: SKY },
  { label: "Imputar partida", icon: "✅", href: "/asistencia/imputar-partida", color: SKY },
  { label: "Pedidos", icon: "🛒", href: "/asistencia/gestion/pedidos", color: GREEN },
  { label: "Certificaciones", icon: "📋", href: "/asistencia/gestion/certificaciones", color: GREEN },
];

export default function GestionPage() {
  const router = useRouter();

  return (
    <PageShell>
      <Card className="flex flex-col gap-6">
        <Title>
          Gestión de obras <span aria-hidden>💡</span>
        </Title>

        <div className="grid grid-cols-2 gap-3">
          {ACTIONS.map((action) => (
            <button
              key={action.href}
              type="button"
              onClick={() => router.push(action.href)}
              className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-3 text-sm font-semibold text-slate-800 shadow-sm transition-colors ${action.color}`}
            >
              {action.label}
              <span aria-hidden>{action.icon}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => router.push("/asistencia")}
          className="self-center rounded-lg border border-slate-400 bg-white px-8 py-2 text-sm font-semibold text-slate-800 shadow-sm transition-colors hover:bg-slate-100"
        >
          Volver
        </button>
      </Card>
    </PageShell>
  );
}
