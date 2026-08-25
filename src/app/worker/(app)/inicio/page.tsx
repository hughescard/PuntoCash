import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
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
  Alert,
  Badge,
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
import { OperationStatusBadge } from "@/components/patterns/operation-status-badge";
import { CurrencyFlag } from "@/components/patterns/currency-flag";
import { cn } from "@/lib/utils";
import { formatAmount, formatMoney } from "@/lib/format";
import { getCurrentWorker, getGreeting } from "@/features/worker/session";
import {
  CASH_BALANCES,
  EXCHANGE_RATES,
  RATES_UPDATED_LABEL,
  RECENT_OPERATIONS,
  WORKER_ALERTS,
} from "@/features/worker/home-data";
import { getHomeQuickActions } from "@/features/operations/services";

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

export default function WorkerHomePage() {
  const worker = getCurrentWorker();
  const hasAlerts = WORKER_ALERTS.length > 0;

  return (
    <>
      <PageHeader
        title={`${getGreeting()}, ${worker.firstName}`}
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
              <dl className="flex flex-col">
                {CASH_BALANCES.map((balance) => (
                  <div
                    key={balance.currency}
                    className="flex items-baseline justify-between gap-4 border-b border-border py-3 last:border-b-0 last:pb-0"
                  >
                    <dt className="flex items-center gap-2 text-label text-text-secondary">
                      <CurrencyFlag currency={balance.currency} />
                      <span className="font-semibold text-text-primary">{balance.currency}</span>
                      {/* A low balance is stated, not only coloured (§20). */}
                      {balance.low ? <Badge variant="warning">Nivel bajo</Badge> : null}
                    </dt>
                    <dd className="pc-numeric text-amount text-text-primary">
                      {formatAmount(balance.amount)}
                    </dd>
                  </div>
                ))}
              </dl>
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Moneda</TableHead>
                    <TableHead numeric>Compra</TableHead>
                    <TableHead numeric className="pr-6">
                      Venta
                    </TableHead>
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
                      <TableCell numeric className="pr-6 font-medium">
                        {formatAmount(rate.sell)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>

            <CardFooter className="justify-between">
              <span className="inline-flex items-center gap-2 text-caption text-text-secondary">
                <Clock className="size-3.5" aria-hidden="true" />
                {RATES_UPDATED_LABEL}
              </span>
              <CardFooterLink href="/worker/tasas">Ver todas</CardFooterLink>
            </CardFooter>
          </Card>
        </div>

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
              {getHomeQuickActions().map((service) => (
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

        {/* ---- Operaciones recientes · Alertas ----------------------------- */}
        {/* Side by side only when the 6-column table still has room; below
            1400px the table would be cramped, so the alert moves under it. */}
        <div
          className={
            hasAlerts
              ? "grid grid-cols-1 items-start gap-6 wide:grid-cols-[minmax(0,1fr)_17rem]"
              : "grid grid-cols-1 gap-6"
          }
        >
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
                    <TableHead className="pr-6 whitespace-nowrap">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {RECENT_OPERATIONS.map((operation) => (
                    <TableRow key={operation.code}>
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
                      <TableCell className="pr-6 whitespace-nowrap">
                        <OperationStatusBadge status={operation.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>

            <CardFooter>
              <CardFooterLink href="/worker/operaciones">Ver todas las operaciones</CardFooterLink>
            </CardFooter>
          </Card>

          {/* Alerts occupy space only when they exist — never an empty card. */}
          {hasAlerts ? (
            <Card>
              <CardHeader>
                <div className="flex min-w-0 items-center gap-3">
                  <CardGlyph icon={Bell} />
                  <CardTitle>Alertas</CardTitle>
                  <Badge variant="warning">{WORKER_ALERTS.length}</Badge>
                </div>
              </CardHeader>

              <CardContent className="flex flex-col gap-3">
                {WORKER_ALERTS.map((alert) => (
                  <Alert key={alert.id} variant={alert.variant} title={alert.title}>
                    {alert.description}
                  </Alert>
                ))}
              </CardContent>

              <CardFooter>
                <CardFooterLink href="/worker/alertas">Ver todas las alertas</CardFooterLink>
              </CardFooter>
            </Card>
          ) : null}
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
