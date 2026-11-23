"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CircleCheck } from "lucide-react";

import { Button } from "@/components/ui";
import { Stepper } from "@/components/patterns/stepper";
import { KioskCancelDialog } from "@/components/patterns/kiosk-cancel-dialog";
import { KioskRequestTicket, TicketRow } from "@/components/patterns/kiosk-request-ticket";
import { CurrencyFlag } from "@/components/patterns/currency-flag";
import { formatAmount, formatMoney, parseAmountInput } from "@/lib/format";
import { cotizarEnKiosco, noSePuedeCobrar, type CambioDeSede } from "@/features/kiosk/cambio";
import { kioskClientFullName } from "@/features/kiosk/self-service-request";
import { registrarSolicitud } from "../_actions";
import {
  FLOW_STEPS,
  INITIAL_STATE,
  flowReducer,
  hasMeaningfulData,
  stepIndex,
} from "./flow-state";
import { KioskClientForm } from "@/components/patterns/kiosk-client-form";
import { KioskAvisoDeCaja } from "@/components/patterns/kiosk-aviso-de-caja";
import { StepDatos, formatAppliedRate } from "./step-datos";
import { StepRevisionAutoservicio } from "./step-revision";

const KIOSK_HOME = "/kiosk/autoservicio";

/**
 * El par con que abre el formulario: dólares a pesos si la sede los cambia,
 * que es el cambio más pedido; si no, la primera divisa contra el peso.
 */
function parInicial(cambio: CambioDeSede): { sourceCurrency: string; destinationCurrency: string } {
  const codigos = cambio.monedas.map((m) => m.code);
  const divisa = codigos.includes("USD") ? "USD" : (codigos.find((c) => c !== "CUP") ?? "USD");
  return { sourceCurrency: divisa, destinationCurrency: "CUP" };
}

export function CambioMonedaAutoservicioFlow({ cambio }: { cambio: CambioDeSede }): React.JSX.Element {
  const router = useRouter();
  const [state, dispatch] = React.useReducer(flowReducer, undefined, () => ({ ...INITIAL_STATE, ...parInicial(cambio) }));
  const [cancelOpen, setCancelOpen] = React.useState(false);

  const parsedAmount = parseAmountInput(state.amountInput);
  const pasoDeOrigen = cambio.pasos[state.sourceCurrency];

  const liveQuote = React.useMemo(() => {
    if (parsedAmount === null || parsedAmount <= 0) return null;
    return cotizarEnKiosco(cambio, state.modo, state.sourceCurrency, state.destinationCurrency, parsedAmount);
  }, [cambio, parsedAmount, state.modo, state.sourceCurrency, state.destinationCurrency]);

  /* Vacío no es un error: el botón ya está apagado. Se dice en cuanto hay algo
     escrito que no sirve. */
  const amountError = React.useMemo(() => {
    if (state.amountInput.trim() === "") return undefined;
    if (parsedAmount === null) return "Escribe un monto válido.";
    if (parsedAmount <= 0) return "El monto debe ser mayor que cero.";
    /* Lo que entrega el cliente se cobra en billetes y monedas. */
    if (state.modo === "cambiar" && noSePuedeCobrar(parsedAmount, pasoDeOrigen)) {
      const paso = pasoDeOrigen ?? 1;
      return `No se puede entregar en billetes: usa múltiplos de ${formatAmount(paso, Number.isInteger(paso) ? 0 : 2)} ${state.sourceCurrency}.`;
    }
    if (!liveQuote) return "Este monto es demasiado pequeño para cambiarlo.";
    return undefined;
  }, [state.amountInput, state.modo, state.sourceCurrency, parsedAmount, pasoDeOrigen, liveQuote]);

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

    const result = await registrarSolicitud({
      service: "cambio-moneda",
      data: {
        quote: state.quote,
        client: state.client,
        modo: state.modo,
        importePedido: parsedAmount ?? undefined,
      },
    });
    if (!result.ok) {
      /* La tasa cambió mientras el cliente escribía: vuelve al primer paso con
         las tasas nuevas, que trae el refresco. */
      if (result.motivo === "cotizacion-cambiada") dispatch({ type: "cotizacion-cambiada" });
      /* En cualquier otro caso el kiosco ya no puede atender esto: la pantalla
         se vuelve a pintar con lo que corresponda. */
      return router.refresh();
    }
    dispatch({ type: "submit-success", request: result.solicitud });
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
        <TicketRow label="Importante">
          <span className="font-normal text-text-secondary">
            La caja confirma la cifra al entregarte el dinero, según los billetes que tenga.
          </span>
        </TicketRow>
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
                ? "Elige las monedas y el monto. Usamos las tasas de hoy en esta sucursal."
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
            monedas={cambio.monedas}
            modo={state.modo}
            cotizacionCambiada={state.cotizacionCambiada}
            onModoChange={(modo) => dispatch({ type: "set-modo", modo })}
            sourceCurrency={state.sourceCurrency}
            destinationCurrency={state.destinationCurrency}
            amountInput={state.amountInput}
            /* Con un monto que no sirve no se enseña ninguna cifra: sería una
               promesa que la caja no podría cumplir. */
            quote={amountError ? null : liveQuote}
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
          <>
            <StepRevisionAutoservicio quote={state.quote} client={state.client} />
            <KioskAvisoDeCaja />
          </>
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
