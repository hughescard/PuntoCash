import { cache } from "react";
import { cookies } from "next/headers";

import { contextoDe, estadoDeCaja, type ContextoDeCaja } from "@/features/network/caja-operativa";
import { idDeEquipo, resolverTerminal, type TerminalSession } from "@/features/network/devices";
import { parseWorkerSession, WORKER_DEVICE_COOKIE, WORKER_SESSION_COOKIE } from "./sesion";
import { armarVista, type VistaDeCaja } from "./vista";

/**
 * Las lecturas de sesión de Worker desde el servidor. Aparte de `sesion.ts`
 * porque `next/headers` solo existe aquí. Envueltas en `cache`: el layout y
 * la pantalla las piden por su lado y deben ver lo mismo en una petición.
 */

/** Qué equipo es este navegador, y si la red lo tiene vinculado como caja. */
export const getEquipo = cache(async function getEquipo(): Promise<{
  codigo: string | null;
  sesion: TerminalSession | null;
}> {
  const store = await cookies();
  const codigo = store.get(WORKER_DEVICE_COOKIE)?.value ?? null;
  return { codigo, sesion: resolverTerminal("caja", codigo) };
});

/** Quién opera y en qué caja, o `null` si no hay sesión válida. */
export const getContextoDeTrabajo = cache(async function getContextoDeTrabajo(): Promise<ContextoDeCaja | null> {
  const store = await cookies();
  const payload = parseWorkerSession(store.get(WORKER_SESSION_COOKIE)?.value);
  if (!payload) return null;
  /* La sesión es de un equipo: si este navegador ya es otro equipo, no vale. */
  if (idDeEquipo("caja", store.get(WORKER_DEVICE_COOKIE)?.value) !== payload.terminalId) return null;
  const ctx = contextoDe(payload);
  return ctx.ok ? ctx.value : null;
});

export const getVistaDeCaja = cache(async function getVistaDeCaja(): Promise<VistaDeCaja | null> {
  const ctx = await getContextoDeTrabajo();
  return ctx ? armarVista(ctx, estadoDeCaja(ctx)) : null;
});
