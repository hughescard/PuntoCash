import * as React from "react";
import Link from "next/link";
import { Home, MapPin } from "lucide-react";

import { AppHeader, AppMain, AppShell } from "@/components/shell/app-shell";
import { Logo } from "@/components/brand/logo";
import { KioskSedeProvider } from "@/components/patterns/kiosk-request-ticket";
import { TERMINALS } from "@/features/network/devices";
import { findSedeById } from "@/features/network/sedes";
import { getKiosco, huellaDeKiosco } from "@/features/kiosk/sesion-servidor";
import { KioskWatcher } from "./kiosk-device-gate";
import { KioskPairingScreen } from "./kiosk-pairing-screen";

/**
 * Self-service kiosk shell — manual §10 structure, §21 "Kiosco inteligente"
 * pattern: header only, no sidebar, larger controls, guided navigation.
 *
 * El kiosco tiene sesión de equipo, no de persona. **Qué pinta lo decide el
 * servidor**, preguntando a la red con el identificador que guarda la cookie
 * del equipo —el mismo registro en el que el administrador lo vinculó desde
 * `/admin/equipos/vincular`—:
 *
 *   · sin vincular → la pantalla de vinculación, sin cabecera de sede;
 *   · vinculado a una sede que no opera → «no disponible», con la sede;
 *   · operando → el catálogo y los flujos, con la sede y «Inicio».
 *
 * `KioskWatcher` vuelve a preguntar cada pocos segundos y repinta si algo de
 * eso cambió.
 */
export default async function KioskAutoservicioLayout({ children }: { children: React.ReactNode }) {
  const kiosco = await getKiosco();
  const huella = huellaDeKiosco(kiosco);

  let contenido: React.ReactNode;
  if (kiosco.estado === "sin-vincular") {
    /* Solo en la demostración: los kioscos que la red ya tiene, para que este
       navegador pueda ser uno de ellos. */
    const kioscosDemo = TERMINALS.filter((t) => t.kind === "kiosco").map((t) => ({
      id: t.id,
      label: t.label,
      sede: findSedeById(t.branchId)?.name ?? "",
    }));
    contenido = <KioskPairingScreen desvinculadoDe={kiosco.desvinculadoDe} kioscosDemo={kioscosDemo} />;
  } else if (kiosco.estado === "sede-sin-operar") {
    contenido = <KioskNoDisponible />;
  } else {
    contenido = <KioskSedeProvider sede={kiosco.sede.name}>{children}</KioskSedeProvider>;
  }

  return (
    <AppShell
      header={
        <AppHeader
          brand={<Logo variant="onDark" size="md" showDescriptor />}
          actions={
            kiosco.estado === "sin-vincular" ? null : (
              <KioskHeaderActions sede={kiosco.sede.name} conInicio={kiosco.estado === "operando"} />
            )
          }
        />
      }
    >
      <AppMain>
        {contenido}
        <KioskWatcher huella={huella} />
      </AppMain>
    </AppShell>
  );
}

/**
 * La sede a la que pertenece el kiosco —para que el cliente sepa en qué cajas
 * le atenderán el código— y el «Inicio» permanente.
 */
function KioskHeaderActions({ sede, conInicio }: { sede: string; conInicio: boolean }): React.JSX.Element {
  return (
    <>
      <span className="inline-flex items-center gap-2 px-2 text-label text-text-on-primary-muted">
        <MapPin className="size-[18px] text-gold" aria-hidden="true" />
        <span className="font-semibold text-white">{sede}</span>
      </span>
      {conInicio ? (
        <>
          <span aria-hidden="true" className="h-6 w-px bg-white/15" />
          <Link
            href="/kiosk/autoservicio"
            className="inline-flex h-control items-center gap-2 rounded-control px-4 text-label font-semibold text-white transition-colors duration-(--duration-fast) ease-(--ease-standard) hover:bg-white/[0.08] outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            <Home className="size-[18px]" aria-hidden="true" />
            Inicio
          </Link>
        </>
      ) : null}
    </>
  );
}

/**
 * Un kiosco vinculado a una sede que no está operando —suspendida, cerrada,
 * sin mercante o con el mercante suspendido— no prepara solicitudes: nadie
 * podría atenderlas. No se dice por qué, porque eso no es asunto del cliente.
 */
function KioskNoDisponible(): React.JSX.Element {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center py-16 text-center">
      <p className="text-overline uppercase text-text-secondary">PuntoCash · Autoservicio</p>
      <h1 className="mt-3 text-screen-title text-text-primary">El autoservicio no está disponible</h1>
      <p className="mt-3 max-w-xl text-body text-text-secondary">
        En este momento no se pueden preparar operaciones desde este kiosco. Consulta al personal de la sucursal.
      </p>
    </div>
  );
}
