"use client";

import * as React from "react";
import { UserRound } from "lucide-react";

import {
  Alert,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Field,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  fieldAria,
  type FieldSpec,
} from "@/components/ui";
import { PROVINCE_CATALOG, getMunicipalitiesForProvince } from "@/features/geography/cuba-provinces";
import type { KioskBeneficiaryInput } from "@/features/kiosk/self-service-request";

const FIELDS = {
  receiverName: { id: "giro-beneficiario-nombre", label: "Nombre completo", required: true },
  receiverPhone: { id: "giro-beneficiario-telefono", label: "Teléfono", required: true },
  receiverAddress: { id: "giro-beneficiario-direccion", label: "Dirección", required: true },
  receiverProvince: { id: "giro-beneficiario-provincia", label: "Provincia", required: true },
  receiverMunicipality: { id: "giro-beneficiario-municipio", label: "Municipio", required: true },
  receiverIdentification: {
    id: "giro-beneficiario-documento",
    label: "Carné de identidad del beneficiario",
    required: true,
  },
} as const satisfies Record<keyof KioskBeneficiaryInput, FieldSpec>;

type FieldKey = keyof KioskBeneficiaryInput;

/**
 * "¿Quién va a cobrar este giro?" — the kiosk equivalent of the Worker's own
 * Beneficiario section, with everything the real giro requires (only the
 * optional correo is left out), so the Worker can register it at the counter
 * without retyping anything.
 */
export function StepBeneficiario({
  formId,
  beneficiary,
  onChange,
  onContinue,
}: {
  formId: string;
  beneficiary: KioskBeneficiaryInput;
  onChange: (beneficiary: KioskBeneficiaryInput) => void;
  onContinue: () => void;
}): React.JSX.Element {
  const [errors, setErrors] = React.useState<Partial<Record<FieldKey, string>>>({});
  const municipalities = getMunicipalitiesForProvince(beneficiary.receiverProvince);

  function set<K extends FieldKey>(key: K, value: KioskBeneficiaryInput[K]) {
    onChange({ ...beneficiary, [key]: value });
  }

  function setProvince(code: string) {
    // Changing Province clears an incompatible Municipality, mirroring the
    // Worker's own Enviar giro screen.
    const stillValid = getMunicipalitiesForProvince(code).some(
      (m) => m.code === beneficiary.receiverMunicipality,
    );
    onChange({
      ...beneficiary,
      receiverProvince: code,
      receiverMunicipality: stillValid ? beneficiary.receiverMunicipality : "",
    });
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: Partial<Record<FieldKey, string>> = {};
    for (const key of Object.keys(FIELDS) as FieldKey[]) {
      if (!beneficiary[key].trim()) nextErrors[key] = "Este dato es obligatorio.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) onContinue();
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className="grid size-9 shrink-0 place-items-center rounded-control bg-primary-subtle text-primary"
          >
            <UserRound className="size-[18px]" />
          </span>
          <div className="min-w-0">
            <CardTitle>¿Quién va a cobrar este giro?</CardTitle>
            <p className="mt-1 text-body-sm text-text-secondary">
              Un trabajador confirmará estos datos con el beneficiario al momento del pago.
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Alert variant="info" title="Revisa bien estos datos" className="mb-6">
          El beneficiario deberá presentar este mismo carné para cobrar el giro.
        </Alert>

        <form noValidate onSubmit={submit} className="flex flex-col gap-5" id={formId}>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <TextField
              spec={FIELDS.receiverName}
              value={beneficiary.receiverName}
              error={errors.receiverName}
              onChange={(v) => set("receiverName", v)}
            />
            <TextField
              spec={FIELDS.receiverPhone}
              value={beneficiary.receiverPhone}
              error={errors.receiverPhone}
              onChange={(v) => set("receiverPhone", v)}
              type="tel"
            />
            <TextField
              spec={FIELDS.receiverAddress}
              value={beneficiary.receiverAddress}
              error={errors.receiverAddress}
              onChange={(v) => set("receiverAddress", v)}
              className="md:col-span-2"
            />
            <TextField
              spec={FIELDS.receiverIdentification}
              value={beneficiary.receiverIdentification}
              error={errors.receiverIdentification}
              onChange={(v) => set("receiverIdentification", v)}
              className="md:col-span-2"
            />

            <Field {...FIELDS.receiverProvince} error={errors.receiverProvince}>
              <Select value={beneficiary.receiverProvince || undefined} onValueChange={setProvince}>
                <SelectTrigger size="lg" {...fieldAria(FIELDS.receiverProvince)}>
                  <SelectValue placeholder="Selecciona una provincia" />
                </SelectTrigger>
                <SelectContent>
                  {PROVINCE_CATALOG.map((province) => (
                    <SelectItem key={province.code} value={province.code}>
                      {province.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field {...FIELDS.receiverMunicipality} error={errors.receiverMunicipality}>
              <Select
                value={beneficiary.receiverMunicipality || undefined}
                onValueChange={(v) => set("receiverMunicipality", v)}
                disabled={!beneficiary.receiverProvince}
              >
                <SelectTrigger size="lg" {...fieldAria(FIELDS.receiverMunicipality)}>
                  <SelectValue
                    placeholder={
                      beneficiary.receiverProvince
                        ? "Selecciona un municipio"
                        : "Primero selecciona una provincia"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {municipalities.map((municipality) => (
                    <SelectItem key={municipality.code} value={municipality.code}>
                      {municipality.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function TextField({
  spec,
  value,
  error,
  onChange,
  type = "text",
  className,
}: {
  spec: FieldSpec;
  value: string;
  error: string | undefined;
  onChange: (value: string) => void;
  type?: string;
  className?: string;
}) {
  return (
    <Field {...spec} error={error} className={className}>
      <Input
        {...fieldAria({ ...spec, error })}
        size="lg"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        invalid={Boolean(error)}
        autoComplete="off"
      />
    </Field>
  );
}
