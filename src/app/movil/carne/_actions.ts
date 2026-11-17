"use server";

import { subirFotoDelCarne, type CaraDelCarne, type FotoRechazada } from "@/features/network/fotos-del-carne";

/**
 * El móvil sube una cara del carné. Sin sesión: el enlace es la credencial,
 * y el dominio comprueba que siga vivo y sea de la entrega que se confirma.
 */
export async function subirFotoDelCarneAction(
  id: string,
  cara: CaraDelCarne,
  dataUrl: string,
): Promise<{ ok: true; tomadas: readonly CaraDelCarne[] } | { ok: false; reason: FotoRechazada }> {
  const r = subirFotoDelCarne(id, cara, dataUrl);
  return r.ok ? { ok: true, tomadas: r.value.tomadas } : r;
}
