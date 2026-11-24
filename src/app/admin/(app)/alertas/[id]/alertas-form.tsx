"use client";

import * as React from "react";
import Link from "next/link";
import { Save } from "lucide-react";

import { Alert, Button, Card, CardContent, Field, fieldAria, Input, type FieldSpec } from "@/components/ui";
import { clave, formatoDeDenominacion } from "@/features/caja/billetes";
import type { ReglaDeMoneda } from "@/features/network/alertas";
import { guardarAlertasAction, type ResultadoDeAlertas } from "./actions";
import { useEnfocarErrorAlResponder } from "@/lib/foco";

interface MonedaDelFormulario {
  code: string;
  regla: ReglaDeMoneda | null;
  denominaciones: readonly { valor: number; tipo: "billete" | "moneda" }[];
}

const importe = (n: number | null | undefined) => (n === null || n === undefined ? "" : String(n).replace(".", ","));

export function AlertasForm({
  sede,
  monedas,
}: {
  sede: { id: string; name: string };
  monedas: readonly MonedaDelFormulario[];
}): React.JSX.Element {
  const [estado, accion, enviando] = React.useActionState<ResultadoDeAlertas, FormData>(guardarAlertasAction, null);
  const formulario = React.useRef<HTMLFormElement>(null);
  useEnfocarErrorAlResponder(estado, formulario);

  return (
    <form ref={formulario} action={accion} className="max-w-form-max">
      <input type="hidden" name="sede" value={sede.id} />
      <div className="flex flex-col gap-6">
        <Alert variant="info" title="Cómo funcionan">
          Una alerta se enciende sola cuando una caja con la jornada abierta cruza un límite, y se apaga sola cuando
          deja de cruzarlo. El trabajador la ve sin cifras; tú la ves en Inicio y en la ficha de la caja. Deja un campo
          vacío si no quieres esa alerta.
        </Alert>

        {estado && !estado.ok ? (
          <Alert variant="error" title="No se pudo guardar">
            {estado.error}
          </Alert>
        ) : null}

        {monedas.length === 0 ? (
          <Alert variant="warning" title="Esta sede no tiene monedas">
            Añade monedas a la sede para poder definir sus alertas.
          </Alert>
        ) : null}

        {monedas.map((m) => {
          const min: FieldSpec = { id: `min-${m.code}`, label: "Efectivo mínimo", description: `Por debajo, alerta de efectivo bajo en ${m.code}.` };
          const max: FieldSpec = { id: `max-${m.code}`, label: "Efectivo máximo", description: `Por encima, alerta de efectivo alto en ${m.code}.` };
          return (
            <Card key={m.code}>
              <CardContent className="flex flex-col gap-6 pt-6">
                <input type="hidden" name="moneda" value={m.code} />
                <h2 className="text-h3 text-text-primary">{m.code}</h2>
                <div className="grid gap-6 sm:grid-cols-2">
                  <Field {...min}>
                    <Input {...fieldAria(min)} name={`min-${m.code}`} inputMode="decimal" disabled={enviando} defaultValue={importe(m.regla?.minimo)} className="pc-numeric" />
                  </Field>
                  <Field {...max}>
                    <Input {...fieldAria(max)} name={`max-${m.code}`} inputMode="decimal" disabled={enviando} defaultValue={importe(m.regla?.maximo)} className="pc-numeric" />
                  </Field>
                </div>

                <div className="flex flex-col gap-3">
                  <p className="text-label text-text-primary">Mínimo de billetes por denominación</p>
                  <p className="text-body-sm text-text-secondary">Por debajo de esa cantidad, alerta de que quedan pocos.</p>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    {m.denominaciones.map((d) => {
                      const k = clave(d.valor);
                      const spec: FieldSpec = { id: `b-${m.code}-${k}`, label: `${formatoDeDenominacion(d.valor)} ${m.code}${d.tipo === "moneda" ? " (moneda)" : ""}` };
                      return (
                        <Field key={k} {...spec}>
                          <Input
                            {...fieldAria(spec)}
                            name={`b-${m.code}-${k}`}
                            inputMode="numeric"
                            disabled={enviando}
                            defaultValue={m.regla?.billetesMinimos[k] ? String(m.regla.billetesMinimos[k]) : ""}
                            className="pc-numeric"
                          />
                        </Field>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        <div className="pc-botonera sm:justify-end">
          <Button variant="secondary" asChild>
            <Link href="/admin/alertas">Cancelar</Link>
          </Button>
          <Button type="submit" loading={enviando}>
            <Save aria-hidden="true" />
            Guardar alertas
          </Button>
        </div>
      </div>
    </form>
  );
}
