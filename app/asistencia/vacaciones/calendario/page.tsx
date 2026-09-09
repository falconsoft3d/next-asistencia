"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Card, PageShell, Spinner, Title } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { employeeAuth } from "@/lib/storage";
import type { CalendarMonth, LeaveTypeInfo } from "@/lib/types";

interface CalendarResponse {
  status: "ok";
  year: number;
  months_data: CalendarMonth[];
  leave_types_map: Record<string, LeaveTypeInfo>;
}

export default function VacacionesCalendarioPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <CalendarioContent />
    </Suspense>
  );
}

function CalendarioContent() {
  const token = employeeAuth.getToken();
  const router = useRouter();
  const searchParams = useSearchParams();
  const year = Number(searchParams.get("year")) || new Date().getFullYear();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CalendarResponse | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refetching when the `year` search param changes
    setLoading(true);
    api
      .get<CalendarResponse>(`/api/asistencia/vacaciones/calendario?year=${year}`, token)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) employeeAuth.clear();
        return null;
      })
      .then(setData)
      .finally(() => setLoading(false));
  }, [year, token]);

  if (loading || !data) return <Spinner />;

  return (
    <PageShell>
      <Card className="max-w-3xl flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <button onClick={() => router.push(`/asistencia/vacaciones/calendario?year=${year - 1}`)} className="px-2 text-lg">
            ‹
          </button>
          <Title>{year}</Title>
          <button onClick={() => router.push(`/asistencia/vacaciones/calendario?year=${year + 1}`)} className="px-2 text-lg">
            ›
          </button>
        </div>

        <div className="flex flex-wrap gap-3 text-xs">
          {Object.entries(data.leave_types_map).map(([id, info]) => (
            <span key={id} className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full" style={{ background: info.color }} />
              {info.name}
            </span>
          ))}
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-slate-400" />
            Festivo
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {data.months_data.map((month) => (
            <div key={month.num} className="overflow-hidden rounded-lg border border-slate-200">
              <div className="bg-slate-800 py-1 text-center text-xs font-semibold uppercase text-white">{month.name}</div>
              <table className="w-full text-center text-[11px]">
                <thead>
                  <tr className="text-slate-500">
                    {["L", "M", "X", "J", "V", "S", "D"].map((d, i) => (
                      <th key={d} className={i >= 5 ? "text-red-500" : ""}>
                        {d}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {month.weeks.map((week, wIdx) => (
                    <tr key={wIdx}>
                      {week.map((day, dIdx) => {
                        if (!day.day) return <td key={dIdx} />;
                        const info = day.type_id ? data.leave_types_map[String(day.type_id)] : undefined;
                        return (
                          <td key={dIdx} className={`py-0.5 ${day.today ? "ring-1 ring-blue-500 rounded-full" : ""}`}>
                            <span
                              className={`inline-flex h-5 w-5 items-center justify-center rounded-full ${
                                day.weekend ? "text-red-500" : "text-slate-700"
                              }`}
                              style={
                                info
                                  ? { background: info.color, color: "white", opacity: day.state === "confirm" ? 0.5 : 1 }
                                  : day.holiday
                                  ? { background: "#cbd5e1", color: "white" }
                                  : undefined
                              }
                            >
                              {day.day}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        <Link href="/asistencia/vacaciones" className="text-center text-sm text-blue-600 hover:underline">
          ← Volver
        </Link>
      </Card>
    </PageShell>
  );
}
