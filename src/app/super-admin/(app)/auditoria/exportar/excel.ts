import ExcelJS from "exceljs";

import { COLOR, PROPORCION_LOGO, logoFondoClaroPng } from "@/app/admin/(app)/reportes/exportar/marca";
import type { FilaDeAuditoria } from "../filtro";

/**
 * El Excel de Auditoría — **FR-SA-AUD-9**, sobre la plantilla de los reportes
 * (manual de marca §2–§4 y §17): logotipo, filete dorado, cabecera gris claro,
 * filtros puestos, cabecera fija y lista para imprimir en una página de ancho.
 *
 * Lleva **lo que había en pantalla**: la misma selección, en el mismo orden, y
 * en la cabecera del archivo, qué filtros la produjeron, para que quien lo
 * recibe sepa qué está leyendo. La fecha es una fecha de verdad —con la hora de
 * Cuba, la de la pantalla— para que se pueda ordenar y filtrar.
 */

const FUENTE = "Montserrat";
const argb = (hex: string) => `FF${hex.slice(1)}`;

export interface ContenidoDeAuditoria {
  generado: Date;
  generadoPor: string;
  /** Los filtros puestos, en palabras. */
  filtros: string;
  filas: readonly FilaDeAuditoria[];
}

/** Las 15:42 en Cuba como un instante «sin zona»: Excel guarda fechas sin zona, y debe leerse lo mismo que en pantalla. */
function relojDeCuba(iso: string): Date {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Havana",
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
      .formatToParts(new Date(iso))
      .map((x) => [x.type, x.value]),
  );
  return new Date(Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute)));
}

const COLUMNAS = [
  { titulo: "Fecha y hora", ancho: 18 },
  { titulo: "Evento", ancho: 38 },
  { titulo: "Sobre qué", ancho: 40 },
  { titulo: "Quién actuó", ancho: 24 },
  { titulo: "Rol", ancho: 12 },
  { titulo: "Operador", ancho: 32 },
  { titulo: "Sede", ancho: 26 },
  { titulo: "Motivo declarado", ancho: 48 },
  { titulo: "Antes", ancho: 30 },
  { titulo: "Después", ancho: 30 },
] as const;

export async function auditoriaExcel(k: ContenidoDeAuditoria): Promise<Uint8Array> {
  const libro = new ExcelJS.Workbook();
  libro.creator = "PuntoCash";
  libro.company = "PuntoCash · Red de sedes";
  libro.title = "Registro de auditoría";
  libro.created = k.generado;

  const logo = libro.addImage({ buffer: (await logoFondoClaroPng()) as unknown as ExcelJS.Buffer, extension: "png" });
  const h = libro.addWorksheet("Auditoría", {
    views: [{ showGridLines: false, state: "frozen", ySplit: 9 }],
    properties: { tabColor: { argb: argb(COLOR.navy) } },
  });
  h.columns = COLUMNAS.map((c) => ({ width: c.ancho }));
  h.pageSetup = {
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 },
    printTitlesRow: "9:9",
  };
  h.headerFooter.oddFooter = `&L&"${FUENTE}"&8PuntoCash · Registro de auditoría&R&"${FUENTE}"&8Página &P de &N`;

  h.addImage(logo, { tl: { col: 0, row: 0.6 }, ext: { width: 44 * PROPORCION_LOGO, height: 44 } });
  h.getRow(1).height = 20;
  h.getRow(2).height = 20;
  h.getRow(3).height = 12;
  /* El filete dorado bajo el logotipo: acento, no superficie. */
  for (let col = 1; col <= COLUMNAS.length; col++) h.getCell(4, col).border = { top: { style: "medium", color: { argb: argb(COLOR.dorado) } } };

  const texto = (fila: number, valor: string, o: { size: number; bold?: boolean; color: string }) => {
    const c = h.getCell(fila, 1);
    c.value = valor;
    c.font = { name: FUENTE, size: o.size, bold: Boolean(o.bold), color: { argb: argb(o.color) } };
    c.alignment = { vertical: "middle" };
  };
  texto(5, "Registro de auditoría", { size: 18, bold: true, color: COLOR.antracita });
  h.getRow(5).height = 28;
  texto(6, `${k.filas.length === 1 ? "1 evento" : `${k.filas.length} eventos`} · ${k.filtros}`, { size: 10, color: COLOR.gris });
  texto(7, `Generado el ${relojDeCuba(k.generado.toISOString()).toISOString().slice(0, 16).replace("T", " a las ")} (hora de Cuba) por ${k.generadoPor}`, {
    size: 9,
    color: COLOR.gris,
  });

  const cabecera = h.getRow(9);
  cabecera.height = 22;
  COLUMNAS.forEach((c, i) => {
    const cel = cabecera.getCell(i + 1);
    cel.value = c.titulo.toUpperCase();
    cel.font = { name: FUENTE, size: 8, bold: true, color: { argb: argb(COLOR.gris) } };
    cel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb(COLOR.cabecera) } };
    cel.alignment = { vertical: "middle", horizontal: "left" };
  });
  h.autoFilter = { from: { row: 9, column: 1 }, to: { row: 9, column: COLUMNAS.length } };

  k.filas.forEach((f, i) => {
    const r = 10 + i;
    const valores: (string | Date)[] = [
      relojDeCuba(f.cuando),
      f.evento,
      f.objeto,
      f.actor,
      f.rolEtiqueta,
      f.operador ?? "",
      f.sede ?? "",
      f.motivo ?? "",
      f.antes ?? "",
      f.despues ?? "",
    ];
    valores.forEach((v, c) => {
      const cel = h.getCell(r, c + 1);
      cel.value = v;
      cel.font = { name: FUENTE, size: 10, color: { argb: argb(c === 1 ? COLOR.antracita : COLOR.antracita) }, bold: c === 1 };
      cel.alignment = { vertical: "top", wrapText: c >= 1 };
      cel.border = { bottom: { style: "thin", color: { argb: argb(COLOR.grisClaro) } } };
      if (c === 0) cel.numFmt = "dd/mm/yyyy hh:mm";
    });
  });

  return new Uint8Array(await libro.xlsx.writeBuffer());
}
