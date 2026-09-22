"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDownToLine,
  BadgeCheck,
  Banknote,
  KeyRound,
  Lock,
  Search,
  Wallet,
} from "lucide-react";

import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Input } from "@/components/ui";
import { CAJA_BALANCES, hasOpenJornada, isCurrencyEnabled } from "@/features/caja/caja-data";
import { getCurrentWorker } from "@/features/worker/session";
import { transferProvider, type TransferPayoutSnapshot } from "@/features/transfers/transfer-provider";
import { clearPendingWorkerHandoff, readPendingWorkerHandoff } from "@/features/kiosk/self-service-request";
import { BackLink, ContextStrip, GIROS_ROUTE, Rows, row } from "./cobrar-giro-parts";
import { GiroPayoutConfirmation, GiroPayoutReview, type PayoutBlock } from "./cobrar-giro-screens";
import { GiroPayoutResult } from "./cobrar-giro-result";
import { confirmGiroPayout, type GiroPayoutCompleted } from "./confirm-payout";

type Step = "codigo" | "revisar" | "confirmar" | "resultado";

/**
 * "Giros" — Cobrar giro.
 *
 * Código → Revisar giro → Confirmar entrega → Resultado. The lookup is
 * code-only by design: there is no transfer list, no pending list, no recent
 * searches, no autocomplete and no search by name, document, phone, province,
 * municipality, sender or amount anywhere in this flow. A giro can only be
 * reached by the exact code the beneficiary presents, and every rejected
 * lookup — wrong code, a reference hit, a remittance, a code that does not
 * exist — surfaces as the same opaque "Giro no encontrado".
 *
 * Nothing here reserves cash or a payout seat: `receiverProvince` /
 * `receiverMunicipality` are beneficiary data, not routing, so the current
 * Caja does not have to match them. The only local gates are the ones that
 * apply at payout time — open jornada, currency enabled here, and enough
 * cash — and `confirmGiroPayout` revalidates all of them at confirmation.
 */
