/**
 * Las reglas de una tarifa de giro que no dependen de ningún almacén: el
 * dominio las aplica al guardar y el formulario de PuntoCash las aplica
 * mientras se escribe, sin arrastrar la red al navegador.
 */

export interface TramoDeTarifa {
  /** Límite superior, **incluido**. `null` en el último: no tiene. */
  hasta: number | null;
  /** En la moneda del giro. */
  fijo: number;
  /** Sobre lo que recibe el beneficiario: 2.5 es un 2,5 %. */
  porcentaje: number;
}

export interface TarifaDeGiro {
  moneda: string;
  /** El giro más pequeño que se puede enviar, sobre lo que recibe el beneficiario. */
  minimo: number;
  /** Del más bajo al más alto; el último, con `hasta: null`. */
  tramos: readonly TramoDeTarifa[];
  updatedAt: string;
  updatedBy: string;
}

const T = (hasta: number | null, fijo: number, porcentaje: number): TramoDeTarifa => ({ hasta, fijo, porcentaje });

/**
 * Las tarifas con las que arranca la demostración. Viven aquí, sin almacén,
 * porque también las lee la siembra de jornadas para que los giros del
 * historial hayan pagado la tarifa que les toca.
 */
export const TARIFAS_SEMBRADAS: Readonly<Record<string, { minimo: number; tramos: readonly TramoDeTarifa[]; updatedAt: string }>> = {
  CUP: { minimo: 1_000, tramos: [T(10_000, 150, 0), T(50_000, 100, 1), T(null, 0, 0.8)], updatedAt: "2026-11-02T14:00:00.000Z" },
  USD: { minimo: 10, tramos: [T(100, 3, 0), T(500, 1, 2), T(null, 0, 1.5)], updatedAt: "2026-11-02T14:05:00.000Z" },
  EUR: { minimo: 10, tramos: [T(100, 3, 0), T(500, 1, 2), T(null, 0, 1.5)], updatedAt: "2026-11-02T14:10:00.000Z" },
};

/** El tramo en el que cae un giro, por lo que recibe el beneficiario. */
export function tramoDe(tarifa: Pick<TarifaDeGiro, "tramos">, importe: number): TramoDeTarifa {
  const tramo = tarifa.tramos.find((t) => t.hasta === null || importe <= t.hasta + 1e-9);
  /* El último no tiene límite superior: siempre hay uno. */
  return tramo ?? tarifa.tramos[tarifa.tramos.length - 1]!;
}

/**
 * Dónde empieza un tramo: el primero, en el giro mínimo, incluido; los demás,
 * justo por encima del límite del anterior («más de 100»).
 */
export function inicioDeTramo(tarifa: Pick<TarifaDeGiro, "minimo" | "tramos">, indice: number): { desde: number; incluido: boolean } {
  if (indice === 0) return { desde: tarifa.minimo, incluido: true };
  return { desde: tarifa.tramos[indice - 1]!.hasta ?? tarifa.minimo, incluido: false };
}

/* -------------------------------------------------------------------------
 * Pagable: múltiplo de la denominación más pequeña
 * ---------------------------------------------------------------------- */

/* Se compara en diezmilésimas, que es la precisión de toda moneda de la plataforma. */
const enUnidades = (v: number) => Math.round(v * 1e4);
const tieneMasDe4Decimales = (v: number) => Math.abs(enUnidades(v) / 1e4 - v) > 1e-9;

export function esPagable(valor: number, menor: number): boolean {
  if (tieneMasDe4Decimales(valor)) return false;
  return enUnidades(valor) % enUnidades(menor) === 0;
}

/** El porcentaje admite dos decimales: 1,25 %. */
const tieneMasDe2Decimales = (v: number) => Math.abs(Math.round(v * 100) / 100 - v) > 1e-9;

