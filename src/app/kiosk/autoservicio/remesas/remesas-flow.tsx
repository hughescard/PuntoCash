"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, BadgeCheck, CircleCheck, KeyRound, Search } from "lucide-react";

import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
} from "@/components/ui";
import { KioskRequestTicket, TicketRow } from "@/components/patterns/kiosk-request-ticket";
import { formatMoney } from "@/lib/format";
import { remittanceProvider, type RemittanceSnapshot } from "@/features/remittances/remittance-provider";
import { registerSelfServiceRequest, type KioskRequest } from "@/features/kiosk/self-service-request";

const KIOSK_HOME = "/kiosk/autoservicio";
const SUBMIT_MS = 600;

type Step = "codigo" | "revisar" | "solicitud";

/**
 * Cobrar remesa — self-service preparation only.
 *
 * The lookup is code-only, exactly like the Worker's own Cobrar giro/remesa
 * screens (Worker PRD R4): no name, phone or amount search, and every
 * rejected lookup shows the same "Remesa no encontrada" regardless of why it
 * failed. Finding a remittance here never pays it out — that still happens at
 * a counter, where a Worker can verify the beneficiary in person (R5).
 */
export function RemesasAutoservicioFlow(): React.JSX.Element {
  const router = useRouter();
  const [step, setStep] = React.useState<Step>("codigo");
  const [code, setCode] = React.useState("");
  const [searching, setSearching] = React.useState(false);
  const [notFound, setNotFound] = React.useState(false);
  const [remittance, setRemittance] = React.useState<RemittanceSnapshot | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [request, setRequest] = React.useState<KioskRequest | null>(null);

  async function search(event: React.FormEvent) {
    event.preventDefault();
    const entered = code.trim();
    if (!entered || searching) return;

    setSearching(true);
    setNotFound(false);
    const result = await remittanceProvider.findByCode(entered);
    setSearching(false);

    if (!result.ok) {
      setRemittance(null);
      setNotFound(true);
      return;
    }
    setCode(entered);
    setRemittance(result.remittance);
    setStep("revisar");
  }

  async function generateRequest() {
    if (!remittance || submitting) return;
    setSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, SUBMIT_MS));

    const generated = registerSelfServiceRequest({
      service: "remesas",
      data: { code, remittance },
    });
    setSubmitting(false);
    setRequest(generated);
    setStep("solicitud");
  }

  if (step === "solicitud" && request && remittance) {
    return (
      <KioskRequestTicket code={request.code} createdAt={request.createdAt} expiresAt={request.expiresAt}>
        <TicketRow label="Servicio">Cobrar remesa</TicketRow>
        <TicketRow label="Código">{code}</TicketRow>
        <TicketRow label="Beneficiario">{remittance.receiverName}</TicketRow>
        <TicketRow label="Monto a cobrar">
          {formatMoney({ amount: remittance.deliveryAmount, currency: remittance.payoutCurrency })}
        </TicketRow>
      </KioskRequestTicket>
    );
  }

  if (step === "revisar" && remittance) {
    return (
      <div className="flex flex-col gap-6">
        <FlowHeader
          title="Revisa tu remesa"
          description="Confirma que estos datos son correctos antes de generar tu código."
          onCancel={() => router.push(KIOSK_HOME)}
        />

        <Card>
          <CardContent className="flex flex-col gap-4 pt-6">
            <Row label="Beneficiario">
              <span className="font-semibold text-text-primary">{remittance.receiverName}</span>
            </Row>
            <hr className="border-t border-dashed border-border" />
            <Row label="Monto a cobrar">
              <span className="pc-numeric font-semibold text-text-primary">
                {formatMoney({ amount: remittance.deliveryAmount, currency: remittance.payoutCurrency })}
              </span>
            </Row>
          </CardContent>
        </Card>

        <Alert variant="info" title="Presenta tu documento en caja">
          El trabajador confirmará tu identidad antes de entregarte el efectivo.
        </Alert>

        <div className="mt-2 flex items-center justify-between gap-4 border-t border-border pt-6">
          <Button variant="secondary" onClick={() => setStep("codigo")}>
            <ArrowLeft aria-hidden="true" />
            Volver
          </Button>
          <Button loading={submitting} onClick={() => void generateRequest()}>
            {submitting ? null : <CircleCheck aria-hidden="true" />}
            {submitting ? "Generando…" : "Generar código"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <FlowHeader
        title="Cobrar remesa"
        description="Introduce el código que te dieron para localizar tu remesa."
        onCancel={() => router.push(KIOSK_HOME)}
      />

      <div className="grid grid-cols-1 items-start gap-6 wide:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex min-w-0 items-center gap-3">
              <span
                aria-hidden="true"
                className="grid size-9 shrink-0 place-items-center rounded-control bg-primary-subtle text-primary"
              >
                <KeyRound className="size-[18px]" />
              </span>
              <CardTitle>Código de la remesa</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <form noValidate onSubmit={(event) => void search(event)} className="flex flex-col gap-4">
              <Input
                id="remesa-code"
                aria-label="Código de la remesa"
                size="lg"
                value={code}
                onChange={(event) => {
                  setCode(event.target.value);
                  if (notFound) setNotFound(false);
                }}
                placeholder="Ej. RM-7X82-9KLM"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                invalid={notFound}
                aria-describedby={notFound ? "remesa-code-error" : undefined}
              />

              {notFound ? (
                <Alert id="remesa-code-error" variant="error" title="Remesa no encontrada">
                  Verifica el código e inténtalo nuevamente.
                </Alert>
              ) : null}

              <Button type="submit" size="lg" block loading={searching} disabled={!code.trim()}>
                {searching ? null : <Search aria-hidden="true" />}
                {searching ? "Buscando…" : "Buscar remesa"}
                {!searching ? <ArrowRight aria-hidden="true" /> : null}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>¿Dónde consigo el código?</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 pt-0">
            <CheckItem>La persona que te envió el dinero te lo comparte al crear la remesa.</CheckItem>
            <CheckItem>El código es tu única credencial: no lo compartas con nadie más.</CheckItem>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CheckItem({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-3 text-body-sm text-text-primary">
      <span
        aria-hidden="true"
        className="grid size-7 shrink-0 place-items-center rounded-control bg-primary-subtle text-primary"
      >
        <BadgeCheck className="size-4" />
      </span>
      {children}
    </p>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-body-sm text-text-secondary">{label}</span>
      {children}
    </div>
  );
}

function FlowHeader({
  title,
  description,
  onCancel,
}: {
  title: string;
  description: string;
  onCancel: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-6">
      <div className="min-w-0">
        <h1 className="text-screen-title text-text-primary">{title}</h1>
        <p className="mt-2 text-body text-text-secondary">{description}</p>
      </div>
      <Button variant="secondary" className="shrink-0" onClick={onCancel}>
        Cancelar
      </Button>
    </div>
  );
}
