/**
 * EQUIPOS — qué máquina es la caja de qué mostrador, qué kioscos tiene cada
 * sede, y **quién emite el vínculo** (Administración PRD, concepto «Equipo»;
 * Admin FRD §3).
 *
 * ── La inversión que hace este módulo ─────────────────────────────────────
 * Hasta el Paso 3 había dos registros para lo mismo, contra **FR-AD-DOM-4**:
 * este, central y del servidor, que es lo que el administrador ve; y
 * `features/devices/device-link.ts`, en el `localStorage` **de cada máquina**,
 * que era lo que el terminal sabía de sí mismo. Vincular desde el simulador no
 * cambiaba lo que se veía aquí, ni al revés.
 *
 * Y no era un descuido reparable con un puente: son dos navegadores distintos.
 * La consola no puede escribir en el `localStorage` del kiosco, así que
 * mientras la verdad viviera allí, vincular desde `/admin/equipos` no podía
 * ser más que una fachada.
 *
 * Así que la verdad se muda aquí, que es además la forma que tendrá el backend
 * (**FR-AD-EQ-25**, **FR-DEV-8**, **FR-AS-LINK-7**): **la credencial la emite
 * y la revoca el sistema, nunca el terminal**. El reparto queda así:
 *
 *   · El terminal genera **su código de vinculación**: seis caracteres
 *     hexadecimales al azar que guarda en una cookie y no cambian mientras
 *     siga siendo el mismo equipo (decisión del 26/11/2026). No es ninguna
 *     credencial: es el «quién pregunta», y lo que teclea el administrador.
 *   · Al vincular, el servidor le da al equipo su **identificador**
 *     (`CA-XXXXXXXX` una caja, `KI-XXXXXXXX` un kiosco): único entre cajas y
 *     kioscos, nuevo en cada vinculación y retirado al desvincular.
 *   · **Vincular y desvincular** son actos del administrador de la sede
 *     (**A10**, **FR-AD-EQ-3**), reciben alcance y lo comprueban.
 *   · `resolverTerminal` es la respuesta del servidor a «quién soy». Worker y
 *     Kiosco preguntan aquí en cada petición y pintan lo que les contesten.
 *
 * ── Lo que esto todavía no es ─────────────────────────────────────────────
 * La cookie del equipo guarda su código, así que en la demostración el
 * terminal se presenta con él en cada petición. En el producto, al vincular
 * el servidor entrega al equipo una sola vez su credencial firmada junto con
 * su identificador, y es la credencial lo que presenta después. Lo que ya está
 * en su sitio definitivo es **quién decide**: el identificador y el vínculo
 * los da el servidor, no se pueden fabricar desde el cliente.
 */

import { requireOperatorScope, type Scope } from "./scope";
import { findRegisterById } from "./registers";
import { findSedeById } from "./sedes";
import { almacen } from "./almacen";

export type TerminalKind = "caja" | "kiosco";

export type LinkMethod = "qr" | "codigo";

export interface Terminal {
  /**
   * Identificador del equipo: `CA-` una caja, `KI-` un kiosco, y ocho
   * caracteres hexadecimales. Lo da el servidor al vincular; es único entre
   * cajas y kioscos y una nueva vinculación recibe otro.
   */
  id: string;
  /** El código de vinculación que generó el propio equipo y que tecleó el administrador. */
  codigo: string;
  kind: TerminalKind;
  branchId: string;
  /** Solo los equipos de caja: un kiosco se ata a la sede, no a un mostrador (**A11**). */
  registerId?: string;
  /** Cómo se reconoce en una lista: "Mostrador 3 · Vedado". */
  label: string;
  linkedAt: string;
  /** Quién lo vinculó — lo piden **FR-AD-EQ-5** y **FR-AD-EQ-12**. */
  linkedBy: string;
  linkMethod: LinkMethod;
  lastSeenAt?: string;
}

/* -------------------------------------------------------------------------
 * Los equipos vinculados
 * ---------------------------------------------------------------------- */

