/**
 * LAS PROMOCIONES de la red — lo que cada sucursal anuncia en su pantalla
 * informativa (**FR-AD-PROM-1** a **FR-AD-PROM-12**).
 *
 * Dos orígenes: las de cada **operador**, que crea, edita y retira su
 * administrador para sus sedes; y las de **red**, que publica PuntoCash y que
 * el administrador solo ve (**FR-AD-PROM-3**).
 *
 * ── El estado no se guarda, se calcula ────────────────────────────────────
 * Programada, vigente o vencida depende de la fecha de hoy, así que guardarla
 * obligaría a alguien a cambiarla a medianoche; una promoción que vence deja
 * de mostrarse sola (**FR-AD-PROM-6**). Lo único que se guarda es la
 * **retirada**, que es un acto: una retirada cuenta como vencida y queda en el
 * histórico (**FR-AD-PROM-9**).
 *
 * ── Fechas ────────────────────────────────────────────────────────────────
 * Por día, «AAAA-MM-DD», en la hora de Cuba, y **las dos incluidas**: del 18
 * al 18 es una promoción que se ve todo el día 18 (decisión del 16/10/2026).
 *
 * ── Lo que se exhibe ──────────────────────────────────────────────────────
 * Una promoción de operador solo se exhibe en una sede **mientras ese operador
 * la administra**: si PuntoCash reasigna la sede, las promociones del anterior
 * no siguen anunciándose en una sala que ya no es suya.
 */

import { estaEnAlcance, operadorVigente } from "./assignments";
import { requireOperatorScope, type Scope, type ScopeDenial } from "./scope";
import { findSedeById } from "./sedes";
import { IMAGEN_GIROS_JPEG } from "./promotions-seed-image";

/** Lo que se lee desde el otro lado de una sala (decisión del 16/10/2026). */
export const TITULO_MAX = 40;
export const TEXTO_MAX = 120;
/**
 * La imagen es opcional (decisión del 16/10/2026). Se guarda ya reducida por
 * el navegador de quien la sube, así que este tope es holgado.
 */
export const IMAGEN_MAX_BYTES = 2 * 1024 * 1024;
export const TIPOS_DE_IMAGEN = ["image/jpeg", "image/png", "image/webp"] as const;
export type TipoDeImagen = (typeof TIPOS_DE_IMAGEN)[number];

export interface ImagenDePromocion {
  tipo: TipoDeImagen;
  /** Base64, sin el prefijo `data:`. */
  datos: string;
  /** Cambia con cada imagen nueva, para que nadie sirva una vieja de caché. */
  version: string;
}
/**
 * Cada promoción ocupa su propia diapositiva de 12 s. Con más de cuatro, un
 * cliente que espera no llega a verlas todas (**FR-AD-PROM-8**).
 */
export const MAX_EN_ROTACION = 4;

export type OrigenPromocion = "operador" | "red";
export type EstadoPromocion = "programada" | "vigente" | "vencida";

export interface Promocion {
  id: string;
  titulo: string;
  texto: string;
  origen: OrigenPromocion;
  /** Solo en las de operador. */
  operatorId?: string;
  /** Sedes donde se exhibe; en las de red, `"red"` es toda la red. */
  sedes: readonly string[] | "red";
  desde: string;
  hasta: string;
  creadaAt: string;
  creadaPor: string;
  actualizadaAt?: string;
  actualizadaPor?: string;
  retirada?: { at: string; por: string };
  imagen?: ImagenDePromocion;
}

/* -------------------------------------------------------------------------
 * Fechas
 * ---------------------------------------------------------------------- */

