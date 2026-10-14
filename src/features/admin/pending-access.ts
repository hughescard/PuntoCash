/**
 * El reto de acceso **del lado del servidor** — la pieza que hace que la
 * verificación en dos pasos sea una condición y no una cortesía.
 *
 * ── Por qué existe ────────────────────────────────────────────────────────
 * Antes, la acción que abría la sesión recibía el `userId` como parámetro y lo
 * único que comprobaba era que ese usuario existiera y pudiera entrar. Una
 * acción de servidor es un `POST`, así que bastaba invocarla con un
 * identificador cualquiera para abrir sesión sin haber pasado por la
 * contraseña ni por el código: el segundo factor era opcional para quien no
 * usara la pantalla.
 *
 * Con esto, la identidad no vuelve a cruzar desde el cliente. El paso 1
 * (contraseña) ocurre en el servidor, que es quien decide de quién es el reto
 * y lo guarda aquí bajo un identificador opaco; ese identificador viaja en una
 * cookie `httpOnly` que el navegador no puede leer ni fabricar. El paso 2
 * (código) solo puede canjear el reto que le corresponde a esa cookie. Para
 * abrir sesión hacen falta las dos cosas, y ninguna la aporta el cliente.
 *
 * ── Qué es mock y qué es la forma definitiva ──────────────────────────────
 * La **forma** es la del producto: el servidor emite el reto, lo guarda, y
 * comprueba el código contra lo que él mismo emitió. Lo que es simulado es el
 * almacén —un `Map` en memoria del proceso, así que un reinicio del servidor de
 * desarrollo pierde los retos en curso— y el código, que en la demostración es
 * una constante para que se pueda teclear. En el producto el servidor genera un
 * código aleatorio, lo envía por correo y guarda su huella, no el código.
 *
 * Este módulo solo lo importa `src/app/admin/_actions.ts`, que es `"use server"`.
 * No debe importarse desde un componente de cliente: su estado es del servidor.
 */

interface PendingAccess {
  userId: string;
  /** Lo que el paso 2 tiene que presentar. Ver la nota sobre el mock. */
  code: string;
  expiresAt: number;
}

/**
 * Ventana para completar el acceso. No es la vigencia del código que se le
 * muestra a la persona —esa la gobierna el reto de la pantalla—, sino el plazo
 * máximo que el servidor mantiene abierta la posibilidad de canjearlo.
 */
/**
 * Cookie del reto de acceso: `httpOnly`, de vida corta, y lo único que el
 * navegador lleva entre el paso 1 y el paso 2. Guarda un identificador opaco,
 * nunca la identidad.
 *
 * Se nombra aquí, junto al almacén que ese identificador resuelve, y no en
 * `_actions.ts`: ese archivo es `"use server"` y solo puede exportar acciones,
 * así que una pantalla no podría importar la constante de allí.
 */
export const ADMIN_PENDING_COOKIE = "pc_admin_reto";

const PENDING_TTL_MS = 10 * 60 * 1000;

const pending = new Map<string, PendingAccess>();

let sequence = 0;

/** Opaco a propósito: no se deriva del usuario ni se puede adivinar desde fuera. */
function nextId(): string {
  sequence += 1;
  const random = Math.random().toString(36).slice(2, 10);
  return `acc_${Date.now().toString(36)}_${sequence}_${random}`;
}

function purgarCaducados(now: number): void {
  for (const [id, access] of pending) {
    if (access.expiresAt <= now) pending.delete(id);
  }
}

/**
 * Registra un reto para un usuario y devuelve su identificador opaco, que es
 * lo único que viaja al navegador (en una cookie `httpOnly`).
 */
export function registrarAccesoPendiente(userId: string, code: string): string {
  const now = Date.now();
  purgarCaducados(now);

  const id = nextId();
  pending.set(id, { userId, code, expiresAt: now + PENDING_TTL_MS });
  return id;
}

/**
 * Canjea el reto: devuelve el usuario si el identificador existe, no ha
 * caducado y el código es el que el servidor emitió. Se consume siempre que
 * acierta, para que el mismo código no pueda abrir dos sesiones.
 *
 * Un fallo no dice **por qué** falló, igual que el inicio de sesión
 * (**FR-AD-ACC-5**): desde fuera, un identificador inventado y un código
 * equivocado se leen igual.
 */
export function canjearAccesoPendiente(id: string | undefined, code: string): string | null {
  if (!id) return null;

  const now = Date.now();
  purgarCaducados(now);

  const access = pending.get(id);
  if (!access) return null;
  if (access.code !== code) return null;

  pending.delete(id);
  return access.userId;
}

/**
 * ¿Hay un reto vivo con ese identificador? Lectura y nada más: no canjea, no
 * consume, no caduca nada.
 *
 * Existe para que **una pantalla del servidor** pueda saber si tiene sentido
 * pedir un código, y no solo una acción. Es la misma lección que la cookie
 * espejo del vínculo de equipos: una decisión tomada solo en el cliente obliga
 * a no representar nada hasta hidratar, y eso es un fotograma en blanco
 * (FR-DEV-1.1).
 */
export function existeAccesoPendiente(id: string | undefined): boolean {
  if (!id) return false;
  const access = pending.get(id);
  return access !== undefined && access.expiresAt > Date.now();
}

/** Abandona el reto en curso: "Usar otra cuenta" y el cierre de la pantalla. */
export function descartarAccesoPendiente(id: string | undefined): void {
  if (id) pending.delete(id);
}
