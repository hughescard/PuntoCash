"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CircleCheck, CreditCard, FileText, Lock, Printer, UserRound, XCircle } from "lucide-react";

import { Alert, Badge, Button, Card, CardContent, CardHeader, CardTitle, Field, Input } from "@/components/ui";
import { CurrencyFlag } from "@/components/patterns/currency-flag";
import { formatDateTime, formatMoney } from "@/lib/format";
import { CAJA_BALANCES, CAJA_SUMMARY, hasOpenJornada, registrarSalidaComercial } from "@/features/caja/caja-data";
import { registerCompletedOperation } from "@/features/operations/operations-history";
import { DELIVERY_METHOD_LABEL, REMITTANCE_STATUS_LABEL, remittanceProvider, type RemittanceSnapshot, type RemittanceStatus } from "@/features/remittances/remittance-provider";
import { clearPendingWorkerHandoff, readPendingWorkerHandoff } from "@/features/kiosk/self-service-request";

type Step = "codigo" | "revision" | "confirmar" | "resultado";
interface Completed { remittance: RemittanceSnapshot; operationCode: string; completedAt: string; }

let sequence = 8000;
function nextCode(now: Date) { const p = (n: number) => String(n).padStart(2, "0"); return `PC-${String(now.getFullYear()).slice(2)}${p(now.getMonth() + 1)}${p(now.getDate())}-${String(++sequence).padStart(6, "0")}`; }

