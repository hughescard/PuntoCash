import type { Metadata } from "next";

import { Logo } from "@/components/brand/logo";
import { capturaParaElMovil } from "@/features/network/fotos-del-carne";
import { CapturaMovil, EnlaceInservibleView } from "./captura-movil";

export const metadata: Metadata = { title: "Foto del carné" };

/* Cada visita lee la captura de nuevo: puede haber vencido o haberse usado. */
export const dynamic = "force-dynamic";

/**
 * Lo que abre el móvil del trabajador al escanear el QR de la caja: hacer las
 * dos fotos del carné de quien cobra (`features/network/fotos-del-carne.ts`).
 * Sin sesión y sin menú: una sola tarea, pensada para el teléfono.
 */
export default async function FotoDelCarnePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const captura = capturaParaElMovil(id);

  return (
    <div className="flex min-h-dvh flex-col bg-surface-subtle">
      <header className="bg-primary px-5 py-4">
        <Logo variant="onDark" size="sm" />
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-5 py-6">
        {captura.ok ? <CapturaMovil id={id} captura={captura.value} /> : <EnlaceInservibleView motivo={captura.reason} />}
      </main>
    </div>
  );
}
