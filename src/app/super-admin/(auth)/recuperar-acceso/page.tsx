import type { Metadata } from "next";

import { BrandPanel } from "@/components/brand/brand-panel";
import { Logo } from "@/components/brand/logo";
import { SuperAdminRecuperarAccesoFlow } from "./recuperar-acceso-flow";

export const metadata: Metadata = {
  title: "Administración de la red · Recuperar acceso",
  description: "Recuperación de contraseña de la consola de administración de la red PuntoCash.",
  robots: { index: false, follow: false },
};

/**
 * «¿Olvidaste tu contraseña?» de la consola de PuntoCash. El mismo flujo que
 * Worker y Admin de sede; al terminar se vuelve al acceso con sus dos pasos [R13].
 */
export default function SuperAdminRecuperarAccesoPage() {
  return (
    <main className="grid min-h-screen grid-cols-1 lg:grid-cols-[55fr_45fr]">
      <BrandPanel
        className="hidden lg:flex"
        highlight="Recupera tu acceso"
        headline="y vuelve a tu consola."
        supporting="Administración de la red · PuntoCash"
      />

      <div className="flex min-h-screen flex-col bg-surface px-5 py-10 sm:px-8">
        <div className="mb-10 flex justify-center lg:hidden">
          <Logo size="md" showDescriptor />
        </div>

        <div className="m-auto w-full max-w-[28rem]">
          <SuperAdminRecuperarAccesoFlow />
        </div>

        <div className="mx-auto w-full max-w-[28rem] border-t border-border pt-6 text-center">
          <p className="text-caption text-text-secondary">PuntoCash · Sistema interno</p>
        </div>
      </div>
    </main>
  );
}