/** Mutable en su sitio, igual que el resto del dominio. */
const mutableTerminals: Terminal[] = almacen("equipos", () => [
  {
    /* La caja con datos operativos simulados, y la misma que el simulador de
       la demostración deja elegir (FR-DEV-9). */
    id: "CA-1A0E7C03",
    codigo: "7C1A03",
    kind: "caja",
    branchId: "sede-vedado",
    registerId: "sede-vedado:caja-03",
    label: "Mostrador 3 · Vedado",
    linkedAt: "2026-09-01T08:00:00.000Z",
    linkedBy: "Marta Sánchez",
    linkMethod: "codigo",
    lastSeenAt: "2026-09-29T18:40:00.000Z",
  },
  {
    id: "CA-1A0E7C01",
    codigo: "7C1A01",
    kind: "caja",
    branchId: "sede-vedado",
    registerId: "sede-vedado:caja-01",
    label: "Mostrador 1 · Vedado",
    linkedAt: "2026-01-20T08:00:00.000Z",
    linkedBy: "Marta Sánchez",
    linkMethod: "qr",
    lastSeenAt: "2026-09-29T18:12:00.000Z",
  },
  {
    id: "CA-1A0E7C02",
    codigo: "7C1A02",
    kind: "caja",
    branchId: "sede-vedado",
    registerId: "sede-vedado:caja-02",
    label: "Mostrador 2 · Vedado",
    linkedAt: "2026-01-20T08:10:00.000Z",
    linkedBy: "Marta Sánchez",
    linkMethod: "qr",
    lastSeenAt: "2026-09-26T17:05:00.000Z",
  },
  /* `sede-vedado:caja-04` se queda SIN equipo a propósito: es el estado que
     FR-AD-CAJA-2 exige poder ver de un vistazo, y el que **FR-AD-EQ-6** manda
     poner primero en el listado. */
  {
    id: "CA-2B4F9D01",
    codigo: "9D2B01",
    kind: "caja",
    branchId: "sede-habana-vieja",
    registerId: "sede-habana-vieja:caja-01",
    label: "Mostrador 1 · Obispo",
    linkedAt: "2026-01-20T09:00:00.000Z",
    linkedBy: "Daniel Castro",
    linkMethod: "codigo",
    lastSeenAt: "2026-09-29T17:55:00.000Z",
  },
  {
    id: "CA-2B4F9D03",
    codigo: "9D2B03",
    kind: "caja",
    branchId: "sede-habana-vieja",
    registerId: "sede-habana-vieja:caja-03",
    label: "Mostrador 3 · Obispo",
    linkedAt: "2026-03-02T09:00:00.000Z",
    linkedBy: "Daniel Castro",
    linkMethod: "codigo",
    lastSeenAt: "2026-09-29T16:30:00.000Z",
  },
  {
    id: "CA-3C8A2E01",
    codigo: "2E3C01",
    kind: "caja",
    branchId: "sede-miramar",
    registerId: "sede-miramar:caja-01",
    label: "Mostrador 1 · Miramar",
    linkedAt: "2026-02-10T09:00:00.000Z",
    linkedBy: "Reinaldo Ortega",
    linkMethod: "codigo",
    lastSeenAt: "2026-09-29T15:20:00.000Z",
  },
  {
    id: "CA-5E1D6F01",
    codigo: "6F5E01",
    kind: "caja",
    branchId: "sede-santa-clara",
    registerId: "sede-santa-clara:caja-01",
    label: "Mostrador 1 · Santa Clara",
    linkedAt: "2026-03-15T09:00:00.000Z",
    linkedBy: "Reinaldo Ortega",
    linkMethod: "qr",
    lastSeenAt: "2026-09-29T14:02:00.000Z",
  },
  // ---- Kioscos: atados a la sede, nunca a un mostrador (A11) --------------
  /* El identificador es `KI-` y ocho caracteres hexadecimales; el de una caja,
     `CA-` y ocho. Los da el servidor al vincular y nunca se repiten los ocho
     caracteres entre cajas y kioscos (decisión del 26/11/2026). */
  {
    id: "KI-1A0E4B01",
    codigo: "4B1A01",
    kind: "kiosco",
    branchId: "sede-vedado",
    label: "Kiosco entrada · Vedado",
    linkedAt: "2026-04-02T10:00:00.000Z",
    linkedBy: "Marta Sánchez",
    linkMethod: "qr",
    lastSeenAt: "2026-09-29T18:44:00.000Z",
  },
  {
    /* Dos en la misma sede: **FR-AD-EQ-14** dice que aquí no rige el límite
       de uno por objeto que sí rige para las cajas. */
    id: "KI-1A0E4B02",
    codigo: "4B1A02",
    kind: "kiosco",
    branchId: "sede-vedado",
    label: "Kiosco sala de espera · Vedado",
    linkedAt: "2026-04-02T10:20:00.000Z",
    linkedBy: "Marta Sánchez",
    linkMethod: "codigo",
    lastSeenAt: "2026-09-29T18:41:00.000Z",
  },
  {
    id: "KI-2B4F5A01",
    codigo: "5A2B01",
    kind: "kiosco",
    branchId: "sede-habana-vieja",
    label: "Kiosco entrada · Obispo",
    linkedAt: "2026-05-11T10:00:00.000Z",
    linkedBy: "Daniel Castro",
    linkMethod: "qr",
    lastSeenAt: "2026-09-29T17:58:00.000Z",
  },
]);

