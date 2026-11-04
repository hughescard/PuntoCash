/**
 * CUÁNTAS PROMOCIONES COINCIDEN en una sala — lógica pura, sin almacén.
 *
 * Vive aparte de `promotions.ts` porque los formularios de las dos consolas
 * la calculan en el navegador mientras se escribe, y importar `promotions.ts`
 * desde un componente de cliente arrastraría su almacén y su imagen sembrada
 * al paquete que baja el navegador.
 */

/**
 * Las promociones que coincidirían **a la vez** en una sede durante un
 * periodo: no las que lo tocan, sino las del día más cargado. Una de un mes
 * junto a cuatro de una semana, una detrás de otra, nunca son más de dos en
 * pantalla. Basta mirar el primer día y cada día en que empieza otra
 * (**FR-AD-PROM-8**, **FR-SA-PROM-5**).
 */
export function enPantallaALaVez<T extends { sedes: readonly string[]; desde: string; hasta: string }>(
  otras: readonly T[],
  sedeId: string,
  desde: string,
  hasta: string,
): readonly T[] {
  if (!desde || !hasta) return [];
  const solapadas = otras.filter((o) => o.sedes.includes(sedeId) && o.desde <= hasta && desde <= o.hasta);
  const dias = [desde, ...solapadas.map((o) => o.desde).filter((d) => d > desde)];
  let pico: readonly T[] = [];
  for (const dia of dias) {
    const ese = solapadas.filter((o) => o.desde <= dia && dia <= o.hasta);
    if (ese.length > pico.length) pico = ese;
  }
  return pico;
}

const PUNTOCASH = "PuntoCash";

/**
 * «1 de PuntoCash, 3 de Malecón Servicios Financieros S.R.L.». PuntoCash va
 * primero: es la parte que la consola de PuntoCash sí puede cambiar.
 */
export function composicionDe(promos: readonly { de: string }[]): string {
  const cuenta = new Map<string, number>();
  for (const p of promos) cuenta.set(p.de, (cuenta.get(p.de) ?? 0) + 1);
  return [...cuenta.entries()]
    .sort(([a], [b]) => (a === PUNTOCASH ? -1 : b === PUNTOCASH ? 1 : a.localeCompare(b, "es")))
    .map(([de, n]) => `${n} de ${de}`)
    .join(", ");
}
