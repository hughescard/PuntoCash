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
 * Quién puede escribir aquí: **PuntoCash** (regla A3). Crear una sede, fijar
 * su código y su nombre, habilitar sus servicios, suspenderla y cerrarla son
 * los términos de la relación y los límites de la red, no decisiones de dentro
 * de la sucursal. La excepción son los **datos de contacto** —dirección,
 * teléfono y horario—, que conoce quien atiende la sucursal y que su
 * administrador corrige desde `datos-de-sede.ts` (**FR-AD-SEDE-14**). Las cajas, en cambio, las crea su mercante y viven en
 * `registers.ts`: una sede NACE VACÍA (FR-SA-SEDE-4).
 */

import {
  horarioDe,
  LUNES_A_SABADO,
  LUNES_A_VIERNES,
  textoDeHorario,
  type HorarioSemanal,
} from "./horario";
import { isGlobal, type Scope } from "./scope";

/** La cara pública de una sede. Idéntica a la que Kiosco y Pantalla ya leían. */
export interface Branch {
  id: string;
  /**
   * Código de sede: **único en la red** (**FR-SA-SEDE-7**) y parte de los
   * datos maestros que fija PuntoCash (**FR-SA-SEDE-5**, regla A3). Es lo que
   * identifica una sede en un listado o en una conversación, donde el nombre
   * público puede repetirse o cambiar.
   *
   * Lo piden cuatro requisitos a la vez: **FR-AD-SEDE-1** (listado),
   * **FR-AD-SCOPE-2** y **FR-AD-SCOPE-3** (selector y cabecera) y
   * **FR-AD-HOME-6** (tabla por sede). Ningún requisito fija su **formato**;
   * solo su unicidad, así que estos tres caracteres son una convención de la
   * demostración y no un contrato.
   */
  code: string;
  /** Nombre público, siempre bajo la marca PuntoCash. */
  name: string;
  address: string;
  /** Municipio y provincia; el selector de sede de la Pantalla filtra por aquí. */
  locality: string;
  /**
   * El horario en texto, **derivado** de `Sede.horario` y nunca escrito a
   * mano: «Lunes a sábado · 9:00 a.m. – 6:00 p.m.», con «; » entre grupos de
   * días. Se conserva para quien solo lee la cara pública.
   */
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
  /** El horario por días (`horario.ts`). `hours` se deriva de aquí. */
  horario: HorarioSemanal;
  createdAt: string;
  /** Vigente solo mientras `status` es `suspendida`. */
  suspension?: SedeSuspension;
}

/**
 * Mutable en su sitio (nunca reasignado), igual que `CAJA_BALANCES` y
 * `CAJA_MOVEMENTS` en `caja-data.ts`: crear o editar una sede actualiza lo
 * que ya leyeron los consumidores, sin romper la referencia exportada.
 */
