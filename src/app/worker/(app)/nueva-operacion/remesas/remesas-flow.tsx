"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CircleCheck, CreditCard, FileText, Lock, Printer, UserRound, XCircle } from "lucide-react";

import { Alert, Badge, Button, Card, CardContent, CardHeader, CardTitle, Field, Input } from "@/components/ui";
import { CurrencyFlag } from "@/components/patterns/currency-flag";
import { formatDateTime, formatMoney } from "@/lib/format";
import { useRouter } from "next/navigation";
import { useCaja } from "@/features/caja/use-caja";
import { useVistaDeCaja } from "@/features/worker/caja-context";
import { alcanzaParaEntregarAction, comprobarOperacionAction, registrarOperacionAction } from "../../../_actions";
import type { EfectivoRegistrado } from "@/features/network/caja-operativa";
import { restar } from "@/features/caja/billetes";
import { BilletesDelMovimiento } from "@/components/patterns/billetes-del-movimiento";
import { RecuentoDeMoneda } from "../../caja/recuento-de-moneda";
import { EfectivoDeOperacion } from "../efectivo-de-operacion";
import { liquidacionComoLineas } from "../liquidacion";
import type { OperationLiquidation } from "@/features/operations/operations-history";
import { DELIVERY_METHOD_LABEL, REMITTANCE_STATUS_LABEL, remittanceProvider, type RemittanceSnapshot, type RemittanceStatus } from "@/features/remittances/remittance-provider";
import { clearPendingWorkerHandoff, readPendingWorkerHandoff } from "@/features/kiosk/self-service-request";

type Step = "codigo" | "revision" | "efectivo" | "confirmar" | "resultado";
interface Completed { remittance: RemittanceSnapshot; operationCode: string; completedAt: string; liquidacion?: OperationLiquidation; }


/** Por qué los billetes ya no valen, para el trabajador. */
const MENSAJE_DE_BILLETES: Readonly<Record<string, string>> = {
  "sin-salida": "La caja no puede pagar eso entero. No se registró nada: ofrécele al cliente otra salida o que vuelva más tarde.",
  "propuesta-vencida": "Los billetes ya no cuadran con lo que toca, quizá porque cambió la caja. Revísalos.",
  "sin-esos-billetes": "Contada la caja, esos billetes no están. No se registró nada: vuelve a marcar con qué billetes se entrega.",
};

