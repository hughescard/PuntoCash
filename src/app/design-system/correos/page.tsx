import * as React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui";
import { Logo } from "@/components/brand/logo";
import { buildVerificationCodeEmail } from "@/features/auth/emails/verification-code-email";

export const metadata: Metadata = {
  title: "Correos",
  description: "Previsualización interna de los correos transaccionales de PuntoCash.",
  robots: { index: false, follow: false },
};

/**
 * Ruta interna de desarrollo — previsualización de correos.
 *
 * Un correo no puede revisarse en la aplicación: es un documento que otro
 * programa reescribe. Esta ruta representa la salida real de la plantilla
 * dentro de un `iframe` con su propio documento, sin que los estilos de la
 * aplicación entren, que es lo más cerca que se puede estar de un cliente de
 * correo sin abrir uno. No forma parte de ningún producto — ver
 * `src/app/ARCHITECTURE.md`.
 *
 * Los dos anchos son los dos casos que importan: 600px, el ancho de diseño, y
 * 360px, donde el trabajador lo leerá de verdad — en el teléfono, de pie
 * detrás del mostrador.
 *
 * Para una revisión de verdad antes de dar por bueno un cambio, hay que
 * enviarlo y verlo en Gmail, Outlook y Mail de iOS, con imágenes bloqueadas
 * (ver `src/features/auth/emails/README.md`).
 */

/** Datos de ejemplo. El código fijo es de muestra, no el del reto vivo. */
const SAMPLE = {
  workerName: "Juan Pérez",
  code: "482913",
  expiresInMinutes: 5,
  requestedAt: new Date("2026-09-22T13:42:00-04:00"),
  timeZone: "America/Havana",
} as const;

export default function EmailPreviewPage() {
  const email = buildVerificationCodeEmail({ ...SAMPLE });

  return (
    <main className="min-h-screen bg-canvas px-8 py-10">
      <div className="mx-auto flex w-full max-w-[75rem] flex-col gap-8">
        <header className="flex flex-col gap-6 border-b border-border pb-8">
          <div className="flex items-center justify-between gap-6">
            <Logo size="md" showDescriptor />
            <Button variant="tertiary" size="sm" asChild>
              <Link href="/design-system">
                <ArrowLeft aria-hidden="true" />
                Sistema de diseño
              </Link>
            </Button>
          </div>

          <div>
            <p className="text-overline uppercase text-text-secondary">
              Previsualización interna · no es una pantalla del producto
            </p>
            <h1 className="mt-2 text-screen-title text-text-primary">
              Código de verificación (2FA)
            </h1>
            <p className="mt-3 max-w-[46rem] text-body text-text-secondary">
              Salida de <code className="text-body-sm">buildVerificationCodeEmail()</code> con datos
              de ejemplo. Nada se envía desde aquí: el envío es del backend.
            </p>
          </div>

          <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-[8rem_1fr]">
            <dt className="text-caption text-text-secondary">Asunto</dt>
            <dd className="text-body font-medium text-text-primary">{email.subject}</dd>
            <dt className="text-caption text-text-secondary">Pre-encabezado</dt>
            <dd className="text-body text-text-primary">{email.preheader}</dd>
          </dl>
        </header>

        <section className="flex flex-col gap-8 wide:flex-row wide:items-start">
          <Frame title="Escritorio — 600px" width={600} html={email.html} />
          <Frame title="Móvil — 360px" width={360} html={email.html} />
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-section-title text-text-primary">Versión en texto plano</h2>
          <p className="max-w-[46rem] text-body-sm text-text-secondary">
            Se envía siempre junto al HTML, en{" "}
            <code className="text-body-sm">multipart/alternative</code>: un cliente que bloquea
            HTML debe seguir mostrando el código legible.
          </p>
          <pre className="overflow-x-auto rounded-card border border-border bg-surface p-6 text-body-sm whitespace-pre-wrap text-text-primary">
            {email.text}
          </pre>
        </section>
      </div>
    </main>
  );
}

function Frame({
  title,
  width,
  html,
}: {
  title: string;
  width: number;
  html: string;
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-card-title text-text-primary">{title}</h2>
      {/* `srcDoc` hace que el documento del correo se represente aislado: ni
          `globals.css` ni los tokens de la aplicación lo alcanzan, así que lo
          que se ve es exactamente lo que lleva la plantilla. */}
      <iframe
        title={title}
        srcDoc={html}
        style={{ width, height: 1180 }}
        className="rounded-card border border-border bg-white"
      />
    </div>
  );
}
