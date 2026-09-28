/**
 * EL REGISTRO DE AUDITORÍA — quién, qué, cuándo, sobre qué y por qué.
 *
 * Todo acto de gobierno con consecuencias deja aquí una línea inmutable
 * (RP-21). El registro es **de solo lectura desde toda superficie del
 * producto**, incluida la consola de PuntoCash: este módulo expone añadir y
 * consultar, y deliberadamente ninguna forma de editar ni de borrar
 * (FR-SA-AUD-6).
 *
 * Se guarda el valor anterior y el nuevo cuando aplica, para que el registro
 * sea legible sin reconstruirlo mentalmente: una tasa que pasó de un valor a
 * otro, una sede que pasó de un operador a otro, una caja que pasó de un
 * equipo a ninguno (FR-SA-AUD-7).
 */

export type AuditActorRole = "super-admin" | "admin-sede";

/**
 * Los tipos se agrupan por quién los produce, que es el filtro más frecuente
 * al revisar un incidente (FR-SA-AUD-3).
 */
export type AuditEventType =
  // ---- PuntoCash ---------------------------------------------------------
  | "sede.creada"
  | "sede.editada"
  | "sede.suspendida"
  | "sede.reactivada"
  | "sede.cerrada"
  | "sede.asignada"
  | "sede.revocada"
  | "operador.alta"
  | "operador.suspendido"
  | "operador.reactivado"
  | "operador.baja"
  | "operador.credencial-inicial-regenerada"
  | "servicio.habilitado"
  | "servicio.deshabilitado"
  | "moneda-plataforma.alta"
  | "moneda-plataforma.retirada"
  | "rango.definido"
  | "rango.cambiado"
  | "rango.retirado"
  | "tasa.fijada-al-limite"
  | "promocion-red.alta"
  | "promocion-red.editada"
  | "promocion-red.retirada"
  // ---- El mercante -------------------------------------------------------
  | "caja.alta"
  | "caja.retirada"
  | "caja.reactivada"
  | "equipo-caja.vinculado"
  | "equipo-caja.desvinculado"
  | "kiosco.vinculado"
  | "kiosco.desvinculado"
  | "trabajador.alta"
  | "trabajador.editado"
  | "trabajador.desactivado"
  | "trabajador.reactivado"
  | "trabajador.asistencia-acceso"
  | "usuario-admin.alta"
  | "usuario-admin.editado"
  | "usuario-admin.desactivado"
  | "usuario-admin.reactivado"
  | "moneda-sede.alta"
  | "moneda-sede.retirada"
  | "par.definido"
  | "par.cambiado"
  | "par.retirado"
  | "promocion-sede.alta"
  | "promocion-sede.editada"
  | "promocion-sede.retirada"
  | "solicitud.aprobada"
  | "solicitud.rechazada"
  | "jornada.cierre-forzado";

export interface AuditEvent {
  id: string;
  at: string;
  actorId: string;
  actorName: string;
  actorRole: AuditActorRole;
  type: AuditEventType;
  /** Descripción en lenguaje de negocio, nunca nombres de campo del dominio [R10]. */
  subject: string;
  branchId?: string;
  operatorId?: string;
  reason?: string;
  before?: string;
  after?: string;
}

const mutableEvents: AuditEvent[] = [
  {
    id: "aud-1",
    at: "2026-06-30T17:00:00.000Z",
    actorId: "sa-1",
    actorName: "PuntoCash · Operaciones",
    actorRole: "super-admin",
    type: "sede.revocada",
    subject: "PuntoCash Miramar",
    branchId: "sede-miramar",
    operatorId: "op-atlantico",
    reason: "Cese de actividad del operador a solicitud propia",
    before: "Atlántico Casas de Cambio",
    after: "Sin operador asignado",
  },
  {
    id: "aud-2",
    at: "2026-06-30T17:05:00.000Z",
    actorId: "sa-1",
    actorName: "PuntoCash · Operaciones",
    actorRole: "super-admin",
    type: "sede.asignada",
    subject: "PuntoCash Miramar",
    branchId: "sede-miramar",
    operatorId: "op-caribe",
    reason: "Traspaso de la administración tras el cese del operador anterior",
    before: "Sin operador asignado",
    after: "Caribe Cambios S.A.",
  },
  {
    id: "aud-3",
    at: "2026-08-30T16:00:00.000Z",
    actorId: "adm-oriente-1",
    actorName: "Yuliet Pérez",
    actorRole: "admin-sede",
    type: "trabajador.desactivado",
    subject: "Noelia Alonso",
    branchId: "sede-holguin",
    operatorId: "op-oriente",
    reason: "Fin de contrato temporal acordado con la trabajadora",
    before: "Activa",
    after: "Desactivada",
  },
  {
    id: "aud-4",
    at: "2026-09-18T09:00:00.000Z",
    actorId: "sa-1",
    actorName: "PuntoCash · Operaciones",
    actorRole: "super-admin",
    type: "sede.creada",
    subject: "PuntoCash Santiago",
    branchId: "sede-santiago",
    reason: "Apertura de sucursal en Santiago de Cuba",
  },
  {
    id: "aud-5",
    at: "2026-09-19T14:20:00.000Z",
    actorId: "sa-1",
    actorName: "PuntoCash · Control interno",
    actorRole: "super-admin",
    type: "operador.suspendido",
    subject: "Oriente Divisas",
    operatorId: "op-oriente",
    reason: "Revisión de arqueos con diferencia reiterada en dos de sus sedes",
    before: "Activo",
    after: "Suspendido",
  },
];

/** Del más reciente al más antiguo, que es el orden en que se consulta. */
export const AUDIT_EVENTS: readonly AuditEvent[] = mutableEvents;

let sequence = mutableEvents.length;

export type NewAuditEvent = Omit<AuditEvent, "id" | "at"> & { at?: string };

/** Añadir es la única escritura. No hay editar ni borrar, a propósito. */
export function registrarEvento(event: NewAuditEvent, now = new Date()): AuditEvent {
  sequence += 1;
  const stored: AuditEvent = { ...event, id: `aud-${sequence}`, at: event.at ?? now.toISOString() };
  mutableEvents.push(stored);
  return stored;
}

export interface AuditFilter {
  from?: string;
  to?: string;
  type?: AuditEventType;
  actorRole?: AuditActorRole;
  actorId?: string;
  operatorId?: string;
  branchId?: string;
  /** Búsqueda libre sobre el motivo declarado (FR-SA-AUD-4). */
  query?: string;
}

export function listarEventos(filter: AuditFilter = {}): readonly AuditEvent[] {
  const needle = filter.query?.trim().toLowerCase();
  return mutableEvents
    .filter((e) => {
      if (filter.from && e.at < filter.from) return false;
      if (filter.to && e.at > filter.to) return false;
      if (filter.type && e.type !== filter.type) return false;
      if (filter.actorRole && e.actorRole !== filter.actorRole) return false;
      if (filter.actorId && e.actorId !== filter.actorId) return false;
      if (filter.operatorId && e.operatorId !== filter.operatorId) return false;
      if (filter.branchId && e.branchId !== filter.branchId) return false;
      if (needle) {
        const haystack = `${e.subject} ${e.reason ?? ""}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    })
    .slice()
    .sort((a, b) => b.at.localeCompare(a.at));
}
