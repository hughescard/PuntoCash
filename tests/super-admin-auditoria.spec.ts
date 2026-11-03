import ExcelJS from "exceljs";
import { expect, test, type Page } from "@playwright/test";

import { sinDesbordamientoHorizontal } from "./admin-helpers";
import { signInAsSuperAdmin } from "./super-admin-helpers";

/**
 * Auditoría: el listado con sus filtros, el detalle con el antes y el después y
 * la exportación a Excel. El registro lo alimentan todas las demás suites, así
 * que **ninguna aserción cuenta eventos**: comprueba propiedades de lo que se ve.
 */

test.beforeEach(async ({ page }) => {
  await signInAsSuperAdmin(page);
  await page.setViewportSize({ width: 1440, height: 900 });
});

const filas = (page: Page) => page.getByRole("main").locator("tbody tr");

test("el listado enseña el registro, del más reciente al más antiguo, y no ofrece editar ni borrar", async ({ page }) => {
  await page.goto("/super-admin/auditoria");
  const main = page.getByRole("main");
  await expect(main.getByRole("heading", { name: "Auditoría" })).toBeVisible();
  await expect(filas(page).first()).toBeVisible();
  expect(await filas(page).count()).toBeGreaterThan(5);
  /* Los eventos sembrados están, con su autor como persona. */
  await page.goto("/super-admin/auditoria?actor=sa-1");
  await expect(filas(page).first()).toContainText("Elena Marrero Fonseca");
  await page.goto("/super-admin/auditoria?actor=adm-bahia-1");
  await expect(filas(page).first()).toContainText("Ana Barrios");

  /* RP-21: ningún control de edición ni de borrado, ni siquiera deshabilitado. */
  await expect(main.getByRole("button", { name: /editar|borrar|eliminar|modificar|anular/i })).toHaveCount(0);
  await expect(main.getByRole("link", { name: /editar|borrar|eliminar|modificar|anular/i })).toHaveCount(0);
});

test("el objeto de un evento enlaza a la ficha del trabajador, en el listado y en el detalle", async ({ page }) => {
  /* Evento sembrado: la desactivación de Noelia Alonso (trb-12). */
  await page.goto("/super-admin/auditoria?texto=Noelia");
  const enlace = filas(page).first().getByRole("link", { name: "Noelia Alonso" });
  await expect(enlace).toHaveAttribute("href", "/super-admin/trabajadores/trb-12");
  await enlace.click();
  await expect(page).toHaveURL(/\/super-admin\/trabajadores\/trb-12$/);
  await expect(page.getByRole("main").getByRole("heading", { name: "Noelia Alonso" })).toBeVisible();

  /* Y en el detalle del evento. */
  await page.goto("/super-admin/auditoria?texto=Noelia");
  await filas(page).first().getByRole("link", { name: /Ver el detalle/ }).click();
  await expect(page.getByRole("main").getByRole("link", { name: "Noelia Alonso" })).toHaveAttribute("href", "/super-admin/trabajadores/trb-12");
});

test("se separa lo que hizo PuntoCash de lo que hizo un mercante", async ({ page }) => {
  await page.goto("/super-admin/auditoria");
  const main = page.getByRole("main");
  await main.getByLabel("Quién actuó").selectOption("admin-sede");
  await expect(page).toHaveURL(/rol=admin-sede/);
  const n = await filas(page).count();
  expect(n).toBeGreaterThan(0);
  for (let i = 0; i < n; i++) await expect(filas(page).nth(i)).toContainText("Mercante");

  await main.getByLabel("Quién actuó").selectOption("super-admin");
  const m = await filas(page).count();
  expect(m).toBeGreaterThan(0);
  for (let i = 0; i < Math.min(m, 12); i++) await expect(filas(page).nth(i)).not.toContainText("Mercante ·");
});