export const TERMINALS: readonly Terminal[] = mutableTerminals;

/** El equipo vinculado a una caja, o `null` si todavía no tiene ninguno. */
export function equipoDeCaja(registerId: string): Terminal | null {
  return mutableTerminals.find((t) => t.kind === "caja" && t.registerId === registerId) ?? null;
}

export function cajaTieneEquipo(registerId: string): boolean {
  return equipoDeCaja(registerId) !== null;
}

export function equiposDeSede(branchId: string): readonly Terminal[] {
  return mutableTerminals.filter((t) => t.branchId === branchId);
}

export function kioscosDeSede(branchId: string): readonly Terminal[] {
  return mutableTerminals.filter((t) => t.kind === "kiosco" && t.branchId === branchId);
}

export function findTerminalById(id: string | null | undefined): Terminal | null {
  if (!id) return null;
  return mutableTerminals.find((t) => t.id === id) ?? null;
}

/** El equipo vinculado que se presenta con este código de vinculación, o `null`. */
export function findTerminalByCodigo(codigo: string | null | undefined): Terminal | null {
  const c = normalizarCodigo(codigo ?? "");
  if (!c) return null;
  return mutableTerminals.find((t) => t.codigo === c) ?? null;
}

/* -------------------------------------------------------------------------
 * El código de vinculación — lo genera el equipo y no caduca
 * ---------------------------------------------------------------------- */

/** Seis caracteres hexadecimales, en mayúsculas (decisión del 26/11/2026). */
export const CODIGO_DE_VINCULACION = /^[0-9A-F]{6}$/;

/** Lo que se teclea, sin espacios ni guiones y en mayúsculas: "492 14c" → "49214C". */
export function normalizarCodigo(valor: string): string {
  return valor.replace(/[\s-]/g, "").toUpperCase();
}

/** "49214C" → "492 14C", la agrupación que muestra el equipo y teclea el administrador. */
export function formatPairingCode(code: string): string {
  return `${code.slice(0, 3)} ${code.slice(3)}`;
}

/** Un equipo que muestra su código y espera a que lo vinculen. */
export interface PairingChallenge {
  /** Su código de vinculación. No caduca: es el de ese equipo. */
  code: string;
  kind: TerminalKind;
}

/**
 * Los equipos que esperan vinculación, por su código. En memoria, como el
 * resto del dominio: el terminal se vuelve a anunciar al arrancar.
 */
