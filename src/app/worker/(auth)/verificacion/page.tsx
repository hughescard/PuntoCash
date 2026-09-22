import type { Metadata } from "next";

import { BrandPanel } from "@/components/brand/brand-panel";
import { Logo } from "@/components/brand/logo";
import { VerificationForm, VerificationHeading } from "./verification-form";

export const metadata: Metadata = {
  title: "Verificación en dos pasos",
  description: "Verificación de acceso para trabajadores de PuntoCash.",
  robots: { index: false, follow: false },
};

/**
 * Verificación en dos pasos del Worker — manual §7 "Worker", §10 y §14.
 *
 * Segundo paso obligatorio del acceso: la contraseña identifica la cuenta, el
 * código confirma a la persona [R13]. Comparte estructura exacta con el inicio
 * de sesión — el mismo reparto 55/45, el mismo panel navy, la misma columna de
 * 448px — porque son dos pasos de un mismo trámite y cambiar el armazón entre
 * ellos se leería como haber salido del producto.
 *
 * Sigue fuera del shell (FR-SHELL-3): aquí todavía no hay sesión, así que no
 * puede aparecer ni el nombre del trabajador, ni su caja, ni la sede.
 */
export default function WorkerVerificationPage() {
  return (
    <main className="grid min-h-screen grid-cols-1 lg:grid-cols-[55fr_45fr]">
      <BrandPanel
        className="hidden lg:flex"
        highlight="Un paso más"
        headline="para proteger tu jornada."
        supporting="Verificación en dos pasos · PuntoCash"
      />

      <div className="flex min-h-screen flex-col bg-surface px-8 py-10">
        {/* Por debajo del punto de ruptura el panel de marca se oculta, así que
            la marca sigue necesitando aparecer en la superficie de trabajo. */}
        <div className="mb-10 flex justify-center lg:hidden">
          <Logo size="md" showDescriptor />
        </div>

        <div className="m-auto w-full max-w-[28rem]">
          <VerificationHeading />
          <VerificationForm />
        </div>

        <div className="mx-auto w-full max-w-[28rem] border-t border-border pt-6 text-center">
          <p className="text-caption text-text-secondary">PuntoCash · Sistema interno</p>
        </div>
      </div>
    </main>
  );
}
