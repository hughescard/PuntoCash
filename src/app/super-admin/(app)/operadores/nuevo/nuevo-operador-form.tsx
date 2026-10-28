"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { Building2, CircleCheck } from "lucide-react";

import { Alert, Button, Card, CardContent, Field, fieldAria, Input, type FieldSpec } from "@/components/ui";
import { enviarSinReiniciar } from "@/lib/enviar-sin-reiniciar";
import { crearOperadorAction, type CampoAltaOperador, type ResultadoAltaOperador } from "../_actions";

const campo = (id: string, label: string, extra: Partial<FieldSpec> = {}): FieldSpec => ({
  id: `operador-${id}`,
  label,
  required: true,
  ...extra,
});

const NOMBRE = campo("nombre", "Nombre o razón social");
const TIPO = campo("tipo-documento", "Tipo de documento");
const DOCUMENTO = campo("documento", "Número de documento");
const CONTACTO = campo("contacto", "Persona de contacto");
const TELEFONO = campo("telefono", "Teléfono");
const CORREO = campo("correo", "Correo electrónico");

const U_NOMBRE = campo("usuario-nombre", "Nombre");
const U_APELLIDO = campo("usuario-apellido", "Primer apellido");
const U_SEGUNDO = campo("usuario-segundo-apellido", "Segundo apellido", { required: false });
const U_TELEFONO = campo("usuario-telefono", "Teléfono");
const U_CORREO = campo("usuario-correo", "Correo electrónico", {
  description: "Es donde recibirá su código de verificación en cada inicio de sesión.",
});
const U_IDENT = campo("usuario-identificador", "Identificador de acceso", {
  description: "Con esto inicia sesión. No tiene que ser su correo.",
});

const SELECT =
  "h-control w-full rounded-control border border-border bg-surface px-4 text-body text-text-primary outline-none hover:border-border-strong focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:bg-surface-subtle";

export function NuevoOperadorForm(): React.JSX.Element {
  const [estado, accion, enviando] = React.useActionState<ResultadoAltaOperador, FormData>(crearOperadorAction, null);
  if (estado?.ok) return <OperadorCreado resultado={estado} />;

  const errorDe = (c: CampoAltaOperador) => (estado && !estado.ok && estado.campo === c ? estado.error : undefined);
  const texto = (spec: FieldSpec, name: CampoAltaOperador | "usuario-segundo-apellido", extra: React.ComponentProps<typeof Input> = {}) => {
    const error = name === "usuario-segundo-apellido" ? undefined : errorDe(name);
    return (
      <Field {...spec} error={error}>
        <Input {...fieldAria({ ...spec, error })} name={name} disabled={enviando} invalid={Boolean(error)} {...extra} />
      </Field>
    );
  };

  return (
    <form onSubmit={enviarSinReiniciar(accion)} className="flex max-w-form-max flex-col gap-6" noValidate>
      {estado && !estado.ok && !estado.campo ? (
        <Alert variant="error" title="No se pudo dar de alta">
          {estado.error}
        </Alert>
      ) : null}

      <Card>
        <CardContent className="flex flex-col gap-6 pt-6">
          <h2 className="text-section-title text-text-primary">Operador</h2>
          {texto(NOMBRE, "nombre", { autoFocus: true })}
          <div className="grid gap-6 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]">
            <Field {...TIPO}>
              <select {...fieldAria(TIPO)} name="tipo-documento" defaultValue="NIT" disabled={enviando} className={SELECT}>
                <option value="NIT">NIT (empresa)</option>
                <option value="CI">Carné de identidad</option>
              </select>
            </Field>
            {texto(DOCUMENTO, "documento", { className: "pc-numeric" })}
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {texto(CONTACTO, "contacto")}
            {texto(TELEFONO, "telefono", { type: "tel", placeholder: "+53 5 000 0000", className: "pc-numeric" })}
          </div>
          {texto(CORREO, "correo", { type: "email", inputMode: "email", placeholder: "contacto@empresa.cu" })}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-6 pt-6">
          <div>
            <h2 className="text-section-title text-text-primary">Usuario administrador principal</h2>
            <p className="mt-1 text-body-sm text-text-secondary">La persona con la que la empresa entra por primera vez.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {texto(U_NOMBRE, "usuario-nombre")}
            {texto(U_APELLIDO, "usuario-apellido")}
            {texto(U_SEGUNDO, "usuario-segundo-apellido")}
            {texto(U_TELEFONO, "usuario-telefono", { type: "tel", placeholder: "+53 5 000 0000", className: "pc-numeric" })}
          </div>
          {texto(U_CORREO, "usuario-correo", { type: "email", inputMode: "email", placeholder: "nombre@empresa.cu" })}
          {texto(U_IDENT, "usuario-identificador")}
          <Alert variant="info" title="Los demás usuarios los crea la empresa">
            Este será el usuario con el que la empresa entra por primera vez. Desde su consola podrá crear los demás
            usuarios que necesite.
          </Alert>
        </CardContent>
      </Card>

      <p className="text-body-sm text-text-secondary">
        El alta no le entrega ninguna sede. Se la asignas después, desde su ficha o desde la de la sede.
      </p>

      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
        <Button variant="secondary" asChild>
          <Link href="/super-admin/operadores">Cancelar</Link>
        </Button>
        <Button type="submit" loading={enviando}>
          <Building2 aria-hidden="true" />
          Dar de alta
        </Button>
      </div>
    </form>
  );
}

function OperadorCreado({ resultado }: { resultado: Extract<ResultadoAltaOperador, { ok: true }> }): React.JSX.Element {
  return (
    <div className="flex max-w-form-max flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col gap-5 pt-6">
          <p className="flex items-center gap-2 text-section-title text-text-primary">
            <CircleCheck className="size-5 shrink-0 text-success" aria-hidden="true" />
            {resultado.nombre} está dado de alta
          </p>
          <p className="text-body text-text-secondary">
            Entrégale a <span className="font-medium text-text-primary">{resultado.usuario}</span> su identificador y
            esta credencial. Al entrar recibirá un código en {resultado.correo}.
          </p>
          <div className="rounded-control border border-border bg-surface-subtle px-4 py-4">
            <p className="text-caption uppercase text-text-secondary">Identificador de acceso</p>
            <p className="pc-numeric mt-1 text-body text-text-primary">{resultado.identificador}</p>
            <p className="mt-4 text-caption uppercase text-text-secondary">Credencial inicial</p>
            <p className="pc-numeric mt-1 text-screen-title tracking-wide text-text-primary">{resultado.credencial}</p>
          </div>
          <Alert variant="warning" title="Cópiala ahora: no se podrá volver a consultar">
            Si se pierde, se restablece el acceso desde la ficha del operador.
          </Alert>
        </CardContent>
      </Card>
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
        <Button variant="secondary" asChild>
          <Link href="/super-admin/operadores/nuevo">Dar de alta a otro</Link>
        </Button>
        <Button asChild>
          <Link href={`/super-admin/operadores/${resultado.operadorId}` as Route}>Ver su ficha y asignarle una sede</Link>
        </Button>
      </div>
    </div>
  );
}
