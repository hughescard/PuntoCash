/**
 * Un almacén de la red que vive en `globalThis`.
 *
 * Next carga los módulos del servidor en **más de un grafo**: las pantallas,
 * las acciones de servidor y los manejadores de ruta pueden tener cada uno su
 * copia de un mismo módulo. Un arreglo o un `Map` declarados en el módulo
 * serían entonces varios, y una caja creada desde una acción no existiría
 * para la pantalla que la busca. Las jornadas, las operaciones y las
 * solicitudes ya vivían aquí; desde el recableado de Worker —que escribe en la
 * red desde acciones y lee desde pantallas— viven aquí todos los almacenes.
 *
 * `crear` solo corre la primera vez: el resto de cargas del módulo reciben el
 * mismo objeto.
 */
export function almacen<T>(clave: string, crear: () => T): T {
  const g = globalThis as unknown as Record<string, T | undefined>;
  const k = `__puntocash_${clave}`;
  return (g[k] ??= crear());
}
