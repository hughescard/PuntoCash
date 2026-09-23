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
import type { Branch } from "@/features/branches/branches";
import { clearSignageBranch, setSignageBranch, useSignageBranch } from "@/features/kiosk/signage-branch";
import { BranchPicker } from "./branch-picker";
import { SignageCarousel } from "./signage-carousel";

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
  const branch = useSignageBranch();

  // Not hydrated yet: render nothing rather than flash the picker on a
  // screen that already has a sede.
  if (branch === undefined) return null;
  if (branch === null) return <BranchPicker onSelect={(chosen) => setSignageBranch(chosen.id)} />;
  return <ConfiguredSignage branch={branch} />;
}

/**
 * The carousel for a configured screen, plus the one way to reconfigure it:
 * Atrás on the remote, Esc on a keyboard, or the browser's own back — then
 * a confirmation, so a stray press never blanks a working screen.
 */
function ConfiguredSignage({ branch }: { branch: Branch }): React.JSX.Element {
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
      <SignageCarousel branch={branch} />

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent size="md" hideClose>
          <DialogHeader className="pr-6">
            <DialogTitle>¿Cambiar la sede de esta pantalla?</DialogTitle>
            <DialogDescription>
              Ahora muestra la información de {branch.name}.
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
