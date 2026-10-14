import * as React from "react";
import { redirect } from "next/navigation";

import { Alert } from "@/components/ui";
import { AppHeader, AppMain, AppShell } from "@/components/shell/app-shell";
import { Logo } from "@/components/brand/logo";
import { getAdminSession } from "@/features/admin/session-server";
import { redEnAlcance } from "@/features/network/scoped-reads";
import { AdminIdentity, AdminScopeBar } from "./admin-identity";
import { AdminMobileNav } from "./admin-mobile-nav";
import { AdminSidebar } from "./admin-sidebar";
import type { AdminNavBadges } from "./admin-nav";

/**
 * Shell de la consola de administración — **FR-AD-SHELL-1**, manual §10.
 *
 *   Escritorio  Header 72px · Sidebar 240px en tres bloques · Área con 32px
 *   Teléfono    Header + franja de alcance · barra inferior · área con 20px
 *
 * **La sesión se resuelve aquí, en el servidor, antes de representar nada.**
 * Es deliberado y es la lección del vínculo de equipos aplicada desde el
 * principio: una decisión de acceso tomada en el cliente obliga a no
 * renderizar en el servidor, y con ello se pierden el primer pintado y los 404
 * de verdad de las rutas inexistentes (FR-DEV-1.1).
 *
 * `getAdminSession` devuelve `null` también cuando el usuario quedó
 * desactivado o su operador fue suspendido con la sesión abierta (**A14**,
 * **FR-AD-ACC-6**), de modo que la comprobación no es solo de entrada.
 *
 * ── Por qué este shell no impone ancho mínimo ────────────────────────────
 * Worker y Kiosco corren en máquinas de una sucursal y conservan el mínimo de
 * 1280px del manual. Esta consola no: se supervisa desde el teléfono a diario
 * (**FR-AD-SHELL-6**), así que pasa `fluid` y la navegación se reparte entre la
 * barra lateral —de `lg` para arriba— y la barra inferior con su cajón, por
 * debajo. Las dos leen los mismos destinos de `admin-nav.ts`.
 *
 * El grupo `(auth)` de al lado no hereda esto a propósito: el acceso ocurre
 * antes de que exista sesión, y hasta entonces no puede aparecer en pantalla
 * ni una persona, ni un operador, ni una sede.
 */
export default async function AdminAppLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  /* La red acotada al alcance de esta sesión. El shell no lee el dominio por
     identificador: lo lee a través de la vista, que es lo que hace que una
     sede ajena no pueda contarse ni aquí ni en ninguna pantalla
     (`features/network/scoped-reads.ts`). */
  const red = redEnAlcance(session.scope);

  /* Indicador de Cajas (**FR-AD-SHELL-3**): «cuando haya cajas sin equipo
     vinculado **o** sedes sin ninguna caja». Cuenta lo que impide operar, que
     son las dos cosas. */
  const sedesSinCaja = session.sedes.filter((sede) => red.cajasActivas(sede.id).length === 0).length;
  /* La segunda mitad faltaba porque el dominio no conocía los equipos de toda
     la red; dejó de ser cierto en el Paso 2. La pantalla de Sedes calcula este
     mismo dato, y lo hace con la misma vista. */
  const cajasSinEquipo = session.sedes
    .flatMap((sede) => red.cajasConHistorico(sede.id))
    .filter((caja) => caja.status === "activa" && !red.cajaTieneEquipo(caja.id)).length;
  const pendientesDeCajas = sedesSinCaja + cajasSinEquipo;
  const badges: AdminNavBadges = { cajas: pendientesDeCajas > 0 ? pendientesDeCajas : undefined };

  return (
    <AppShell
      fluid
      header={
        <>
          <AppHeader
            brand={
              <>
                <Logo variant="onDark" size="sm" className="lg:hidden" />
                <Logo variant="onDark" size="md" className="hidden lg:inline-flex" />
              </>
            }
            actions={<AdminIdentity session={session} />}
          />
          {/* En un teléfono el alcance no cabe en la cabecera y baja aquí, a
              todo lo ancho, fuera del área que se desplaza. */}
          <AdminScopeBar session={session} />
        </>
      }
      /* **FR-AD-USR-11**: la sección de Usuarios solo existe para el
         administrador principal, y la decisión se toma **aquí, en el
         servidor**, al armar el menú. Ocultarla en el cliente habría dejado
         el enlace en el HTML que llega al navegador. */
      sidebar={<AdminSidebar badges={badges} verUsuarios={session.user.isPrincipal} />}
      bottomBar={
        <AdminMobileNav
          badges={badges}
          verUsuarios={session.user.isPrincipal}
          fullName={session.user.fullName}
          operatorName={session.operator.name}
        />
      }
    >
      <AppMain>
        {/* La sede elegida dejó de estar asignada con la sesión abierta
            (**FR-AD-SCOPE-6**): «la siguiente navegación vuelve a "Todas mis
            sedes" y avisa». La siguiente navegación puede caer en cualquier
            pantalla, así que el aviso vive aquí y no en Inicio — el alcance
            lo resuelve este shell y el cambio no debe ocurrir en silencio. */}
        {session.scopeDropped ? (
          <Alert variant="warning" title="Ya no administras esa sede" className="mb-8">
            La sede que tenías seleccionada dejó de estar a tu cargo, así que estás viendo de nuevo
            todas tus sedes.
          </Alert>
        ) : null}

        {children}
      </AppMain>
    </AppShell>
  );
}
