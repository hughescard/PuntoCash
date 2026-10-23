import { test, expect } from "@playwright/test";

import { MARTA, REINALDO, signInAsAdmin } from "./admin-helpers";

/**
 * `/admin/monedas` — la prueba de navegación y congruencia.
 *
 * ── Qué protege ───────────────────────────────────────────────────────────
 * Las dos decisiones del 15/10/2026 que distinguen esta sección. Que **una sede
 * sin Cambio de moneda tiene su lista y puede cambiarla** —Matanzas, de
 * Caribe—. Y que **retirar se decide antes de confirmar**: con saldo en alguna
 * caja el diálogo lo dice nombrándola y no ofrece retirar.
 *
 * ── Por qué no se escribe nada ────────────────────────────────────────────
 * El dominio es del servidor y lo comparten las trabajadoras de Playwright.
 * Se abren los diálogos y se cierran; añadir y retirar de verdad se ejercitan
 * en `network-domain.spec.ts`, sin navegador.
 */

test.describe("Monedas de sede", () => {
  test("con saldo en una caja, retirar se explica en lugar de ofrecerse", async ({ page }) => {
    await signInAsAdmin(page, MARTA);
    await page.goto("/admin/monedas");
    await expect(page.getByRole("heading", { name: "Monedas", level: 1 })).toBeVisible();

    /* Las tres sedes de Malecón, cada una con su bloque. */
    for (const sede of ["PuntoCash Vedado", "PuntoCash Obispo", "PuntoCash Cerro"]) {
      await expect(page.getByRole("heading", { name: sede, level: 2 })).toBeVisible();
    }

    await page.getByRole("button", { name: "Retirar GBP de PuntoCash Vedado" }).click();
    const dialogo = page.getByRole("dialog");
    await expect(
      dialogo.getByText("GBP tiene saldo en Caja 03. Debe quedar en cero antes de retirarla de la lista."),
    ).toBeVisible();
    await expect(dialogo.getByRole("button", { name: "Retirar GBP" })).toHaveCount(0);
    await dialogo.getByRole("button", { name: "Entendido" }).click();

    /* FR-AD-MON-4: la confusión más probable, dicha al añadir. */
    await page.getByRole("button", { name: "Añadir moneda a PuntoCash Vedado" }).click();
    await expect(
      page.getByRole("dialog").getByText("Añadir una moneda aquí no la activa en ninguna caja."),
    ).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Cancelar" }).click();
  });

  test("una sede sin Cambio de moneda tiene su lista y puede cambiarla", async ({ page }) => {
    await signInAsAdmin(page, REINALDO);
    await page.goto("/admin/monedas");

    await expect(page.getByRole("heading", { name: "PuntoCash Matanzas", level: 2 })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Añadir moneda a PuntoCash Matanzas" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Retirar USD de PuntoCash Matanzas" }).first(),
    ).toBeAttached();
  });
});
