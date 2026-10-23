"use client";

import * as React from "react";
import { Check, X } from "lucide-react";

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
import { resolverSolicitudAction, type ResultadoResolver } from "../_actions";

const MOTIVO: FieldSpec = { id: "resolver-motivo", label: "Tu motivo", required: true };

/**
 * Aprobar o rechazar — **FR-AD-APR-7** a **FR-AD-APR-10**. Las dos exigen un
 * motivo, que se añade al del trabajador sin tocarlo, y el diálogo dice en el
 * punto de decisión lo que resolver no hace: no cambia el saldo de la caja ni
 * el movimiento registrado.
 */
export function Resolver({ id, motivoMin }: { id: string; motivoMin: number }): React.JSX.Element {
  const hydrated = useHydrated();
  const [decision, setDecision] = React.useState<"aprobada" | "rechazada" | null>(null);
  const [estado, accion, enviando] = React.useActionState<ResultadoResolver, FormData>(resolverSolicitudAction, null);
  const [motivo, setMotivo] = React.useState("");
  const corto = motivo.trim().length < motivoMin;
  const error = estado && !estado.ok ? estado.error : undefined;
  const spec: FieldSpec = {
    ...MOTIVO,
    error,
    description: `Se añade al motivo del trabajador, que no cambia. Al menos ${motivoMin} caracteres.`,
  };
  const aprobar = decision === "aprobada";

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button disabled={!hydrated} onClick={() => setDecision("aprobada")}>
          <Check aria-hidden="true" />
          Aprobar
        </Button>
        <Button variant="secondary" disabled={!hydrated} onClick={() => setDecision("rechazada")}>
          <X aria-hidden="true" />
          Rechazar
        </Button>
      </div>

      <Dialog open={decision !== null} onOpenChange={(abierto) => (abierto ? undefined : setDecision(null))}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>{aprobar ? "Aprobar la solicitud" : "Rechazar la solicitud"}</DialogTitle>
            <DialogDescription>
              {aprobar
                ? "Dejas constancia de que la administración asume esta diferencia."
                : "Dejas constancia de que la administración no asume esta diferencia, y queda marcada para revisarla fuera del sistema."}
            </DialogDescription>
          </DialogHeader>
          <form action={accion}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="decision" value={decision ?? "aprobada"} />
            <DialogBody className="flex flex-col gap-4">
              {/* FR-AD-APR-10: el límite, en el punto de decisión. */}
              <Alert variant="info" title="Resolver no cambia la caja">
                Resolver esta solicitud deja constancia de tu decisión. No modifica el saldo de la caja ni el
                movimiento registrado.
              </Alert>
              <Field {...spec}>
                <textarea
                  {...fieldAria(spec)}
                  name="motivo"
                  rows={3}
                  maxLength={250}
                  value={motivo}
                  disabled={enviando}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder={aprobar ? "Revisado con el trabajador; el conteo es correcto" : "No se justifica el faltante; se revisa con contabilidad"}
                  className="w-full rounded-control border border-border bg-surface px-4 py-3 text-body text-text-primary outline-none hover:border-border-strong focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:bg-surface-subtle"
                />
              </Field>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setDecision(null)} disabled={enviando}>
                Cancelar
              </Button>
              <Button type="submit" variant={aprobar ? "primary" : "destructive"} loading={enviando} disabled={corto}>
                {aprobar ? <Check aria-hidden="true" /> : <X aria-hidden="true" />}
                {aprobar ? "Aprobar" : "Rechazar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
