/**
 * LOS MERCANTES y sus usuarios administradores.
 *
 * Un operador es la persona o empresa a la que PuntoCash entrega una o más
 * sedes en administración. **Nunca es propietaria**: lo delegado es la
 * explotación (Administración PRD §1).
 *
 * El reparto de quién crea a quién es deliberado (regla A3 y FR-SA-OPE-6):
 *
 *   · PuntoCash da de alta al operador y **un único** usuario administrador,
 *     que es lo que se entrega a la empresa cuando se le asigna una sede.
 *   · **Ese usuario crea los demás** usuarios de su propia empresa
 *     (FR-AD-USR-2). Todos tienen exactamente las mismas potestades sobre
 *     todas sus sedes: no hay sub-roles en esta versión.
 *
 * La única excepción, y existe solo para un caso, es FR-SA-OPE-11: si un
 * mercante se queda sin ningún usuario activo, PuntoCash puede regenerar la
 * credencial del inicial que creó. No crea uno nuevo ni toca ningún otro.
 */

import { esIdentificadorValido, normalizarCuenta } from "@/features/auth/identificador";
import { isGlobal, requireOperatorScope, type Scope } from "./scope";
import { isMotivoValido } from "./sedes";

export type OperatorStatus = "activo" | "suspendido" | "baja";

export interface OperatorSuspension {
  reason: string;
  at: string;
  by: string;
}

export interface Operator {
  id: string;
  /** Nombre o razón social. Aparece como dato, nunca como marca (regla A9). */
  name: string;
  legalId: string;
  contactName: string;
  phone: string;
  email: string;
  status: OperatorStatus;
  createdAt: string;
  suspension?: OperatorSuspension;
}

export type AdminUserStatus = "activo" | "desactivado";

export interface AdminUser {
  id: string;
  operatorId: string;
  identifier: string;
  fullName: string;
  /** Canal del segundo factor: sin correo no podría acceder nunca [R13]. */
  email: string;
  phone: string;
  status: AdminUserStatus;
  /**
   * El que entregó PuntoCash al dar de alta al operador (FR-SA-OPE-5).
   *
   * Es un **hecho histórico**, no un papel: dice qué cuenta creó PuntoCash y
   * no cambia nunca. Quien manda hoy sobre los usuarios es `isPrincipal`, que
   * nace igual a este y **se puede traspasar**.
   */
  isInitial: boolean;
  /**
   * **El administrador principal del mercante** (**FR-AD-USR-11**).
   *
   * Es el único que entra en §8: da de alta, edita, desactiva y reactiva
   * usuarios. Los demás administradores pueden todo lo demás de la consola y
   * **nada** de esto. Hay **exactamente uno activo** por operador en todo
   * momento: nace con el que entregó PuntoCash y solo cambia de manos cuando
   * él lo traspasa.
   */
  isPrincipal: boolean;
  createdAt: string;
  lastAccessAt?: string;
}

