import type { NextConfig } from "next";

/**
 * Orígenes desde los que se permite abrir el servidor de desarrollo.
 *
 * Desde Next 15.2, `next dev` **bloquea las peticiones a `/_next/*` que llegan
 * con un origen distinto del suyo**. Es una protección razonable —evita que una
 * página cualquiera de internet hurgue en el servidor de desarrollo de quien la
 * visita— pero tiene un efecto que despista mucho: al abrir la aplicación desde
 * el teléfono por la IP de la red local, **el HTML llega y la pantalla se
 * pinta**, porque eso lo genera el servidor, pero los paquetes de JavaScript no
 * cargan. El resultado es una pantalla que se ve perfecta y no responde a nada:
 * se escribe el usuario, se pulsa el botón y no pasa absolutamente nada.
 *
 * La consola de administración se prueba desde el móvil a diario
 * (Admin FRD **FR-AD-SHELL-6**), así que esto tiene que estar abierto para los
 * rangos privados de siempre. Solo afecta a `next dev`: en producción no
 * interviene.
 *
 * Si tu red usa otro rango, añádelo sin tocar este archivo:
 *
 *     PUNTOCASH_DEV_ORIGINS="mi-equipo.local,100.64.1.5" npm run dev
 */
const RANGOS_PRIVADOS = [
  "192.168.*.*",
  "10.*.*.*",
  "172.16.*.*",
  "172.17.*.*",
  "172.18.*.*",
  "172.19.*.*",
  "172.20.*.*",
];

const extra = (process.env.PUNTOCASH_DEV_ORIGINS ?? "")
  .split(",")
  .map((origen) => origen.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  // `next dev` otherwise appends a "nextjs-agent-rules" block to CLAUDE.md on
  // every run. CLAUDE.md is a hand-maintained project document here, so the
  // injector stays off. Next.js 16 docs remain readable at
  // node_modules/next/dist/docs/.
  agentRules: false,

  allowedDevOrigins: [...RANGOS_PRIVADOS, ...extra],

  /*
   * El indicador de `next dev` es un círculo flotante en una esquina, y este
   * producto ocupa la pantalla entera: en escritorio se sienta sobre el pie de
   * la barra lateral y en el teléfono, justo encima del primer destino de la
   * barra inferior. Como el demo se revisa mirándolo y se comparte en
   * capturas, estorba más de lo que ayuda. Se quita; para recuperarlo, borra
   * esta línea.
   */
  devIndicators: false,

  /*
   * Al abrir por la IP de la red local, el origen y el anfitrión coinciden y
   * las acciones de servidor pasan sin más. Detrás de un túnel (ngrok,
   * Cloudflare, el reenvío de puertos de un IDE) dejan de coincidir y hay que
   * declarar ese anfitrión aquí — la misma variable sirve:
   */
  ...(extra.length > 0 ? { experimental: { serverActions: { allowedOrigins: extra } } } : {}),
};

export default nextConfig;
