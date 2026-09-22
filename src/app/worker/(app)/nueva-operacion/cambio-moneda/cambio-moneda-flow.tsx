"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CircleCheck, Lock } from "lucide-react";

import {
  Alert,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui";
import { Stepper } from "@/components/patterns/stepper";
import { formatDateTime, formatMoney, parseAmountInput } from "@/lib/format";
import { getExchangeQuote, type ExchangeQuote } from "@/features/exchange/quote";
import {
  CAJA_BALANCES,
  hasOpenJornada,
  registrarCambioMoneda,
  type CambioMonedaCashOutcome,
} from "@/features/caja/caja-data";
import { getCurrentWorker } from "@/features/worker/session";
import {
  customerFullName,
  documentTypeShortLabel,
  type Customer,
} from "@/features/customers/customers";
import { registerCompletedOperation } from "@/features/operations/operations-history";
import {
  CashValidationCard,
  ExchangeSummaryCard,
  evaluateCash,
  formatAppliedRate,
  type CashCheck,
} from "./exchange-summary";
import {
  FLOW_STEPS,
  createInitialState,
  flowReducer,
  generateOperationCode,
  hasMeaningfulData,
  stepIndex,
  type CompletedOperation,
} from "./flow-state";
import { StepCambio } from "./step-cambio";
import { StepCliente } from "./step-cliente";
import { clearPendingWorkerHandoff } from "@/features/kiosk/self-service-request";
import { StepRevision } from "./step-revision";
import { OperationComplete } from "./operation-complete";

const CATALOG_ROUTE = "/worker/nueva-operacion";

/** Simulated backend round trip, so the submitting state is observable. */
const CONFIRM_MS = 900;
let operationSequence = 123;

/**
 * Cambio de moneda is a cash operation like every other: it can only happen
 * inside an open jornada, because its cash effect (an entrada in the source
 * currency and a salida in the destination currency) must be recorded as caja
 * movements that belong to that jornada [R1]. Without one the flow is a
 * blocked state with a way to Caja, and no form at all.
 */
export function CambioMonedaFlow(): React.JSX.Element {
  const [blocked] = React.useState(() => !hasOpenJornada());
  // A kiosk prefill is only ever handed over from "Buscar solicitud", which is
  // itself blocked without a jornada — but never leave one dangling here.
  React.useEffect(() => {
    if (blocked) clearPendingWorkerHandoff();
  }, [blocked]);

  return blocked ? <BlockedNoJornada /> : <CambioMonedaOperation />;
}

function BlockedNoJornada(): React.JSX.Element {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <Link
        href={CATALOG_ROUTE}
        className="inline-flex w-fit items-center gap-2 rounded-control text-label font-medium text-text-secondary transition-colors hover:text-text-primary outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Volver a Nueva operación
      </Link>
      <Card>
        <CardContent className="flex flex-col items-center px-8 py-12 text-center">
          <span className="grid size-12 place-items-center rounded-control bg-warning-subtle text-warning-foreground">
            <Lock aria-hidden="true" />
          </span>
          <h1 className="mt-5 text-screen-title text-text-primary">Caja cerrada</h1>
          <p className="mt-2 text-body text-text-secondary">
            Debes abrir una jornada antes de realizar un cambio de moneda.
          </p>
          <Button className="mt-6" asChild>
            <Link href="/worker/caja">Ir a Caja</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/** Worker-facing message for each reason the caja can refuse the cash effect at confirmation. */
function cashRejectionMessage(outcome: Extract<CambioMonedaCashOutcome, { ok: false }>): string {
  switch (outcome.reason) {
    case "jornada-no-abierta":
      return "La jornada ya no está abierta. Abre una jornada en Caja para registrar la operación.";
    case "moneda-no-habilitada":
      return `${outcome.currency ?? "La moneda"} no está habilitada en esta caja.`;
    case "fondos-insuficientes":
      return `La caja no dispone de suficiente ${outcome.currency ?? "efectivo"} para completar este cambio.`;
    default:
      return "No se pudo registrar el cambio. Revisa los importes e inténtalo de nuevo.";
  }
}

function CambioMonedaOperation(): React.JSX.Element {
  const router = useRouter();
  const worker = getCurrentWorker();
  const [state, dispatch] = React.useReducer(flowReducer, undefined, createInitialState);
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [confirmError, setConfirmError] = React.useState<string | null>(null);

  // The kiosk prefill (if any) was read into the initial state — drop it.
  React.useEffect(() => clearPendingWorkerHandoff(), []);

  /* ---- Step 1 derivations: quoted live, committed on Continuar ---- */
  const parsedAmount = parseAmountInput(state.amountInput);

  const liveQuote = React.useMemo(() => {
    if (parsedAmount === null || parsedAmount <= 0) return null;
    const result = getExchangeQuote({
      sourceCurrency: state.sourceCurrency,
      destinationCurrency: state.destinationCurrency,
      sourceAmount: parsedAmount,
    });
    return result.ok ? result.quote : null;
  }, [parsedAmount, state.sourceCurrency, state.destinationCurrency]);

  const amountError = React.useMemo(() => {
    if (state.amountInput.trim() === "") return "Introduce el monto a entregar.";
    if (parsedAmount === null) return "Introduce un monto válido.";
    if (parsedAmount <= 0) return "El monto debe ser mayor que cero.";
    return undefined;
  }, [state.amountInput, parsedAmount]);

  /** Cash is always checked against the quote actually in play. */
  function cashFor(quote: { destinationCurrency: string; destinationAmount: number } | null) {
    if (!quote) return null;
    return evaluateCash(
      liveBalance(quote.destinationCurrency),
      quote.destinationAmount,
      quote.destinationCurrency,
    );
  }

  const liveCash = cashFor(liveQuote);
  const committedCash = cashFor(state.quote);

  const canContinueFromCambio = Boolean(liveQuote && liveCash?.sufficient && !amountError);

  /* ---- Navigation ---- */
  const dirty = hasMeaningfulData(state);

  function leaveFlow() {
    router.push(CATALOG_ROUTE);
  }

  function requestCancel() {
    if (dirty) setCancelOpen(true);
    else leaveFlow();
  }

  /* ---- Confirmation ---- */
  async function confirmOperation() {
    // Guard against a double submit and against a state that stopped being
    // valid while the worker was reading the review.
    if (state.submitting || !state.quote || !state.customer || !committedCash?.sufficient) return;

    setConfirmError(null);
    dispatch({ type: "submit-start" });
    await new Promise((resolve) => setTimeout(resolve, CONFIRM_MS));

    const completedAt = new Date();
    const code = generateOperationCode(completedAt, (operationSequence += 1));
    const { quote, customer } = state;

    // The cash effect is recorded FIRST and validated again right here (jornada
    // still open → currencies enabled → funds still sufficient) [R3]. If the
    // caja refuses, nothing exists: no operation, no movement, no balance
    // change, and the worker stays on the review with the reason.
    const cash = registrarCambioMoneda({
      operationCode: code,
      sourceCurrency: quote.sourceCurrency,
      sourceAmount: quote.sourceAmount,
      destinationCurrency: quote.destinationCurrency,
      destinationAmount: quote.destinationAmount,
      timestamp: completedAt,
    });
    if (!cash.ok) {
      setConfirmError(cashRejectionMessage(cash));
      dispatch({ type: "submit-failure" });
      return;
    }

    // So this operation's own "Ver detalle" link resolves on the Operaciones
    // list/detail screens instead of hitting the not-found card (§11). The
    // snapshot is the register's real before/movement/after in the destination
    // currency, taken from the movement just recorded.
    registerCompletedOperation({
      codigo: code,
      fechaHora: completedAt.toISOString(),
      cliente: {
        nombre: customerFullName(customer),
        documentType: customer.documentType,
        documentNumber: customer.documentNumber,
        telefono: customer.phone,
        nacionalidad: customer.nationality,
      },
      servicio: "Cambio de moneda",
      estado: "Completada",
      amount: {
        kind: "exchange",
        source: { amount: quote.sourceAmount, currency: quote.sourceCurrency },
        destination: { amount: quote.destinationAmount, currency: quote.destinationCurrency },
        appliedRate: quote.appliedRate,
        cashSnapshot: {
          before: { amount: cash.destination.saldoAntes, currency: quote.destinationCurrency },
          movement: { amount: quote.destinationAmount, currency: quote.destinationCurrency },
          after: { amount: cash.destination.saldoDespues, currency: quote.destinationCurrency },
        },
      },
      worker: worker.fullName,
      caja: worker.register,
    });

    dispatch({
      type: "submit-success",
      operation: {
        code,
        quote,
        customer,
        worker: worker.fullName,
        register: worker.register,
        completedAt: completedAt.toISOString(),
      },
    });
  }

  const completed = state.step === "completado" && state.completed !== null;

  return (
    <>
      {/* The receipt view is what printing captures; everything else is hidden
          by the print rules in globals.css. */}
      <div className="flex flex-col gap-6 print:hidden">
        {!completed ? (
          <div className="flex flex-col gap-4">
            {/* Only Step 1 offers a way out to the catalog: from Step 2/3 the
                single escape hatch is "Cancelar operación" (top-right), so the
                worker is not offered two differently-worded exits at once. */}
            {state.step === "cambio" ? (
              <Link
                href={CATALOG_ROUTE}
                className="inline-flex w-fit items-center gap-2 rounded-control text-label font-medium text-text-secondary transition-colors hover:text-text-primary outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-primary"
                onClick={(event) => {
                  // Warn before discarding real work (§17).
                  if (dirty) {
                    event.preventDefault();
                    setCancelOpen(true);
                  }
                }}
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                Volver a Nueva operación
              </Link>
            ) : null}

            <div className="flex items-start justify-between gap-6">
              <div className="min-w-0">
                <h1 className="text-screen-title text-text-primary">Cambio de moneda</h1>
                {state.kioskCode ? (
                  <p className="mt-2 text-body-sm font-medium text-primary">
                    Solicitud de kiosco {state.kioskCode} · datos precargados
                  </p>
                ) : null}
                <p className="mt-2 text-body text-text-secondary">
                  {state.step === "cambio"
                    ? "Define el cambio que realizará el cliente."
                    : state.step === "cliente"
                      ? "Identifica al cliente para continuar."
                      : "Revisa los detalles antes de confirmar la operación."}
                </p>
              </div>

              <Button variant="secondary" className="shrink-0" onClick={requestCancel}>
                Cancelar operación
              </Button>
            </div>

            <Stepper
              steps={FLOW_STEPS}
              currentIndex={stepIndex(state.step)}
              className="mt-2 mb-2"
            />
          </div>
        ) : null}

        {state.step === "cambio" ? (
          <StepCambio
            sourceCurrency={state.sourceCurrency}
            destinationCurrency={state.destinationCurrency}
            amountInput={state.amountInput}
            quote={liveQuote}
            cash={liveCash}
            amountError={amountError}
            onSourceCurrencyChange={(currency) =>
              dispatch({ type: "set-source-currency", currency })
            }
            onDestinationCurrencyChange={(currency) =>
              dispatch({ type: "set-destination-currency", currency })
            }
            onAmountChange={(value) => dispatch({ type: "set-amount", value })}
            onSwap={() => dispatch({ type: "swap-currencies" })}
          />
        ) : null}

        {state.step === "cliente" && state.quote && committedCash ? (
          <div className="grid grid-cols-1 gap-6 wide:grid-cols-[minmax(0,1fr)_20rem]">
            <StepCliente
              kioskClient={state.kioskClient}
              selectedCustomer={state.customer}
              onSelectCustomer={(customer: Customer) =>
                dispatch({ type: "select-customer", customer })
              }
            />
            {/* Below the three-column breakpoint the summary moves under the
                search area; side by side there keeps it one short scroll away
                instead of a tall stack. */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 wide:grid-cols-1">
              <ClienteSideSummary quote={state.quote} cash={committedCash} />
            </div>
          </div>
        ) : null}

        {state.step === "revision" && state.quote && state.customer && committedCash ? (
          <StepRevision
            quote={state.quote}
            customer={state.customer}
            cash={committedCash}
            worker={worker.fullName}
            register={worker.register}
          />
        ) : null}

        {completed && state.completed ? <OperationComplete operation={state.completed} /> : null}

        {state.step === "revision" && confirmError ? (
          <Alert variant="error" title={confirmError} />
        ) : null}

        {/* ---------------- Footer actions ---------------- */}
        {!completed ? (
          <div className="mt-2 flex items-center justify-between gap-4 border-t border-border pt-6">
            {/* Step 1 has no bottom-left action: "Cancelar operación" already
                lives once, top-right, and there is no previous step to return
                to. Steps 2/3 offer "Volver" to the previous step. */}
            {state.step !== "cambio" ? (
              <Button
                variant="secondary"
                onClick={() =>
                  dispatch({
                    type: "go-to-step",
                    step: state.step === "revision" ? "cliente" : "cambio",
                  })
                }
              >
                <ArrowLeft aria-hidden="true" />
                Volver
              </Button>
            ) : (
              <span aria-hidden="true" />
            )}

            <div className="flex items-center gap-4">
              {state.step === "revision" ? (
                <p className="hidden items-center gap-2 text-caption text-text-secondary sm:flex">
                  <Lock className="size-3.5" aria-hidden="true" />
                  Al confirmar, la operación se registrará y no podrá ser anulada.
                </p>
              ) : null}

              {state.step === "cambio" ? (
                <Button
                  disabled={!canContinueFromCambio}
                  onClick={() => liveQuote && dispatch({ type: "commit-quote", quote: liveQuote })}
                >
                  Continuar
                  <ArrowRight aria-hidden="true" />
                </Button>
              ) : null}

              {state.step === "cliente" ? (
                <Button
                  disabled={!state.customer}
                  onClick={() => dispatch({ type: "go-to-step", step: "revision" })}
                >
                  Continuar a revisión
                  <ArrowRight aria-hidden="true" />
                </Button>
              ) : null}

              {state.step === "revision" ? (
                <Button
                  loading={state.submitting}
                  disabled={!committedCash?.sufficient}
                  onClick={() => void confirmOperation()}
                >
                  {state.submitting ? null : <CircleCheck aria-hidden="true" />}
                  {state.submitting ? "Confirmando…" : "Confirmar cambio"}
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {/* Print-only receipt. */}
      {completed && state.completed ? <PrintableReceipt operation={state.completed} /> : null}

      <CancelDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        onConfirm={() => {
          setCancelOpen(false);
          leaveFlow();
        }}
      />
    </>
  );
}

/** Live cash the register holds in one currency (0 when the currency is not enabled). */
function liveBalance(currency: string): number {
  return CAJA_BALANCES.find((balance) => balance.currency === currency)?.amount ?? 0;
}

/** Compact context so the worker never loses the numbers on step 2 (§14). */
function ClienteSideSummary({
  quote,
  cash,
}: {
  quote: ExchangeQuote;
  cash: CashCheck;
}): React.JSX.Element {
  return (
    <>
      <ExchangeSummaryCard quote={quote} className="self-start" />
      <CashValidationCard cash={cash} className="self-start" />
    </>
  );
}

function CancelDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Cancelar la operación?</DialogTitle>
          <DialogDescription>
            Se descartarán los datos introducidos, incluido el cambio definido y el cliente
            seleccionado. Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <p className="text-body-sm text-text-secondary">
            No se registrará ninguna operación ni se modificará el saldo de la caja.
          </p>
        </DialogBody>

        <DialogFooter>
          <Button variant="tertiary" onClick={() => onOpenChange(false)}>
            Seguir con la operación
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Sí, cancelar operación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Print-only comprobante. Hidden on screen; `globals.css` hides the app shell
 * when printing so this is all that reaches the paper. Deliberately plain
 * markup — a real PDF pipeline is out of scope.
 */
function PrintableReceipt({ operation }: { operation: CompletedOperation }): React.JSX.Element {
  const { quote, customer } = operation;

  return (
    <section className="hidden print:block" aria-hidden="true">
      <h1 style={{ fontSize: "18px", fontWeight: 700 }}>PuntoCash · Comprobante de operación</h1>
      <p style={{ marginTop: 4 }}>Cambio de moneda</p>

      <dl style={{ marginTop: 16, lineHeight: 1.7 }}>
        <ReceiptLine label="Código de operación" value={operation.code} />
        <ReceiptLine label="Fecha y hora" value={formatDateTime(new Date(operation.completedAt))} />
        <ReceiptLine label="Cliente" value={customerFullName(customer)} />
        <ReceiptLine
          label="Documento"
          value={`${documentTypeShortLabel(customer.documentType)} · ${customer.documentNumber}`}
        />
        <ReceiptLine
          label="Cliente entrega"
          value={formatMoney({ amount: quote.sourceAmount, currency: quote.sourceCurrency })}
        />
        <ReceiptLine
          label="Cliente recibe"
          value={formatMoney({
            amount: quote.destinationAmount,
            currency: quote.destinationCurrency,
          })}
        />
        <ReceiptLine label="Tasa aplicada" value={formatAppliedRate(quote)} />
        <ReceiptLine label="Caja" value={operation.register} />
        <ReceiptLine label="Trabajador" value={operation.worker} />
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
