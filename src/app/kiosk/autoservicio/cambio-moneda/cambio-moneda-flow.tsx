"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CircleCheck } from "lucide-react";

import { Button } from "@/components/ui";
import { Stepper } from "@/components/patterns/stepper";
import { KioskCancelDialog } from "@/components/patterns/kiosk-cancel-dialog";
import { KioskRequestTicket, TicketRow } from "@/components/patterns/kiosk-request-ticket";
import { CurrencyFlag } from "@/components/patterns/currency-flag";
import { formatMoney, parseAmountInput } from "@/lib/format";
import { getExchangeQuote } from "@/features/exchange/quote";
import {
  kioskClientFullName,
  registerSelfServiceRequest,
} from "@/features/kiosk/self-service-request";
import {
  FLOW_STEPS,
  INITIAL_STATE,
  flowReducer,
  hasMeaningfulData,
  stepIndex,
} from "./flow-state";
import { KioskClientForm } from "@/components/patterns/kiosk-client-form";
import { StepDatos, formatAppliedRate } from "./step-datos";
import { StepRevisionAutoservicio } from "./step-revision";

/** Simulated request round trip, so the "generando…" state is observable. */
const SUBMIT_MS = 700;

const KIOSK_HOME = "/kiosk/autoservicio";

export function CambioMonedaAutoservicioFlow(): React.JSX.Element {
  const router = useRouter();
  const [state, dispatch] = React.useReducer(flowReducer, INITIAL_STATE);
  const [cancelOpen, setCancelOpen] = React.useState(false);

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
    if (state.amountInput.trim() === "") return "Introduce el monto que vas a entregar.";
    if (parsedAmount === null) return "Introduce un monto válido.";
    if (parsedAmount <= 0) return "El monto debe ser mayor que cero.";
    return undefined;
  }, [state.amountInput, parsedAmount]);

  const canContinueFromDatos = Boolean(liveQuote && !amountError);
  const dirty = hasMeaningfulData(state);

  function requestCancel() {
    if (dirty) setCancelOpen(true);
    else router.push(KIOSK_HOME);
  }

  function confirmCancel() {
    setCancelOpen(false);
    router.push(KIOSK_HOME);
  }

  async function confirmRequest() {
    if (state.submitting || !state.quote) return;
    dispatch({ type: "submit-start" });
    await new Promise((resolve) => setTimeout(resolve, SUBMIT_MS));

    const request = registerSelfServiceRequest({
      service: "cambio-moneda",
      data: { quote: state.quote, client: state.client },
    });
    dispatch({ type: "submit-success", request });
  }

  const completed = state.step === "solicitud" && state.request;

  if (completed && state.quote && state.request) {
    return (
      <KioskRequestTicket
        code={state.request.code}
        createdAt={state.request.createdAt}
        expiresAt={state.request.expiresAt}
      >
        <TicketRow label="Servicio">Cambio de moneda</TicketRow>
        <TicketRow label="Entregas">
          <span className="flex items-center gap-2">
            <CurrencyFlag currency={state.quote.sourceCurrency} />
            {formatMoney({ amount: state.quote.sourceAmount, currency: state.quote.sourceCurrency })}
          </span>
        </TicketRow>
        <TicketRow label="Recibes">
          <span className="flex items-center gap-2">
            <CurrencyFlag currency={state.quote.destinationCurrency} />
            {formatMoney({
              amount: state.quote.destinationAmount,
              currency: state.quote.destinationCurrency,
            })}
          </span>
        </TicketRow>
        <TicketRow label="Tasa aplicada">{formatAppliedRate(state.quote)}</TicketRow>
        <TicketRow label="A nombre de">{kioskClientFullName(state.client)}</TicketRow>
      </KioskRequestTicket>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <h1 className="text-screen-title text-text-primary">Cambio de moneda</h1>
            <p className="mt-2 text-body text-text-secondary">
              {state.step === "datos"
                ? "Elige las monedas y el monto que quieres cambiar."
                : state.step === "cliente"
                  ? "Dinos a nombre de quién dejamos la solicitud."
                  : "Revisa todo antes de generar tu código."}
            </p>
          </div>
          <Button variant="secondary" className="shrink-0" onClick={requestCancel}>
            Cancelar
          </Button>
        </div>

        <Stepper steps={FLOW_STEPS} currentIndex={stepIndex(state.step)} className="mb-2" />

        {state.step === "datos" ? (
          <StepDatos
            sourceCurrency={state.sourceCurrency}
            destinationCurrency={state.destinationCurrency}
            amountInput={state.amountInput}
            quote={liveQuote}
            amountError={amountError}
            onSourceCurrencyChange={(currency) => dispatch({ type: "set-source-currency", currency })}
            onDestinationCurrencyChange={(currency) =>
              dispatch({ type: "set-destination-currency", currency })
            }
            onAmountChange={(value) => dispatch({ type: "set-amount", value })}
            onSwap={() => dispatch({ type: "swap-currencies" })}
          />
        ) : null}

        {state.step === "cliente" ? (
          <KioskClientForm
            formId="kiosco-cliente-form"
            title="¿A nombre de quién es esta solicitud?"
            description="Un trabajador verificará estos datos con tu documento en caja."
            client={state.client}
            onChange={(client) => dispatch({ type: "set-client", client })}
            onContinue={() => dispatch({ type: "go-to-step", step: "revision" })}
          />
        ) : null}

        {state.step === "revision" && state.quote ? (
          <StepRevisionAutoservicio quote={state.quote} client={state.client} />
        ) : null}

        <div className="mt-2 flex items-center justify-between gap-4 border-t border-border pt-6">
          {state.step !== "datos" ? (
            <Button
              variant="secondary"
              onClick={() =>
                dispatch({
                  type: "go-to-step",
                  step: state.step === "revision" ? "cliente" : "datos",
                })
              }
            >
              <ArrowLeft aria-hidden="true" />
              Volver
            </Button>
          ) : (
            <span aria-hidden="true" />
          )}

          {state.step === "datos" ? (
            <Button
              disabled={!canContinueFromDatos}
              onClick={() => liveQuote && dispatch({ type: "commit-quote", quote: liveQuote })}
            >
              Continuar
              <ArrowRight aria-hidden="true" />
            </Button>
          ) : null}

          {state.step === "cliente" ? (
            <Button type="submit" form="kiosco-cliente-form">
              Continuar a revisión
              <ArrowRight aria-hidden="true" />
            </Button>
          ) : null}

          {state.step === "revision" ? (
            <Button loading={state.submitting} onClick={() => void confirmRequest()}>
              {state.submitting ? null : <CircleCheck aria-hidden="true" />}
              {state.submitting ? "Generando…" : "Generar código"}
            </Button>
          ) : null}
        </div>
      </div>

      <KioskCancelDialog open={cancelOpen} onOpenChange={setCancelOpen} onConfirm={confirmCancel} />
    </>
  );
}
