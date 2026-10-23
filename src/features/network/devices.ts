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
 *   · El terminal se nombra a sí mismo con un identificador opaco que guarda
 *     en una cookie, y no es ninguna credencial: es el «quién pregunta».
 *   · El **reto de vinculación** lo emite este módulo, en el servidor
 *     (`emitirReto`). El terminal lo muestra; no se lo inventa.
 *   · **Vincular y desvincular** son actos del administrador de la sede
 *     (**A10**, **FR-AD-EQ-3**), reciben alcance y lo comprueban.
 *   · `resolverTerminal` es la respuesta del servidor a «quién soy». En la
 *     demostración, Worker y Kiosco todavía leen su propio almacenamiento
 *     (nota de entrega, §8.3); en el producto real preguntan aquí y pintan lo que les
 *     contesten.
 *
 * ── Lo que esto todavía no es ─────────────────────────────────────────────
 * El identificador del equipo lo escribe el propio navegador, así que es
 * **autodeclarado**: un terminal podría afirmar ser otro. En el producto real
 * la credencial va firmada y la emite el servidor al vincular. Lo que ya está
 * en su sitio definitivo es **quién decide**: el reto y el vínculo no se pueden
 * fabricar desde el cliente, y eso es lo que convierte la vinculación en un
 * control y no en una declaración. Quien implemente el backend firma la
 * credencial y no tiene que mover nada más.
 *
 * ── Mientras dure el tramo ────────────────────────────────────────────────
 * `features/devices/device-link.ts` sigue en el repositorio y exporta nombres
 * que aquí se repiten —`formatPairingCode`, `PairingChallenge`,
 * `PAIRING_VALIDITY_MINUTES`—. No es una duplicación que haya que resolver
 * eligiendo: es el mecanismo viejo, que se retira en cuanto Worker, Kiosco y
 * el simulador pasen a preguntar aquí. Hasta entonces, **lo que gobierna es
 * este módulo** y el otro es el que se va.
 */

import { requireOperatorScope, type Scope } from "./scope";
import { findRegisterById } from "./registers";
import { findSedeById } from "./sedes";

export type TerminalKind = "caja" | "kiosco";

export type LinkMethod = "qr" | "codigo";

