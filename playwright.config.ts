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
   * El cuello de botella no es la CPU: los trabajadores pegan contra **un
   * solo** servidor. Mientras ese servidor fue `next dev`, más paralelismo
   * significaba más primeras compilaciones solapadas, y con ellas esperas más
   * largas — la carrera que ya obligó a esperar a `main` tras navegar (ver
   * README). Con diez la corrida pasó de 3 a 8 fallos sin que cambiara una
   * línea del producto.
   *
   * Bajarlo dejó de ser la primera palanca cuando el servidor pasó a ser una
   * compilación de producción (ver `webServer`): de seis a cuatro no cambió
   * nada —un fallo por corrida a ambos lados— porque lo que fallaba era la
   * compilación perezosa, no el paralelismo. Si vuelven tiempos de espera
   * agotados, mirar primero si la suite se enganchó a un `next dev` levantado.
   *
   * En CI se queda en uno: `admin-cajas` escribe contra el dominio en memoria
   * del servidor, y un solo trabajador hace ese estado predecible.
   */
  workers: process.env.CI ? 1 : 6,

  /*
   * Sesenta segundos, no los treinta de serie.
   *
   * No mide nada del producto: mide el servidor. Nació cuando ese servidor era
   * `next dev` y compilaba cada ruta al primer acceso, de modo que una prueba
   * podía gastar la mitad de su plazo esperando el JavaScript de la pantalla.
   * Ya ocurrió: `admin-acceso` agotó los treinta segundos esperando que el
   * botón de «Iniciar sesión» se habilitara —está deshabilitado hasta que el
   * formulario hidrata— en una corrida de 6 minutos, habiendo pasado en dos de
   * 3,6. Lo que cambió fue la carga, no el código.
   *
   * Con la compilación de producción (ver `webServer`) ese margen ya casi no
   * hace falta, pero se queda: la máquina sigue siendo compartida, y el coste
   * de tenerlo es que una prueba de verdad colgada tarda el doble en rendirse
   * — se paga solo cuando algo falla, y a cambio los fallos que aparecen son
   * fallos.
   */
  timeout: 60_000,

  /*
   * Y diez segundos por aserción, no los cinco de serie, por lo mismo: una
   * aserción que cae justo después de navegar llegaba a competir con la
   * compilación de esa ruta. Ya pasó con la pantalla de verificación, que
   * esperaba un aviso que el cliente todavía no había pintado.
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

  /*
   * Compilación de producción, no `next dev`.
   *
   * `next dev` compila cada ruta la primera vez que alguien la pide, y eso era
   * el origen de los fallos intermitentes que esta suite arrastraba: no una
   * pantalla rota, sino la primera visita a una ruta todavía sin compilar,
   * compitiendo con la de otros trabajadores. Saltaba de archivo en cada
   * corrida —`admin-sedes`, `admin-shell`, `worker-caja-ajustar-efectivo`,
   * `admin-jornadas`— siempre en el mismo sitio: esperando a que llegara el
   * JavaScript de la pantalla. Bajar `workers` de seis a cuatro no lo movió:
   * un fallo por corrida antes y después, a un minuto más de reloj.
   *
   * Con `next build` todo queda compilado antes de que entre la primera
   * prueba, y la clase entera de fallo desaparece. El precio es el build al
   * arrancar; se amortiza en la corrida, que va más rápida y, sobre todo,
   * deja de depender de cuán cargada esté la máquina.
   *
   * El build es incremental: solo la primera corrida tras tocar código paga
   * el tiempo completo.
   */
  webServer: {
    command: "npm run build && npm start",
    url: `${BASE_URL}/design-system`,
    /*
     * En local se engancha a un servidor ya levantado, para no reconstruir en
     * cada corrida mientras se itera. Ojo: si lo que está levantado es un
     * `next dev`, se hereda su compilación perezosa y con ella los fallos
     * intermitentes de arriba. Ante una corrida rara, pararlo y dejar que la
     * suite monte el suyo es lo primero que hay que probar.
     */
    reuseExistingServer: !process.env.CI,
    // Cubre el build además del arranque.
    timeout: 300_000,
  },
});
