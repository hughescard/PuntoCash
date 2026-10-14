"use server";

import { cookies } from "next/headers";
import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  ADMIN_SCOPE_COOKIE,
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  ALCANCE_TODAS,
  resolveAdminSession,
  serializeAdminSession,
} from "@/features/admin/session";
import {
  verificarCredencialesAdmin,
  type AdminCredentials,
  type AdminLoginResult,
} from "@/features/admin/admin-auth";
import {
  ADMIN_PENDING_COOKIE,
  canjearAccesoPendiente,
  descartarAccesoPendiente,
  registrarAccesoPendiente,
} from "@/features/admin/pending-access";
import { DEMO_CODE } from "@/features/auth/two-factor";
import { registrarAccesoUsuarioAdmin } from "@/features/network/operators";

/**
 * Las escrituras de estado de `/admin`: el acceso de dos pasos, el cierre de
 * sesión y la elección de sede. Todas ocurren **en el servidor**.
 *
 * Es la lección del vínculo de equipos, aplicada desde el principio en vez de
 * a posteriori: cuando la decisión de qué representar vive en el navegador, el
 * servidor deja de renderizar y con ello se pierden el primer pintado y los
 * 404 de verdad (FR-DEV-1.1). Aquí la cookie de sesión la escribe el servidor,
 * así que el layout puede decidir antes de enviar una sola etiqueta.
 *
 * La cookie sigue sin estar firmada ni respaldada por un almacén de sesiones:
 * representa lo correcto, no autoriza. Cuando exista backend, estas tres
 * funciones son el único sitio que cambia.
 */

/**
 * Las tres cookies viven bajo `/admin` y se borran con la **misma** ruta con la
 * que se escribieron: borrarlas con la ruta por defecto no tocaría estas, y
 * cerrar sesión dejaría la sesión abierta.
 */
const COOKIE_PATH = "/admin";

/**
 * La de **sesión** es `httpOnly`: dice quién entró, y eso no lo toca el
 * navegador. La de **alcance** no puede serlo, y no pasa nada: es un filtro de
 * vista, no una autorización. El servidor vuelve a resolver en cada petición
 * qué sedes alcanza esta sesión (`resolveAdminSession`), así que una cookie
 * manipulada a mano no enseña ni una sede de más — como mucho, no filtra.
 *
 * A cambio, el selector puede escribirla desde el cliente, que es lo que hace
 * que el cambio de sede sea una recarga limpia en lugar de una navegación
 * blanda en la que el enrutador reutiliza el layout (ver `scope-selector.tsx`).
 */
const SCOPE_COOKIE_HTTP_ONLY = false;

/**
 * **Paso 1 del acceso (FR-AD-ACC-1).** Comprueba las credenciales en el
 * servidor y, si son correctas, registra ahí el reto y deja su identificador
 * en una cookie `httpOnly`.
 *
 * Lo que devuelve **no lleva identidad**: solo que hay un código en camino. De
 * quién es el reto lo sabe el servidor y no necesita que el cliente se lo
 * recuerde — que es justamente lo que hace que el paso 2 sea una condición y
 * no una cortesía.
 */
export async function iniciarAccesoAdmin(
  credentials: AdminCredentials,
): Promise<AdminLoginResult> {
  const check = await verificarCredencialesAdmin(credentials);

  if (check.status !== "ok") return { status: check.status };

  const id = registrarAccesoPendiente(check.userId, DEMO_CODE);

  const store = await cookies();
  store.set(ADMIN_PENDING_COOKIE, id, {
    path: COOKIE_PATH,
    httpOnly: true,
    sameSite: "lax",
    // Lo mismo que la ventana del reto en `pending-access.ts`.
    maxAge: 10 * 60,
  });

  return { status: "challenge-required" };
}

/**
 * **Paso 2 del acceso [R13].** Abre la sesión, y solo si el código es el que
 * el servidor emitió para el reto de esta cookie.
 *
 * Recibe el **código**, no el usuario. Es la diferencia que importa: antes
 * recibía un `userId` del cliente, así que invocar esta acción con cualquier
 * identificador abría sesión sin haber pasado por la contraseña ni por el
 * código. Ahora hacen falta las dos cosas y ninguna la aporta el navegador.
 */
