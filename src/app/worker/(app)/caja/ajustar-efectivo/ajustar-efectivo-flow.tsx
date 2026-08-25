"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  CalendarClock,
  Check,
  ChevronDown,
  CircleCheck,
  ClipboardList,
  Equal,
  Lock,
  Printer,
  TrendingDown,
  TrendingUp,
  User,
  Wallet,
} from "lucide-react";

import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Field,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  fieldAria,
} from "@/components/ui";
import { CurrencyFlag } from "@/components/patterns/currency-flag";
import { cn } from "@/lib/utils";
import { formatDateTime, formatMoney, formatSignedAmount, parseAmountInput } from "@/lib/format";
import { getCurrentWorker } from "@/features/worker/session";
import {
  CAJA_BALANCES,
  CAJA_SUMMARY,
  ajustarEfectivo,
  findCajaCurrency,
  getJornadaActual,
  getValidAdjustmentReasons,
  hasOpenJornada,
  isReasonCompatibleWithDifference,
  type AjustarEfectivoResult,
  type CajaAdjustmentReason,
  type CajaBalance,
} from "@/features/caja/caja-data";

const CAJA_ROUTE = "/worker/caja" as Route;

type Step = "form" | "revision" | "completado";

const OBSERVACIONES_MAX = 200;

/** The confirmed values carried from Step 1 into Step 2 and, once confirmed, into the result. */
interface AjusteDraft {
  balance: CajaBalance;
  efectivoContado: number;
  diferencia: number;
  motivo: CajaAdjustmentReason;
  observaciones: string;
}

/**
 * "Ajustar efectivo" — corrects one enabled currency's registered Caja
 * balance from a physical cash count. The worker never types an adjustment
 * amount directly: they declare what they counted, and the difference
 * (`efectivoContado - saldoRegistrado`) is computed automatically (§ "Ajustar
 * efectivo — corrección de saldo").
 */
