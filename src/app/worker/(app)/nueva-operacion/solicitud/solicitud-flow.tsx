"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { ArrowLeft, ArrowRight, Lock, Search, TicketCheck } from "lucide-react";

import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Input } from "@/components/ui";
import { formatDateTime, formatMoney } from "@/lib/format";
import { hasOpenJornada } from "@/features/caja/caja-data";
import { findMunicipality, findProvince } from "@/features/geography/cuba-provinces";
import {
  findSelfServiceRequestByCode,
  kioskClientFullName,
  markSelfServiceRequestConsumed,
  setPendingWorkerHandoff,
  type KioskRequest,
  type KioskRequestService,
  type SelfServiceLookupResult,
} from "@/features/kiosk/self-service-request";

const CATALOG_ROUTE = "/worker/nueva-operacion";

/** Where each kind of kiosk request is completed. */
const TARGET: Record<KioskRequestService, { label: string; route: Route }> = {
  "cambio-moneda": { label: "Cambio de moneda", route: "/worker/nueva-operacion/cambio-moneda" },
  remesas: { label: "Cobrar remesa", route: "/worker/nueva-operacion/remesas" },
  "giros-enviar": { label: "Enviar giro", route: "/worker/nueva-operacion/giros/enviar" },
  "giros-cobrar": { label: "Cobrar giro", route: "/worker/nueva-operacion/giros/cobrar" },
};

/** What the worker still has to do at the counter, per service. */
const NEXT_STEP: Record<KioskRequestService, { title: string; body: string }> = {
  "cambio-moneda": {
    title: "Verifica el documento del cliente",
    body: "La tasa se recalcula al continuar. El cliente se busca automáticamente: compara su documento y selecciónalo.",
  },
  remesas: {
    title: "Verifica la identidad del beneficiario",
    body: "La remesa se localiza automáticamente. Pide el documento del beneficiario y comprueba que coincide antes de entregar el efectivo.",
  },
  "giros-enviar": {
    title: "Recibe el efectivo",
    body: "Los datos del giro ya están completos. Cobra el importe al cliente y confirma el envío.",
  },
  "giros-cobrar": {
    title: "Compara el carné con la persona",
    body: "El giro se localiza automáticamente. Comprueba que la foto del carné corresponde al beneficiario y entrega el efectivo.",
  },
};

const LOOKUP_ERROR: Record<Exclude<SelfServiceLookupResult, { ok: true }>["reason"], { title: string; body: string }> = {
  "not-found": {
    title: "Solicitud no encontrada",
    body: "Verifica el código con el cliente. Los códigos de kiosco empiezan por KS-.",
  },
  expired: {
    title: "Solicitud vencida",
    body: "Las solicitudes caducan a los 30 minutos. El cliente puede generar una nueva en el kiosco o puedes iniciar la operación manualmente.",
  },
  consumed: {
    title: "Solicitud ya utilizada",
    body: "Este código ya fue atendido en caja y no puede usarse de nuevo.",
  },
};

/**
 * "Buscar solicitud" — the link between the self-service kiosk and the
 * counter. The worker types the client's `KS-…` code, sees what the client
 * already prepared, and continues into the matching operation with that data
 * prefilled, so nothing is typed twice.
 *
 * Continuing marks the request as used (one code, one counter visit) and
 * hands the data to the target flow in memory; that flow still runs every one
 * of its own checks (jornada, cash, provider confirmation).
 */
export function SolicitudFlow(): React.JSX.Element {
  const router = useRouter();
  const [blocked] = React.useState(() => !hasOpenJornada());
  const [code, setCode] = React.useState("");
  const [searching, setSearching] = React.useState(false);
  const [result, setResult] = React.useState<SelfServiceLookupResult | null>(null);

  async function search(event: React.FormEvent) {
    event.preventDefault();
    const entered = code.trim();
    if (!entered || searching) return;
    setSearching(true);
    setResult(null);
    // Simulated round trip, so the loading state is observable.
    await new Promise((resolve) => setTimeout(resolve, 300));
    setResult(findSelfServiceRequestByCode(entered));
    setSearching(false);
  }

  function continueWith(request: KioskRequest) {
    markSelfServiceRequestConsumed(request.code);
    setPendingWorkerHandoff(request);
    router.push(TARGET[request.service].route);
  }

  if (blocked) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
        <BackLink />
        <Card>
          <CardContent className="flex flex-col items-center px-8 py-12 text-center">
            <span className="grid size-12 place-items-center rounded-control bg-primary-subtle text-primary">
              <Lock aria-hidden="true" />
            </span>
            <h1 className="mt-5 text-screen-title text-text-primary">Caja cerrada</h1>
            <p className="mt-2 text-body text-text-secondary">
              Debes abrir una jornada antes de atender una solicitud del kiosco.
            </p>
            <Button className="mt-6" asChild>
              <Link href="/worker/caja">Ir a Caja</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const found = result?.ok ? result.request : null;
  const error = result && !result.ok ? LOOKUP_ERROR[result.reason] : null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <BackLink />

      <div>
        <h1 className="text-screen-title text-text-primary">Solicitud de kiosco</h1>
        <p className="mt-2 text-body text-text-secondary">
          Introduce el código que el cliente generó en el kiosco de autoservicio.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form noValidate onSubmit={search} className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex-1">
              <Input
                id="kiosk-request-code"
                aria-label="Código de solicitud"
                value={code}
                onChange={(event) => {
                  setCode(event.target.value);
                  if (result) setResult(null);
                }}
                placeholder="Ej. KS-260915-000101"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                invalid={Boolean(error)}
                aria-describedby={error ? "kiosk-request-error" : undefined}
              />
            </div>
            <Button type="submit" loading={searching} disabled={!code.trim()}>
              {searching ? null : <Search aria-hidden="true" />}
              {searching ? "Buscando…" : "Buscar solicitud"}
            </Button>
          </form>

          {error ? (
            <Alert id="kiosk-request-error" variant="error" title={error.title} className="mt-4">
              {error.body}
            </Alert>
          ) : null}
        </CardContent>
      </Card>

      {found ? <RequestSummary request={found} onContinue={() => continueWith(found)} /> : null}
    </div>
  );
}

