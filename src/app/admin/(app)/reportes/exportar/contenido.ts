import type { AdminSession } from "@/features/admin/session";
import { diaCorto, NOMBRE_DE_CORTE, PRIMERA_COLUMNA, type Corte, type Reporte } from "../calculo";

/**
 * Lo que lleva un reporte exportado, ya ordenado y rotulado — **FR-AD-REP-13**.
 *
 * El PDF y el Excel pintan esto mismo, cada uno a su manera: los cuatro
 * cortes del periodo, con el trabajador y las sedes que había en pantalla, y
 * el cambio por divisa con su posición neta.
 */

export interface FilaExportada {
  titulo: string;
  /** Segunda columna de texto: el código de la sede o la sede del trabajador. */
  segunda?: string | undefined;
  /** Un día, como fecha: el Excel la guarda como fecha y no como texto. */
  fecha?: string;
  operaciones: number;
  valores: number[];
}

export interface Seccion {
  id: string;
  titulo: string;
  nota?: string;
  primera: string;
  segunda?: string;
  columnas: string[];
  /** Columnas que pueden ser negativas y se escriben con signo. */
  conSigno?: boolean[];
  filas: FilaExportada[];
  /** La fila de total, si sumar las filas tiene sentido. */
  conTotal: boolean;
}

export interface Contenido {
  titulo: string;
  empresa: string;
  periodo: string;
  sedes: string;
  trabajador: string;
  generado: Date;
  generadoPor: string;
  totales: { operaciones: number; monedas: { moneda: string; valor: number }[] };
  secciones: Seccion[];
  /** Para el nombre del archivo. */
  slug: string;
}

const ORDEN: readonly Corte[] = ["sede", "servicio", "trabajador", "dia"];

export function contenidoDe(r: Reporte, session: AdminSession, ahora = new Date()): Contenido {
  const periodo = r.desde === r.hasta ? diaCorto(r.desde) : `${diaCorto(r.desde)} – ${diaCorto(r.hasta)}`;
  const sedes = r.varias ? `Todas mis sedes (${r.sedes.map((s) => s.name).join(", ")})` : (r.sedes[0]?.name ?? "—");

  const secciones: Seccion[] = [];
  for (const corte of ORDEN) {
    /* Con un trabajador elegido todo el archivo es suyo: el corte por
       trabajador sería una sola fila, y la portada ya dice de quién es. */
    if (corte === "trabajador" && r.trabajador) continue;
    const filas = r.cortes[corte];
    const segunda = corte === "sede" ? "Código" : corte === "trabajador" && r.varias ? "Sede" : undefined;
    secciones.push({
      id: corte,
      titulo: NOMBRE_DE_CORTE[corte],
      primera: PRIMERA_COLUMNA[corte],
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
        nota: "Lo comprado y lo vendido es volumen. La posición neta (comprado menos vendido) no lo es: dice cuánta divisa ganó o perdió la caja en el periodo.",
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

  const slug = ["puntocash-resumen-de-operaciones", r.desde, r.hasta, r.trabajador ? normalizar(r.trabajador.fullName) : null]
    .filter(Boolean)
    .join("_");

  return {
    titulo: "Resumen de operaciones",
    empresa: session.operator.name,
    periodo,
    sedes,
    trabajador: r.trabajador ? r.trabajador.fullName : "Todos",
    generado: ahora,
    generadoPor: session.user.fullName,
    totales: { operaciones: r.total.operaciones, monedas: r.monedas.map((m) => ({ moneda: m, valor: r.total.volumen[m] ?? 0 })) },
    secciones,
    slug,
  };
}

function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