export async function abrirSesionAdmin(code: string): Promise<void> {
  const store = await cookies();

  const userId = canjearAccesoPendiente(store.get(ADMIN_PENDING_COOKIE)?.value, code);
  if (!userId) return;

  store.delete({ name: ADMIN_PENDING_COOKIE, path: COOKIE_PATH });

  // Se comprueba también aquí: el usuario pudo quedar desactivado, o su
  // operador suspendido, entre la contraseña y el código (A14, FR-AD-ACC-6).
  if (!resolveAdminSession(userId)) return;

  store.set(ADMIN_SESSION_COOKIE, serializeAdminSession({ userId }), {
    path: COOKIE_PATH,
    httpOnly: true,
    sameSite: "lax",
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
  });

  /* **FR-AD-USR-1**: el «último acceso» se anota **aquí**, y no al acertar la
     contraseña, porque hasta este punto no hay sesión **[R13]**. Un acceso
     apuntado en el paso 1 contaría como entrada algo que puede no haber
     terminado nunca. */
  registrarAccesoUsuarioAdmin(userId);

  // Una sesión nueva empieza mirando todo su alcance, no lo que eligió quien
  // usó este navegador antes.
  store.delete({ name: ADMIN_SCOPE_COOKIE, path: COOKIE_PATH });
}

/** "Usar otra cuenta" y el cierre de la pantalla de verificación. */
export async function descartarAccesoAdmin(): Promise<void> {
  const store = await cookies();
  descartarAccesoPendiente(store.get(ADMIN_PENDING_COOKIE)?.value);
  store.delete({ name: ADMIN_PENDING_COOKIE, path: COOKIE_PATH });
}

export async function cerrarSesionAdmin(): Promise<void> {
  const store = await cookies();
  store.delete({ name: ADMIN_SESSION_COOKIE, path: COOKIE_PATH });
  store.delete({ name: ADMIN_SCOPE_COOKIE, path: COOKIE_PATH });
  store.delete({ name: ADMIN_PENDING_COOKIE, path: COOKIE_PATH });
  redirect("/admin/login");
}

/**
 * Selector de alcance (FR-AD-SCOPE-4). No amplía nada: el alcance lo fija la
 * sesión y esto solo filtra dentro de él, así que basta con recordar la
 * elección — quién puede ver qué lo vuelve a resolver `resolveAdminSession`
 * en cada petición, que es quien descarta una sede que ya no se administra
 * (FR-AD-SCOPE-6).
 *
 * ── Por qué termina en una redirección ───────────────────────────────────
 * El selector vive en el **layout** y lo que filtra vive debajo. Guardar la
 * cookie y confiar en que Next devuelva las dos mitades no basta: el layout se
 * servía del caché del enrutador y el resultado era una pantalla filtrada bajo
 * un selector que seguía diciendo "Todas mis sedes" — y esa opción quedaba
 * además inservible, porque elegir lo que el control ya muestra no dispara
 * ningún cambio.
 *
 * Redirigir a la misma ruta convierte el cambio de sede en una navegación de
 * verdad: layout y pantalla se vuelven a pedir juntos, con la cookie ya puesta,
 * y no hay forma de que cuenten cosas distintas.
 */
export async function seleccionarAlcance(formData: FormData): Promise<void> {
  const value = String(formData.get("sede") ?? ALCANCE_TODAS);
  const store = await cookies();

  if (value === ALCANCE_TODAS) {
    store.delete({ name: ADMIN_SCOPE_COOKIE, path: COOKIE_PATH });
  } else {
    store.set(ADMIN_SCOPE_COOKIE, value, {
      path: COOKIE_PATH,
      httpOnly: SCOPE_COOKIE_HTTP_ONLY,
      sameSite: "lax",
      maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
    });
  }

  /* De dónde venía, para volver ahí. Se valida en vez de confiar: un campo de
     formulario es texto que llega de fuera, y una redirección a donde diga ese
     texto es una redirección abierta. */
  const desde = String(formData.get("desde") ?? "");
  const destino = desde.startsWith("/admin/") && !desde.startsWith("/admin//")
    ? desde
    : "/admin/inicio";

  revalidatePath("/admin", "layout");
  // `typedRoutes` no puede comprobar una ruta que llega en un formulario; ya
  // se validó arriba que apunta dentro de `/admin`.
  redirect(destino as Route);
}
