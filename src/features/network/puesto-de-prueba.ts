import { definirReglas, type ReglaDeMoneda } from "./alertas";
import { asignarSede, operadorVigente, sedesEnAlcance as sedesDelAlcance } from "./assignments";
import { abrirJornada, billetesDeImporte, cerrarJornada, conteoDeLoQueHay, contextoDe, registrarOperacionSimple } from "./caja-operativa";
import { anadirMonedaASede, habilitarMonedaEnCaja, monedasDeSede } from "./currencies";
import { emitirReto, vincularEquipo } from "./devices";
import { fijarTasa, rangoDe, tasasDeSede } from "./rates";
import { crearCaja } from "./registers";
import { GLOBAL_SCOPE, operatorScope } from "./scope";
import { crearSede, findSedeById } from "./sedes";
import { crearTrabajador } from "./workers";
import { registrarOperacion } from "./operaciones";
import { forzarCierre, jornadaAbiertaDeCaja } from "./jornadas";
import { OPERATIONS } from "@/features/operations/operations-history";
import { desglosarFondo, restar } from "@/features/caja/billetes";
import { denominacionesDe } from "./denominaciones";

/** Un fondo con cambio: billetes de todas las denominaciones, no solo de las grandes. */
function fondoEnBilletes(currency: string, importe: number) {
  return desglosarFondo(importe, denominacionesDe(currency)).billetes;
}

/**
 * **SOLO PARA LAS PRUEBAS.** Un puesto de trabajo nuevo y aislado.
 *
 * Cada puesto vive en **su propia copia de una sede** —por defecto,
 * PuntoCash Vedado: mismo nombre, mismos servicios, misma lista de monedas,
 * mismas tasas y el mismo operador—, con una caja «Caja 03», su equipo
 * vinculado y un trabajador «Juan Pérez». Así las pruebas de pantalla leen lo
 * mismo que leería un trabajador de Vedado, y las que corren en paralelo no
 * se pisan las jornadas.
 *
 * Pasa por las mismas escrituras que las consolas (crear sede, asignarla,
 * añadir monedas, fijar tasas, crear caja, vincular equipo, dar de alta un
 * trabajador), así que no salta ninguna regla.
 *
 * Lo usan las pruebas de dominio de `caja-operativa.ts` y, a través de
 * `/pruebas/puesto`, las de pantalla de Worker.
 */
export interface PuestoDePrueba {
  terminalId: string;
  workerId: string;
  identifier: string;
  registerId: string;
  sedeId: string;
  caja: string;
}

export interface OpcionesDePuesto {
  /** Billetes de todas las denominaciones en el fondo (lo de las pruebas de pantalla); si no, de mayor a menor. */
  conCambio?: boolean;
  /** La sede que se copia. */
  sede?: string;
  /** Si se dan, la caja abre su primera jornada con estos importes. */
  fondos?: Record<string, number> | null;
  /** Monedas habilitadas en la caja, además de las de `fondos`. */
  monedas?: readonly string[];
  /** Servicios de la copia; por defecto, los de la sede original. */
  servicios?: readonly string[];
  /** Otro puesto en una sede de prueba ya creada, en vez de una copia nueva. */
  enSede?: string;
  /** Giros enviados que la jornada registra al abrir, por importe en CUP. Necesita `fondos`. */
  giros?: readonly number[];
  /** Cierra la jornada contando lo que hay, para que la siguiente apertura compare con ese cierre. */
  cerrar?: boolean;
  /**
   * Carga en la caja el historial de operaciones con que se diseñó la lista de
   * Worker (`OPERATIONS`): ciento veintiocho, de todos los servicios y
   * estados. Solo como registros, sin movimientos de caja.
   */
  historial?: boolean;
  /** Con `cerrar`: billetes que faltan en el conteo de cierre, y el motivo que se da. */
  diferenciaAlCerrar?: { currency: string; quitar: Record<string, number>; motivo: string; observaciones?: string };
}

let secuencia = 0;

