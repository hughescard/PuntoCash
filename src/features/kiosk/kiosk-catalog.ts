import type { LucideIcon } from "lucide-react";
import { ArrowRightLeft, HandCoins, RefreshCw, TrendingUp } from "lucide-react";

/**
 * The self-service catalog shown on `/kiosk/autoservicio`.
 *
 * This is a DELIBERATELY SEPARATE catalog from `WORKER_SERVICES`
 * (`@/features/operations/services`), not a filtered view of it: the copy here
 * is written for the client standing at the kiosk, not for the Worker, and the
 * Kiosk only ever offers the services the business has approved for
 * self-service — never "every service that happens to be implemented".
 *
 * Scope decision (confirmed with the business, 2026-09-15): the kiosk PREPARES
 * an operation — it captures what a Worker would otherwise type at the
 * counter — and stops at a request code. It never moves cash and never
 * completes a service on its own:
 *
 *   · No unattended cash dispensing/receiving is modelled — there is no
 *     "kiosk register" in the domain, deliberately, mirroring how a Worker
 *     needs an open Jornada before touching cash (see the Worker PRD, R1).
 *   · Identity is still verified by a person: R5 in the Worker PRD ("La
 *     identidad se verifica físicamente, por una persona") is not relaxed by
 *     this product — the kiosk only collects what the client states, and a
 *     Worker confirms it against the physical document at the counter.
 *
 * A request's `service` value routes to the matching flow under
 * `/kiosk/autoservicio/<slug>`.
 */
export type KioskServiceId = "cambio-moneda" | "remesas" | "giros";

export interface KioskService {
  id: KioskServiceId;
  slug: string;
  /** Client-facing title — short enough for a large touch tile. */
  name: string;
  /** One sentence, written for the client, not the operator. */
  description: string;
  icon: LucideIcon;
}

export const KIOSK_SERVICES: readonly KioskService[] = [
  {
    id: "cambio-moneda",
    slug: "cambio-moneda",
    name: "Cambio de moneda",
    description: "Cambia divisas a la tasa del día.",
    icon: RefreshCw,
  },
  {
    id: "remesas",
    slug: "remesas",
    name: "Cobrar remesa",
    description: "Cobra una remesa con el código que te dieron.",
    icon: HandCoins,
  },
  {
    id: "giros",
    slug: "giros",
    name: "Giros",
    description: "Envía dinero a otra provincia o cobra un giro.",
    icon: ArrowRightLeft,
  },
] as const satisfies readonly KioskService[];

/** The fourth tile on the kiosk home — consultation only, produces no request. */
export const KIOSK_RATES_TILE = {
  slug: "tasas",
  name: "Consultar tasas",
  description: "Revisa las tasas de cambio vigentes hoy.",
  icon: TrendingUp,
} as const;

export function findKioskService(slug: string): KioskService | undefined {
  return KIOSK_SERVICES.find((service) => service.slug === slug);
}
