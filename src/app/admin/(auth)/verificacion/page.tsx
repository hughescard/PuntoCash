import type { Metadata } from "next";
import { cookies } from "next/headers";

import { ADMIN_PENDING_COOKIE, existeAccesoPendiente } from "@/features/admin/pending-access";
import { BrandPanel } from "@/components/brand/brand-panel";
import { Logo } from "@/components/brand/logo";
import { AdminVerificationForm, AdminVerificationHeading } from "./admin-verification-form";

export const metadata: Metadata = {
  title: "Administración de sede · Verificación en dos pasos",
  description: "Verificación de acceso a la consola de administración de PuntoCash.",
  robots: { index: false, follow: false },
};

/**
 * Acceso a la consola de administración, paso 2 — **FR-AD-ACC-1 a FR-AD-ACC-3**.
 *
 * El trámite es el mismo que en Worker y el formulario también lo es
 * (`@/components/patterns/two-factor-form`). Sigue fuera del shell: aquí
 * todavía no hay sesión, así que no puede aparecer ni el nombre de la persona,
 * ni su operador, ni ninguna sede (**FR-AD-SHELL-1**, FR-SHELL-3).
 *
 * ── Lo que esta pantalla sí decide en el servidor ─────────────────────────
 * Si **no hay reto pendiente**. Es el caso de llegar por enlace directo o de
 * recargar, y el servidor lo sabe: el reto lo emitió él y guardó su
 * identificador en una cookie `httpOnly`. Decirlo desde aquí evita el
 * fotograma en blanco que se llevaba el formulario entero hasta hidratar —la
 * misma lección que el vínculo de equipos (FR-DEV-1.1)—.
 *
 * Lo que **no** se decide aquí es lo contrario: que haya cookie no basta para
 * pintar el formulario, porque el reto que la pantalla anima (cuenta atrás,
 * intentos, reenvío) vive en el navegador. Así que con cookie se sigue
 * esperando a hidratar, y la decisión del servidor solo se usa en la dirección
 * en la que es cierta.
 */
export default async function AdminVerificationPage() {
  const store = await cookies();
  const sinReto = !existeAccesoPendiente(store.get(ADMIN_PENDING_COOKIE)?.value);

  return (
    <main className="grid min-h-screen grid-cols-1 lg:grid-cols-[55fr_45fr]">
      <BrandPanel
        className="hidden lg:flex"
        highlight="Un paso más"
        headline="para proteger tus sedes."
        supporting="Verificación en dos pasos · PuntoCash"
      />

      <div className="flex min-h-screen flex-col bg-surface px-5 py-10 sm:px-8">
        <div className="mb-10 flex justify-center lg:hidden">
          <Logo size="md" showDescriptor />
        </div>

        <div className="m-auto w-full max-w-[28rem]">
          <AdminVerificationHeading />
          <AdminVerificationForm servidorSinReto={sinReto} />
        </div>

        <div className="mx-auto w-full max-w-[28rem] border-t border-border pt-6 text-center">
          <p className="text-caption text-text-secondary">PuntoCash · Sistema interno</p>
        </div>
      </div>
    </main>
  );
}
