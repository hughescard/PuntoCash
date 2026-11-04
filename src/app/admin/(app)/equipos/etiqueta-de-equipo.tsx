"use client";

import * as React from "react";
import { Tag } from "lucide-react";

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
import { useHydrated } from "@/lib/use-hydrated";
import { renombrarEquipoAction, type ResultadoAccion } from "./_actions";

/**
 * Cambiar el rótulo de un equipo — **FR-AD-EQ-30**.
 *
 * El rótulo es lo único de un equipo que esta consola nombra: el identificador
 * lo emite el sistema y el vínculo lo decide la caja a la que se ató. Por eso
 * esto no es una edición del equipo, sino de cómo se le llama, y el diálogo lo
 * dice: el número no cambia.
 *
 * Lo comparten las dos pestañas, cajas y kioscos, porque es el mismo acto
 * sobre la misma cosa.
 */

const ETIQUETA: FieldSpec = {
  id: "renombrar-etiqueta",
  label: "Etiqueta",
  description: "Es el nombre con el que verás este equipo en los listados.",
  required: true,
};

export interface EquipoRenombrable {
  id: string;
  label: string;
}

/** El botón de la fila. Abre un diálogo, así que espera a la hidratación. */
export function BotonEditarEtiqueta({
  equipo,
  onElegir,
}: {
  equipo: EquipoRenombrable;
  onElegir: (equipo: EquipoRenombrable) => void;
}): React.JSX.Element {
  const hydrated = useHydrated();

  return (
    <Button variant="tertiary" size="sm" disabled={!hydrated} onClick={() => onElegir(equipo)}>
      <Tag aria-hidden="true" />
      Editar etiqueta
    </Button>
  );
}

export function DialogoEtiqueta({
  equipo,
  onCerrar,
}: {
  equipo: EquipoRenombrable;
  onCerrar: () => void;
}): React.JSX.Element {
  const [estado, accion, enviando] = React.useActionState<ResultadoAccion, FormData>(
    renombrarEquipoAction,
    null,
  );
  const [etiqueta, setEtiqueta] = React.useState(equipo.label);
  const hecho = estado?.ok === true;
  const vacia = etiqueta.trim().length === 0;

  return (
    <Dialog open onOpenChange={(abierto) => (abierto ? undefined : onCerrar())}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Editar la etiqueta de {equipo.id}</DialogTitle>
          <DialogDescription>
            Es el nombre con el que verás este equipo en los listados. El número del equipo no
            cambia, ni la caja a la que está vinculado.
          </DialogDescription>
        </DialogHeader>

        {hecho ? (
          <>
            <DialogBody>
              <Alert variant="success" title="Etiqueta actualizada">
                {estado.mensaje}
              </Alert>
            </DialogBody>
            <DialogFooter>
              <Button onClick={onCerrar}>Cerrar</Button>
            </DialogFooter>
          </>
        ) : (
          <form action={accion}>
            <input type="hidden" name="equipo" value={equipo.id} />

            <DialogBody className="flex flex-col gap-4">
              {estado && !estado.ok ? (
                <Alert variant="error" title="No se pudo guardar la etiqueta">
                  {estado.error}
                </Alert>
              ) : null}

              <Field {...ETIQUETA}>
                <input
                  {...fieldAria(ETIQUETA)}
                  type="text"
                  name="etiqueta"
                  maxLength={60}
                  value={etiqueta}
                  disabled={enviando}
                  onChange={(event) => setEtiqueta(event.target.value)}
                  className="h-control w-full rounded-control border border-border bg-surface px-4 text-body text-text-primary outline-none hover:border-border-strong focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:bg-surface-subtle"
                />
              </Field>
            </DialogBody>

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={onCerrar} disabled={enviando}>
                Cancelar
              </Button>
              <Button type="submit" loading={enviando} disabled={vacia}>
                Guardar etiqueta
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
