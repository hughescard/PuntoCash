import type { Metadata } from "next";

import { BrandPanel } from "@/components/brand/brand-panel";
import { Logo } from "@/components/brand/logo";
import { AdminLoginForm } from "./admin-login-form";

export const metadata: Metadata = {
  title: "Administración de sede · Iniciar sesión",
  description: "Acceso a la consola de administración de sede de PuntoCash.",
  robots: { index: false, follow: false },
};

/**
 * Acceso a la consola de administración, paso 1 — manual §10 y §14.
 *
 * Misma estructura exacta que el acceso de Worker: el mismo reparto 55/45, el
 * mismo panel navy, la misma columna de 448px. Son productos distintos pero un
 * mismo trámite, y cambiar el armazón entre ellos se leería como haber salido
 * de PuntoCash.
 *
 * Lo único que cambia es el texto de contexto, que identifica la consola
 * (**FR-AD-ACC-3**). Antes de autenticarse no aparece ningún operador: la
 * marca visible es PuntoCash y nada más (**A9**).
 */
export default function AdminLoginPage() {
  return (
    <main className="grid min-h-screen grid-cols-1 lg:grid-cols-[55fr_45fr]">
      <BrandPanel
        className="hidden lg:flex"
        highlight="Tu sucursal"
        headline="bajo control, en un solo lugar."
        supporting="Administración de sede · PuntoCash"
      />

      <div className="flex min-h-screen flex-col bg-surface px-5 py-10 sm:px-8">
        {/* Por debajo del punto de ruptura el panel de marca se oculta, así que
            la marca sigue necesitando aparecer en la superficie de trabajo. */}
        <div className="mb-10 flex justify-center lg:hidden">
          <Logo size="md" showDescriptor />
        </div>

        <div className="m-auto w-full max-w-[28rem]">
          <header className="mb-10 text-center">
            <p className="text-overline uppercase text-text-secondary">Administración de sede</p>
            <h1 className="mt-3 text-screen-title text-text-primary">Bienvenido</h1>
            <p className="mx-auto mt-3 max-w-[22rem] text-body text-text-secondary">
              Accede con tu cuenta de administrador para gestionar las sedes a tu cargo.
            </p>
          </header>

          <AdminLoginForm />
        </div>

        <div className="mx-auto w-full max-w-[28rem] border-t border-border pt-6 text-center">
          <p className="text-caption text-text-secondary">PuntoCash · Sistema interno</p>
        </div>
      </div>
    </main>
  );
}
