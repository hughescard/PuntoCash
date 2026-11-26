import { test as base, expect } from "@playwright/test";

import { WORKER_BASE_URL } from "./storage-state";

/**
 * El `test` de las pruebas de Worker: antes de cada prueba pide al servidor de
 * pruebas **un puesto propio** —una caja nueva en PuntoCash Vedado, su equipo
 * vinculado y un trabajador nuevo, «Juan Pérez»— y deja el navegador como ese
 * equipo con la sesión ya abierta.
 *
 *   · `fondos`: si se da, la caja abre su primera jornada con esos importes;
 *     `null` deja la caja sin abrir (es lo de serie).
 *   · `monedas`: monedas habilitadas además de las de `fondos`.
 *   · `conSesion`: `false` deja el equipo vinculado pero sin nadie dentro,
 *     para las pruebas del acceso.
 *
 * El puesto llega en el fixture `puesto`, por si la prueba necesita el nombre
 * de la caja o el identificador del trabajador.
 */
export interface Puesto {
  terminalId: string;
  /** El código de vinculación del equipo: lo que guarda la cookie `pc_caja_device`. */
  terminalCodigo: string;
  workerId: string;
  identifier: string;
  registerId: string;
  sedeId: string;
  caja: string;
  /** Con `kiosco`: el kiosco de autoservicio de la misma sede. */
  kioscoId?: string;
  /** El código de vinculación de ese kiosco: lo que guarda la cookie `pc_kiosco_device`. */
  kioscoCodigo?: string;
}

interface Opciones {
  fondos: Record<string, number> | null;
  /** Servicios de la sede del puesto; por defecto, los de Vedado. */
  servicios: readonly string[] | null;
  /** Giros enviados (importes en CUP) que la jornada registra al abrir. */
  giros: readonly number[];
  /** Cierra la jornada abierta con `fondos` contando lo que hay. */
  cerrada: boolean;
  /** Carga el historial de 128 operaciones con que se diseñó la lista. */
  historial: boolean;
  /** Con `cerrada`: billetes que faltan en el conteo de cierre, con su motivo. */
  diferenciaAlCerrar: { currency: string; quitar: Record<string, number>; motivo: string; observaciones?: string } | null;
  monedas: readonly string[];
  sede: string;
  conSesion: boolean;
  /** El fondo entra en billetes de todas las denominaciones, como una caja con cambio (no de mayor a menor). */
  conCambio: boolean;
  /** Vincula además un kiosco de autoservicio a la sede del puesto. */
  kiosco: boolean;
}

export const test = base.extend<Opciones & { puesto: Puesto }>({
  fondos: [null, { option: true }],
  servicios: [null, { option: true }],
  giros: [[], { option: true }],
  cerrada: [false, { option: true }],
  historial: [false, { option: true }],
  diferenciaAlCerrar: [null, { option: true }],
  /* Las cuatro con que trabajaba la Caja 03 de la demostración. */
  monedas: [["CUP", "USD", "EUR", "GBP"], { option: true }],
  sede: ["sede-vedado", { option: true }],
  conSesion: [true, { option: true }],
  conCambio: [false, { option: true }],
  kiosco: [false, { option: true }],

  puesto: [
    async ({ request, context, fondos, conCambio, kiosco, monedas, sede, servicios, giros, cerrada, historial, diferenciaAlCerrar, conSesion }, use) => {
      const datos = encodeURIComponent(JSON.stringify({ fondos, monedas, sede, giros, conCambio, kiosco, cerrar: cerrada, historial, ...(diferenciaAlCerrar ? { diferenciaAlCerrar } : {}), ...(servicios ? { servicios } : {}) }));
      /* Un reintento: con seis trabajadores pidiendo puestos a la vez, el
         servidor puede cortar alguna conexión. */
      const pedir = () => request.get(`${WORKER_BASE_URL}/pruebas/puesto?datos=${datos}`);
      const r = await pedir().catch(() => pedir());
      const html = await r.text();
      const json = /<pre id="puesto">([\s\S]*?)<\/pre>/.exec(html)?.[1];
      expect(json, `no se pudo preparar el puesto (${r.status()})`).toBeTruthy();
      const resultado = JSON.parse(json!.replaceAll("&quot;", '"').replaceAll("&amp;", "&")) as { ok: boolean; value: Puesto; error?: string };
      expect(resultado.ok, `no se pudo preparar el puesto: ${resultado.error}`).toBe(true);
      const puesto = resultado.value;
      const cookie = (name: string, value: string) => ({
        name,
        value,
        domain: "localhost",
        path: "/worker",
        httpOnly: true,
        secure: false,
        sameSite: "Lax" as const,
        expires: -1,
      });
      await context.addCookies([
        cookie("pc_caja_device", puesto.terminalCodigo),
        ...(conSesion
          ? [cookie("pc_worker_session", encodeURIComponent(JSON.stringify({ workerId: puesto.workerId, terminalId: puesto.terminalId })))]
          : []),
      ]);
      await use(puesto);
    },
    { auto: true },
  ],
});

export { expect };
