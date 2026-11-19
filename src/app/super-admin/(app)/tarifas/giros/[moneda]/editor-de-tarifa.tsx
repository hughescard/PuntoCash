"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Save, Trash2 } from "lucide-react";

import { Alert, Button, Card, Field, fieldAria, Input, type FieldSpec } from "@/components/ui";
import { cn } from "@/lib/utils";
import { enviarSinReiniciar } from "@/lib/enviar-sin-reiniciar";
import { validarTarifaDeGiro, type TramoDeTarifa, type TarifaWriteError } from "@/features/network/tarifas-reglas";
import { guardarTarifaDeGiroAction, type ResultadoTarifa } from "../../_actions";
import { mensajeDeTarifa } from "../../mensajes";
import { importe, textoDelTramo } from "../../formato";

/**
 * El giro mínimo y la tabla de tramos de una moneda.
 *
 * Avisa mientras se escribe con las mismas reglas que aplica el dominio al
 * guardar (`validarTarifaDeGiro`). Lo que falta por escribir no se señala
 * hasta que se intenta guardar: un formulario a medias no es un error.
 *
 * «Añadir tramo» parte el último: el nuevo entra justo antes, porque el último
 * es el único sin límite superior. Quitar el último deja al anterior como el
 * nuevo último, y su límite desaparece.
 */

interface TramoEscrito {
  /** Para que React no confunda filas al añadir o quitar en medio. */
  clave: number;
  hasta: string;
  fijo: string;
  porcentaje: string;
}

const texto = (v: number) => String(v).replace(".", ",");
const cifra = (t: string) => {
  const limpio = t.trim().replace(/\s/g, "").replace(",", ".");
  return limpio === "" ? Number.NaN : Number(limpio);
};

let siguienteClave = 1;
const nuevoTramo = (t?: TramoDeTarifa): TramoEscrito => ({
  clave: siguienteClave++,
  hasta: t?.hasta === null || t?.hasta === undefined ? "" : texto(t.hasta),
  fijo: t ? texto(t.fijo) : "",
  porcentaje: t ? texto(t.porcentaje) : "",
});

