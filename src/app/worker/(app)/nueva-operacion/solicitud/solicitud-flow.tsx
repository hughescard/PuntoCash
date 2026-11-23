"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { ArrowLeft, ArrowRight, Search, TicketCheck } from "lucide-react";

import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Field,
  fieldAria,
  Input,
  type FieldSpec,
} from "@/components/ui";
import { formatDateTime, formatMoney } from "@/lib/format";
import { findMunicipality, findProvince } from "@/features/geography/cuba-provinces";
import {
  kioskClientFullName,
  setPendingWorkerHandoff,
  type KioskRequest,
  type KioskRequestService,
} from "@/features/kiosk/self-service-request";
import type { MotivoDeSolicitudNoValida } from "@/features/network/solicitudes-de-kiosco";
import {
  canjearSolicitudDeKioscoAction,
  consultarSolicitudDeKioscoAction,
  type SolicitudDeKioscoLeida,
} from "../../../_actions";

const CATALOG_ROUTE = "/worker/nueva-operacion";

/* El código se resuelve desde su etiqueta visible, no desde un `aria-label`
   (**FR-A11Y-1**, manual §15: «placeholders no sustituyen labels»). */
const CODIGO: FieldSpec = {
  id: "kiosk-request-code",
  label: "Código de solicitud",
};

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
    body: "Al continuar se cotiza con la tasa de ahora y pasas directo a identificar al cliente: compara su documento y selecciónalo. Después, el efectivo.",
  },
  remesas: {
    title: "Verifica la identidad del beneficiario",
    body: "La remesa se localiza automáticamente. Pide el documento del beneficiario y comprueba que coincide antes de entregar el efectivo.",
  },
  "giros-enviar": {
    title: "Identifica al remitente y recibe el efectivo",
    body: "Comprueba el documento del remitente y selecciónalo. El resto del giro ya está completo: pasas directo a cobrar el efectivo con la tarifa de ahora.",
  },
  "giros-cobrar": {
    title: "Compara el carné con la persona",
    body: "El giro se localiza automáticamente. Comprueba que la foto del carné corresponde al beneficiario y entrega el efectivo.",
  },
};

const LOOKUP_ERROR: Record<MotivoDeSolicitudNoValida, { title: string; body: (sede?: string) => string }> = {
  "no-encontrada": {
    title: "Código no encontrado",
    body: () => "Verifica el código con el cliente. Los códigos de kiosco empiezan por KS-.",
  },
  "otra-sede": {
    title: "Esta solicitud es de otra sucursal",
    body: (sede) =>
      `Se preparó en el kiosco de ${sede ?? "otra sucursal"} y solo se atiende allí. Puedes iniciar la operación manualmente.`,
  },
  vencida: {
    title: "Esta solicitud ya venció",
    body: () =>
      "Las solicitudes caducan a los 30 minutos. El cliente puede generar una nueva en el kiosco o puedes iniciar la operación manualmente.",
  },
  usada: {
    title: "Esta solicitud ya fue utilizada",
    body: () => "Este código ya fue atendido en caja y no puede usarse de nuevo.",
  },
};

/**
 * "Buscar solicitud" — the link between the self-service kiosk and the
 * counter. The worker types the client's `KS-…` code, sees what the client
 * already prepared, and continues into the matching operation with that data
 * prefilled, so nothing is typed twice.
 *
 * Solo encuentra solicitudes preparadas en un kiosco de la sede de esta caja.
 * Continuar la gasta en la red (un código, una visita a caja) y pasa los datos
 * al flujo de destino en memoria; ese flujo sigue haciendo todas sus
 * comprobaciones (jornada, efectivo, confirmación del proveedor).
 */