/** La fecha de hoy en Cuba, «AAAA-MM-DD». */
export function hoyEnCuba(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Havana",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

export function estadoDe(p: Promocion, hoy: string): EstadoPromocion {
  if (p.retirada) return "vencida";
  if (hoy < p.desde) return "programada";
  if (hoy > p.hasta) return "vencida";
  return "vigente";
}

export function seExhibeEn(p: Promocion, sedeId: string): boolean {
  if (p.sedes === "red") return true;
  if (!p.sedes.includes(sedeId)) return false;
  return p.origen === "red" || operadorVigente(sedeId) === p.operatorId;
}

/** Dos periodos (fechas incluidas) que comparten al menos un día. */
export function seSolapan(a: { desde: string; hasta: string }, b: { desde: string; hasta: string }): boolean {
  return a.desde <= b.hasta && b.desde <= a.hasta;
}

/* -------------------------------------------------------------------------
 * Siembra, relativa a hoy para que los tres estados existan siempre
 * ---------------------------------------------------------------------- */

const HOY = hoyEnCuba();
const SEMBRADA = `${sumarDias(HOY, -30)}T12:00:00.000Z`;

/*
 * El almacén vive en `globalThis` y no en una constante del módulo. La imagen
 * la sirve una ruta (`/kiosk/pantalla/promociones/[id]/imagen`), y Next carga
 * los módulos de una ruta de ese tipo **en un grafo distinto** del de las
 * páginas y las acciones: con una constante, la ruta tenía su propia copia de
 * la lista, con solo las sembradas, y la imagen de una promoción recién creada
 * respondía 404. Así las dos partes leen la misma lista.
 */
const ALMACEN = globalThis as typeof globalThis & { __puntocashPromociones?: Promocion[] };

const promociones: Promocion[] = (ALMACEN.__puntocashPromociones ??= [
  {
    id: "promo-red-giros",
    titulo: "Envía un giro a cualquier provincia",
    texto: "Desde cualquiera de nuestras cajas, y llega el mismo día.",
    imagen: { tipo: "image/jpeg", datos: IMAGEN_GIROS_JPEG, version: "semilla" },
    origen: "red",
    sedes: "red",
    desde: sumarDias(HOY, -20),
    hasta: sumarDias(HOY, 40),
    creadaAt: SEMBRADA,
    creadaPor: "PuntoCash",
  },
  {
    id: "promo-malecon-remesas",
    titulo: "Cobra tu remesa sin filas",
    texto: "Prepárala en el kiosco de autoservicio y complétala en caja en minutos.",
    origen: "operador",
    operatorId: "op-malecon",
    sedes: ["sede-vedado", "sede-habana-vieja"],
    desde: sumarDias(HOY, -10),
    hasta: sumarDias(HOY, 20),
    creadaAt: SEMBRADA,
    creadaPor: "Marta Sánchez",
  },
  {
    id: "promo-malecon-sabado",
    titulo: "Este sábado abrimos hasta las 8",
    texto: "Atendemos remesas y cambio de moneda hasta las 8:00 p.m.",
    origen: "operador",
    operatorId: "op-malecon",
    sedes: ["sede-vedado"],
    desde: sumarDias(HOY, 5),
    hasta: sumarDias(HOY, 5),
    creadaAt: SEMBRADA,
    creadaPor: "Marta Sánchez",
  },
  {
    id: "promo-malecon-verano",
    titulo: "Remesas de verano",
    texto: "Durante julio y agosto, tu remesa lista en caja en menos de diez minutos.",
    origen: "operador",
    operatorId: "op-malecon",
    sedes: ["sede-habana-vieja"],
    desde: sumarDias(HOY, -90),
    hasta: sumarDias(HOY, -30),
    creadaAt: `${sumarDias(HOY, -95)}T12:00:00.000Z`,
    creadaPor: "Marta Sánchez",
  },
  {
    id: "promo-red-aviso",
    titulo: "Nuevo horario de fin de año",
    texto: "Consulta en tu sucursal el horario del 31 de diciembre y el 1 de enero.",
    origen: "red",
    sedes: "red",
    desde: sumarDias(HOY, 50),
    hasta: sumarDias(HOY, 80),
    creadaAt: SEMBRADA,
    creadaPor: "PuntoCash",
  },
  {
    id: "promo-caribe-miramar",
    titulo: "Cambio de moneda en Miramar",
    texto: "Ahora también compramos y vendemos euros.",
    origen: "operador",
    operatorId: "op-caribe",
    sedes: ["sede-miramar"],
    desde: sumarDias(HOY, -3),
    hasta: sumarDias(HOY, 27),
    creadaAt: SEMBRADA,
    creadaPor: "Reinaldo Ortega",
  },
]);

/* -------------------------------------------------------------------------
 * Lecturas
 * ---------------------------------------------------------------------- */

export function todasLasPromociones(): readonly Promocion[] {
  return promociones;
}

export function promocionPorId(id: string): Promocion | null {
  return promociones.find((p) => p.id === id) ?? null;
}

/** Lo que la pantalla informativa de una sede anuncia hoy (**FR-AD-PROM-6**). */
export function promocionesPublicas(
  sedeId: string,
  now = new Date(),
): readonly { id: string; titulo: string; texto: string; imagen: string | null }[] {
  const hoy = hoyEnCuba(now);
  return promociones
    .filter((p) => estadoDe(p, hoy) === "vigente" && seExhibeEn(p, sedeId))
    .sort((a, b) => a.desde.localeCompare(b.desde))
    .map((p) => ({ id: p.id, titulo: p.titulo, texto: p.texto, imagen: urlDeImagen(p) }));
}

/* -------------------------------------------------------------------------
 * Escrituras — solo de operador, y solo sobre las suyas
 * ---------------------------------------------------------------------- */

export type PromocionDenial =
  | ScopeDenial
  | "no-encontrada"
  | "de-red"
  | "vencida"
  | "titulo-vacio"
  | "titulo-largo"
  | "texto-vacio"
  | "texto-largo"
  | "sin-sedes"
  | "sede-fuera-de-alcance"
  | "sede-cerrada"
  | "fecha-invalida"
  | "inicio-pasado"
  | "inicio-fijo"
  | "fin-pasado"
  | "fin-antes-de-inicio"
  | "imagen-invalida"
  | "imagen-pesada";

export type PromocionResult<T> = { ok: true; value: T } | { ok: false; reason: PromocionDenial };

export interface PromocionInput {
  titulo: string;
  texto: string;
  sedes: readonly string[];
  desde: string;
  hasta: string;
  /**
   * Como `data:` URL. Al editar, `undefined` conserva la que tenga y `null` la
   * quita.
   */
  imagen?: string | null;
}

const DATA_URL = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+=*)$/;

