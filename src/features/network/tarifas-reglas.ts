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