const mutableOperators: Operator[] = [
  {
    id: "op-malecon",
    name: "Malecón Servicios Financieros S.R.L.",
    legalId: "CI-8804120321",
    contactName: "Marta Sánchez",
    phone: "+53 5 234 1190",
    email: "marta@malecon-sf.cu",
    status: "activo",
    createdAt: "2026-01-15T09:00:00.000Z",
  },
  {
    id: "op-caribe",
    name: "Caribe Cambios S.A.",
    legalId: "CI-9107235544",
    contactName: "Reinaldo Ortega",
    phone: "+53 5 812 7733",
    email: "rortega@caribecambios.cu",
    status: "activo",
    createdAt: "2026-02-02T09:00:00.000Z",
  },
  {
    /* Suspendido, con sedes y trabajadores: sirve para comprobar el alcance de
       FR-SA-OPE-11 y que suspender no desmonta nada (FR-SA-SUS-7). */
    id: "op-oriente",
    name: "Oriente Divisas",
    legalId: "CI-8511048876",
    contactName: "Yuliet Pérez",
    phone: "+53 5 445 0021",
    email: "yperez@orientedivisas.cu",
    status: "suspendido",
    createdAt: "2026-05-04T09:00:00.000Z",
    suspension: {
      reason: "Revisión de cierres con diferencia reiterada en dos de sus sedes",
      at: "2026-09-19T14:20:00.000Z",
      by: "PuntoCash · Control interno",
    },
  },
  {
    /* Activo y **sin ninguna sede asignada**: PuntoCash ya dio de alta al
       mercante y le entregó su usuario inicial, pero todavía no le ha
       asignado nada. Es el estado que exigen FR-AD-ACC-7 y FR-AD-HOME-8 —
       la sesión se abre y el Inicio lo explica— y sin él no habría forma de
       recorrerlo en la demostración. */
    id: "op-cienfuegos",
    name: "Cienfuegos Cambio S.R.L.",
    legalId: "CI-9312076610",
    contactName: "Liudmila Pérez",
    phone: "+53 5 677 4412",
    email: "lperez@cienfuegoscambio.cu",
    status: "activo",
    createdAt: "2026-09-18T09:00:00.000Z",
  },
  {
    /* **Una sola sede.** Es el mercante que hace recorrible FR-AD-SCOPE-3
       (nota de entrega, §8.3): su cabecera no muestra selector, sino el código y el
       nombre de su única sede como texto fijo. */
    id: "op-centro",
    name: "Centro Divisas S.R.L.",
    legalId: "CI-8604092117",
    contactName: "Idalmis Betancourt",
    phone: "+53 5 304 6618",
    email: "ibetancourt@centrodivisas.cu",
    status: "activo",
    createdAt: "2026-03-12T09:00:00.000Z",
  },
  {
    /* Los casos de atención que el resto de la semilla no tiene: una sede
       suspendida dentro de su alcance y otra solo con cajas retiradas. */
    id: "op-bahia",
    name: "Bahía Cambios S.R.L.",
    legalId: "CI-8807150933",
    contactName: "Ana Barrios",
    phone: "+53 5 702 4418",
    email: "abarrios@bahiacambios.cu",
    status: "activo",
    createdAt: "2026-06-01T09:00:00.000Z",
  },
  {
    /* Dado de baja y sin sedes: su historial sigue accesible [R9]. */
    id: "op-atlantico",
    name: "Atlántico Casas de Cambio",
    legalId: "CI-7903118820",
    contactName: "Osmany Vega",
    phone: "+53 5 118 9902",
    email: "ovega@atlanticocc.cu",
    status: "baja",
    createdAt: "2026-01-15T09:00:00.000Z",
  },
];

export const OPERATORS: readonly Operator[] = mutableOperators;

