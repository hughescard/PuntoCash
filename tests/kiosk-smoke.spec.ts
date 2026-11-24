import { test, expect } from "@playwright/test";
import { sinDesbordamientoHorizontal } from "./admin-helpers";

/**
 * Humo de las rutas de `/kiosk` — que todas responden, que cada una
 * presenta la pantalla que le toca, y que la decisión de vínculo la toma el
 * **servidor**.
 *
 * ── Por qué hacía falta ───────────────────────────────────────────────────
 * La Fase 2 se entregó sin una sola prueba de kiosco: la suite cubre
 * `/worker` y `/admin`, y los flujos de autoservicio solo se habían
 * recorrido a mano. Una ruta que deja de compilar, un `h1` que desaparece o
 * un gate que se traga el catálogo no los veía nadie hasta abrir el
 * navegador. Esto no pretende recorrer los flujos —cada uno merece su propio
 * archivo—, sino dejar de dar por buenas sus rutas sin comprobarlas.
 *
 * ── Qué comprueba de verdad ───────────────────────────────────────────────
 * Lo importante no es que el `h1` esté visible —eso lo vería cualquier
 * aserción— sino **quién lo decidió**. Un gate que decide en el cliente
 * también acaba mostrando la pantalla correcta, solo que un fotograma más
 * tarde y respondiendo 200 a rutas que no existen. Así que cada bloque empieza pidiendo el HTML del
 * servidor con `page.request`, sin ejecutar nada en la página: lo que ahí
 * venga es, por construcción, lo que decidió el servidor.
 */

/** Las siete pantallas tras el gate, con el `h1` que presenta cada una. */
const AUTOSERVICIO = [
  { href: "/kiosk/autoservicio", titulo: "¿Qué deseas hacer hoy?" },
  { href: "/kiosk/autoservicio/cambio-moneda", titulo: "Cambio de moneda" },
  { href: "/kiosk/autoservicio/giros", titulo: "Giros" },
  { href: "/kiosk/autoservicio/giros/cobrar", titulo: "Cobrar giro" },
  { href: "/kiosk/autoservicio/giros/enviar", titulo: "Enviar giro" },
  { href: "/kiosk/autoservicio/remesas", titulo: "Cobrar remesa" },
  { href: "/kiosk/autoservicio/tasas", titulo: "Tasas del día" },
] as const;

const VINCULACION = "Vincula este kiosco a su sede";

/* -------------------------------------------------------------------------
 * Sin vínculo — el estado con el que arranca un kiosco recién instalado
 *
 * Un navegador limpio no tiene la cookie del kiosco, así que tal como llega es
 * un kiosco sin vincular.
 * ---------------------------------------------------------------------- */

test.describe("un kiosco sin vincular", () => {
  test("el servidor manda la pantalla de vinculación, no el catálogo", async ({ page }) => {
    /* Sin navegar: `page.request` comparte las cookies del contexto pero no
       ejecuta la página, así que esto es exactamente lo que el servidor
       decidió (FR-DEV-1.1, FR-AS-LINK-1). */
    const respuesta = await page.request.get("/kiosk/autoservicio/cambio-moneda");
    expect(respuesta.status(), "el servidor no respondió 200").toBe(200);

    const html = await respuesta.text();
    expect(html, "la pantalla de vinculación no venía en el HTML del servidor").toContain(VINCULACION);
    expect(html, "el flujo se mandó a un kiosco sin vincular").not.toContain("Elige las monedas y el monto");
  });

  test("ninguna de las siete pantallas llega a representarse", async ({ page }) => {
    for (const pantalla of AUTOSERVICIO) {
      await page.goto(pantalla.href);
      await expect(
        page.getByRole("heading", { name: VINCULACION, level: 1 }),
        `${pantalla.href} no mostró la pantalla de vinculación`,
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: pantalla.titulo, level: 1 }),
        `${pantalla.href} se representó sin vínculo`,
      ).toHaveCount(0);
    }
  });

  test("la cabecera no nombra ninguna sede ni ofrece volver al catálogo", async ({ page }) => {
    await page.goto("/kiosk/autoservicio");
    const cabecera = page.getByRole("banner");

    await expect(cabecera, "la cabecera de marca siempre está").toBeVisible();
    await expect(
      cabecera.getByRole("link", { name: "Inicio" }),
      "no hay catálogo al que volver mientras el kiosco no pertenece a una sede",
    ).toHaveCount(0);
    await expect(cabecera.getByText("PuntoCash Vedado")).toHaveCount(0);
  });
});

