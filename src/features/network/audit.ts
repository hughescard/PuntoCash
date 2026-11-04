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
  | "operador.acceso-principal-restablecido"
  | "servicio.habilitado"
  | "servicio.deshabilitado"
  | "moneda-plataforma.alta"
  | "moneda-plataforma.retirada"
  | "moneda-plataforma.reincorporada"
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
  | "equipo-caja.renombrado"
  | "kiosco.vinculado"
  | "kiosco.desvinculado"
  | "kiosco.renombrado"
  | "trabajador.alta"
  | "trabajador.editado"
  | "trabajador.desactivado"
  | "trabajador.reactivado"
  | "trabajador.asistencia-acceso"
  | "usuario-admin.alta"
  | "usuario-admin.editado"
  | "usuario-admin.desactivado"
  | "usuario-admin.reactivado"
  | "usuario-admin.contrasena-cambiada"
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
  | "jornada.cierre-forzado"
  | "reporte.exportado"
  /* Quien lee el registro también deja huella: exportarlo saca de la consola
     los nombres de trabajadores y de administradores que contiene. */
  | "auditoria.exportada"
  // ---- Cuentas de PuntoCash ---------------------------------------------
  | "usuario-puntocash.contrasena-cambiada"
  | "usuario-puntocash.alta"
  | "usuario-puntocash.editado"
  | "usuario-puntocash.credencial-regenerada"
  | "usuario-puntocash.desactivado"
  | "usuario-puntocash.reactivado"
  | "usuario-puntocash.principal-traspasado";

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
  /**
   * La persona o cosa sobre la que se actuó, cuando tiene su propia ficha en
   * la consola de PuntoCash: así el evento puede enlazarla. `subject` sigue
   * siendo el texto que se lee; esto es solo el identificador.
   */
  object?: AuditObject;
  reason?: string;
  before?: string;
  after?: string;
}

export interface AuditObject {
  kind: "trabajador" | "usuario-puntocash";
  id: string;
}

/**
 * El registro vive en `globalThis`, como el resto de los almacenes de la red.
 *
 * Con el estado en el módulo, cada paquete que lo importa tiene **su** copia:
 * en el servidor de desarrollo una ruta de exportación (`route.ts`) y una
 * pantalla no comparten módulo, y lo que la primera registraba la segunda no
 * lo veía. Un registro de auditoría que no ve lo que se registró no sirve.
 */
const ALMACEN = globalThis as typeof globalThis & { __puntocashAuditoria?: AuditEvent[] };