export function EditorDeTarifa({
  moneda,
  nombre,
  menor,
  motivoMin,
  inicial,
}: {
  moneda: string;
  nombre: string;
  /** La denominación más pequeña que circula: todo importe tiene que ser múltiplo suyo. */
  menor: number;
  motivoMin: number;
  inicial: { minimo: number; tramos: readonly TramoDeTarifa[] } | null;
}): React.JSX.Element {
  const [estado, accion, enviando] = React.useActionState<ResultadoTarifa, FormData>(guardarTarifaDeGiroAction, null);
  const [minimo, setMinimo] = React.useState(inicial ? texto(inicial.minimo) : "");
  const [tramos, setTramos] = React.useState<TramoEscrito[]>(() =>
    inicial ? inicial.tramos.map((t) => nuevoTramo(t)) : [nuevoTramo()],
  );
  const [motivo, setMotivo] = React.useState("");
  const [intentado, setIntentado] = React.useState(false);

  const leidos: TramoDeTarifa[] = tramos.map((t, i) => ({
    hasta: i === tramos.length - 1 ? null : cifra(t.hasta),
    fijo: cifra(t.fijo),
    porcentaje: cifra(t.porcentaje),
  }));
  const error = validarTarifaDeGiro(menor, cifra(minimo), leidos);
  /* Un campo vacío solo es un error cuando se intenta guardar. */
  const vacio = (e: TarifaWriteError): boolean => {
    if (e.tramo === undefined) return minimo.trim() === "";
    const t = tramos[e.tramo];
    if (!t) return false;
    if (e.reason === "limite-invalido") return t.hasta.trim() === "";
    if (e.reason === "fijo-invalido") return t.fijo.trim() === "";
    if (e.reason === "porcentaje-invalido") return t.porcentaje.trim() === "";
    return false;
  };
  const visible = error && (intentado || !vacio(error)) ? error : null;
  const servidor = estado && !estado.ok ? estado : null;
  const faltaMotivo = inicial !== null && motivo.trim().length < motivoMin;

  const errorDe = (donde: "minimo" | number, campo?: "hasta" | "fijo" | "porcentaje"): string | undefined => {
    if (!visible) return undefined;
    if (donde === "minimo") return visible.tramo === undefined && visible.reason.startsWith("minimo") ? mensajeDeTarifa(visible, moneda, motivoMin) : undefined;
    if (visible.tramo !== donde) return undefined;
    const campoDelError = visible.reason.startsWith("limite") ? "hasta" : visible.reason.startsWith("fijo") ? "fijo" : visible.reason.startsWith("porcentaje") ? "porcentaje" : null;
    /* «El tramo no cobraría nada» es de los dos campos: se dice bajo el porcentaje. */
    if (campoDelError === null) return campo === "porcentaje" ? mensajeDeTarifa({ reason: visible.reason }, moneda, motivoMin) : undefined;
    return campo === campoDelError ? mensajeDeTarifa({ reason: visible.reason }, moneda, motivoMin) : undefined;
  };

  const cambiar = (i: number, campo: "hasta" | "fijo" | "porcentaje", valor: string) =>
    setTramos((p) => p.map((t, j) => (j === i ? { ...t, [campo]: valor } : t)));
  const anadir = () => setTramos((p) => [...p.slice(0, -1), nuevoTramo(), p[p.length - 1]!]);
  const quitar = (i: number) => setTramos((p) => p.filter((_, j) => j !== i));

  /* Lo que se ve en la cabecera de cada tramo, con lo escrito hasta ahora. */
  const minimoLeido = cifra(minimo);
  const rotulo = (i: number): string => {
    const ultimo = i === tramos.length - 1;
    const desde = i === 0 ? minimoLeido : cifra(tramos[i - 1]!.hasta);
    const hasta = ultimo ? null : cifra(tramos[i]!.hasta);
    if (!Number.isFinite(desde) || (hasta !== null && !Number.isFinite(hasta))) {
      if (i === 0) return ultimo ? "Desde el giro mínimo" : "Desde el giro mínimo hasta su límite";
      return ultimo ? `Más del límite del tramo ${i}` : `Más del límite del tramo ${i} hasta el suyo`;
    }
    return textoDelTramo({ desde, incluido: i === 0, hasta });
  };

  const MINIMO: FieldSpec = {
    id: "tarifa-minimo",
    label: "Giro mínimo",
    required: true,
    description: `Lo menos que puede recibir el beneficiario; no hay giro máximo. Múltiplo de ${importe(menor)} ${moneda}, la denominación más pequeña que circula.`,
    error: errorDe("minimo"),
  };
  const MOTIVO: FieldSpec = {
    id: "tarifa-motivo",
    label: "Motivo del cambio",
    required: true,
    description: `Al menos ${motivoMin} caracteres. Queda en la auditoría con tu nombre.`,
    error: intentado && faltaMotivo ? `Escribe el motivo del cambio: al menos ${motivoMin} caracteres.` : undefined,
  };

  const enviar = enviarSinReiniciar(accion);

  return (
    <form
      noValidate
      onSubmit={(e) => {
        if (error || faltaMotivo) {
          e.preventDefault();
          setIntentado(true);
          return;
        }
        enviar(e);
      }}
      className="flex flex-col gap-6"
    >
      <input type="hidden" name="moneda" value={moneda} />
      <input type="hidden" name="tramos" value={tramos.length} />

      {servidor ? (
        <Alert variant="error" title="No se pudo guardar">
          {servidor.error}
        </Alert>
      ) : intentado && (visible || faltaMotivo) ? (
        <Alert variant="error" title="Revisa la tarifa">
          Hay datos por completar o por corregir. Están marcados debajo.
        </Alert>
      ) : null}

      <Card>
        <div className="p-6">
          <Field {...MINIMO} className="sm:max-w-md">
            <Input
              {...fieldAria(MINIMO)}
              name="minimo"
              inputMode="decimal"
              value={minimo}
              onChange={(e) => setMinimo(e.currentTarget.value)}
              disabled={enviando}
              suffix={moneda}
              className="pc-numeric"
            />
          </Field>
        </div>
      </Card>

      <Card>
        <div className="px-6 pt-6">
          <h2 className="text-card-title text-text-primary">Tramos</h2>
          <p className="mt-1 max-w-3xl text-body-sm text-text-secondary">
            Cada giro paga la tarifa del tramo en el que cae lo que recibe el beneficiario: un fijo más un porcentaje de ese
            importe. Uno de los dos puede ser cero, no los dos. El límite de cada tramo va incluido en él, y el último no
            tiene límite.
          </p>
        </div>

        <ol className="mt-5 flex flex-col">
          {tramos.map((t, i) => {
            const ultimo = i === tramos.length - 1;
            const marcado = visible?.tramo === i || (servidor?.tramo === i && !visible);
            const HASTA: FieldSpec = { id: `tarifa-tramo-${t.clave}-hasta`, label: "Hasta", required: !ultimo, error: errorDe(i, "hasta") };
            const FIJO: FieldSpec = { id: `tarifa-tramo-${t.clave}-fijo`, label: "Fijo", required: true, error: errorDe(i, "fijo") };
            const PCT: FieldSpec = {
              id: `tarifa-tramo-${t.clave}-porcentaje`,
              label: "Porcentaje",
              required: true,
              error: errorDe(i, "porcentaje"),
            };
            return (
              <li
                key={t.clave}
                aria-label={`Tramo ${i + 1}`}
                className={cn("border-t border-border px-6 py-5", marcado && "bg-error-subtle/40")}
              >
                <div className="mb-4 flex items-center justify-between gap-4">
                  <p className="text-body font-semibold text-text-primary">
                    Tramo {i + 1}
                    <span className="pc-numeric ml-2 font-normal text-text-secondary">{rotulo(i)}</span>
                  </p>
                  <Button
                    type="button"
                    variant="tertiary"
                    size="sm"
                    onClick={() => quitar(i)}
                    disabled={enviando || tramos.length === 1}
                    aria-label={`Quitar el tramo ${i + 1}`}
                    className="text-error hover:bg-error-subtle"
                  >
                    <Trash2 aria-hidden="true" />
                    <span className="hidden sm:inline">Quitar</span>
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {ultimo ? (
                    <div className="flex flex-col gap-2">
                      <span className="text-label font-medium text-text-primary">Hasta</span>
                      <span className="flex min-h-control items-center rounded-md border border-border bg-surface-subtle px-4 text-body text-text-secondary">
                        Sin límite
                      </span>
                    </div>
                  ) : (
                    <Field {...HASTA}>
                      <Input
                        {...fieldAria(HASTA)}
                        name={`tramo-${i}-hasta`}
                        inputMode="decimal"
                        value={t.hasta}
                        onChange={(e) => cambiar(i, "hasta", e.currentTarget.value)}
                        disabled={enviando}
                        suffix={moneda}
                        className="pc-numeric"
                      />
                    </Field>
                  )}
                  <Field {...FIJO}>
                    <Input
                      {...fieldAria(FIJO)}
                      name={`tramo-${i}-fijo`}
                      inputMode="decimal"
                      value={t.fijo}
                      onChange={(e) => cambiar(i, "fijo", e.currentTarget.value)}
                      disabled={enviando}
                      suffix={moneda}
                      className="pc-numeric"
                    />
                  </Field>
                  <Field {...PCT}>
                    <Input
                      {...fieldAria(PCT)}
                      name={`tramo-${i}-porcentaje`}
                      inputMode="decimal"
                      value={t.porcentaje}
                      onChange={(e) => cambiar(i, "porcentaje", e.currentTarget.value)}
                      disabled={enviando}
                      suffix="%"
                      className="pc-numeric"
                    />
                  </Field>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="border-t border-border px-6 py-4">
          <Button type="button" variant="secondary" size="sm" onClick={anadir} disabled={enviando}>
            <Plus aria-hidden="true" />
            Añadir tramo
          </Button>
        </div>
      </Card>

      {inicial ? (
        <Card>
          <div className="px-6 py-6">
            <Field {...MOTIVO} className="sm:max-w-xl">
              <Input
                {...fieldAria(MOTIVO)}
                name="motivo"
                value={motivo}
                onChange={(e) => setMotivo(e.currentTarget.value)}
                disabled={enviando}
              />
            </Field>
          </div>
        </Card>
      ) : null}

      <p className="text-body-sm text-text-secondary">
        {inicial
          ? `Al guardar, los giros en ${moneda} que se envíen desde ese momento pagan la tarifa nueva. Los ya enviados no cambian.`
          : `Al definirla, todas las sedes con Giros podrán enviar giros en ${nombre.toLowerCase()}.`}
      </p>

      <div className="pc-botonera flex flex-wrap justify-end gap-3">
        <Button type="button" variant="secondary" asChild>
          <Link href="/super-admin/tarifas/giros">Cancelar</Link>
        </Button>
        <Button type="submit" loading={enviando}>
          <Save aria-hidden="true" />
          {inicial ? "Guardar la tarifa" : "Definir la tarifa"}
        </Button>
      </div>
    </form>
  );
}
