import { test, expect } from "@playwright/test";

import { MARTA, signInAsAdmin } from "./admin-helpers";

/**
 * Cajas — **§4 del FRD**.
 *
 * ── Cómo se trata el estado compartido ────────────────────────────────────
 * El dominio es un mock en memoria **del servidor de desarrollo**, así que lo
 * que una prueba crea lo ven todas las demás, y sobrevive a la prueba. De ahí
 * tres reglas que conviene respetar al añadir casos aquí:
 *
 *   1. Las que **escriben** corren en serie (`mode: "serial"`) y usan un
 *      nombre único por ejecución. Dos ejecuciones de la suite sobre el mismo
 *      servidor no pueden chocar entre sí por un identificador repetido.
 *   2. Se escribe **solo en PuntoCash Vedado**. `PuntoCash Cerro` es la sede
 *      recién entregada y sin cajas, y varias pruebas —aquí y en
 *      `admin-sedes`— dependen de que siga estándolo.
 *   3. No se afirma ningún recuento absoluto de cajas: lo que otra prueba haya
 *      creado no puede hacer fallar a esta.
 *
 * Nada de esto se puede deshacer del todo: retirar no borra (**FR-AD-CAJA-11**),
 * así que una caja creada por la suite queda ahí, retirada, hasta que se
 * reinicie el servidor. Es el precio de probar escrituras contra un mock
 * compartido, y es preferible a no probarlas.
 */

/* Los controles de sede se localizan **por su identificador**, no por
 * etiqueta ni por rol. La página tiene legítimamente hasta tres: el selector de
 * alcance de la cabecera, su gemelo de la franja del teléfono —uno de los dos
 * siempre oculto según el ancho— y, en el alta, el del formulario. Comprobado
 * en la página: los dos primeros comparten etiqueta («Sede que estás viendo») y
 * el del formulario se etiqueta «Sede*», con el asterisco de obligatorio
 * dentro, así que ni buscar por texto exacto ni por rol distingue el que se
 * quiere. El identificador sí, y además dice en la prueba cuál es.
 */

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ page }) => {
  await signInAsAdmin(page, MARTA);
  await page.goto("/admin/cajas");
  await expect(page.getByRole("main")).toBeVisible();
});

test("una sede sin cajas lo dice, en vez de no aparecer", async ({ page }) => {
  /* **FR-AD-CAJA-3**: es el estado en que llega toda sede recién asignada, y
     quien abre esta pantalla por primera vez tiene que entender qué le falta.
     Una tabla plana de cajas no podría decir nada de una sede sin ninguna. */
  await expect(page.getByRole("heading", { name: "PuntoCash Cerro" })).toBeVisible();
  await expect(
    page.getByText(
      "Esta sede todavía no tiene cajas. Crea al menos una para poder vincular un equipo y empezar a operar.",
    ),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /Crear la primera caja/ })).toBeVisible();
});

test("la ausencia de equipo se dice, no se deja en blanco", async ({ page }) => {
  /* **FR-AD-CAJA-2**: es una de las tres situaciones que impiden operar.
   *
   * Se busca por FILA y no por texto suelto. `ResponsiveTable` representa cada
   * fila dos veces —la tarjeta del teléfono primero en el documento, la tabla
   * después—, así que `getByText(...).first()` cogía la tarjeta, que a este
   * ancho está oculta. Una fila solo existe en la tabla. */
  await expect(
    page.getByRole("row").filter({ hasText: "Sin equipo vinculado" }).first(),
  ).toBeVisible();

  await expect(page.getByRole("row").filter({ hasText: "Mostrador 3 · Vedado" })).toBeVisible();
});

test("retirar una caja con equipo vinculado se rechaza y dice qué hacer antes", async ({ page }) => {
  const fila = page.getByRole("row").filter({ hasText: "Mostrador 1 · Vedado" });
  await fila.getByRole("button", { name: "Retirar" }).click();

  const dialogo = page.getByRole("dialog");
  await expect(dialogo).toBeVisible();
  // El aviso aparece antes de intentarlo siquiera.
  await expect(dialogo.getByText(/Desvincula Mostrador 1 · Vedado antes de retirarla/)).toBeVisible();

  await dialogo.getByLabel("Motivo de la retirada").fill("Sustitución del mostrador por obras");
  await dialogo.getByRole("button", { name: "Retirar caja" }).click();

  // **FR-AD-CAJA-10**: el dominio lo rechaza, y el motivo se lee donde se provocó.
  await expect(
    dialogo.getByText("Esta caja tiene un equipo vinculado. Desvincúlalo antes de retirarla."),
  ).toBeVisible();
});

test("un identificador repetido en la misma sede se rechaza con su mensaje", async ({ page }) => {
  await page.goto("/admin/cajas/nueva");
  await page.locator("#nueva-caja-sede").selectOption("sede-vedado");
  await page.getByLabel("Identificador de la caja").fill("Caja 01");
  await page.getByRole("button", { name: "Crear caja" }).click();

  // **FR-AD-CAJA-6**
  await expect(page.getByText("Ya existe una caja con ese nombre en esta sede.")).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/cajas\/nueva$/);
});

test("crear una caja encamina a vincularle un equipo, y retirarla pide motivo", async ({ page }) => {
  const nombre = `Caja QA ${Date.now()}`;

  await page.goto("/admin/cajas/nueva");
  await page.locator("#nueva-caja-sede").selectOption("sede-vedado");
  await page.getByLabel("Identificador de la caja").fill(nombre);
  await page.getByRole("button", { name: "Crear caja" }).click();

  /* **FR-AD-CAJA-7**: nace activa y sin equipo, y el resultado lleva al paso
     siguiente en vez de dejar a nadie mirando una lista. */
  await page.waitForURL(/\/admin\/cajas\?creada=/);
  const aviso = page.getByRole("status").filter({ hasText: `${nombre} creada` });
  await expect(aviso).toBeVisible();
  // Acotado al aviso: "Equipos" también es un destino de la navegación.
  await expect(aviso.getByRole("link", { name: "Equipos" })).toBeVisible();

  const fila = page.getByRole("row").filter({ hasText: nombre });
  await expect(fila.getByText("Sin equipo vinculado")).toBeVisible();

  // Y se retira: sin equipo ni jornada, el dominio la deja.
  await fila.getByRole("button", { name: "Retirar" }).click();
  const dialogo = page.getByRole("dialog");

  // Sin motivo no hay retirada (**FR-AD-CAJA-8**).
  await dialogo.getByRole("button", { name: "Retirar caja" }).click();
  await expect(dialogo.getByText(/Escribe el motivo/)).toBeVisible();

  await dialogo.getByLabel("Motivo de la retirada").fill("Mostrador de prueba creado por la suite");
  await dialogo.getByRole("button", { name: "Retirar caja" }).click();

  // **FR-AD-CAJA-11**: no se borra nada, y la pantalla lo dice.
  await expect(dialogo.getByText(/Su histórico sigue accesible/)).toBeVisible();
});
