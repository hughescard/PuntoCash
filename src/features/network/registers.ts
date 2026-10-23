/**
 * LAS CAJAS de cada sede — el enlace Caja → Sede que el dominio no tenía.
 *
 * Hasta ahora las cajas se generaban al vuelo (`registersOf` devolvía cuatro
 * por sede, siempre iguales) porque nadie las administraba. Con la capa de
 * administración pasan a ser datos: **las crea y las retira el mercante**
 * (regla A4, FR-AD-CAJA-*), no PuntoCash, que solo las ve (regla A14).
 *
 * Una caja es además el objeto al que se vincula un equipo
 * (`@/features/devices/device-link`), así que su ciclo de vida y el del equipo
 * son independientes: retirar una caja exige desvincular antes, y desvincular
 * un equipo no retira su caja ni cierra su jornada (regla A11).
 *
 * Los identificadores se conservan con el formato que ya generaba
 * `registersOf` — `<sedeId>:caja-NN` — para que un equipo ya vinculado en el
 * navegador de la demo siga resolviendo su caja después de este cambio.
 */

import { findSedeById, isMotivoValido } from "./sedes";
import { requireOperatorScope, type Scope } from "./scope";

export type RegisterStatus = "activa" | "retirada";

/**
 * `id` y `name` conservan la forma que Worker y el simulador ya leen; el resto
 * es nuevo y solo lo consume la capa de administración.
 */
export interface Register {
  id: string;
  branchId: string;
  /** "Caja 03" — lo que se ve en la cabecera de Worker y en cada comprobante. */
  name: string;
  status: RegisterStatus;
  createdAt: string;
  /** Quién la dio de alta (**FR-AD-CAJA-1**). Las cajas con que arranca la red no lo tienen. */
  createdBy?: string;
  retiredAt?: string;
  retiredReason?: string;
}

/**
 * Cajas con las que arranca cada sede en la demo.
 *
 * Todas las sedes en marcha tienen al menos tres. El número varía entre sedes
 * para que los listados de administración no se vean uniformes.
 *
 * Hay **dos** sedes sin cajas, y cada una sirve a una consola distinta:
 *
 *   · `sede-santiago` — recién entrada en la red, sin operador asignado. Al no
 *     tener operador queda fuera del alcance de todo administrador, así que es
 *     el caso del Inicio de **Super Admin** (FR-SA-HOME-3).
 *   · `sede-cerro` — asignada a Malecón y sin poner en marcha. Es la que
 *     recorre **FR-AD-CAJA-3** y el indicador de Cajas del shell de `/admin`.
 *
 * Las dos se declaran en cero a propósito, en vez de quedarse fuera del mapa:
 * una ausencia se lee como olvido, y un valor por defecto futuro las llenaría
 * de cajas sin que nadie lo note.
 */
const SEED_REGISTERS_PER_BRANCH: Readonly<Record<string, number>> = {
  "sede-vedado": 4,
  "sede-habana-vieja": 4,
  "sede-miramar": 3,
  "sede-matanzas": 4,
  "sede-santa-clara": 3,
  "sede-camaguey": 4,
  "sede-centro-habana": 3,
  "sede-holguin": 3,
  "sede-cerro": 0,
  "sede-santiago": 0,
  "sede-trinidad": 3,
  /* Solo cajas retiradas: el aviso de sede sin cajas activas (FR-AD-CAJA-2). */
  "sede-pinar": 2,
};

/** Las cajas de la semilla que arrancan retiradas, con su motivo. */
const SEED_RETIRADAS: Readonly<Record<string, string>> = {
  "sede-pinar:caja-01": "Local cerrado por obras de reparación del techo",
  "sede-pinar:caja-02": "Local cerrado por obras de reparación del techo",
};

