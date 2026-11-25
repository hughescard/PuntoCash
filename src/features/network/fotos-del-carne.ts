/**
 * LA FOTO DEL CARNÉ DE QUIEN COBRA — remesas y cobro de giros (16/11/2026).
 *
 * Al entregar dinero a un beneficiario, verificar el carné a ojo no deja
 * constancia: si después se reclama que cobró otra persona, no hay con qué
 * contestar. Por eso la entrega exige dos fotos del carné, anverso y reverso,
 * y sin ellas no se completa.
 *
 * La caja es un ordenador sin cámara, así que la foto se hace con el móvil del
 * trabajador: la pantalla de confirmación abre una **captura** y enseña un QR
 * con su enlace; el trabajador lo escanea, hace las dos fotos y la caja las
 * recibe. El enlace es la credencial: opaco, de un solo uso, ligado al
 * trabajador que lo abrió y a la entrega que está confirmando, y vence a los
 * diez minutos si no se completa. En el móvil no hay sesión ni datos del
 * beneficiario más allá de su nombre.
 *
 * Además de las fotos, el beneficiario **firma** en el mismo móvil (25/11/2026):
 * el trabajador se lo pasa y el beneficiario firma con el dedo debajo de una
 * frase con lo que recibe —«Recibo 480,00 USD y 6.240,00 CUP por la remesa
 * RM-…»—. La firma va ligada a esa frase: si en la caja cambia lo que se
 * entrega, la firma deja de valer y hay que firmar lo nuevo. El servidor
 * vuelve a calcular la frase con lo que se registra y exige que coincida.
 *
 * Al registrar la operación, las fotos y la firma pasan a guardarse con ella y
 * la captura se consume. Las ve después la administración (Admin de sede y PuntoCash);
 * el trabajador solo mientras confirma.
 *
 * ── Qué es simulado ───────────────────────────────────────────────────────
 * Las fotos viven en memoria del proceso, como el resto de la red de la
 * demostración. En el producto se guardan cifradas en un almacén de ficheros,
 * con su huella, y la operación guarda la referencia.
 */

import { totalDe, type Billetes } from "@/features/caja/billetes";
import { formatMoney, LOCAL_CURRENCY } from "@/lib/format";
import { almacen } from "./almacen";

export type CaraDelCarne = "anverso" | "reverso";
export const CARAS_DEL_CARNE: readonly CaraDelCarne[] = ["anverso", "reverso"];
export const NOMBRE_DE_CARA: Readonly<Record<CaraDelCarne, string>> = { anverso: "Anverso", reverso: "Reverso" };

export interface FotoDelCarne {
  /** La imagen, como `data:image/jpeg;base64,…`. */
  dataUrl: string;
  tomadaEn: string;
}

/** La firma del beneficiario y la frase que tenía encima al firmar. */
export interface FirmaDelBeneficiario {
  /** El trazo, como `data:image/png;base64,…`. */
  dataUrl: string;
  /** La frase completa que firmó: «Recibo … por la remesa …». */
  frase: string;
  firmadaEn: string;
}

/** Lo que queda guardado con una operación. Las entregas anteriores al 25/11 no tienen firma. */
export interface FotosDeOperacion {
  anverso: FotoDelCarne;
  reverso: FotoDelCarne;
  firma?: FirmaDelBeneficiario;
}

/** Para qué entrega se piden las fotos: lo que el móvil enseña para que el trabajador sepa que es la suya. */
export interface MotivoDeCaptura {
  servicio: "Remesa" | "Giros";
  /** Código de la remesa o del giro. */
  referencia: string;
  beneficiario: string;
  documento: string;
  /** Lo que recibe, ya escrito: «480,00 USD y 6.240,00 CUP» (`loQueRecibe`). */
  recibe: string;
}

