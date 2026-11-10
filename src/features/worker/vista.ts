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
  AperturaDelMovimiento,
  CajaJornada,
  CajaMovement,
  CajaSummary,
} from "@/features/caja/caja-data";
import type { TasaVigente } from "@/features/exchange/cotizacion";
import type { OperationRecord } from "@/features/operations/operations-history";
import type { Denominacion } from "@/features/caja/billetes";
import {
  aperturaDeclarada,
  supervisoresDe,
  type AperturaDeclarada,
  type BloqueoDeCaja,
  type ContextoDeCaja,
  type EstadoDeCaja,
} from "@/features/network/caja-operativa";
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
  /**
   * Las monedas de la caja, **sin importes**. Worker opera a ciegas (decisión
   * del 6/11/2026): el trabajador sabe qué monedas tiene su caja, nunca
   * cuánto. Los saldos no salen del servidor hacia Worker por ningún camino
   * —ni aquí, ni en los movimientos, ni en las operaciones—, para que no
   * puedan leerse tampoco desde las herramientas del navegador.
   */
  monedas: readonly string[];
  /** Las denominaciones que se cuentan en cada moneda de la caja, de mayor a menor. Sin cantidades. */
  denominaciones: Readonly<Record<string, readonly Denominacion[]>>;
  /** Los supervisores que pueden reponer, retirar o cambiar billetes: los administradores de la empresa de la sede. */
  supervisores: readonly { id: string; nombre: string }[];
  movimientos: readonly CajaMovement[];
  monedasPorAnadir: readonly string[];
  bloqueo: BloqueoDeCaja | null;
  apertura: EstadoDeCaja["apertura"];
  /** El conteo de apertura que este trabajador ya declaró en esta caja, sin abrir todavía. */
  aperturaDeclarada: AperturaDeclarada | null;
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
        ...(m.motivo ? { motivo: m.motivo } : {}),
        ...(m.observaciones ? { observaciones: m.observaciones } : {}),
        ...(m.billetes ? { billetes: m.billetes } : {}),
        ...(m.supervisor ? { supervisor: m.supervisor } : {}),
        ...aperturaDe(j, m.concepto, m.currency),
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

/** Para el «Fondeo inicial»: lo recibido frente a lo entregado por quien cerró. */
function aperturaDe(j: Jornada, concepto: string, currency: string): { apertura: AperturaDelMovimiento } | Record<string, never> {
  const ca = j.apertura.cierreAnterior;
  if (concepto !== "Fondeo inicial" || !ca) return {};
  const a = j.apertura.monedas.find((x) => x.currency === currency);
  if (!a) return {};
  const composicion = a.diferencia === 0 && a.composicion && Object.keys(a.composicion).length > 0 ? a.composicion : undefined;
  return {
    apertura: {
      cierreAnterior: { workerName: ca.workerName, closedAt: ca.closedAt, sinArqueo: ca.sinArqueo },
      entregado: a.dejado ?? 0,
      recibido: a.contado,
      diferencia: a.diferencia,
      ...(composicion ? { composicion } : {}),
      ...(a.motivo ? { motivo: a.motivo } : {}),
      ...(a.supervisor ? { supervisor: a.supervisor } : {}),
      ...(a.observaciones ? { observaciones: a.observaciones } : {}),
    },
  };
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
    monedas: estado.saldos.map((s) => s.currency),
    denominaciones: estado.denominaciones,
    supervisores: supervisoresDe(ctx),
    movimientos: movimientosDeLibro(ctx.register.id, now),
    monedasPorAnadir: estado.monedasPorAnadir,
    bloqueo: estado.bloqueo,
    apertura: estado.apertura,
    aperturaDeclarada: j ? null : aperturaDeclarada(ctx),
    tasas: estado.tasas,
    servicios: estado.servicios,
    jornadaEnOtraCaja: estado.jornadaEnOtraCaja,
    operaciones: operacionesDeCaja(ctx.register.id).map(registroDeWorker),
  };
}

/**
 * El registro de una operación como lo ve Worker: lo que es de la red se queda
 * en el servidor, y también **el saldo de la caja antes y después** de la
 * operación (`cashSnapshot`), que Worker no ve. El importe de la operación sí
 * viaja: es lo que el cliente entregó o recibió.
 */
export function registroDeWorker(o: OperationRecord): OperationRecord {
  const amount = { ...o.amount };
  delete amount.cashSnapshot;
  const copia: OperationRecord & Partial<Record<"sedeId" | "registerId" | "workerId" | "jornadaId" | "origenKiosco", unknown>> = { ...o, amount };
  delete copia.sedeId;
  delete copia.registerId;
  delete copia.workerId;
  delete copia.jornadaId;
  delete copia.origenKiosco;
  return copia;
}
