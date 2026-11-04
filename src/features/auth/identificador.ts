/**
 * EL IDENTIFICADOR DE ACCESO: el nombre de usuario con el que se entra.
 *
 * Es un dato propio, distinto del nombre de la persona y distinto de su
 * correo. En el acceso y en la recuperación de contraseña valen los dos
 * indistintamente, el identificador o el correo (decisión del 28/10/2026).
 *
 * ── Por qué un identificador no puede llevar «@» ──────────────────────────
 * Si pudiera, «usuario o correo» dejaría de tener una respuesta: la misma
 * cadena podría ser el identificador de una persona y el correo de otra, y
 * habría que inventar cuál gana. Con esta regla las dos cosas no se parecen
 * nunca y no hace falta elegir. Es también lo que permite que el padrón
 * compruebe los duplicados de los dos campos por separado sin que se crucen.
 */

/** Lo que se admite: letras, números, punto, guion y guion bajo. */
const PATRON = /^[a-z0-9._-]+$/i;

export const IDENTIFICADOR_MIN = 3;
export const IDENTIFICADOR_MAX = 30;

export type IdentificadorInvalido = "vacio" | "corto" | "largo" | "con-arroba" | "caracteres";

/** Por qué un identificador no sirve, o `null` si sirve. */
export function revisarIdentificador(valor: string): IdentificadorInvalido | null {
  const v = valor.trim();
  if (!v) return "vacio";
  if (v.includes("@")) return "con-arroba";
  if (v.length < IDENTIFICADOR_MIN) return "corto";
  if (v.length > IDENTIFICADOR_MAX) return "largo";
  if (!PATRON.test(v)) return "caracteres";
  return null;
}

export function esIdentificadorValido(valor: string): boolean {
  return revisarIdentificador(valor) === null;
}

/** El mensaje que ve quien escribe un identificador que no sirve. */
export function mensajeDeIdentificador(motivo: IdentificadorInvalido): string {
  switch (motivo) {
    case "vacio":
      return "Escribe el identificador de acceso.";
    case "con-arroba":
      return "El identificador es un nombre de usuario, no un correo: no lleva «@». El correo se pide aparte y sirve igual para entrar.";
    case "corto":
      return `El identificador necesita al menos ${IDENTIFICADOR_MIN} caracteres.`;
    case "largo":
      return `El identificador no puede pasar de ${IDENTIFICADOR_MAX} caracteres.`;
    case "caracteres":
      return "Usa solo letras, números, punto, guion o guion bajo.";
  }
}

/** Mayúsculas y espacios no distinguen una cuenta de otra al entrar. */
export function normalizarCuenta(valor: string): string {
  return valor.trim().toLowerCase();
}

/** Lo tecleado parece un correo y no un nombre de usuario. */
export function pareceCorreo(valor: string): boolean {
  return valor.includes("@");
}

/**
 * Si lo tecleado identifica a esta cuenta, por su identificador o por su
 * correo. Es la comparación que hace que los dos valgan en el acceso.
 */
export function cuentaCoincide(cuenta: { identifier: string; email: string }, tecleado: string): boolean {
  const v = normalizarCuenta(tecleado);
  return cuenta.identifier.toLowerCase() === v || cuenta.email.toLowerCase() === v;
}
