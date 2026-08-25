"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  CalendarClock,
  Check,
  ChevronDown,
  ListFilter,
  Search,
  User,
  Wallet,
} from "lucide-react";

import { Alert, Badge, Button, Card, CardContent, CardHeader, CardTitle, Input } from "@/components/ui";
import { CurrencyFlag } from "@/components/patterns/currency-flag";
import { cn } from "@/lib/utils";
import { normalizeForSearch } from "@/features/operations/services";
import { getCurrentWorker } from "@/features/worker/session";
import {
  CAJA_BALANCES,
  CAJA_SUMMARY,
  getAvailableCurrenciesToAdd,
  getJornadaActual,
  habilitarMoneda,
  type CajaCurrencyCatalogEntry,
} from "@/features/caja/caja-data";

const CAJA_ROUTE = "/worker/caja" as Route;
const FONDEO_INICIAL_ROUTE = "/worker/caja/fondeo-inicial" as Route;

/** The query string never changes after mount, so there is nothing to subscribe to. */
function noopSubscribe() {
  return () => {};
}

/**
 * "Añadir moneda" — enables a new currency for Caja 03.
 *
 * Enabling a currency and moving cash are different concepts (§1): this
 * screen never asks for an amount. A newly enabled currency simply starts at
 * 0,00 with no ledger movement — its opening amount, if any, is defined later
 * from Fondeo inicial, the only place that ever does.
 */
