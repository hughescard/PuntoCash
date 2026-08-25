import type { LucideIcon } from "lucide-react";
import {
  ArrowRightLeft,
  ArrowUpToLine,
  Building2,
  Container,
  CreditCard,
  Gift,
  Globe,
  HandCoins,
  Plane,
  ReceiptText,
  RefreshCw,
  Send,
  WalletCards,
} from "lucide-react";

/**
 * The PuntoCash service catalog — the single source of truth for every screen
 * that offers, links to or names an operational service.
 *
 * Consumed by:
 *   · /worker/nueva-operacion            the service selector
 *   · /worker/nueva-operacion/[servicio] the placeholder each flow resolves to
 *   · /worker/inicio                     the home quick actions
 *
 * Adding a service here makes its route resolve and its card appear; there is
 * no second list to keep in sync. Icons stay line-style within one visual
 * family (§6 "Iconografía").
 */

/** Where a service stands in product development — not an operational state. */
export type ServiceStatus = "available" | "under-construction";

export type ServiceCategoryId =
  | "cambio-y-efectivo"
  | "transferencias"
  | "pagos-y-productos"
  | "empresas";

export interface ServiceCategory {
  id: ServiceCategoryId;
  label: string;
}

/** Rendered in this order on the selector. */
export const SERVICE_CATEGORIES = [
  { id: "cambio-y-efectivo", label: "Cambio y efectivo" },
  { id: "transferencias", label: "Transferencias" },
  { id: "pagos-y-productos", label: "Pagos y productos" },
  { id: "empresas", label: "Empresas" },
] as const satisfies readonly ServiceCategory[];

export interface WorkerService {
  /** Stable identifier, independent of the URL. */
  id: string;
  /** URL segment under /worker/nueva-operacion. */
  slug: string;
  name: string;
  /** One line on what the service does, on the card and the placeholder. */
  description: string;
  category: ServiceCategoryId;
  icon: LucideIcon;
  status: ServiceStatus;
}

export const WORKER_SERVICES = [
  // ---- Cambio y efectivo --------------------------------------------------
  {
    id: "cambio-moneda",
    slug: "cambio-moneda",
    name: "Cambio de moneda",
    description: "Compra y venta entre divisas.",
    category: "cambio-y-efectivo",
    icon: RefreshCw,
    status: "available",
  },
  {
    id: "extraccion-tarjeta-antilla",
    slug: "extraccion-tarjeta-antilla",
    name: "Extracción Tarjeta Antilla",
    description: "Retira efectivo desde tu Tarjeta Antilla.",
    category: "cambio-y-efectivo",
    icon: CreditCard,
    status: "under-construction",
  },
  {
    id: "insercion-efectivo",
    slug: "insercion-efectivo",
    name: "Inserción de efectivo",
    description: "Deposita efectivo en tu Tarjeta Antilla.",
    category: "cambio-y-efectivo",
    icon: ArrowUpToLine,
    status: "under-construction",
  },
  {
    id: "extraccion-internacional",
    slug: "extraccion-internacional",
    name: "Extracción internacional",
    description: "Retira efectivo desde tarjetas y wallets internacionales.",
    category: "cambio-y-efectivo",
    icon: Globe,
    status: "under-construction",
  },

  // ---- Transferencias -----------------------------------------------------
  {
    id: "remesas",
    slug: "remesas",
    name: "Remesas",
    description: "Envía y recibe dinero.",
    category: "transferencias",
    icon: Send,
    status: "available",
  },
  {
    id: "giros",
    slug: "giros",
    name: "Giros a otras provincias",
    description: "Transfiere dinero dentro de Cuba.",
    category: "transferencias",
    icon: ArrowRightLeft,
    status: "under-construction",
  },
  {
    id: "cobros-exterior",
    slug: "cobros-exterior",
    name: "Cobros en el exterior",
    description: "Deposita en PuntoCash para realizar un cobro internacional.",
    category: "transferencias",
    icon: HandCoins,
    status: "under-construction",
  },

  // ---- Pagos y productos --------------------------------------------------
  {
    id: "tarjeta-antilla",
    slug: "tarjeta-antilla",
    name: "Tarjeta Antilla",
    description: "Genera y recarga tu Tarjeta Antilla.",
    category: "pagos-y-productos",
    icon: WalletCards,
    status: "under-construction",
  },
  {
    id: "cobro-servicios",
    slug: "cobro-servicios",
    name: "Cobro de servicios",
    description: "Paga servicios públicos y privados.",
    category: "pagos-y-productos",
    icon: ReceiptText,
    status: "under-construction",
  },
  {
    id: "boletos-aereos",
    slug: "boletos-aereos",
    name: "Boletos aéreos",
    description: "Gestiona el pago de boletos aéreos.",
    category: "pagos-y-productos",
    icon: Plane,
    status: "under-construction",
  },
  {
    id: "gift-cards",
    slug: "gift-cards",
    name: "Gift Cards",
    description: "Compra Gift Cards para pagos digitales.",
    category: "pagos-y-productos",
    icon: Gift,
    status: "under-construction",
  },

  // ---- Empresas -----------------------------------------------------------
  {
    id: "depositos-pymes",
    slug: "depositos-pymes",
    name: "Depósitos de Pymes",
    description: "Deposita fondos empresariales.",
    category: "empresas",
    icon: Building2,
    status: "under-construction",
  },
  {
    id: "pago-importaciones",
    slug: "pago-importaciones",
    name: "Pago de importaciones",
    description: "Gestiona pagos de importación.",
    category: "empresas",
    icon: Container,
    status: "under-construction",
  },
] as const satisfies readonly WorkerService[];

/**
 * The four services surfaced as quick actions on the Worker home screen.
 * Referenced by slug so the catalog above stays the only place a service is
 * described.
 */
export const HOME_QUICK_ACTION_SLUGS = [
  "cambio-moneda",
  "remesas",
  "extraccion-tarjeta-antilla",
  "insercion-efectivo",
] as const;

export function findService(slug: string): WorkerService | undefined {
  return WORKER_SERVICES.find((service) => service.slug === slug);
}

/** Quick actions in the order the home screen shows them. */
export function getHomeQuickActions(): readonly WorkerService[] {
  return HOME_QUICK_ACTION_SLUGS.map((slug) => {
    const service = findService(slug);
    if (!service) throw new Error(`Unknown quick-action slug: ${slug}`);
    return service;
  });
}

/** Services of one category, in catalog order. */
export function getServicesByCategory(category: ServiceCategoryId): readonly WorkerService[] {
  return WORKER_SERVICES.filter((service) => service.category === category);
}

/**
 * Normalises for search: lowercase and strips diacritics, so "importacion"
 * matches "importación" and vice versa.
 */
export function normalizeForSearch(value: string): string {
  return value
    .normalize("NFD")
    // Combining diacritical marks block.
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Case- and accent-insensitive match across name, description and the
 * service's category label.
 */
export function serviceMatchesQuery(service: WorkerService, query: string): boolean {
  const q = normalizeForSearch(query);
  if (!q) return true;

  const category = SERVICE_CATEGORIES.find((c) => c.id === service.category);
  const haystack = normalizeForSearch(
    `${service.name} ${service.description} ${category?.label ?? ""}`,
  );

  return haystack.includes(q);
}
