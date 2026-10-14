import { defineConfig, devices } from "@playwright/test";

import { BASE_URL, EQUIPO_SIN_JORNADA } from "./tests/storage-state";

/**
 * La batería de pruebas de PuntoCash.
 *
 * Tres clases de prueba conviven aquí:
 *
 *   · **Extremo a extremo** de `/worker` y `/admin`, en navegador.
 *   · **De dominio**, sin navegador (`caja-domain-*`, `network-domain`), que
 *     ejercitan los módulos de `src/features` directamente.
 *   · El **contrato de accesibilidad** del formulario (`design-system-forms`),
 *     que fue la primera y da nombre a la carpeta `design-system`.
 *
 * El alcance era deliberadamente estrecho cuando solo existía la tercera; hoy
 * es una de veintiocho. Ver `tests/README.md`.
 */

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,

  /*
   * Seis en local, uno en CI.
   *
   * La máquina aguanta más, pero el cuello de botella no es la CPU: los seis
   * trabajadores pegan contra **un solo** servidor de desarrollo, que compila
   * cada ruta la primera vez que alguien la pide. Con más paralelismo, esa
   * primera compilación se solapa con más pruebas a la vez, y lo que aparece
   * no son fallos nuevos sino esperas más largas — justo la clase de carrera
   * que ya obligó a esperar a `main` tras navegar (ver README).
   *
   * Si vuelven tiempos de espera agotados en pruebas que antes pasaban, bajar
   * este número es lo primero que hay que probar, antes de tocar la prueba.
   * Ya ocurrió con diez: la corrida pasó de 3 a 8 fallos sin que cambiara una
   * línea del producto.
   *
   * En CI se queda en uno: `admin-cajas` escribe contra el dominio en memoria
   * del servidor, y un solo trabajador hace ese estado predecible.
   */
  workers: process.env.CI ? 1 : 6,

  /*
   * Sesenta segundos, no los treinta de serie.
   *
   * No mide nada del producto: mide el servidor de desarrollo. `next dev`
   * compila cada ruta la primera vez que alguien la pide, y con seis
   * trabajadores esa primera compilación se solapa con las de otras rutas. Una
   * prueba que entra por la interfaz puede gastar la mitad de su plazo
   * esperando a que llegue el JavaScript de la pantalla.
   *
   * Ya ocurrió: `admin-acceso` agotó los treinta segundos esperando que el
   * botón de «Iniciar sesión» se habilitara —está deshabilitado hasta que el
   * formulario hidrata— en una corrida de 6 minutos, habiendo pasado en dos de
   * 3,6. Lo que cambió fue la carga, no el código.
   *
   * El coste de subirlo es que una prueba de verdad colgada tarda el doble en
   * rendirse. Se paga solo cuando algo falla, y a cambio los fallos que
   * aparecen son fallos.
   */
  timeout: 60_000,

  /*
   * Y diez segundos por aserción, no los cinco de serie, por lo mismo: una
   * aserción que cae justo después de navegar compite con la compilación de esa
   * ruta. Ya pasó con la pantalla de verificación, que esperaba un aviso que el
   * cliente todavía no había pintado.
   *
   * Es un margen para el servidor de desarrollo, no una licencia para no
   * esperar lo que hay que esperar: una prueba que necesita más que esto está
   * esperando la cosa equivocada.
   */
  expect: { timeout: 10_000 },

  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "line" : "list",

  use: {
    baseURL: BASE_URL,
    // Desktop-first reference viewport (manual §10).
    viewport: { width: 1440, height: 900 },
    trace: "on-first-retry",

    /*
     * La línea de salida: equipo vinculado a Caja 03, caja sin abrir. Vive en
     * `tests/storage-state.ts`, junto a `cajaConJornadaAbierta(fondos)`, que es
     * con lo que un archivo se sale de aquí cuando necesita la caja ya abierta.
     */
    storageState: EQUIPO_SIN_JORNADA,
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  webServer: {
    command: "npm run dev",
    url: `${BASE_URL}/design-system`,
    // Locally, attach to a dev server that is already running.
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
