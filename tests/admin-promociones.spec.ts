import { test, expect } from "@playwright/test";

import { MARTA, signInAsAdmin } from "./admin-helpers";
import { BASE_URL } from "./storage-state";

/**
 * `/admin/promociones` — navegación y congruencia, y la pantalla de la sala.
 *
 * La segunda prueba cruza de consola: publica una promoción en Cerro y la busca
 * en la pantalla informativa de Cerro, que es la razón de esta sección. Cerro
 * no tiene tasas, así que su carrusel empieza por la información de la
 * sucursal y sigue con una diapositiva por promoción. Al terminar la retira,
 * para no dejar nada en pantalla para el resto de la corrida.
 */

test.describe("Promociones", () => {
  test("tres pestañas por estado, y las de PuntoCash no se tocan", async ({ page }) => {
    await signInAsAdmin(page, MARTA);
    await page.goto("/admin/promociones");
    const main = page.getByRole("main");

    await expect(main.getByRole("link", { name: "Envía un giro a cualquier provincia" })).toBeVisible();
    await expect(main.getByRole("link", { name: "Cobra tu remesa sin filas" })).toBeVisible();

    await main.getByRole("link", { name: /^Programadas/ }).click();
    await expect(main.getByRole("link", { name: "Este sábado abrimos hasta las 8" })).toBeVisible();

    await main.getByRole("link", { name: /^Vencidas/ }).click();
    await expect(main.getByRole("link", { name: "Remesas de verano" })).toBeVisible();

    /* **FR-AD-PROM-3**: la de red se lee y dice por qué no se toca. */
    await page.goto("/admin/promociones/promo-red-giros");
    await expect(main.getByText("Esta promoción la publica PuntoCash")).toBeVisible();
    await expect(main.locator("input, textarea")).toHaveCount(0);
    await expect(main.getByRole("button", { name: "Retirar" })).toHaveCount(0);

    /* Una de otra empresa no existe para esta (**FR-AD-NAV-3**). */
    const respuesta = await page.goto("/admin/promociones/promo-caribe-miramar");
    expect(respuesta?.status()).toBe(404);
  });

  test("lo que se publica sale en la pantalla de la sucursal", async ({ page, browser }) => {
    test.setTimeout(90_000);
    await signInAsAdmin(page, MARTA);
    await page.goto("/admin/promociones/nueva");
    const main = page.getByRole("main");

    const titulo = `Prueba ${Date.now() % 100000}`;
    /* **FR-AD-PROM-7**: el largo tiene tope, no aviso. */
    await expect(main.getByLabel(/^Título/)).toHaveAttribute("maxlength", "40");
    await main.getByLabel(/^Título/).fill(titulo);
    await main.getByLabel(/^Texto/).fill("Solo para comprobar que llega a la sala.");
    await main.getByLabel("PuntoCash Cerro").check();
    /* **FR-AD-PROM-12**: la imagen es opcional y se ve en la vista previa. */
    await page.locator("#promo-imagen").setInputFiles("tests/fixtures/promocion.jpg");
    await expect(main.getByRole("img", { name: "Imagen de la promoción" })).toBeVisible();
    const hoy = await main.getByLabel(/^Desde/).inputValue();
    await main.getByLabel(/^Hasta/).fill(hoy);
    /* La de red ya está en Cerro: esta coincidiría con ella (**FR-AD-PROM-8**). */
    await expect(main.getByText(/^PuntoCash Cerro: coincidiría con/)).toBeVisible();
    await main.getByRole("button", { name: "Publicar promoción" }).click();

    await expect(main.getByText("Ya está en la pantalla informativa de sus sedes.")).toBeVisible();
    await expect(main.getByRole("link", { name: titulo })).toBeVisible();

    const pantalla = await browser.newContext({
      baseURL: BASE_URL,
      storageState: {
        cookies: [],
        origins: [{ origin: BASE_URL, localStorage: [{ name: "puntocash.kiosk.pantalla.sede", value: "sede-cerro" }] }],
      },
    });
    const tv = await pantalla.newPage();
    await tv.goto("/kiosk/pantalla");
    await expect(tv.getByText("Solo para comprobar que llega a la sala.")).toBeVisible({ timeout: 45_000 });
    const enSala = tv.locator('img[src*="/kiosk/pantalla/promociones/promo-op-"]');
    await expect
      .poll(() => enSala.evaluate((img) => (img as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0);
    await pantalla.close();

    /* La imagen guardada se carga de verdad, no solo la vista previa local. */
    await main.getByRole("link", { name: titulo }).click();
    const guardada = main.getByRole("img", { name: "Imagen de la promoción" });
    await expect
      .poll(() => guardada.evaluate((img) => (img as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0);

    /* **FR-AD-PROM-9**: retirar no borra; pasa a Vencidas. */
    await main.getByRole("button", { name: "Retirar" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Retirar la promoción" }).click();
    await expect(main.getByText("Promoción retirada")).toBeVisible();
    await expect(main.getByRole("link", { name: titulo })).toBeVisible();
  });
});
