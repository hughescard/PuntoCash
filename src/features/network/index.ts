/**
 * `src/features/network` — el dominio de la RED: qué sedes existen, quién las
 * administra, qué hay dentro de cada una y quién puede tocar qué.
 *
 * Es el nivel que faltaba por encima de la Caja. Hasta ahora el producto solo
 * sabía de una caja (Worker) o de una sede (Kiosco) a la vez; aquí viven la
 * Sede, el Operador, la Asignación histórica, las Cajas, los Trabajadores y el
 * registro de Auditoría, más el **alcance** que decide qué ve cada sesión.
 *
 * Dos principios que este módulo hace ejecutables, no solo documentados:
 *
 *   · **El alcance se deriva de la sesión, no se elige** (regla A1). Toda
 *     consulta recibe un `Scope`, y el alcance global es un valor de ese
 *     parámetro y no su ausencia, de modo que una llamada sin alcance es un
 *     error de compilación (FR-AD-DOM-5, FR-SA-DOM-2).
 *   · **PuntoCash observa dentro de la sede y actúa solo sobre la sede
 *     entera** (regla A14). Las escrituras sobre cajas, trabajadores y
 *     usuarios exigen alcance de operador y rechazan el global, así que la
 *     imposibilidad vive aquí y no en que una pantalla no dibuje un botón
 *     (FR-AD-DOM-6, FR-SA-DOM-3, RP-26).
 *
 * Todo es un mock en memoria, como el resto del producto: una recarga completa
 * restaura los datos precargados.
 *
 * **Todavía no está aquí**, y llega con la pantalla que lo escriba: la lista de
 * monedas por sede y el catálogo de la plataforma, los pares de cotización y
 * los rangos, las promociones y las solicitudes de aprobación. Añadirlos ahora
 * habría sido código muerto que nadie lee ni escribe.
 */

export * from "./scope";
export * from "./sedes";
export * from "./registers";
export * from "./operators";
export * from "./assignments";
export * from "./workers";
export * from "./audit";
