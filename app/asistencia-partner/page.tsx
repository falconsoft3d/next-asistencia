"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Spinner } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { partnerAuth } from "@/lib/storage";

interface MeResponse {
  status: "ok";
  partner: { id: number; name: string };
  open_attendance: { id: number } | null;
}

export default function AsistenciaPartnerHomePage() {
  const router = useRouter();

  useEffect(() => {
    const token = partnerAuth.getToken();
    if (!token) {
      router.replace("/asistencia-partner/login");
      return;
    }
    api
      .get<MeResponse>("/api/asistencia-partner/me", token)
      .then((res) => {
        router.replace(res.open_attendance ? "/asistencia-partner/salir" : "/asistencia-partner/entrar");
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) partnerAuth.clear();
        router.replace("/asistencia-partner/login");
      });
  }, [router]);

  return <Spinner />;
}
