"use server";

import { revalidatePath } from "next/cache";

import { getAdminSession } from "@/features/admin/session-server";
import { darPorVistoAvisoDeTarifa } from "@/features/network/tarifas";
import { mensaje } from "../mensajes";

/**
 * La única escritura de Tarifas en Admin de sede: decir que alguien de la
 * empresa se ha enterado de lo que PuntoCash hizo con una tarifa. Las
 * tarifas no se cambian desde aquí.
 */

export type ResultadoAviso = { ok: true; mensaje: string } | { ok: false; error: string } | null;

export async function darPorVistoAvisoAction(_previo: ResultadoAviso, formData: FormData): Promise<ResultadoAviso> {
  const session = await getAdminSession();
  if (!session) return { ok: false, error: mensaje("tarifas", "sesion-terminada") };

  const moneda = String(formData.get("moneda") ?? "");
  const sedes = formData.getAll("sede").map(String);

  const r = darPorVistoAvisoDeTarifa(session.scope, sedes, moneda);
  if (!r.ok) return { ok: false, error: mensaje("tarifas", r.reason) };

  revalidatePath("/admin", "layout");
  return { ok: true, mensaje: `Aviso de ${moneda} visto.` };
}