export function RemesasFlow(): React.JSX.Element {
  const router = useRouter();
  const caja = useCaja();
  const vista = useVistaDeCaja();
  // Code handed over by "Buscar solicitud" (kiosk request), if any.
  const [handoffCode] = React.useState(() => readPendingWorkerHandoff("remesas")?.data.code ?? null);
  const [step, setStep] = React.useState<Step>("codigo");
  const [code, setCode] = React.useState(handoffCode ?? "");
  const [remittance, setRemittance] = React.useState<RemittanceSnapshot | null>(null);
  // A kiosk handoff starts searching straight away (see the effect below).
  const [searching, setSearching] = React.useState(handoffCode !== null);
  const [notFound, setNotFound] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [completed, setCompleted] = React.useState<Completed | null>(null);
  /** Los billetes con los que se paga, cuando cuadran (bloque 4). */
  const [efectivo, setEfectivo] = React.useState<EfectivoRegistrado | null>(null);
  /** La entrega ya dada por hecha en el proveedor: si hay que contar la caja, se vuelve a registrar sin repetirla. */
  const [externo, setExterno] = React.useState<RemittanceSnapshot | null>(null);
  const [recontando, setRecontando] = React.useState<string | null>(null);
  const [recarga, setRecarga] = React.useState(0);

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
  // State only changes once the lookup answers, never synchronously here.
  React.useEffect(() => {
    clearPendingWorkerHandoff();
    if (!handoffCode) return;
    let active = true;
    void remittanceProvider.findByCode(handoffCode).then((result) => {
      if (!active) return;
      setSearching(false);
      if (!result.ok) { setNotFound(true); return; }
      setRemittance(result.remittance); setStep("revision");
    });
    return () => { active = false; };
  }, [handoffCode]);

  async function confirm() {
    if (!remittance || !payable || submitting || !efectivo) return;
    setSubmitting(true); setError(null);
    const operacion = {
      servicio: "Remesa" as const,
      cliente: { nombre: remittance.receiverName, documentType: "CI" as const, documentNumber: remittance.receiverIdentification, telefono: remittance.receiverPhone ?? "No disponible", nacionalidad: "No disponible" },
      tramo: { currency: remittance.payoutCurrency, delta: -remittance.deliveryAmount, concepto: "Pago de remesa" },
      efectivo,
    };
    let entregada = externo;
    if (!entregada) {
      /* Worker opera a ciegas: la pantalla no sabe cuánto hay en caja. Antes de
         dar la remesa por entregada en el proveedor, el servidor comprueba que
         se podría registrar —sin escribir nada—: si hay que contar la moneda o
         los billetes no cuadran, se sabe antes de completar nada fuera. */
      if (!(await alcanzaParaEntregarAction(remittance.payoutCurrency, remittance.deliveryAmount))) {
        setSubmitting(false);
        setError(`La caja no tiene ${remittance.payoutCurrency} suficiente para entregar esta remesa. No se registró nada: avisa a tu supervisor.`);
        return;
      }
      const previa = await comprobarOperacionAction(operacion);
      if (!previa.ok) {
        setSubmitting(false);
        if (previa.reason === "recuento-necesario" && previa.currency) { setRecontando(previa.currency); return; }
        setError(MENSAJE_DE_BILLETES[previa.reason] ?? "No se pudo comprobar la entrega. Vuelve a los billetes y revísalos.");
        if (previa.reason in MENSAJE_DE_BILLETES) { setRecarga((n) => n + 1); setStep("efectivo"); }
        return;
      }
      const external = await remittanceProvider.complete(remittance.id);
      if (!external.ok) { setSubmitting(false); setError(external.reason === "conflict" ? "La remesa ya no está disponible para entrega." : "No se pudo completar la remesa. Intenta nuevamente o solicita asistencia."); return; }
      entregada = external.remittance;
      setExterno(entregada);
    }
    const registrada = await registrarOperacionAction({
      ...operacion,
      remittance: { serviceId: remittance.id, code: remittance.code, reference: remittance.reference, beneficiaryName: remittance.receiverName, beneficiaryIdentification: remittance.receiverIdentification, deliveryMethod: remittance.deliveryMethod, payoutAmount: remittance.deliveryAmount, payoutCurrency: remittance.payoutCurrency, externalStatus: entregada.status },
    });
    if (!registrada.ok) {
      setSubmitting(false);
      if (registrada.reason === "recuento-necesario" && registrada.currency) { setRecontando(registrada.currency); return; }
      setError(registrada.reason === "fondos-insuficientes" ? "La caja no tiene efectivo suficiente para completar esta remesa. Avisa a tu supervisor." : registrada.reason === "servicio-no-habilitado" ? "PuntoCash deshabilitó Remesas en esta sede." : MENSAJE_DE_BILLETES[registrada.reason] ?? "No se pudo registrar la remesa en la caja. Solicita asistencia.");
      return;
    }
    const operationCode = registrada.value.codigo; const now = new Date(registrada.value.fechaHora);
    router.refresh();
    setCompleted({ remittance: entregada, operationCode, completedAt: now.toISOString(), ...(registrada.value.liquidacion ? { liquidacion: registrada.value.liquidacion } : {}) }); setSubmitting(false); setStep("resultado");
  }

  if (blocked) return <Blocked />;
  if (step === "resultado" && completed) return <Result completed={completed} />;
  if (step === "codigo") return <CodeScreen code={code} setCode={setCode} searching={searching} notFound={notFound} onSearch={search} />;
  if (!remittance) return <CodeScreen code={code} setCode={setCode} searching={searching} notFound={notFound} onSearch={search} />;
  if (recontando) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <RecuentoDeMoneda
          currency={recontando}
          denominaciones={vista.denominaciones}
          supervisores={vista.supervisores}
          onCancelar={() => setRecontando(null)}
          onListo={() => { setRecontando(null); setRecarga((n) => n + 1); void confirm(); }}
        />
      </div>
    );
  }
  if (step === "revision") return <Review remittance={remittance} habilitada={caja.monedas.includes(remittance.payoutCurrency)} onBack={() => setStep("codigo")} onContinue={() => { setEfectivo(null); setStep("efectivo"); }} />;
  if (step === "efectivo") {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <Back onClick={() => setStep("revision")} label="Volver a Revisar remesa" />
        <header>
          <h1 className="text-screen-title text-text-primary">Billetes de la entrega</h1>
          <p className="mt-2 text-body text-text-secondary">Marca los billetes con los que se entrega la remesa al beneficiario.</p>
        </header>
        <EfectivoDeOperacion entrada={{ modo: "pago", currency: remittance.payoutCurrency, importe: remittance.deliveryAmount }} recargar={recarga} onChange={(e) => setEfectivo(e.listo ? e.efectivo : null)} />
        {error ? <Alert variant="error" title={error} /> : null}
        <div className="pc-botonera sm:justify-end">
          <Button variant="secondary" onClick={() => setStep("revision")}>Cancelar</Button>
          <Button disabled={!efectivo} onClick={() => { setError(null); setStep("confirmar"); }}>Continuar a confirmar<ArrowRight aria-hidden="true" /></Button>
        </div>
      </div>
    );
  }
  return <Confirmation remittance={remittance} efectivo={efectivo} tipos={vista.denominaciones} error={error} submitting={submitting} onBack={() => setStep("efectivo")} onConfirm={confirm} />;
}

