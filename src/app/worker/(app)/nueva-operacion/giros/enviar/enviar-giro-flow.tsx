"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  CalendarClock,
  Check,
  ChevronDown,
  Lock,
  Send,
  User,
  UserRound,
  Wallet,
} from "lucide-react";

import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  Input,
  ReadOnlyValue,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  fieldAria,
  type FieldSpec,
} from "@/components/ui";
import { CurrencyFlag } from "@/components/patterns/currency-flag";
import { cn } from "@/lib/utils";
import { DOCUMENT_TYPES, type DocumentType } from "@/features/customers/customers";
import { getCurrentWorker } from "@/features/worker/session";
import { PROVINCE_CATALOG, getMunicipalitiesForProvince } from "@/features/geography/cuba-provinces";
import { CAJA_BALANCES, CAJA_SUMMARY, findCajaCurrency, hasOpenJornada } from "@/features/caja/caja-data";
import { formatAmount } from "@/lib/format";
import {
  birthDateFromCubanId,
  clearPendingWorkerHandoff,
  readPendingWorkerHandoff,
} from "@/features/kiosk/self-service-request";
import { EMPTY_BENEFICIARY, EMPTY_SENDER, type GiroDraft, type GiroFormValues } from "./giro-types";
import { NO_ERRORS, hasAnyError, municipalityLabel, provinceLabel, validateGiroForm } from "./giro-validation";
import { GiroConfirmation, GiroReview } from "./giro-review-confirm";
import { GiroResult, type GiroCompleted } from "./giro-result";
import { confirmGiro } from "./confirm-giro";

const CATALOG_ROUTE = "/worker/nueva-operacion";

type Step = "registrar" | "revisar" | "confirmar" | "resultado";

/**
 * `EMPTY_SENDER` pre-fills sensible defaults (document type, nationality) —
 * those must NOT count as "meaningful data entered" for the abandonment
 * dialog, so `dirty` compares against this exact starting point rather than
 * against blank strings.
 */
const INITIAL_VALUES: GiroFormValues = {
  sender: EMPTY_SENDER,
  beneficiary: EMPTY_BENEFICIARY,
  giro: { senderCurrency: "", amountInput: "" },
};

interface InitialFlow {
  step: Step;
  values: GiroFormValues;
  draft: GiroDraft | null;
  kioskCode: string | null;
}

/**
 * Starting point of the flow. Opened from "Buscar solicitud", the kiosk
 * request fills the whole form (the sender's birth date comes from the
 * carné number; nationality keeps its "Cubana" default). If that already
 * validates, the flow opens straight on "Revisar giro": the client did the
 * data entry, the worker only receives the cash and confirms. Anything
 * missing (e.g. a passport instead of a carné) leaves it on Step 1 with the
 * rest filled in.
 */
function buildInitialFlow(): InitialFlow {
  const handoff = readPendingWorkerHandoff("giros-enviar");
  if (!handoff) return { step: "registrar", values: INITIAL_VALUES, draft: null, kioskCode: null };

  const { sender, beneficiary, senderCurrency, deliveryAmount } = handoff.data;
  const values: GiroFormValues = {
    sender: {
      ...EMPTY_SENDER,
      ...sender,
      birthDate: sender.documentType === "CI" ? birthDateFromCubanId(sender.documentNumber) : "",
    },
    beneficiary: { ...EMPTY_BENEFICIARY, ...beneficiary },
    giro: { senderCurrency, amountInput: formatAmount(deliveryAmount, 2) },
  };
  const { draft } = validateGiroForm(values, CAJA_BALANCES.map((balance) => balance.currency));
  return { step: draft ? "revisar" : "registrar", values, draft, kioskCode: handoff.code };
}

/**
 * "Giros" — Enviar giro.
 *
 * Registrar giro → Revisar giro → Confirmar envío → Resultado, exactly as
 * approved. Step 1 owns all form state and validation; Steps 2-3 are pure
 * displays of the frozen `draft` (nothing about it changes once Continuar is
 * pressed on Step 1 — Volver only moves the step pointer, never clears data).
 * `EnviarGiroFlow` itself is the only place `transferProvider.createTransfer`
 * is ever called.
 */
