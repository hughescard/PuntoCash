/**
 * ALCANCE — quién puede ver y escribir qué (Administración PRD regla A1).
 *
 * Toda consulta y toda escritura de este dominio recibe un `Scope` explícito.
 * El alcance global es un VALOR de ese parámetro, no su ausencia: así una
 * llamada sin alcance es un error de compilación y no una fuga silenciosa de
 * datos de una sede a otra (FR-AD-DOM-5, FR-SA-DOM-2).
 *
 * Este módulo es deliberadamente de tipos y guardas puras, sin lecturas de
 * datos: quién administra qué sede lo resuelve `assignments.ts`, que sí
 * importa de aquí. Mantenerlo sin dependencias evita un ciclo de imports.
 */

/** Admin de sede: ve las sedes con asignación vigente a su operador. */
export interface OperatorScope {
  kind: "operator";
  operatorId: string;
}

/** Super Admin: ve la red entera. */
export interface GlobalScope {
  kind: "global";
}

export type Scope = OperatorScope | GlobalScope;

export const GLOBAL_SCOPE: GlobalScope = { kind: "global" };

export function operatorScope(operatorId: string): OperatorScope {
  return { kind: "operator", operatorId };
}

/**
 * Motivos por los que el dominio rechaza una operación de alcance. Se
 * devuelven como resultado, nunca se lanzan: una selección obsoleta es un
 * estado de producto normal, no un error técnico (mismo criterio que
 * `habilitarMoneda` en `caja-data.ts`).
 */
export type ScopeDenial =
  /** El recurso existe pero pertenece a otro operador — se trata igual que si no existiera (FR-AD-NAV-2). */
  | "fuera-de-alcance"
  /**
   * Una escritura sobre algo que vive DENTRO de una sede llegó con alcance
   * global. PuntoCash observa dentro de la sede y actúa solo sobre la sede
   * entera (regla A14, RP-26): no crea cajas, no vincula equipos, no da de
   * alta ni desactiva trabajadores ni usuarios.
   */
  | "alcance-global-prohibido";

export type ScopeCheck<T> = { ok: true; value: T } | { ok: false; reason: ScopeDenial };

export function denied<T>(reason: ScopeDenial): ScopeCheck<T> {
  return { ok: false, reason };
}

export function allowed<T>(value: T): ScopeCheck<T> {
  return { ok: true, value };
}

/**
 * Exige alcance de operador. Es la guarda que hace imposible —no solo
 * improbable— que el Super Admin escriba dentro de una sede: la
 * imposibilidad vive aquí y no en que una pantalla no dibuje un botón
 * (FR-AD-DOM-6, FR-SA-DOM-3).
 */
export function requireOperatorScope(scope: Scope): ScopeCheck<string> {
  if (scope.kind !== "operator") return denied("alcance-global-prohibido");
  return allowed(scope.operatorId);
}

export function isGlobal(scope: Scope): scope is GlobalScope {
  return scope.kind === "global";
}
