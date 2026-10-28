import type { Metadata } from "next";
import { cookies } from "next/headers";

import { existeAccesoPendiente } from "@/features/admin/pending-access";
import { SUPER_ADMIN_PENDING_COOKIE } from "@/features/super-admin/session";
import { BrandPanel } from "@/components/brand/brand-panel";
import { Logo } from "@/components/brand/logo";
import { TwoFactorHeading } from "@/components/patterns/two-factor-form";
import { SuperAdminVerificationForm } from "./super-admin-verification-form";

export const metadata: Metadata = {
  title: "Super administración · Verificación en dos pasos",
  description: "Verificación de acceso a la consola de super administración de PuntoCash.",
  robots: { index: false, follow: false },
};

/**
 * Acceso a la consola de PuntoCash, paso 2 [R13]. El formulario es el
 * compartido; el servidor dice aquí si no hay reto pendiente, igual que en
 * Admin de sede.
 */
export default async function SuperAdminVerificationPage() {
  const store = await cookies();
  const sinReto = !existeAccesoPendiente(store.get(SUPER_ADMIN_PENDING_COOKIE)?.value);

  return (
    <main className="grid min-h-screen grid-cols-1 lg:grid-cols-[55fr_45fr]">
      <BrandPanel
        className="hidden lg:flex"
        highlight="Un paso más"
        headline="para proteger la red."
        supporting="Verificación en dos pasos · PuntoCash"
      />

      <div className="flex min-h-screen flex-col bg-surface px-5 py-10 sm:px-8">
        <div className="mb-10 flex justify-center lg:hidden">
          <Logo size="md" showDescriptor />
        </div>

        <div className="m-auto w-full max-w-[28rem]">
          <TwoFactorHeading />
          <SuperAdminVerificationForm servidorSinReto={sinReto} />
        </div>

        <div className="mx-auto w-full max-w-[28rem] border-t border-border pt-6 text-center">
          <p className="text-caption text-text-secondary">PuntoCash · Sistema interno</p>
        </div>
      </div>
    </main>
  );
}
