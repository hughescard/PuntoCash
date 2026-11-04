"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { CircleCheck, Store } from "lucide-react";

import { Alert, Button, Card, CardContent, Field, fieldAria, Input, type FieldSpec } from "@/components/ui";
import { HorarioEditor } from "@/components/patterns/horario-editor";
import { PROVINCIAS_DE_CUBA } from "@/features/geography/provincias-de-cuba";
import { horarioDe, LUNES_A_SABADO } from "@/features/network/horario";
import { enviarSinReiniciar } from "@/lib/enviar-sin-reiniciar";
import { crearSedeAction, type CampoDeAlta, type ResultadoAltaSede } from "../_actions";

/**
 * El formulario de alta de una sede, en tres secciones.
 *
 * Los datos de la sede son públicos: se ven en el kiosco y en la pantalla de
 * la sucursal, y en el selector de sede de las pantallas de la red. El
 * formulario lo dice una vez, en la sección donde se escriben.
 *
 * La asignación inicial es opcional: una sede puede existir antes de decidir
 * quién la opera. Si se elige operador, aparece el motivo, que queda en el
 * historial de asignaciones como el de cualquier otra.
 */

const campo = (id: string, label: string, extra: Partial<FieldSpec> = {}): FieldSpec => ({
  id: `sede-${id}`,
  label,
  required: true,
  ...extra,
});

const CODIGO = campo("codigo", "Código", { description: "De 2 a 8 letras o números. Único en la red." });
const NOMBRE = campo("nombre", "Nombre", { description: "El que verá el cliente. Por ejemplo: PuntoCash Marianao." });
const DIRECCION = campo("direccion", "Dirección");
const PROVINCIA = campo("provincia", "Provincia");
const MUNICIPIO = campo("municipio", "Municipio");
const TELEFONO = campo("telefono", "Teléfono");
const OPERADOR = campo("operador", "Operador", { required: false });
const MOTIVO = campo("motivo", "Motivo de la asignación", {
  description: "Al menos 10 caracteres. Queda en el historial de la sede.",
});

/** El horario más común de la red; se propone para no marcar seis días a mano. */
const HORARIO_HABITUAL = horarioDe(LUNES_A_SABADO, "09:00", "18:00");

const SELECT =
  "h-control w-full rounded-control border border-border bg-surface px-4 text-body text-text-primary outline-none hover:border-border-strong focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:bg-surface-subtle aria-[invalid=true]:border-error";

