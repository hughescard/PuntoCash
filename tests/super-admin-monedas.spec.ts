import { expect, test, type Page } from "@playwright/test";

import { sinDesbordamientoHorizontal } from "./admin-helpers";
import { signInAsSuperAdmin } from "./super-admin-helpers";

/**
 * Monedas y tasas en Super administración.
 *
 * Las escrituras de estas pruebas recaen sobre el **yen**, que ninguna sede
 * tiene en su lista: definir y retirar su rango no toca ninguna tasa ni los
 * Pendientes de Inicio que otras suites comprueban. Sobre el dólar solo se
 * abre el editor para ver la vista previa, y se cancela.
 */

/** Abre el menú «⋯» de la fila de una moneda y elige una acción por su nombre accesible. */
async function abrirAccion(page: Page, code: string, accion: string) {
  await page.getByRole("button", { name: `Acciones de ${code}` }).click();
  await page.getByRole("menuitem", { name: accion }).click();
}

test.describe("monedas y rangos", () => {
  test.beforeEach(async ({ page }) => {
    await signInAsSuperAdmin(page);
    await page.goto("/super-admin/monedas-y-tasas");
  });

  test("una fila por moneda: con rango se cotiza, sin rango nadie puede", async ({ page }) => {
    const tabla = page.getByRole("table");
    const usd = tabla.getByRole("row").filter({ hasText: "Dólar estadounidense" });
    await expect(usd.getByText("300 – 330")).toBeVisible();
    const cad = tabla.getByRole("row").filter({ hasText: "Dólar canadiense" });
    await expect(cad.getByText("Sin rango")).toBeVisible();
    await expect(cad.getByText("2 sedes la esperan")).toBeVisible();
    /* El peso cubano es la referencia: no tiene fila. */
    await expect(tabla.getByRole("row").filter({ hasText: "Peso cubano" })).toHaveCount(0);
  });

  test("al cambiar un rango se ven, antes de guardar, las sedes que quedarían fuera", async ({ page }) => {
    await abrirAccion(page, "USD", "Cambiar el rango del USD");
    const dialogo = page.getByRole("dialog");
    await dialogo.locator("#rango-cmin").fill("300");
    await dialogo.locator("#rango-cmax").fill("310");
    await dialogo.locator("#rango-vmin").fill("310");
    await dialogo.locator("#rango-vmax").fill("320");
    /* Cambiar un rango que ya existe se explica. */
    await expect(dialogo.getByLabel(/^Motivo del cambio/)).toBeVisible();
    await expect(dialogo.getByText(/sedes tienen hoy una tasa fuera del nuevo rango/)).toBeVisible();
    await expect(dialogo.getByRole("cell", { name: "PuntoCash Vedado" })).toBeVisible();

    /* Una compra por encima de la venta no se deja guardar. */
    await dialogo.locator("#rango-cmax").fill("330");
    await expect(dialogo.getByText(/La compra no puede quedar por encima de la venta/)).toBeVisible();
    await expect(dialogo.getByRole("button", { name: "Guardar el rango" })).toBeDisabled();
    await dialogo.getByRole("button", { name: "Cancelar" }).click();
    await expect(page.getByRole("table").getByRole("row").filter({ hasText: "Dólar estadounidense" }).getByText("300 – 330")).toBeVisible();
  });

  test("definir y retirar el rango del yen", async ({ page }) => {
    await abrirAccion(page, "JPY", "Definir el rango del JPY");
    let dialogo = page.getByRole("dialog");
    await dialogo.locator("#rango-cmin").fill("2");
    await dialogo.locator("#rango-cmax").fill("3");
    await dialogo.locator("#rango-vmin").fill("2,2");
    await dialogo.locator("#rango-vmax").fill("3,2");
    /* El primer rango no pide motivo. */
    await expect(dialogo.getByLabel(/^Motivo del cambio/)).toHaveCount(0);
    await dialogo.getByRole("button", { name: "Definir el rango" }).click();
    await expect(page.getByText(/Rango del JPY definido/)).toBeVisible();

    await abrirAccion(page, "JPY", "Retirar el rango del JPY");
    dialogo = page.getByRole("dialog");
    await dialogo.getByRole("button", { name: "Retirar el rango" }).click();
    await expect(dialogo.getByText(/Escribe el motivo/)).toBeVisible();
    await dialogo.getByLabel(/^Motivo\*?$/).fill("Prueba automática: el yen vuelve a no cotizarse");
    await dialogo.getByRole("button", { name: "Retirar el rango" }).click();
    await expect(page.getByText(/Rango del JPY retirado/)).toBeVisible();
    await expect(page.getByRole("table").getByRole("row").filter({ hasText: "Yen japonés" }).getByText("Sin rango")).toBeVisible();
  });
});

/**
 * El catálogo (FR-SA-MON-1 a MON-6). Una sola prueba, con una moneda inventada
 * de código aleatorio: el dominio es del servidor y lo comparten las demás
 * suites, así que no se toca ninguna moneda real, y la prueba la deja
 * retirada, que es lo que no estorba a nadie (las retiradas no se ofrecen).
 */
