"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { registrarEvento } from "@/features/network/audit";
import { monedaDelCatalogo } from "@/features/network/currencies";
import { MOTIVO_MIN_LENGTH } from "@/features/network/sedes";
import {
  definirTarifaDeGiro,
  resumenDeTarifa,
  retirarTarifaDeGiro,
  type TramoDeTarifa,
} from "@/features/network/tarifas";
import { getSuperAdminSession } from "@/features/super-admin/session-server";
import { formatAmount } from "@/lib/format";
import { mensajeDeTarifa } from "./mensajes";

/**
 * Las escrituras de Tarifas: definir, cambiar y retirar la tarifa de giros de
 * una moneda. Solo PuntoCash; cada una deja su línea en la auditoría.
 */

export type ResultadoTarifa = { ok: true; mensaje: string } | { ok: false; error: string; tramo?: number } | null;

/** «2,5» o «2.5» → 2.5. Lo vacío o lo que no es número, NaN. */
function cifra(v: FormDataEntryValue | null): number {
  const t = String(v ?? "").trim().replace(/\s/g, "").replace(",", ".");
  return t === "" ? Number.NaN : Number(t);
}

const cifraDeAuditoria = (v: number) => formatAmount(v, 2);

export async function guardarTarifaDeGiroAction(_p: ResultadoTarifa, formData: FormData): Promise<ResultadoTarifa> {
  const session = await getSuperAdminSession();
  if (!session) return { ok: false, error: "Tu sesión ha terminado. Vuelve a entrar." };

  const code = String(formData.get("moneda") ?? "");
  const cuantos = Number(formData.get("tramos") ?? 0);
  const tramos: TramoDeTarifa[] = Array.from({ length: Number.isInteger(cuantos) ? cuantos : 0 }, (_, i) => ({
    hasta: i === cuantos - 1 ? null : cifra(formData.get(`tramo-${i}-hasta`)),
    fijo: cifra(formData.get(`tramo-${i}-fijo`)),
    porcentaje: cifra(formData.get(`tramo-${i}-porcentaje`)),
  }));
  const minimo = cifra(formData.get("minimo"));
  const motivo = String(formData.get("motivo") ?? "").trim();

  const r = definirTarifaDeGiro(session.scope, { moneda: code, minimo, tramos, autor: session.user.fullName, motivo });
  if (!r.ok) {
    return {
      ok: false,
      error: mensajeDeTarifa(r.error, code, MOTIVO_MIN_LENGTH),
      ...(r.error.tramo === undefined ? {} : { tramo: r.error.tramo }),
    };
  }

  const { tarifa, anterior } = r.value;
  registrarEvento({
    actorId: session.user.id,
    actorName: session.user.fullName,
    actorRole: "super-admin",
    type: anterior ? "tarifa-giro.cambiada" : "tarifa-giro.definida",
    subject: `Giros en ${code} · ${monedaDelCatalogo(code)?.name ?? code}`,
    before: anterior ? resumenDeTarifa(anterior, cifraDeAuditoria) : "Sin tarifa: no se enviaban giros en esta moneda",
    after: resumenDeTarifa(tarifa, cifraDeAuditoria),
    ...(anterior ? { reason: motivo } : {}),
  });
  revalidatePath("/super-admin", "layout");
  redirect(`/super-admin/tarifas/giros?guardada=${encodeURIComponent(code)}${anterior ? "" : "&nueva=1"}`);
}

export async function retirarTarifaDeGiroAction(_p: ResultadoTarifa, formData: FormData): Promise<ResultadoTarifa> {
  const session = await getSuperAdminSession();
  if (!session) return { ok: false, error: "Tu sesión ha terminado. Vuelve a entrar." };
  const code = String(formData.get("moneda") ?? "");
  const motivo = String(formData.get("motivo") ?? "").trim();

  const r = retirarTarifaDeGiro(session.scope, code, motivo);
  if (!r.ok) return { ok: false, error: mensajeDeTarifa(r.error, code, MOTIVO_MIN_LENGTH) };

  registrarEvento({
    actorId: session.user.id,
    actorName: session.user.fullName,
    actorRole: "super-admin",
    type: "tarifa-giro.retirada",
    subject: `Giros en ${code} · ${monedaDelCatalogo(code)?.name ?? code}`,
    reason: motivo,
    before: resumenDeTarifa(r.value, cifraDeAuditoria),
    after: "Sin tarifa: no se envían giros en esta moneda",
  });
  revalidatePath("/super-admin", "layout");
  return { ok: true, mensaje: `Tarifa de giros en ${code} retirada. No se pueden enviar giros en ${code} hasta que se defina de nuevo.` };
}
