"use client";

import * as React from "react";
import { Loader2, QrCode, RotateCcw, UserRound } from "lucide-react";

import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Field,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  fieldAria,
  type FieldSpec,
} from "@/components/ui";
import { DOCUMENT_TYPES, type DocumentType } from "@/features/customers/customers";
import { simulateIdentityCardScan } from "@/features/customers/document-scan";
import type { KioskClientInput } from "@/features/kiosk/self-service-request";

/**
 * Self-entry contact form shared by every kiosk flow that needs to know who
 * to expect at the counter (Cambio de moneda, Giros · Enviar). The kiosk
 * never looks a client up or registers them as a `Customer`: it only collects
 * what a Worker needs to find and greet the right person. Real identity
 * verification stays a human act at the counter (Worker PRD R5), so this
 * form asks for less than the Worker's own KYC form and validates nothing
 * beyond "not empty".
 *
 * Scanning the carné's QR is an optional shortcut that pre-fills the document
 * and name fields; everything stays editable, and the phone (not on the card)
 * is always typed by the client.
 */
function fieldsFor(idPrefix: string) {
  return {
    documentType: { id: `${idPrefix}-tipo-documento`, label: "Tipo de documento", required: true },
    documentNumber: { id: `${idPrefix}-numero-documento`, label: "Número de documento", required: true },
    firstName: { id: `${idPrefix}-nombre`, label: "Nombre", required: true },
    firstSurname: { id: `${idPrefix}-primer-apellido`, label: "Primer apellido", required: true },
    secondSurname: { id: `${idPrefix}-segundo-apellido`, label: "Segundo apellido", required: false },
    phone: { id: `${idPrefix}-telefono`, label: "Teléfono", required: true },
  } as const satisfies Record<keyof KioskClientInput, FieldSpec>;
}

type FieldKey = keyof KioskClientInput;
type ScanState = "idle" | "scanning" | "done" | "failed";