export function EnviarGiroFlow(): React.JSX.Element {
  const router = useRouter();
  const worker = getCurrentWorker();

  // Captured once, on entry — a jornada closed by another tab later must not
  // retroactively lock a result screen this same flow already produced.
  const [blocked] = React.useState(() => !hasOpenJornada());

  const [initial] = React.useState(buildInitialFlow);
  const [step, setStep] = React.useState<Step>(initial.step);
  const [values, setValues] = React.useState<GiroFormValues>(initial.values);
  const [errors, setErrors] = React.useState(NO_ERRORS);
  const [cancelOpen, setCancelOpen] = React.useState(false);

  const [draft, setDraft] = React.useState<GiroDraft | null>(initial.draft);

  // The kiosk prefill (if any) now lives in local state — drop the handoff.
  React.useEffect(() => clearPendingWorkerHandoff(), []);
  const [submitting, setSubmitting] = React.useState(false);
  const [confirmError, setConfirmError] = React.useState<string | undefined>();
  const [completed, setCompleted] = React.useState<GiroCompleted | null>(null);

  const enabledCurrencies = CAJA_BALANCES.map((balance) => balance.currency);

  // Live-computed, gates the button only — never surfaces error text before
  // the worker actually tries to continue (§29 vs. the `errors` state below).
  const canContinue = !hasAnyError(validateGiroForm(values, enabledCurrencies).errors);

  const dirty = JSON.stringify(values) !== JSON.stringify(INITIAL_VALUES);

  function leaveFlow() {
    router.push(CATALOG_ROUTE);
  }

  function requestCancel() {
    if (dirty) setCancelOpen(true);
    else leaveFlow();
  }

  function handleContinue(event: React.FormEvent) {
    event.preventDefault();
    const result = validateGiroForm(values, enabledCurrencies);
    setErrors(result.errors);
    if (!result.draft) return;
    setDraft(result.draft);
    setStep("revisar");
  }

  async function handleConfirm() {
    if (!draft || submitting) return;
    setSubmitting(true);
    setConfirmError(undefined);

    const outcome = await confirmGiro({ draft, worker: worker.fullName });

    setSubmitting(false);
    if (!outcome.ok) {
      setConfirmError(outcome.message);
      return;
    }
    setCompleted(outcome.completed);
    setStep("resultado");
  }

  if (blocked) {
    return (
      <div className="flex flex-col gap-6">
        <BackLink />
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
            <span
              aria-hidden="true"
              className="grid size-12 place-items-center rounded-control bg-primary-subtle text-primary"
            >
              <Lock className="size-6" />
            </span>
            <p className="mt-2 text-section-title text-text-primary">Caja cerrada</p>
            <p className="max-w-sm text-body text-text-secondary">
              Debes abrir una jornada antes de registrar un giro.
            </p>
            <Button className="mt-4" asChild>
              <Link href="/worker/caja">Ir a Caja</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "resultado" && completed) {
    return <GiroResult completed={completed} />;
  }

  let stepContent: React.ReactNode;

  if (step === "confirmar" && draft) {
    stepContent = (
      <GiroConfirmation
        draft={draft}
        submitting={submitting}
        error={confirmError}
        onBack={() => setStep("revisar")}
        onCancel={requestCancel}
        onConfirm={() => void handleConfirm()}
      />
    );
  } else if (step === "revisar" && draft) {
    stepContent = (
      <>
      {initial.kioskCode ? (
        <Alert variant="info" title={`Solicitud de kiosco ${initial.kioskCode}`} className="mb-6">
          El cliente ya registró estos datos en el kiosco. Recibe el efectivo y confirma el envío.
        </Alert>
      ) : null}
      <GiroReview
        draft={draft}
        worker={worker.fullName}
        onBack={() => setStep("registrar")}
        onCancel={requestCancel}
        onContinue={() => setStep("confirmar")}
      />
      </>
    );
  } else {
    stepContent = (
    <div className="flex flex-col gap-6">
      <BackLink />

      <div>
        <h1 className="text-screen-title text-text-primary">Giros</h1>
        <p className="mt-2 max-w-2xl text-body text-text-secondary">
          Registra un giro para que el beneficiario lo cobre en otra provincia.
        </p>
      </div>

      {initial.kioskCode ? (
        <Alert variant="info" title={`Solicitud de kiosco ${initial.kioskCode}`}>
          Datos precargados desde el kiosco. Completa lo que falte para continuar.
        </Alert>
      ) : null}

      <Card>
        <CardContent className="grid grid-cols-2 gap-6 py-5 wide:grid-cols-4">
          <InfoItem icon={Wallet} label="Caja" value={CAJA_SUMMARY.register} />
          <InfoItem icon={User} label="Trabajador" value={worker.fullName} />
          <InfoItem
            icon={CalendarClock}
            label="Jornada actual"
            value="Abierta"
            valueClassName="text-success-foreground"
          />
          <InfoItem icon={Banknote} label="Monedas habilitadas" value={String(CAJA_BALANCES.length)} />
        </CardContent>
      </Card>

      <form
        noValidate
        onSubmit={handleContinue}
        className="grid grid-cols-1 items-start gap-6 wide:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]"
      >
        <div className="flex flex-col gap-6">
          <SenderSection
            values={values.sender}
            errors={errors.sender}
            onChange={(sender) => setValues((prev) => ({ ...prev, sender }))}
          />
          <BeneficiarySection
            values={values.beneficiary}
            errors={errors.beneficiary}
            onChange={(beneficiary) => setValues((prev) => ({ ...prev, beneficiary }))}
          />
          <GiroDatosSection
            enabledCurrencies={enabledCurrencies}
            currency={values.giro.senderCurrency}
            amountInput={values.giro.amountInput}
            errors={errors.giro}
            onChangeCurrency={(currency) =>
              setValues((prev) => ({ ...prev, giro: { ...prev.giro, senderCurrency: currency } }))
            }
            onChangeAmount={(amountInput) =>
              setValues((prev) => ({ ...prev, giro: { ...prev.giro, amountInput } }))
            }
          />

          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="secondary" onClick={requestCancel}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!canContinue}>
              Continuar
              <ArrowRight aria-hidden="true" />
            </Button>
          </div>
        </div>

        <ResumenGiro values={values} />
      </form>
    </div>
    );
  }

  return (
    <>
      {stepContent}
      <CancelDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        onConfirm={() => {
          setCancelOpen(false);
          leaveFlow();
        }}
      />
    </>
  );
}

