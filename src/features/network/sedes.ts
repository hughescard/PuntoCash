/**
 * EL REGISTRO DE SEDES de la red — mock frontend, sin backend.
 *
 * Una sede es siempre propiedad de PuntoCash; lo único que cambia de manos es
 * su administración (`assignments.ts`). Por eso vive aquí y no bajo un
 * operador, y por eso nada de lo que se expone lleva el nombre de un mercante:
 * cada sede es PuntoCash de cara al cliente (AGENTS.md, regla A9).
 *
 * Este módulo tiene dos caras deliberadas:
 *
 *   · `Branch` — la cara PÚBLICA: nombre, dirección, horario, teléfono. Es lo
 *     que leen el kiosco de autoservicio y la pantalla informativa, y lo que
 *     `@/features/branches/branches` reexporta sin cambios para que Worker y
 *     Kiosco no se enteren de que esto se movió (FR-PANT-DATA-4).
 *   · `Sede` — la cara ADMINISTRATIVA: estado, servicios habilitados, fecha de
 *     alta, suspensión vigente. Solo la ve la capa de administración.
 *
 * Quién puede escribir aquí: **solo PuntoCash** (regla A3). Crear una sede,
 * editar sus datos maestros, habilitar sus servicios, suspenderla y cerrarla
 * son los términos de la relación y los límites de la red, no decisiones de
 * dentro de la sucursal. Las cajas, en cambio, las crea su mercante y viven en
 * `registers.ts`: una sede NACE VACÍA (FR-SA-SEDE-4).
 */

import { isGlobal, type Scope } from "./scope";

/** La cara pública de una sede. Idéntica a la que Kiosco y Pantalla ya leían. */
export interface Branch {
  id: string;
  /** Nombre público, siempre bajo la marca PuntoCash. */
  name: string;
  address: string;
  /** Municipio y provincia; el selector de sede de la Pantalla filtra por aquí. */
  locality: string;
  hours: string;
  phone: string;
}

/**
 * `activa` opera con normalidad · `suspendida` no admite jornadas nuevas ni
 * inicio de sesión de sus trabajadores, y es reversible (§13 del FRD de Super
 * Admin) · `cerrada` es el final del ciclo de vida: no se elimina nunca, y
 * todo su histórico sigue accesible [R9].
 */
export type SedeStatus = "activa" | "suspendida" | "cerrada";

export interface SedeSuspension {
  reason: string;
  at: string;
  /** Quién la declaró — siempre un usuario de PuntoCash. */
  by: string;
}

export interface Sede extends Branch {
  status: SedeStatus;
  /** Ids de `WORKER_SERVICES` que PuntoCash habilitó en esta sede (regla A3). */
  services: readonly string[];
  createdAt: string;
  /** Vigente solo mientras `status` es `suspendida`. */
  suspension?: SedeSuspension;
}

/**
 * Mutable en su sitio (nunca reasignado), igual que `CAJA_BALANCES` y
 * `CAJA_MOVEMENTS` en `caja-data.ts`: crear o editar una sede actualiza lo
 * que ya leyeron los consumidores, sin romper la referencia exportada.
 */
