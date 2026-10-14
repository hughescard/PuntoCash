import { test, expect } from "@playwright/test";

import { IDALMIS, LIUDMILA, MARTA, REINALDO, signInAsAdmin } from "./admin-helpers";

/**
 * Shell, alcance y navegación de `/admin` — **FR-AD-SHELL-1 a 5**,
 * **FR-AD-SCOPE-1 a 4**, **FR-AD-NAV-2 y 3**, **FR-AD-HOME-8**.
 *
 * Lo que más importa aquí no es que la barra lateral tenga los destinos que
 * debe, sino las dos cosas que, si se rompen, no se ven: que una sesión solo
 * alcance sus propias sedes, y que una sede ajena responda **exactamente** lo
 * mismo que una inexistente.
 */

const DESTINOS = [
  "Inicio",
  "Jornadas",
  "Aprobaciones",
  "Operaciones",
  "Sedes",
  "Cajas",
  "Equipos",
  "Trabajadores",
  "Usuarios",
  "Monedas",
  "Tasas",
  "Promociones",
  "Reportes",
];

test.describe("shell", () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page, MARTA);
  });

  test("la barra lateral agrupa sus destinos en tres bloques", async ({ page }) => {
    const nav = page.getByRole("navigation", { name: "Navegación principal" });

    for (const bloque of ["Operación", "Sucursal", "Configuración"]) {
      await expect(nav.getByText(bloque, { exact: true })).toBeVisible();
    }

    /* Sin `exact`: un destino con indicador numérico —Cajas lo tiene desde que
       hay una sede sin ninguna— lleva ese número **dentro** del enlace, así que
       su nombre accesible es "Cajas 1" y una coincidencia exacta no lo
       encuentra. Buscar por subcadena sigue comprobando que la etiqueta está,
       que es lo que importa, sin atarse a si hay aviso o no. */
    for (const destino of DESTINOS) {
      await expect(nav.getByRole("link", { name: destino })).toHaveCount(1);
    }
  });

  test("el destino actual se marca con aria-current, no solo con color", async ({ page }) => {
    const nav = page.getByRole("navigation", { name: "Navegación principal" });

    await expect(nav.getByRole("link", { name: "Inicio", exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );

    await nav.getByRole("link", { name: "Tasas", exact: true }).click();
    await page.waitForURL(/\/admin\/tasas$/);

    await expect(nav.getByRole("link", { name: "Tasas", exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(nav.getByRole("link", { name: "Inicio", exact: true })).not.toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  test("todos los destinos llevan a una pantalla real, ninguno a un 404", async ({ page }) => {
    const nav = page.getByRole("navigation", { name: "Navegación principal" });

    for (const destino of DESTINOS) {
      await nav.getByRole("link", { name: destino }).click();
      await expect(page.getByRole("main")).toBeVisible();
      await expect(page.getByText("No encontramos lo que buscabas")).toHaveCount(0);
    }
  });

  test("la cabecera muestra a la persona y su empresa como contexto, no como marca", async ({
    page,
  }) => {
    const header = page.getByRole("banner");

    await expect(header.getByText("Marta Sánchez")).toBeVisible();
    // El operador aparece, pero como texto secundario junto al nombre (A9).
    await expect(header.getByText("Antilla Servicios Financieros S.R.L.")).toBeVisible();
    await expect(header.getByRole("button", { name: "Cerrar sesión" })).toHaveCount(1);
  });

  test("cerrar sesión devuelve al acceso y cierra la consola de verdad", async ({ page }) => {
    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await page.waitForURL(/\/admin\/login$/);

    await page.goto("/admin/inicio");
    await expect(page).toHaveURL(/\/admin\/login$/);
  });
});

test.describe("alcance", () => {
  test("el selector ofrece todas mis sedes y solo las mías", async ({ page }) => {
    await signInAsAdmin(page, MARTA);

    // Por identificador: la franja del teléfono tiene su gemelo, oculto aquí.
    const selector = page.locator("#admin-scope");
    await expect(selector).toBeVisible();

    // Antilla administra tres sedes: esas, y ninguna más, más la opción de todas.
    await expect(selector.locator("option")).toHaveCount(4);
    await expect(selector.locator("option", { hasText: "Todas mis sedes" })).toHaveCount(1);
    await expect(selector.locator("option", { hasText: "PuntoCash Matanzas" })).toHaveCount(0);
  });

  test("elegir una sede reduce Inicio a esa sede y se mantiene al navegar", async ({ page }) => {
    await signInAsAdmin(page, MARTA);

    await page.locator("#admin-scope").selectOption("sede-vedado");
    await expect(page.getByText("Estás viendo PuntoCash Vedado.")).toBeVisible();

    const tabla = page.getByRole("table");
    await expect(tabla.getByRole("link", { name: "PuntoCash Vedado" })).toHaveCount(1);
    await expect(tabla.getByRole("link", { name: "PuntoCash Obispo" })).toHaveCount(0);

    // La selección sobrevive a la navegación (FR-AD-SCOPE-4).
    await page.getByRole("navigation", { name: "Navegación principal" })
      .getByRole("link", { name: "Cajas" })
      .click();
    await page.waitForURL(/\/admin\/cajas$/);
    await expect(page.locator("#admin-scope")).toHaveValue("sede-vedado");
  });

  test("un operador con más sedes ve más sedes, y siempre las suyas", async ({ page }) => {
    await signInAsAdmin(page, REINALDO);

    const filas = page.getByRole("table").getByRole("row");
    // Tres sedes de Caribe más la fila de encabezados.
    await expect(filas).toHaveCount(4);
    await expect(page.getByRole("table").getByText("PuntoCash Obispo")).toHaveCount(0);
  });

  test("con una sola sede la cabecera muestra su código y nombre, sin selector", async ({
    page,
  }) => {
    await signInAsAdmin(page, IDALMIS);

    /* **FR-AD-SCOPE-3**: no hay nada que elegir, así que no hay selector —ni el
       de escritorio ni el de la franja del teléfono— y la cabecera dice cuál
       es la sede por su código y su nombre. */
    await expect(page.locator("#admin-scope, #admin-scope-movil")).toHaveCount(0);
    await expect(
      page.getByRole("banner").getByText("CHB — PuntoCash Centro Habana"),
    ).toBeVisible();

    // Entra con normalidad y ve su sede.
    const tabla = page.getByRole("table");
    await expect(tabla.getByRole("link", { name: "PuntoCash Centro Habana" })).toHaveCount(1);
  });

  test("un mercante sin sedes entra y se le explica, sin métricas en cero", async ({ page }) => {
    await signInAsAdmin(page, LIUDMILA);

    await expect(page.getByText("Todavía no tienes sedes asignadas")).toBeVisible();
    // Ni tabla vacía ni selector que no elige nada.
    await expect(page.getByRole("table")).toHaveCount(0);
    await expect(page.locator("#admin-scope, #admin-scope-movil")).toHaveCount(0);
  });
});

test.describe("una sede ajena es indistinguible de una inexistente", () => {
  const MENSAJE = "No encontramos lo que buscabas";

  test("la sede de otro operador responde 404", async ({ page }) => {
    await signInAsAdmin(page, MARTA);

    // sede-matanzas la administra Caribe, no Antilla.
    const response = await page.goto("/admin/sedes/sede-matanzas");

    expect(response?.status()).toBe(404);
    await expect(page.getByText(MENSAJE)).toBeVisible();
  });

  test("una sede que no existe responde exactamente lo mismo", async ({ page }) => {
    await signInAsAdmin(page, MARTA);

    const response = await page.goto("/admin/sedes/sede-que-no-existe");

    expect(response?.status()).toBe(404);
    await expect(page.getByText(MENSAJE)).toBeVisible();
  });

  test("la sede propia sí se abre", async ({ page }) => {
    await signInAsAdmin(page, MARTA);

    await page.goto("/admin/sedes/sede-vedado");
    await expect(page.getByRole("heading", { name: "PuntoCash Vedado" })).toBeVisible();
    await expect(page.getByText(MENSAJE)).toHaveCount(0);
  });
});
