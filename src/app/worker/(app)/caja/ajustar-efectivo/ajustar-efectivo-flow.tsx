"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Calculator, CircleCheck, Equal, Lock, Printer, TrendingDown, TrendingUp } from "lucide-react";

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  fieldAria,
} from "@/components/ui";
import { CurrencyFlag } from "@/components/patterns/currency-flag";
import { cn } from "@/lib/utils";
import { formatDateTime, formatMoney, formatSignedAmount, parseAmountInput } from "@/lib/format";
import { findCajaCurrency, getValidAdjustmentReasons, type CajaAdjustmentReason } from "@/features/caja/caja-data";
import { useCaja } from "@/features/caja/use-caja";
import { useVistaDeCaja } from "@/features/worker/caja-context";
import { contarParaAjusteAction, explicarAjusteAction, type AjusteRegistrado } from "../../../_actions";

const CAJA_ROUTE = "/worker/caja" as Route;
const OBSERVACIONES_MAX = 200;

/** Un mensaje por cada rechazo que el dominio puede devolver al contar. */
const CONTEO_ERROR: Readonly<Record<string, string>> = {
  "moneda-no-habilitada": "Esa moneda ya no está habilitada en esta caja. Vuelve a Caja y comprueba sus monedas.",
  "conteo-invalido": "Introduce un monto válido.",
  bloqueada: "La sede no está operando: no se pueden registrar ajustes. Haz el arqueo y cierre de tu jornada.",
  "jornada-no-abierta": "La jornada ya no está abierta: quizá la administración forzó su cierre.",
};

type Resultado =
  | { tipo: "coincide"; currency: string; contado: number; fechaHora: string }
  | { tipo: "ajuste"; ajuste: AjusteRegistrado; contado: number };

/**
 * **Ajustar efectivo — a ciegas** (decisión del 6/11/2026).
 *
 * El trabajador no ve el saldo de su caja. Cuenta una moneda y escribe lo que
 * hay. Al continuar se le avisa de que la cifra no se podrá cambiar; si
 * confirma, **el ajuste queda registrado en ese momento** con la diferencia
 * contra los libros. Solo entonces la ve y dice por qué, en una ventana de la
 * que no se sale sin terminar. Si el motivo no llega (se va la luz), la
 * administración lo ve como «Sin explicar». Si lo contado coincide, no hay
 * ajuste.
 *
 * Mismo patrón que el arqueo y cierre: ver la diferencia antes de
 * comprometerse permitiría cancelar y volver a contar copiándola.
 *
 * Sirve también para la reposición o el retiro de fondos durante la jornada:
 * se cuenta después de recibir o entregar el efectivo y la diferencia lo dice.
 */
