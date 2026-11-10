"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  canjearAccesoPendiente,
  descartarAccesoPendiente,
  registrarAccesoPendiente,
} from "@/features/admin/pending-access";
import { DEMO_CODE } from "@/features/auth/two-factor";
import {
  abrirJornadaDeclarada,
  alcanzaParaEntregar,
  cerrarConArqueo,
  contextoDe,
  explicarCierre,
  declararConteoDeApertura,
  habilitarMoneda,
  registrarCambio,
  registrarOperacionSimple,
  type AperturaDeclarada,
  type CajaDenial,
  type ConteoPorBilletes,
  type ContextoDeCaja,
  type OperacionPorRegistrar,
} from "@/features/network/caja-operativa";
import type { Cotizacion } from "@/features/exchange/cotizacion";
import { emitirReto, findTerminalById, resolverTerminal } from "@/features/network/devices";
import { jornadaAbiertaDeCaja, type Jornada } from "@/features/network/jornadas";
import type { OperationClienteSnapshot, OperationRecord } from "@/features/operations/operations-history";
import { registrarContrasenaDeTrabajador, verificarCredencialesTrabajador } from "@/features/worker/acceso";
import {
  nuevoIdDeEquipo,
  WORKER_COOKIE_PATH,
  WORKER_DEVICE_COOKIE,
  WORKER_DEVICE_MAX_AGE_SECONDS,
  WORKER_PENDING_COOKIE,
  WORKER_SESSION_COOKIE,
  WORKER_SESSION_MAX_AGE_SECONDS,
  serializeWorkerSession,
} from "@/features/worker/sesion";
import { getContextoDeTrabajo } from "@/features/worker/sesion-servidor";
import { registroDeWorker } from "@/features/worker/vista";


/**
 * Las escrituras de `/worker`, todas en el servidor: el equipo, el acceso y
 * lo que el trabajador hace con su caja. Mismo reparto que `/admin`: las
 * cookies las escribe el servidor y cada escritura vuelve a resolver quién
 * opera y dónde antes de tocar nada.
 */

/* =========================================================================
 * El equipo
 * ====================================================================== */

export type EstadoDeEquipo =
  | { vinculado: true }
  | { vinculado: false; deviceId: string; codigo: string; expiresAt: string };

/**
 * Lo que pide la pantalla de vinculación: si este navegador todavía no es un
 * equipo, se le da un identificador; si no está vinculado, se emite (o
 * renueva) su reto de seis cifras, que es lo que teclea el administrador en
 * `/admin/equipos/vincular`.
 */
export async function prepararEquipo(): Promise<EstadoDeEquipo> {
  const store = await cookies();
  let deviceId = store.get(WORKER_DEVICE_COOKIE)?.value ?? null;
  if (!deviceId) {
    deviceId = nuevoIdDeEquipo();
    store.set(WORKER_DEVICE_COOKIE, deviceId, {
      path: WORKER_COOKIE_PATH,
      httpOnly: true,
      sameSite: "lax",
      maxAge: WORKER_DEVICE_MAX_AGE_SECONDS,
    });
  }
  const reto = emitirReto("caja", deviceId);
  if (!reto) return { vinculado: true };
  return { vinculado: false, deviceId, codigo: reto.code, expiresAt: reto.expiresAt };
}

/** Pregunta, sin escribir nada, si el administrador ya vinculó este equipo. */
export async function consultarEquipo(): Promise<boolean> {
  const store = await cookies();
  return resolverTerminal("caja", store.get(WORKER_DEVICE_COOKIE)?.value)?.status === "vinculado";
}

/**
 * **Solo en la demostración.** Hace que este navegador sea uno de los equipos
 * de caja que la red ya tiene vinculados, para poder operar en las sedes de
 * la demostración sin pasar por `/admin`. En el producto un equipo es la
 * máquina física: no se elige.
 */
export async function usarEquipoDeDemostracion(terminalId: string): Promise<void> {
  const terminal = findTerminalById(terminalId);
  if (!terminal || terminal.kind !== "caja") return;
  const store = await cookies();
  store.set(WORKER_DEVICE_COOKIE, terminal.id, {
    path: WORKER_COOKIE_PATH,
    httpOnly: true,
    sameSite: "lax",
    maxAge: WORKER_DEVICE_MAX_AGE_SECONDS,
  });
  store.delete({ name: WORKER_SESSION_COOKIE, path: WORKER_COOKIE_PATH });
  revalidatePath("/worker", "layout");
  redirect("/worker/login");
}