const mutableAdminUsers: AdminUser[] = [
  {
    id: "adm-malecon-1",
    operatorId: "op-malecon",
    identifier: "msanchez",
    fullName: "Marta Sánchez",
    email: "marta@malecon-sf.cu",
    phone: "+53 5 234 1190",
    status: "activo",
    isInitial: true,
    isPrincipal: true,
    createdAt: "2026-01-15T09:00:00.000Z",
    lastAccessAt: "2026-09-23T08:12:00.000Z",
  },
  {
    /* Creado por Marta, no por PuntoCash: es el caso de FR-AD-USR-2. */
    id: "adm-malecon-2",
    operatorId: "op-malecon",
    identifier: "dcastro",
    fullName: "Daniel Castro",
    email: "dcastro@malecon-sf.cu",
    phone: "+53 5 234 1204",
    status: "activo",
    isInitial: false,
    isPrincipal: false,
    createdAt: "2026-04-11T10:30:00.000Z",
    lastAccessAt: "2026-09-22T17:40:00.000Z",
  },
  {
    id: "adm-caribe-1",
    operatorId: "op-caribe",
    identifier: "rortega",
    fullName: "Reinaldo Ortega",
    email: "rortega@caribecambios.cu",
    phone: "+53 5 611 7788",
    status: "activo",
    isInitial: true,
    isPrincipal: true,
    createdAt: "2026-02-02T09:00:00.000Z",
    lastAccessAt: "2026-09-23T07:55:00.000Z",
  },
  {
    /* El usuario de un mercante con **una sola sede**: su cabecera muestra el
       código y el nombre fijos, no un selector (**FR-AD-SCOPE-3**). */
    id: "adm-centro-1",
    operatorId: "op-centro",
    identifier: "ibetancourt",
    fullName: "Idalmis Betancourt",
    email: "ibetancourt@centrodivisas.cu",
    phone: "+53 5 442 3310",
    status: "activo",
    isInitial: true,
    isPrincipal: true,
    createdAt: "2026-03-12T09:00:00.000Z",
    lastAccessAt: "2026-09-29T08:20:00.000Z",
  },
  {
    /* El usuario inicial de un mercante que todavía no administra ninguna
       sede. Entra con normalidad; lo que ve es un Inicio vacío explicado. */
    id: "adm-cienfuegos-1",
    operatorId: "op-cienfuegos",
    identifier: "lperez",
    fullName: "Liudmila Pérez",
    email: "lperez@cienfuegoscambio.cu",
    phone: "+53 5 330 9025",
    status: "activo",
    isInitial: true,
    isPrincipal: true,
    createdAt: "2026-09-18T09:00:00.000Z",
  },
  {
    id: "adm-bahia-1",
    operatorId: "op-bahia",
    identifier: "abarrios",
    fullName: "Ana Barrios",
    email: "abarrios@bahiacambios.cu",
    phone: "+53 5 702 4418",
    status: "activo",
    isInitial: true,
    isPrincipal: true,
    createdAt: "2026-06-01T09:00:00.000Z",
    lastAccessAt: "2026-10-18T09:12:00.000Z",
  },
  {
    id: "adm-oriente-1",
    operatorId: "op-oriente",
    identifier: "yperez",
    fullName: "Yuliet Pérez",
    email: "yperez@orientedivisas.cu",
    phone: "+53 5 228 4471",
    status: "activo",
    isInitial: true,
    isPrincipal: true,
    createdAt: "2026-05-04T09:00:00.000Z",
    lastAccessAt: "2026-09-19T11:02:00.000Z",
  },
];

export const ADMIN_USERS: readonly AdminUser[] = mutableAdminUsers;

export function findOperatorById(id: string | null | undefined): Operator | null {
  if (!id) return null;
  return mutableOperators.find((o) => o.id === id) ?? null;
}

export function findAdminUserById(id: string | null | undefined): AdminUser | null {
  if (!id) return null;
  return mutableAdminUsers.find((u) => u.id === id) ?? null;
}

export function adminUsersOf(operatorId: string): readonly AdminUser[] {
  return mutableAdminUsers.filter((u) => u.operatorId === operatorId);
}

export function activeAdminUsersOf(operatorId: string): readonly AdminUser[] {
  return adminUsersOf(operatorId).filter((u) => u.status === "activo");
}

/**
 * Si el operador está suspendido o dado de baja, ninguno de sus usuarios
 * entra, aunque su propia cuenta esté activa (regla A14, FR-AD-ACC-6).
 */
/** El administrador principal del operador, o `null` si no lo hubiera. */
export function administradorPrincipalDe(operatorId: string): AdminUser | null {
  return mutableAdminUsers.find((u) => u.operatorId === operatorId && u.isPrincipal) ?? null;
}

/** Si este usuario es el principal de su empresa (**FR-AD-USR-11**). */
export function esAdministradorPrincipal(userId: string): boolean {
  return findAdminUserById(userId)?.isPrincipal === true;
}

export function adminUserPuedeAcceder(user: AdminUser): boolean {
  if (user.status !== "activo") return false;
  const operator = findOperatorById(user.operatorId);
  return operator?.status === "activo";
}

