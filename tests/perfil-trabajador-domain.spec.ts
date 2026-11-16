import { expect, test } from "@playwright/test";

import { crearPuestoDePrueba } from "@/features/network/puesto-de-prueba";
import { editarDatosPropiosTrabajador, findWorkerByCuenta, findWorkerById } from "@/features/network/workers";
import { cambiarContrasenaTrabajador, verificarCredencialesTrabajador } from "@/features/worker/acceso";

test.describe("Perfil del trabajador · dominio", () => {
  test("cambiar el usuario: entra con el nuevo, no con el viejo, y conserva su contraseña", async () => {
    const p = crearPuestoDePrueba({ fondos: { USD: 100 }, monedas: ["USD"] });
    if (!p.ok) throw new Error(p.error);
    const w = findWorkerById(p.value.workerId)!;
    const viejo = w.identifier;
    const nombre = w.fullName;
    const documento = w.documentId;

    expect(await cambiarContrasenaTrabajador(w.id, "puntocash", "clave-nueva-1", "clave-nueva-1")).toEqual({ status: "ok" });
    const nuevo = `n${Date.now().toString(36)}`;
    expect(editarDatosPropiosTrabajador(w.id, { identifier: nuevo, phone: "+53 5 999 0000" })).toMatchObject({ ok: true });

    expect(findWorkerByCuenta(viejo)).toBeNull();
    expect(findWorkerByCuenta(nuevo)?.id).toBe(w.id);
    /* El nombre y el documento no se tocan. */
    expect(findWorkerById(w.id)).toMatchObject({ fullName: nombre, documentId: documento });

    const conNuevo = await verificarCredencialesTrabajador({ identifier: nuevo, password: "clave-nueva-1" }, p.value.terminalId);
    expect(conNuevo.status).toBe("ok");
    const conViejo = await verificarCredencialesTrabajador({ identifier: viejo, password: "clave-nueva-1" }, p.value.terminalId);
    expect(conViejo.status).toBe("invalid-credentials");
  });

  test("no deja usar el usuario de otro, uno con «@» ni un teléfono corto", () => {
    const p = crearPuestoDePrueba({ fondos: { USD: 100 }, monedas: ["USD"] });
    if (!p.ok) throw new Error(p.error);
    expect(editarDatosPropiosTrabajador(p.value.workerId, { identifier: "jperez", phone: "55551234" })).toMatchObject({ ok: false, reason: "identificador-duplicado" });
    expect(editarDatosPropiosTrabajador(p.value.workerId, { identifier: "a@b", phone: "55551234" })).toMatchObject({ ok: false, reason: "identificador-invalido" });
    expect(editarDatosPropiosTrabajador(p.value.workerId, { identifier: "valido.1", phone: "123" })).toMatchObject({ ok: false, reason: "telefono-invalido" });
  });
});
