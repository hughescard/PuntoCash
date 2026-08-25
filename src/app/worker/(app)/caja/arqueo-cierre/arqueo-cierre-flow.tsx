"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Check,
  CircleCheck,
  ClipboardCheck,
  Clock3,
  Lock,
  Printer,
  TrendingDown,
  TrendingUp,
  User,
  Wallet,
} from "lucide-react";

import { Alert, Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, fieldAria } from "@/components/ui";
import { CurrencyFlag } from "@/components/patterns/currency-flag";
import { cn } from "@/lib/utils";
import { formatDateTime, formatMoney, formatSignedAmount, parseAmountInput } from "@/lib/format";
import { getCurrentWorker } from "@/features/worker/session";
import {
  CAJA_BALANCES,
  CAJA_SUMMARY,
  cerrarJornada,
  findCajaCurrency,
  getJornadaActual,
  getValidAdjustmentReasons,
  hasOpenJornada,
  isReasonCompatibleWithDifference,
  type CajaAdjustmentReason,
  type CajaClosingAuditCurrency,
  type CerrarJornadaResult,
} from "@/features/caja/caja-data";

const CAJA_ROUTE = "/worker/caja" as Route;
const OBSERVACIONES_MAX = 250;
type Step = "form" | "revision" | "completado";

interface ClosingDraftCurrency {
  currency: string;
  expected: number;
  counted: number;
  difference: number;
  motivo?: CajaAdjustmentReason;
  observaciones?: string;
}

interface ClosingFormRow {
  balance: (typeof CAJA_BALANCES)[number];
  raw: string;
  counted: number | null;
  valid: boolean;
  difference: number | null;
  motivo: CajaAdjustmentReason | "";
  observaciones: string;
}