const mutableSedes: Sede[] = [
  {
    id: "sede-vedado",
    name: "PuntoCash Vedado",
    address: "Calle 23 esq. a L, Vedado",
    locality: "Plaza de la Revolución, La Habana",
    hours: "Lunes a sábado · 8:30 a.m. – 6:00 p.m.",
    phone: "+53 7 838 1234",
    status: "activa",
    services: ["cambio-moneda", "remesas", "giros"],
    createdAt: "2026-01-15T09:00:00.000Z",
  },
  {
    id: "sede-habana-vieja",
    name: "PuntoCash Obispo",
    address: "Obispo No. 257 e/ Aguiar y Cuba",
    locality: "La Habana Vieja, La Habana",
    hours: "Lunes a sábado · 9:00 a.m. – 6:00 p.m.",
    phone: "+53 7 861 5520",
    status: "activa",
    services: ["cambio-moneda", "remesas", "giros"],
    createdAt: "2026-01-15T09:00:00.000Z",
  },
  {
    id: "sede-miramar",
    name: "PuntoCash Miramar",
    address: "5ta Avenida esq. a 42, Miramar",
    locality: "Playa, La Habana",
    hours: "Lunes a viernes · 8:30 a.m. – 5:30 p.m.",
    phone: "+53 7 204 7788",
    status: "activa",
    services: ["cambio-moneda", "remesas", "giros"],
    createdAt: "2026-02-02T09:00:00.000Z",
  },
  {
    id: "sede-matanzas",
    name: "PuntoCash Matanzas",
    address: "Calle Medio No. 28004 e/ Jovellanos y Matanzas",
    locality: "Matanzas, Matanzas",
    hours: "Lunes a sábado · 8:30 a.m. – 5:00 p.m.",
    phone: "+53 45 24 3310",
    status: "activa",
    /* Sin Cambio de moneda: sirve para comprobar que su Admin no puede definir
       pares y que su lista de monedas sigue existiendo igualmente, porque una
       remesa se paga en alguna moneda (FR-AD-MON-5, FR-AD-TASA-4). */
    services: ["remesas", "giros"],
    createdAt: "2026-03-10T09:00:00.000Z",
  },
  {
    id: "sede-santa-clara",
    name: "PuntoCash Santa Clara",
    address: "Boulevard No. 12 e/ Villuendas y Plácido",
    locality: "Santa Clara, Villa Clara",
    hours: "Lunes a sábado · 8:30 a.m. – 5:30 p.m.",
    phone: "+53 42 20 6641",
    status: "activa",
    services: ["cambio-moneda", "remesas", "giros"],
    createdAt: "2026-03-10T09:00:00.000Z",
  },
  {
    id: "sede-camaguey",
    name: "PuntoCash Camagüey",
    address: "República No. 356 e/ San Martín y Correa",
    locality: "Camagüey, Camagüey",
    hours: "Lunes a sábado · 8:30 a.m. – 5:00 p.m.",
    phone: "+53 32 29 8120",
    status: "activa",
    services: ["cambio-moneda", "remesas", "giros"],
    createdAt: "2026-05-04T09:00:00.000Z",
  },
  {
    id: "sede-holguin",
    name: "PuntoCash Holguín",
    address: "Calle Libertad No. 187 e/ Frexes y Aguilera",
    locality: "Holguín, Holguín",
    hours: "Lunes a sábado · 8:30 a.m. – 5:00 p.m.",
    phone: "+53 24 42 5096",
    status: "activa",
    services: ["cambio-moneda", "remesas", "giros"],
    createdAt: "2026-05-04T09:00:00.000Z",
  },
  {
    /* Recién entrada en la red y todavía sin operador: nace suspendida porque
       sin administrador responsable nadie puede crearle cajas ni vincularle
       equipos (FR-SA-SEDE-10). Es el caso que el Inicio del Super Admin debe
       destacar (FR-SA-HOME-7). */
    id: "sede-santiago",
    name: "PuntoCash Santiago",
    address: "Enramadas No. 402 e/ San Félix y Carnicería",
    locality: "Santiago de Cuba, Santiago de Cuba",
    hours: "Lunes a sábado · 8:30 a.m. – 5:30 p.m.",
    phone: "+53 22 65 3471",
    status: "suspendida",
    services: ["cambio-moneda", "remesas", "giros"],
    createdAt: "2026-09-18T09:00:00.000Z",
  },
];

/** Vista administrativa completa. */
export const SEDES: readonly Sede[] = mutableSedes;

/**
 * Vista pública, la misma lista. `Sede` extiende `Branch`, así que esto es la
 * misma referencia vista con menos campos: el kiosco y la pantalla no pueden
 * leer el estado ni los servicios de una sede aunque quieran.
 */
export const BRANCHES: readonly Branch[] = mutableSedes;

