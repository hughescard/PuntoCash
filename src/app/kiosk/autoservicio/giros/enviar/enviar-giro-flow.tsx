"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CircleCheck } from "lucide-react";

import { Button } from "@/components/ui";
import { Stepper } from "@/components/patterns/stepper";
import { KioskCancelDialog } from "@/components/patterns/kiosk-cancel-dialog";
import { KioskClientForm } from "@/components/patterns/kiosk-client-form";
import { KioskRequestTicket, TicketRow } from "@/components/patterns/kiosk-request-ticket";
import { formatMoney, parseAmountInput } from "@/lib/format";
import { kioskClientFullName, registerSelfServiceRequest } from "@/features/kiosk/self-service-request";
import { findMunicipality, findProvince } from "@/features/geography/cuba-provinces";
import { FLOW_STEPS, INITIAL_STATE, flowReducer, hasMeaningfulData, stepIndex } from "./flow-state";
import { StepBeneficiario } from "./step-beneficiario";
import { StepMonto } from "./step-monto";
import { StepRevisionEnviarGiro } from "./step-revision";

/** Simulated request round trip, so the "generando…" state is observable. */
const SUBMIT_MS = 700;

/** Where this flow returns to on cancel — the Giros selector, mirroring the Worker's own GIROS_ROUTE convention. */
const GIROS_HOME = "/kiosk/autoservicio/giros";

export function EnviarGiroAutoservicioFlow(): React.JSX.Element {
  const router = useRouter();
  const [state, dispatch] = React.useReducer(flowReducer, INITIAL_STATE);
  const [cancelOpen, setCancelOpen] = React.useState(false);

  const parsedAmount = parseAmountInput(state.amountInput);

  const amountError = React.useMemo(() => {
    if (state.amountInput.trim() === "") return "Introduce el monto que vas a entregar.";
    if (parsedAmount === null) return "Introduce un monto válido.";
    if (parsedAmount <= 0) return "El monto debe ser mayor que cero.";
    return undefined;
  }, [state.amountInput, parsedAmount]);

  const canContinueFromMonto = Boolean(state.senderCurrency && !amountError);
  const dirty = hasMeaningfulData(state);

  function requestCancel() {
    if (dirty) setCancelOpen(true);
    else router.push(GIROS_HOME);
  }

  async function confirmRequest() {
    if (state.submitting || parsedAmount === null || parsedAmount <= 0) return;
    dispatch({ type: "submit-start" });
    await new Promise((resolve) => setTimeout(resolve, SUBMIT_MS));

    const request = registerSelfServiceRequest({
      service: "giros-enviar",
      data: {
        sender: state.sender,
        beneficiary: state.beneficiary,
        senderCurrency: state.senderCurrency,
        deliveryAmount: parsedAmount,
      },
    });
    dispatch({ type: "submit-success", request });
  }

  const completed = state.step === "solicitud" && state.request && state.request.service === "giros-enviar";

  if (completed && state.request && state.request.service === "giros-enviar") {
    const { data } = state.request;
    const provinceLabel = findProvince(data.beneficiary.receiverProvince)?.label ?? data.beneficiary.receiverProvince;
    const municipalityLabel =
      findMunicipality(data.beneficiary.receiverProvince, data.beneficiary.receiverMunicipality)?.label ??
      data.beneficiary.receiverMunicipality;

    return (
      <KioskRequestTicket
        code={state.request.code}
        createdAt={state.request.createdAt}
        expiresAt={state.request.expiresAt}
      >
        <TicketRow label="Servicio">Enviar giro</TicketRow>
        <TicketRow label="Beneficiario">{data.beneficiary.receiverName}</TicketRow>
        <TicketRow label="Provincia / Municipio">
          {provinceLabel} / {municipalityLabel}
        </TicketRow>
        <TicketRow label="Monto a enviar">
          {formatMoney({ amount: data.deliveryAmount, currency: data.senderCurrency })}
        </TicketRow>
        <TicketRow label="Remitente">{kioskClientFullName(data.sender)}</TicketRow>
      </KioskRequestTicket>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <h1 className="text-screen-title text-text-primary">Enviar giro</h1>
            <p className="mt-2 text-body text-text-secondary">
              {state.step === "remitente"
                ? "Dinos quién envía el giro."
                : state.step === "beneficiario"
                  ? "Dinos quién va a cobrarlo."
                  : state.step === "monto"
                    ? "Elige la moneda y el monto a enviar."
                    : "Revisa todo antes de generar tu código."}
            </p>
          </div>
          <Button variant="secondary" className="shrink-0" onClick={requestCancel}>
            Cancelar
          </Button>
        </div>

        <Stepper steps={FLOW_STEPS} currentIndex={stepIndex(state.step)} className="mb-2" />

        {state.step === "remitente" ? (
          <KioskClientForm
            formId="giro-remitente-form"
            title="¿Quién envía este giro?"
            description="Un trabajador verificará estos datos con tu documento en caja."
            client={state.sender}
            onChange={(sender) => dispatch({ type: "set-sender", sender })}
            onContinue={() => dispatch({ type: "go-to-step", step: "beneficiario" })}
          />
        ) : null}

        {state.step === "beneficiario" ? (
          <StepBeneficiario
            formId="giro-beneficiario-form"
            beneficiary={state.beneficiary}
            onChange={(beneficiary) => dispatch({ type: "set-beneficiary", beneficiary })}
            onContinue={() => dispatch({ type: "go-to-step", step: "monto" })}
          />
        ) : null}

        {state.step === "monto" ? (
          <StepMonto
            currency={state.senderCurrency}
            amountInput={state.amountInput}
            amountError={amountError}
            onCurrencyChange={(currency) => dispatch({ type: "set-currency", currency })}
            onAmountChange={(value) => dispatch({ type: "set-amount", value })}
          />
        ) : null}

        {state.step === "revision" && parsedAmount !== null ? (
          <StepRevisionEnviarGiro
            sender={state.sender}
            beneficiary={state.beneficiary}
            senderCurrency={state.senderCurrency}
            deliveryAmount={parsedAmount}
          />
        ) : null}

        <div className="mt-2 flex items-center justify-between gap-4 border-t border-border pt-6">
          {state.step !== "remitente" ? (
            <Button
              variant="secondary"
              onClick={() =>
                dispatch({
                  type: "go-to-step",
                  step:
                    state.step === "revision"
                      ? "monto"
                      : state.step === "monto"
                        ? "beneficiario"
                        : "remitente",
                })
              }
            >
              <ArrowLeft aria-hidden="true" />
              Volver
            </Button>
          ) : (
            <span aria-hidden="true" />
          )}

          {state.step === "remitente" ? (
            <Button type="submit" form="giro-remitente-form">
              Continuar
              <ArrowRight aria-hidden="true" />
            </Button>
          ) : null}

          {state.step === "beneficiario" ? (
            <Button type="submit" form="giro-beneficiario-form">
              Continuar
              <ArrowRight aria-hidden="true" />
            </Button>
          ) : null}

          {state.step === "monto" ? (
            <Button
              disabled={!canContinueFromMonto}
              onClick={() => dispatch({ type: "go-to-step", step: "revision" })}
            >
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

      <KioskCancelDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        onConfirm={() => {
          setCancelOpen(false);
          router.push(GIROS_HOME);
        }}
      />
    </>
  );
}
