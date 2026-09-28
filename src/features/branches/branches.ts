/**
 * Las sedes de la red, tal como las leen el kiosco y la pantalla informativa.
 *
 * Este módulo ya no tiene datos propios: el registro de sedes pasó a
 * `@/features/network`, que es donde vive el dominio de la red — quién
 * administra cada sede, en qué estado está, qué cajas tiene. Aquí queda su
 * **cara pública** y la firma exacta que Worker y Kiosco ya consumían, para
 * que ese cambio no les llegue: una sede sigue siendo un `Branch` con nombre,
 * dirección, horario y teléfono, y `registersOf` sigue devolviendo sus cajas.
 *
 * Lo que sí cambia por debajo, y conviene saber:
 *
 *   · Las cajas **ya no se generan al vuelo**. Son datos que crea y retira el
 *     mercante de cada sede (`network/registers.ts`), así que el número por
 *     sede varía y una sede recién entregada puede no tener ninguna. Los
 *     identificadores conservan el formato `<sedeId>:caja-NN`, de modo que un
 *     equipo ya vinculado sigue resolviendo su caja.
 *   · `registersOf` devuelve las cajas **activas**. Una caja retirada sigue
 *     siendo consultable por id, porque su histórico no desaparece [R9].
 *
 * Nada de lo que se exporta aquí lleva el nombre de un mercante: cada sede es
 * PuntoCash de cara al cliente (AGENTS.md, regla A9).
 */

export type { Branch } from "@/features/network/sedes";
export { BRANCHES, findBranchById, searchBranches } from "@/features/network/sedes";

export type { Register } from "@/features/network/registers";
export { findRegisterById, registersOf } from "@/features/network/registers";
