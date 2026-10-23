"use client";

import * as React from "react";
import Link from "next/link";
import { ImagePlus, Megaphone, Save, Trash2 } from "lucide-react";

import { Alert, Button, Card, CardContent, Field, fieldAria, Input, type FieldSpec } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  crearPromocionAction,
  editarPromocionAction,
  type CampoPromocion,
  type ResultadoPromocion,
} from "./_actions";

/**
 * Alta y edición de una promoción — **FR-AD-PROM-4** a **FR-AD-PROM-8**.
 *
 * Tres cosas que este formulario hace por quien lo rellena, porque lo que
 * publica se lee en una televisión al otro lado de una sala:
 *
 *   · **Largo máximo** del título y del texto, con contador. No se puede pasar
 *     (decisión del 16/10/2026): un aviso que se puede ignorar acaba en la
 *     tele con un texto que nadie lee.
 *   · **Vista previa** de la diapositiva tal como se verá.
 *   · **Cuántas promociones coincidirían** en cada sede elegida durante esas
 *     fechas, propias y de PuntoCash, avisando si pasan de cuatro.
 */

const TITULO: FieldSpec = { id: "promo-titulo", label: "Título", required: true };
const TEXTO: FieldSpec = { id: "promo-texto", label: "Texto", required: true };
const DESDE: FieldSpec = { id: "promo-desde", label: "Desde", required: true };
const HASTA: FieldSpec = { id: "promo-hasta", label: "Hasta", required: true };

export interface OtraPromocion {
  id: string;
  sedes: readonly string[];
  desde: string;
  hasta: string;
}

export interface DatosPromocion {
  /** La dirección de su imagen actual, si tiene (**FR-AD-PROM-12**). */
  imagenUrl?: string | null;
  id?: string;
  titulo: string;
  texto: string;
  sedes: readonly string[];
  desde: string;
  hasta: string;
}

