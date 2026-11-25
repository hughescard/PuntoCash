"use server";

import { subirFirma, subirFotoDelCarne, type CaraDelCarne, type FirmaRechazada, type FotoRechazada } from "@/features/network/fotos-del-carne";

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

/** El beneficiario firma, en el móvil, la frase que tenía delante. */
export async function subirFirmaAction(
  id: string,
  frase: string,
  dataUrl: string,
): Promise<{ ok: true } | { ok: false; reason: FirmaRechazada }> {
  return subirFirma(id, frase, dataUrl);
}