const SEMILLA: Omit<Sede, "hours">[] = [
  {
    id: "sede-vedado",
    code: "VED",
    name: "PuntoCash Vedado",
    address: "Calle 23 esq. a L, Vedado",
    locality: "Plaza de la Revolución, La Habana",
    horario: horarioDe(LUNES_A_SABADO, "08:30", "18:00"),
    phone: "+53 7 838 1234",
    status: "activa",
    services: ["cambio-moneda", "remesas", "giros"],
    createdAt: "2026-01-15T09:00:00.000Z",
  },
  {
    id: "sede-habana-vieja",
    code: "OBI",
    name: "PuntoCash Obispo",
    address: "Obispo No. 257 e/ Aguiar y Cuba",
    locality: "La Habana Vieja, La Habana",
    horario: horarioDe(LUNES_A_SABADO, "09:00", "18:00"),
    phone: "+53 7 861 5520",
    status: "activa",
    services: ["cambio-moneda", "remesas", "giros"],
    createdAt: "2026-01-15T09:00:00.000Z",
  },
  {
    id: "sede-miramar",
    code: "MIR",
    name: "PuntoCash Miramar",
    address: "5ta Avenida esq. a 42, Miramar",
    locality: "Playa, La Habana",
    horario: horarioDe(LUNES_A_VIERNES, "08:30", "17:30"),
    phone: "+53 7 204 7788",
    status: "activa",
    services: ["cambio-moneda", "remesas", "giros"],
    createdAt: "2026-02-02T09:00:00.000Z",
  },
  {
    id: "sede-matanzas",
    code: "MTZ",
    name: "PuntoCash Matanzas",
    address: "Calle Medio No. 28004 e/ Jovellanos y Matanzas",
    locality: "Matanzas, Matanzas",
    horario: horarioDe(LUNES_A_SABADO, "08:30", "17:00"),
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
    code: "SCL",
    name: "PuntoCash Santa Clara",
    address: "Boulevard No. 12 e/ Villuendas y Plácido",
    locality: "Santa Clara, Villa Clara",
    horario: horarioDe(LUNES_A_SABADO, "08:30", "17:30"),
    phone: "+53 42 20 6641",
    status: "activa",
    services: ["cambio-moneda", "remesas", "giros"],
    createdAt: "2026-03-10T09:00:00.000Z",
  },
  {
    id: "sede-camaguey",
    code: "CMG",
    name: "PuntoCash Camagüey",
    address: "República No. 356 e/ San Martín y Correa",
    locality: "Camagüey, Camagüey",
    horario: horarioDe(LUNES_A_SABADO, "08:30", "17:00"),
    phone: "+53 32 29 8120",
    status: "activa",
    services: ["cambio-moneda", "remesas", "giros"],
    createdAt: "2026-05-04T09:00:00.000Z",
  },
  {
    /* La única sede de su mercante. Existe para que **FR-AD-SCOPE-3** —con una
       sola sede en el alcance, la cabecera muestra su código y nombre como
       texto fijo en vez de un selector— se pueda recorrer y probar sin
       construir datos a mano (nota de entrega, §8.3). */
    id: "sede-centro-habana",
    code: "CHB",
    name: "PuntoCash Centro Habana",
    address: "Avenida Salvador Allende No. 412 e/ Infanta y Belascoaín",
    locality: "Centro Habana, La Habana",
    horario: horarioDe(LUNES_A_SABADO, "09:00", "18:00"),
    phone: "+53 7 878 4410",
    status: "activa",
    services: ["cambio-moneda", "remesas", "giros"],
    createdAt: "2026-03-12T09:00:00.000Z",
  },
  {
    id: "sede-holguin",
    code: "HOL",
    name: "PuntoCash Holguín",
    address: "Calle Libertad No. 187 e/ Frexes y Aguilera",
    locality: "Holguín, Holguín",
    horario: horarioDe(LUNES_A_SABADO, "08:30", "17:00"),
    phone: "+53 24 42 5096",
    status: "activa",
    services: ["cambio-moneda", "remesas", "giros"],
    createdAt: "2026-05-04T09:00:00.000Z",
  },
  {
    /* Recién entregada y todavía **sin ninguna caja**: es el estado en que
       llega toda sede nueva, y el que FR-AD-CAJA-3 exige poder ver. Sin una
       así, el aviso de Inicio, el indicador de la barra lateral y el bloque
       vacío de Cajas quedaban implementados y sin forma de recorrerlos. */
    id: "sede-cerro",
    code: "CER",
    name: "PuntoCash Cerro",
    address: "Calzada del Cerro No. 1204 esq. a Patria",
    locality: "Cerro, La Habana",
    horario: horarioDe(LUNES_A_SABADO, "09:00", "17:30"),
    phone: "+53 7 877 4410",
    status: "activa",
    services: ["cambio-moneda", "remesas", "giros"],
    createdAt: "2026-09-25T09:00:00.000Z",
  },
  {
    /* Recién entrada en la red y todavía sin operador: nace suspendida porque
       sin administrador responsable nadie puede crearle cajas ni vincularle
       equipos (FR-SA-SEDE-10). Es el caso que el Inicio del Super Admin debe
       destacar (FR-SA-HOME-7). */
    id: "sede-santiago",
    code: "STG",
    name: "PuntoCash Santiago",
    address: "Enramadas No. 402 e/ San Félix y Carnicería",
    locality: "Santiago de Cuba, Santiago de Cuba",
    horario: horarioDe(LUNES_A_SABADO, "08:30", "17:30"),
    phone: "+53 22 65 3471",
    status: "suspendida",
    services: ["cambio-moneda", "remesas", "giros"],
    createdAt: "2026-09-18T09:00:00.000Z",
  },
  {
    /* Bahía Cambios: los casos de atención que el resto de la semilla no tiene.
       Trinidad está suspendida por PuntoCash con su operador dentro, y cotiza
       una moneda sin rango; Pinar del Río solo tiene cajas retiradas y ninguna
       moneda en su lista (nota de entrega, §8.3). */
    id: "sede-trinidad",
    code: "TRI",
    name: "PuntoCash Trinidad",
    address: "Calle Simón Bolívar No. 352 e/ Gutiérrez y Martí",
    locality: "Trinidad, Sancti Spíritus",
    horario: horarioDe(LUNES_A_SABADO, "09:00", "17:30"),
    phone: "+53 41 99 6620",
    status: "suspendida",
    services: ["cambio-moneda", "remesas", "giros"],
    createdAt: "2026-06-01T09:00:00.000Z",
    suspension: {
      reason: "Revisión de la documentación de la licencia de la sucursal",
      at: "2026-10-17T14:00:00.000Z",
      by: "PuntoCash",
    },
  },
  {
    id: "sede-pinar",
    code: "PRI",
    name: "PuntoCash Pinar del Río",
    address: "Calle Martí No. 115 e/ Isabel Rubio y Colón",
    locality: "Pinar del Río, Pinar del Río",
    horario: horarioDe(LUNES_A_VIERNES, "08:30", "17:00"),
    phone: "+53 48 75 2214",
    status: "activa",
    services: ["cambio-moneda", "remesas", "giros"],
    createdAt: "2026-06-01T09:00:00.000Z",
  },
];

