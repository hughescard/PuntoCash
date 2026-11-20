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
import { documentTypeShortLabel, type Customer } from "@/features/customers/customers";
import { useVistaDeCaja } from "@/features/worker/caja-context";
import { PROVINCE_CATALOG, getMunicipalitiesForProvince } from "@/features/geography/cuba-provinces";
import { findCajaCurrency } from "@/features/caja/caja-data";
import { useCaja } from "@/features/caja/use-caja";
import { formatAmount, formatIsoDate, formatMoney } from "@/lib/format";
import {
  clearPendingWorkerHandoff,
  readPendingWorkerHandoff,
  type KioskClientInput,
} from "@/features/kiosk/self-service-request";
import { StepCliente } from "../../cambio-moneda/step-cliente";
import { EMPTY_BENEFICIARY, EMPTY_SENDER, senderFullName, type GiroDraft, type GiroFormValues } from "./giro-types";
import {
  NO_ERRORS,
  cotizacionDe,
  hasAnyError,
  municipalityLabel,
  provinceLabel,
  validateGiroForm,
  type ParaCotizar,
} from "./giro-validation";
import { desgloseDeTarifa, errorDeCotizacion } from "./cotizacion-de-giro";
import type { FormaDeGiro } from "@/features/network/tarifas-reglas";
import { GiroConfirmation, GiroReview } from "./giro-review-confirm";
import { GiroResult, type GiroCompleted } from "./giro-result";
import { confirmGiro } from "./confirm-giro";
import type { EfectivoRegistrado } from "@/features/network/caja-operativa";
import { RecuentoDeMoneda } from "../../../caja/recuento-de-moneda";
import { EfectivoDeOperacion } from "../../efectivo-de-operacion";

const CATALOG_ROUTE = "/worker/nueva-operacion";

type Step = "remitente" | "registrar" | "revisar" | "efectivo" | "confirmar" | "resultado";

/**
 * `EMPTY_SENDER` pre-fills sensible defaults (document type, nationality) —
 * those must NOT count as "meaningful data entered" for the abandonment
 * dialog, so `dirty` compares against this exact starting point rather than
 * against blank strings.
 */
const INITIAL_VALUES: GiroFormValues = {
  sender: EMPTY_SENDER,
  beneficiary: EMPTY_BENEFICIARY,
  giro: { senderCurrency: "", forma: "llegar", amountInput: "" },
};

interface InitialFlow {
  step: Step;
  values: GiroFormValues;
  kioskCode: string | null;
  /** Lo que el cliente declaró de sí mismo en el kiosco: solo lanza la búsqueda del remitente. */
  kioskSender: KioskClientInput | null;
}

/**
 * Starting point of the flow: always the sender, identified exactly as the
 * client of a Cambio de moneda (search by document or scan; registered →
 * loaded, not registered → registered here). Opened from "Buscar solicitud",
 * the kiosk request pre-runs that search with the document the client typed,
 * and fills the beneficiary and the giro; once the worker selects the sender,
 * a complete request goes straight to "Revisar giro".
 */
function buildInitialFlow(): InitialFlow {
  const handoff = readPendingWorkerHandoff("giros-enviar");
  if (!handoff) return { step: "remitente", values: INITIAL_VALUES, kioskCode: null, kioskSender: null };

  const { sender, beneficiary, senderCurrency, deliveryAmount, forma } = handoff.data;
  const values: GiroFormValues = {
    sender: EMPTY_SENDER,
    beneficiary: { ...EMPTY_BENEFICIARY, ...beneficiary },
    /* El kiosco dirá cómo lo pidió el cliente; mientras no lo diga, es lo que tiene que llegar. */
    giro: { senderCurrency, forma: forma ?? "llegar", amountInput: formatAmount(deliveryAmount, 2) },
  };
  return { step: "remitente", values, kioskCode: handoff.code, kioskSender: sender };
}

