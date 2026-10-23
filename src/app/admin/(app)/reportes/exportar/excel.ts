import ExcelJS from "exceljs";

import { fechaYHora } from "../../jornadas/formato";
import { COLOR, DEFINICION_DE_VOLUMEN, PROPORCION_LOGO, logoFondoClaroPng } from "./marca";
import type { Contenido, Seccion } from "./contenido";

/**
 * La plantilla Excel del reporte — **FR-AD-REP-13**, manual de marca §2–§4 y §17.
 *
 * Un libro con una hoja **Resumen** —logotipo, título, datos del reporte,
 * total del periodo y la definición de volumen— y una hoja por corte. Las
 * cifras son números, no texto, para que se puedan sumar, filtrar y graficar;
 * los ceros se muestran como «—» sin dejar de ser cero; los días son fechas; y
 * los totales son fórmulas. Cabecera de tabla gris claro, filtros puestos,
 * la cabecera fija al desplazar, y cada hoja lista para imprimir en una página
 * de ancho con el periodo y la paginación al pie.
 */

const FUENTE = "Montserrat";
const argb = (hex: string) => `FF${hex.slice(1)}`;
const CIFRA = '#,##0.00;-#,##0.00;"—"';
const CIFRA_CON_SIGNO = '+#,##0.00;-#,##0.00;0.00';

export async function reporteExcel(k: Contenido): Promise<Uint8Array> {
  const libro = new ExcelJS.Workbook();
  libro.creator = "PuntoCash";
  libro.company = k.empresa;
  libro.title = `${k.titulo} · ${k.periodo}`;
  libro.created = k.generado;

  const logo = libro.addImage({ buffer: (await logoFondoClaroPng()) as unknown as ExcelJS.Buffer, extension: "png" });

  resumen(libro, k, logo);
  for (const s of k.secciones) hojaDeCorte(libro, k, s);

  return new Uint8Array(await libro.xlsx.writeBuffer());
}

function resumen(libro: ExcelJS.Workbook, k: Contenido, logo: number) {
  const h = libro.addWorksheet("Resumen", { views: [{ showGridLines: false }], properties: { tabColor: { argb: argb(COLOR.navy) } } });
  h.columns = [{ width: 3 }, { width: 30 }, { width: 22 }, { width: 22 }, { width: 22 }, { width: 22 }];
  pie(h, k);

  h.addImage(logo, { tl: { col: 1, row: 0.6 }, ext: { width: 44 * PROPORCION_LOGO, height: 44 } });
  h.getRow(1).height = 20;
  h.getRow(2).height = 20;
  h.getRow(3).height = 12;
  /* El filete dorado bajo el logotipo: acento, no superficie. */
  for (let col = 2; col <= 6; col++) h.getCell(4, col).border = { top: { style: "medium", color: { argb: argb(COLOR.dorado) } } };

  let r = 6;
  celda(h, r, 2, k.titulo, { size: 18, bold: true, color: COLOR.antracita });
  h.getRow(r).height = 28;
  celda(h, ++r, 2, k.empresa, { size: 10, color: COLOR.gris });
  r += 2;

  for (const [etiqueta, valor] of [
    ["Periodo", k.periodo],
    ["Sedes", k.sedes],
    ["Trabajador", k.trabajador],
    ["Generado", `${fechaYHora(k.generado.toISOString())} · ${k.generadoPor}`],
  ] as const) {
    celda(h, r, 2, etiqueta.toUpperCase(), { size: 8, color: COLOR.gris, medium: true });
    h.mergeCells(r, 3, r, 6);
    celda(h, r, 3, valor, { size: 10, color: COLOR.antracita, wrap: true });
    r++;
  }

  r += 1;
  celda(h, r, 2, "Total del periodo", { size: 13, bold: true, color: COLOR.navy });
  r += 1;
  cabeceraDeTabla(h, r, 2, ["Concepto", "Cifra"]);
  r += 1;
  celda(h, r, 2, "Operaciones completadas", { size: 10, color: COLOR.antracita });
  const ops = h.getCell(r, 3);
  ops.value = k.totales.operaciones;
  ops.numFmt = "#,##0";
  ops.font = { name: FUENTE, size: 10, bold: true, color: { argb: argb(COLOR.antracita) } };
  bordeInferior(h, r, 2, 3);
  for (const m of k.totales.monedas) {
    r += 1;
    celda(h, r, 2, `Volumen en ${m.moneda}`, { size: 10, color: COLOR.antracita });
    const v = h.getCell(r, 3);
    v.value = m.valor;
    v.numFmt = CIFRA;
    v.font = { name: FUENTE, size: 10, bold: true, color: { argb: argb(COLOR.antracita) } };
    bordeInferior(h, r, 2, 3);
  }

  r += 2;
  h.mergeCells(r, 2, r + 2, 6);
  celda(h, r, 2, DEFINICION_DE_VOLUMEN, { size: 9, color: COLOR.gris, wrap: true });
  r += 4;
  celda(h, r, 2, `Cada corte está en su hoja: ${k.secciones.map((s) => s.titulo).join(", ")}.`, { size: 9, color: COLOR.gris });
}

