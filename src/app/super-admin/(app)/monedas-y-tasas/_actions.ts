"use server";

import { revalidatePath } from "next/cache";

import { registrarEvento } from "@/features/network/audit";
import { asignacionVigente } from "@/features/network/assignments";
import { monedaDelCatalogo } from "@/features/network/currencies";
import { definirRango, retirarRango, sedesConTasa, type RangoWriteDenial } from "@/features/network/rates";
import { isMotivoValido, MOTIVO_MIN_LENGTH } from "@/features/network/sedes";
import { getSuperAdminSession } from "@/features/super-admin/session-server";

/**
 * Las escrituras de Monedas y tasas: definir, cambiar y retirar el rango de
 * una moneda contra el CUP. El catálogo de monedas es fijo (decisión del
 * 28/10): PuntoCash no añade ni retira monedas, solo rangos.
 */

export type ResultadoRango = { ok: true; mensaje: string } | { ok: false; error: string } | null;

const MENSAJE: Record<RangoWriteDenial, string> = {
  "alcance-insuficiente": "Esta acción solo la puede hacer PuntoCash.",
  "moneda-local": "El peso cubano es la moneda contra la que se cotiza todo: no lleva rango.",
  "moneda-desconocida": "Esa moneda no está en el catálogo.",
  "valor-invalido": "Introduce un valor válido.",
  "minimo-mayor": "El mínimo debe ser menor que el máximo.",
  "rango-incoherente":
    "La compra no puede quedar por encima de la venta: la compra mínima tiene que ser menor o igual que la venta mínima, y la compra máxima, menor o igual que la venta máxima.",
  "sin-rango": "Esta moneda ya no tiene rango. Recarga para ver su estado.",
};

/** «318,5» o «318.5» → 318.5. Lo vacío o lo que no es número, NaN. */
function cifra(v: FormDataEntryValue | null): number {
  const t = String(v ?? "").trim().replace(",", ".");
  return t === "" ? Number.NaN : Number(t);
}

const intervalo = (i: { min: number; max: number }) => `${i.min}–${i.max}`;

export async function definirRangoAction(_p: ResultadoRango, formData: FormData): Promise<ResultadoRango> {
  const session = await getSuperAdminSession();
  if (!session) return { ok: false, error: "Tu sesión ha terminado. Vuelve a entrar." };

  const code = String(formData.get("moneda") ?? "");
  const moneda = monedaDelCatalogo(code);
  const compra = { min: cifra(formData.get("compra-min")), max: cifra(formData.get("compra-max")) };
  const venta = { min: cifra(formData.get("venta-min")), max: cifra(formData.get("venta-max")) };

  const r = definirRango(session.scope, { code, compra, venta, autor: session.user.fullName });
  if (!r.ok) return { ok: false, error: MENSAJE[r.reason] };

  const { anterior, ajustes } = r.value;
  registrarEvento({
    actorId: session.user.id,
    actorName: session.user.fullName,
    actorRole: "super-admin",
    type: anterior ? "rango.cambiado" : "rango.definido",
    subject: `${code} · ${moneda?.name ?? code}`,
    before: anterior ? `Compra ${intervalo(anterior.compra)} · Venta ${intervalo(anterior.venta)}` : "Sin rango",
    after: `Compra ${intervalo(compra)} · Venta ${intervalo(venta)}`,
  });
  /* Cada tasa ajustada, su propio evento (FR-SA-TASA-7). */
  for (const a of ajustes) {
    registrarEvento({
      actorId: session.user.id,
      actorName: session.user.fullName,
      actorRole: "super-admin",
      type: "tasa.fijada-al-limite",
      subject: `${a.sedeNombre} · ${code}`,
      branchId: a.sedeId,
      operatorId: asignacionVigente(a.sedeId)?.operatorId,
      before: `Compra ${a.antes.compra} · Venta ${a.antes.venta}`,
      after: `Compra ${a.despues.compra} · Venta ${a.despues.venta}`,
    });
  }
  revalidatePath("/super-admin", "layout");

  const base = anterior ? `Rango del ${code} cambiado.` : `Rango del ${code} definido: las sedes que lo tienen en su lista ya pueden cotizarlo.`;
  return {
    ok: true,
    mensaje:
      ajustes.length === 0
        ? base
        : `${base} ${ajustes.length === 1 ? "Una sede tenía" : `${ajustes.length} sedes tenían`} la tasa fuera del rango y se ${ajustes.length === 1 ? "fijó" : "fijaron"} al límite: ${ajustes.map((a) => a.sedeNombre).join(", ")}.`,
  };
}

export async function retirarRangoAction(_p: ResultadoRango, formData: FormData): Promise<ResultadoRango> {
  const session = await getSuperAdminSession();
  if (!session) return { ok: false, error: "Tu sesión ha terminado. Vuelve a entrar." };
  const code = String(formData.get("moneda") ?? "");
  const motivo = String(formData.get("motivo") ?? "").trim();
  if (!isMotivoValido(motivo)) return { ok: false, error: `Escribe el motivo: al menos ${MOTIVO_MIN_LENGTH} caracteres.` };

  const afectadas = sedesConTasa(code).length;
  const r = retirarRango(session.scope, code);
  if (!r.ok) return { ok: false, error: MENSAJE[r.reason] };

  registrarEvento({
    actorId: session.user.id,
    actorName: session.user.fullName,
    actorRole: "super-admin",
    type: "rango.retirado",
    subject: `${code} · ${monedaDelCatalogo(code)?.name ?? code}`,
    reason: motivo,
    before: `Compra ${intervalo(r.value.compra)} · Venta ${intervalo(r.value.venta)}`,
    after: `Sin rango · ${afectadas} ${afectadas === 1 ? "sede deja" : "sedes dejan"} de cotizarlo`,
  });
  revalidatePath("/super-admin", "layout");
  return { ok: true, mensaje: `Rango del ${code} retirado. Ninguna sede puede cotizarlo hasta que se defina de nuevo.` };
}