const CLIENTES_DE_PRUEBA = [
  { nombre: "María Rodríguez", documentType: "CI" as const, documentNumber: "90010112345", telefono: "+53 5 111 2233", nacionalidad: "Cubana" },
  { nombre: "Carlos Gómez", documentType: "CI" as const, documentNumber: "85020254321", telefono: "+53 5 222 3344", nacionalidad: "Cubana" },
];

export function crearPuestoDePrueba(
  opciones: OpcionesDePuesto = {},
): { ok: true; value: PuestoDePrueba } | { ok: false; error: string } {
  const original = findSedeById(opciones.sede ?? "sede-vedado");
  if (!original) return { ok: false, error: "sede-no-encontrada" };
  const operador = operadorVigente(original.id);
  if (!operador) return { ok: false, error: "sede-sin-operador" };

  secuencia += 1;
  const n = `${Date.now().toString(36)}${secuencia.toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`.toUpperCase();

  const existente = opciones.enSede ? findSedeById(opciones.enSede) : null;
  const sede = existente ? ({ ok: true, value: existente } as const) : copiarSede(original, operador, n, opciones.servicios);
  if (!sede.ok) return { ok: false, error: sede.error };
  const scope = operatorScope(operador);
  const ctx = { sedesEnAlcance: (op: string) => sedesDelAlcance(operatorScope(op)) };

  if (!existente) {
    for (const m of monedasDeSede(original.id)) anadirMonedaASede(scope, sede.value.id, m.code);
    for (const t of tasasDeSede(original.id)) {
      const rango = rangoDe(t.code);
      if (!rango) continue;
      fijarTasa(scope, {
        sedeId: sede.value.id,
        code: t.code,
        compra: t.compra,
        venta: t.venta,
        versionDelRango: rango.version,
        autor: t.updatedBy,
      });
    }
  }

  const caja = crearCaja(scope, ctx, { branchId: sede.value.id, name: existente ? `Caja P${n}` : "Caja 03" });
  if (!caja.ok) return { ok: false, error: `caja: ${caja.reason}` };

  const deviceId = `CAJ-P${n}`;
  const reto = emitirReto("caja", deviceId);
  if (!reto) return { ok: false, error: "reto" };
  const equipo = vincularEquipo(scope, ctx, {
    reto: { method: "codigo", code: reto.code },
    branchId: sede.value.id,
    registerId: caja.value.id,
    by: "Pruebas",
    label: "Mostrador 3 · Vedado",
  });
  if (!equipo.ok) return { ok: false, error: `equipo: ${equipo.reason}` };

  const identifier = `p${n.toLowerCase()}`.slice(0, 30);
  const trabajador = crearTrabajador(scope, ctx, {
    id: `trb-p${n.toLowerCase()}`,
    identifier,
    fullName: "Juan Pérez",
    firstName: "Juan",
    documentType: "CI",
    documentId: `9${String(Date.now()).slice(-8)}${String(secuencia % 100).padStart(2, "0")}`,
    phone: "+53 5 000 0000",
    email: `${identifier}@puntocash.com`,
    branchId: sede.value.id,
  });
  if (!trabajador.ok) return { ok: false, error: `trabajador: ${trabajador.reason}` };

  const monedas = new Set([...(opciones.monedas ?? []), ...Object.keys(opciones.fondos ?? {})]);
  for (const m of monedas) habilitarMonedaEnCaja(caja.value.id, m);

  if (opciones.fondos) {
    const c = contextoDe({ workerId: trabajador.value.id, terminalId: equipo.value.id });
    if (!c.ok) return { ok: false, error: c.reason };
    const r = abrirJornada(
      c.value,
      /* Los fondos entran en billetes de todas las denominaciones, como una caja con cambio. */
      [...monedas].map((currency) => ({ currency, billetes: opciones.conCambio ? fondoEnBilletes(currency, opciones.fondos?.[currency] ?? 0) : billetesDeImporte(currency, opciones.fondos?.[currency] ?? 0) })),
    );
    if (!r.ok) return { ok: false, error: `apertura: ${r.reason}` };
    for (const [i, importe] of (opciones.giros ?? []).entries()) {
      const g = registrarOperacionSimple(c.value, {
        servicio: "Giros",
        cliente: CLIENTES_DE_PRUEBA[i % CLIENTES_DE_PRUEBA.length]!,
        tramo: { currency: "CUP", delta: importe, concepto: "Envío de giro" },
      });
      if (!g.ok) return { ok: false, error: `giro: ${g.reason}` };
    }
    if (opciones.cerrar) {
      const d = opciones.diferenciaAlCerrar;
      const conteo = conteoDeLoQueHay(c.value).map((x) =>
        d && x.currency === d.currency
          ? { currency: x.currency, billetes: restar(x.billetes, d.quitar), motivo: d.motivo, ...(d.observaciones ? { observaciones: d.observaciones } : {}) }
          : x,
      );
      const cierre = cerrarJornada(c.value, conteo);
      if (!cierre.ok) return { ok: false, error: `cierre: ${cierre.reason}` };
    }
  }

  if (opciones.historial) {
    for (const op of OPERATIONS) {
      registrarOperacion({
        ...op,
        worker: "Juan Pérez",
        caja: caja.value.name,
        sedeId: sede.value.id,
        registerId: caja.value.id,
        workerId: trabajador.value.id,
        jornadaId: "historial-de-prueba",
      });
    }
  }

  return {
    ok: true,
    value: {
      terminalId: equipo.value.id,
      workerId: trabajador.value.id,
      identifier,
      registerId: caja.value.id,
      sedeId: sede.value.id,
      caja: caja.value.name,
    },
  };
}