export function CobrarGiroFlow(): React.JSX.Element {
  const router = useRouter();
  const worker = getCurrentWorker();

  // Captured once, on entry — a jornada closed elsewhere later must not
  // retroactively lock a result screen this flow already produced.
  const [blocked] = React.useState(() => !hasOpenJornada());

  // Code handed over by "Buscar solicitud" (kiosk request), if any.
  const [handoffCode] = React.useState(() => readPendingWorkerHandoff("giros-cobrar")?.data.code ?? null);
  const [step, setStep] = React.useState<Step>("codigo");
  const [code, setCode] = React.useState(handoffCode ?? "");
  const [searching, setSearching] = React.useState(false);
  const [notFound, setNotFound] = React.useState(false);
  const [transfer, setTransfer] = React.useState<TransferPayoutSnapshot | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [confirmError, setConfirmError] = React.useState<string | undefined>();
  const [completed, setCompleted] = React.useState<GiroPayoutCompleted | null>(null);

  const availableCash = transfer
    ? CAJA_BALANCES.find((balance) => balance.currency === transfer.payoutCurrency)?.amount
    : undefined;

  // Only READY authorises a physical payout: COMPLETED was already paid once
  // and must never produce a second delivery of cash.
  const block: PayoutBlock = !transfer
    ? null
    : transfer.status !== "READY"
      ? "estado"
      : !isCurrencyEnabled(transfer.payoutCurrency)
        ? "moneda"
        : (availableCash ?? 0) < transfer.deliveryAmount
          ? "fondos"
          : null;

  async function search(event: React.FormEvent) {
    event.preventDefault();
    await runSearch(code.trim());
  }

  // From a kiosk request the code is already known: look it up right away,
  // so the worker lands on "Revisar giro" and only has to compare the carné
  // photo with the person in front of them.
  React.useEffect(() => {
    clearPendingWorkerHandoff();
    if (handoffCode) void runSearch(handoffCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runSearch(entered: string) {
    if (!entered || searching) return;

    setSearching(true);
    setNotFound(false);
    const result = await transferProvider.findTransferByCode(entered);
    setSearching(false);

    if (!result.ok) {
      setTransfer(null);
      setNotFound(true);
      return;
    }
    setCode(entered);
    setTransfer(result.transfer);
    setStep("revisar");
  }

  async function handleConfirm() {
    if (!transfer || submitting) return;
    setSubmitting(true);
    setConfirmError(undefined);

    const outcome = await confirmGiroPayout({ transfer, worker: worker.fullName });

    setSubmitting(false);
    if (!outcome.ok) {
      setConfirmError(outcome.message);
      return;
    }
    setCompleted(outcome.completed);
    setStep("resultado");
  }

  function leaveFlow() {
    router.push(GIROS_ROUTE);
  }

  if (blocked) {
    return (
      <div className="flex flex-col gap-6">
        <BackLink label="Volver a Giros" />
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
              Debes abrir una jornada antes de cobrar un giro.
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
    return <GiroPayoutResult completed={completed} />;
  }

  if (step === "confirmar" && transfer) {
    return (
      <GiroPayoutConfirmation
        transfer={transfer}
        worker={worker.fullName}
        submitting={submitting}
        error={confirmError}
        onBack={() => setStep("revisar")}
        onCancel={leaveFlow}
        onConfirm={() => void handleConfirm()}
      />
    );
  }

  if (step === "revisar" && transfer) {
    return (
      <GiroPayoutReview
        transfer={transfer}
        worker={worker.fullName}
        block={block}
        availableCash={availableCash}
        onBack={() => setStep("codigo")}
        onCancel={leaveFlow}
        onContinue={() => setStep("confirmar")}
      />
    );
  }

  return (
    <CodeScreen
      code={code}
      worker={worker.fullName}
      searching={searching}
      notFound={notFound}
      onChangeCode={(value) => {
        setCode(value);
        if (notFound) setNotFound(false);
      }}
      onSearch={search}
    />
  );
}

/* -------------------------------------------------------------------------
 * Step 1 — Código (and its "Giro no encontrado" error state)
 * ---------------------------------------------------------------------- */

function CodeScreen({
  code,
  worker,
  searching,
  notFound,
  onChangeCode,
  onSearch,
}: {
  code: string;
  worker: string;
  searching: boolean;
  notFound: boolean;
  onChangeCode: (value: string) => void;
  onSearch: (event: React.FormEvent) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <BackLink label="Volver a Giros" />

      <div>
        <h1 className="text-screen-title text-text-primary">Cobrar giro</h1>
        <p className="mt-2 max-w-2xl text-body text-text-secondary">
          Solicita al beneficiario el código del giro para continuar.
        </p>
      </div>

      <ContextStrip worker={worker} />

      <div className="grid grid-cols-1 items-start gap-6 wide:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex min-w-0 items-center gap-3">
              <span
                aria-hidden="true"
                className="grid size-9 shrink-0 place-items-center rounded-control bg-primary-subtle text-primary"
              >
                <KeyRound className="size-[18px]" />
              </span>
              <div className="min-w-0">
                <CardTitle>Código del giro</CardTitle>
                <p className="mt-1 text-body-sm text-text-secondary">
                  Introduce el código proporcionado por el beneficiario para localizar el giro.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <form noValidate onSubmit={onSearch} className="flex flex-col gap-4">
              <Input
                id="giro-code"
                aria-label="Código del giro"
                value={code}
                onChange={(event) => onChangeCode(event.target.value)}
                placeholder="Ej. TR-260901-000245"
                // No suggestions of any kind: a giro code must come from the
                // beneficiary, never from the browser or from this screen.
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                invalid={notFound}
                aria-describedby={notFound ? "giro-code-error" : undefined}
              />

              {notFound ? (
                /* One single message for every rejected lookup — it must never
                   reveal whether the code exists, matched a reference, or
                   belongs to another kind of service. */
                <Alert id="giro-code-error" variant="error" title="Giro no encontrado">
                  Verifica el código con el beneficiario e inténtalo nuevamente.
                </Alert>
              ) : null}

              <Button type="submit" block loading={searching} disabled={!code.trim()}>
                {searching ? null : <Search aria-hidden="true" />}
                {searching ? "Buscando…" : "Buscar giro"}
              </Button>

              <p className="text-body-sm text-text-secondary">
                El código debe ser proporcionado directamente por el beneficiario.
              </p>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="min-w-0">
              <CardTitle>Validaciones del pago</CardTitle>
              <p className="mt-1 text-body-sm text-text-secondary">
                Al encontrar el giro, se realizarán las siguientes verificaciones antes de entregar
                el dinero.
              </p>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-5 pt-0">
            <ul className="flex flex-col gap-3">
              <CheckItem icon={BadgeCheck}>El código debe corresponder a un giro válido</CheckItem>
              <CheckItem icon={BadgeCheck}>La identidad del beneficiario debe coincidir</CheckItem>
              <CheckItem icon={Banknote}>La caja debe tener la moneda habilitada</CheckItem>
              <CheckItem icon={Wallet}>La caja debe contar con saldo suficiente</CheckItem>
            </ul>

            <div className="border-t border-border pt-5">
              <p className="text-card-title font-semibold text-text-primary">Estado esperado</p>
              <p className="mt-1 text-body-sm text-text-secondary">Información del giro a cobrar.</p>
              <div className="mt-3">
                <Rows
                  rows={[
                    row("Servicio", "Giro interprovincial"),
                    row("Método", "Recogida"),
                    row(
                      "Impacto en caja",
                      <span key="impacto" className="inline-flex items-center gap-2">
                        <ArrowDownToLine className="size-4 text-text-secondary" aria-hidden="true" />
                        Salida de efectivo
                      </span>,
                    ),
                  ]}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CheckItem({ icon: Icon, children }: { icon: typeof BadgeCheck; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span
        aria-hidden="true"
        className="grid size-7 shrink-0 place-items-center rounded-control bg-primary-subtle text-primary"
      >
        <Icon className="size-4" />
      </span>
      <span className="text-body-sm text-text-primary">{children}</span>
    </li>
  );
}
