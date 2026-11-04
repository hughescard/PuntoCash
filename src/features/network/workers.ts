/**
 * LOS TRABAJADORES — el enlace Trabajador → Sede que el dominio no tenía.
 *
 * Un trabajador pertenece a una **sede**, nunca a una caja (regla A13). La
 * caja que opera la determina el equipo en el que inicia sesión, y solo puede
 * iniciar sesión en equipos vinculados a cajas de su propia sede (FR-DEV-5,
 * FR-DEV-6). Por eso el alta elige sede y aquí no hay ningún campo de caja.
 *
 * Los crea, los edita y los desactiva **su mercante, y solo él** (reglas A4 y
 * A14): PuntoCash los ve todos y no desactiva a ninguno. Su recurso ante un
 * problema con una persona es suspender la sede o al operador, que corta el
 * acceso de todos a la vez (FR-SA-TRAB-6).
 *
 * El acceso de Worker (`mock-auth.ts`) **todavía no consulta este registro**:
 * acepta cualquier identificador con la contraseña de demostración. En el
 * producto real, el acceso valida identificador y credencial contra el
 * trabajador, su estado y la sede asignada. La limitación de la demostración
 * está en la nota de entrega (§8.3).
 */

import { cuentaCoincide, esIdentificadorValido, normalizarCuenta } from "@/features/auth/identificador";
import { type DocumentType } from "@/features/customers/customers";
import { findSedeById } from "./sedes";
import { findOperatorById } from "./operators";
import { operadorVigente } from "./assignments";
import { requireOperatorScope, type Scope } from "./scope";

export type WorkerStatus = "activo" | "desactivado";

export interface WorkerDeactivation {
  reason: string;
  at: string;
  by: string;
}

export interface NetworkWorker {
  id: string;
  identifier: string;
  fullName: string;
  firstName: string;
  initials: string;
  /** Tipo y número son dos datos, no uno (**FR-AD-TRAB-3**). */
  documentType: DocumentType;
  documentId: string;
  phone: string;
  /** Canal del segundo factor: sin correo no podría acceder nunca [R13]. */
  email: string;
  /** La sede a la que está adscrito. Nunca una caja (regla A13). */
  branchId: string;
  status: WorkerStatus;
  createdAt: string;
  deactivation?: WorkerDeactivation;
}

