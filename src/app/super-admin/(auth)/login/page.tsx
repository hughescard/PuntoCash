import type { Metadata } from "next";

import { BrandPanel } from "@/components/brand/brand-panel";
import { Logo } from "@/components/brand/logo";
import { SuperAdminLoginForm } from "./super-admin-login-form";

export const metadata: Metadata = {
  title: "Administración de la red · Iniciar sesión",
  description: "Acceso a la consola de administración de la red PuntoCash.",
  robots: { index: false, follow: false },
};

/**
 * Acceso a la consola de PuntoCash, paso 1 (FR-SA-ACC-1 a 3).
 *
 * El mismo armazón que el acceso de Worker y el de Admin de sede: es el mismo
 * trámite y cambiarlo se leería como salir de PuntoCash. Solo cambia el texto
 * de contexto, que nombra la consola.
 */
export default function SuperAdminLoginPage() {
  return (
    <main className="grid min-h-screen grid-cols-1 lg:grid-cols-[55fr_45fr]">
      <BrandPanel
        className="hidden lg:flex"
        highlight="Toda la red"
        headline="a la vista, bajo tus reglas."
        supporting="Administración de la red · PuntoCash"
      />

      <div className="flex min-h-screen flex-col bg-surface px-5 py-10 sm:px-8">
        <div className="mb-10 flex justify-center lg:hidden">
          <Logo size="md" showDescriptor />
        </div>

        <div className="m-auto w-full max-w-[28rem]">
          <header className="mb-10 text-center">
            <p className="text-overline uppercase text-text-secondary">Administración de la red</p>
            <h1 className="mt-3 text-screen-title text-text-primary">Bienvenido</h1>
            <p className="mx-auto mt-3 max-w-[22rem] text-body text-text-secondary">
              Accede con tu cuenta de PuntoCash para gestionar las sedes y los operadores de la red.
            </p>
          </header>

          <SuperAdminLoginForm />
        </div>

        <div className="mx-auto w-full max-w-[28rem] border-t border-border pt-6 text-center">
          <p className="text-caption text-text-secondary">PuntoCash · Sistema interno</p>
        </div>
      </div>
    </main>
  );
}