export function ArqueoCierreFlow(): React.JSX.Element {
  const [blocked] = React.useState(() => !hasOpenJornada());
  const jornada = getJornadaActual();
  const worker = getCurrentWorker();
  const [step, setStep] = React.useState<Step>("form");
  const [amounts, setAmounts] = React.useState<Record<string, string>>({});
  const [motivos, setMotivos] = React.useState<Record<string, CajaAdjustmentReason | "">>({});
  const [observaciones, setObservaciones] = React.useState<Record<string, string>>({});
  const [submitted, setSubmitted] = React.useState(false);
  const [draft, setDraft] = React.useState<readonly ClosingDraftCurrency[]>([]);
  const [result, setResult] = React.useState<CerrarJornadaResult | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [confirmError, setConfirmError] = React.useState<string | undefined>();

  const rows = CAJA_BALANCES.map((balance) => {
    const raw = amounts[balance.currency] ?? "";
    const counted = parseAmountInput(raw);
    const valid = counted !== null && counted >= 0;
    const difference = valid ? Math.round((counted - balance.amount) * 100) / 100 : null;
    const motivo = motivos[balance.currency] ?? "";
    return { balance, raw, counted, valid, difference, motivo, observaciones: observaciones[balance.currency] ?? "" } satisfies ClosingFormRow;
  });

  const allRowsValid = rows.every((row) => {
    if (!row.valid || row.difference === null) return false;
    if (row.difference === 0) return true;
    if (!row.motivo || !isReasonCompatibleWithDifference(row.motivo, row.difference)) return false;
    return row.motivo !== "Otro" || row.observaciones.trim().length > 0;
  });

  const auditedCount = rows.filter((row) => row.valid).length;
  const balancedCount = rows.filter((row) => row.difference === 0).length;
  const differenceRows = rows.filter((row) => row.difference !== null && row.difference !== 0);

  function setCounted(currency: string, value: string) {
    setAmounts((prev) => ({ ...prev, [currency]: value }));
    const balance = CAJA_BALANCES.find((item) => item.currency === currency);
    const parsed = parseAmountInput(value);
    const difference = balance && parsed !== null && parsed >= 0 ? Math.round((parsed - balance.amount) * 100) / 100 : null;
    setMotivos((prev) => {
      const current = prev[currency];
      if (!current || current === "Error de registro" || current === "Otro" || difference === null) return prev;
      return isReasonCompatibleWithDifference(current, difference) ? prev : { ...prev, [currency]: "" };
    });
  }

  function buildDraft(): readonly ClosingDraftCurrency[] | null {
    if (!allRowsValid) return null;
    return rows.map((row) => ({
      currency: row.balance.currency,
      expected: row.balance.amount,
      counted: row.counted!,
      difference: row.difference!,
      motivo: row.difference === 0 ? undefined : row.motivo || undefined,
      observaciones: row.difference === 0 ? undefined : row.observaciones.trim() || undefined,
    }));
  }

  function handleReview(event: React.FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    const nextDraft = buildDraft();
    if (!nextDraft) return;
    setDraft(nextDraft);
    setStep("revision");
  }

  async function handleConfirm() {
    if (!draft.length || submitting) return;
    setSubmitting(true);
    setConfirmError(undefined);
    await new Promise((resolve) => setTimeout(resolve, 600));
    const outcome = cerrarJornada({
      worker: worker.fullName,
      timestamp: new Date(),
      currencies: draft.map(({ currency, counted, motivo, observaciones }) => ({ currency, counted, motivo, observaciones })),
    });
    if (!outcome.ok) {
      setConfirmError("No fue posible confirmar el cierre con la información actual. Vuelve al arqueo y revisa los datos.");
      setSubmitting(false);
      return;
    }
    setResult(outcome.result);
    setSubmitting(false);
    setStep("completado");
  }

  if (blocked) return <BlockedState />;
  if (step === "completado" && result) return <CierreCompletado result={result} />;
  if (step === "revision") return <CierreRevision draft={draft} jornada={jornada!} submitting={submitting} error={confirmError} onVolver={() => setStep("form")} onConfirmar={() => void handleConfirm()} />;

  return (
    <div className="flex flex-col gap-6">
      <BackLink />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0"><h1 className="text-screen-title text-text-primary">Arqueo y cierre de caja</h1><p className="mt-2 max-w-2xl text-body text-text-secondary">Cuenta el efectivo disponible para cerrar la jornada de {CAJA_SUMMARY.register}.</p></div>
        <Badge variant="success">Jornada abierta</Badge>
      </div>
      <ContextStrip openedAt={jornada?.openedAt} worker={worker.fullName} />

      <form onSubmit={handleReview} className="flex flex-col gap-6">
        <div className="grid grid-cols-1 items-start gap-6 wide:grid-cols-[minmax(0,1.55fr)_minmax(20rem,0.9fr)]">
          <Card>
            <CardHeader><div className="flex items-center gap-3"><span aria-hidden="true" className="grid size-9 place-items-center rounded-control bg-primary-subtle text-primary"><ClipboardCheck className="size-[18px]" /></span><div><CardTitle>Arqueo por moneda</CardTitle><p className="mt-0.5 text-body-sm text-text-secondary">Ingresa el efectivo contado para cada moneda habilitada.</p></div></div></CardHeader>
            <CardContent className="overflow-x-auto pt-0">
              <div className="min-w-[38rem]">
                <div className="grid grid-cols-[1.15fr_0.9fr_1.05fr_0.7fr_0.75fr] gap-3 border-b border-border pb-2 text-label font-medium text-text-secondary"><span>Moneda</span><span className="text-right">Saldo esperado</span><span>Efectivo contado</span><span className="text-right">Diferencia</span><span className="text-right">Estado</span></div>
                {rows.map((row) => <CountRow key={row.balance.currency} row={row} submitted={submitted} onChange={(value) => setCounted(row.balance.currency, value)} />)}
              </div>
            </CardContent>
          </Card>
          <AuditSummary audited={auditedCount} balanced={balancedCount} differences={differenceRows} />
        </div>

        {differenceRows.length > 0 ? <DifferenceResolution rows={differenceRows} motivos={motivos} observaciones={observaciones} submitted={submitted} onMotivo={(currency, motivo) => setMotivos((prev) => ({ ...prev, [currency]: motivo }))} onObservaciones={(currency, value) => setObservaciones((prev) => ({ ...prev, [currency]: value.slice(0, OBSERVACIONES_MAX) }))} /> : null}

        <div className="flex items-center justify-end gap-3 border-t border-border pt-5"><Button variant="secondary" type="button" asChild><Link href={CAJA_ROUTE}>Cancelar</Link></Button><Button type="submit" disabled={!allRowsValid}>Revisar cierre de caja<ArrowRight aria-hidden="true" /></Button></div>
      </form>
    </div>
  );
}

