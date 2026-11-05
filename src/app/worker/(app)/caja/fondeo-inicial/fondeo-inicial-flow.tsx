"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { ArrowLeft, ArrowRight, Banknote, CalendarClock, CircleCheck, Lock, Plus, Printer, ShieldCheck, User, Wallet } from "lucide-react";

import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
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
import { formatDateTime, formatMoney, formatSignedAmount, parseAmountInput } from "@/lib/format";
import { useHydrated } from "@/lib/use-hydrated";
import {
  consumeFondeoInicialDraft,
  findCajaCurrency,
  getValidOpeningReasons,
  saveFondeoInicialDraft,
} from "@/features/caja/caja-data";
import { useCaja } from "@/features/caja/use-caja";
import { useVistaDeCaja } from "@/features/worker/caja-context";
import type { ComparacionDeApertura } from "@/features/network/caja-operativa";
import { abrirJornadaAction, compararAperturaAction } from "../../../_actions";

const CAJA_ROUTE = "/worker/caja" as Route;
const ANADIR_MONEDA_ROUTE = "/worker/caja/anadir-moneda?returnTo=fondeo-inicial" as Route;

type Step = "conteo" | "revision" | "completado";

interface Explicacion {
  motivo?: string;
  observaciones?: string;
}

/**
 * **Abrir jornada — apertura a ciegas** (decisión del 5/11/2026).
 *
 * Quien abre la caja **cuenta lo que hay sin ver lo que dejó el cierre
 * anterior**. Solo después, al revisar, se le enseña dónde no coincide, y cada
 * diferencia pide su motivo: «Reposición de fondos» o «Retiro de fondos» si
 * alguien metió o sacó dinero entre jornadas y se sabe, «Faltante detectado» o
 * «Sobrante detectado» si no, y «Otro» con observaciones. Cada diferencia
 * llega al administrador como solicitud de aprobación.
 *
 * Contar a ciegas es lo que hace que el conteo valga: si el trabajador viera
 * antes lo esperado, lo natural sería escribirlo.
 *
 *   · Primera jornada de la caja: no hay con qué comparar; solo se cuenta.
 *   · Tras un cierre forzado: lo «dejado» es el saldo en libros, y este es el
 *     primer conteo desde entonces. Se le dice al empezar.
 */
