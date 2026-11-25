import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import type { LucideIcon } from "lucide-react";
import {
  ChevronRight,
  Clock,
  LayoutGrid,
  Plus,
  List,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";

import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import { PageHeader } from "@/components/shell/app-shell";
import { ClickableRow } from "@/components/patterns/clickable-row";
import { OperationStatusBadge } from "@/components/patterns/operation-status-badge";
import { CurrencyFlag } from "@/components/patterns/currency-flag";
import { cn } from "@/lib/utils";
import { formatAmount, formatMoney } from "@/lib/format";

/** «hoy · 14:30» o «14 oct · 14:30», en hora de Cuba. */
function desdeCuando(iso: string): string {
  const zona = { timeZone: "America/Havana" } as const;
  const d = new Date(iso);
  const dia = (x: Date) => x.toLocaleDateString("es-ES", zona);
  const hora = d.toLocaleTimeString("es-ES", { ...zona, hour: "2-digit", minute: "2-digit" });
  return dia(d) === dia(new Date()) ? `hoy · ${hora}` : `${d.toLocaleDateString("es-ES", { ...zona, day: "numeric", month: "short" }).replace(".", "")} · ${hora}`;
}

const formatTime = (d: Date) =>
  new Intl.DateTimeFormat("es-ES", { timeZone: "America/Havana", hour: "2-digit", minute: "2-digit" }).format(d);
import { getVistaDeCaja } from "@/features/worker/sesion-servidor";
import { WORKER_SERVICES } from "@/features/operations/services";
import { AvisoDeCaja } from "../aviso-de-caja";
import { AlertasDeCaja } from "../alertas-de-caja";
import { TarifasVigentes } from "./tarifas-vigentes";

export const metadata: Metadata = {
  title: "Inicio",
  description: "Estado de la jornada del trabajador de PuntoCash.",
  robots: { index: false, follow: false },
};

/**
 * Worker home — the operational landing screen (manual §21 "Patrón Worker").
 *
 * It answers, in order: what cash do I hold, what rates are active, what should
 * I do next, what have I just done, and does anything need attention. It is not
 * an executive dashboard — no charts, no revenue, no other workers or cajas.
 */

/** Quiet navy glyph identifying each card, per the approved home wireframe. */
function CardGlyph({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span
      aria-hidden="true"
      className="grid size-9 shrink-0 place-items-center rounded-control bg-primary-subtle text-primary"
    >
      <Icon className="size-[18px]" />
    </span>
  );
}

/** Card actions sit at the foot of the card, where reading ends (§14 Terciario). */
function CardFooterLink({ href, children }: { href: Route; children: React.ReactNode }) {
  return (
    <Button variant="tertiary" size="sm" asChild className="-ml-3 font-medium">
      <Link href={href}>
        {children}
        <ChevronRight aria-hidden="true" />
      </Link>
    </Button>
  );
}

export default async function WorkerHomePage() {
  const vista = await getVistaDeCaja();
  if (!vista) return null;
  const worker = { firstName: vista.trabajador.firstName, register: vista.caja.nombre };
  /* Worker opera a ciegas (decisión del 6/11/2026): las monedas de la caja, nunca cuánto hay. */
  const MONEDAS = vista.monedas;
  const EXCHANGE_RATES = vista.tasas.map((t) => ({ currency: t.code, buy: t.compra, sell: t.venta, desde: vista.tasasDesde[t.code] }));
  /* Accesos rápidos: los servicios que la caja puede prestar de verdad —
     disponibles en el producto y habilitados por PuntoCash en esta sede. */
  const quickActions = WORKER_SERVICES.filter((s) => s.status === "available" && vista.servicios.includes(s.id));
  const RECENT_OPERATIONS = vista.operaciones.slice(0, 5).map((o) => ({
    code: o.codigo,
    time: formatTime(new Date(o.fechaHora)),
    client: o.cliente.nombre,
    service: o.servicio,
    amount: o.amount.kind === "exchange" ? o.amount.source : o.amount.money,
    status: o.estado,
  }));

  return (
    <>
      <PageHeader
        title={`Hola, ${worker.firstName}`}
        description="Aquí tienes el estado de tu jornada."
        actions={
          <Button asChild>
            <Link href="/worker/nueva-operacion">
              <Plus aria-hidden="true" />
              Nueva operación
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-6">
        <AvisoDeCaja />
        <AlertasDeCaja />

        {/* ---- Mi caja · Tasas vigentes ------------------------------------ */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="flex flex-col">
            <CardHeader>
              <div className="flex min-w-0 items-center gap-3">
                <CardGlyph icon={Wallet} />
                <div className="min-w-0">
                  {/* The register is the headline of this card. */}
                  <CardTitle className="text-label font-medium text-text-secondary">
                    Mi caja
                  </CardTitle>
                  <p className="text-section-title text-text-primary">{worker.register}</p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex-1">
              <p className="text-body-sm text-text-secondary">
                {vista.jornada?.propia ? "Jornada abierta" : "Sin jornada abierta"} · {vista.sede.nombre}
              </p>
              <ul aria-label="Monedas de la caja" className="mt-3 flex flex-wrap gap-2">
                {MONEDAS.map((currency) => (
                  <li
                    key={currency}
                    className="flex items-center gap-2 rounded-control border border-border bg-surface-subtle px-3 py-1.5 text-label"
                  >
                    <CurrencyFlag currency={currency} />
                    <span className="font-semibold text-text-primary">{currency}</span>
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter>
              <CardFooterLink href="/worker/caja">Ver caja</CardFooterLink>
            </CardFooter>
          </Card>

          <Card className="flex flex-col">
            <CardHeader>
              <div className="flex min-w-0 items-center gap-3">
                <CardGlyph icon={TrendingUp} />
                <CardTitle>Tasas vigentes</CardTitle>
              </div>
            </CardHeader>

            <CardContent className="flex-1 px-0 pb-0">
              {EXCHANGE_RATES.length === 0 ? (
                <p className="px-6 pb-4 text-body text-text-secondary">
                  {vista.servicios.includes("cambio-moneda")
                    ? "Tu sede no tiene ninguna tasa en vigor: hoy no se puede cambiar moneda."
                    : "Tu sede no tiene Cambio de moneda."}
                </p>
              ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Moneda</TableHead>
                    <TableHead numeric>Compra</TableHead>
                    <TableHead numeric>Venta</TableHead>
                    <TableHead className="pr-6 text-right">Desde</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {EXCHANGE_RATES.map((rate) => (
                    <TableRow key={rate.currency}>
                      <TableCell className="pl-6 font-semibold">
                        <span className="flex items-center gap-2">
                          <CurrencyFlag currency={rate.currency} />
                          {rate.currency}
                        </span>
                      </TableCell>
                      <TableCell numeric>{formatAmount(rate.buy)}</TableCell>
                      <TableCell numeric className="font-medium">
                        {formatAmount(rate.sell)}
                      </TableCell>
                      <TableCell className="pr-6 text-right text-text-secondary">
                        {rate.desde ? desdeCuando(rate.desde) : ""}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              )}
            </CardContent>

            {vista.monedasSinCambio.length > 0 ? (
              <div className="border-t border-border px-6 py-4">
                <p className="text-label text-text-primary">No se cambian hoy</p>
                <ul className="mt-2 flex flex-col gap-1" aria-label="Monedas que no se cambian hoy">
                  {vista.monedasSinCambio.map((m) => (
                    <li key={m.code} className="flex items-center gap-2 text-body-sm text-text-secondary">
                      <CurrencyFlag currency={m.code} />
                      <span className="font-semibold text-text-primary">{m.code}</span>
                      <span>· {m.motivo}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <CardFooter>
              <span className="inline-flex items-center gap-2 text-caption text-text-secondary">
                <Clock className="size-3.5" aria-hidden="true" />
                Las que tu sede tiene en vigor
              </span>
            </CardFooter>
          </Card>
        </div>

        {/* ---- Tarifas vigentes ------------------------------------------- */}
        {/* Junto a las tasas: es la misma pregunta del cliente, «¿cuánto me
            cobran?». Los accesos rápidos repiten «Nueva operación», que ya
            está arriba y en el menú, así que pueden bajar. */}
        <TarifasVigentes vista={vista} glyph={CardGlyph} desdeCuando={desdeCuando} />

        {/* ---- Accesos rápidos -------------------------------------------- */}
        <Card>
          <CardHeader>
            <div className="flex min-w-0 items-center gap-3">
              <CardGlyph icon={Zap} />
              <CardTitle>Accesos rápidos</CardTitle>
            </div>
          </CardHeader>

          <CardContent>
            {/* Stacked icon over a centred label: the longest labels wrap
                symmetrically instead of being truncated. */}
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {quickActions.map((service) => (
                <li key={service.slug}>
                  <QuickAction
                    href={`/worker/nueva-operacion/${service.slug}` as Route}
                    icon={service.icon}
                    label={service.name}
                  />
                </li>
              ))}
              <li>
                {/* The catalogue entry carries the brand accent (§3). */}
                <QuickAction
                  href="/worker/nueva-operacion"
                  icon={LayoutGrid}
                  label="Ver todos los servicios"
                  accent
                />
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* ---- Operaciones recientes --------------------------------------- */}
        {/* Side by side only when the 6-column table still has room; below
            1400px the table would be cramped, so the alert moves under it. */}
        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader>
              <div className="flex min-w-0 items-center gap-3">
                <CardGlyph icon={List} />
                <CardTitle>Operaciones recientes</CardTitle>
              </div>
            </CardHeader>

            {/* Operation codes, times, amounts and statuses must never wrap —
                a broken code is unreadable at a glance. Cliente is the only
                column allowed to reflow. */}
            <CardContent className="px-0 pb-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6 whitespace-nowrap">Código</TableHead>
                    <TableHead className="whitespace-nowrap">Hora</TableHead>
                    <TableHead className="whitespace-nowrap">Cliente</TableHead>
                    <TableHead className="whitespace-nowrap">Servicio</TableHead>
                    <TableHead numeric className="whitespace-nowrap">
                      Importe
                    </TableHead>
                    <TableHead className="whitespace-nowrap">Estado</TableHead>
                    <TableHead>
                      <span className="sr-only">Abrir</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {RECENT_OPERATIONS.map((operation) => (
                    <ClickableRow key={operation.code} href={`/worker/operaciones/${operation.code}`}>
                      <TableCell className="pl-6 whitespace-nowrap">
                        <span className="pc-numeric font-medium">{operation.code}</span>
                      </TableCell>
                      <TableCell className="pc-numeric whitespace-nowrap text-text-secondary">
                        {operation.time}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{operation.client}</TableCell>
                      <TableCell className="whitespace-nowrap text-text-secondary">
                        {operation.service}
                      </TableCell>
                      <TableCell numeric className="whitespace-nowrap font-medium">
                        {formatMoney(operation.amount)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <OperationStatusBadge status={operation.status} />
                      </TableCell>
                      <TableCell className="w-10 pr-4 text-right">
                        <Link
                          href={`/worker/operaciones/${operation.code}` as Route}
                          aria-label={`Ver la operación ${operation.code}`}
                          className="inline-flex size-8 items-center justify-center rounded-control text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <ChevronRight aria-hidden="true" className="size-5" />
                        </Link>
                      </TableCell>
                    </ClickableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>

            <CardFooter>
              <CardFooterLink href="/worker/operaciones">Ver todas las operaciones</CardFooterLink>
            </CardFooter>
          </Card>
        </div>
      </div>
    </>
  );
}

/** One quick-access tile. `accent` marks the service catalogue entry. */
function QuickAction({
  href,
  icon: Icon,
  label,
  accent = false,
}: {
  href: Route;
  icon: LucideIcon;
  label: string;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex h-full min-h-[6.5rem] flex-col items-center justify-center gap-3 rounded-control border px-3 py-4 text-center",
        "transition-colors duration-(--duration-fast) ease-(--ease-standard)",
        "outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-primary",
        accent
          ? "border-accent-border bg-surface-brand text-accent-foreground hover:border-gold"
          : "border-border bg-surface text-primary hover:border-border-navy hover:bg-primary-subtle",
      )}
    >
      <Icon className={cn("size-6 shrink-0", accent && "text-gold")} aria-hidden="true" />
      <span className="text-label leading-tight text-text-primary">{label}</span>
    </Link>
  );
}
