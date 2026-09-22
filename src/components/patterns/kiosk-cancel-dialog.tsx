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

/**
 * Shared "leave without finishing" confirmation for every kiosk flow —
 * mirrors the Worker flows' own cancel dialog (§17 "warn before discarding
 * real work"), reused as one component since all four kiosk flows need it
 * with identical wording.
 */
export function KioskCancelDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}): React.JSX.Element {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Salir sin terminar?</DialogTitle>
          <DialogDescription>
            Se descartarán los datos que introdujiste. No se generará ningún código.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <p className="text-body-sm text-text-secondary">
            Puedes volver a empezar cuando quieras desde la pantalla de inicio.
          </p>
        </DialogBody>

        <DialogFooter>
          <Button variant="tertiary" onClick={() => onOpenChange(false)}>
            Seguir aquí
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Sí, salir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
