import { test, expect, type Locator } from "@playwright/test";

import { MARTA, signInAsAdmin, sinDesbordamientoHorizontal, submitCredentials, ADMIN_PASSWORD } from "./admin-helpers";

/**
 * `/admin` a los tres anchos que el FRD exige — **FR-AD-STATE-7** y
 * **FR-AD-STATE-8**.
 *
 * Hasta ahora esta comprobación no existía en ningún sitio: `admin-movil`
 * medía a 390px y solo en Inicio y en las dos pantallas de acceso, y las
 * cuatro del Paso 2 no se medían a ningún ancho de teléfono. Dar una pantalla
 * por terminada sin pasar por aquí es exactamente lo que el requisito prohíbe,
 * así que esto es la malla y no una prueba más.
 *
 * ── Por qué una prueba por ancho y no una por pantalla ────────────────────
 * El `viewport` se fija por archivo o por bloque, no por aserción, así que un
 * caso por pantalla y por ancho serían veintiuna pruebas con veintiún
 * accesos. Un recorrido por ancho hace tres accesos y mide lo mismo; lo que
 * se pierde es que el fallo diga en qué pantalla ocurrió, y eso se recupera
 * nombrándola en el mensaje de la aserción.
 */

const ANCHOS = [
  /* El más estrecho que **FR-AD-SHELL-6** nombra, y el que no se comprobaba.
     640 de alto es un teléfono pequeño de verdad, no una ventana recortada. */
  { nombre: "360px", width: 360, height: 640 },
  { nombre: "390px", width: 390, height: 844 },
  /* El de referencia del manual (§10). Sigue siendo donde más se trabaja. */
  { nombre: "1440px", width: 1440, height: 900 },
] as const;

/** Las pantallas construidas, dentro del shell. */
const DENTRO_DEL_SHELL = [
  { nombre: "Inicio", href: "/admin/inicio" },
  { nombre: "Sedes", href: "/admin/sedes" },
  { nombre: "Ficha de sede", href: "/admin/sedes/sede-vedado" },
  { nombre: "Cajas", href: "/admin/cajas" },
  { nombre: "Nueva caja", href: "/admin/cajas/nueva" },
  { nombre: "Equipos · Cajas", href: "/admin/equipos" },
  /* La otra pestaña es la misma pantalla con otro contenido, y a 360px lo que
     hay que medir es precisamente que la fila de pestañas no desborde. */
  { nombre: "Equipos · Kioscos", href: "/admin/equipos?pestana=kioscos" },
  /* Una pantalla de «en construcción» como representante de las que quedan:
     todas son el mismo componente, así que medirlas una por una no añadiría
     nada. */
  { nombre: "En construcción (Trabajadores)", href: "/admin/trabajadores" },
] as const;

for (const ancho of ANCHOS) {
  test.describe(`/admin a ${ancho.nombre}`, () => {
    test.use({ viewport: { width: ancho.width, height: ancho.height } });

    test("ninguna pantalla del shell se desborda de lado", async ({ page }) => {
      await signInAsAdmin(page, MARTA);

      for (const pantalla of DENTRO_DEL_SHELL) {
        await page.goto(pantalla.href);
        await expect(page.getByRole("main"), `${pantalla.nombre} no representó main`).toBeVisible();
        await sinDesbordamientoHorizontal(page, `${pantalla.nombre} a ${ancho.nombre}`);
      }
    });

    test("las dos pantallas de acceso tampoco", async ({ page }) => {
      await page.goto("/admin/login");
      await expect(page.getByRole("heading", { name: "Bienvenido" })).toBeVisible();
      await sinDesbordamientoHorizontal(page, `Acceso a ${ancho.nombre}`);

      // El paso 2 solo existe tras unas credenciales correctas.
      await submitCredentials(page, MARTA, ADMIN_PASSWORD);
      await page.waitForURL(/\/admin\/verificacion$/);
      await expect(page.getByRole("heading", { name: "Verifica que eres tú" })).toBeVisible();
      await sinDesbordamientoHorizontal(page, `Verificación a ${ancho.nombre}`);
    });
  });
}

/* -------------------------------------------------------------------------
 * Lo que solo se puede comprobar en el ancho más estrecho
 * ---------------------------------------------------------------------- */

/** Alto mínimo de un control táctil (**FR-AD-SHELL-14**): 44px. */
const ALTO_TACTIL_MINIMO = 44;

/**
 * El localizador llega ya resuelto, así que no hace falta la página: medir es
 * cosa del propio localizador. Devuelve el alto en vez de aseverarlo para que
 * cada llamada ponga su propio mensaje de fallo, que es lo que dice en qué
 * control está el problema.
 */
async function altoDe(descripcion: string, locator: Locator): Promise<number> {
  const caja = await locator.boundingBox();
  expect(caja, `${descripcion} no tiene caja medible`).not.toBeNull();
  return caja!.height;
}

