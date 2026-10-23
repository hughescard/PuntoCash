import { test, expect } from "@playwright/test";

import { MARTA, signInAsAdmin } from "./admin-helpers";

/** El segundo usuario de Malecón: administrador, **no** el principal. */
const DANIEL = "dcastro@malecon-sf.cu";

/**
 * `/admin/usuarios` — **§8 del FRD**, la prueba de navegación y congruencia.
 *
 * ── Qué protege, y qué no ─────────────────────────────────────────────────
 * **Una** por sección. Lo que esta vigila es que el documento y lo que se ve
 * no se contradigan en lo único que de verdad distingue a esta sección: **que
 * pertenece al administrador principal** (**FR-AD-USR-11**), y que para los
 * demás **no existe** —ni en el menú ni como ruta—.
 *
 * Son dos mitades y hacen falta las dos. Ocultar la entrada del menú sin
 * cerrar la ruta deja la sección accesible a quien pegue la URL; cerrar la
 * ruta sin ocultar la entrada deja un enlace que lleva a un 404 en el menú de
 * alguien. Las dos se comprueban aquí, con dos sesiones distintas.
 *
 * Las reglas del dominio —traspaso, indesactivable, alcance— se ejercitan sin
 * navegador en `network-domain.spec.ts`.
 *
 * ── Por qué no se escribe nada ────────────────────────────────────────────
 * El dominio en memoria es **del servidor** y lo comparten las seis
 * trabajadoras de Playwright. Un traspaso quedaría hecho **para el resto de la
 * corrida**, y dejaría a Marta sin la sección que las demás pruebas suponen
 * que tiene. Así que se recorre y se lee; el diálogo del traspaso se abre y se
 * cancela.
 */

test.describe("§8 Usuarios — el administrador principal", () => {
  test("el principal ve la sección, y lleva a sus pantallas", async ({ page }) => {
    await signInAsAdmin(page, MARTA);
    await page.goto("/admin/usuarios");
    await expect(page.getByRole("heading", { name: "Usuarios", level: 1 })).toBeVisible();

    /* **FR-AD-USR-1**: el papel se dice con palabras completas en su columna,
       no como etiqueta junto al nombre. */
    await expect(page.getByRole("main").getByText("Administrador principal").first()).toBeVisible();

    /* **FR-AD-USR-2**: el alta es su propia ruta. */
    await page.getByRole("link", { name: "Dar de alta" }).click();
    await page.waitForURL(/\/admin\/usuarios\/nuevo$/);
    await expect(page.getByRole("heading", { name: "Dar de alta un usuario" })).toBeVisible();

    /* **FR-AD-USR-4**: la consecuencia que más sorprende, dicha antes de
       confirmar. Si algún día se quitara, el requisito tendría que cambiar
       antes. */
    await expect(page.getByText(/Podrá hacer todo lo que tú haces en la operación/)).toBeVisible();

    /* **FR-AD-USR-6**: la ficha muestra datos y acciones, **y nada más**. Las
       secciones que explicaban capacidades y origen se retiraron en la v5.1;
       esto impide que vuelvan sin tocar el requisito. */
    await page.goto("/admin/usuarios");
    /* `:visible`: la tarjeta del teléfono, oculta a este ancho, va antes en el DOM. */
    await page.locator('main a[href^="/admin/usuarios/adm-"]:visible').first().click();
    await page.waitForURL(/\/admin\/usuarios\/adm-[^/]+$/);

    const secciones = page.getByRole("main").getByRole("heading", { level: 2 });
    await expect(secciones).toHaveText(["Datos", "Acciones"]);
  });

  test("al principal no se le ofrece desactivar, y sí traspasar", async ({ page }) => {
    await signInAsAdmin(page, MARTA);
    await page.goto("/admin/usuarios/adm-malecon-1");

    /* **FR-AD-USR-13**: el control **no está**, y la razón sí. */
    await expect(page.getByRole("button", { name: "Desactivar" })).toHaveCount(0);
    await expect(
      page.getByText("Al administrador principal no lo desactiva nadie"),
    ).toBeVisible();

    /* **FR-AD-USR-12**: el traspaso se ofrece en la ficha del principal. */
    const traspasar = page.getByRole("button", { name: /Traspasar la administración/ });
    await expect(traspasar).toBeEnabled();
    await traspasar.click();

    const dialogo = page.getByRole("dialog");
    await expect(dialogo.getByText(/Dejarás de ver la sección de Usuarios/)).toBeVisible();
    /* Solo activos, y nunca uno mismo. */
    await expect(dialogo.getByRole("option", { name: "Marta Sánchez" })).toHaveCount(0);

    // Se cancela: esta spec no muta la red.
    await dialogo.getByRole("button", { name: "Cancelar" }).click();
    await expect(dialogo).toBeHidden();
  });

  test("para quien no es el principal la sección no existe", async ({ page }) => {
    await signInAsAdmin(page, DANIEL);

    /* **FR-AD-USR-11**, primera mitad: no está en el menú. Se mira la
       navegación del shell, no la página, y se exige que el enlace **no
       exista** en el HTML —no que esté oculto—: la decisión se toma en el
       servidor, y ocultarlo en el cliente lo habría dejado ahí. */
    await expect(page.locator('nav a[href="/admin/usuarios"]')).toHaveCount(0);

    /* Segunda mitad: la ruta responde como **inexistente**, no como prohibida.
       Si se distinguieran, pegar la URL diría que la sección existe. */
    const respuesta = await page.goto("/admin/usuarios");
    expect(respuesta?.status(), "la sección no debe existir para quien no la gobierna").toBe(404);

    const ficha = await page.goto("/admin/usuarios/adm-malecon-1");
    expect(ficha?.status(), "tampoco sus fichas").toBe(404);
  });
});
