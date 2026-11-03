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
  Field,
  Input,
  fieldAria,
  type FieldSpec,
} from "@/components/ui";
import { enviarSinReiniciar } from "@/lib/enviar-sin-reiniciar";
import { retirarPromocionRedAction, type ResultadoRetirarRed } from "../_actions";

/**
 * Retirar una promoción de red — **FR-SA-PROM-8**. Efecto inmediato en las
 * pantallas de todas las sedes a las que llega, y no borra: pasa a Vencidas y
 * queda en el histórico. Los administradores de sede no pueden hacerlo, así que
 * el diálogo dice a cuántas salas afecta.
 */
export function RetirarPromocionRed({
  id,
  titulo,
  vigente,
  llegaA,
}: {
  id: string;
  titulo: string;
  vigente: boolean;
  /** «toda la red» o «3 sedes». */
  llegaA: string;
}): React.JSX.Element {
  const [abierto, setAbierto] = React.useState(false);
  const MOTIVO: FieldSpec = {
    id: "promocion-red-retiro-motivo",
    label: "Motivo",
    required: true,
    description: "Al menos 10 caracteres. Queda en la auditoría con tu nombre.",
  };
  const [estado, accion, enviando] = React.useActionState<ResultadoRetirarRed, FormData>(retirarPromocionRedAction, null);

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
                ? `Deja de verse al instante en la pantalla de ${llegaA}.`
                : "No llegará a verse en ninguna pantalla."}{" "}
              Ningún administrador de sede podrá volver a ponerla. Queda en Vencidas, con la fecha en que se retiró.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={enviarSinReiniciar(accion)} noValidate>
            <input type="hidden" name="id" value={id} />
            <DialogBody className="flex flex-col gap-4">
              {estado && !estado.ok ? (
                <Alert variant="error" title="No se pudo retirar">
                  {estado.error}
                </Alert>
              ) : null}
              <Field {...MOTIVO}>
                <Input {...fieldAria(MOTIVO)} name="motivo" disabled={enviando} autoFocus />
              </Field>
            </DialogBody>
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
