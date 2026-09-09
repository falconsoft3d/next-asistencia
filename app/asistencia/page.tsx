"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Spinner } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { employeeAuth } from "@/lib/storage";

interface MeResponse {
  status: "ok";
  employee: { id: number; name: string; shipment: boolean };
  open_attendance: { id: number } | null;
}

export default function AsistenciaHomePage() {
  const router = useRouter();

  useEffect(() => {
    const token = employeeAuth.getToken();
    if (!token) {
      router.replace("/asistencia/login");
      return;
    }
    api
      .get<MeResponse>("/api/asistencia/me", token)
      .then((res) => {
        router.replace(res.open_attendance ? "/asistencia/salir" : "/asistencia/entrar");
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          employeeAuth.clear();
        }
        router.replace("/asistencia/login");
      });
  }, [router]);

  return <Spinner />;
}