export function AjustarEfectivoFlow(): React.JSX.Element {
  // Captured once, on entry: closing the jornada from another tab later must
  // not retroactively lock a result screen this same flow already produced.
  const [blocked] = React.useState(() => !hasOpenJornada());

  const worker = getCurrentWorker();
  const jornada = getJornadaActual();

  const [step, setStep] = React.useState<Step>("form");

  const [currency, setCurrency] = React.useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [countedInput, setCountedInput] = React.useState("");
  const [countedError, setCountedError] = React.useState<string | undefined>();
  const [motivo, setMotivo] = React.useState<CajaAdjustmentReason | "">("");
  const [observaciones, setObservaciones] = React.useState("");
  const [observacionesError, setObservacionesError] = React.useState<string | undefined>();

  const [draft, setDraft] = React.useState<AjusteDraft | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [result, setResult] = React.useState<AjustarEfectivoResult | null>(null);
  const [confirmError, setConfirmError] = React.useState<string | undefined>();

  const selectedBalance = CAJA_BALANCES.find((b) => b.currency === currency) ?? null;
  const selectedCurrencyEntry = currency ? findCajaCurrency(currency) : undefined;

  const parsedCounted = parseAmountInput(countedInput);
  const countedValid = parsedCounted !== null && parsedCounted >= 0;

  const diferencia =
    selectedBalance && countedValid
      ? Math.round((parsedCounted - selectedBalance.amount) * 100) / 100
      : null;
  const isZeroDifference = diferencia === 0;

  // Faltante/Sobrante each make a directional claim the sign must back up;
  // the two generic reasons carry no such claim, so they stay valid either way.
  const validReasons = getValidAdjustmentReasons(diferencia ?? 0);
  const motivoCompatible = motivo === "" || diferencia === null || isReasonCompatibleWithDifference(motivo, diferencia);

  const observacionesRequired = motivo === "Otro";
  const observacionesOk = !observacionesRequired || observaciones.trim().length > 0;

  const canContinue =
    Boolean(selectedBalance) &&
    countedValid &&
    diferencia !== null &&
    diferencia !== 0 &&
    motivo !== "" &&
    motivoCompatible &&
    observacionesOk;

  /**
   * A reason that made a directional claim (Faltante/Sobrante) is cleared,
   * never silently swapped for its opposite, the moment the difference's
   * sign no longer backs it up — the worker must explicitly re-declare it.
   * The two generic reasons are unaffected, since neither makes that claim.
   */
  function nextMotivoAfterDifferenceChange(
    current: CajaAdjustmentReason | "",
    newDiferencia: number | null,
  ): CajaAdjustmentReason | "" {
    if (current === "" || current === "Error de registro" || current === "Otro") return current;
    if (newDiferencia === null) return current;
    return isReasonCompatibleWithDifference(current, newDiferencia) ? current : "";
  }

  function selectCurrency(code: string) {
    setCurrency(code);
    setPickerOpen(false);

    const balance = CAJA_BALANCES.find((b) => b.currency === code) ?? null;
    const newDiferencia =
      balance && countedValid ? Math.round((parsedCounted - balance.amount) * 100) / 100 : null;
    setMotivo((prev) => nextMotivoAfterDifferenceChange(prev, newDiferencia));
  }

  function handleCountedChange(value: string) {
    setCountedInput(value);
    setCountedError(undefined);

    const parsed = parseAmountInput(value);
    const newDiferencia =
      selectedBalance && parsed !== null && parsed >= 0
        ? Math.round((parsed - selectedBalance.amount) * 100) / 100
        : null;
    setMotivo((prev) => nextMotivoAfterDifferenceChange(prev, newDiferencia));
  }

  /** Step 1 → Step 2. Validates only — nothing is written yet. */
  function handleContinue(event: React.FormEvent) {
    event.preventDefault();

    if (!selectedBalance) return;

    if (!countedValid || parsedCounted === null) {
      setCountedError("Introduce un monto válido.");
      return;
    }

    if (diferencia === null || diferencia === 0) return;

    if (motivo === "" || !motivoCompatible) return;

    if (observacionesRequired && observaciones.trim().length === 0) {
      setObservacionesError('Las observaciones son obligatorias cuando el motivo es "Otro".');
      return;
    }

    setDraft({
      balance: selectedBalance,
      efectivoContado: parsedCounted,
      diferencia,
      motivo,
      observaciones: observaciones.trim(),
    });
    setStep("revision");
  }

  /** Step 2 → Step 3. The only place `ajustarEfectivo` is ever called, with a timestamp captured right here (§19). */
  async function handleConfirm() {
    if (!draft || submitting) return;
    setSubmitting(true);
    setConfirmError(undefined);
    await new Promise((resolve) => setTimeout(resolve, 600));

    const outcome = ajustarEfectivo({
      currency: draft.balance.currency,
      efectivoContado: draft.efectivoContado,
      motivo: draft.motivo,
      observaciones: draft.observaciones || undefined,
      timestamp: new Date(),
    });

    if (!outcome.ok) {
      // Unreachable through the form's own filtering and reset — a defensive
      // domain-level stop, not a normal product state.
      setSubmitting(false);
      setConfirmError(
        'El motivo seleccionado ya no es compatible con la diferencia calculada. Vuelve a "Registrar conteo" y selecciona un motivo válido.',
      );
      return;
    }

    setResult(outcome.result);
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
            <p className="mt-2 text-section-title text-text-primary">Caja cerrada</p>
            <p className="max-w-sm text-body text-text-secondary">
              Debes abrir una jornada antes de ajustar efectivo.
            </p>
            <Button className="mt-4" asChild>
              <Link href={CAJA_ROUTE}>Volver a Caja</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "completado" && result) {
    return <AjusteCompletado result={result} worker={worker.fullName} />;
  }

  if (step === "revision" && draft) {
    return (
      <AjusteRevision
        draft={draft}
        worker={worker.fullName}
        submitting={submitting}
        confirmError={confirmError}
        onVolver={() => {
          setConfirmError(undefined);
          setStep("form");
        }}
        onConfirmar={() => void handleConfirm()}
      />
    );
  }

  const enabledCurrencies = CAJA_BALANCES;

  return (
    <div className="flex flex-col gap-6">
      <BackLink />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-screen-title text-text-primary">Ajustar efectivo</h1>
          <p className="mt-2 max-w-2xl text-body text-text-secondary">
            Corrige el saldo de una moneda a partir de un conteo físico.
          </p>
        </div>
        <Badge variant="success">Jornada abierta</Badge>
      </div>

      <Card>
        <CardContent className="grid grid-cols-2 gap-6 py-5 wide:grid-cols-4">
          <InfoItem icon={Wallet} label="Caja" value={CAJA_SUMMARY.register} />
          <InfoItem icon={User} label="Trabajador" value={worker.fullName} />
          <InfoItem
            icon={CalendarClock}
            label="Jornada"
            value="Abierta"
            valueClassName="text-success-foreground"
            sublabel={jornada ? `Apertura: ${formatDateTime(new Date(jornada.openedAt))}` : undefined}
          />
          <InfoItem icon={Banknote} label="Monedas habilitadas" value={String(CAJA_BALANCES.length)} />
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
                className="grid size-7 shrink-0 place-items-center rounded-pill bg-primary text-body-sm font-semibold text-primary-foreground"
              >
                1
              </span>
              <div className="min-w-0">
                <CardTitle>Registrar conteo</CardTitle>
                <p className="mt-0.5 text-body-sm text-text-secondary">
                  Selecciona la moneda y registra el efectivo contado.
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex flex-col gap-5">
            <div>
              <p className="text-label font-medium text-text-secondary">Moneda</p>
              <div className="mt-2">
                <button
                  type="button"
                  aria-haspopup="listbox"
                  aria-expanded={pickerOpen}
                  aria-label={`Moneda: ${
                    selectedCurrencyEntry ? `${selectedCurrencyEntry.code} — ${selectedCurrencyEntry.name}` : "Selecciona una moneda"
                  }`}
                  onClick={() => setPickerOpen((prev) => !prev)}
                  className="flex h-control w-full items-center justify-between gap-3 rounded-control border border-border bg-surface px-4 text-left text-body text-text-primary transition-[border-color,box-shadow] duration-(--duration-fast) ease-(--ease-standard) outline-none hover:border-border-strong focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
                >
                  {selectedCurrencyEntry ? (
                    <span className="flex min-w-0 items-center gap-2">
                      <CurrencyFlag currency={selectedCurrencyEntry.code} className="h-3.5 w-5" />
                      <span className="truncate">
                        <span className="font-semibold">{selectedCurrencyEntry.code}</span>
                        <span className="text-text-secondary"> — {selectedCurrencyEntry.name}</span>
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
                  <ul
                    className="mt-2 flex max-h-64 flex-col gap-1 overflow-y-auto rounded-control border border-border bg-surface p-1 shadow-raised"
                    role="listbox"
                    aria-label="Monedas habilitadas"
                  >
                    {enabledCurrencies.map((balance) => {
                      const entry = findCajaCurrency(balance.currency);
                      const isSelected = balance.currency === currency;
                      return (
                        <li key={balance.currency}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            onClick={() => selectCurrency(balance.currency)}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-control border px-3 py-2.5 text-left transition-colors duration-(--duration-fast) ease-(--ease-standard) outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-primary",
                              isSelected
                                ? "border-primary bg-primary-subtle"
                                : "border-transparent hover:border-border-navy hover:bg-primary-subtle",
                            )}
                          >
                            <CurrencyFlag currency={balance.currency} className="h-3.5 w-5" />
                            <span className="min-w-0 flex-1">
                              <span className="font-semibold text-text-primary">{balance.currency}</span>
                              {entry ? (
                                <span className="ml-2 text-body-sm text-text-secondary">{entry.name}</span>
                              ) : null}
                            </span>
                            {isSelected ? (
                              <Check className="size-4 shrink-0 text-primary" aria-hidden="true" />
                            ) : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <span className="text-label font-medium text-text-secondary">Saldo registrado (actual)</span>
                <div className="flex h-control items-center gap-2 rounded-control border border-border bg-surface-subtle px-4 text-body text-text-secondary">
                  <Lock className="size-4 shrink-0" aria-hidden="true" />
                  <span className="pc-numeric text-text-primary">
                    {selectedBalance
                      ? formatMoney({ amount: selectedBalance.amount, currency: selectedBalance.currency })
                      : "—"}
                  </span>
                </div>
              </div>

              <Field
                id="ajuste-efectivo-contado"
                label="Efectivo contado"
                description="Ingresa la cantidad de efectivo que contaste."
                error={countedError}
                required
              >
                <Input
                  {...fieldAria({
                    id: "ajuste-efectivo-contado",
                    description: "Ingresa la cantidad de efectivo que contaste.",
                    error: countedError,
                    required: true,
                  })}
                  value={countedInput}
                  onChange={(event) => handleCountedChange(event.target.value)}
                  disabled={!selectedBalance}
                  inputMode="decimal"
                  autoComplete="off"
                  numeric
                  placeholder="0,00"
                  suffix={currency ?? undefined}
                />
              </Field>
            </div>

            {selectedBalance && countedValid && diferencia !== null ? (
              <DifferenceCard amount={diferencia} currency={selectedBalance.currency} />
            ) : null}

            {isZeroDifference ? (
              <Alert
                variant="info"
                title="El efectivo contado coincide con el saldo registrado. No es necesario realizar un ajuste."
              />
            ) : null}

            <Field id="ajuste-motivo" label="Motivo del ajuste" required>
              <Select value={motivo} onValueChange={(value) => setMotivo(value as CajaAdjustmentReason)}>
                <SelectTrigger {...fieldAria({ id: "ajuste-motivo", required: true })}>
                  <SelectValue placeholder="Selecciona un motivo" />
                </SelectTrigger>
                <SelectContent>
                  {validReasons.map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {reason}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <div className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between">
                <label htmlFor="ajuste-observaciones" className="text-label text-text-primary select-none">
                  {observacionesRequired ? (
                    <>
                      Observaciones
                      <span className="ml-1 text-error" aria-hidden="true">
                        *
                      </span>
                    </>
                  ) : (
                    "Observaciones (opcional)"
                  )}
                </label>
                <span className="text-caption text-text-secondary" aria-hidden="true">
                  {observaciones.length}/{OBSERVACIONES_MAX}
                </span>
              </div>
              <textarea
                id="ajuste-observaciones"
                value={observaciones}
                onChange={(event) => {
                  setObservaciones(event.target.value.slice(0, OBSERVACIONES_MAX));
                  setObservacionesError(undefined);
                }}
                aria-required={observacionesRequired || undefined}
                aria-invalid={observacionesError ? true : undefined}
                aria-describedby={observacionesError ? "ajuste-observaciones-error" : undefined}
                maxLength={OBSERVACIONES_MAX}
                rows={3}
                className={cn(
                  "w-full resize-none rounded-control border bg-surface px-4 py-3 text-body text-text-primary",
                  "transition-[border-color,box-shadow] duration-(--duration-fast) ease-(--ease-standard)",
                  "placeholder:text-text-secondary outline-none",
                  "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20",
                  observacionesError ? "border-error" : "border-border hover:border-border-strong",
                )}
                placeholder="Añade cualquier detalle relevante sobre este ajuste."
              />
              {observacionesError ? (
                <p id="ajuste-observaciones-error" role="alert" className="text-caption text-error-foreground">
                  {observacionesError}
                </p>
              ) : null}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-border pt-5">
              <Button variant="secondary" type="button" asChild>
                <Link href={CAJA_ROUTE}>Cancelar</Link>
              </Button>
              <Button type="submit" disabled={!canContinue}>
                Continuar
                <ArrowRight aria-hidden="true" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="self-start">
          <CardHeader>
            <div className="flex min-w-0 items-center gap-3">
              <span
                aria-hidden="true"
                className="grid size-7 shrink-0 place-items-center rounded-pill bg-surface-subtle text-body-sm font-semibold text-text-secondary"
              >
                2
              </span>
              <div className="min-w-0">
                <CardTitle>Revisar ajuste</CardTitle>
                <p className="mt-0.5 text-body-sm text-text-secondary">
                  Verifica la información antes de confirmar.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div>
              <p className="text-card-title text-text-primary">Resumen del ajuste</p>
              <p className="mt-0.5 text-body-sm text-text-secondary">
                Revisa el impacto de este ajuste en la caja.
              </p>
            </div>
            <dl className="flex flex-col">
              <SummaryRow label="Caja" value={CAJA_SUMMARY.register} />
              <SummaryRow
                label="Moneda"
                value={selectedCurrencyEntry ? `${selectedCurrencyEntry.code} · ${selectedCurrencyEntry.name}` : "—"}
              />
              <SummaryRow
                label="Saldo registrado"
                value={selectedBalance ? formatMoney({ amount: selectedBalance.amount, currency: selectedBalance.currency }) : "—"}
              />
              <SummaryRow
                label="Efectivo contado"
                value={countedValid ? formatMoney({ amount: parsedCounted, currency: currency ?? "" }) : "—"}
              />
              <SummaryRow
                label="Diferencia"
                value={diferencia !== null && currency ? formatSignedAmount(diferencia) + ` ${currency}` : "—"}
                valueClassName={
                  diferencia === null || diferencia === 0
                    ? undefined
                    : diferencia > 0
                      ? "text-success-foreground"
                      : "text-error-foreground"
                }
              />
              <SummaryRow label="Motivo" value={motivo || "—"} />
              <SummaryRow label="Observaciones" value={observaciones.trim() || "—"} />
            </dl>
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

/** Diferencia = Efectivo contado − Saldo registrado, sign always explicit in text (§ accesibilidad — nunca solo color). */
function DifferenceCard({ amount, currency }: { amount: number; currency: string }) {
  const tone = amount > 0 ? "success" : amount < 0 ? "error" : "neutral";
  const Icon = amount > 0 ? TrendingUp : amount < 0 ? TrendingDown : Equal;

  const toneClass =
    tone === "success"
      ? "border-success-border bg-success-subtle text-success-foreground"
      : tone === "error"
        ? "border-error-border bg-error-subtle text-error-foreground"
        : "border-border bg-surface-subtle text-text-secondary";

  return (
    <div className={cn("flex items-center justify-between gap-4 rounded-control border px-4 py-4", toneClass)}>
      <div>
        <p className="text-caption">Diferencia</p>
        <p className="pc-numeric text-amount font-semibold">
          {formatSignedAmount(amount)} {currency}
        </p>
        <p className="mt-1 text-caption text-text-secondary">Efectivo contado − Saldo registrado</p>
      </div>
      <Icon className="size-8 shrink-0" aria-hidden="true" />
    </div>
  );
}

/** Step 2 — Review. Nothing has been written yet; confirming here is the only action that calls `ajustarEfectivo`. */
function AjusteRevision({
  draft,
  worker,
  submitting,
  confirmError,
  onVolver,
  onConfirmar,
}: {
  draft: AjusteDraft;
  worker: string;
  submitting: boolean;
  confirmError?: string;
  onVolver: () => void;
  onConfirmar: () => void;
}) {
  const entry = findCajaCurrency(draft.balance.currency);

  return (
    <div className="flex flex-col gap-6">
      <BackLink />

      <div>
        <h1 className="text-screen-title text-text-primary">Revisar ajuste de efectivo</h1>
        <p className="mt-2 max-w-2xl text-body text-text-secondary">
          Verifica la información antes de modificar el saldo de {CAJA_SUMMARY.register}.
        </p>
      </div>

      <Card className="mx-auto w-full max-w-2xl">
        <CardHeader>
          <div className="flex min-w-0 items-center gap-3">
            <span
              aria-hidden="true"
              className="grid size-9 shrink-0 place-items-center rounded-control bg-primary-subtle text-primary"
            >
              <ClipboardList className="size-[18px]" />
            </span>
            <CardTitle>Resumen</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <dl className="flex flex-col">
            <SummaryRow label="Caja" value={CAJA_SUMMARY.register} />
            <SummaryRow label="Trabajador" value={worker} />
            <SummaryRow label="Moneda" value={entry ? `${entry.code} · ${entry.name}` : draft.balance.currency} />
            <SummaryRow
              label="Saldo registrado"
              value={formatMoney({ amount: draft.balance.amount, currency: draft.balance.currency })}
            />
            <SummaryRow
              label="Efectivo contado"
              value={formatMoney({ amount: draft.efectivoContado, currency: draft.balance.currency })}
            />
            <SummaryRow
              label="Ajuste / Diferencia"
              value={`${formatSignedAmount(draft.diferencia)} ${draft.balance.currency}`}
              valueClassName={draft.diferencia > 0 ? "text-success-foreground" : "text-error-foreground"}
            />
            <SummaryRow label="Motivo" value={draft.motivo} />
            <SummaryRow label="Observaciones" value={draft.observaciones || "—"} />
            <SummaryRow label="Fecha y hora" value="Se registrará al confirmar" />
          </dl>

          <Alert variant="info" title="Al confirmar se actualizará el saldo actual de esta moneda en la caja." />
          {confirmError ? <Alert variant="error" title={confirmError} /> : null}
        </CardContent>
      </Card>

      <div className="mx-auto flex w-full max-w-2xl items-center justify-end gap-3">
        <Button variant="secondary" type="button" onClick={onVolver}>
          Volver
        </Button>
        <Button type="button" loading={submitting} onClick={onConfirmar}>
          {submitting ? null : <CircleCheck aria-hidden="true" />}
          {submitting ? "Confirmando…" : "Confirmar ajuste"}
        </Button>
      </div>
    </div>
  );
}

/** Step 3 — Success. Unlike Steps 1-2, showing both "Saldo anterior" and "Saldo actual" here is intentional: a final before/after record, not a duplicate of "Efectivo contado". */
function AjusteCompletado({ result, worker }: { result: AjustarEfectivoResult; worker: string }) {
  const entry = findCajaCurrency(result.currency);
  const currencyLabel = entry ? `${entry.code} · ${entry.name}` : result.currency;

  return (
    <>
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center print:hidden">
        <span
          aria-hidden="true"
          className="grid size-14 place-items-center rounded-pill border-2 border-success text-success"
        >
          <CircleCheck className="size-8" />
        </span>

        <h1 className="mt-5 text-screen-title text-text-primary">Ajuste registrado correctamente</h1>
        <p className="mt-2 text-center text-body text-text-secondary">
          El saldo de {currencyLabel} en {CAJA_SUMMARY.register} se actualizó correctamente.
        </p>

        <Card className="mt-8 w-full">
          <CardContent className="flex flex-col gap-4 pt-6">
            <dl className="flex flex-col">
              <SummaryRow label="Caja" value={CAJA_SUMMARY.register} />
              <SummaryRow label="Moneda" value={currencyLabel} />
              <SummaryRow
                label="Saldo anterior"
                value={formatMoney({ amount: result.saldoAnterior, currency: result.currency })}
              />
              <SummaryRow
                label="Ajuste"
                value={`${formatSignedAmount(result.diferencia)} ${result.currency}`}
                valueClassName={result.diferencia > 0 ? "text-success-foreground" : "text-error-foreground"}
              />
              <SummaryRow
                label="Saldo actual"
                value={formatMoney({ amount: result.saldoActual, currency: result.currency })}
              />
              <SummaryRow label="Motivo" value={result.motivo} />
              <SummaryRow label="Trabajador" value={worker} />
              <SummaryRow label="Fecha y hora" value={formatDateTime(new Date(result.timestamp))} />
            </dl>
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

      <AjustePrintableReceipt result={result} worker={worker} currencyLabel={currencyLabel} />
    </>
  );
}

/** Print-only comprobante — same `hidden print:block` mechanism as every other Caja receipt. No PDF pipeline. */
function AjustePrintableReceipt({
  result,
  worker,
  currencyLabel,
}: {
  result: AjustarEfectivoResult;
  worker: string;
  currencyLabel: string;
}) {
  return (
    <section className="hidden print:block" aria-hidden="true">
      <h1 style={{ fontSize: "18px", fontWeight: 700 }}>PuntoCash · Comprobante de ajuste de efectivo</h1>
      <p style={{ marginTop: 4 }}>{CAJA_SUMMARY.register}</p>

      <dl style={{ marginTop: 16, lineHeight: 1.7 }}>
        <ReceiptLine label="Caja" value={CAJA_SUMMARY.register} />
        <ReceiptLine label="Trabajador" value={worker} />
        <ReceiptLine label="Moneda" value={currencyLabel} />
        <ReceiptLine label="Saldo anterior" value={formatMoney({ amount: result.saldoAnterior, currency: result.currency })} />
        <ReceiptLine label="Ajuste" value={`${formatSignedAmount(result.diferencia)} ${result.currency}`} />
        <ReceiptLine label="Saldo actual" value={formatMoney({ amount: result.saldoActual, currency: result.currency })} />
        <ReceiptLine label="Motivo" value={result.motivo} />
        {result.observaciones ? <ReceiptLine label="Observaciones" value={result.observaciones} /> : null}
        <ReceiptLine label="Fecha y hora" value={formatDateTime(new Date(result.timestamp))} />
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
  valueClassName,
  sublabel,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  valueClassName?: string;
  sublabel?: string;
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
        <span className={cn("text-body-sm font-semibold text-text-primary", valueClassName)}>{value}</span>
        {sublabel ? <span className="text-caption text-text-secondary">{sublabel}</span> : null}
      </span>
    </span>
  );
}

function SummaryRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-2.5 last:border-b-0 last:pb-0">
      <dt className="text-body-sm text-text-secondary">{label}</dt>
      <dd className={cn("pc-numeric text-body-sm font-semibold text-text-primary", valueClassName)}>{value}</dd>
    </div>
  );
}
