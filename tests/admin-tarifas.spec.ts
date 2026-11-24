import { expect, test } from "@playwright/test";

import { MARTA, signInAsAdmin, sinDesbordamientoHorizontal } from "./admin-helpers";
import { signInAsSuperAdmin } from "./super-admin-helpers";

/**
 * Tarifas en Admin de sede (decisión del 24/11/2026): la pantalla de Super
 * administración, de solo lectura, con las monedas en que las sedes del
 * administrador envían giros.
 *
 * Marta (Malecón) tiene Vedado, Obispo y Cerro. Con tarifa sembrada: peso,
 * dólar y euro. Sin tarifa: libra, franco suizo y peso mexicano (Vedado) y
 * dólar canadiense (Obispo).
 *
 * El aviso se prueba con el **peso mexicano**, que solo maneja Vedado y en el
 * que ninguna otra prueba envía giros: PuntoCash define su tarifa y la
 * retira, y Marta da por visto cada aviso, así que todo queda como estaba.
 */

test("Tarifas está en el menú, junto a Tasas, y es de solo lectura", async ({ page }) => {
  await signInAsAdmin(page, MARTA);
  await page.getByRole("navigation", { name: "Navegación principal" }).getByRole("link", { name: "Tarifas" }).click();
  await page.waitForURL(/\/admin\/tarifas$/);

  const lista = page.getByRole("main").getByRole("listitem");
  await expect(lista.filter({ hasText: "Cambio de moneda" }).getByText("El precio para el cliente es la tasa.")).toBeVisible();
  const giros = lista.filter({ hasText: "Giros" });
  await expect(giros.getByText("Por tramos de importe · en 3 monedas de tus sedes. La paga el remitente.")).toBeVisible();
  await giros.getByRole("link", { name: "Ver tarifas de giros" }).click();
  await page.waitForURL(/\/admin\/tarifas\/giros$/);

  const usd = page.getByRole("table", { name: "Tramos de la tarifa de giros en USD" });
  await expect(usd.getByRole("row")).toHaveCount(4);
  await expect(usd.getByRole("row").nth(2)).toContainText("Más de 100,00 hasta 500,00");
  await expect(page.getByText("En vigor desde").first()).toBeVisible();

  /* Nada se cambia desde aquí. */
  await expect(page.getByRole("main").getByRole("link", { name: /Cambiar|Definir/ })).toHaveCount(0);
  await expect(page.getByRole("main").getByRole("button", { name: /Retirar/ })).toHaveCount(0);

  /* Las monedas de sus sedes sin tarifa, con dónde se manejan; las de otras sedes de la red, no. */
  const sin = page.getByRole("main").locator("section").filter({ has: page.getByRole("heading", { name: "Sin tarifa" }) });
  await expect(sin.getByRole("listitem").filter({ hasText: "CAD" })).toContainText("PuntoCash Obispo");
  await expect(sin.getByRole("listitem").filter({ hasText: "JPY" })).toHaveCount(0);
});

test("PuntoCash define y retira una tarifa: Marta lo ve en Inicio y en Tarifas hasta que pulsa «Entendido»", async ({
  browser,
}) => {
  const sa = await (await browser.newContext()).newPage();
  const admin = await (await browser.newContext()).newPage();
  await signInAsSuperAdmin(sa);
  await signInAsAdmin(admin, MARTA);

  /* PuntoCash define la tarifa del peso mexicano. */
  await sa.goto("/super-admin/tarifas/giros/MXN");
  await sa.getByLabel(/^Giro mínimo/).fill("100");
  const tramo1 = sa.getByRole("listitem", { name: "Tramo 1", exact: true });
  await tramo1.getByLabel(/^Fijo/).fill("20");
  await tramo1.getByLabel(/^Porcentaje/).fill("0");
  await sa.getByRole("button", { name: "Definir la tarifa" }).click();
  await sa.waitForURL(/\/super-admin\/tarifas\/giros\?guardada=MXN/);

  try {
    await admin.goto("/admin/inicio");
    const atencion = admin.getByRole("main").getByRole("listitem").filter({ hasText: "PuntoCash definió la tarifa de giros en MXN" });
    await expect(atencion).toContainText("PuntoCash Vedado ya puede enviar giros en MXN.");
    await atencion.getByRole("link", { name: "Ver las tarifas" }).click();
    await admin.waitForURL(/\/admin\/tarifas\/giros$/);
    await expect(admin.getByRole("table", { name: "Tramos de la tarifa de giros en MXN" })).toBeVisible();

    await admin.getByRole("button", { name: "Entendido: PuntoCash definió la tarifa de giros en MXN" }).click();
    await expect(admin.getByText("PuntoCash definió la tarifa de giros en MXN")).toBeHidden();
    await admin.goto("/admin/inicio");
    await expect(admin.getByText("PuntoCash definió la tarifa de giros en MXN")).toBeHidden();
  } finally {
    /* PuntoCash la retira: Vedado deja de poder enviar giros en pesos mexicanos, y también se le avisa. */
    await sa.goto("/super-admin/tarifas/giros");
    await sa.getByRole("button", { name: "Retirar la tarifa de giros en MXN" }).click();
    const dialogo = sa.getByRole("dialog");
    await dialogo.getByLabel(/^Motivo/).fill("Prueba automática de avisos de tarifa");
    await dialogo.getByRole("button", { name: "Retirar la tarifa" }).click();
    await expect(sa.getByRole("link", { name: "Definir la tarifa de giros en MXN" })).toBeVisible();
  }

  await admin.goto("/admin/tarifas");
  await expect(admin.getByText("PuntoCash Vedado ya no puede enviar giros en MXN", { exact: false })).toBeVisible();
  await admin.getByRole("button", { name: "Entendido: PuntoCash retiró la tarifa de giros en MXN" }).click();
  await expect(admin.getByText("PuntoCash retiró la tarifa de giros en MXN")).toBeHidden();
});

test.describe("en el teléfono", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("Tarifas y Tarifas de giros caben sin desplazamiento horizontal", async ({ page }) => {
    await signInAsAdmin(page, MARTA);
    for (const ruta of ["/admin/tarifas", "/admin/tarifas/giros"]) {
      await page.goto(ruta);
      await expect(page.getByRole("main")).toBeVisible();
      await sinDesbordamientoHorizontal(page, ruta);
    }
  });
});