export function RemesasFlow(): React.JSX.Element {
  const [blocked] = React.useState(() => !hasOpenJornada());
  // Code handed over by "Buscar solicitud" (kiosk request), if any.
  const [handoffCode] = React.useState(() => readPendingWorkerHandoff("remesas")?.data.code ?? null);
  const [step, setStep] = React.useState<Step>("codigo");
  const [code, setCode] = React.useState(handoffCode ?? "");
  const [remittance, setRemittance] = React.useState<RemittanceSnapshot | null>(null);
  const [searching, setSearching] = React.useState(false);
  const [notFound, setNotFound] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [completed, setCompleted] = React.useState<Completed | null>(null);

  const cash = remittance ? CAJA_BALANCES.find((item) => item.currency === remittance.payoutCurrency) : undefined;
  const sufficient = !!remittance && !!cash && cash.amount >= remittance.deliveryAmount;
  const payable = remittance?.status === "READY";

  async function runSearch(normalized: string) {
    if (!normalized || searching) return;
    setSearching(true); setNotFound(false); setError(null);
    const result = await remittanceProvider.findByCode(normalized);
    setSearching(false);
    if (!result.ok) { setRemittance(null); setNotFound(true); return; }
    setCode(normalized); setRemittance(result.remittance); setStep("revision");
  }

  async function search(event: React.FormEvent) {
    event.preventDefault();
    await runSearch(code.trim());
  }

  // The code came pre-verified from the kiosk handoff (it's the exact code
  // that request was registered under) — searching automatically saves the
  // worker retyping it, same as if they had pressed "Buscar remesa" themselves.
  React.useEffect(() => {
    clearPendingWorkerHandoff();
    if (handoffCode) void runSearch(handoffCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function confirm() {
    if (!remittance || !sufficient || !payable || submitting) return;
    setSubmitting(true); setError(null);
    const external = await remittanceProvider.complete(remittance.id);
    if (!external.ok) { setSubmitting(false); setError(external.reason === "conflict" ? "La remesa ya no está disponible para entrega." : "No se pudo completar la remesa. Intenta nuevamente o solicita asistencia."); return; }
    const now = new Date(); const operationCode = nextCode(now);
    const cashOut = registrarSalidaComercial({ operationCode, concepto: "Remesa", currency: remittance.payoutCurrency, amount: remittance.deliveryAmount, timestamp: now });
    if (!cashOut.ok) { setSubmitting(false); setError("La caja ya no dispone de fondos suficientes para completar esta remesa."); return; }
    registerCompletedOperation({ codigo: operationCode, fechaHora: now.toISOString(), cliente: { nombre: remittance.receiverName, documentType: "CI", documentNumber: remittance.receiverIdentification, telefono: remittance.receiverPhone ?? "No disponible", nacionalidad: "No disponible" }, servicio: "Remesa", estado: "Completada", amount: { kind: "single", money: { amount: remittance.deliveryAmount, currency: remittance.payoutCurrency }, cashSnapshot: { before: { amount: cashOut.saldoAntes, currency: remittance.payoutCurrency }, movement: { amount: remittance.deliveryAmount, currency: remittance.payoutCurrency }, after: { amount: cashOut.saldoDespues, currency: remittance.payoutCurrency } } }, worker: CAJA_SUMMARY.worker, caja: CAJA_SUMMARY.register, remittance: { serviceId: remittance.id, code: remittance.code, reference: remittance.reference, beneficiaryName: remittance.receiverName, beneficiaryIdentification: remittance.receiverIdentification, deliveryMethod: remittance.deliveryMethod, payoutAmount: remittance.deliveryAmount, payoutCurrency: remittance.payoutCurrency, externalStatus: external.remittance.status } });
    setCompleted({ remittance: external.remittance, operationCode, completedAt: now.toISOString() }); setSubmitting(false); setStep("resultado");
  }

  if (blocked) return <Blocked />;
  if (step === "resultado" && completed) return <Result completed={completed} />;
  if (step === "codigo") return <CodeScreen code={code} setCode={setCode} searching={searching} notFound={notFound} onSearch={search} />;
  if (!remittance) return <CodeScreen code={code} setCode={setCode} searching={searching} notFound={notFound} onSearch={search} />;
  if (step === "revision") return <Review remittance={remittance} sufficient={sufficient} cash={cash?.amount} onBack={() => setStep("codigo")} onContinue={() => setStep("confirmar")} />;
  return <Confirmation remittance={remittance} error={error} submitting={submitting} onBack={() => setStep("revision")} onConfirm={confirm} />;
}

function Back({ href = "/worker/nueva-operacion", label = "Volver a Nueva operación" }: { href?: string; label?: string }) { return <Link href={href} className="inline-flex w-fit items-center gap-2 rounded-control text-label font-medium text-text-secondary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-primary"><ArrowLeft className="size-4" aria-hidden="true" />{label}</Link>; }
function Blocked() { return <div className="mx-auto flex w-full max-w-xl flex-col gap-6"><Back /><Card><CardContent className="flex flex-col items-center px-8 py-12 text-center"><span className="grid size-12 place-items-center rounded-control bg-warning-subtle text-warning-foreground"><Lock aria-hidden="true" /></span><h1 className="mt-5 text-screen-title text-text-primary">Caja cerrada</h1><p className="mt-2 text-body text-text-secondary">Debes abrir una jornada antes de pagar una remesa.</p><Button className="mt-6" asChild><Link href="/worker/caja">Ir a Caja</Link></Button></CardContent></Card></div>; }
function CodeScreen({ code, setCode, searching, notFound, onSearch }: { code: string; setCode: (value: string) => void; searching: boolean; notFound: boolean; onSearch: (event: React.FormEvent) => void }) {
  const form = <Card className="w-full"><CardHeader><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-control bg-primary-subtle text-primary"><CreditCard className="size-[18px]" aria-hidden="true" /></span><div><CardTitle>Cobrar remesa</CardTitle><p className="mt-1 text-body-sm text-text-secondary">Solicita al beneficiario el código de la remesa para continuar.</p></div></div></CardHeader><CardContent className="pt-0"><form onSubmit={onSearch} className="flex flex-col gap-5"><Field id="remittance-code" label="Código de remesa" required><Input id="remittance-code" value={code} onChange={(event) => setCode(event.target.value)} placeholder="Introduce el código proporcionado por el beneficiario" autoComplete="off" /></Field><Button type="submit" block loading={searching} disabled={!code.trim()}>{searching ? "Buscando…" : "Buscar remesa"}</Button></form></CardContent></Card>;
  if (notFound) return <div className="mx-auto flex w-full max-w-2xl flex-col gap-6"><Back href="#" label="Volver a Remesas" /><div className="flex flex-col items-center px-6 pt-3 text-center"><span className="grid size-16 place-items-center rounded-pill border-4 border-error-border bg-error-subtle text-error-foreground"><XCircle className="size-8" aria-hidden="true" /></span><h1 className="mt-5 text-screen-title text-text-primary">Remesa no encontrada</h1><p className="mt-3 text-body text-text-primary">No encontramos una remesa con este código.</p><p className="mt-1 text-body-sm text-text-secondary">Verifica el código con el beneficiario e inténtalo nuevamente.</p></div>{form}<Alert variant="info" title="El código debe ser proporcionado directamente por el beneficiario." /></div>;
  return <div className="mx-auto flex w-full max-w-2xl flex-col gap-6"><Back /><div><h1 className="text-screen-title text-text-primary">Remesas</h1></div>{form}<Alert variant="info" title="El código debe ser proporcionado directamente por el beneficiario." /></div>;
}
function Review({ remittance, cash, sufficient, onBack, onContinue }: { remittance: RemittanceSnapshot; cash?: number; sufficient: boolean; onBack: () => void; onContinue: () => void }) {
  const eligible = remittance.status === "READY" && sufficient;
  const remittanceRows = [fact("Código de remesa", remittance.code), fact("Importe a entregar", <Money remittance={remittance} key="amount" />), fact("Moneda", `${remittance.payoutCurrency} · ${currencyName(remittance.payoutCurrency)}`), fact("Método de entrega", DELIVERY_METHOD_LABEL[remittance.deliveryMethod]), ...(remittance.reference ? [fact("Referencia", remittance.reference)] : [])];
  const beneficiaryRows = [fact("Nombre completo", remittance.receiverName), fact("Documento de identidad", remittance.receiverIdentification), ...(remittance.receiverPhone ? [fact("Teléfono", remittance.receiverPhone)] : []), ...(remittance.receiverAddress ? [fact("Dirección", remittance.receiverAddress)] : []), ...(remittance.receiverProvince || remittance.receiverMunicipality ? [fact("Provincia / Municipio", [remittance.receiverProvince, remittance.receiverMunicipality].filter(Boolean).join(" / "))] : [])];
  return <div className="mx-auto flex w-full max-w-5xl flex-col gap-6"><Back href="#" label="Volver a Remesas" /><header className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-screen-title text-text-primary">Revisar remesa</h1><p className="mt-2 text-body text-text-secondary">Verifica los datos de la remesa y la identidad del beneficiario.</p></div><div className="text-right"><p className="text-caption text-text-secondary">Estado de la remesa</p><div className="mt-1"><StatusBadge status={remittance.status} /></div></div></header><div className="grid gap-4 wide:grid-cols-2"><Card><CardHeader><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-control bg-primary-subtle text-primary"><CreditCard className="size-[18px]" aria-hidden="true" /></span><CardTitle>Información de la remesa</CardTitle></div></CardHeader><CardContent className="pt-0"><Facts rows={remittanceRows} /></CardContent></Card><Card><CardHeader><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-control bg-primary-subtle text-primary"><UserRound className="size-[18px]" aria-hidden="true" /></span><CardTitle>Beneficiario</CardTitle></div></CardHeader><CardContent className="pt-0"><Facts rows={beneficiaryRows} /></CardContent></Card></div><Alert variant="warning" title="Verificación de identidad">Solicita el documento de identidad del beneficiario y verifica que coincida con la información mostrada antes de continuar.</Alert>{remittance.status !== "READY" ? <Alert variant="info" title="Esta remesa no está disponible para entrega de efectivo." /> : !sufficient ? <Alert variant="error" title={`La caja no dispone de suficiente ${remittance.payoutCurrency} para completar esta remesa.`}>Disponible: {cash === undefined ? "—" : formatMoney({ amount: cash, currency: remittance.payoutCurrency })}</Alert> : null}<div className="flex justify-end gap-3"><Button variant="secondary" onClick={onBack}>Cancelar</Button><Button disabled={!eligible} onClick={onContinue}>Continuar a confirmar<ArrowRight aria-hidden="true" /></Button></div></div>;
}
function Confirmation({ remittance, error, submitting, onBack, onConfirm }: { remittance: RemittanceSnapshot; error: string | null; submitting: boolean; onBack: () => void; onConfirm: () => void }) { return <div className="mx-auto flex w-full max-w-3xl flex-col gap-6"><Back href="#" label="Volver a Revisar remesa" /><header><h1 className="text-screen-title text-text-primary">Confirmar entrega de remesa</h1><p className="mt-2 text-body text-text-secondary">Confirma la entrega del efectivo al beneficiario.</p></header><Card><CardContent className="pt-6"><Facts rows={[fact("Código de remesa", remittance.code), fact("Beneficiario", remittance.receiverName), fact("Documento de identidad", remittance.receiverIdentification), fact("Importe a entregar", <Money remittance={remittance} key="money" />), fact("Moneda", `${remittance.payoutCurrency} · ${currencyName(remittance.payoutCurrency)}`), fact("Caja", CAJA_SUMMARY.register)]} /></CardContent></Card><Alert variant="warning" title="Acción irreversible">Confirma la operación únicamente después de verificar la identidad del beneficiario y entregar el efectivo correspondiente. Esta acción marcará la remesa como entregada.</Alert>{error ? <Alert variant="error" title={error} /> : null}<div className="flex justify-end gap-3"><Button variant="secondary" onClick={onBack}>Cancelar</Button><Button variant="destructive" loading={submitting} onClick={onConfirm}>{submitting ? "Confirmando…" : "Confirmar entrega"}</Button></div></div>; }
function Result({ completed }: { completed: Completed }) { const { remittance } = completed; return <div className="mx-auto flex w-full max-w-3xl flex-col items-center"><span className="grid size-14 place-items-center rounded-pill border-2 border-success text-success"><CircleCheck className="size-8" aria-hidden="true" /></span><h1 className="mt-5 text-screen-title text-text-primary">Remesa completada</h1><p className="mt-2 text-body text-text-secondary">La remesa ha sido marcada como entregada.</p><Card className="mt-8 w-full"><CardContent className="pt-6"><Facts rows={[["Código de remesa", remittance.code], ["Beneficiario", remittance.receiverName], ["Documento de identidad", remittance.receiverIdentification], ["Importe entregado", <Money remittance={remittance} key="money" />], ["Moneda", `${remittance.payoutCurrency} · ${currencyName(remittance.payoutCurrency)}`], ["Caja", CAJA_SUMMARY.register], ["Trabajador", CAJA_SUMMARY.worker], ["Fecha y hora", formatDateTime(new Date(completed.completedAt))]]} /></CardContent></Card><p className="mt-5 text-body-sm text-text-secondary">La remesa fue completada correctamente y registrada en PuntoCash.</p><div className="mt-7 flex flex-wrap justify-center gap-3"><Button variant="secondary" onClick={() => window.print()}><Printer aria-hidden="true" />Imprimir comprobante</Button><Button asChild><Link href="/worker/operaciones"><FileText aria-hidden="true" />Ir a Operaciones</Link></Button></div><section className="hidden print:block" aria-hidden="true"><h1>PuntoCash · Comprobante de remesa</h1><dl><dt>Operación</dt><dd>{completed.operationCode}</dd><dt>Código de remesa</dt><dd>{remittance.code}</dd><dt>Beneficiario</dt><dd>{remittance.receiverName}</dd><dt>Documento</dt><dd>{remittance.receiverIdentification}</dd><dt>Importe</dt><dd>{formatMoney({ amount: remittance.deliveryAmount, currency: remittance.payoutCurrency })}</dd><dt>Caja</dt><dd>{CAJA_SUMMARY.register}</dd><dt>Trabajador</dt><dd>{CAJA_SUMMARY.worker}</dd><dt>Fecha y hora</dt><dd>{formatDateTime(new Date(completed.completedAt))}</dd></dl></section></div>; }
function Facts({ rows }: { rows: readonly (readonly [string, React.ReactNode])[] }) { return <dl className="grid gap-4 sm:grid-cols-2">{rows.map(([label, value]) => <div key={label} className="border-b border-border pb-3 last:border-b-0"><dt className="text-caption text-text-secondary">{label}</dt><dd className="mt-1 text-body font-medium text-text-primary">{value}</dd></div>)}</dl>; }
function fact(label: string, value: React.ReactNode): readonly [string, React.ReactNode] { return [label, value]; }
function Money({ remittance }: { remittance: RemittanceSnapshot }) { return <span className="flex items-center gap-2 pc-numeric"><CurrencyFlag currency={remittance.payoutCurrency} />{formatMoney({ amount: remittance.deliveryAmount, currency: remittance.payoutCurrency })}</span>; }
function StatusBadge({ status }: { status: RemittanceStatus }) { const variant = status === "READY" ? "success" : status === "COMPLETED" || status === "PAYED" ? "neutral" : status === "DENIED_PAYMENT" || status === "PAYOUT_DENIED" ? "error" : "warning"; return <Badge variant={variant}>{REMITTANCE_STATUS_LABEL[status]}</Badge>; }
function currencyName(currency: string) { return ({ CUP: "Peso cubano", USD: "Dólar estadounidense", EUR: "Euro", GBP: "Libra esterlina" } as Record<string, string>)[currency] ?? currency; }
