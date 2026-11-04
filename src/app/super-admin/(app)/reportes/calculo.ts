import { provinciaDeLocalidad } from "@/features/geography/provincias-de-cuba";
import { ASSIGNMENTS, operadorVigenteEn, type Assignment } from "@/features/network/assignments";
import { diaEnCuba } from "@/features/network/jornadas";
import type { OperacionDeRed } from "@/features/network/operaciones";
import { OPERATORS } from "@/features/network/operators";
import { sumarDias } from "@/features/network/promotions";
import { GLOBAL_SCOPE } from "@/features/network/scope";
import { redEnAlcance } from "@/features/network/scoped-reads";
import { SEDES, type Sede } from "@/features/network/sedes";
import {
  ORDEN_DE_LINEAS,
  lineaDeServicio,
  ordenarMonedas,
  volumenDeOperacion,
  type Volumen,
} from "@/features/network/volumen";
import {
  acumular,
  diaLargo,
  periodoDe,
  type DivisaDeCambio,
  type FilaReporte,
} from "@/app/admin/(app)/reportes/calculo";

/**
 * El cálculo de un reporte de la red — **FR-SA-REP-1** a **FR-SA-REP-8**.
 *
 * Una sola función para la pantalla y para la exportación, como en Admin: el
 * archivo dice exactamente lo que la pantalla desde la que se pidió. Calcula
 * los cinco cortes a la vez; la pantalla enseña uno y el archivo lleva todos.
 *
 * La definición de volumen es la de Admin (`volumen.ts`): por moneda, en bruto,
 * cada operación completada una vez, sin convertir una moneda en otra. Lo que
 * cambia es de quién es cada operación: la de **su fecha**, no la de hoy. Una
 * sede que cambió de mercante deja sus operaciones de antes al de antes
 * (**FR-SA-OPS-2**); es lo que hace que una comparación entre mercantes cuadre.
 */

export type CorteRed = "operador" | "sede" | "servicio" | "provincia" | "dia";
export const CORTES_RED: readonly CorteRed[] = ["operador", "sede", "servicio", "provincia", "dia"];

/** El corte por operador se puede ver en total o por sede administrada (**FR-SA-REP-4**). */
export type VistaDeOperador = "total" | "sede";

/** Cómo se titula cada corte, en la pantalla y en el archivo. */
export const NOMBRE_DE_CORTE_RED: Readonly<Record<CorteRed, string>> = {
  operador: "Por operador",
  sede: "Por sede",
  servicio: "Por servicio",
  provincia: "Por provincia",
  dia: "Por día",
};

/** La primera columna de cada corte. */
export const PRIMERA_COLUMNA_RED: Readonly<Record<CorteRed, string>> = {
  operador: "Operador",
  sede: "Sede",
  servicio: "Servicio",
  provincia: "Provincia",
  dia: "Día",
};

/** La columna que cuenta las sedes de un operador; es una columna más de la tabla. */
export const COLUMNA_SEDES = "Sedes";

export interface ReporteDeRed {
  corte: CorteRed;
  vista: VistaDeOperador;
  hoy: string;
  desde: string;
  hasta: string;
  /** Si el periodo pedido pasaba de un año y se recortó. */
  recortado: boolean;
  monedas: string[];
  total: { operaciones: number; volumen: Record<string, number> };
  /** Los cortes en total. El de operador lleva además la columna «Sedes». */
  cortes: Record<CorteRed, FilaReporte[]>;
  /** El corte por operador dividido entre las sedes que administró cada uno. */
  operadorPorSede: FilaReporte[];
  divisas: DivisaDeCambio[];
}

/**
 * Los tramos de asignación que tocan el periodo: los que empezaron antes de que
 * acabe y no terminaron antes de que empiece. Un tramo de un solo día cuenta:
 * quien administró una sede un día la administró en el periodo.
 */
