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
 *   · **Apertura a ciegas:** quien abre cuenta lo que hay antes de saber lo
 *     que dejó el cierre anterior; toda diferencia lleva motivo compatible con
 *     su signo y nace como solicitud. Tras un cierre forzado, lo «dejado» es
 *     el saldo en libros y este conteo es el primero desde entonces.
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

import { derivar, registrarSolicitudes } from "./aprobaciones";
import { estadoDeSede } from "./assignments";
import { anotarSaldoDeCaja, habilitarMonedaEnCaja, monedasDeCaja, monedasDeSede, sedeManejaMoneda } from "./currencies";
import { findTerminalById, marcarActividad } from "./devices";
import {
  diaEnCuba,
  jornadaAbiertaDeCaja,
  jornadaAbiertaDeTrabajador,
  registrarJornada,
  saldosDe,
  ultimaJornadaCerradaDeCaja,
  type AperturaMoneda,
  type ArqueoMoneda,
  type Jornada,
  type MotivoDeApertura,
  type MovimientoDeJornada,
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
  /** Lo que necesita la apertura para comparar; sin cifras (se cuenta a ciegas). */
  apertura: {
    /** `null` si es la primera jornada de la caja. */
    cierreAnterior: { jornadaId: string; closedAt: string; workerName: string; forzado: boolean } | null;
    monedas: readonly string[];
  };
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
    },
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
  | "fondos-insuficientes";

export type CajaResult<T> = { ok: true; value: T } | { ok: false; reason: CajaDenial; currency?: string };

const no = <T>(reason: CajaDenial, currency?: string): CajaResult<T> => ({ ok: false, reason, ...(currency ? { currency } : {}) });

/* -- Motivos -------------------------------------------------------------- */

/** Durante la jornada o al cerrar: por qué lo contado no es lo registrado [R8]. */
export const MOTIVOS_DE_AJUSTE = ["Faltante detectado", "Sobrante detectado", "Otro"] as const;
export type MotivoDeAjuste = (typeof MOTIVOS_DE_AJUSTE)[number];

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
}

function revisarExplicacion(
  diferencia: number,
  e: Explicacion | undefined,
  validos: readonly string[],
  currency: string,
): CajaResult<null> {
  if (diferencia === 0) return { ok: true, value: null };
  if (!e?.motivo) return no("motivo-requerido", currency);
  if (!validos.includes(e.motivo) || !motivoCompatible(e.motivo, diferencia)) return no("motivo-incompatible", currency);
  if (e.motivo === "Otro" && !e.observaciones?.trim()) return no("observaciones-requeridas", currency);
  return { ok: true, value: null };
}

