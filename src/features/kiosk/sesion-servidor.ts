import { cache } from "react";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { estadoDeSede } from "@/features/network/assignments";
import { resolverTerminal, type Terminal, type TerminalSession } from "@/features/network/devices";
import { findSedeById, type Sede } from "@/features/network/sedes";
import { tasasVigentes } from "@/features/network/caja-operativa";
import { denominacionesDe } from "@/features/network/denominaciones";
import { monedaIso } from "@/features/network/iso-monedas";
import { monedasCotizables } from "@/features/exchange/cotizacion";
import { denominacionMinima } from "@/features/caja/pagos";
import { monedasDeSede } from "@/features/network/currencies";
import { menorDenominacion, tarifaDeGiro } from "@/features/network/tarifas";
import type { TarifaDeGiro } from "@/features/network/tarifas-reglas";
import type { CambioDeSede } from "./cambio";
import type { GiroDeSede } from "./giro";
import { KIOSK_SERVICES, type KioskServiceId } from "./kiosk-catalog";
import { KIOSK_DEVICE_COOKIE, KIOSK_LAST_BRANCH_COOKIE } from "./sesion";

/**
 * Lo que el kiosco sabe de sí mismo, preguntado a la red en cada petición.
 * Envuelto en `cache`: el layout y la pantalla lo piden por su lado y deben
 * ver lo mismo.
 */
export type KioscoEnRed =
  | { estado: "sin-vincular"; sesion: TerminalSession | null; desvinculadoDe: string | null }
  /** Vinculado, pero su sede no está operando: no se preparan solicitudes. */
  | { estado: "sede-sin-operar"; terminal: Terminal; sede: Sede }
  | { estado: "operando"; terminal: Terminal; sede: Sede; servicios: readonly KioskServiceId[] };

export const getKiosco = cache(async function getKiosco(): Promise<KioscoEnRed> {
  const store = await cookies();
  const sesion = resolverTerminal("kiosco", store.get(KIOSK_DEVICE_COOKIE)?.value);

  if (sesion?.status !== "vinculado") {
    const ultima = findSedeById(store.get(KIOSK_LAST_BRANCH_COOKIE)?.value);
    return { estado: "sin-vincular", sesion, desvinculadoDe: ultima?.name ?? null };
  }

  const terminal = sesion.terminal;
  const sede = findSedeById(terminal.branchId);
  if (!sede || estadoDeSede(sede) !== "activa") {
    /* Una sede que desapareció no debería existir; si pasa, el kiosco se
       comporta como sin vincular, que es lo único honrado que puede decir. */
    if (!sede) return { estado: "sin-vincular", sesion: null, desvinculadoDe: null };
    return { estado: "sede-sin-operar", terminal, sede };
  }

  const servicios = KIOSK_SERVICES.map((s) => s.id).filter((id) => sede.services.includes(id));
  return { estado: "operando", terminal, sede, servicios };
});

/**
 * Lo que el kiosco compara para saber si tiene que volver a pintarse: cambia
 * si lo vinculan o desvinculan, si su sede deja de operar o vuelve, y si le
 * dan o le quitan un servicio.
 */
export function huellaDeKiosco(kiosco: KioscoEnRed): string {
  if (kiosco.estado === "sin-vincular") return "sin-vincular";
  if (kiosco.estado === "sede-sin-operar") return `sin-operar:${kiosco.sede.id}`;
  return `operando:${kiosco.sede.id}:${kiosco.servicios.join(",")}`;
}

/**
 * Un servicio que la sede del kiosco no ofrece no existe para el kiosco: ni en
 * el inicio ni por su dirección, que responde 404. Si el kiosco no opera, el
 * layout ya muestra otra cosa y aquí no hay nada que decidir.
 */
export async function exigirServicioDeKiosco(servicio: KioskServiceId): Promise<void> {
  const kiosco = await getKiosco();
  if (kiosco.estado === "operando" && !kiosco.servicios.includes(servicio)) {
    notFound();
  }
}

/**
 * Lo que el cambio de moneda del kiosco necesita de su sede: las tasas en
 * vigor —las mismas que aplica la caja—, las monedas que con ellas se pueden
 * cambiar y la denominación más pequeña de cada una.
 */
export function cambioDeSede(sedeId: string): CambioDeSede {
  const tasas = tasasVigentes(sedeId);
  const codigos = monedasCotizables(tasas);
  return {
    tasas,
    monedas: codigos.map((code) => ({ code, name: monedaIso(code)?.name ?? code })),
    pasos: Object.fromEntries(codigos.map((code) => [code, denominacionMinima(denominacionesDe(code))])),
  };
}

/**
 * Lo que el envío de giros del kiosco necesita de su sede: las monedas que la
 * sede maneja y en las que PuntoCash puso tarifa, con su tarifa y su
 * denominación más pequeña.
 */
export function giroDeSede(sedeId: string): GiroDeSede {
  const monedas: { code: string; name: string }[] = [];
  const tarifas: Record<string, Pick<TarifaDeGiro, "minimo" | "tramos">> = {};
  const menores: Record<string, number> = {};
  for (const { code } of monedasDeSede(sedeId)) {
    const tarifa = tarifaDeGiro(code);
    const menor = menorDenominacion(code);
    if (!tarifa || menor === null) continue;
    monedas.push({ code, name: monedaIso(code)?.name ?? code });
    tarifas[code] = { minimo: tarifa.minimo, tramos: tarifa.tramos };
    menores[code] = menor;
  }
  return { monedas, tarifas, menores };
}
