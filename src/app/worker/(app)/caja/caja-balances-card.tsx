import * as React from "react";
import { Coins } from "lucide-react";

import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import { CurrencyFlag } from "@/components/patterns/currency-flag";
import { formatAmount } from "@/lib/format";
import type { CajaBalance } from "@/features/caja/caja-data";

/**
 * "Saldos de caja" — the fund detail per currency. The flag is decorative
 * support next to the currency code, never the primary identifier (§15) —
 * code and amount alone must carry the meaning.
 */
export function CajaBalancesCard({
  balances,
}: {
  balances: readonly CajaBalance[];
}): React.JSX.Element {
  return (
    <Card>
      <CardHeader>
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className="grid size-9 shrink-0 place-items-center rounded-control bg-primary-subtle text-primary"
          >
            <Coins className="size-[18px]" />
          </span>
          <CardTitle>Saldos de caja</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="px-0 pb-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Moneda</TableHead>
              <TableHead numeric>Saldo actual</TableHead>
              <TableHead className="pr-6">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {balances.map((balance) => (
              <TableRow key={balance.currency}>
                <TableCell className="pl-6 font-semibold whitespace-nowrap">
                  <span className="flex items-center gap-2">
                    <CurrencyFlag currency={balance.currency} />
                    {balance.currency}
                  </span>
                </TableCell>
                <TableCell numeric className="pc-numeric whitespace-nowrap font-medium">
                  {formatAmount(balance.amount)}
                </TableCell>
                <TableCell className="pr-6 whitespace-nowrap">
                  {balance.low ? (
                    <Badge variant="warning">Nivel bajo</Badge>
                  ) : (
                    <Badge variant="success">Normal</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