function worker(
  id: string,
  identifier: string,
  fullName: string,
  documentId: string,
  branchId: string,
  status: WorkerStatus = "activo",
  documentType: DocumentType = "CI",
): NetworkWorker {
  const parts = fullName.split(" ");
  const firstName = parts[0] ?? fullName;
  const lastName = parts[1] ?? "";
  return {
    id,
    identifier,
    fullName,
    firstName,
    initials: `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase(),
    documentType,
    documentId,
    phone: "+53 5 000 0000",
    /* El correo se **deriva** del identificador para no inventar dos valores
       por cada trabajador de muestra, pero son dos campos distintos: el alta
       pide los dos por separado (FR-AD-TRAB-3), valida el formato del correo
       (FR-AD-TRAB-6) y comprueba duplicados del identificador. Antes la
       semilla los hacía idénticos —`email: identifier`—, y en la ficha se leía
       el correo entero en «identificador de acceso» tres líneas por encima del
       mismo correo enmascarado, de modo que el enmascarado parecía un adorno y
       la pantalla sugería que eran el mismo campo. */
    email: `${identifier}@puntocash.com`,
    branchId,
    status,
    createdAt: "2026-02-01T09:00:00.000Z",
  };
}

const mutableWorkers: NetworkWorker[] = [
  worker("trb-1", "jperez", "Juan Pérez", "88041203211", "sede-vedado"),
  worker("trb-2", "lgomez", "Lidia Gómez", "91072355442", "sede-vedado"),
  worker("trb-3", "afonseca", "Alberto Fonseca", "85110488763", "sede-vedado"),
  worker("trb-4", "mrivas", "Marisol Rivas", "79031188204", "sede-habana-vieja"),
  worker("trb-5", "cdiaz", "Carlos Díaz", "94022177315", "sede-habana-vieja"),
  worker("trb-6", "ynunez", "Yanet Núñez", "88122099436", "sede-miramar"),
  worker("trb-7", "rmesa", "Ramón Mesa", "76050433127", "sede-matanzas"),
  worker("trb-8", "ecabrera", "Elena Cabrera", "90081566248", "sede-santa-clara"),
  worker("trb-9", "jvaldes", "Jorge Valdés", "83030711059", "sede-santa-clara"),
  worker("trb-10", "sperdomo", "Sonia Perdomo", "92110322160", "sede-camaguey"),
  worker("trb-11", "gsuarez", "Gabriel Suárez", "87070988271", "sede-holguin"),
  /* Desactivado por su Admin: el único que puede volver a activarlo (FR-AD-TRAB-15). */
  worker("trb-12", "nalonso", "Noelia Alonso", "95041255382", "sede-holguin", "desactivado"),
  /* La sede única de Centro Divisas (nota de entrega, §8.3): con cajas y con personal,
     para que su Inicio y su ficha se lean como una sede en marcha y no como un
     caso a medio sembrar. */
  worker("trb-13", "dmoreno", "Dayana Moreno", "89061744593", "sede-centro-habana"),
  worker("trb-14", "ifuentes", "Ismael Fuentes", "81092066404", "sede-centro-habana"),
  /* En la sede suspendida de Bahía: activo, pero sin poder entrar (FR-AD-TRAB-16). */
  worker("trb-15", "rleon", "Raúl León", "86090455215", "sede-trinidad"),
];

const deactivated = mutableWorkers.find((w) => w.id === "trb-12");
if (deactivated) {
  deactivated.deactivation = {
    reason: "Fin de contrato temporal acordado con la trabajadora",
    at: "2026-08-30T16:00:00.000Z",
    by: "Yuliet Pérez",
  };
}

export const WORKERS: readonly NetworkWorker[] = mutableWorkers;

export function findWorkerById(id: string | null | undefined): NetworkWorker | null {
  if (!id) return null;
  return mutableWorkers.find((w) => w.id === id) ?? null;
}

export function findWorkerByIdentifier(identifier: string): NetworkWorker | null {
  const needle = normalizarCuenta(identifier);
  return mutableWorkers.find((w) => w.identifier.toLowerCase() === needle) ?? null;
}

/**
 * A quién pertenece lo tecleado al entrar: vale **el identificador o el
 * correo** (decisión del 28/10/2026). Un identificador no lleva «@», así que
 * los dos no se confunden nunca.
 */
export function findWorkerByCuenta(cuenta: string): NetworkWorker | null {
  return mutableWorkers.find((w) => cuentaCoincide(w, cuenta)) ?? null;
}

/** El correo es único: con él se entra. */
function correoTomado(email: string, exceptoId?: string): boolean {
  const needle = normalizarCuenta(email);
  return mutableWorkers.some((w) => w.id !== exceptoId && w.email.toLowerCase() === needle);
}

export function workersOf(branchId: string): readonly NetworkWorker[] {
  return mutableWorkers.filter((w) => w.branchId === branchId);
}

export function workersOfOperator(operatorId: string): readonly NetworkWorker[] {
  return mutableWorkers.filter((w) => operadorVigente(w.branchId) === operatorId);
}

/**
 * Tres razones distintas por las que un trabajador no puede entrar, que se
 * resuelven de forma distinta y por tanto no deben confundirse (FR-SA-TRAB-7).
 */
export type WorkerAccessBlock =
  | "desactivado"
  | "sede-suspendida"
  | "sede-cerrada"
  | "operador-suspendido"
  | "sin-operador";

export function motivoDeBloqueo(w: NetworkWorker): WorkerAccessBlock | null {
  if (w.status !== "activo") return "desactivado";

  const sede = findSedeById(w.branchId);
  if (sede?.status === "cerrada") return "sede-cerrada";
  if (sede?.status === "suspendida") return "sede-suspendida";

  const operatorId = operadorVigente(w.branchId);
  if (!operatorId) return "sin-operador";
  const operator = findOperatorById(operatorId);
  if (operator?.status !== "activo") return "operador-suspendido";

  return null;
}

export function puedeAcceder(w: NetworkWorker): boolean {
  return motivoDeBloqueo(w) === null;
}

/* -------------------------------------------------------------------------
 * Escrituras — del mercante, nunca de PuntoCash (reglas A4 y A14)
 * ---------------------------------------------------------------------- */

export interface WorkerGuards {
  /** Una jornada abierta impide desactivar y reasignar (FR-AD-TRAB-13, FR-AD-TRAB-14). */
  hasOpenJornada(workerId: string): boolean;
}

const NO_GUARDS: WorkerGuards = { hasOpenJornada: () => false };

export type WorkerWriteDenial =
  | "alcance-global-prohibido"
  | "fuera-de-alcance"
  | "sede-no-encontrada"
  | "sede-cerrada"
  | "identificador-duplicado"
  /* Un nombre de usuario, no un correo (`features/auth/identificador.ts`). */
  | "identificador-invalido"
  | "documento-duplicado"
  /* Con el correo también se entra, así que no puede repetirse. */
  | "correo-duplicado"
  | "correo-invalido"
  | "trabajador-no-encontrado"
  | "jornada-abierta"
  | "motivo-requerido";

export type WorkerWriteResult<T> = { ok: true; value: T } | { ok: false; reason: WorkerWriteDenial };

export interface WorkerScopeContext {
  sedesEnAlcance(operatorId: string): readonly string[];
}

function guardScope(scope: Scope, branchId: string, ctx: WorkerScopeContext): WorkerWriteDenial | null {
  const operator = requireOperatorScope(scope);
  if (!operator.ok) return operator.reason;
  if (!ctx.sedesEnAlcance(operator.value).includes(branchId)) return "fuera-de-alcance";
  return null;
}

/** Mínimo razonable; la validación fina del formato es de la interfaz. */
function isCorreoValido(email: string): boolean {
  const value = email.trim();
  return value.length > 3 && value.includes("@") && !value.includes(" ");
}

export interface CrearTrabajadorInput {
  id: string;
  identifier: string;
  fullName: string;
  firstName: string;
  documentType: DocumentType;
  documentId: string;
  phone: string;
  email: string;
  /** Sede, nunca caja (regla A13). */
  branchId: string;
}

export function crearTrabajador(
  scope: Scope,
  ctx: WorkerScopeContext,
  input: CrearTrabajadorInput,
  now = new Date(),
): WorkerWriteResult<NetworkWorker> {
  const denial = guardScope(scope, input.branchId, ctx);
  if (denial) return { ok: false, reason: denial };

  const sede = findSedeById(input.branchId);
  if (!sede) return { ok: false, reason: "sede-no-encontrada" };
  if (sede.status === "cerrada") return { ok: false, reason: "sede-cerrada" };

  /* Sin correo válido no podría verificar nunca su segundo factor, así que el
     alta no debe permitirse (FR-AD-TRAB-6) [R13]. */
  if (!isCorreoValido(input.email)) return { ok: false, reason: "correo-invalido" };
  if (correoTomado(input.email)) return { ok: false, reason: "correo-duplicado" };
  if (!esIdentificadorValido(input.identifier)) return { ok: false, reason: "identificador-invalido" };
  if (findWorkerByIdentifier(input.identifier)) return { ok: false, reason: "identificador-duplicado" };
  if (mutableWorkers.some((w) => w.documentId === input.documentId)) {
    return { ok: false, reason: "documento-duplicado" };
  }

  const first = input.firstName.trim() || input.fullName.split(" ")[0] || input.fullName;
  const second = input.fullName.split(" ")[1] ?? "";
  const created: NetworkWorker = {
    id: input.id,
    identifier: input.identifier.trim(),
    fullName: input.fullName.trim(),
    firstName: first,
    initials: `${first.charAt(0)}${second.charAt(0)}`.toUpperCase(),
    documentType: input.documentType,
    documentId: input.documentId.trim(),
    phone: input.phone.trim(),
    email: input.email.trim(),
    branchId: input.branchId,
    status: "activo",
    createdAt: now.toISOString(),
  };
  mutableWorkers.push(created);
  return { ok: true, value: created };
}

export function desactivarTrabajador(
  scope: Scope,
  ctx: WorkerScopeContext,
  workerId: string,
  reason: string,
  by: string,
  guards: WorkerGuards = NO_GUARDS,
  now = new Date(),
): WorkerWriteResult<NetworkWorker> {
  const target = findWorkerById(workerId);
  if (!target) return { ok: false, reason: "trabajador-no-encontrado" };

  const denial = guardScope(scope, target.branchId, ctx);
  if (denial) return { ok: false, reason: denial };
  /* Basta con que haya motivo: aquí no se exige un largo mínimo (decisión
     de producto, FR-AD-TRAB-12), a diferencia de los motivos de Cajas,
     Jornadas y Aprobaciones. */
  if (!reason.trim()) return { ok: false, reason: "motivo-requerido" };
  if (guards.hasOpenJornada(workerId)) return { ok: false, reason: "jornada-abierta" };

  target.status = "desactivado";
  target.deactivation = { reason: reason.trim(), at: now.toISOString(), by };
  return { ok: true, value: target };
}

/**
 * Reactivar es siempre posible desde esta consola: **no existe ningún caso en
 * que PuntoCash haya desactivado a un trabajador** (regla A14), así que el
 * Admin nunca se encuentra con una cuenta que no puede recuperar
 * (FR-AD-TRAB-15).
 */
export function reactivarTrabajador(
  scope: Scope,
  ctx: WorkerScopeContext,
  workerId: string,
): WorkerWriteResult<NetworkWorker> {
  const target = findWorkerById(workerId);
  if (!target) return { ok: false, reason: "trabajador-no-encontrado" };

  const denial = guardScope(scope, target.branchId, ctx);
  if (denial) return { ok: false, reason: denial };

  target.status = "activo";
  delete target.deactivation;
  return { ok: true, value: target };
}

/**
 * Reasignar a otra sede del alcance. Tiene efecto inmediato sobre dónde puede
 * iniciar sesión: desde ese momento solo en equipos de su sede nueva
 * (FR-DEV-6, FR-AD-TRAB-14).
 */
export function reasignarTrabajador(
  scope: Scope,
  ctx: WorkerScopeContext,
  workerId: string,
  branchId: string,
  guards: WorkerGuards = NO_GUARDS,
): WorkerWriteResult<NetworkWorker> {
  const target = findWorkerById(workerId);
  if (!target) return { ok: false, reason: "trabajador-no-encontrado" };

  const fromDenial = guardScope(scope, target.branchId, ctx);
  if (fromDenial) return { ok: false, reason: fromDenial };
  const toDenial = guardScope(scope, branchId, ctx);
  if (toDenial) return { ok: false, reason: toDenial };

  const sede = findSedeById(branchId);
  if (!sede) return { ok: false, reason: "sede-no-encontrada" };
  if (sede.status === "cerrada") return { ok: false, reason: "sede-cerrada" };
  if (guards.hasOpenJornada(workerId)) return { ok: false, reason: "jornada-abierta" };

  target.branchId = branchId;
  return { ok: true, value: target };
}

/**
 * Editar los datos personales — **FR-AD-TRAB-9**.
 *
 * ── Qué se puede cambiar aquí, y qué no ──────────────────────────────────
 * Cambian **nombre, apellidos, tipo y número de documento, y teléfono**: los
 * datos que describen a la persona y que se corrigen cuando se escribieron
 * mal o cuando cambia su documento.
 *
 * **No cambian aquí dos cosas, y por motivos distintos.** El **identificador
 * de acceso** es con lo que inicia sesión: cambiarlo en caliente dejaría
 * fuera a alguien que está trabajando, y no hay ninguna pantalla que avise de
 * eso. El **correo** no es un dato de contacto sino el canal del segundo
 * factor **[R13]**, y por eso **FR-AD-TRAB-9** lo nombra aparte y
 * **FR-AD-TRAB-10** lo mete dentro de la asistencia de acceso, donde quien lo
 * corrige está mirando precisamente el problema que causa.
 *
 * La **sede** tampoco: tiene su propia acción porque cambia dónde puede
 * iniciar sesión (**FR-AD-TRAB-14**), y eso no es una edición de datos.
 */
export interface EditarTrabajadorInput {
  fullName: string;
  firstName: string;
  documentType: DocumentType;
  documentId: string;
  phone: string;
}

export function editarTrabajador(
  scope: Scope,
  ctx: WorkerScopeContext,
  workerId: string,
  input: EditarTrabajadorInput,
): WorkerWriteResult<NetworkWorker> {
  const target = findWorkerById(workerId);
  if (!target) return { ok: false, reason: "trabajador-no-encontrado" };

  const denial = guardScope(scope, target.branchId, ctx);
  if (denial) return { ok: false, reason: denial };

  /* El documento sigue siendo único en la red, pero **el suyo propio no
     cuenta**: guardar la ficha sin tocar el documento no puede fallar por
     duplicado contra sí mismo. */
  const documento = input.documentId.trim();
  if (mutableWorkers.some((w) => w.id !== target.id && w.documentId === documento)) {
    return { ok: false, reason: "documento-duplicado" };
  }

  const first = input.firstName.trim() || input.fullName.trim().split(" ")[0] || input.fullName;
  const second = input.fullName.trim().split(" ")[1] ?? "";

  target.fullName = input.fullName.trim();
  target.firstName = first;
  target.initials = `${first.charAt(0)}${second.charAt(0)}`.toUpperCase();
  target.documentType = input.documentType;
  target.documentId = documento;
  target.phone = input.phone.trim();

  return { ok: true, value: target };
}

/**
 * Cambiar el correo de verificación — **FR-AD-TRAB-10**.
 *
 * Es una escritura aparte de `editarTrabajador` a propósito. El correo **no es
 * un dato de contacto**: es el canal por el que llega el segundo factor
 * **[R13]**, así que tocarlo decide si esa persona puede entrar o no. Por eso
 * vive dentro de la asistencia de acceso, donde quien lo cambia está mirando
 * el problema que causa, y por eso exige motivo.
 *
 * Un correo inválido se rechaza con el mismo motivo que en el alta: sin correo
 * válido no hay segundo factor, y sin segundo factor no hay sesión.
 */
export function cambiarCorreoTrabajador(
  scope: Scope,
  ctx: WorkerScopeContext,
  workerId: string,
  email: string,
  motivo: string,
): WorkerWriteResult<{ worker: NetworkWorker; anterior: string }> {
  const target = findWorkerById(workerId);
  if (!target) return { ok: false, reason: "trabajador-no-encontrado" };

  const denial = guardScope(scope, target.branchId, ctx);
  if (denial) return { ok: false, reason: denial };
  /* Sin largo mínimo, como al desactivar (FR-AD-TRAB-10). */
  if (!motivo.trim()) return { ok: false, reason: "motivo-requerido" };
  if (!isCorreoValido(email)) return { ok: false, reason: "correo-invalido" };
  if (correoTomado(email, target.id)) return { ok: false, reason: "correo-duplicado" };

  const anterior = target.email;
  target.email = email.trim();
  return { ok: true, value: { worker: target, anterior } };
}
