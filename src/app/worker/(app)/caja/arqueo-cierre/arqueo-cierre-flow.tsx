"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CircleCheck,
  ClipboardCheck,
  Clock3,
  Lock,
  Printer,
  TrendingDown,
  User,
  Wallet,
} from "lucide-react";

import { Alert, Badge, Button, Card, CardContent, CardHeader, CardTitle, Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, fieldAria } from "@/components/ui";
import { CurrencyFlag } from "@/components/patterns/currency-flag";
import { cn } from "@/lib/utils";
import { formatDateTime, formatMoney, formatSignedAmount, parseAmountInput } from "@/lib/format";
import { useRouter } from "next/navigation";
import {
  findCajaCurrency,
  getValidAdjustmentReasons,
  type CajaAdjustmentReason,
  type CajaBalance,
  type CajaClosingAuditCurrency,
  type CajaJornada,
} from "@/features/caja/caja-data";
import { useCaja } from "@/features/caja/use-caja";
import { useVistaDeCaja } from "@/features/worker/caja-context";
import type { CierreDeclarado } from "@/features/network/caja-operativa";
import { cerrarJornadaAction, declararCierreAction } from "../../../_actions";

interface CerrarJornadaResult {
  jornada: CajaJornada;
  audit: {
    currencies: readonly CajaClosingAuditCurrency[];
    result: { audited: number; balanced: number; withDifferences: number };
  };
}

const CAJA_ROUTE = "/worker/caja" as Route;
const OBSERVACIONES_MAX = 250;

interface ClosingDraftCurrency {
  currency: string;
  expected: number;
  counted: number;
  difference: number;
  motivo?: CajaAdjustmentReason;
  observaciones?: string;
}

/**
 * **Arqueo y cierre — a ciegas** (decisión del 5/11/2026).
 *
 * Quien cierra cuenta **sin ver el saldo en libros**. Al continuar se le
 * avisa de que las cifras no se podrán cambiar; si confirma, quedan
 * declaradas en el servidor y desde ahí la jornada no registra nada más. Solo
 * entonces ve lo esperado y la diferencia, explica cada una y cierra.
 *
 * Contar a ciegas es lo que hace creíble lo declarado: si coincide con los
 * libros, no pudo copiarlo. Y es la cifra que recibe quien abre la jornada
 * siguiente, que ve esos totales y dice si los recibe.
 */