function leerImagen(dataUrl: string): ImagenDePromocion | "imagen-invalida" | "imagen-pesada" {
  const m = DATA_URL.exec(dataUrl);
  if (!m) return "imagen-invalida";
  const datos = m[2]!;
  const bytes = Math.floor((datos.length * 3) / 4) - (datos.endsWith("==") ? 2 : datos.endsWith("=") ? 1 : 0);
  if (bytes > IMAGEN_MAX_BYTES) return "imagen-pesada";
  return { tipo: m[1] as TipoDeImagen, datos, version: `${Date.now()}-${siguiente++}` };
}

/** La imagen de una promoción, para servirla a las pantallas. */
export function imagenDePromocion(id: string): ImagenDePromocion | null {
  return promocionPorId(id)?.imagen ?? null;
}

/** La dirección de la imagen de una promoción, o `null` si no tiene. */
export function urlDeImagen(p: Promocion): string | null {
  return p.imagen ? `/kiosk/pantalla/promociones/${p.id}/imagen?v=${p.imagen.version}` : null;
}

function validar(
  scope: Scope,
  input: PromocionInput,
  hoy: string,
  desdeAnterior?: string,
  enPantalla = false,
): PromocionDenial | null {
  const titulo = input.titulo.trim();
  const texto = input.texto.trim();
  if (!titulo) return "titulo-vacio";
  if (titulo.length > TITULO_MAX) return "titulo-largo";
  if (!texto) return "texto-vacio";
  if (texto.length > TEXTO_MAX) return "texto-largo";
  if (input.sedes.length === 0) return "sin-sedes";
  if (input.sedes.some((s) => !estaEnAlcance(scope, s) || !findSedeById(s))) return "sede-fuera-de-alcance";
  /* FR-AD-PROM-4 y §18: una sede cerrada no admite promociones. */
  if (input.sedes.some((s) => findSedeById(s)?.status === "cerrada")) return "sede-cerrada";
  if (!FECHA.test(input.desde) || !FECHA.test(input.hasta)) return "fecha-invalida";
  /* FR-AD-PROM-4: en pantalla, su inicio ya no se cambia. */
  if (enPantalla && input.desde !== desdeAnterior) return "inicio-fijo";
  /* No se programa hacia atrás; editar una vigente sin tocar su inicio sí vale. */
  if (input.desde < hoy && input.desde !== desdeAnterior) return "inicio-pasado";
  if (input.hasta < input.desde) return "fin-antes-de-inicio";
  /* Terminarla antes se hace retirándola (FR-AD-PROM-9), no poniéndole un fin
     ya pasado: así queda constancia de quién y cuándo. */
  if (input.hasta < hoy) return "fin-pasado";
  if (typeof input.imagen === "string") {
    const imagen = leerImagen(input.imagen);
    if (typeof imagen === "string") return imagen;
  }
  return null;
}

