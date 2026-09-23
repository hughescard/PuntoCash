/**
 * FRONTEND-ONLY MOCK content for `/kiosk/pantalla` — the non-touch signage
 * screen shown on branch TVs.
 *
 * `PUBLIC_RATE_BOARD` is deliberately its own small table, not a re-export of
 * `UNITS_PER_USD` from `@/features/exchange/quote`: that module documents its
 * pricing table as "Deliberately private... exposing the intermediate maths
 * would be an invitation to reimplement it in a component", and a TV in the
 * lobby is the most public surface in the product. A real integration would
 * feed this from whatever endpoint the business already uses to publish
 * today's board rate — never from the operational quoting engine.
 */

export interface PublicRate {
  currency: string;
  name: string;
  /** CUP the branch pays the client per unit of `currency` (branch buys). */
  buy: number;
  /** CUP the branch charges the client per unit of `currency` (branch sells). */
  sell: number;
}

export const PUBLIC_RATE_BOARD: readonly PublicRate[] = [
  { currency: "USD", name: "Dólar estadounidense", buy: 315, sell: 325 },
  { currency: "EUR", name: "Euro", buy: 340, sell: 352 },
  { currency: "GBP", name: "Libra esterlina", buy: 395, sell: 408 },
  { currency: "CAD", name: "Dólar canadiense", buy: 228, sell: 238 },
  { currency: "CHF", name: "Franco suizo", buy: 358, sell: 370 },
  { currency: "MXN", name: "Peso mexicano", buy: 16, sell: 18 },
];

/*
 * Branch information no longer lives here: each signage screen shows the sede
 * it was set up for (`signage-branch.ts`), read from the network's sede list
 * (`@/features/branches/branches`). Rates and promotions below are still one
 * fixed table for the whole demo — see Pantalla FRD §7.
 */

export interface Promotion {
  id: string;
  title: string;
  description: string;
}

export const PROMOTIONS: readonly Promotion[] = [
  {
    id: "promo-remesas",
    title: "Cobra tu remesa sin filas",
    description: "Prepárala en el kiosco de autoservicio y complétala en caja en minutos.",
  },
  {
    id: "promo-giros",
    title: "Envía un giro a cualquier provincia",
    description: "Disponible hoy mismo desde cualquiera de nuestras cajas habilitadas.",
  },
];
