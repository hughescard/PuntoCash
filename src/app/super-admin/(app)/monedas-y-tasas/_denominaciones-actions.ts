"use server";

import { revalidatePath } from "next/cache";

import { registrarEvento } from "@/features/network/audit";
import { monedaDelCatalogo } from "@/features/network/currencies";
import {
  anadirDenominacion,
  reincorporarDenominacion,
  retirarDenominacion,
  type DenominacionWriteDenial,
} from "@/features/network/denominaciones";
import { formatoDeDenominacion } from "@/features/caja/billetes";
import { GUARDA_DE_TARIFAS, retiroQueImpideLaTarifa } from "@/features/network/tarifas";
import { isMotivoValido, MOTIVO_MIN_LENGTH } from "@/features/network/sedes";
import { getSuperAdminSession } from "@/features/super-admin/session-server";

/**
 * El catálogo de denominaciones: qué billetes y monedas de cada divisa
 * aceptan y entregan las cajas de toda la red. Lo mantiene PuntoCash.
 */

export type ResultadoDenominacion = { ok: true; mensaje: string } | { ok: false; error: string } | null;

const MENSAJE: Record<DenominacionWriteDenial, string> = {
  "alcance-insuficiente": "Esta acción solo la puede hacer PuntoCash.",
  "valor-invalido": "Introduce un valor mayor que cero.",
  "demasiados-decimales": "Una denominación admite hasta 2 decimales.",
  "ya-existe": "Esa denominación ya está en el catálogo.",
  "esta-retirada": "Esa denominación existe pero está retirada: reincorpórala desde su ficha.",
  "no-existe": "Esa denominación no está en el catálogo. Recarga para ver su estado.",
  "ya-retirada": "Esa denominación ya está retirada. Recarga para ver su estado.",
  "no-esta-retirada": "Esa denominación ya se acepta. Recarga para ver su estado.",
  "la-usa-una-tarifa": "La tarifa de giros de esta moneda dejaría de poder cobrarse. Corrígela antes en Tarifas.",
};

function cifra(v: FormDataEntryValue | null): number {
  const t = String(v ?? "").trim().replace(",", ".");
  return t === "" ? Number.NaN : Number(t);
}

const nombre = (tipo: "billete" | "moneda", valor: number, code: string) =>
  `${tipo === "billete" ? "Billete" : "Moneda"} de ${formatoDeDenominacion(valor)} ${code}`;

function revalidar() {
  revalidatePath("/super-admin", "layout");
  revalidatePath("/admin", "layout");
  revalidatePath("/worker", "layout");
}

export async function anadirDenominacionAction(_p: ResultadoDenominacion, formData: FormData): Promise<ResultadoDenominacion> {
  const session = await getSuperAdminSession();
  if (!session) return { ok: false, error: "Tu sesión ha terminado. Vuelve a entrar." };
  const code = String(formData.get("moneda") ?? "");
  if (!monedaDelCatalogo(code)) return { ok: false, error: "Esa moneda no está en el catálogo." };
  const tipo = formData.get("tipo") === "moneda" ? "moneda" : "billete";
  const valor = cifra(formData.get("valor"));

  const r = anadirDenominacion(session.scope, code, { valor, tipo });
  if (!r.ok) return { ok: false, error: MENSAJE[r.reason] };

  registrarEvento({
    actorId: session.user.id,
    actorName: session.user.fullName,
    actorRole: "super-admin",
    type: "denominacion.alta",
    subject: nombre(tipo, valor, code),
    before: "No estaba en el catálogo",
    after: "Se acepta y se entrega en todas las cajas",
  });
  revalidar();
  return { ok: true, mensaje: `${nombre(tipo, valor, code)} en el catálogo: desde ahora las cajas lo aceptan del cliente y lo entregan.` };
}

export async function retirarDenominacionAction(_p: ResultadoDenominacion, formData: FormData): Promise<ResultadoDenominacion> {
  const session = await getSuperAdminSession();
  if (!session) return { ok: false, error: "Tu sesión ha terminado. Vuelve a entrar." };
  const code = String(formData.get("moneda") ?? "");
  const valor = cifra(formData.get("valor"));
  const motivo = String(formData.get("motivo") ?? "").trim();
  if (!isMotivoValido(motivo)) return { ok: false, error: `Escribe el motivo: al menos ${MOTIVO_MIN_LENGTH} caracteres.` };

  const r = retirarDenominacion(session.scope, code, valor, new Date(), GUARDA_DE_TARIFAS);
  if (!r.ok) {
    const que = r.reason === "la-usa-una-tarifa" ? retiroQueImpideLaTarifa(code, valor) : null;
    return {
      ok: false,
      error: que ? `Sin esta denominación no se podría cobrar ${que.join(", ")} de la tarifa de giros en ${code}. Corrígela antes en Tarifas.` : MENSAJE[r.reason],
    };
  }

  registrarEvento({
    actorId: session.user.id,
    actorName: session.user.fullName,
    actorRole: "super-admin",
    type: "denominacion.retirada",
    subject: nombre(r.value.tipo, valor, code),
    reason: motivo,
    before: "Se acepta y se entrega",
    after: "Retirada: ni se acepta ni se entrega",
  });
  revalidar();
  return {
    ok: true,
    mensaje: `${nombre(r.value.tipo, valor, code)} fuera del catálogo. Las cajas que tengan unidades las conservan en su inventario hasta que se retiren de la caja.`,
  };
}

export async function reincorporarDenominacionAction(_p: ResultadoDenominacion, formData: FormData): Promise<ResultadoDenominacion> {
  const session = await getSuperAdminSession();
  if (!session) return { ok: false, error: "Tu sesión ha terminado. Vuelve a entrar." };
  const code = String(formData.get("moneda") ?? "");
  const valor = cifra(formData.get("valor"));

  const r = reincorporarDenominacion(session.scope, code, valor);
  if (!r.ok) return { ok: false, error: MENSAJE[r.reason] };

  registrarEvento({
    actorId: session.user.id,
    actorName: session.user.fullName,
    actorRole: "super-admin",
    type: "denominacion.reincorporada",
    subject: nombre(r.value.tipo, valor, code),
    before: "Retirada",
    after: "Se acepta y se entrega",
  });
  revalidar();
  return { ok: true, mensaje: `${nombre(r.value.tipo, valor, code)} vuelve a aceptarse y entregarse en todas las cajas.` };
}