/* -------------------------------------------------------------------------
 * Escrituras de PuntoCash (regla A3)
 * ---------------------------------------------------------------------- */

export type OperatorWriteDenial =
  | "alcance-insuficiente"
  | "operador-no-encontrado"
  | "operador-duplicado"
  | "identificador-duplicado"
  /* El identificador es un nombre de usuario: ni vacío, ni con «@», ni con
     caracteres raros (`features/auth/identificador.ts`). */
  | "identificador-invalido"
  /* Dos cuentas con el mismo correo harían ambiguo entrar con el correo. */
  | "correo-duplicado"
  | "motivo-requerido"
  | "ya-suspendido"
  | "no-suspendido"
  | "dado-de-baja"
  | "tiene-sedes"
  | "usuario-no-encontrado"
  /* Traspasarse el papel a uno mismo. */
  | "es-uno-mismo"
  | "no-es-el-inicial"
  | "correo-invalido"
  /* **FR-AD-USR-11**: §8 entera pertenece al administrador principal. */
  | "no-es-el-principal"
  /* Al principal no lo desactiva nadie: es lo que garantiza que la empresa
     nunca se quede sin quien administre sus usuarios. */
  | "es-el-principal"
  /* Traspasar el papel exige un destino **activo**: dárselo a alguien
     desactivado dejaría a la empresa sin nadie que pueda administrar
     usuarios, que es justo lo que el papel existe para impedir. */
  | "destino-no-activo";

export type OperatorWriteResult<T> = { ok: true; value: T } | { ok: false; reason: OperatorWriteDenial };

function identifierTaken(identifier: string, exceptoId?: string): boolean {
  const needle = normalizarCuenta(identifier);
  return mutableAdminUsers.some((u) => u.id !== exceptoId && u.identifier.toLowerCase() === needle);
}

/**
 * El correo también es único, y no por pulcritud: con él se entra
 * (decisión del 28/10/2026), así que dos cuentas con el mismo correo dejarían
 * sin respuesta a quién pertenece lo que se teclea.
 */
function correoTomado(email: string, exceptoId?: string): boolean {
  const needle = normalizarCuenta(email);
  return mutableAdminUsers.some((u) => u.id !== exceptoId && u.email.toLowerCase() === needle);
}

export interface CrearOperadorInput {
  id: string;
  name: string;
  legalId: string;
  contactName: string;
  phone: string;
  email: string;
  /** El usuario administrador inicial, que se entrega a la empresa. */
  initialUser: { id: string; identifier: string; fullName: string; email: string; phone: string };
}

/**
 * Da de alta un mercante y **un único** usuario administrador. No asigna
 * sedes: asignar es un acto propio (FR-SA-OPE-7).
 */
export function crearOperador(
  scope: Scope,
  input: CrearOperadorInput,
  now = new Date(),
): OperatorWriteResult<{ operator: Operator; user: AdminUser }> {
  if (!isGlobal(scope)) return { ok: false, reason: "alcance-insuficiente" };
  if (findOperatorById(input.id)) return { ok: false, reason: "operador-duplicado" };
  if (!esIdentificadorValido(input.initialUser.identifier)) return { ok: false, reason: "identificador-invalido" };
  if (identifierTaken(input.initialUser.identifier)) return { ok: false, reason: "identificador-duplicado" };
  if (correoTomado(input.initialUser.email)) return { ok: false, reason: "correo-duplicado" };

  const operator: Operator = {
    id: input.id,
    name: input.name,
    legalId: input.legalId,
    contactName: input.contactName,
    phone: input.phone,
    email: input.email,
    status: "activo",
    createdAt: now.toISOString(),
  };
  const user: AdminUser = {
    id: input.initialUser.id,
    operatorId: operator.id,
    identifier: input.initialUser.identifier,
    fullName: input.initialUser.fullName,
    email: input.initialUser.email,
    phone: input.initialUser.phone,
    status: "activo",
    isInitial: true,
    isPrincipal: true,
    createdAt: now.toISOString(),
  };
  mutableOperators.push(operator);
  mutableAdminUsers.push(user);
  return { ok: true, value: { operator, user } };
}

