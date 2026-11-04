import { expect, test, type Page } from "@playwright/test";

import { sinDesbordamientoHorizontal } from "./admin-helpers";
import { signInAsSuperAdmin } from "./super-admin-helpers";

/**
 * Promociones de red.
 *
 * Las comprobaciones de lectura usan las promociones sembradas. La que escribe
 * (crear, ver el aviso de saturación y retirar) lo hace en Santiago, que no
 * tiene operador y por tanto ninguna promoción de un mercante, y se limpia al
 * terminar: retira lo que crea aunque la prueba falle a medias.
 */

test.beforeEach(async ({ page }) => {
  await signInAsSuperAdmin(page);
});

test("lista las de red por estado, y las de los operadores no están", async ({ page }) => {
  await page.goto("/super-admin/promociones");
  const main = page.getByRole("main");
  const tabla = main.getByRole("table");

  await expect(main.getByRole("link", { name: "Envía un giro a cualquier provincia" })).toBeVisible();
  await expect(tabla.getByRole("row").filter({ hasText: "Envía un giro a cualquier provincia" })).toContainText("Toda la red");
  /* Una dirigida a tres sedes dice a cuáles. */
  const oriente = tabla.getByRole("row").filter({ hasText: "Tu remesa llega a Oriente hoy" });
  await expect(oriente).toContainText("Santiago, Holguín, Camagüey");
  /* La de un mercante no es de esta consola. */
  await expect(main.getByRole("link", { name: "Cobra tu remesa sin filas" })).toHaveCount(0);

  await main.getByRole("link", { name: /^Programadas/ }).click();
  await page.waitForURL(/pestana=programadas/);
  await expect(main.getByRole("link", { name: "Nuevo horario de fin de año" })).toBeVisible({ timeout: 30_000 });
});

test("la de un operador se lee, dice de quién es y no ofrece tocarla", async ({ page }) => {
  await page.goto("/super-admin/promociones/promo-malecon-remesas");
  const main = page.getByRole("main");
  await expect(main.getByText("Esta promoción la publica Malecón Servicios Financieros S.R.L.")).toBeVisible();
  await expect(main.getByText(/la gobierna el administrador de ese operador/)).toBeVisible();
  await expect(main.locator("input, textarea")).toHaveCount(0);
  await expect(main.getByRole("button", { name: "Retirar" })).toHaveCount(0);
});

test("la de red dice que el mercante no podrá cambiarla y ofrece marcar sedes por operador y provincia", async ({ page }) => {
  await page.goto("/super-admin/promociones/nueva");
  const main = page.getByRole("main");

  /* **FR-SA-PROM-4**: quien la publica sabe que no se podrá quitar de la sala. */
  await expect(main.getByText("Solo PuntoCash puede cambiarla o retirarla")).toBeVisible();
  await expect(main.getByLabel(/^Título/)).toHaveAttribute("maxlength", "40");

  /* Por defecto, toda la red, y sin lista de sedes. */
  await expect(main.getByRole("radio", { name: /^Toda la red/ })).toBeChecked();
  await expect(main.getByRole("checkbox")).toHaveCount(0);

  await main.getByRole("radio", { name: /^Solo las sedes que elija/ }).check();
  const santiago = main.getByRole("checkbox", { name: /^PuntoCash Santiago/ });
  await expect(santiago).not.toBeChecked();

  /* Los atajos marcan sedes; no son una regla. */
  await main.getByLabel("Marcar las sedes de una provincia").selectOption("Santiago de Cuba");
  await expect(santiago).toBeChecked();
  await expect(main.getByRole("checkbox", { name: /^PuntoCash Vedado/ })).not.toBeChecked();

  await main.getByLabel("Marcar las sedes de un operador").selectOption({ label: "Caribe Cambios S.A." });
  await expect(main.getByRole("checkbox", { name: /^PuntoCash Miramar/ })).toBeChecked();
  /* Marcar es sumar: lo ya marcado se queda. */
  await expect(santiago).toBeChecked();

  await main.getByRole("button", { name: "Quitar todas" }).click();
  await expect(main.getByRole("checkbox", { checked: true })).toHaveCount(0);
  await expect(main.getByText(/^0 de \d+ marcadas$/)).toBeVisible();
});

test("sin sedes marcadas no se publica, y lo escrito se conserva", async ({ page }) => {
  await page.goto("/super-admin/promociones/nueva");
  const main = page.getByRole("main");
  await main.getByLabel(/^Título/).fill("Sin destino");
  await main.getByLabel(/^Texto/).fill("No debería llegar a ninguna sala.");
  await main.getByRole("radio", { name: /^Solo las sedes que elija/ }).check();
  const hoy = await main.getByLabel(/^Desde/).inputValue();
  await main.getByLabel(/^Hasta/).fill(hoy);
  await main.getByRole("button", { name: "Publicar promoción" }).click();

  await expect(main.getByText("Elige al menos una sede, o marca toda la red.")).toBeVisible();
  await expect(main.getByLabel(/^Título/)).toHaveValue("Sin destino");
  await expect(main.getByRole("radio", { name: /^Solo las sedes que elija/ })).toBeChecked();
});

