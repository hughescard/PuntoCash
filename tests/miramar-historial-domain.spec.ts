import { expect, test } from "@playwright/test";

import { operadorVigenteEn } from "../src/features/network/assignments";
import { jornadasDeSede } from "../src/features/network/jornadas";
import { operacionesDeSede } from "../src/features/network/operaciones";

/**
 * PuntoCash Miramar cambió de mercante el 30 de junio. La siembra trae unas
 * jornadas de justo antes, para que el operador de la fecha se vea en pantalla
 * y no solo en un test: una operación de junio es de Atlántico aunque hoy la
 * sede sea de Caribe (**FR-SA-OPS-2**).
 */
test("Miramar tiene historial de antes del traspaso, atribuido a Atlántico", () => {
  const antes = jornadasDeSede("sede-miramar").filter((j) => j.openedAt < "2026-06-30T17:00:00.000Z");
  expect(antes.length).toBeGreaterThanOrEqual(3);
  expect(antes.every((j) => j.estado !== "abierta")).toBe(true);

  const ops = operacionesDeSede("sede-miramar").filter((o) => o.fechaHora < "2026-06-30T17:00:00.000Z");
  expect(ops.length).toBeGreaterThan(0);
  for (const o of ops) {
    expect(operadorVigenteEn("sede-miramar", new Date(o.fechaHora))).toBe("op-atlantico");
  }

  /* Y lo de esta semana sigue siendo de Caribe. */
  const despues = operacionesDeSede("sede-miramar").filter((o) => o.fechaHora >= "2026-06-30T17:00:00.000Z");
  expect(despues.length).toBeGreaterThan(0);
  expect(operadorVigenteEn("sede-miramar", new Date(despues[0]!.fechaHora))).toBe("op-caribe");
});
