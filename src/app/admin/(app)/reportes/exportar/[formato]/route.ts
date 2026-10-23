import { NextResponse, type NextRequest } from "next/server";

import { getAdminSession } from "@/features/admin/session-server";
import { registrarEvento } from "@/features/network/audit";
import { calcularReporte } from "../../calculo";
import { contenidoDe } from "../contenido";
import { reportePdf } from "../pdf";
import { reporteExcel } from "../excel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Exportar un reporte — **FR-AD-REP-7**, sobre la plantilla de **FR-AD-REP-13**.
 *
 * `GET /admin/reportes/exportar/pdf` o `/xlsx`, con el mismo periodo y el
 * mismo trabajador de la pantalla en la dirección. Sale del mismo cálculo que
 * la pantalla, con el alcance de la sesión y la sede elegida en la cabecera:
 * nada que la pantalla no muestre puede llegar al archivo **[A1]**. Lleva los
 * cuatro cortes. Cada exportación queda en la auditoría: es información de la
 * empresa que sale del sistema.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ formato: string }> }) {
  const { formato } = await params;
  if (formato !== "pdf" && formato !== "xlsx") return new NextResponse("No encontramos lo que buscabas.", { status: 404 });

  const session = await getAdminSession();
  if (!session) return NextResponse.redirect(new URL("/admin/login", req.url));

  const q = req.nextUrl.searchParams;
  const reporte = calcularReporte(session, {
    corte: q.get("corte") ?? undefined,
    desde: q.get("desde") ?? undefined,
    hasta: q.get("hasta") ?? undefined,
    trabajador: q.get("trabajador") ?? undefined,
  });
  const k = contenidoDe(reporte, session);

  const cuerpo = formato === "pdf" ? await reportePdf(k) : await reporteExcel(k);

  registrarEvento({
    actorId: session.user.id,
    actorName: session.user.fullName,
    actorRole: "admin-sede",
    type: "reporte.exportado",
    subject: `Resumen de operaciones en ${formato === "pdf" ? "PDF" : "Excel"} · ${k.periodo} · ${k.sedes} · Trabajador: ${k.trabajador}`,
    operatorId: session.operator.id,
    ...(session.selected ? { branchId: session.selected.id } : {}),
  });

  return new NextResponse(Buffer.from(cuerpo), {
    headers: {
      "Content-Type":
        formato === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${k.slug}.${formato}"`,
      "Cache-Control": "no-store",
    },
  });
}
