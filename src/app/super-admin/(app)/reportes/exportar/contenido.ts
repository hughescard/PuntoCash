import type { SuperAdminSession } from "@/features/super-admin/session";
import { diaCorto } from "@/app/admin/(app)/reportes/calculo";
import type { Contenido, Seccion } from "@/app/admin/(app)/reportes/exportar/contenido";
import {
  COLUMNA_SEDES,
  CORTES_RED,
  NOMBRE_DE_CORTE_RED,
  PRIMERA_COLUMNA_RED,
  type CorteRed,
  type ReporteDeRed,
} from "../calculo";

/**
 * Lo que lleva un reporte de la red exportado — **FR-SA-REP-9**.
 *
 * Es el mismo `Contenido` que pinta el archivo de Admin, con otra portada: los
 * cinco cortes del periodo y, junto al de operador, su comparación por sede
 * administrada, que es la que permite poner lado a lado a mercantes de distinto
 * tamaño (**FR-SA-REP-4**). Solo totales: ninguna fila habla de un cliente.
 */

export function contenidoDeRed(r: ReporteDeRed, session: SuperAdminSession, ahora = new Date()): Contenido {
  const periodo = r.desde === r.hasta ? diaCorto(r.desde) : `${diaCorto(r.desde)} – ${diaCorto(r.hasta)}`;
  /* «Sedes» es una cuenta, no un importe: va sin decimales y no se suma. */
  const conSedes = [COLUMNA_SEDES, ...r.monedas];
  const enteras = conSedes.map((c) => c === COLUMNA_SEDES);

  const secciones: Seccion[] = [];
  for (const corte of CORTES_RED as readonly CorteRed[]) {
    const filas = r.cortes[corte];
    if (corte === "operador") {
      secciones.push({
        id: corte,
        titulo: NOMBRE_DE_CORTE_RED[corte],
        nota: "Cada operación es del mercante que administraba la sede el día en que se hizo. «Sedes» son las que administró en algún momento del periodo.",
        primera: PRIMERA_COLUMNA_RED[corte],
        columnas: conSedes,
        enteras,
        sinTotal: enteras,
        filas: filas.map((f) => ({
          titulo: f.titulo,
          operaciones: f.operaciones,
          valores: conSedes.map((c) => f.volumen[c] ?? 0),
        })),
        conTotal: filas.length > 1,
      });
      secciones.push({
        id: "operador-por-sede",
        titulo: "Por operador (por sede)",
        nota: "El volumen y las operaciones de cada mercante divididos entre las sedes que administró en el periodo: la comparación entre mercantes de distinto tamaño. No se suma, porque un promedio no se suma.",
        primera: PRIMERA_COLUMNA_RED.operador,
        columnas: conSedes,
        enteras,
        etiquetaOperaciones: "Operaciones por sede",
        operacionesConDecimales: true,
        filas: r.operadorPorSede.map((f) => ({
          titulo: f.titulo,
          operaciones: f.operaciones,
          valores: conSedes.map((c) => f.volumen[c] ?? 0),
        })),
        conTotal: false,
      });
      continue;
    }

    const segunda = corte === "sede" ? "Operador" : corte === "provincia" ? "Sedes" : undefined;
    secciones.push({
      id: corte,
      titulo: NOMBRE_DE_CORTE_RED[corte],
      primera: PRIMERA_COLUMNA_RED[corte],
      ...(segunda ? { segunda } : {}),
      columnas: r.monedas,
      filas: filas.map((f) => ({
        titulo: f.titulo,
        segunda: segunda ? f.subtitulo : undefined,
        ...(corte === "dia" ? { fecha: f.key } : {}),
        operaciones: f.operaciones,
        valores: r.monedas.map((m) => f.volumen[m] ?? 0),
      })),
      conTotal: filas.length > 1,
    });

    if (corte === "servicio" && r.divisas.length > 0) {
      secciones.push({
        id: "divisa",
        titulo: "Cambio de moneda por divisa",
        nota: "Lo comprado y lo vendido es volumen. La posición neta (comprado menos vendido) no lo es: dice cuánta divisa ganó o perdió la red en el periodo.",
        primera: "Divisa",
        columnas: ["Comprado", "Vendido", "Volumen", "Posición neta"],
        conSigno: [false, false, false, true],
        filas: r.divisas.map((d) => ({
          titulo: d.currency,
          operaciones: d.operaciones,
          valores: [d.comprado, d.vendido, d.comprado + d.vendido, d.comprado - d.vendido],
        })),
        /* Divisas distintas no se suman. */
        conTotal: false,
      });
    }
  }

  return {
    titulo: "Resumen de operaciones",
    empresa: "PuntoCash · Red de sedes",
    periodo,
    portada: [["Alcance", "Toda la red"]],
    alcance: "Toda la red",
    pie: "PuntoCash · Toda la red",
    generado: ahora,
    generadoPor: session.user.fullName,
    totales: { operaciones: r.total.operaciones, monedas: r.monedas.map((m) => ({ moneda: m, valor: r.total.volumen[m] ?? 0 })) },
    secciones,
    slug: ["puntocash-red-resumen-de-operaciones", r.desde, r.hasta].join("_"),
  };
}
