import { test, expect } from "@playwright/test";

/**
 * Humo de las nueve rutas de `/kiosk` — que todas responden, que cada una
 * presenta la pantalla que le toca, y que la decisión de vínculo la toma el
 * **servidor**.
 *
 * ── Por qué hacía falta ───────────────────────────────────────────────────
 * La Fase 2 se entregó sin una sola prueba de kiosco: la suite cubre
 * `/worker` y `/admin`, y los flujos de autoservicio solo se habían
 * recorrido a mano. Una ruta que deja de compilar, un `h1` que desaparece o
 * un gate que se traga el catálogo no los veía nadie hasta abrir el
 * navegador. Esto no pretende recorrer los flujos —cada uno merece su propio
 * archivo—, sino dejar de dar por buenas nueve rutas sin comprobarlas.
 *
 * ── Qué comprueba de verdad ───────────────────────────────────────────────
 * Lo importante no es que el `h1` esté visible —eso lo vería cualquier
 * aserción— sino **quién lo decidió**. Un gate que decide en el cliente
 * también acaba mostrando la pantalla correcta, solo que un fotograma más
 * tarde y respondiendo 200 a rutas que no existen (`device-cookie.ts`
 * explica el precio). Así que cada bloque empieza pidiendo el HTML del
 * servidor con `page.request`, sin ejecutar nada en la página: lo que ahí
 * venga es, por construcción, lo que decidió el servidor.
 */

const BASE_URL = "http://localhost:3000";

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
 * El `storageState` de `playwright.config.ts` siembra el equipo de **caja**,
 * no el de kiosco, así que este bloque no necesita desactivar nada: tal como
 * llega, el navegador es un kiosco sin vincular.
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
 * El vínculo que el administrador habría hecho desde su panel. Apunta a
 * **PuntoCash Vedado** porque es la sede con datos simulados completos, la
 * misma que usa el resto de la suite.
 *
 * Un kiosco no lleva `registerId`: pertenece a la sede, no a un mostrador
 * (`device-link.ts`). El vínculo se siembra en los **dos** sitios que deben
 * contar lo mismo —`localStorage`, fuente de verdad del terminal, y la cookie
 * espejo, que es lo que lee el layout del servidor—; sembrar uno solo dejaría
 * al servidor y al cliente en desacuerdo.
 */
const KIOSCO_VINCULADO = {
  status: "linked",
  deviceId: "KIO-9000-0001",
  branchId: "sede-vedado",
  linkedAt: "2026-09-01T08:00:00.000Z",
  linkMethod: "codigo",
};

test.describe("un kiosco vinculado a su sede", () => {
  test.use({
    storageState: {
      cookies: [
        {
          name: "pc_kiosk_device",
          value: encodeURIComponent(
            JSON.stringify({
              deviceId: KIOSCO_VINCULADO.deviceId,
              branchId: KIOSCO_VINCULADO.branchId,
            }),
          ),
          domain: "localhost",
          path: "/",
          expires: -1,
          httpOnly: false,
          secure: false,
          sameSite: "Lax" as const,
        },
      ],
      origins: [
        {
          origin: BASE_URL,
          localStorage: [
            { name: "puntocash.kiosk.device", value: JSON.stringify(KIOSCO_VINCULADO) },
          ],
        },
      ],
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
});

/* -------------------------------------------------------------------------
 * Las dos rutas que no pasan por el gate
 * ---------------------------------------------------------------------- */

test.describe("pantalla informativa y simulador", () => {
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

  /** El simulador del panel del administrador, que es lo que vincula los dos terminales. */
  test("el simulador lista los dos tipos de equipo", async ({ page }) => {
    await page.goto("/kiosk/simulador-admin");
    await expect(page.getByRole("heading", { name: "Equipos de la sede", level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Kioscos de autoservicio" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Cajas" })).toBeVisible();
  });
});
