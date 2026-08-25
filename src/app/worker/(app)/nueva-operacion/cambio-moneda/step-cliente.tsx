"use client";

import * as React from "react";
import {
  Calendar,
  CircleCheck,
  CircleHelp,
  IdCard,
  Loader2,
  Phone,
  QrCode,
  Search,
  UserRound,
} from "lucide-react";

import {
  Alert,
  Badge,
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
import { cn } from "@/lib/utils";
import { formatIsoDate } from "@/lib/format";
import {
  DOCUMENT_TYPES,
  createCustomer,
  customerFullName,
  customerInitials,
  documentTypeShortLabel,
  findCustomerByDocument,
  type Customer,
  type DocumentType,
  type NewCustomerInput,
} from "@/features/customers/customers";
import { SCAN_SCENARIOS, simulateDocumentScan } from "@/features/customers/document-scan";

type SearchMode = "manual" | "qr";
type LookupState =
  | { status: "idle" }
  | { status: "found"; customer: Customer }
  | { status: "not-found"; documentType: DocumentType; documentNumber: string }
  | { status: "registering"; documentType: DocumentType; documentNumber: string };

const DOC_TYPE: FieldSpec = { id: "tipo-documento", label: "Tipo de documento" };
const DOC_NUMBER: FieldSpec = { id: "numero-documento", label: "Número de documento" };

export function StepCliente({
  selectedCustomer,
  onSelectCustomer,
}: {
  selectedCustomer: Customer | null;
  onSelectCustomer: (customer: Customer) => void;
}): React.JSX.Element {
  const [mode, setMode] = React.useState<SearchMode>("manual");
  const [documentType, setDocumentType] = React.useState<DocumentType>("CI");
  const [documentNumber, setDocumentNumber] = React.useState("");
  const [numberError, setNumberError] = React.useState<string | undefined>();
  const [lookup, setLookup] = React.useState<LookupState>(
    selectedCustomer ? { status: "found", customer: selectedCustomer } : { status: "idle" },
  );
  const [scanning, setScanning] = React.useState(false);

  function runSearch(type: DocumentType, rawNumber: string) {
    const number = rawNumber.trim();
    if (!number) {
      setNumberError("Introduce el número de documento.");
      setLookup({ status: "idle" });
      return;
    }

    setNumberError(undefined);
    const customer = findCustomerByDocument(type, number);
    setLookup(
      customer
        ? { status: "found", customer }
        : { status: "not-found", documentType: type, documentNumber: number },
    );
  }

  async function runScan(scenario: (typeof SCAN_SCENARIOS)[number]["id"]) {
    setScanning(true);
    try {
      const scanned = await simulateDocumentScan(scenario);
      setDocumentType(scanned.documentType);
      setDocumentNumber(scanned.documentNumber);
      runSearch(scanned.documentType, scanned.documentNumber);
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
      {/* ---------------- Search panel ---------------- */}
      <Card className="self-start">
        <CardHeader>
          <div className="min-w-0">
            <CardTitle>1. Buscar cliente</CardTitle>
            <p className="mt-1 text-caption text-text-secondary">
              Selecciona cómo deseas identificar al cliente.
            </p>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {/* Stacked: at this column width two side-by-side options wrap mid-label. */}
          <div role="group" aria-label="Método de identificación" className="flex flex-col gap-3">
            <ModeButton
              active={mode === "qr"}
              onClick={() => setMode("qr")}
              icon={QrCode}
              title="Escanear QR"
              hint="del documento"
            />
            <ModeButton
              active={mode === "manual"}
              onClick={() => setMode("manual")}
              icon={IdCard}
              title="Introducir"
              hint="manualmente"
            />
          </div>

          {mode === "manual" ? (
            <>
              <Field {...DOC_TYPE}>
                <Select
                  value={documentType}
                  onValueChange={(value) => setDocumentType(value as DocumentType)}
                >
                  <SelectTrigger {...fieldAria(DOC_TYPE)}>
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

              <Field {...DOC_NUMBER} error={numberError}>
                <Input
                  {...fieldAria({ ...DOC_NUMBER, error: numberError })}
                  value={documentNumber}
                  onChange={(event) => setDocumentNumber(event.target.value)}
                  invalid={Boolean(numberError)}
                  placeholder="Ej. 90010112345"
                  autoComplete="off"
                />
              </Field>

              <Button block onClick={() => runSearch(documentType, documentNumber)}>
                <Search aria-hidden="true" />
                Buscar cliente
              </Button>
            </>
          ) : (
            <div className="flex flex-col gap-3">
              {/* Honest about being a simulation — no camera is opened (§11). */}
              <Alert variant="info" title="Lector no disponible en esta versión">
                Estas acciones simulan la lectura de un documento para probar el flujo.
              </Alert>

              {SCAN_SCENARIOS.map((scenario) => (
                <Button
                  key={scenario.id}
                  variant="secondary"
                  block
                  loading={scanning}
                  onClick={() => void runScan(scenario.id)}
                  className="justify-start text-left"
                >
                  <QrCode aria-hidden="true" />
                  {scenario.label}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ---------------- Result panel ---------------- */}
      <div className="flex flex-col gap-4">
        {scanning ? (
          <Card>
            <CardContent className="flex items-center gap-3 py-10 text-body text-text-secondary">
              <Loader2 className="size-5 animate-spin" aria-hidden="true" />
              Leyendo documento…
            </CardContent>
          </Card>
        ) : null}

        {!scanning && lookup.status === "idle" ? (
          <EmptyPrompt />
        ) : null}

        {!scanning && lookup.status === "found" ? (
          <FoundCustomer
            customer={lookup.customer}
            selected={selectedCustomer?.id === lookup.customer.id}
            onSelect={() => onSelectCustomer(lookup.customer)}
            onRegisterInstead={() =>
              setLookup({
                status: "registering",
                documentType,
                documentNumber: documentNumber.trim(),
              })
            }
          />
        ) : null}

        {!scanning && lookup.status === "not-found" ? (
          <NotFound
            documentNumber={lookup.documentNumber}
            onRegister={() =>
              setLookup({
                status: "registering",
                documentType: lookup.documentType,
                documentNumber: lookup.documentNumber,
              })
            }
          />
        ) : null}

        {!scanning && lookup.status === "registering" ? (
          <RegisterCustomer
            documentType={lookup.documentType}
            documentNumber={lookup.documentNumber}
            onCancel={() => setLookup({ status: "idle" })}
            onCreated={(customer) => {
              setLookup({ status: "found", customer });
              onSelectCustomer(customer);
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  icon: Icon,
  title,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof QrCode;
  title: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex items-start gap-2 rounded-control border p-3 text-left",
        "transition-colors duration-(--duration-fast) ease-(--ease-standard)",
        "outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-primary",
        active
          ? "border-gold bg-accent-subtle"
          : "border-border bg-surface hover:border-border-navy hover:bg-primary-subtle",
      )}
    >
      <Icon className="mt-0.5 size-[18px] shrink-0 text-primary" aria-hidden="true" />
      <span className="min-w-0">
        <span className="block text-label font-semibold text-text-primary">{title}</span>
        <span className="block text-caption text-text-secondary">{hint}</span>
      </span>
    </button>
  );
}

function EmptyPrompt() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
        <span
          aria-hidden="true"
          className="grid size-12 place-items-center rounded-control bg-primary-subtle text-primary"
        >
          <UserRound className="size-6" />
        </span>
        <p className="mt-2 text-section-title text-text-primary">Identifica al cliente</p>
        <p className="max-w-sm text-body text-text-secondary">
          Busca por número de documento o escanea el documento para continuar.
        </p>
      </CardContent>
    </Card>
  );
}

/** Read-only client card. Workers select clients; they never edit them (§12). */
function FoundCustomer({
  customer,
  selected,
  onSelect,
  onRegisterInstead,
}: {
  customer: Customer;
  selected: boolean;
  onSelect: () => void;
  onRegisterInstead: () => void;
}) {
  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex min-w-0 items-center gap-3">
            <span
              aria-hidden="true"
              className="grid size-9 shrink-0 place-items-center rounded-control border-2 border-success text-success"
            >
              <CircleCheck className="size-[18px]" />
            </span>
            <CardTitle>Cliente encontrado</CardTitle>
            {selected ? <Badge variant="success">Seleccionado</Badge> : null}
          </div>
        </CardHeader>

        <CardContent>
          <div className="rounded-card border border-border p-4">
            <div className="flex items-start gap-4">
              <span
                aria-hidden="true"
                className="grid size-12 shrink-0 place-items-center rounded-pill bg-info-subtle text-body font-semibold text-info-foreground"
              >
                {customerInitials(customer)}
              </span>
              <div className="min-w-0">
                <p className="text-section-title text-text-primary">
                  {customerFullName(customer)}
                </p>
                <p className="pc-numeric mt-0.5 text-body-sm text-text-secondary">
                  {documentTypeShortLabel(customer.documentType)} · {customer.documentNumber}
                </p>
                <p className="text-body-sm text-text-secondary">
                  Nacionalidad: {customer.nationality}
                </p>
              </div>
            </div>

            <dl className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
              <DetailRow icon={Phone} label="Teléfono" value={customer.phone} numeric />
              <DetailRow
                icon={Calendar}
                label="Fecha de nacimiento"
                value={formatIsoDate(customer.birthDate)}
              />
              <DetailRow icon={IdCard} label="Nacionalidad" value={customer.nationality} />
            </dl>

            <p className="mt-4 flex items-start gap-2 rounded-control border border-success-border bg-success-subtle px-3 py-2.5">
              <CircleCheck
                className="mt-px size-4 shrink-0 text-success-foreground"
                aria-hidden="true"
              />
              <span>
                <span className="block text-label font-semibold text-success-foreground">
                  Datos verificados
                </span>
                <span className="block text-caption text-text-secondary">
                  Cliente registrado en PuntoCash.
                </span>
              </span>
            </p>
          </div>

          <Button block className="mt-4" onClick={onSelect}>
            <UserRound aria-hidden="true" />
            {selected ? "Continuar con este cliente" : "Seleccionar cliente y continuar"}
          </Button>
        </CardContent>
      </Card>

      <NotTheRightClient onRegister={onRegisterInstead} />
    </>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  numeric = false,
}: {
  icon: typeof Phone;
  label: string;
  value: string;
  numeric?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="flex items-center gap-2 text-body-sm text-text-secondary">
        <Icon className="size-4 shrink-0" aria-hidden="true" />
        {label}
      </dt>
      <dd className={cn("text-body-sm text-text-primary", numeric && "pc-numeric")}>{value}</dd>
    </div>
  );
}

function NotTheRightClient({ onRegister }: { onRegister: () => void }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4 py-4">
        <p className="flex items-start gap-2">
          <CircleHelp className="mt-0.5 size-[18px] shrink-0 text-text-secondary" aria-hidden="true" />
          <span>
            <span className="block text-label font-semibold text-text-primary">
              ¿No encuentras al cliente?
            </span>
            <span className="block text-caption text-text-secondary">
              Puedes registrarlo como nuevo cliente.
            </span>
          </span>
        </p>
        <Button variant="secondary" size="sm" onClick={onRegister} className="shrink-0">
          Registrar nuevo cliente
        </Button>
      </CardContent>
    </Card>
  );
}

function NotFound({
  documentNumber,
  onRegister,
}: {
  documentNumber: string;
  onRegister: () => void;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
        <span
          aria-hidden="true"
          className="grid size-12 place-items-center rounded-control bg-warning-subtle text-warning-foreground"
        >
          <CircleHelp className="size-6" />
        </span>
        <p className="mt-2 text-section-title text-text-primary">Cliente no encontrado</p>
        <p className="max-w-md text-body text-text-secondary">
          No hay ningún cliente con el documento{" "}
          <span className="pc-numeric font-medium text-text-primary">{documentNumber}</span>.
          Puedes registrarlo para continuar con la operación.
        </p>
        <Button className="mt-4" onClick={onRegister}>
          Registrar nuevo cliente
        </Button>
      </CardContent>
    </Card>
  );
}

/* --------------------------- Registration form --------------------------- */

/** Exactly the approved base KYC set — no address, no extra fields (§13). */
const KYC_FIELDS = {
  documentType: { id: "reg-tipo-documento", label: "Tipo de documento", required: true },
  documentNumber: { id: "reg-numero-documento", label: "Número de documento", required: true },
  firstName: { id: "reg-nombre", label: "Nombre", required: true },
  firstSurname: { id: "reg-primer-apellido", label: "Primer apellido", required: true },
  secondSurname: { id: "reg-segundo-apellido", label: "Segundo apellido", required: true },
  birthDate: { id: "reg-fecha-nacimiento", label: "Fecha de nacimiento", required: true },
  phone: { id: "reg-telefono", label: "Teléfono", required: true },
  nationality: { id: "reg-nacionalidad", label: "Nacionalidad", required: true },
} as const satisfies Record<string, FieldSpec>;

type KycKey = keyof typeof KYC_FIELDS;

function RegisterCustomer({
  documentType,
  documentNumber,
  onCancel,
  onCreated,
}: {
  documentType: DocumentType;
  documentNumber: string;
  onCancel: () => void;
  onCreated: (customer: Customer) => void;
}) {
  const [values, setValues] = React.useState<Record<KycKey, string>>({
    documentType,
    documentNumber,
    firstName: "",
    firstSurname: "",
    secondSurname: "",
    birthDate: "",
    phone: "",
    nationality: "Cubana",
  });
  const [errors, setErrors] = React.useState<Partial<Record<KycKey, string>>>({});

  function set(key: KycKey, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: Partial<Record<KycKey, string>> = {};
    for (const key of Object.keys(KYC_FIELDS) as KycKey[]) {
      if (!values[key].trim()) nextErrors[key] = "Este dato es obligatorio.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const input: NewCustomerInput = {
      documentType: values.documentType as DocumentType,
      documentNumber: values.documentNumber.trim(),
      firstName: values.firstName.trim(),
      firstSurname: values.firstSurname.trim(),
      secondSurname: values.secondSurname.trim(),
      birthDate: values.birthDate,
      phone: values.phone.trim(),
      nationality: values.nationality.trim(),
    };

    onCreated(createCustomer(input));
  }

  return (
    <Card>
      <CardHeader>
        <div className="min-w-0">
          <CardTitle>Registrar nuevo cliente</CardTitle>
          <p className="mt-1 text-caption text-text-secondary">
            Datos mínimos requeridos por PuntoCash para cualquier operación.
          </p>
        </div>
      </CardHeader>

      <CardContent>
        <form noValidate onSubmit={submit} className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Field {...KYC_FIELDS.documentType} error={errors.documentType}>
              <Select
                value={values.documentType}
                onValueChange={(value) => set("documentType", value)}
              >
                <SelectTrigger {...fieldAria(KYC_FIELDS.documentType)}>
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

            <TextKycField
              spec={KYC_FIELDS.documentNumber}
              value={values.documentNumber}
              error={errors.documentNumber}
              onChange={(v) => set("documentNumber", v)}
            />
            <TextKycField
              spec={KYC_FIELDS.firstName}
              value={values.firstName}
              error={errors.firstName}
              onChange={(v) => set("firstName", v)}
            />
            <TextKycField
              spec={KYC_FIELDS.firstSurname}
              value={values.firstSurname}
              error={errors.firstSurname}
              onChange={(v) => set("firstSurname", v)}
            />
            <TextKycField
              spec={KYC_FIELDS.secondSurname}
              value={values.secondSurname}
              error={errors.secondSurname}
              onChange={(v) => set("secondSurname", v)}
            />
            <TextKycField
              spec={KYC_FIELDS.birthDate}
              value={values.birthDate}
              error={errors.birthDate}
              onChange={(v) => set("birthDate", v)}
              type="date"
            />
            <TextKycField
              spec={KYC_FIELDS.phone}
              value={values.phone}
              error={errors.phone}
              onChange={(v) => set("phone", v)}
              type="tel"
            />
            <TextKycField
              spec={KYC_FIELDS.nationality}
              value={values.nationality}
              error={errors.nationality}
              onChange={(v) => set("nationality", v)}
            />
          </div>

          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="tertiary" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit">Registrar y continuar</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function TextKycField({
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
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        invalid={Boolean(error)}
        autoComplete="off"
      />
    </Field>
  );
}
