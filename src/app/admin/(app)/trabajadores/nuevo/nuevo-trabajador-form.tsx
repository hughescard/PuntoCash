"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { CircleCheck, UserPlus } from "lucide-react";

import {
  Alert,
  Button,
  Card,
  CardContent,
  Field,
  fieldAria,
  Input,
  type FieldSpec,
} from "@/components/ui";
import { DOCUMENT_TYPES } from "@/features/customers/customers";
import { crearTrabajadorAction, type CampoDelAlta, type ResultadoAlta, type ValoresDelAlta } from "../_actions";
import { enviarSinReiniciar } from "@/lib/enviar-sin-reiniciar";

/**
 * Alta de un trabajador — **FR-AD-TRAB-3** a **FR-AD-TRAB-8**.
 *
 * **No hay ningún selector de caja**, y tampoco un texto que lo explique
 * (**FR-AD-TRAB-4**, **[A13]**). La v4.6 del documento pedía explicarlo «porque
 * es contraintuitivo»; esa contraintuición resultó ser de quien lee la
 * demostración, no de quien administra una casa de cambio y ya sabe que su
 * personal pertenece a una sucursal. El requisito se reescribió en la v4.7 y
 * la pantalla lo sigue: la ausencia de la caja es la explicación.
 *
 * **El correo tampoco se explica** (**FR-AD-TRAB-6**, **[R13]**). Sigue siendo
 * obligatorio porque es el canal del segundo factor, pero eso es una razón del
 * sistema, no una instrucción para quien rellena: un campo «Correo
 * electrónico» en el alta de alguien que va a iniciar sesión no necesita
 * justificarse. La v4.8 retiró esa obligación del requisito por la misma
 * razón que la v4.7 retiró la de la sede.
 *
 * Las dos descripciones que **sí** quedan dicen algo que la etiqueta no:
 * que el identificador **no es el correo** —quien lo lea por primera vez
 * asumirá lo contrario— y que la lista de sedes está **recortada al
 * alcance**, que explica por qué falta una sede que la empresa sí tiene.
 *
 * El desenlace **no vuelve al listado**: lo siguiente que tiene que pasar es
 * que alguien lea la credencial inicial y la entregue, y eso no cabe en una
 * fila de tabla (**FR-AD-TRAB-8**).
 */

const campo = (id: string, label: string, extra: Partial<FieldSpec> = {}): FieldSpec => ({
  id: `trabajador-${id}`,
  label,
  required: true,
  ...extra,
});

const NOMBRE = campo("nombre", "Nombre");
const PRIMER = campo("primer-apellido", "Primer apellido");
const SEGUNDO = campo("segundo-apellido", "Segundo apellido", { required: false });
const TIPO_DOC = campo("tipo-documento", "Tipo de documento");
const DOCUMENTO = campo("documento", "Número de documento");
const TELEFONO = campo("telefono", "Teléfono");
const CORREO = campo("correo", "Correo electrónico");
const IDENTIFICADOR = campo("identificador", "Identificador de acceso", {
  description: "Con esto inicia sesión. No es su correo.",
});
const SEDE = campo("sede", "Sede", { description: "Solo aparecen las sedes que administras." });

const SELECT_CLASS =
  "h-control w-full rounded-control border border-border bg-surface px-4 text-body text-text-primary outline-none hover:border-border-strong focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:bg-surface-subtle";