function CountRow({ row, submitted, onChange }: { row: ClosingFormRow; submitted: boolean; onChange: (value: string) => void }) {
  const entry = findCajaCurrency(row.balance.currency);
  const invalid = submitted && !row.valid;
  const state = row.difference === null ? null : row.difference === 0 ? "Cuadrada" : row.difference < 0 ? "Faltante" : "Sobrante";
  return <div className="grid grid-cols-[1.15fr_0.9fr_1.05fr_0.7fr_0.75fr] items-center gap-3 border-b border-border py-3 last:border-b-0">
    <span className="flex items-center gap-2"><CurrencyFlag currency={row.balance.currency} /><span className="flex flex-col"><span className="text-body-sm font-semibold">{row.balance.currency}</span><span className="text-caption text-text-secondary">{entry?.name}</span></span></span>
    <span className="pc-numeric text-right text-body-sm font-medium">{formatMoney(row.balance)}</span>
    <Input aria-label={`Efectivo contado en ${row.balance.currency}`} value={row.raw} onChange={(event) => onChange(event.target.value)} inputMode="decimal" autoComplete="off" numeric invalid={invalid} placeholder="0,00" suffix={row.balance.currency} />
    <span className={cn("pc-numeric text-right text-body-sm font-semibold", row.difference === null || row.difference === 0 ? "text-text-primary" : row.difference > 0 ? "text-success-foreground" : "text-error-foreground")}>{row.difference === null ? "—" : `${formatSignedAmount(row.difference)} ${row.balance.currency}`}</span>
    <span className="justify-self-end">{state === "Cuadrada" ? <Badge variant="success" icon={<Check aria-hidden="true" />}>Cuadrada</Badge> : state === "Faltante" ? <Badge variant="error" icon={<TrendingDown aria-hidden="true" />}>Faltante</Badge> : state === "Sobrante" ? <Badge variant="success" icon={<TrendingUp aria-hidden="true" />}>Sobrante</Badge> : <span className="text-caption text-text-secondary">Pendiente</span>}</span>
  </div>;
}

function AuditSummary({ audited, balanced, differences }: { audited: number; balanced: number; differences: readonly { balance: (typeof CAJA_BALANCES)[number]; difference: number | null; motivo: string }[] }) {
  return <Card className="self-start"><CardHeader><div className="flex items-center gap-3"><span aria-hidden="true" className="grid size-9 place-items-center rounded-control bg-surface-subtle text-primary"><ClipboardCheck className="size-[18px]" /></span><CardTitle>Resumen del arqueo</CardTitle></div></CardHeader><CardContent className="flex flex-col gap-5 pt-0"><div className="grid grid-cols-3 gap-3"><Metric label="Monedas arqueadas" value={audited} tone="success" /><Metric label="Cuadradas" value={balanced} tone="success" /><Metric label="Con diferencias" value={differences.length} tone={differences.length ? "error" : "neutral"} /></div>{differences.length ? <div className="flex flex-col gap-3"><p className="text-body-sm font-semibold text-text-primary">Diferencias detectadas</p>{differences.map((row) => { const entry = findCajaCurrency(row.balance.currency); return <div key={row.balance.currency} className={cn("flex items-center justify-between gap-3 rounded-control border px-3 py-3", row.difference! < 0 ? "border-error-border bg-error-subtle" : "border-success-border bg-success-subtle")}><span className="flex min-w-0 items-center gap-2"><CurrencyFlag currency={row.balance.currency} /><span className="truncate text-body-sm">{row.balance.currency} · {entry?.name}</span></span><span className={cn("pc-numeric text-body-sm font-semibold", row.difference! < 0 ? "text-error-foreground" : "text-success-foreground")}>{formatSignedAmount(row.difference!)} {row.balance.currency}</span></div>; })}</div> : null}</CardContent></Card>;
}

function Metric({ label, value, tone }: { label: string; value: number; tone: "success" | "error" | "neutral" }) { return <div className={cn("rounded-control border px-3 py-3 text-center", tone === "success" ? "border-success-border bg-success-subtle" : tone === "error" ? "border-error-border bg-error-subtle" : "border-border bg-surface-subtle")}><p className="text-caption text-text-secondary">{label}</p><p className="mt-1 pc-numeric text-amount font-semibold text-text-primary">{value}</p></div>; }

