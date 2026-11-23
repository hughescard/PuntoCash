import type { Metadata } from "next";

import { estadoDeSede } from "@/features/network/assignments";
import { lineasDeHorario } from "@/features/network/horario";
import { promocionesPublicas } from "@/features/network/promotions";
import { tableroPublico } from "@/features/network/rates";
import { SEDES } from "@/features/network/sedes";
import { SignageScreen } from "./signage-screen";
import { TablerosProvider } from "./tableros";

export const metadata: Metadata = {
  title: "PuntoCash",
  description: "Tasas del día, información de sucursal y avisos.",
  robots: { index: false, follow: false },
};

/* Las tasas cambian cuando el mercante las cambia: esta página no puede
   generarse una vez y servirse para siempre. */
export const dynamic = "force-dynamic";

export default function KioskPantallaPage() {
  /* Una sede cerrada ya no existe para la pantalla: ni en el selector ni
     como sede de una pantalla ya configurada. */
  const abiertas = SEDES.filter((s) => s.status !== "cerrada");
  const tableros = Object.fromEntries(abiertas.map((s) => [s.id, tableroPublico(s.id)]));
  /* El nombre, la ficha y si atiende, del servidor: la pantalla solo guarda
     qué sede eligió, y todo lo demás lo cambian después PuntoCash o el
     administrador de la sede. */
  const sedes = abiertas.map((s) => ({
    id: s.id,
    name: s.name,
    address: s.address,
    locality: s.locality,
    phone: s.phone,
    horario: lineasDeHorario(s.horario),
    atiende: estadoDeSede(s) === "activa",
  }));
  /* Solo las vigentes hoy, y de cada sede las suyas: las de su operador
     mientras la administre y las de red (FR-AD-PROM-6). */
  const promociones = Object.fromEntries(abiertas.map((s) => [s.id, promocionesPublicas(s.id)]));
  return (
    <TablerosProvider tableros={tableros} sedes={sedes} promociones={promociones}>
      <SignageScreen />
    </TablerosProvider>
  );
}
