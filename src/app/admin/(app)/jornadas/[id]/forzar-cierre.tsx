"use client";

import * as React from "react";
import { Lock } from "lucide-react";

import {
  Alert,
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  fieldAria,
  type FieldSpec,
} from "@/components/ui";
import { forzarCierreAction, type ResultadoForzar } from "../_actions";

const MOTIVO: FieldSpec = { id: "forzar-motivo", label: "Motivo", required: true };

/**
 * Forzar cierre — **FR-AD-JOR-7** a **FR-AD-JOR-13**. Antes de confirmar dice,
 * sin jerga, qué pasa: la caja queda cerrada, se cierra sin contar el efectivo, queda a
 * nombre de quien lo hace. Y si el trabajador está operando ahora en esa caja,
 * lo nombra (decisión del 16/10/2026): se permite, pero no a ciegas.
 */
export function ForzarCierre({
  id,
  caja,
  trabajador,
  sesionActiva,
  equipo,
  motivoMin,
}: {
  id: string;
  caja: string;
  trabajador: string;
  sesionActiva: boolean;
  equipo: string | null;
  motivoMin: number;
}): React.JSX.Element {
  const [abierto, setAbierto] = React.useState(false);
  const [estado, accion, enviando] = React.useActionState<ResultadoForzar, FormData>(forzarCierreAction, null);
  const [motivo, setMotivo] = React.useState("");
  const corto = motivo.trim().length < motivoMin;
  const error = estado && !estado.ok ? estado.error : undefined;
  const spec: FieldSpec = { ...MOTIVO, error, description: `Al menos ${motivoMin} caracteres.` };

  return (
    <>
      <Button variant="destructive" onClick={() => setAbierto(true)}>
        <Lock aria-hidden="true" />
        Forzar cierre
      </Button>
      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Forzar el cierre de la {caja}</DialogTitle>
            {/* FR-AD-JOR-8: si está operando ahora, es lo primero que se dice. */}
            {sesionActiva ? (
              <Alert variant="warning" title={`${trabajador} está operando ahora en esta caja`} className="mt-2">
                Al cerrar, no podrá registrar más operaciones en ella.
              </Alert>
            ) : null}
            <DialogDescription>
              La caja queda cerrada y {trabajador} no podrá seguir operando en ella hasta que abra
              una jornada nueva. El cierre queda marcado como forzado, a tu nombre.
            </DialogDescription>
          </DialogHeader>
          <form action={accion}>
            <input type="hidden" name="id" value={id} />
            <DialogBody className="flex flex-col gap-4">
              <Alert variant="info" title="Se cierra sin contar">
                Esta jornada se cerrará sin contar el efectivo. El primer conteo será el de
                quien abra la próxima jornada en esta caja.
              </Alert>
              {equipo ? (
                <p className="text-body-sm text-text-secondary">
                  El equipo {equipo} sigue vinculado a la caja.
                </p>
              ) : null}
              <Field {...spec}>
                <textarea
                  {...fieldAria(spec)}
                  name="motivo"
                  rows={3}
                  maxLength={250}
                  value={motivo}
                  disabled={enviando}
                  onChange={(e) => setMotivo(e.target.value)}
                  className="w-full rounded-control border border-border bg-surface px-4 py-3 text-body text-text-primary outline-none hover:border-border-strong focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:bg-surface-subtle"
                />
              </Field>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setAbierto(false)} disabled={enviando}>
                Cancelar
              </Button>
              <Button type="submit" variant="destructive" loading={enviando} disabled={corto}>
                <Lock aria-hidden="true" />
                Cerrar sin contar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
