"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Alert, Button, Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { useVistaDeCaja } from "@/features/worker/caja-context";
import { hayCierreForzadoAction, verCierreForzadoAction } from "@/app/worker/_actions";

/** Cada cuánto pregunta la pantalla si la administración cerró la jornada. */
const CADA_MS = 5_000;

/**
 * **Cierre forzado visto por el trabajador** (bloque 5, decisión del 9/11/2026).
 *
 * Cuando la administración fuerza el cierre de la jornada de quien está
 * operando, se le dice **al momento**, aunque esté en mitad de una operación:
 * cuándo, quién y por qué. La ventana no se cierra sola ni con Escape; se lee y
 * se pulsa «Entendido». Desde que se cierra la jornada no puede registrar nada,
 * y lo que tenía a medias no se guardó.
 *
 * Mientras tiene la jornada abierta, la pantalla pregunta al servidor cada
 * pocos segundos, sin escribir nada; en cuanto la respuesta es que la cerraron,
 * se vuelve a pedir la foto de la caja y la ventana aparece.
 */
export function AvisoDeCierreForzado(): React.JSX.Element | null {
  const v = useVistaDeCaja();
  const router = useRouter();
  const [enviando, setEnviando] = React.useState(false);
  const vigilando = v.jornada?.propia === true;

  React.useEffect(() => {
    if (!vigilando) return;
    let viva = true;
    const mirar = async () => {
      if (document.visibilityState === "hidden") return;
      const cerrada = await hayCierreForzadoAction().catch(() => false);
      if (viva && cerrada) router.refresh();
    };
    const t = setInterval(() => void mirar(), CADA_MS);
    document.addEventListener("visibilitychange", mirar);
    return () => {
      viva = false;
      clearInterval(t);
      document.removeEventListener("visibilitychange", mirar);
    };
  }, [vigilando, router]);

  const f = v.cierreForzadoPropio;
  if (!f) return null;

  async function entendido() {
    setEnviando(true);
    await verCierreForzadoAction();
    setEnviando(false);
    router.push("/worker/caja");
  }

  return (
    <Dialog open onOpenChange={() => undefined}>
      <DialogContent
        hideClose
        size="md"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>El administrador cerró tu jornada</DialogTitle>
          <DialogDescription>
            {f.por} forzó el cierre de tu jornada en {v.caja.nombre} el {formatDateTime(new Date(f.at))}.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-4">
          <div>
            <p className="text-label text-text-secondary">Motivo</p>
            <p className="text-body text-text-primary">{f.motivo}</p>
          </div>
          <Alert variant="warning" title="Ya no puedes registrar operaciones">
            Lo que tenías a medias no se guardó. El efectivo no se contó al cerrar: quien abra la próxima jornada, tú u otra persona,
            hará el primer conteo.
          </Alert>
        </DialogBody>
        <DialogFooter>
          <Button type="button" loading={enviando} onClick={() => void entendido()}>
            Entendido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