export type TarifaWriteDenial =
  | "alcance-insuficiente"
  | "moneda-desconocida"
  /** Retirada del catálogo y sin política: no se abren giros en una moneda que ya no se ofrece. */
  | "moneda-retirada"
  /** No circula ninguna denominación: no se podría pagar ni cobrar nada en efectivo. */
  | "sin-denominaciones"
  | "minimo-invalido"
  | "minimo-no-pagable"
  | "sin-tramos"
  | "limite-invalido"
  | "limite-no-pagable"
  /** El límite de un tramo no supera el del anterior (o el mínimo, en el primero). */
  | "limite-no-creciente"
  /** Solo el último tramo va sin límite superior. */
  | "ultimo-con-limite"
  | "fijo-invalido"
  | "fijo-no-pagable"
  | "porcentaje-invalido"
  | "tramo-sin-tarifa"
  | "motivo-requerido"
  | "sin-tarifa";

export interface TarifaWriteError {
  reason: TarifaWriteDenial;
  /** El tramo con el problema (desde 0), cuando es de un tramo. */
  tramo?: number;
}

export type TarifaWriteResult<T> = { ok: true; value: T } | { ok: false; error: TarifaWriteError };

/**
 * Por qué una política no se puede guardar, o `null`. La usan el dominio al
 * guardar y el formulario para avisar mientras se escribe.
 */
export function validarTarifaDeGiro(
  menor: number,
  minimo: number,
  tramos: readonly TramoDeTarifa[],
): TarifaWriteError | null {
  if (!Number.isFinite(minimo) || minimo <= 0) return { reason: "minimo-invalido" };
  if (!esPagable(minimo, menor)) return { reason: "minimo-no-pagable" };
  if (tramos.length === 0) return { reason: "sin-tramos" };

  let anterior = minimo;
  for (const [i, t] of tramos.entries()) {
    const ultimo = i === tramos.length - 1;
    if (t.hasta === null) {
      if (!ultimo) return { reason: "limite-invalido", tramo: i };
    } else {
      if (ultimo) return { reason: "ultimo-con-limite", tramo: i };
      if (!Number.isFinite(t.hasta) || t.hasta <= 0) return { reason: "limite-invalido", tramo: i };
      if (!esPagable(t.hasta, menor)) return { reason: "limite-no-pagable", tramo: i };
      if (t.hasta <= anterior) return { reason: "limite-no-creciente", tramo: i };
      anterior = t.hasta;
    }
    if (!Number.isFinite(t.fijo) || t.fijo < 0) return { reason: "fijo-invalido", tramo: i };
    if (!esPagable(t.fijo, menor)) return { reason: "fijo-no-pagable", tramo: i };
    if (!Number.isFinite(t.porcentaje) || t.porcentaje < 0 || t.porcentaje >= 100 || tieneMasDe2Decimales(t.porcentaje)) {
      return { reason: "porcentaje-invalido", tramo: i };
    }
    if (t.fijo === 0 && t.porcentaje === 0) return { reason: "tramo-sin-tarifa", tramo: i };
  }
  return null;
}

/* -------------------------------------------------------------------------
 * Cuánto se cobra
 * ---------------------------------------------------------------------- */

/** Lleva una cifra al múltiplo de `menor` igual o superior: la casa no pierde (decisión del 19/11). */
export function redondearAlAlza(valor: number, menor: number): number {
  const u = enUnidades(menor);
  /* Se tolera el ruido de coma flotante antes de subir de escalón: 2,92 no pasa a 2,93. */
  const escalones = Math.ceil(enUnidades(valor) / u - 1e-9);
  return (escalones * u) / 1e4;
}

export interface TarifaCalculada {
  /** El tramo aplicado, por su posición (desde 0). */
  tramo: number;
  fijo: number;
  porcentaje: number;
  /** Lo que daría la cuenta, sin redondear: fijo + porcentaje del giro. */
  exacta: number;
  /** Lo que se cobra: la cuenta llevada al múltiplo de la denominación más pequeña, al alza. */
  cobrada: number;
}

/**
 * La tarifa de un giro: la del tramo en el que cae lo que recibe el
 * beneficiario, redondeada al alza a la denominación más pequeña que circula.
 */
export function calcularTarifa(tarifa: Pick<TarifaDeGiro, "tramos">, importe: number, menor: number): TarifaCalculada {
  const t = tramoDe(tarifa, importe);
  const exacta = t.fijo + (importe * t.porcentaje) / 100;
  return {
    tramo: tarifa.tramos.indexOf(t),
    fijo: t.fijo,
    porcentaje: t.porcentaje,
    exacta,
    cobrada: redondearAlAlza(exacta, menor),
  };
}

