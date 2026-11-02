import { NextResponse, type NextRequest } from "next/server";

import { getSuperAdminSession } from "@/features/super-admin/session-server";
import { registrarEvento } from "@/features/network/audit";
import { diaEnCuba } from "@/app/admin/(app)/jornadas/formato";
import { filasDeAuditoria } from "../datos";
import { etiquetaDeEvento } from "../etiquetas";
import { describirFiltro, filtrarAuditoria, filtroDeParametros, type FilaDeAuditoria } from "../filtro";
import { auditoriaExcel } from "./excel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Exportar el registro — **FR-SA-AUD-9**.
 *
 * `GET /super-admin/auditoria/exportar` con los mismos filtros de la pantalla
 * en la dirección: el archivo trae lo que se estaba viendo, no el registro
 * entero. Sale del mismo filtro que la pantalla.
 *
 * A diferencia de un reporte, este archivo **sí nombra personas** —los
 * trabajadores y administradores sobre los que se actuó—, y es por eso que la
 * exportación misma queda en el registro, con los filtros y el número de
 * eventos: quien lee el registro también deja huella.
 */
export async function GET(req: NextRequest) {
  const session = await getSuperAdminSession();
  if (!session) return NextResponse.redirect(new URL("/super-admin/login", req.url));

  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  const filtro = filtroDeParametros(params);
  const todas = filasDeAuditoria();
  const filas = filtrarAuditoria(todas, filtro);

  const nombreDe = (id: string, de: (f: FilaDeAuditoria) => [string | null, string | null]) => {
    for (const f of todas) {
      const [k, v] = de(f);
      if (k === id) return v ?? undefined;
    }
    return undefined;
  };
  const filtros = describirFiltro(filtro, {
    tipo: filtro.tipo === "todos" ? undefined : etiquetaDeEvento(filtro.tipo as FilaDeAuditoria["tipo"]),
    actor: nombreDe(filtro.actor, (f) => [f.actorId, f.actor]),
    operador: nombreDe(filtro.operador, (f) => [f.operadorId, f.operador]),
    sede: nombreDe(filtro.sede, (f) => [f.sedeId, f.sede]),
  });

  const ahora = new Date();
  const cuerpo = await auditoriaExcel({ generado: ahora, generadoPor: session.user.fullName, filtros, filas });

  registrarEvento({
    actorId: session.user.id,
    actorName: session.user.fullName,
    actorRole: "super-admin",
    type: "auditoria.exportada",
    subject: `Registro de auditoría en Excel · ${filas.length === 1 ? "1 evento" : `${filas.length} eventos`} · ${filtros}`,
  });

  return new NextResponse(Buffer.from(cuerpo), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="puntocash-auditoria_${diaEnCuba(ahora)}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
