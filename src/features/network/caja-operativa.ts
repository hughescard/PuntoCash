/**
 * LA CAJA QUE OPERA UN TRABAJADOR — Worker escribe aquí.
 *
 * Hasta la segunda iteración de Worker, el trabajador operaba una caja
 * simulada en su navegador y la administración miraba otra, sembrada en el
 * servidor: lo que hacía uno no lo veía el otro. Desde aquí, **Worker abre,
 * opera, ajusta y cierra las mismas jornadas que consultan Admin y Super
 * Admin**, y de cada diferencia nace su solicitud de aprobación.
 *
 * Todo pasa por una `SesionDeCaja`: quién opera y en qué caja. La caja no la
 * elige el trabajador: es la del equipo en el que inició sesión (**FR-DEV-1**).
 *
 * ── Reglas que viven aquí, no en la pantalla ──────────────────────────────
 *   · Ninguna operación sin jornada abierta **[R1]**.
 *   · El saldo de una moneda nunca queda negativo (**FR-CAJA-30**).
 *   · Un servicio que PuntoCash no habilitó en la sede no se presta.
 *   · Un cambio se cotiza con las tasas **en vigor** de la sede, y el servidor
 *     vuelve a cotizarlo al confirmar: la cifra de la pantalla no se cree.
 *   · **Cierre a ciegas, apertura con totales, billete a billete:** quien
 *     cierra cuenta sin ver los libros, así que su diferencia contra ellos es
 *     suya; quien abre ve lo que declaró y dice lo que recibe. Los dos conteos
 *     se declaran una vez y se hacen por denominación (decisión del 9/11). Una
 *     diferencia de importe lleva motivo compatible con su signo; si el total
 *     cuadra pero los billetes no, es una diferencia de composición con sus
 *     propias causas. Todas nacen como solicitud. El inventario de la caja
 *     queda siempre igual a lo contado. Tras un cierre forzado, lo entregado
 *     es el saldo en libros.
 *   · **Sede suspendida o cerrada, u operador suspendido:** no se registra
 *     nada nuevo, pero la jornada abierta **sí puede cerrarse**, para que no
 *     quede efectivo en una caja abierta sin salida (decisión del 5/11/2026).
 */

import { cotizar, type Cotizacion, type TasaVigente } from "@/features/exchange/cotizacion";
import type {
  OperationAmount,
  OperationClienteSnapshot,
  OperationRecord,
  OperationServiceName,
} from "@/features/operations/operations-history";

import { desglosarDeMayorAMenor, proponerEntrega, restar, sumar, totalDe, type Billetes, type Denominacion } from "@/features/caja/billetes";
import {
  denominacionMinima,
  desglosarExacto,
  importesPagables,
  planDeSalida,
  redondearALaBaja,
  type CosteDeBillete,
} from "@/features/caja/pagos";
import { almacen } from "./almacen";
import { derivar, explicarSolicitudDeCierre, explicarSolicitudDeRecuento, registrarSolicitudes } from "./aprobaciones";
import { estadoDeSede, operadorVigente } from "./assignments";
import { denominacionesDe, todasLasDenominaciones } from "./denominaciones";
import { activeAdminUsersOf } from "./operators";
import { anotarSaldoDeCaja, habilitarMonedaEnCaja, monedasDeCaja, monedasDeSede, sedeManejaMoneda } from "./currencies";
import { findTerminalById, marcarActividad } from "./devices";
import {
  diaEnCuba,
  inventarioDeJornada,
  jornadasDeSede,
  jornadaAbiertaDeCaja,
  jornadaAbiertaDeTrabajador,
  jornadaPorId,
  registrarJornada,
  saldosDe,
  ultimaJornadaCerradaDeCaja,
  type AperturaMoneda,
  type ArqueoMoneda,
  type Jornada,
  type MovimientoDeJornada,
  MOTIVOS_DE_COMPOSICION_APERTURA,
  MOTIVOS_DE_COMPOSICION_CIERRE,
  MOTIVOS_DE_DIFERENCIA,
  MOTIVOS_DE_FONDOS,
  SUPERVISOR_CAMBIO_BILLETES,
} from "./jornadas";
import { registrarOperacion, siguienteCodigoDeOperacion, type OperacionDeRed } from "./operaciones";
import { motivoFueraDeVigor, tasasDeSede } from "./rates";
import { findRegisterById, type Register } from "./registers";
import { findSedeById, type Sede } from "./sedes";
import { findWorkerById, motivoDeBloqueo, type NetworkWorker } from "./workers";

/* -------------------------------------------------------------------------
 * Sesión: quién opera y dónde
 * ---------------------------------------------------------------------- */

export interface SesionDeCaja {
  workerId: string;
  terminalId: string;
}

export interface ContextoDeCaja {
  worker: NetworkWorker;
  register: Register;
  sede: Sede;
  terminal: { id: string; label: string };
}

export type ContextoDenial =
  /** El equipo ya no está vinculado a ninguna caja. */
  | "equipo-sin-vincular"
  /** El trabajador no existe o lo desactivaron. */
  | "trabajador-no-disponible"
  /** El trabajador es de otra sede que la del equipo (**FR-AUTH-8**). */
  | "otra-sede";

/** Resuelve la sesión contra la red. No escribe nada. */
export function contextoDe(sesion: SesionDeCaja): { ok: true; value: ContextoDeCaja } | { ok: false; reason: ContextoDenial } {
  const terminal = findTerminalById(sesion.terminalId);
  if (!terminal || terminal.kind !== "caja" || !terminal.registerId) return { ok: false, reason: "equipo-sin-vincular" };
  const register = findRegisterById(terminal.registerId);
  const sede = register ? findSedeById(register.branchId) : null;
  if (!register || !sede) return { ok: false, reason: "equipo-sin-vincular" };
  const worker = findWorkerById(sesion.workerId);
  if (!worker || worker.status !== "activo") return { ok: false, reason: "trabajador-no-disponible" };
  if (worker.branchId !== sede.id) return { ok: false, reason: "otra-sede" };
  return { ok: true, value: { worker, register, sede, terminal: { id: terminal.id, label: terminal.label } } };
}

/* -------------------------------------------------------------------------
 * Lo que se puede hacer: bloqueos
 * ---------------------------------------------------------------------- */

/**
 * Por qué la caja no puede registrar nada nuevo. Con cualquiera de ellos, la
 * jornada abierta sigue pudiendo cerrarse.
 */
export type BloqueoDeCaja = "sede-suspendida" | "sede-cerrada" | "operador-suspendido" | "sin-operador" | "caja-retirada";

export function bloqueoDe(ctx: Pick<ContextoDeCaja, "sede" | "register" | "worker">): BloqueoDeCaja | null {
  if (ctx.register.status !== "activa") return "caja-retirada";
  const estado = estadoDeSede(ctx.sede);
  if (estado === "cerrada") return "sede-cerrada";
  if (estado === "suspendida") return "sede-suspendida";
  if (estado === "operador-suspendido") return "operador-suspendido";
  if (estado === "sin-asignar") return "sin-operador";
  /* El trabajador pudo quedar bloqueado por una razón de la sede después de entrar. */
  const delTrabajador = motivoDeBloqueo(ctx.worker);
  if (delTrabajador === "sede-cerrada" || delTrabajador === "sede-suspendida" || delTrabajador === "operador-suspendido" || delTrabajador === "sin-operador") {
    return delTrabajador;
  }
  return null;
}

/* -------------------------------------------------------------------------
 * Lectura: el estado de la caja
 * ---------------------------------------------------------------------- */

export interface Saldo {
  currency: string;
  amount: number;
}

export interface EstadoDeCaja {
  jornada: Jornada | null;
  /** Saldo por moneda habilitada: el de libros con jornada abierta; si no, lo que quedó. */
  saldos: readonly Saldo[];
  /** Monedas de la sede que la caja todavía no tiene. */
  monedasPorAnadir: readonly string[];
  bloqueo: BloqueoDeCaja | null;
  /**
   * Lo que necesita la apertura. Se abre **con totales** (decisión del
   * 5/11/2026): quien abre ve lo que declaró quien cerró —contado a ciegas— y
   * dice lo que recibe. Tras un cierre forzado, lo entregado es el saldo en
   * libros, que nadie contó.
   */
  apertura: {
    /** `null` si es la primera jornada de la caja. */
    cierreAnterior: { jornadaId: string; closedAt: string; workerName: string; forzado: boolean } | null;
    monedas: readonly string[];
    /** Lo entregado por moneda; vacío en la primera jornada. */
    entregado: readonly Saldo[];
    /** Lo entregado billete a billete: con lo que se rellena el conteo de apertura. */
    billetesEntregados: Readonly<Record<string, Billetes>>;
  };
  /**
   * Las denominaciones que se cuentan en cada moneda de la caja: las del
   * catálogo y, si alguna se retiró, también la que todavía quede dentro. De
   * mayor a menor.
   */
  denominaciones: Readonly<Record<string, readonly Denominacion[]>>;
  /** Las tasas que puede aplicar ahora la caja: las en vigor de la sede. */
  tasas: readonly TasaVigente[];
  /** Servicios habilitados por PuntoCash en la sede. */
  servicios: readonly string[];
  /** Si quien opera tiene abierta una jornada **en otra caja**: no puede abrir otra aquí. */
  jornadaEnOtraCaja: { cajaNombre: string; openedAt: string } | null;
}

function saldosQueQuedaron(registerId: string): Map<string, number> {
  const out = new Map<string, number>();
  for (const code of monedasDeCaja(registerId)) out.set(code, 0);
  const abierta = jornadaAbiertaDeCaja(registerId);
  const ultima = abierta ?? ultimaJornadaCerradaDeCaja(registerId);
  if (ultima) for (const s of saldosDe(ultima)) out.set(s.currency, s.amount);
  return out;
}

/** Las tasas en vigor de la sede, que son las únicas que se pueden aplicar (**FR-AD-TASA-18**). */
export function tasasVigentes(sedeId: string): readonly TasaVigente[] {
  return tasasDeSede(sedeId)
    .filter((t) => motivoFueraDeVigor(sedeId, t.code) === null)
    .map((t) => ({ code: t.code, compra: t.compra, venta: t.venta }));
}

