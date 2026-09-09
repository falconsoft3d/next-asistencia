"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui";
import { employeeAuth } from "@/lib/storage";

const PUBLIC_PATHS = ["/asistencia/login"];

export default function AsistenciaLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = employeeAuth.getToken();
    const isPublic = PUBLIC_PATHS.includes(pathname);
    if (!token && !isPublic) {
      router.replace("/asistencia/login");
      return;
    }
    if (token && isPublic) {
      router.replace("/asistencia");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-time auth guard, must run once before first paint
    setReady(true);
  }, [pathname, router]);

  if (!ready) return <Spinner />;
  return <>{children}</>;
}