export function SolicitudFlow(): React.JSX.Element {
  const router = useRouter();
  const [code, setCode] = React.useState("");
  const [searching, setSearching] = React.useState(false);
  const [result, setResult] = React.useState<SolicitudDeKioscoLeida | null>(null);
  const [continuing, setContinuing] = React.useState(false);

  async function search(event: React.FormEvent) {
    event.preventDefault();
    const entered = code.trim();
    if (!entered || searching) return;
    setSearching(true);
    setResult(null);
    setResult(await consultarSolicitudDeKioscoAction(entered));
    setSearching(false);
  }

  /* Al continuar se gasta en la red, y se vuelve a comprobar: si entretanto
     venció o la atendió otra caja, se dice aquí en vez de abrir el flujo. */
  async function continueWith(request: KioskRequest) {
    if (continuing) return;
    setContinuing(true);
    const canje = await canjearSolicitudDeKioscoAction(request.code);
    if (!canje.ok) {
      setResult(canje);
      setContinuing(false);
      return;
    }
    setPendingWorkerHandoff(canje.solicitud);
    router.push(TARGET[canje.solicitud.service].route);
  }

  const found = result?.ok ? result.solicitud : null;
  const error = result && !result.ok ? LOOKUP_ERROR[result.motivo] : null;
  const errorBody = result && !result.ok ? error?.body(result.sede) : null;

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
          <form noValidate onSubmit={search} className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <Field {...CODIGO} className="flex-1">
              <Input
                {...fieldAria(CODIGO)}
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
            </Field>
            <Button type="submit" loading={searching} disabled={!code.trim()}>
              {searching ? null : <Search aria-hidden="true" />}
              {searching ? "Buscando…" : "Buscar solicitud"}
            </Button>
          </form>

          {error ? (
            <Alert id="kiosk-request-error" variant="error" title={error.title} className="mt-4">
              {errorBody}
            </Alert>
          ) : null}
        </CardContent>
      </Card>

      {found ? (
        <RequestSummary request={found} continuing={continuing} onContinue={() => void continueWith(found)} />
      ) : null}
    </div>
  );
}

function RequestSummary({
  request,
  continuing,
  onContinue,
}: {
  request: KioskRequest;
  continuing: boolean;
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
        <Button onClick={onContinue} loading={continuing}>
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
      const { quote, client, modo, importePedido } = request.data;
      const entrega = formatMoney({ amount: quote.sourceAmount, currency: quote.sourceCurrency });
      const recibe = formatMoney({
        amount: modo === "recibir" ? (importePedido ?? quote.destinationAmount) : quote.destinationAmount,
        currency: quote.destinationCurrency,
      });
      /* Lo que el cliente fijó es lo que se mantiene al volver a cotizar; lo
         otro sale de la tasa del momento. */
      return [
        ["Cliente", kioskClientFullName(client)],
        ["Documento", client.documentNumber],
        modo === "recibir" ? ["Quiere recibir", recibe] : ["Cliente entrega", entrega],
        modo === "recibir" ? ["Entregaría (con la tasa del kiosco)", entrega] : ["Recibiría (con la tasa del kiosco)", recibe],
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
      const { sender, beneficiary, senderCurrency, deliveryAmount, cotizacion } = request.data;
      const m = (amount: number) => formatMoney({ amount, currency: senderCurrency });
      const province = findProvince(beneficiary.receiverProvince)?.label ?? beneficiary.receiverProvince;
      const municipality =
        findMunicipality(beneficiary.receiverProvince, beneficiary.receiverMunicipality)?.label ??
        beneficiary.receiverMunicipality;
      return [
        ["Remitente", kioskClientFullName(sender)],
        ["Documento del remitente", sender.documentNumber],
        ["Beneficiario", beneficiary.receiverName],
        ["Provincia / Municipio", `${province} / ${municipality}`],
        ...((cotizacion
          ? [
              ["Recibe el beneficiario", m(cotizacion.giro)],
              ["Total a entregar (con la tarifa del kiosco)", m(cotizacion.total)],
            ]
          : [["Importe a enviar", m(deliveryAmount)]]) as [string, string][]),
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
