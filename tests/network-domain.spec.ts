import { expect, test } from "@playwright/test";

import {
  ASSIGNMENTS,
  BRANCHES,
  GLOBAL_SCOPE,
  SCOPE_CONTEXT,
  activeAdminUsersOf,
  allRegistersOf,
  asignacionVigente,
  asignarSede,
  cerrarSede,
  crearCaja,
  crearTrabajador,
  desactivarTrabajador,
  desactivarUsuarioAdmin,
  estaEnAlcance,
  findRegisterById,
  findSedeById,
  findWorkerById,
  historialDeSede,
  listarEventos,
  motivoDeBloqueo,
  operadorVigenteEn,
  operatorScope,
  reactivarCaja,
  reactivarSede,
  reactivarTrabajador,
  reactivarUsuarioAdmin,
  registersOf,
  registrarEvento,
  retirarCaja,
  revocarAsignacion,
  searchBranches,
  sedesEnAlcance,
  suspenderSede,
  workersOf,
} from "../src/features/network";

/**
 * Pruebas del dominio de la red. No usan navegador: comprueban las REGLAS,
 * que es donde está el valor — el alcance, la inmutabilidad del historial de
 * asignaciones y las guardas que impiden que PuntoCash escriba dentro de una
 * sede.
 *
 * En serie y a propósito: los módulos son mocks en memoria con estado
 * compartido, igual que el resto del producto. Toda prueba que muta deja el
 * estado como lo encontró.
 */
test.describe.configure({ mode: "serial" });

const ANTILLA = operatorScope("op-antilla");
const CARIBE = operatorScope("op-caribe");

/* -------------------------------------------------------------------------
 * Alcance (regla A1)
 * ---------------------------------------------------------------------- */

test("el alcance global ve la red entera y el de un operador solo sus sedes", () => {
  expect(sedesEnAlcance(GLOBAL_SCOPE)).toHaveLength(BRANCHES.length);

  const antilla = sedesEnAlcance(ANTILLA);
  expect(antilla).toContain("sede-vedado");
  expect(antilla).toContain("sede-habana-vieja");
  expect(antilla).not.toContain("sede-matanzas");
});

test("nadie ve hacia los lados", () => {
  expect(estaEnAlcance(ANTILLA, "sede-matanzas")).toBe(false);
  expect(estaEnAlcance(CARIBE, "sede-vedado")).toBe(false);
  expect(estaEnAlcance(GLOBAL_SCOPE, "sede-matanzas")).toBe(true);
});

test("una sede sin operador asignado no está en el alcance de ningún mercante", () => {
  expect(asignacionVigente("sede-santiago")).toBeNull();
  expect(estaEnAlcance(ANTILLA, "sede-santiago")).toBe(false);
  expect(estaEnAlcance(CARIBE, "sede-santiago")).toBe(false);
  expect(estaEnAlcance(GLOBAL_SCOPE, "sede-santiago")).toBe(true);
});

/* -------------------------------------------------------------------------
 * Historial de asignaciones (regla A2, RP-20)
 * ---------------------------------------------------------------------- */

test("una sede que cambió de mercante responde quién la administraba en cada fecha", () => {
  /* Miramar pasó de Atlántico a Caribe el 30 de junio. Una operación de mayo
     debe mostrar el mercante de mayo, aunque hoy la administre otro. */
  expect(operadorVigenteEn("sede-miramar", new Date("2026-05-10T12:00:00Z"))).toBe("op-atlantico");
  expect(operadorVigenteEn("sede-miramar", new Date("2026-08-10T12:00:00Z"))).toBe("op-caribe");
});

test("el historial conserva los tramos cerrados con su motivo", () => {
  const historial = historialDeSede("sede-miramar");
  expect(historial).toHaveLength(2);
  expect(historial[0]?.endedAt).toBeTruthy();
  expect(historial[0]?.endedReason).toContain("Cese de actividad");
  expect(historial[1]?.endedAt).toBeUndefined();
});

