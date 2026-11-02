import { NextResponse, type NextRequest } from "next/server";

import { getSuperAdminSession } from "@/features/super-admin/session-server";
import { registrarEvento } from "@/features/network/audit";
import { reportePdf } from "@/app/admin/(app)/reportes/exportar/pdf";
import { reporteExcel } from "@/app/admin/(app)/reportes/exportar/excel";
import { calcularReporteDeRed } from "../../calculo";
import { contenidoDeRed } from "../contenido";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Exportar el reporte de la red — **FR-SA-REP-8**, sobre la plantilla de Admin.
 *
 * `GET /super-admin/reportes/exportar/pdf` o `/xlsx`, con el mismo periodo de
 * la pantalla en la dirección. Sale del mismo cálculo que la pantalla y lleva
 * los cinco cortes. Solo hay totales: ninguna fila habla de un cliente, que es
 * lo que la regla de no exportar listados quería evitar (**R11**). Cada
 * exportación queda en la auditoría.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ formato: string }> }) {
  const { formato } = await params;
  if (formato !== "pdf" && formato !== "xlsx") return new NextResponse("No encontramos lo que buscabas.", { status: 404 });

  const session = await getSuperAdminSession();
  if (!session) return NextResponse.redirect(new URL("/super-admin/login", req.url));

  const q = req.nextUrl.searchParams;
  const reporte = calcularReporteDeRed({
    desde: q.get("desde") ?? undefined,
    hasta: q.get("hasta") ?? undefined,
  });
  const k = contenidoDeRed(reporte, session);

  const cuerpo = formato === "pdf" ? await reportePdf(k) : await reporteExcel(k);

  registrarEvento({
    actorId: session.user.id,
    actorName: session.user.fullName,
    actorRole: "super-admin",
    type: "reporte.exportado",
    subject: `Resumen de operaciones en ${formato === "pdf" ? "PDF" : "Excel"} · ${k.periodo} · ${k.alcance}`,
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
