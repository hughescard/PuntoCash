"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { Pencil, Plus, Trash2 } from "lucide-react";

import {
  Alert,
  Badge,
  Button,
  Card,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  fieldAria,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  type FieldSpec,
} from "@/components/ui";
import { CurrencyFlag } from "@/components/patterns/currency-flag";
import type { TramoDeTarifa } from "@/features/network/tarifas-reglas";
import { useHydrated } from "@/lib/use-hydrated";
import { enviarSinReiniciar } from "@/lib/enviar-sin-reiniciar";
import { retirarTarifaDeGiroAction, type ResultadoTarifa } from "../_actions";
import { importe, porcentaje, textoDelTramo } from "../formato";
import { useEnfocarErrorAlResponder } from "@/lib/foco";

export interface TramoMostrado extends TramoDeTarifa {
  desde: number;
  incluido: boolean;
}

export interface MonedaConTarifa {
  code: string;
  nombre: string;
  /** Retirada del catálogo: conserva su tarifa, pero se marca. */
  retirada: boolean;
  minimo: number;
  tramos: readonly TramoMostrado[];
  actualizadoEl: string;
  actualizadoPor: string;
}

export interface MonedaSinTarifa {
  code: string;
  nombre: string;
  /** No circula ninguna denominación: no se le puede definir tarifa. */
  sinDenominaciones: boolean;
}

