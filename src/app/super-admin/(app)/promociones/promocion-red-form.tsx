"use client";

import * as React from "react";
import Link from "next/link";
import { Save } from "lucide-react";

import { Alert, Button, Card, CardContent, Field, fieldAria, Input, type FieldSpec } from "@/components/ui";
import { cn } from "@/lib/utils";
import { enviarSinReiniciar } from "@/lib/enviar-sin-reiniciar";
import { composicionDe, enPantallaALaVez } from "@/features/network/promotion-coincidence";
import { CampoImagen } from "@/app/admin/(app)/promociones/campo-imagen";
import { VistaPrevia } from "@/app/admin/(app)/promociones/promocion-form";
import { SELECT } from "../equipos/controles";
import {
  crearPromocionRedAction,
  editarPromocionRedAction,
  type CampoPromocionRed,
  type ResultadoPromocionRed,
} from "./_actions";

/**
 * Alta y edición de una promoción de red — **FR-SA-PROM-2** a **FR-SA-PROM-5**.
 *
 * Igual que la del mercante en lo que publica (largo máximo con contador,
 * vista previa, imagen opcional), y distinta en tres cosas que son de esta
 * consola:
 *
 *   · **Dónde**: toda la red, o las sedes que se marquen. «Las de un operador»
 *     y «las de una provincia» son atajos para marcar, no reglas: lo que se
 *     guarda son esas sedes.
 *   · **Quién no puede quitarla**: el aviso de arriba, para que quien publica
 *     sepa que el mercante no podrá sacarla de su sala.
 *   · **Cuántas coincidirían** en cada sede sumando las de los operadores, con
 *     de quién es cada una, porque eso decide si el exceso se arregla aquí o lo
 *     arregla un administrador.
 */

const TITULO: FieldSpec = { id: "promo-titulo", label: "Título", required: true };
const TEXTO: FieldSpec = { id: "promo-texto", label: "Texto", required: true };
const DESDE: FieldSpec = { id: "promo-desde", label: "Desde", required: true };
const HASTA: FieldSpec = { id: "promo-hasta", label: "Hasta", required: true };

export interface SedeElegible {
  id: string;
  nombre: string;
  provincia: string;
  operadorId: string | null;
  operador: string | null;
  suspendida: boolean;
}

export interface OtraPromocionDeRed {
  id: string;
  sedes: readonly string[];
  desde: string;
  hasta: string;
  de: string;
  deRed: boolean;
}

export interface DatosPromocionRed {
  id?: string;
  titulo: string;
  texto: string;
  destino: "red" | "sedes";
  sedes: readonly string[];
  desde: string;
  hasta: string;
  imagenUrl?: string | null;
}

