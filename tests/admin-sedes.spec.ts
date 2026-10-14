import { test, expect } from "@playwright/test";

import { MARTA, signInAsAdmin } from "./admin-helpers";

/**
 * Sedes — **§6 del FRD**.
 *
 * Dos cosas se vigilan aquí por encima del resto:
 *
 *   · Que la ficha **no ofrezca editar nada**. Los datos maestros los gestiona
 *     PuntoCash (**A3**, **FR-AD-SEDE-4**), y el requisito es tajante: ni un
 *     control de edición, «ni siquiera deshabilitado». Un campo apagado invita
 *     a buscar cómo encenderlo.
 *   · Que los **dos vacíos no se confundan** (**FR-AD-STATE-1**): «no tienes
 *     sedes» y «tus filtros no devuelven nada» son estados distintos del
 *     negocio y no pueden compartir mensaje.
 *
 * Deliberadamente **no se afirma ningún recuento de cajas**: `admin-cajas`
 * crea y retira cajas contra el mismo dominio en memoria, y las dos specs
 * corren en paralelo. Un número exacto aquí sería una prueba que falla según
 * quién termine antes.
 */

test.beforeEach(async ({ page }) => {
  await signInAsAdmin(page, MARTA);
  await page.goto("/admin/sedes");
  await expect(page.getByRole("main")).toBeVisible();
});

/* Por rol y no por texto: el nombre de cada sede aparece también en las
   opciones del selector de alcance de la cabecera —dos veces, la de escritorio
   y la del teléfono—, así que buscar texto suelto encuentra cuatro cosas y no
   distingue el listado del control que lo filtra. Como enlace hay una sola, y
   el motor de roles ignora además lo que está oculto a este ancho. */
const enlaceASede = (page: import("@playwright/test").Page, nombre: string) =>
  page.getByRole("link", { name: nombre, exact: true });

test("lista las sedes del alcance y solo esas", async ({ page }) => {
  await expect(enlaceASede(page, "PuntoCash Vedado")).toBeVisible();
  await expect(enlaceASede(page, "PuntoCash Obispo")).toBeVisible();
  // De Caribe, no de Antilla.
  await expect(enlaceASede(page, "PuntoCash Matanzas")).toHaveCount(0);
});

test("la búsqueda filtra por nombre y por localidad", async ({ page }) => {
  await page.getByLabel("Buscar sede").fill("obispo");
  await expect(enlaceASede(page, "PuntoCash Obispo")).toBeVisible();
  await expect(enlaceASede(page, "PuntoCash Vedado")).toHaveCount(0);

  await page.getByLabel("Buscar sede").fill("vedado");
  await expect(enlaceASede(page, "PuntoCash Vedado")).toBeVisible();
  await expect(enlaceASede(page, "PuntoCash Obispo")).toHaveCount(0);
});

test("el vacío por filtros dice que es por los filtros", async ({ page }) => {
  await page.getByLabel("Buscar sede").fill("no-existe-esta-sucursal");

  await expect(page.getByText("Ninguna sede coincide con esos filtros.")).toBeVisible();
  // Y nunca el otro vacío, que hablaría del estado del negocio.
  await expect(page.getByText("Todavía no tienes sedes asignadas")).toHaveCount(0);
});

test("el filtro de estado deja ver las suspendidas y las cerradas", async ({ page }) => {
  await page.getByLabel("Estado").selectOption("cerrada");
  await expect(page.getByText("Ninguna sede coincide con esos filtros.")).toBeVisible();

  await page.getByLabel("Estado").selectOption("activa");
  await expect(enlaceASede(page, "PuntoCash Vedado")).toBeVisible();
});

test.describe("ficha", () => {
  test("declara que los datos los gestiona PuntoCash y no ofrece editarlos", async ({ page }) => {
    await page.goto("/admin/sedes/sede-vedado");
    await expect(page.getByRole("heading", { name: "PuntoCash Vedado" })).toBeVisible();

    await expect(page.getByText("Estos datos los gestiona PuntoCash.")).toBeVisible();
    await expect(page.getByText(/Si alguno no es correcto, pídeselo a PuntoCash/)).toBeVisible();

    /* Ni un control de edición, ni siquiera deshabilitado (**FR-AD-SEDE-4**).
       Se comprueba que no haya NINGÚN campo de formulario en la ficha: es la
       única forma de que la aserción siga mordiendo cuando alguien añada uno
       «solo para ver». */
    const main = page.getByRole("main");
    await expect(main.locator("input, textarea, select")).toHaveCount(0);
    await expect(main.getByRole("button", { name: /Editar|Guardar/ })).toHaveCount(0);
  });

  test("muestra los datos que la sucursal exhibe en su kiosco", async ({ page }) => {
    await page.goto("/admin/sedes/sede-vedado");

    await expect(page.getByText("Calle 23 esq. a L, Vedado")).toBeVisible();
    await expect(page.getByText("+53 7 838 1234")).toBeVisible();
    await expect(page.getByText("Lunes a sábado · 8:30 a.m. – 6:00 p.m.")).toBeVisible();
  });

  test("dice desde cuándo se administra, sin el historial de otros operadores", async ({ page }) => {
    await page.goto("/admin/sedes/sede-vedado");

    // **FR-AD-SEDE-12**: la asignación vigente sí; el historial es del Super Admin.
    await expect(page.getByText("ADMINISTRAS ESTA SEDE DESDE")).toBeVisible();
    await expect(page.getByText(/Atlántico|Caribe|Oriente/)).toHaveCount(0);
  });

  test("los servicios se leen, no se tocan", async ({ page }) => {
    await page.goto("/admin/sedes/sede-vedado");

    await expect(page.getByText("Los habilita PuntoCash.", { exact: false })).toBeVisible();
    for (const servicio of ["Cambio de moneda", "Remesas", "Giros"]) {
      await expect(page.getByText(servicio, { exact: true })).toBeVisible();
    }
  });

  test("una sede recién entregada enseña que todavía no tiene cajas", async ({ page }) => {
    await page.goto("/admin/sedes/sede-cerro");

    await expect(page.getByRole("heading", { name: "PuntoCash Cerro" })).toBeVisible();
    await expect(page.getByText(/Esta sede todavía no tiene cajas/)).toBeVisible();
    await expect(page.getByText(/no tiene ningún kiosco vinculado/)).toBeVisible();
  });
});