export function estadoDeCaja(ctx: ContextoDeCaja): EstadoDeCaja {
  const jornada = jornadaAbiertaDeCaja(ctx.register.id);
  const saldos = saldosQueQuedaron(ctx.register.id);
  const ultima = ultimaJornadaCerradaDeCaja(ctx.register.id);
  const listaDeLaSede = monedasDeLaSede(ctx.sede.id);
  return {
    jornada,
    saldos: ordenar([...saldos].map(([currency, amount]) => ({ currency, amount })), listaDeLaSede),
    monedasPorAnadir: listaDeLaSede.filter((c) => !saldos.has(c)),
    bloqueo: bloqueoDe(ctx),
    apertura: {
      cierreAnterior: ultima
        ? { jornadaId: ultima.id, closedAt: ultima.closedAt!, workerName: ultima.workerName, forzado: ultima.estado === "forzada" }
        : null,
      monedas: ordenar([...saldos.keys()].map((currency) => ({ currency, amount: 0 })), listaDeLaSede).map((s) => s.currency),
      entregado: ultima && !jornada ? ordenar([...saldos].map(([currency, amount]) => ({ currency, amount })), listaDeLaSede) : [],
      billetesEntregados: ultima && !jornada ? Object.fromEntries(inventarioDeJornada(ultima)) : {},
    },
    denominaciones: Object.fromEntries([...saldos.keys()].map((c) => [c, denominacionesContables(ctx.register.id, c)])),
    tasas: tasasVigentes(ctx.sede.id),
    servicios: ctx.sede.status === "cerrada" ? [] : ctx.sede.services,
    jornadaEnOtraCaja: (() => {
      const otra = jornadaAbiertaDeTrabajador(ctx.worker.id);
      return otra && otra.registerId !== ctx.register.id ? { cajaNombre: otra.cajaNombre, openedAt: otra.openedAt } : null;
    })(),
  };
}

/** La lista de monedas de la sede, en su orden; la decide su mercante (**FR-AD-MON-2**). */
function monedasDeLaSede(sedeId: string): string[] {
  return monedasDeSede(sedeId).map((m) => m.code);
}

