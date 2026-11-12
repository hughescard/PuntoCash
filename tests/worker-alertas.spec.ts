import { test, expect } from "./worker-fixture";
import { WORKER_BASE_URL } from "./storage-state";
import { type APIRequestContext } from "@playwright/test";

/**
 * Las alertas de la caja vistas por el trabajador: dicen qué pasa y a quién
 * avisar, **sin una sola cifra**, y se van solas cuando la condición deja de
 * cumplirse.
 */
test.use({ conCambio: true, fondos: { CUP: 500_000, USD: 520 }, monedas: ["CUP", "USD"] });

async function fijar(request: APIRequestContext, sede: string, reglas: unknown) {
  const r = await request.get(`${WORKER_BASE_URL}/pruebas/alertas?sede=${sede}&reglas=${encodeURIComponent(JSON.stringify(reglas))}`);
  expect(await r.text()).toContain("&quot;ok&quot;:true");
}

test("el trabajador ve el aviso sin cifras y se apaga cuando la regla ya no se cumple", async ({ page, request, puesto }) => {
  await page.goto("/worker/caja");
  await expect(page.getByRole("list", { name: "Alertas de la caja" })).toHaveCount(0);

  await fijar(request, puesto.sedeId, [
    { currency: "USD", minimo: 600, maximo: null, billetesMinimos: {} },
    { currency: "CUP", minimo: null, maximo: 400_000, billetesMinimos: {} },
  ]);
  await page.goto("/worker/caja");
  const lista = page.getByRole("list", { name: "Alertas de la caja" });
  await expect(lista).toBeVisible();
  await expect(lista).toContainText("Efectivo bajo en USD");
  await expect(lista).toContainText("Efectivo alto en CUP");
  /* Ni los límites ni lo que hay: ninguna cifra. */
  await expect(lista).not.toContainText(/\d/);
  await expect(page.getByText("Avisa a tu supervisor")).toBeVisible();

  await fijar(request, puesto.sedeId, []);
  await page.goto("/worker/caja");
  await expect(page.getByRole("list", { name: "Alertas de la caja" })).toHaveCount(0);
});

test("el aviso también está en Inicio", async ({ page, request, puesto }) => {
  await fijar(request, puesto.sedeId, [{ currency: "USD", minimo: null, maximo: null, billetesMinimos: { "10000": 1000 } }]);
  await page.goto("/worker/inicio");
  await expect(page.getByRole("list", { name: "Alertas de la caja" })).toContainText("Quedan pocos billetes de 100 USD");
});
