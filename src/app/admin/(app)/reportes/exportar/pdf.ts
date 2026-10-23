import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import { formatAmount, formatSignedAmount } from "@/lib/format";
import { fechaYHora } from "../../jornadas/formato";
import { COLOR, DEFINICION_DE_VOLUMEN, ISOTIPO, fuente, rgb01 } from "./marca";
import type { Contenido, Seccion } from "./contenido";

/**
 * La plantilla PDF del reporte — **FR-AD-REP-13**, manual de marca §2–§4 y §17.
 *
 * Carta, márgenes de 40 pt. La primera página abre con la banda navy de la
 * marca —el logotipo para fondo oscuro a la izquierda, el nombre del documento
 * a la derecha— y un filete dorado debajo; las siguientes, con una cabecera
 * corta. Después: título, datos del reporte, el total del periodo en
 * recuadros, la definición de volumen y los cortes, cada uno con su tabla.
 * Tablas a la manera del manual: cabecera gris claro, divisores horizontales
 * finos, sin líneas verticales, cifras a la derecha. Pie con el periodo y la
 * paginación. Si las columnas no caben en vertical, la hoja va apaisada.
 */

const M = 40;
const c = (hex: string) => rgb(...rgb01(hex));

interface Fuentes {
  regular: PDFFont;
  medium: PDFFont;
  semibold: PDFFont;
  bold: PDFFont;
}