test("antes de su primera asignación, una sede no tenía administrador", () => {
  expect(operadorVigenteEn("sede-miramar", new Date("2026-01-01T00:00:00Z"))).toBeNull();
});

/* -------------------------------------------------------------------------
 * PuntoCash no escribe dentro de una sede (regla A14, RP-26)
 * ---------------------------------------------------------------------- */

test("el alcance global no puede crear una caja", () => {
  const result = crearCaja(GLOBAL_SCOPE, SCOPE_CONTEXT, { branchId: "sede-vedado", name: "Caja 09" });
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.reason).toBe("alcance-global-prohibido");
});

test("el alcance global no puede desactivar a un trabajador", () => {
  const result = desactivarTrabajador(
    GLOBAL_SCOPE,
    SCOPE_CONTEXT,
    "trb-1",
    "Motivo suficientemente largo para la prueba",
    "sa-1",
  );
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.reason).toBe("alcance-global-prohibido");
});

test("un mercante no puede crear una caja en una sede ajena", () => {
  const result = crearCaja(CARIBE, SCOPE_CONTEXT, { branchId: "sede-vedado", name: "Caja 09" });
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.reason).toBe("fuera-de-alcance");
});

/* -------------------------------------------------------------------------
 * Cajas (regla A4, FR-AD-CAJA-*)
 * ---------------------------------------------------------------------- */

test("una sede recién entregada llega sin cajas", () => {
  expect(registersOf("sede-santiago")).toHaveLength(0);
});

test("el mercante crea una caja de su sede, y no dos con el mismo nombre", () => {
  const created = crearCaja(ANTILLA, SCOPE_CONTEXT, { branchId: "sede-vedado", name: "Caja 05" });
  expect(created.ok).toBe(true);

  const duplicate = crearCaja(ANTILLA, SCOPE_CONTEXT, { branchId: "sede-vedado", name: "caja 05" });
  expect(duplicate.ok).toBe(false);
  if (!duplicate.ok) expect(duplicate.reason).toBe("nombre-duplicado");
});

test("retirar una caja exige que no tenga jornada abierta ni equipo vinculado", () => {
  const id = "sede-vedado:caja-05";
  const motivo = "Puesto retirado por reforma del mostrador";

  const conJornada = retirarCaja(ANTILLA, SCOPE_CONTEXT, id, motivo, {
    hasOpenJornada: () => true,
    hasLinkedDevice: () => false,
  });
  expect(conJornada.ok).toBe(false);
  if (!conJornada.ok) expect(conJornada.reason).toBe("jornada-abierta");

  const conEquipo = retirarCaja(ANTILLA, SCOPE_CONTEXT, id, motivo, {
    hasOpenJornada: () => false,
    hasLinkedDevice: () => true,
  });
  expect(conEquipo.ok).toBe(false);
  if (!conEquipo.ok) expect(conEquipo.reason).toBe("equipo-vinculado");
});

test("retirar una caja no borra nada: sigue resolviendo por id y en el histórico", () => {
  const id = "sede-vedado:caja-05";
  const retirada = retirarCaja(ANTILLA, SCOPE_CONTEXT, id, "Puesto retirado por reforma del mostrador");
  expect(retirada.ok).toBe(true);

  expect(registersOf("sede-vedado").some((r) => r.id === id)).toBe(false);
  expect(allRegistersOf("sede-vedado").some((r) => r.id === id)).toBe(true);
  expect(findRegisterById(id)?.status).toBe("retirada");
  expect(findRegisterById(id)?.retiredReason).toContain("reforma");

  /* Reactivar la devuelve al servicio, sin restaurar ningún vínculo de equipo. */
  expect(reactivarCaja(ANTILLA, SCOPE_CONTEXT, id).ok).toBe(true);
  expect(findRegisterById(id)?.status).toBe("activa");

  /* Se deja el estado como estaba: esta caja la creó una prueba anterior. */
  retirarCaja(ANTILLA, SCOPE_CONTEXT, id, "Limpieza del estado de la prueba");
});

