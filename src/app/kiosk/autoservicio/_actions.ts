"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { emitirReto, findTerminalById, marcarActividad } from "@/features/network/devices";
import { registrarSolicitudDeKiosco } from "@/features/network/solicitudes-de-kiosco";
import type { KioskServiceId } from "@/features/kiosk/kiosk-catalog";
import type { KioskRequest, KioskRequestInput } from "@/features/kiosk/self-service-request";
import {
  KIOSK_COOKIE_PATH,
  KIOSK_DEVICE_COOKIE,
  KIOSK_DEVICE_MAX_AGE_SECONDS,
  KIOSK_LAST_BRANCH_COOKIE,
  nuevoIdDeKiosco,
} from "@/features/kiosk/sesion";
import { cambioDeSede, getKiosco, giroDeSede, huellaDeKiosco } from "@/features/kiosk/sesion-servidor";
import { cotizarGiroEnKiosco, resumenDeGiro } from "@/features/kiosk/giro";
import { cotizarEnKiosco, noSePuedeCobrar } from "@/features/kiosk/cambio";

/**
 * Las escrituras del kiosco de autoservicio, todas en el servidor. Mismo
 * reparto que `/worker`: el equipo se nombra con una cookie, y lo que es —a
 * qué sede pertenece, si opera, qué servicios ofrece— lo contesta la red.
 */

const COOKIE = { path: KIOSK_COOKIE_PATH, httpOnly: true, sameSite: "lax" as const, maxAge: KIOSK_DEVICE_MAX_AGE_SECONDS };

/* =========================================================================
 * El equipo
 * ====================================================================== */

export type EstadoDeKiosco =
  | { vinculado: true }
  | { vinculado: false; deviceId: string; codigo: string; expiresAt: string };

/**
 * Lo que pide la pantalla de vinculación: si este navegador todavía no es un
 * equipo, se le da un identificador; si no está vinculado, se emite (o
 * renueva) su reto de seis cifras, el que teclea el administrador en
 * `/admin/equipos/vincular`.
 */
export async function prepararKiosco(): Promise<EstadoDeKiosco> {
  const store = await cookies();
  let deviceId = store.get(KIOSK_DEVICE_COOKIE)?.value ?? null;
  if (!deviceId) {
    deviceId = nuevoIdDeKiosco();
    store.set(KIOSK_DEVICE_COOKIE, deviceId, COOKIE);
  }
  const reto = emitirReto("kiosco", deviceId);
  if (!reto) return { vinculado: true };
  return { vinculado: false, deviceId, codigo: reto.code, expiresAt: reto.expiresAt };
}

/**
 * Lo que el kiosco pregunta cada pocos segundos, vinculado o no: qué es ahora.
 * La pantalla compara con lo que está mostrando y, si cambió —lo vincularon,
 * lo desvincularon, su sede dejó de operar o le quitaron un servicio—, se
 * vuelve a pintar. De paso deja constancia de que el equipo está vivo y de a
 * qué sede pertenece, para poder decir de dónde lo desvincularon.
 */
export async function consultarKiosco(): Promise<string> {
  const kiosco = await getKiosco();
  if (kiosco.estado === "sin-vincular") return huellaDeKiosco(kiosco);

  marcarActividad(kiosco.terminal.id);
  const store = await cookies();
  if (store.get(KIOSK_LAST_BRANCH_COOKIE)?.value !== kiosco.sede.id) {
    store.set(KIOSK_LAST_BRANCH_COOKIE, kiosco.sede.id, COOKIE);
  }
  return huellaDeKiosco(kiosco);
}

/**
 * **Solo en la demostración.** Hace que este navegador sea uno de los kioscos
 * que la red ya tiene vinculados. En el producto un kiosco es la máquina de la
 * sala: no se elige.
 */
export async function usarKioscoDeDemostracion(terminalId: string): Promise<void> {
  const terminal = findTerminalById(terminalId);
  if (!terminal || terminal.kind !== "kiosco") return;
  const store = await cookies();
  store.set(KIOSK_DEVICE_COOKIE, terminal.id, COOKIE);
  store.set(KIOSK_LAST_BRANCH_COOKIE, terminal.branchId, COOKIE);
  revalidatePath("/kiosk/autoservicio", "layout");
  redirect("/kiosk/autoservicio");
}

