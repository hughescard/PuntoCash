"use server";

import { revalidatePath } from "next/cache";

import { getAdminSession } from "@/features/admin/session-server";
import { registrarEvento } from "@/features/network/audit";
import {
  anadirMonedaASede,
  monedaDelCatalogo,
  retirarMonedaDeSede,
  type MonedaWriteDenial,
} from "@/features/network/currencies";
import { EFECTOS_EN_TASAS } from "@/features/network/rates";
import { redEnAlcance } from "@/features/network/scoped-reads";
import { mensaje } from "../mensajes";

/**
 * Las dos escrituras de Monedas — **FR-AD-MON-3** a **FR-AD-MON-10**.
 *
 * Como en Cajas, la pantalla ya ofrece solo sedes propias y monedas que se
 * pueden añadir, y **el dominio lo vuelve a comprobar**: lo que ofrece un
 * desplegable es comodidad, no control.
 */

export type ResultadoMoneda = { ok: true; mensaje: string } | { ok: false; error: string } | null;


function motivo(reason: MonedaWriteDenial, code: string, cajas?: readonly string[]): string {
  /* **FR-AD-MON-7**: con saldo, se nombran las cajas. */
  return mensaje("monedas", reason, { moneda: code, cajas: enumerar(cajas ?? []) });
}

/** «Caja 01», «Caja 01 y Caja 03», «Caja 01, Caja 02 y Caja 03». */
function enumerar(nombres: readonly string[]): string {
  if (nombres.length <= 1) return nombres[0] ?? "";
  return `${nombres.slice(0, -1).join(", ")} y ${nombres[nombres.length - 1]}`;
}

export async function anadirMonedaAction(
  _previo: ResultadoMoneda,
  formData: FormData,
): Promise<ResultadoMoneda> {
  const session = await getAdminSession();
  if (!session) return { ok: false, error: mensaje("monedas", "sesion-terminada") };

  const sedeId = String(formData.get("sede") ?? "");
  const code = String(formData.get("moneda") ?? "");
  if (!code) return { ok: false, error: mensaje("monedas", "moneda-requerida") };

  const resultado = anadirMonedaASede(session.scope, sedeId, code);
  if (!resultado.ok) return { ok: false, error: motivo(resultado.reason, code) };

  const sede = redEnAlcance(session.scope).sede(sedeId);
  registrarEvento({
    actorId: session.user.id,
    actorName: session.user.fullName,
    actorRole: "admin-sede",
    type: "moneda-sede.alta",
    subject: `${code} · ${sede?.name ?? ""}`.trim(),
    branchId: sedeId,
    operatorId: session.operator.id,
  });

  revalidatePath("/admin/monedas");
  const nombre = monedaDelCatalogo(code)?.name ?? code;
  return {
    ok: true,
    mensaje: `${nombre} ya está en la lista de ${sede?.name ?? "la sede"}. Sus trabajadores pueden habilitarla en su caja cuando la necesiten.`,
  };
}

export async function retirarMonedaAction(
  _previo: ResultadoMoneda,
  formData: FormData,
): Promise<ResultadoMoneda> {
  const session = await getAdminSession();
  if (!session) return { ok: false, error: mensaje("monedas", "sesion-terminada") };

  const sedeId = String(formData.get("sede") ?? "");
  const code = String(formData.get("moneda") ?? "");

  const resultado = retirarMonedaDeSede(session.scope, sedeId, code, EFECTOS_EN_TASAS);
  if (!resultado.ok) {
    return { ok: false, error: motivo(resultado.reason, code, resultado.cajas) };
  }

  const sede = redEnAlcance(session.scope).sede(sedeId);
  const { cajas, tasas } = resultado.value;
  registrarEvento({
    actorId: session.user.id,
    actorName: session.user.fullName,
    actorRole: "admin-sede",
    type: "moneda-sede.retirada",
    subject:
      `${code} · ${sede?.name ?? ""}` +
      (cajas.length > 0 ? ` · quitada de ${enumerar(cajas)}` : "") +
      (tasas.length > 0 ? ` · tasas retiradas: ${enumerar(tasas)}` : ""),
    branchId: sedeId,
    operatorId: session.operator.id,
  });

  revalidatePath("/admin", "layout");
  const partes = [`${code} ya no está en la lista de ${sede?.name ?? "la sede"}.`];
  if (cajas.length > 0) partes.push(`Se quitó de ${enumerar(cajas)}.`);
  if (tasas.length > 0) {
    partes.push(
      tasas.length === 1
        ? `Su tasa se retiró y ya no aparece en el tablero.`
        : `Se retiraron las tasas de ${enumerar(tasas)} y ya no aparecen en el tablero.`,
    );
  }
  return { ok: true, mensaje: partes.join(" ") };
}
