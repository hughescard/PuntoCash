import { test, expect } from "@playwright/test";

import { ADMIN_PASSWORD, DEMO_CODE, MARTA, signInAsAdmin, sinDesbordamientoHorizontal } from "./admin-helpers";

/**
 * La consola de administración en un teléfono — **FR-AD-SHELL-6**.
 *
 * No es una comprobación de aspecto: es que la consola siga siendo **usable**
 * donde más se usa. Tres cosas se vigilan aquí, y las tres se rompen en
 * silencio si nadie las mira:
 *
 *   · Que no haya **desplazamiento horizontal**. Es el síntoma de que algo se
 *     diseñó pensando en 1440 y nadie volvió a mirarlo.
 *   · Que **todos los destinos sigan alcanzables**. La barra inferior lleva
 *     tres más «Más» (**FR-AD-SHELL-9**, enmendado en v4.1 tras medir el ancho
 *     a 375px); los trece tienen que estar en el cajón, o la consola ofrecería
 *     menos según el tamaño de la pantalla.
 *   · Que el **alcance** se pueda elegir. Sin él, un mercante con varias sedes
 *     no puede hacer nada desde el móvil.
 */

/** Un teléfono corriente, no el más pequeño: ese es el caso de 360px de abajo. */
test.use({ viewport: { width: 390, height: 844 } });

test.describe("navegación", () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page, MARTA);
  });

  test("la barra lateral desaparece y la navegación baja al pulgar", async ({ page }) => {
    // La columna de 240px no se representa: a este ancho no hay dónde ponerla.
    await expect(page.getByRole("navigation", { name: "Navegación principal" })).toHaveCount(0);

    const rapida = page.getByRole("navigation", { name: "Navegación rápida" });
    await expect(rapida).toBeVisible();

    // Sin `exact`: un destino con indicador lleva el número dentro del enlace.
    for (const destino of ["Inicio", "Jornadas", "Aprobaciones"]) {
      await expect(rapida.getByRole("link", { name: destino })).toHaveCount(1);
    }
    await expect(rapida.getByRole("button", { name: "Más" })).toBeVisible();

    // Cajas vive en el cajón: con tres destinos más "Más" las etiquetas caben
    // enteras, que es lo que no ocurría con cuatro.
    await expect(rapida.getByRole("link", { name: "Cajas" })).toHaveCount(0);
  });

  test("«Más» abre el cajón con los trece destinos y sus tres bloques", async ({ page }) => {
    await page.getByRole("button", { name: "Más" }).click();

    const cajon = page.getByRole("navigation", { name: "Navegación principal" });
    await expect(cajon).toBeVisible();

    for (const bloque of ["Operación", "Sucursal", "Configuración"]) {
      await expect(cajon.getByText(bloque, { exact: true })).toBeVisible();
    }

    const destinos = [
      "Inicio", "Jornadas", "Aprobaciones", "Operaciones",
      "Sedes", "Cajas", "Equipos", "Trabajadores", "Usuarios",
      "Monedas", "Tasas", "Promociones", "Reportes",
    ];
    for (const destino of destinos) {
      await expect(cajon.getByRole("link", { name: destino })).toHaveCount(1);
    }
  });

  test("elegir un destino del cajón navega y lo cierra", async ({ page }) => {
    await page.getByRole("button", { name: "Más" }).click();

    await page
      .getByRole("navigation", { name: "Navegación principal" })
      .getByRole("link", { name: "Tasas" })
      .click();

    await page.waitForURL(/\/admin\/tasas$/);
    // Dejarlo abierto encima de la pantalla recién cargada obliga a un gesto
    // que nadie pidió.
    await expect(page.getByRole("navigation", { name: "Navegación principal" })).toHaveCount(0);
  });

  test("el cierre de sesión vive en el cajón y funciona", async ({ page }) => {
    await page.getByRole("button", { name: "Más" }).click();
    await page.getByRole("button", { name: "Cerrar sesión" }).click();

    await page.waitForURL(/\/admin\/login$/);
    await page.goto("/admin/inicio");
    await expect(page).toHaveURL(/\/admin\/login$/);
  });
});

test.describe("contenido", () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page, MARTA);
  });

  test("el alcance se elige desde su propia franja y filtra", async ({ page }) => {
    // Por identificador: la cabecera tiene su gemelo oculto a este ancho.
    const selector = page.locator("#admin-scope-movil");
    await expect(selector).toBeVisible();

    await selector.selectOption("sede-vedado");
    await expect(page.getByText("Estás viendo PuntoCash Vedado.")).toBeVisible();
    await expect(selector).toHaveValue("sede-vedado");
  });

  test("la tabla por sede se representa como tarjetas, no como tabla", async ({ page }) => {
    // Cinco columnas no caben en 390px; desplazar de lado es lo que nadie
    // descubre con el teléfono en la mano.
    await expect(page.getByRole("table")).toHaveCount(0);

    // Los mismos datos siguen ahí, con su etiqueta al lado.
    await expect(page.getByRole("link", { name: "PuntoCash Vedado" })).toBeVisible();
    await expect(page.getByText("Cajas activas").first()).toBeVisible();
  });

  test("ninguna etiqueta de la barra inferior se sale de su hueco", async ({ page }) => {
    /* Es la comprobación que faltaba: "Aprobaciones" cabía por un pelo con
       cuatro destinos y se solapaba con "Jornadas" en un teléfono algo más
       estrecho. Se mide, no se mira. */
    const desbordes = await page.evaluate(() => {
      const nav = document.querySelector('nav[aria-label="Navegación rápida"]');
      if (!nav) return ["no hay barra inferior"];

      return [...nav.children].flatMap((item) => {
        const etiqueta = item.querySelector("span:last-child");
        if (!etiqueta) return [];
        const hueco = item.getBoundingClientRect();
        const texto = etiqueta.getBoundingClientRect();
        return texto.left < hueco.left || texto.right > hueco.right
          ? [`${etiqueta.textContent ?? ""} se sale de su hueco`]
          : [];
      });
    });

    expect(desbordes).toEqual([]);
  });

  test("Inicio no se desborda de lado", async ({ page }) => {
    await expect(page.getByRole("main")).toBeVisible();
    await sinDesbordamientoHorizontal(page);
  });
});

test.describe("acceso", () => {
  test("la pantalla de credenciales cabe y no se desborda", async ({ page }) => {
    await page.goto("/admin/login");
    await expect(page.getByRole("heading", { name: "Bienvenido" })).toBeVisible();

    /* El panel de marca se retira: a este ancho quitaría sitio al trabajo.
       Se comprueba que esté OCULTO, no que no exista: `getByText` encuentra
       también lo que está en el DOM con `display: none`, así que `toHaveCount(0)`
       preguntaba lo que no era. */
    await expect(page.getByText("bajo control, en un solo lugar.")).toBeHidden();
    await sinDesbordamientoHorizontal(page);
  });

  test("las seis casillas del código caben sin desbordar", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Usuario o correo electrónico").fill(MARTA);
    await page.getByLabel("Contraseña", { exact: true }).fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Iniciar sesión" }).click();

    await page.waitForURL(/\/admin\/verificacion$/);
    await expect(page.getByLabel("Código de verificación")).toBeVisible();
    await sinDesbordamientoHorizontal(page);

    // Y el trámite se completa igual desde el teléfono.
    await page.getByLabel("Código de verificación").fill(DEMO_CODE);
    await page.waitForURL(/\/admin\/inicio$/);
  });
});
