import ExcelJS from "exceljs";
import { test, expect } from "@playwright/test";

import { volumenDeOperacion } from "../src/features/network/volumen";
import type { OperationRecord } from "../src/features/operations/operations-history";
import { MARTA, signInAsAdmin } from "./admin-helpers";

/**
 * `/admin/reportes` — **FR-AD-REP-1** a **FR-AD-REP-13**. Solo lee.
 */

const base = {
  codigo: "PC-X",
  fechaHora: "2026-10-19T15:00:00.000Z",
  cliente: { nombre: "A", documentType: "CI", documentNumber: "1", telefono: "", nacionalidad: "" },
  worker: "W",
  caja: "Caja 01",
} as unknown as Omit<OperationRecord, "servicio" | "estado" | "amount">;

const cash = { before: { amount: 0, currency: "CUP" }, movement: { amount: 0, currency: "CUP" }, after: { amount: 0, currency: "CUP" } };

test.describe("Reportes · qué cuenta como volumen", () => {
  test("un cambio cuenta una vez, por la divisa, y distingue compra de venta", () => {
    const compra = volumenDeOperacion({
      ...base, servicio: "Cambio de moneda", estado: "Completada",
      amount: { kind: "exchange", source: { amount: 100, currency: "USD" }, destination: { amount: 39_000, currency: "CUP" }, appliedRate: 390, cashSnapshot: cash },
    });
    expect(compra).toEqual({ servicio: "Cambio de moneda", sentido: "compra", currency: "USD", amount: 100 });

    const venta = volumenDeOperacion({
      ...base, servicio: "Cambio de moneda", estado: "Completada",
      amount: { kind: "exchange", source: { amount: 40_000, currency: "CUP" }, destination: { amount: 100, currency: "USD" }, appliedRate: 0.0025, cashSnapshot: cash },
    });
    expect(venta).toEqual({ servicio: "Cambio de moneda", sentido: "venta", currency: "USD", amount: 100 });
  });

  test("una operación que no se completó no es volumen", () => {
    for (const estado of ["Rechazada", "Fallida", "Cancelada", "En proceso"] as const) {
      expect(
        volumenDeOperacion({ ...base, servicio: "Remesa", estado, amount: { kind: "single", money: { amount: 100, currency: "USD" } } }),
      ).toBeNull();
    }
  });

  test("un giro cuenta su importe, enviado o pagado", () => {
    const giro = (transferAction: "send" | "payout") =>
      volumenDeOperacion({
        ...base, servicio: "Giros", estado: "Completada",
        amount: { kind: "single", money: { amount: 5_000, currency: "CUP" } },
        transfer: { transferAction, code: "TR", receiverName: "B", receiverIdentification: "1", deliveryMethod: "pickup", senderCurrency: "CUP", deliveryAmount: 5_000 },
      });
    expect(giro("send")).toMatchObject({ sentido: "enviado", currency: "CUP", amount: 5_000 });
    expect(giro("payout")).toMatchObject({ sentido: "pagado", currency: "CUP", amount: 5_000 });
  });
});

