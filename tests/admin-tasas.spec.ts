import { test, expect, type Browser } from "@playwright/test";

import { BASE_URL } from "./storage-state";
import { MARTA, REINALDO, signInAsAdmin } from "./admin-helpers";

/**
 * `/admin/tasas` — navegación y congruencia, y el **tablero**.
 *
 * ── Qué protege ───────────────────────────────────────────────────────────
 * Lo que distingue esta sección de las demás es que **lo que se guarda aquí se
 * ve en la sala de espera** (**A12**, **FR-AD-DOM-7**). Por eso la tercera
 * prueba cruza de consola: fija una tasa en `/admin` y la busca en el tablero
 * del kiosco de esa sede. Si algún día el tablero volviera a leer una tabla
 * fija, es la que cae.
 *
 * ── Lo que escribe, y por qué no estorba ──────────────────────────────────
 * La tercera prueba cambia la tasa de la **libra en Vedado**, y nada más en la
 * suite lee esas cifras. Las otras dos solo leen: la comparativa, el euro
 * ajustado por PuntoCash en Obispo y Matanzas sin Cambio de moneda.
 */

test.describe("Tasas", () => {
  test("Tasas es siempre la tabla; entrar en una sede no toca el filtro", async ({ page }) => {
    await signInAsAdmin(page, MARTA);
    await page.goto("/admin/tasas");
    const main = page.getByRole("main");

    /* **FR-AD-TASA-9**: sin controles de edición en la comparativa. */
    await expect(main.getByText("Las tasas se cambian sede por sede")).toBeVisible();
    await expect(main.getByRole("button", { name: /^(Cambiar|Retirar|Fijar)/ })).toHaveCount(0);

    /* Entrar en una sede es su propia ruta y **no** cambia el filtro de la
       cabecera. */
    await main.getByRole("link", { name: "PuntoCash Obispo", exact: true }).click();
    await page.waitForURL(/\/admin\/tasas\/sede-habana-vieja$/);
    await expect(page.getByRole("banner").getByLabel("Sede que estás viendo")).toHaveValue("todas");

    /* **FR-AD-TASA-12**: el euro de Obispo, ajustado por PuntoCash, destacado,
       con la opción de quedarse con la cifra tal como está. */
    await expect(main.getByText("PuntoCash cambió el rango del EUR y tu tasa se ajustó")).toBeVisible();
    await expect(main.getByRole("button", { name: "Mantener 365,00" })).toBeVisible();
    await expect(main.getByRole("button", { name: "Elegir otra" })).toBeVisible();
    /* **FR-AD-TASA-3**: el dólar canadiense, sin rango, dice a quién pedírselo. */
    await expect(
      main.getByText("PuntoCash todavía no ha definido un rango para CAD. Solicítaselo para poder cotizarla."),
    ).toBeVisible();

    /* Volver a Tasas desde el menú devuelve la tabla con todas las sedes. */
    await page
      .getByRole("navigation", { name: "Navegación principal" })
      .getByRole("link", { name: "Tasas", exact: true })
      .click();
    await page.waitForURL(/\/admin\/tasas$/);
    await expect(main.getByText("Las tasas se cambian sede por sede")).toBeVisible();

  });

  test("una sede sin Cambio de moneda aparece, con la razón y sin controles", async ({ page }) => {
    await signInAsAdmin(page, REINALDO);
    await page.goto("/admin/tasas");
    await page.getByRole("main").getByRole("link", { name: "PuntoCash Matanzas", exact: true }).click();
    await page.waitForURL(/\/admin\/tasas\/sede-matanzas$/);

    const main = page.getByRole("main");
    await expect(
      main.getByText("PuntoCash no ha habilitado el Cambio de moneda en esta sede"),
    ).toBeVisible();
    await expect(main.getByRole("button", { name: /^(Cambiar|Retirar|Fijar)/ })).toHaveCount(0);
  });

  test("lo que se fija aquí es lo que muestra el tablero del kiosco de esa sede", async ({
    page,
    browser,
  }) => {
    await signInAsAdmin(page, MARTA);
    await page.goto("/admin/tasas");
    await page.goto("/admin/tasas/sede-vedado");

    /* Cifras distintas en cada corrida, dentro del rango de la libra
       (compra 380–410, venta 390–420), para no encontrar la de la anterior. */
    const compra = 380 + (Date.now() % 20);
    const venta = compra + 10;

    await page.getByRole("button", { name: "Cambiar la tasa de GBP" }).click();
    const dialogo = page.getByRole("dialog");
    await dialogo.getByLabel(/^Compra/).fill(String(compra));
    await dialogo.getByLabel(/^Venta/).fill(String(venta));
    await dialogo.getByRole("button", { name: "Revisar el cambio" }).click();
    /* **FR-AD-TASA-10**: el resumen va antes de guardar. */
    await expect(dialogo.getByText("Ninguna operación ya registrada cambia.", { exact: false })).toBeVisible();
    await dialogo.getByRole("button", { name: "Confirmar la tasa" }).click();
    await expect(dialogo.getByText("Tasa guardada")).toBeVisible();

    const kiosco = await kioscoDe(browser, "sede-vedado");
    await kiosco.goto("/kiosk/autoservicio/tasas");
    const fila = kiosco.locator("div.grid").filter({ hasText: "Libra esterlina" });
    /* Plazo largo: con el servidor recién arrancado, esta es a menudo la
       primera visita a una ruta de `/kiosk` en la corrida, y la compila. */
    await expect(fila).toContainText(String(compra), { timeout: 30_000 });
    await expect(fila).toContainText(String(venta));
    await kiosco.context().close();

  });
});

/** Un kiosco vinculado a la sede, como lo siembra `kiosk-smoke.spec.ts`. */
async function kioscoDe(browser: Browser, branchId: string) {
  const vinculo = {
    status: "linked",
    deviceId: "KIO-9000-0002",
    branchId,
    linkedAt: "2026-09-01T08:00:00.000Z",
    linkMethod: "codigo",
  };
  const context = await browser.newContext({
    baseURL: BASE_URL,
    storageState: {
      cookies: [
        {
          name: "pc_kiosk_device",
          value: encodeURIComponent(JSON.stringify({ deviceId: vinculo.deviceId, branchId })),
          domain: "localhost",
          path: "/",
          expires: -1,
          httpOnly: false,
          secure: false,
          sameSite: "Lax",
        },
      ],
      origins: [
        {
          origin: BASE_URL,
          localStorage: [{ name: "puntocash.kiosk.device", value: JSON.stringify(vinculo) }],
        },
      ],
    },
  });
  return context.newPage();
}
