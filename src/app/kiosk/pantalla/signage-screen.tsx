"use client";

import * as React from "react";

import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui";
import { clearSignageBranch, setSignageBranch, useSignageBranchId } from "@/features/kiosk/signage-branch";
import { BranchPicker } from "./branch-picker";
import { SignageCarousel } from "./signage-carousel";
import { SlideHeading } from "./slides/slide-tasas";
import { useSedes, type SedePublica } from "./tableros";

/**
 * Keys that mean "back" on the hardware this screen runs on: Esc on a
 * keyboard; Backspace, `GoBack` or `BrowserBack` on the remotes of TV
 * browsers and Android-based signage players.
 */
const BACK_KEYS = new Set(["Escape", "Backspace", "GoBack", "BrowserBack"]);

/** An unanswered confirmation closes itself, so the TV never stays stuck on a dialog. */
const CONFIRM_TIMEOUT_MS = 20_000;

/**
 * `/kiosk/pantalla`: picks between the first-start sede picker and the
 * signage carousel (Pantalla FRD §1.1).
 */
export function SignageScreen(): React.JSX.Element | null {
  const id = useSignageBranchId();
  const sedes = useSedes();

  // Not hydrated yet: render nothing rather than flash the picker on a
  // screen that already has a sede.
  if (id === undefined) return null;
  const sede = id ? sedes.find((s) => s.id === id) : undefined;
  /* La sede que eligió ya no está en la red (cerró): vuelve el selector, y
     dice por qué, para quien la vea en la sala. */
  if (!sede) {
    return (
      <BranchPicker
        aviso={id ? "La sede que mostraba esta pantalla ya no está disponible. Elige otra." : null}
        onSelect={(chosen) => setSignageBranch(chosen.id)}
      />
    );
  }
  return <ConfiguredSignage sede={sede} />;
}

/**
 * The carousel for a configured screen, plus the one way to reconfigure it:
 * Atrás on the remote, Esc on a keyboard, or the browser's own back — then
 * a confirmation, so a stray press never blanks a working screen.
 */
function ConfiguredSignage({ sede }: { sede: SedePublica }): React.JSX.Element {
  const [confirming, setConfirming] = React.useState(false);

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      // While the dialog is open, Esc belongs to the dialog (it cancels).
      if (confirming || !BACK_KEYS.has(event.key)) return;
      event.preventDefault();
      setConfirming(true);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [confirming]);

  React.useEffect(() => {
    // The browser's back button (or a remote that maps to it) would otherwise
    // leave the page. Keep one history entry of our own and turn "back" into
    // the same confirmation.
    window.history.pushState({ pantalla: true }, "");
    function onPopState() {
      window.history.pushState({ pantalla: true }, "");
      setConfirming(true);
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  React.useEffect(() => {
    if (!confirming) return;
    const id = setTimeout(() => setConfirming(false), CONFIRM_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [confirming]);

  return (
    <>
      {sede.atiende ? <SignageCarousel sede={sede} /> : <SedeSinAtender sede={sede} />}

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent size="md" hideClose>
          <DialogHeader className="pr-6">
            <DialogTitle>¿Cambiar la sede de esta pantalla?</DialogTitle>
            <DialogDescription>
              Ahora muestra la información de {sede.name}.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <p className="text-body-sm text-text-secondary">
              Si continúas, volverá la lista de sedes para elegir otra. Si no respondes, la pantalla sigue
              como está.
            </p>
          </DialogBody>
          <DialogFooter>
            <Button variant="tertiary" onClick={() => setConfirming(false)}>
              Seguir mostrando
            </Button>
            <Button
              onClick={() => {
                setConfirming(false);
                clearSignageBranch();
              }}
            >
              Cambiar sede
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Una sede que no está atendiendo —suspendida, sin mercante o con el
 * mercante suspendido— no anuncia tasas ni promociones: nadie podría
 * aplicarlas. La pantalla lo dice, sin explicar el motivo, que no es asunto
 * del cliente, y vuelve sola al carrusel en cuanto la sede atiende (el
 * refresco de los tableros trae el cambio).
 */
function SedeSinAtender({ sede }: { sede: SedePublica }): React.JSX.Element {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center text-center">
      <SlideHeading eyebrow={sede.name} title="En este momento no estamos atendiendo" />
      <p className="mt-[1.25em] max-w-[36em] text-[1.25em] leading-snug text-text-on-primary-muted">
        Disculpa las molestias. Puedes consultar otras sucursales de PuntoCash.
      </p>
    </div>
  );
}
