import { test, expect } from "@playwright/test";

import { MARTA, signInAsAdmin } from "./admin-helpers";

/**
 * `/admin/equipos` — **§3 del FRD**, sus dos pestañas.
 *
 * Lo que comprueba esta spec es **la pantalla**. Las reglas del acto de
 * vincular y desvincular están en `equipos-domain.spec.ts`, sin navegador, que
 * es donde se pueden ejercitar todas sus salidas sin dejar la red a medias.
 *
 * ── Por qué aquí no se muta la red ────────────────────────────────────────
 * Ni se desvincula ni se vincula de verdad. El dominio en memoria es **del
 * servidor** y lo comparten las seis trabajadoras de Playwright: una prueba
 * que dejara una caja sin equipo la dejaría así **para el resto de la
 * corrida**, y hay specs que dependen de lo contrario —`admin-cajas`
 * comprueba que una caja con equipo no se puede retirar—. Así que aquí se
 * abre el diálogo, se comprueba que dice lo que **FR-AD-EQ-9**,
 * **FR-AD-EQ-10** y **FR-AD-EQ-11** exigen, y se cancela; y de §3.4 se
 * recorre hasta el paso que pide el objeto, sin confirmar. Identificar un
 * reto no lo consume (`identificarReto`), así que esa pasada no deja nada
 * detrás.
 */

test.beforeEach(async ({ page }) => {
  await signInAsAdmin(page, MARTA);
  await page.goto("/admin/equipos");
  await expect(page.getByRole("main")).toBeVisible();
});

test("presenta las dos clases de equipo, con Cajas por defecto", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "Equipos", level: 1 })).toBeVisible();

  const clases = page.getByRole("navigation", { name: "Clases de equipo" });
  const cajas = clases.getByRole("link", { name: /^Cajas/ });
  const kioscos = clases.getByRole("link", { name: /^Kioscos de autoservicio/ });

  /* **FR-AD-EQ-1**: Cajas por defecto. La pestaña activa se marca con
     `aria-current`, que es lo que la hace evidente también sin ver el color. */
  await expect(cajas).toHaveAttribute("aria-current", "page");
  await expect(kioscos).not.toHaveAttribute("aria-current", "page");
});

test("las cajas sin equipo van primero y se dicen con todas las letras", async ({ page }) => {
  /* **FR-AD-EQ-6**: listar las cajas sin equipo es el punto de la pantalla, no
     un detalle. Marta tiene al menos una —`sede-vedado:caja-04` está sembrada
     sin equipo a propósito— así que el aviso de cabecera debe estar. */
  await expect(page.getByText(/no (tiene|tienen) equipo vinculado/)).toBeVisible();

  /* Y la primera fila es una de ellas. Sin recuentos absolutos: `admin-cajas`
     crea cajas en Vedado y cambiaría cualquier número que afirmáramos aquí. */
  const primera = page.getByRole("row").filter({ hasNotText: "Sede" }).first();
  await expect(primera).toContainText("Sin equipo vinculado");
});

test("una caja con equipo muestra su identificador y quién lo vinculó", async ({ page }) => {
  /* **FR-AD-EQ-5** pide el identificador del equipo, no solo su rótulo: es el
     dato por el que se reconoce una máquina cuando hay dos iguales en la misma
     sala. `CAJ-0001-0003` es la caja con datos simulados de Vedado. */
  const fila = page.getByRole("row").filter({ hasText: "CAJ-0001-0003" });
  await expect(fila).toContainText("Mostrador 3 · Vedado");
  await expect(fila).toContainText("Marta Sánchez");
});

test("no se ve ni un equipo de otra empresa", async ({ page }) => {
  /* **A1**: Miramar y Matanzas son de Caribe, y sus equipos están sembrados.
     Que no aparezcan aquí no es cosmético. */
  await expect(page.getByText("PuntoCash Matanzas")).toHaveCount(0);
  await expect(page.getByText("CAJ-0003-0001")).toHaveCount(0);
});

test("el diálogo de desvincular dice lo que pasa, lo que no pasa, y la alternativa", async ({
  page,
}) => {
  const fila = page.getByRole("row").filter({ hasText: "CAJ-0001-0003" });
  await fila.getByRole("button", { name: "Desvincular" }).click();

  const dialogo = page.getByRole("dialog");
  await expect(dialogo).toBeVisible();

  // **FR-AD-EQ-9**: el equipo vuelve a su pantalla y la sesión del trabajador termina.
  await expect(dialogo).toContainText("Volverá a su pantalla de vinculación");
  await expect(dialogo).toContainText("su sesión termina");

  /* **FR-AD-EQ-10**, que es la razón de que esta acción se permita: no cierra
     la jornada, y se dice destacado. */
  await expect(
    dialogo.getByText("Desvincular no cierra la jornada"),
    "el aviso de FR-AD-EQ-10 no está",
  ).toBeVisible();
  await expect(dialogo).toContainText("hasta su arqueo y cierre");

  // **FR-AD-EQ-11**: la alternativa a mano, sin ejecutarla por él.
  await expect(dialogo.getByRole("link", { name: "Jornadas" })).toBeVisible();

  await dialogo.getByRole("button", { name: "Cancelar" }).click();
  await expect(dialogo).toBeHidden();

  // Nada cambió: el equipo sigue siendo el de esa caja.
  await expect(page.getByRole("row").filter({ hasText: "CAJ-0001-0003" })).toBeVisible();
});