function BackLink() {
  return (
    <Link
      href={CATALOG_ROUTE}
      className="inline-flex w-fit items-center gap-2 rounded-control text-label font-medium text-text-secondary transition-colors hover:text-text-primary outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-primary print:hidden"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      Volver a Nueva operación
    </Link>
  );
}

function CancelDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Cancelar el registro del giro?</DialogTitle>
          <DialogDescription>
            Se descartarán los datos introducidos del remitente, el beneficiario y el giro. Esta
            acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <p className="text-body-sm text-text-secondary">
            No se creará ningún giro externo ni se modificará el saldo de la caja.
          </p>
        </DialogBody>
        <DialogFooter>
          <Button variant="tertiary" onClick={() => onOpenChange(false)}>
            Seguir registrando
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Sí, cancelar giro
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InfoItem({
  icon: Icon,
  label,
  value,
  valueClassName,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <span className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className="grid size-9 shrink-0 place-items-center rounded-control bg-primary-subtle text-primary"
      >
        <Icon className="size-[18px]" />
      </span>
      <span className="flex flex-col">
        <span className="text-caption text-text-secondary">{label}</span>
        <span className={cn("text-body-sm font-semibold text-text-primary", valueClassName)}>{value}</span>
      </span>
    </span>
  );
}

/* -------------------------------------------------------------------------
 * Section: Remitente
 * ---------------------------------------------------------------------- */

const SENDER_FIELDS = {
  documentType: { id: "giro-remitente-tipo-documento", label: "Tipo de documento", required: true },
  documentNumber: { id: "giro-remitente-numero-documento", label: "Número de documento", required: true },
  firstName: { id: "giro-remitente-nombre", label: "Nombre", required: true },
  firstSurname: { id: "giro-remitente-primer-apellido", label: "Primer apellido", required: true },
  secondSurname: { id: "giro-remitente-segundo-apellido", label: "Segundo apellido", required: true },
  birthDate: { id: "giro-remitente-fecha-nacimiento", label: "Fecha de nacimiento", required: true },
  phone: { id: "giro-remitente-telefono", label: "Teléfono", required: true },
  nationality: { id: "giro-remitente-nacionalidad", label: "Nacionalidad", required: true },
} as const satisfies Record<string, FieldSpec>;