export interface Terminal {
  /** Identificador visible del equipo, el que aparece en su pantalla de vinculación. */
  id: string;
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
const mutableTerminals: Terminal[] = [
  {
    /* La caja con datos operativos simulados, y la misma que el simulador de
       la demostración deja elegir (FR-DEV-9). */
    id: "CAJ-0001-0003",
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
    id: "CAJ-0001-0001",
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
    id: "CAJ-0001-0002",
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
    id: "CAJ-0002-0001",
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
    id: "CAJ-0002-0003",
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
    id: "CAJ-0003-0001",
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
    id: "CAJ-0005-0001",
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
  /* El identificador es `KIO-NNNN-NNNN`, el formato que especifican los tres
     FRD que lo nombran: Admin FR-AD-EQ-12, Super Admin FR-SA-EQ-3 y Kiosco
     FR-AS-LINK-2. Las cajas usan `CAJ-NNNN-NNNN` por el mismo criterio. */
  {
    id: "KIO-0001-0001",
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
    id: "KIO-0001-0002",
    kind: "kiosco",
    branchId: "sede-vedado",
    label: "Kiosco sala de espera · Vedado",
    linkedAt: "2026-04-02T10:20:00.000Z",
    linkedBy: "Marta Sánchez",
    linkMethod: "codigo",
    lastSeenAt: "2026-09-29T18:41:00.000Z",
  },
  {
    id: "KIO-0002-0001",
    kind: "kiosco",
    branchId: "sede-habana-vieja",
    label: "Kiosco entrada · Obispo",
    linkedAt: "2026-05-11T10:00:00.000Z",
    linkedBy: "Daniel Castro",
    linkMethod: "qr",
    lastSeenAt: "2026-09-29T17:58:00.000Z",
  },
];

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

/* -------------------------------------------------------------------------
 * Los retos de vinculación — los emite el servidor, no el terminal
 * ---------------------------------------------------------------------- */

/** Lo que dura un reto antes de que el terminal muestre uno nuevo (**FR-DEV-2**). */
export const PAIRING_VALIDITY_MINUTES = 10;

export interface PairingChallenge {
  /** El equipo que lo está mostrando. */
  deviceId: string;
  kind: TerminalKind;
  /** Seis cifras. Se muestran agrupadas de tres en tres: "482 913". */
  code: string;
  expiresAt: string;
}

/**
 * Un reto por equipo pendiente. En memoria, como el resto del dominio: una
 * recarga completa del servidor los olvida, y el terminal pedirá otro.
 */
const pendingChallenges = new Map<string, PairingChallenge>();

/** "482913" → "482 913", la agrupación que muestra el terminal y teclea el admin. */
export function formatPairingCode(code: string): string {
  return `${code.slice(0, 3)} ${code.slice(3)}`;
}

function randomDigits(length: number): string {
  let out = "";
  for (let i = 0; i < length; i += 1) out += String(Math.floor(Math.random() * 10));
  return out;
}

function caducado(challenge: PairingChallenge, now: Date): boolean {
  return new Date(challenge.expiresAt).getTime() <= now.getTime();
}

/**
 * Emite —o renueva— el reto de un equipo que todavía no está vinculado.
 *
 * Lo llama el terminal al arrancar y cada vez que el suyo caduca. Es una
 * escritura y no recibe alcance **a propósito**: quien la pide es una máquina
 * sin dueño todavía, que es precisamente lo que el reto viene a resolver. Lo
 * único que puede provocar es un código de seis cifras que no sirve para nada
 * hasta que un administrador lo teclea.
 *
 * Un equipo **ya vinculado** no obtiene reto: devuelve `null`, y el terminal
 * que pregunte verá que su respuesta es un vínculo, no un código.
 */
export function emitirReto(
  kind: TerminalKind,
  deviceId: string,
  now = new Date(),
): PairingChallenge | null {
  const vinculado = findTerminalById(deviceId);
  if (vinculado) return null;

  const existente = pendingChallenges.get(deviceId);
  if (existente && !caducado(existente, now)) return existente;

  const challenge: PairingChallenge = {
    deviceId,
    kind,
    code: randomDigits(6),
    expiresAt: new Date(now.getTime() + PAIRING_VALIDITY_MINUTES * 60_000).toISOString(),
  };
  pendingChallenges.set(deviceId, challenge);
  return challenge;
}

/** El reto vigente de un equipo, sin emitir ninguno. */
export function retoVigente(deviceId: string, now = new Date()): PairingChallenge | null {
  const challenge = pendingChallenges.get(deviceId);
  if (!challenge || caducado(challenge, now)) return null;
  return challenge;
}

/**
 * Lo que un reto lleva dentro del QR. En el producto va un token firmado y de
 * un solo uso; aquí la forma es la misma y el contenido es el reto.
 */
export function pairingQrPayload(challenge: PairingChallenge): string {
  return `puntocash:${challenge.kind}-link:v1:${challenge.deviceId}:${challenge.code}`;
}

/* -------------------------------------------------------------------------
 * Lo que el terminal pregunta: ¿quién soy?
 * ---------------------------------------------------------------------- */

export type TerminalSession =
  | { status: "vinculado"; terminal: Terminal }
  | { status: "sin-vincular"; deviceId: string; pairing: PairingChallenge | null };

/**
 * La respuesta del servidor a un terminal que pregunta quién es. **Lectura**:
 * no emite retos ni escribe nada, para que un renderizado de servidor no mute
 * el dominio.
 *
 * `kind` importa: un mismo navegador es caja y kiosco a la vez en la
 * demostración, con una cookie por clase, y un identificador de caja no debe
 * resolver como kiosco ni al contrario.
 */
export function resolverTerminal(
  kind: TerminalKind,
  deviceId: string | null | undefined,
  now = new Date(),
): TerminalSession | null {
  if (!deviceId) return null;

  const terminal = findTerminalById(deviceId);
  if (terminal && terminal.kind === kind) return { status: "vinculado", terminal };

  /* Un identificador de otra clase se trata como desconocido: no se filtra
     que existe, y el terminal sigue su camino de vinculación. */
  return { status: "sin-vincular", deviceId, pairing: retoVigente(deviceId, now) };
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
  | "codigo-caducado"
  | "sede-no-encontrada"
  | "sede-cerrada"
  | "caja-requerida"
  | "caja-no-encontrada"
  | "caja-retirada"
  | "caja-ya-vinculada"
  | "equipo-no-encontrado"
  | "equipo-ya-vinculado";

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
 * Busca el reto que corresponde a lo presentado. Un código se compara
 * ignorando los espacios, porque se teclea agrupado (**FR-AD-EQ-17**).
 */
function buscarReto(reto: RetoPresentado): PairingChallenge | null {
  if (reto.method === "qr") {
    for (const challenge of pendingChallenges.values()) {
      if (pairingQrPayload(challenge) === reto.payload) return challenge;
    }
    return null;
  }

  const code = reto.code.replace(/\D/g, "");
  if (code.length === 0) return null;
  for (const challenge of pendingChallenges.values()) {
    if (challenge.code === code) return challenge;
  }
  return null;
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
 * Y el reto se **revalida aquí**, no al leerlo: los diez minutos pueden
 * caducar mientras el administrador elige la sede, y entonces la vinculación
 * se rechaza en vez de aplicarse (**FR-AD-EQ-22**, **R3**). Al acertar se
 * consume, así que un reto no puede vincular dos equipos (**FR-AD-EQ-23**,
 * **R6**).
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
  if (caducado(challenge, now)) return { ok: false, reason: "codigo-caducado" };
  /* Entre emitir el reto y canjearlo puede haberse vinculado por otra vía. */
  if (findTerminalById(challenge.deviceId)) return { ok: false, reason: "equipo-ya-vinculado" };

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
    id: challenge.deviceId,
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
  pendingChallenges.delete(challenge.deviceId);
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
 * Tampoco emite un reto nuevo: lo pedirá el propio terminal. Así desvincular
 * no deja un código vivo esperando a nadie.
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
  deviceId: string;
  kind: TerminalKind;
  expiresAt: string;
}

/**
 * Identifica el equipo que presentó este reto, **sin consumirlo** y sin
 * vincular nada.
 *
 * `/admin/equipos/vincular` no puede pedir la sede antes de saber qué está
 * vinculando (**FR-AD-EQ-18**): una caja necesita además elegir la caja, un
 * kiosco no. Así que el reto se lee en un paso y se canjea en otro, y los
 * diez minutos se vuelven a comprobar al canjear (**FR-AD-EQ-22**) — leerlo
 * aquí no reserva nada ni lo gasta.
 *
 * No recibe alcance, y no le hace falta: un reto pertenece a una máquina que
 * todavía no es de ninguna sede, así que no hay nada de otro operador que
 * este resultado pueda filtrar. El alcance lo comprueba `vincularEquipo`, y
 * lo comprueba **antes** que el propio reto.
 */
export function identificarReto(
  reto: RetoPresentado,
  now = new Date(),
): TerminalWriteResult<RetoIdentificado> {
  const challenge = buscarReto(reto);
  if (!challenge) return { ok: false, reason: "codigo-no-coincide" };
  if (caducado(challenge, now)) return { ok: false, reason: "codigo-caducado" };
  /* Entre que el terminal mostró su código y el administrador lo teclea, el
     equipo puede haber quedado vinculado por otra vía. */
  if (findTerminalById(challenge.deviceId)) return { ok: false, reason: "equipo-ya-vinculado" };

  return {
    ok: true,
    value: { deviceId: challenge.deviceId, kind: challenge.kind, expiresAt: challenge.expiresAt },
  };
}

/* -------------------------------------------------------------------------
 * Andamio de la demostración
 * ---------------------------------------------------------------------- */

/**
 * Los equipos que, **en la demostración**, esperan que alguien los vincule.
 *
 * En el producto el reto lo emite el propio terminal al arrancar, y el
 * administrador lee las seis cifras de la pantalla del equipo que tiene
 * delante. Aquí todavía no: Worker y Kiosco resuelven su vínculo contra
 * `features/devices/device-link.ts`, que vive en el `localStorage` del
 * navegador del terminal, así que su código **nunca llega a este módulo**,
 * que es del servidor. Sin estos dos, `/admin/equipos/vincular` no tendría
 * ningún código que encontrar y la pantalla no se podría recorrer.
 *
 * Los identificadores no coinciden con ningún equipo ya vinculado, a
 * propósito: uno es una caja y el otro un kiosco, para que las dos ramas de
 * §3.4 —elegir caja, o solo sede— se puedan ver.
 *
 * Esto desaparece cuando el terminal pregunte al servidor quién es
 * (**FR-DEV-8**, nota de entrega §8.3): entonces los retos de verdad estarán aquí
 * y no habrá nada que simular.
 */
const PREFIJO_DEMO: Record<TerminalKind, string> = {
  caja: "CAJ-0007-",
  kiosco: "KIO-0007-",
};

/**
 * Asegura que haya **siempre** un equipo de cada clase esperando, y los
 * devuelve.
 *
 * Busca hacia arriba el primer identificador que no esté ya vinculado, en vez
 * de nombrar dos fijos. La diferencia importa: con dos fijos, el primero que
 * alguien vincula desaparece para siempre y la pantalla se queda sin nada que
 * demostrar a la segunda pasada — que es justo lo que le pasó a quien la probó
 * a mano. Así cada vinculación deja sitio a la siguiente.
 *
 * Emitir desde aquí es lo mismo que hace el terminal al arrancar, y es
 * idempotente mientras el reto siga vigente: dos cargas de la pantalla
 * devuelven el mismo código, no dos.
 */
export function retosDeDemostracion(now = new Date()): readonly PairingChallenge[] {
  const retos: PairingChallenge[] = [];

  for (const kind of ["caja", "kiosco"] as const) {
    for (let n = 1; n <= 99; n += 1) {
      const reto = emitirReto(kind, `${PREFIJO_DEMO[kind]}${String(n).padStart(4, "0")}`, now);
      if (reto) {
        retos.push(reto);
        break;
      }
    }
  }

  return retos;
}