function copiarSede(
  original: NonNullable<ReturnType<typeof findSedeById>>,
  operador: string,
  n: string,
  servicios: readonly string[] | undefined,
): { ok: true; value: NonNullable<ReturnType<typeof findSedeById>> } | { ok: false; error: string } {
  const sede = crearSede(GLOBAL_SCOPE, {
    id: `sede-prueba-${n.toLowerCase()}`,
    code: `P${n}`.slice(0, 12),
    name: original.name,
    address: original.address,
    locality: original.locality,
    horario: original.horario,
    phone: original.phone,
    services: servicios ?? original.services,
  });
  if (!sede.ok) return { ok: false, error: `sede: ${sede.reason}` };
  const asignada = asignarSede(GLOBAL_SCOPE, {
    branchId: sede.value.id,
    operatorId: operador,
    reason: "Puesto de una prueba automatizada",
    id: `asg-prueba-${n.toLowerCase()}`,
  });
  if (!asignada.ok) return { ok: false, error: `asignacion: ${asignada.reason}` };
  return { ok: true, value: sede.value };

}

/**
 * **Solo para las pruebas.** Hace lo que haría el administrador de la sede
 * desde Jornadas: forzar el cierre de la jornada abierta de una caja.
 */
export function forzarCierreDePrueba(registerId: string, sedeId: string, motivo: string): { ok: boolean; reason?: string } {
  const j = jornadaAbiertaDeCaja(registerId);
  const operador = operadorVigente(sedeId);
  if (!j || !operador) return { ok: false, reason: "sin-jornada-o-sin-operador" };
  const r = forzarCierre(operatorScope(operador), j.id, motivo, "Marta Sánchez");
  return r.ok ? { ok: true } : { ok: false, reason: r.reason };
}

/**
 * **Solo para las pruebas.** Fija las alertas de una sede como lo haría su
 * administrador desde Sedes → Alertas de caja.
 */
export function definirAlertasDePrueba(sedeId: string, reglas: readonly ReglaDeMoneda[]): { ok: boolean; reason?: string } {
  const operador = operadorVigente(sedeId);
  if (!operador) return { ok: false, reason: "sin-operador" };
  const r = definirReglas(operatorScope(operador), sedeId, reglas);
  return r.ok ? { ok: true } : { ok: false, reason: r.reason };
}