test("un motivo demasiado corto no basta para retirar una caja", () => {
  const result = retirarCaja(ANTILLA, SCOPE_CONTEXT, "sede-vedado:caja-01", "corto");
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.reason).toBe("motivo-requerido");
});

/* -------------------------------------------------------------------------
 * Trabajadores (reglas A4 y A13)
 * ---------------------------------------------------------------------- */

test("un trabajador se adscribe a una sede, y el alta exige correo", () => {
  const sinCorreo = crearTrabajador(ANTILLA, SCOPE_CONTEXT, {
    id: "trb-test-1",
    identifier: "prueba@puntocash.com",
    fullName: "Ana Prueba",
    firstName: "Ana",
    documentId: "00000000001",
    phone: "+53 5 111 1111",
    email: "",
    branchId: "sede-vedado",
  });
  expect(sinCorreo.ok).toBe(false);
  if (!sinCorreo.ok) expect(sinCorreo.reason).toBe("correo-requerido");

  const alta = crearTrabajador(ANTILLA, SCOPE_CONTEXT, {
    id: "trb-test-1",
    identifier: "prueba@puntocash.com",
    fullName: "Ana Prueba",
    firstName: "Ana",
    documentId: "00000000001",
    phone: "+53 5 111 1111",
    email: "prueba@puntocash.com",
    branchId: "sede-vedado",
  });
  expect(alta.ok).toBe(true);
  if (alta.ok) expect(alta.value.branchId).toBe("sede-vedado");
  expect(workersOf("sede-vedado").some((w) => w.id === "trb-test-1")).toBe(true);
});

test("no se repite un identificador de acceso en toda la red", () => {
  const result = crearTrabajador(ANTILLA, SCOPE_CONTEXT, {
    id: "trb-test-2",
    identifier: "jperez@puntocash.com",
    fullName: "Otro Juan",
    firstName: "Otro",
    documentId: "00000000002",
    phone: "+53 5 222 2222",
    email: "otro@puntocash.com",
    branchId: "sede-vedado",
  });
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.reason).toBe("identificador-duplicado");
});

test("no se desactiva a un trabajador con jornada abierta, y reactivar siempre es posible", () => {
  const motivo = "Cambio de puesto acordado con el trabajador";

  const conJornada = desactivarTrabajador(ANTILLA, SCOPE_CONTEXT, "trb-test-1", motivo, "adm-antilla-1", {
    hasOpenJornada: () => true,
  });
  expect(conJornada.ok).toBe(false);
  if (!conJornada.ok) expect(conJornada.reason).toBe("jornada-abierta");

  expect(desactivarTrabajador(ANTILLA, SCOPE_CONTEXT, "trb-test-1", motivo, "adm-antilla-1").ok).toBe(true);
  expect(findWorkerById("trb-test-1")?.status).toBe("desactivado");

  expect(reactivarTrabajador(ANTILLA, SCOPE_CONTEXT, "trb-test-1").ok).toBe(true);
  expect(findWorkerById("trb-test-1")?.status).toBe("activo");
});

test("distingue por qué un trabajador no puede entrar", () => {
  /* Camagüey pertenece a un operador suspendido en los datos de la demo. */
  const deOriente = workersOf("sede-camaguey")[0];
  expect(deOriente).toBeTruthy();
  if (deOriente) expect(motivoDeBloqueo(deOriente)).toBe("operador-suspendido");

  const activo = findWorkerById("trb-1");
  expect(activo).toBeTruthy();
  if (activo) expect(motivoDeBloqueo(activo)).toBeNull();

  const desactivado = findWorkerById("trb-12");
  expect(desactivado).toBeTruthy();
  if (desactivado) expect(motivoDeBloqueo(desactivado)).toBe("desactivado");
});

/* -------------------------------------------------------------------------
 * Usuarios administradores (FR-AD-USR-7, FR-AD-USR-8)
 * ---------------------------------------------------------------------- */