/* El texto del horario sale siempre de los datos (`horario.ts`). */
const mutableSedes: Sede[] = SEMILLA.map((s) => ({ ...s, hours: textoDeHorario(s.horario) }));

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

/** Busca por código de sede, sin distinguir mayúsculas ni espacios sobrantes. */
export function findSedeByCode(code: string | null | undefined): Sede | null {
  if (!code) return null;
  const needle = code.trim().toUpperCase();
  return mutableSedes.find((sede) => sede.code === needle) ?? null;
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
  code: string;
  name: string;
  address: string;
  locality: string;
  horario: HorarioSemanal;
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
  /* Dos comprobaciones y no una: el identificador interno y el **código** son
     cosas distintas, y el que **FR-SA-SEDE-7** exige único en la red es el
     código ("Ya existe una sede con ese código."). */
  if (findSedeById(input.id) || findSedeByCode(input.code)) {
    return { ok: false, reason: "codigo-duplicado" };
  }
  if (input.services.length === 0) return { ok: false, reason: "sin-servicios" };

  const sede: Sede = {
    id: input.id,
    code: input.code.trim().toUpperCase(),
    name: input.name,
    address: input.address,
    locality: input.locality,
    horario: input.horario,
    hours: textoDeHorario(input.horario),
    phone: input.phone,
    status: "suspendida",
    services: [...input.services],
    createdAt: now.toISOString(),
  };
  mutableSedes.push(sede);
  return { ok: true, value: sede };
}

export type EditarSedeInput = Partial<
  Pick<Sede, "code" | "name" | "address" | "locality" | "horario" | "phone">
>;

export function editarSede(scope: Scope, sedeId: string, input: EditarSedeInput): SedeWriteResult<Sede> {
  if (!isGlobal(scope)) return { ok: false, reason: "alcance-insuficiente" };
  const sede = findSedeById(sedeId);
  if (!sede) return { ok: false, reason: "sede-no-encontrada" };
  if (sede.status === "cerrada") return { ok: false, reason: "sede-cerrada" };

  /* Cambiar el código sigue estando sujeto a su unicidad (**FR-SA-SEDE-7**):
     editar no es una puerta trasera para duplicarlo. */
  if (input.code !== undefined) {
    const otra = findSedeByCode(input.code);
    if (otra && otra.id !== sede.id) return { ok: false, reason: "codigo-duplicado" };
    input = { ...input, code: input.code.trim().toUpperCase() };
  }

  Object.assign(sede, input);
  if (input.horario) sede.hours = textoDeHorario(input.horario);
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
