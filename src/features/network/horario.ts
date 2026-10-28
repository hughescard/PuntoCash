/**
 * El horario de una sede, **por días**: cada día está cerrado, o abre a una
 * hora y cierra a otra.
 *
 * Antes era un texto libre («Lunes a sábado · 9:00 a.m. – 6:00 p.m.»). Mientras
 * solo lo escribía PuntoCash daba igual; desde que lo edita el administrador de
 * la sede (**FR-AD-SEDE-14**), un texto libre significa que cada sede lo
 * escribe a su manera en la pantalla de la sala, y que nada puede leerlo: el
 * aviso de «jornada abierta fuera del horario» (**FR-AD-HOME-2**) necesita
 * saber a qué hora cierra la sede, no una frase. El texto se sigue
 * produciendo, pero **a partir de los datos**, siempre con el mismo formato.
 *
 * Módulo puro, sin estado: lo usan el dominio, el formulario y la pantalla.
 */

export const DIAS = ["lun", "mar", "mie", "jue", "vie", "sab", "dom"] as const;
export type Dia = (typeof DIAS)[number];

export const NOMBRE_DEL_DIA: Readonly<Record<Dia, string>> = {
  lun: "Lunes",
  mar: "Martes",
  mie: "Miércoles",
  jue: "Jueves",
  vie: "Viernes",
  sab: "Sábado",
  dom: "Domingo",
};

/** Horas en 24 h, «HH:MM», que es lo que entrega un `<input type="time">`. */
export interface Franja {
  abre: string;
  cierra: string;
}

/** `null` es cerrado ese día. */
export type HorarioSemanal = Readonly<Record<Dia, Franja | null>>;

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

export type HorarioInvalido =
  | { motivo: "sin-dias" }
  | { motivo: "hora-invalida"; dia: Dia }
  | { motivo: "cierra-antes"; dia: Dia };

/**
 * Por qué un horario no se puede guardar, o `null`. Al menos un día abierto:
 * una sede que no abre nunca no es un horario, es una sede suspendida, y eso
 * lo decide PuntoCash. Cerrar después de medianoche no se contempla.
 */
export function validarHorario(horario: HorarioSemanal): HorarioInvalido | null {
  let abiertos = 0;
  for (const dia of DIAS) {
    const f = horario[dia];
    if (!f) continue;
    abiertos += 1;
    if (!HORA.test(f.abre) || !HORA.test(f.cierra)) return { motivo: "hora-invalida", dia };
    if (f.cierra <= f.abre) return { motivo: "cierra-antes", dia };
  }
  return abiertos === 0 ? { motivo: "sin-dias" } : null;
}

/** «09:00» → «9:00 a.m.»; «12:00» → «12:00 p.m.». */
export function horaLegible(hhmm: string): string {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  const sufijo = h < 12 ? "a.m." : "p.m.";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${sufijo}`;
}

function mismaFranja(a: Franja | null, b: Franja | null): boolean {
  return a !== null && b !== null && a.abre === b.abre && a.cierra === b.cierra;
}

/**
 * El horario en líneas, agrupando los días **seguidos** con la misma franja:
 * «Lunes a viernes · 8:30 a.m. – 5:30 p.m.», «Sábado · 9:00 a.m. – 1:00 p.m.».
 * Los días cerrados no se nombran: lo que no aparece, no abre.
 */
export function lineasDeHorario(horario: HorarioSemanal): string[] {
  const lineas: string[] = [];
  let i = 0;
  while (i < DIAS.length) {
    const franja = horario[DIAS[i]!];
    if (!franja) {
      i += 1;
      continue;
    }
    let j = i;
    while (j + 1 < DIAS.length && mismaFranja(horario[DIAS[j + 1]!], franja)) j += 1;
    const desde = NOMBRE_DEL_DIA[DIAS[i]!];
    const hasta = NOMBRE_DEL_DIA[DIAS[j]!].toLowerCase();
    const dias = j === i ? desde : j === i + 1 ? `${desde} y ${hasta}` : `${desde} a ${hasta}`;
    lineas.push(`${dias} · ${horaLegible(franja.abre)} – ${horaLegible(franja.cierra)}`);
    i = j + 1;
  }
  return lineas;
}

/** Las mismas líneas en una sola cadena, para quien solo tiene sitio para una. */
export function textoDeHorario(horario: HorarioSemanal): string {
  return lineasDeHorario(horario).join("; ");
}

/** Atajo para sembrar: los días indicados con la misma franja, el resto cerrado. */
export function horarioDe(dias: readonly Dia[], abre: string, cierra: string): HorarioSemanal {
  return Object.fromEntries(
    DIAS.map((d) => [d, dias.includes(d) ? { abre, cierra } : null]),
  ) as Record<Dia, Franja | null>;
}

export const LUNES_A_SABADO: readonly Dia[] = ["lun", "mar", "mie", "jue", "vie", "sab"];
export const LUNES_A_VIERNES: readonly Dia[] = ["lun", "mar", "mie", "jue", "vie"];

const DIA_DE_INTL: Readonly<Record<string, Dia>> = {
  Mon: "lun", Tue: "mar", Wed: "mie", Thu: "jue", Fri: "vie", Sat: "sab", Sun: "dom",
};

/**
 * Si la sucursal está en horario en este momento, en hora de Cuba. Lo usa
 * Inicio para distinguir una caja abierta fuera de horario —que nadie cerró—
 * y una sede en horario sin ninguna caja abierta (**FR-AD-HOME-2**).
 */
export function enHorario(horario: HorarioSemanal, now: Date = new Date()): boolean {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Havana",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const dia = DIA_DE_INTL[partes.find((p) => p.type === "weekday")?.value ?? ""];
  const hh = partes.find((p) => p.type === "hour")?.value ?? "00";
  const mm = partes.find((p) => p.type === "minute")?.value ?? "00";
  const franja = dia ? horario[dia] : null;
  if (!franja) return false;
  const ahora = `${hh}:${mm}`;
  return franja.abre <= ahora && ahora < franja.cierra;
}

/**
 * El horario tal como lo manda `HorarioEditor`: `{dia}-abierto` (casilla),
 * `{dia}-abre` y `{dia}-cierra`. Un día sin la casilla marcada es un día
 * cerrado aunque traiga horas: el editor las conserva para cuando se vuelva a
 * abrir y no deben contar.
 */
export function horarioDesdeFormulario(formData: FormData): HorarioSemanal {
  const leer = (campo: string) => String(formData.get(campo) ?? "").trim();
  return Object.fromEntries(
    DIAS.map((dia): [Dia, Franja | null] => [
      dia,
      formData.get(`${dia}-abierto`) ? { abre: leer(`${dia}-abre`), cierra: leer(`${dia}-cierra`) } : null,
    ]),
  ) as HorarioSemanal;
}