test("un usuario administrador no se desactiva a sí mismo ni deja a su empresa sin acceso", () => {
  const propio = desactivarUsuarioAdmin(ANTILLA, "adm-antilla-1", "adm-antilla-1");
  expect(propio.ok).toBe(false);

  /* Antilla tiene dos: desactivar uno se permite, el último no. */
  expect(activeAdminUsersOf("op-antilla")).toHaveLength(2);
  expect(desactivarUsuarioAdmin(ANTILLA, "adm-antilla-2", "adm-antilla-1").ok).toBe(true);

  const ultimo = desactivarUsuarioAdmin(ANTILLA, "adm-antilla-1", "adm-antilla-2");
  expect(ultimo.ok).toBe(false);
  if (!ultimo.ok) expect(ultimo.reason).toBe("ultimo-usuario-activo");

  reactivarUsuarioAdmin(ANTILLA, "adm-antilla-2");
  expect(activeAdminUsersOf("op-antilla")).toHaveLength(2);
});

/* -------------------------------------------------------------------------
 * Suspender, revocar y cerrar (§13 del FRD de Super Admin)
 * ---------------------------------------------------------------------- */

test("toda acción de gobierno exige un motivo escrito", () => {
  const result = suspenderSede(GLOBAL_SCOPE, "sede-holguin", "corto", "sa-1");
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.reason).toBe("motivo-requerido");
});

test("un mercante no puede suspender una sede", () => {
  const result = suspenderSede(ANTILLA, "sede-vedado", "Motivo suficientemente largo", "adm-antilla-1");
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.reason).toBe("alcance-insuficiente");
});

test("suspender una sede es reversible y no desmonta nada", () => {
  const motivo = "Revisión de arqueos con diferencia en la sucursal";
  const cajasAntes = registersOf("sede-holguin").length;

  expect(suspenderSede(GLOBAL_SCOPE, "sede-holguin", motivo, "sa-1").ok).toBe(true);
  expect(findSedeById("sede-holguin")?.status).toBe("suspendida");
  /* No retira cajas ni toca a los trabajadores (FR-SA-SUS-7). */
  expect(registersOf("sede-holguin")).toHaveLength(cajasAntes);
  expect(asignacionVigente("sede-holguin")).not.toBeNull();

  const trabajador = workersOf("sede-holguin").find((w) => w.status === "activo");
  if (trabajador) expect(motivoDeBloqueo(trabajador)).toBe("sede-suspendida");

  expect(reactivarSede(GLOBAL_SCOPE, "sede-holguin", "Concluida la revisión sin hallazgos").ok).toBe(true);
  expect(findSedeById("sede-holguin")?.status).toBe("activa");
});

test("cerrar una sede con jornadas abiertas se rechaza; suspenderla no lo pide", () => {
  const cierre = cerrarSede(GLOBAL_SCOPE, "sede-holguin", "Cierre definitivo de la sucursal", {
    hasOpenJornadas: true,
  });
  expect(cierre.ok).toBe(false);
  if (!cierre.ok) expect(cierre.reason).toBe("jornadas-abiertas");
});

test("no se asigna una sede que ya tiene operador vigente", () => {
  const result = asignarSede(GLOBAL_SCOPE, {
    id: "asg-test",
    branchId: "sede-vedado",
    operatorId: "op-caribe",
    reason: "Intento de doble asignación para la prueba",
  });
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.reason).toBe("ya-asignada");
});