export function findSedeById(id: string | null | undefined): Sede | null {
  if (!id) return null;
  return mutableSedes.find((sede) => sede.id === id) ?? null;
}

export function findBranchById(id: string | null | undefined): Branch | null {
  return findSedeById(id);
}

/** Minúsculas y sin tildes, para que "camaguey" encuentre "Camagüey". */
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Filtro del selector de sede de la Pantalla, mientras se escribe. Busca en
 * nombre, dirección y localidad; una consulta vacía devuelve la red entera.
 */
export function searchBranches(query: string): readonly Branch[] {
  const needle = normalize(query);
  if (!needle) return BRANCHES;
  return BRANCHES.filter((branch) =>
    normalize(`${branch.name} ${branch.address} ${branch.locality}`).includes(needle),
  );
}

export function sedeOfreceServicio(sedeId: string, serviceId: string): boolean {
  const sede = findSedeById(sedeId);
  if (!sede || sede.status === "cerrada") return false;
  return sede.services.includes(serviceId);
}

/** Atajo del eslabón 3 de la cadena de monedas: sin este servicio no hay pares (regla A5). */
export function sedeCotiza(sedeId: string): boolean {
  return sedeOfreceServicio(sedeId, "cambio-moneda");
}

/* -------------------------------------------------------------------------
 * Escrituras — todas exclusivas de PuntoCash (regla A3)
 * ---------------------------------------------------------------------- */

export type SedeWriteDenial =
  | "alcance-insuficiente"
  | "codigo-duplicado"
  | "sede-no-encontrada"
  | "sede-cerrada"
  | "jornadas-abiertas"
  | "ya-suspendida"
  | "no-suspendida"
  | "motivo-requerido"
  | "sin-servicios"
  | "ultimo-servicio";

export type SedeWriteResult<T> = { ok: true; value: T } | { ok: false; reason: SedeWriteDenial };

/** Motivo escrito de al menos 10 caracteres en toda acción de gobierno (FR-SA-STATE-2). */
export const MOTIVO_MIN_LENGTH = 10;

export function isMotivoValido(reason: string): boolean {
  return reason.trim().length >= MOTIVO_MIN_LENGTH;
}

export interface CrearSedeInput {
  id: string;
  name: string;
  address: string;
  locality: string;
  hours: string;
  phone: string;
  services: readonly string[];
}

/**
 * Crea una sede. Nace **sin cajas**: las da de alta su mercante cuando la pone
 * en marcha (FR-SA-SEDE-4). Nace `suspendida` porque todavía no tiene operador
 * asignado; asignarle uno la activa (FR-SA-SEDE-10, `assignments.ts`).
 */
export function crearSede(scope: Scope, input: CrearSedeInput, now = new Date()): SedeWriteResult<Sede> {
  if (!isGlobal(scope)) return { ok: false, reason: "alcance-insuficiente" };
  if (findSedeById(input.id)) return { ok: false, reason: "codigo-duplicado" };
  if (input.services.length === 0) return { ok: false, reason: "sin-servicios" };

  const sede: Sede = {
    id: input.id,
    name: input.name,
    address: input.address,
    locality: input.locality,
    hours: input.hours,
    phone: input.phone,
    status: "suspendida",
    services: [...input.services],
    createdAt: now.toISOString(),
  };
  mutableSedes.push(sede);
  return { ok: true, value: sede };
}

export type EditarSedeInput = Partial<Pick<Sede, "name" | "address" | "locality" | "hours" | "phone">>;

export function editarSede(scope: Scope, sedeId: string, input: EditarSedeInput): SedeWriteResult<Sede> {
  if (!isGlobal(scope)) return { ok: false, reason: "alcance-insuficiente" };
  const sede = findSedeById(sedeId);
  if (!sede) return { ok: false, reason: "sede-no-encontrada" };
  if (sede.status === "cerrada") return { ok: false, reason: "sede-cerrada" };

  Object.assign(sede, input);
  return { ok: true, value: sede };
}