/**
 * Suspende a un mercante. Es la acción de mayor alcance de la consola de
 * PuntoCash: corta el acceso de sus usuarios administradores **y** el de todos
 * los trabajadores de todas sus sedes (FR-SA-SUS-3). No desmonta nada
 * (FR-SA-SUS-7).
 */
export function suspenderOperador(
  scope: Scope,
  operatorId: string,
  reason: string,
  by: string,
  now = new Date(),
): OperatorWriteResult<Operator> {
  if (!isGlobal(scope)) return { ok: false, reason: "alcance-insuficiente" };
  if (!isMotivoValido(reason)) return { ok: false, reason: "motivo-requerido" };
  const operator = findOperatorById(operatorId);
  if (!operator) return { ok: false, reason: "operador-no-encontrado" };
  if (operator.status === "baja") return { ok: false, reason: "dado-de-baja" };
  if (operator.status === "suspendido") return { ok: false, reason: "ya-suspendido" };

  operator.status = "suspendido";
  operator.suspension = { reason: reason.trim(), at: now.toISOString(), by };
  return { ok: true, value: operator };
}

export function reactivarOperador(
  scope: Scope,
  operatorId: string,
  reason: string,
): OperatorWriteResult<Operator> {
  if (!isGlobal(scope)) return { ok: false, reason: "alcance-insuficiente" };
  if (!isMotivoValido(reason)) return { ok: false, reason: "motivo-requerido" };
  const operator = findOperatorById(operatorId);
  if (!operator) return { ok: false, reason: "operador-no-encontrado" };
  if (operator.status !== "suspendido") return { ok: false, reason: "no-suspendido" };

  operator.status = "activo";
  delete operator.suspension;
  return { ok: true, value: operator };
}

/** Dar de baja exige que no administre ninguna sede (FR-SA-OPE-13). */
export function darDeBajaOperador(
  scope: Scope,
  operatorId: string,
  reason: string,
  options: { sedesAsignadas: number },
): OperatorWriteResult<Operator> {
  if (!isGlobal(scope)) return { ok: false, reason: "alcance-insuficiente" };
  if (!isMotivoValido(reason)) return { ok: false, reason: "motivo-requerido" };
  const operator = findOperatorById(operatorId);
  if (!operator) return { ok: false, reason: "operador-no-encontrado" };
  if (operator.status === "baja") return { ok: false, reason: "dado-de-baja" };
  if (options.sedesAsignadas > 0) return { ok: false, reason: "tiene-sedes" };

  operator.status = "baja";
  delete operator.suspension;
  return { ok: true, value: operator };
}

/**
 * La **única** escritura de PuntoCash sobre un usuario de un mercante, y
 * existe solo para el caso en que la empresa se quedó sin ningún usuario
 * activo (FR-SA-OPE-11). No crea usuarios ni modifica ningún otro.
 */
export function regenerarCredencialUsuarioInicial(
  scope: Scope,
  operatorId: string,
  reason: string,
): OperatorWriteResult<AdminUser> {
  if (!isGlobal(scope)) return { ok: false, reason: "alcance-insuficiente" };
  if (!isMotivoValido(reason)) return { ok: false, reason: "motivo-requerido" };
  const operator = findOperatorById(operatorId);
  if (!operator) return { ok: false, reason: "operador-no-encontrado" };

  const initial = adminUsersOf(operatorId).find((u) => u.isInitial);
  if (!initial) return { ok: false, reason: "no-es-el-inicial" };

  initial.status = "activo";
  return { ok: true, value: initial };
}

