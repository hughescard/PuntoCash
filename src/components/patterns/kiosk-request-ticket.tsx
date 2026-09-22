import * as React from "react";
import Link from "next/link";
import { CircleCheck, Clock, Plus } from "lucide-react";

import { Button, Card, CardContent } from "@/components/ui";
import { formatDateTime } from "@/lib/format";

/**
 * Result screen every kiosk flow ends on: a request code, not a receipt.
 *
 * Deliberately offers only one action — start over — because there is
 * nothing else a kiosk can truthfully offer here (§ RP-8 "el producto no
 * promete lo que no hace"): no "ver detalle" (nothing was registered as an
 * Operación yet), no print (no receipt hardware is assumed).
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
  /** Per-service summary rows, composed by the caller. */
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center py-8 text-center">
      <span
        aria-hidden="true"
        className="grid size-16 place-items-center rounded-pill border-2 border-success text-success"
      >
        <CircleCheck className="size-9" />
      </span>

      <h1 className="mt-5 text-screen-title text-text-primary">Solicitud lista</h1>
      <p className="mt-2 max-w-md text-body text-text-secondary">
        Preséntate en cualquier caja con este código y un trabajador completará la operación con los
        datos que ya registraste. Lleva tu carné de identidad.
      </p>

      <Card tone="accent" className="mt-8 w-full">
        <CardContent className="flex flex-col items-center gap-2 pt-8 pb-6">
          <span className="text-label text-text-secondary">Código de solicitud</span>
          <span className="pc-numeric text-amount-lg text-text-primary">{code}</span>
        </CardContent>
      </Card>

      <p className="mt-4 flex items-center gap-2 text-body-sm text-text-secondary">
        <Clock className="size-4 shrink-0" aria-hidden="true" />
        Válido hasta las {formatDateTime(new Date(expiresAt)).split(" · ")[1]} de hoy · generado a
        las {formatDateTime(new Date(createdAt)).split(" · ")[1]}
      </p>

      <Card className="mt-8 w-full text-left">
        <CardContent className="pt-6">{children}</CardContent>
      </Card>

      <Button className="mt-8" asChild>
        <Link href="/kiosk/autoservicio">
          <Plus aria-hidden="true" />
          Nueva solicitud
        </Link>
      </Button>
    </div>
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