/* En `globalThis`: el equipo se anuncia desde `/worker` o el kiosco y el
   administrador lo identifica desde `/admin`, y los dos tienen que ver el mismo. */
const ALMACEN_PENDIENTES = globalThis as typeof globalThis & { __puntocashEquiposPendientes?: Map<string, PairingChallenge> };
const pendingChallenges = (ALMACEN_PENDIENTES.__puntocashEquiposPendientes ??= new Map<string, PairingChallenge>());

/**
 * Anuncia un equipo que todavía no está vinculado y devuelve lo que muestra
 * su pantalla.
 *
 * Lo llama el terminal al arrancar. Es una escritura y no recibe alcance **a
 * propósito**: quien la pide es una máquina sin dueño todavía. Lo único que
 * puede provocar es un código que no sirve para nada hasta que un
 * administrador lo teclea. Es idempotente: el código es siempre el mismo.
 *
 * Un equipo **ya vinculado** no se anuncia: devuelve `null`, y el terminal
 * que pregunte verá que su respuesta es un vínculo, no un código.
 */
export function emitirReto(kind: TerminalKind, codigo: string): PairingChallenge | null {
  const code = normalizarCodigo(codigo);
  if (!CODIGO_DE_VINCULACION.test(code)) return null;
  if (findTerminalByCodigo(code)) return null;
  const existente = pendingChallenges.get(code);
  if (existente && existente.kind === kind) return existente;
  const challenge: PairingChallenge = { code, kind };
  pendingChallenges.set(code, challenge);
  return challenge;
}

/** El equipo pendiente que muestra este código, sin anunciar ninguno. */
export function retoVigente(codigo: string): PairingChallenge | null {
  return pendingChallenges.get(normalizarCodigo(codigo)) ?? null;
}

/** Lo que lleva el QR que muestra el equipo: su clase y su código. */
export function pairingQrPayload(challenge: PairingChallenge): string {
  return `puntocash:${challenge.kind}-link:v1:${challenge.code}`;
}

/**
 * Un identificador nuevo para un equipo: `CA-` o `KI-` y ocho caracteres
 * hexadecimales, sin repetir ninguno que ya tenga una caja **o** un kiosco.
 */
function nuevoIdentificador(kind: TerminalKind): string {
  const prefijo = kind === "caja" ? "CA-" : "KI-";
  for (;;) {
    let hex = "";
    for (let i = 0; i < 8; i += 1) hex += Math.floor(Math.random() * 16).toString(16);
    const ocho = hex.toUpperCase();
    if (!mutableTerminals.some((t) => t.id.slice(3) === ocho)) return `${prefijo}${ocho}`;
  }
}

/* -------------------------------------------------------------------------
 * Lo que el terminal pregunta: ¿quién soy?
 * ---------------------------------------------------------------------- */

export type TerminalSession =
  | { status: "vinculado"; terminal: Terminal }
  | { status: "sin-vincular"; codigo: string; pairing: PairingChallenge | null };

/**
 * La respuesta del servidor a un terminal que pregunta quién es. **Lectura**:
 * no emite retos ni escribe nada, para que un renderizado de servidor no mute
 * el dominio.
 *
 * `kind` importa: un mismo navegador es caja y kiosco a la vez en la
 * demostración, con una cookie por clase, y el código de una caja no debe
 * resolver como kiosco ni al contrario.
 */
export function resolverTerminal(kind: TerminalKind, codigo: string | null | undefined): TerminalSession | null {
  if (!codigo) return null;

  const terminal = findTerminalByCodigo(codigo);
  if (terminal && terminal.kind === kind) return { status: "vinculado", terminal };

  /* Un código de otra clase se trata como desconocido: no se filtra que
     existe, y el terminal sigue su camino de vinculación. */
  const c = normalizarCodigo(codigo);
  const pendiente = retoVigente(c);
  return { status: "sin-vincular", codigo: c, pairing: pendiente && pendiente.kind === kind ? pendiente : null };
}

