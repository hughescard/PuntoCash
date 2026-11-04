import ExcelJS from "exceljs";
import { expect, test } from "@playwright/test";

import { sinDesbordamientoHorizontal } from "./admin-helpers";
import { signInAsSuperAdmin } from "./super-admin-helpers";

/**
 * Reportes de la red: los cinco cortes, el periodo, la vista por sede
 * administrada y la exportación a Excel y PDF. El cálculo se prueba aparte
 * (`reportes-red-domain.spec.ts`); aquí, lo que se ve y lo que se descarga.
 */

const PERIODO = "desde=2026-10-15&hasta=2026-10-18";

test.describe("Reportes de la red", () => {
  test.beforeEach(async ({ page }) => {
    await signInAsSuperAdmin(page);
  });

  test("los cinco cortes cambian la tabla y conservan el periodo", async ({ page }) => {
    /* Con el periodo por defecto: lo sembrado son las últimas semanas, y un
       periodo fijo podría quedar sin operaciones y sin tablas. */
    await page.goto("/super-admin/reportes");
    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { name: "Total del periodo" })).toBeVisible();
    await expect(main.getByRole("columnheader", { name: /^Operador/ })).toBeVisible();
    const periodo = (await main.getByRole("link", { name: "Exportar a Excel" }).getAttribute("href"))!.split("?")[1]!;
    expect(periodo).toMatch(/^desde=\d{4}-\d{2}-\d{2}&hasta=/);

    for (const [enlace, columna, corte] of [
      ["Por sede", /^Sede/, "sede"],
      ["Por servicio", /^Servicio/, "servicio"],
      ["Por provincia", /^Provincia/, "provincia"],
      ["Por día", /^Día/, "dia"],
    ] as const) {
      await main.getByRole("link", { name: enlace, exact: true }).click();
      await page.waitForURL(new RegExp(`corte=${corte}`));
      expect(page.url()).toContain(periodo);
      await expect(main.getByRole("columnheader", { name: columna })).toBeVisible();
    }
  });

  test("el corte por operador se ve en total o por sede administrada", async ({ page }) => {
    await page.goto("/super-admin/reportes");
    const main = page.getByRole("main");
    await main.getByRole("link", { name: "Por sede administrada" }).click();
    await page.waitForURL(/por=sede/);
    await expect(main.getByRole("columnheader", { name: /^Sedes/ })).toBeVisible();
    await main.getByRole("link", { name: "Total del mercante" }).click();
    await page.waitForURL((u) => !u.search.includes("por=sede"));

    /* El interruptor es solo del corte por operador. */
    await page.goto(`/super-admin/reportes?corte=sede`);
    await expect(main.getByRole("link", { name: "Por sede administrada" })).toHaveCount(0);
  });

  test("los rangos rápidos y el formulario cambian el periodo", async ({ page }) => {
    await page.goto("/super-admin/reportes");
    const main = page.getByRole("main");
    await main.getByRole("link", { name: "Últimos 7 días" }).click();
    await page.waitForURL(/desde=\d{4}-\d{2}-\d{2}&hasta=/);
    await expect(main.getByRole("link", { name: "Exportar a Excel" })).toHaveAttribute(
      "href",
      /\/super-admin\/reportes\/exportar\/xlsx\?desde=\d{4}-\d{2}-\d{2}&hasta=\d{4}-\d{2}-\d{2}/,
    );
  });

  test("se exporta a Excel y a PDF con todos los cortes de la red", async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto(`/super-admin/reportes?${PERIODO}`);
    const main = page.getByRole("main");
    await expect(main.getByRole("link", { name: "Exportar a Excel" })).toHaveAttribute(
      "href",
      `/super-admin/reportes/exportar/xlsx?${PERIODO}`,
    );

    for (const [nombre, extension, firma] of [
      ["Exportar a Excel", "xlsx", "PK"],
      ["Exportar a PDF", "pdf", "%PDF"],
    ] as const) {
      const [descarga] = await Promise.all([page.waitForEvent("download"), main.getByRole("link", { name: nombre }).click()]);
      expect(descarga.suggestedFilename()).toBe(`puntocash-red-resumen-de-operaciones_2026-10-15_2026-10-18.${extension}`);
      const { readFile } = await import("node:fs/promises");
      const bytes = await readFile((await descarga.path())!);
      expect(bytes.subarray(0, firma.length).toString("latin1")).toBe(firma);

      if (extension === "xlsx") {
        const libro = new ExcelJS.Workbook();
        await libro.xlsx.load(bytes as unknown as ArrayBuffer);
        const hojas = libro.worksheets.map((h) => h.name);
        for (const h of ["Resumen", "Por operador", "Por operador (por sede)", "Por sede", "Por servicio", "Por provincia", "Por día"]) {
          expect(hojas, `hoja ${h}`).toContain(h);
        }
        expect(hojas.every((h) => h.length <= 31)).toBe(true);
        /* El corte por operador lleva la columna Sedes y la fila de total no la suma. */
        const hoja = libro.getWorksheet("Por operador")!;
        const texto: string[] = [];
        hoja.eachRow((fila) => texto.push(fila.values!.toString()));
        expect(texto.join("\n")).toContain("Sedes");
      }
    }
  });

  test("sin sesión, exportar lleva al acceso; un formato desconocido es 404", async ({ request, page }) => {
    const sin = await request.get("/super-admin/reportes/exportar/pdf", { maxRedirects: 0 });
    expect([302, 303, 307]).toContain(sin.status());
    expect(sin.headers()["location"] ?? "").toContain("/super-admin/login");

    const otro = await page.request.get("/super-admin/reportes/exportar/docx", { maxRedirects: 0 });
    expect(otro.status()).toBe(404);
  });

  for (const width of [1280, 1024, 768, 390]) {
    test(`a ${width}px ningún corte desborda la página`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      for (const corte of ["operador", "sede", "servicio", "provincia", "dia"]) {
        await page.goto(`/super-admin/reportes?corte=${corte}`);
        await expect(page.getByRole("main").getByRole("heading", { name: "Total del periodo" })).toBeVisible();
        await sinDesbordamientoHorizontal(page, `el corte ${corte}`);
      }
      await page.goto(`/super-admin/reportes?por=sede`);
      await sinDesbordamientoHorizontal(page, "la vista por sede administrada");
    });
  }
});
