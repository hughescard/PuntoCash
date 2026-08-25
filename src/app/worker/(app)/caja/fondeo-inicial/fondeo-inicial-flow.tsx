"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  CalendarClock,
  CircleCheck,
  Lock,
  Plus,
  Printer,
  ShieldCheck,
  User,
  Wallet,
} from "lucide-react";

import { Alert, Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, fieldAria, type FieldSpec } from "@/components/ui";
import { CurrencyFlag } from "@/components/patterns/currency-flag";
import { formatDateTime, formatMoney, parseAmountInput } from "@/lib/format";
import { findCurrency } from "@/features/exchange/quote";
import { getCurrentWorker } from "@/features/worker/session";
import {
  CAJA_BALANCES,
  CAJA_SUMMARY,
  abrirJornada,
  consumeFondeoInicialDraft,
  hasOpenJornada,
  saveFondeoInicialDraft,
  type CajaBalance,
  type CajaJornada,
  type FondoInicial,
} from "@/features/caja/caja-data";

const CAJA_ROUTE = "/worker/caja" as Route;
const ANADIR_MONEDA_ROUTE = "/worker/caja/anadir-moneda?returnTo=fondeo-inicial" as Route;

type Step = "form" | "revision" | "completado";

/**
 * "Registrar fondeo inicial" — opens a new jornada for the worker's register.
 *
 * Three steps: the approved form (Step 1, visually unchanged), a Review step
 * before anything is written, and a success result once confirmed — the
 * form itself never calls `abrirJornada`; only "Confirmar y abrir caja" does.
 *
 * Currencies are the caja's own already-enabled set (`CAJA_BALANCES`) — fixed
 * rows rather than a free-form moneda picker, which is also what makes a
 * duplicate row structurally impossible; a currency that is not yet enabled
 * goes through "Añadir moneda" instead.
 */