export function NuevaSedeForm({
  servicios,
  operadores,
}: {
  servicios: readonly { id: string; nombre: string; descripcion: string }[];
  operadores: readonly { id: string; nombre: string }[];
}): React.JSX.Element {
  const [estado, accion, enviando] = React.useActionState<ResultadoAltaSede, FormData>(crearSedeAction, null);
  const previo = estado && !estado.ok ? estado.valores : undefined;
  const [operador, setOperador] = React.useState(previo?.operador ?? "");

  if (estado?.ok) return <SedeCreada resultado={estado} />;

  /* Se envía sin reiniciar: tras un rechazo, React volvía los desplegables a
     su primera opción y el segundo envío salía «sin asignar» y sin provincia
     (ver `lib/enviar-sin-reiniciar.ts`). */
  const enviar = enviarSinReiniciar(accion);

  const errorDe = (c: CampoDeAlta) => (estado && !estado.ok && estado.campo === c ? estado.error : undefined);
  const diaConError = estado && !estado.ok ? estado.dia : undefined;
  const marcados = previo ? new Set(previo.servicios) : new Set(servicios.map((s) => s.id));

  return (
    <form onSubmit={enviar} className="flex max-w-form-max flex-col gap-6" noValidate>
      {estado && !estado.ok && !estado.campo ? (
        <Alert variant="error" title="No se pudo crear la sede">
          {estado.error}
        </Alert>
      ) : null}

      <Seccion titulo="Datos de la sede">
        <Alert variant="info" title="Estos datos son públicos">
          Se ven en el kiosco y en la pantalla de la sucursal, y en el selector de sede de las pantallas de la red.
        </Alert>

        <div className="grid gap-6 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]">
          <Field {...CODIGO} error={errorDe("codigo")}>
            <Input
              {...fieldAria({ ...CODIGO, error: errorDe("codigo") })}
              name="codigo"
              autoFocus
              autoCapitalize="characters"
              maxLength={8}
              disabled={enviando}
              invalid={Boolean(errorDe("codigo"))}
              defaultValue={previo?.codigo}
              className="pc-numeric uppercase"
            />
          </Field>
          <Field {...NOMBRE} error={errorDe("nombre")}>
            <Input
              {...fieldAria({ ...NOMBRE, error: errorDe("nombre") })}
              name="nombre"
              disabled={enviando}
              invalid={Boolean(errorDe("nombre"))}
              defaultValue={previo?.nombre ?? "PuntoCash "}
            />
          </Field>
        </div>

        <Field {...DIRECCION} error={errorDe("direccion")}>
          <Input
            {...fieldAria({ ...DIRECCION, error: errorDe("direccion") })}
            name="direccion"
            disabled={enviando}
            invalid={Boolean(errorDe("direccion"))}
            defaultValue={previo?.direccion}
          />
        </Field>

        <div className="grid gap-6 sm:grid-cols-2">
          <Field {...PROVINCIA} error={errorDe("provincia")}>
            <select
              {...fieldAria({ ...PROVINCIA, error: errorDe("provincia") })}
              name="provincia"
              disabled={enviando}
              defaultValue={previo?.provincia ?? ""}
              className={SELECT}
            >
              <option value="" disabled>
                Elige la provincia
              </option>
              {PROVINCIAS_DE_CUBA.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Field>
          <Field {...MUNICIPIO} error={errorDe("municipio")}>
            <Input
              {...fieldAria({ ...MUNICIPIO, error: errorDe("municipio") })}
              name="municipio"
              disabled={enviando}
              invalid={Boolean(errorDe("municipio"))}
              defaultValue={previo?.municipio}
            />
          </Field>
          <Field {...TELEFONO} error={errorDe("telefono")}>
            <Input
              {...fieldAria({ ...TELEFONO, error: errorDe("telefono") })}
              name="telefono"
              type="tel"
              disabled={enviando}
              invalid={Boolean(errorDe("telefono"))}
              defaultValue={previo?.telefono}
              placeholder="+53 7 000 0000"
              className="pc-numeric"
            />
          </Field>
        </div>

        <HorarioEditor inicial={HORARIO_HABITUAL} disabled={enviando} error={errorDe("horario")} diaConError={diaConError} />
      </Seccion>

      <Seccion titulo="Servicios" descripcion="Lo que la sede podrá ofrecer. Al menos uno.">
        <fieldset aria-describedby={errorDe("servicios") ? "sede-servicios-error" : undefined}>
          <legend className="sr-only">Servicios habilitados</legend>
          {errorDe("servicios") ? (
            <p id="sede-servicios-error" role="alert" className="mb-3 text-body-sm font-semibold text-error">
              {errorDe("servicios")}
            </p>
          ) : null}
          <ul className="flex flex-col divide-y divide-border rounded-card border border-border">
            {servicios.map((s) => (
              <li key={s.id}>
                <label className="flex items-start gap-3 px-4 py-3">
                  <input
                    type="checkbox"
                    name="servicio"
                    value={s.id}
                    defaultChecked={marcados.has(s.id)}
                    disabled={enviando}
                    className="mt-0.5 size-5 shrink-0 accent-primary"
                  />
                  <span className="flex flex-col">
                    <span className="text-body font-medium text-text-primary">{s.nombre}</span>
                    <span className="text-body-sm text-text-secondary">{s.descripcion}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      </Seccion>

      <Seccion
        titulo="Asignación inicial"
        descripcion="A quién se entrega la sede. Puedes dejarla sin asignar y entregarla más adelante desde su ficha."
      >
        <Field {...OPERADOR} error={errorDe("operador")}>
          <select
            {...fieldAria({ ...OPERADOR, error: errorDe("operador") })}
            name="operador"
            disabled={enviando}
            value={operador}
            onChange={(e) => setOperador(e.currentTarget.value)}
            className={SELECT}
          >
            <option value="">Sin asignar por ahora</option>
            {operadores.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nombre}
              </option>
            ))}
          </select>
        </Field>

        {operador ? (
          <Field {...MOTIVO} error={errorDe("motivo")}>
            <Input
              {...fieldAria({ ...MOTIVO, error: errorDe("motivo") })}
              name="motivo"
              disabled={enviando}
              invalid={Boolean(errorDe("motivo"))}
              defaultValue={previo?.motivo}
            />
          </Field>
        ) : (
          <p className="text-body-sm text-text-secondary">
            Sin operador, la sede no puede operar: nadie puede crearle cajas ni sus trabajadores pueden entrar.
          </p>
        )}
      </Seccion>

      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
        <Button variant="secondary" asChild>
          <Link href="/super-admin/sedes">Cancelar</Link>
        </Button>
        <Button type="submit" loading={enviando}>
          <Store aria-hidden="true" />
          Crear la sede
        </Button>
      </div>
    </form>
  );
}

function Seccion({
  titulo,
  descripcion,
  children,
}: {
  titulo: string;
  descripcion?: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <Card>
      <CardContent className="flex flex-col gap-6 pt-6">
        <div>
          <h2 className="text-section-title text-text-primary">{titulo}</h2>
          {descripcion ? <p className="mt-1 text-body-sm text-text-secondary">{descripcion}</p> : null}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function SedeCreada({ resultado }: { resultado: Extract<ResultadoAltaSede, { ok: true }> }): React.JSX.Element {
  return (
    <div className="flex max-w-form-max flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <p className="flex items-center gap-2 text-section-title text-text-primary">
            <CircleCheck className="size-5 shrink-0 text-success" aria-hidden="true" />
            {resultado.nombre} está creada
          </p>
          {resultado.operador ? (
            <p className="text-body text-text-secondary">
              Entregada a <span className="font-medium text-text-primary">{resultado.operador}</span>. Todavía no tiene
              cajas ni equipos: su administrador debe crearlas y vincular un equipo a cada una antes de que pueda operar.
            </p>
          ) : (
            <p className="text-body text-text-secondary">
              Está sin asignar. Hasta que la entregues a un operador no puede operar: asígnala desde su ficha.
            </p>
          )}
        </CardContent>
      </Card>
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
        <Button variant="secondary" asChild>
          <Link href="/super-admin/sedes/nueva">Crear otra sede</Link>
        </Button>
        <Button asChild>
          <Link href={`/super-admin/sedes/${resultado.sedeId}` as Route}>Ver su ficha</Link>
        </Button>
      </div>
    </div>
  );
}