export function PromocionForm({
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
  datos: DatosPromocion;
  sedes: readonly { id: string; name: string }[];
  /** Las promociones que podrían coincidir: las no vencidas visibles, sin esta. */
  otras: readonly OtraPromocion[];
  hoy: string;
  tituloMax: number;
  textoMax: number;
  maxEnRotacion: number;
  maxImagenBytes: number;
  /** Una promoción ya en pantalla conserva su fecha de inicio. */
  inicioFijo?: boolean;
}): React.JSX.Element {
  const editando = Boolean(datos.id);
  const [estado, accion, enviando] = React.useActionState<ResultadoPromocion, FormData>(
    editando ? editarPromocionAction : crearPromocionAction,
    null,
  );

  /* Controlado entero: la vista previa, los contadores y las coincidencias
     dependen de lo que se teclea, y tras un rechazo nada debe vaciarse. */
  const [titulo, setTitulo] = React.useState(datos.titulo);
  const [texto, setTexto] = React.useState(datos.texto);
  const [elegidas, setElegidas] = React.useState<readonly string[]>(datos.sedes);
  const [desde, setDesde] = React.useState(datos.desde);
  const [hasta, setHasta] = React.useState(datos.hasta);

  /* La imagen: la que ya tenía (dirección), una nueva (data URL reducida aquí),
     o ninguna. Solo viaja al servidor si cambia. */
  const [imagen, setImagen] = React.useState<string | null>(datos.imagenUrl ?? null);
  const [imagenNueva, setImagenNueva] = React.useState<string | null>(null);
  const [quitada, setQuitada] = React.useState(false);
  const [errorImagen, setErrorImagen] = React.useState<string | null>(null);
  const [procesando, setProcesando] = React.useState(false);
  const archivoRef = React.useRef<HTMLInputElement>(null);

  async function elegirImagen(archivo: File | undefined) {
    setErrorImagen(null);
    if (!archivo) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(archivo.type)) {
      setErrorImagen("La imagen tiene que ser JPG, PNG o WebP.");
      return;
    }
    setProcesando(true);
    try {
      const reducida = await reducirImagen(archivo);
      if (reducida.length > maxImagenBytes * 1.37) {
        setErrorImagen("La imagen pesa demasiado. Prueba con una más pequeña.");
        return;
      }
      setImagen(reducida);
      setImagenNueva(reducida);
      setQuitada(false);
    } catch {
      setErrorImagen("No se pudo leer la imagen. Prueba con otra.");
    } finally {
      setProcesando(false);
      if (archivoRef.current) archivoRef.current.value = "";
    }
  }

  function quitarImagen() {
    setImagen(null);
    setImagenNueva(null);
    setQuitada(Boolean(datos.imagenUrl));
    setErrorImagen(null);
  }

  const errorDe = (campo: CampoPromocion) =>
    estado && !estado.ok && estado.campo === campo ? estado.error : undefined;

  /* El contador va como descripción del campo: lo lee también un lector de pantalla. */
  const specTitulo: FieldSpec = { ...TITULO, error: errorDe("titulo"), description: `${titulo.length} de ${tituloMax} caracteres` };
  const specTexto: FieldSpec = { ...TEXTO, error: errorDe("texto"), description: `${texto.length} de ${textoMax} caracteres` };

  const alternar = (id: string, marcada: boolean) =>
    setElegidas((prev) => (marcada ? [...prev, id] : prev.filter((s) => s !== id)));

  /* FR-AD-PROM-8: lo que cuenta es cuántas se ven **a la vez** en algún día
     del periodo, no cuántas tocan el periodo en total: una de un mes junto a
     cuatro de una semana, una detrás de otra, nunca son más de dos en pantalla.
     Basta mirar el primer día y cada día en que empieza otra. */
  const coincidencias = elegidas.map((sedeId) => {
    let n = 0;
    if (desde && hasta) {
      const solapadas = otras.filter((o) => o.sedes.includes(sedeId) && o.desde <= hasta && desde <= o.hasta);
      const dias = [desde, ...solapadas.map((o) => o.desde).filter((d) => d > desde)];
      n = Math.max(0, ...dias.map((d) => solapadas.filter((o) => o.desde <= d && d <= o.hasta).length));
    }
    return { sedeId, nombre: sedes.find((s) => s.id === sedeId)?.name ?? sedeId, n };
  });
  const demasiadas = coincidencias.filter((c) => c.n + 1 > maxEnRotacion);

  return (
    <form action={accion} className="max-w-form-max">
      {datos.id ? <input type="hidden" name="id" value={datos.id} /> : null}
      <Card>
        <CardContent className="flex flex-col gap-6 pt-6">
          {estado && !estado.ok && !estado.campo ? (
            <Alert variant="error" title="No se pudo guardar">
              {estado.error}
            </Alert>
          ) : null}

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

          {/* **FR-AD-PROM-12**: imagen opcional. */}
          <div>
            <p className="text-label font-medium text-text-primary">Imagen (opcional)</p>
            <p id="promo-imagen-ayuda" className="mt-1 text-body-sm text-text-secondary">
              JPG, PNG o WebP. Se muestra entera, junto al título y el texto.
            </p>
            {imagenNueva ? <input type="hidden" name="imagen" value={imagenNueva} /> : null}
            {quitada ? <input type="hidden" name="quitar-imagen" value="1" /> : null}
            <input
              ref={archivoRef}
              id="promo-imagen"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              aria-describedby="promo-imagen-ayuda"
              disabled={enviando || procesando}
              onChange={(e) => void elegirImagen(e.target.files?.[0])}
            />
            {imagen ? (
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                {/* eslint-disable-next-line @next/next/no-img-element -- vista previa de la imagen elegida */}
                <img src={imagen} alt="Imagen de la promoción" className="h-32 w-auto max-w-full rounded-control border border-border object-contain" />
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button type="button" variant="secondary" size="sm" disabled={enviando || procesando} onClick={() => archivoRef.current?.click()}>
                    <ImagePlus aria-hidden="true" />
                    Cambiar imagen
                  </Button>
                  <Button type="button" variant="tertiary" size="sm" disabled={enviando || procesando} onClick={quitarImagen}>
                    <Trash2 aria-hidden="true" />
                    Quitar imagen
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mt-3"
                loading={procesando}
                disabled={enviando}
                onClick={() => archivoRef.current?.click()}
              >
                <ImagePlus aria-hidden="true" />
                Añadir imagen
              </Button>
            )}
            {errorImagen || errorDe("imagen") ? (
              <p role="alert" className="mt-2 text-body-sm font-semibold text-error">
                {errorImagen ?? errorDe("imagen")}
              </p>
            ) : null}
          </div>

          <fieldset className="min-w-0" aria-describedby={errorDe("sedes") ? "promo-sedes-error" : undefined}>
            <legend className="text-label font-medium text-text-primary">
              Sedes donde se muestra <span className="text-error">*</span>
            </legend>
            {errorDe("sedes") ? (
              <p id="promo-sedes-error" role="alert" className="mt-2 text-body-sm font-semibold text-error">
                {errorDe("sedes")}
              </p>
            ) : null}
            <ul className="mt-3 flex flex-col gap-1">
              {sedes.map((sede) => (
                <li key={sede.id}>
                  <label className="flex min-h-control-sm items-center gap-3 text-body text-text-primary">
                    <input
                      type="checkbox"
                      name="sede"
                      value={sede.id}
                      checked={elegidas.includes(sede.id)}
                      disabled={enviando}
                      onChange={(e) => alternar(sede.id, e.target.checked)}
                      className="size-5 shrink-0 accent-primary"
                    />
                    {sede.name}
                  </label>
                </li>
              ))}
            </ul>
            {sedes.length > 1 ? (
              <Button
                type="button"
                variant="tertiary"
                size="sm"
                className="mt-1"
                disabled={enviando || elegidas.length === sedes.length}
                onClick={() => setElegidas(sedes.map((s) => s.id))}
              >
                Marcar todas
              </Button>
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

          {/* **FR-AD-PROM-8**: cuántas coincidirían en cada sede, con esta. */}
          {coincidencias.length > 0 && desde && hasta ? (
            demasiadas.length > 0 ? (
              <Alert variant="warning" title="Demasiadas promociones a la vez">
                {demasiadas.map((c) => (
                  <p key={c.sedeId}>
                    En {c.nombre} llegaría a coincidir con {c.n} promociones más a la vez.
                  </p>
                ))}
                <p className="mt-1">
                  Cada una ocupa su propia pantalla durante 12 segundos: con más de {maxEnRotacion} a
                  la vez, un cliente que espera no llega a verlas todas.
                </p>
              </Alert>
            ) : (
              <ul className="flex flex-col gap-1 text-body-sm text-text-secondary">
                {coincidencias.map((c) => (
                  <li key={c.sedeId}>
                    {c.nombre}:{" "}
                    {c.n === 0
                      ? "sería la única promoción en pantalla esos días."
                      : `coincidiría con ${c.n === 1 ? "otra promoción" : `${c.n} promociones más`}.`}
                  </li>
                ))}
              </ul>
            )
          ) : null}

          {/* **FR-AD-PROM-7**: como se verá en la sala. */}
          <div>
            <p className="text-label font-medium text-text-primary">Así se verá en la pantalla de la sucursal</p>
            <VistaPrevia titulo={titulo} texto={texto} imagen={imagen} />
          </div>

          <div className="flex flex-col items-stretch gap-3 pt-2 sm:flex-row sm:items-center sm:justify-end">
            <Button variant="secondary" asChild>
              <Link href="/admin/promociones">Cancelar</Link>
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

/** La diapositiva de la pantalla informativa, en miniatura. */
export function VistaPrevia({
  titulo,
  texto,
  imagen = null,
}: {
  titulo: string;
  texto: string;
  imagen?: string | null;
}): React.JSX.Element {
  return (
    <div
      aria-label="Vista previa"
      className="mt-2 aspect-video w-full max-w-xl overflow-hidden rounded-card bg-primary p-[4%] text-[clamp(7px,2.2vw,12px)]"
    >
      <p className="text-[0.9em] font-semibold uppercase tracking-[0.12em] text-gold">PuntoCash</p>
      <p className="mt-[0.2em] text-[1.9em] font-bold leading-tight text-white">Promociones y avisos</p>
      <div
        className={cn(
          "mt-[1.2em] flex items-center gap-[1.6em] rounded-card border border-white/10 bg-white/[0.04] p-[1.6em]",
          imagen && "h-[68%] gap-[1.2em] p-[1.2em]",
        )}
      >
        {imagen ? (
          <div className="relative h-full basis-[55%] self-stretch overflow-hidden rounded-card">
            {/* eslint-disable-next-line @next/next/no-img-element -- vista previa */}
            <img src={imagen} alt="" className="absolute inset-0 size-full object-contain" />
          </div>
        ) : (
          <span aria-hidden="true" className="grid size-[3em] shrink-0 place-items-center rounded-pill bg-gold/15 text-gold">
            <Megaphone className="size-[1.5em]" />
          </span>
        )}
        <div className={cn("min-w-0", imagen && "basis-[45%]")}>
          <p className="break-words text-[1.75em] font-bold leading-tight text-white">
            {titulo || "Título de la promoción"}
          </p>
          <p className="mt-[0.4em] break-words text-[1.1em] leading-snug text-white/70">
            {texto || "El texto que acompaña al título."}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Reduce la imagen en el navegador antes de enviarla: como mucho 1920 px por
 * su lado mayor, que es una pantalla Full HD entera, y en WebP, que conserva la
 * transparencia de un PNG. Una foto de móvil de 6 MB queda en unos cientos de KB.
 */
async function reducirImagen(archivo: File): Promise<string> {
  const url = URL.createObjectURL(archivo);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    const escala = Math.min(1, 1920 / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.naturalWidth * escala));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * escala));
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    const webp = canvas.toDataURL("image/webp", 0.85);
    return webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}
