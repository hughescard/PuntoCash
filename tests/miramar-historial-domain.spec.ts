import { expect, test } from "@playwright/test";

import { operadorVigenteEn } from "../src/features/network/assignments";
import { jornadasDeSede } from "../src/features/network/jornadas";
import { operacionesDeSede } from "../src/features/network/operaciones";
import { GLOBAL_SCOPE, operatorScope } from "../src/features/network/scope";
import { redEnAlcance } from "../src/features/network/scoped-reads";

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

test("Caribe ve Miramar solo desde que es suya; PuntoCash lo ve todo", () => {
  const traspaso = "2026-06-30T17:00:00.000Z";
  const caribe = redEnAlcance(operatorScope("op-caribe"));
  const red = redEnAlcance(GLOBAL_SCOPE);

  const deJunio = red.jornadas("sede-miramar").filter((j) => j.openedAt < traspaso);
  expect(deJunio.length).toBeGreaterThan(0);
  expect(caribe.jornadas("sede-miramar").some((j) => j.openedAt < traspaso)).toBe(false);
  expect(caribe.jornadas("sede-miramar").length).toBeGreaterThan(0);

  /* Ni por su identificador, ni por sus operaciones. */
  expect(caribe.jornada(deJunio[0]!.id)).toBeNull();
  expect(caribe.operacionesDeJornada(deJunio[0]!.id)).toEqual([]);
  const opDeJunio = red.operaciones("sede-miramar").find((o) => o.fechaHora < traspaso)!;
  expect(caribe.operacion(opDeJunio.codigo)).toBeNull();
  expect(caribe.operaciones("sede-miramar").every((o) => o.fechaHora >= traspaso)).toBe(true);
});
