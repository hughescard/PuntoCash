import { expect, type Page } from "@playwright/test";

/**
 * Utilidades compartidas por las pruebas de `/admin`.
 *
 * Vive fuera de `*.spec.ts` a propósito: importar un archivo de pruebas desde
 * otro haría que Playwright registrara sus casos dos veces.
 */

export const ADMIN_PASSWORD = "puntocash";

/** Código que acepta el mock del segundo factor. */
export const DEMO_CODE = "123456";

/** Administradora de Malecón: tres sedes en su alcance. */
export const MARTA = "marta@malecon-sf.cu";

/** Administrador de Caribe: tres sedes. */
export const REINALDO = "rortega@caribecambios.cu";

/** Administradora de Centro Divisas: **una sola** sede (FR-AD-SCOPE-3). */
export const IDALMIS = "ibetancourt@centrodivisas.cu";

/** Operador activo al que PuntoCash todavía no le asignó ninguna sede. */
export const LIUDMILA = "lperez@cienfuegoscambio.cu";

/** Bahía: una sede suspendida (Trinidad) y otra solo con cajas retiradas (Pinar del Río). */
export const ANA = "abarrios@bahiacambios.cu";

/** Su empresa está suspendida por PuntoCash: no debe entrar (A14). */
export const YULIET = "yperez@orientedivisas.cu";

/**
 * Afirma que la página no produce desplazamiento horizontal
 * (**FR-AD-STATE-8**).
 *
 * Se mide sobre `documentElement` y no sobre un contenedor: el síntoma que el
 * requisito persigue es el de la página entera, y un bloque que se desborda
 * dentro de su propio `overflow-x-auto` —una tabla, por ejemplo— es
 * deliberado y no debe hacer fallar esto.
 */
export async function sinDesbordamientoHorizontal(page: Page, donde = ""): Promise<void> {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth - doc.clientWidth;
  });
  expect(overflow, `desplazamiento horizontal en ${donde || "la página"}`).toBeLessThanOrEqual(0);
}

/**
 * Cuánto se le concede al formulario de acceso para hidratarse.
 *
 * Generoso a propósito: el servidor de desarrollo compila cada ruta la primera
 * vez que alguien la pide, y con varios trabajadores pegando a la vez ese
 * primer `/admin/login` puede tardar. No mide nada del producto.
 */
const HIDRATACION_MS = 20_000;

/**
 * Rellena las credenciales y envía.
 *
 * **Espera el botón habilitado antes de escribir**, y eso es lo que de verdad
 * importa aquí: el botón está deshabilitado hasta que React se engancha al
 * formulario —es lo que evita que un envío nativo ponga la contraseña en la
 * barra de direcciones (ver `admin-login-form.tsx`)—, así que esperarlo
 * habilitado **es** esperar la hidratación, y dejarla pasar antes de escribir
 * quita de en medio toda ambigüedad sobre en qué estado se rellenó el
 * formulario.
 *
 * Si esta espera agota su plazo, el formulario no hidrató. No es un problema
 * del localizador ni de la contraseña: o el servidor de desarrollo está
 * sirviendo una compilación desajustada —borrar `.next` y reiniciarlo es lo
 * primero que hay que probar— o hay un error de cliente, y la consola del
 * navegador lo dice.
 */
export async function submitCredentials(page: Page, identifier: string, password: string) {
  const enviar = page.getByRole("button", { name: "Iniciar sesión" });
  await expect(enviar, "el formulario de acceso no llegó a hidratarse").toBeEnabled({
    timeout: HIDRATACION_MS,
  });

  await page.getByLabel("Usuario o correo electrónico").fill(identifier);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await enviar.click();
}

/** Recorre el acceso completo de dos pasos y deja la sesión abierta en Inicio. */
export async function signInAsAdmin(page: Page, identifier: string) {
  await page.goto("/admin/login");
  await submitCredentials(page, identifier, ADMIN_PASSWORD);

  await page.waitForURL(/\/admin\/verificacion$/);
  await page.getByLabel("Código de verificación").fill(DEMO_CODE);

  await page.waitForURL(/\/admin\/inicio$/);
  // El shell llega renderizado desde el servidor; esperar a `main` cubre la
  // re-navegación y evita leer un árbol que se está rehaciendo.
  await expect(page.getByRole("main")).toBeVisible();
}
