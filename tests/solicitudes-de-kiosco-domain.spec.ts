import { test, expect } from "@playwright/test";

import {
  canjearSolicitudDeKiosco,
  consultarSolicitudDeKiosco,
  registrarSolicitudDeKiosco,
  VIGENCIA_DE_SOLICITUD_MINUTOS,
} from "../src/features/network/solicitudes-de-kiosco";

/**
 * Las solicitudes del kiosco en la red: de qué sede son, dónde se canjean,
 * cuándo vencen y que no se canjean dos veces.
 */

const ORIGEN = { branchId: "sede-vedado", deviceId: "KIO-0001-0001" };
const REMESA = {
  service: "remesas" as const,
  data: {
    code: "RM-7X82-9KLM",
    remittance: {
      id: "srv-rem-001",
      code: "RM-7X82-9KLM",
      receiverName: "María Pérez García",
      deliveryAmount: 500,
      payoutCurrency: "CUP",
    },
  },
} as unknown as Parameters<typeof registrarSolicitudDeKiosco>[1];

test.describe("solicitudes del kiosco", () => {
  test("la sede y el kiosco los pone la red, y el código no se repite", () => {
    const a = registrarSolicitudDeKiosco(ORIGEN, REMESA);
    const b = registrarSolicitudDeKiosco(ORIGEN, REMESA);
    expect(a.branchId).toBe("sede-vedado");
    expect(a.deviceId).toBe("KIO-0001-0001");
    expect(a.code).toMatch(/^KS-\d{6}-\d{6}$/);
    expect(b.code).not.toBe(a.code);
  });

  test("solo se encuentra en la sede donde se preparó", () => {
    const s = registrarSolicitudDeKiosco(ORIGEN, REMESA);
    expect(consultarSolicitudDeKiosco("sede-vedado", s.code).ok).toBe(true);
    const otra = consultarSolicitudDeKiosco("sede-habana-vieja", s.code);
    expect(otra).toEqual({ ok: false, motivo: "otra-sede", sede: "sede-vedado" });
  });

  test("el código se escribe sin importar mayúsculas ni espacios", () => {
    const s = registrarSolicitudDeKiosco(ORIGEN, REMESA);
    expect(consultarSolicitudDeKiosco("sede-vedado", `  ${s.code.toLowerCase()} `).ok).toBe(true);
  });

  test("vence a los treinta minutos", () => {
    const ahora = new Date("2026-11-23T14:00:00.000Z");
    const s = registrarSolicitudDeKiosco(ORIGEN, REMESA, ahora);
    const casi = new Date(ahora.getTime() + (VIGENCIA_DE_SOLICITUD_MINUTOS * 60 - 1) * 1000);
    const despues = new Date(ahora.getTime() + VIGENCIA_DE_SOLICITUD_MINUTOS * 60_000);
    expect(consultarSolicitudDeKiosco("sede-vedado", s.code, casi).ok).toBe(true);
    expect(consultarSolicitudDeKiosco("sede-vedado", s.code, despues)).toEqual({ ok: false, motivo: "vencida" });
  });

  test("consultarla no la gasta; canjearla sí, y una sola vez", () => {
    const s = registrarSolicitudDeKiosco(ORIGEN, REMESA);
    expect(consultarSolicitudDeKiosco("sede-vedado", s.code).ok).toBe(true);
    expect(consultarSolicitudDeKiosco("sede-vedado", s.code).ok).toBe(true);
    expect(canjearSolicitudDeKiosco("sede-vedado", s.code).ok).toBe(true);
    expect(canjearSolicitudDeKiosco("sede-vedado", s.code)).toEqual({ ok: false, motivo: "usada" });
  });

  test("un código que no existe", () => {
    expect(consultarSolicitudDeKiosco("sede-vedado", "KS-000000-000000")).toEqual({
      ok: false,
      motivo: "no-encontrada",
    });
  });
});