/* -------------------------------------------------------------------------
 * Vinculado — un kiosco de sala, que es como está el 100 % del tiempo útil
 * ---------------------------------------------------------------------- */

/**
 * Un kiosco que la red ya tiene vinculado: el de la entrada de **PuntoCash
 * Vedado**, la sede con datos completos que usa el resto de la suite. El
 * navegador solo guarda su identificador; a qué sede pertenece lo contesta la
 * red, igual que con las cajas de Worker.
 */
const KIOSCO_VINCULADO = "KIO-0001-0001";

test.describe("un kiosco vinculado a su sede", () => {
  test.use({
    storageState: {
      cookies: [
        {
          name: "pc_kiosco_device",
          value: KIOSCO_VINCULADO,
          domain: "localhost",
          path: "/kiosk/autoservicio",
          expires: -1,
          httpOnly: true,
          secure: false,
          sameSite: "Lax" as const,
        },
      ],
      origins: [],
    },
  });

  test("el servidor manda el catálogo, no la pantalla de vinculación", async ({ page }) => {
    const respuesta = await page.request.get("/kiosk/autoservicio");
    expect(respuesta.status()).toBe(200);

    const html = await respuesta.text();
    expect(html, "el catálogo no venía en el HTML del servidor").toContain("¿Qué deseas hacer hoy?");
    expect(html, "un kiosco vinculado pasó por la pantalla de vinculación").not.toContain(VINCULACION);
  });

  test("las siete pantallas responden y presentan su título", async ({ page }) => {
    for (const pantalla of AUTOSERVICIO) {
      await page.goto(pantalla.href);
      await expect(
        page.getByRole("heading", { name: pantalla.titulo, level: 1 }),
        `${pantalla.href} no presentó «${pantalla.titulo}»`,
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: VINCULACION, level: 1 }),
        `${pantalla.href} cayó en la pantalla de vinculación`,
      ).toHaveCount(0);
    }
  });

  test("la cabecera nombra la sede y ofrece volver al catálogo", async ({ page }) => {
    await page.goto("/kiosk/autoservicio/giros/enviar");
    const cabecera = page.getByRole("banner");

    /* El cliente tiene que saber en qué sede honrarán su código, y tener
       siempre una salida al inicio (§10 del manual, Autoservicio FRD §1.2). */
    await expect(cabecera.getByText("PuntoCash Vedado")).toBeVisible();
    await expect(cabecera.getByRole("link", { name: "Inicio" })).toBeVisible();
  });

  test("las pantallas del autoservicio no desbordan a 1280 ni a 1440", async ({ page }) => {
    for (const ancho of [1280, 1440]) {
      await page.setViewportSize({ width: ancho, height: 900 });
      for (const pantalla of AUTOSERVICIO) {
        await page.goto(pantalla.href);
        await expect(page.getByRole("heading", { name: pantalla.titulo, level: 1 })).toBeVisible();
        await sinDesbordamientoHorizontal(page, `${pantalla.href} a ${ancho}px`);
      }
    }
  });

  test("al seguir con errores va al primer campo; al cambiar de paso, vuelve arriba", async ({ page }) => {
    await page.goto("/kiosk/autoservicio/giros/enviar");
    const main = page.getByRole("main");
    const documento = page.getByRole("textbox", { name: "Número de documento" });
    const continuar = page.getByRole("button", { name: "Continuar", exact: true });
    const alFondo = () => main.evaluate((el) => (el.scrollTop = el.scrollHeight));

    /* El formulario vacío: la vista va al primer campo con error, no se queda
       donde estaba el botón. Se reintenta hasta que la pantalla hidrata. */
    await expect(async () => {
      await alFondo();
      await continuar.click();
      await expect(documento).toBeFocused({ timeout: 1_000 });
    }).toPass();
    await expect(documento).toHaveAttribute("aria-invalid", "true");
    await expect(documento).toBeInViewport();

    /* Con todo rellenado, el paso siguiente empieza arriba, con el foco en el
       título. */
    await documento.fill("90010112345");
    await page.getByRole("textbox", { name: "Nombre" }).fill("Carlos");
    await page.getByRole("textbox", { name: "Primer apellido" }).fill("Pérez");
    await page.getByRole("textbox", { name: "Teléfono" }).fill("+53 5 123 4567");
    await alFondo();
    await continuar.click();
    await expect(page.getByRole("heading", { name: "¿Quién va a cobrar este giro?" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Enviar giro", level: 1 })).toBeFocused();
    expect(await main.evaluate((el) => el.scrollTop)).toBe(0);
  });
});

/* -------------------------------------------------------------------------
 * La ruta que no pasa por el gate
 * ---------------------------------------------------------------------- */

test.describe("pantalla informativa", () => {
  /**
   * `/kiosk/pantalla` no tiene sesión de dispositivo: solo muestra
   * información pública, así que quien la instala elige la sede y nadie la
   * vincula (`signage-branch.ts`). Un navegador limpio no tiene sede
   * elegida, de modo que lo que toca ver es el selector.
   *
   * Aquí no hay HTML de servidor que comprobar, y es correcto que no lo
   * haya: la elección vive solo en el equipo, así que la pantalla no
   * representa nada hasta hidratar en vez de parpadear el selector sobre un
   * televisor que ya tiene su sede.
   */
  test("la pantalla sin configurar pide su sede", async ({ page }) => {
    await page.goto("/kiosk/pantalla");
    await expect(
      page.getByRole("heading", { name: "¿En qué sede está esta pantalla?", level: 1 }),
    ).toBeVisible();
    await expect(page.getByRole("searchbox", { name: "Buscar sede" })).toBeVisible();
  });

  /** La sede que eligió quien instaló la pantalla: lo único que guarda el equipo. */
  async function conSede(page: import("@playwright/test").Page, sedeId: string): Promise<void> {
    await page.addInitScript((id) => window.localStorage.setItem("puntocash.kiosk.pantalla.sede", id), sedeId);
  }

  test("con su sede, anuncia sus tasas", async ({ page }) => {
    await conSede(page, "sede-vedado");
    await page.goto("/kiosk/pantalla");
    await expect(page.getByRole("heading", { name: "Tasas del día" })).toBeVisible();
  });

  test("una sede que no atiende no anuncia tasas ni promociones", async ({ page }) => {
    /* Trinidad está suspendida en los datos de muestra. */
    await conSede(page, "sede-trinidad");
    await page.goto("/kiosk/pantalla");
    await expect(page.getByRole("heading", { name: "En este momento no estamos atendiendo" })).toBeVisible();
    await expect(page.getByText("PuntoCash Trinidad")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Tasas del día" })).toBeHidden();
  });

  test("si su sede ya no existe, vuelve el selector y dice por qué", async ({ page }) => {
    await conSede(page, "sede-que-ya-no-existe");
    await page.goto("/kiosk/pantalla");
    await expect(page.getByRole("heading", { name: "¿En qué sede está esta pantalla?", level: 1 })).toBeVisible();
    await expect(page.getByText("La sede que mostraba esta pantalla ya no está disponible. Elige otra.")).toBeVisible();
  });
});