test("publicar, ver cuántas coinciden y de quién son, y retirar", async ({ page }) => {
  test.setTimeout(150_000);
  const ids: string[] = [];
  const marca = Date.now() % 100000;

  try {
    for (const n of [1, 2, 3]) {
      ids.push(await publicarEnSantiago(page, `Prueba ${marca}-${n}`));
    }

    /* Con tres propias y las dos de red que ya llegan a Santiago, son cinco. */
    await page.goto("/super-admin/promociones");
    const main = page.getByRole("main");
    const aviso = main.getByText(/PuntoCash Santiago tiene \d+ promociones en pantalla a la vez \(/);
    await expect(aviso).toBeVisible();
    await expect(aviso).toContainText("de PuntoCash");

    /* Y al preparar otra para Santiago, el formulario avisa antes de publicar. */
    await page.goto("/super-admin/promociones/nueva");
    await main.getByRole("radio", { name: /^Solo las sedes que elija/ }).check();
    await main.getByRole("checkbox", { name: /^PuntoCash Santiago/ }).check();
    const hoy = await main.getByLabel(/^Desde/).inputValue();
    await main.getByLabel(/^Hasta/).fill(hoy);
    await expect(main.getByText("Demasiadas promociones a la vez")).toBeVisible();
    await expect(main.getByText(/En PuntoCash Santiago coincidiría con \d+ más \(\d+ de PuntoCash/)).toBeVisible();

    /* Una vigente se abre para editar, con su inicio fijo y «Retirar» arriba. */
    await page.goto(`/super-admin/promociones/${ids[0]}`);
    await expect(main.getByRole("heading", { name: "Editar promoción de red" })).toBeVisible();
    await expect(main.getByLabel(/^Desde/)).toHaveAttribute("readonly", "");
    await expect(main.getByRole("radio", { name: /^Solo las sedes que elija/ })).toBeChecked();
    await expect(main.getByRole("checkbox", { name: /^PuntoCash Santiago/ })).toBeChecked();
  } finally {
    for (const id of ids) await retirar(page, id);
  }

  /* Retirar no borra: pasa a Vencidas con su fecha. */
  await page.goto("/super-admin/promociones?pestana=vencidas");
  const main = page.getByRole("main");
  await expect(main.getByRole("link", { name: `Prueba ${marca}-1` })).toBeVisible();
  /* Al ancho de la prueba el listado es tabla; la tarjeta queda oculta. */
  await expect(main.getByRole("table").getByText(/Retirada el /).first()).toBeVisible();
});

async function publicarEnSantiago(page: Page, titulo: string): Promise<string> {
  await page.goto("/super-admin/promociones/nueva");
  const main = page.getByRole("main");
  await main.getByLabel(/^Título/).fill(titulo);
  await main.getByLabel(/^Texto/).fill("Solo para comprobar el aviso de saturación.");
  await main.getByRole("radio", { name: /^Solo las sedes que elija/ }).check();
  await main.getByRole("checkbox", { name: /^PuntoCash Santiago/ }).check();
  const hoy = await main.getByLabel(/^Desde/).inputValue();
  await main.getByLabel(/^Hasta/).fill(hoy);
  await main.getByRole("button", { name: "Publicar promoción" }).click();
  await expect(main.getByText("Promoción guardada")).toBeVisible();
  const id = new URL(page.url()).searchParams.get("guardada");
  expect(id).toBeTruthy();
  return id!;
}

async function retirar(page: Page, id: string): Promise<void> {
  await page.goto(`/super-admin/promociones/${id}`);
  const main = page.getByRole("main");
  await main.getByRole("button", { name: "Retirar" }).click();
  const dialogo = page.getByRole("dialog");
  /* Sin motivo no se retira. */
  await dialogo.getByRole("button", { name: "Retirar la promoción" }).click();
  await expect(dialogo.getByText(/Escribe el motivo/)).toBeVisible();
  await dialogo.getByLabel(/^Motivo/).fill("Prueba automática: la campaña se suspende");
  await dialogo.getByRole("button", { name: "Retirar la promoción" }).click();
  await expect(main.getByText("Promoción retirada")).toBeVisible();
}

/* 1280 es el ancho de escritorio mínimo que soporta el producto y el más
   estrecho en el que el listado todavía es tabla: es donde aprieta. */
for (const width of [1280, 1024, 768, 390]) {
  test(`a ${width}px el listado, el alta y la edición no desbordan`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const ruta of ["/super-admin/promociones", "/super-admin/promociones?pestana=programadas"]) {
      await page.goto(ruta);
      await expect(page.getByRole("main")).toBeVisible();
      await sinDesbordamientoHorizontal(page, ruta);
    }

    /* El alta con la lista de sedes abierta es la pantalla más ancha de contenido. */
    await page.goto("/super-admin/promociones/nueva");
    await page.getByRole("radio", { name: /^Solo las sedes que elija/ }).check();
    await expect(page.getByRole("checkbox", { name: /^PuntoCash Vedado/ })).toBeVisible();
    await sinDesbordamientoHorizontal(page, "el alta");

    await page.goto("/super-admin/promociones/promo-red-oriente");
    await expect(page.getByRole("heading", { name: "Editar promoción de red" })).toBeVisible();
    await sinDesbordamientoHorizontal(page, "la edición");

    await page.goto("/super-admin/promociones/promo-malecon-remesas");
    await expect(page.getByRole("main")).toBeVisible();
    await sinDesbordamientoHorizontal(page, "la ficha de una de operador");
  });
}
