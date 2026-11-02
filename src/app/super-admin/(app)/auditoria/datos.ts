import { AUDIT_EVENTS, type AuditEvent } from "@/features/network/audit";
import { OPERATORS } from "@/features/network/operators";
import { SEDES } from "@/features/network/sedes";
import { diaEnCuba, fechaCorta, hora } from "@/app/admin/(app)/jornadas/formato";
import { areaDeEvento, ETIQUETA_DE_ROL, etiquetaDeEvento } from "./etiquetas";
import type { FilaDeAuditoria } from "./filtro";

/**
 * El registro, preparado para mostrarse — **FR-SA-AUD-1**.
 *
 * Del más reciente al más antiguo. Es de solo lectura: este módulo lee del
 * registro y no tiene forma de escribir en él **[RP-21]**.
 */

export function filaDeEvento(e: AuditEvent): FilaDeAuditoria {
  const sede = e.branchId ? SEDES.find((s) => s.id === e.branchId) ?? null : null;
  const operador = e.operatorId ? OPERATORS.find((o) => o.id === e.operatorId) ?? null : null;
  return {
    id: e.id,
    cuando: e.at,
    dia: diaEnCuba(e.at),
    fecha: `${fechaCorta(e.at)} · ${hora(e.at)}`,
    tipo: e.type,
    evento: etiquetaDeEvento(e.type),
    area: areaDeEvento(e.type),
    objeto: e.subject,
    actorId: e.actorId,
    actor: e.actorName,
    rol: e.actorRole,
    rolEtiqueta: ETIQUETA_DE_ROL[e.actorRole],
    sedeId: sede?.id ?? null,
    sede: sede?.name ?? null,
    operadorId: operador?.id ?? null,
    operador: operador?.name ?? null,
    motivo: e.reason ?? null,
    antes: e.before ?? null,
    despues: e.after ?? null,
  };
}

/** Todos los eventos, del más reciente al más antiguo. */
export function filasDeAuditoria(): FilaDeAuditoria[] {
  return AUDIT_EVENTS.slice()
    .sort((a, b) => b.at.localeCompare(a.at) || b.id.localeCompare(a.id, "es", { numeric: true }))
    .map(filaDeEvento);
}
