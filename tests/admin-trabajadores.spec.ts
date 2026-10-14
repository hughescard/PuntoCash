import { test, expect } from "@playwright/test";

import { IDALMIS, MARTA, signInAsAdmin } from "./admin-helpers";

/**
 * `/admin/trabajadores` — **§7 del FRD**, la prueba de navegación y congruencia.
 *
 * ── Qué es esto, y qué no es ──────────────────────────────────────────────
 * **Una** prueba por sección, no una batería. Esto es una demostración: lo que
 * se entrega es la interfaz, la navegación y los documentos, y blindar el
 * producto final con pruebas es trabajo de quien lo implemente, sobre el
 * código de verdad. Lo que esta spec protege es que **el FRD y lo que se ve no
 * se contradigan**: que las rutas de §7 existan y lleven donde el documento
 * dice, que el alcance se respete, y que lo que el documento fija palabra por
 * palabra esté en pantalla.
 *
 * Las reglas del dominio —alcance, duplicados, jornada abierta, reactivación—
 * se ejercitan sin navegador en `network-domain.spec.ts`, que es donde se
 * recorren todas sus salidas sin dejar la red a medias.
 *
 * ── Por qué no se escribe nada aquí ───────────────────────────────────────
 * El dominio en memoria es **del servidor** y lo comparten las seis
 * trabajadoras de Playwright. Un alta, una desactivación o un cambio de correo
 * quedarían hechos **para el resto de la corrida**, y hay specs que dependen
 * de lo contrario. Así que se recorre y se lee; lo único que se abre es un
 * diálogo, y se cancela.
 *
 * ── Dos localizadores que no son los obvios, y por qué ────────────────────
 * Las filas se buscan **por `href`** y no por nombre: el listado se pinta dos
 * veces —tabla en ancho, tarjetas en estrecho— y además la cabecera de la
 * página tiene su propio enlace. Y los campos ausentes se buscan **dentro de
 * `main`**: `getByLabel("Sede")` encuentra tres en toda la página, porque el
 * selector de alcance del shell se pinta por duplicado.
 */

/** Un trabajador cualquiera del listado. No se nombra: los datos cambian. */
const FILA = 'main a[href^="/admin/trabajadores/trb-"]';

test.describe("§7 Trabajadores — navegación y congruencia", () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page, MARTA);
    await page.goto("/admin/trabajadores");
    await expect(page.getByRole("main")).toBeVisible();
  });

  test("del listado a la ficha, y de la ficha a sus dos pantallas", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Trabajadores", level: 1 })).toBeVisible();

    /* **FR-AD-TRAB-3**: el alta es su propia ruta y se llega desde aquí. */
    await page.getByRole("link", { name: "Dar de alta" }).click();
    await page.waitForURL(/\/admin\/trabajadores\/nuevo$/);
    await expect(page.getByRole("heading", { name: "Dar de alta un trabajador" })).toBeVisible();

    /* **FR-AD-TRAB-4** / **[A13]**: el alta elige sede y **no ofrece ninguna
       caja**. La ausencia del selector es el requisito, así que se afirma. */
    await expect(page.getByRole("main").getByLabel("Sede", { exact: true })).toHaveCount(1);
    await expect(page.getByRole("main").getByLabel(/caja/i)).toHaveCount(0);

    await page.goto("/admin/trabajadores");
    await page.locator(FILA).first().click();
    await page.waitForURL(/\/admin\/trabajadores\/trb-[^/]+$/);
    const ficha = page.url();

    /* **FR-AD-TRAB-9**: editar es una pantalla aparte, y alcanza a los datos
       personales y **no** al identificador, ni al correo, ni a la sede. Si
       algún día apareciera uno de esos campos sin tocar el requisito, esto lo
       caza antes de que lleguen a verlo los desarrolladores. */
    await page.getByRole("link", { name: "Editar datos" }).click();
    await page.waitForURL(/\/editar$/);
    await expect(page.getByRole("heading", { name: /^Editar a / })).toBeVisible();

    const main = page.getByRole("main");
    await expect(main.getByLabel("Nombre", { exact: true })).toBeVisible();
    for (const ausente of [/identificador/i, /correo/i, /^sede$/i]) {
      await expect(main.getByLabel(ausente)).toHaveCount(0);
    }

    /* **FR-AD-TRAB-10** y **FR-AD-TRAB-11**: la asistencia de acceso, con la
       frase que el documento fija. */
    await page.goto(ficha);
    await page.getByRole("link", { name: "Ayudar con el acceso" }).click();
    await page.waitForURL(/\/acceso$/);
    await expect(page.getByText("Esto no te da acceso a su cuenta")).toBeVisible();
    await expect(page.getByText(/No te muestra su código ni lo genera/)).toBeVisible();

    /* **FR-AD-TRAB-10**: aquí el correo se muestra **sin enmascarar**, al
       contrario que en el listado y la ficha, porque lo que se viene a hacer
       es encontrar la errata. */
    await expect(main.getByLabel("Correo de verificación")).toHaveValue(/@/);
    await expect(main.getByLabel("Correo de verificación")).not.toHaveValue(/•/);
  });

  test("desactivar va el último, y su diálogo advierte siempre de la jornada", async ({ page }) => {
    await page.locator(FILA).first().click();
    await page.waitForURL(/\/admin\/trabajadores\/trb-[^/]+$/);

    const desactivar = page.getByRole("button", { name: "Desactivar" });
    // Deshabilitado hasta hidratar: esperarlo habilitado **es** esperar React.
    await expect(desactivar).toBeEnabled();
    await desactivar.click();

    /* **FR-AD-TRAB-13** con **FR-AD-TRAB-17**: el aviso de jornada abierta se
       da **siempre**, porque este servidor no ve la jornada. El día que pase a
       darse solo cuando la hay, el requisito tiene que cambiar antes. */
    const dialogo = page.getByRole("dialog");
    await expect(dialogo.getByText("No es posible con una jornada abierta")).toBeVisible();
    await expect(dialogo.getByLabel("Motivo de la desactivación")).toBeVisible();

    await dialogo.getByRole("button", { name: "Cancelar" }).click();
    await expect(dialogo).toBeHidden();
  });

  test("un trabajador fuera del alcance responde como inexistente", async ({ page }) => {
    /* **FR-AD-TRAB-2**, **[A1]** y **FR-AD-NAV-3**: Idalmis administra una
       sola sede, de otra empresa. Pegando la URL de un trabajador de Marta
       debe recibir la respuesta de algo que **no existe**, no la de algo
       prohibido: si se distinguieran, probar identificadores bastaría para
       saber quién trabaja en la competencia. */
    await page.context().clearCookies();
    await signInAsAdmin(page, IDALMIS);

    const respuesta = await page.goto("/admin/trabajadores/trb-5");
    expect(respuesta?.status(), "un trabajador ajeno debe responder como inexistente").toBe(404);
  });
});