/**
 * **Restablecer el acceso del administrador principal** (decisión de Claudia
 * del 27/10, ampliada el 28/10: disponible siempre, con motivo).
 *
 * Desde el modelo del principal, una empresa solo se queda fuera de su propia
 * gestión de usuarios si **el principal** pierde el acceso: es el único que
 * puede cambiar correos o dar de alta a otros, así que nadie de su empresa
 * puede arreglarle un correo perdido. PuntoCash puede cambiarle el correo de
 * verificación y darle una credencial nueva (la credencial la genera y la
 * muestra quien llama, una sola vez; aquí no se guarda).
 *
 * No crea usuarios ni toca a ningún otro, y no cambia quién es el principal.
 */
export function restablecerAccesoDelPrincipal(
  scope: Scope,
  operatorId: string,
  input: { email: string; reason: string },
): OperatorWriteResult<{ user: AdminUser; correoAnterior: string }> {
  if (!isGlobal(scope)) return { ok: false, reason: "alcance-insuficiente" };
  if (!isMotivoValido(input.reason)) return { ok: false, reason: "motivo-requerido" };
  const operator = findOperatorById(operatorId);
  if (!operator) return { ok: false, reason: "operador-no-encontrado" };
  if (operator.status === "baja") return { ok: false, reason: "dado-de-baja" };

  const principal = administradorPrincipalDe(operatorId);
  if (!principal) return { ok: false, reason: "usuario-no-encontrado" };

  const email = input.email.trim();
  if (email.length <= 3 || !email.includes("@") || email.includes(" ")) {
    return { ok: false, reason: "correo-invalido" };
  }

  const correoAnterior = principal.email;
  principal.email = email;
  principal.status = "activo";
  return { ok: true, value: { user: principal, correoAnterior } };
}

/* -------------------------------------------------------------------------
 * Escrituras del mercante sobre sus propios usuarios (regla A4)
 * ---------------------------------------------------------------------- */

export interface CrearUsuarioAdminInput {
  id: string;
  identifier: string;
  fullName: string;
  email: string;
  phone: string;
}

export function crearUsuarioAdmin(
  scope: Scope,
  actingUserId: string,
  input: CrearUsuarioAdminInput,
  now = new Date(),
): OperatorWriteResult<AdminUser> {
  const operatorScope = requireOperatorScope(scope);
  if (!operatorScope.ok) return { ok: false, reason: "alcance-insuficiente" };
  if (!esAdministradorPrincipal(actingUserId)) return { ok: false, reason: "no-es-el-principal" };
  const operator = findOperatorById(operatorScope.value);
  if (!operator) return { ok: false, reason: "operador-no-encontrado" };
  if (!esIdentificadorValido(input.identifier)) return { ok: false, reason: "identificador-invalido" };
  if (identifierTaken(input.identifier)) return { ok: false, reason: "identificador-duplicado" };
  if (correoTomado(input.email)) return { ok: false, reason: "correo-duplicado" };

  const user: AdminUser = {
    id: input.id,
    operatorId: operator.id,
    identifier: input.identifier,
    fullName: input.fullName,
    email: input.email,
    phone: input.phone,
    status: "activo",
    isInitial: false,
    isPrincipal: false,
    createdAt: now.toISOString(),
  };
  mutableAdminUsers.push(user);
  return { ok: true, value: user };
}

/**
 * Desactiva otro usuario de la misma empresa. Dos guardas, y las dos son
 * consecuencia de **FR-AD-USR-11**:
 *
 *   · solo el **administrador principal** desactiva a nadie;
 *   · **al principal no lo desactiva nadie**, él incluido —que es a la vez la
 *     regla de «nadie se desactiva a sí mismo», porque el principal es el
 *     único que puede intentarlo—.
 *
 * De las dos se sigue que **nunca se llega a cero administradores activos**:
 * siempre queda el principal. Eso vuelve innecesaria la guarda del «último
 * activo» que existía antes, y tampoco hay carrera que proteger, porque hay un
 * solo actor posible.
 */