test("añadir, retirar y reincorporar una moneda del catálogo, con su rastro en la auditoría", async ({ page }) => {
  await signInAsSuperAdmin(page);
  await page.goto("/super-admin/monedas-y-tasas");

  await page.getByRole("button", { name: "Añadir moneda" }).click();
  let dialogo = page.getByRole("dialog");
  await expect(dialogo.getByRole("button", { name: "Añadir la moneda" })).toBeDisabled();
  /* Elige de la lista una que ninguna otra suite use: del final del alfabeto. */
  const opciones = await dialogo.getByLabel(/^Moneda/).locator("option").evaluateAll((os) =>
    os.map((o) => ({ valor: (o as HTMLOptionElement).value, texto: o.textContent ?? "" })).filter((o) => o.valor !== ""),
  );
  const elegida = opciones[opciones.length - 1 - Math.floor(Math.random() * 10)]!;
  const codigo = elegida.valor;
  const nombre = elegida.texto.split(" · ")[1]!;
  await dialogo.getByLabel(/^Moneda/).selectOption(codigo);
  await expect(dialogo.getByText("4, fijos")).toBeVisible();
  await dialogo.getByRole("button", { name: "Añadir la moneda" }).click();
  await expect(page.getByText(`${codigo} añadida al catálogo`)).toBeVisible();

  const fila = page.getByRole("table").getByRole("row").filter({ hasText: nombre });
  await expect(fila.getByText("Sin rango")).toBeVisible();
  await expect(fila.getByText("En ninguna lista")).toBeVisible();

  /* Ya en el catálogo, no se vuelve a ofrecer. */
  await page.getByRole("button", { name: "Añadir moneda" }).click();
  await expect(page.getByRole("dialog").getByLabel(/^Moneda/).locator(`option[value="${codigo}"]`)).toHaveCount(0);
  await page.getByRole("dialog").getByRole("button", { name: "Cancelar" }).click();

  await abrirAccion(page, codigo, `Retirar el ${codigo} del catálogo`);
  dialogo = page.getByRole("dialog");
  await expect(dialogo.getByText("Ninguna sede la tiene en su lista")).toBeVisible();
  await dialogo.getByRole("button", { name: "Retirar la moneda" }).click();
  await expect(dialogo.getByText(/Escribe el motivo/)).toBeVisible();
  await dialogo.getByLabel(/^Motivo/).fill("Prueba automática: la moneda se retira del catálogo");
  await dialogo.getByRole("button", { name: "Retirar la moneda" }).click();
  await expect(page.getByText(`${codigo} retirada del catálogo`)).toBeVisible();
  await expect(fila.getByText("Retirada")).toBeVisible();

  /* Una retirada tampoco se ofrece: se reincorpora. */
  await page.getByRole("button", { name: "Añadir moneda" }).click();
  await expect(page.getByRole("dialog").getByLabel(/^Moneda/).locator(`option[value="${codigo}"]`)).toHaveCount(0);
  await page.getByRole("dialog").getByRole("button", { name: "Cancelar" }).click();

  await abrirAccion(page, codigo, `Reincorporar el ${codigo} al catálogo`);
  await page.getByRole("dialog").getByRole("button", { name: "Reincorporar la moneda" }).click();
  await expect(page.getByText(`${codigo} vuelve a estar en el catálogo`)).toBeVisible();
  await expect(fila.getByText("Retirada")).toHaveCount(0);

  /* Se deja retirada. */
  await abrirAccion(page, codigo, `Retirar el ${codigo} del catálogo`);
  await page.getByRole("dialog").getByLabel(/^Motivo/).fill("Prueba automática: se deja retirada al terminar");
  await page.getByRole("dialog").getByRole("button", { name: "Retirar la moneda" }).click();
  await expect(page.getByText(`${codigo} retirada del catálogo`)).toBeVisible();

  /* Cada cambio quedó en la auditoría, con quién y por qué. */
  await page.goto(`/super-admin/auditoria?texto=${codigo}`);
  await expect(page.locator("main :visible", { hasText: "Moneda retirada del catálogo" }).first()).toBeVisible();
  await expect(page.locator("main :visible", { hasText: "Moneda añadida al catálogo" }).first()).toBeVisible();
  await expect(page.locator("main :visible", { hasText: "Moneda reincorporada al catálogo" }).first()).toBeVisible();
});

test("tasas por sede: lo que publica cada una, de solo lectura", async ({ page }) => {
  await signInAsSuperAdmin(page);
  await page.goto("/super-admin/monedas-y-tasas?vista=sedes");
  await expect(page.getByText("PuntoCash Trinidad").first()).toBeVisible();
  await expect(page.getByText("Sin rango de PuntoCash: no se publica.").first()).toBeVisible();
  await expect(page.getByRole("main").getByRole("button", { name: /Cambiar|Definir|Retirar/ })).toHaveCount(0);
});

for (const ancho of [1280, 1024, 768, 390]) {
  test.describe(`a ${ancho}px`, () => {
    test.use({ viewport: { width: ancho, height: 900 } });

    test("las dos vistas no desbordan", async ({ page }) => {
      await signInAsSuperAdmin(page);
      await page.goto("/super-admin/monedas-y-tasas");
      await sinDesbordamientoHorizontal(page, "Monedas y rangos");
      await page.goto("/super-admin/monedas-y-tasas?vista=sedes");
      await sinDesbordamientoHorizontal(page, "Tasas por sede");
    });
  });
}