export function KioskClientForm({
  formId,
  title,
  description,
  client,
  onChange,
  onContinue,
}: {
  /** Must be unique on the page — the flow's footer submit button targets it via `form={formId}`. */
  formId: string;
  title: string;
  description: string;
  client: KioskClientInput;
  onChange: (client: KioskClientInput) => void;
  onContinue: () => void;
}): React.JSX.Element {
  const fields = React.useMemo(() => fieldsFor(formId), [formId]);
  const [errors, setErrors] = React.useState<Partial<Record<FieldKey, string>>>({});
  const [scan, setScan] = React.useState<ScanState>("idle");

  // The scan resolves asynchronously; merge into the client as it is *then*,
  // not as it was when the button was pressed (the phone may have been typed meanwhile).
  const clientRef = React.useRef(client);
  React.useEffect(() => {
    clientRef.current = client;
  }, [client]);

  // Leaving the step mid-scan must stop waiting for the card.
  const abortRef = React.useRef<AbortController | null>(null);
  React.useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  function set<K extends FieldKey>(key: K, value: KioskClientInput[K]) {
    onChange({ ...client, [key]: value });
  }

  async function startScan() {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setScan("scanning");

    try {
      const result = await simulateIdentityCardScan(controller.signal);
      if (!result.ok) {
        setScan("failed");
        return;
      }
      const { card } = result;
      onChange({
        ...clientRef.current,
        documentType: card.documentType,
        documentNumber: card.documentNumber,
        firstName: card.firstName,
        firstSurname: card.firstSurname,
        secondSurname: card.secondSurname,
      });
      setErrors((prev) => ({
        phone: prev.phone,
      }));
      setScan("done");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      setScan("failed");
    }
  }

  function cancelScan() {
    abortRef.current?.abort();
    abortRef.current = null;
    setScan("idle");
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: Partial<Record<FieldKey, string>> = {};
    for (const key of Object.keys(fields) as FieldKey[]) {
      if (fields[key].required && !client[key].trim()) nextErrors[key] = "Este dato es obligatorio.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) onContinue();
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className="grid size-9 shrink-0 place-items-center rounded-control bg-primary-subtle text-primary"
          >
            <UserRound className="size-[18px]" />
          </span>
          <div className="min-w-0">
            <CardTitle>{title}</CardTitle>
            <p className="mt-1 text-body-sm text-text-secondary">{description}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        <ScanPanel state={scan} onScan={() => void startScan()} onCancel={cancelScan} />

        <form noValidate onSubmit={submit} className="flex flex-col gap-5" id={formId}>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Field {...fields.documentType} error={errors.documentType}>
              <Select
                value={client.documentType}
                onValueChange={(value) => set("documentType", value as DocumentType)}
              >
                <SelectTrigger size="lg" {...fieldAria(fields.documentType)}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <TextField
              spec={fields.documentNumber}
              value={client.documentNumber}
              error={errors.documentNumber}
              onChange={(v) => set("documentNumber", v)}
            />
            <TextField
              spec={fields.firstName}
              value={client.firstName}
              error={errors.firstName}
              onChange={(v) => set("firstName", v)}
            />
            <TextField
              spec={fields.firstSurname}
              value={client.firstSurname}
              error={errors.firstSurname}
              onChange={(v) => set("firstSurname", v)}
            />
            <TextField
              spec={fields.secondSurname}
              value={client.secondSurname}
              error={errors.secondSurname}
              onChange={(v) => set("secondSurname", v)}
            />
            <TextField
              spec={fields.phone}
              value={client.phone}
              error={errors.phone}
              onChange={(v) => set("phone", v)}
              type="tel"
            />
          </div>
        </form>

        <Alert variant="info" title="Tus datos no quedan registrados todavía">
          Solo se usan para identificar tu solicitud en caja.
        </Alert>
      </CardContent>
    </Card>
  );
}

/**
 * Optional QR shortcut. Four states, each announced in words (never by
 * colour alone): invitation, waiting for the card, read OK, read failed.
 */
function ScanPanel({
  state,
  onScan,
  onCancel,
}: {
  state: ScanState;
  onScan: () => void;
  onCancel: () => void;
}) {
  return (
    <div aria-live="polite" className="flex flex-col gap-2">
      {state === "idle" ? (
        <div className="flex flex-col gap-4 rounded-card border border-border bg-surface-subtle p-5 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <span
              aria-hidden="true"
              className="grid size-12 shrink-0 place-items-center rounded-control bg-accent-subtle text-primary"
            >
              <QrCode className="size-6" />
            </span>
            <div className="min-w-0">
              <p className="text-card-title font-semibold text-text-primary">¿Tienes carné de identidad?</p>
              <p className="mt-1 text-body-sm text-text-secondary">
                Escanea su código QR y completaremos tus datos. Es opcional: también puedes escribirlos.
              </p>
            </div>
          </div>
          <Button type="button" variant="secondary" size="lg" className="shrink-0" onClick={onScan}>
            <QrCode aria-hidden="true" />
            Escanear QR del carné
          </Button>
        </div>
      ) : null}

      {state === "scanning" ? (
        <div className="flex flex-col gap-4 rounded-card border border-border-navy bg-primary-subtle p-5 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <span
              aria-hidden="true"
              className="grid size-12 shrink-0 place-items-center rounded-control bg-surface text-primary"
            >
              <Loader2 className="size-6 animate-spin" />
            </span>
            <div className="min-w-0">
              <p className="text-card-title font-semibold text-text-primary">Esperando tu carné…</p>
              <p className="mt-1 text-body-sm text-text-secondary">
                Acerca el código QR del carné al lector del kiosco y mantenlo quieto.
              </p>
            </div>
          </div>
          <Button type="button" variant="tertiary" size="lg" className="shrink-0" onClick={onCancel}>
            Cancelar escaneo
          </Button>
        </div>
      ) : null}

      {state === "done" ? (
        <Alert
          variant="success"
          title="Datos cargados desde tu carné"
          action={
            <Button type="button" variant="tertiary" size="sm" onClick={onScan}>
              <RotateCcw aria-hidden="true" />
              Escanear de nuevo
            </Button>
          }
        >
          Revisa que sean correctos y añade tu teléfono.
        </Alert>
      ) : null}

      {state === "failed" ? (
        <Alert
          variant="warning"
          title="No pudimos leer el código"
          action={
            <Button type="button" variant="tertiary" size="sm" onClick={onScan}>
              <RotateCcw aria-hidden="true" />
              Reintentar
            </Button>
          }
        >
          Inténtalo de nuevo o escribe tus datos a continuación.
        </Alert>
      ) : null}

      {/* Honest about being a simulation — no reader is opened (see document-scan.ts). */}
      <p className="text-caption text-text-secondary">
        Versión de demostración: la lectura del QR se simula y no usa ningún lector real.
      </p>
    </div>
  );
}

function TextField({
  spec,
  value,
  error,
  onChange,
  type = "text",
}: {
  spec: FieldSpec;
  value: string;
  error: string | undefined;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <Field {...spec} error={error}>
      <Input
        {...fieldAria({ ...spec, error })}
        size="lg"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        invalid={Boolean(error)}
        autoComplete="off"
      />
    </Field>
  );
}
