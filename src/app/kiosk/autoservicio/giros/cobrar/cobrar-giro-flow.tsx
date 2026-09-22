"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, BadgeCheck, CircleCheck, KeyRound, Search } from "lucide-react";

import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Input } from "@/components/ui";
import { KioskRequestTicket, TicketRow } from "@/components/patterns/kiosk-request-ticket";
import { formatMoney } from "@/lib/format";
import { transferProvider, type TransferPayoutSnapshot } from "@/features/transfers/transfer-provider";
import { registerSelfServiceRequest, type KioskRequest } from "@/features/kiosk/self-service-request";

/** Where this flow returns to on cancel — the Giros selector. */
const GIROS_HOME = "/kiosk/autoservicio/giros";
const SUBMIT_MS = 600;

type Step = "codigo" | "revisar" | "solicitud";

/**
 * Cobrar giro — self-service preparation only.
 *
 * Same code-only lookup discipline as the Worker's own Cobrar giro screen and
 * the kiosk's own Cobrar remesa flow (Worker PRD R4): no name, phone or
 * province search, and every rejected lookup shows the same "Giro no
 * encontrado" regardless of why it failed. Finding a giro here never pays it
 * out — that still happens at a counter, where a Worker verifies the
 * beneficiary in person (R5) and revalidates the giro's status before
 * releasing any cash.
 */
export function CobrarGiroAutoservicioFlow(): React.JSX.Element {
  const router = useRouter();
  const [step, setStep] = React.useState<Step>("codigo");
  const [code, setCode] = React.useState("");
  const [searching, setSearching] = React.useState(false);
  const [notFound, setNotFound] = React.useState(false);
  const [transfer, setTransfer] = React.useState<TransferPayoutSnapshot | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [request, setRequest] = React.useState<KioskRequest | null>(null);

  async function search(event: React.FormEvent) {
    event.preventDefault();
    const entered = code.trim();
    if (!entered || searching) return;

    setSearching(true);
    setNotFound(false);
    const result = await transferProvider.findTransferByCode(entered);
    setSearching(false);

    if (!result.ok) {
      setTransfer(null);
      setNotFound(true);
      return;
    }
    setCode(entered);
    setTransfer(result.transfer);
    setStep("revisar");
  }

  async function generateRequest() {
    if (!transfer || submitting) return;
    setSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, SUBMIT_MS));

    const generated = registerSelfServiceRequest({
      service: "giros-cobrar",
      data: { code, transfer },
    });
    setSubmitting(false);
    setRequest(generated);
    setStep("solicitud");
  }

  if (step === "solicitud" && request && transfer) {
    return (
      <KioskRequestTicket code={request.code} createdAt={request.createdAt} expiresAt={request.expiresAt}>
        <TicketRow label="Servicio">Cobrar giro</TicketRow>
        <TicketRow label="Código">{code}</TicketRow>
        <TicketRow label="Beneficiario">{transfer.receiverName}</TicketRow>
        <TicketRow label="Monto a cobrar">
          {formatMoney({ amount: transfer.deliveryAmount, currency: transfer.payoutCurrency })}
        </TicketRow>
      </KioskRequestTicket>
    );
  }

  if (step === "revisar" && transfer) {
    return (
      <div className="flex flex-col gap-6">
        <FlowHeader
          title="Revisa tu giro"
          description="Confirma que estos datos son correctos antes de generar tu código."
          onCancel={() => router.push(GIROS_HOME)}
        />

        <Card>
          <CardContent className="flex flex-col gap-4 pt-6">
            <Row label="Beneficiario">
              <span className="font-semibold text-text-primary">{transfer.receiverName}</span>
            </Row>
            <hr className="border-t border-dashed border-border" />
            <Row label="Monto a cobrar">
              <span className="pc-numeric font-semibold text-text-primary">
                {formatMoney({ amount: transfer.deliveryAmount, currency: transfer.payoutCurrency })}
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
        title="Cobrar giro"
        description="Introduce el código que te dio el remitente para localizar tu giro."
        onCancel={() => router.push(GIROS_HOME)}
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
              <CardTitle>Código del giro</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <form noValidate onSubmit={(event) => void search(event)} className="flex flex-col gap-4">
              <Input
                id="giro-code"
                aria-label="Código del giro"
                size="lg"
                value={code}
                onChange={(event) => {
                  setCode(event.target.value);
                  if (notFound) setNotFound(false);
                }}
                placeholder="Ej. TR-260901-000245"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                invalid={notFound}
                aria-describedby={notFound ? "giro-code-error" : undefined}
              />

              {notFound ? (
                <Alert id="giro-code-error" variant="error" title="Giro no encontrado">
                  Verifica el código e inténtalo nuevamente.
                </Alert>
              ) : null}

              <Button type="submit" size="lg" block loading={searching} disabled={!code.trim()}>
                {searching ? null : <Search aria-hidden="true" />}
                {searching ? "Buscando…" : "Buscar giro"}
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
            <CheckItem>La persona que te envió el giro te lo comparte al registrarlo.</CheckItem>
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