function conteoValido(n: number): boolean {
  return Number.isFinite(n) && n >= 0 && Math.round(n * 100) === n * 100;
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

/* -- Apertura ------------------------------------------------------------- */

export interface ConteoDeApertura {
  currency: string;
  contado: number;
  /** Se valida contra los motivos de apertura y el signo antes de guardarse. */
  motivo?: string;
  observaciones?: string;
}

export interface ComparacionDeApertura {
  cierreAnterior: EstadoDeCaja["apertura"]["cierreAnterior"];
  monedas: readonly AperturaMoneda[];
}

/**
 * Compara lo contado con lo que dejó el cierre anterior, **sin abrir nada**.
 * Es el segundo paso de la apertura a ciegas: el trabajador ya contó; ahora
 * se le enseña dónde no coincide para que diga por qué.
 */
export function compararApertura(ctx: ContextoDeCaja, conteos: readonly { currency: string; contado: number }[]): CajaResult<ComparacionDeApertura> {
  const estado = estadoDeCaja(ctx);
  if (estado.jornada) return no("jornada-abierta");
  if (estado.bloqueo) return no("bloqueada");
  const monedas = estado.apertura.monedas;
  const porMoneda = new Map(conteos.map((c) => [c.currency, c.contado]));
  if (monedas.some((c) => !porMoneda.has(c)) || conteos.some((c) => !monedas.includes(c.currency) || !conteoValido(c.contado))) {
    return no("conteo-invalido");
  }
  const dejado = saldosQueQuedaron(ctx.register.id);
  const hayCierre = estado.apertura.cierreAnterior !== null;
  return {
    ok: true,
    value: {
      cierreAnterior: estado.apertura.cierreAnterior,
      monedas: monedas.map((currency) => {
        const contado = porMoneda.get(currency)!;
        const d = hayCierre ? dejado.get(currency) ?? 0 : null;
        return { currency, dejado: d, contado, diferencia: d === null ? contado : redondear(contado - d) };
      }),
    },
  };
}

function redondear(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Abre la jornada con lo contado. Toda diferencia con el cierre anterior
 * necesita su motivo, y cada una nace como solicitud de aprobación.
 */
export function abrirJornada(ctx: ContextoDeCaja, conteos: readonly ConteoDeApertura[], now = new Date()): CajaResult<Jornada> {
  if (jornadaAbiertaDeTrabajador(ctx.worker.id)) return no("trabajador-con-otra-jornada");
  const comparada = compararApertura(ctx, conteos);
  if (!comparada.ok) return comparada;

  const hayCierre = comparada.value.cierreAnterior !== null;
  const porMoneda = new Map(conteos.map((c) => [c.currency, c]));
  const monedas: AperturaMoneda[] = [];
  for (const m of comparada.value.monedas) {
    const c = porMoneda.get(m.currency)!;
    if (hayCierre) {
      const r = revisarExplicacion(m.diferencia, c, ["Reposición de fondos", "Retiro de fondos", "Faltante detectado", "Sobrante detectado", "Otro"], m.currency);
      if (!r.ok) return r as CajaResult<Jornada>;
    }
    monedas.push({
      ...m,
      ...(hayCierre && m.diferencia !== 0 && c.motivo ? { motivo: c.motivo as MotivoDeApertura } : {}),
      ...(hayCierre && m.diferencia !== 0 && c.observaciones?.trim() ? { observaciones: c.observaciones.trim() } : {}),
    });
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
      movimiento(jornada, { fechaHora: jornada.openedAt, tipo: "entrada", concepto: "Fondeo inicial", currency: m.currency, amount: m.contado });
    } else {
      anotarSaldoDeCaja(ctx.register.id, m.currency, 0);
    }
  }
  registrarJornada(jornada);
  registrarSolicitudes(derivar(jornada));
  marcarActividad(ctx.terminal.id, now);
  return { ok: true, value: jornada };
}

/* -- Ajuste de efectivo --------------------------------------------------- */

export function ajustarEfectivo(
  ctx: ContextoDeCaja,
  input: { currency: string; contado: number; motivo: string; observaciones?: string },
  now = new Date(),
): CajaResult<MovimientoDeJornada> {
  const propia = jornadaPropia(ctx);
  if (!propia.ok) return propia as CajaResult<MovimientoDeJornada>;
  const j = propia.value;
  if (bloqueoDe(ctx)) return no("bloqueada");
  if (!monedasHabilitadas(ctx.register.id).has(input.currency)) return no("moneda-no-habilitada", input.currency);
  if (!conteoValido(input.contado)) return no("conteo-invalido", input.currency);
  const antes = saldoEnLibros(j, input.currency);
  const diferencia = redondear(input.contado - antes);
  if (diferencia === 0) return no("diferencia-cero", input.currency);
  const r = revisarExplicacion(diferencia, input, MOTIVOS_DE_AJUSTE, input.currency);
  if (!r.ok) return r as CajaResult<MovimientoDeJornada>;

  const m = movimiento(j, {
    fechaHora: now.toISOString(),
    tipo: diferencia > 0 ? "entrada" : "salida",
    concepto: "Ajuste de efectivo",
    currency: input.currency,
    amount: diferencia,
    motivo: input.motivo,
    saldoAntes: antes,
    ...(input.observaciones?.trim() ? { observaciones: input.observaciones.trim() } : {}),
  });
  registrarSolicitudes(derivar(j));
  return { ok: true, value: m };
}

/* -- Cierre --------------------------------------------------------------- */

export function cerrarJornada(
  ctx: ContextoDeCaja,
  conteos: readonly { currency: string; contado: number; motivo?: string; observaciones?: string }[],
  now = new Date(),
): CajaResult<Jornada> {
  const propia = jornadaPropia(ctx);
  if (!propia.ok) return propia;
  const j = propia.value;
  /* Cerrar se permite aunque la caja esté bloqueada: es su única salida. */
  const monedas = [...monedasHabilitadas(ctx.register.id)];
  const porMoneda = new Map(conteos.map((c) => [c.currency, c]));
  if (monedas.some((c) => !porMoneda.has(c)) || conteos.some((c) => !monedas.includes(c.currency) || !conteoValido(c.contado))) {
    return no("conteo-invalido");
  }
  const arqueo: ArqueoMoneda[] = [];
  for (const currency of monedas) {
    const c = porMoneda.get(currency)!;
    const esperado = saldoEnLibros(j, currency);
    const diferencia = redondear(c.contado - esperado);
    const r = revisarExplicacion(diferencia, c, MOTIVOS_DE_AJUSTE, currency);
    if (!r.ok) return r as CajaResult<Jornada>;
    arqueo.push({ currency, esperado, contado: c.contado, diferencia, ...(diferencia !== 0 ? { motivo: c.motivo } : {}) });
  }
  const at = now.toISOString();
  for (const a of arqueo.filter((x) => x.diferencia !== 0)) {
    const c = porMoneda.get(a.currency)!;
    movimiento(j, {
      fechaHora: at,
      tipo: a.diferencia > 0 ? "entrada" : "salida",
      concepto: "Ajuste de cierre",
      currency: a.currency,
      amount: a.diferencia,
      motivo: a.motivo,
      saldoAntes: a.esperado,
      ...(c.observaciones?.trim() ? { observaciones: c.observaciones.trim() } : {}),
    });
  }
  j.estado = "cerrada";
  j.closedAt = at;
  j.arqueo = { confirmadoAt: at, monedas: arqueo };
  j.saldosFinales = arqueo.map((a) => ({ currency: a.currency, amount: a.contado }));
  j.sesionActiva = false;
  for (const s of j.saldosFinales) anotarSaldoDeCaja(j.registerId, s.currency, s.amount);
  registrarSolicitudes(derivar(j));
  return { ok: true, value: j };
}

/* -- Añadir moneda -------------------------------------------------------- */

export function habilitarMoneda(ctx: ContextoDeCaja, currency: string): CajaResult<string> {
  if (bloqueoDe(ctx)) return no("bloqueada");
  if (!sedeManejaMoneda(ctx.sede.id, currency)) return no("moneda-fuera-de-la-sede", currency);
  if (monedasHabilitadas(ctx.register.id).has(currency)) return no("ya-habilitada", currency);
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
}

export interface OperacionPorRegistrar {
  servicio: OperationServiceName;
  cliente: OperationClienteSnapshot;
  /** El tramo que se guarda como «el» importe en una operación de importe único. */
  tramo: Tramo;
  remittance?: OperationRecord["remittance"];
  transfer?: OperationRecord["transfer"];
  origenKiosco?: OperacionDeRed["origenKiosco"];
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

/** Remesa pagada, giro enviado o giro pagado: un solo tramo de efectivo. */
export function registrarOperacionSimple(ctx: ContextoDeCaja, op: OperacionPorRegistrar, now = new Date()): CajaResult<OperacionDeRed> {
  const ok = comprobarOperar(ctx, op.servicio);
  if (!ok.ok) return ok as CajaResult<OperacionDeRed>;
  const j = ok.value;
  const t = comprobarTramos(ctx, j, [op.tramo]);
  if (!t.ok) return t as CajaResult<OperacionDeRed>;

  const b = base(ctx, j, now);
  const antes = saldoEnLibros(j, op.tramo.currency);
  movimiento(j, {
    fechaHora: b.fechaHora,
    operationCode: b.codigo,
    tipo: op.tramo.delta >= 0 ? "entrada" : "salida",
    concepto: op.tramo.concepto,
    currency: op.tramo.currency,
    amount: op.tramo.delta,
  });
  const amount: OperationAmount = {
    kind: "single",
    money: { amount: Math.abs(op.tramo.delta), currency: op.tramo.currency },
    cashSnapshot: {
      before: { amount: antes, currency: op.tramo.currency },
      movement: { amount: Math.abs(op.tramo.delta), currency: op.tramo.currency },
      after: { amount: antes + op.tramo.delta, currency: op.tramo.currency },
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
  const tramos: Tramo[] = [
    { currency: S, delta: sourceAmount, concepto: S === "CUP" ? `Cobro por venta de ${D}` : `Compra de ${S}` },
    { currency: D, delta: -destinationAmount, concepto: D === "CUP" ? `Pago por compra de ${S}` : `Venta de ${D}` },
  ];
  const t = comprobarTramos(ctx, j, tramos);
  if (!t.ok) return t as CajaResult<OperacionDeRed>;

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
    });
  }
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
        movement: { amount: destinationAmount, currency: D },
        after: { amount: antesDestino - destinationAmount, currency: D },
      },
    },
    ...(input.origenKiosco ? { origenKiosco: input.origenKiosco } : {}),
  };
  registrarOperacion(registro);
  marcarActividad(ctx.terminal.id, now);
  return { ok: true, value: registro };
}
