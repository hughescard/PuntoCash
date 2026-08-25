import { test, expect, type Page } from "@playwright/test";

/**
 * Worker Nueva operación — the service selector.
 *
 * The catalog in `src/features/operations/services.ts` is the single source of
 * truth, so the counts below are asserted against the rendered screen rather
 * than re-listed here. The route test is data-driven off the rendered cards for
 * the same reason: adding a service to the catalog extends the coverage without
 * touching this file.
 */

const SERVICE_CARDS = "main ul li a";

/** Slug + name of every card the screen currently renders. */
async function renderedServices(page: Page) {
  return page.$$eval(SERVICE_CARDS, (links) =>
    links.map((a) => ({
      href: a.getAttribute("href") ?? "",
      name: a.querySelector("span > span")?.textContent?.trim() ?? "",
    })),
  );
}

/** Names of the service cards currently visible, in DOM order. */
async function visibleServiceNames(page: Page) {
  return page.$$eval(
    SERVICE_CARDS,
    (links) => links.map((a) => a.querySelector("span > span")?.textContent?.trim() ?? ""),
  );
}

test.describe("nueva operación", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/worker/nueva-operacion");
  });

  test("renders inside the shell and marks Nueva operación active", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Nueva operación", level: 1 })).toBeVisible();
    await expect(page.getByText("Selecciona el servicio que deseas realizar.")).toBeVisible();

    const nav = page.getByRole("navigation", { name: "Navegación principal" });
    await expect(nav.getByRole("link", { name: "Nueva operación" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    // Still the authenticated Worker shell.
    await expect(page.getByRole("banner").getByText("Caja 03")).toBeVisible();
  });

  test("offers exactly 13 services, including Cambio de moneda and Remesas", async ({ page }) => {
    await expect(page.locator(SERVICE_CARDS)).toHaveCount(13);

    // The two approved Worker flows are ready to run.
    const available = page.getByText("Disponible", { exact: true });
    await expect(available).toHaveCount(2);

    const cambio = page.locator(SERVICE_CARDS).filter({ hasText: "Cambio de moneda" });
    await expect(cambio).toHaveCount(1);
    await expect(cambio).toContainText("Disponible");
    const remesas = page.locator(SERVICE_CARDS).filter({ hasText: "Remesas" });
    await expect(remesas).toContainText("Disponible");

    await expect(page.getByText("En construcción", { exact: true })).toHaveCount(11);
  });

  test("groups services under the four operational categories", async ({ page }) => {
    for (const category of [
      "Cambio y efectivo",
      "Transferencias",
      "Pagos y productos",
      "Empresas",
    ]) {
      await expect(page.getByRole("heading", { name: category, level: 2 })).toBeVisible();
    }
  });
});

