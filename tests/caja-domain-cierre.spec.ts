import { expect, test } from "@playwright/test";

import {
  CAJA_BALANCES,
  CAJA_MOVEMENTS,
  abrirJornada,
  cerrarJornada,
  getJornadaActual,
} from "@/features/caja/caja-data";

function openDomainJornada() {
  abrirJornada({
    register: "Caja 03",
    worker: "Juan Pérez",
    openedAt: new Date("2026-08-21T08:00:00"),
    fondos: [
      { currency: "CUP", amount: 200_000 },
      { currency: "USD", amount: 4_250 },
      { currency: "EUR", amount: 1_185 },
    ],
  });
}

test.describe.serial("cerrarJornada — domain audit", () => {
  test("validates first, then closes a perfectly balanced jornada without creating movements", () => {
    openDomainJornada();
    const movementCount = CAJA_MOVEMENTS.length;
    const openedAt = getJornadaActual()!.openedAt;

    const outcome = cerrarJornada({
      worker: "Juan Pérez",
      timestamp: new Date("2026-08-21T12:00:00"),
      currencies: CAJA_BALANCES.map((balance) => ({ currency: balance.currency, counted: balance.amount })),
    });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.movements).toHaveLength(0);
    expect(CAJA_MOVEMENTS).toHaveLength(movementCount);
    expect(outcome.result.jornada.status).toBe("CLOSED");
    expect(outcome.result.jornada.closedAt).toBe(new Date("2026-08-21T12:00:00").toISOString());
    expect(outcome.result.jornada.openedAt).toBe(openedAt);
    expect(outcome.result.audit.result).toEqual({ audited: 4, balanced: 4, withDifferences: 0 });
  });

  test("persists closing adjustments and final balances from counted cash", () => {
    // The prior test deliberately closed its jornada, so this is a clean next one.
    openDomainJornada();
    const outcome = cerrarJornada({
      worker: "Juan Pérez",
      timestamp: new Date("2026-08-21T13:00:00"),
      currencies: CAJA_BALANCES.map((balance) => {
        if (balance.currency === "USD") return { currency: "USD", counted: 4_240, motivo: "Faltante detectado" as const, observaciones: "Conteo repetido." };
        if (balance.currency === "EUR") return { currency: "EUR", counted: 1_200, motivo: "Sobrante detectado" as const };
        return { currency: balance.currency, counted: balance.amount };
      }),
    });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.movements).toHaveLength(2);
    expect(outcome.result.movements.find((movement) => movement.currency === "USD")).toMatchObject({
      concepto: "Ajuste de cierre", tipo: "salida", amount: -10, saldoAntes: 4250, saldoDespues: 4240, motivo: "Faltante detectado",
    });
    expect(outcome.result.movements.find((movement) => movement.currency === "EUR")).toMatchObject({
      concepto: "Ajuste de cierre", tipo: "entrada", amount: 15, saldoAntes: 1185, saldoDespues: 1200, motivo: "Sobrante detectado",
    });
    expect(CAJA_BALANCES.find((balance) => balance.currency === "USD")?.amount).toBe(4240);
    expect(CAJA_BALANCES.find((balance) => balance.currency === "EUR")?.amount).toBe(1200);
    expect(outcome.result.jornada.closingAudit?.currencies).toHaveLength(4);
  });
});
