"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CircleCheck } from "lucide-react";

import { Button } from "@/components/ui";
import { useIrArribaAlCambiarDePaso } from "@/lib/foco";
import { Stepper } from "@/components/patterns/stepper";
import { KioskCancelDialog } from "@/components/patterns/kiosk-cancel-dialog";
import { KioskClientForm } from "@/components/patterns/kiosk-client-form";
import { KioskRequestTicket, TicketRow } from "@/components/patterns/kiosk-request-ticket";
import { formatMoney, parseAmountInput } from "@/lib/format";
import { kioskClientFullName } from "@/features/kiosk/self-service-request";
import { cotizarGiroEnKiosco, errorDeGiro, resumenDeGiro, type GiroDeSede } from "@/features/kiosk/giro";
import { registrarSolicitud } from "../../_actions";
import { useHydrated } from "@/lib/use-hydrated";
import { findMunicipality, findProvince } from "@/features/geography/cuba-provinces";
import { FLOW_STEPS, INITIAL_STATE, flowReducer, hasMeaningfulData, stepIndex } from "./flow-state";
import { StepBeneficiario } from "./step-beneficiario";
import { StepMonto } from "./step-monto";
import { StepRevisionEnviarGiro } from "./step-revision";

/** Where this flow returns to on cancel — the Giros selector, mirroring the Worker's own GIROS_ROUTE convention. */
const GIROS_HOME = "/kiosk/autoservicio/giros";

/** La moneda con que abre: el peso si la sede envía en pesos, que es lo más pedido. */
function monedaInicial(giros: GiroDeSede): string {
  return giros.monedas.some((m) => m.code === "CUP") ? "CUP" : (giros.monedas[0]?.code ?? "");
}

export function EnviarGiroAutoservicioFlow({ giros }: { giros: GiroDeSede }): React.JSX.Element {
  const hydrated = useHydrated();
  const router = useRouter();
  const [state, dispatch] = React.useReducer(flowReducer, undefined, () => ({
    ...INITIAL_STATE,
    senderCurrency: monedaInicial(giros),
  }));
  const [cancelOpen, setCancelOpen] = React.useState(false);
  useIrArribaAlCambiarDePaso(state.step);

  const parsedAmount = parseAmountInput(state.amountInput);

  /* La cotización con la tarifa de PuntoCash; vacío no es un error, el botón
     ya está apagado. */
  const resultado = React.useMemo(
    () =>
      parsedAmount === null || state.amountInput.trim() === ""
        ? null
        : cotizarGiroEnKiosco(giros, state.senderCurrency, state.forma, parsedAmount),
    [giros, state.senderCurrency, state.forma, state.amountInput, parsedAmount],
  );
  const cotizacion = resultado?.ok ? resultado.value : null;
  const amountError =
    state.amountInput.trim() === ""
      ? undefined
      : parsedAmount === null
        ? "Escribe un monto válido."
        : resultado && !resultado.ok
          ? errorDeGiro(resultado, state.senderCurrency, state.forma)
          : undefined;

  const canContinueFromMonto = Boolean(cotizacion && !amountError);
  const dirty = hasMeaningfulData(state);

  function requestCancel() {
    if (dirty) setCancelOpen(true);
    else router.push(GIROS_HOME);
  }

  async function confirmRequest() {
    if (state.submitting || parsedAmount === null || !cotizacion) return;
    dispatch({ type: "submit-start" });

    const result = await registrarSolicitud({
      service: "giros-enviar",
      data: {
        sender: state.sender,
        beneficiary: state.beneficiary,
        senderCurrency: state.senderCurrency,
        deliveryAmount: parsedAmount,
        forma: state.forma,
        cotizacion: resumenDeGiro(cotizacion),
      },
    });
    if (!result.ok) {
      /* La tarifa cambió mientras el cliente escribía: vuelve al monto con la
         cuenta nueva, que trae el refresco. */
      if (result.motivo === "cotizacion-cambiada") dispatch({ type: "cotizacion-cambiada" });
      return router.refresh();
    }
    dispatch({ type: "submit-success", request: result.solicitud });
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
        {data.cotizacion ? (
          <>
            <TicketRow label="Recibe el beneficiario">
              {formatMoney({ amount: data.cotizacion.giro, currency: data.senderCurrency })}
            </TicketRow>
            <TicketRow label="Tarifa">
              {formatMoney({ amount: data.cotizacion.tarifa, currency: data.senderCurrency })}
            </TicketRow>
            <TicketRow label="Total a entregar">
              {formatMoney({ amount: data.cotizacion.total, currency: data.senderCurrency })}
            </TicketRow>
          </>
        ) : null}
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
                    ? "Elige la moneda y el monto. La tarifa es la que aplica la caja."
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
            monedas={giros.monedas}
            currency={state.senderCurrency}
            forma={state.forma}
            amountInput={state.amountInput}
            amountError={amountError}
            cotizacion={amountError ? null : cotizacion}
            cotizacionCambiada={state.cotizacionCambiada}
            onFormaChange={(forma) => dispatch({ type: "set-forma", forma })}
            onCurrencyChange={(currency) => dispatch({ type: "set-currency", currency })}
            onAmountChange={(value) => dispatch({ type: "set-amount", value })}
          />
        ) : null}

        {state.step === "revision" && cotizacion ? (
          <StepRevisionEnviarGiro
            sender={state.sender}
            beneficiary={state.beneficiary}
            senderCurrency={state.senderCurrency}
            cotizacion={cotizacion}
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

          {/* «Remitente» es el primer paso, así que este submit sí está en el
              primer pintado: queda cerrado hasta hidratar para que un toque
              temprano no haga un GET nativo que borre lo escrito. Los de los
              pasos siguientes no existen hasta después de hidratar, así que no
              necesitan la guarda. */}
          {state.step === "remitente" ? (
            <Button type="submit" form="giro-remitente-form" disabled={!hydrated}>
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
