"use client";

import * as React from "react";
import { Clock, KeyRound, QrCode } from "lucide-react";

import { Card, CardContent } from "@/components/ui";
import { formatPairingCode, type UnlinkedDevice } from "@/features/devices/device-link";
import { PairingQr } from "./pairing-qr";

/** "09:41" — minutes and seconds left on the current pairing challenge. */
function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/**
 * The two ways to link a terminal to its sede, side by side — the body of
 * every pairing screen (self-service kiosk, Worker caja). Both are always on
 * screen, because the admin may be at the terminal with a phone (scan the QR)
 * or at a desk with only the web panel (type the code): the WhatsApp/Telegram
 * linked-device pattern. The challenge renews itself when it expires, so a
 * terminal left on this screen overnight still shows a valid code in the
 * morning.
 *
 * Each screen supplies its own heading and surroundings; this panel is only
 * the part that has to be identical wherever a device is linked.
 */
export function DevicePairingPanel({
  device,
  qrPayload,
  onExpired,
  demoNote,
  className,
}: {
  device: UnlinkedDevice;
  qrPayload: string;
  /** Called once the current challenge has expired — the caller renews it. */
  onExpired: () => void;
  /** Demo-only footnote, rendered under the countdown. */
  demoNote?: React.ReactNode;
  className?: string;
}): React.JSX.Element {
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(id);
  }, []);

  const remaining = new Date(device.pairing.expiresAt).getTime() - now;

  React.useEffect(() => {
    if (remaining <= 0) onExpired();
  }, [remaining, onExpired]);

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
                  aria-label={`Código de vinculación ${device.pairing.code.split("").join(" ")}`}
                  className="pc-numeric block whitespace-nowrap text-[3rem] leading-none font-bold tracking-[0.08em] text-text-primary"
                >
                  {formatPairingCode(device.pairing.code)}
                </span>
              </Card>
              <p className="text-caption text-text-secondary">
                Identificador del equipo <span className="pc-numeric font-semibold">{device.deviceId}</span>
              </p>
            </div>
            <p className="max-w-64 text-body-sm text-text-secondary">
              En el panel web del administrador, desde cualquier equipo.
            </p>
          </div>
        </CardContent>
      </Card>

      <p className="mt-5 flex items-center justify-center gap-2 text-body-sm text-text-secondary">
        <Clock className="size-4 shrink-0" aria-hidden="true" />
        El código se renueva automáticamente en{" "}
        <span className="pc-numeric font-semibold text-text-primary">{formatRemaining(remaining)}</span>
      </p>

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

/** Link to the demo's admin simulator, for the pairing screens' demo footnote. */
export function SimulatorLink(): React.JSX.Element {
  return (
    <a
      href="/kiosk/simulador-admin"
      target="_blank"
      rel="noreferrer"
      className="font-semibold text-primary underline underline-offset-2 outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      /kiosk/simulador-admin
    </a>
  );
}