/* =========================================================================
 * El acceso
 * ====================================================================== */

export type WorkerLoginResult =
  | { status: "challenge-required"; correoEnmascarado: string }
  | { status: "invalid-credentials" }
  | { status: "other-branch" }
  | { status: "account-blocked" }
  | { status: "sede-sin-operar" }
  | { status: "network-error" };

/** Paso 1 (**FR-AUTH-1** a **FR-AUTH-9**): credenciales, en el servidor. */
export async function iniciarAccesoTrabajador(credentials: {
  identifier: string;
  password: string;
}): Promise<WorkerLoginResult> {
  const store = await cookies();
  const check = await verificarCredencialesTrabajador(credentials, store.get(WORKER_DEVICE_COOKIE)?.value ?? null);
  if (check.status !== "ok") return { status: check.status };

  const id = registrarAccesoPendiente(check.workerId, DEMO_CODE);
  store.set(WORKER_PENDING_COOKIE, id, { path: WORKER_COOKIE_PATH, httpOnly: true, sameSite: "lax", maxAge: 10 * 60 });
  return { status: "challenge-required", correoEnmascarado: check.correoEnmascarado };
}

/** Paso 2 **[R13]**: abre la sesión solo con el código del reto de esta cookie. */
export async function abrirSesionTrabajador(code: string): Promise<void> {
  const store = await cookies();
  const workerId = canjearAccesoPendiente(store.get(WORKER_PENDING_COOKIE)?.value, code);
  if (!workerId) return;
  store.delete({ name: WORKER_PENDING_COOKIE, path: WORKER_COOKIE_PATH });

  const terminalId = store.get(WORKER_DEVICE_COOKIE)?.value;
  if (!terminalId || !contextoDe({ workerId, terminalId }).ok) return;

  store.set(WORKER_SESSION_COOKIE, serializeWorkerSession({ workerId, terminalId }), {
    path: WORKER_COOKIE_PATH,
    httpOnly: true,
    sameSite: "lax",
    maxAge: WORKER_SESSION_MAX_AGE_SECONDS,
  });
  /* La jornada abierta de quien entra vuelve a tener a alguien delante. */
  const t = findTerminalById(terminalId);
  const j = t?.registerId ? jornadaAbiertaDeCaja(t.registerId) : null;
  if (j && j.workerId === workerId) j.sesionActiva = true;
}

export async function descartarAccesoTrabajador(): Promise<void> {
  const store = await cookies();
  descartarAccesoPendiente(store.get(WORKER_PENDING_COOKIE)?.value);
  store.delete({ name: WORKER_PENDING_COOKIE, path: WORKER_COOKIE_PATH });
}

export async function cerrarSesionTrabajador(): Promise<void> {
  const store = await cookies();
  const ctx = await getContextoDeTrabajo();
  if (ctx) {
    const j = jornadaAbiertaDeCaja(ctx.register.id);
    if (j && j.workerId === ctx.worker.id) j.sesionActiva = false;
  }
  store.delete({ name: WORKER_SESSION_COOKIE, path: WORKER_COOKIE_PATH });
  store.delete({ name: WORKER_PENDING_COOKIE, path: WORKER_COOKIE_PATH });
  redirect("/worker/login");
}

/** **Solo en la demostración**: lo fijado al recuperar la contraseña, al servidor. */
export async function guardarContrasenaTrabajadorAction(cuenta: string, contrasena: string): Promise<void> {
  registrarContrasenaDeTrabajador(cuenta, contrasena);
}

/* =========================================================================
 * La caja
 * ====================================================================== */

export type AccionDeCaja<T> =
  | { ok: true; value: T }
  | { ok: false; reason: CajaDenial | "sin-sesion"; currency?: string; cotizacion?: Cotizacion };

async function conCaja<T>(fn: (ctx: ContextoDeCaja) => AccionDeCaja<T>): Promise<AccionDeCaja<T>> {
  const ctx = await getContextoDeTrabajo();
  if (!ctx) return { ok: false, reason: "sin-sesion" };
  const r = fn(ctx);
  if (r.ok) revalidatePath("/worker", "layout");
  return r;
}

/** Un conteo por billete, como llega de la pantalla: por moneda, cuántos de cada denominación. */
type Conteo = readonly ConteoPorBilletes[];

/** La explicación de una diferencia: el supervisor viaja por su identificador de la lista. */
type Explicaciones = readonly { currency: string; motivo?: string; observaciones?: string; supervisorId?: string }[];

