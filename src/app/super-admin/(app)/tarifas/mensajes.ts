import type { TarifaWriteDenial, TarifaWriteError } from "@/features/network/tarifas-reglas";

/**
 * Lo que se le dice a quien edita una tarifa, por cada motivo de rechazo. Lo
 * comparten la acción del servidor y el formulario, que avisa mientras se
 * escribe con las mismas palabras.
 */
const TEXTO: Record<TarifaWriteDenial, (moneda: string, motivoMin: number) => string> = {
  "alcance-insuficiente": () => "Esta acción solo la puede hacer PuntoCash.",
  "moneda-desconocida": () => "Esa moneda no está en el catálogo.",
  "moneda-retirada": (m) => `El ${m} está retirado del catálogo: reincorpóralo antes de definirle una tarifa.`,
  "sin-denominaciones": (m) =>
    `No circula ninguna denominación del ${m}: no se puede cobrar ni pagar en efectivo. Añádelas en Monedas y tasas.`,
  "minimo-invalido": () => "Escribe el giro mínimo: un importe mayor que cero.",
  "minimo-no-pagable": (m) => `El giro mínimo tiene que poder pagarse con las denominaciones del ${m}.`,
  "sin-tramos": () => "Define al menos un tramo.",
  "limite-invalido": () => "Escribe hasta qué importe llega el tramo.",
  "limite-no-pagable": (m) => `El límite tiene que poder pagarse con las denominaciones del ${m}.`,
  "limite-no-creciente": () => "El límite tiene que ser mayor que el giro mínimo y que el límite del tramo anterior.",
  "ultimo-con-limite": () => "El último tramo no tiene límite superior.",
  "fijo-invalido": () => "El fijo no puede ser negativo. Escribe 0 si el tramo no lleva fijo.",
  "fijo-no-pagable": (m) => `El fijo tiene que poder pagarse con las denominaciones del ${m}.`,
  "porcentaje-invalido": () =>
    "El porcentaje va de 0 a menos de 100, con dos decimales como mucho. Escribe 0 si el tramo no lleva porcentaje.",
  "tramo-sin-tarifa": () => "El fijo y el porcentaje no pueden ser cero a la vez: el tramo no cobraría nada.",
  "motivo-requerido": (_m, min) => `Escribe el motivo del cambio: al menos ${min} caracteres.`,
  "sin-tarifa": (m) => `Los giros en ${m} ya no tienen tarifa. Recarga para ver su estado.`,
};

export function mensajeDeTarifa(error: TarifaWriteError, moneda: string, motivoMin: number): string {
  const texto = TEXTO[error.reason](moneda, motivoMin);
  return error.tramo === undefined ? texto : `Tramo ${error.tramo + 1}: ${texto.charAt(0).toLowerCase()}${texto.slice(1)}`;
}