test("el tipo de evento, la búsqueda y la sede acotan, y se recuerdan en la dirección", async ({ page }) => {
  await page.goto("/super-admin/auditoria");
  const main = page.getByRole("main");

  await main.getByLabel("Evento", { exact: true }).selectOption("caja.retirada");
  await expect(page).toHaveURL(/tipo=caja\.retirada/);
  expect(await filas(page).count()).toBeGreaterThanOrEqual(2);
  for (const f of await filas(page).all()) await expect(f).toContainText("Caja retirada");

  await main.getByLabel("Evento", { exact: true }).selectOption("todos");
  await main.getByRole("searchbox", { name: "Buscar" }).fill("techo");
  await expect(filas(page).first()).toContainText("techo");

  await main.getByLabel("Sede", { exact: true }).selectOption("sede-pinar");
  for (const f of await filas(page).all()) await expect(f).toContainText("Pinar del Río");

  /* Recargar conserva los filtros. */
  await page.reload();
  await expect(main.getByRole("searchbox", { name: "Buscar" })).toHaveValue("techo");
  await expect(main.getByLabel("Sede", { exact: true })).toHaveValue("sede-pinar");

  await main.getByRole("searchbox", { name: "Buscar" }).fill("esto no está en ningún sitio");
  await expect(main.getByText("Ningún evento coincide con estos filtros.")).toBeVisible();
});

test("las fechas acotan por día", async ({ page }) => {
  await page.goto("/super-admin/auditoria?desde=2026-06-30&hasta=2026-06-30");
  const main = page.getByRole("main");
  await expect(filas(page)).toHaveCount(2);
  await expect(filas(page).first()).toContainText("Sede entregada a un operador");
  await expect(filas(page).nth(1)).toContainText("Sede retirada a su operador");
  await expect(main.getByText("2 eventos")).toBeVisible();
});

test("un evento se abre con su antes y su después y enlaza a la sede y al operador", async ({ page }) => {
  await page.goto("/super-admin/auditoria?desde=2026-06-30&hasta=2026-06-30");
  const main = page.getByRole("main");
  await main.getByRole("link", { name: /Sede retirada a su operador/ }).click();
  await page.waitForURL(/\/super-admin\/auditoria\/aud-1$/);

  await expect(main.getByRole("heading", { name: "Sede retirada a su operador" })).toBeVisible();
  await expect(main.getByText("Elena Marrero Fonseca")).toBeVisible();
  await expect(main.getByText("Cese de actividad del operador a solicitud propia")).toBeVisible();
  await expect(main.getByRole("heading", { name: "Antes y después" })).toBeVisible();
  await expect(main.getByText("Atlántico Casas de Cambio").nth(1)).toBeVisible();
  await expect(main.getByText("Sin operador asignado")).toBeVisible();
  await expect(main.getByRole("link", { name: "PuntoCash Miramar" })).toHaveAttribute("href", "/super-admin/sedes/sede-miramar");
  await expect(main.getByRole("link", { name: "Atlántico Casas de Cambio" })).toHaveAttribute("href", "/super-admin/operadores/op-atlantico");
  await expect(main.getByRole("button", { name: /editar|borrar|eliminar|modificar|anular/i })).toHaveCount(0);

  await main.getByRole("link", { name: "Volver a Auditoría" }).click();
  await page.waitForURL(/\/super-admin\/auditoria$/);

  /* Un evento que no existe es un 404 de la consola, no un detalle vacío. */
  const r = await page.goto("/super-admin/auditoria/aud-no-existe");
  expect(r?.status()).toBe(404);
});

