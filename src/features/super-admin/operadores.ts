/**
 * Lo que la consola de PuntoCash cuenta de cada operador.
 *
 * Vive aquí y no en las pantallas porque lo leen el listado y la ficha, y
 * porque la regla de atribución tiene que ser una sola: **las operaciones se
 * atribuyen al operador que tenía la sede en la fecha de cada operación**, no
 * al que la tiene hoy. Si una sede cambió de manos a mitad de mes, cada parte
 * cuenta para quien la operaba; es lo que hace falta para conciliar.
 *
 * Sin importes (decisión del 28/10): el volumen vive en Reportes, y la
 * comisión por operación todavía no está definida.
 */

import { GLOBAL_SCOPE } from "@/features/network/scope";
import { redEnAlcance } from "@/features/network/scoped-reads";
import { SEDES, type Sede } from "@/features/network/sedes";
import { adminUsersOf, type Operator } from "@/features/network/operators";
import { historialDeOperador, operadorVigenteEn, sedesDeOperador } from "@/features/network/assignments";
import { diaEnCuba, jornadasDeSede, type Jornada } from "@/features/network/jornadas";

export interface ResumenDeOperador {
  sedes: readonly Sede[];
  usuarios: number;
  usuariosActivos: number;
  trabajadoresActivos: number;
  /** Equipos de caja y kioscos vinculados en sus sedes vigentes. */
  equipos: number;
  /** Operaciones del mes en curso (hora de Cuba) hechas mientras operaba cada sede. */
  operacionesDelMes: number;
  /** Las mismas, por sede, incluidas las que ya no administra. */
  operacionesPorSede: readonly { sede: Sede; operaciones: number }[];
  jornadasAbiertas: readonly Jornada[];
}

export function resumenDeOperador(operador: Operator, ahora: Date = new Date()): ResumenDeOperador {
  const red = redEnAlcance(GLOBAL_SCOPE);
  const sedes = sedesDeOperador(operador.id)
    .map((id) => SEDES.find((s) => s.id === id))
    .filter((s): s is Sede => s !== undefined)
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
  const usuarios = adminUsersOf(operador.id);
  const mes = diaEnCuba(ahora).slice(0, 7);

  /* Todas las sedes que tuvo alguna vez: una sede revocada este mes también
     tiene operaciones suyas en el mes. */
  const tuvo = [...new Set(historialDeOperador(operador.id).map((t) => t.branchId))]
    .map((id) => SEDES.find((s) => s.id === id))
    .filter((s): s is Sede => s !== undefined);

  const operacionesPorSede = tuvo
    .map((sede) => ({
      sede,
      operaciones: red
        .operaciones(sede.id)
        .filter(
          (o) =>
            diaEnCuba(o.fechaHora).slice(0, 7) === mes &&
            operadorVigenteEn(sede.id, new Date(o.fechaHora)) === operador.id,
        ).length,
    }))
    .filter((x) => x.operaciones > 0 || sedes.includes(x.sede))
    .sort((a, b) => b.operaciones - a.operaciones || a.sede.name.localeCompare(b.sede.name, "es"));

  return {
    sedes,
    usuarios: usuarios.length,
    usuariosActivos: usuarios.filter((u) => u.status === "activo").length,
    trabajadoresActivos: sedes.reduce(
      (n, s) => n + red.trabajadores(s.id).filter((w) => w.status === "activo").length,
      0,
    ),
    equipos: sedes.reduce((n, s) => n + red.equipos(s.id).length, 0),
    operacionesDelMes: operacionesPorSede.reduce((n, x) => n + x.operaciones, 0),
    operacionesPorSede,
    jornadasAbiertas: sedes.flatMap((s) => jornadasDeSede(s.id).filter((j) => j.closedAt === null)),
  };
}

/**
 * El documento de un operador tal como se lee: «NIT 01234567890»,
 * «CI 88041203210», «Pasaporte K1234567». Se guarda como «TIPO-número».
 */
export function documentoLegible(legalId: string): string {
  const [tipo, ...resto] = legalId.split("-");
  const numero = resto.join("-");
  if (!numero) return legalId;
  const etiqueta = tipo === "PASAPORTE" ? "Pasaporte" : tipo;
  return `${etiqueta} ${numero}`;
}
