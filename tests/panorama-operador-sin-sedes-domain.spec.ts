import { expect, test } from "@playwright/test";

import { asignarSede, revocarAsignacion } from "../src/features/network/assignments";
import { horarioDe, LUNES_A_SABADO } from "../src/features/network/horario";
import { GLOBAL_SCOPE } from "../src/features/network/scope";
import { crearSede } from "../src/features/network/sedes";
import { panoramaDeRed, type PendienteDePuntoCash } from "../src/features/super-admin/panorama";

/**
 * «Operador sin sedes» (FR-SA-HOME-3) distingue al operador al que nunca se le
 * entregó una sede del que se quedó sin ellas: el aviso dice cuál se le retiró
 * y cuándo. Se hace sobre una sede creada por la propia prueba, porque el
 * dominio se comparte con las demás pruebas de dominio del mismo proceso.
 */
const deCienfuegos = (): Extract<PendienteDePuntoCash, { kind: "operador-sin-sedes" }> | undefined =>
  panoramaDeRed().pendientes.find(
    (p): p is Extract<PendienteDePuntoCash, { kind: "operador-sin-sedes" }> =>
      p.kind === "operador-sin-sedes" && p.operador.id === "op-cienfuegos",
  );

test("un operador sin sedes dice si nunca tuvo ninguna o cuál se le retiró", () => {
  expect(deCienfuegos()).toMatchObject({ ultimaRetirada: null });

  const sufijo = Date.now().toString(36);
  const sedeId = `sede-prueba-retirada-${sufijo}`;
  expect(
    crearSede(GLOBAL_SCOPE, {
      id: sedeId,
      code: `PR${sufijo.slice(-4).toUpperCase()}`,
      name: "PuntoCash Prueba de retirada",
      address: "Calle de prueba 2",
      locality: "Cienfuegos, Cienfuegos",
      horario: horarioDe(LUNES_A_SABADO, "09:00", "17:00"),
      phone: "+53 43 000 000",
      services: ["cambio-moneda"],
    }),
  ).toMatchObject({ ok: true });
  expect(
    asignarSede(GLOBAL_SCOPE, { branchId: sedeId, operatorId: "op-cienfuegos", reason: "Asignación para la prueba de retirada", id: `asg-${sedeId}` }),
  ).toMatchObject({ ok: true });
  expect(deCienfuegos()).toBeUndefined();

  const el = new Date("2026-11-26T20:00:00.000Z");
  expect(revocarAsignacion(GLOBAL_SCOPE, sedeId, "Revocación para la prueba de retirada", { hasOpenJornadas: false }, el)).toMatchObject({ ok: true });
  expect(deCienfuegos()).toMatchObject({ ultimaRetirada: { sede: "PuntoCash Prueba de retirada", el: el.toISOString() } });
});