test.describe("nueva operación search", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/worker/nueva-operacion");
  });

  test("narrows to a single service and drops unrelated ones", async ({ page }) => {
    await page.getByLabel("Buscar servicio").fill("remesa");

    await expect(page.locator(SERVICE_CARDS)).toHaveCount(1);
    expect(await visibleServiceNames(page)).toEqual(["Remesas"]);

    // Categories with no matches are removed entirely (§8).
    await expect(page.getByRole("heading", { name: "Transferencias", level: 2 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Empresas", level: 2 })).toHaveCount(0);
  });

  test("matches name, description and category, ignoring case and accents", async ({ page }) => {
    const box = page.getByLabel("Buscar servicio");

    // Matches the name and descriptions that mention Tarjeta Antilla.
    await box.fill("tarjeta");
    expect(await visibleServiceNames(page)).toContain("Tarjeta Antilla");
    expect(await visibleServiceNames(page)).toContain("Extracción Tarjeta Antilla");

    // Accent-insensitive in both directions.
    await box.fill("importacion");
    expect(await visibleServiceNames(page)).toEqual(["Pago de importaciones"]);
    await box.fill("importación");
    expect(await visibleServiceNames(page)).toEqual(["Pago de importaciones"]);

    // Case-insensitive, and the category label is searchable.
    await box.fill("EMPRESAS");
    expect(await visibleServiceNames(page)).toEqual([
      "Depósitos de Pymes",
      "Pago de importaciones",
    ]);
  });

  test("shows an empty state that restores the catalog", async ({ page }) => {
    await page.getByLabel("Buscar servicio").fill("zzzz");

    await expect(page.locator(SERVICE_CARDS)).toHaveCount(0);
    await expect(page.getByText("No encontramos servicios")).toBeVisible();
    await expect(page.getByText("Prueba con otro término de búsqueda.")).toBeVisible();

    await page.getByRole("button", { name: "Mostrar todos los servicios" }).click();
    await expect(page.locator(SERVICE_CARDS)).toHaveCount(13);
  });

  test("the field's own clear control restores the catalog", async ({ page }) => {
    const box = page.getByLabel("Buscar servicio");
    await box.fill("remesa");
    await expect(page.locator(SERVICE_CARDS)).toHaveCount(1);

    await page.getByRole("button", { name: "Limpiar búsqueda" }).click();
    await expect(page.locator(SERVICE_CARDS)).toHaveCount(13);
    await expect(box).toHaveValue("");
  });
});

test.describe("nueva operación routing", () => {
  test("every service card resolves inside the shell", async ({ page }) => {
    await page.goto("/worker/nueva-operacion");
    const services = await renderedServices(page);
    expect(services).toHaveLength(13);

    for (const service of services) {
      const response = await page.goto(service.href);
      expect(response?.status(), `${service.name} -> ${service.href}`).toBe(200);

      // The shell survives, and the flow is either real or an honest placeholder.
      await expect(page.getByRole("banner").getByText("Caja 03")).toBeVisible();
      await expect(
        page.getByRole("navigation", { name: "Navegación principal" }),
      ).toBeVisible();
      // Remesas requires an open Jornada, so a direct fresh-route visit
      // correctly renders the shared operational block rather than its form.
      await expect(
        service.name === "Remesas"
          ? page.getByRole("heading", { name: "Caja cerrada", level: 1 })
          : page.getByRole("heading", { name: service.name, level: 1 }),
      ).toBeVisible();
    }
  });

  test("Cambio de moneda is reachable by clicking its card", async ({ page }) => {
    await page.goto("/worker/nueva-operacion");
    await page.locator(SERVICE_CARDS).filter({ hasText: "Cambio de moneda" }).click();

    await expect(page).toHaveURL(/\/worker\/nueva-operacion\/cambio-moneda$/);
    // Placeholder until the real flow lands; it must offer a way back.
    await page.getByRole("link", { name: /Volver a Nueva operación/ }).click();
    await expect(page).toHaveURL(/\/worker\/nueva-operacion$/);
  });

  test("an unknown service slug is a 404", async ({ page }) => {
    const response = await page.goto("/worker/nueva-operacion/servicio-inexistente");
    expect(response?.status()).toBe(404);
  });
});

test.describe("nueva operación entry points", () => {
  for (const linkName of ["Nueva operación", "Ver todos los servicios"]) {
    test(`home "${linkName}" reaches the selector`, async ({ page }) => {
      await page.goto("/worker/inicio");
      await page.getByRole("main").getByRole("link", { name: linkName, exact: true }).click();

      await expect(page).toHaveURL(/\/worker\/nueva-operacion$/);
      await expect(page.getByRole("heading", { name: "Nueva operación", level: 1 })).toBeVisible();
    });
  }
});

test.describe("nueva operación layout", () => {
  for (const width of [1440, 1280]) {
    test(`fits without horizontal scroll at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/worker/nueva-operacion");

      const layout = await page.evaluate(() => {
        const main = document.querySelector("main")!;
        return {
          horizontalOverflow:
            document.documentElement.scrollWidth > document.documentElement.clientWidth,
          // The shell keeps main as the only vertical scroller.
          documentScrolls: document.documentElement.scrollHeight > window.innerHeight,
          mainScrolls: main.scrollHeight > main.clientHeight,
        };
      });

      expect(layout.horizontalOverflow).toBe(false);
      expect(layout.documentScrolls).toBe(false);
      expect(layout.mainScrolls).toBe(true);
    });
  }
});
