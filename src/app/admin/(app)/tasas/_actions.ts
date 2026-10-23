"use server";

import { revalidatePath } from "next/cache";

import { getAdminSession } from "@/features/admin/session-server";
import { registrarEvento } from "@/features/network/audit";
import {
  confirmarTasaAjustada,
  fijarTasa,
  retirarTasa,
  type TasaWriteDenial,
} from "@/features/network/rates";
import { redEnAlcance } from "@/features/network/scoped-reads";
import { formatAmount } from "@/lib/format";
import { mensaje } from "../mensajes";

/**
 * Las dos escrituras de Tasas — **FR-AD-TASA-5** a **FR-AD-TASA-16**.
 *
 * Revalidar aquí no es redundante con lo que la pantalla ya comprobó: entre
 * abrir el diálogo y confirmar, PuntoCash puede mover el rango o quitar el
 * servicio, y la tasa que se guarde tiene que caber en lo que rige **al
 * guardar** (**FR-AD-TASA-11**).
 */

export type ResultadoTasa = { ok: true; mensaje: string } | { ok: false; error: string } | null;


function motivo(reason: TasaWriteDenial, code: string): string {
  return mensaje("tasas", reason, { moneda: code });
}

/** «318,5» y «318.5» son lo mismo para quien teclea. */
function numero(valor: FormDataEntryValue | null): number {
  const texto = String(valor ?? "").trim().replace(/\s/g, "").replace(",", ".");
  return texto === "" ? Number.NaN : Number(texto);
}

export async function fijarTasaAction(
  _previo: ResultadoTasa,
  formData: FormData,
): Promise<ResultadoTasa> {
  const session = await getAdminSession();
  if (!session) return { ok: false, error: mensaje("tasas", "sesion-terminada") };

  const sedeId = String(formData.get("sede") ?? "");
  const code = String(formData.get("moneda") ?? "");

  const resultado = fijarTasa(session.scope, {
    sedeId,
    code,
    compra: numero(formData.get("compra")),
    venta: numero(formData.get("venta")),
    versionDelRango: String(formData.get("version") ?? ""),
    autor: session.user.fullName,
  });
  if (!resultado.ok) return { ok: false, error: motivo(resultado.reason, code) };

  const { tasa, anterior } = resultado.value;
  const sede = redEnAlcance(session.scope).sede(sedeId);
  const cifras = (c: number, v: number) => `${formatAmount(c, 2)} / ${formatAmount(v, 2)}`;

  registrarEvento({
    actorId: session.user.id,
    actorName: session.user.fullName,
    actorRole: "admin-sede",
    type: anterior ? "par.cambiado" : "par.definido",
    subject: `${code}/CUP · ${sede?.name ?? ""}`,
    ...(anterior ? { before: cifras(anterior.compra, anterior.venta) } : {}),
    after: cifras(tasa.compra, tasa.venta),
    branchId: sedeId,
    operatorId: session.operator.id,
  });

  revalidatePath("/admin", "layout");
  revalidatePath("/kiosk", "layout");
  return {
    ok: true,
    mensaje: `${sede?.name ?? "La sede"} cotiza ${code} a ${cifras(tasa.compra, tasa.venta)} desde ahora, y su tablero ya lo muestra.`,
  };
}

export async function confirmarTasaAjustadaAction(
  _previo: ResultadoTasa,
  formData: FormData,
): Promise<ResultadoTasa> {
  const session = await getAdminSession();
  if (!session) return { ok: false, error: mensaje("tasas", "sesion-terminada") };

  const sedeId = String(formData.get("sede") ?? "");
  const code = String(formData.get("moneda") ?? "");

  const resultado = confirmarTasaAjustada(session.scope, sedeId, code, session.user.fullName);
  if (!resultado.ok) return { ok: false, error: motivo(resultado.reason, code) };

  const sede = redEnAlcance(session.scope).sede(sedeId);
  const cifras = `${formatAmount(resultado.value.compra, 2)} / ${formatAmount(resultado.value.venta, 2)}`;
  registrarEvento({
    actorId: session.user.id,
    actorName: session.user.fullName,
    actorRole: "admin-sede",
    type: "par.cambiado",
    subject: `${code}/CUP · ${sede?.name ?? ""} · ajuste de PuntoCash confirmado`,
    before: cifras,
    after: cifras,
    branchId: sedeId,
    operatorId: session.operator.id,
  });

  revalidatePath("/admin", "layout");
  return { ok: true, mensaje: `${code} se queda en ${cifras}.` };
}

export async function retirarTasaAction(
  _previo: ResultadoTasa,
  formData: FormData,
): Promise<ResultadoTasa> {
  const session = await getAdminSession();
  if (!session) return { ok: false, error: mensaje("tasas", "sesion-terminada") };

  const sedeId = String(formData.get("sede") ?? "");
  const code = String(formData.get("moneda") ?? "");

  const resultado = retirarTasa(session.scope, sedeId, code);
  if (!resultado.ok) return { ok: false, error: motivo(resultado.reason, code) };

  const sede = redEnAlcance(session.scope).sede(sedeId);
  registrarEvento({
    actorId: session.user.id,
    actorName: session.user.fullName,
    actorRole: "admin-sede",
    type: "par.retirado",
    subject: `${code}/CUP · ${sede?.name ?? ""}`,
    branchId: sedeId,
    operatorId: session.operator.id,
    /* FR-AD-TASA-16: las cifras que se retiran, y que después no hay ninguna. */
    before: `${formatAmount(resultado.value.compra, 2)} / ${formatAmount(resultado.value.venta, 2)}`,
    after: "Sin tasa",
  });

  revalidatePath("/admin", "layout");
  revalidatePath("/kiosk", "layout");
  return {
    ok: true,
    mensaje: `${sede?.name ?? "La sede"} ya no cotiza ${code}, y ha desaparecido de su tablero. ${code} sigue en su lista de monedas.`,
  };
}