test.describe("Reportes", () => {
  test("por sede: las filas suman el total y se ordenan por cualquier columna", async ({ page }) => {
    await signInAsAdmin(page, MARTA);
    await page.goto("/admin/reportes");
    const main = page.getByRole("main");

    await expect(main.getByRole("link", { name: "Por sede" })).toHaveAttribute("aria-current", "page");
    await expect(main.getByRole("link", { name: "Últimos 7 días" })).toHaveAttribute("aria-current", "true");

    const total = Number(
      (await main.getByText("Operaciones completadas").locator("xpath=following-sibling::p").textContent())!.replace(/\D/g, ""),
    );
    expect(total).toBeGreaterThan(0);
    const tabla = main.locator("table");
    const ops = await tabla.locator("tbody tr td:nth-child(2)").allTextContents();
    expect(ops.reduce((s, t) => s + Number(t.replace(/\D/g, "")), 0)).toBe(total);

    /* FR-AD-REP-4: ordenar por operaciones, de más a menos. */
    await tabla.getByRole("button", { name: "Operaciones" }).click();
    await expect(tabla.locator("th").nth(1)).toHaveAttribute("aria-sort", "descending");
    const ordenadas = (await tabla.locator("tbody tr td:nth-child(2)").allTextContents()).map((t) => Number(t.replace(/\D/g, "")));
    expect(ordenadas).toEqual([...ordenadas].sort((a, b) => b - a));

  });

  test("por servicio: el cambio por divisa da comprado, vendido y posición neta", async ({ page }) => {
    await signInAsAdmin(page, MARTA);
    await page.goto("/admin/reportes?corte=servicio");
    const main = page.getByRole("main");
    await expect(main.locator("table").first().getByText("Cambio de moneda · compra de divisa")).toBeVisible();
    await expect(main.getByRole("heading", { name: "Cambio de moneda por divisa" })).toBeVisible();
    await expect(main.getByRole("columnheader", { name: "Posición neta" })).toBeVisible();
    /* En la línea de compra de divisa, los pesos no son volumen. */
    const compra = main.locator("tbody tr", { hasText: "Cambio de moneda · compra de divisa" }).first();
    await expect(compra.locator("td").nth(2)).toHaveText("—");
  });

  test("por día: una barra por día, en la moneda elegida", async ({ page }) => {
    await signInAsAdmin(page, MARTA);
    await page.goto("/admin/reportes?corte=dia");
    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { name: "Volumen por día en CUP" })).toBeVisible();
    await expect(main.locator("ul[aria-label='Volumen por día en CUP'] li")).toHaveCount(7);
    await main.getByLabel("Moneda").selectOption("USD");
    await expect(main.getByRole("heading", { name: "Volumen por día en USD" })).toBeVisible();
  });

  test("desde la ficha de un trabajador, su volumen por día", async ({ page }) => {
    await signInAsAdmin(page, MARTA);
    await page.goto("/admin/reportes?corte=trabajador");
    const main = page.getByRole("main");
    await main.locator("tbody tr").first().getByRole("link").click();
    await page.waitForURL(/\/admin\/trabajadores\//);
    const nombre = (await main.getByRole("heading", { level: 1 }).textContent())!.trim();
    await main.getByRole("link", { name: "Ver su volumen por día" }).click();
    await page.waitForURL(/corte=dia&trabajador=/);
    await expect(main.getByRole("heading", { name: new RegExp(`Total del periodo · ${nombre}`) })).toBeVisible();
    /* El filtro se ve: el aviso arriba y el título del gráfico dicen de quién es. */
    await expect(main.getByRole("status").filter({ hasText: `Solo las operaciones de ${nombre}` })).toBeVisible();
    await expect(main.getByRole("heading", { name: `Volumen por día en CUP · ${nombre}` })).toBeVisible();
    await main.getByRole("link", { name: "Ver todos los trabajadores" }).click();
    await expect(page).not.toHaveURL(/trabajador=/);
    await expect(main.getByRole("heading", { name: "Volumen por día en CUP" })).toBeVisible();
  });

  test("cambiar el trabajador o las fechas se aplica al momento, y «Todos» quita el aviso", async ({ page }) => {
    await signInAsAdmin(page, MARTA);
    await page.goto("/admin/reportes?corte=dia");
    const main = page.getByRole("main");
    const selector = main.getByLabel("Trabajador");
    const nombre = (await selector.locator("option").nth(1).textContent())!.split(" · ")[0]!.trim();

    await selector.selectOption({ index: 1 });
    await page.waitForURL(/trabajador=/);
    await expect(main.getByRole("status").filter({ hasText: `Solo las operaciones de ${nombre}` })).toBeVisible();

    await main.getByLabel("Trabajador").selectOption("");
    await page.waitForURL((url) => !url.searchParams.has("trabajador"));
    await expect(main.getByRole("status").filter({ hasText: "Solo las operaciones de" })).toHaveCount(0);
    await expect(main.getByLabel("Trabajador")).toHaveValue("");

    /* Sin botón que pulsar: una vez hidratado, no se pinta. */
    await expect(main.getByRole("button", { name: "Ver el periodo" })).toHaveCount(0);
    await main.getByLabel("Desde").fill("2026-10-18");
    await page.waitForURL(/desde=2026-10-18/);
  });

  test("los dos bloques se nombran, y agrupando por trabajador no hay filtro de trabajador", async ({ page }) => {
    await signInAsAdmin(page, MARTA);
    await page.goto("/admin/reportes");
    const main = page.getByRole("main");
    await expect(main.getByRole("navigation", { name: "Agrupar por" })).toBeVisible();
    await expect(main.getByRole("region", { name: "Qué operaciones" })).toBeVisible();
    await expect(main.getByLabel("Trabajador")).toBeVisible();

    /* Con un trabajador en la dirección, el corte por trabajador lo ignora: los compara a todos. */
    await main.getByLabel("Trabajador").selectOption({ index: 1 });
    await page.waitForURL(/trabajador=/);
    await main.getByRole("link", { name: "Por trabajador" }).click();
    await page.waitForURL(/corte=trabajador/);
    await expect(page).not.toHaveURL(/trabajador=[^&]/);
    await expect(main.getByRole("combobox", { name: "Trabajador" })).toHaveCount(0);
    await expect(main.getByRole("status").filter({ hasText: "Solo las operaciones de" })).toHaveCount(0);
    expect(await main.locator("tbody tr").count()).toBeGreaterThan(1);
  });

  test("se exporta a Excel y a PDF con el periodo y el trabajador de la pantalla", async ({ page }) => {
    test.setTimeout(90_000);
    await signInAsAdmin(page, MARTA);
    await page.goto("/admin/reportes?corte=dia&desde=2026-10-15&hasta=2026-10-18");
    const main = page.getByRole("main");
    await main.getByRole("combobox", { name: "Trabajador" }).selectOption({ index: 1 });
    await page.waitForURL(/trabajador=/);

    /* FR-AD-REP-7: los enlaces llevan lo que hay en pantalla. */
    const excel = main.getByRole("link", { name: "Exportar a Excel" });
    await expect(excel).toHaveAttribute("href", /\/admin\/reportes\/exportar\/xlsx\?desde=2026-10-15&hasta=2026-10-18&trabajador=/);

    for (const [nombre, extension, firma] of [
      ["Exportar a Excel", "xlsx", "PK"],
      ["Exportar a PDF", "pdf", "%PDF"],
    ] as const) {
      const [descarga] = await Promise.all([page.waitForEvent("download"), main.getByRole("link", { name: nombre }).click()]);
      expect(descarga.suggestedFilename()).toMatch(new RegExp(`^puntocash-resumen-de-operaciones_2026-10-15_2026-10-18_[a-z-]+\\.${extension}$`));
      const ruta = await descarga.path();
      const { readFile } = await import("node:fs/promises");
      const bytes = await readFile(ruta!);
      expect(bytes.subarray(0, firma.length).toString("latin1")).toBe(firma);

      /* Con un trabajador elegido, el corte por trabajador sería una sola
         fila: el archivo no lo incluye. */
      if (extension === "xlsx") {
        const libro = new ExcelJS.Workbook();
        await libro.xlsx.load(bytes as unknown as ArrayBuffer);
        const hojas = libro.worksheets.map((h) => h.name);
        expect(hojas).toContain("Resumen");
        expect(hojas.some((h) => /trabajador/i.test(h))).toBe(false);
      }
    }
  });

  test("sin sesión, exportar lleva al acceso y no entrega nada", async ({ request }) => {
    const r = await request.get("/admin/reportes/exportar/pdf", { maxRedirects: 0 });
    expect([302, 303, 307]).toContain(r.status());
    expect(r.headers()["location"]).toMatch(/\/admin\/login$/);
    const otro = await request.get("/admin/reportes/exportar/docx", { maxRedirects: 0 });
    expect(otro.status()).toBe(404);
  });

  for (const [ancho, alto] of [[360, 740], [1280, 800], [1440, 900]] as const) {
    test(`a ${ancho}px ninguna cifra del total se parte ni se desborda`, async ({ page }) => {
      await page.setViewportSize({ width: ancho, height: alto });
      await signInAsAdmin(page, MARTA);
      await page.goto("/admin/reportes?desde=2026-01-01");
      const cifras = page.getByRole("region", { name: "Total del periodo" }).locator("p.pc-numeric");
      await expect(cifras.first()).toBeVisible();
      for (const cifra of await cifras.all()) {
        const { ancho: a, cabe, lineas } = await cifra.evaluate((e) => {
          const estilo = getComputedStyle(e);
          return { ancho: e.scrollWidth, cabe: e.clientWidth, lineas: Math.round(e.getBoundingClientRect().height / parseFloat(estilo.lineHeight)) };
        });
        expect(a, await cifra.textContent() ?? "").toBeLessThanOrEqual(cabe + 1);
        expect(lineas).toBe(1);
      }
    });
  }
});