/**
 * Vía explícita de regreso (**FR-NAV-3**). Acepta una ruta o un paso atrás
 * dentro del flujo: los pasos intermedios no tienen URL propia, así que
 * retroceder es un `onClick`, no un enlace — los tres regresos de este flujo
 * apuntaban a la ruta vacía y no llevaban a ninguna parte.
 */
const BACK_CLASS =
  "inline-flex w-fit items-center gap-2 rounded-control text-label font-medium text-text-secondary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-primary";

function Back({
  href = "/worker/nueva-operacion",
  label = "Volver a Nueva operación",
  onClick,
}: {
  href?: string;
  label?: string;
  onClick?: () => void;
}) {
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={BACK_CLASS}>
        <ArrowLeft className="size-4" aria-hidden="true" />
        {label}
      </button>
    );
  }
  return (
    <Link href={href} className={BACK_CLASS}>
      <ArrowLeft className="size-4" aria-hidden="true" />
      {label}
    </Link>
  );
}
function Blocked() { return <div className="mx-auto flex w-full max-w-xl flex-col gap-6"><Back /><Card><CardContent className="flex flex-col items-center px-8 py-12 text-center"><span className="grid size-12 place-items-center rounded-control bg-warning-subtle text-warning-foreground"><Lock aria-hidden="true" /></span><h1 className="mt-5 text-screen-title text-text-primary">Caja cerrada</h1><p className="mt-2 text-body text-text-secondary">Debes abrir una jornada antes de pagar una remesa.</p><Button className="mt-6" asChild><Link href="/worker/caja">Ir a Caja</Link></Button></CardContent></Card></div>; }
function CodeScreen({ code, setCode, searching, notFound, onSearch }: { code: string; setCode: (value: string) => void; searching: boolean; notFound: boolean; onSearch: (event: React.FormEvent) => void }) {
  const form = <Card className="w-full"><CardHeader><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-control bg-primary-subtle text-primary"><CreditCard className="size-[18px]" aria-hidden="true" /></span><div><CardTitle>Cobrar remesa</CardTitle><p className="mt-1 text-body-sm text-text-secondary">Solicita al beneficiario el código de la remesa para continuar.</p></div></div></CardHeader><CardContent className="pt-0"><form onSubmit={onSearch} className="flex flex-col gap-5"><Field id="remittance-code" label="Código de remesa" required><Input id="remittance-code" value={code} onChange={(event) => setCode(event.target.value)} placeholder="Introduce el código proporcionado por el beneficiario" autoComplete="off" /></Field><Button type="submit" block loading={searching} disabled={!code.trim()}>{searching ? "Buscando…" : "Buscar remesa"}</Button></form><DemoCodes onPick={setCode} /></CardContent></Card>;
  if (notFound) return <div className="mx-auto flex w-full max-w-2xl flex-col gap-6"><Back /><div className="flex flex-col items-center px-6 pt-3 text-center"><span className="grid size-16 place-items-center rounded-pill border-4 border-error-border bg-error-subtle text-error-foreground"><XCircle className="size-8" aria-hidden="true" /></span><h1 className="mt-5 text-screen-title text-text-primary">Remesa no encontrada</h1><p className="mt-3 text-body text-text-primary">No encontramos una remesa con este código.</p><p className="mt-1 text-body-sm text-text-secondary">Verifica el código con el beneficiario e inténtalo nuevamente.</p></div>{form}<Alert variant="info" title="El código debe ser proporcionado directamente por el beneficiario." /></div>;
  return <div className="mx-auto flex w-full max-w-2xl flex-col gap-6"><Back /><div><h1 className="text-screen-title text-text-primary">Remesas</h1></div>{form}<Alert variant="info" title="El código debe ser proporcionado directamente por el beneficiario." /></div>;
}
function Review({ remittance, habilitada, onBack, onContinue }: { remittance: RemittanceSnapshot; habilitada: boolean; onBack: () => void; onContinue: () => void }) {
  const eligible = remittance.status === "READY" && habilitada;
  const remittanceRows = [fact("Código de remesa", remittance.code), fact("Importe a entregar", <Money remittance={remittance} key="amount" />), fact("Moneda", `${remittance.payoutCurrency} · ${currencyName(remittance.payoutCurrency)}`), fact("Método de entrega", DELIVERY_METHOD_LABEL[remittance.deliveryMethod]), ...(remittance.reference ? [fact("Referencia", remittance.reference)] : [])];
  const beneficiaryRows = [fact("Nombre completo", remittance.receiverName), fact("Documento de identidad", remittance.receiverIdentification), ...(remittance.receiverPhone ? [fact("Teléfono", remittance.receiverPhone)] : []), ...(remittance.receiverAddress ? [fact("Dirección", remittance.receiverAddress)] : []), ...(remittance.receiverProvince || remittance.receiverMunicipality ? [fact("Provincia / Municipio", [remittance.receiverProvince, remittance.receiverMunicipality].filter(Boolean).join(" / "))] : [])];
  return <div className="mx-auto flex w-full max-w-5xl flex-col gap-6"><Back onClick={onBack} label="Volver a Remesas" /><header className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-screen-title text-text-primary">Revisar remesa</h1><p className="mt-2 text-body text-text-secondary">Verifica los datos de la remesa y la identidad del beneficiario.</p></div><div className="text-right"><p className="text-caption text-text-secondary">Estado de la remesa</p><div className="mt-1"><StatusBadge status={remittance.status} /></div></div></header><div className="grid gap-4 wide:grid-cols-2"><Card><CardHeader><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-control bg-primary-subtle text-primary"><CreditCard className="size-[18px]" aria-hidden="true" /></span><CardTitle>Información de la remesa</CardTitle></div></CardHeader><CardContent className="pt-0"><Facts rows={remittanceRows} /></CardContent></Card><Card><CardHeader><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-control bg-primary-subtle text-primary"><UserRound className="size-[18px]" aria-hidden="true" /></span><CardTitle>Beneficiario</CardTitle></div></CardHeader><CardContent className="pt-0"><Facts rows={beneficiaryRows} /></CardContent></Card></div><Alert variant="warning" title="Verificación de identidad">Solicita el documento de identidad del beneficiario y verifica que coincida con la información mostrada antes de continuar.</Alert>{remittance.status !== "READY" ? <Alert variant="info" title="Esta remesa no está disponible para entrega de efectivo." /> : !habilitada ? <Alert variant="error" title={`${remittance.payoutCurrency} no está habilitada en esta caja.`} /> : null}<div className="pc-botonera sm:justify-end"><Button variant="secondary" onClick={onBack}>Cancelar</Button><Button disabled={!eligible} onClick={onContinue}>Continuar a confirmar<ArrowRight aria-hidden="true" /></Button></div></div>;
}
/** Códigos de la demostración: para probar el flujo sin saberlos de memoria. */
const DEMO_CODES = [
  { code: "RM-7X82-9KLM", detail: "Lista para entregar · 500,00 CUP" },
  { code: "RM-SIN-FONDOS", detail: "Importe que la caja no puede pagar" },
  { code: "RM-TRANSITO-01", detail: "Todavía en tránsito" },
  { code: "RM-COMPLETADA", detail: "Ya entregada" },
  { code: "RM-FALLA-EXT", detail: "Falla el proveedor externo al completar" },
] as const;

