import type { AuditActorRole, AuditEventType } from "@/features/network/audit";

/**
 * Cómo se llama cada evento en la pantalla de Auditoría — **FR-SA-AUD-8**:
 * lenguaje de negocio, nunca el identificador del dominio ni un enum en bruto
 * **[R10]**.
 *
 * Es un módulo puro (solo tipos del dominio) para que lo importen la pantalla,
 * el detalle y el Excel sin arrastrar el almacén del registro al navegador.
 *
 * Los eventos se agrupan **por lo que se gobierna**, no por quién los produce:
 * quién actuó ya tiene su propio filtro (**FR-SA-AUD-3**), y sesenta tipos en
 * una lista plana no se pueden recorrer.
 */

export interface TipoDeEvento {
  tipo: AuditEventType;
  etiqueta: string;
}

export interface AreaDeEventos {
  area: string;
  tipos: readonly TipoDeEvento[];
}

/**
 * Los tipos que **ninguna pantalla produce hoy**: alta y retirada del catálogo
 * de monedas (la tabla de Monedas y tasas tiene una fila por moneda del
 * catálogo y no lo mantiene) y la credencial inicial regenerada (la sustituyó
 * el restablecimiento del acceso del administrador principal). No se ofrecen
 * en el filtro —no habría nunca nada que encontrar—, pero conservan su
 * etiqueta por si un registro anterior los trae.
 */
const RETIRADOS: Readonly<Partial<Record<AuditEventType, string>>> = {
  "moneda-plataforma.alta": "Moneda añadida al catálogo de la plataforma",
  "moneda-plataforma.retirada": "Moneda retirada del catálogo de la plataforma",
  "operador.credencial-inicial-regenerada": "Credencial inicial de un operador regenerada",
};