interface Captura extends MotivoDeCaptura {
  id: string;
  workerId: string;
  terminalId: string;
  creadaEn: number;
  vigenteHasta: number;
  fotos: Partial<Record<CaraDelCarne, FotoDelCarne>>;
  firma: FirmaDelBeneficiario | null;
  /** El código de la operación que se la llevó. */
  consumidaPor: string | null;
}

/** Plazo para hacer las dos fotos desde que se enseña el QR. */
export const VIGENCIA_DE_CAPTURA_MS = 10 * 60 * 1000;
/** Lo que se tolera por foto, ya reducida en el móvil. */
export const TAMANO_MAXIMO_DE_FOTO = 2_500_000;
const FORMATO_DE_FOTO = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
/** Lo que se tolera por firma: un trazo en PNG pesa unas decenas de KB. */
export const TAMANO_MAXIMO_DE_FIRMA = 600_000;
const FORMATO_DE_FIRMA = /^data:image\/png;base64,[A-Za-z0-9+/=]+$/;

const capturas = almacen("capturasDelCarne", () => new Map<string, Captura>());
const fotosPorOperacion = almacen("fotosDelCarnePorOperacion", () => new Map<string, FotosDeOperacion>());

/** Remesa entregada o giro cobrado: dinero que sale hacia un beneficiario que presenta un código. */
export function requiereFotoDelCarne(op: { servicio: string; tramo: { delta: number } }): boolean {
  return op.servicio === "Remesa" || (op.servicio === "Giros" && op.tramo.delta < 0);
}

/**
 * Lo que recibe el beneficiario, escrito como lo firma: lo entregado en la
 * moneda del servicio y, si se completó en CUP por falta de billetes, también
 * eso. Sin billetes registrados, el importe de la entrega.
 */
export function loQueRecibe(currency: string, importe: number, efectivo?: { entrega?: Billetes; entregaCup?: Billetes }): string {
  const enMoneda = efectivo?.entrega ? totalDe(efectivo.entrega) : importe;
  const enCup = totalDe(efectivo?.entregaCup);
  const partes = [formatMoney({ amount: enMoneda, currency })];
  if (enCup > 0) partes.push(formatMoney({ amount: enCup, currency: LOCAL_CURRENCY }));
  return partes.join(" y ");
}

/** La frase que firma el beneficiario. */
export function fraseDeRecibo(motivo: Pick<MotivoDeCaptura, "servicio" | "referencia" | "recibe">): string {
  return `Recibo ${motivo.recibe} por ${motivo.servicio === "Remesa" ? "la remesa" : "el giro"} ${motivo.referencia}.`;
}

function nuevoId(): string {
  /* 128 bits al azar: el enlace es la única credencial del móvil. */
  return crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "").slice(0, 8);
}

/** Se olvidan las capturas vencidas sin usar y las ya consumidas hace más de una hora. */
function purgar(now: number): void {
  for (const [id, c] of capturas) {
    const abandonada = c.consumidaPor === null && !completa(c) && c.vigenteHasta < now - 60 * 60 * 1000;
    const vieja = c.creadaEn < now - 24 * 60 * 60 * 1000;
    if (abandonada || vieja) capturas.delete(id);
  }
}

function fotosHechas(c: Captura): boolean {
  return CARAS_DEL_CARNE.every((cara) => c.fotos[cara] !== undefined);
}

/** Las dos fotos y la firma de la frase de ahora. */
function completa(c: Captura): boolean {
  return fotosHechas(c) && c.firma !== null && c.firma.frase === fraseDeRecibo(c);
}

export function abrirCaptura(
  quien: { workerId: string; terminalId: string },
  motivo: MotivoDeCaptura,
  now = Date.now(),
): { id: string; vigenteHasta: string } {
  purgar(now);
  const id = nuevoId();
  capturas.set(id, {
    ...motivo,
    ...quien,
    id,
    creadaEn: now,
    vigenteHasta: now + VIGENCIA_DE_CAPTURA_MS,
    fotos: {},
    firma: null,
    consumidaPor: null,
  });
  return { id, vigenteHasta: new Date(now + VIGENCIA_DE_CAPTURA_MS).toISOString() };
}

