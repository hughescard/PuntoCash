"use client";

import * as React from "react";
import { MinusCircle } from "lucide-react";

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
} from "@/components/ui";
import { retirarPromocionAction, type ResultadoRetirar } from "../_actions";

/**
 * Retirar — **FR-AD-PROM-9**. Efecto inmediato en las pantallas, y no borra:
 * pasa a Vencidas y queda en el histórico. Una programada se retira antes de
 * llegar a verse, y el diálogo lo dice de esa forma.
 */
export function RetirarPromocion({
  id,
  titulo,
  vigente,
  sedes,
}: {
  id: string;
  titulo: string;
  vigente: boolean;
  sedes: readonly string[];
}): React.JSX.Element {
  const [abierto, setAbierto] = React.useState(false);
  const [estado, accion, enviando] = React.useActionState<ResultadoRetirar, FormData>(
    retirarPromocionAction,
    null,
  );

  return (
    <>
      <Button variant="secondary" onClick={() => setAbierto(true)}>
        <MinusCircle aria-hidden="true" />
        Retirar
      </Button>
      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Retirar «{titulo}»</DialogTitle>
            <DialogDescription>
              {vigente
                ? `Deja de verse al instante en la pantalla de ${lista(sedes)}.`
                : "No llegará a verse en ninguna pantalla."}{" "}
              Queda en Vencidas, con la fecha en que se retiró.
            </DialogDescription>
          </DialogHeader>
          <form action={accion}>
            <input type="hidden" name="id" value={id} />
            {estado && !estado.ok ? (
              <DialogBody>
                <Alert variant="error" title="No se pudo retirar">
                  {estado.error}
                </Alert>
              </DialogBody>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setAbierto(false)} disabled={enviando}>
                Cancelar
              </Button>
              <Button type="submit" variant="destructive" loading={enviando}>
                <MinusCircle aria-hidden="true" />
                Retirar la promoción
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function lista(nombres: readonly string[]): string {
  if (nombres.length <= 1) return nombres[0] ?? "sus sedes";
  return `${nombres.slice(0, -1).join(", ")} y ${nombres[nombres.length - 1]}`;
}
