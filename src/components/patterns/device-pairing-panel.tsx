"use client";

import * as React from "react";
import { KeyRound, QrCode } from "lucide-react";

import { Card, CardContent } from "@/components/ui";
import { PairingQr } from "./pairing-qr";

/** "49214C" → "492 14C": la agrupación que muestra el terminal y teclea el administrador. */
function formatPairingCode(code: string): string {
  return `${code.slice(0, 3)} ${code.slice(3)}`;
}

/** Lo que el panel necesita del equipo sin vincular: su código de vinculación. */
export interface EquipoPorVincular {
  /** Seis caracteres hexadecimales que generó el propio equipo. No caduca. */
  codigo: string;
}

/**
 * The two ways to link a terminal to its sede, side by side — the body of
 * every pairing screen (self-service kiosk, Worker caja). Both are always on
 * screen, because the admin may be at the terminal with a phone (scan the QR)
 * or at a desk with only the web panel (type the code): the WhatsApp/Telegram
 * linked-device pattern. The code is the terminal's own and never changes
 * (decision of 26/11/2026), so a terminal left on this screen overnight shows
 * the same code in the morning.
 *
 * Each screen supplies its own heading and surroundings; this panel is only
 * the part that has to be identical wherever a device is linked.
 */
export function DevicePairingPanel({
  device,
  qrPayload,
  demoNote,
  className,
}: {
  device: EquipoPorVincular;
  qrPayload: string;
  /** Demo-only footnote, rendered under the panel. */
  demoNote?: React.ReactNode;
  className?: string;
}): React.JSX.Element {
  return (
    <div className={className}>
      <Card className="w-full">
        <CardContent className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-8 p-10">
          <div className="flex flex-col items-center gap-5 text-center">
            <MethodHeading icon={QrCode} step="Opción 1" title="Escanea el código QR" />
            <div className="rounded-card border border-border bg-white p-3">
              <PairingQr payload={qrPayload} className="size-56 text-navy" />
            </div>
            <p className="max-w-64 text-body-sm text-text-secondary">
              Desde el panel del administrador, en el teléfono o la tableta de la sede.
            </p>
          </div>

          <div aria-hidden="true" className="flex flex-col items-center gap-3">
            <span className="w-px flex-1 bg-border" />
            <span className="text-label font-semibold text-text-secondary">o</span>
            <span className="w-px flex-1 bg-border" />
          </div>

          <div className="flex flex-col items-center gap-5 text-center">
            <MethodHeading icon={KeyRound} step="Opción 2" title="Escribe este código" />
            <div className="flex flex-1 flex-col items-center justify-center gap-3">
              <Card tone="accent" className="px-10 py-6 shadow-none">
                <span
                  aria-label={`Código de vinculación ${device.codigo.split("").join(" ")}`}
                  className="pc-numeric block whitespace-nowrap text-[3rem] leading-none font-bold tracking-[0.08em] text-text-primary"
                >
                  {formatPairingCode(device.codigo)}
                </span>
              </Card>
              <p className="text-caption text-text-secondary">Este código no cambia: es el de este equipo.</p>
            </div>
            <p className="max-w-64 text-body-sm text-text-secondary">
              En el panel web del administrador, desde cualquier equipo.
            </p>
          </div>
        </CardContent>
      </Card>

      <p className="mt-5 text-body-sm text-text-secondary">Esperando la vinculación… esta pantalla cambiará sola.</p>

      {demoNote ? <p className="mx-auto mt-10 max-w-2xl text-center text-caption text-text-secondary">{demoNote}</p> : null}
    </div>
  );
}

function MethodHeading({
  icon: Icon,
  step,
  title,
}: {
  icon: typeof QrCode;
  step: string;
  title: string;
}): React.JSX.Element {
  return (
    <div className="flex flex-col items-center gap-2">
      <span
        aria-hidden="true"
        className="grid size-11 place-items-center rounded-pill bg-accent-subtle text-primary"
      >
        <Icon className="size-5" />
      </span>
      <span className="text-overline uppercase text-text-secondary">{step}</span>
      <h2 className="text-section-title text-text-primary">{title}</h2>
    </div>
  );
}
