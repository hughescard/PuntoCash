import type { Metadata } from "next";

import { BrandPanel } from "@/components/brand/brand-panel";
import { Logo } from "@/components/brand/logo";
import { AdminRecuperarAccesoFlow } from "./recuperar-acceso-flow";

export const metadata: Metadata = {
  title: "Administración de sede · Recuperar acceso",
  description: "Recuperación de contraseña de la consola de administración de PuntoCash.",
  robots: { index: false, follow: false },
};

/**
 * «¿Olvidaste tu contraseña?» de la consola de administración —
 * **FR-AD-ACC-8**.
 *
 * Mismo armazón que el inicio de sesión y la verificación: el mismo reparto
 * 55/45, el mismo panel navy, la misma columna de 448px. Son momentos de un
 * mismo trámite y cambiar el marco entre ellos se leería como haber salido del
 * producto.
 *
 * Fuera del shell: aquí no hay sesión, así que no aparece ni el nombre de la
 * persona ni el de su empresa (**A9**). Y al terminar **tampoco la habrá**: se
 * vuelve al inicio de sesión con sus dos pasos **[R13]**.
 */
export default function AdminRecuperarAccesoPage() {
  return (
    <main className="grid min-h-screen grid-cols-1 lg:grid-cols-[55fr_45fr]">
      <BrandPanel
        className="hidden lg:flex"
        highlight="Recupera tu acceso"
        headline="y vuelve a tu consola."
        supporting="Administración de sede · PuntoCash"
      />

      <div className="flex min-h-screen flex-col bg-surface px-5 py-10 sm:px-8">
        {/* Por debajo del punto de ruptura el panel de marca se oculta, así que
            la marca sigue necesitando aparecer en la superficie de trabajo. */}
        <div className="mb-10 flex justify-center lg:hidden">
          <Logo size="md" showDescriptor />
        </div>

        <div className="m-auto w-full max-w-[28rem]">
          {/* El encabezado lo pone el propio flujo, porque cambia con el paso. */}
          <AdminRecuperarAccesoFlow />
        </div>

        <div className="mx-auto w-full max-w-[28rem] border-t border-border pt-6 text-center">
          <p className="text-caption text-text-secondary">PuntoCash · Sistema interno</p>
        </div>
      </div>
    </main>
  );
}