/* -------------------------------------------------------------------------
 * Cotizar un giro, en las dos formas
 * ---------------------------------------------------------------------- */

/**
 * Cómo pide el cliente el giro (decisión del 19/11):
 *
 *   · `enviar`: dice cuánto entrega, y la tarifa sale de ahí.
 *   · `llegar`: dice cuánto recibe el beneficiario, y se le suma la tarifa.
 */
export type FormaDeGiro = "enviar" | "llegar";

export interface CotizacionDeGiro {
  forma: FormaDeGiro;
  /** Lo que recibe el beneficiario. */
  giro: number;
  tarifa: TarifaCalculada;
  /** Lo que se cobra: giro + tarifa. */
  total: number;
  /** En `enviar`, lo que dijo el cliente que entrega; en `llegar`, igual al total. */
  entrega: number;
  /** En `enviar`, lo que sobra de lo que entrega y se le devuelve. */
  vuelto: number;
  /**
   * Por qué sobra: el giro siguiente que se podría enviar ya pide más de lo
   * que entrega el cliente. Solo cuando hay vuelto.
   */
  siguiente?: { giro: number; total: number };
}

export type CotizacionRechazada =
  | { reason: "importe-invalido" }
  /** El importe no se puede pagar con las denominaciones que circulan. */
  | { reason: "no-pagable"; menor: number }
  /** Queda por debajo del giro mínimo. `entregaMinima` es lo que el cliente tendría que entregar para llegar a él. */
  | { reason: "bajo-minimo"; minimo: number; entregaMinima: number };

export type ResultadoDeCotizacion = { ok: true; value: CotizacionDeGiro } | ({ ok: false } & CotizacionRechazada);

/* Las cuentas se hacen en diezmilésimas enteras, para que 0,1 + 0,2 sea 0,3. */
const desdeUnidades = (u: number) => u / 1e4;

/**
 * La cotización de un giro con la tarifa de su moneda.
 *
 * En `enviar` se busca, tramo a tramo, el mayor giro pagable cuyo total
 * (giro + tarifa redondeada) no pase de lo entregado. Dentro de un tramo el
 * total crece con el giro; entre tramos puede saltar en cualquier sentido,
 * y por eso se miran todos y se queda el mayor.
 */
export function cotizarGiro(
  tarifa: Pick<TarifaDeGiro, "minimo" | "tramos">,
  menor: number,
  forma: FormaDeGiro,
  importe: number,
): ResultadoDeCotizacion {
  if (!Number.isFinite(importe) || importe <= 0) return { ok: false, reason: "importe-invalido" };
  if (!esPagable(importe, menor)) return { ok: false, reason: "no-pagable", menor };

  const paso = enUnidades(menor);
  const total = (g: number) => enUnidades(g) + enUnidades(calcularTarifa(tarifa, g, menor).cobrada);
  const bajoMinimo = (): ResultadoDeCotizacion => ({
    ok: false,
    reason: "bajo-minimo",
    minimo: tarifa.minimo,
    entregaMinima: desdeUnidades(total(tarifa.minimo)),
  });
  const armar = (giro: number, entrega: number): CotizacionDeGiro => {
    const t = calcularTarifa(tarifa, giro, menor);
    const tot = desdeUnidades(total(giro));
    const vuelto = desdeUnidades(enUnidades(entrega) - total(giro));
    const sig = desdeUnidades(enUnidades(giro) + paso);
    return {
      forma,
      giro,
      tarifa: t,
      total: tot,
      entrega,
      vuelto,
      ...(vuelto > 0 ? { siguiente: { giro: sig, total: desdeUnidades(total(sig)) } } : {}),
    };
  };

  if (forma === "llegar") {
    if (importe < tarifa.minimo) return bajoMinimo();
    return { ok: true, value: armar(importe, desdeUnidades(total(importe))) };
  }

  const E = enUnidades(importe);
  let mejor: number | null = null;
  tarifa.tramos.forEach((t, i) => {
    const lo = i === 0 ? enUnidades(tarifa.minimo) : enUnidades(tarifa.tramos[i - 1]!.hasta ?? 0) + paso;
    const hi = t.hasta === null ? Number.POSITIVE_INFINITY : enUnidades(t.hasta);
    /* Primera aproximación sin redondear la tarifa, llevada al paso de la denominación. */
    const aprox = (E - enUnidades(t.fijo)) / (1 + t.porcentaje / 100);
    let g = Math.min(Math.floor(aprox / paso) * paso, hi);
    for (let n = 0; n < 10_000 && g >= lo && total(desdeUnidades(g)) > E; n++) g -= paso;
    if (g < lo) return;
    for (let n = 0; n < 10_000 && g + paso <= hi && total(desdeUnidades(g + paso)) <= E; n++) g += paso;
    if (mejor === null || g > mejor) mejor = g;
  });
  if (mejor === null) return bajoMinimo();
  return { ok: true, value: armar(desdeUnidades(mejor), importe) };
}