/** El identificador del equipo que se presenta con este código, si está vinculado como `kind`. */
export function idDeEquipo(kind: TerminalKind, codigo: string | null | undefined): string | null {
  const sesion = resolverTerminal(kind, codigo);
  return sesion?.status === "vinculado" ? sesion.terminal.id : null;
}

/* -------------------------------------------------------------------------
 * Escrituras — del administrador de la sede (reglas A10 y A14)
 * ---------------------------------------------------------------------- */

/**
 * Comprobación que este módulo no puede hacer por sí mismo. La misma forma
 * que `RegisterScopeContext`: se recibe para no importar `assignments.ts`, y
 * así este dominio sigue siendo comprobable sin montar media red.
 */
export interface TerminalScopeContext {
  sedesEnAlcance(operatorId: string): readonly string[];
}

export type TerminalWriteDenial =
  | "alcance-global-prohibido"
  | "fuera-de-alcance"
  | "codigo-no-coincide"
  | "sede-no-encontrada"
  | "sede-cerrada"
  | "caja-requerida"
  | "caja-no-encontrada"
  | "caja-retirada"
  | "caja-ya-vinculada"
  | "equipo-no-encontrado"
  | "equipo-ya-vinculado"
  | "etiqueta-requerida";

export type TerminalWriteResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: TerminalWriteDenial };

function guardScope(
  scope: Scope,
  branchId: string,
  ctx: TerminalScopeContext,
): TerminalWriteDenial | null {
  const operator = requireOperatorScope(scope);
  if (!operator.ok) return operator.reason;
  if (!ctx.sedesEnAlcance(operator.value).includes(branchId)) return "fuera-de-alcance";
  return null;
}

/** Lo que identifica el reto: el código teclado, o el contenido del QR leído. */
export type RetoPresentado = { method: "codigo"; code: string } | { method: "qr"; payload: string };

export interface VincularInput {
  reto: RetoPresentado;
  branchId: string;
  /** Obligatoria para una caja, irrelevante para un kiosco (**FR-AD-EQ-13**). */
  registerId?: string;
  /** Quién vincula, para el registro y para el listado. */
  by: string;
  /** Opcional: si no se da, se compone del objeto al que se ata. */
  label?: string;
}

/**
 * Busca el equipo pendiente que corresponde a lo presentado. Un código se
 * compara sin espacios y sin distinguir mayúsculas, porque se teclea agrupado
 * (**FR-AD-EQ-17**).
 */
function buscarReto(reto: RetoPresentado): PairingChallenge | null {
  if (reto.method === "qr") {
    for (const challenge of pendingChallenges.values()) {
      if (pairingQrPayload(challenge) === reto.payload) return challenge;
    }
    return null;
  }

  const code = normalizarCodigo(reto.code);
  if (!CODIGO_DE_VINCULACION.test(code)) return null;
  return pendingChallenges.get(code) ?? null;
}

function etiquetaPorDefecto(challenge: PairingChallenge, branchName: string, registerName?: string): string {
  if (challenge.kind === "caja") return `${registerName ?? "Mostrador"} · ${branchName}`;
  return `Kiosco · ${branchName}`;
}

/**
 * Vincula el equipo que presentó ese reto al objeto elegido — **el único sitio
 * del producto desde el que esto ocurre** (**FR-AD-EQ-3**, **A10**).
 *
 * El orden de las comprobaciones no es casual. El alcance va **primero**: un
 * reto válido presentado contra una sede ajena no debe poder distinguirse de
 * un reto inválido, porque si se distinguiera, probar identificadores de sede
 * diría qué administra otra empresa (**A1**).
 *
 * Y el equipo se **revalida aquí**, no al leerlo: mientras el administrador
 * elige la sede pueden haberlo vinculado por otra vía, y entonces la
 * vinculación se rechaza en vez de aplicarse (**FR-AD-EQ-22**, **R3**). Al
 * vincular deja de estar pendiente, así que un código no puede vincular dos
 * veces (**FR-AD-EQ-23**, **R6**).
 */