export async function reportePdf(k: Contenido): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle(`${k.titulo} · ${k.periodo}`);
  doc.setAuthor("PuntoCash");
  doc.setCreator("PuntoCash · Administración de sede");
  doc.setCreationDate(k.generado);

  const f: Fuentes = {
    regular: await doc.embedFont(await fuente("400Regular"), { subset: true }),
    medium: await doc.embedFont(await fuente("500Medium"), { subset: true }),
    semibold: await doc.embedFont(await fuente("600SemiBold"), { subset: true }),
    bold: await doc.embedFont(await fuente("700Bold"), { subset: true }),
  };

  /* Apaisada si la tabla más ancha no cabe en vertical. */
  const anchoNecesario = Math.max(...k.secciones.map((s) => anchoMinimo(s)));
  const [W, H] = anchoNecesario > 612 - 2 * M ? [792, 612] : [612, 792];
  const util = W - 2 * M;

  let page = doc.addPage([W, H]);
  let y = cabeceraPrincipal(page, f, k);

  const nuevaPagina = () => {
    page = doc.addPage([W, H]);
    y = cabeceraCorta(page, f, k);
  };
  const asegurar = (alto: number) => {
    if (y - alto < M + 28) nuevaPagina();
  };

  /* ── Título y datos ─────────────────────────────────────────────────── */
  page.drawText(k.titulo, { x: M, y: y - 22, size: 20, font: f.bold, color: c(COLOR.antracita) });
  page.drawText(k.empresa, { x: M, y: y - 38, size: 10, font: f.medium, color: c(COLOR.gris) });
  y -= 60;

  const datos: [string, string][] = [
    ["Periodo", k.periodo],
    ["Sedes", k.sedes],
    ["Trabajador", k.trabajador],
    ["Generado", `${fechaYHora(k.generado.toISOString())} · ${k.generadoPor}`],
  ];
  for (const [etiqueta, valor] of datos) {
    page.drawText(etiqueta.toUpperCase(), { x: M, y, size: 7, font: f.medium, color: c(COLOR.gris) });
    const lineas = partir(valor, f.regular, 9, util - 90);
    lineas.forEach((l, i) => page.drawText(l, { x: M + 90, y: y - i * 12, size: 9, font: f.regular, color: c(COLOR.antracita) }));
    y -= 12 * lineas.length + 4;
  }
  y -= 12;

  /* ── Total del periodo ─────────────────────────────────────────────── */
  page.drawText("Total del periodo", { x: M, y: y - 12, size: 12, font: f.semibold, color: c(COLOR.navy) });
  y -= 24;
  const cajas = [{ etiqueta: "OPERACIONES COMPLETADAS", valor: String(k.totales.operaciones) }].concat(
    k.totales.monedas.map((m) => ({ etiqueta: `VOLUMEN EN ${m.moneda}`, valor: formatAmount(m.valor) })),
  );
  const porFila = Math.max(1, Math.floor((util + 8) / 132));
  const anchoCaja = (util - 8 * (porFila - 1)) / porFila;
  cajas.forEach((caja, i) => {
    if (i > 0 && i % porFila === 0) y -= 52;
    const x = M + (i % porFila) * (anchoCaja + 8);
    page.drawRectangle({ x, y: y - 44, width: anchoCaja, height: 44, borderColor: c(COLOR.grisClaro), borderWidth: 0.75, color: c(COLOR.blanco) });
    page.drawText(caja.etiqueta, { x: x + 10, y: y - 14, size: 6.5, font: f.medium, color: c(COLOR.gris) });
    const tam = ajustar(caja.valor, f.bold, 14, anchoCaja - 20);
    page.drawText(caja.valor, { x: x + 10, y: y - 34, size: tam, font: f.bold, color: c(COLOR.antracita) });
  });
  y -= 60;

  const definicion = partir(DEFINICION_DE_VOLUMEN, f.regular, 7.5, util);
  definicion.forEach((l, i) => page.drawText(l, { x: M, y: y - i * 10, size: 7.5, font: f.regular, color: c(COLOR.gris) }));
  y -= definicion.length * 10 + 18;

  /* ── Los cortes ────────────────────────────────────────────────────── */
  for (const s of k.secciones) {
    const nota = s.nota ? partir(s.nota, f.regular, 8, util) : [];
    /* El título no se queda solo al pie: con él, al menos la cabecera y dos filas. */
    asegurar(22 + nota.length * 11 + 22 + 2 * 18);
    page.drawText(s.titulo, { x: M, y: y - 12, size: 12, font: f.semibold, color: c(COLOR.navy) });
    y -= 20;
    nota.forEach((l, i) => page.drawText(l, { x: M, y: y - 8 - i * 11, size: 8, font: f.regular, color: c(COLOR.gris) }));
    y -= nota.length * 11 + (nota.length ? 8 : 2);

    const anchos = anchosDe(s, util);
    /* Si las columnas se estrecharon, la letra también, para que las cifras quepan enteras. */
    const escala = Math.max(0.7, Math.min(1, util / anchoMinimo(s)));
    const tamFila = 8.5 * escala;
    const tamCabecera = 6.5 * escala;
    const cabecera = [s.primera, ...(s.segunda ? [s.segunda] : []), "Operaciones", ...s.columnas];
    const numerica = (i: number) => i >= (s.segunda ? 2 : 1);

    const pintarCabecera = () => {
      page.drawRectangle({ x: M, y: y - 20, width: util, height: 20, color: c(COLOR.cabecera) });
      let x = M;
      cabecera.forEach((t, i) => {
        const txt = t.toUpperCase();
        const w = f.medium.widthOfTextAtSize(txt, tamCabecera);
        page.drawText(txt, { x: numerica(i) ? x + anchos[i]! - 8 - w : x + 8, y: y - 13, size: tamCabecera, font: f.medium, color: c(COLOR.gris) });
        x += anchos[i]!;
      });
      y -= 20;
    };
    pintarCabecera();

    const fila = (celdas: string[], fuenteFila: PDFFont, separador: "fino" | "total") => {
      if (y - 18 < M + 28) {
        nuevaPagina();
        pintarCabecera();
      }
      let x = M;
      celdas.forEach((t, i) => {
        const disponible = anchos[i]! - 16;
        const txt = recortar(t, fuenteFila, tamFila, disponible);
        const w = fuenteFila.widthOfTextAtSize(txt, tamFila);
        const gris = t === "—" || (i === 1 && s.segunda);
        page.drawText(txt, {
          x: numerica(i) ? x + anchos[i]! - 8 - w : x + 8,
          y: y - 12.5,
          size: tamFila,
          font: fuenteFila,
          color: c(gris ? COLOR.gris : COLOR.antracita),
        });
        x += anchos[i]!;
      });
      y -= 18;
      if (separador === "fino") {
        page.drawLine({ start: { x: M, y }, end: { x: M + util, y }, thickness: 0.5, color: c(COLOR.grisClaro) });
      }
    };

    const celdasDe = (titulo: string, segunda: string | undefined, operaciones: number, valores: number[]) => [
      titulo,
      ...(s.segunda ? [segunda ?? ""] : []),
      String(operaciones),
      ...valores.map((v, i) => (s.conSigno?.[i] ? formatSignedAmount(v) : v === 0 ? "—" : formatAmount(v))),
    ];

    for (const r of s.filas) fila(celdasDe(r.titulo, r.segunda, r.operaciones, r.valores), f.regular, "fino");

    if (s.conTotal) {
      if (y - 20 < M + 28) {
        nuevaPagina();
        pintarCabecera();
      }
      page.drawLine({ start: { x: M, y }, end: { x: M + util, y }, thickness: 1, color: c(COLOR.navy) });
      const operaciones = s.filas.reduce((a, r) => a + r.operaciones, 0);
      const valores = s.columnas.map((_, i) => s.filas.reduce((a, r) => a + r.valores[i]!, 0));
      fila(celdasDe("Total", "", operaciones, valores), f.semibold, "total");
    }
    y -= 22;
  }

  /* ── Pie de cada página ────────────────────────────────────────────── */
  const paginas = doc.getPages();
  paginas.forEach((p, i) => {
    p.drawLine({ start: { x: M, y: M + 10 }, end: { x: W - M, y: M + 10 }, thickness: 0.5, color: c(COLOR.grisClaro) });
    p.drawText(`PuntoCash · ${k.titulo} · ${k.periodo}`, { x: M, y: M - 2, size: 7, font: f.regular, color: c(COLOR.gris) });
    const pag = `Página ${i + 1} de ${paginas.length}`;
    p.drawText(pag, { x: W - M - f.regular.widthOfTextAtSize(pag, 7), y: M - 2, size: 7, font: f.regular, color: c(COLOR.gris) });
  });

  return doc.save();
}

