"use client";

import { useRouter } from "next/navigation";
import { NavLink } from "./ui";
import { employeeAuth } from "@/lib/storage";

export function AsistenciaNav({ showShipment }: { showShipment: boolean }) {
  const router = useRouter();

  function logout() {
    employeeAuth.clear();
    router.replace("/asistencia/login");
  }

  return (
    <div className="grid w-full grid-cols-2 gap-2">
      {showShipment ? <NavLink href="/asistencia/viajes">Registrar Viajes</NavLink> : null}
      <NavLink
        href="/asistencia/imputar-partida"
        className="border-green-200! bg-green-600! text-white! hover:bg-green-700!"
      >
        Imputar Partida
      </NavLink>
      <NavLink href="/asistencia/asistencias">Ver Asistencias</NavLink>
      <NavLink href="/asistencia/vacaciones">Vacaciones</NavLink>
      <button
        onClick={logout}
        className="col-span-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-center text-sm font-medium text-red-600 shadow-sm hover:bg-red-50"
      >
        Cerrar sesión
      </button>
    </div>
  );
}