function seed(): Register[] {
  const out: Register[] = [];
  for (const [branchId, count] of Object.entries(SEED_REGISTERS_PER_BRANCH)) {
    for (let i = 0; i < count; i += 1) {
      const number = String(i + 1).padStart(2, "0");
      out.push({
        id: `${branchId}:caja-${number}`,
        branchId,
        name: `Caja ${number}`,
        status: "activa",
        createdAt: "2026-01-15T09:00:00.000Z",
      });
      const motivo = SEED_RETIRADAS[out[out.length - 1]!.id];
      if (motivo) {
        const caja = out[out.length - 1]!;
        caja.status = "retirada";
        caja.retiredAt = "2026-10-10T15:00:00.000Z";
        caja.retiredReason = motivo;
      }
    }
  }
  return out;
}

const mutableRegisters: Register[] = seed();

export const REGISTERS: readonly Register[] = mutableRegisters;

/** Cajas **activas** de una sede — lo que se puede vincular y operar. */
export function registersOf(branchId: string): readonly Register[] {
  if (!findSedeById(branchId)) return [];
  return mutableRegisters.filter((r) => r.branchId === branchId && r.status === "activa");
}

/** Incluye las retiradas: su histórico de jornadas y operaciones sigue siendo consultable [R9]. */
export function allRegistersOf(branchId: string): readonly Register[] {
  return mutableRegisters.filter((r) => r.branchId === branchId);
}

/**
 * Busca por id, **también entre las retiradas**: un equipo vinculado o una
 * jornada histórica pueden apuntar a una caja que ya se retiró, y esa
 * referencia tiene que seguir resolviendo.
 */
export function findRegisterById(id: string | null | undefined): Register | null {
  if (!id) return null;
  return mutableRegisters.find((r) => r.id === id) ?? null;
}

/* -------------------------------------------------------------------------
 * Escrituras — del mercante, nunca de PuntoCash (reglas A4 y A14)
 * ---------------------------------------------------------------------- */

/**
 * Comprobaciones que este módulo NO puede hacer por sí mismo y recibe de quien
 * llama.
 *
 * El estado de la jornada vive en `jornadas.ts` y el vínculo del equipo en
 * `devices.ts`; quien llama las pasa (`features/admin/register-guards.ts`).
 * Inyectarlas evita que este módulo dependa de esos dos, que a su vez
 * dependen de él.
 */
export interface RegisterGuards {
  hasOpenJornada(registerId: string): boolean;
  hasLinkedDevice(registerId: string): boolean;
}

const NO_GUARDS: RegisterGuards = {
  hasOpenJornada: () => false,
  hasLinkedDevice: () => false,
};

export type RegisterWriteDenial =
  | "alcance-global-prohibido"
  | "fuera-de-alcance"
  | "sede-no-encontrada"
  | "sede-cerrada"
  | "nombre-duplicado"
  | "caja-no-encontrada"
  | "ya-retirada"
  | "no-retirada"
  | "jornada-abierta"
  | "equipo-vinculado"
  | "ultima-caja"
  | "motivo-requerido";

export type RegisterWriteResult<T> = { ok: true; value: T } | { ok: false; reason: RegisterWriteDenial };

/**
 * Comprueba que quien escribe es el mercante de esa sede. `sedesDeOperador`
 * se recibe como función para no importar `assignments.ts` desde aquí, que a
 * su vez necesita este módulo para contar cajas.
 */
export interface RegisterScopeContext {
  /** Sedes con asignación vigente al operador del alcance. */
  sedesEnAlcance(operatorId: string): readonly string[];
}

function guardScope(
  scope: Scope,
  branchId: string,
  ctx: RegisterScopeContext,
): RegisterWriteDenial | null {
  const operator = requireOperatorScope(scope);
  if (!operator.ok) return operator.reason;
  if (!ctx.sedesEnAlcance(operator.value).includes(branchId)) return "fuera-de-alcance";
  return null;
}

