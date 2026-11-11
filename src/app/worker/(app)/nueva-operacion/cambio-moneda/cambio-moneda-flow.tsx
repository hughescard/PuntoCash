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
import { formatAmount, formatDateTime, formatMoney, parseAmountInput } from "@/lib/format";
import { type ExchangeQuote } from "@/features/exchange/quote";
import { cotizar, cotizarParaRecibir, monedasCotizables } from "@/features/exchange/cotizacion";
import { denominacionMinima } from "@/features/caja/pagos";
import { RecuentoDeMoneda } from "../../caja/recuento-de-moneda";
import { EfectivoDeOperacion } from "../efectivo-de-operacion";
import { useCaja } from "@/features/caja/use-caja";
import { useVistaDeCaja } from "@/features/worker/caja-context";
import { registrarCambioAction, type AccionDeCaja } from "../../../_actions";
import {
  customerFullName,
  documentTypeShortLabel,
  type Customer,
} from "@/features/customers/customers";
import { ExchangeSummaryCard, formatAppliedRate } from "./exchange-summary";
import {
  FLOW_STEPS,
  createInitialState,
  flowReducer,
  hasMeaningfulData,
  stepIndex,
  type CompletedOperation,
} from "./flow-state";
import { StepCambio } from "./step-cambio";
import { StepCliente } from "./step-cliente";
import { clearPendingWorkerHandoff } from "@/features/kiosk/self-service-request";
import { StepRevision } from "./step-revision";
import { liquidacionComoLineas } from "../liquidacion";
import { OperationComplete } from "./operation-complete";

const CATALOG_ROUTE = "/worker/nueva-operacion";


/**
 * Cambio de moneda is a cash operation like every other: it can only happen
 * inside an open jornada, because its cash effect (an entrada in the source
 * currency and a salida in the destination currency) must be recorded as caja
 * movements that belong to that jornada [R1]. Without one the flow is a
 * blocked state with a way to Caja, and no form at all.
 */
