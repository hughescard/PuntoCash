import { expect, test, type Page } from "@playwright/test";

import { sinDesbordamientoHorizontal } from "./admin-helpers";
import { signInAsSuperAdmin } from "./super-admin-helpers";

/**
 * Sedes en Super administración: listado y alta.
 *
 * Las altas de estas pruebas se crean **con operador** y con un código único
 * por ejecución: el estado vive en memoria y lo comparten las demás suites, y
 * una sede sin asignar cambiaría el indicador del menú que otras comprueban.
 */

const codigoUnico = () => `T${Date.now().toString(36).slice(-6).toUpperCase()}`;

async function rellenarDatos(page: Page, codigo: string, nombre: string): Promise<void> {
  await page.getByLabel(/^Código\*?$/).fill(codigo);
  await page.getByLabel(/^Nombre\*?$/).fill(nombre);
  await page.getByLabel(/^Dirección\*?$/).fill("Calle 100 n.º 5, entre 1.ª y 3.ª");
  await page.getByLabel(/^Provincia\*?$/).selectOption("La Habana");
  await page.getByLabel(/^Municipio\*?$/).fill("Marianao");
  await page.getByLabel(/^Teléfono\*?$/).fill("+53 7 260 1111");
}

test.describe("listado de sedes", () => {
  test.beforeEach(async ({ page }) => {
    await signInAsSuperAdmin(page);
    await page.goto("/super-admin/sedes");
  });

  test("muestra cada sede con su estado, operador, cajas y trabajadores", async ({ page }) => {
    const tabla = page.getByRole("table");
    for (const cabecera of ["Sede", "Estado", "Operador", "Cajas", "Trabajadores"]) {
      await expect(tabla.getByRole("columnheader", { name: cabecera, exact: true })).toBeVisible();
    }
    const vedado = tabla.getByRole("row").filter({ hasText: "PuntoCash Vedado" });
    await expect(vedado.getByText("Malecón Servicios Financieros S.R.L.")).toBeVisible();
    await expect(vedado.getByText(/desde el/)).toBeVisible();
  });

  test("filtra por sedes sin operador y lo guarda en la dirección", async ({ page }) => {
    await page.getByLabel("Operador").selectOption({ label: "Sin operador asignado" });
    const filas = page.getByRole("table").getByRole("row");
    await expect(filas.filter({ hasText: "PuntoCash Santiago" })).toBeVisible();
    await expect(filas.filter({ hasText: "PuntoCash Vedado" })).toHaveCount(0);
    await expect(page).toHaveURL(/operador=sin-operador/);
  });

  test("«Sin cajas» deja solo las sedes que no tienen ninguna", async ({ page }) => {
    await page.getByLabel("Sin cajas").check();
    const filas = page.getByRole("table").getByRole("row");
    await expect(filas.filter({ hasText: "PuntoCash Cerro" })).toBeVisible();
    await expect(filas.filter({ hasText: "PuntoCash Vedado" })).toHaveCount(0);
    await expect(page).toHaveURL(/sinCajas=1/);
  });
});

test.describe("alta de una sede", () => {
  test.beforeEach(async ({ page }) => {
    await signInAsSuperAdmin(page);
    await page.goto("/super-admin/sedes/nueva");
  });

  test("un código que ya existe se rechaza", async ({ page }) => {
    await rellenarDatos(page, "VED", "PuntoCash Prueba");
    await page.getByRole("button", { name: "Crear la sede" }).click();
    await expect(page.getByText("Ya existe una sede con ese código.")).toBeVisible();
  });

  test("con operador pide motivo y, con él, la entrega y lo dice", async ({ page }) => {
    const codigo = codigoUnico();
    const nombre = `PuntoCash Prueba ${codigo}`;
    await rellenarDatos(page, codigo, nombre);
    await page.getByLabel(/^Operador$/).selectOption({ label: "Caribe Cambios S.A." });
    await page.getByRole("button", { name: "Crear la sede" }).click();
    await expect(page.getByText(/Escribe el motivo de la asignación/)).toBeVisible();

    await page.getByLabel(/^Motivo de la asignación\*?$/).fill("Entrega inicial de la sede al operador");
    await page.getByRole("button", { name: "Crear la sede" }).click();
    await expect(page.getByText(`${nombre} está creada`)).toBeVisible();
    await expect(page.getByText("Caribe Cambios S.A.")).toBeVisible();

    await page.goto("/super-admin/sedes");
    await page.getByLabel("Buscar sede").fill(codigo);
    await expect(page.getByRole("table").getByRole("row").filter({ hasText: nombre })).toBeVisible();
  });
});

for (const ancho of [1024, 768, 390]) {
  test.describe(`a ${ancho}px`, () => {
    test.use({ viewport: { width: ancho, height: 900 } });

    test("el listado y el alta no desbordan", async ({ page }) => {
      await signInAsSuperAdmin(page);
      await page.goto("/super-admin/sedes");
      await sinDesbordamientoHorizontal(page, "Sedes");
      await page.goto("/super-admin/sedes/nueva");
      await sinDesbordamientoHorizontal(page, "Nueva sede");
    });
  });
}