export function NuevoTrabajadorForm({
  sedes,
}: {
  sedes: readonly { id: string; name: string; suspendida: boolean }[];
}): React.JSX.Element {
  const [estado, accion, enviando] = React.useActionState<ResultadoAlta, FormData>(
    crearTrabajadorAction,
    null,
  );

  if (estado?.ok) return <CredencialInicial resultado={estado} />;

  const unica = sedes.length === 1 ? sedes[0] : undefined;
  const errorDe = (nombre: CampoDelAlta) =>
    estado && !estado.ok && estado.campo === nombre ? estado.error : undefined;

  /* React reinicia los campos no controlados cuando la acción del formulario
     termina, así que tras un rechazo hay que reponerlos: sin esto, corregir un
     identificador repetido obliga a reteclear los otros ocho campos. */
  const previo: ValoresDelAlta | undefined = estado && !estado.ok ? estado.valores : undefined;

  return (
    <form onSubmit={enviarSinReiniciar(accion)} className="max-w-form-max" noValidate>
      <Card>
        <CardContent className="flex flex-col gap-6 pt-6">
          {/* Un rechazo que no pertenece a ningún campo concreto se dice
              arriba; los que sí, van pegados al suyo. */}
          {estado && !estado.ok && !estado.campo ? (
            <Alert variant="error" title="No se pudo dar de alta">
              {estado.error}
            </Alert>
          ) : null}

          <div className="grid gap-6 sm:grid-cols-2">
            <Field {...NOMBRE} error={errorDe("nombre")}>
              <Input
                {...fieldAria({ ...NOMBRE, error: errorDe("nombre") })}
                name="nombre"
                autoFocus
                disabled={enviando}
                defaultValue={previo?.nombre}
              />
            </Field>
            <Field {...PRIMER} error={errorDe("primer-apellido")}>
              <Input
                {...fieldAria({ ...PRIMER, error: errorDe("primer-apellido") })}
                name="primer-apellido"
                disabled={enviando}
                defaultValue={previo?.primerApellido}
              />
            </Field>
            <Field {...SEGUNDO}>
              <Input
                {...fieldAria(SEGUNDO)}
                name="segundo-apellido"
                disabled={enviando}
                defaultValue={previo?.segundoApellido}
              />
            </Field>
            <Field {...TIPO_DOC}>
              <select
                {...fieldAria(TIPO_DOC)}
                name="tipo-documento"
                defaultValue={previo?.tipoDocumento || "CI"}
                disabled={enviando}
                className={SELECT_CLASS}
              >
                {DOCUMENT_TYPES.map((tipo) => (
                  <option key={tipo.value} value={tipo.value}>
                    {tipo.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field {...DOCUMENTO} error={errorDe("documento")}>
              <Input
                {...fieldAria({ ...DOCUMENTO, error: errorDe("documento") })}
                name="documento"
                inputMode="numeric"
                defaultValue={previo?.documento}
                disabled={enviando}
                invalid={Boolean(errorDe("documento"))}
                className="pc-numeric"
              />
            </Field>
            <Field {...TELEFONO} error={errorDe("telefono")}>
              <Input
                {...fieldAria({ ...TELEFONO, error: errorDe("telefono") })}
                name="telefono"
                type="tel"
                defaultValue={previo?.telefono}
                disabled={enviando}
                placeholder="+53 5 000 0000"
                className="pc-numeric"
              />
            </Field>
          </div>

          <Field {...CORREO} error={errorDe("correo")}>
            <Input
              {...fieldAria({ ...CORREO, error: errorDe("correo") })}
              name="correo"
              type="email"
              defaultValue={previo?.correo}
              inputMode="email"
              disabled={enviando}
              invalid={Boolean(errorDe("correo"))}
              placeholder="nombre@empresa.cu"
            />
          </Field>

          <Field {...IDENTIFICADOR} error={errorDe("identificador")}>
            <Input
              {...fieldAria({ ...IDENTIFICADOR, error: errorDe("identificador") })}
              name="identificador"
              defaultValue={previo?.identificador}
              disabled={enviando}
              invalid={Boolean(errorDe("identificador"))}
              placeholder="jperez"
            />
          </Field>

          {unica ? (
            <>
              <input type="hidden" name="sede" value={unica.id} />
              <div>
                <p className="text-label font-medium text-text-primary">Sede</p>
                <p className="mt-1 text-body text-text-secondary">{unica.name}</p>
              </div>
            </>
          ) : (
            <Field {...SEDE} error={errorDe("sede")}>
              <select
                {...fieldAria({ ...SEDE, error: errorDe("sede") })}
                name="sede"
                defaultValue={previo?.sede ?? ""}
                disabled={enviando}
                className={SELECT_CLASS}
              >
                <option value="" disabled>
                  Elige una sede
                </option>
                {sedes.map((sede) => (
                  <option key={sede.id} value={sede.id}>
                    {sede.name}
                    {sede.suspendida ? " · suspendida" : ""}
                  </option>
                ))}
              </select>
            </Field>
          )}


          <div className="flex flex-col items-stretch gap-3 pt-2 sm:flex-row sm:items-center sm:justify-end">
            <Button variant="secondary" asChild>
              <Link href="/admin/trabajadores">Cancelar</Link>
            </Button>
            <Button type="submit" loading={enviando}>
              <UserPlus aria-hidden="true" />
              Dar de alta
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}

/**
 * **FR-AD-TRAB-8**: la credencial inicial, **una sola vez**.
 *
 * Lo dice con todas sus letras en vez de dejarlo a la intuición, porque quien
 * cierre esta pantalla sin copiarla tendrá que regenerarla, y eso es una
 * molestia evitable con una frase.
 */
function CredencialInicial({
  resultado,
}: {
  resultado: Extract<ResultadoAlta, { ok: true }>;
}): React.JSX.Element {
  return (
    <div className="flex max-w-form-max flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col gap-5 pt-6">
          <p className="flex items-center gap-2 text-section-title text-text-primary">
            <CircleCheck className="size-5 shrink-0 text-success" aria-hidden="true" />
            {resultado.nombre} ya puede operar en {resultado.sede}
          </p>

          <div className="rounded-control border border-border bg-surface-subtle px-4 py-4">
            <p className="text-caption uppercase text-text-secondary">Identificador de acceso</p>
            <p className="pc-numeric mt-1 text-body text-text-primary">
              {resultado.identificador}
            </p>

            <p className="mt-4 text-caption uppercase text-text-secondary">Credencial inicial</p>
            <p className="pc-numeric mt-1 text-screen-title tracking-wide text-text-primary">
              {resultado.credencial}
            </p>
          </div>

          <Alert variant="warning" title="Cópiala ahora: no se podrá volver a consultar">
            Entrégasela en persona junto con su identificador. Si se pierde, habrá que regenerarla
            desde su ficha — nadie, ni tú, puede volver a leer esta.
          </Alert>
        </CardContent>
      </Card>

      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
        <Button variant="secondary" asChild>
          <Link href="/admin/trabajadores/nuevo">Dar de alta a otro</Link>
        </Button>
        <Button asChild>
          <Link href={`/admin/trabajadores/${resultado.trabajadorId}` as Route}>Ver su ficha</Link>
        </Button>
      </div>
    </div>
  );
}