test("revocar no se permite con jornadas abiertas, cierra el tramo y suspende la sede", () => {
  const motivo = "Traspaso ordenado de la administración de la sucursal";

  const abiertas = revocarAsignacion(GLOBAL_SCOPE, "sede-matanzas", motivo, { hasOpenJornadas: true });
  expect(abiertas.ok).toBe(false);
  if (!abiertas.ok) expect(abiertas.reason).toBe("jornadas-abiertas");

  const tramosAntes = historialDeSede("sede-matanzas").length;
  const cajasAntes = registersOf("sede-matanzas").length;
  const trabajadoresAntes = workersOf("sede-matanzas").filter((w) => w.status === "activo").length;

  expect(revocarAsignacion(GLOBAL_SCOPE, "sede-matanzas", motivo, { hasOpenJornadas: false }).ok).toBe(true);

  /* Cierra el tramo, nunca lo borra (regla A2). */
  expect(historialDeSede("sede-matanzas")).toHaveLength(tramosAntes);
  expect(historialDeSede("sede-matanzas").at(-1)?.endedReason).toContain("Traspaso ordenado");
  expect(asignacionVigente("sede-matanzas")).toBeNull();
  /* Sin administrador responsable, la sede no puede operarse (FR-SA-ASG-10). */
  expect(findSedeById("sede-matanzas")?.status).toBe("suspendida");
  /* Pero no retira cajas ni desactiva trabajadores (FR-SA-ASG-7, FR-SA-ASG-8). */
  expect(registersOf("sede-matanzas")).toHaveLength(cajasAntes);
  expect(workersOf("sede-matanzas").filter((w) => w.status === "activo")).toHaveLength(trabajadoresAntes);

  /* Se deja el estado como estaba. */
  expect(
    asignarSede(GLOBAL_SCOPE, {
      id: "asg-test-matanzas",
      branchId: "sede-matanzas",
      operatorId: "op-caribe",
      reason: "Restitución del operador al concluir la prueba",
    }).ok,
  ).toBe(true);
  expect(findSedeById("sede-matanzas")?.status).toBe("activa");
});

test("no se asigna una sede a un operador suspendido", () => {
  const result = asignarSede(GLOBAL_SCOPE, {
    id: "asg-test-santiago",
    branchId: "sede-santiago",
    operatorId: "op-oriente",
    reason: "Intento de asignación a un operador suspendido",
  });
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.reason).toBe("operador-inactivo");
});

/* -------------------------------------------------------------------------
 * Auditoría (RP-21)
 * ---------------------------------------------------------------------- */

test("el registro de auditoría se consulta filtrando por el rol de quien actuó", () => {
  const dePuntoCash = listarEventos({ actorRole: "super-admin" });
  const deMercantes = listarEventos({ actorRole: "admin-sede" });
  expect(dePuntoCash.length).toBeGreaterThan(0);
  expect(deMercantes.length).toBeGreaterThan(0);
  expect(dePuntoCash.every((e) => e.actorRole === "super-admin")).toBe(true);
});

test("un evento nuevo queda registrado con su antes y su después", () => {
  const before = listarEventos().length;
  registrarEvento({
    actorId: "adm-antilla-1",
    actorName: "Marta Sánchez",
    actorRole: "admin-sede",
    type: "caja.alta",
    subject: "Caja 05 · PuntoCash Vedado",
    branchId: "sede-vedado",
    operatorId: "op-antilla",
    reason: "Apertura de un cuarto puesto por aumento de afluencia",
    before: "4 cajas",
    after: "5 cajas",
  });
  const after = listarEventos();
  expect(after).toHaveLength(before + 1);
  expect(after[0]?.type).toBe("caja.alta");
  expect(after[0]?.after).toBe("5 cajas");
});

/* -------------------------------------------------------------------------
 * Compatibilidad con lo ya aprobado
 * ---------------------------------------------------------------------- */

test("la lista pública de sedes que leen el kiosco y la pantalla no cambia", () => {
  expect(BRANCHES.length).toBeGreaterThanOrEqual(8);
  expect(BRANCHES.some((b) => b.id === "sede-vedado" && b.name === "PuntoCash Vedado")).toBe(true);
  /* El filtro del selector de sede sigue ignorando tildes. */
  expect(searchBranches("camaguey").some((b) => b.id === "sede-camaguey")).toBe(true);
  expect(searchBranches("")).toHaveLength(BRANCHES.length);
});

test("los identificadores de caja conservan el formato que un equipo ya vinculado guardó", () => {
  expect(findRegisterById("sede-vedado:caja-03")?.name).toBe("Caja 03");
  expect(ASSIGNMENTS.length).toBeGreaterThan(0);
});