export function crearCaja(
  scope: Scope,
  ctx: RegisterScopeContext,
  input: { branchId: string; name: string; createdBy?: string },
  now = new Date(),
): RegisterWriteResult<Register> {
  const denial = guardScope(scope, input.branchId, ctx);
  if (denial) return { ok: false, reason: denial };

  const sede = findSedeById(input.branchId);
  if (!sede) return { ok: false, reason: "sede-no-encontrada" };
  if (sede.status === "cerrada") return { ok: false, reason: "sede-cerrada" };

  const name = input.name.trim();
  /* Único dentro de su sede, no en la red: dos sucursales tienen su Caja 01. */
  if (allRegistersOf(input.branchId).some((r) => r.name.toLowerCase() === name.toLowerCase())) {
    return { ok: false, reason: "nombre-duplicado" };
  }

  /* El identificador interno sale del nombre, pero dos nombres distintos
     pueden dar el mismo («Caja 05» y «Caja-05», o uno sin letras latinas):
     si ya existe, se numera. Que dos cajas compartan identificador haría que
     retirar o vincular una actuara sobre la otra. */
  const slug =
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "caja";
  let id = `${input.branchId}:${slug}`;
  for (let n = 2; findRegisterById(id); n += 1) id = `${input.branchId}:${slug}-${n}`;
  const register: Register = {
    id,
    branchId: input.branchId,
    name,
    status: "activa",
    createdAt: now.toISOString(),
    ...(input.createdBy ? { createdBy: input.createdBy } : {}),
  };
  mutableRegisters.push(register);
  return { ok: true, value: register };
}

/**
 * Retira una caja. Exige que no tenga jornada abierta ni equipo vinculado: las
 * dos acciones que lo resuelven son del propio Admin, así que el camino está
 * entero en su mano (FR-AD-CAJA-9, FR-AD-CAJA-10).
 *
 * No borra nada: su histórico permanece íntegro y la caja sigue apareciendo en
 * los listados históricos marcada como retirada [R9].
 */
export function retirarCaja(
  scope: Scope,
  ctx: RegisterScopeContext,
  registerId: string,
  reason: string,
  guards: RegisterGuards = NO_GUARDS,
  now = new Date(),
): RegisterWriteResult<Register> {
  const register = findRegisterById(registerId);
  if (!register) return { ok: false, reason: "caja-no-encontrada" };

  const denial = guardScope(scope, register.branchId, ctx);
  if (denial) return { ok: false, reason: denial };

  if (!isMotivoValido(reason)) return { ok: false, reason: "motivo-requerido" };
  if (register.status === "retirada") return { ok: false, reason: "ya-retirada" };
  if (guards.hasOpenJornada(registerId)) return { ok: false, reason: "jornada-abierta" };
  if (guards.hasLinkedDevice(registerId)) return { ok: false, reason: "equipo-vinculado" };

  const sede = findSedeById(register.branchId);
  /* Dejaría la sucursal sin ningún mostrador operable (FR-AD-CAJA-13). */
  if (sede?.status === "activa" && registersOf(register.branchId).length <= 1) {
    return { ok: false, reason: "ultima-caja" };
  }

  register.status = "retirada";
  register.retiredAt = now.toISOString();
  register.retiredReason = reason.trim();
  return { ok: true, value: register };
}

/** Reactivar no restaura ningún vínculo de equipo: hay que vincular uno de nuevo (FR-AD-CAJA-12). */
export function reactivarCaja(
  scope: Scope,
  ctx: RegisterScopeContext,
  registerId: string,
): RegisterWriteResult<Register> {
  const register = findRegisterById(registerId);
  if (!register) return { ok: false, reason: "caja-no-encontrada" };

  const denial = guardScope(scope, register.branchId, ctx);
  if (denial) return { ok: false, reason: denial };
  if (register.status !== "retirada") return { ok: false, reason: "no-retirada" };

  const sede = findSedeById(register.branchId);
  if (!sede || sede.status === "cerrada") return { ok: false, reason: "sede-cerrada" };

  register.status = "activa";
  delete register.retiredAt;
  delete register.retiredReason;
  return { ok: true, value: register };
}
