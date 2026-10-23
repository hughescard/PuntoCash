"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAdminSession } from "@/features/admin/session-server";
import { registrarEvento } from "@/features/network/audit";
import { redEnAlcance } from "@/features/network/scoped-reads";
import {
  crearPromocion,
  editarPromocion,
  retirarPromocion,
  TEXTO_MAX,
  TITULO_MAX,
  type PromocionDenial,
  type PromocionInput,
} from "@/features/network/promotions";
import { mensaje } from "../mensajes";

/**
 * Crear, editar y retirar promociones — **FR-AD-PROM-3** a **FR-AD-PROM-10**.
 * Solo las de la empresa: las de red no tienen ninguna escritura aquí, y el
 * dominio lo rechaza aunque alguien forjara la petición.
 */


export type CampoPromocion = "titulo" | "texto" | "sedes" | "desde" | "hasta" | "imagen";

export interface ValoresPromocion {
  titulo: string;
  texto: string;
  sedes: string[];
  desde: string;
  hasta: string;
}

export type ResultadoPromocion =
  | { ok: false; error: string; campo?: CampoPromocion; valores: ValoresPromocion }
  | null;

/** El campo al que pertenece cada rechazo; el texto está en el catálogo. */
const CAMPO: Partial<Record<PromocionDenial, CampoPromocion>> = {
  "titulo-vacio": "titulo",
  "titulo-largo": "titulo",
  "texto-vacio": "texto",
  "texto-largo": "texto",
  "sin-sedes": "sedes",
  "fecha-invalida": "desde",
  "inicio-pasado": "desde",
  "inicio-fijo": "desde",
  "fin-pasado": "hasta",
  "sede-cerrada": "sedes",
  "fin-antes-de-inicio": "hasta",
  "imagen-invalida": "imagen",
  "imagen-pesada": "imagen",
};

function leerValores(formData: FormData): ValoresPromocion {
  const leer = (campo: string) => String(formData.get(campo) ?? "").trim();
  return {
    titulo: leer("titulo"),
    texto: leer("texto"),
    sedes: formData.getAll("sede").map(String),
    desde: leer("desde"),
    hasta: leer("hasta"),
  };
}

function aInput(v: ValoresPromocion, formData?: FormData): PromocionInput {
  const base = { titulo: v.titulo, texto: v.texto, sedes: v.sedes, desde: v.desde, hasta: v.hasta };
  if (!formData) return base;
  /* Sin nada, se conserva la que tenga; «quitar-imagen» la quita; una nueva la sustituye. */
  if (formData.get("quitar-imagen") === "1") return { ...base, imagen: null };
  const nueva = String(formData.get("imagen") ?? "");
  return nueva ? { ...base, imagen: nueva } : base;
}

function nombreDeSedeEn(scope: Parameters<typeof redEnAlcance>[0]): (id: string) => string {
  const red = redEnAlcance(scope);
  return (id) => red.sede(id)?.name ?? id;
}

function rechazo(reason: PromocionDenial, valores: ValoresPromocion): ResultadoPromocion {
  const error = mensaje("promociones", reason, { max: reason === "titulo-largo" ? TITULO_MAX : TEXTO_MAX });
  const campo = CAMPO[reason];
  return campo ? { ok: false, error, campo, valores } : { ok: false, error, valores };
}

/** Lo que se audita de una promoción, incluidas sus sedes por su nombre (**FR-AD-PROM-10**). */
function resumen(i: PromocionInput, nombreDeSede: (id: string) => string, conImagen?: boolean): string {
  const imagen = conImagen === undefined ? "" : conImagen ? " · con imagen" : " · sin imagen";
  const sedes = i.sedes.map(nombreDeSede).join(", ");
  return `«${i.titulo}» · ${i.texto} · ${sedes} · del ${i.desde} al ${i.hasta}${imagen}`;
}

export async function crearPromocionAction(
  _previo: ResultadoPromocion,
  formData: FormData,
): Promise<ResultadoPromocion> {
  const valores = leerValores(formData);
  const session = await getAdminSession();
  if (!session) return { ok: false, error: mensaje("promociones", "sesion-terminada"), valores };

  const r = crearPromocion(session.scope, aInput(valores, formData), session.user.fullName);
  if (!r.ok) return rechazo(r.reason, valores);

  registrarEvento({
    actorId: session.user.id,
    actorName: session.user.fullName,
    actorRole: "admin-sede",
    type: "promocion-sede.alta",
    subject: `Promoción «${r.value.titulo}»`,
    operatorId: session.operator.id,
    after: resumen(aInput(valores), nombreDeSedeEn(session.scope), Boolean(r.value.imagen)),
  });

  revalidatePath("/admin", "layout");
  redirect(`/admin/promociones?guardada=${encodeURIComponent(r.value.id)}`);
}

export async function editarPromocionAction(
  _previo: ResultadoPromocion,
  formData: FormData,
): Promise<ResultadoPromocion> {
  const valores = leerValores(formData);
  const id = String(formData.get("id") ?? "");
  const session = await getAdminSession();
  if (!session) return { ok: false, error: mensaje("promociones", "sesion-terminada"), valores };

  const r = editarPromocion(session.scope, id, aInput(valores, formData), session.user.fullName);
  if (!r.ok) return rechazo(r.reason, valores);

  registrarEvento({
    actorId: session.user.id,
    actorName: session.user.fullName,
    actorRole: "admin-sede",
    type: "promocion-sede.editada",
    subject: `Promoción «${r.value.promo.titulo}»`,
    operatorId: session.operator.id,
    before: resumen(r.value.antes, nombreDeSedeEn(session.scope), r.value.teniaImagen),
    after: resumen(aInput(valores), nombreDeSedeEn(session.scope), Boolean(r.value.promo.imagen)),
  });

  revalidatePath("/admin", "layout");
  redirect(`/admin/promociones?guardada=${encodeURIComponent(id)}`);
}

export type ResultadoRetirar = { ok: true } | { ok: false; error: string } | null;

export async function retirarPromocionAction(
  _previo: ResultadoRetirar,
  formData: FormData,
): Promise<ResultadoRetirar> {
  const id = String(formData.get("id") ?? "");
  const session = await getAdminSession();
  if (!session) return { ok: false, error: mensaje("promociones", "sesion-terminada") };

  const r = retirarPromocion(session.scope, id, session.user.fullName);
  if (!r.ok) {
    return {
      ok: false,
      error: mensaje("promociones", r.reason === "vencida" ? "vencida-al-retirar" : r.reason),
    };
  }

  registrarEvento({
    actorId: session.user.id,
    actorName: session.user.fullName,
    actorRole: "admin-sede",
    type: "promocion-sede.retirada",
    subject: `Promoción «${r.value.promo.titulo}»${r.value.estabaVigente ? ", que estaba en pantalla" : ", antes de empezar"}`,
    operatorId: session.operator.id,
  });

  revalidatePath("/admin", "layout");
  redirect(`/admin/promociones?pestana=vencidas&retirada=${encodeURIComponent(id)}`);
}
