"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui";
import { partnerAuth } from "@/lib/storage";

const PUBLIC_PATHS = ["/asistencia-partner/login"];

export default function AsistenciaPartnerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = partnerAuth.getToken();
    const isPublic = PUBLIC_PATHS.includes(pathname);
    if (!token && !isPublic) {
      router.replace("/asistencia-partner/login");
      return;
    }
    if (token && isPublic) {
      router.replace("/asistencia-partner");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-time auth guard, must run once before first paint
    setReady(true);
  }, [pathname, router]);

  if (!ready) return <Spinner />;
  return <>{children}</>;
}
