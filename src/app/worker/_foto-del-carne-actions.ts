"use server";

import { networkInterfaces } from "node:os";

import { headers } from "next/headers";
import QRCode from "qrcode";

import {
  abrirCaptura,
  actualizarLoQueRecibe,
  estadoDeCaptura,
  type EstadoDeCaptura,
  type MotivoDeCaptura,
} from "@/features/network/fotos-del-carne";
import { getContextoDeTrabajo } from "@/features/worker/sesion-servidor";

/**
 * La caja abre la captura del carné y pregunta por ella. Ver
 * `features/network/fotos-del-carne.ts`.
 */

export interface CapturaAbierta {
  id: string;
  /** El enlace que abre el móvil. */
  url: string;
  /** El mismo enlace como QR, en SVG. */
  qr: string;
  vigenteHasta: string;
  /** Lo que recibe el beneficiario según la captura: la frase que firma. */
  recibe: string;
}

export async function abrirFotoDelCarneAction(
  motivo: MotivoDeCaptura,
): Promise<{ ok: true; value: CapturaAbierta } | { ok: false; reason: "sin-sesion" }> {
  const ctx = await getContextoDeTrabajo();
  if (!ctx) return { ok: false, reason: "sin-sesion" };
  const { id, vigenteHasta } = abrirCaptura({ workerId: ctx.worker.id, terminalId: ctx.terminal.id }, motivo);
  const url = `${await origen()}/movil/carne/${id}`;
  const qr = await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#0B132B", light: "#FFFFFF" } });
  return { ok: true, value: { id, url, qr, vigenteHasta, recibe: motivo.recibe } };
}

/** Cambió lo que se entrega: la firma anterior deja de valer y el móvil enseña la frase nueva. */
export async function actualizarLoQueRecibeAction(id: string, recibe: string): Promise<boolean> {
  const ctx = await getContextoDeTrabajo();
  if (!ctx) return false;
  return actualizarLoQueRecibe(id, ctx.worker.id, recibe);
}

export async function estadoFotoDelCarneAction(id: string): Promise<EstadoDeCaptura | null> {
  const ctx = await getContextoDeTrabajo();
  if (!ctx) return null;
  return estadoDeCaptura(id, ctx.worker.id);
}

/**
 * La dirección con la que el móvil llega a este mismo servidor.
 *
 * Es la que usa la caja, salvo que la caja esté abierta por `localhost`: en el
 * móvil, `localhost` es el propio móvil y el enlace no abriría nada. Entonces
 * se usa la IP del equipo en la red local, la que `next dev` anuncia como
 * «Network», para que el móvil, conectado a la misma red, llegue. En
 * producción la caja entra por el dominio de PuntoCash y esto no interviene.
 */
async function origen(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const [nombre, puerto] = host.split(":");
  if (nombre === "localhost" || nombre === "127.0.0.1") {
    const ip = ipDeLaRedLocal();
    if (ip) return `http://${ip}${puerto ? `:${puerto}` : ""}`;
  }
  const proto = h.get("x-forwarded-proto") ?? (/^\d+\.\d+\.\d+\.\d+$/.test(nombre ?? "") ? "http" : "https");
  return `${proto}://${host}`;
}

/** La primera IPv4 del equipo que no es la de bucle local. */
function ipDeLaRedLocal(): string | null {
  for (const direcciones of Object.values(networkInterfaces())) {
    for (const d of direcciones ?? []) {
      if (d.family === "IPv4" && !d.internal) return d.address;
    }
  }
  return null;
}
