import type { Metadata } from "next";

import { BrandPanel } from "@/components/brand/brand-panel";
import { Logo } from "@/components/brand/logo";
import { RecuperarAccesoFlow } from "./recuperar-acceso-flow";

export const metadata: Metadata = {
  title: "Recuperar acceso",
  description: "Recuperación de acceso para trabajadores de PuntoCash.",
  robots: { index: false, follow: false },
};

/**
 * «¿Olvidaste tu contraseña?» — el destino del enlace del inicio de sesión.
 *
 * Comparte armazón exacto con el inicio de sesión y con la verificación —el
 * mismo reparto 55/45, el mismo panel navy, la misma columna de 448px— porque
 * los tres son momentos del mismo trámite y cambiar el marco entre ellos se
 * leería como haber salido del producto.
 *
 * Fuera del shell (FR-SHELL-3): aquí no hay sesión, así que no puede aparecer
 * ni el nombre del trabajador, ni su caja, ni la sede. Y al terminar **tampoco
 * la habrá**: se vuelve al inicio de sesión con sus dos pasos **[R13]**.
 */
export default function WorkerRecuperarAccesoPage() {
  return (
    <main className="grid min-h-screen grid-cols-1 lg:grid-cols-[55fr_45fr]">
      <BrandPanel
        className="hidden lg:flex"
        highlight="Recupera tu acceso"
        headline="y vuelve a tu caja."
        supporting="Acceso de trabajadores · PuntoCash"
      />

      <div className="flex min-h-screen flex-col bg-surface px-8 py-10">
        {/* Por debajo del punto de ruptura el panel de marca se oculta, así que
            la marca sigue necesitando aparecer en la superficie de trabajo. */}
        <div className="mb-10 flex justify-center lg:hidden">
          <Logo size="md" showDescriptor />
        </div>

        <div className="m-auto w-full max-w-[28rem]">
          {/* El encabezado lo pone el propio flujo, porque cambia con el paso
              (`recuperar-acceso-flow.tsx`). */}
          <RecuperarAccesoFlow />
        </div>

        <div className="mx-auto w-full max-w-[28rem] border-t border-border pt-6 text-center">
          <p className="text-caption text-text-secondary">PuntoCash · Sistema interno</p>
        </div>
      </div>
    </main>
  );
}
