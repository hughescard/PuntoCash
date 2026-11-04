"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { mensaje } from "@/app/admin/(app)/mensajes";
import { isMotivoValido } from "@/features/network/sedes";
import { registrarEvento } from "@/features/network/audit";
import {
  crearPromocionDeRed,
  editarPromocionDeRed,
  retirarPromocionDeRed,
  TEXTO_MAX,
  TITULO_MAX,
  type PromocionDeRedInput,
  type PromocionDenial,
} from "@/features/network/promotions";
import { redEnAlcance } from "@/features/network/scoped-reads";
import { getSuperAdminSession } from "@/features/super-admin/session-server";

/**
 * Crear, editar y retirar promociones de red — **FR-SA-PROM-1** a
 * **FR-SA-PROM-8**. Solo las de red: las de un operador las ve PuntoCash y no
 * las toca, y el dominio lo rechaza aunque alguien forjara la petición.
 */

export type CampoPromocionRed = "titulo" | "texto" | "sedes" | "desde" | "hasta" | "imagen";

export interface ValoresPromocionRed {
  titulo: string;
  texto: string;
  destino: "red" | "sedes";
  sedes: string[];
  desde: string;
  hasta: string;
}

export type ResultadoPromocionRed =
  | { ok: false; error: string; campo?: CampoPromocionRed; valores: ValoresPromocionRed }
  | null;

const CAMPO: Partial<Record<PromocionDenial, CampoPromocionRed>> = {
  "titulo-vacio": "titulo",
  "titulo-largo": "titulo",
  "texto-vacio": "texto",
  "texto-largo": "texto",
  "sin-sedes": "sedes",
  "sede-cerrada": "sedes",
  "fecha-invalida": "desde",
  "inicio-pasado": "desde",
  "inicio-fijo": "desde",
  "fin-pasado": "hasta",
  "fin-antes-de-inicio": "hasta",
  "imagen-invalida": "imagen",
  "imagen-pesada": "imagen",
};

/** Los mensajes comunes son los del catálogo; estos dos hablan de PuntoCash. */
function texto(reason: PromocionDenial): string {
  if (reason === "sin-sedes") return "Elige al menos una sede, o marca toda la red.";
  if (reason === "del-operador") return "Esta promoción la publica un operador: PuntoCash la ve, pero no la cambia.";
  if (reason === "solo-puntocash") return "Esta acción es de PuntoCash.";
  return mensaje("promociones", reason, { max: reason === "titulo-largo" ? TITULO_MAX : TEXTO_MAX });
}

function leerValores(formData: FormData): ValoresPromocionRed {
  const leer = (campo: string) => String(formData.get(campo) ?? "").trim();
  return {
    titulo: leer("titulo"),
    texto: leer("texto"),
    destino: formData.get("destino") === "sedes" ? "sedes" : "red",
    sedes: formData.getAll("sede").map(String),
    desde: leer("desde"),
    hasta: leer("hasta"),
  };
}

function aInput(v: ValoresPromocionRed, formData: FormData): PromocionDeRedInput {
  const base = {
    titulo: v.titulo,
    texto: v.texto,
    sedes: v.destino === "red" ? ("red" as const) : v.sedes,
    desde: v.desde,
    hasta: v.hasta,
  };
  /* Sin nada, se conserva la que tenga; «quitar-imagen» la quita; una nueva la sustituye. */
  if (formData.get("quitar-imagen") === "1") return { ...base, imagen: null };
  const nueva = String(formData.get("imagen") ?? "");
  return nueva ? { ...base, imagen: nueva } : base;
}

function rechazo(reason: PromocionDenial, valores: ValoresPromocionRed): ResultadoPromocionRed {
  const error = texto(reason);
  const campo = CAMPO[reason];
  return campo ? { ok: false, error, campo, valores } : { ok: false, error, valores };
}