export function TarifasDeGiros({
  con,
  sin,
}: {
  con: readonly MonedaConTarifa[];
  sin: readonly MonedaSinTarifa[];
}): React.JSX.Element {
  const hydrated = useHydrated();
  const [retirando, setRetirando] = React.useState<MonedaConTarifa | null>(null);
  const [hecho, setHecho] = React.useState<string | null>(null);
  const cerrar = React.useCallback(() => setRetirando(null), []);
  const terminar = React.useCallback((m: string) => {
    setRetirando(null);
    setHecho(m);
  }, []);

  return (
    <>
      {hecho ? (
        <Alert variant="success" title="Hecho" className="mb-8">
          {hecho}
        </Alert>
      ) : null}

      <section aria-labelledby="con-tarifa" className="flex flex-col gap-6">
        <h2 id="con-tarifa" className="sr-only">
          Monedas en las que se envían giros
        </h2>
        {con.length === 0 ? (
          <Alert variant="warning" title="No se pueden enviar giros en ninguna moneda">
            Define la tarifa de al menos una moneda para que las sedes puedan enviar giros.
          </Alert>
        ) : (
          con.map((m) => (
            <TarjetaDeTarifa
              key={m.code}
              moneda={m}
              deshabilitado={!hydrated}
              onRetirar={() => {
                setHecho(null);
                setRetirando(m);
              }}
            />
          ))
        )}
      </section>

      {sin.length > 0 ? (
        <section aria-labelledby="sin-tarifa" className="mt-10">
          <h2 id="sin-tarifa" className="text-section-title text-text-primary">
            Sin tarifa
          </h2>
          <p className="mt-1 mb-4 text-body-sm text-text-secondary">
            En estas monedas no se envían giros hasta que se defina su tarifa.
          </p>
          <Card>
            <ul className="divide-y divide-border">
              {sin.map((m) => (
                <li key={m.code} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-4">
                  <Moneda code={m.code} nombre={m.nombre} />
                  {m.sinDenominaciones ? (
                    <span className="text-body-sm text-text-secondary">No circula ninguna denominación</span>
                  ) : (
                    <Button variant="secondary" size="sm" asChild>
                      <Link href={`/super-admin/tarifas/giros/${m.code}` as Route} aria-label={`Definir la tarifa de giros en ${m.code}`}>
                        <Plus aria-hidden="true" />
                        Definir tarifa
                      </Link>
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ) : null}

      {retirando ? <RetirarTarifa key={retirando.code} moneda={retirando} onCerrar={cerrar} onHecho={terminar} /> : null}
    </>
  );
}

function Moneda({ code, nombre, retirada = false }: { code: string; nombre: string; retirada?: boolean }): React.JSX.Element {
  return (
    <span className="inline-flex items-center gap-2.5">
      <CurrencyFlag currency={code} />
      <span className="flex flex-col leading-tight">
        <span className="pc-numeric font-semibold text-text-primary">
          {code}
          {retirada ? (
            <span className="ml-2 align-middle">
              <Badge variant="warning">Retirada del catálogo</Badge>
            </span>
          ) : null}
        </span>
        <span className="text-caption text-text-secondary">{nombre}</span>
      </span>
    </span>
  );
}

function TarjetaDeTarifa({
  moneda: m,
  deshabilitado,
  onRetirar,
}: {
  moneda: MonedaConTarifa;
  deshabilitado: boolean;
  onRetirar: () => void;
}): React.JSX.Element {
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-4 px-6 pt-6 pb-4">
        <Moneda code={m.code} nombre={m.nombre} retirada={m.retirada} />
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" asChild>
            <Link href={`/super-admin/tarifas/giros/${m.code}` as Route} aria-label={`Cambiar la tarifa de giros en ${m.code}`}>
              <Pencil aria-hidden="true" />
              Cambiar
            </Link>
          </Button>
          <Button
            variant="tertiary"
            size="sm"
            disabled={deshabilitado}
            onClick={onRetirar}
            aria-label={`Retirar la tarifa de giros en ${m.code}`}
            className="text-error hover:bg-error-subtle"
          >
            <Trash2 aria-hidden="true" />
            Retirar
          </Button>
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-x-10 gap-y-3 px-6 pb-5 text-body-sm sm:grid-cols-2 lg:flex">
        <div>
          <dt className="text-text-secondary">Giro mínimo</dt>
          <dd className="pc-numeric mt-0.5 text-body font-semibold text-text-primary">
            {importe(m.minimo)} {m.code}
          </dd>
        </div>
        <div>
          <dt className="text-text-secondary">Último cambio</dt>
          <dd className="mt-0.5 text-text-primary">
            {m.actualizadoEl} · {m.actualizadoPor}
          </dd>
        </div>
      </dl>

      {/* En el teléfono, una lista: tres columnas con cabeceras largas no caben en 390. */}
      <ul className="divide-y divide-border border-t border-border sm:hidden">
        {m.tramos.map((t, i) => (
          <li key={i} className="px-6 py-3">
            <p className="pc-numeric text-body-sm font-medium text-text-primary">{textoDelTramo(t)}</p>
            <p className="pc-numeric mt-0.5 text-body-sm text-text-secondary">
              Tarifa: {t.fijo > 0 ? `${importe(t.fijo)} ${m.code}` : ""}
              {t.fijo > 0 && t.porcentaje > 0 ? " + " : ""}
              {t.porcentaje > 0 ? porcentaje(t.porcentaje) : ""}
            </p>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto border-t border-border sm:block">
        <Table aria-label={`Tramos de la tarifa de giros en ${m.code}`}>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Lo que recibe el beneficiario ({m.code})</TableHead>
              <TableHead numeric>Fijo ({m.code})</TableHead>
              <TableHead numeric className="pr-6">
                Porcentaje
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {m.tramos.map((t, i) => (
              <TableRow key={i}>
                <TableCell className="pc-numeric pl-6 text-text-primary">{textoDelTramo(t)}</TableCell>
                <TableCell numeric className="pc-numeric">
                  {t.fijo > 0 ? importe(t.fijo) : <span className="text-text-secondary">—</span>}
                </TableCell>
                <TableCell numeric className="pc-numeric pr-6">
                  {t.porcentaje > 0 ? porcentaje(t.porcentaje) : <span className="text-text-secondary">—</span>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

const MOTIVO: FieldSpec = {
  id: "tarifa-retiro-motivo",
  label: "Motivo",
  required: true,
  description: "Al menos 10 caracteres. Queda en la auditoría con tu nombre.",
};

function RetirarTarifa({
  moneda,
  onCerrar,
  onHecho,
}: {
  moneda: MonedaConTarifa;
  onCerrar: () => void;
  onHecho: (m: string) => void;
}): React.JSX.Element {
  const [estado, accion, enviando] = React.useActionState<ResultadoTarifa, FormData>(retirarTarifaDeGiroAction, null);
  const formulario = React.useRef<HTMLFormElement>(null);
  useEnfocarErrorAlResponder(estado, formulario);
  React.useEffect(() => {
    if (estado?.ok) onHecho(estado.mensaje);
  }, [estado, onHecho]);

  return (
    <Dialog open onOpenChange={(o) => (o ? undefined : onCerrar())}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Retirar la tarifa de giros en {moneda.code}</DialogTitle>
          <DialogDescription>
            Desde ese momento ninguna sede podrá enviar giros en {moneda.nombre.toLowerCase()} hasta que se defina de nuevo.
          </DialogDescription>
        </DialogHeader>
        <form ref={formulario} onSubmit={enviarSinReiniciar(accion)} noValidate>
          <input type="hidden" name="moneda" value={moneda.code} />
          <DialogBody className="flex flex-col gap-4">
            {estado && !estado.ok ? (
              <Alert variant="error" title="No se pudo retirar">
                {estado.error}
              </Alert>
            ) : null}
            <p className="text-body-sm text-text-secondary">
              Los giros ya enviados no cambian, y se siguen cobrando. Cobrar un giro no lleva tarifa.
            </p>
            <Field {...MOTIVO}>
              <Input {...fieldAria(MOTIVO)} name="motivo" disabled={enviando} autoFocus />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onCerrar} disabled={enviando}>
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" loading={enviando}>
              Retirar la tarifa
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
