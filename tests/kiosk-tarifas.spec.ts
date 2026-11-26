import { test, expect, type Browser } from "@playwright/test";

import { BASE_URL } from "./storage-state";
import { tarifasPublicas } from "../src/features/network/tarifas";

/**
 * Las tarifas de giro que se le enseñan al cliente (decisión del 24/11/2026):
 * en el kiosco («Consultar tarifas», pareja de «Consultar tasas») y en la
 * pantalla informativa de la sede. Las dos leen `tarifasPublicas`.
 */

/** El código de vinculación del kiosco de la entrada de Vedado (`KI-1A0E4B01`). */
const KIOSCO_DE_VEDADO = "4B1A01";

test("tarifasPublicas: las monedas de la sede con política, y nada para una sede que no existe", () => {
  const vedado = tarifasPublicas("sede-vedado");
  expect(vedado.map((t) => t.moneda)).toEqual(expect.arrayContaining(["CUP", "USD", "EUR"]));
  expect(vedado.every((t) => t.tramos.length > 0 && t.minimo > 0)).toBe(true);
  expect(tarifasPublicas("sede-que-no-existe")).toEqual([]);
});

test("el kiosco enseña las tarifas de su sede y no lleva a ninguna operación", async ({ browser }) => {
  const kiosco = await kioscoDe(browser, KIOSCO_DE_VEDADO);
  await kiosco.goto("/kiosk/autoservicio");
  const mosaico = kiosco.getByRole("link", { name: /Consultar tarifas/ });
  await expect(mosaico).toBeVisible({ timeout: 30_000 });
  await mosaico.click();

  await expect(kiosco.getByRole("heading", { level: 1, name: "Tarifas de los servicios" })).toBeVisible({ timeout: 30_000 });
  await expect(kiosco.getByRole("heading", { level: 2, name: "Enviar un giro" })).toBeVisible();
  const usd = kiosco.getByRole("listitem", { name: "Tarifa de giros en USD" });
  await expect(usd).toBeVisible();
  await expect(usd).toContainText("Giro mínimo");
  await expect(usd).toContainText("3,00 USD");
  await expect(usd).toContainText("1,00 USD + 2 %");
  /* Consulta pura: ni un botón ni un enlace de servicio dentro del contenido. */
  await expect(kiosco.getByRole("main").getByRole("link")).toHaveCount(0);
  await kiosco.context().close();
});

test("la pantalla informativa rota hasta las tarifas de giros de su sede", async ({ browser }) => {
  const context = await browser.newContext({ baseURL: BASE_URL, viewport: { width: 1920, height: 1080 } });
  await context.addInitScript(() => localStorage.setItem("puntocash.kiosk.pantalla.sede", "sede-vedado"));
  const pantalla = await context.newPage();
  await pantalla.goto("/kiosk/pantalla");
  /* Cada diapositiva dura 12 s: las tasas van primero y las tarifas, justo después. */
  const seccion = pantalla.getByRole("region", { name: "Tarifa de giros en USD" });
  await expect(seccion).toBeVisible({ timeout: 30_000 });
  await expect(seccion).toContainText("3,00 USD");
  await context.close();
});

/** Un navegador que es ese kiosco: solo guarda su identificador. */
async function kioscoDe(browser: Browser, terminalId: string) {
  const context = await browser.newContext({
    baseURL: BASE_URL,
    storageState: {
      cookies: [
        {
          name: "pc_kiosco_device",
          value: terminalId,
          domain: "localhost",
          path: "/kiosk/autoservicio",
          expires: -1,
          httpOnly: true,
          secure: false,
          sameSite: "Lax",
        },
      ],
      origins: [],
    },
  });
  return context.newPage();
}