/* ── Cabeceras ──────────────────────────────────────────────────────────── */

/** La banda navy con el logotipo para fondo oscuro (§2, §3). Devuelve dónde empieza el contenido. */
function cabeceraPrincipal(page: PDFPage, f: Fuentes, k: Contenido): number {
  const { width: W, height: H } = page.getSize();
  const alto = 72;
  page.drawRectangle({ x: 0, y: H - alto, width: W, height: alto, color: c(COLOR.navy) });
  /* El filete dorado: acento, nunca superficie (§3, «regla de balance»). */
  page.drawRectangle({ x: 0, y: H - alto - 2.5, width: W, height: 2.5, color: c(COLOR.dorado) });

  logotipo(page, f, M, H - alto / 2, 1, true);

  const titulo = k.titulo;
  page.drawText(titulo, {
    x: W - M - f.semibold.widthOfTextAtSize(titulo, 11),
    y: H - alto / 2 + 2,
    size: 11,
    font: f.semibold,
    color: c(COLOR.blanco),
  });
  /* Un nombre de empresa largo no puede pisar el logotipo. */
  const sub = recortar(k.empresa, f.regular, 8, W / 2 - M);
  page.drawText(sub, {
    x: W - M - f.regular.widthOfTextAtSize(sub, 8),
    y: H - alto / 2 - 12,
    size: 8,
    font: f.regular,
    color: c(COLOR.sobreNavy),
  });
  return H - alto - 2.5 - 26;
}

/** Las páginas siguientes: logotipo pequeño y el documento, sobre fondo blanco. */
function cabeceraCorta(page: PDFPage, f: Fuentes, k: Contenido): number {
  const { width: W, height: H } = page.getSize();
  logotipo(page, f, M, H - 34, 0.62, false);
  const t = `${k.titulo} · ${k.periodo}`;
  page.drawText(t, { x: W - M - f.medium.widthOfTextAtSize(t, 8), y: H - 37, size: 8, font: f.medium, color: c(COLOR.gris) });
  page.drawLine({ start: { x: M, y: H - 52 }, end: { x: W - M, y: H - 52 }, thickness: 0.5, color: c(COLOR.grisClaro) });
  return H - 52 - 20;
}