export function vincularEquipo(
  scope: Scope,
  ctx: TerminalScopeContext,
  input: VincularInput,
  now = new Date(),
): TerminalWriteResult<Terminal> {
  const denial = guardScope(scope, input.branchId, ctx);
  if (denial) return { ok: false, reason: denial };

  const sede = findSedeById(input.branchId);
  if (!sede) return { ok: false, reason: "sede-no-encontrada" };
  if (sede.status === "cerrada") return { ok: false, reason: "sede-cerrada" };

  const challenge = buscarReto(input.reto);
  if (!challenge) return { ok: false, reason: "codigo-no-coincide" };
  /* Entre que el equipo se anunció y el administrador lo vincula puede haberse
     vinculado por otra vía. */
  if (findTerminalByCodigo(challenge.code)) return { ok: false, reason: "equipo-ya-vinculado" };

  let registerName: string | undefined;

  if (challenge.kind === "caja") {
    if (!input.registerId) return { ok: false, reason: "caja-requerida" };

    const caja = findRegisterById(input.registerId);
    if (!caja || caja.branchId !== input.branchId) return { ok: false, reason: "caja-no-encontrada" };
    if (caja.status === "retirada") return { ok: false, reason: "caja-retirada" };
    /* Una caja, un equipo (**FR-AD-EQ-8**, **A11**): sustituirlo exige
       desvincular el anterior primero. */
    if (cajaTieneEquipo(caja.id)) return { ok: false, reason: "caja-ya-vinculada" };

    registerName = caja.name;
  }

  const terminal: Terminal = {
    id: nuevoIdentificador(challenge.kind),
    codigo: challenge.code,
    kind: challenge.kind,
    branchId: input.branchId,
    ...(challenge.kind === "caja" ? { registerId: input.registerId } : {}),
    label: input.label?.trim() || etiquetaPorDefecto(challenge, sede.name, registerName),
    linkedAt: now.toISOString(),
    linkedBy: input.by,
    linkMethod: input.reto.method,
    lastSeenAt: now.toISOString(),
  };

  mutableTerminals.push(terminal);
  pendingChallenges.delete(challenge.code);
  return { ok: true, value: terminal };
}

/**
 * Desvincula un equipo. El terminal vuelve a su pantalla de vinculación en
 * cuanto vuelva a preguntar quién es (**FR-AD-EQ-9**, **FR-AS-LINK-6**).
 *
 * **No cierra la jornada** de la caja, y es deliberado (**FR-AD-EQ-10**,
 * **A11**): a veces se desvincula precisamente porque el equipo se averió, y
 * la jornada sigue abierta hasta su arqueo. Quién advierte de eso es la
 * pantalla; el dominio no lo impide.
 *
 * El identificador se retira con el vínculo: si el equipo se vuelve a
 * vincular, recibe otro. Su código de vinculación sigue siendo el mismo, y
 * vuelve a quedar pendiente cuando el terminal se anuncie otra vez.
 */
export function desvincularEquipo(
  scope: Scope,
  ctx: TerminalScopeContext,
  terminalId: string,
): TerminalWriteResult<Terminal> {
  const terminal = findTerminalById(terminalId);
  if (!terminal) return { ok: false, reason: "equipo-no-encontrado" };

  const denial = guardScope(scope, terminal.branchId, ctx);
  if (denial) return { ok: false, reason: denial };

  mutableTerminals.splice(mutableTerminals.indexOf(terminal), 1);
  return { ok: true, value: terminal };
}

/**
 * Cambia el rótulo de un equipo vinculado (**FR-AD-EQ-30**).
 *
 * El rótulo es solo el nombre con el que la consola lo muestra: el
 * identificador del equipo, su sede y su caja no se tocan. Un rótulo vacío se
 * rechaza en vez de recomponer el de por defecto, porque quien abre este
 * diálogo quiere ponerle un nombre, y dejarlo en blanco sería un descuido.
 */