/** Habilitar o deshabilitar un servicio en una sede — solo PuntoCash (regla A3). */
export function fijarServicios(
  scope: Scope,
  sedeId: string,
  services: readonly string[],
): SedeWriteResult<Sede> {
  if (!isGlobal(scope)) return { ok: false, reason: "alcance-insuficiente" };
  const sede = findSedeById(sedeId);
  if (!sede) return { ok: false, reason: "sede-no-encontrada" };
  if (sede.status === "cerrada") return { ok: false, reason: "sede-cerrada" };
  /* Una sucursal abierta sin nada que ofrecer no es una sucursal (FR-SA-SERV-7). */
  if (services.length === 0 && sede.status === "activa") return { ok: false, reason: "ultimo-servicio" };

  sede.services = [...services];
  return { ok: true, value: sede };
}

/**
 * Suspende una sede. **Se permite con jornadas abiertas**, a diferencia de
 * revocar y de cerrar: es la palanca de emergencia de PuntoCash y
 * condicionarla a que no haya caja abierta la inutilizaría justo cuando hace
 * falta (FR-SA-SUS-5). No cierra jornadas, no desvincula equipos, no retira
 * cajas y no desactiva a nadie (FR-SA-SUS-7).
 */
export function suspenderSede(
  scope: Scope,
  sedeId: string,
  reason: string,
  by: string,
  now = new Date(),
): SedeWriteResult<Sede> {
  if (!isGlobal(scope)) return { ok: false, reason: "alcance-insuficiente" };
  if (!isMotivoValido(reason)) return { ok: false, reason: "motivo-requerido" };
  const sede = findSedeById(sedeId);
  if (!sede) return { ok: false, reason: "sede-no-encontrada" };
  if (sede.status === "cerrada") return { ok: false, reason: "sede-cerrada" };
  if (sede.status === "suspendida") return { ok: false, reason: "ya-suspendida" };

  sede.status = "suspendida";
  sede.suspension = { reason: reason.trim(), at: now.toISOString(), by };
  return { ok: true, value: sede };
}

export function reactivarSede(scope: Scope, sedeId: string, reason: string): SedeWriteResult<Sede> {
  if (!isGlobal(scope)) return { ok: false, reason: "alcance-insuficiente" };
  if (!isMotivoValido(reason)) return { ok: false, reason: "motivo-requerido" };
  const sede = findSedeById(sedeId);
  if (!sede) return { ok: false, reason: "sede-no-encontrada" };
  if (sede.status !== "suspendida") return { ok: false, reason: "no-suspendida" };

  sede.status = "activa";
  delete sede.suspension;
  return { ok: true, value: sede };
}

/**
 * Cierra una sede. A diferencia de suspender, **no** se permite con jornadas
 * abiertas: una sucursal no se cierra dejando efectivo sin conciliar
 * (FR-SA-SUS-8). Quien llama pasa esa comprobación, porque el estado de las
 * jornadas vive en `caja-data.ts` y este módulo no debe depender de él.
 *
 * Cerrar **no** retira sus cajas ni desvincula sus equipos: eso es del
 * mercante (FR-SA-SUS-9). Y una sede nunca se elimina [R9].
 */
export function cerrarSede(
  scope: Scope,
  sedeId: string,
  reason: string,
  options: { hasOpenJornadas: boolean },
): SedeWriteResult<Sede> {
  if (!isGlobal(scope)) return { ok: false, reason: "alcance-insuficiente" };
  if (!isMotivoValido(reason)) return { ok: false, reason: "motivo-requerido" };
  const sede = findSedeById(sedeId);
  if (!sede) return { ok: false, reason: "sede-no-encontrada" };
  if (sede.status === "cerrada") return { ok: false, reason: "sede-cerrada" };
  if (options.hasOpenJornadas) return { ok: false, reason: "jornadas-abiertas" };

  sede.status = "cerrada";
  delete sede.suspension;
  return { ok: true, value: sede };
}