export function PromocionRedForm({
  datos,
  sedes,
  otras,
  hoy,
  tituloMax,
  textoMax,
  maxEnRotacion,
  maxImagenBytes,
  inicioFijo = false,
}: {
  datos: DatosPromocionRed;
  sedes: readonly SedeElegible[];
  /** Las demás que cuentan: no vencidas, de red y de operadores, ya resueltas a sedes. */
  otras: readonly OtraPromocionDeRed[];
  hoy: string;
  tituloMax: number;
  textoMax: number;
  maxEnRotacion: number;
  maxImagenBytes: number;
  /** Una promoción ya en pantalla conserva su fecha de inicio. */
  inicioFijo?: boolean;
}): React.JSX.Element {
  const editando = Boolean(datos.id);
  const [estado, accion, enviando] = React.useActionState<ResultadoPromocionRed, FormData>(
    editando ? editarPromocionRedAction : crearPromocionRedAction,
    null,
  );

  /* Controlado entero: la vista previa, los contadores y las coincidencias
     dependen de lo que se teclea, y tras un rechazo nada debe vaciarse. */
  const [titulo, setTitulo] = React.useState(datos.titulo);
  const [texto, setTexto] = React.useState(datos.texto);
  const [destino, setDestino] = React.useState<"red" | "sedes">(datos.destino);
  const [elegidas, setElegidas] = React.useState<readonly string[]>(datos.sedes);
  const [desde, setDesde] = React.useState(datos.desde);
  const [hasta, setHasta] = React.useState(datos.hasta);
  const [imagen, setImagen] = React.useState<string | null>(datos.imagenUrl ?? null);

  const errorDe = (campo: CampoPromocionRed) =>
    estado && !estado.ok && estado.campo === campo ? estado.error : undefined;

  const specTitulo: FieldSpec = { ...TITULO, error: errorDe("titulo"), description: `${titulo.length} de ${tituloMax} caracteres` };
  const specTexto: FieldSpec = { ...TEXTO, error: errorDe("texto"), description: `${texto.length} de ${textoMax} caracteres` };

  const alternar = (id: string, marcada: boolean) =>
    setElegidas((prev) => (marcada ? [...prev, id] : prev.filter((s) => s !== id)));
  const marcar = (ids: readonly string[]) => setElegidas((prev) => [...new Set([...prev, ...ids])]);

  /* Los atajos solo ofrecen lo que existe: un operador sin sedes no sale. */
  const operadores = [...new Map(sedes.filter((s) => s.operadorId).map((s) => [s.operadorId!, s.operador!])).entries()]
    .map(([id, nombre]) => ({ id, nombre }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  const provincias = [...new Set(sedes.map((s) => s.provincia))].sort((a, b) => a.localeCompare(b, "es"));

  /* **FR-SA-PROM-5**: lo que cuenta es cuántas se ven **a la vez**. */
  const afectadas = destino === "red" ? sedes : sedes.filter((s) => elegidas.includes(s.id));
  const coincidencias = afectadas.map((s) => ({
    sede: s,
    pico: enPantallaALaVez(otras, s.id, desde, hasta),
  }));
  const demasiadas = coincidencias.filter((c) => c.pico.length + 1 > maxEnRotacion);
  const peor = coincidencias.reduce<(typeof coincidencias)[number] | null>(
    (acc, c) => (!acc || c.pico.length > acc.pico.length ? c : acc),
    null,
  );

  return (
    <form onSubmit={enviarSinReiniciar(accion)} className="max-w-form-max">
      {datos.id ? <input type="hidden" name="id" value={datos.id} /> : null}
      <Card>
        <CardContent className="flex flex-col gap-6 pt-6">
          {estado && !estado.ok && !estado.campo ? (
            <Alert variant="error" title="No se pudo guardar">
              {estado.error}
            </Alert>
          ) : null}

          {/* **FR-SA-PROM-4**: quien publica sabe que el mercante no podrá quitarla. */}
          <Alert variant="info" title="Solo PuntoCash puede cambiarla o retirarla">
            Los administradores de sede la verán en su lista de promociones, pero no podrán editarla ni sacarla de la
            pantalla de su sucursal.
          </Alert>

          <Field {...specTitulo}>
            <Input
              {...fieldAria(specTitulo)}
              name="titulo"
              value={titulo}
              maxLength={tituloMax}
              disabled={enviando}
              invalid={Boolean(errorDe("titulo"))}
              onChange={(e) => setTitulo(e.target.value)}
            />
          </Field>

          <Field {...specTexto}>
            <textarea
              {...fieldAria(specTexto)}
              name="texto"
              rows={3}
              value={texto}
              maxLength={textoMax}
              disabled={enviando}
              onChange={(e) => setTexto(e.target.value)}
              className={cn(
                "w-full rounded-control border bg-surface px-4 py-3 text-body text-text-primary outline-none",
                "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:bg-surface-subtle",
                errorDe("texto") ? "border-error" : "border-border hover:border-border-strong",
              )}
            />
          </Field>

          <CampoImagen
            inicialUrl={datos.imagenUrl ?? null}
            maxBytes={maxImagenBytes}
            deshabilitado={enviando}
            error={errorDe("imagen")}
            onVista={setImagen}
          />

          {/* **FR-SA-PROM-2**: toda la red, o las sedes que se marquen. */}
          <fieldset className="min-w-0" aria-describedby={errorDe("sedes") ? "promo-sedes-error" : undefined}>
            <legend className="text-label font-medium text-text-primary">
              Dónde se muestra <span className="text-error">*</span>
            </legend>
            {errorDe("sedes") ? (
              <p id="promo-sedes-error" role="alert" className="mt-2 text-body-sm font-semibold text-error">
                {errorDe("sedes")}
              </p>
            ) : null}

            <div className="mt-3 flex flex-col gap-2">
              <label className="flex min-h-control-sm items-start gap-3 text-body text-text-primary">
                <input
                  type="radio"
                  name="destino"
                  value="red"
                  checked={destino === "red"}
                  disabled={enviando}
                  onChange={() => setDestino("red")}
                  className="mt-1 size-5 shrink-0 accent-primary"
                />
                <span>
                  Toda la red
                  <span className="block text-body-sm text-text-secondary">
                    Todas las sedes abiertas, también las que se creen después.
                  </span>
                </span>
              </label>
              <label className="flex min-h-control-sm items-start gap-3 text-body text-text-primary">
                <input
                  type="radio"
                  name="destino"
                  value="sedes"
                  checked={destino === "sedes"}
                  disabled={enviando}
                  onChange={() => setDestino("sedes")}
                  className="mt-1 size-5 shrink-0 accent-primary"
                />
                <span>
                  Solo las sedes que elija
                  <span className="block text-body-sm text-text-secondary">
                    Se queda con las sedes marcadas, aunque luego cambien de operador.
                  </span>
                </span>
              </label>
            </div>

            {destino === "sedes" ? (
              <div className="mt-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <select
                    aria-label="Marcar las sedes de un operador"
                    value=""
                    disabled={enviando}
                    onChange={(e) => marcar(sedes.filter((s) => s.operadorId === e.target.value).map((s) => s.id))}
                    className={SELECT}
                  >
                    <option value="">Marcar las sedes de un operador…</option>
                    {operadores.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.nombre}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="Marcar las sedes de una provincia"
                    value=""
                    disabled={enviando}
                    onChange={(e) => marcar(sedes.filter((s) => s.provincia === e.target.value).map((s) => s.id))}
                    className={SELECT}
                  >
                    <option value="">Marcar las sedes de una provincia…</option>
                    {provincias.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="tertiary"
                    size="sm"
                    disabled={enviando || elegidas.length === sedes.length}
                    onClick={() => setElegidas(sedes.map((s) => s.id))}
                  >
                    Marcar todas
                  </Button>
                  <Button
                    type="button"
                    variant="tertiary"
                    size="sm"
                    disabled={enviando || elegidas.length === 0}
                    onClick={() => setElegidas([])}
                  >
                    Quitar todas
                  </Button>
                  <span className="pc-numeric text-body-sm text-text-secondary" aria-live="polite">
                    {elegidas.length} de {sedes.length} marcadas
                  </span>
                </div>

                <ul className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2">
                  {sedes.map((sede) => (
                    <li key={sede.id}>
                      <label className="flex min-h-control-sm items-start gap-3 py-1 text-body text-text-primary">
                        <input
                          type="checkbox"
                          name="sede"
                          value={sede.id}
                          checked={elegidas.includes(sede.id)}
                          disabled={enviando}
                          onChange={(e) => alternar(sede.id, e.target.checked)}
                          className="mt-0.5 size-5 shrink-0 accent-primary"
                        />
                        <span className="min-w-0">
                          {sede.nombre}
                          <span className="block break-words text-body-sm text-text-secondary">
                            {sede.provincia} · {sede.operador ?? "Sin operador"}
                            {sede.suspendida ? " · suspendida" : ""}
                          </span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </fieldset>

          <div className="grid gap-6 sm:grid-cols-2">
            <Field {...DESDE} error={errorDe("desde")}>
              <Input
                {...fieldAria({ ...DESDE, error: errorDe("desde") })}
                type="date"
                name="desde"
                value={desde}
                min={inicioFijo ? undefined : hoy}
                readOnly={inicioFijo}
                disabled={enviando}
                invalid={Boolean(errorDe("desde"))}
                onChange={(e) => setDesde(e.target.value)}
                className="pc-numeric"
              />
            </Field>
            <Field {...HASTA} error={errorDe("hasta")}>
              <Input
                {...fieldAria({ ...HASTA, error: errorDe("hasta") })}
                type="date"
                name="hasta"
                value={hasta}
                min={desde && desde > hoy ? desde : hoy}
                disabled={enviando}
                invalid={Boolean(errorDe("hasta"))}
                onChange={(e) => setHasta(e.target.value)}
                className="pc-numeric"
              />
            </Field>
          </div>

          {/* **FR-SA-PROM-5**: cuántas coincidirían en cada sede, con esta, y de quién son. */}
          {afectadas.length > 0 && desde && hasta ? (
            demasiadas.length > 0 ? (
              <Alert variant="warning" title="Demasiadas promociones a la vez">
                {demasiadas.map((c) => (
                  <p key={c.sede.id}>
                    En {c.sede.nombre} coincidiría con {c.pico.length} más ({composicionDe(c.pico)}).
                  </p>
                ))}
                <p className="mt-1">
                  Cada una ocupa su propia pantalla durante 12 segundos: con más de {maxEnRotacion} a la vez, un cliente
                  que espera no llega a verlas todas. Las de un operador solo puede retirarlas su administrador.
                </p>
              </Alert>
            ) : destino === "red" ? (
              <p className="text-body-sm text-text-secondary">
                {peor && peor.pico.length > 0
                  ? `En ninguna sede pasaría de ${maxEnRotacion} a la vez. La más cargada es ${peor.sede.nombre}, con ${peor.pico.length} más.`
                  : "Sería la única promoción en pantalla en todas las sedes esos días."}
              </p>
            ) : (
              <ul className="flex flex-col gap-1 text-body-sm text-text-secondary">
                {coincidencias.map((c) => (
                  <li key={c.sede.id}>
                    {c.sede.nombre}:{" "}
                    {c.pico.length === 0
                      ? "sería la única promoción en pantalla esos días."
                      : `coincidiría con ${c.pico.length === 1 ? "otra promoción" : `${c.pico.length} promociones más`} (${composicionDe(c.pico)}).`}
                  </li>
                ))}
              </ul>
            )
          ) : null}

          <div>
            <p className="text-label font-medium text-text-primary">Así se verá en la pantalla de la sucursal</p>
            <VistaPrevia titulo={titulo} texto={texto} imagen={imagen} />
          </div>

          <div className="flex flex-col items-stretch gap-3 pt-2 sm:flex-row sm:items-center sm:justify-end">
            <Button variant="secondary" asChild>
              <Link href="/super-admin/promociones">Cancelar</Link>
            </Button>
            <Button type="submit" loading={enviando}>
              <Save aria-hidden="true" />
              {editando ? "Guardar cambios" : "Publicar promoción"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