export function renombrarEquipo(
  scope: Scope,
  ctx: TerminalScopeContext,
  terminalId: string,
  label: string,
): TerminalWriteResult<Terminal> {
  const terminal = findTerminalById(terminalId);
  if (!terminal) return { ok: false, reason: "equipo-no-encontrado" };

  const denial = guardScope(scope, terminal.branchId, ctx);
  if (denial) return { ok: false, reason: denial };

  const limpio = label.trim();
  if (!limpio) return { ok: false, reason: "etiqueta-requerida" };

  terminal.label = limpio;
  return { ok: true, value: terminal };
}

/**
 * Última señal de vida de un equipo vinculado — la columna «última actividad»
 * de **FR-AD-EQ-5** y **FR-AD-EQ-12**.
 *
 * La escribe el propio terminal al preguntar quién es, así que no recibe
 * alcance: no decide nada y solo puede sellar su propia fila.
 */
export function marcarActividad(terminalId: string, now = new Date()): void {
  const terminal = findTerminalById(terminalId);
  if (terminal) terminal.lastSeenAt = now.toISOString();
}

/* -------------------------------------------------------------------------
 * Leer un reto sin canjearlo
 * ---------------------------------------------------------------------- */

export interface RetoIdentificado {
  /** El código de vinculación del equipo. */
  codigo: string;
  kind: TerminalKind;
}

/**
 * Identifica el equipo que presentó este código, **sin vincular nada**.
 *
 * `/admin/equipos/vincular` no puede pedir la sede antes de saber qué está
 * vinculando (**FR-AD-EQ-18**): una caja necesita además elegir la caja, un
 * kiosco no. Así que el código se lee en un paso y se usa en otro, y el
 * equipo se vuelve a comprobar al vincular (**FR-AD-EQ-22**).
 *
 * No recibe alcance, y no le hace falta: un equipo pendiente todavía no es de
 * ninguna sede, así que no hay nada de otro operador que este resultado pueda
 * filtrar. El alcance lo comprueba `vincularEquipo`, y **antes** que el código.
 */
export function identificarReto(reto: RetoPresentado): TerminalWriteResult<RetoIdentificado> {
  const challenge = buscarReto(reto);
  if (!challenge) return { ok: false, reason: "codigo-no-coincide" };
  if (findTerminalByCodigo(challenge.code)) return { ok: false, reason: "equipo-ya-vinculado" };
  return { ok: true, value: { codigo: challenge.code, kind: challenge.kind } };
}

/* -------------------------------------------------------------------------
 * Andamio de la demostración
 * ---------------------------------------------------------------------- */

/**
 * Los equipos que, **en la demostración**, esperan que alguien los vincule.
 *
 * El código lo genera el propio terminal al arrancar —una caja de Worker o un
 * kiosco sin vincular—, y el administrador lo lee de la pantalla del equipo
 * que tiene delante. Estos dos son un atajo para recorrer
 * `/admin/equipos/vincular` sin abrir antes un terminal en otra pestaña: uno
 * es una caja y el otro un kiosco, para que las dos ramas de §3.4 —elegir
 * caja, o solo sede— se puedan ver.
 */
const PREFIJO_DEMO: Record<TerminalKind, string> = {
  caja: "C0DE",
  kiosco: "D0CE",
};

/**
 * Asegura que haya **siempre** un equipo de cada clase esperando, y los
 * devuelve. Busca el primer código que no esté ya vinculado, así cada
 * vinculación deja sitio a la siguiente.
 */
export function retosDeDemostracion(): readonly PairingChallenge[] {
  const retos: PairingChallenge[] = [];

  for (const kind of ["caja", "kiosco"] as const) {
    for (let n = 1; n <= 255; n += 1) {
      const reto = emitirReto(kind, `${PREFIJO_DEMO[kind]}${n.toString(16).toUpperCase().padStart(2, "0")}`);
      if (reto) {
        retos.push(reto);
        break;
      }
    }
  }

  return retos;
}
