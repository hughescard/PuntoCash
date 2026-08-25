/**
 * FRONTEND-ONLY MOCK — there is no session yet.
 *
 * Replace `getCurrentWorker` with the real session read (cookie, JWT or Server
 * Action) once authentication exists. `WorkerSession` is the contract the shell
 * renders against, so the header and sidebar should not need to change.
 */

export interface WorkerSession {
  fullName: string;
  /** Used for the greeting, which addresses the worker by first name. */
  firstName: string;
  /** Avatar fallback. */
  initials: string;
  /** Assigned cash register, e.g. "Caja 03" (manual §10). */
  register: string;
}

export function getCurrentWorker(): WorkerSession {
  return {
    fullName: "Juan Pérez",
    firstName: "Juan",
    initials: "JP",
    register: "Caja 03",
  };
}

/**
 * Greeting for the home heading.
 *
 * Deliberately time-of-day agnostic: a Worker Home greeting has no business
 * needing clock or timezone logic just to render a heading.
 */
export function getGreeting(): string {
  return "Hola";
}