/* -------------------------------------------------------------------------
 * El móvil
 * ---------------------------------------------------------------------- */

/** Por qué el móvil no puede usar un enlace. Las tres se distinguen: quien lo tiene es el trabajador, no el público. */
export type EnlaceInservible = "no-existe" | "vencido" | "usado";

export interface CapturaParaElMovil {
  servicio: MotivoDeCaptura["servicio"];
  referencia: string;
  /** Solo el nombre: el móvil es un dispositivo personal y no necesita más. */
  beneficiario: string;
  tomadas: readonly CaraDelCarne[];
  /** Lo que firma el beneficiario. */
  frase: string;
  /** Si ya firmó esa frase. */
  firmada: boolean;
  vigenteHasta: string;
}

function inservible(c: Captura | undefined, now: number): EnlaceInservible | null {
  if (!c) return "no-existe";
  if (c.consumidaPor !== null) return "usado";
  if (!completa(c) && c.vigenteHasta < now) return "vencido";
  return null;
}

export function capturaParaElMovil(
  id: string,
  now = Date.now(),
): { ok: true; value: CapturaParaElMovil } | { ok: false; reason: EnlaceInservible } {
  const c = capturas.get(id);
  const motivo = inservible(c, now);
  if (motivo || !c) return { ok: false, reason: motivo ?? "no-existe" };
  return {
    ok: true,
    value: {
      servicio: c.servicio,
      referencia: c.referencia,
      beneficiario: c.beneficiario,
      tomadas: CARAS_DEL_CARNE.filter((cara) => c.fotos[cara] !== undefined),
      frase: fraseDeRecibo(c),
      firmada: c.firma !== null && c.firma.frase === fraseDeRecibo(c),
      vigenteHasta: new Date(c.vigenteHasta).toISOString(),
    },
  };
}

export type FotoRechazada = EnlaceInservible | "formato-invalido" | "demasiado-grande";

/** Guarda (o repite) una cara. Repetir vale mientras la entrega no se haya registrado. */
export function subirFotoDelCarne(
  id: string,
  cara: CaraDelCarne,
  dataUrl: string,
  now = Date.now(),
): { ok: true; value: { tomadas: readonly CaraDelCarne[] } } | { ok: false; reason: FotoRechazada } {
  const c = capturas.get(id);
  /* Una cara que se repite con la otra ya hecha no vence: la captura está completa. */
  const motivo = inservible(c, now);
  if (motivo || !c) return { ok: false, reason: motivo ?? "no-existe" };
  if (!CARAS_DEL_CARNE.includes(cara) || !FORMATO_DE_FOTO.test(dataUrl)) return { ok: false, reason: "formato-invalido" };
  if (dataUrl.length > TAMANO_MAXIMO_DE_FOTO) return { ok: false, reason: "demasiado-grande" };
  c.fotos[cara] = { dataUrl, tomadaEn: new Date(now).toISOString() };
  return { ok: true, value: { tomadas: CARAS_DEL_CARNE.filter((x) => c.fotos[x] !== undefined) } };
}

export type FirmaRechazada = EnlaceInservible | "formato-invalido" | "demasiado-grande" | "faltan-fotos" | "frase-cambio";

/**
 * Guarda (o repite) la firma. Se firma después de las dos fotos, y sobre la
 * frase que el móvil enseñó: si la caja cambió lo que se entrega entretanto,
 * no se guarda y el móvil enseña la frase nueva.
 */