export function AjustarEfectivoFlow(): React.JSX.Element {
  const router = useRouter();
  const caja = useCaja();
  const vista = useVistaDeCaja();
  const worker = vista.trabajador;
  const jornada = caja.jornadaAbierta ? caja.jornada : null;
  const MONEDAS = caja.monedas;

  const [currency, setCurrency] = React.useState<string>("");
  const [countedInput, setCountedInput] = React.useState("");
  const [currencyError, setCurrencyError] = React.useState<string | undefined>();
  const [countedError, setCountedError] = React.useState<string | undefined>();
  const [formError, setFormError] = React.useState<string | undefined>();

  const [porDeclarar, setPorDeclarar] = React.useState<{ currency: string; contado: number } | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  /** Registrado y con diferencia: falta el motivo. */
  const [pendiente, setPendiente] = React.useState<(AjusteRegistrado & { contado: number }) | null>(null);
  const [motivo, setMotivo] = React.useState<CajaAdjustmentReason | "">("");
  const [observaciones, setObservaciones] = React.useState("");
  const [explicacionEnviada, setExplicacionEnviada] = React.useState(false);
  const [explicacionError, setExplicacionError] = React.useState<string | undefined>();

  const [resultado, setResultado] = React.useState<Resultado | null>(null);

  /*
   * Sin jornada abierta no hay nada que ajustar, salvo que esta pantalla ya
   * haya registrado algo: que la jornada se cierre desde otra pestaña no
   * puede tapar lo que el trabajador está mirando.
   */
  const blocked = (!caja.jornadaAbierta || vista.bloqueo !== null) && resultado === null && pendiente === null;

  function handleContinue(event: React.FormEvent) {
    event.preventDefault();
    setFormError(undefined);
    const parsed = countedInput.trim() === "" ? null : parseAmountInput(countedInput);
    const eCurrency = currency ? undefined : "Selecciona la moneda que contaste.";
    const eCounted =
      countedInput.trim() === ""
        ? "Introduce el efectivo contado. Si no hay, escribe 0."
        : parsed === null || parsed < 0
          ? "Introduce un monto válido."
          : undefined;
    setCurrencyError(eCurrency);
    setCountedError(eCounted);
    if (eCurrency || eCounted || parsed === null) return;
    setPorDeclarar({ currency, contado: parsed });
  }

  async function handleDeclarar() {
    if (!porDeclarar || submitting) return;
    setSubmitting(true);
    const declarado = porDeclarar;
    const r = await contarParaAjusteAction(declarado);
    setSubmitting(false);
    setPorDeclarar(null);
    if (!r.ok) {
      setFormError(CONTEO_ERROR[r.reason] ?? "No se pudo registrar el conteo. Vuelve a Caja y comprueba su estado.");
      return;
    }
    router.refresh();
    if (r.value === null) {
      setResultado({ tipo: "coincide", currency: declarado.currency, contado: declarado.contado, fechaHora: new Date().toISOString() });
      return;
    }
    setPendiente({ ...r.value, contado: declarado.contado });
  }

  const motivoError = explicacionEnviada && !motivo ? "Selecciona el motivo de la diferencia." : undefined;
  const observacionesError =
    explicacionEnviada && motivo === "Otro" && !observaciones.trim() ? "Explica el motivo en las observaciones." : undefined;

  async function handleExplicar() {
    if (!pendiente || submitting) return;
    setExplicacionEnviada(true);
    if (!motivo || (motivo === "Otro" && !observaciones.trim())) return;
    setSubmitting(true);
    setExplicacionError(undefined);
    const r = await explicarAjusteAction(pendiente.movementId, {
      motivo,
      ...(observaciones.trim() ? { observaciones: observaciones.trim() } : {}),
    });
    setSubmitting(false);
    if (!r.ok) {
      setExplicacionError("No se pudo guardar el motivo. Revísalo e inténtalo de nuevo.");
      return;
    }
    setResultado({ tipo: "ajuste", ajuste: r.value, contado: pendiente.contado });
    setPendiente(null);
    router.refresh();
  }

  if (resultado) return <ResultadoView resultado={resultado} caja={caja.summary.register} worker={worker.fullName} />;
  if (blocked) return <BlockedState />;

  return (
    <div className="flex flex-col gap-6">
      <BackLink />
      <div className="min-w-0">
        <h1 className="text-screen-title text-text-primary">Ajustar efectivo</h1>
        <p className="mt-2 max-w-2xl text-body text-text-secondary">
          Cuenta el efectivo de una moneda de {caja.summary.register} y escribe lo que hay. Úsalo también al recibir o
          entregar fondos durante la jornada: cuenta después de hacerlo.
        </p>
      </div>

      <form
        onSubmit={handleContinue}
        noValidate
        className="grid grid-cols-1 items-start gap-6 wide:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]"
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="grid size-9 place-items-center rounded-control bg-primary-subtle text-primary">
                <Calculator className="size-[18px]" />
              </span>
              <CardTitle>Conteo</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-5 pt-0">
            <Field id="ajuste-moneda" label="Moneda" error={currencyError} required>
              <Select
                value={currency}
                onValueChange={(v) => {
                  setCurrency(v);
                  setCurrencyError(undefined);
                }}
              >
                <SelectTrigger {...fieldAria({ id: "ajuste-moneda", error: currencyError, required: true })}>
                  <SelectValue placeholder="Selecciona la moneda" />
                </SelectTrigger>
                <SelectContent>
                  {MONEDAS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c} · {findCajaCurrency(c)?.name ?? c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field
              id="ajuste-efectivo-contado"
              label="Efectivo contado"
              description="Ingresa la cantidad de efectivo que contaste."
              error={countedError}
              required
            >
              <Input
                {...fieldAria({
                  id: "ajuste-efectivo-contado",
                  description: "Ingresa la cantidad de efectivo que contaste.",
                  error: countedError,
                  required: true,
                })}
                value={countedInput}
                onChange={(e) => {
                  setCountedInput(e.target.value);
                  setCountedError(undefined);
                }}
                inputMode="decimal"
                autoComplete="off"
                numeric
                placeholder="0,00"
                suffix={currency || undefined}
                invalid={Boolean(countedError)}
              />
            </Field>

            {formError ? <Alert variant="error" title={formError} /> : null}

            <div className="pc-botonera border-t border-border pt-5 sm:justify-end">
              <Button variant="secondary" type="button" asChild>
                <Link href={CAJA_ROUTE}>Cancelar</Link>
              </Button>
              <Button type="submit">
                Continuar
                <ArrowRight aria-hidden="true" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="self-start">
          <CardHeader>
            <CardTitle>Cómo funciona</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-body-sm text-text-secondary">
            <p>Cuenta con calma. Cuando continúes, lo que escribiste queda registrado y ya no se puede cambiar.</p>
            <p>Si no coincide con los libros de tu jornada, verás la diferencia y dirás por qué.</p>
            <p>Cada diferencia llega al administrador de la sede para su aprobación.</p>
            <p className="text-caption">
              Jornada abierta el {jornada ? formatDateTime(new Date(jornada.openedAt)) : "—"} · {worker.fullName}
            </p>
          </CardContent>
        </Card>
      </form>

      {porDeclarar ? (
        <Dialog open onOpenChange={(v) => (v || submitting ? undefined : setPorDeclarar(null))}>
          <DialogContent size="md">
            <DialogHeader>
              <DialogTitle>El valor introducido no podrá ser cambiado</DialogTitle>
              <DialogDescription>
                Si confirmas, este será tu conteo de {porDeclarar.currency} y el ajuste quedará registrado. Si todavía no
                terminaste de contar, vuelve y termina antes de confirmar.
              </DialogDescription>
            </DialogHeader>
            <DialogBody>
              <p className="flex items-center justify-between gap-4 rounded-control border border-border px-4 py-2.5 text-body-sm">
                <span className="flex items-center gap-2 font-semibold text-text-primary">
                  <CurrencyFlag currency={porDeclarar.currency} />
                  {porDeclarar.currency}
                </span>
                <span className="pc-numeric font-semibold">{formatMoney({ amount: porDeclarar.contado, currency: porDeclarar.currency })}</span>
              </p>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setPorDeclarar(null)} disabled={submitting}>
                Seguir contando
              </Button>
              <Button type="button" loading={submitting} onClick={() => void handleDeclarar()}>
                Confirmar conteo
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}

      {pendiente ? (
        <Dialog open onOpenChange={() => undefined}>
          <DialogContent
            hideClose
            size="lg"
            onEscapeKeyDown={(e) => e.preventDefault()}
            onPointerDownOutside={(e) => e.preventDefault()}
            onInteractOutside={(e) => e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle>Ajuste registrado · explica la diferencia</DialogTitle>
              <DialogDescription>
                Lo que contaste de {pendiente.currency} no coincide con los libros de tu jornada. El ajuste ya está
                registrado; di por qué.
              </DialogDescription>
            </DialogHeader>
            <DialogBody className="flex flex-col gap-5">
              <DifferenceCard amount={pendiente.diferencia} currency={pendiente.currency} />
              <Field id="ajuste-motivo" label="Motivo del ajuste" error={motivoError} required>
                <Select value={motivo} onValueChange={(v) => setMotivo(v as CajaAdjustmentReason)}>
                  <SelectTrigger {...fieldAria({ id: "ajuste-motivo", error: motivoError, required: true })}>
                    <SelectValue placeholder="Selecciona un motivo" />
                  </SelectTrigger>
                  <SelectContent>
                    {getValidAdjustmentReasons(pendiente.diferencia).map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field
                id="ajuste-observaciones"
                label="Observaciones"
                description={motivo === "Otro" ? "Obligatorias con el motivo «Otro»." : "Opcional."}
                error={observacionesError}
                required={motivo === "Otro"}
              >
                <textarea
                  {...fieldAria({ id: "ajuste-observaciones", error: observacionesError, required: motivo === "Otro" })}
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value.slice(0, OBSERVACIONES_MAX))}
                  maxLength={OBSERVACIONES_MAX}
                  rows={3}
                  className={cn(
                    "w-full resize-none rounded-control border bg-surface px-4 py-3 text-body text-text-primary",
                    "placeholder:text-text-secondary outline-none",
                    "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20",
                    observacionesError ? "border-error" : "border-border hover:border-border-strong",
                  )}
                  placeholder="Añade cualquier detalle relevante sobre este ajuste."
                />
              </Field>
              <Alert variant="info" title="La diferencia llega al administrador de la sede para su aprobación." />
              {explicacionError ? <Alert variant="error" title={explicacionError} /> : null}
            </DialogBody>
            <DialogFooter>
              <Button type="button" loading={submitting} onClick={() => void handleExplicar()}>
                Guardar motivo y terminar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}

/** Diferencia con el signo siempre escrito: nunca solo el color (§ accesibilidad). */
function DifferenceCard({ amount, currency }: { amount: number; currency: string }) {
  const tone = amount > 0 ? "success" : amount < 0 ? "error" : "neutral";
  const Icon = amount > 0 ? TrendingUp : amount < 0 ? TrendingDown : Equal;
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 rounded-control border px-4 py-4",
        tone === "success"
          ? "border-success-border bg-success-subtle text-success-foreground"
          : tone === "error"
            ? "border-error-border bg-error-subtle text-error-foreground"
            : "border-border bg-surface-subtle text-text-secondary",
      )}
    >
      <div>
        <p className="text-caption">Diferencia</p>
        <p className="pc-numeric text-amount font-semibold">
          {formatSignedAmount(amount)} {currency}
        </p>
        <p className="mt-0.5 text-caption">{amount > 0 ? "Sobra efectivo" : amount < 0 ? "Falta efectivo" : "Coincide"}</p>
      </div>
      <Icon className="size-8 shrink-0" aria-hidden="true" />
    </div>
  );
}

function ResultadoView({ resultado, caja, worker }: { resultado: Resultado; caja: string; worker: string }) {
  const coincide = resultado.tipo === "coincide";
  const currency = coincide ? resultado.currency : resultado.ajuste.currency;
  const fechaHora = coincide ? resultado.fechaHora : resultado.ajuste.fechaHora;
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center">
      <span className="grid size-14 place-items-center rounded-pill border-2 border-success text-success">
        <CircleCheck className="size-8" aria-hidden="true" />
      </span>
      <h1 className="mt-5 text-screen-title text-text-primary">{coincide ? "El conteo coincide" : "Ajuste registrado"}</h1>
      <p className="mt-2 text-center text-body text-text-secondary">
        {coincide
          ? `Lo que contaste de ${currency} coincide con los libros de tu jornada. No hay nada que ajustar.`
          : "El ajuste quedó registrado y la diferencia llegó al administrador de la sede."}
      </p>
      <Card className="mt-8 w-full">
        <CardContent className="flex flex-col gap-3 pt-6 text-body-sm">
          <Linea label="Moneda" value={`${currency} · ${findCajaCurrency(currency)?.name ?? currency}`} />
          <Linea label="Efectivo contado" value={formatMoney({ amount: resultado.contado, currency })} />
          {resultado.tipo === "ajuste" ? (
            <>
              <Linea label="Diferencia" value={`${formatSignedAmount(resultado.ajuste.diferencia)} ${currency}`} />
              <Linea label="Motivo" value={resultado.ajuste.motivo ?? "Sin explicar"} />
              {resultado.ajuste.observaciones ? <Linea label="Observaciones" value={resultado.ajuste.observaciones} /> : null}
              <Linea label="ID de movimiento" value={resultado.ajuste.movementId} />
            </>
          ) : null}
          <Linea label="Caja" value={caja} />
          <Linea label="Trabajador" value={worker} />
          <Linea label="Fecha y hora" value={formatDateTime(new Date(fechaHora))} />
        </CardContent>
      </Card>
      <div className="mt-7 flex flex-wrap justify-center gap-3 print:hidden">
        {resultado.tipo === "ajuste" ? (
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer aria-hidden="true" />
            Imprimir comprobante
          </Button>
        ) : null}
        <Button asChild>
          <Link href={CAJA_ROUTE}>Ir a Caja</Link>
        </Button>
      </div>
    </div>
  );
}

function Linea({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-border pb-2 last:border-b-0 last:pb-0">
      <span className="text-text-secondary">{label}</span>
      <span className="pc-numeric text-right font-medium text-text-primary">{value}</span>
    </div>
  );
}

function BlockedState() {
  return (
    <div className="flex flex-col gap-6">
      <BackLink />
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <Lock className="size-8 text-text-secondary" aria-hidden="true" />
          <h1 className="text-section-title text-text-primary">No hay jornada abierta</h1>
          <p className="max-w-md text-body-sm text-text-secondary">
            Para ajustar el efectivo necesitas una jornada abierta en esta caja y que la sede esté operando.
          </p>
          <Button asChild>
            <Link href={CAJA_ROUTE}>Ir a Caja</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
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
