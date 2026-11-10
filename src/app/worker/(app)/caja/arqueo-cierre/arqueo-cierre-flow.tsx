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

import { Alert, Badge, Button, Card, CardContent, CardHeader, CardTitle, Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui";
import { CurrencyFlag } from "@/components/patterns/currency-flag";
import { cn } from "@/lib/utils";
import { formatDateTime, formatMoney, formatSignedAmount } from "@/lib/format";
import { useRouter } from "next/navigation";
import { findCajaCurrency, type CajaJornada } from "@/features/caja/caja-data";
import type { Billetes } from "@/features/caja/billetes";
import { useCaja } from "@/features/caja/use-caja";
import { useVistaDeCaja } from "@/features/worker/caja-context";
import { cerrarConArqueoAction, explicarCierreAction, type CierreRegistrado } from "../../../_actions";
import {
  aBilletes,
  ConteoPorBilletes,
  describirComposicion,
  explicacionIncompleta,
  ExplicarDiferenciasFilas,
  type ExplicacionDeDiferencia,
  type Unidades,
} from "../conteo-por-billetes";

interface CerrarJornadaResult {
  jornada: CajaJornada;
  audit: {
    currencies: readonly ClosingDraftCurrency[];
    result: { audited: number; balanced: number; withDifferences: number };
  };
}

const CAJA_ROUTE = "/worker/caja" as Route;

/** Sin «esperado»: Worker no ve el saldo en libros ni después de cerrar (6/11/2026). */
interface ClosingDraftCurrency {
  currency: string;
  counted: number;
  difference: number;
  /** El total cuadró pero los billetes no: qué cambió, por denominación. */
  composicion?: Readonly<Record<string, number>>;
  motivo?: string;
  observaciones?: string;
  supervisor?: string;
}

const conDiferencia = (m: { diferencia: number; composicion?: unknown }) => m.diferencia !== 0 || m.composicion !== undefined;

/**
 * **Arqueo y cierre — un solo acto, a ciegas** (decisiones del 5/11/2026).
 *
 * Quien cierra cuenta **sin ver el saldo en libros**, billete a billete
 * (decisión del 9/11/2026). Al continuar se le
 * avisa de que las cifras no se podrán cambiar; si confirma, **la caja queda
 * cerrada en ese momento**. Solo entonces ve lo esperado y la diferencia, y
 * explica cada una en una ventana de la que no se sale sin terminar.
 *
 * Salir de esta pantalla significa una de dos cosas: canceló antes de
 * confirmar el conteo (no se guarda nada) o la caja está cerrada. No hay
 * estado intermedio en el que, vista la diferencia, se pueda volver a contar.
 * Si los motivos no llegan (se va la luz), la diferencia llega al
 * administrador como «Sin explicar».
 */
export function ArqueoCierreFlow(): React.JSX.Element {
  const router = useRouter();
  const caja = useCaja();
  const vista = useVistaDeCaja();
  const jornada = caja.jornadaAbierta ? caja.jornada : null;
  const worker = vista.trabajador;
  const MONEDAS = caja.monedas;
  const CAJA_SUMMARY = caja.summary;
  const [unidades, setUnidades] = React.useState<Unidades>({});
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [porDeclarar, setPorDeclarar] = React.useState<{ currency: string; billetes: Billetes; contado: number }[] | null>(null);
  const [explicaciones, setExplicaciones] = React.useState<Record<string, ExplicacionDeDiferencia>>({});
  const [submitted, setSubmitted] = React.useState(false);
  const [result, setResult] = React.useState<CerrarJornadaResult | null>(null);
  /** La jornada ya cerrada, con diferencias por explicar. */
  const [cerrada, setCerrada] = React.useState<CierreRegistrado | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | undefined>();
  const [confirmError, setConfirmError] = React.useState<string | undefined>();

  /* Sin jornada abierta no hay nada que arquear, salvo que la haya cerrado
     este mismo flujo: su resultado no puede quedar tapado por su efecto. */
  const blocked = !caja.jornadaAbierta && result === null && cerrada === null;

  function setCounted(currency: string, k: string, value: string) {
    setUnidades((prev) => ({ ...prev, [currency]: { ...prev[currency], [k]: value } }));
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
    const { conteos, errores } = aBilletes(MONEDAS, unidades);
    setErrors(errores);
    if (Object.keys(errores).length > 0) return;
    setPorDeclarar(conteos);
  }

  function aResultado(c: CierreRegistrado): CerrarJornadaResult {
    return {
      jornada: { register: CAJA_SUMMARY.register, worker: worker.fullName, openedAt: c.openedAt, closedAt: c.closedAt, status: "CLOSED" },
      audit: {
        currencies: c.monedas.map((m) => ({
          currency: m.currency,
          counted: m.contado,
          difference: m.diferencia,
          ...(m.composicion ? { composicion: m.composicion } : {}),
          ...(m.motivo ? { motivo: m.motivo } : {}),
          ...(m.observaciones ? { observaciones: m.observaciones } : {}),
          ...(m.supervisor ? { supervisor: m.supervisor } : {}),
        })),
        result: {
          audited: c.monedas.length,
          balanced: c.monedas.filter((m) => !conDiferencia(m)).length,
          withDifferences: c.monedas.filter(conDiferencia).length,
        },
      },
    };
  }

  /** Confirmar el conteo **cierra la jornada**: no hay vuelta atrás desde aquí. */
  async function handleCerrar() {
    if (!porDeclarar || submitting) return;
    setSubmitting(true);
    const r = await cerrarConArqueoAction(porDeclarar.map(({ currency, billetes }) => ({ currency, billetes })));
    setSubmitting(false);
    setPorDeclarar(null);
    if (!r.ok) {
      setFormError(
        r.reason === "jornada-no-abierta"
          ? "La jornada ya no está abierta: el administrador pudo haber forzado su cierre."
          : "No se pudo cerrar la caja. Revisa las cifras e inténtalo de nuevo.",
      );
      return;
    }
    if (r.value.monedas.some(conDiferencia)) {
      setSubmitted(false);
      setCerrada(r.value);
    } else {
      setResult(aResultado(r.value));
    }
    router.refresh();
  }

  const diferencias = cerrada ? cerrada.monedas.filter(conDiferencia) : [];

  async function handleExplicar() {
    if (!cerrada || submitting) return;
    setSubmitted(true);
    if (diferencias.some((d) => explicacionIncompleta(explicaciones[d.currency]))) return;
    setSubmitting(true);
    setConfirmError(undefined);
    const outcome = await explicarCierreAction(
      cerrada.jornadaId,
      diferencias.map(({ currency }) => {
        const e = explicaciones[currency]!;
        return {
          currency,
          motivo: e.motivo,
          ...(e.observaciones.trim() ? { observaciones: e.observaciones.trim() } : {}),
          ...(e.supervisorId ? { supervisorId: e.supervisorId } : {}),
        };
      }),
    );
    setSubmitting(false);
    if (!outcome.ok) {
      setConfirmError("No se pudieron guardar los motivos. Revísalos e inténtalo de nuevo.");
      return;
    }
    setResult(aResultado(outcome.value));
    setCerrada(null);
  }

  if (result) return <CierreCompletado result={result} />;
  if (blocked) return <BlockedState />;
  return (
    <div className="flex flex-col gap-6">
      <BackLink />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0"><h1 className="text-screen-title text-text-primary">Arqueo y cierre de caja</h1><p className="mt-2 max-w-2xl text-body text-text-secondary">Cuenta el efectivo que hay en {CAJA_SUMMARY.register}, moneda por moneda y billete a billete, y escribe cuántos hay de cada uno.</p></div>
        <Badge variant={cerrada ? "neutral" : "success"}>{cerrada ? "Jornada cerrada" : "Jornada abierta"}</Badge>
      </div>
      <ContextStrip openedAt={jornada?.openedAt} worker={worker.fullName} />

      <form onSubmit={handleContinue} className="grid grid-cols-1 items-start gap-6 wide:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader><div className="flex items-center gap-3"><span aria-hidden="true" className="grid size-9 place-items-center rounded-control bg-primary-subtle text-primary"><ClipboardCheck className="size-[18px]" /></span><div><CardTitle>Arqueo billete a billete</CardTitle><p className="mt-0.5 text-body-sm text-text-secondary">Escribe cuántas unidades hay de cada billete y moneda. Lo que dejes vacío cuenta como cero.</p></div></div></CardHeader>
          <CardContent className="flex flex-col gap-5 pt-0">
            <ConteoPorBilletes monedas={MONEDAS} denominaciones={vista.denominaciones} unidades={unidades} errores={errors} onChange={setCounted} />
            {formError ? <Alert variant="error" title={formError} /> : null}
            <div className="pc-botonera border-t border-border pt-5 sm:justify-end"><Button variant="secondary" type="button" asChild><Link href={CAJA_ROUTE}>Cancelar</Link></Button><Button type="submit">Continuar<ArrowRight aria-hidden="true" /></Button></div>
          </CardContent>
        </Card>
        <Card className="self-start">
          <CardHeader><CardTitle>Cómo se cierra la caja</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3 text-body-sm text-text-secondary">
            <p>Cuenta con calma. Cuando continúes, lo que escribiste queda declarado como tu arqueo y ya no se puede cambiar.</p>
            <p>Al confirmar, la caja queda cerrada. Si algo no coincide con los libros de tu jornada —el total o los billetes—, dirás por qué.</p>
            <p>Lo que declares es lo que recibirá quien abra la caja la próxima vez.</p>
          </CardContent>
        </Card>
      </form>

      {porDeclarar ? <AvisoDeDeclaracion conteos={porDeclarar} caja={CAJA_SUMMARY.register} submitting={submitting} onSeguir={() => setPorDeclarar(null)} onConfirmar={() => void handleCerrar()} /> : null}

      {cerrada ? (
        <ExplicarDiferencias
          cerrada={cerrada}
          submitting={submitting}
          error={confirmError}
          onTerminar={() => void handleExplicar()}
          resolucion={
            <Card>
              <CardHeader><div className="flex items-center gap-3"><span aria-hidden="true" className="grid size-9 place-items-center rounded-control bg-error-subtle text-error-foreground"><TrendingDown className="size-[18px]" /></span><CardTitle>Monedas con diferencia</CardTitle></div></CardHeader>
              <CardContent className="pt-0">
                <ExplicarDiferenciasFilas
                  momento="cierre"
                  filas={diferencias.map((d) => ({ currency: d.currency, diferencia: d.diferencia, ...(d.composicion ? { composicion: d.composicion } : {}) }))}
                  explicaciones={explicaciones}
                  supervisores={vista.supervisores}
                  enviado={submitted}
                  onChange={(currency, e) => setExplicaciones((prev) => ({ ...prev, [currency]: e }))}
                />
              </CardContent>
            </Card>
          }
        />
      ) : null}
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
            Si confirmas, este será tu arqueo y {caja} quedará cerrada en ese momento. Si todavía no terminaste de contar,
            vuelve y termina antes de confirmar.
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
          <Button type="button" loading={submitting} onClick={onConfirmar}>Confirmar y cerrar caja</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone: "success" | "error" | "neutral" }) { return <div className={cn("rounded-control border px-3 py-3 text-center", tone === "success" ? "border-success-border bg-success-subtle" : tone === "error" ? "border-error-border bg-error-subtle" : "border-border bg-surface-subtle")}><p className="text-caption text-text-secondary">{label}</p><p className="mt-1 pc-numeric text-amount font-semibold text-text-primary">{value}</p></div>; }

/**
 * La caja ya está cerrada; falta decir por qué no cuadra. No se puede cerrar
 * esta ventana ni salir de ella sin terminar: si el trabajador no llega a dar
 * los motivos (se va la luz), la diferencia llega al administrador como «Sin
 * explicar».
 */
function ExplicarDiferencias({ cerrada, submitting, error, resolucion, onTerminar }: { cerrada: CierreRegistrado; submitting: boolean; error?: string; resolucion: React.ReactNode; onTerminar: () => void }) {
  const draft: ClosingDraftCurrency[] = cerrada.monedas.map((m) => ({ currency: m.currency, counted: m.contado, difference: m.diferencia, ...(m.composicion ? { composicion: m.composicion } : {}) }));
  return (
    <Dialog open onOpenChange={() => undefined}>
      <DialogContent
        hideClose
        size="lg"
        className="max-h-[90vh] max-w-[min(60rem,calc(100vw-2rem))] overflow-y-auto"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Caja cerrada · explica las diferencias</DialogTitle>
          <DialogDescription>
            La jornada quedó cerrada el {formatDateTime(new Date(cerrada.closedAt))}. Esto es lo que contaste y la diferencia con los libros de tu jornada. Di por qué no coincide cada moneda con diferencia, en el total o en los billetes.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-5">
          <AuditReviewTable draft={draft} />
          {resolucion}
          <Alert variant="info" title="Cada diferencia llega al administrador de la sede para su aprobación." />
          {error ? <Alert variant="error" title={error} /> : null}
        </DialogBody>
        <DialogFooter>
          <Button type="button" loading={submitting} onClick={onTerminar}>Guardar motivos y terminar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AuditReviewTable({ draft }: { draft: readonly ClosingDraftCurrency[] }) { return <div className="overflow-x-auto"><div className="min-w-[32rem]"><div className="grid grid-cols-[1.1fr_repeat(2,0.9fr)_1.1fr] gap-4 border-b border-border pb-2 text-label text-text-secondary"><span>Moneda</span><span className="text-right">Contado</span><span className="text-right">Diferencia</span><span>Estado</span></div>{draft.map((row) => { const entry = findCajaCurrency(row.currency); const state = row.difference === 0 ? (row.composicion ? `Billetes distintos (${describirComposicion(row.composicion)})` : "Cuadrada") : row.difference < 0 ? "Faltante" : "Sobrante"; return <div key={row.currency} className="grid grid-cols-[1.1fr_repeat(2,0.9fr)_1.1fr] gap-4 border-b border-border py-3 text-body-sm last:border-b-0"><span className="font-semibold">{row.currency} <span className="font-normal text-text-secondary">· {entry?.name}</span></span><span className="pc-numeric text-right">{formatMoney({ amount: row.counted, currency: row.currency })}</span><span className={cn("pc-numeric text-right font-semibold", row.difference < 0 ? "text-error-foreground" : row.difference > 0 ? "text-success-foreground" : "")}>{formatSignedAmount(row.difference)} {row.currency}</span><span>{state}{row.motivo ? ` · ${row.motivo}` : ""}{row.supervisor ? ` · ${row.supervisor}` : ""}{row.observaciones ? ` · ${row.observaciones}` : ""}</span></div>; })}</div></div>; }

function CierreCompletado({ result }: { result: CerrarJornadaResult }) { const { jornada, audit } = result; const duration = formatDuration(new Date(jornada.openedAt), new Date(jornada.closedAt!)); return <><div className="mx-auto flex w-full max-w-4xl flex-col items-center print:hidden"><span aria-hidden="true" className="grid size-14 place-items-center rounded-pill border-2 border-success text-success"><CircleCheck className="size-8" /></span><h1 className="mt-5 text-screen-title text-text-primary">Caja cerrada correctamente</h1><p className="mt-2 text-center text-body text-text-secondary">La jornada de {jornada.register} se cerró correctamente.</p><Card className="mt-8 w-full"><CardContent className="flex flex-col gap-5 pt-6"><dl className="grid grid-cols-2 gap-x-8 gap-y-3 wide:grid-cols-4"><ReviewInfo label="Caja" value={jornada.register} /><ReviewInfo label="Trabajador" value={jornada.worker} /><ReviewInfo label="Apertura" value={formatDateTime(new Date(jornada.openedAt))} /><ReviewInfo label="Cierre" value={formatDateTime(new Date(jornada.closedAt!))} /><ReviewInfo label="Duración" value={duration} /></dl><div className="grid grid-cols-3 gap-3"><Metric label="Monedas arqueadas" value={audit.result.audited} tone="success" /><Metric label="Cuadradas" value={audit.result.balanced} tone="success" /><Metric label="Con diferencias" value={audit.result.withDifferences} tone={audit.result.withDifferences ? "error" : "neutral"} /></div><AuditReviewTable draft={audit.currencies} /></CardContent></Card><div className="pc-botonera mt-8 sm:justify-center"><Button variant="secondary" onClick={() => window.print()}><Printer aria-hidden="true" />Imprimir comprobante</Button><Button asChild><Link href={CAJA_ROUTE}>Ir a Caja</Link></Button></div></div><CierrePrintableReceipt jornada={jornada} audit={audit} duration={duration} /></>; }

function ContextStrip({ openedAt, worker }: { openedAt?: string; worker: string }) { const CAJA_SUMMARY = useCaja().summary; return <Card><CardContent className="grid grid-cols-2 gap-6 py-5 wide:grid-cols-4"><InfoItem icon={Wallet} label="Caja" value={CAJA_SUMMARY.register} /><InfoItem icon={User} label="Trabajador" value={worker} /><InfoItem icon={CalendarClock} label="Jornada" value="Abierta" valueClassName="text-success-foreground" /><InfoItem icon={Clock3} label="Apertura" value={openedAt ? formatDateTime(new Date(openedAt)) : "—"} /></CardContent></Card>; }
function InfoItem({ icon: Icon, label, value, valueClassName }: { icon: typeof Wallet; label: string; value: string; valueClassName?: string }) { return <span className="flex items-center gap-3"><span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-control bg-primary-subtle text-primary"><Icon className="size-[18px]" /></span><span><span className="block text-caption text-text-secondary">{label}</span><span className={cn("text-body-sm font-semibold text-text-primary", valueClassName)}>{value}</span></span></span>; }
function ReviewInfo({ label, value }: { label: string; value: string }) { return <div><dt className="text-caption text-text-secondary">{label}</dt><dd className="pc-numeric mt-0.5 text-body-sm font-semibold text-text-primary">{value}</dd></div>; }
function BackLink() { return <Link href={CAJA_ROUTE} className="inline-flex w-fit items-center gap-2 rounded-control text-label font-medium text-text-secondary transition-colors hover:text-text-primary outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-primary print:hidden"><ArrowLeft className="size-4" aria-hidden="true" />Volver a Caja</Link>; }
function BlockedState() { return <div className="flex flex-col gap-6"><BackLink /><Card><CardContent className="flex flex-col items-center gap-2 py-16 text-center"><span aria-hidden="true" className="grid size-12 place-items-center rounded-control bg-primary-subtle text-primary"><Lock className="size-6" /></span><p className="mt-2 text-section-title text-text-primary">No hay una jornada abierta para cerrar.</p><Button className="mt-4" asChild><Link href={CAJA_ROUTE}>Volver a Caja</Link></Button></CardContent></Card></div>; }
function formatDuration(openedAt: Date, closedAt: Date): string { const minutes = Math.max(0, Math.round((closedAt.getTime() - openedAt.getTime()) / 60_000)); return `${Math.floor(minutes / 60)} h ${minutes % 60} min`; }
function CierrePrintableReceipt({ jornada, audit, duration }: { jornada: CerrarJornadaResult["jornada"]; audit: CerrarJornadaResult["audit"]; duration: string }) { return <section className="hidden print:block" aria-hidden="true"><h1 style={{ fontSize: "18px", fontWeight: 700 }}>PuntoCash · Comprobante de cierre de caja</h1><dl style={{ marginTop: 16, lineHeight: 1.7 }}><ReceiptLine label="Caja" value={jornada.register} /><ReceiptLine label="Trabajador" value={jornada.worker} /><ReceiptLine label="Apertura" value={formatDateTime(new Date(jornada.openedAt))} /><ReceiptLine label="Cierre" value={formatDateTime(new Date(jornada.closedAt!))} /><ReceiptLine label="Duración" value={duration} />{audit.currencies.map((row) => <React.Fragment key={row.currency}><ReceiptLine label={`${row.currency} · Contado`} value={formatMoney({ amount: row.counted, currency: row.currency })} /><ReceiptLine label={`${row.currency} · Diferencia`} value={`${formatSignedAmount(row.difference)} ${row.currency}`} />{row.composicion ? <ReceiptLine label={`${row.currency} · Billetes`} value={describirComposicion(row.composicion)} /> : null}{row.motivo ? <ReceiptLine label={`${row.currency} · Motivo`} value={row.motivo} /> : null}{row.observaciones ? <ReceiptLine label={`${row.currency} · Observaciones`} value={row.observaciones} /> : null}</React.Fragment>)}</dl></section>; }
function ReceiptLine({ label, value }: { label: string; value: string }) { return <div style={{ display: "flex", justifyContent: "space-between", gap: 24 }}><dt style={{ color: "#6B7280" }}>{label}</dt><dd style={{ fontWeight: 600 }}>{value}</dd></div>; }