const mutableEvents: AuditEvent[] = (ALMACEN.__puntocashAuditoria ??= [
  {
    id: "aud-1",
    at: "2026-06-30T17:00:00.000Z",
    actorId: "sa-1",
    actorName: "Elena Marrero Fonseca",
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
    actorName: "Elena Marrero Fonseca",
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
    object: { kind: "trabajador", id: "trb-12" },
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
    actorName: "Elena Marrero Fonseca",
    actorRole: "super-admin",
    type: "sede.creada",
    subject: "PuntoCash Santiago",
    branchId: "sede-santiago",
    reason: "Apertura de sucursal en Santiago de Cuba",
  },
  {
    id: "aud-5",
    at: "2026-09-19T14:20:00.000Z",
    actorId: "sa-2",
    actorName: "Jorge Aguilera Ruiz",
    actorRole: "super-admin",
    type: "operador.suspendido",
    subject: "Oriente Divisas",
    operatorId: "op-oriente",
    reason: "Revisión de cierres con diferencia reiterada en dos de sus sedes",
    before: "Activo",
    after: "Suspendido",
  },
  /* Lo que sigue es lo que dejaron las decisiones que ya están en el resto de la
     semilla (las asignaciones, los rangos, las cajas retiradas): cada línea dice
     lo mismo que el dato al que se refiere. Los actores son personas de
     `usuarios.ts` y de `operators.ts`, no un nombre de área. */
  {
    id: "aud-6",
    at: "2026-05-26T14:00:00.000Z",
    actorId: "sa-1",
    actorName: "Elena Marrero Fonseca",
    actorRole: "super-admin",
    type: "operador.alta",
    subject: "Bahía Cambios S.R.L.",
    operatorId: "op-bahia",
    reason: "Alta del operador seleccionado para Pinar del Río y Trinidad",
    after: "Activo",
  },
  {
    id: "aud-7",
    at: "2026-06-01T09:00:00.000Z",
    actorId: "sa-1",
    actorName: "Elena Marrero Fonseca",
    actorRole: "super-admin",
    type: "sede.asignada",
    subject: "PuntoCash Trinidad",
    branchId: "sede-trinidad",
    operatorId: "op-bahia",
    reason: "Entrega inicial de la sede al operador seleccionado",
    before: "Sin operador asignado",
    after: "Bahía Cambios S.R.L.",
  },
  {
    id: "aud-8",
    at: "2026-06-01T09:02:00.000Z",
    actorId: "sa-1",
    actorName: "Elena Marrero Fonseca",
    actorRole: "super-admin",
    type: "sede.asignada",
    subject: "PuntoCash Pinar del Río",
    branchId: "sede-pinar",
    operatorId: "op-bahia",
    reason: "Entrega inicial de la sede al operador seleccionado",
    before: "Sin operador asignado",
    after: "Bahía Cambios S.R.L.",
  },
  {
    id: "aud-9",
    at: "2026-09-25T09:00:00.000Z",
    actorId: "sa-1",
    actorName: "Elena Marrero Fonseca",
    actorRole: "super-admin",
    type: "sede.asignada",
    subject: "PuntoCash Cerro",
    branchId: "sede-cerro",
    operatorId: "op-malecon",
    reason: "Entrega de la nueva sucursal a su operador",
    before: "Sin operador asignado",
    after: "Malecón Servicios Financieros S.R.L.",
  },
  {
    id: "aud-10",
    at: "2026-10-01T12:00:00.000Z",
    actorId: "sa-1",
    actorName: "Elena Marrero Fonseca",
    actorRole: "super-admin",
    type: "rango.definido",
    subject: "USD · Dólar estadounidense",
    reason: "Rangos de la primera tanda de monedas cotizables",
    before: "Sin rango",
    after: "Compra 300–330 · Venta 310–340",
  },
  {
    id: "aud-11",
    at: "2026-10-01T12:00:00.000Z",
    actorId: "sa-1",
    actorName: "Elena Marrero Fonseca",
    actorRole: "super-admin",
    type: "rango.definido",
    subject: "EUR · Euro",
    reason: "Rangos de la primera tanda de monedas cotizables",
    before: "Sin rango",
    after: "Compra 325–355 · Venta 335–365",
  },
  {
    id: "aud-12",
    at: "2026-10-01T12:00:00.000Z",
    actorId: "sa-1",
    actorName: "Elena Marrero Fonseca",
    actorRole: "super-admin",
    type: "rango.definido",
    subject: "GBP · Libra esterlina",
    reason: "Rangos de la primera tanda de monedas cotizables",
    before: "Sin rango",
    after: "Compra 380–410 · Venta 390–420",
  },
  {
    id: "aud-13",
    at: "2026-10-01T12:00:00.000Z",
    actorId: "sa-1",
    actorName: "Elena Marrero Fonseca",
    actorRole: "super-admin",
    type: "rango.definido",
    subject: "CHF · Franco suizo",
    reason: "Rangos de la primera tanda de monedas cotizables",
    before: "Sin rango",
    after: "Compra 345–370 · Venta 355–380",
  },
  {
    id: "aud-14",
    at: "2026-10-01T12:00:00.000Z",
    actorId: "sa-1",
    actorName: "Elena Marrero Fonseca",
    actorRole: "super-admin",
    type: "rango.definido",
    subject: "MXN · Peso mexicano",
    reason: "Rangos de la primera tanda de monedas cotizables",
    before: "Sin rango",
    after: "Compra 14–18 · Venta 15–20",
  },
  {
    id: "aud-15",
    at: "2026-10-10T15:00:00.000Z",
    actorId: "adm-bahia-1",
    actorName: "Ana Barrios",
    actorRole: "admin-sede",
    type: "caja.retirada",
    subject: "Caja 01 · PuntoCash Pinar del Río",
    branchId: "sede-pinar",
    operatorId: "op-bahia",
    reason: "Local cerrado por obras de reparación del techo",
    before: "Activa",
    after: "Retirada",
  },
  {
    id: "aud-16",
    at: "2026-10-10T15:01:00.000Z",
    actorId: "adm-bahia-1",
    actorName: "Ana Barrios",
    actorRole: "admin-sede",
    type: "caja.retirada",
    subject: "Caja 02 · PuntoCash Pinar del Río",
    branchId: "sede-pinar",
    operatorId: "op-bahia",
    reason: "Local cerrado por obras de reparación del techo",
    before: "Activa",
    after: "Retirada",
  },
  {
    id: "aud-17",
    at: "2026-04-11T10:30:00.000Z",
    actorId: "adm-malecon-1",
    actorName: "Marta Sánchez",
    actorRole: "admin-sede",
    type: "usuario-admin.alta",
    subject: "Daniel Castro",
    operatorId: "op-malecon",
    reason: "Segundo administrador para repartir la gestión diaria de las sedes",
    after: "Activo",
  },
  {
    /* La suspensión de Trinidad que ya está en `sedes.ts`: sin este evento su
       ficha la decía suspendida y, a la vez, «nunca ha estado suspendida». */
    id: "aud-18",
    at: "2026-10-17T14:00:00.000Z",
    actorId: "sa-2",
    actorName: "Jorge Aguilera Ruiz",
    actorRole: "super-admin",
    type: "sede.suspendida",
    subject: "PuntoCash Trinidad",
    branchId: "sede-trinidad",
    operatorId: "op-bahia",
    reason: "Revisión de la documentación de la licencia de la sucursal",
    before: "Activa",
    after: "Suspendida",
  },
]);

/** Del más reciente al más antiguo, que es el orden en que se consulta. */
export const AUDIT_EVENTS: readonly AuditEvent[] = mutableEvents;

export type NewAuditEvent = Omit<AuditEvent, "id" | "at"> & { at?: string };

/** Añadir es la única escritura. No hay editar ni borrar, a propósito. */
export function registrarEvento(event: NewAuditEvent, now = new Date()): AuditEvent {
  /* La siguiente posición, no un contador aparte: el contador viviría en el módulo y se duplicaría con él. */
  const stored: AuditEvent = { ...event, id: `aud-${mutableEvents.length + 1}`, at: event.at ?? now.toISOString() };
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