/** Declara el conteo de apertura: desde aquí ya no se cambia. */
export async function declararAperturaAction(conteos: Conteo): Promise<AccionDeCaja<AperturaDeclarada>> {
  return conCaja((ctx) => declararConteoDeApertura(ctx, conteos));
}

/** Abre con lo declarado; solo viajan los motivos de las diferencias. */
export async function abrirJornadaAction(explicaciones: Explicaciones): Promise<AccionDeCaja<{ openedAt: string }>> {
  return conCaja((ctx) => {
    const r = abrirJornadaDeclarada(ctx, explicaciones);
    return r.ok ? { ok: true, value: { openedAt: r.value.openedAt } } : r;
  });
}

export interface CierreRegistrado {
  jornadaId: string;
  openedAt: string;
  closedAt: string;
  /**
   * Lo contado y la diferencia; **sin el esperado**: Worker no ve el saldo en
   * libros. Si el total cuadró pero los billetes no, `composicion` dice qué
   * cambió por denominación.
   */
  monedas: readonly {
    currency: string;
    contado: number;
    diferencia: number;
    composicion?: Readonly<Record<string, number>>;
    motivo?: string;
    observaciones?: string;
    supervisor?: string;
  }[];
}

function aCierreRegistrado(j: Jornada): CierreRegistrado {
  return {
    jornadaId: j.id,
    openedAt: j.openedAt,
    closedAt: j.closedAt!,
    monedas: (j.arqueo?.monedas ?? []).map((a) => ({
      currency: a.currency,
      contado: a.contado,
      diferencia: a.diferencia,
      ...(a.composicion ? { composicion: a.composicion } : {}),
      ...(a.motivo ? { motivo: a.motivo } : {}),
      ...(a.observaciones ? { observaciones: a.observaciones } : {}),
      ...(a.supervisor ? { supervisor: a.supervisor } : {}),
    })),
  };
}

/**
 * Arqueo y cierre en un solo acto: el conteo, hecho a ciegas y billete a
 * billete, cierra la jornada en el momento de confirmarlo. Los motivos van
 * después.
 */
export async function cerrarConArqueoAction(conteos: Conteo): Promise<AccionDeCaja<CierreRegistrado>> {
  return conCaja((ctx) => {
    const r = cerrarConArqueo(ctx, conteos);
    return r.ok ? { ok: true, value: aCierreRegistrado(r.value) } : r;
  });
}

/** Los motivos de las diferencias del cierre que se acaba de hacer. */
export async function explicarCierreAction(jornadaId: string, explicaciones: Explicaciones): Promise<AccionDeCaja<CierreRegistrado>> {
  return conCaja((ctx) => {
    const r = explicarCierre(ctx, jornadaId, explicaciones);
    return r.ok ? { ok: true, value: aCierreRegistrado(r.value) } : r;
  });
}

/**
 * Sí o no: ¿puede la caja entregar este importe? Se pregunta solo en la
 * confirmación de una entrega a un proveedor externo (Remesas, Cobrar giro).
 *
 * **Para producción:** la llamada al proveedor debe hacerse dentro de la
 * misma acción de servidor que registra la operación, y esta pregunta
 * desaparecer: una acción que responde sí o no a cualquier importe permite,
 * con paciencia, acotar el saldo desde las herramientas del navegador.
 */
export async function alcanzaParaEntregarAction(currency: string, importe: number): Promise<boolean> {
  const ctx = await getContextoDeTrabajo();
  return ctx ? alcanzaParaEntregar(ctx, currency, importe) : false;
}

export async function habilitarMonedaAction(currency: string): Promise<AccionDeCaja<string>> {
  return conCaja((ctx) => habilitarMoneda(ctx, currency));
}

export async function registrarCambioAction(input: {
  cliente: OperationClienteSnapshot;
  sourceCurrency: string;
  destinationCurrency: string;
  sourceAmount: number;
  destinationAmountVisto: number;
}): Promise<AccionDeCaja<OperationRecord>> {
  return conCaja((ctx) => {
    const r = registrarCambio(ctx, input);
    return r.ok ? { ok: true, value: sinRed(r.value) } : r;
  });
}

export async function registrarOperacionAction(op: OperacionPorRegistrar): Promise<AccionDeCaja<OperationRecord>> {
  return conCaja((ctx) => {
    const r = registrarOperacionSimple(ctx, op);
    return r.ok ? { ok: true, value: sinRed(r.value) } : r;
  });
}

function sinRed(o: OperationRecord): OperationRecord {
  return registroDeWorker(o);
}