test("se exporta a Excel lo que hay en pantalla, y la exportación queda en el registro", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/super-admin/auditoria?rol=super-admin&desde=2026-06-30&hasta=2026-06-30");
  const main = page.getByRole("main");
  await expect(filas(page)).toHaveCount(2);

  const enlace = main.getByRole("link", { name: "Exportar a Excel" });
  await expect(enlace).toHaveAttribute("href", "/super-admin/auditoria/exportar?desde=2026-06-30&hasta=2026-06-30&rol=super-admin");

  const [descarga] = await Promise.all([page.waitForEvent("download"), enlace.click()]);
  expect(descarga.suggestedFilename()).toMatch(/^puntocash-auditoria_\d{4}-\d{2}-\d{2}\.xlsx$/);
  const { readFile } = await import("node:fs/promises");
  const bytes = await readFile((await descarga.path())!);
  expect(bytes.subarray(0, 2).toString("latin1")).toBe("PK");

  const libro = new ExcelJS.Workbook();
  await libro.xlsx.load(bytes as unknown as ArrayBuffer);
  const hoja = libro.getWorksheet("Auditoría")!;
  expect(hoja).toBeTruthy();
  expect(String(hoja.getCell(6, 1).value)).toContain("2 eventos");
  expect(String(hoja.getCell(6, 1).value)).toContain("PuntoCash");
  /* Cabecera en la fila 9 y los dos eventos debajo, y nada más. */
  expect(String(hoja.getCell(9, 2).value)).toBe("EVENTO");
  expect(String(hoja.getCell(10, 2).value)).toBe("Sede entregada a un operador");
  expect(String(hoja.getCell(11, 2).value)).toBe("Sede retirada a su operador");
  expect(hoja.getCell(12, 2).value).toBeNull();
  expect(hoja.getCell(10, 1).value).toBeInstanceOf(Date);
  expect(String(hoja.getCell(11, 10).value)).toBe("Sin operador asignado");

  /* Quien exporta deja huella: el registro lo dice, con los filtros. */
  await page.goto("/super-admin/auditoria?tipo=auditoria.exportada");
  await expect(filas(page).first()).toContainText("Auditoría exportada");
  await expect(filas(page).first()).toContainText("2 eventos");
  await expect(filas(page).first()).toContainText("Elena Marrero Fonseca");
});

test("con más de una tanda de eventos, se enseñan 50 y se pide el resto", async ({ page }) => {
  test.setTimeout(120_000);
  const total = async () => {
    await page.goto("/super-admin/auditoria");
    const texto = await page.getByRole("main").getByText(/^\d+ eventos?/).first().innerText();
    return Number(/^(\d+)/.exec(texto)![1]);
  };
  /* Cada exportación es un evento del registro: se añaden los que falten para pasar de 50. */
  let n = await total();
  while (n <= 55) {
    for (let i = 0; i < 56 - n; i++) await page.request.get("/super-admin/auditoria/exportar?desde=2099-01-01");
    n = await total();
  }
  const main = page.getByRole("main");
  await expect(filas(page)).toHaveCount(50);
  await expect(main.getByText(/se muestran los 50 más recientes/)).toBeVisible();
  await main.getByRole("button", { name: "Mostrar más eventos" }).click();
  expect(await filas(page).count()).toBeGreaterThan(50);

  /* Cambiar un filtro vuelve a la primera tanda. */
  await main.getByRole("searchbox", { name: "Buscar" }).fill("Registro de auditoría en Excel");
  await expect(filas(page).first()).toContainText("Auditoría exportada");
  expect(await filas(page).count()).toBeLessThanOrEqual(50);
});

test("sin sesión, exportar lleva al acceso y no entrega nada", async ({ request }) => {
  const r = await request.get("/super-admin/auditoria/exportar", { maxRedirects: 0 });
  expect([302, 303, 307]).toContain(r.status());
  expect(r.headers()["location"] ?? "").toContain("/super-admin/login");
});

for (const width of [1280, 1024, 768, 390]) {
  test(`a ${width}px el listado y el detalle no desbordan`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const ruta of ["/super-admin/auditoria", "/super-admin/auditoria?rol=admin-sede", "/super-admin/auditoria/aud-1"]) {
      await page.goto(ruta);
      await expect(page.getByRole("main").getByRole("heading").first()).toBeVisible();
      await sinDesbordamientoHorizontal(page, ruta);
    }
  });
}