export function subirFirma(
  id: string,
  frase: string,
  dataUrl: string,
  now = Date.now(),
): { ok: true } | { ok: false; reason: FirmaRechazada } {
  const c = capturas.get(id);
  const motivo = inservible(c, now);
  if (motivo || !c) return { ok: false, reason: motivo ?? "no-existe" };
  if (!fotosHechas(c)) return { ok: false, reason: "faltan-fotos" };
  if (frase !== fraseDeRecibo(c)) return { ok: false, reason: "frase-cambio" };
  if (!FORMATO_DE_FIRMA.test(dataUrl)) return { ok: false, reason: "formato-invalido" };
  if (dataUrl.length > TAMANO_MAXIMO_DE_FIRMA) return { ok: false, reason: "demasiado-grande" };
  c.firma = { dataUrl, frase, firmadaEn: new Date(now).toISOString() };
  return { ok: true };
}

/* -------------------------------------------------------------------------
 * La caja
 * ---------------------------------------------------------------------- */

export interface EstadoDeCaptura {
  /** Las fotos recibidas, para que el trabajador compruebe que se leen antes de confirmar. */
  fotos: Partial<Record<CaraDelCarne, FotoDelCarne>>;
  /** La firma, si es de la frase de ahora. */
  firma: FirmaDelBeneficiario | null;
  frase: string;
  completa: boolean;
  vencida: boolean;
  vigenteHasta: string;
}

/** Lo que ve la caja que abrió la captura. Para cualquier otro trabajador, no existe. */
export function estadoDeCaptura(id: string, workerId: string, now = Date.now()): EstadoDeCaptura | null {
  const c = capturas.get(id);
  if (!c || c.workerId !== workerId || c.consumidaPor !== null) return null;
  return {
    fotos: { ...c.fotos },
    firma: c.firma && c.firma.frase === fraseDeRecibo(c) ? c.firma : null,
    frase: fraseDeRecibo(c),
    completa: completa(c),
    vencida: !completa(c) && c.vigenteHasta < now,
    vigenteHasta: new Date(c.vigenteHasta).toISOString(),
  };
}

/**
 * Lo que entrega la caja cambió (otros billetes, otro reparto en CUP): la
 * frase nueva sustituye a la anterior y la firma que había deja de valer.
 */
export function actualizarLoQueRecibe(id: string, workerId: string, recibe: string): boolean {
  const c = capturas.get(id);
  if (!c || c.workerId !== workerId || c.consumidaPor !== null) return false;
  c.recibe = recibe;
  return true;
}

/** Lo que le falta a una captura para acompañar la entrega que se va a registrar. */
export type FaltaEnLaEntrega = "falta-foto-del-carne" | "falta-firma";

/**
 * ¿Puede esta captura acompañar la entrega? `recibe` lo calcula el servidor con
 * lo que se va a registrar: la firma tiene que ser de esa frase, no de otra.
 */
export function queFaltaEnLaCaptura(
  id: string | undefined,
  workerId: string,
  entrega: { documento: string; recibe: string },
): FaltaEnLaEntrega | null {
  const c = id ? capturas.get(id) : undefined;
  if (!c || c.workerId !== workerId || c.consumidaPor !== null || c.documento !== entrega.documento || !fotosHechas(c)) {
    return "falta-foto-del-carne";
  }
  if (!c.firma || c.firma.frase !== fraseDeRecibo({ ...c, recibe: entrega.recibe })) return "falta-firma";
  return null;
}

/** Las fotos pasan a la operación y la captura queda usada. */
export function consumirCaptura(id: string, workerId: string, codigoOperacion: string): boolean {
  const c = capturas.get(id);
  if (!c || c.workerId !== workerId || c.consumidaPor !== null || !completa(c)) return false;
  fotosPorOperacion.set(codigoOperacion, { anverso: c.fotos.anverso!, reverso: c.fotos.reverso!, firma: c.firma! });
  c.consumidaPor = codigoOperacion;
  c.fotos = {};
  return true;
}

/* -------------------------------------------------------------------------
 * La administración
 * ---------------------------------------------------------------------- */

/** Las fotos de una entrega. Solo las leen las pantallas de Admin de sede y de PuntoCash, que ya aplican su alcance. */
export function fotosDeOperacion(codigo: string): FotosDeOperacion | null {
  return fotosPorOperacion.get(codigo) ?? null;
}