export function AnadirMonedaFlow(): React.JSX.Element {
  const router = useRouter();
  const worker = getCurrentWorker();
  const jornada = getJornadaActual();

  // Which screen sent the worker here. `useSyncExternalStore` rather than a
  // lazy `useState` initializer or an effect: this component is still
  // server-rendered for the initial HTML (where `window` does not exist), so
  // the server snapshot is "caja" and the client snapshot reads the real
  // query string — React reconciles the two safely on hydration, with no
  // mismatch warning and no effect-triggered re-render. A plain query read
  // rather than `useSearchParams()`, since nothing else on this route needs
  // the Suspense boundary that hook requires.
  const cameFromFondeoInicial = React.useSyncExternalStore(
    noopSubscribe,
    () => new URLSearchParams(window.location.search).get("returnTo") === "fondeo-inicial",
    () => false,
  );
  const backHref = cameFromFondeoInicial ? FONDEO_INICIAL_ROUTE : CAJA_ROUTE;

  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [duplicateError, setDuplicateError] = React.useState<string | undefined>();
  const [submitting, setSubmitting] = React.useState(false);

  const available = getAvailableCurrenciesToAdd();
  const filtered = React.useMemo(() => {
    const q = normalizeForSearch(query);
    if (!q) return available;
    return available.filter((entry) => normalizeForSearch(`${entry.code} ${entry.name}`).includes(q));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const selectedEntry = available.find((entry) => entry.code === selected) ?? null;

  function selectCurrency(code: string) {
    setSelected(code);
    setDuplicateError(undefined);
    // Collapses back to the compact, closed control showing the choice —
    // reopening it (the trigger) is how the worker changes their mind.
    setPickerOpen(false);
  }

  async function handleConfirm() {
    if (!selected || submitting) return;
    setSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 400));

    const result = habilitarMoneda(selected);
    if (!result.ok) {
      // Graceful, not a technical-looking error: the currency simply stopped
      // being available while this screen was open.
      setDuplicateError(`${selected} ya está habilitada en ${CAJA_SUMMARY.register}.`);
      setSelected(null);
      setSubmitting(false);
      return;
    }

    router.push(backHref);
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={CAJA_ROUTE}
        className="inline-flex w-fit items-center gap-2 rounded-control text-label font-medium text-text-secondary transition-colors hover:text-text-primary outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Volver a Caja
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-screen-title text-text-primary">Añadir moneda</h1>
          <p className="mt-2 max-w-2xl text-body text-text-secondary">
            Incorpora una nueva divisa a {CAJA_SUMMARY.register}.
          </p>
        </div>
        <Badge variant={jornada ? "success" : "warning"}>
          {jornada ? "Jornada abierta" : "Pendiente de apertura"}
        </Badge>
      </div>

      <Card>
        <CardContent className="grid grid-cols-2 gap-6 py-5 wide:grid-cols-4">
          <InfoItem icon={Wallet} label="Caja" value={CAJA_SUMMARY.register} />
          <InfoItem icon={User} label="Trabajador" value={worker.fullName} />
          <InfoItem
            icon={CalendarClock}
            label="Jornada actual"
            value={jornada ? "Abierta" : "Sin abrir"}
            valueClassName={jornada ? "text-success-foreground" : undefined}
          />
          <InfoItem icon={Banknote} label="Monedas habilitadas" value={String(CAJA_BALANCES.length)} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 items-start gap-6 wide:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <div className="flex min-w-0 items-center gap-3">
              <span
                aria-hidden="true"
                className="grid size-9 shrink-0 place-items-center rounded-control bg-primary-subtle text-primary"
              >
                <ListFilter className="size-[18px]" />
              </span>
              <div className="min-w-0">
                <CardTitle>Seleccionar moneda</CardTitle>
                <p className="mt-0.5 text-body-sm text-text-secondary">
                  Elige la nueva moneda que deseas habilitar en esta caja.
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex flex-col gap-4">
            <div>
              {/* A plain caption, not a `<label htmlFor>`: a `<label>` bound
                  to a `<button>` REPLACES its accessible name outright in
                  Chromium's accname computation, silently discarding "CAD —
                  Dólar canadiense" from what a screen reader announces. The
                  button gets its full, current name via `aria-label` below
                  instead. */}
              <p className="text-label font-medium text-text-secondary">Moneda</p>

              <div className="mt-2">
                <button
                  type="button"
                  id="anadir-moneda-trigger"
                  aria-haspopup="listbox"
                  aria-expanded={pickerOpen}
                  aria-label={`Moneda: ${selectedEntry ? `${selectedEntry.code} — ${selectedEntry.name}` : "Selecciona una moneda"}`}
                  onClick={() => setPickerOpen((prev) => !prev)}
                  className="flex h-control w-full items-center justify-between gap-3 rounded-control border border-border bg-surface px-4 text-left text-body text-text-primary transition-[border-color,box-shadow] duration-(--duration-fast) ease-(--ease-standard) outline-none hover:border-border-strong focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
                >
                  {selectedEntry ? (
                    <span className="flex min-w-0 items-center gap-2">
                      <CurrencyFlag currency={selectedEntry.code} className="h-3.5 w-5" />
                      <span className="truncate">
                        <span className="font-semibold">{selectedEntry.code}</span>
                        <span className="text-text-secondary"> — {selectedEntry.name}</span>
                      </span>
                    </span>
                  ) : (
                    <span className="text-text-secondary">Selecciona una moneda</span>
                  )}
                  <ChevronDown
                    className={cn(
                      "size-4 shrink-0 text-text-secondary transition-transform duration-(--duration-fast)",
                      pickerOpen && "rotate-180",
                    )}
                    aria-hidden="true"
                  />
                </button>

                {pickerOpen ? (
                  <div className="mt-2 flex flex-col gap-3 rounded-control border border-border bg-surface p-3 shadow-raised">
                    <label htmlFor="anadir-moneda-buscar" className="sr-only">
                      Buscar moneda
                    </label>
                    <Input
                      id="anadir-moneda-buscar"
                      type="search"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Buscar por código o nombre"
                      autoComplete="off"
                      autoFocus
                      prefix={<Search className="size-[18px]" aria-hidden="true" />}
                    />

                    {filtered.length === 0 ? (
                      <p className="rounded-control border border-border bg-surface-subtle px-4 py-6 text-center text-body-sm text-text-secondary">
                        No encontramos monedas disponibles con ese término.
                      </p>
                    ) : (
                      <ul
                        className="flex max-h-64 flex-col gap-1 overflow-y-auto"
                        role="listbox"
                        aria-label="Monedas disponibles"
                      >
                        {filtered.map((entry) => {
                          const isSelected = entry.code === selected;
                          return (
                            <li key={entry.code}>
                              <button
                                type="button"
                                role="option"
                                aria-selected={isSelected}
                                onClick={() => selectCurrency(entry.code)}
                                className={cn(
                                  "flex w-full items-center gap-3 rounded-control border px-3 py-2.5 text-left transition-colors duration-(--duration-fast) ease-(--ease-standard) outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-primary",
                                  isSelected
                                    ? "border-primary bg-primary-subtle"
                                    : "border-transparent hover:border-border-navy hover:bg-primary-subtle",
                                )}
                              >
                                <CurrencyFlag currency={entry.code} className="h-3.5 w-5" />
                                <span className="min-w-0 flex-1">
                                  <span className="font-semibold text-text-primary">{entry.code}</span>
                                  <span className="ml-2 text-body-sm text-text-secondary">{entry.name}</span>
                                </span>
                                {isSelected ? (
                                  <Check className="size-4 shrink-0 text-primary" aria-hidden="true" />
                                ) : null}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                ) : null}
              </div>
            </div>

            {duplicateError ? <Alert variant="error" title={duplicateError} /> : null}

            {selectedEntry ? <CurrencyDetails entry={selectedEntry} /> : null}

            <div className="flex items-center justify-end gap-3 border-t border-border pt-5">
              <Button variant="secondary" type="button" asChild>
                <Link href={backHref}>Cancelar</Link>
              </Button>
              <Button type="button" disabled={!selected} loading={submitting} onClick={() => void handleConfirm()}>
                {submitting ? "Añadiendo…" : "Añadir moneda"}
                {submitting ? null : <ArrowRight aria-hidden="true" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="self-start">
          <CardHeader>
            <div>
              <CardTitle>Resumen de incorporación</CardTitle>
              <p className="mt-0.5 text-body-sm text-text-secondary">
                Revisa el impacto de habilitar esta moneda en la caja.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <dl className="flex flex-col">
              <SummaryRow label="Caja" value={CAJA_SUMMARY.register} />
              <SummaryRow label="Trabajador" value={worker.fullName} />
              <SummaryRow label="Moneda seleccionada" value={selectedEntry?.code ?? "—"} />
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InfoItem({
  icon: Icon,
  label,
  value,
  valueClassName,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <span className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className="grid size-9 shrink-0 place-items-center rounded-control bg-primary-subtle text-primary"
      >
        <Icon className="size-[18px]" />
      </span>
      <span className="flex flex-col">
        <span className="text-caption text-text-secondary">{label}</span>
        <span className={cn("text-body-sm font-semibold text-text-primary", valueClassName)}>
          {value}
        </span>
      </span>
    </span>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-2.5 last:border-b-0 last:pb-0">
      <dt className="text-body-sm text-text-secondary">{label}</dt>
      <dd className="pc-numeric text-body-sm font-semibold text-text-primary">{value}</dd>
    </div>
  );
}

/** Identifying information only — no expected state, no balance, no movement (§10). */
function CurrencyDetails({ entry }: { entry: CajaCurrencyCatalogEntry }) {
  return (
    <div className="rounded-control border border-border bg-surface-subtle px-4 py-3">
      <dl className="flex flex-col">
        <SummaryRow label="Código" value={entry.code} />
        <SummaryRow label="Nombre" value={entry.name} />
        <SummaryRow label="Símbolo" value={entry.symbol} />
      </dl>
    </div>
  );
}
