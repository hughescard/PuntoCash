import * as React from "react";

import { Alert, Card, CardContent } from "@/components/ui";
import { formatMoney } from "@/lib/format";
import {
  kioskClientFullName,
  type KioskBeneficiaryInput,
  type KioskClientInput,
} from "@/features/kiosk/self-service-request";
import { documentTypeShortLabel } from "@/features/customers/customers";
import { findMunicipality, findProvince } from "@/features/geography/cuba-provinces";

export function StepRevisionEnviarGiro({
  sender,
  beneficiary,
  senderCurrency,
  deliveryAmount,
}: {
  sender: KioskClientInput;
  beneficiary: KioskBeneficiaryInput;
  senderCurrency: string;
  deliveryAmount: number;
}): React.JSX.Element {
  const provinceLabel = findProvince(beneficiary.receiverProvince)?.label ?? beneficiary.receiverProvince;
  const municipalityLabel =
    findMunicipality(beneficiary.receiverProvince, beneficiary.receiverMunicipality)?.label ??
    beneficiary.receiverMunicipality;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <Row label="Remitente">
            <span className="font-semibold text-text-primary">{kioskClientFullName(sender)}</span>
          </Row>
          <hr className="border-t border-dashed border-border" />
          <Row label="Documento">
            <span className="pc-numeric text-text-primary">
              {documentTypeShortLabel(sender.documentType)} · {sender.documentNumber}
            </span>
          </Row>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <Row label="Beneficiario">
            <span className="font-semibold text-text-primary">{beneficiary.receiverName}</span>
          </Row>
          <hr className="border-t border-dashed border-border" />
          <Row label="Provincia / Municipio">
            <span className="text-text-primary">
              {provinceLabel} / {municipalityLabel}
            </span>
          </Row>
          <hr className="border-t border-dashed border-border" />
          <Row label="Teléfono">
            <span className="pc-numeric text-text-primary">{beneficiary.receiverPhone}</span>
          </Row>
          <hr className="border-t border-dashed border-border" />
          <Row label="Carné de identidad">
            <span className="pc-numeric text-text-primary">{beneficiary.receiverIdentification}</span>
          </Row>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <Row label="Monto a enviar">
            <span className="pc-numeric font-semibold text-text-primary">
              {formatMoney({ amount: deliveryAmount, currency: senderCurrency })}
            </span>
          </Row>
        </CardContent>
      </Card>

      <Alert variant="info" title="Esto todavía no es una operación">
        Al confirmar, recibirás un código para presentar en caja. Allí entregas el efectivo y recibes
        el código del giro, que es el que debes compartir con el beneficiario.
      </Alert>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-body-sm text-text-secondary">{label}</span>
      {children}
    </div>
  );
}
