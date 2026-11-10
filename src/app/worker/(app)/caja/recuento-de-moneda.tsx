"use client";

import * as React from "react";
import { ClipboardCheck } from "lucide-react";

import { Alert, Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import type { Denominacion } from "@/features/caja/billetes";
import { explicarRecuentoAction, recontarAction } from "../../_actions";
import {
  aBilletes,
  ConteoPorBilletes,
  explicacionIncompleta,
  ExplicarDiferenciasFilas,
  type DiferenciaPorExplicar,
  type ExplicacionDeDiferencia,
  type Unidades,
} from "./conteo-por-billetes";

/**
 * **Recuento por discrepancia** (decisión del 10/11/2026). Iban a salir
 * billetes que los libros no tienen: antes de registrar nada, trabajador y
 * supervisor cuentan esa moneda, a ciegas. El inventario queda igual a lo
 * contado; si hay diferencia, se explica aquí mismo y va a Aprobaciones.
 * Después, la pantalla que lo pidió vuelve a intentar su registro.
 *
 * No es un arqueo parcial: solo aparece cuando el sistema detecta que sus
 * libros no pueden ser verdad.
 */
export function RecuentoDeMoneda({
  currency,
  denominaciones,
  supervisores,
  onListo,
  onCancelar,
}: {
  currency: string;
  denominaciones: Readonly<Record<string, readonly Denominacion[]>>;
  supervisores: readonly { id: string; nombre: string }[];
  /** Contado (y explicado, si hacía falta): la pantalla vuelve a intentar su registro. */
  onListo: () => void;
  /** Solo antes de contar: después, el recuento ya quedó registrado. */
  onCancelar: () => void;
}): React.JSX.Element {
  const [unidades, setUnidades] = React.useState<Unidades>({});
  const [errores, setErrores] = React.useState<Record<string, string>>({});
  const [pendiente, setPendiente] = React.useState<{ movimientoId: string; fila: DiferenciaPorExplicar } | null>(null);
  const [explicacion, setExplicacion] = React.useState<Record<string, ExplicacionDeDiferencia>>({});
  const [enviado, setEnviado] = React.useState(false);
  const [enviando, setEnviando] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();

  async function contar(event: React.FormEvent) {
    event.preventDefault();
    if (enviando) return;
    const { conteos, errores: e } = aBilletes([currency], unidades);
    setErrores(e);
    if (Object.keys(e).length > 0) return;
    setEnviando(true);
    setError(undefined);
    const r = await recontarAction({ currency, billetes: conteos[0]?.billetes ?? {} });
    setEnviando(false);
    if (!r.ok) {
      setError("No se pudo registrar el recuento. Vuelve a Caja y comprueba su estado.");
      return;
    }
    if (r.value.pideExplicacion && r.value.movimientoId) {
      setPendiente({
        movimientoId: r.value.movimientoId,
        fila: { currency, diferencia: r.value.diferencia, ...(r.value.composicion ? { composicion: r.value.composicion } : {}) },
      });
      return;
    }
    onListo();
  }

  async function explicar() {
    if (!pendiente || enviando) return;
    setEnviado(true);
    const e = explicacion[currency];
    if (explicacionIncompleta(e)) return;
    setEnviando(true);
    setError(undefined);
    const r = await explicarRecuentoAction(pendiente.movimientoId, {
      motivo: e!.motivo,
      ...(e!.observaciones.trim() ? { observaciones: e!.observaciones.trim() } : {}),
    });
    setEnviando(false);
    if (!r.ok) {
      setError("No se pudo guardar el motivo. Revísalo e inténtalo de nuevo.");
      return;
    }
    onListo();
  }

  if (pendiente) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {pendiente.fila.diferencia === 0 ? "Los billetes no coinciden con los libros" : "Lo contado no coincide con los libros"}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5 pt-0">
          <p className="text-body text-text-secondary">
            El recuento ya quedó registrado y la caja tiene ahora lo que contasteis. Di por qué no coincidía: la diferencia irá a la
            administración.
          </p>
          {error ? <Alert variant="error" title={error} /> : null}
          <ExplicarDiferenciasFilas
            momento="recuento"
            filas={[pendiente.fila]}
            explicaciones={explicacion}
            supervisores={supervisores}
            enviado={enviado}
            onChange={(c, e) => setExplicacion((prev) => ({ ...prev, [c]: e }))}
          />
          <div className="pc-botonera sm:justify-end">
            <Button onClick={() => void explicar()} disabled={enviando}>
              {enviando ? "Guardando…" : "Guardar el motivo y continuar"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={(e) => void contar(e)} className="flex flex-col gap-5">
      <Alert variant="warning" title="Según los libros, la caja no tiene esos billetes">
        Antes de registrarlo, contad entre los dos todo el {currency} que hay en la caja, billete a billete. Así queda constancia de la
        diferencia y la caja sigue con los billetes que tiene de verdad.
      </Alert>
      {error ? <Alert variant="error" title={error} /> : null}
      <Card>
        <CardHeader>
          <div className="flex min-w-0 items-center gap-3">
            <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-control bg-primary-subtle text-primary">
              <ClipboardCheck className="size-[18px]" />
            </span>
            <CardTitle>Recuento de {currency}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <ConteoPorBilletes
            monedas={[currency]}
            denominaciones={denominaciones}
            unidades={unidades}
            errores={errores}
            onChange={(c, k, v) => {
              setUnidades((prev) => ({ ...prev, [c]: { ...prev[c], [k]: v } }));
              setErrores({});
            }}
          />
        </CardContent>
      </Card>
      <div className="pc-botonera sm:justify-end">
        <Button type="button" variant="secondary" onClick={onCancelar} disabled={enviando}>
          Volver sin contar
        </Button>
        <Button type="submit" disabled={enviando}>
          {enviando ? "Registrando…" : "Confirmar el recuento"}
        </Button>
      </div>
    </form>
  );
}