export const AREAS: readonly AreaDeEventos[] = [
  {
    area: "Sedes",
    tipos: [
      { tipo: "sede.creada", etiqueta: "Sede creada" },
      { tipo: "sede.editada", etiqueta: "Datos de una sede modificados" },
      { tipo: "sede.asignada", etiqueta: "Sede entregada a un operador" },
      { tipo: "sede.revocada", etiqueta: "Sede retirada a su operador" },
      { tipo: "sede.suspendida", etiqueta: "Sede suspendida" },
      { tipo: "sede.reactivada", etiqueta: "Sede reactivada" },
      { tipo: "sede.cerrada", etiqueta: "Sede cerrada" },
    ],
  },
  {
    area: "Operadores",
    tipos: [
      { tipo: "operador.alta", etiqueta: "Operador dado de alta" },
      { tipo: "operador.suspendido", etiqueta: "Operador suspendido" },
      { tipo: "operador.reactivado", etiqueta: "Operador reactivado" },
      { tipo: "operador.baja", etiqueta: "Operador dado de baja" },
      { tipo: "operador.acceso-principal-restablecido", etiqueta: "Acceso del administrador principal restablecido" },
    ],
  },
  {
    area: "Servicios",
    tipos: [
      { tipo: "servicio.habilitado", etiqueta: "Servicio habilitado en una sede" },
      { tipo: "servicio.deshabilitado", etiqueta: "Servicio deshabilitado en una sede" },
    ],
  },
  {
    area: "Monedas y tasas",
    tipos: [
      { tipo: "rango.definido", etiqueta: "Rango de tasas definido" },
      { tipo: "rango.cambiado", etiqueta: "Rango de tasas modificado" },
      { tipo: "rango.retirado", etiqueta: "Rango de tasas retirado" },
      { tipo: "tasa.fijada-al-limite", etiqueta: "Tasa de una sede ajustada al nuevo rango" },
      { tipo: "moneda-sede.alta", etiqueta: "Moneda añadida a una sede" },
      { tipo: "moneda-sede.retirada", etiqueta: "Moneda retirada de una sede" },
      { tipo: "par.definido", etiqueta: "Tasa de una sede definida" },
      { tipo: "par.cambiado", etiqueta: "Tasa de una sede modificada" },
      { tipo: "par.retirado", etiqueta: "Tasa de una sede retirada" },
    ],
  },
  {
    area: "Promociones",
    tipos: [
      { tipo: "promocion-red.alta", etiqueta: "Promoción de red publicada" },
      { tipo: "promocion-red.editada", etiqueta: "Promoción de red modificada" },
      { tipo: "promocion-red.retirada", etiqueta: "Promoción de red retirada" },
      { tipo: "promocion-sede.alta", etiqueta: "Promoción de una sede publicada" },
      { tipo: "promocion-sede.editada", etiqueta: "Promoción de una sede modificada" },
      { tipo: "promocion-sede.retirada", etiqueta: "Promoción de una sede retirada" },
    ],
  },
  {
    area: "Cajas y equipos",
    tipos: [
      { tipo: "caja.alta", etiqueta: "Caja creada" },
      { tipo: "caja.retirada", etiqueta: "Caja retirada" },
      { tipo: "caja.reactivada", etiqueta: "Caja reactivada" },
      { tipo: "equipo-caja.vinculado", etiqueta: "Equipo vinculado a una caja" },
      { tipo: "equipo-caja.desvinculado", etiqueta: "Equipo desvinculado de una caja" },
      { tipo: "equipo-caja.renombrado", etiqueta: "Equipo de caja renombrado" },
      { tipo: "kiosco.vinculado", etiqueta: "Kiosco vinculado" },
      { tipo: "kiosco.desvinculado", etiqueta: "Kiosco desvinculado" },
      { tipo: "kiosco.renombrado", etiqueta: "Kiosco renombrado" },
    ],
  },
  {
    area: "Trabajadores",
    tipos: [
      { tipo: "trabajador.alta", etiqueta: "Trabajador dado de alta" },
      { tipo: "trabajador.editado", etiqueta: "Datos de un trabajador modificados" },
      { tipo: "trabajador.desactivado", etiqueta: "Trabajador desactivado" },
      { tipo: "trabajador.reactivado", etiqueta: "Trabajador reactivado" },
      { tipo: "trabajador.asistencia-acceso", etiqueta: "Acceso de un trabajador asistido" },
    ],
  },
  {
    area: "Administradores",
    tipos: [
      { tipo: "usuario-admin.alta", etiqueta: "Administrador creado" },
      { tipo: "usuario-admin.editado", etiqueta: "Administrador modificado" },
      { tipo: "usuario-admin.desactivado", etiqueta: "Administrador desactivado" },
      { tipo: "usuario-admin.reactivado", etiqueta: "Administrador reactivado" },
      { tipo: "usuario-admin.contrasena-cambiada", etiqueta: "Contraseña de un administrador cambiada" },
    ],
  },
  {
    area: "Jornadas y aprobaciones",
    tipos: [
      { tipo: "solicitud.aprobada", etiqueta: "Solicitud de aprobación aceptada" },
      { tipo: "solicitud.rechazada", etiqueta: "Solicitud de aprobación rechazada" },
      { tipo: "jornada.cierre-forzado", etiqueta: "Cierre de jornada forzado" },
    ],
  },
  {
    area: "Cuentas de PuntoCash",
    tipos: [
      { tipo: "usuario-puntocash.alta", etiqueta: "Cuenta de PuntoCash creada" },
      { tipo: "usuario-puntocash.editado", etiqueta: "Cuenta de PuntoCash modificada" },
      { tipo: "usuario-puntocash.desactivado", etiqueta: "Cuenta de PuntoCash desactivada" },
      { tipo: "usuario-puntocash.reactivado", etiqueta: "Cuenta de PuntoCash reactivada" },
      { tipo: "usuario-puntocash.principal-traspasado", etiqueta: "Administración principal de PuntoCash traspasada" },
      { tipo: "usuario-puntocash.contrasena-cambiada", etiqueta: "Contraseña de una cuenta de PuntoCash cambiada" },
    ],
  },
  {
    area: "Reportes y auditoría",
    tipos: [
      { tipo: "reporte.exportado", etiqueta: "Reporte exportado" },
      { tipo: "auditoria.exportada", etiqueta: "Auditoría exportada" },
    ],
  },
];

const ETIQUETAS = new Map<string, { etiqueta: string; area: string }>([
  ...AREAS.flatMap((a) => a.tipos.map((t) => [t.tipo, { etiqueta: t.etiqueta, area: a.area }] as const)),
  ...Object.entries(RETIRADOS).map(([tipo, etiqueta]) => [tipo, { etiqueta: etiqueta!, area: "Monedas y tasas" }] as const),
]);

export function etiquetaDeEvento(tipo: AuditEventType): string {
  /* Un tipo nuevo sin etiqueta no debe romper la pantalla ni enseñar el
     identificador: se dice con lo que se sabe. La prueba de dominio falla si
     llega a pasar. */
  return ETIQUETAS.get(tipo)?.etiqueta ?? "Otro acto de gobierno";
}

export function areaDeEvento(tipo: AuditEventType): string {
  return ETIQUETAS.get(tipo)?.area ?? "Otros";
}

/** Quién actuó, en las palabras de la consola. */
export const ETIQUETA_DE_ROL: Readonly<Record<AuditActorRole, string>> = {
  "super-admin": "PuntoCash",
  "admin-sede": "Mercante",
};