function tramosDelPeriodo(desde: string, hasta: string): readonly Assignment[] {
  return ASSIGNMENTS.filter((a) => diaEnCuba(a.startedAt) <= hasta && (!a.endedAt || diaEnCuba(a.endedAt) >= desde));
}

export function calcularReporteDeRed(
  params: { corte?: string | undefined; desde?: string | undefined; hasta?: string | undefined; por?: string | undefined },
  now = new Date(),
): ReporteDeRed {
  const corte: CorteRed = (CORTES_RED as readonly string[]).includes(params.corte ?? "") ? (params.corte as CorteRed) : "operador";
  const vista: VistaDeOperador = params.por === "sede" ? "sede" : "total";
  const { hoy, desde, hasta, recortado } = periodoDe(params, now);

  const red = redEnAlcance(GLOBAL_SCOPE);
  const tramos = tramosDelPeriodo(desde, hasta);

  /* Las operaciones que cuentan: completadas y dentro del rango, con el
     operador de su fecha. */
  const contadas: { o: OperacionDeRed; v: Volumen; dia: string; sedeId: string; operadorId: string | null }[] = [];
  for (const sede of SEDES) {
    for (const o of red.operaciones(sede.id)) {
      const dia = diaEnCuba(o.fechaHora);
      if (dia < desde || dia > hasta) continue;
      const v = volumenDeOperacion(o);
      if (!v) continue;
      /* La misma regla que Operaciones: el operador de la fecha de la operación. */
      contadas.push({ o, v, dia, sedeId: sede.id, operadorId: operadorVigenteEn(sede.id, new Date(o.fechaHora)) });
    }
  }

  const monedas = ordenarMonedas(contadas.map((c) => c.v.currency));
  const total = acumular(contadas.map((c) => c.v));
  const deSede = (id: string) => contadas.filter((c) => c.sedeId === id).map((c) => c.v);

  /* ── Por sede: las que no están cerradas, también la que no operó; una
     cerrada solo si operó en el periodo. ── */
  const sedesDelReporte: readonly Sede[] = SEDES.filter((s) => s.status !== "cerrada" || deSede(s.id).length > 0)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, "es"));

  const operadoresDe = (sedeId: string): string[] => {
    const ids = [...new Set(tramos.filter((a) => a.branchId === sedeId).map((a) => a.operatorId))];
    return ids.map((id) => OPERATORS.find((o) => o.id === id)?.name ?? "Un operador");
  };

  const porSede: FilaReporte[] = sedesDelReporte.map((sede) => ({
    key: sede.id,
    titulo: sede.name,
    /* El operador de cada sede a la vista (**FR-SA-REP-5**); si cambió en el
       periodo, los dos. */
    subtitulo: operadoresDe(sede.id).join(", ") || "Sin operador",
    href: `/super-admin/sedes/${sede.id}`,
    ...acumular(deSede(sede.id)),
  }));

  /* ── Por provincia: las de las sedes del reporte. ── */
  const provincias = new Map<string, Sede[]>();
  for (const sede of sedesDelReporte) {
    const p = provinciaDeLocalidad(sede.locality);
    provincias.set(p, [...(provincias.get(p) ?? []), sede]);
  }
  const porProvincia: FilaReporte[] = [...provincias.keys()]
    .sort((a, b) => a.localeCompare(b, "es"))
    .map((provincia) => {
      const delaProvincia = provincias.get(provincia)!;
      return {
        key: provincia,
        titulo: provincia,
        subtitulo: `${delaProvincia.length} ${delaProvincia.length === 1 ? "sede" : "sedes"}`,
        ...acumular(delaProvincia.flatMap((s) => deSede(s.id))),
      };
    });

  /* ── Por operador: los que administraron alguna sede en el periodo o
     tienen operaciones; una fila «Sin operador» solo si algo no tiene dueño,
     para que la suma de las filas siga siendo el total. ── */
  const idsDeOperadores = new Set<string>([
    ...tramos.map((a) => a.operatorId),
    ...contadas.flatMap((c) => (c.operadorId ? [c.operadorId] : [])),
  ]);
  const operadores = OPERATORS.filter((o) => idsDeOperadores.has(o.id))
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, "es"));

  const filaDeOperador = (id: string, nombre: string, sedes: number) => {
    const suyas = contadas.filter((c) => c.operadorId === id).map((c) => c.v);
    return { key: id, titulo: nombre, href: `/super-admin/operadores/${id}`, sedes, ...acumular(suyas) };
  };
  const baseOperadores = operadores.map((o) =>
    filaDeOperador(o.id, o.name, new Set(tramos.filter((a) => a.operatorId === o.id).map((a) => a.branchId)).size),
  );

  const sinDueno = contadas.filter((c) => c.operadorId === null).map((c) => c.v);
  const filaSinOperador: FilaReporte[] =
    sinDueno.length > 0 ? [{ key: "sin-operador", titulo: "Sin operador", volumen: acumular(sinDueno).volumen, operaciones: sinDueno.length }] : [];

  const porOperador: FilaReporte[] = [
    ...baseOperadores.map(({ sedes, ...fila }) => ({ ...fila, volumen: { [COLUMNA_SEDES]: sedes, ...fila.volumen } })),
    ...filaSinOperador.map((f) => ({ ...f, volumen: { [COLUMNA_SEDES]: 0, ...f.volumen } })),
  ];

  /* Dividido entre las sedes que administró: una comparación entre mercantes de
     distinto tamaño. Un mercante sin sedes en el periodo no tiene por qué dividirse. */
  const operadorPorSede: FilaReporte[] = baseOperadores
    .filter((o) => o.sedes > 0)
    .map(({ sedes, ...fila }) => ({
      ...fila,
      operaciones: fila.operaciones / sedes,
      volumen: {
        [COLUMNA_SEDES]: sedes,
        ...Object.fromEntries(Object.entries(fila.volumen).map(([m, v]) => [m, v / sedes])),
      },
    }));

  /* ── Por servicio: una línea por servicio y sentido. ── */
  const lineas = new Map<string, Volumen[]>();
  for (const c of contadas) {
    const linea = lineaDeServicio(c.v);
    lineas.set(linea, [...(lineas.get(linea) ?? []), c.v]);
  }
  const orden = (l: string) => {
    const i = (ORDEN_DE_LINEAS as readonly string[]).indexOf(l);
    return i === -1 ? ORDEN_DE_LINEAS.length : i;
  };
  const porServicio: FilaReporte[] = [...lineas.keys()]
    .sort((a, b) => orden(a) - orden(b) || a.localeCompare(b, "es"))
    .map((linea) => ({ key: linea, titulo: linea, ...acumular(lineas.get(linea)!) }));

  /* ── Por día: todos los días del periodo, también los vacíos. ── */
  const porDia: FilaReporte[] = [];
  for (let dia = desde; dia <= hasta; dia = sumarDias(dia, 1)) {
    porDia.push({ key: dia, titulo: diaLargo(dia), ...acumular(contadas.filter((c) => c.dia === dia).map((c) => c.v)) });
  }

  /* ── El cambio por divisa: comprado, vendido y la posición neta. ── */
  const deCambio = contadas.filter((c) => c.v.sentido === "compra" || c.v.sentido === "venta");
  const divisas = ordenarMonedas(deCambio.map((c) => c.v.currency)).map((currency) => {
    const de = deCambio.filter((c) => c.v.currency === currency);
    return {
      currency,
      comprado: de.filter((c) => c.v.sentido === "compra").reduce((s, c) => s + c.v.amount, 0),
      vendido: de.filter((c) => c.v.sentido === "venta").reduce((s, c) => s + c.v.amount, 0),
      operaciones: de.length,
    };
  });

  return {
    corte,
    vista,
    hoy,
    desde,
    hasta,
    recortado,
    monedas,
    total,
    cortes: { operador: porOperador, sede: porSede, servicio: porServicio, provincia: porProvincia, dia: porDia },
    operadorPorSede,
    divisas,
  };
}