function ordenar(saldos: Saldo[], orden: readonly string[]): Saldo[] {
  const pos = (c: string) => {
    const i = orden.indexOf(c);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  return [...new Map(saldos.map((s) => [s.currency, s])).values()].sort((a, b) => pos(a.currency) - pos(b.currency) || a.currency.localeCompare(b.currency));
}

/* -------------------------------------------------------------------------
 * Escrituras
 * ---------------------------------------------------------------------- */

export type CajaDenial =
  | "bloqueada"
  | "jornada-abierta"
  | "jornada-no-abierta"
  /** La caja tiene abierta la jornada de otro trabajador: solo él la cierra, o la administración la fuerza. */
  | "jornada-de-otro"
  | "trabajador-con-otra-jornada"
  | "moneda-no-habilitada"
  | "moneda-fuera-de-la-sede"
  | "ya-habilitada"
  | "conteo-invalido"
  | "motivo-requerido"
  | "motivo-incompatible"
  | "observaciones-requeridas"
  | "diferencia-cero"
  | "servicio-no-habilitado"
  | "sin-tasa"
  | "fondos-insuficientes"
  /** Ya hay un conteo de apertura declarado: no se cuenta otra vez. */
  | "conteo-ya-declarado"
  | "sin-conteo-declarado"
  /** Las diferencias de ese cierre ya se explicaron, o no hay nada que explicar. */
  | "cierre-sin-explicacion-pendiente"
  /** Reposición, retiro o cambio de billetes sin un supervisor de la lista. */
  | "supervisor-requerido"
  /** Una moneda sin denominaciones en el catálogo: no se puede contar. */
  | "sin-denominaciones"
  /** Una denominación que no es de esa moneda, o una cantidad que no es un entero. */
  | "denominacion-invalida"
  /** Saldrían billetes que los libros no tienen: hay que contar esa moneda antes. */
  | "recuento-necesario"
  /** Contada la moneda, esos billetes no están en la caja. */
  | "sin-esos-billetes"
  | "recuento-no-pedido"
  | "recuento-sin-explicacion-pendiente"
  /** La caja no puede dar ese importe exacto sin repetir los billetes que trae el cliente. */
  | "sin-cambio-exacto"
  /** Lo que entra y lo que sale no suman lo mismo. */
  | "cambio-descuadrado"
  /** Entran y salen los mismos billetes. */
  | "cambio-sin-efecto"
  /** El cliente da menos de lo que se le cobra. */
  | "cobro-insuficiente"
  /** No hay billetes para darle el vuelto: que pague con otros billetes o con el importe justo. */
  | "sin-vuelto"
  /** El importe no se puede cobrar en billetes: tiene fracciones menores que el billete más pequeño. */
  | "importe-no-pagable"
  /** La caja no tiene billetes para pagar eso exacto, ni en CUP: hay que ofrecer al cliente otras salidas. */
  | "sin-salida"
  /** Lo que se entregó no suma lo que toca, o la caja cambió desde que se propuso: hay que proponer de nuevo. */
  | "propuesta-vencida";

export type CajaResult<T> = { ok: true; value: T } | { ok: false; reason: CajaDenial; currency?: string };

const no = <T>(reason: CajaDenial, currency?: string): CajaResult<T> => ({ ok: false, reason, ...(currency ? { currency } : {}) });

/* -- Motivos -------------------------------------------------------------- */

const SOLO_POSITIVA = new Set(["Sobrante detectado", "Reposición de fondos"]);
const SOLO_NEGATIVA = new Set(["Faltante detectado", "Retiro de fondos"]);

/** Un motivo direccional solo explica una diferencia de su signo [R8]. */
export function motivoCompatible(motivo: string, diferencia: number): boolean {
  if (diferencia === 0) return false;
  if (SOLO_POSITIVA.has(motivo)) return diferencia > 0;
  if (SOLO_NEGATIVA.has(motivo)) return diferencia < 0;
  return motivo === "Otro";
}

interface Explicacion {
  motivo?: string;
  observaciones?: string;
  /** El supervisor de la lista, por su identificador: nunca un nombre escrito a mano. */
  supervisorId?: string;
}

/**
 * Los supervisores que pueden reponer, retirar o cambiar billetes en la caja:
 * los administradores de la empresa que opera la sede hoy.
 */
export function supervisoresDe(ctx: Pick<ContextoDeCaja, "sede">): readonly { id: string; nombre: string }[] {
  const operador = operadorVigente(ctx.sede.id);
  return operador ? activeAdminUsersOf(operador).map((u) => ({ id: u.id, nombre: u.fullName })) : [];
}

function supervisorValido(ctx: Pick<ContextoDeCaja, "sede">, id: string | undefined): string | null {
  if (!id) return null;
  return supervisoresDe(ctx).find((s) => s.id === id)?.nombre ?? null;
}

/** Lo que explica una diferencia, ya revisado: el motivo, sus observaciones y, si toca, el supervisor. */
interface ExplicacionRevisada {
  motivo: string;
  observaciones?: string;
  supervisor?: string;
  supervisorId?: string;
}

/**
 * Revisa la explicación de una diferencia. Si el total no cuadra, motivos de
 * importe compatibles con el signo; si cuadra pero los billetes no, los de
 * composición del momento (abrir o cerrar). Reposición, retiro y «El
 * supervisor cambió billetes» piden un supervisor de la lista; «Otro», sus
 * observaciones.
 */
function revisarExplicacion(
  ctx: Pick<ContextoDeCaja, "sede">,
  diferencia: number,
  composicion: Billetes | undefined,
  momento: "apertura" | "cierre",
  e: Explicacion | undefined,
  currency: string,
): CajaResult<ExplicacionRevisada | null> {
  const deComposicion = diferencia === 0 && composicion !== undefined;
  if (diferencia === 0 && !deComposicion) return { ok: true, value: null };
  if (!e?.motivo) return no("motivo-requerido", currency);
  if (deComposicion) {
    const validos: readonly string[] = momento === "cierre" ? MOTIVOS_DE_COMPOSICION_CIERRE : MOTIVOS_DE_COMPOSICION_APERTURA;
    if (!validos.includes(e.motivo)) return no("motivo-incompatible", currency);
  } else if (!(MOTIVOS_DE_DIFERENCIA as readonly string[]).includes(e.motivo) || !motivoCompatible(e.motivo, diferencia)) {
    return no("motivo-incompatible", currency);
  }
  const observaciones = e.observaciones?.trim() || undefined;
  if (e.motivo === "Otro" && !observaciones) return no("observaciones-requeridas", currency);
  let supervisor: { supervisor: string; supervisorId: string } | undefined;
  if (MOTIVOS_DE_FONDOS.has(e.motivo) || e.motivo === SUPERVISOR_CAMBIO_BILLETES) {
    const nombre = supervisorValido(ctx, e.supervisorId);
    if (!nombre) return no("supervisor-requerido", currency);
    supervisor = { supervisor: nombre, supervisorId: e.supervisorId! };
  }
  return { ok: true, value: { motivo: e.motivo, ...(observaciones ? { observaciones } : {}), ...(supervisor ?? {}) } };
}

/* -- Conteos por billete -------------------------------------------------- */

/** Lo que cuenta el trabajador en una moneda: cuántos billetes de cada denominación. */
export interface ConteoPorBilletes {
  currency: string;
  /** Clave, el valor en céntimos; cantidad, un entero mayor o igual que cero. */
  billetes: Billetes;
}

/**
 * Las denominaciones que se cuentan en una moneda de la caja: las del
 * catálogo y las retiradas que todavía estén dentro, de mayor a menor.
 */
export function denominacionesContables(registerId: string, currency: string): readonly Denominacion[] {
  const activas = denominacionesDe(currency);
  const ultima = jornadaAbiertaDeCaja(registerId) ?? ultimaJornadaCerradaDeCaja(registerId);
  const dentro = ultima ? inventarioDeJornada(ultima).get(currency) ?? {} : {};
  const out = new Map(activas.map((d) => [Math.round(d.valor * 100), d]));
  for (const d of todasLasDenominaciones(currency)) {
    const k = Math.round(d.valor * 100);
    if (!out.has(k) && (dentro[String(k)] ?? 0) > 0) out.set(k, { valor: d.valor, tipo: d.tipo });
  }
  return [...out.values()].sort((a, b) => b.valor - a.valor);
}

/** Valida un conteo por billete y lo devuelve limpio (sin ceros). */
function revisarConteo(registerId: string, c: ConteoPorBilletes): CajaResult<Billetes> {
  const permitidas = new Set(denominacionesContables(registerId, c.currency).map((d) => String(Math.round(d.valor * 100))));
  if (permitidas.size === 0) return no("sin-denominaciones", c.currency);
  const limpio: Record<string, number> = {};
  for (const [k, n] of Object.entries(c.billetes ?? {})) {
    if (!permitidas.has(k) || !Number.isInteger(n) || n < 0) return no("denominacion-invalida", c.currency);
    if (n > 0) limpio[k] = n;
  }
  return { ok: true, value: limpio };
}

function vacio(b: Billetes | undefined): boolean {
  return !b || Object.values(b).every((n) => n === 0);
}

/** Si el sistema conoce todos los billetes que deberían estar: el desglose suma el saldo. */
function desgloseCompleto(billetes: Billetes | undefined, saldo: number): boolean {
  return Math.abs(totalDe(billetes ?? {}) - saldo) < 0.005;
}

/* -- Ayudas de libro ------------------------------------------------------ */

/** `CM-AAMMDD-NNNNNN`: el identificador que ve el trabajador en su libro y en el comprobante. */
const CONTADOR = globalThis as typeof globalThis & { __puntocash_movimientosDeCaja?: number };

function idDeMovimiento(fechaHora: string): string {
  CONTADOR.__puntocash_movimientosDeCaja = (CONTADOR.__puntocash_movimientosDeCaja ?? 0) + 1;
  const d = diaEnCuba(fechaHora);
  return `CM-${d.slice(2, 4)}${d.slice(5, 7)}${d.slice(8, 10)}-${String(CONTADOR.__puntocash_movimientosDeCaja).padStart(6, "0")}`;
}

function movimiento(j: Jornada, m: Omit<MovimientoDeJornada, "id" | "saldoDespues">): MovimientoDeJornada {
  const antes = saldoEnLibros(j, m.currency);
  const nuevo: MovimientoDeJornada = {
    ...m,
    id: idDeMovimiento(m.fechaHora),
    saldoDespues: antes + m.amount,
  };
  j.movimientos.push(nuevo);
  anotarSaldoDeCaja(j.registerId, m.currency, nuevo.saldoDespues);
  return nuevo;
}

function saldoEnLibros(j: Jornada, currency: string): number {
  for (let i = j.movimientos.length - 1; i >= 0; i -= 1) {
    if (j.movimientos[i]!.currency === currency) return j.movimientos[i]!.saldoDespues;
  }
  return 0;
}

function monedasHabilitadas(registerId: string): Set<string> {
  return new Set(saldosQueQuedaron(registerId).keys());
}

/** La jornada abierta de la caja, si es de quien opera. */
function jornadaPropia(ctx: ContextoDeCaja): CajaResult<Jornada> {
  const j = jornadaAbiertaDeCaja(ctx.register.id);
  if (!j) return no("jornada-no-abierta");
  if (j.workerId !== ctx.worker.id) return no("jornada-de-otro");
  return { ok: true, value: j };
}

function redondear(n: number): number {
  return Math.round(n * 100) / 100;
}

/* -- Apertura ------------------------------------------------------------- */

export interface ComparacionDeApertura {
  cierreAnterior: EstadoDeCaja["apertura"]["cierreAnterior"];
  monedas: readonly AperturaMoneda[];
}

/**
 * Compara lo contado con lo que dejó el cierre anterior, **sin abrir nada**:
 * por importe y, si el importe cuadra y el sistema conocía todos los billetes
 * dejados, también por composición.
 */
export function compararApertura(ctx: ContextoDeCaja, conteos: readonly ConteoPorBilletes[]): CajaResult<ComparacionDeApertura> {
  const estado = estadoDeCaja(ctx);
  if (estado.jornada) return no("jornada-abierta");
  if (estado.bloqueo) return no("bloqueada");
  const monedas = estado.apertura.monedas;
  const porMoneda = new Map(conteos.map((c) => [c.currency, c]));
  if (monedas.some((c) => !porMoneda.has(c)) || conteos.some((c) => !monedas.includes(c.currency))) return no("conteo-invalido");
  const dejado = saldosQueQuedaron(ctx.register.id);
  const ultima = ultimaJornadaCerradaDeCaja(ctx.register.id);
  const dejadosBilletes = ultima ? inventarioDeJornada(ultima) : new Map<string, Billetes>();
  const hayCierre = estado.apertura.cierreAnterior !== null;
  const out: AperturaMoneda[] = [];
  for (const currency of monedas) {
    const r = revisarConteo(ctx.register.id, porMoneda.get(currency)!);
    if (!r.ok) return r as CajaResult<ComparacionDeApertura>;
    const billetes = r.value;
    const contado = totalDe(billetes);
    const d = hayCierre ? dejado.get(currency) ?? 0 : null;
    const diferencia = d === null ? contado : redondear(contado - d);
    const dejados = dejadosBilletes.get(currency);
    const delta = hayCierre && dejados ? restar(billetes, dejados) : undefined;
    const composicion =
      hayCierre && diferencia === 0 && d !== null && desgloseCompleto(dejados, d) && !vacio(delta) ? delta : undefined;
    out.push({ currency, dejado: d, contado, diferencia, billetes, ...(composicion ? { composicion } : {}) });
  }
  return { ok: true, value: { cierreAnterior: estado.apertura.cierreAnterior, monedas: out } };
}

/* -- Conteo de apertura declarado ----------------------------------------- */

/**
 * El conteo de apertura **se declara una vez**. Al continuar, el trabajador
 * acepta que las cifras no se podrán cambiar; desde ese momento quedan en el
 * servidor y la apertura solo puede confirmarse con ellas. Salir de la
 * pantalla y volver a entrar lleva a la revisión de lo declarado, no a un
 * conteo nuevo: si no, ver lo que dejó el cierre anterior y volver a «contar»
 * borraría cualquier diferencia.
 *
 * Es de quien contó en esa caja. Se descarta cuando la caja abre jornada.
 */
interface ConteoDeclarado {
  registerId: string;
  workerId: string;
  declaradoAt: string;
  conteos: readonly ConteoPorBilletes[];
}

const declarados = almacen("conteos-de-apertura-por-billete", () => new Map<string, ConteoDeclarado>());
const claveDeclarado = (ctx: Pick<ContextoDeCaja, "register" | "worker">) => `${ctx.register.id}|${ctx.worker.id}`;

export interface AperturaDeclarada {
  declaradoAt: string;
  comparacion: ComparacionDeApertura;
}

export function declararConteoDeApertura(
  ctx: ContextoDeCaja,
  conteos: readonly ConteoPorBilletes[],
  now = new Date(),
): CajaResult<AperturaDeclarada> {
  if (declarados.has(claveDeclarado(ctx))) return no("conteo-ya-declarado");
  if (jornadaAbiertaDeTrabajador(ctx.worker.id)) return no("trabajador-con-otra-jornada");
  const comparada = compararApertura(ctx, conteos);
  if (!comparada.ok) return comparada;
  const declaradoAt = now.toISOString();
  declarados.set(claveDeclarado(ctx), {
    registerId: ctx.register.id,
    workerId: ctx.worker.id,
    declaradoAt,
    conteos: comparada.value.monedas.map((m) => ({ currency: m.currency, billetes: m.billetes ?? {} })),
  });
  return { ok: true, value: { declaradoAt, comparacion: comparada.value } };
}

/** El conteo que declaró quien opera en esta caja y que todavía no abrió jornada. */
export function aperturaDeclarada(ctx: ContextoDeCaja): AperturaDeclarada | null {
  const d = declarados.get(claveDeclarado(ctx));
  if (!d) return null;
  const comparada = compararApertura(ctx, d.conteos);
  return comparada.ok ? { declaradoAt: d.declaradoAt, comparacion: comparada.value } : null;
}

/** Abre la jornada con **el conteo declarado**; del trabajador solo llegan los motivos. */
export function abrirJornadaDeclarada(
  ctx: ContextoDeCaja,
  explicaciones: readonly ({ currency: string } & Explicacion)[],
  now = new Date(),
): CajaResult<Jornada> {
  const d = declarados.get(claveDeclarado(ctx));
  if (!d) return no("sin-conteo-declarado");
  const porMoneda = new Map(explicaciones.map((e) => [e.currency, e]));
  return abrirJornada(
    ctx,
    d.conteos.map((c) => ({ ...porMoneda.get(c.currency), ...c })),
    now,
  );
}

function descartarDeclarados(registerId: string): void {
  for (const [k, d] of declarados) if (d.registerId === registerId) declarados.delete(k);
}

/**
 * Abre la jornada con lo contado. Toda diferencia con el cierre anterior
 * —de importe o de composición— necesita su motivo, y cada una nace como
 * solicitud de aprobación. El fondeo entra con los billetes contados.
 */
export function abrirJornada(ctx: ContextoDeCaja, conteos: readonly (ConteoPorBilletes & Explicacion)[], now = new Date()): CajaResult<Jornada> {
  if (jornadaAbiertaDeTrabajador(ctx.worker.id)) return no("trabajador-con-otra-jornada");
  const comparada = compararApertura(ctx, conteos);
  if (!comparada.ok) return comparada;

  const hayCierre = comparada.value.cierreAnterior !== null;
  const porMoneda = new Map(conteos.map((c) => [c.currency, c]));
  const monedas: AperturaMoneda[] = [];
  for (const m of comparada.value.monedas) {
    let explicacion: ExplicacionRevisada | null = null;
    if (hayCierre) {
      const r = revisarExplicacion(ctx, m.diferencia, m.composicion, "apertura", porMoneda.get(m.currency), m.currency);
      if (!r.ok) return r as CajaResult<Jornada>;
      explicacion = r.value;
    }
    monedas.push({ ...m, ...(explicacion ?? {}) });
  }

  const ca = comparada.value.cierreAnterior;
  const dia = diaEnCuba(now);
  const id = `J-${ctx.register.id.replace("sede-", "").replace(":caja-", "-")}-${dia.replaceAll("-", "")}-${now.getTime().toString(36)}`;
  const jornada: Jornada = {
    id,
    sedeId: ctx.sede.id,
    registerId: ctx.register.id,
    cajaNombre: ctx.register.name,
    equipo: { id: ctx.terminal.id, label: ctx.terminal.label },
    workerId: ctx.worker.id,
    workerName: ctx.worker.fullName,
    openedAt: now.toISOString(),
    closedAt: null,
    estado: "abierta",
    fondeo: monedas.map((m) => ({ currency: m.currency, amount: m.contado })),
    apertura: {
      cierreAnterior: ca ? { jornadaId: ca.jornadaId, closedAt: ca.closedAt, workerName: ca.workerName, sinArqueo: ca.forzado } : null,
      monedas,
    },
    movimientos: [],
    sesionActiva: true,
  };
  for (const m of monedas) {
    /* Un conteo en cero no es un hecho de efectivo, pero la moneda sigue habilitada. */
    if (m.contado > 0) {
      movimiento(jornada, {
        fechaHora: jornada.openedAt,
        tipo: "entrada",
        concepto: "Fondeo inicial",
        currency: m.currency,
        amount: m.contado,
        ...(m.billetes && !vacio(m.billetes) ? { billetes: m.billetes } : {}),
      });
    } else {
      anotarSaldoDeCaja(ctx.register.id, m.currency, 0);
    }
  }
  registrarJornada(jornada);
  descartarDeclarados(ctx.register.id);
  registrarSolicitudes(derivar(jornada));
  marcarActividad(ctx.terminal.id, now);
  return { ok: true, value: jornada };
}

/**
 * Si la caja puede entregar ese importe, **sin decir cuánto tiene**. Lo usan
 * Remesas y Cobrar giro justo antes de pedir al proveedor externo que dé la
 * entrega por hecha, para no completar fuera algo que la caja no puede pagar.
 * Responde solo sí o no (Worker opera a ciegas).
 */
export function alcanzaParaEntregar(ctx: ContextoDeCaja, currency: string, importe: number): boolean {
  const propia = jornadaPropia(ctx);
  if (!propia.ok || !Number.isFinite(importe) || importe <= 0) return false;
  return saldoEnLibros(propia.value, currency) >= importe;
}

/* -- Cierre --------------------------------------------------------------- */

/**
 * Cierra la jornada con lo contado billete a billete. Por cada moneda, si el
 * total no cuadra con los libros hay una diferencia de importe; si cuadra
 * pero los billetes no —y el sistema conocía todos los de la caja—, una de
 * composición. **El inventario queda igual a lo contado** en cualquier caso:
 * el sistema necesita saber qué billetes hay para seguir proponiendo.
 */
export function cerrarJornada(
  ctx: ContextoDeCaja,
  conteos: readonly (ConteoPorBilletes & Explicacion)[],
  now = new Date(),
  opciones: { motivosDespues?: boolean } = {},
): CajaResult<Jornada> {
  const propia = jornadaPropia(ctx);
  if (!propia.ok) return propia;
  const j = propia.value;
  /* Cerrar se permite aunque la caja esté bloqueada: es su única salida. */
  const monedas = [...monedasHabilitadas(ctx.register.id)];
  const porMoneda = new Map(conteos.map((c) => [c.currency, c]));
  if (monedas.some((c) => !porMoneda.has(c)) || conteos.some((c) => !monedas.includes(c.currency))) return no("conteo-invalido");
  const inventario = inventarioDeJornada(j);
  const arqueo: (ArqueoMoneda & { delta: Billetes })[] = [];
  for (const currency of monedas) {
    const c = porMoneda.get(currency)!;
    const r = revisarConteo(ctx.register.id, c);
    if (!r.ok) return r as CajaResult<Jornada>;
    const billetes = r.value;
    const contado = totalDe(billetes);
    const esperado = saldoEnLibros(j, currency);
    const diferencia = redondear(contado - esperado);
    const dentro = inventario.get(currency) ?? {};
    const delta = restar(billetes, dentro);
    const composicion = diferencia === 0 && desgloseCompleto(dentro, esperado) && !vacio(delta) ? delta : undefined;
    let explicacion: ExplicacionRevisada | null = null;
    if (!opciones.motivosDespues) {
      const e = revisarExplicacion(ctx, diferencia, composicion, "cierre", c, currency);
      if (!e.ok) return e as CajaResult<Jornada>;
      explicacion = e.value;
    }
    arqueo.push({ currency, esperado, contado, diferencia, billetes, delta, ...(composicion ? { composicion } : {}), ...(explicacion ?? {}) });
  }
  const at = now.toISOString();
  for (const a of arqueo) {
    if (a.diferencia === 0 && vacio(a.delta)) continue;
    movimiento(j, {
      fechaHora: at,
      tipo: a.diferencia >= 0 ? "entrada" : "salida",
      /* Sin diferencia de importe, el movimiento solo corrige los billetes:
         por una diferencia de composición, o porque el sistema no los conocía todos. */
      concepto: a.diferencia !== 0 ? "Ajuste de cierre" : a.composicion ? "Ajuste de billetes al cerrar" : "Desglose del conteo de cierre",
      currency: a.currency,
      amount: a.diferencia,
      ...(vacio(a.delta) ? {} : { billetes: a.delta }),
      ...(a.motivo ? { motivo: a.motivo } : {}),
      ...(a.observaciones ? { observaciones: a.observaciones } : {}),
      ...(a.supervisor ? { supervisor: a.supervisor, ...(a.supervisorId ? { supervisorId: a.supervisorId } : {}) } : {}),
      saldoAntes: a.esperado,
    });
  }
  j.estado = "cerrada";
  j.closedAt = at;
  j.arqueo = {
    confirmadoAt: at,
    monedas: arqueo.map((a) => {
      const copia: ArqueoMoneda & { delta?: Billetes } = { ...a };
      delete copia.delta;
      return copia;
    }),
  };
  j.saldosFinales = arqueo.map((a) => ({ currency: a.currency, amount: a.contado }));
  j.sesionActiva = false;
  for (const s of j.saldosFinales) anotarSaldoDeCaja(j.registerId, s.currency, s.amount);
  registrarSolicitudes(derivar(j));
  return { ok: true, value: j };
}

/**
 * **Solo para pruebas y el puesto de prueba:** el conteo que cuadra con lo que
 * hay, billete a billete. Lo que el sistema no tiene desglosado se completa de
 * mayor a menor.
 */
export function conteoDeLoQueHay(ctx: ContextoDeCaja): ConteoPorBilletes[] {
  const j = jornadaAbiertaDeCaja(ctx.register.id);
  const inventario = j ? inventarioDeJornada(j) : new Map<string, Billetes>();
  return [...monedasHabilitadas(ctx.register.id)].map((currency) => {
    const dentro = inventario.get(currency) ?? {};
    const falta = redondear((j ? saldoEnLibros(j, currency) : 0) - totalDe(dentro));
    return { currency, billetes: falta > 0 ? sumar(dentro, desglosarDeMayorAMenor(falta, denominacionesDe(currency)).billetes) : dentro };
  });
}

/** **Solo para pruebas y el puesto de prueba:** un importe en billetes, de mayor a menor. */
export function billetesDeImporte(currency: string, importe: number): Billetes {
  return desglosarDeMayorAMenor(importe, denominacionesDe(currency)).billetes;
}

/* -- Arqueo y cierre a ciegas ---------------------------------------------- */

/**
 * **Arquear y cerrar es un solo acto** (decisiones del 5/11/2026).
 *
 * Quien cierra cuenta **sin ver el saldo en libros**: así no puede escribir
 * una cifra que cuadre sin tenerla, y su diferencia contra los libros —que
 * salen de las operaciones de su jornada— es suya. Lo que declara es lo que
 * recibe quien abre la jornada siguiente.
 *
 * Al confirmar el conteo **la jornada queda cerrada en ese instante**: no hay
 * un estado intermedio en el que, vista ya la diferencia, se pueda cancelar y
 * volver a contar copiando lo esperado. Los motivos de las diferencias se
 * piden justo después (`explicarCierre`). Si el trabajador no llega a darlos
 * —se va la luz, cierra el navegador—, la diferencia llega igual al
 * administrador, como «Sin explicar».
 */
export function cerrarConArqueo(ctx: ContextoDeCaja, conteos: readonly ConteoPorBilletes[], now = new Date()): CajaResult<Jornada> {
  return cerrarJornada(
    ctx,
    conteos.map((c) => ({ currency: c.currency, billetes: c.billetes })),
    now,
    { motivosDespues: true },
  );
}

/**
 * Los motivos de las diferencias —de importe o de composición— de un cierre
 * recién hecho. Solo quien cerró, desde la misma caja, todos a la vez y una
 * sola vez.
 */
export function explicarCierre(
  ctx: ContextoDeCaja,
  jornadaId: string,
  explicaciones: readonly ({ currency: string } & Explicacion)[],
): CajaResult<Jornada> {
  const j = jornadaPorId(jornadaId);
  if (!j || j.workerId !== ctx.worker.id || j.registerId !== ctx.register.id) return no("jornada-de-otro");
  if (j.estado !== "cerrada" || !j.arqueo) return no("cierre-sin-explicacion-pendiente");
  const pendientes = j.arqueo.monedas.filter((a) => (a.diferencia !== 0 || a.composicion) && !a.motivo);
  if (pendientes.length === 0) return no("cierre-sin-explicacion-pendiente");
  const porMoneda = new Map(explicaciones.map((e) => [e.currency, e]));
  const revisadas = new Map<string, ExplicacionRevisada>();
  for (const a of pendientes) {
    const r = revisarExplicacion(ctx, a.diferencia, a.composicion, "cierre", porMoneda.get(a.currency), a.currency);
    if (!r.ok) return r as CajaResult<Jornada>;
    if (r.value) revisadas.set(a.currency, r.value);
  }
  for (const a of pendientes) {
    const e = revisadas.get(a.currency);
    if (!e) continue;
    a.motivo = e.motivo;
    if (e.observaciones) a.observaciones = e.observaciones;
    if (e.supervisor) a.supervisor = e.supervisor;
    if (e.supervisorId) a.supervisorId = e.supervisorId;
    const mov = j.movimientos.find(
      (m) => (m.concepto === "Ajuste de cierre" || m.concepto === "Ajuste de billetes al cerrar") && m.currency === a.currency,
    );
    if (mov) {
      mov.motivo = e.motivo;
      if (e.observaciones) mov.observaciones = e.observaciones;
      if (e.supervisor) mov.supervisor = e.supervisor;
      if (e.supervisorId) mov.supervisorId = e.supervisorId;
    }
    explicarSolicitudDeCierre(j.id, a.currency, e.motivo, e.observaciones, e.supervisor, e.supervisorId);
  }
  return { ok: true, value: j };
}

/* -- Fondos, cambio de billetes y recuento (bloque 3) --------------------- */

/**
 * Las diferencias que se encuentran al recontar una moneda a mitad de jornada.
 * Con el supervisor delante, una reposición o un retiro se registra como tal,
 * así que aquí no caben.
 */
export const MOTIVOS_DE_RECUENTO = ["Faltante detectado", "Sobrante detectado", "Otro"] as const;

/** Los billetes que se registran: los que entran, de las denominaciones vigentes; los que salen, de las que puede haber en la caja. */
function revisarBilletes(registerId: string, currency: string, billetes: Billetes, sentido: "entran" | "salen"): CajaResult<Billetes> {
  const validas = sentido === "entran" ? denominacionesDe(currency) : denominacionesContables(registerId, currency);
  const permitidas = new Set(validas.map((d) => String(Math.round(d.valor * 100))));
  if (permitidas.size === 0) return no("sin-denominaciones", currency);
  const limpio: Record<string, number> = {};
  for (const [k, n] of Object.entries(billetes ?? {})) {
    if (!permitidas.has(k) || !Number.isInteger(n) || n < 0) return no("denominacion-invalida", currency);
    if (n > 0) limpio[k] = n;
  }
  if (vacio(limpio)) return no("conteo-invalido", currency);
  return { ok: true, value: limpio };
}

/** Por denominación, los billetes que quedarían en negativo: los que saldrían sin que los libros los tengan. */
function faltanEnLibros(j: Jornada, currency: string, delta: Billetes): Billetes {
  const despues = sumar(inventarioDeJornada(j).get(currency) ?? {}, delta);
  const faltan: Record<string, number> = {};
  for (const [k, n] of Object.entries(despues)) if (n < 0) faltan[k] = -n;
  return faltan;
}

/** El recuento que se pidió por caja y moneda: la jornada en la que se pidió. */
const recuentosPedidos = almacen("recuentos-pedidos", () => new Map<string, string>());
/** Tras recontar, cuántos movimientos tenía la jornada: si nada cambió, no se pide otro. */
const recontadas = almacen("recuentos-hechos", () => new Map<string, number>());
const claveDeRecuento = (registerId: string, currency: string) => `${registerId}|${currency}`;

/**
 * Salen billetes que los libros no tienen (decisión del 10/11/2026): no se
 * registra nada todavía. Se pide contar esa moneda, a ciegas, para corregir
 * el inventario y dejar constancia de la diferencia. Si ya se contó y desde
 * entonces nada cambió, esos billetes no están en la caja: no se pide otro.
 */
function pedirRecuento<T>(j: Jornada, currency: string): CajaResult<T> {
  const clave = claveDeRecuento(j.registerId, currency);
  if (recontadas.get(clave) === j.movimientos.length) return no("sin-esos-billetes", currency);
  recuentosPedidos.set(clave, j.id);
  return no("recuento-necesario", currency);
}

export interface FondosPorRegistrar {
  tipo: "reposicion" | "retiro";
  currency: string;
  /** Lo que trae o se lleva el supervisor, en positivo. */
  billetes: Billetes;
  supervisorId: string;
  observaciones?: string;
}

/**
 * **Reposición o retiro** (decisión del 9/11/2026). El supervisor trae o se
 * lleva billetes; el trabajador los registra, contados con él, y elige quién
 * fue. Entra en los libros en el acto —el dinero ya se movió— y queda
 * pendiente de que **ese supervisor** lo confirme.
 */
export function registrarFondos(ctx: ContextoDeCaja, f: FondosPorRegistrar, now = new Date()): CajaResult<MovimientoDeJornada> {
  if (bloqueoDe(ctx)) return no("bloqueada");
  const propia = jornadaPropia(ctx);
  if (!propia.ok) return propia as CajaResult<MovimientoDeJornada>;
  const j = propia.value;
  if (!monedasHabilitadas(ctx.register.id).has(f.currency)) return no("moneda-no-habilitada", f.currency);
  const retiro = f.tipo === "retiro";
  const r = revisarBilletes(ctx.register.id, f.currency, f.billetes, retiro ? "salen" : "entran");
  if (!r.ok) return r as CajaResult<MovimientoDeJornada>;
  const supervisor = supervisorValido(ctx, f.supervisorId);
  if (!supervisor) return no("supervisor-requerido", f.currency);
  const delta = retiro ? restar({}, r.value) : r.value;
  if (!vacio(faltanEnLibros(j, f.currency, delta))) return pedirRecuento(j, f.currency);
  const importe = totalDe(r.value);
  const observaciones = f.observaciones?.trim() || undefined;
  const m = movimiento(j, {
    fechaHora: now.toISOString(),
    tipo: retiro ? "salida" : "entrada",
    concepto: retiro ? "Retiro de fondos" : "Reposición de fondos",
    currency: f.currency,
    amount: retiro ? -importe : importe,
    billetes: delta,
    supervisor,
    supervisorId: f.supervisorId,
    fondos: f.tipo,
    ...(observaciones ? { observaciones } : {}),
  });
  registrarSolicitudes(derivar(j));
  marcarActividad(ctx.terminal.id, now);
  return { ok: true, value: m };
}

/**
 * Qué billetes darle a un cliente que cambia los suyos: el mismo total, sin
 * repetir las denominaciones que trae (le devolvería lo mismo). Hasta el
 * bloque 4, la combinación de menos billetes. Proponer revela que esos
 * billetes existen, no cuánto hay (decisión del 9/11/2026).
 */
export function proponerCambioDeBilletes(ctx: ContextoDeCaja, currency: string, entran: Billetes): CajaResult<Billetes> {
  const propia = jornadaPropia(ctx);
  if (!propia.ok) return propia as CajaResult<Billetes>;
  if (!monedasHabilitadas(ctx.register.id).has(currency)) return no("moneda-no-habilitada", currency);
  const r = revisarBilletes(ctx.register.id, currency, entran, "entran");
  if (!r.ok) return r;
  const dentro = inventarioDeJornada(propia.value).get(currency) ?? {};
  const disponibles = Object.fromEntries(Object.entries(dentro).filter(([k]) => !(k in r.value)));
  const propuesta = proponerEntrega(totalDe(r.value), disponibles);
  return propuesta ? { ok: true, value: propuesta } : no("sin-cambio-exacto", currency);
}

export interface CambioDeBilletesPorRegistrar {
  con: "cliente" | "supervisor";
  currency: string;
  /** Los que entran en la caja, en positivo. */
  entran: Billetes;
  /** Los que salen, en positivo. */
  salen: Billetes;
  /** Con el supervisor: quién. */
  supervisorId?: string;
  observaciones?: string;
}

/**
 * **Cambio de billetes**: entran unos y salen otros por el mismo total, en la
 * misma moneda. Con un cliente no se confirma; con el supervisor queda
 * pendiente de que él lo confirme, como una reposición.
 */
export function registrarCambioDeBilletes(
  ctx: ContextoDeCaja,
  c: CambioDeBilletesPorRegistrar,
  now = new Date(),
): CajaResult<MovimientoDeJornada> {
  if (bloqueoDe(ctx)) return no("bloqueada");
  const propia = jornadaPropia(ctx);
  if (!propia.ok) return propia as CajaResult<MovimientoDeJornada>;
  const j = propia.value;
  if (!monedasHabilitadas(ctx.register.id).has(c.currency)) return no("moneda-no-habilitada", c.currency);
  const entran = revisarBilletes(ctx.register.id, c.currency, c.entran, "entran");
  if (!entran.ok) return entran as CajaResult<MovimientoDeJornada>;
  const salen = revisarBilletes(ctx.register.id, c.currency, c.salen, "salen");
  if (!salen.ok) return salen as CajaResult<MovimientoDeJornada>;
  if (Math.abs(totalDe(entran.value) - totalDe(salen.value)) >= 0.005) return no("cambio-descuadrado", c.currency);
  const delta = restar(entran.value, salen.value);
  if (vacio(delta)) return no("cambio-sin-efecto", c.currency);
  let supervisor: { supervisor: string; supervisorId: string; fondos: "cambio" } | null = null;
  if (c.con === "supervisor") {
    const nombre = supervisorValido(ctx, c.supervisorId);
    if (!nombre) return no("supervisor-requerido", c.currency);
    supervisor = { supervisor: nombre, supervisorId: c.supervisorId!, fondos: "cambio" };
  }
  if (!vacio(faltanEnLibros(j, c.currency, delta))) return pedirRecuento(j, c.currency);
  const observaciones = c.observaciones?.trim() || undefined;
  const m = movimiento(j, {
    fechaHora: now.toISOString(),
    tipo: "cambio",
    concepto: "Cambio de billetes",
    currency: c.currency,
    amount: 0,
    billetes: delta,
    cambioCon: c.con,
    ...(supervisor ?? {}),
    ...(observaciones ? { observaciones } : {}),
  });
  registrarSolicitudes(derivar(j));
  marcarActividad(ctx.terminal.id, now);
  return { ok: true, value: m };
}

export interface RecuentoRegistrado {
  currency: string;
  /** El movimiento que corrigió el inventario; `null` si lo contado coincidía billete a billete. */
  movimientoId: string | null;
  diferencia: number;
  composicion?: Billetes;
  /** Si hay una diferencia (de importe o de composición) que explicar. */
  pideExplicacion: boolean;
}

/**
 * El recuento de una moneda que pidió el sistema. Solo si se pidió: no es un
 * arqueo parcial a voluntad. El inventario queda igual a lo contado; si hay
 * diferencia, va a Aprobaciones «Sin explicar» hasta que llegue el motivo.
 */
export function recontar(ctx: ContextoDeCaja, conteo: ConteoPorBilletes, now = new Date()): CajaResult<RecuentoRegistrado> {
  const propia = jornadaPropia(ctx);
  if (!propia.ok) return propia as CajaResult<RecuentoRegistrado>;
  const j = propia.value;
  const clave = claveDeRecuento(ctx.register.id, conteo.currency);
  if (recuentosPedidos.get(clave) !== j.id) return no("recuento-no-pedido", conteo.currency);
  const r = revisarConteo(ctx.register.id, conteo);
  if (!r.ok) return r as CajaResult<RecuentoRegistrado>;
  const currency = conteo.currency;
  const dentro = inventarioDeJornada(j).get(currency) ?? {};
  const esperado = saldoEnLibros(j, currency);
  const contado = totalDe(r.value);
  const diferencia = redondear(contado - esperado);
  const delta = restar(r.value, dentro);
  const composicion = diferencia === 0 && desgloseCompleto(dentro, esperado) && !vacio(delta) ? delta : undefined;
  recuentosPedidos.delete(clave);
  let movimientoId: string | null = null;
  if (diferencia !== 0 || !vacio(delta)) {
    const m = movimiento(j, {
      fechaHora: now.toISOString(),
      tipo: diferencia > 0 ? "entrada" : diferencia < 0 ? "salida" : "cambio",
      concepto: diferencia !== 0 ? "Ajuste por recuento" : composicion ? "Ajuste de billetes en recuento" : "Desglose del recuento",
      currency,
      amount: diferencia,
      ...(vacio(delta) ? {} : { billetes: delta }),
      saldoAntes: esperado,
      recuento: { enLibros: esperado, contado, diferencia, ...(composicion ? { composicion } : {}) },
    });
    movimientoId = m.id;
    registrarSolicitudes(derivar(j));
  }
  recontadas.set(clave, j.movimientos.length);
  marcarActividad(ctx.terminal.id, now);
  return {
    ok: true,
    value: { currency, movimientoId, diferencia, ...(composicion ? { composicion } : {}), pideExplicacion: diferencia !== 0 || composicion !== undefined },
  };
}

/** El motivo de la diferencia de un recuento recién hecho. Una sola vez. */
export function explicarRecuento(ctx: ContextoDeCaja, movimientoId: string, e: Explicacion): CajaResult<MovimientoDeJornada> {
  const propia = jornadaPropia(ctx);
  if (!propia.ok) return propia as CajaResult<MovimientoDeJornada>;
  const m = propia.value.movimientos.find((x) => x.id === movimientoId);
  if (!m?.recuento || m.motivo) return no("recuento-sin-explicacion-pendiente");
  const { diferencia, composicion } = m.recuento;
  if (diferencia === 0 && !composicion) return no("recuento-sin-explicacion-pendiente");
  if (!e.motivo) return no("motivo-requerido", m.currency);
  const validos: readonly string[] = composicion ? MOTIVOS_DE_COMPOSICION_CIERRE : MOTIVOS_DE_RECUENTO;
  if (!validos.includes(e.motivo) || (!composicion && !motivoCompatible(e.motivo, diferencia))) return no("motivo-incompatible", m.currency);
  const observaciones = e.observaciones?.trim() || undefined;
  if (e.motivo === "Otro" && !observaciones) return no("observaciones-requeridas", m.currency);
  m.motivo = e.motivo;
  if (observaciones) m.observaciones = observaciones;
  explicarSolicitudDeRecuento(propia.value.id, m.id, e.motivo, observaciones);
  return { ok: true, value: m };
}

/* -- Añadir moneda -------------------------------------------------------- */

export function habilitarMoneda(ctx: ContextoDeCaja, currency: string): CajaResult<string> {
  if (bloqueoDe(ctx)) return no("bloqueada");
  if (!sedeManejaMoneda(ctx.sede.id, currency)) return no("moneda-fuera-de-la-sede", currency);
  if (monedasHabilitadas(ctx.register.id).has(currency)) return no("ya-habilitada", currency);
  /* Con el conteo ya declarado, la caja no gana una moneda que no se contó. */
  const abierta = jornadaAbiertaDeCaja(ctx.register.id);
  if (!abierta && declarados.has(claveDeclarado(ctx))) return no("conteo-ya-declarado", currency);
  habilitarMonedaEnCaja(ctx.register.id, currency);
  return { ok: true, value: currency };
}

/* -- Operaciones con cliente ---------------------------------------------- */

const SERVICIO_DE: Readonly<Record<string, string>> = {
  "Cambio de moneda": "cambio-moneda",
  Remesa: "remesas",
  Giros: "giros",
};

/** Un tramo de efectivo: lo que entra (positivo) o sale (negativo) de la caja. */
export interface Tramo {
  currency: string;
  delta: number;
  concepto: string;
  /** Los billetes que mueve, con signo y en neto (lo que paga el cliente menos el vuelto). Su suma es `delta`. */
  billetes?: Billetes;
}

export interface OperacionPorRegistrar {
  servicio: OperationServiceName;
  cliente: OperationClienteSnapshot;
  /** El tramo que se guarda como «el» importe en una operación de importe único. */
  tramo: Tramo;
  remittance?: OperationRecord["remittance"];
  transfer?: OperationRecord["transfer"];
  origenKiosco?: OperacionDeRed["origenKiosco"];
  /** Billete a billete (bloque 4). Sin esto la operación no registra billetes: solo el kiosco, hasta que se adapte. */
  efectivo?: EfectivoRegistrado;
}

function comprobarOperar(ctx: ContextoDeCaja, servicio: OperationServiceName): CajaResult<Jornada> {
  const propia = jornadaPropia(ctx);
  if (!propia.ok) return propia;
  const j = propia.value;
  if (bloqueoDe(ctx)) return no("bloqueada");
  const id = SERVICIO_DE[servicio];
  if (!id || !ctx.sede.services.includes(id)) return no("servicio-no-habilitado");
  return { ok: true, value: j };
}

function comprobarTramos(ctx: ContextoDeCaja, j: Jornada, tramos: readonly Tramo[]): CajaResult<null> {
  const habilitadas = monedasHabilitadas(ctx.register.id);
  for (const t of tramos) {
    if (!habilitadas.has(t.currency)) return no("moneda-no-habilitada", t.currency);
    if (t.delta < 0 && saldoEnLibros(j, t.currency) + t.delta < 0) return no("fondos-insuficientes", t.currency);
  }
  return { ok: true, value: null };
}

function base(ctx: ContextoDeCaja, j: Jornada, now: Date) {
  return {
    codigo: siguienteCodigoDeOperacion(diaEnCuba(now)),
    fechaHora: now.toISOString(),
    worker: ctx.worker.fullName,
    caja: ctx.register.name,
    sedeId: ctx.sede.id,
    registerId: ctx.register.id,
    workerId: ctx.worker.id,
    jornadaId: j.id,
    estado: "Completada" as const,
  };
}

/** Los billetes de una salida, validados; vacío es válido (no salió nada de esa moneda). */
function revisarSalida(ctx: ContextoDeCaja, currency: string, b: Billetes | undefined): CajaResult<Billetes> {
  return vacio(b) ? { ok: true, value: {} } : revisarBilletes(ctx.register.id, currency, b ?? {}, "salen");
}

type Liquidado = { tramos: Tramo[]; liquidacion?: OperacionDeRed["liquidacion"] };

/** Un cobro: paga el cliente y, si pagó de más, se le da el vuelto. */
function liquidarCobro(ctx: ContextoDeCaja, t: Tramo, e: EfectivoRegistrado): CajaResult<Liquidado> {
  if (!cobrable(t.currency, t.delta)) return no("importe-no-pagable", t.currency);
  const paga = revisarPaga(ctx, t.currency, e.paga);
  if (!paga.ok) return paga as CajaResult<Liquidado>;
  const vuelto = revisarSalida(ctx, t.currency, e.vuelto);
  if (!vuelto.ok) return vuelto as CajaResult<Liquidado>;
  const esperado = aCien(totalDe(paga.value) - t.delta);
  if (esperado < -0.005) return no("cobro-insuficiente", t.currency);
  if (Math.abs(totalDe(vuelto.value) - esperado) >= 0.005) return no("propuesta-vencida", t.currency);
  return {
    ok: true,
    value: {
      tramos: [{ ...t, billetes: netoDeCobro(paga.value, vuelto.value) }],
      ...(esperado > 0.005 ? { liquidacion: { vuelto: { currency: t.currency, importe: esperado } } } : {}),
    },
  };
}

/**
 * Lo que se le entrega al cliente, ya planeado: pagado entero o con un resto en
 * CUP. Lo que ni así se paga no se registra: queda pendiente.
 */
function liquidarEntrega(
  ctx: ContextoDeCaja,
  plan: PropuestaDePago,
  e: EfectivoRegistrado,
  conceptoCup: string,
): CajaResult<{ tramos: Tramo[]; liquidacion: NonNullable<OperacionDeRed["liquidacion"]> }> {
  if (plan.tipo === "sin-salida") return no("sin-salida", plan.currency);
  const entrega = revisarSalida(ctx, plan.currency, e.entrega);
  if (!entrega.ok) return entrega as CajaResult<never>;
  if (Math.abs(totalDe(entrega.value) - plan.importe) >= 0.005) return no("propuesta-vencida", plan.currency);
  const tramos: Tramo[] = [];
  const liquidacion: NonNullable<OperacionDeRed["liquidacion"]> = {};
  if (plan.importe > 0) tramos.push({ currency: plan.currency, delta: -plan.importe, concepto: "", billetes: salida(entrega.value) });
  const aFavor: { currency: string; importe: number; motivo: "redondeo" }[] = [];
  if (plan.redondeo > 0.004) aFavor.push({ currency: plan.currency, importe: plan.redondeo, motivo: "redondeo" });
  if (plan.tipo === "con-cup") {
    const cup = revisarSalida(ctx, "CUP", e.entregaCup);
    if (!cup.ok) return cup as CajaResult<never>;
    if (Math.abs(totalDe(cup.value) - plan.cup.importe) >= 0.005) return no("propuesta-vencida", "CUP");
    tramos.push({ currency: "CUP", delta: -plan.cup.importe, concepto: conceptoCup, billetes: salida(cup.value) });
    liquidacion.enCup = { importe: plan.cup.importe, equivale: { currency: plan.currency, importe: plan.cup.equivale } };
    if (plan.cup.redondeo > 0.004) aFavor.push({ currency: "CUP", importe: plan.cup.redondeo, motivo: "redondeo" });
  } else if (!vacio(e.entregaCup)) {
    return no("propuesta-vencida", "CUP");
  }
  if (aFavor.length > 0) liquidacion.aFavorDeLaCasa = aFavor;
  return { ok: true, value: { tramos, liquidacion } };
}

/** Un pago a un cliente (remesa pagada, giro cobrado). */
function liquidarPago(ctx: ContextoDeCaja, j: Jornada, t: Tramo, e: EfectivoRegistrado, now: Date): CajaResult<Liquidado> {
  const plan = planearPago(ctx, j, t.currency, -t.delta, { lado: "compra", now });
  const r = liquidarEntrega(ctx, plan, e, `Pago en CUP por falta de billetes de ${t.currency}`);
  if (!r.ok) return r as CajaResult<Liquidado>;
  const tramos = r.value.tramos.map((x) => (x.currency === t.currency ? { ...x, concepto: t.concepto } : x));
  return { ok: true, value: { tramos, liquidacion: r.value.liquidacion } };
}

/** Si en estos tramos salen billetes que los libros no tienen: pide el recuento de esa moneda. */
function comprobarExistencias(j: Jornada, tramos: readonly Tramo[]): CajaResult<null> {
  const porMoneda = new Map<string, Billetes>();
  for (const t of tramos) if (t.billetes) porMoneda.set(t.currency, sumar(porMoneda.get(t.currency), t.billetes));
  const falta = primeraMonedaConFaltantes(j, porMoneda);
  return falta ? pedirRecuento<null>(j, falta) : { ok: true, value: null };
}

/** Todo lo que hay que comprobar antes de registrar una operación simple; no escribe nada. */
function prepararOperacionSimple(
  ctx: ContextoDeCaja,
  op: OperacionPorRegistrar,
  now: Date,
): CajaResult<{ j: Jornada; tramos: Tramo[]; liquidacion: OperacionDeRed["liquidacion"] }> {
  const ok = comprobarOperar(ctx, op.servicio);
  if (!ok.ok) return ok as CajaResult<never>;
  const j = ok.value;
  let tramos: Tramo[] = [op.tramo];
  let liquidacion: OperacionDeRed["liquidacion"];
  if (op.efectivo) {
    const l = op.tramo.delta >= 0 ? liquidarCobro(ctx, op.tramo, op.efectivo) : liquidarPago(ctx, j, op.tramo, op.efectivo, now);
    if (!l.ok) return l as CajaResult<never>;
    tramos = l.value.tramos;
    liquidacion = l.value.liquidacion;
  }
  const t = comprobarTramos(ctx, j, tramos);
  if (!t.ok) return t as CajaResult<never>;
  if (op.efectivo) {
    const e = comprobarExistencias(j, tramos);
    if (!e.ok) return e as CajaResult<never>;
  }
  return { ok: true, value: { j, tramos, liquidacion } };
}

/**
 * Comprueba, sin registrar nada, que la operación se podría registrar ahora.
 * Remesas y Cobrar giro lo piden **antes** de dar la entrega por hecha en el
 * proveedor externo: si hay que contar la moneda o los billetes no cuadran, se
 * sabe antes de completar nada fuera.
 */
export function comprobarOperacionSimple(ctx: ContextoDeCaja, op: OperacionPorRegistrar, now = new Date()): CajaResult<null> {
  const r = prepararOperacionSimple(ctx, op, now);
  return r.ok ? { ok: true, value: null } : (r as CajaResult<null>);
}

/** Remesa pagada, giro enviado o giro pagado: un solo tramo de efectivo, más el vuelto o el resto en CUP. */
export function registrarOperacionSimple(ctx: ContextoDeCaja, op: OperacionPorRegistrar, now = new Date()): CajaResult<OperacionDeRed> {
  const p = prepararOperacionSimple(ctx, op, now);
  if (!p.ok) return p as CajaResult<OperacionDeRed>;
  const { j, tramos, liquidacion } = p.value;

  const b = base(ctx, j, now);
  const antes = saldoEnLibros(j, op.tramo.currency);
  for (const tr of tramos) {
    movimiento(j, {
      fechaHora: b.fechaHora,
      operationCode: b.codigo,
      tipo: tr.delta >= 0 ? "entrada" : "salida",
      concepto: tr.concepto,
      currency: tr.currency,
      amount: tr.delta,
      ...(tr.billetes ? { billetes: tr.billetes } : {}),
    });
  }
  const principal = tramos.find((x) => x.currency === op.tramo.currency);
  const movido = principal?.delta ?? 0;
  const amount: OperationAmount = {
    kind: "single",
    money: { amount: Math.abs(op.tramo.delta), currency: op.tramo.currency },
    cashSnapshot: {
      before: { amount: antes, currency: op.tramo.currency },
      movement: { amount: Math.abs(movido), currency: op.tramo.currency },
      after: { amount: antes + movido, currency: op.tramo.currency },
    },
  };
  const registro: OperacionDeRed = {
    ...b,
    servicio: op.servicio,
    cliente: op.cliente,
    amount,
    ...(op.remittance ? { remittance: op.remittance } : {}),
    ...(op.transfer ? { transfer: op.transfer } : {}),
    ...(op.origenKiosco ? { origenKiosco: op.origenKiosco } : {}),
    ...(liquidacion ? { liquidacion } : {}),
  };
  registrarOperacion(registro);
  marcarActividad(ctx.terminal.id, now);
  return { ok: true, value: registro };
}

/**
 * Un cambio de moneda: se cotiza aquí con las tasas en vigor de la sede, y la
 * cifra de destino que trae la pantalla tiene que coincidir con la de ahora.
 * Si la tasa cambió entre la vista previa y la confirmación, se rechaza con
 * la cotización nueva, para que el trabajador se la diga al cliente.
 */
export function registrarCambio(
  ctx: ContextoDeCaja,
  input: {
    cliente: OperationClienteSnapshot;
    sourceCurrency: string;
    destinationCurrency: string;
    sourceAmount: number;
    /** Lo que la pantalla enseñó al cliente. */
    destinationAmountVisto: number;
    origenKiosco?: OperacionDeRed["origenKiosco"];
    /** Billete a billete (bloque 4). Sin esto el cambio no registra billetes: solo el kiosco, hasta que se adapte. */
    efectivo?: EfectivoRegistrado;
  },
  now = new Date(),
): CajaResult<OperacionDeRed> & { cotizacion?: Cotizacion } {
  const ok = comprobarOperar(ctx, "Cambio de moneda");
  if (!ok.ok) return ok as CajaResult<OperacionDeRed>;
  const j = ok.value;
  const q = cotizar(tasasVigentes(ctx.sede.id), input.sourceCurrency, input.destinationCurrency, input.sourceAmount);
  if (!q.ok) return no("sin-tasa");
  if (Math.abs(q.value.destinationAmount - input.destinationAmountVisto) > 0.001) {
    return { ok: false, reason: "sin-tasa", cotizacion: q.value };
  }
  const { sourceCurrency: S, destinationCurrency: D, sourceAmount, destinationAmount } = q.value;
  let tramos: Tramo[] = [
    { currency: S, delta: sourceAmount, concepto: S === "CUP" ? `Cobro por venta de ${D}` : `Compra de ${S}` },
    { currency: D, delta: -destinationAmount, concepto: D === "CUP" ? `Pago por compra de ${S}` : `Venta de ${D}` },
  ];
  let liquidacion: OperacionDeRed["liquidacion"];
  if (input.efectivo) {
    const cobro = liquidarCobro(ctx, tramos[0]!, input.efectivo);
    if (!cobro.ok) return cobro as CajaResult<OperacionDeRed>;
    const plan = planearPago(ctx, j, D, destinationAmount, { lado: "venta", now, completarEnCup: S !== "CUP" });
    const pago = liquidarEntrega(ctx, plan, input.efectivo, `Pago en CUP por falta de billetes de ${D}`);
    if (!pago.ok) return pago as CajaResult<OperacionDeRed>;
    tramos = [...cobro.value.tramos, ...pago.value.tramos.map((x) => (x.currency === D ? { ...x, concepto: tramos[1]!.concepto } : x))];
    liquidacion = { ...cobro.value.liquidacion, ...pago.value.liquidacion };
  }
  const t = comprobarTramos(ctx, j, tramos);
  if (!t.ok) return t as CajaResult<OperacionDeRed>;
  if (input.efectivo) {
    const e = comprobarExistencias(j, tramos);
    if (!e.ok) return e as CajaResult<OperacionDeRed>;
  }

  const b = base(ctx, j, now);
  const antesDestino = saldoEnLibros(j, D);
  for (const tr of tramos) {
    movimiento(j, {
      fechaHora: b.fechaHora,
      operationCode: b.codigo,
      tipo: tr.delta >= 0 ? "entrada" : "salida",
      concepto: tr.concepto,
      currency: tr.currency,
      amount: tr.delta,
      ...(tr.billetes ? { billetes: tr.billetes } : {}),
    });
  }
  const pagadoD = -(tramos.find((x) => x.currency === D)?.delta ?? 0);
  const registro: OperacionDeRed = {
    ...b,
    servicio: "Cambio de moneda",
    cliente: input.cliente,
    amount: {
      kind: "exchange",
      source: { amount: sourceAmount, currency: S },
      destination: { amount: destinationAmount, currency: D },
      appliedRate: q.value.appliedRate,
      cashSnapshot: {
        before: { amount: antesDestino, currency: D },
        movement: { amount: pagadoD, currency: D },
        after: { amount: antesDestino - pagadoD, currency: D },
      },
    },
    ...(input.origenKiosco ? { origenKiosco: input.origenKiosco } : {}),
    ...(liquidacion && Object.keys(liquidacion).length > 0 ? { liquidacion } : {}),
  };
  registrarOperacion(registro);
  marcarActividad(ctx.terminal.id, now);
  return { ok: true, value: registro };
}

/* ==========================================================================
 * Operaciones con billetes (bloque 4)
 *
 * El trabajador marca con qué billetes paga el cliente; el sistema propone en
 * qué billetes entregar y, si hay vuelto, en cuáles darlo. El trabajador puede
 * cambiar la propuesta mientras el total cuadre: lo que queda registrado es
 * lo que entregó de verdad. Nada de esto muestra saldos: proponer revela que
 * existen esos billetes, no cuántos hay (decisión del 9/11/2026).
 * ====================================================================== */

const DIAS_DE_DEMANDA = 7;

/**
 * Cuántos billetes de cada denominación se suelen entregar: lo que salió de la
 * caja en operaciones de los últimos días, desglosado de mayor a menor. Se
 * deduce de los importes pagados y no de los billetes entregados, así que sirve
 * también con las operaciones anteriores a llevar billetes.
 */
function demandaReciente(sedeId: string, currency: string, now: Date): Map<string, number> {
  const desde = now.getTime() - DIAS_DE_DEMANDA * 86_400_000;
  const dens = denominacionesDe(currency);
  const out = new Map<string, number>();
  for (const j of jornadasDeSede(sedeId)) {
    for (const m of j.movimientos) {
      if (!m.operationCode || m.currency !== currency || m.amount >= 0) continue;
      if (new Date(m.fechaHora).getTime() < desde) continue;
      const { billetes } = desglosarDeMayorAMenor(-m.amount, dens);
      for (const [k, n] of Object.entries(billetes)) out.set(k, (out.get(k) ?? 0) + n);
    }
  }
  return out;
}

/**
 * **Reserva según demanda** (decisión del 9/11/2026): usar un billete cuesta
 * más cuanto más se pide esa denominación y menos queda de ella. Entre las
 * combinaciones que cuadran gana la más barata; a igual coste, la de menos
 * billetes.
 */
function costeDeReserva(sedeId: string, currency: string, existencias: Billetes, now: Date): CosteDeBillete {
  const demanda = demandaReciente(sedeId, currency, now);
  const total = [...demanda.values()].reduce((a, b) => a + b, 0) || 1;
  return (valorEnCentimos) => {
    const k = String(valorEnCentimos);
    return ((demanda.get(k) ?? 0) / total + 0.02) / Math.max(existencias[k] ?? 0, 1);
  };
}

/** Lo que hay de cada denominación más lo que acaba de dar el cliente, sin lo negativo. */
function existenciasPara(j: Jornada, currency: string, extra: Billetes = {}): Billetes {
  const inv = sumar(inventarioDeJornada(j).get(currency) ?? {}, extra);
  return Object.fromEntries(Object.entries(inv).filter(([, n]) => n > 0));
}

const aCien = (n: number): number => Math.round(n * 100) / 100;
const aLaBajaAlCentimo = (n: number): number => Math.floor(n * 100 + 1e-9) / 100;

/** Cómo se paga un importe a un cliente. */
export type PropuestaDePago =
  | { tipo: "completo"; currency: string; billetes: Billetes; importe: number; redondeo: number }
  | {
      /** Lo máximo posible en la moneda, y el resto en CUP. */
      tipo: "con-cup";
      currency: string;
      billetes: Billetes;
      importe: number;
      redondeo: number;
      /** `redondeo`: lo que el resto en CUP pierde al bajar a la denominación más pequeña del CUP; queda a favor de la casa. */
      cup: { billetes: Billetes; importe: number; equivale: number; redondeo: number };
    }
  | {
      /** Ni así se paga entero: lo que sí se podría pagar y lo que quedaría sin pagar. */
      tipo: "sin-salida";
      currency: string;
      billetes: Billetes;
      importe: number;
      sinPagar: number;
      redondeo: number;
      /** Si se intentó completar el resto en CUP (no si se paga en CUP, ni si el cliente pagó en CUP). */
      intentoEnCup: boolean;
    };

/**
 * Cómo pagar `importe` en `currency`: (1) a la baja a la denominación más
 * pequeña —la fracción no se puede dar y queda a favor de la casa—; (2) lo
 * máximo posible en la moneda y el resto en CUP; (3) si tampoco, se dice qué
 * se podría pagar para que el cliente elija. `lado` es la tasa con la que se
 * convierte el resto a CUP: la venta en un cambio, donde el cliente ya pagó
 * a esa tasa, y la compra en lo demás.
 */
function planearPago(
  ctx: ContextoDeCaja,
  j: Jornada,
  currency: string,
  importe: number,
  opts: { extra?: Billetes; lado: "venta" | "compra"; now: Date; /** Si el resto se puede completar en CUP (no tiene sentido si el cliente acaba de pagar en CUP). */ completarEnCup?: boolean },
): PropuestaDePago {
  const paso = denominacionMinima(denominacionesDe(currency));
  const aPagar = redondearALaBaja(importe, paso);
  const redondeo = aCien(importe - aPagar);
  const existencias = existenciasPara(j, currency, opts.extra);
  const plan = planDeSalida(aPagar, existencias, costeDeReserva(ctx.sede.id, currency, existencias, opts.now));
  if (plan.tipo === "completo") return { tipo: "completo", currency, billetes: plan.billetes, importe: aPagar, redondeo };

  const completarEnCup = currency !== "CUP" && opts.completarEnCup !== false;
  if (completarEnCup) {
    const tasa = tasasVigentes(ctx.sede.id).find((t) => t.code === currency);
    if (tasa) {
      const exactoEnCup = aLaBajaAlCentimo(plan.resto * (opts.lado === "venta" ? tasa.venta : tasa.compra));
      const cup = redondearALaBaja(exactoEnCup, denominacionMinima(denominacionesDe("CUP")));
      if (cup > 0) {
        const enCaja = existenciasPara(j, "CUP");
        const planCup = planDeSalida(cup, enCaja, costeDeReserva(ctx.sede.id, "CUP", enCaja, opts.now));
        if (planCup.tipo === "completo") {
          return {
            tipo: "con-cup",
            currency,
            billetes: plan.billetes,
            importe: plan.pagado,
            redondeo,
            cup: { billetes: planCup.billetes, importe: cup, equivale: plan.resto, redondeo: aCien(exactoEnCup - cup) },
          };
        }
      }
    }
  }
  return { tipo: "sin-salida", currency, billetes: plan.billetes, importe: plan.pagado, sinPagar: plan.resto, redondeo, intentoEnCup: completarEnCup };
}

/** El vuelto de un cobro: lo que el cliente da menos lo que se le cobra, con billetes de la caja y de lo que acaba de dar. */
function planearVuelto(
  ctx: ContextoDeCaja,
  j: Jornada,
  currency: string,
  paga: Billetes,
  aCobrar: number,
  now: Date,
): CajaResult<Billetes> {
  const v = aCien(totalDe(paga) - aCobrar);
  if (v < -0.005) return no("cobro-insuficiente", currency);
  if (v < 0.005) return { ok: true, value: {} };
  const existencias = existenciasPara(j, currency, paga);
  const b = proponerEntrega(v, existencias, costeDeReserva(ctx.sede.id, currency, existencias, now)) ?? desglosarExacto(v, existencias);
  return b ? { ok: true, value: b } : no("sin-vuelto", currency);
}

/** Lo que se puede cobrar en billetes: un múltiplo de la denominación más pequeña. */
function cobrable(currency: string, importe: number): boolean {
  const paso = denominacionMinima(denominacionesDe(currency));
  return !Number.isFinite(paso) || Math.abs(redondearALaBaja(importe, paso) - importe) < 0.005;
}

/** Valida y limpia lo que da el cliente. */
function revisarPaga(ctx: ContextoDeCaja, currency: string, paga: Billetes | undefined): CajaResult<Billetes> {
  return revisarBilletes(ctx.register.id, currency, paga ?? {}, "entran");
}

export interface PropuestaDeCobro {
  /** El vuelto, en la moneda del cobro; vacío si el cliente pagó justo. */
  vuelto: Billetes;
}

/**
 * Propuesta de vuelto para un cobro (giro enviado y otros servicios en los
 * que el cliente paga). Responde `sin-vuelto` si la caja no puede darlo.
 */
export function proponerCobro(
  ctx: ContextoDeCaja,
  input: { currency: string; importe: number; paga: Billetes },
  now = new Date(),
): CajaResult<PropuestaDeCobro> {
  const propia = jornadaPropia(ctx);
  if (!propia.ok) return propia as CajaResult<PropuestaDeCobro>;
  if (!monedasHabilitadas(ctx.register.id).has(input.currency)) return no("moneda-no-habilitada", input.currency);
  if (!cobrable(input.currency, input.importe)) return no("importe-no-pagable", input.currency);
  const paga = revisarPaga(ctx, input.currency, input.paga);
  if (!paga.ok) return paga as CajaResult<PropuestaDeCobro>;
  const v = planearVuelto(ctx, propia.value, input.currency, paga.value, input.importe, now);
  return v.ok ? { ok: true, value: { vuelto: v.value } } : (v as CajaResult<PropuestaDeCobro>);
}

/** Propuesta de billetes para pagar un importe a un cliente (remesa pagada, giro cobrado). */
export function proponerPago(
  ctx: ContextoDeCaja,
  input: { currency: string; importe: number },
  now = new Date(),
): CajaResult<PropuestaDePago> {
  const propia = jornadaPropia(ctx);
  if (!propia.ok) return propia as CajaResult<PropuestaDePago>;
  if (!monedasHabilitadas(ctx.register.id).has(input.currency)) return no("moneda-no-habilitada", input.currency);
  if (denominacionesDe(input.currency).length === 0) return no("sin-denominaciones", input.currency);
  return { ok: true, value: planearPago(ctx, propia.value, input.currency, input.importe, { lado: "compra", now }) };
}

export interface PropuestaDeCambio {
  cotizacion: Cotizacion;
  vuelto: Billetes;
  pago: PropuestaDePago;
  /**
   * (a) Cuando no se puede pagar: el importe más cercano, por debajo, que sí
   * se paga entero, con el vuelto que le tocaría al cliente.
   */
  otroImporte?: { cotizacion: Cotizacion; vuelto: Billetes; pago: PropuestaDePago };
}

/** Una cotización por el importe de origen que se paga entero, o null. */
function buscarOtroImporte(
  ctx: ContextoDeCaja,
  j: Jornada,
  input: { sourceCurrency: string; destinationCurrency: string; sourceAmount: number; paga: Billetes },
  now: Date,
): PropuestaDeCambio["otroImporte"] | undefined {
  const paso = denominacionMinima(denominacionesDe(input.sourceCurrency));
  if (!Number.isFinite(paso)) return undefined;
  const tasas = tasasVigentes(ctx.sede.id);
  const enCaja = existenciasPara(j, input.destinationCurrency);
  const tope = cotizar(tasas, input.sourceCurrency, input.destinationCurrency, input.sourceAmount);
  if (!tope.ok) return undefined;
  const { unidad, alcanzable } = importesPagables(enCaja, Math.round(tope.value.destinationAmount * 100));
  const pasoDestino = denominacionMinima(denominacionesDe(input.destinationCurrency));
  /* De mayor a menor entre los importes de destino que la caja paga enteros: el primero que sirve es el más cercano. */
  let revisados = 0;
  for (let x = alcanzable.length - 1; x > 0 && revisados < 4000; x -= 1) {
    if (!alcanzable[x]) continue;
    revisados += 1;
    const dest = (x * unidad) / 100;
    const n = aCien(Math.ceil(dest / tope.value.appliedRate / paso - 1e-9) * paso);
    if (n <= 0 || n >= input.sourceAmount) continue;
    const q = cotizar(tasas, input.sourceCurrency, input.destinationCurrency, n);
    if (!q.ok || Math.abs(redondearALaBaja(q.value.destinationAmount, pasoDestino) - dest) > 0.004) continue;
    const vuelto = planearVuelto(ctx, j, input.sourceCurrency, input.paga, n, now);
    if (!vuelto.ok) continue;
    const pago = planearPago(ctx, j, input.destinationCurrency, q.value.destinationAmount, { lado: "venta", now, completarEnCup: false });
    if (pago.tipo !== "completo") continue;
    return { cotizacion: q.value, vuelto: vuelto.value, pago };
  }
  return undefined;
}

/**
 * Propuesta para un cambio de moneda: el vuelto en la moneda del cliente y
 * los billetes a entregar en la de destino. Si no se puede pagar entero,
 * además propone el importe más cercano que sí se paga (salida a).
 */
export function proponerCambio(
  ctx: ContextoDeCaja,
  input: { sourceCurrency: string; destinationCurrency: string; sourceAmount: number; paga: Billetes },
  now = new Date(),
): CajaResult<PropuestaDeCambio> & { cotizacion?: Cotizacion } {
  const ok = comprobarOperar(ctx, "Cambio de moneda");
  if (!ok.ok) return ok as CajaResult<PropuestaDeCambio>;
  const j = ok.value;
  const habilitadas = monedasHabilitadas(ctx.register.id);
  for (const c of [input.sourceCurrency, input.destinationCurrency]) if (!habilitadas.has(c)) return no("moneda-no-habilitada", c);
  if (denominacionesDe(input.destinationCurrency).length === 0) return no("sin-denominaciones", input.destinationCurrency);
  if (!cobrable(input.sourceCurrency, input.sourceAmount)) return no("importe-no-pagable", input.sourceCurrency);
  const paga = revisarPaga(ctx, input.sourceCurrency, input.paga);
  if (!paga.ok) return paga as CajaResult<PropuestaDeCambio>;
  const q = cotizar(tasasVigentes(ctx.sede.id), input.sourceCurrency, input.destinationCurrency, input.sourceAmount);
  if (!q.ok) return no("sin-tasa");
  const vuelto = planearVuelto(ctx, j, input.sourceCurrency, paga.value, input.sourceAmount, now);
  if (!vuelto.ok) return vuelto as CajaResult<PropuestaDeCambio>;
  const pago = planearPago(ctx, j, input.destinationCurrency, q.value.destinationAmount, { lado: "venta", now, completarEnCup: input.sourceCurrency !== "CUP" });
  const otroImporte = pago.tipo === "sin-salida" ? buscarOtroImporte(ctx, j, { ...input, paga: paga.value }, now) : undefined;
  return { ok: true, value: { cotizacion: q.value, vuelto: vuelto.value, pago, ...(otroImporte ? { otroImporte } : {}) } };
}

/** Lo que se entregó y recibió de verdad, billete a billete. */
export interface EfectivoRegistrado {
  /** Lo que dio el cliente, en la moneda que cobra la casa. */
  paga?: Billetes;
  /** El vuelto, en esa misma moneda. */
  vuelto?: Billetes;
  /** Lo que se le entregó, en la moneda del servicio. */
  entrega?: Billetes;
  /** Lo que se le entregó en CUP por falta de billetes de esa moneda. */
  entregaCup?: Billetes;
  /** Salida (b): el cliente aceptó que lo que no se pueda pagar quede a favor de la casa. */
}

/** Cobra: lo que paga el cliente menos el vuelto, en neto. */
function netoDeCobro(paga: Billetes, vuelto: Billetes): Billetes {
  return restar(paga, vuelto);
}

/** Los billetes de una salida, con signo negativo. */
function salida(b: Billetes | undefined): Billetes {
  return restar({}, b ?? {});
}

/** Si en `delta` salen billetes que los libros no tienen (contando los que acaban de entrar). */
function primeraMonedaConFaltantes(j: Jornada, porMoneda: ReadonlyMap<string, Billetes>): string | null {
  for (const [currency, delta] of porMoneda) if (!vacio(faltanEnLibros(j, currency, delta))) return currency;
  return null;
}