export function CambioMonedaFlow(): React.JSX.Element {
  const caja = useCaja();
  const vista = useVistaDeCaja();
  const blocked = !caja.jornadaAbierta || vista.bloqueo !== null;
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
function cashRejectionMessage(outcome: Extract<AccionDeCaja<unknown>, { ok: false }>): string {
  switch (outcome.reason) {
    case "sin-tasa":
      return outcome.cotizacion
        ? `La tasa cambió mientras revisabas: ahora el cliente recibiría ${outcome.cotizacion.destinationAmount.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${outcome.cotizacion.destinationCurrency}. Vuelve al primer paso para confirmarlo con el cliente.`
        : "Esta sede ya no tiene una tasa en vigor para este cambio.";
    case "bloqueada":
      return "La sede no está operando: no se pueden registrar operaciones.";
    case "servicio-no-habilitado":
      return "PuntoCash deshabilitó Cambio de moneda en esta sede.";
    case "jornada-no-abierta":
      return "La jornada ya no está abierta. Abre una jornada en Caja para registrar la operación.";
    case "moneda-no-habilitada":
      return `${outcome.currency ?? "La moneda"} no está habilitada en esta caja.`;
    case "fondos-insuficientes":
      return `La caja no tiene ${outcome.currency ?? "efectivo"} suficiente para entregar este cambio. No se registró nada: avisa a tu supervisor o propón al cliente un importe menor.`;
    case "sin-esos-billetes":
      return "Contada la caja, esos billetes no están. No se registró nada: vuelve a marcar con qué billetes se entrega.";
    case "sin-vuelto":
      return "La caja no tiene billetes para darle el vuelto. No se registró nada: pídele al cliente que pague con otros billetes o con el importe justo.";
    case "sin-salida":
      return "La caja no puede pagar eso entero. No se registró nada: vuelve a los billetes y ofrécele al cliente otra salida.";
    case "propuesta-vencida":
    case "cobro-insuficiente":
    case "importe-no-pagable":
      return "Los billetes ya no cuadran con lo que toca, quizá porque cambió la caja. Vuelve a los billetes y revísalos.";
    default:
      return "No se pudo registrar el cambio. Revisa los importes e inténtalo de nuevo.";
  }
}

function CambioMonedaOperation(): React.JSX.Element {
  const router = useRouter();
  const caja = useCaja();
  const vista = useVistaDeCaja();
  const worker = { fullName: vista.trabajador.fullName, register: caja.summary.register };
  /* Worker opera a ciegas (decisión del 6/11/2026): la pantalla no sabe
     cuánto hay de cada moneda. Si no alcanza para entregar, lo dice el
     servidor al confirmar («fondos-insuficientes») y no se registra nada. */
  const MONEDAS = caja.monedas;
  const [state, dispatch] = React.useReducer(flowReducer, undefined, createInitialState);
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [confirmError, setConfirmError] = React.useState<string | null>(null);
  /** Moneda que hay que contar antes de registrar (salen billetes que los libros no tienen). */
  const [recontando, setRecontando] = React.useState<string | null>(null);

  // The kiosk prefill (if any) was read into the initial state — drop it.
  React.useEffect(() => clearPendingWorkerHandoff(), []);

  /* ---- Step 1 derivations: quoted live, committed on Continuar ---- */
  const parsedAmount = parseAmountInput(state.amountInput);
  /* La denominación más pequeña de la moneda que paga el cliente: el importe se cobra en billetes. */
  const pasoDeOrigen = denominacionMinima(vista.denominaciones[state.sourceCurrency] ?? []);

  const liveQuote = React.useMemo(() => {
    if (parsedAmount === null || parsedAmount <= 0) return null;
    const result =
      state.modo === "recibir"
        ? cotizarParaRecibir(vista.tasas, state.sourceCurrency, state.destinationCurrency, parsedAmount, pasoDeOrigen)
        : cotizar(vista.tasas, state.sourceCurrency, state.destinationCurrency, parsedAmount);
    if (!result.ok) return null;
    const q: ExchangeQuote = {
      sourceCurrency: result.value.sourceCurrency,
      destinationCurrency: result.value.destinationCurrency,
      sourceAmount: result.value.sourceAmount,
      destinationAmount: result.value.destinationAmount,
      appliedRate: result.value.appliedRate,
      tasasAplicadas: result.value.tasasAplicadas,
      quoteId: `${state.sourceCurrency}-${state.destinationCurrency}`,
      quotedAt: new Date().toISOString(),
    };
    return q;
  }, [parsedAmount, state.modo, pasoDeOrigen, state.sourceCurrency, state.destinationCurrency, vista.tasas]);

  const amountError = React.useMemo(() => {
    if (state.amountInput.trim() === "") return state.modo === "recibir" ? "Introduce el monto a recibir." : "Introduce el monto a entregar.";
    if (parsedAmount === null) return "Introduce un monto válido.";
    if (parsedAmount <= 0) return "El monto debe ser mayor que cero.";
    /* Se cobra en billetes: no puede tener fracciones menores que el más pequeño. */
    if (state.modo === "cambiar" && Number.isFinite(pasoDeOrigen) && Math.abs(Math.round(parsedAmount * 100) % Math.round(pasoDeOrigen * 100)) > 0) {
      return `Se cobra en billetes: el importe no puede tener fracciones menores que ${formatAmount(pasoDeOrigen)} ${state.sourceCurrency}.`;
    }
    return undefined;
  }, [state.amountInput, state.modo, state.sourceCurrency, parsedAmount, pasoDeOrigen]);

  const canContinueFromCambio = Boolean(liveQuote && !amountError);

  /* ---- Navigation ---- */
  /* Monedas que la caja tiene habilitadas y este servicio no puede cambiar,
     porque no hay par con tasa para ellas (**FR-AD-MON-5**: la lista de
     monedas de una sede no depende de Cambio de moneda). Se calculan aquí y se
     dicen en la pantalla, en vez de desaparecer del selector sin explicación. */
  const cotizables = monedasCotizables(vista.tasas);
  const monedasCambiables = MONEDAS.filter((c) => cotizables.includes(c));
  const monedasSinTasa = MONEDAS.filter((c) => !cotizables.includes(c));

  /* Si una de las dos monedas elegidas no se puede cambiar en esta caja, se
     corrige a una que sí, en vez de dejar una cotización imposible en pantalla.
     Entre dos divisas se cambia pasando por el peso (`cotizacion.ts`). */
  const clave = monedasCambiables.join(",");
  React.useEffect(() => {
    const validas = clave.split(",").filter(Boolean);
    if (validas.length < 2) return;
    const { sourceCurrency: s, destinationCurrency: d } = state;
    if (!validas.includes(s)) {
      dispatch({ type: "set-source-currency", currency: validas.find((c) => c !== d)! });
    } else if (!validas.includes(d)) {
      dispatch({ type: "set-destination-currency", currency: validas.find((c) => c !== s)! });
    }
  }, [clave, state]);

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
    if (state.submitting || !state.quote || !state.customer || !state.efectivo) return;

    setConfirmError(null);
    dispatch({ type: "submit-start" });
    const { quote, customer } = state;

    // The cash effect is recorded FIRST and validated again right here (jornada
    // still open → currencies enabled → funds still sufficient) [R3]. If the
    // caja refuses, nothing exists: no operation, no movement, no balance
    // change, and the worker stays on the review with the reason.
    /* El servidor vuelve a cotizar con las tasas de ahora, comprueba la
       jornada, las monedas y el efectivo [R3], y solo entonces registra la
       operación y sus dos movimientos. Si algo no cuadra, no queda nada. */
    const cash = await registrarCambioAction({
      cliente: {
        nombre: customerFullName(customer),
        documentType: customer.documentType,
        documentNumber: customer.documentNumber,
        telefono: customer.phone,
        nacionalidad: customer.nationality,
      },
      sourceCurrency: quote.sourceCurrency,
      destinationCurrency: quote.destinationCurrency,
      sourceAmount: quote.sourceAmount,
      destinationAmountVisto: quote.destinationAmount,
      efectivo: state.efectivo,
    });
    if (!cash.ok) {
      dispatch({ type: "submit-failure" });
      /* Salen billetes que los libros no tienen: se cuenta esa moneda y se vuelve a intentar. */
      if (cash.reason === "recuento-necesario" && cash.currency) {
        setRecontando(cash.currency);
        return;
      }
      setConfirmError(cashRejectionMessage(cash));
      if (["propuesta-vencida", "sin-vuelto", "sin-salida", "sin-esos-billetes", "cobro-insuficiente", "importe-no-pagable"].includes(cash.reason)) {
        dispatch({ type: "recargar-efectivo" });
        dispatch({ type: "go-to-step", step: "efectivo" });
      }
      return;
    }
    const code = cash.value.codigo;
    const completedAt = new Date(cash.value.fechaHora);
    router.refresh();

    dispatch({
      type: "submit-success",
      operation: {
        code,
        quote,
        customer,
        worker: worker.fullName,
        register: worker.register,
        completedAt: completedAt.toISOString(),
        ...(cash.value.liquidacion ? { liquidacion: cash.value.liquidacion } : {}),
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
                      : state.step === "efectivo"
                        ? "Marca los billetes que da el cliente y los que se le entregan."
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
            monedasSinTasa={monedasSinTasa}
            monedasCambiables={monedasCambiables}
            sourceCurrency={state.sourceCurrency}
            destinationCurrency={state.destinationCurrency}
            amountInput={state.amountInput}
            modo={state.modo}
            onModoChange={(modo) => dispatch({ type: "set-modo", modo })}
            quote={liveQuote}
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

        {state.step === "cliente" && state.quote ? (
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
              <ExchangeSummaryCard quote={state.quote} className="self-start" />
            </div>
          </div>
        ) : null}

        {state.step === "efectivo" && state.quote && !recontando ? (
          <div className="grid grid-cols-1 gap-6 wide:grid-cols-[minmax(0,1fr)_20rem]">
            <EfectivoDeOperacion
              entrada={{
                modo: "cambio",
                sourceCurrency: state.quote.sourceCurrency,
                destinationCurrency: state.quote.destinationCurrency,
                sourceAmount: state.quote.sourceAmount,
              }}
              recargar={state.recarga}
              inicial={state.efectivo?.paga}
              onChange={(e) => dispatch({ type: "set-efectivo", efectivo: e.listo ? e.efectivo : null })}
              onOtroImporte={(sourceAmount) => {
                const q = cotizar(vista.tasas, state.quote!.sourceCurrency, state.quote!.destinationCurrency, sourceAmount);
                if (!q.ok || !state.quote) return;
                dispatch({
                  type: "cambiar-otro-importe",
                  quote: {
                    ...state.quote,
                    sourceAmount: q.value.sourceAmount,
                    destinationAmount: q.value.destinationAmount,
                    appliedRate: q.value.appliedRate,
                    tasasAplicadas: q.value.tasasAplicadas,
                    quotedAt: new Date().toISOString(),
                  },
                });
              }}
            />
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 wide:grid-cols-1">
              <ExchangeSummaryCard quote={state.quote} className="self-start" />
            </div>
          </div>
        ) : null}

        {recontando ? (
          <RecuentoDeMoneda
            currency={recontando}
            denominaciones={vista.denominaciones}
            supervisores={vista.supervisores}
            onCancelar={() => setRecontando(null)}
            onListo={() => {
              setRecontando(null);
              void confirmOperation();
            }}
          />
        ) : null}

        {state.step === "revision" && state.quote && state.customer && !recontando ? (
          <StepRevision
            quote={state.quote}
            customer={state.customer}
            worker={worker.fullName}
            register={worker.register}
            efectivo={state.efectivo}
            denominaciones={vista.denominaciones}
          />
        ) : null}

        {completed && state.completed ? <OperationComplete operation={state.completed} /> : null}

        {(state.step === "revision" || state.step === "efectivo") && confirmError && !recontando ? (
          <Alert variant="error" title={confirmError} />
        ) : null}

        {/* ---------------- Footer actions ---------------- */}
        {!completed && !recontando ? (
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
                    step: state.step === "revision" ? "efectivo" : state.step === "efectivo" ? "cliente" : "cambio",
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
                  onClick={() => dispatch({ type: "go-to-step", step: "efectivo" })}
                >
                  Continuar a los billetes
                  <ArrowRight aria-hidden="true" />
                </Button>
              ) : null}

              {state.step === "efectivo" ? (
                <Button
                  disabled={!state.efectivo}
                  onClick={() => {
                    setConfirmError(null);
                    dispatch({ type: "go-to-step", step: "revision" });
                  }}
                >
                  Continuar a revisión
                  <ArrowRight aria-hidden="true" />
                </Button>
              ) : null}

              {state.step === "revision" ? (
                <Button
                  loading={state.submitting}
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
        {liquidacionComoLineas(operation.liquidacion).map((l) => (
          <ReceiptLine key={l.etiqueta} label={l.etiqueta} value={l.valor} />
        ))}
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
