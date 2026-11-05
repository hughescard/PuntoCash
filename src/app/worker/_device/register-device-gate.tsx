"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui";
import { Logo } from "@/components/brand/logo";
import { DevicePairingPanel } from "@/components/patterns/device-pairing-panel";
import { consultarEquipo, prepararEquipo, usarEquipoDeDemostracion, type EstadoDeEquipo } from "../_actions";

/**
 * Elige entre la pantalla de vinculación y la aplicación (Worker FRD §2.1,
 * FR-DEV-1.1). **Lo decide el servidor**: el layout pregunta a la red si este
 * equipo está vinculado como caja y pasa la respuesta.
 *
 * `children` se representa siempre en el servidor, aunque aquí no se muestre:
 * es lo que mantiene que una ruta inexistente responda 404 de verdad.
 */
export function RegisterDeviceGate({
  linked,
  equiposDemo,
  children,
}: {
  linked: boolean;
  equiposDemo: readonly { id: string; label: string; sede: string }[];
  children: React.ReactNode;
}): React.JSX.Element {
  if (linked) return <>{children}</>;
  return <RegisterPairingScreen equiposDemo={equiposDemo} />;
}

/** Cada cuánto pregunta el equipo si ya lo vincularon. */
const SONDEO_MS = 3_000;

/**
 * A pantalla completa y fuera del shell (FR-SHELL-3): hasta que el equipo no
 * es una caja no hay sede, ni caja, ni trabajador que mostrar.
 *
 * El reto lo emite el servidor, y es el mismo que encuentra el administrador
 * en `/admin/equipos/vincular`. Mientras tanto, el equipo pregunta cada pocos
 * segundos si ya lo vincularon y, en cuanto sí, entra al inicio de sesión.
 */
export function RegisterPairingScreen({
  equiposDemo,
}: {
  equiposDemo: readonly { id: string; label: string; sede: string }[];
}): React.JSX.Element {
  const router = useRouter();
  const [estado, setEstado] = React.useState<EstadoDeEquipo | null>(null);

  const renovar = React.useCallback(() => {
    void prepararEquipo().then((e) => {
      if (e.vinculado) router.refresh();
      else setEstado(e);
    });
  }, [router]);

  React.useEffect(() => {
    renovar();
  }, [renovar]);

  React.useEffect(() => {
    const id = setInterval(() => {
      void consultarEquipo().then((vinculado) => {
        if (vinculado) router.refresh();
      });
    }, SONDEO_MS);
    return () => clearInterval(id);
  }, [router]);

  const device =
    estado && !estado.vinculado
      ? { status: "unlinked" as const, deviceId: estado.deviceId, pairing: { code: estado.codigo, expiresAt: estado.expiresAt } }
      : null;

  return (
    <main className="flex min-h-screen flex-col bg-canvas px-8 py-10">
      <div className="flex justify-center">
        <Logo size="md" showDescriptor />
      </div>

      <div className="mx-auto mt-10 flex w-full max-w-4xl flex-col items-center text-center">
        <p className="text-overline uppercase text-text-secondary">PuntoCash · Worker</p>
        <h1 className="mt-3 text-screen-title text-text-primary">Vincula este equipo como caja</h1>
        <p className="mt-3 max-w-2xl text-body text-text-secondary">
          Este equipo todavía no es la caja de ninguna sede. El administrador de la sede debe vincularlo desde
          su panel web, en <span className="font-semibold text-text-primary">Equipos</span>, eligiendo la sede y
          la caja. Se hace una sola vez: después, cada trabajador inicia sesión con su propia cuenta.
        </p>

        {device ? (
          <DevicePairingPanel
            className="mt-8 w-full"
            device={device}
            qrPayload={`puntocash:caja-link:v1:${device.deviceId}:${device.pairing.code}`}
            onExpired={renovar}
            demoNote={
              <>
                Versión de demostración: el QR es ilustrativo y no se puede escanear. Para vincular, entra en
                la consola de administración de la sede y teclea el código en Equipos → Vincular equipo.
              </>
            }
          />
        ) : null}

        {equiposDemo.length > 0 ? (
          <section aria-labelledby="equipos-demo" className="mt-8 w-full rounded-card border border-dashed border-border p-6 text-left">
            <h2 id="equipos-demo" className="text-label font-semibold text-text-primary">
              Demostración · usar un equipo ya vinculado
            </h2>
            <p className="mt-1 text-body-sm text-text-secondary">
              En la demostración, este navegador puede hacerse pasar por uno de los equipos de caja que las sedes ya
              tienen vinculados. En el producto, el equipo es la máquina del mostrador y no se elige.
            </p>
            <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {equiposDemo.map((e) => (
                <li key={e.id}>
                  <Button
                    variant="secondary"
                    className="w-full justify-start"
                    onClick={() => void usarEquipoDeDemostracion(e.id)}
                  >
                    {e.label}
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </main>
  );
}