/* =========================================================================
 * Las solicitudes
 * ====================================================================== */

const SERVICIO_DE: Record<KioskRequestInput["service"], KioskServiceId> = {
  "cambio-moneda": "cambio-moneda",
  remesas: "remesas",
  "giros-enviar": "giros",
  "giros-cobrar": "giros",
};

export type RegistroDeSolicitud =
  | { ok: true; solicitud: KioskRequest }
  /**
   * La tasa o la tarifa (o los billetes que circulan) cambiaron mientras el
   * cliente preparaba la solicitud: lo que vio ya no es lo que se aplicaría.
   * No se registra; la pantalla vuelve al paso del importe con la cuenta nueva.
   */
  | { ok: false; motivo: "cotizacion-cambiada" }
  /**
   * El kiosco ya no puede preparar esta solicitud: lo desvincularon, su sede
   * dejó de operar o le quitaron el servicio mientras el cliente escribía. La
   * pantalla se vuelve a pintar y muestra lo que corresponda.
   */
  | { ok: false; motivo?: undefined };

/**
 * Registra lo que el cliente preparó. Lo que el kiosco envía son solo los
 * datos: la sede y el kiosco salen del vínculo, y se vuelve a comprobar aquí
 * que la sede opera y ofrece el servicio, porque pudo cambiar después de que
 * el cliente empezara.
 */
export async function registrarSolicitud(input: KioskRequestInput): Promise<RegistroDeSolicitud> {
  const kiosco = await getKiosco();
  if (kiosco.estado !== "operando" || !kiosco.servicios.includes(SERVICIO_DE[input.service])) {
    revalidatePath("/kiosk/autoservicio", "layout");
    return { ok: false };
  }

  /* El cambio se vuelve a cotizar aquí con las tasas de la sede: lo que se
     registra es lo que dice la red, no lo que mandó la pantalla. */
  let datos = input;
  if (input.service === "cambio-moneda") {
    const { quote, modo = "cambiar", importePedido } = input.data;
    const cambio = cambioDeSede(kiosco.sede.id);
    const pedido = importePedido ?? (modo === "recibir" ? quote.destinationAmount : quote.sourceAmount);
    if (modo === "cambiar" && noSePuedeCobrar(pedido, cambio.pasos[quote.sourceCurrency])) return { ok: false, motivo: "cotizacion-cambiada" };
    const ahora = cotizarEnKiosco(cambio, modo, quote.sourceCurrency, quote.destinationCurrency, pedido);
    if (
      !ahora ||
      Math.abs(ahora.sourceAmount - quote.sourceAmount) > 0.004 ||
      Math.abs(ahora.destinationAmount - quote.destinationAmount) > 0.004
    ) {
      return { ok: false, motivo: "cotizacion-cambiada" };
    }
    datos = { service: "cambio-moneda", data: { ...input.data, quote: ahora, modo, importePedido: pedido } };
  }

  /* Igual con el giro: la tarifa la pone la red. Si la cuenta que vio el
     cliente ya no es la que saldría, no se registra. */
  if (input.service === "giros-enviar") {
    const { senderCurrency, deliveryAmount, forma = "llegar", cotizacion } = input.data;
    const ahora = cotizarGiroEnKiosco(giroDeSede(kiosco.sede.id), senderCurrency, forma, deliveryAmount);
    if (!ahora.ok) return { ok: false, motivo: "cotizacion-cambiada" };
    const resumen = resumenDeGiro(ahora.value);
    if (
      !cotizacion ||
      Math.abs(resumen.giro - cotizacion.giro) > 0.004 ||
      Math.abs(resumen.total - cotizacion.total) > 0.004
    ) {
      return { ok: false, motivo: "cotizacion-cambiada" };
    }
    datos = { service: "giros-enviar", data: { ...input.data, forma, cotizacion: resumen } };
  }

  const solicitud = registrarSolicitudDeKiosco(
    { branchId: kiosco.sede.id, deviceId: kiosco.terminal.id },
    datos,
  );
  return { ok: true, solicitud };
}