export function ArqueoCierreFlow(): React.JSX.Element {
  const router = useRouter();
  const caja = useCaja();
  const vista = useVistaDeCaja();
  const jornada = caja.jornadaAbierta ? caja.jornada : null;
  const worker = vista.trabajador;
  const CAJA_BALANCES = caja.balances;
  const CAJA_SUMMARY = caja.summary;
  const declarado = vista.cierreDeclarado;
  const [amounts, setAmounts] = React.useState<Record<string, string>>({});
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [porDeclarar, setPorDeclarar] = React.useState<{ currency: string; contado: number }[] | null>(null);
  const [motivos, setMotivos] = React.useState<Record<string, CajaAdjustmentReason | "">>({});
  const [observaciones, setObservaciones] = React.useState<Record<string, string>>({});
  const [submitted, setSubmitted] = React.useState(false);
  const [result, setResult] = React.useState<CerrarJornadaResult | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | undefined>();
  const [confirmError, setConfirmError] = React.useState<string | undefined>();

  /* Sin jornada abierta no hay nada que arquear, salvo que la haya cerrado
     este mismo flujo: su resultado no puede quedar tapado por su efecto. */
  const blocked = !caja.jornadaAbierta && result === null;

  function setCounted(currency: string, value: string) {
    setAmounts((prev) => ({ ...prev, [currency]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[currency];
      return next;
    });
    setFormError(undefined);
  }

  /** Paso 1: todo contado → aviso de que no se podrá cambiar. */
  function handleContinue(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    const conteos: { currency: string; contado: number }[] = [];
    for (const { currency } of CAJA_BALANCES) {
      const raw = amounts[currency]?.trim() ?? "";
      const parsed = raw === "" ? null : parseAmountInput(raw);
      if (raw === "") nextErrors[currency] = "Cuenta esta moneda. Si no hay efectivo, escribe 0.";
      else if (parsed === null || parsed < 0) nextErrors[currency] = "Introduce un monto válido.";
      else conteos.push({ currency, contado: parsed });
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setPorDeclarar(conteos);
  }

  async function handleDeclarar() {
    if (!porDeclarar || submitting) return;
    setSubmitting(true);
    const r = await declararCierreAction(porDeclarar);
    setSubmitting(false);
    setPorDeclarar(null);
    if (!r.ok && r.reason !== "conteo-ya-declarado") {
      setFormError(
        r.reason === "jornada-no-abierta"
          ? "La jornada ya no está abierta."
          : "No se pudo registrar el arqueo. Revisa las cifras e inténtalo de nuevo.",
      );
      return;
    }
    setSubmitted(false);
    router.refresh();
  }

  const diferencias = declarado ? declarado.monedas.filter((m) => m.diferencia !== 0) : [];

  function explicacionIncompleta(currency: string): boolean {
    const motivo = motivos[currency];
    if (!motivo) return true;
    return motivo === "Otro" && !(observaciones[currency] ?? "").trim();
  }

  async function handleConfirm() {
    if (!declarado || submitting) return;
    setSubmitted(true);
    if (diferencias.some((d) => explicacionIncompleta(d.currency))) return;
    setSubmitting(true);
    setConfirmError(undefined);
    const outcome = await cerrarJornadaAction(
      diferencias.map(({ currency }) => ({
        currency,
        motivo: motivos[currency] || undefined,
        ...((observaciones[currency] ?? "").trim() ? { observaciones: observaciones[currency]!.trim() } : {}),
      })),
    );
    if (!outcome.ok) {
      setConfirmError(
        outcome.reason === "jornada-no-abierta"
          ? "La jornada ya no está abierta: el administrador pudo haber forzado su cierre."
          : "No fue posible confirmar el cierre. Revisa los motivos e inténtalo de nuevo.",
      );
      setSubmitting(false);
      return;
    }
    const monedas = outcome.value.monedas;
    setResult({
      jornada: {
        register: CAJA_SUMMARY.register,
        worker: worker.fullName,
        openedAt: outcome.value.openedAt,
        closedAt: outcome.value.closedAt,
        status: "CLOSED",
      },
      audit: {
        currencies: monedas.map((m) => ({
          currency: m.currency,
          expected: m.esperado,
          counted: m.contado,
          difference: m.diferencia,
          ...(m.motivo ? { motivo: m.motivo } : {}),
          ...(m.observaciones ? { observaciones: m.observaciones } : {}),
        })),
        result: {
          audited: monedas.length,
          balanced: monedas.filter((m) => m.diferencia === 0).length,
          withDifferences: monedas.filter((m) => m.diferencia !== 0).length,
        },
      },
    });
    setSubmitting(false);
    router.refresh();
  }

  if (result) return <CierreCompletado result={result} />;
  if (blocked) return <BlockedState />;
  if (declarado && jornada) {
    return (
      <CierreRevision
        declarado={declarado}
        jornada={jornada}
        submitting={submitting}
        error={confirmError}
        onConfirmar={() => void handleConfirm()}
        resolucion={
          diferencias.length > 0 ? (
            <DifferenceResolution
              rows={diferencias.map((d) => ({ balance: { currency: d.currency, amount: d.esperado }, difference: d.diferencia }))}
              motivos={motivos}
              observaciones={observaciones}
              submitted={submitted}
              onMotivo={(currency, motivo) => setMotivos((prev) => ({ ...prev, [currency]: motivo }))}
              onObservaciones={(currency, value) => setObservaciones((prev) => ({ ...prev, [currency]: value.slice(0, OBSERVACIONES_MAX) }))}
            />
          ) : null
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <BackLink />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0"><h1 className="text-screen-title text-text-primary">Arqueo y cierre de caja</h1><p className="mt-2 max-w-2xl text-body text-text-secondary">Cuenta el efectivo que hay en {CAJA_SUMMARY.register}, moneda por moneda, y escribe lo que cuentas.</p></div>
        <Badge variant="success">Jornada abierta</Badge>
      </div>
      <ContextStrip openedAt={jornada?.openedAt} worker={worker.fullName} />

      <form onSubmit={handleContinue} className="grid grid-cols-1 items-start gap-6 wide:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader><div className="flex items-center gap-3"><span aria-hidden="true" className="grid size-9 place-items-center rounded-control bg-primary-subtle text-primary"><ClipboardCheck className="size-[18px]" /></span><div><CardTitle>Arqueo por moneda</CardTitle><p className="mt-0.5 text-body-sm text-text-secondary">Cuenta todas las monedas de la caja. Si en una no hay efectivo, escribe 0.</p></div></div></CardHeader>
          <CardContent className="flex flex-col gap-5 pt-0">
            <div>
              <div className="grid grid-cols-[1fr_12rem] gap-4 border-b border-border pb-2 text-label font-medium text-text-secondary"><span>Moneda</span><span>Efectivo contado</span></div>
              {CAJA_BALANCES.map(({ currency }) => <CountRow key={currency} currency={currency} value={amounts[currency] ?? ""} error={errors[currency]} onChange={(value) => setCounted(currency, value)} />)}
            </div>
            {formError ? <Alert variant="error" title={formError} /> : null}
            <div className="flex items-center justify-end gap-3 border-t border-border pt-5"><Button variant="secondary" type="button" asChild><Link href={CAJA_ROUTE}>Cancelar</Link></Button><Button type="submit">Continuar<ArrowRight aria-hidden="true" /></Button></div>
          </CardContent>
        </Card>
        <Card className="self-start">
          <CardHeader><CardTitle>Cómo se cierra la caja</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3 text-body-sm text-text-secondary">
            <p>Cuenta con calma. Cuando continúes, lo que escribiste queda declarado como tu arqueo y ya no se puede cambiar.</p>
            <p>Después verás lo que esperaban los libros de tu jornada y, si algo no coincide, dirás por qué.</p>
            <p>Lo que declares es lo que recibirá quien abra la caja la próxima vez.</p>
          </CardContent>
        </Card>
      </form>

      {porDeclarar ? <AvisoDeDeclaracion conteos={porDeclarar} caja={CAJA_SUMMARY.register} submitting={submitting} onSeguir={() => setPorDeclarar(null)} onConfirmar={() => void handleDeclarar()} /> : null}
    </div>
  );
}

function AvisoDeDeclaracion({ conteos, caja, submitting, onSeguir, onConfirmar }: { conteos: readonly { currency: string; contado: number }[]; caja: string; submitting: boolean; onSeguir: () => void; onConfirmar: () => void }) {
  return (
    <Dialog open onOpenChange={(v) => (v || submitting ? undefined : onSeguir())}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Los valores introducidos no podrán ser cambiados</DialogTitle>
          <DialogDescription>
            Si confirmas, este será tu arqueo de cierre de {caja} y la jornada ya no registrará operaciones. Si todavía no
            terminaste de contar, vuelve y termina antes de confirmar.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <ul className="flex flex-col divide-y divide-border rounded-control border border-border">
            {conteos.map((c) => (
              <li key={c.currency} className="flex items-center justify-between gap-4 px-4 py-2.5 text-body-sm">
                <span className="flex items-center gap-2 font-semibold text-text-primary"><CurrencyFlag currency={c.currency} />{c.currency}</span>
                <span className="pc-numeric font-semibold">{formatMoney({ amount: c.contado, currency: c.currency })}</span>
              </li>
            ))}
          </ul>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onSeguir} disabled={submitting}>Seguir contando</Button>
          <Button type="button" loading={submitting} onClick={onConfirmar}>Confirmar arqueo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CountRow({ currency, value, error, onChange }: { currency: string; value: string; error?: string; onChange: (value: string) => void }) {
  const entry = findCajaCurrency(currency);
  return <div className="grid grid-cols-[1fr_12rem] items-start gap-4 border-b border-border py-3 last:border-b-0">
    <span className="flex items-center gap-2 pt-2.5"><CurrencyFlag currency={currency} /><span className="text-body-sm font-semibold">{currency}</span><span className="text-body-sm text-text-secondary">· {entry?.name}</span></span>
    <div className="flex flex-col gap-1"><Input aria-label={`Efectivo contado en ${currency}`} aria-invalid={error ? true : undefined} value={value} onChange={(event) => onChange(event.target.value)} inputMode="decimal" autoComplete="off" numeric invalid={Boolean(error)} placeholder="0,00" suffix={currency} />{error ? <p className="text-caption text-error-foreground">{error}</p> : null}</div>
  </div>;
}

function Metric({ label, value, tone }: { label: string; value: number; tone: "success" | "error" | "neutral" }) { return <div className={cn("rounded-control border px-3 py-3 text-center", tone === "success" ? "border-success-border bg-success-subtle" : tone === "error" ? "border-error-border bg-error-subtle" : "border-border bg-surface-subtle")}><p className="text-caption text-text-secondary">{label}</p><p className="mt-1 pc-numeric text-amount font-semibold text-text-primary">{value}</p></div>; }

function DifferenceResolution({ rows, motivos, observaciones, submitted, onMotivo, onObservaciones }: { rows: readonly { balance: CajaBalance; difference: number | null }[]; motivos: Record<string, CajaAdjustmentReason | "">; observaciones: Record<string, string>; submitted: boolean; onMotivo: (currency: string, reason: CajaAdjustmentReason | "") => void; onObservaciones: (currency: string, value: string) => void }) {
  return <Card><CardHeader><div className="flex items-center gap-3"><span aria-hidden="true" className="grid size-9 place-items-center rounded-control bg-error-subtle text-error-foreground"><TrendingDown className="size-[18px]" /></span><CardTitle>Monedas con diferencia</CardTitle></div></CardHeader><CardContent className="flex flex-col gap-5 pt-0">{rows.map((row) => { const entry = findCajaCurrency(row.balance.currency); const reason = motivos[row.balance.currency] ?? ""; const required = reason === "Otro"; const invalid = submitted && (!reason || (required && !(observaciones[row.balance.currency] ?? "").trim())); return <div key={row.balance.currency} className="grid grid-cols-1 items-start gap-4 border-b border-border pb-5 last:border-b-0 last:pb-0 wide:grid-cols-[minmax(12rem,0.8fr)_minmax(15rem,1fr)_minmax(18rem,1.2fr)]"><div className="flex items-center gap-2 pt-2"><CurrencyFlag currency={row.balance.currency} /><span><span className="block text-body-sm font-semibold">{row.balance.currency}</span><span className="text-caption text-text-secondary">{entry?.name}</span></span></div><div><p className="mb-2 text-label text-text-primary">Motivo <span className="text-error" aria-hidden="true">*</span></p><Select value={reason} onValueChange={(value) => onMotivo(row.balance.currency, value as CajaAdjustmentReason)}><SelectTrigger {...fieldAria({ id: `cierre-motivo-${row.balance.currency}`, required: true, error: invalid && !reason ? "required" : undefined })} invalid={invalid && !reason}><SelectValue placeholder="Selecciona un motivo" /></SelectTrigger><SelectContent>{getValidAdjustmentReasons(row.difference ?? 0).map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div><div><div className="mb-2 flex items-baseline justify-between"><label htmlFor={`cierre-observaciones-${row.balance.currency}`} className="text-label text-text-primary">{required ? <>Observaciones <span className="text-error" aria-hidden="true">*</span></> : "Observaciones (opcional)"}</label><span className="text-caption text-text-secondary">{(observaciones[row.balance.currency] ?? "").length}/{OBSERVACIONES_MAX}</span></div><textarea id={`cierre-observaciones-${row.balance.currency}`} aria-required={required || undefined} aria-invalid={invalid || undefined} value={observaciones[row.balance.currency] ?? ""} onChange={(event) => onObservaciones(row.balance.currency, event.target.value)} maxLength={OBSERVACIONES_MAX} rows={2} className={cn("w-full resize-none rounded-control border bg-surface px-4 py-3 text-body outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20", invalid ? "border-error" : "border-border hover:border-border-strong")} placeholder="Añade detalles si es necesario." /></div></div>; })}</CardContent></Card>;
}

function CierreRevision({ declarado, jornada, submitting, error, resolucion, onConfirmar }: { declarado: CierreDeclarado; jornada: CajaJornada; submitting: boolean; error?: string; resolucion: React.ReactNode; onConfirmar: () => void }) {
  const CAJA_SUMMARY = useCaja().summary;
  const draft: ClosingDraftCurrency[] = declarado.monedas.map((m) => ({ currency: m.currency, expected: m.esperado, counted: m.contado, difference: m.diferencia }));
  return (
    <div className="flex flex-col gap-6">
      <BackLink />
      <div>
        <h1 className="text-screen-title text-text-primary">Revisar cierre de caja</h1>
        <p className="mt-2 max-w-2xl text-body text-text-secondary">Tu arqueo declarado, comparado con lo que esperaban los libros de la jornada. Las cifras ya no se pueden cambiar.</p>
      </div>
      <Card>
        <CardHeader><div className="flex items-center gap-3"><span aria-hidden="true" className="grid size-9 place-items-center rounded-control bg-primary-subtle text-primary"><ClipboardCheck className="size-[18px]" /></span><div><CardTitle>Resumen del cierre</CardTitle><p className="mt-0.5 text-body-sm text-text-secondary">Arqueo declarado el {formatDateTime(new Date(declarado.declaradoAt))}.</p></div></div></CardHeader>
        <CardContent className="flex flex-col gap-5 pt-0">
          <dl className="grid grid-cols-2 gap-x-8 gap-y-3 wide:grid-cols-4"><ReviewInfo label="Caja" value={CAJA_SUMMARY.register} /><ReviewInfo label="Trabajador" value={jornada.worker} /><ReviewInfo label="Apertura" value={formatDateTime(new Date(jornada.openedAt))} /><ReviewInfo label="Cierre" value="Se registrará al confirmar" /></dl>
          <AuditReviewTable draft={draft} />
        </CardContent>
      </Card>
      {resolucion}
      {declarado.monedas.some((m) => m.diferencia !== 0) ? <Alert variant="info" title="Cada diferencia llega al administrador de la sede para su aprobación." /> : null}
      <Alert variant="warning" title="Al confirmar, la jornada quedará cerrada. Lo que declaraste es lo que recibirá quien abra la caja la próxima vez." />
      {error ? <Alert variant="error" title={error} /> : null}
      <div className="flex justify-end gap-3"><Button type="button" loading={submitting} onClick={onConfirmar}>{submitting ? "Confirmando…" : "Confirmar cierre"}</Button></div>
    </div>
  );
}

function AuditReviewTable({ draft }: { draft: readonly ClosingDraftCurrency[] }) { return <div className="overflow-x-auto"><div className="min-w-[38rem]"><div className="grid grid-cols-[1.1fr_repeat(3,0.9fr)_1.1fr] gap-4 border-b border-border pb-2 text-label text-text-secondary"><span>Moneda</span><span className="text-right">Esperado</span><span className="text-right">Contado</span><span className="text-right">Diferencia</span><span>Estado</span></div>{draft.map((row) => { const entry = findCajaCurrency(row.currency); const state = row.difference === 0 ? "Cuadrada" : row.difference < 0 ? "Faltante" : "Sobrante"; return <div key={row.currency} className="grid grid-cols-[1.1fr_repeat(3,0.9fr)_1.1fr] gap-4 border-b border-border py-3 text-body-sm last:border-b-0"><span className="font-semibold">{row.currency} <span className="font-normal text-text-secondary">· {entry?.name}</span></span><span className="pc-numeric text-right">{formatMoney({ amount: row.expected, currency: row.currency })}</span><span className="pc-numeric text-right">{formatMoney({ amount: row.counted, currency: row.currency })}</span><span className={cn("pc-numeric text-right font-semibold", row.difference < 0 ? "text-error-foreground" : row.difference > 0 ? "text-success-foreground" : "")}>{formatSignedAmount(row.difference)} {row.currency}</span><span>{state}{row.motivo ? ` · ${row.motivo}` : ""}{row.observaciones ? ` · ${row.observaciones}` : ""}</span></div>; })}</div></div>; }

function CierreCompletado({ result }: { result: CerrarJornadaResult }) { const { jornada, audit } = result; const duration = formatDuration(new Date(jornada.openedAt), new Date(jornada.closedAt!)); return <><div className="mx-auto flex w-full max-w-4xl flex-col items-center print:hidden"><span aria-hidden="true" className="grid size-14 place-items-center rounded-pill border-2 border-success text-success"><CircleCheck className="size-8" /></span><h1 className="mt-5 text-screen-title text-text-primary">Caja cerrada correctamente</h1><p className="mt-2 text-center text-body text-text-secondary">La jornada de {jornada.register} se cerró correctamente.</p><Card className="mt-8 w-full"><CardContent className="flex flex-col gap-5 pt-6"><dl className="grid grid-cols-2 gap-x-8 gap-y-3 wide:grid-cols-4"><ReviewInfo label="Caja" value={jornada.register} /><ReviewInfo label="Trabajador" value={jornada.worker} /><ReviewInfo label="Apertura" value={formatDateTime(new Date(jornada.openedAt))} /><ReviewInfo label="Cierre" value={formatDateTime(new Date(jornada.closedAt!))} /><ReviewInfo label="Duración" value={duration} /></dl><div className="grid grid-cols-3 gap-3"><Metric label="Monedas arqueadas" value={audit.result.audited} tone="success" /><Metric label="Cuadradas" value={audit.result.balanced} tone="success" /><Metric label="Con diferencias" value={audit.result.withDifferences} tone={audit.result.withDifferences ? "error" : "neutral"} /></div><AuditReviewTable draft={audit.currencies.map(toDraft)} /></CardContent></Card><div className="mt-8 flex flex-wrap justify-center gap-3"><Button variant="secondary" onClick={() => window.print()}><Printer aria-hidden="true" />Imprimir comprobante</Button><Button asChild><Link href={CAJA_ROUTE}>Ir a Caja</Link></Button></div></div><CierrePrintableReceipt jornada={jornada} audit={audit} duration={duration} /></>; }

function toDraft(entry: CajaClosingAuditCurrency): ClosingDraftCurrency { return { currency: entry.currency, expected: entry.expected, counted: entry.counted, difference: entry.difference, motivo: entry.motivo as CajaAdjustmentReason | undefined, observaciones: entry.observaciones }; }
function ContextStrip({ openedAt, worker }: { openedAt?: string; worker: string }) { const CAJA_SUMMARY = useCaja().summary; return <Card><CardContent className="grid grid-cols-2 gap-6 py-5 wide:grid-cols-4"><InfoItem icon={Wallet} label="Caja" value={CAJA_SUMMARY.register} /><InfoItem icon={User} label="Trabajador" value={worker} /><InfoItem icon={CalendarClock} label="Jornada" value="Abierta" valueClassName="text-success-foreground" /><InfoItem icon={Clock3} label="Apertura" value={openedAt ? formatDateTime(new Date(openedAt)) : "—"} /></CardContent></Card>; }
function InfoItem({ icon: Icon, label, value, valueClassName }: { icon: typeof Wallet; label: string; value: string; valueClassName?: string }) { return <span className="flex items-center gap-3"><span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-control bg-primary-subtle text-primary"><Icon className="size-[18px]" /></span><span><span className="block text-caption text-text-secondary">{label}</span><span className={cn("text-body-sm font-semibold text-text-primary", valueClassName)}>{value}</span></span></span>; }
function ReviewInfo({ label, value }: { label: string; value: string }) { return <div><dt className="text-caption text-text-secondary">{label}</dt><dd className="pc-numeric mt-0.5 text-body-sm font-semibold text-text-primary">{value}</dd></div>; }
function BackLink() { return <Link href={CAJA_ROUTE} className="inline-flex w-fit items-center gap-2 rounded-control text-label font-medium text-text-secondary transition-colors hover:text-text-primary outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-primary print:hidden"><ArrowLeft className="size-4" aria-hidden="true" />Volver a Caja</Link>; }
function BlockedState() { return <div className="flex flex-col gap-6"><BackLink /><Card><CardContent className="flex flex-col items-center gap-2 py-16 text-center"><span aria-hidden="true" className="grid size-12 place-items-center rounded-control bg-primary-subtle text-primary"><Lock className="size-6" /></span><p className="mt-2 text-section-title text-text-primary">No hay una jornada abierta para cerrar.</p><Button className="mt-4" asChild><Link href={CAJA_ROUTE}>Volver a Caja</Link></Button></CardContent></Card></div>; }
function formatDuration(openedAt: Date, closedAt: Date): string { const minutes = Math.max(0, Math.round((closedAt.getTime() - openedAt.getTime()) / 60_000)); return `${Math.floor(minutes / 60)} h ${minutes % 60} min`; }
function CierrePrintableReceipt({ jornada, audit, duration }: { jornada: CerrarJornadaResult["jornada"]; audit: CerrarJornadaResult["audit"]; duration: string }) { return <section className="hidden print:block" aria-hidden="true"><h1 style={{ fontSize: "18px", fontWeight: 700 }}>PuntoCash · Comprobante de cierre de caja</h1><dl style={{ marginTop: 16, lineHeight: 1.7 }}><ReceiptLine label="Caja" value={jornada.register} /><ReceiptLine label="Trabajador" value={jornada.worker} /><ReceiptLine label="Apertura" value={formatDateTime(new Date(jornada.openedAt))} /><ReceiptLine label="Cierre" value={formatDateTime(new Date(jornada.closedAt!))} /><ReceiptLine label="Duración" value={duration} />{audit.currencies.map((row) => <React.Fragment key={row.currency}><ReceiptLine label={`${row.currency} · Esperado`} value={formatMoney({ amount: row.expected, currency: row.currency })} /><ReceiptLine label={`${row.currency} · Contado`} value={formatMoney({ amount: row.counted, currency: row.currency })} /><ReceiptLine label={`${row.currency} · Diferencia`} value={`${formatSignedAmount(row.difference)} ${row.currency}`} />{row.motivo ? <ReceiptLine label={`${row.currency} · Motivo`} value={row.motivo} /> : null}{row.observaciones ? <ReceiptLine label={`${row.currency} · Observaciones`} value={row.observaciones} /> : null}</React.Fragment>)}</dl></section>; }
function ReceiptLine({ label, value }: { label: string; value: string }) { return <div style={{ display: "flex", justifyContent: "space-between", gap: 24 }}><dt style={{ color: "#6B7280" }}>{label}</dt><dd style={{ fontWeight: 600 }}>{value}</dd></div>; }
