import type { AuditActorRole, AuditEventType } from "@/features/network/audit";
import { sinTildes } from "@/lib/buscar";

/**
 * Las filas de Auditoría y sus filtros — **FR-SA-AUD-3** y **FR-SA-AUD-4**.
 *
 * Módulo puro: lo comparten la pantalla (que filtra en el navegador) y la
 * exportación (que filtra en el servidor con los mismos criterios), de modo
 * que el archivo trae **exactamente** lo que había en pantalla. Solo importa
 * tipos del dominio: el almacén del registro no viaja al navegador.
 */

/** Un evento ya preparado para mostrarse: textos listos, sin enums en bruto. */
export interface FilaDeAuditoria {
  id: string;
  /** Instante, ISO. */
  cuando: string;
  /** «AAAA-MM-DD» en Cuba, para el filtro de fechas. */
  dia: string;
  /** Ya formateada en el servidor: «12 oct 2026 · 14:20». */
  fecha: string;
  tipo: AuditEventType;
  evento: string;
  area: string;
  /** Sobre qué: lo que el registro dice del objeto. */
  objeto: string;
  /** Ficha del objeto en esta consola, si la tiene y quien mira puede abrirla. */
  objetoHref: string | null;
  actorId: string;
  actor: string;
  rol: AuditActorRole;
  rolEtiqueta: string;
  sedeId: string | null;
  sede: string | null;
  operadorId: string | null;
  operador: string | null;
  motivo: string | null;
  antes: string | null;
  despues: string | null;
}

export const TODOS = "todos";

export interface FiltroDeAuditoria {
  texto: string;
  /** «AAAA-MM-DD» o vacío: sin límite. */
  desde: string;
  hasta: string;
  rol: string;
  tipo: string;
  actor: string;
  operador: string;
  sede: string;
}

export const SIN_FILTRO: FiltroDeAuditoria = {
  texto: "",
  desde: "",
  hasta: "",
  rol: TODOS,
  tipo: TODOS,
  actor: TODOS,
  operador: TODOS,
  sede: TODOS,
};

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Lee los filtros de la dirección; lo que no sea una fecha o un valor, se ignora. */
export function filtroDeParametros(p: Record<string, string | undefined>): FiltroDeAuditoria {
  const f = (k: keyof FiltroDeAuditoria) => p[k] ?? SIN_FILTRO[k];
  return {
    texto: f("texto"),
    desde: FECHA.test(f("desde")) ? f("desde") : "",
    hasta: FECHA.test(f("hasta")) ? f("hasta") : "",
    rol: f("rol"),
    tipo: f("tipo"),
    actor: f("actor"),
    operador: f("operador"),
    sede: f("sede"),
  };
}

/**
 * La búsqueda libre mira el motivo y el objeto —«qué se tocó» y «por qué»—:
 * **FR-SA-AUD-4** pide el motivo, y buscar una sede o una persona por su
 * nombre es lo primero que se intenta al revisar un incidente.
 */
export function filtrarAuditoria(filas: readonly FilaDeAuditoria[], f: FiltroDeAuditoria): FilaDeAuditoria[] {
  const aguja = sinTildes(f.texto.trim());
  return filas.filter(
    (e) =>
      (!f.desde || e.dia >= f.desde) &&
      (!f.hasta || e.dia <= f.hasta) &&
      (f.rol === TODOS || e.rol === f.rol) &&
      (f.tipo === TODOS || e.tipo === f.tipo) &&
      (f.actor === TODOS || e.actorId === f.actor) &&
      (f.operador === TODOS || e.operadorId === f.operador) &&
      (f.sede === TODOS || e.sedeId === f.sede) &&
      (!aguja || sinTildes(`${e.objeto} ${e.motivo ?? ""}`).includes(aguja)),
  );
}

/** Los filtros puestos, en palabras: lo que lleva el Excel en su cabecera. */
export function describirFiltro(f: FiltroDeAuditoria, nombres: { actor?: string; operador?: string; sede?: string; tipo?: string }): string {
  const partes: string[] = [];
  if (f.desde || f.hasta) partes.push(`Fechas: ${f.desde || "…"} a ${f.hasta || "…"}`);
  if (f.rol !== TODOS) partes.push(`Actuó: ${f.rol === "super-admin" ? "PuntoCash" : "Un mercante"}`);
  if (f.tipo !== TODOS) partes.push(`Evento: ${nombres.tipo ?? f.tipo}`);
  if (f.actor !== TODOS) partes.push(`Persona: ${nombres.actor ?? f.actor}`);
  if (f.operador !== TODOS) partes.push(`Operador: ${nombres.operador ?? f.operador}`);
  if (f.sede !== TODOS) partes.push(`Sede: ${nombres.sede ?? f.sede}`);
  if (f.texto.trim()) partes.push(`Búsqueda: «${f.texto.trim()}»`);
  return partes.length > 0 ? partes.join(" · ") : "Sin filtros: todo el registro";
}
