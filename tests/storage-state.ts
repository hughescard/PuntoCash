import { CAJA_STORAGE_KEY, instantaneaConJornadaAbierta } from "@/features/caja/caja-data";

/**
 * La forma que Playwright acepta en `storageState`, escrita aquí en vez de
 * importada de `@playwright/test`: es un objeto plano y describirlo cuesta
 * menos que atar este archivo a un nombre de su superficie de tipos.
 */
interface Estado {
  cookies: {
    name: string;
    value: string;
    domain: string;
    path: string;
    expires: number;
    httpOnly: boolean;
    secure: boolean;
    sameSite: "Strict" | "Lax" | "None";
  }[];
  origins: {
    origin: string;
    localStorage: { name: string; value: string }[];
  }[];
}

export const BASE_URL = "http://localhost:3000";

/**
 * Toda ruta de Worker corre en un equipo vinculado a una caja de una sede
 * (Worker FRD §2.1): `RegisterDeviceGate` muestra la pantalla de vinculación
 * —no el inicio de sesión, no el shell— hasta que ese vínculo existe.
 *
 * Un contexto de navegador arranca vacío, así que sin esto cada prueba de
 * Worker vería la pantalla de vinculación en vez de la aplicación. Sembrar la
 * sesión del equipo es la línea de salida honesta: en producción una caja es
 * una máquina que un administrador ya vinculó, y ninguna prueba trata del
 * momento anterior.
 *
 * Apunta a **Caja 03 de PuntoCash Vedado** porque es la única caja con datos
 * operativos simulados (saldos, jornada, movimientos) — la misma que el
 * simulador del administrador deja elegir (FR-DEV-9).
 *
 * Una prueba que necesite la pantalla de vinculación se sale por archivo con
 * `test.use({ storageState: undefined })`.
 */
const EQUIPO_VINCULADO = {
  status: "linked",
  deviceId: "CAJ-0000-0001",
  branchId: "sede-vedado",
  registerId: "sede-vedado:caja-03",
  linkedAt: "2026-09-01T08:00:00.000Z",
  linkMethod: "codigo",
};

/**
 * El vínculo vive en dos sitios que deben contar lo mismo: `localStorage`, que
 * es la fuente de verdad a la que el terminal reacciona, y la cookie espejo,
 * que es lo que el layout de servidor lee para decidir qué renderizar
 * (FR-DEV-1.1). Sembrar solo uno deja al servidor y al cliente en desacuerdo,
 * y la suite entraría en un refresco por navegación.
 */
const COOKIES = [
  {
    name: "pc_caja_device",
    value: encodeURIComponent(
      JSON.stringify({
        deviceId: EQUIPO_VINCULADO.deviceId,
        branchId: EQUIPO_VINCULADO.branchId,
        registerId: EQUIPO_VINCULADO.registerId,
      }),
    ),
    domain: "localhost",
    path: "/",
    expires: -1,
    httpOnly: false,
    secure: false,
    sameSite: "Lax" as const,
  },
];

const EQUIPO_EN_ALMACENAMIENTO = {
  name: "puntocash.caja.device",
  value: JSON.stringify(EQUIPO_VINCULADO),
};

/** La línea de salida de toda la suite: equipo vinculado, caja sin abrir. */
export const EQUIPO_SIN_JORNADA: Estado = {
  cookies: COOKIES,
  origins: [{ origin: BASE_URL, localStorage: [EQUIPO_EN_ALMACENAMIENTO] }],
};

/**
 * La apertura se sella **al cargar la configuración**, es decir al principio de
 * la corrida, para que lo que la pantalla llama «hoy» siga siendo hoy: hay
 * filtros del libro de movimientos que dependen de eso.
 */
const APERTURA = new Date();

/**
 * El mismo equipo, pero con una jornada **ya abierta** con estos fondos.
 *
 * Para una prueba que necesita la caja abierta pero no trata de abrirla.
 * Recorrer «Registrar fondeo inicial» por la interfaz cuesta una navegación,
 * una espera de hidratación, un formulario y dos confirmaciones, y eso se
 * pagaba unas ciento sesenta veces por corrida, en pantallas que no tenían
 * nada que ver con abrir la caja. El estado lo construye el propio dominio
 * (`instantaneaConJornadaAbierta`), así que la siembra y el producto no pueden
 * contar cosas distintas.
 *
 * Los fondos van **en número**, no en el texto que se teclea: esto no pasa por
 * el formulario. Una moneda que no se nombre arranca en cero, igual que al
 * abrir de verdad.
 */
export function cajaConJornadaAbierta(fondos: Record<string, number>): Estado {
  const caja = {
    name: CAJA_STORAGE_KEY,
    value: instantaneaConJornadaAbierta({
      openedAt: APERTURA,
      fondos: Object.entries(fondos).map(([currency, amount]) => ({ currency, amount })),
    }),
  };

  return {
    cookies: COOKIES,
    origins: [{ origin: BASE_URL, localStorage: [EQUIPO_EN_ALMACENAMIENTO, caja] }],
  };
}
