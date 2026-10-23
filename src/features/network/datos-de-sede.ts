/**
 * Los **datos de contacto** de una sede, escritos por su administrador —
 * **FR-AD-SEDE-14**.
 *
 * Dirección, municipio y provincia, teléfono y horario son lo que la sucursal
 * exhibe en su pantalla de sala, y quien sabe si son correctos es quien la
 * atiende: si el teléfono cambió o el sábado se cierra antes, esperar a que
 * PuntoCash lo corrija deja la sala anunciando algo falso. El **código** y el
 * **nombre** no están aquí: son la forma en que PuntoCash reconoce la sede en
 * toda la red, y siguen siendo suyos (`editarSede`).
 *
 * La dirección se puede cambiar entera, municipio incluido. Eso permite que
 * una «mudanza» pase por una corrección; lo que lo compensa es que **cada
 * cambio queda en el registro de auditoría con el antes y el después**, que es
 * donde PuntoCash lo ve.
 *
 * Vive fuera de `sedes.ts` porque necesita el alcance del operador
 * (`assignments.ts`), y `assignments.ts` ya depende de `sedes.ts`.
 */

import { estaEnAlcance } from "./assignments";
import { textoDeHorario, validarHorario, type HorarioInvalido, type HorarioSemanal } from "./horario";
import { requireOperatorScope, type Scope, type ScopeDenial } from "./scope";
import { findSedeById, type Sede } from "./sedes";

export interface DatosDeContacto {
  address: string;
  locality: string;
  phone: string;
  horario: HorarioSemanal;
}

export type DatosDeContactoDenial =
  | ScopeDenial
  | "fuera-de-alcance"
  | "sede-no-encontrada"
  | "sede-cerrada"
  | "direccion-vacia"
  | "municipio-vacio"
  | "telefono-invalido"
  | "horario-invalido";

export type DatosDeContactoResult =
  | { ok: true; value: { sede: Sede; antes: DatosDeContacto; cambios: readonly CampoDeContacto[] } }
  | { ok: false; reason: DatosDeContactoDenial; horario?: HorarioInvalido };

export type CampoDeContacto = "direccion" | "municipio" | "telefono" | "horario";

/** Un número con al menos 8 cifras; se admiten «+», espacios y guiones. */
export function telefonoValido(phone: string): boolean {
  return /^\+?[\d\s-]+$/.test(phone) && phone.replace(/\D/g, "").length >= 8;
}

export function datosDeContacto(sede: Sede): DatosDeContacto {
  return { address: sede.address, locality: sede.locality, phone: sede.phone, horario: sede.horario };
}

export function editarDatosDeContacto(
  scope: Scope,
  sedeId: string,
  input: DatosDeContacto,
): DatosDeContactoResult {
  const operator = requireOperatorScope(scope);
  if (!operator.ok) return { ok: false, reason: operator.reason };
  /* Fuera de alcance responde igual que inexistente para quien llama: la
     acción del servidor no distingue los dos (FR-AD-NAV-3). */
  if (!estaEnAlcance(scope, sedeId)) return { ok: false, reason: "fuera-de-alcance" };
  const sede = findSedeById(sedeId);
  if (!sede) return { ok: false, reason: "sede-no-encontrada" };
  if (sede.status === "cerrada") return { ok: false, reason: "sede-cerrada" };

  const address = input.address.trim();
  const locality = input.locality.trim();
  const phone = input.phone.trim().replace(/\s+/g, " ");
  if (!address) return { ok: false, reason: "direccion-vacia" };
  if (!locality) return { ok: false, reason: "municipio-vacio" };
  if (!telefonoValido(phone)) return { ok: false, reason: "telefono-invalido" };
  const horarioMal = validarHorario(input.horario);
  if (horarioMal) return { ok: false, reason: "horario-invalido", horario: horarioMal };

  const antes = datosDeContacto(sede);
  const cambios: CampoDeContacto[] = [];
  if (address !== antes.address) cambios.push("direccion");
  if (locality !== antes.locality) cambios.push("municipio");
  if (phone !== antes.phone) cambios.push("telefono");
  if (textoDeHorario(input.horario) !== textoDeHorario(antes.horario)) cambios.push("horario");

  /* Mutación en su sitio, como toda escritura de la red: quien ya tiene la
     referencia (la sesión, el kiosco) ve el cambio. */
  sede.address = address;
  sede.locality = locality;
  sede.phone = phone;
  sede.horario = input.horario;
  sede.hours = textoDeHorario(input.horario);

  return { ok: true, value: { sede, antes, cambios } };
}
