/**
 * LO QUE LA PANTALLA DE WORKER RECIBE DEL SERVIDOR sobre su caja.
 *
 * Es una foto serializable que el layout de `(app)` arma en cada petición con
 * la red (`caja-operativa.ts`) y entrega a un proveedor de cliente
 * (`caja-context.tsx`). Las pantallas leen de ahí y escriben con acciones de
 * servidor; después de escribir, el enrutador vuelve a pedir la foto.
 *
 * Conserva las formas que las pantallas ya pintaban (`CajaBalance`,
 * `CajaMovement`, `CajaSummary`, `CajaJornada`) para que el recableado cambie
 * de dónde salen los datos y no cómo se ven.
 */

import type {
  CajaBalance,
  CajaJornada,
  CajaMovement,
  CajaSummary,
} from "@/features/caja/caja-data";
import type { TasaVigente } from "@/features/exchange/cotizacion";
import type { OperationRecord } from "@/features/operations/operations-history";
import type { BloqueoDeCaja, ContextoDeCaja, EstadoDeCaja } from "@/features/network/caja-operativa";
import { jornadasDeCaja, type Jornada } from "@/features/network/jornadas";
import { operacionesDeCaja } from "@/features/network/operaciones";

export interface TrabajadorEnSesion {
  id: string;
  fullName: string;
  firstName: string;
  initials: string;
}

export interface VistaDeCaja {
  trabajador: TrabajadorEnSesion;
  caja: { id: string; nombre: string };
  sede: { id: string; nombre: string };
  equipo: { id: string; label: string };
  summary: CajaSummary;
  /** La jornada abierta de la caja, sea de quien sea. */
  jornada: (CajaJornada & { id: string; propia: boolean }) | null;
  saldos: readonly CajaBalance[];
  movimientos: readonly CajaMovement[];
  monedasPorAnadir: readonly string[];
  bloqueo: BloqueoDeCaja | null;
  apertura: EstadoDeCaja["apertura"];
  tasas: readonly TasaVigente[];
  servicios: readonly string[];
  jornadaEnOtraCaja: EstadoDeCaja["jornadaEnOtraCaja"];
  /** Las operaciones de esta caja **[R12]**, de la más reciente a la más antigua. */
  operaciones: readonly OperationRecord[];
}

/** Cuántos días de libro se envían a la pantalla de Caja. */
const DIAS_DE_LIBRO = 30;

function aCajaJornada(j: Jornada): CajaJornada {
  return {
    register: j.cajaNombre,
    worker: j.workerName,
    openedAt: j.openedAt,
    closedAt: j.closedAt,
    status: j.estado === "abierta" ? "OPEN" : "CLOSED",
  };
}

function movimientosDeLibro(registerId: string, now: Date): CajaMovement[] {
  const desde = now.getTime() - DIAS_DE_LIBRO * 24 * 3600 * 1000;
  const out: (CajaMovement & { orden: number })[] = [];
  let orden = 0;
  for (const j of jornadasDeCaja(registerId)) {
    if (new Date(j.openedAt).getTime() < desde && j.estado !== "abierta") continue;
    const snap = aCajaJornada(j);
    for (const m of j.movimientos) {
      orden += 1;
      out.push({
        orden,
        id: m.id,
        fechaHora: m.fechaHora,
        ...(m.operationCode ? { operationCode: m.operationCode } : {}),
        tipo: m.tipo,
        concepto: m.concepto,
        currency: m.currency,
        amount: m.amount,
        saldoDespues: m.saldoDespues,
        ...(m.motivo ? { motivo: m.motivo } : {}),
        ...(m.observaciones ? { observaciones: m.observaciones } : {}),
        ...(m.saldoAntes !== undefined ? { saldoAntes: m.saldoAntes } : {}),
        jornada: snap,
      });
    }
  }
  /* Del más reciente al más antiguo; dos del mismo instante, en orden inverso
     de registro —el libro de una jornada está en orden—. */
  const jornadaOrden = (x: { orden: number }) => x.orden;
  return out
    .sort((a, b) => b.fechaHora.localeCompare(a.fechaHora) || (a.jornada?.openedAt === b.jornada?.openedAt ? jornadaOrden(b) - jornadaOrden(a) : 0))
    .map((m) => {
      const copia: CajaMovement & { orden?: number } = { ...m };
      delete copia.orden;
      return copia;
    });
}

export function armarVista(ctx: ContextoDeCaja, estado: EstadoDeCaja, now = new Date()): VistaDeCaja {
  const j = estado.jornada;
  const propia = j !== null && j.workerId === ctx.worker.id;
  return {
    trabajador: {
      id: ctx.worker.id,
      fullName: ctx.worker.fullName,
      firstName: ctx.worker.firstName,
      initials: ctx.worker.initials,
    },
    caja: { id: ctx.register.id, nombre: ctx.register.name },
    sede: { id: ctx.sede.id, nombre: ctx.sede.name },
    equipo: ctx.terminal,
    summary: {
      register: ctx.register.name,
      /* Quien tiene la jornada abierta, si la hay; si no, quien opera ahora. */
      worker: j ? j.workerName : ctx.worker.fullName,
      status: propia ? "operativa" : "cerrada",
      lastUpdated: now.toISOString(),
    },
    jornada: j ? { ...aCajaJornada(j), id: j.id, propia } : null,
    saldos: estado.saldos.map((s) => ({ currency: s.currency, amount: s.amount })),
    movimientos: movimientosDeLibro(ctx.register.id, now),
    monedasPorAnadir: estado.monedasPorAnadir,
    bloqueo: estado.bloqueo,
    apertura: estado.apertura,
    tasas: estado.tasas,
    servicios: estado.servicios,
    jornadaEnOtraCaja: estado.jornadaEnOtraCaja,
    operaciones: operacionesDeCaja(ctx.register.id).map(registroDeWorker),
  };
}

/** El registro de una operación como lo ve Worker: lo que es de la red se queda en el servidor. */
export function registroDeWorker(o: OperationRecord): OperationRecord {
  const copia: OperationRecord & Partial<Record<"sedeId" | "registerId" | "workerId" | "jornadaId" | "origenKiosco", unknown>> = { ...o };
  delete copia.sedeId;
  delete copia.registerId;
  delete copia.workerId;
  delete copia.jornadaId;
  delete copia.origenKiosco;
  return copia;
}