export function desactivarUsuarioAdmin(
  scope: Scope,
  userId: string,
  actingUserId: string,
): OperatorWriteResult<AdminUser> {
  const operatorScope = requireOperatorScope(scope);
  if (!operatorScope.ok) return { ok: false, reason: "alcance-insuficiente" };
  if (!esAdministradorPrincipal(actingUserId)) return { ok: false, reason: "no-es-el-principal" };

  const user = findAdminUserById(userId);
  if (!user || user.operatorId !== operatorScope.value) return { ok: false, reason: "usuario-no-encontrado" };
  if (user.isPrincipal) return { ok: false, reason: "es-el-principal" };
  if (user.status !== "activo") return { ok: true, value: user };

  user.status = "desactivado";
  return { ok: true, value: user };
}

export function reactivarUsuarioAdmin(
  scope: Scope,
  actingUserId: string,
  userId: string,
): OperatorWriteResult<AdminUser> {
  const operatorScope = requireOperatorScope(scope);
  if (!operatorScope.ok) return { ok: false, reason: "alcance-insuficiente" };
  if (!esAdministradorPrincipal(actingUserId)) return { ok: false, reason: "no-es-el-principal" };

  const user = findAdminUserById(userId);
  if (!user || user.operatorId !== operatorScope.value) return { ok: false, reason: "usuario-no-encontrado" };

  user.status = "activo";
  return { ok: true, value: user };
}

/**
 * **Traspasar el papel de administrador principal** — **FR-AD-USR-12**.
 *
 * Existe porque la alternativa es peor: atar el papel para siempre a la cuenta
 * que creó PuntoCash convierte cualquier relevo —incluso uno planificado, con
 * su preaviso y su entrega— en un ticket con PuntoCash.
 *
 * **Es inmediato y en un solo acto**: al terminar, quien lo traspasó **deja de
 * ver §8**. No hay estado intermedio con dos principales, ni con ninguno.
 */
export function transferirAdministradorPrincipal(
  scope: Scope,
  actingUserId: string,
  destinoId: string,
): OperatorWriteResult<{ anterior: AdminUser; nuevo: AdminUser }> {
  const operatorScope = requireOperatorScope(scope);
  if (!operatorScope.ok) return { ok: false, reason: "alcance-insuficiente" };

  const actor = findAdminUserById(actingUserId);
  if (!actor || !actor.isPrincipal) return { ok: false, reason: "no-es-el-principal" };

  const destino = findAdminUserById(destinoId);
  if (!destino || destino.operatorId !== operatorScope.value) {
    return { ok: false, reason: "usuario-no-encontrado" };
  }
  if (destino.id === actor.id) return { ok: false, reason: "es-uno-mismo" };
  if (destino.status !== "activo") return { ok: false, reason: "destino-no-activo" };

  actor.isPrincipal = false;
  destino.isPrincipal = true;
  return { ok: true, value: { anterior: actor, nuevo: destino } };
}

/* -------------------------------------------------------------------------
 * Más escrituras del mercante sobre sus propios usuarios — FR-AD-USR-6
 * ---------------------------------------------------------------------- */

/**
 * Editar los datos de un usuario administrador.
 *
 * Cambian **nombre y teléfono**. **No el identificador**, que es con lo que
 * inicia sesión —cambiarlo en caliente deja fuera a alguien que está
 * trabajando—, ni el **correo**, que no es un dato de contacto sino el canal
 * del segundo factor **[R13]** y tiene su propia escritura. Es la misma
 * división que en trabajadores (**FR-AD-TRAB-9**), y por los mismos motivos.
 *
 * **Sí se puede editar a uno mismo**: corregir tu propio nombre o tu teléfono
 * no te deja fuera de nada. La guarda de **FR-AD-USR-13** protege la
 * desactivación, que es irreversible desde el lado de quien la sufre, no la
 * edición.
 */
export interface EditarUsuarioAdminInput {
  fullName: string;
  phone: string;
}