function RequestSummary({
  request,
  onContinue,
}: {
  request: KioskRequest;
  onContinue: () => void;
}): React.JSX.Element {
  const target = TARGET[request.service];
  const next = NEXT_STEP[request.service];

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex min-w-0 items-center gap-3">
            <span
              aria-hidden="true"
              className="grid size-9 shrink-0 place-items-center rounded-control bg-primary-subtle text-primary"
            >
              <TicketCheck className="size-[18px]" />
            </span>
            <div className="min-w-0">
              <CardTitle>{target.label}</CardTitle>
              <p className="mt-1 text-body-sm text-text-secondary">
                {request.code} · válida hasta {formatDateTime(new Date(request.expiresAt))}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <dl className="grid gap-4 sm:grid-cols-2">
            {summaryRows(request).map(([label, value]) => (
              <div key={label} className="border-b border-border pb-3">
                <dt className="text-caption text-text-secondary">{label}</dt>
                <dd className="mt-1 text-body font-medium text-text-primary">{value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <Alert variant={request.service === "giros-enviar" ? "info" : "warning"} title={next.title}>
        {next.body}
      </Alert>

      <div className="flex justify-end">
        <Button onClick={onContinue}>
          Continuar con {target.label.toLowerCase()}
          <ArrowRight aria-hidden="true" />
        </Button>
      </div>
    </>
  );
}

function summaryRows(request: KioskRequest): [string, string][] {
  switch (request.service) {
    case "cambio-moneda": {
      const { quote, client } = request.data;
      return [
        ["Cliente", kioskClientFullName(client)],
        ["Documento", client.documentNumber],
        ["Cliente entrega", formatMoney({ amount: quote.sourceAmount, currency: quote.sourceCurrency })],
        [
          "Cliente recibe (referencial)",
          formatMoney({ amount: quote.destinationAmount, currency: quote.destinationCurrency }),
        ],
      ];
    }
    case "remesas": {
      const { code, remittance } = request.data;
      return [
        ["Código de remesa", code],
        ["Beneficiario", remittance.receiverName],
        ["Importe a entregar", formatMoney({ amount: remittance.deliveryAmount, currency: remittance.payoutCurrency })],
      ];
    }
    case "giros-enviar": {
      const { sender, beneficiary, senderCurrency, deliveryAmount } = request.data;
      const province = findProvince(beneficiary.receiverProvince)?.label ?? beneficiary.receiverProvince;
      const municipality =
        findMunicipality(beneficiary.receiverProvince, beneficiary.receiverMunicipality)?.label ??
        beneficiary.receiverMunicipality;
      return [
        ["Remitente", kioskClientFullName(sender)],
        ["Documento del remitente", sender.documentNumber],
        ["Beneficiario", beneficiary.receiverName],
        ["Provincia / Municipio", `${province} / ${municipality}`],
        ["Importe a enviar", formatMoney({ amount: deliveryAmount, currency: senderCurrency })],
      ];
    }
    case "giros-cobrar": {
      const { code, transfer } = request.data;
      return [
        ["Código del giro", code],
        ["Beneficiario", transfer.receiverName],
        ["Importe a entregar", formatMoney({ amount: transfer.deliveryAmount, currency: transfer.payoutCurrency })],
      ];
    }
    default: {
      const exhaustive: never = request;
      return exhaustive;
    }
  }
}

function BackLink() {
  return (
    <Link
      href={CATALOG_ROUTE}
      className="inline-flex w-fit items-center gap-2 rounded-control text-label font-medium text-text-secondary transition-colors hover:text-text-primary outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      Volver a Nueva operación
    </Link>
  );
}