function SenderSection({
  values,
  errors,
  onChange,
}: {
  values: GiroFormValues["sender"];
  errors: Partial<Record<keyof GiroFormValues["sender"], string>>;
  onChange: (values: GiroFormValues["sender"]) => void;
}) {
  function set<K extends keyof GiroFormValues["sender"]>(key: K, value: GiroFormValues["sender"][K]) {
    onChange({ ...values, [key]: value });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className="grid size-9 shrink-0 place-items-center rounded-control bg-primary-subtle text-primary"
          >
            <User className="size-[18px]" />
          </span>
          <div className="min-w-0">
            <CardTitle>Remitente</CardTitle>
            <p className="mt-0.5 text-body-sm text-text-secondary">
              Registra los datos de la persona que envía el giro.
            </p>
          </div>
        </div>
      </CardHeader>
      {/* `wide:` sorts before Tailwind's own `sm:`/`lg:` in the emitted
          cascade (see tokens.css), so an intermediate breakpoint here would
          silently outrank it — jump straight from 1 column to 3 instead. */}
      <CardContent className="grid grid-cols-1 gap-5 wide:grid-cols-3">
        <Field {...SENDER_FIELDS.documentType} error={errors.documentType}>
          <Select value={values.documentType} onValueChange={(v) => set("documentType", v as DocumentType)}>
            <SelectTrigger {...fieldAria(SENDER_FIELDS.documentType)}>
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

        <TextField spec={SENDER_FIELDS.documentNumber} value={values.documentNumber} error={errors.documentNumber} onChange={(v) => set("documentNumber", v)} />
        <TextField spec={SENDER_FIELDS.firstName} value={values.firstName} error={errors.firstName} onChange={(v) => set("firstName", v)} />
        <TextField spec={SENDER_FIELDS.firstSurname} value={values.firstSurname} error={errors.firstSurname} onChange={(v) => set("firstSurname", v)} />
        <TextField spec={SENDER_FIELDS.secondSurname} value={values.secondSurname} error={errors.secondSurname} onChange={(v) => set("secondSurname", v)} />
        <TextField spec={SENDER_FIELDS.birthDate} value={values.birthDate} error={errors.birthDate} onChange={(v) => set("birthDate", v)} type="date" />
        <TextField spec={SENDER_FIELDS.phone} value={values.phone} error={errors.phone} onChange={(v) => set("phone", v)} type="tel" />
        <TextField spec={SENDER_FIELDS.nationality} value={values.nationality} error={errors.nationality} onChange={(v) => set("nationality", v)} />
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------
 * Section: Beneficiario
 * ---------------------------------------------------------------------- */

const BENEFICIARY_FIELDS = {
  receiverName: { id: "giro-beneficiario-nombre", label: "Nombre completo", required: true },
  receiverEmail: { id: "giro-beneficiario-correo", label: "Correo electrónico" },
  receiverPhone: { id: "giro-beneficiario-telefono", label: "Teléfono", required: true },
  receiverAddress: { id: "giro-beneficiario-direccion", label: "Dirección", required: true },
  receiverProvince: { id: "giro-beneficiario-provincia", label: "Provincia", required: true },
  receiverMunicipality: { id: "giro-beneficiario-municipio", label: "Municipio", required: true },
  receiverIdentification: { id: "giro-beneficiario-documento", label: "Documento de identidad", required: true },
} as const satisfies Record<string, FieldSpec>;

function BeneficiarySection({
  values,
  errors,
  onChange,
}: {
  values: GiroFormValues["beneficiary"];
  errors: Partial<Record<keyof GiroFormValues["beneficiary"], string>>;
  onChange: (values: GiroFormValues["beneficiary"]) => void;
}) {
  function set<K extends keyof GiroFormValues["beneficiary"]>(key: K, value: GiroFormValues["beneficiary"][K]) {
    onChange({ ...values, [key]: value });
  }

  const municipalities = getMunicipalitiesForProvince(values.receiverProvince);

  function setProvince(code: string) {
    // Changing Province clears an incompatible Municipality (§11).
    const stillValid = getMunicipalitiesForProvince(code).some((m) => m.code === values.receiverMunicipality);
    onChange({ ...values, receiverProvince: code, receiverMunicipality: stillValid ? values.receiverMunicipality : "" });
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
            <CardTitle>Beneficiario</CardTitle>
            <p className="mt-0.5 text-body-sm text-text-secondary">
              Introduce los datos de la persona que recibirá el giro.
            </p>
          </div>
        </div>
      </CardHeader>
      {/* Same breakpoint-ordering reason as Remitente above — jump straight from 1 column to 3. */}
      <CardContent className="grid grid-cols-1 gap-5 wide:grid-cols-3">
        <TextField spec={BENEFICIARY_FIELDS.receiverName} value={values.receiverName} error={errors.receiverName} onChange={(v) => set("receiverName", v)} />
        <TextField spec={BENEFICIARY_FIELDS.receiverEmail} value={values.receiverEmail} error={errors.receiverEmail} onChange={(v) => set("receiverEmail", v)} type="email" />
        <TextField spec={BENEFICIARY_FIELDS.receiverPhone} value={values.receiverPhone} error={errors.receiverPhone} onChange={(v) => set("receiverPhone", v)} type="tel" />
        <TextField spec={BENEFICIARY_FIELDS.receiverAddress} value={values.receiverAddress} error={errors.receiverAddress} onChange={(v) => set("receiverAddress", v)} />

        <Field {...BENEFICIARY_FIELDS.receiverProvince} error={errors.receiverProvince}>
          <Select value={values.receiverProvince || undefined} onValueChange={setProvince}>
            <SelectTrigger {...fieldAria(BENEFICIARY_FIELDS.receiverProvince)}>
              <SelectValue placeholder="Selecciona una provincia" />
            </SelectTrigger>
            <SelectContent>
              {PROVINCE_CATALOG.map((province) => (
                <SelectItem key={province.code} value={province.code}>
                  {province.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field {...BENEFICIARY_FIELDS.receiverMunicipality} error={errors.receiverMunicipality}>
          <Select
            value={values.receiverMunicipality || undefined}
            onValueChange={(v) => set("receiverMunicipality", v)}
            disabled={!values.receiverProvince}
          >
            <SelectTrigger {...fieldAria(BENEFICIARY_FIELDS.receiverMunicipality)}>
              <SelectValue
                placeholder={values.receiverProvince ? "Selecciona un municipio" : "Primero selecciona una provincia"}
              />
            </SelectTrigger>
            <SelectContent>
              {municipalities.map((municipality) => (
                <SelectItem key={municipality.code} value={municipality.code}>
                  {municipality.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <TextField spec={BENEFICIARY_FIELDS.receiverIdentification} value={values.receiverIdentification} error={errors.receiverIdentification} onChange={(v) => set("receiverIdentification", v)} />
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------
 * Section: Datos del giro
 * ---------------------------------------------------------------------- */

function GiroDatosSection({
  enabledCurrencies,
  currency,
  amountInput,
  errors,
  onChangeCurrency,
  onChangeAmount,
}: {
  enabledCurrencies: readonly string[];
  currency: string;
  amountInput: string;
  errors: { senderCurrency?: string; amount?: string };
  onChangeCurrency: (currency: string) => void;
  onChangeAmount: (value: string) => void;
}) {
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const selectedEntry = currency ? findCajaCurrency(currency) : undefined;
  const amountFieldId = "giro-importe";

  return (
    <Card>
      <CardHeader>
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className="grid size-9 shrink-0 place-items-center rounded-control bg-primary-subtle text-primary"
          >
            <Send className="size-[18px]" />
          </span>
          <div className="min-w-0">
            <CardTitle>Datos del giro</CardTitle>
            <p className="mt-0.5 text-body-sm text-text-secondary">
              Define cómo se registrará el giro en el sistema.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <ReadOnlyValue label="Método de entrega">Recogida</ReadOnlyValue>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <p className="text-label font-medium text-text-secondary">
              Moneda<span className="ml-1 text-error" aria-hidden="true">*</span>
            </p>
            <div className="mt-2">
              <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={pickerOpen}
                aria-label={`Moneda: ${selectedEntry ? `${selectedEntry.code} — ${selectedEntry.name}` : "Selecciona una moneda"}`}
                onClick={() => setPickerOpen((prev) => !prev)}
                className={cn(
                  "flex h-control w-full items-center justify-between gap-3 rounded-control border bg-surface px-4 text-left text-body text-text-primary transition-[border-color,box-shadow] duration-(--duration-fast) ease-(--ease-standard) outline-none hover:border-border-strong focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20",
                  errors.senderCurrency ? "border-error" : "border-border",
                )}
              >
                {selectedEntry ? (
                  <span className="flex min-w-0 items-center gap-2">
                    <CurrencyFlag currency={selectedEntry.code} className="h-3.5 w-5" />
                    <span className="truncate">
                      <span className="font-semibold">{selectedEntry.code}</span>
                      <span className="text-text-secondary"> — {selectedEntry.name}</span>
                    </span>
                  </span>
                ) : (
                  <span className="text-text-secondary">Selecciona una moneda</span>
                )}
                <ChevronDown
                  className={cn("size-4 shrink-0 text-text-secondary transition-transform duration-(--duration-fast)", pickerOpen && "rotate-180")}
                  aria-hidden="true"
                />
              </button>

              {pickerOpen ? (
                <ul className="mt-2 flex max-h-64 flex-col gap-1 overflow-y-auto rounded-control border border-border bg-surface p-1 shadow-raised" role="listbox" aria-label="Monedas habilitadas">
                  {enabledCurrencies.map((code) => {
                    const entry = findCajaCurrency(code);
                    const isSelected = code === currency;
                    return (
                      <li key={code}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => {
                            onChangeCurrency(code);
                            setPickerOpen(false);
                          }}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-control border px-3 py-2.5 text-left transition-colors duration-(--duration-fast) ease-(--ease-standard) outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-primary",
                            isSelected ? "border-primary bg-primary-subtle" : "border-transparent hover:border-border-navy hover:bg-primary-subtle",
                          )}
                        >
                          <CurrencyFlag currency={code} className="h-3.5 w-5" />
                          <span className="min-w-0 flex-1">
                            <span className="font-semibold text-text-primary">{code}</span>
                            {entry ? <span className="ml-2 text-body-sm text-text-secondary">{entry.name}</span> : null}
                          </span>
                          {isSelected ? <Check className="size-4 shrink-0 text-primary" aria-hidden="true" /> : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
            {errors.senderCurrency ? <p className="mt-1 text-caption text-error-foreground">{errors.senderCurrency}</p> : null}
          </div>

          <Field id={amountFieldId} label="Importe a entregar" error={errors.amount} required>
            <Input
              {...fieldAria({ id: amountFieldId, error: errors.amount, required: true })}
              value={amountInput}
              onChange={(event) => onChangeAmount(event.target.value)}
              inputMode="decimal"
              autoComplete="off"
              numeric
              placeholder="0,00"
              suffix={currency || undefined}
            />
          </Field>
        </div>
      </CardContent>
    </Card>
  );
}

function TextField({
  spec,
  value,
  error,
  onChange,
  type = "text",
  className,
}: {
  spec: FieldSpec;
  value: string;
  error: string | undefined;
  onChange: (value: string) => void;
  type?: string;
  className?: string;
}) {
  return (
    <Field {...spec} error={error} className={className}>
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

/* -------------------------------------------------------------------------
 * Resumen del giro (right column)
 * ---------------------------------------------------------------------- */

function ResumenGiro({ values }: { values: GiroFormValues }) {
  const beneficiaryName = values.beneficiary.receiverName.trim();
  const provinceMunicipio =
    values.beneficiary.receiverProvince && values.beneficiary.receiverMunicipality
      ? `${provinceLabel(values.beneficiary.receiverProvince)} / ${municipalityLabel(values.beneficiary.receiverProvince, values.beneficiary.receiverMunicipality)}`
      : undefined;
  const parsedAmount = values.giro.amountInput.trim() ? values.giro.amountInput : undefined;

  return (
    <Card className="self-start">
      <CardHeader>
        <div className="min-w-0">
          <CardTitle>Resumen del giro</CardTitle>
          <p className="mt-0.5 text-body-sm text-text-secondary">
            Revisa el impacto de esta operación antes de continuar.
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <dl className="flex flex-col">
          <SummaryRow label="Caja" value={CAJA_SUMMARY.register} />
          <SummaryRow label="Trabajador" value={CAJA_SUMMARY.worker} />
          <SummaryRow label="Beneficiario" value={beneficiaryName || "—"} />
          <SummaryRow label="Provincia / Municipio" value={provinceMunicipio ?? "—"} />
          <SummaryRow label="Método de entrega" value="Recogida" />
          <SummaryRow label="Moneda" value={values.giro.senderCurrency || "—"} />
          <SummaryRow
            label="Importe"
            value={
              parsedAmount && values.giro.senderCurrency
                ? `${parsedAmount} ${values.giro.senderCurrency}`
                : "—"
            }
          />
          <SummaryRow label="Impacto en caja" value="Entrada de efectivo" valueClassName="text-success-foreground" />
        </dl>
      </CardContent>
    </Card>
  );
}

function SummaryRow({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-2.5 last:border-b-0 last:pb-0">
      <dt className="text-body-sm text-text-secondary">{label}</dt>
      <dd className={cn("text-right text-body-sm font-semibold text-text-primary", valueClassName)}>{value}</dd>
    </div>
  );
}