export function editarUsuarioAdmin(
  scope: Scope,
  actingUserId: string,
  userId: string,
  input: EditarUsuarioAdminInput,
): OperatorWriteResult<AdminUser> {
  const operatorScope = requireOperatorScope(scope);
  if (!operatorScope.ok) return { ok: false, reason: "alcance-insuficiente" };
  if (!esAdministradorPrincipal(actingUserId)) return { ok: false, reason: "no-es-el-principal" };

  const user = findAdminUserById(userId);
  if (!user || user.operatorId !== operatorScope.value) {
    return { ok: false, reason: "usuario-no-encontrado" };
  }

  user.fullName = input.fullName.trim();
  user.phone = input.phone.trim();
  return { ok: true, value: user };
}

/**
 * Los datos personales **propios**, desde el perfil — **FR-AD-PERF-3**.
 *
 * Gemela de `editarUsuarioAdmin` con una diferencia, y es toda la razón de que
 * exista aparte: **no exige ser el principal**. Corregir tu propio nombre o tu
 * teléfono no es administrar usuarios, así que no puede depender de la llave
 * de §8; si dependiera, quien no es principal no tendría ningún sitio donde
 * hacerlo, que es el hueco que el perfil viene a cerrar.
 *
 * No recibe un `userId` de destino: el único usuario que toca es quien actúa.
 * Que no se pueda pasar otro es lo que impide que esto se convierta en una
 * puerta trasera a §8.
 */
export function editarDatosPropiosAdmin(
  scope: Scope,
  actingUserId: string,
  input: EditarUsuarioAdminInput,
): OperatorWriteResult<AdminUser> {
  const operatorScope = requireOperatorScope(scope);
  if (!operatorScope.ok) return { ok: false, reason: "alcance-insuficiente" };

  const user = findAdminUserById(actingUserId);
  if (!user || user.operatorId !== operatorScope.value) {
    return { ok: false, reason: "usuario-no-encontrado" };
  }

  user.fullName = input.fullName.trim();
  user.phone = input.phone.trim();
  return { ok: true, value: user };
}

/**
 * Cambiar el correo de verificación de un usuario administrador.
 *
 * Aparte de la edición a propósito: de este correo depende que esa persona
 * pueda entrar **[R13]**, y también que pueda recuperar su contraseña, porque
 * el código de recuperación va al mismo sitio.
 */
export function cambiarCorreoUsuarioAdmin(
  scope: Scope,
  actingUserId: string,
  userId: string,
  email: string,
): OperatorWriteResult<{ user: AdminUser; anterior: string }> {
  const operatorScope = requireOperatorScope(scope);
  if (!operatorScope.ok) return { ok: false, reason: "alcance-insuficiente" };
  if (!esAdministradorPrincipal(actingUserId)) return { ok: false, reason: "no-es-el-principal" };

  const user = findAdminUserById(userId);
  if (!user || user.operatorId !== operatorScope.value) {
    return { ok: false, reason: "usuario-no-encontrado" };
  }

  const valor = email.trim();
  if (valor.length <= 3 || !valor.includes("@") || valor.includes(" ")) {
    return { ok: false, reason: "correo-invalido" };
  }
  /* Con el correo se entra, así que no puede quedarse con el de otro. */
  if (correoTomado(valor, user.id)) return { ok: false, reason: "correo-duplicado" };

  const anterior = user.email;
  user.email = valor;
  return { ok: true, value: { user, anterior } };
}

/**
 * Deja constancia de que este usuario acaba de entrar — **FR-AD-USR-1**.
 *
 * Lo llama el **segundo paso** del acceso, no el primero: la sesión no existe
 * hasta que el código se verifica **[R13]**, así que anotar el acceso al
 * acertar la contraseña contaría como entrada algo que puede no haber
 * terminado nunca.
 *
 * No devuelve nada ni falla: es un apunte, y que no se pueda escribir jamás
 * no debe impedir que alguien entre.
 */
export function registrarAccesoUsuarioAdmin(userId: string, now = new Date()): void {
  const user = findAdminUserById(userId);
  if (user) user.lastAccessAt = now.toISOString();
}