function hojaDeCorte(libro: ExcelJS.Workbook, k: Contenido, s: Seccion) {
  const nombre = s.id === "divisa" ? "Cambio por divisa" : s.titulo;
  const h = libro.addWorksheet(nombre, { views: [{ showGridLines: false, state: "frozen", ySplit: 4 }] });
  pie(h, k);

  const textos = [s.primera, ...(s.segunda ? [s.segunda] : []), "Operaciones"];
  const cabecera = [...textos, ...s.columnas];
  const n = cabecera.length;
  const primeraCifra = textos.length - 1; /* índice 0-based de «Operaciones» */
  h.columns = cabecera.map((_, i) => ({ width: i === 0 ? (s.id === "dia" ? 20 : 36) : i < primeraCifra ? 24 : 16 }));
  h.pageSetup.orientation = n > 6 ? "landscape" : "portrait";

  celda(h, 1, 1, `${s.titulo} · ${k.periodo}`, { size: 13, bold: true, color: COLOR.navy });
  h.getRow(1).height = 22;
  celda(h, 2, 1, `${k.empresa} · ${k.sedes} · Trabajador: ${k.trabajador}`, { size: 9, color: COLOR.gris });
  if (s.nota) celda(h, 3, 1, s.nota, { size: 9, color: COLOR.gris });

  cabeceraDeTabla(h, 4, 1, cabecera, primeraCifra);
  h.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: n } };

  let r = 5;
  for (const f of s.filas) {
    const fila = h.getRow(r);
    const valores: ExcelJS.CellValue[] = [
      f.fecha ? new Date(`${f.fecha}T12:00:00Z`) : f.titulo,
      ...(s.segunda ? [f.segunda ?? ""] : []),
      f.operaciones,
      ...f.valores,
    ];
    valores.forEach((v, i) => {
      const cel = fila.getCell(i + 1);
      cel.value = v;
      cel.font = { name: FUENTE, size: 10, color: { argb: argb(i === 1 && s.segunda ? COLOR.gris : COLOR.antracita) } };
      if (i === 0 && f.fecha) cel.numFmt = "ddd dd/mm/yyyy";
      if (i === primeraCifra) cel.numFmt = "#,##0";
      if (i > primeraCifra) cel.numFmt = s.conSigno?.[i - primeraCifra - 1] ? CIFRA_CON_SIGNO : CIFRA;
      if (i >= primeraCifra) cel.alignment = { horizontal: "right" };
    });
    bordeInferior(h, r, 1, n);
    r++;
  }

  if (s.conTotal && s.filas.length > 0) {
    const fila = h.getRow(r);
    fila.getCell(1).value = "Total";
    for (let i = primeraCifra; i < n; i++) {
      const col = h.getColumn(i + 1).letter;
      const suma = i === primeraCifra
        ? s.filas.reduce((a, f) => a + f.operaciones, 0)
        : s.filas.reduce((a, f) => a + f.valores[i - primeraCifra - 1]!, 0);
      fila.getCell(i + 1).value = { formula: `SUBTOTAL(9,${col}5:${col}${r - 1})`, result: suma };
      fila.getCell(i + 1).numFmt = i === primeraCifra ? "#,##0" : CIFRA;
      fila.getCell(i + 1).alignment = { horizontal: "right" };
    }
    for (let i = 1; i <= n; i++) {
      const cel = fila.getCell(i);
      cel.font = { name: FUENTE, size: 10, bold: true, color: { argb: argb(COLOR.antracita) } };
      cel.border = { top: { style: "thin", color: { argb: argb(COLOR.navy) } } };
    }
  }

  h.pageSetup.printTitlesRow = "4:4";
}

/* ── Piezas ─────────────────────────────────────────────────────────────── */

function pie(h: ExcelJS.Worksheet, k: Contenido) {
  h.pageSetup = { ...h.pageSetup, fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 } };
  h.headerFooter.oddFooter = `&L&"${FUENTE}"&8PuntoCash · ${k.titulo} · ${k.periodo}&R&"${FUENTE}"&8Página &P de &N`;
}

function celda(
  h: ExcelJS.Worksheet,
  fila: number,
  col: number,
  valor: string,
  o: { size: number; bold?: boolean; medium?: boolean; color: string; wrap?: boolean },
) {
  const cel = h.getCell(fila, col);
  cel.value = valor;
  cel.font = { name: FUENTE, size: o.size, bold: Boolean(o.bold), color: { argb: argb(o.color) } };
  cel.alignment = { vertical: o.wrap ? "top" : "middle", wrapText: Boolean(o.wrap) };
}

function cabeceraDeTabla(h: ExcelJS.Worksheet, fila: number, desde: number, textos: string[], primeraCifra = 1) {
  const r = h.getRow(fila);
  r.height = 22;
  textos.forEach((t, i) => {
    const cel = r.getCell(desde + i);
    cel.value = t.toUpperCase();
    cel.font = { name: FUENTE, size: 8, bold: true, color: { argb: argb(COLOR.gris) } };
    cel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb(COLOR.cabecera) } };
    cel.alignment = { vertical: "middle", horizontal: i >= primeraCifra ? "right" : "left" };
  });
}

function bordeInferior(h: ExcelJS.Worksheet, fila: number, desde: number, hasta: number) {
  for (let col = desde; col <= hasta; col++) h.getCell(fila, col).border = { bottom: { style: "thin", color: { argb: argb(COLOR.grisClaro) } } };
}
