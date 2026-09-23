"use client";

import * as React from "react";
import Link from "next/link";
import { CircleCheck, Clock, Plus, Printer } from "lucide-react";

import { Alert, Button, Card, CardContent } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { useKioskBranch } from "@/features/kiosk/device-session";

/** "14:35" out of the shared "dd/mm/yyyy · hh:mm" format. */
function timeOf(iso: string): string {
  return formatDateTime(new Date(iso)).split(" · ")[1] ?? "";
}

/**
 * Result screen every kiosk flow ends on: a request code, not a receipt.
 *
 * Two actions. "Imprimir código" is the primary one, because the terminal
 * has a printer and a slip is the easiest thing for a client to carry to the
 * counter (Autoservicio FRD FR-AS-TKT-3). It prints a physical slip only,
 * never a downloadable file [R11]. If printing fails — no paper, printer
 * offline — nothing is lost: the code stays on screen and stays valid, and
 * the screen says so. "Nueva solicitud" goes back to the start.
 *
 * Still no "ver detalle": nothing was registered as an Operación yet, and the
 * slip itself says it is not a comprobante (RP-8 "el producto no promete lo
 * que no hace").
 */
export function KioskRequestTicket({
  code,
  createdAt,
  expiresAt,
  children,
}: {
  code: string;
  createdAt: string;
  expiresAt: string;
  /** Per-service summary rows, composed by the caller. Printed as well. */
  children: React.ReactNode;
}): React.JSX.Element {
  const branch = useKioskBranch();
  const [printFailed, setPrintFailed] = React.useState(false);

  function print() {
    setPrintFailed(false);
    try {
      // The demo prints through the browser. A native kiosk build talks to
      // its receipt printer directly and reports the printer's own errors
      // here instead (FR-AS-TKT-4).
      if (typeof window.print !== "function") throw new Error("print unavailable");
      window.print();
    } catch {
      setPrintFailed(true);
    }
  }

  return (
    <>
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center py-8 text-center print:hidden">
        <span
          aria-hidden="true"
          className="grid size-16 place-items-center rounded-pill border-2 border-success text-success"
        >
          <CircleCheck className="size-9" />
        </span>

        <h1 className="mt-5 text-screen-title text-text-primary">Solicitud lista</h1>
        <p className="mt-2 max-w-md text-body text-text-secondary">
          Preséntate en cualquier caja{branch ? ` de ${branch.name}` : ""} con este código y un trabajador
          completará la operación con los datos que ya registraste. Lleva tu carné de identidad.
        </p>

        <Card tone="accent" className="mt-8 w-full">
          <CardContent className="flex flex-col items-center gap-2 pt-8 pb-6">
            <span className="text-label text-text-secondary">Código de solicitud</span>
            <span className="pc-numeric text-amount-lg text-text-primary">{code}</span>
          </CardContent>
        </Card>

        <p className="mt-4 flex items-center gap-2 text-body-sm text-text-secondary">
          <Clock className="size-4 shrink-0" aria-hidden="true" />
          Válido hasta las {timeOf(expiresAt)} de hoy · generado a las {timeOf(createdAt)}
        </p>

        {printFailed ? (
          <Alert variant="error" title="No se pudo imprimir" className="mt-6 w-full text-left">
            Tu solicitud sigue siendo válida. Anota el código o tómale una foto y preséntalo en caja.
          </Alert>
        ) : null}

        <Card className="mt-8 w-full text-left">
          <CardContent className="pt-6">{children}</CardContent>
        </Card>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Button variant="secondary" size="lg" asChild>
            <Link href="/kiosk/autoservicio">
              <Plus aria-hidden="true" />
              Nueva solicitud
            </Link>
          </Button>
          <Button size="lg" onClick={print}>
            <Printer aria-hidden="true" />
            Imprimir código
          </Button>
        </div>
      </div>

      <PrintableRequestSlip
        code={code}
        createdAt={createdAt}
        expiresAt={expiresAt}
        branchName={branch?.name ?? null}
      >
        {children}
      </PrintableRequestSlip>
    </>
  );
}

/**
 * Print-only slip — the same mechanism the Worker comprobantes use: a
 * `hidden print:block` section plus the global print rules in `globals.css`,
 * which drop the app chrome. Sized for a narrow receipt roll; deliberately
 * plain markup. It states plainly that it is a request, not a comprobante.
 */
function PrintableRequestSlip({
  code,
  createdAt,
  expiresAt,
  branchName,
  children,
}: {
  code: string;
  createdAt: string;
  expiresAt: string;
  branchName: string | null;
  children: React.ReactNode;
}) {
  return (
    <section className="hidden print:block" aria-hidden="true" style={{ maxWidth: 320, margin: "0 auto" }}>
      <p style={{ fontSize: "16px", fontWeight: 700, textAlign: "center" }}>PuntoCash</p>
      <p style={{ textAlign: "center", marginTop: 2 }}>Solicitud de autoservicio</p>
      {branchName ? <p style={{ textAlign: "center", marginTop: 2 }}>{branchName}</p> : null}

      <div style={{ marginTop: 14, padding: "10px 0", borderTop: "1px dashed #6B7280", borderBottom: "1px dashed #6B7280", textAlign: "center" }}>
        <p style={{ color: "#6B7280", fontSize: "12px" }}>Código de solicitud</p>
        <p style={{ fontSize: "20px", fontWeight: 700, letterSpacing: "0.02em", marginTop: 2 }}>{code}</p>
        <p style={{ fontSize: "12px", marginTop: 4 }}>
          Válido hasta las {timeOf(expiresAt)} · generado a las {timeOf(createdAt)}
        </p>
      </div>

      <div style={{ marginTop: 10 }}>{children}</div>

      <p style={{ marginTop: 14, fontSize: "12px", lineHeight: 1.5 }}>
        Preséntate en caja con este código y tu carné de identidad. Esto no es un comprobante de operación:
        todavía no se ha realizado ningún pago ni cambio.
      </p>
    </section>
  );
}

export function TicketRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-1 border-b border-dashed border-border py-3 first:pt-0 last:border-b-0 last:pb-0">
      <span className="text-caption text-text-secondary">{label}</span>
      <span className="text-body font-medium text-text-primary">{children}</span>
    </div>
  );
}