/** El remitente es un cliente registrado: sus datos se toman tal cual, no se editan en el giro. */
function senderFromCustomer(customer: Customer): GiroFormValues["sender"] {
  const { documentType, documentNumber, firstName, firstSurname, secondSurname, birthDate, phone, nationality } =
    customer;
  return { documentType, documentNumber, firstName, firstSurname, secondSurname, birthDate, phone, nationality };
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
  const caja = useCaja();
  const vista = useVistaDeCaja();
  const worker = vista.trabajador;
  const MONEDAS = caja.monedas;
  const CAJA_SUMMARY = caja.summary;

  const [initial] = React.useState(() => buildInitialFlow());
  const [step, setStep] = React.useState<Step>(initial.step);
  const [values, setValues] = React.useState<GiroFormValues>(initial.values);
  const [errors, setErrors] = React.useState(NO_ERRORS);
  const [cancelOpen, setCancelOpen] = React.useState(false);

  const [draft, setDraft] = React.useState<GiroDraft | null>(null);
  const [customer, setCustomer] = React.useState<Customer | null>(null);

  // The kiosk prefill (if any) now lives in local state — drop the handoff.
  React.useEffect(() => clearPendingWorkerHandoff(), []);
  const [submitting, setSubmitting] = React.useState(false);
  const [confirmError, setConfirmError] = React.useState<string | undefined>();
  const [completed, setCompleted] = React.useState<GiroCompleted | null>(null);
  /** Con qué billetes paga el cliente y el vuelto, cuando cuadran (bloque 4). */
  const [efectivo, setEfectivo] = React.useState<EfectivoRegistrado | null>(null);
  const [recontando, setRecontando] = React.useState<string | null>(null);
  const [recarga, setRecarga] = React.useState(0);
  /** Por qué se volvió al giro desde la confirmación: cambió la tarifa. */
  const [avisoDeTarifa, setAvisoDeTarifa] = React.useState<string | null>(null);

  /*
   * Sin jornada abierta esta pantalla no opera — salvo que el flujo ya haya
   * terminado: que la jornada se cierre desde otra pestaña no puede tapar
   * retroactivamente el resultado que el trabajador está mirando.
   *
   * Se lee en cada render, no se captura al entrar: el estado guardado en el
   * equipo se repone justo después de hidratar, y una captura hecha antes de
   * eso diría que no hay jornada para siempre.
   */
  const blocked = (!caja.jornadaAbierta || vista.bloqueo !== null) && completed === null;

  /* Solo las monedas con tarifa de giros: en las demás no se envían giros. */
  const paraCotizar: ParaCotizar = { tarifas: vista.tarifasDeGiro, denominaciones: vista.denominaciones };
  const enabledCurrencies = MONEDAS.filter((m) => vista.tarifasDeGiro[m] !== undefined);
  const sinTarifa = MONEDAS.filter((m) => vista.tarifasDeGiro[m] === undefined);

  // Live-computed, gates the button only — never surfaces error text before
  // the worker actually tries to continue (§29 vs. the `errors` state below).
  const canContinue = customer !== null && !hasAnyError(validateGiroForm(values, enabledCurrencies, paraCotizar).errors);

  /*
   * Lo que no cotiza (bajo el mínimo, no pagable) se dice mientras se escribe:
   * con ese error «Continuar» está apagado, y esperar al clic lo escondería.
   */
  const cotizacionViva = cotizacionDe(values.giro, paraCotizar);
  const avisoDeImporte =
    cotizacionViva && !cotizacionViva.ok && cotizacionViva.reason !== "sin-tarifa"
      ? errorDeCotizacion(cotizacionViva, values.giro.senderCurrency, values.giro.forma)
      : undefined;

  const dirty = customer !== null || JSON.stringify(values) !== JSON.stringify(INITIAL_VALUES);

  /**
   * Elegido el remitente, se sigue al formulario del giro. Una solicitud de
   * kiosco ya trae el resto completo: va directa a Revisar giro.
   */
  function selectSender(selected: Customer) {
    const next = { ...values, sender: senderFromCustomer(selected) };
    setCustomer(selected);
    setValues(next);
    if (initial.kioskCode) {
      const result = validateGiroForm(next, enabledCurrencies, paraCotizar);
      if (result.draft) {
        setDraft(result.draft);
        setStep("revisar");
        return;
      }
    }
    setStep("registrar");
  }

  function leaveFlow() {
    router.push(CATALOG_ROUTE);
  }

  function requestCancel() {
    if (dirty) setCancelOpen(true);
    else leaveFlow();
  }

  function handleContinue(event: React.FormEvent) {
    event.preventDefault();
    const result = validateGiroForm(values, enabledCurrencies, paraCotizar);
    setErrors(result.errors);
    if (!result.draft) return;
    setDraft(result.draft);
    setStep("revisar");
  }

  async function handleConfirm() {
    if (!draft || submitting || !efectivo) return;
    setSubmitting(true);
    setConfirmError(undefined);

    const outcome = await confirmGiro({
      draft,
      worker: worker.fullName,
      jornadaAbierta: caja.jornadaAbierta,
      monedasHabilitadas: MONEDAS,
      efectivo,
    });

    setSubmitting(false);
    if (!outcome.ok) {
      /* Sale un vuelto con billetes que los libros no tienen: se cuenta esa moneda y se vuelve a intentar. */
      if (outcome.recuento) {
        setRecontando(outcome.recuento);
        return;
      }
      setConfirmError(outcome.message);
      /* PuntoCash cambió la tarifa: se trae la nueva y se vuelve al giro para cotizarlo otra vez. */
      if (outcome.tarifaCambiada) {
        setAvisoDeTarifa(outcome.message);
        setConfirmError(undefined);
        setDraft(null);
        setEfectivo(null);
        router.refresh();
        setStep("registrar");
        return;
      }
      if (outcome.revisarBilletes) {
        setRecarga((n) => n + 1);
        setStep("efectivo");
      }
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

  if (step === "remitente") {
    stepContent = (
      <div className="flex flex-col gap-6">
        <BackLink />

        <div>
          <h1 className="text-screen-title text-text-primary">Giros</h1>
          <p className="mt-2 max-w-2xl text-body text-text-secondary">
            Identifica al remitente: la persona que entrega el efectivo y envía el giro.
          </p>
        </div>

        {initial.kioskCode ? (
          <Alert variant="info" title={`Solicitud de kiosco ${initial.kioskCode}`}>
            Comprueba el documento del remitente y selecciónalo. El resto del giro ya viene completo.
          </Alert>
        ) : null}

        <StepCliente kioskClient={initial.kioskSender} selectedCustomer={customer} onSelectCustomer={selectSender} />

        <div className="pc-botonera sm:justify-end">
          <Button type="button" variant="secondary" onClick={requestCancel}>
            Cancelar
          </Button>
          <Button disabled={!customer} onClick={() => setStep("registrar")}>
            Continuar
            <ArrowRight aria-hidden="true" />
          </Button>
        </div>
      </div>
    );
  } else if (recontando) {
    stepContent = (
      <RecuentoDeMoneda
        currency={recontando}
        denominaciones={vista.denominaciones}
        supervisores={vista.supervisores}
        onCancelar={() => setRecontando(null)}
        onListo={() => {
          setRecontando(null);
          setRecarga((n) => n + 1);
          void handleConfirm();
        }}
      />
    );
  } else if (step === "efectivo" && draft) {
    stepContent = (
      <div className="flex flex-col gap-6">
        <button
          type="button"
          onClick={() => setStep("revisar")}
          className="inline-flex w-fit items-center gap-2 rounded-control text-label font-medium text-text-secondary transition-colors hover:text-text-primary outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Volver a Revisar giro
        </button>
        <header>
          <h1 className="text-screen-title text-text-primary">Billetes del cobro</h1>
          <p className="mt-2 text-body text-text-secondary">
            Marca los billetes con los que paga el cliente el giro y su tarifa:{" "}
            <span className="pc-numeric font-semibold text-text-primary">{formatMoney({ amount: draft.tarifa.total, currency: draft.senderCurrency })}</span>.
          </p>
        </header>
        <EfectivoDeOperacion
          entrada={{ modo: "cobro", currency: draft.senderCurrency, importe: draft.tarifa.total }}
          recargar={recarga}
          inicial={efectivo?.paga}
          onChange={(e) => setEfectivo(e.listo ? e.efectivo : null)}
        />
        {confirmError ? <Alert variant="error" title={confirmError} /> : null}
        <div className="pc-botonera sm:justify-end">
          <Button variant="secondary" onClick={requestCancel}>
            Cancelar
          </Button>
          <Button
            disabled={!efectivo}
            onClick={() => {
              setConfirmError(undefined);
              setStep("confirmar");
            }}
          >
            Continuar a confirmar
          </Button>
        </div>
      </div>
    );
  } else if (step === "confirmar" && draft) {
    stepContent = (
      <GiroConfirmation
        draft={draft}
        efectivo={efectivo}
        tipos={vista.denominaciones}
        submitting={submitting}
        error={confirmError}
        onBack={() => setStep("efectivo")}
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
        onContinue={() => {
          setEfectivo(null);
          setStep("efectivo");
        }}
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

      {avisoDeTarifa ? (
        <Alert variant="warning" title="La tarifa de giros cambió">
          {avisoDeTarifa}
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
          <InfoItem icon={Banknote} label="Monedas habilitadas" value={String(MONEDAS.length)} />
        </CardContent>
      </Card>

      <form
        noValidate
        onSubmit={handleContinue}
        className="grid grid-cols-1 items-start gap-6 wide:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]"
      >
        <div className="flex flex-col gap-6">
          <SenderSection sender={values.sender} onChange={() => setStep("remitente")} />
          <BeneficiarySection
            values={values.beneficiary}
            errors={errors.beneficiary}
            onChange={(beneficiary) => setValues((prev) => ({ ...prev, beneficiary }))}
          />
          <GiroDatosSection
            enabledCurrencies={enabledCurrencies}
            sinTarifa={sinTarifa}
            currency={values.giro.senderCurrency}
            forma={values.giro.forma}
            amountInput={values.giro.amountInput}
            errors={{ ...errors.giro, ...(errors.giro.amount ? {} : avisoDeImporte ? { amount: avisoDeImporte } : {}) }}
            onChangeForma={(forma) => setValues((prev) => ({ ...prev, giro: { ...prev.giro, forma } }))}
            onChangeCurrency={(currency) =>
              setValues((prev) => ({ ...prev, giro: { ...prev.giro, senderCurrency: currency } }))
            }
            onChangeAmount={(amountInput) =>
              setValues((prev) => ({ ...prev, giro: { ...prev.giro, amountInput } }))
            }
          />

          <div className="pc-botonera sm:justify-end">
            <Button type="button" variant="secondary" onClick={requestCancel}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!canContinue}>
              Continuar
              <ArrowRight aria-hidden="true" />
            </Button>
          </div>
        </div>

        <ResumenGiro values={values} paraCotizar={paraCotizar} />
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

/**
 * El remitente ya se identificó en el paso anterior y es un cliente
 * registrado: aquí se muestra, no se edita. Para otro remitente se vuelve a
 * identificar.
 */
function SenderSection({ sender, onChange }: { sender: GiroFormValues["sender"]; onChange: () => void }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span
            aria-hidden="true"
            className="grid size-9 shrink-0 place-items-center rounded-control bg-primary-subtle text-primary"
          >
            <User className="size-[18px]" />
          </span>
          <div className="min-w-0 flex-1">
            <CardTitle>Remitente</CardTitle>
            <p className="mt-0.5 text-body-sm text-text-secondary">Cliente registrado en PuntoCash.</p>
          </div>
          <Button type="button" variant="secondary" onClick={onChange}>
            Cambiar remitente
          </Button>
        </div>
      </CardHeader>
      {/* Read-only values: as many columns as fit, never one tall stack. */}
      <CardContent className="grid grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] gap-5">
        <ReadOnlyValue label="Nombre completo">{senderFullName(sender)}</ReadOnlyValue>
        <ReadOnlyValue label="Documento" numeric>
          {documentTypeShortLabel(sender.documentType)} · {sender.documentNumber}
        </ReadOnlyValue>
        <ReadOnlyValue label="Fecha de nacimiento">{formatIsoDate(sender.birthDate)}</ReadOnlyValue>
        <ReadOnlyValue label="Teléfono" numeric>
          {sender.phone}
        </ReadOnlyValue>
        <ReadOnlyValue label="Nacionalidad">{sender.nationality}</ReadOnlyValue>
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
  sinTarifa,
  currency,
  forma,
  amountInput,
  errors,
  onChangeForma,
  onChangeCurrency,
  onChangeAmount,
}: {
  enabledCurrencies: readonly string[];
  /** Monedas de la caja sin tarifa de giros: no se ofrecen, y se dice por qué. */
  sinTarifa: readonly string[];
  currency: string;
  forma: FormaDeGiro;
  amountInput: string;
  errors: { senderCurrency?: string; amount?: string };
  onChangeForma: (forma: FormaDeGiro) => void;
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

        <fieldset>
          <legend className="mb-2 text-label text-text-primary">Qué dice el cliente</legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(
              [
                { valor: "llegar", titulo: "Que llegue un importe", detalle: "Dice cuánto recibe el beneficiario. Se le suma la tarifa." },
                { valor: "enviar", titulo: "Enviar un importe", detalle: "Dice cuánto entrega. La tarifa sale de ahí." },
              ] as const
            ).map((o) => (
              <label
                key={o.valor}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-control border p-3 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary",
                  forma === o.valor ? "border-primary bg-primary-subtle" : "border-border bg-surface hover:border-border-navy",
                )}
              >
                <input
                  type="radio"
                  name="forma-del-giro"
                  value={o.valor}
                  checked={forma === o.valor}
                  onChange={() => onChangeForma(o.valor)}
                  className="mt-1 size-4 accent-primary"
                />
                <span>
                  <span className="block text-body-sm font-semibold text-text-primary">{o.titulo}</span>
                  <span className="block text-caption text-text-secondary">{o.detalle}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

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
            {errors.senderCurrency ? (
              <p className="mt-1 text-caption text-error-foreground">{errors.senderCurrency}</p>
            ) : sinTarifa.length > 0 ? (
              <p className="mt-1 text-caption text-text-secondary">
                {sinTarifa.join(", ")} no {sinTarifa.length === 1 ? "aparece" : "aparecen"}: PuntoCash no le ha puesto tarifa de giros.
              </p>
            ) : null}
          </div>

          <Field
            id={amountFieldId}
            label={forma === "llegar" ? "Importe que recibe el beneficiario" : "Importe que entrega el cliente"}
            error={errors.amount}
            required
          >
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

function ResumenGiro({ values, paraCotizar }: { values: GiroFormValues; paraCotizar: ParaCotizar }) {
  const CAJA_SUMMARY = useCaja().summary;
  const beneficiaryName = values.beneficiary.receiverName.trim();
  const provinceMunicipio =
    values.beneficiary.receiverProvince && values.beneficiary.receiverMunicipality
      ? `${provinceLabel(values.beneficiary.receiverProvince)} / ${municipalityLabel(values.beneficiary.receiverProvince, values.beneficiary.receiverMunicipality)}`
      : undefined;
  const currency = values.giro.senderCurrency;
  /* Se cotiza mientras se escribe; lo que no cotiza deja «—» y el porqué va junto al importe al continuar. */
  const q = cotizacionDe(values.giro, paraCotizar);
  const c = q?.ok ? q.value : null;
  const m = (amount: number) => formatMoney({ amount, currency });

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
          <SummaryRow label="Moneda" value={currency || "—"} />
          <SummaryRow label="Recibe el beneficiario" value={c ? m(c.giro) : "—"} />
          <SummaryRow
            label="Tarifa"
            value={c ? m(c.tarifa.cobrada) : "—"}
            /* Solo fijo: el desglose repetiría la cifra. */
            detail={c && c.tarifa.porcentaje > 0 ? desgloseDeTarifa(c.tarifa, currency) : undefined}
          />
          <SummaryRow label="Total a cobrar" value={c ? m(c.total) : "—"} strong />
          {c && c.vuelto > 0 ? <SummaryRow label="Se le devuelve" value={m(c.vuelto)} /> : null}
          <SummaryRow label="Impacto en caja" value="Entrada de efectivo" valueClassName="text-success-foreground" />
        </dl>
        {c?.siguiente && c.vuelto > 0 ? (
          <p className="mt-3 text-caption text-text-secondary">
            De lo que entrega sobran {m(c.vuelto)}: con un giro de {m(c.siguiente.giro)} tendría que entregar{" "}
            {m(c.siguiente.total)}.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function SummaryRow({
  label,
  value,
  detail,
  strong = false,
  valueClassName,
}: {
  label: string;
  value: string;
  /** Una segunda línea, más discreta: el desglose de la tarifa. */
  detail?: string | undefined;
  /** Lo que se cobra se lee primero. */
  strong?: boolean;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-2.5 last:border-b-0 last:pb-0">
      <dt className={cn("text-body-sm text-text-secondary", strong && "font-semibold text-text-primary")}>{label}</dt>
      <dd className={cn("pc-numeric text-right text-body-sm font-semibold text-text-primary", strong && "text-body", valueClassName)}>
        <span className="block">{value}</span>
        {detail ? <span className="block text-caption font-normal text-text-secondary">{detail}</span> : null}
      </dd>
    </div>
  );
}
