import { formatDate } from "@/lib/format";

/** «2026-10-18» → «18 oct 2026», sin que la zona horaria lo mueva de día. */
export function fecha(iso: string): string {
  return formatDate(new Date(`${iso}T12:00:00Z`));
}

/** Del 18 al 18 es un solo día, y se dice así. */
export function vigencia(desde: string, hasta: string): string {
  return desde === hasta ? fecha(desde) : `${fecha(desde)} – ${fecha(hasta)}`;
}