function DifferenceResolution({ rows, motivos, observaciones, submitted, onMotivo, onObservaciones }: { rows: readonly { balance: (typeof CAJA_BALANCES)[number]; difference: number | null }[]; motivos: Record<string, CajaAdjustmentReason | "">; observaciones: Record<string, string>; submitted: boolean; onMotivo: (currency: string, reason: CajaAdjustmentReason | "") => void; onObservaciones: (currency: string, value: string) => void }) {
  return <Card><CardHeader><div className="flex items-center gap-3"><span aria-hidden="true" className="grid size-9 place-items-center rounded-control bg-error-subtle text-error-foreground"><TrendingDown className="size-[18px]" /></span><CardTitle>Monedas con diferencia</CardTitle></div></CardHeader><CardContent className="flex flex-col gap-5 pt-0">{rows.map((row) => { const entry = findCajaCurrency(row.balance.currency); const reason = motivos[row.balance.currency] ?? ""; const required = reason === "Otro"; const invalid = submitted && (!reason || (required && !(observaciones[row.balance.currency] ?? "").trim())); return <div key={row.balance.currency} className="grid grid-cols-1 items-start gap-4 border-b border-border pb-5 last:border-b-0 last:pb-0 wide:grid-cols-[minmax(12rem,0.8fr)_minmax(15rem,1fr)_minmax(18rem,1.2fr)]"><div className="flex items-center gap-2 pt-2"><CurrencyFlag currency={row.balance.currency} /><span><span className="block text-body-sm font-semibold">{row.balance.currency}</span><span className="text-caption text-text-secondary">{entry?.name}</span></span></div><div><p className="mb-2 text-label text-text-primary">Motivo <span className="text-error" aria-hidden="true">*</span></p><Select value={reason} onValueChange={(value) => onMotivo(row.balance.currency, value as CajaAdjustmentReason)}><SelectTrigger {...fieldAria({ id: `cierre-motivo-${row.balance.currency}`, required: true, error: invalid && !reason ? "required" : undefined })} invalid={invalid && !reason}><SelectValue placeholder="Selecciona un motivo" /></SelectTrigger><SelectContent>{getValidAdjustmentReasons(row.difference ?? 0).map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div><div><div className="mb-2 flex items-baseline justify-between"><label htmlFor={`cierre-observaciones-${row.balance.currency}`} className="text-label text-text-primary">{required ? <>Observaciones <span className="text-error" aria-hidden="true">*</span></> : "Observaciones (opcional)"}</label><span className="text-caption text-text-secondary">{(observaciones[row.balance.currency] ?? "").length}/{OBSERVACIONES_MAX}</span></div><textarea id={`cierre-observaciones-${row.balance.currency}`} aria-required={required || undefined} aria-invalid={invalid || undefined} value={observaciones[row.balance.currency] ?? ""} onChange={(event) => onObservaciones(row.balance.currency, event.target.value)} maxLength={OBSERVACIONES_MAX} rows={2} className={cn("w-full resize-none rounded-control border bg-surface px-4 py-3 text-body outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20", invalid ? "border-error" : "border-border hover:border-border-strong")} placeholder="Añade detalles si es necesario." /></div></div>; })}</CardContent></Card>;
}

function CierreRevision({ draft, jornada, submitting, error, onVolver, onConfirmar }: { draft: readonly ClosingDraftCurrency[]; jornada: NonNullable<ReturnType<typeof getJornadaActual>>; submitting: boolean; error?: string; onVolver: () => void; onConfirmar: () => void }) { return <div className="flex flex-col gap-6"><BackLink /><div><h1 className="text-screen-title text-text-primary">Revisar cierre de caja</h1><p className="mt-2 max-w-2xl text-body text-text-secondary">Verifica el arqueo antes de cerrar definitivamente la jornada.</p></div><Card className="mx-auto w-full max-w-5xl"><CardHeader><div className="flex items-center gap-3"><span aria-hidden="true" className="grid size-9 place-items-center rounded-control bg-primary-subtle text-primary"><ClipboardCheck className="size-[18px]" /></span><CardTitle>Resumen del cierre</CardTitle></div></CardHeader><CardContent className="flex flex-col gap-5 pt-0"><dl className="grid grid-cols-2 gap-x-8 gap-y-3 wide:grid-cols-4"><ReviewInfo label="Caja" value={CAJA_SUMMARY.register} /><ReviewInfo label="Trabajador" value={jornada.worker} /><ReviewInfo label="Apertura" value={formatDateTime(new Date(jornada.openedAt))} /><ReviewInfo label="Cierre" value="Se registrará al confirmar" /></dl><AuditReviewTable draft={draft} /><Alert variant="warning" title="Al confirmar, la jornada quedará cerrada y no podrán registrarse nuevas operaciones ni movimientos en esta jornada." />{error ? <Alert variant="error" title={error} /> : null}</CardContent></Card><div className="mx-auto flex w-full max-w-5xl justify-end gap-3"><Button variant="secondary" type="button" onClick={onVolver}>Volver</Button><Button type="button" loading={submitting} onClick={onConfirmar}>{submitting ? "Confirmando…" : "Confirmar cierre"}</Button></div></div>; }

function AuditReviewTable({ draft }: { draft: readonly ClosingDraftCurrency[] }) { return <div className="overflow-x-auto"><div className="min-w-[38rem]"><div className="grid grid-cols-[1.1fr_repeat(3,0.9fr)_1.1fr] gap-4 border-b border-border pb-2 text-label text-text-secondary"><span>Moneda</span><span className="text-right">Esperado</span><span className="text-right">Contado</span><span className="text-right">Diferencia</span><span>Estado</span></div>{draft.map((row) => { const entry = findCajaCurrency(row.currency); const state = row.difference === 0 ? "Cuadrada" : row.difference < 0 ? "Faltante" : "Sobrante"; return <div key={row.currency} className="grid grid-cols-[1.1fr_repeat(3,0.9fr)_1.1fr] gap-4 border-b border-border py-3 text-body-sm last:border-b-0"><span className="font-semibold">{row.currency} <span className="font-normal text-text-secondary">· {entry?.name}</span></span><span className="pc-numeric text-right">{formatMoney({ amount: row.expected, currency: row.currency })}</span><span className="pc-numeric text-right">{formatMoney({ amount: row.counted, currency: row.currency })}</span><span className={cn("pc-numeric text-right font-semibold", row.difference < 0 ? "text-error-foreground" : row.difference > 0 ? "text-success-foreground" : "")}>{formatSignedAmount(row.difference)} {row.currency}</span><span>{state}{row.motivo ? ` · ${row.motivo}` : ""}{row.observaciones ? ` · ${row.observaciones}` : ""}</span></div>; })}</div></div>; }

function CierreCompletado({ result }: { result: CerrarJornadaResult }) { const { jornada, audit } = result; const duration = formatDuration(new Date(jornada.openedAt), new Date(jornada.closedAt!)); return <><div className="mx-auto flex w-full max-w-4xl flex-col items-center print:hidden"><span aria-hidden="true" className="grid size-14 place-items-center rounded-pill border-2 border-success text-success"><CircleCheck className="size-8" /></span><h1 className="mt-5 text-screen-title text-text-primary">Caja cerrada correctamente</h1><p className="mt-2 text-center text-body text-text-secondary">La jornada de {jornada.register} se cerró correctamente.</p><Card className="mt-8 w-full"><CardContent className="flex flex-col gap-5 pt-6"><dl className="grid grid-cols-2 gap-x-8 gap-y-3 wide:grid-cols-4"><ReviewInfo label="Caja" value={jornada.register} /><ReviewInfo label="Trabajador" value={jornada.worker} /><ReviewInfo label="Apertura" value={formatDateTime(new Date(jornada.openedAt))} /><ReviewInfo label="Cierre" value={formatDateTime(new Date(jornada.closedAt!))} /><ReviewInfo label="Duración" value={duration} /></dl><div className="grid grid-cols-3 gap-3"><Metric label="Monedas arqueadas" value={audit.result.audited} tone="success" /><Metric label="Cuadradas" value={audit.result.balanced} tone="success" /><Metric label="Con diferencias" value={audit.result.withDifferences} tone={audit.result.withDifferences ? "error" : "neutral"} /></div><AuditReviewTable draft={audit.currencies.map(toDraft)} /></CardContent></Card><div className="mt-8 flex flex-wrap justify-center gap-3"><Button variant="secondary" onClick={() => window.print()}><Printer aria-hidden="true" />Imprimir comprobante</Button><Button asChild><Link href={CAJA_ROUTE}>Ir a Caja</Link></Button></div></div><CierrePrintableReceipt jornada={jornada} audit={audit} duration={duration} /></>; }

function toDraft(entry: CajaClosingAuditCurrency): ClosingDraftCurrency { return { currency: entry.currency, expected: entry.expected, counted: entry.counted, difference: entry.difference, motivo: entry.motivo, observaciones: entry.observaciones }; }
function ContextStrip({ openedAt, worker }: { openedAt?: string; worker: string }) { return <Card><CardContent className="grid grid-cols-2 gap-6 py-5 wide:grid-cols-4"><InfoItem icon={Wallet} label="Caja" value={CAJA_SUMMARY.register} /><InfoItem icon={User} label="Trabajador" value={worker} /><InfoItem icon={CalendarClock} label="Jornada" value="Abierta" valueClassName="text-success-foreground" /><InfoItem icon={Clock3} label="Apertura" value={openedAt ? formatDateTime(new Date(openedAt)) : "—"} /></CardContent></Card>; }
function InfoItem({ icon: Icon, label, value, valueClassName }: { icon: typeof Wallet; label: string; value: string; valueClassName?: string }) { return <span className="flex items-center gap-3"><span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-control bg-primary-subtle text-primary"><Icon className="size-[18px]" /></span><span><span className="block text-caption text-text-secondary">{label}</span><span className={cn("text-body-sm font-semibold text-text-primary", valueClassName)}>{value}</span></span></span>; }
function ReviewInfo({ label, value }: { label: string; value: string }) { return <div><dt className="text-caption text-text-secondary">{label}</dt><dd className="pc-numeric mt-0.5 text-body-sm font-semibold text-text-primary">{value}</dd></div>; }
function BackLink() { return <Link href={CAJA_ROUTE} className="inline-flex w-fit items-center gap-2 rounded-control text-label font-medium text-text-secondary transition-colors hover:text-text-primary outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-primary print:hidden"><ArrowLeft className="size-4" aria-hidden="true" />Volver a Caja</Link>; }
function BlockedState() { return <div className="flex flex-col gap-6"><BackLink /><Card><CardContent className="flex flex-col items-center gap-2 py-16 text-center"><span aria-hidden="true" className="grid size-12 place-items-center rounded-control bg-primary-subtle text-primary"><Lock className="size-6" /></span><p className="mt-2 text-section-title text-text-primary">No hay una jornada abierta para cerrar.</p><Button className="mt-4" asChild><Link href={CAJA_ROUTE}>Volver a Caja</Link></Button></CardContent></Card></div>; }
function formatDuration(openedAt: Date, closedAt: Date): string { const minutes = Math.max(0, Math.round((closedAt.getTime() - openedAt.getTime()) / 60_000)); return `${Math.floor(minutes / 60)} h ${minutes % 60} min`; }
function CierrePrintableReceipt({ jornada, audit, duration }: { jornada: CerrarJornadaResult["jornada"]; audit: CerrarJornadaResult["audit"]; duration: string }) { return <section className="hidden print:block" aria-hidden="true"><h1 style={{ fontSize: "18px", fontWeight: 700 }}>PuntoCash · Comprobante de cierre de caja</h1><dl style={{ marginTop: 16, lineHeight: 1.7 }}><ReceiptLine label="Caja" value={jornada.register} /><ReceiptLine label="Trabajador" value={jornada.worker} /><ReceiptLine label="Apertura" value={formatDateTime(new Date(jornada.openedAt))} /><ReceiptLine label="Cierre" value={formatDateTime(new Date(jornada.closedAt!))} /><ReceiptLine label="Duración" value={duration} />{audit.currencies.map((row) => <React.Fragment key={row.currency}><ReceiptLine label={`${row.currency} · Esperado`} value={formatMoney({ amount: row.expected, currency: row.currency })} /><ReceiptLine label={`${row.currency} · Contado`} value={formatMoney({ amount: row.counted, currency: row.currency })} /><ReceiptLine label={`${row.currency} · Diferencia`} value={`${formatSignedAmount(row.difference)} ${row.currency}`} />{row.motivo ? <ReceiptLine label={`${row.currency} · Motivo`} value={row.motivo} /> : null}{row.observaciones ? <ReceiptLine label={`${row.currency} · Observaciones`} value={row.observaciones} /> : null}</React.Fragment>)}</dl></section>; }
function ReceiptLine({ label, value }: { label: string; value: string }) { return <div style={{ display: "flex", justifyContent: "space-between", gap: 24 }}><dt style={{ color: "#6B7280" }}>{label}</dt><dd style={{ fontWeight: 600 }}>{value}</dd></div>; }