/**
 * El logotipo completo —isotipo, «PUNTO CASH» y «CASA DE CAMBIO»— dibujado en
 * vectores con Montserrat, como en la consola (§2). `centroY` es el centro
 * vertical del conjunto.
 */
function logotipo(page: PDFPage, f: Fuentes, x: number, centroY: number, escala: number, oscuro: boolean) {
  const altoPin = 30 * escala;
  page.drawSvgPath(ISOTIPO, { x, y: centroY + altoPin / 2, scale: altoPin / 32, color: c(COLOR.dorado) });
  const xt = x + (24 * altoPin) / 32 + 10 * escala;
  const tam = 19 * escala;
  page.drawText("PUNTO", { x: xt, y: centroY + 1 * escala, size: tam, font: f.bold, color: c(oscuro ? COLOR.blanco : COLOR.navy) });
  page.drawText(" CASH", { x: xt + f.bold.widthOfTextAtSize("PUNTO", tam), y: centroY + 1 * escala, size: tam, font: f.bold, color: c(COLOR.dorado) });
  /* El descriptor, espaciado como en la marca. */
  let xd = xt + 1;
  const td = 5.6 * escala;
  for (const letra of "CASA DE CAMBIO") {
    page.drawText(letra, { x: xd, y: centroY - 11 * escala, size: td, font: f.medium, color: c(oscuro ? COLOR.sobreNavy : COLOR.gris) });
    xd += f.medium.widthOfTextAtSize(letra, td) + td * 0.28;
  }
}

/* ── Medidas y texto ────────────────────────────────────────────────────── */

const PRIMERA_MIN = 140;

/** Las columnas fijas de una tabla: la segunda de texto, operaciones y una por cifra. */
function fijasDe(s: Seccion): number[] {
  return (s.segunda ? [118] : []).concat([64], s.columnas.map(() => 78));
}

/** Lo que necesita una tabla para verse sin estrecharse. */
function anchoMinimo(s: Seccion): number {
  return PRIMERA_MIN + fijasDe(s).reduce((a, b) => a + b, 0);
}

/**
 * Anchos de columna: la primera se lleva lo que sobra. Si ni apaisada cabe
 * —muchas monedas a la vez—, todas se estrechan en proporción en vez de
 * salirse de la hoja: una cifra cortada por el borde es una cifra perdida.
 */
function anchosDe(s: Seccion, util: number): number[] {
  const fijas = fijasDe(s);
  const sumaFijas = fijas.reduce((a, b) => a + b, 0);
  if (PRIMERA_MIN + sumaFijas > util) {
    const f = util / (PRIMERA_MIN + sumaFijas);
    return [PRIMERA_MIN * f, ...fijas.map((w) => w * f)];
  }
  return [util - sumaFijas, ...fijas];
}

function partir(texto: string, font: PDFFont, size: number, ancho: number): string[] {
  const lineas: string[] = [];
  let actual = "";
  for (const palabra of texto.split(" ")) {
    const prueba = actual ? `${actual} ${palabra}` : palabra;
    if (font.widthOfTextAtSize(prueba, size) > ancho && actual) {
      lineas.push(actual);
      actual = palabra;
    } else actual = prueba;
  }
  if (actual) lineas.push(actual);
  return lineas;
}

function recortar(texto: string, font: PDFFont, size: number, ancho: number): string {
  if (font.widthOfTextAtSize(texto, size) <= ancho) return texto;
  let t = texto;
  while (t.length > 1 && font.widthOfTextAtSize(`${t}…`, size) > ancho) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

function ajustar(texto: string, font: PDFFont, size: number, ancho: number): number {
  let s = size;
  while (s > 8 && font.widthOfTextAtSize(texto, s) > ancho) s -= 0.5;
  return s;
}