test.describe("a 360px, los controles se pueden pulsar", () => {
  test.use({ viewport: { width: 360, height: 640 } });

  test("la barra inferior y la franja de alcance respetan los 44px", async ({ page }) => {
    await signInAsAdmin(page, MARTA);

    const rapida = page.getByRole("navigation", { name: "Navegación rápida" });

    for (const destino of ["Inicio", "Jornadas", "Aprobaciones"]) {
      const alto = await altoDe(destino, rapida.getByRole("link", { name: destino }));
      expect(alto, `${destino} en la barra inferior`).toBeGreaterThanOrEqual(ALTO_TACTIL_MINIMO);
    }

    const altoMas = await altoDe("Más", rapida.getByRole("button", { name: /Más/ }));
    expect(altoMas, "«Más» en la barra inferior").toBeGreaterThanOrEqual(ALTO_TACTIL_MINIMO);

    const altoAlcance = await altoDe("selector de alcance", page.locator("#admin-scope-movil"));
    expect(altoAlcance, "selector de alcance del teléfono").toBeGreaterThanOrEqual(
      ALTO_TACTIL_MINIMO,
    );
  });

  test("un diálogo de confirmación es legible y accionable", async ({ page }) => {
    await signInAsAdmin(page, MARTA);
    await page.goto("/admin/cajas");
    await expect(page.getByRole("main")).toBeVisible();

    /* A 360px la tabla de cajas **no es una tabla**: cada fila se representa
       como una tarjeta (**FR-AD-SHELL-13**). El `<table>` de escritorio existe
       en el marcado pero está oculto, así que buscar su botón por `row` espera
       a un elemento que no llega a ser visible nunca — es exactamente el error
       que esta prueba cometió la primera vez, y la razón de este comentario.

       Se busca una caja **con equipo vinculado**: su diálogo lleva el aviso
       además del motivo, que es el caso más alto que **FR-AD-SHELL-16**
       contempla y por tanto el que hay que medir. Se filtra por el dato en vez
       de confiar en el orden de las sedes, que depende del alcance de quien
       entra. El dominio rechaza esa retirada, de modo que abrir y cancelar no
       cambia nada para nadie. */
    const tarjeta = page
      .getByRole("article")
      .filter({ hasText: "Caja 01" })
      .filter({ hasNotText: "Sin equipo vinculado" })
      .first();
    await expect(tarjeta, "ninguna «Caja 01» del alcance tiene equipo vinculado").toBeVisible();
    await tarjeta.getByRole("button", { name: "Retirar" }).click();

    const dialogo = page.getByRole("dialog");
    await expect(dialogo).toBeVisible();

    // Cabe de lado: el diálogo no llega a los bordes de la pantalla.
    await sinDesbordamientoHorizontal(page, "diálogo de retirada a 360px");
    const caja = await dialogo.boundingBox();
    expect(caja).not.toBeNull();
    expect(caja!.x, "margen lateral izquierdo del diálogo").toBeGreaterThan(0);
    expect(caja!.x + caja!.width, "margen lateral derecho del diálogo").toBeLessThan(360);

    /* Y de alto. `DialogContent` se limita a `100dvh-2rem` con desplazamiento
       propio, así que el diálogo siempre cabe; lo que puede quedar fuera es su
       contenido. Las dos aserciones van separadas para que el fallo diga cuál
       de las dos cosas se rompió. */
    expect(caja!.y, "borde superior del diálogo").toBeGreaterThanOrEqual(0);
    expect(caja!.y + caja!.height, "el diálogo no cabe de alto en la pantalla").toBeLessThanOrEqual(
      640,
    );

    /* Las acciones **apiladas**: la secundaria arriba y la que decide abajo, en
       el orden del marcado. Si estuvieran en fila, las dos compartirían la
       misma línea y sus `y` coincidirían. */
    const cancelar = await dialogo.getByRole("button", { name: "Cancelar" }).boundingBox();
    const retirar = await dialogo.getByRole("button", { name: "Retirar caja" }).boundingBox();
    expect(cancelar).not.toBeNull();
    expect(retirar).not.toBeNull();
    expect(retirar!.y, "la acción primaria debe quedar debajo de la secundaria").toBeGreaterThan(
      cancelar!.y + cancelar!.height - 1,
    );

    /* Y alcanzable **sin desplazar**, que es la parte de **FR-AD-SHELL-16**
       que de verdad se puede incumplir: el diálogo cabe siempre, pero si su
       contenido crece más que su alto máximo, la acción que decide queda
       debajo del borde y hay que desplazar dentro del diálogo para llegar. */
    expect(
      retirar!.y + retirar!.height,
      "la acción primaria queda fuera de la pantalla: hay que desplazar el diálogo para llegar a ella (FR-AD-SHELL-16)",
    ).toBeLessThanOrEqual(640);

    await dialogo.getByRole("button", { name: "Cancelar" }).click();
    await expect(dialogo).toBeHidden();
  });
});