export function FondeoInicialFlow(): React.JSX.Element {
  // Captured once, on entry: a jornada opened by a PRIOR visit blocks this
  // screen entirely. A jornada this same flow just opened (step "completado")
  // must not retroactively lock the success screen the worker is looking at.
  const [blocked] = React.useState(() => hasOpenJornada());

  const worker = getCurrentWorker();
  const [step, setStep] = React.useState<Step>("form");
  // Restores whatever the worker had already typed if they left through
  // "Añádela a la caja" — a fresh visit (no draft waiting) starts empty, same
  // as before.
  const [amounts, setAmounts] = React.useState<Record<string, string>>(
    () => consumeFondeoInicialDraft()?.amounts ?? {},
  );
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [formError, setFormError] = React.useState<string | undefined>();
  const [submitting, setSubmitting] = React.useState(false);
  const [confirmedFondos, setConfirmedFondos] = React.useState<readonly FondoInicial[]>([]);
  const [jornada, setJornada] = React.useState<CajaJornada | null>(null);

  function setAmount(currency: string, value: string) {
    setAmounts((prev) => ({ ...prev, [currency]: value }));
    setErrors((prev) => {
      if (!(currency in prev)) return prev;
      const next = { ...prev };
      delete next[currency];
      return next;
    });
    setFormError(undefined);
  }

  const fondosConMonto = CAJA_BALANCES.reduce((count, balance) => {
    const parsed = parseAmountInput(amounts[balance.currency]?.trim() ?? "");
    return parsed !== null && parsed > 0 ? count + 1 : count;
  }, 0);

  /** Step 1 → Step 2. Validates only — nothing is written yet. */
  function handleContinue(event: React.FormEvent) {
    event.preventDefault();

    const nextErrors: Record<string, string> = {};
    const fondos: FondoInicial[] = [];

    for (const balance of CAJA_BALANCES) {
      const raw = amounts[balance.currency]?.trim();
      // An untouched row simply is not funded — that is not an error on its
      // own, only the absence of any funded row is (checked below).
      if (!raw) continue;

      const parsed = parseAmountInput(raw);
      if (parsed === null || parsed < 0) {
        nextErrors[balance.currency] = "Introduce un monto válido.";
        continue;
      }
      if (parsed > 0) fondos.push({ currency: balance.currency, amount: parsed });
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    if (fondos.length === 0) {
      setFormError("Introduce el fondo inicial de al menos una moneda.");
      return;
    }

    setConfirmedFondos(fondos);
    setStep("revision");
  }

  /** Step 2 → Step 3. The only place `abrirJornada` is ever called. */
  async function handleConfirm() {
    if (submitting) return;
    setSubmitting(true);
    // Simulated backend round trip, matching the same pattern already used
    // for confirming a Cambio de moneda operation.
    await new Promise((resolve) => setTimeout(resolve, 600));

    const openedAt = new Date();
    const nuevaJornada = abrirJornada({
      register: CAJA_SUMMARY.register,
      worker: worker.fullName,
      openedAt,
      fondos: confirmedFondos,
    });

    setJornada(nuevaJornada);
    setSubmitting(false);
    setStep("completado");
  }

  if (blocked) {
    return (
      <div className="flex flex-col gap-6">
        <BackLink />
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
            <span
              aria-hidden="true"
              className="grid size-12 place-items-center rounded-control bg-primary-subtle text-primary"
            >
              <Lock className="size-6" />
            </span>
            <p className="mt-2 text-section-title text-text-primary">La caja ya está abierta</p>
            <p className="max-w-sm text-body text-text-secondary">
              {CAJA_SUMMARY.register} ya tiene una jornada abierta. No es posible registrar un
              nuevo fondeo inicial hasta que esa jornada se cierre.
            </p>
            <Button className="mt-4" asChild>
              <Link href={CAJA_ROUTE}>Volver a Caja</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "completado" && jornada) {
    return (
      <FondeoCompletado jornada={jornada} fondos={confirmedFondos} worker={worker.fullName} />
    );
  }

  if (step === "revision") {
    return (
      <FondeoRevision
        fondos={confirmedFondos}
        worker={worker.fullName}
        submitting={submitting}
        onVolver={() => setStep("form")}
        onConfirmar={() => void handleConfirm()}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <BackLink />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-screen-title text-text-primary">Registrar fondeo inicial</h1>
          <p className="mt-2 max-w-2xl text-body text-text-secondary">
            Indica el efectivo con el que {CAJA_SUMMARY.register} iniciará su jornada.
          </p>
        </div>
        <Badge variant="warning">Pendiente de apertura</Badge>
      </div>

      <Card>
        <CardContent className="flex flex-wrap gap-x-10 gap-y-4 py-5">
          <InfoItem icon={Wallet} label="Caja" value={CAJA_SUMMARY.register} />
          <InfoItem icon={User} label="Trabajador" value={worker.fullName} />
          <InfoItem icon={CalendarClock} label="Apertura" value="Se registrará al confirmar" />
        </CardContent>
      </Card>

      <form
        onSubmit={handleContinue}
        className="grid grid-cols-1 items-start gap-6 wide:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]"
      >
        <Card>
          <CardHeader>
            <div className="flex min-w-0 items-center gap-3">
              <span
                aria-hidden="true"
                className="grid size-9 shrink-0 place-items-center rounded-control bg-primary-subtle text-primary"
              >
                <Banknote className="size-[18px]" />
              </span>
              <div className="min-w-0">
                <CardTitle>Fondos iniciales</CardTitle>
                <p className="mt-0.5 text-body-sm text-text-secondary">
                  Introduce el efectivo inicial por cada moneda habilitada.
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex flex-col gap-5">
            <div>
              <div className="grid grid-cols-[1fr_12rem] gap-4 border-b border-border pb-2">
                <span className="text-label font-medium text-text-secondary">Moneda</span>
                <span className="text-label font-medium text-text-secondary">Fondo inicial</span>
              </div>
              {CAJA_BALANCES.map((balance) => (
                <FondoRow
                  key={balance.currency}
                  balance={balance}
                  value={amounts[balance.currency] ?? ""}
                  error={errors[balance.currency]}
                  onChange={(value) => setAmount(balance.currency, value)}
                />
              ))}
            </div>

            <Link
              href={ANADIR_MONEDA_ROUTE}
              onClick={() => saveFondeoInicialDraft({ amounts })}
              className="flex items-center gap-2 rounded-control border border-dashed border-border px-4 py-3 text-body-sm text-text-secondary transition-colors duration-(--duration-fast) ease-(--ease-standard) hover:border-border-navy hover:bg-primary-subtle outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <Plus className="size-4 shrink-0 text-primary" aria-hidden="true" />
              ¿No encuentras la moneda que necesitas?{" "}
              <span className="font-medium text-primary underline">Añádela a la caja →</span>
            </Link>

            {formError ? <Alert variant="error" title={formError} /> : null}

            <div className="flex items-center justify-end gap-3 border-t border-border pt-5">
              <Button variant="secondary" type="button" asChild>
                <Link href={CAJA_ROUTE}>Cancelar</Link>
              </Button>
              <Button type="submit">
                Continuar
                <ArrowRight aria-hidden="true" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="self-start">
          <CardHeader>
            <CardTitle>Resumen de apertura</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <dl className="flex flex-col">
              <SummaryRow label="Caja" value={CAJA_SUMMARY.register} />
              <SummaryRow label="Trabajador" value={worker.fullName} />
              <SummaryRow label="Monedas habilitadas" value={String(CAJA_BALANCES.length)} />
              <SummaryRow label="Monedas con fondos" value={String(fondosConMonto)} />
            </dl>

            <Alert variant="info" title="La fecha y hora de apertura se registrarán al confirmar el fondeo." />
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href={CAJA_ROUTE}
      className="inline-flex w-fit items-center gap-2 rounded-control text-label font-medium text-text-secondary transition-colors hover:text-text-primary outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-primary print:hidden"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      Volver a Caja
    </Link>
  );
}

/**
 * Step 2 — Review. Nothing has been written yet; confirming here is the only
 * action that calls `abrirJornada`.
 */
function FondeoRevision({
  fondos,
  worker,
  submitting,
  onVolver,
  onConfirmar,
}: {
  fondos: readonly FondoInicial[];
  worker: string;
  submitting: boolean;
  onVolver: () => void;
  onConfirmar: () => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <BackLink />

      <div>
        <h1 className="text-screen-title text-text-primary">Revisión del fondeo inicial</h1>
        <p className="mt-2 max-w-2xl text-body text-text-secondary">
          Confirma los datos antes de abrir la jornada de {CAJA_SUMMARY.register}.
        </p>
      </div>

      <Card className="mx-auto w-full max-w-2xl">
        <CardHeader>
          <div className="flex min-w-0 items-center gap-3">
            <span
              aria-hidden="true"
              className="grid size-9 shrink-0 place-items-center rounded-control bg-primary-subtle text-primary"
            >
              <ShieldCheck className="size-[18px]" />
            </span>
            <CardTitle>Resumen</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <dl className="flex flex-col">
            <SummaryRow label="Caja" value={CAJA_SUMMARY.register} />
            <SummaryRow label="Trabajador" value={worker} />
          </dl>

          <hr className="border-t border-dashed border-border" />

          <div className="flex flex-col gap-1">
            <span className="text-caption text-text-secondary">Fondos iniciales</span>
            <dl className="flex flex-col">
              {fondos.map((fondo) => (
                <div
                  key={fondo.currency}
                  className="flex items-center justify-between gap-4 border-b border-border py-2.5 last:border-b-0 last:pb-0"
                >
                  <dt className="flex items-center gap-2 text-body-sm text-text-primary">
                    <CurrencyFlag currency={fondo.currency} />
                    {fondo.currency}
                  </dt>
                  <dd className="pc-numeric text-body-sm font-semibold text-text-primary">
                    {formatMoney({ amount: fondo.amount, currency: fondo.currency })}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <Alert variant="info" title="Al confirmar se abrirá una nueva jornada para Caja 03." />
        </CardContent>
      </Card>

      <div className="mx-auto flex w-full max-w-2xl items-center justify-end gap-3">
        <Button variant="secondary" type="button" onClick={onVolver}>
          Volver
        </Button>
        <Button type="button" loading={submitting} onClick={onConfirmar}>
          {submitting ? null : <CircleCheck aria-hidden="true" />}
          {submitting ? "Confirmando…" : "Confirmar y abrir caja"}
        </Button>
      </div>
    </div>
  );
}

/** Step 3 — Success. */
function FondeoCompletado({
  jornada,
  fondos,
  worker,
}: {
  jornada: CajaJornada;
  fondos: readonly FondoInicial[];
  worker: string;
}) {
  return (
    <>
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center print:hidden">
        <span
          aria-hidden="true"
          className="grid size-14 place-items-center rounded-pill border-2 border-success text-success"
        >
          <CircleCheck className="size-8" />
        </span>

        <h1 className="mt-5 text-screen-title text-text-primary">Caja abierta correctamente</h1>
        <p className="mt-2 text-body text-text-secondary">
          El fondeo inicial de {jornada.register} se registró correctamente.
        </p>

        <Card className="mt-8 w-full">
          <CardContent className="flex flex-col gap-4 pt-6">
            <dl className="flex flex-col">
              <SummaryRow label="Caja" value={jornada.register} />
              <SummaryRow label="Trabajador" value={worker} />
              <SummaryRow
                label="Fecha y hora de apertura"
                value={formatDateTime(new Date(jornada.openedAt))}
              />
            </dl>

            <hr className="border-t border-dashed border-border" />

            <div className="flex flex-col gap-1">
              <span className="text-caption text-text-secondary">Fondos iniciales</span>
              <dl className="flex flex-col">
                {fondos.map((fondo) => (
                  <div
                    key={fondo.currency}
                    className="flex items-center justify-between gap-4 border-b border-border py-2.5 last:border-b-0 last:pb-0"
                  >
                    <dt className="flex items-center gap-2 text-body-sm text-text-primary">
                      <CurrencyFlag currency={fondo.currency} />
                      {fondo.currency}
                    </dt>
                    <dd className="pc-numeric text-body-sm font-semibold text-text-primary">
                      {formatMoney({ amount: fondo.amount, currency: fondo.currency })}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 flex w-full flex-wrap items-center justify-center gap-3">
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer aria-hidden="true" />
            Imprimir comprobante
          </Button>

          <Button asChild>
            <Link href={CAJA_ROUTE}>Ir a Caja</Link>
          </Button>
        </div>
      </div>

      <FondeoPrintableReceipt jornada={jornada} fondos={fondos} worker={worker} />
    </>
  );
}

/**
 * Print-only comprobante — the same mechanism already used for operation and
 * Caja comprobantes: a `hidden print:block` section plus the global print
 * rules in `globals.css`, which hide the app chrome. No PDF pipeline.
 */
function FondeoPrintableReceipt({
  jornada,
  fondos,
  worker,
}: {
  jornada: CajaJornada;
  fondos: readonly FondoInicial[];
  worker: string;
}) {
  return (
    <section className="hidden print:block" aria-hidden="true">
      <h1 style={{ fontSize: "18px", fontWeight: 700 }}>PuntoCash · Comprobante de fondeo inicial</h1>
      <p style={{ marginTop: 4 }}>{jornada.register}</p>

      <dl style={{ marginTop: 16, lineHeight: 1.7 }}>
        <ReceiptLine label="Caja" value={jornada.register} />
        <ReceiptLine label="Trabajador" value={worker} />
        <ReceiptLine label="Fecha y hora de apertura" value={formatDateTime(new Date(jornada.openedAt))} />
      </dl>

      <h2 style={{ marginTop: 20, fontSize: "15px", fontWeight: 700 }}>Fondos iniciales</h2>
      <dl style={{ marginTop: 8, lineHeight: 1.7 }}>
        {fondos.map((fondo) => (
          <ReceiptLine
            key={fondo.currency}
            label={fondo.currency}
            value={formatMoney({ amount: fondo.amount, currency: fondo.currency })}
          />
        ))}
      </dl>
    </section>
  );
}

function ReceiptLine({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 24 }}>
      <dt style={{ color: "#6B7280" }}>{label}</dt>
      <dd style={{ fontWeight: 600 }}>{value}</dd>
    </div>
  );
}

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
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
        <span className="text-body-sm font-semibold text-text-primary">{value}</span>
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

function FondoRow({
  balance,
  value,
  error,
  onChange,
}: {
  balance: CajaBalance;
  value: string;
  error: string | undefined;
  onChange: (value: string) => void;
}) {
  const field: FieldSpec = { id: `fondeo-${balance.currency}`, label: `Fondo inicial en ${balance.currency}`, error };
  const currencyName = findCurrency(balance.currency)?.name;

  return (
    <div className="grid grid-cols-[1fr_12rem] items-center gap-4 border-b border-border py-3 last:border-b-0">
      <span className="flex items-center gap-2 min-w-0">
        <CurrencyFlag currency={balance.currency} />
        <span className="font-semibold text-text-primary">{balance.currency}</span>
        {currencyName ? (
          <span className="truncate text-body-sm text-text-secondary">· {currencyName}</span>
        ) : null}
      </span>

      <div>
        {/* Label is visually hidden — the "Moneda" cell already names the
            row, and a visible per-row label would repeat it (§20 still
            requires an accessible name, which this provides). */}
        <label htmlFor={field.id} className="sr-only">
          {field.label}
        </label>
        <Input
          {...fieldAria(field)}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          invalid={Boolean(error)}
          inputMode="decimal"
          autoComplete="off"
          numeric
          placeholder="0,00"
        />
        {error ? <p className="mt-1 text-caption text-error-foreground">{error}</p> : null}
      </div>
    </div>
  );
}
