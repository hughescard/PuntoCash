import * as React from "react";

import { Alert, Card, CardContent } from "@/components/ui";
import { CurrencyFlag } from "@/components/patterns/currency-flag";
import { formatMoney } from "@/lib/format";
import type { ExchangeQuote } from "@/features/exchange/quote";
import { kioskClientFullName, type KioskClientInput } from "@/features/kiosk/self-service-request";
import { documentTypeShortLabel } from "@/features/customers/customers";
import { formatAppliedRate } from "./step-datos";

export function StepRevisionAutoservicio({
  quote,
  client,
}: {
  quote: ExchangeQuote;
  client: KioskClientInput;
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <Row label="Entregas">
            <span className="flex items-center gap-2">
              <CurrencyFlag currency={quote.sourceCurrency} />
              <span className="pc-numeric font-semibold text-text-primary">
                {formatMoney({ amount: quote.sourceAmount, currency: quote.sourceCurrency })}
              </span>
            </span>
          </Row>
          <hr className="border-t border-dashed border-border" />
          <Row label="Recibes">
            <span className="flex items-center gap-2">
              <CurrencyFlag currency={quote.destinationCurrency} />
              <span className="pc-numeric font-semibold text-text-primary">
                {formatMoney({ amount: quote.destinationAmount, currency: quote.destinationCurrency })}
              </span>
            </span>
          </Row>
          <hr className="border-t border-dashed border-border" />
          <Row label="Tasa aplicada">
            <span className="pc-numeric font-semibold text-text-primary">
              {formatAppliedRate(quote)}
            </span>
          </Row>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <Row label="Solicitante">
            <span className="font-semibold text-text-primary">{kioskClientFullName(client)}</span>
          </Row>
          <hr className="border-t border-dashed border-border" />
          <Row label="Documento">
            <span className="pc-numeric text-text-primary">
              {documentTypeShortLabel(client.documentType)} · {client.documentNumber}
            </span>
          </Row>
          <hr className="border-t border-dashed border-border" />
          <Row label="Teléfono">
            <span className="pc-numeric text-text-primary">{client.phone}</span>
          </Row>
        </CardContent>
      </Card>

      <Alert variant="info" title="Esto todavía no es una operación">
        Al confirmar, recibirás un código para completar el cambio en caja. La tasa se recalculará
        si tarda demasiado en presentarse.
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