let siguiente = 1;

export function crearPromocion(
  scope: Scope,
  input: PromocionInput,
  autor: string,
  now = new Date(),
): PromocionResult<Promocion> {
  const operator = requireOperatorScope(scope);
  if (!operator.ok) return { ok: false, reason: operator.reason };
  const denial = validar(scope, input, hoyEnCuba(now));
  if (denial) return { ok: false, reason: denial };

  const promo: Promocion = {
    id: `promo-${operator.value}-${now.getTime()}-${siguiente++}`,
    titulo: input.titulo.trim(),
    texto: input.texto.trim(),
    origen: "operador",
    operatorId: operator.value,
    sedes: [...input.sedes],
    desde: input.desde,
    hasta: input.hasta,
    ...(typeof input.imagen === "string" ? { imagen: leerImagen(input.imagen) as ImagenDePromocion } : {}),
    creadaAt: now.toISOString(),
    creadaPor: autor,
  };
  promociones.push(promo);
  return { ok: true, value: promo };
}

function propiaYViva(scope: Scope, id: string, hoy: string): PromocionResult<Promocion> {
  const operator = requireOperatorScope(scope);
  if (!operator.ok) return { ok: false, reason: operator.reason };
  const promo = promocionPorId(id);
  /* Una ajena responde como inexistente (FR-AD-NAV-3); una de red se ve, pero no se toca. */
  if (!promo || (promo.origen === "operador" && promo.operatorId !== operator.value)) {
    return { ok: false, reason: "no-encontrada" };
  }
  if (promo.origen === "red") return { ok: false, reason: "de-red" };
  if (estadoDe(promo, hoy) === "vencida") return { ok: false, reason: "vencida" };
  return { ok: true, value: promo };
}

export function editarPromocion(
  scope: Scope,
  id: string,
  input: PromocionInput,
  autor: string,
  now = new Date(),
): PromocionResult<{ promo: Promocion; antes: PromocionInput; teniaImagen: boolean }> {
  const hoy = hoyEnCuba(now);
  const encontrada = propiaYViva(scope, id, hoy);
  if (!encontrada.ok) return encontrada;
  const promo = encontrada.value;
  const denial = validar(scope, input, hoy, promo.desde, estadoDe(promo, hoy) === "vigente");
  if (denial) return { ok: false, reason: denial };

  const teniaImagen = Boolean(promo.imagen);
  const antes: PromocionInput = {
    titulo: promo.titulo,
    texto: promo.texto,
    sedes: promo.sedes === "red" ? [] : [...promo.sedes],
    desde: promo.desde,
    hasta: promo.hasta,
  };
  promo.titulo = input.titulo.trim();
  promo.texto = input.texto.trim();
  promo.sedes = [...input.sedes];
  promo.desde = input.desde;
  promo.hasta = input.hasta;
  if (input.imagen === null) delete promo.imagen;
  else if (typeof input.imagen === "string") promo.imagen = leerImagen(input.imagen) as ImagenDePromocion;
  promo.actualizadaAt = now.toISOString();
  promo.actualizadaPor = autor;
  return { ok: true, value: { promo, antes, teniaImagen } };
}

export function retirarPromocion(
  scope: Scope,
  id: string,
  autor: string,
  now = new Date(),
): PromocionResult<{ promo: Promocion; estabaVigente: boolean }> {
  const hoy = hoyEnCuba(now);
  const encontrada = propiaYViva(scope, id, hoy);
  if (!encontrada.ok) return encontrada;
  const promo = encontrada.value;
  const estabaVigente = estadoDe(promo, hoy) === "vigente";
  promo.retirada = { at: now.toISOString(), por: autor };
  return { ok: true, value: { promo, estabaVigente } };
}
