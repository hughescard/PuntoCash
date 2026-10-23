import type { Metadata } from "next";

import { BRANCHES } from "@/features/branches/branches";
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
  const tableros = Object.fromEntries(BRANCHES.map((b) => [b.id, tableroPublico(b.id)]));
  /* La ficha de cada sede, del servidor: la sede que la pantalla guardó al
     elegirla es una copia de ese momento, y la dirección, el teléfono y el
     horario los cambia después el administrador de la sede (FR-AD-SEDE-14). */
  const fichas = Object.fromEntries(
    SEDES.map((s) => [
      s.id,
      { address: s.address, locality: s.locality, phone: s.phone, horario: lineasDeHorario(s.horario) },
    ]),
  );
  /* Solo las vigentes hoy, y de cada sede las suyas: las de su operador
     mientras la administre y las de red (FR-AD-PROM-6). */
  const promociones = Object.fromEntries(SEDES.map((s) => [s.id, promocionesPublicas(s.id)]));
  return (
    <TablerosProvider tableros={tableros} fichas={fichas} promociones={promociones}>
      <SignageScreen />
    </TablerosProvider>
  );
}
