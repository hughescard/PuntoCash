import { test, expect } from "@playwright/test";

import { MARTA, signInAsAdmin } from "./admin-helpers";
import { BASE_URL } from "./storage-state";

/**
 * Sedes — **§6 del FRD**.
 *
 * Dos cosas se vigilan aquí por encima del resto:
 *
 *   · Que lo que se edita sea **solo lo de contacto** (**FR-AD-SEDE-14**):
 *     dirección, teléfono y horario. El código y el nombre son de PuntoCash
 *     y no aparecen en el formulario. Y que lo guardado **llegue a la
 *     pantalla de la sala**, que es la razón de poder editarlo.
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
  // De Caribe, no de Malecón.
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
  test("la ficha no edita en sitio: lleva al formulario, que no toca código ni nombre", async ({ page }) => {
    await page.goto("/admin/sedes/sede-vedado");
    await expect(page.getByRole("heading", { name: "PuntoCash Vedado" })).toBeVisible();

    /* La ficha sigue sin ningún campo: se edita en su propia pantalla. */
    const main = page.getByRole("main");
    await expect(main.locator("input, textarea, select")).toHaveCount(0);
    await expect(page.getByText(/El código y el nombre, PuntoCash/)).toBeVisible();

    await main.getByRole("link", { name: "Editar datos" }).click();
    await page.waitForURL(/\/admin\/sedes\/sede-vedado\/editar$/);
    await expect(page.getByLabel(/^Dirección/)).toHaveValue("Calle 23 esq. a L, Vedado");
    await expect(page.getByLabel(/^Nombre/)).toHaveCount(0);
    await expect(page.getByLabel(/^Código/)).toHaveCount(0);
  });

  test("muestra los datos que la sucursal exhibe en su pantalla", async ({ page }) => {
    await page.goto("/admin/sedes/sede-vedado");

    await expect(page.getByText("Calle 23 esq. a L, Vedado")).toBeVisible();
    await expect(page.getByText("+53 7 838 1234")).toBeVisible();
    await expect(page.getByText("Lunes a sábado · 8:30 a.m. – 6:00 p.m.")).toBeVisible();

    /* **FR-AD-SEDE-11**: lo que la pantalla de la sala muestra hoy. */
    const sala = page.getByRole("main");
    await expect(sala.getByRole("heading", { name: "Tasas", exact: true })).toBeVisible();
    await expect(sala.getByRole("heading", { name: "Promociones", exact: true })).toBeVisible();
    await expect(sala.getByRole("link", { name: "Cobra tu remesa sin filas" })).toBeVisible();
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

test("lo que se guarda llega a la pantalla de la sala", async ({ page, browser }) => {
  /* Cerro: ninguna otra prueba lee su teléfono ni su horario, y al no tener
     tasas su pantalla empieza por la información de la sucursal. */
  await page.goto("/admin/sedes/sede-cerro/editar");
  const telefono = page.getByLabel(/^Teléfono/);
  const original = await telefono.inputValue();
  const nuevo = `+53 7 877 ${String(1000 + (Date.now() % 9000))}`;

  /* Un horario imposible se rechaza diciendo qué día. */
  await page.getByLabel("Sábado, cierra").fill("08:00");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(
    page.getByText("El sábado, la hora de cierre tiene que ser posterior a la de apertura."),
  ).toBeVisible();

  await telefono.fill(nuevo);
  await page.getByLabel("Sábado, cierra").fill("13:00");
  /* La vista previa agrupa los días seguidos con la misma franja. */
  await expect(page.getByText("Sábado · 9:00 a.m. – 1:00 p.m.")).toBeVisible();
  await page.getByRole("button", { name: "Guardar cambios" }).click();

  await page.waitForURL(/\/admin\/sedes\/sede-cerro\?guardado=1$/);
  await expect(page.getByText("Datos guardados")).toBeVisible();
  await expect(page.getByText(nuevo)).toBeVisible();
  await expect(page.getByText("Lunes a viernes · 9:00 a.m. – 5:30 p.m.")).toBeVisible();

  const pantalla = await browser.newContext({
    baseURL: BASE_URL,
    storageState: {
      cookies: [],
      origins: [
        { origin: BASE_URL, localStorage: [{ name: "puntocash.kiosk.pantalla.sede", value: "sede-cerro" }] },
      ],
    },
  });
  const tv = await pantalla.newPage();
  await tv.goto("/kiosk/pantalla");
  await expect(tv.getByText(nuevo)).toBeVisible({ timeout: 30_000 });
  await expect(tv.getByText("Sábado · 9:00 a.m. – 1:00 p.m.")).toBeVisible();
  await pantalla.close();

  /* Se deja como estaba. */
  await page.goto("/admin/sedes/sede-cerro/editar");
  await page.getByLabel(/^Teléfono/).fill(original);
  await page.getByLabel("Sábado, cierra").fill("17:30");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await page.waitForURL(/\/admin\/sedes\/sede-cerro\?guardado=1$/);
});
