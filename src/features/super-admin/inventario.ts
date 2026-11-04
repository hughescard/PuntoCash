/**
 * EL INVENTARIO DE LA RED — lo que hay montado en todas las sedes.
 *
 * PuntoCash no monta nada de esto: las cajas las crea el administrador de
 * cada sede y los equipos los vincula él, delante del aparato. Lo que esta
 * lectura compone es el **registro** de lo que existe, que es lo que permite
 * conciliar con cada operador y responder en una auditoría.
 *
 * Dos cosas que el requisito pedía y aquí se resuelven de otra forma, porque
 * tal como estaban escritas no se sostienen:
 *
 *   · **«Sedes sin cajas» no puede ser un conmutador de la tabla de cajas.**
 *     Una sede sin cajas no tiene ninguna fila que mostrar ahí. Se cuentan
 *     aparte y la pantalla las anuncia sobre la tabla, con enlace al listado
 *     de Sedes, que ya tiene ese filtro.
 *   · **Un kiosco no genera «solicitudes»** en este producto: una solicitud es
 *     la aprobación que pide un trabajador por una diferencia de efectivo, y
 *     nace en una caja. Lo que un kiosco genera son **operaciones de
 *     autoservicio**, y eso es lo que se cuenta, en una ventana explícita de
 *     30 días para que la cifra signifique algo.
 */

import { GLOBAL_SCOPE } from "@/features/network/scope";
import { redEnAlcance } from "@/features/network/scoped-reads";
import { SEDES, type Sede } from "@/features/network/sedes";
import { OPERATORS, type Operator } from "@/features/network/operators";
import { asignacionVigente, estadoDeSede, type EstadoDeSede } from "@/features/network/assignments";
import type { RegisterStatus } from "@/features/network/registers";
import type { EstadoJornada } from "@/features/network/jornadas";
import { provinciaDeLocalidad } from "@/features/geography/provincias-de-cuba";

/** Los días que mira la cifra de uso de un kiosco. */
export const VENTANA_DE_USO_DIAS = 30;

export interface SedeDeFila {
  id: string;
  nombre: string;
  codigo: string;
  provincia: string;
  estado: EstadoDeSede;
}

export interface EquipoVinculado {
  id: string;
  label: string;
  linkedAt: string;
  linkedBy: string;
  lastSeenAt: string | null;
}

export interface CajaDeRed {
  id: string;
  nombre: string;
  sede: SedeDeFila;
  operador: Operator | null;
  estado: RegisterStatus;
  /** Solo las retiradas: cuándo y con qué motivo lo declaró su mercante (**[R9]**). */
  retiro: { at: string; motivo: string } | null;
  equipo: EquipoVinculado | null;
  /** Su jornada más reciente, abierta o no: es «cómo está la caja» de un vistazo. */
  jornada: { id: string; estado: EstadoJornada; trabajador: string; openedAt: string } | null;
  /** Lo más reciente de la caja: la señal del equipo o la última jornada. */
  ultimaActividad: string | null;
}

export interface KioscoDeRed {
  id: string;
  label: string;
  sede: SedeDeFila;
  operador: Operator | null;
  linkedAt: string;
  linkedBy: string;
  lastSeenAt: string | null;
  /** Operaciones de autoservicio que nacieron en él dentro de la ventana. */
  operaciones: number;
}

export interface SedeSinCajas {
  sede: SedeDeFila;
  operador: Operator | null;
}

export interface InventarioDeRed {
  cajas: readonly CajaDeRed[];
  kioscos: readonly KioscoDeRed[];
  /** Las que no tienen ninguna caja y por tanto no aparecen en la tabla. */
  sinCajas: readonly SedeSinCajas[];
}

export function inventarioDeRed(ahora: Date = new Date()): InventarioDeRed {
  const red = redEnAlcance(GLOBAL_SCOPE);
  const desde = new Date(ahora.getTime() - VENTANA_DE_USO_DIAS * 24 * 3600 * 1000).toISOString();

  const cajas: CajaDeRed[] = [];
  const kioscos: KioscoDeRed[] = [];
  const sinCajas: SedeSinCajas[] = [];

  for (const sede of SEDES) {
    const fila = filaDeSede(sede);
    const operador = operadorDe(sede.id);

    /* Con histórico: una caja retirada conserva sus operaciones y se consulta. */
    const todas = red.cajasConHistorico(sede.id);
    if (todas.filter((c) => c.status === "activa").length === 0 && sede.status !== "cerrada") {
      sinCajas.push({ sede: fila, operador });
    }

    const jornadas = red.jornadas(sede.id);
    for (const caja of todas) {
      const equipo = red.equipoDeCaja(caja.id);
      const jornada =
        jornadas
          .filter((j) => j.registerId === caja.id)
          .sort((a, b) => b.openedAt.localeCompare(a.openedAt))[0] ?? null;

      cajas.push({
        id: caja.id,
        nombre: caja.name,
        sede: fila,
        operador,
        estado: caja.status,
        retiro: caja.retiredAt ? { at: caja.retiredAt, motivo: caja.retiredReason ?? "" } : null,
        equipo: equipo
          ? {
              id: equipo.id,
              label: equipo.label,
              linkedAt: equipo.linkedAt,
              linkedBy: equipo.linkedBy,
              lastSeenAt: equipo.lastSeenAt ?? null,
            }
          : null,
        jornada: jornada
          ? { id: jornada.id, estado: jornada.estado, trabajador: jornada.workerName, openedAt: jornada.openedAt }
          : null,
        ultimaActividad: masReciente(equipo?.lastSeenAt ?? null, jornada?.closedAt ?? jornada?.openedAt ?? null),
      });
    }

    const operaciones = red.operaciones(sede.id);
    for (const kiosco of red.kioscos(sede.id)) {
      kioscos.push({
        id: kiosco.id,
        label: kiosco.label,
        sede: fila,
        operador,
        linkedAt: kiosco.linkedAt,
        linkedBy: kiosco.linkedBy,
        lastSeenAt: kiosco.lastSeenAt ?? null,
        operaciones: operaciones.filter((o) => o.origenKiosco?.kioscoId === kiosco.id && o.fechaHora >= desde).length,
      });
    }
  }

  return { cajas, kioscos, sinCajas };
}

function filaDeSede(sede: Sede): SedeDeFila {
  return {
    id: sede.id,
    nombre: sede.name,
    codigo: sede.code,
    provincia: provinciaDeLocalidad(sede.locality),
    estado: estadoDeSede(sede),
  };
}

function operadorDe(sedeId: string): Operator | null {
  const tramo = asignacionVigente(sedeId);
  if (!tramo) return null;
  return OPERATORS.find((o) => o.id === tramo.operatorId) ?? null;
}

function masReciente(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}