function DemoCodes({ onPick }: { onPick: (code: string) => void }) {
  return (
    <Alert variant="info" title="Códigos de la demostración" className="mt-5">
      <ul className="mt-1 flex flex-col gap-2">
        {DEMO_CODES.map((d) => (
          <li key={d.code} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <span className="min-w-0 text-body-sm">
              <span className="pc-numeric font-semibold">{d.code}</span> · {d.detail}
            </span>
            <Button type="button" variant="secondary" size="sm" onClick={() => onPick(d.code)}>
              Usar
            </Button>
          </li>
        ))}
      </ul>
    </Alert>
  );
}

function Confirmation({ remittance, efectivo, tipos, error, submitting, onBack, onConfirm }: { remittance: RemittanceSnapshot; efectivo: EfectivoRegistrado | null; tipos: Readonly<Record<string, readonly import("@/features/caja/billetes").Denominacion[]>>; error: string | null; submitting: boolean; onBack: () => void; onConfirm: () => void }) { const CAJA_SUMMARY = useCaja().summary; return <div className="mx-auto flex w-full max-w-3xl flex-col gap-6"><Back onClick={onBack} label="Volver a los billetes" /><header><h1 className="text-screen-title text-text-primary">Confirmar entrega de remesa</h1><p className="mt-2 text-body text-text-secondary">Confirma la entrega del efectivo al beneficiario.</p></header><Card><CardContent className="pt-6"><Facts rows={[fact("Código de remesa", remittance.code), fact("Beneficiario", remittance.receiverName), fact("Documento de identidad", remittance.receiverIdentification), fact("Importe a entregar", <Money remittance={remittance} key="money" />), fact("Moneda", `${remittance.payoutCurrency} · ${currencyName(remittance.payoutCurrency)}`), fact("Caja", CAJA_SUMMARY.register)]} /></CardContent></Card>{efectivo ? <Card><CardHeader><CardTitle>Billetes que se entregan</CardTitle></CardHeader><CardContent className="flex flex-col gap-4 pt-0"><BilletesDelMovimiento billetes={restar({}, efectivo.entrega)} currency={remittance.payoutCurrency} tipos={tipos[remittance.payoutCurrency] ?? []} nombre={`${remittance.payoutCurrency} que salen`} />{efectivo.entregaCup ? <BilletesDelMovimiento billetes={restar({}, efectivo.entregaCup)} currency="CUP" tipos={tipos["CUP"] ?? []} nombre="CUP que salen" /> : null}</CardContent></Card> : null}<Alert variant="warning" title="Acción irreversible">Confirma la operación únicamente después de verificar la identidad del beneficiario y entregar el efectivo correspondiente. Esta acción marcará la remesa como entregada.</Alert>{error ? <Alert variant="error" title={error} /> : null}<div className="pc-botonera sm:justify-end"><Button variant="secondary" onClick={onBack}>Cancelar</Button><Button variant="destructive" loading={submitting} onClick={onConfirm}>{submitting ? "Confirmando…" : "Confirmar entrega"}</Button></div></div>; }
function Result({ completed }: { completed: Completed }) { const CAJA_SUMMARY = useCaja().summary; const { remittance } = completed; return <div className="mx-auto flex w-full max-w-3xl flex-col items-center"><span className="grid size-14 place-items-center rounded-pill border-2 border-success text-success"><CircleCheck className="size-8" aria-hidden="true" /></span><h1 className="mt-5 text-screen-title text-text-primary">Remesa completada</h1><p className="mt-2 text-body text-text-secondary">La remesa ha sido marcada como entregada.</p><Card className="mt-8 w-full"><CardContent className="pt-6"><Facts rows={[["Código de remesa", remittance.code], ["Beneficiario", remittance.receiverName], ["Documento de identidad", remittance.receiverIdentification], ["Importe entregado", <Money remittance={remittance} key="money" />], ["Moneda", `${remittance.payoutCurrency} · ${currencyName(remittance.payoutCurrency)}`], ...liquidacionComoLineas(completed.liquidacion).map((l) => [l.etiqueta, l.valor] as const), ["Caja", CAJA_SUMMARY.register], ["Trabajador", CAJA_SUMMARY.worker], ["Fecha y hora", formatDateTime(new Date(completed.completedAt))]]} /></CardContent></Card><p className="mt-5 text-body-sm text-text-secondary">La remesa fue completada correctamente y registrada en PuntoCash.</p><div className="pc-botonera mt-7 sm:justify-center"><Button variant="secondary" onClick={() => window.print()}><Printer aria-hidden="true" />Imprimir comprobante</Button><Button asChild><Link href="/worker/operaciones"><FileText aria-hidden="true" />Ir a Operaciones</Link></Button></div><section className="hidden print:block" aria-hidden="true"><h1>PuntoCash · Comprobante de remesa</h1><dl><dt>Operación</dt><dd>{completed.operationCode}</dd><dt>Código de remesa</dt><dd>{remittance.code}</dd><dt>Beneficiario</dt><dd>{remittance.receiverName}</dd><dt>Documento</dt><dd>{remittance.receiverIdentification}</dd><dt>Importe</dt><dd>{formatMoney({ amount: remittance.deliveryAmount, currency: remittance.payoutCurrency })}</dd>{liquidacionComoLineas(completed.liquidacion).map((l) => <React.Fragment key={l.etiqueta}><dt>{l.etiqueta}</dt><dd>{l.valor}</dd></React.Fragment>)}<dt>Caja</dt><dd>{CAJA_SUMMARY.register}</dd><dt>Trabajador</dt><dd>{CAJA_SUMMARY.worker}</dd><dt>Fecha y hora</dt><dd>{formatDateTime(new Date(completed.completedAt))}</dd></dl></section></div>; }
function Facts({ rows }: { rows: readonly (readonly [string, React.ReactNode])[] }) { return <dl className="grid gap-4 sm:grid-cols-2">{rows.map(([label, value]) => <div key={label} className="border-b border-border pb-3 last:border-b-0"><dt className="text-caption text-text-secondary">{label}</dt><dd className="mt-1 text-body font-medium text-text-primary">{value}</dd></div>)}</dl>; }
function fact(label: string, value: React.ReactNode): readonly [string, React.ReactNode] { return [label, value]; }
function Money({ remittance }: { remittance: RemittanceSnapshot }) { return <span className="flex items-center gap-2 pc-numeric"><CurrencyFlag currency={remittance.payoutCurrency} />{formatMoney({ amount: remittance.deliveryAmount, currency: remittance.payoutCurrency })}</span>; }
function StatusBadge({ status }: { status: RemittanceStatus }) { const variant = status === "READY" ? "success" : status === "COMPLETED" || status === "PAYED" ? "neutral" : status === "DENIED_PAYMENT" || status === "PAYOUT_DENIED" ? "error" : "warning"; return <Badge variant={variant}>{REMITTANCE_STATUS_LABEL[status]}</Badge>; }
function currencyName(currency: string) { return ({ CUP: "Peso cubano", USD: "Dólar estadounidense", EUR: "Euro", GBP: "Libra esterlina" } as Record<string, string>)[currency] ?? currency; }
