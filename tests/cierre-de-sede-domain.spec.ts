import { expect, test } from "@playwright/test";

import {
  asignacionVigente,
  asignarSede,
  cerrarSedeYSuAdministracion,
  historialDeSede,
  sedesDeOperador,
} from "../src/features/network/assignments";
import { GLOBAL_SCOPE } from "../src/features/network/scope";
import { horarioDe, LUNES_A_SABADO } from "../src/features/network/horario";
import { crearSede, findSedeById } from "../src/features/network/sedes";

/**
 * Cerrar una sede termina también su administración (decisión del 3/11/2026):
 * una sede cerrada no la administra nadie. El tramo queda en el historial.
 * Se hace sobre una sede creada por la propia prueba: el dominio se comparte
 * con las demás pruebas de dominio del mismo proceso.
 */
test("cerrar una sede cierra su tramo con la fecha y el motivo del cierre", () => {
  const sedeId = `sede-prueba-cierre-${Date.now().toString(36)}`;
  expect(
    crearSede(GLOBAL_SCOPE, {
      id: sedeId,
      code: `PC${Date.now().toString(36).slice(-4).toUpperCase()}`,
      name: "PuntoCash Prueba de cierre",
      address: "Calle de prueba 1",
      locality: "Plaza de la Revolución, La Habana",
      horario: horarioDe(LUNES_A_SABADO, "09:00", "17:00"),
      phone: "+53 7 000 0000",
      services: ["cambio-moneda"],
    }),
  ).toMatchObject({ ok: true });
  expect(
    asignarSede(GLOBAL_SCOPE, { branchId: sedeId, operatorId: "op-caribe", reason: "Asignación para la prueba de cierre", id: `asg-${sedeId}` }),
  ).toMatchObject({ ok: true });
  const tramo = asignacionVigente(sedeId)!;
  expect(sedesDeOperador(tramo.operatorId)).toContain(sedeId);

  const ahora = new Date("2026-11-03T15:00:00.000Z");
  /* Con jornadas abiertas no se cierra, y nada cambia. */
  expect(
    cerrarSedeYSuAdministracion(GLOBAL_SCOPE, sedeId, "Cierre definitivo de la sucursal", { hasOpenJornadas: true }, ahora),
  ).toMatchObject({ ok: false, reason: "jornadas-abiertas" });
  expect(asignacionVigente(sedeId)).not.toBeNull();

  const r = cerrarSedeYSuAdministracion(GLOBAL_SCOPE, sedeId, "Cierre definitivo de la sucursal", { hasOpenJornadas: false }, ahora);
  expect(r).toMatchObject({ ok: true });
  expect(findSedeById(sedeId)?.status).toBe("cerrada");
  expect(asignacionVigente(sedeId)).toBeNull();
  expect(sedesDeOperador(tramo.operatorId)).not.toContain(sedeId);

  const cerrado = historialDeSede(sedeId).at(-1)!;
  expect(cerrado).toMatchObject({ operatorId: tramo.operatorId, endedAt: ahora.toISOString() });
  expect(cerrado.endedReason).toBe("Cierre de la sede: Cierre definitivo de la sucursal");

  /* Y una sede cerrada no se vuelve a asignar. */
  expect(
    asignarSede(GLOBAL_SCOPE, { branchId: sedeId, operatorId: tramo.operatorId, reason: "Intento de reasignación", id: "asg-prueba" }),
  ).toMatchObject({ reason: "sede-cerrada" });
});