export function FondeoInicialFlow(): React.JSX.Element {
  const hydrated = useHydrated();
  const router = useRouter();
  const caja = useCaja();
  const vista = useVistaDeCaja();
  const monedas = vista.apertura.monedas;
  const anterior = vista.apertura.cierreAnterior;

  const [step, setStep] = React.useState<Step>("conteo");
  const [amounts, setAmounts] = React.useState<Record<string, string>>(() => consumeFondeoInicialDraft()?.amounts ?? {});
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [formError, setFormError] = React.useState<string | undefined>();
  const [comparacion, setComparacion] = React.useState<ComparacionDeApertura | null>(null);
  const [explicaciones, setExplicaciones] = React.useState<Record<string, Explicacion>>({});
  const [revisionSubmitted, setRevisionSubmitted] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [openedAt, setOpenedAt] = React.useState<string | null>(null);

  /* Una jornada abierta antes de entrar bloquea la pantalla; la que acaba de
     abrir este flujo, no: su pantalla de éxito no puede quedar tapada. */
  const blocked = caja.jornada !== null && openedAt === null;

  function setAmount(currency: string, value: string) {
    setAmounts((prev) => ({ ...prev, [currency]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[currency];
      return next;
    });
    setFormError(undefined);
  }

  /** Paso 1 → 2. Todas las monedas se cuentan, también las que están en cero. */
  async function handleContinue(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    const conteos: { currency: string; contado: number }[] = [];
    for (const currency of monedas) {
      const raw = amounts[currency]?.trim() ?? "";
      const parsed = raw === "" ? null : parseAmountInput(raw);
      if (raw === "") nextErrors[currency] = "Cuenta esta moneda. Si no hay efectivo, escribe 0.";
      else if (parsed === null || parsed < 0) nextErrors[currency] = "Introduce un monto válido.";
      else conteos.push({ currency, contado: parsed });
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    setSubmitting(true);
    const r = await compararAperturaAction(conteos);
    setSubmitting(false);
    if (!r.ok) {
      setFormError(
        r.reason === "jornada-abierta"
          ? "La caja ya tiene una jornada abierta."
          : r.reason === "bloqueada"
            ? "La sede no está operando: no se puede abrir una jornada."
            : "No se pudo comprobar el conteo. Revisa las cifras e inténtalo de nuevo.",
      );
      return;
    }
    setComparacion(r.value);
    setRevisionSubmitted(false);
    setStep("revision");
  }

  const diferencias = comparacion && comparacion.cierreAnterior
    ? comparacion.monedas.filter((m) => m.diferencia !== 0)
    : [];

  function explicacionIncompleta(currency: string): string | undefined {
    const e = explicaciones[currency];
    if (!e?.motivo) return "Indica el motivo de la diferencia.";
    if (e.motivo === "Otro" && !e.observaciones?.trim()) return "Con «Otro», explica la diferencia en las observaciones.";
    return undefined;
  }

  async function handleConfirm() {
    if (!comparacion || submitting) return;
    setRevisionSubmitted(true);
    if (diferencias.some((d) => explicacionIncompleta(d.currency))) return;
    setSubmitting(true);
    const r = await abrirJornadaAction(
      comparacion.monedas.map((m) => ({
        currency: m.currency,
        contado: m.contado,
        ...(m.diferencia !== 0 && comparacion.cierreAnterior ? explicaciones[m.currency] : {}),
      })),
    );
    setSubmitting(false);
    if (!r.ok) {
      setFormError(
        r.reason === "trabajador-con-otra-jornada"
          ? "Ya tienes una jornada abierta en otra caja. Ciérrala antes de abrir esta."
          : r.reason === "jornada-abierta"
            ? "La caja ya tiene una jornada abierta."
            : "No se pudo abrir la jornada. Revisa los motivos e inténtalo de nuevo.",
      );
      return;
    }
    setOpenedAt(r.value.openedAt);
    setStep("completado");
    router.refresh();
  }

  if (blocked) {
    return (
      <div className="flex flex-col gap-6">
        <BackLink />
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
            <span aria-hidden="true" className="grid size-12 place-items-center rounded-control bg-primary-subtle text-primary">
              <Lock className="size-6" />
            </span>
            <p className="mt-2 text-section-title text-text-primary">La caja ya está abierta</p>
            <p className="max-w-sm text-body text-text-secondary">
              {caja.summary.register} ya tiene una jornada abierta
              {caja.jornada && !caja.jornada.propia ? `, de ${caja.jornada.worker}` : ""}. No se puede abrir otra hasta
              que esa se cierre.
            </p>
            <Button className="mt-4" asChild>
              <Link href={CAJA_ROUTE}>Volver a Caja</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (vista.jornadaEnOtraCaja && step !== "completado") {
    return (
      <div className="flex flex-col gap-6">
        <BackLink />
        <Alert variant="warning" title={`Tienes la jornada abierta en ${vista.jornadaEnOtraCaja.cajaNombre}`}>
          Un trabajador opera una sola caja a la vez. Haz el arqueo y cierre de esa jornada en su equipo antes de abrir
          esta caja.
        </Alert>
      </div>
    );
  }

  if (vista.bloqueo && step !== "completado") {
    return (
      <div className="flex flex-col gap-6">
        <BackLink />
        <Alert variant="error" title="La sede no está operando">
          No se puede abrir una jornada mientras PuntoCash mantenga la sede sin operar. Consulta con el administrador de
          tu sede.
        </Alert>
      </div>
    );
  }

  if (step === "completado" && comparacion && openedAt) {
    return <AperturaCompletada comparacion={comparacion} openedAt={openedAt} caja={caja.summary.register} worker={vista.trabajador.fullName} />;
  }

  if (step === "revision" && comparacion) {
    return (
      <div className="flex flex-col gap-6">
        <BackLink />
        <div>
          <h1 className="text-screen-title text-text-primary">Revisión de la apertura</h1>
          <p className="mt-2 max-w-2xl text-body text-text-secondary">
            {comparacion.cierreAnterior
              ? "Esto es lo que contaste comparado con lo que dejó el cierre anterior."
              : "Es la primera jornada de esta caja: no hay un cierre anterior con el que comparar."}
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex min-w-0 items-center gap-3">
              <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-control bg-primary-subtle text-primary">
                <ShieldCheck className="size-[18px]" />
              </span>
              <div className="min-w-0">
                <CardTitle>Conteo de apertura</CardTitle>
                {comparacion.cierreAnterior ? (
                  <p className="mt-0.5 text-body-sm text-text-secondary">
                    {comparacion.cierreAnterior.forzado
                      ? `La jornada de ${comparacion.cierreAnterior.workerName} se cerró sin contar el ${formatDateTime(new Date(comparacion.cierreAnterior.closedAt))}: lo dejado es el saldo en libros.`
                      : `Cierre de ${comparacion.cierreAnterior.workerName}, el ${formatDateTime(new Date(comparacion.cierreAnterior.closedAt))}.`}
                  </p>
                ) : null}
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 overflow-x-auto">
            <div className="min-w-[40rem]">
              <div className="grid grid-cols-[1fr_repeat(3,9rem)] gap-4 border-b border-border pb-2 text-label font-medium text-text-secondary">
                <span>Moneda</span>
                <span className="text-right">Dejado</span>
                <span className="text-right">Contado</span>
                <span className="text-right">Diferencia</span>
              </div>
              {comparacion.monedas.map((m) => {
                const conCierre = comparacion.cierreAnterior !== null;
                const error = revisionSubmitted && conCierre && m.diferencia !== 0 ? explicacionIncompleta(m.currency) : undefined;
                return (
                  <div key={m.currency} className="border-b border-border py-3 last:border-b-0">
                    <div className="grid grid-cols-[1fr_repeat(3,9rem)] items-center gap-4 text-body-sm">
                      <span className="flex items-center gap-2 font-semibold text-text-primary">
                        <CurrencyFlag currency={m.currency} />
                        {m.currency}
                      </span>
                      <span className="pc-numeric text-right">{m.dejado === null ? "—" : formatMoney({ amount: m.dejado, currency: m.currency })}</span>
                      <span className="pc-numeric text-right font-semibold">{formatMoney({ amount: m.contado, currency: m.currency })}</span>
                      <span
                        className={cn(
                          "pc-numeric text-right font-semibold",
                          conCierre && m.diferencia < 0 && "text-error-foreground",
                          conCierre && m.diferencia > 0 && "text-success-foreground",
                        )}
                      >
                        {!conCierre ? "—" : m.diferencia === 0 ? "Coincide" : `${formatSignedAmount(m.diferencia)} ${m.currency}`}
                      </span>
                    </div>
                    {conCierre && m.diferencia !== 0 ? (
                      <ExplicacionDeDiferencia
                        currency={m.currency}
                        diferencia={m.diferencia}
                        value={explicaciones[m.currency] ?? {}}
                        error={error}
                        onChange={(e) => setExplicaciones((prev) => ({ ...prev, [m.currency]: e }))}
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>

            {diferencias.length > 0 ? (
              <Alert variant="info" title="Cada diferencia llega al administrador de la sede para su aprobación." />
            ) : null}
            {formError ? <Alert variant="error" title={formError} /> : null}
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button variant="secondary" type="button" onClick={() => setStep("conteo")}>
            Volver a contar
          </Button>
          <Button type="button" loading={submitting} onClick={() => void handleConfirm()}>
            {submitting ? null : <CircleCheck aria-hidden="true" />}
            {submitting ? "Abriendo…" : "Confirmar y abrir caja"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <BackLink />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-screen-title text-text-primary">Abrir jornada</h1>
          <p className="mt-2 max-w-2xl text-body text-text-secondary">
            Cuenta el efectivo que hay en {caja.summary.register}, moneda por moneda, y escribe lo que cuentas.
          </p>
        </div>
        <Badge variant="warning">Pendiente de apertura</Badge>
      </div>

      {anterior?.forzado ? (
        <Alert variant="warning" title="La jornada anterior se cerró sin contar">
          Tu conteo será el primero desde el cierre forzado de la jornada de {anterior.workerName}.
        </Alert>
      ) : null}

      <Card>
        <CardContent className="flex flex-wrap gap-x-10 gap-y-4 py-5">
          <InfoItem icon={Wallet} label="Caja" value={caja.summary.register} />
          <InfoItem icon={User} label="Trabajador" value={vista.trabajador.fullName} />
          <InfoItem icon={CalendarClock} label="Apertura" value="Se registrará al confirmar" />
        </CardContent>
      </Card>

      <form onSubmit={(e) => void handleContinue(e)} className="grid grid-cols-1 items-start gap-6 wide:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <div className="flex min-w-0 items-center gap-3">
              <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-control bg-primary-subtle text-primary">
                <Banknote className="size-[18px]" />
              </span>
              <div className="min-w-0">
                <CardTitle>Efectivo contado</CardTitle>
                <p className="mt-0.5 text-body-sm text-text-secondary">
                  Cuenta todas las monedas de la caja. Si en una no hay efectivo, escribe 0.
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex flex-col gap-5">
            <div>
              <div className="grid grid-cols-[1fr_12rem] gap-4 border-b border-border pb-2">
                <span className="text-label font-medium text-text-secondary">Moneda</span>
                <span className="text-label font-medium text-text-secondary">Contado</span>
              </div>
              {monedas.map((currency) => (
                <ConteoRow
                  key={currency}
                  currency={currency}
                  value={amounts[currency] ?? ""}
                  error={errors[currency]}
                  onChange={(value) => setAmount(currency, value)}
                />
              ))}
            </div>

            <Link
              href={ANADIR_MONEDA_ROUTE}
              onClick={() => saveFondeoInicialDraft({ amounts })}
              className="flex items-center gap-2 rounded-control border border-dashed border-border px-4 py-3 text-body-sm text-text-secondary transition-colors duration-(--duration-fast) ease-(--ease-standard) hover:border-border-navy hover:bg-primary-subtle outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <Plus className="size-4 shrink-0 text-primary" aria-hidden="true" />
              ¿Hay en la caja una moneda que no aparece? <span className="font-medium text-primary underline">Añádela a la caja →</span>
            </Link>

            {formError ? <Alert variant="error" title={formError} /> : null}

            <div className="flex items-center justify-end gap-3 border-t border-border pt-5">
              <Button variant="secondary" type="button" asChild>
                <Link href={CAJA_ROUTE}>Cancelar</Link>
              </Button>
              <Button type="submit" disabled={!hydrated} loading={submitting}>
                Continuar
                <ArrowRight aria-hidden="true" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="self-start">
          <CardHeader>
            <CardTitle>Cómo se abre la caja</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-body-sm text-text-secondary">
            <p>Primero cuentas. Después verás lo que dejó el cierre anterior y, si algo no coincide, dirás por qué.</p>
            <p>Lo que cuentes es el efectivo con el que empieza la jornada.</p>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

function ExplicacionDeDiferencia({
  currency,
  diferencia,
  value,
  error,
  onChange,
}: {
  currency: string;
  diferencia: number;
  value: Explicacion;
  error: string | undefined;
  onChange: (e: Explicacion) => void;
}) {
  const motivoField: FieldSpec = { id: `apertura-motivo-${currency}`, label: `Motivo de la diferencia en ${currency}`, error };
  const obsField: FieldSpec = { id: `apertura-obs-${currency}`, label: `Observaciones de ${currency}` };
  const validos = getValidOpeningReasons(diferencia);
  return (
    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[16rem_1fr]">
      <div>
        <label htmlFor={motivoField.id} className="text-caption text-text-secondary">
          Motivo
        </label>
        <Select
          value={value.motivo && validos.includes(value.motivo as never) ? value.motivo : ""}
          onValueChange={(motivo) => onChange({ ...value, motivo })}
        >
          <SelectTrigger {...fieldAria(motivoField)} aria-label={String(motivoField.label)}>
            <SelectValue placeholder="Elige el motivo" />
          </SelectTrigger>
          <SelectContent>
            {validos.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {error ? <p className="mt-1 text-caption text-error-foreground">{error}</p> : null}
      </div>
      <div>
        <label htmlFor={obsField.id} className="text-caption text-text-secondary">
          Observaciones {value.motivo === "Otro" ? "" : "(opcional)"}
        </label>
        <Input
          id={obsField.id}
          value={value.observaciones ?? ""}
          onChange={(e) => onChange({ ...value, observaciones: e.target.value })}
          autoComplete="off"
        />
      </div>
    </div>
  );
}

function AperturaCompletada({
  comparacion,
  openedAt,
  caja,
  worker,
}: {
  comparacion: ComparacionDeApertura;
  openedAt: string;
  caja: string;
  worker: string;
}) {
  return (
    <>
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center print:hidden">
        <span aria-hidden="true" className="grid size-14 place-items-center rounded-pill border-2 border-success text-success">
          <CircleCheck className="size-8" />
        </span>
        <h1 className="mt-5 text-screen-title text-text-primary">Caja abierta correctamente</h1>
        <p className="mt-2 text-body text-text-secondary">La jornada de {caja} está abierta.</p>

        <Card className="mt-8 w-full">
          <CardContent className="flex flex-col gap-4 pt-6">
            <dl className="flex flex-col">
              <SummaryRow label="Caja" value={caja} />
              <SummaryRow label="Trabajador" value={worker} />
              <SummaryRow label="Fecha y hora de apertura" value={formatDateTime(new Date(openedAt))} />
            </dl>
            <hr className="border-t border-dashed border-border" />
            <div className="flex flex-col gap-1">
              <span className="text-caption text-text-secondary">Efectivo de apertura</span>
              <dl className="flex flex-col">
                {comparacion.monedas.map((m) => (
                  <div key={m.currency} className="flex items-center justify-between gap-4 border-b border-border py-2.5 last:border-b-0 last:pb-0">
                    <dt className="flex items-center gap-2 text-body-sm text-text-primary">
                      <CurrencyFlag currency={m.currency} />
                      {m.currency}
                    </dt>
                    <dd className="pc-numeric text-body-sm font-semibold text-text-primary">{formatMoney({ amount: m.contado, currency: m.currency })}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 flex w-full flex-wrap items-center justify-center gap-3">
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer aria-hidden="true" />
            Imprimir comprobante
          </Button>
          <Button asChild>
            <Link href={CAJA_ROUTE}>Ir a Caja</Link>
          </Button>
        </div>
      </div>

      <section className="hidden print:block" aria-hidden="true">
        <h1 style={{ fontSize: "18px", fontWeight: 700 }}>PuntoCash · Comprobante de apertura de caja</h1>
        <dl style={{ marginTop: 16, lineHeight: 1.7 }}>
          <ReceiptLine label="Caja" value={caja} />
          <ReceiptLine label="Trabajador" value={worker} />
          <ReceiptLine label="Fecha y hora de apertura" value={formatDateTime(new Date(openedAt))} />
          {comparacion.monedas.map((m) => (
            <ReceiptLine key={m.currency} label={m.currency} value={formatMoney({ amount: m.contado, currency: m.currency })} />
          ))}
        </dl>
      </section>
    </>
  );
}

function BackLink() {
  return (
    <Link
      href={CAJA_ROUTE}
      className="inline-flex w-fit items-center gap-2 rounded-control text-label font-medium text-text-secondary transition-colors hover:text-text-primary outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-primary print:hidden"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      Volver a Caja
    </Link>
  );
}

function ReceiptLine({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 24 }}>
      <dt style={{ color: "#6B7280" }}>{label}</dt>
      <dd style={{ fontWeight: 600 }}>{value}</dd>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }: { icon: typeof Wallet; label: string; value: string }) {
  return (
    <span className="flex items-center gap-3">
      <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-control bg-primary-subtle text-primary">
        <Icon className="size-[18px]" />
      </span>
      <span className="flex flex-col">
        <span className="text-caption text-text-secondary">{label}</span>
        <span className="text-body-sm font-semibold text-text-primary">{value}</span>
      </span>
    </span>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-2.5 last:border-b-0 last:pb-0">
      <dt className="text-body-sm text-text-secondary">{label}</dt>
      <dd className="pc-numeric text-body-sm font-semibold text-text-primary">{value}</dd>
    </div>
  );
}

function ConteoRow({
  currency,
  value,
  error,
  onChange,
}: {
  currency: string;
  value: string;
  error: string | undefined;
  onChange: (value: string) => void;
}) {
  const field: FieldSpec = { id: `fondeo-${currency}`, label: `Efectivo contado en ${currency}`, error };
  const currencyName = findCajaCurrency(currency)?.name;
  return (
    <div className="grid grid-cols-[1fr_12rem] items-center gap-4 border-b border-border py-3 last:border-b-0">
      <span className="flex min-w-0 items-center gap-2">
        <CurrencyFlag currency={currency} />
        <span className="font-semibold text-text-primary">{currency}</span>
        {currencyName ? <span className="truncate text-body-sm text-text-secondary">· {currencyName}</span> : null}
      </span>
      <div>
        <label htmlFor={field.id} className="sr-only">
          {field.label}
        </label>
        <Input
          {...fieldAria(field)}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          invalid={Boolean(error)}
          inputMode="decimal"
          autoComplete="off"
          numeric
          placeholder="0,00"
        />
        {error ? <p className="mt-1 text-caption text-error-foreground">{error}</p> : null}
      </div>
    </div>
  );
}
