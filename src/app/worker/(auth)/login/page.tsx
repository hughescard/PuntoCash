import type { Metadata } from "next";

import { BrandPanel } from "@/components/brand/brand-panel";
import { Logo } from "@/components/brand/logo";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Iniciar sesión",
  description: "Acceso para trabajadores de PuntoCash.",
  robots: { index: false, follow: false },
};

/**
 * Worker login — manual §7 "Worker", §10 and §14.
 *
 * Full-screen split: the navy brand panel carries the institutional presence,
 * the light panel carries the work. Only one primary action exists on the
 * screen (§9 "Jerarquía"), and PuntoCash is the only brand shown — no operator
 * company, sede or caja appears before authentication.
 */
export default function WorkerLoginPage() {
  return (
    <main className="grid min-h-screen grid-cols-1 lg:grid-cols-[55fr_45fr]">
      <BrandPanel
        className="hidden lg:flex"
        highlight="Tu punto"
        headline="para operar con seguridad."
        supporting="Plataforma operativa PuntoCash"
      />

      <div className="flex min-h-screen flex-col bg-surface px-8 py-10">
        {/* Below the split breakpoint the brand panel is hidden, so the mark
            still needs to appear on the working surface. */}
        <div className="mb-10 flex justify-center lg:hidden">
          <Logo size="md" showDescriptor />
        </div>

        {/* 448px — upper end of the 420-460px band, giving the form a little
            more presence without a container around it. */}
        <div className="m-auto w-full max-w-[28rem]">
          <header className="mb-10 text-center">
            <h1 className="text-screen-title text-text-primary">Bienvenido</h1>
            <p className="mx-auto mt-3 max-w-[22rem] text-body text-text-secondary">
              Accede a tu cuenta de PuntoCash para comenzar tu jornada.
            </p>
          </header>

          <LoginForm />
        </div>

        <div className="mx-auto w-full max-w-[28rem] border-t border-border pt-6 text-center">
          <p className="text-caption text-text-secondary">PuntoCash · Sistema interno</p>
        </div>
      </div>
    </main>
  );
}