/** Lo que se audita (**FR-SA-PROM-8**): las sedes por su nombre, o «Toda la red». */
function resumen(i: PromocionDeRedInput, nombreDeSede: (id: string) => string, conImagen: boolean): string {
  const donde = i.sedes === "red" ? "Toda la red" : i.sedes.map(nombreDeSede).join(", ");
  return `«${i.titulo}» · ${i.texto} · ${donde} · del ${i.desde} al ${i.hasta} · ${conImagen ? "con imagen" : "sin imagen"}`;
}

const SESION = "Tu sesión ha terminado. Vuelve a entrar.";

export async function crearPromocionRedAction(
  _previo: ResultadoPromocionRed,
  formData: FormData,
): Promise<ResultadoPromocionRed> {
  const valores = leerValores(formData);
  const session = await getSuperAdminSession();
  if (!session) return { ok: false, error: SESION, valores };

  const input = aInput(valores, formData);
  const r = crearPromocionDeRed(session.scope, input, session.user.fullName);
  if (!r.ok) return rechazo(r.reason, valores);

  const red = redEnAlcance(session.scope);
  registrarEvento({
    actorId: session.user.id,
    actorName: session.user.fullName,
    actorRole: "super-admin",
    type: "promocion-red.alta",
    subject: `Promoción de red «${r.value.titulo}»`,
    after: resumen(input, (id) => red.sede(id)?.name ?? id, Boolean(r.value.imagen)),
  });

  revalidatePath("/super-admin", "layout");
  redirect(`/super-admin/promociones?guardada=${encodeURIComponent(r.value.id)}`);
}

export async function editarPromocionRedAction(
  _previo: ResultadoPromocionRed,
  formData: FormData,
): Promise<ResultadoPromocionRed> {
  const valores = leerValores(formData);
  const id = String(formData.get("id") ?? "");
  const session = await getSuperAdminSession();
  if (!session) return { ok: false, error: SESION, valores };

  const input = aInput(valores, formData);
  const r = editarPromocionDeRed(session.scope, id, input, session.user.fullName);
  if (!r.ok) return rechazo(r.reason, valores);

  const red = redEnAlcance(session.scope);
  const nombre = (sedeId: string) => red.sede(sedeId)?.name ?? sedeId;
  registrarEvento({
    actorId: session.user.id,
    actorName: session.user.fullName,
    actorRole: "super-admin",
    type: "promocion-red.editada",
    subject: `Promoción de red «${r.value.promo.titulo}»`,
    before: resumen(r.value.antes, nombre, r.value.teniaImagen),
    after: resumen(input, nombre, Boolean(r.value.promo.imagen)),
  });

  revalidatePath("/super-admin", "layout");
  redirect(`/super-admin/promociones?guardada=${encodeURIComponent(id)}`);
}

export type ResultadoRetirarRed = { ok: true } | { ok: false; error: string } | null;

export async function retirarPromocionRedAction(
  _previo: ResultadoRetirarRed,
  formData: FormData,
): Promise<ResultadoRetirarRed> {
  const id = String(formData.get("id") ?? "");
  const session = await getSuperAdminSession();
  if (!session) return { ok: false, error: SESION };

  /* Retirar quita de las pantallas algo que la red ya anuncia: se explica
     (decisión del 3/11/2026). */
  const motivo = String(formData.get("motivo") ?? "").trim();
  if (!isMotivoValido(motivo)) return { ok: false, error: "Escribe el motivo: tiene que tener al menos 10 caracteres." };

  const r = retirarPromocionDeRed(session.scope, id, session.user.fullName);
  if (!r.ok) return { ok: false, error: r.reason === "vencida" ? "Esta promoción ya venció." : texto(r.reason) };

  registrarEvento({
    actorId: session.user.id,
    actorName: session.user.fullName,
    actorRole: "super-admin",
    type: "promocion-red.retirada",
    subject: `Promoción de red «${r.value.promo.titulo}»${r.value.estabaVigente ? ", que estaba en pantalla" : ", antes de empezar"}`,
    reason: motivo,
  });

  revalidatePath("/super-admin", "layout");
  redirect(`/super-admin/promociones?pestana=vencidas&retirada=${encodeURIComponent(id)}`);
}
