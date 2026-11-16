"use client";

import * as React from "react";
import Link from "next/link";
import { Save } from "lucide-react";

import { Alert, Button, Card, CardContent, Field, fieldAria, Input, type FieldSpec } from "@/components/ui";
import { IDENTIFICADOR_MAX, IDENTIFICADOR_MIN } from "@/features/auth/identificador";
import { editarDatosPropiosAction, type ResultadoDatosPropios, type ValoresDeDatosPropios } from "../_actions";

const USUARIO: FieldSpec = {
  id: "perfil-usuario",
  label: "Nombre de usuario",
  description: `Con él entras sin escribir el correo. De ${IDENTIFICADOR_MIN} a ${IDENTIFICADOR_MAX} caracteres: letras, números, punto, guion o guion bajo. Sin «@».`,
};
const TELEFONO: FieldSpec = { id: "perfil-telefono", label: "Teléfono" };

export function EditarDatosPropiosForm({ inicial }: { inicial: ValoresDeDatosPropios }): React.JSX.Element {
  const [estado, accion, enviando] = React.useActionState<ResultadoDatosPropios, FormData>(editarDatosPropiosAction, null);
  const valores = estado?.valores ?? inicial;

  return (
    <form action={accion} className="max-w-form-max">
      <Card>
        <CardContent className="flex flex-col gap-6 pt-6">
          {estado && !estado.ok ? (
            <Alert variant="error" title="No se pudo guardar">
              {estado.error}
            </Alert>
          ) : null}
          <Field {...USUARIO} error={estado?.campo === "usuario" ? estado.error : undefined}>
            <Input
              {...fieldAria({ ...USUARIO, error: estado?.campo === "usuario" ? estado.error : undefined })}
              name="usuario"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              defaultValue={valores.usuario}
              key={`u-${valores.usuario}`}
              disabled={enviando}
            />
          </Field>
          <Field {...TELEFONO} error={estado?.campo === "telefono" ? estado.error : undefined}>
            <Input
              {...fieldAria({ ...TELEFONO, error: estado?.campo === "telefono" ? estado.error : undefined })}
              name="telefono"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              defaultValue={valores.telefono}
              key={`t-${valores.telefono}`}
              disabled={enviando}
              className="pc-numeric"
            />
          </Field>
          <p className="text-body-sm text-text-secondary">
            Si cambias tu nombre de usuario, el anterior deja de servir para entrar. Tu contraseña no cambia.
          </p>
          <div className="pc-botonera sm:justify-end">
            <Button variant="secondary" asChild>
              <Link href="/worker/perfil">Cancelar</Link>
            </Button>
            <Button type="submit" loading={enviando}>
              <Save aria-hidden="true" />
              Guardar
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