test("una caja sin equipo no ofrece desvincular: ofrece vincular", async ({ page }) => {
  const sinEquipo = page.getByRole("row").filter({ hasText: "Sin equipo vinculado" }).first();
  await expect(sinEquipo.getByRole("button", { name: "Desvincular" })).toHaveCount(0);
  await expect(sinEquipo.getByRole("link", { name: "Vincular un equipo" })).toBeVisible();
});

/* -------------------------------------------------------------------------
 * Pestaña de kioscos (FR-AD-EQ-12 a FR-AD-EQ-16)
 * ---------------------------------------------------------------------- */

/** Deja la pantalla en la pestaña de kioscos, navegando como lo haría alguien. */
async function irAKioscos(page: import("@playwright/test").Page) {
  await page
    .getByRole("navigation", { name: "Clases de equipo" })
    .getByRole("link", { name: /^Kioscos de autoservicio/ })
    .click();

  await expect(page).toHaveURL(/\/admin\/equipos\?pestana=kioscos$/);
  await expect(page.getByRole("heading", { name: "Kioscos de autoservicio", level: 2 })).toBeVisible();
}

test("una sede puede tener varios kioscos, y cada uno lleva su identificador", async ({ page }) => {
  await irAKioscos(page);

  /* **FR-AD-EQ-14**: aquí no rige el límite de uno por objeto que sí rige para
     las cajas, y Vedado tiene dos sembrados a propósito. **FR-AD-EQ-12** pide
     el identificador además del rótulo. */
  const entrada = page.getByRole("row").filter({ hasText: "KIO-0001-0001" });
  const sala = page.getByRole("row").filter({ hasText: "KIO-0001-0002" });

  await expect(entrada).toContainText("Kiosco entrada · Vedado");
  await expect(entrada).toContainText("Marta Sánchez");
  await expect(sala).toContainText("Kiosco sala de espera · Vedado");
});

test("el diálogo de desvincular un kiosco dice también lo que no ocurre", async ({ page }) => {
  await irAKioscos(page);

  const fila = page.getByRole("row").filter({ hasText: "KIO-0001-0001" });
  await fila.getByRole("button", { name: "Desvincular" }).click();

  const dialogo = page.getByRole("dialog");
  await expect(dialogo).toBeVisible();

  // **FR-AD-EQ-15**: pierde la sesión, descarta lo que hubiera a medias, vuelve a vincularse.
  await expect(dialogo).toContainText("Pierde su sesión al instante");
  await expect(dialogo).toContainText("se descarta sin generar ningún código");
  await expect(dialogo).toContainText("pantalla de vinculación");

  /* **FR-AD-EQ-16**, que es la mitad que evita una llamada de alguien con un
     papel en la mano: lo ya generado sigue siendo válido. */
  await expect(
    dialogo.getByText("Las solicitudes ya generadas no se ven afectadas"),
    "el aviso de FR-AD-EQ-16 no está",
  ).toBeVisible();
  await expect(dialogo).toContainText("siguen siendo válidos en caja");

  await dialogo.getByRole("button", { name: "Cancelar" }).click();
  await expect(dialogo).toBeHidden();
  await expect(page.getByRole("row").filter({ hasText: "KIO-0001-0001" })).toBeVisible();
});

test("vincular ofrece las dos vías y no pide el objeto hasta saber qué equipo es", async ({
  page,
}) => {
  await page.getByRole("link", { name: "Vincular un equipo" }).first().click();
  await expect(page).toHaveURL(/\/admin\/equipos\/vincular$/);

  /* **FR-AD-EQ-17**: las dos vías conviven, sin obligar a elegir. */
  await expect(page.getByRole("heading", { name: "Escanear el QR" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Escribir el código" })).toBeVisible();

  /* El código se lee de la nota de demostración, que es de donde lo leería
     quien recorre la demostración; en el producto sale de la pantalla del
     propio equipo (**FR-AD-EQ-26**). Leerlo de ahí, y no de `devices.ts`,
     mantiene esta prueba en lo que ve el administrador. */
  const equipoCaja = page.getByRole("listitem").filter({ hasText: "Equipo de caja" });
  const codigo = (await equipoCaja.innerText()).match(/(\d{3})\s(\d{3})/);
  expect(codigo, "la nota de demostración no ofrece ninguna caja esperando").not.toBeNull();

  await page.getByLabel("Código de seis cifras").fill(`${codigo![1]}${codigo![2]}`);

  /* **FR-AD-EQ-18**: antes de pedir la sede dice qué está vinculando — la
     clase y el identificador—, y solo para una caja aparece el selector de
     caja (**FR-AD-EQ-7**, **FR-AD-EQ-13**). */
  await expect(page.getByRole("heading", { name: "Equipo de caja" })).toBeVisible();
  await expect(page.getByText(/^CAJ-\d{4}-\d{4}$/)).toBeVisible();
  /* Por identificador y no por etiqueta: la cabecera pinta su selector de
     alcance **dos veces** —escritorio y móvil— y las dos se llaman «Sede que
     estás viendo», así que `getByLabel("Sede")` encuentra tres cosas y
     `select[name="sede"]` otras tres. Contado en la página, no supuesto. */
  await expect(page.locator("#vincular-sede")).toBeVisible();
  await expect(page.locator("#vincular-caja")).toBeVisible();

  /* Y se sale sin confirmar: identificar no consume el reto. */
  await page.getByRole("button", { name: "Empezar de nuevo" }).click();
  await expect(page.getByRole("heading", { name: "Escribir el código" })).toBeVisible();
});