/**
 * Un tramo con porcentaje en el que, al principio del tramo, el porcentaje no
 * llega a la denominación más pequeña: el redondeo pesa más que el porcentaje
 * y la tarifa real sale muy por encima de lo que dice la tabla. No se impide
 * (decisión del 19/11): se avisa, porque lo normal es resolverlo con un fijo.
 */
export function redondeoQuePesa(
  tarifa: Pick<TarifaDeGiro, "minimo" | "tramos">,
  indice: number,
  menor: number,
): { giro: number; exacta: number; cobrada: number } | null {
  const t = tarifa.tramos[indice];
  if (!t || t.porcentaje <= 0) return null;
  const giro = inicioDeTramo(tarifa, indice).desde;
  const parte = (giro * t.porcentaje) / 100;
  if (parte >= menor) return null;
  const exacta = t.fijo + parte;
  return { giro, exacta, cobrada: redondearAlAlza(exacta, menor) };
}

/**
 * Qué deja de poder pagarse en una política si la denominación más pequeña
 * pasa a ser `menor`. Vacío si todo sigue siendo pagable.
 */
export function impagablesCon(tarifa: Pick<TarifaDeGiro, "minimo" | "tramos">, menor: number): readonly string[] {
  const fuera: string[] = [];
  if (!esPagable(tarifa.minimo, menor)) fuera.push("el giro mínimo");
  tarifa.tramos.forEach((t, i) => {
    if (t.hasta !== null && !esPagable(t.hasta, menor)) fuera.push(`el límite del tramo ${i + 1}`);
    if (!esPagable(t.fijo, menor)) fuera.push(`el fijo del tramo ${i + 1}`);
  });
  return fuera;
}

/* -------------------------------------------------------------------------
 * Cómo se lee
 * ---------------------------------------------------------------------- */

/** Una política en una línea, para la auditoría: «Mínimo 10 · hasta 100: 3 · más de 100 hasta 500: 1 + 2 % · …». */
export function resumenDeTarifa(t: Pick<TarifaDeGiro, "minimo" | "tramos">, cifra: (v: number) => string): string {
  const tramos = t.tramos.map((x, i) => {
    const { desde, incluido } = inicioDeTramo(t, i);
    const donde =
      x.hasta === null
        ? `más de ${cifra(desde)}`
        : incluido
          ? `de ${cifra(desde)} a ${cifra(x.hasta)}`
          : `más de ${cifra(desde)} hasta ${cifra(x.hasta)}`;
    return `${donde}: ${textoDeTarifa(x, cifra)}`;
  });
  return [`Mínimo ${cifra(t.minimo)}`, ...tramos].join(" · ");
}

/** «3,00», «2 %», «1,00 + 2 %». Sin moneda: quien la muestra la añade si hace falta. */
export function textoDeTarifa(t: Pick<TramoDeTarifa, "fijo" | "porcentaje">, cifra: (v: number) => string): string {
  const pct = `${String(t.porcentaje).replace(".", ",")} %`;
  if (t.fijo > 0 && t.porcentaje > 0) return `${cifra(t.fijo)} + ${pct}`;
  return t.fijo > 0 ? cifra(t.fijo) : pct;
}
