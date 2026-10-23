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
  esAdministradorPrincipal,
  equipoDeCaja,
  estaEnAlcance,
  findRegisterById,
  findSedeById,
  findWorkerById,
  historialDeSede,
  kioscosDeSede,
  listarEventos,
  motivoDeBloqueo,
  operadorVigenteEn,
  operatorScope,
  reactivarCaja,
  reactivarSede,
  reactivarTrabajador,
  reactivarUsuarioAdmin,
  transferirAdministradorPrincipal,
  redEnAlcance,
  registersOf,
  registrarEvento,
  retirarCaja,
  revocarAsignacion,
  searchBranches,
  sedesEnAlcance,
  suspenderSede,
  workersOf,
  anadirMonedaASede,
  cajasConMoneda,
  monedasDeCaja,
  monedasDeSede,
  retirarMonedaDeSede,
  EFECTOS_EN_TASAS,
  confirmarTasaAjustada,
  crearPromocion,
  conciliacionDe,
  diaDeSede,
  operacionesDeSede,
  diferenciasDelDia,
  enHorario,
  forzarCierre,
  jornadaPorId,
  jornadasDeSede,
  editarPromocion,
  hoyEnCuba,
  promocionesPublicas,
  retirarPromocion,
  sumarDias,
  editarDatosDeContacto,
  horarioDe,
  lineasDeHorario,
  fijarTasa,
  rangoDe,
  retirarTasa,
  tableroPublico,
  tasaDe,
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

const MALECON = operatorScope("op-malecon");
const CARIBE = operatorScope("op-caribe");

/* -------------------------------------------------------------------------
 * Alcance (regla A1)
 * ---------------------------------------------------------------------- */

test("el alcance global ve la red entera y el de un operador solo sus sedes", () => {
  expect(sedesEnAlcance(GLOBAL_SCOPE)).toHaveLength(BRANCHES.length);

  const malecon = sedesEnAlcance(MALECON);
  expect(malecon).toContain("sede-vedado");
  expect(malecon).toContain("sede-habana-vieja");
  expect(malecon).not.toContain("sede-matanzas");
});

test("nadie ve hacia los lados", () => {
  expect(estaEnAlcance(MALECON, "sede-matanzas")).toBe(false);
  expect(estaEnAlcance(CARIBE, "sede-vedado")).toBe(false);
  expect(estaEnAlcance(GLOBAL_SCOPE, "sede-matanzas")).toBe(true);
});

test("una sede sin operador asignado no está en el alcance de ningún mercante", () => {
  expect(asignacionVigente("sede-santiago")).toBeNull();
  expect(estaEnAlcance(MALECON, "sede-santiago")).toBe(false);
  expect(estaEnAlcance(CARIBE, "sede-santiago")).toBe(false);
  expect(estaEnAlcance(GLOBAL_SCOPE, "sede-santiago")).toBe(true);
});

/* -------------------------------------------------------------------------
 * Lecturas con alcance — `redEnAlcance` (regla A1, FR-AD-NAV-2, FR-AD-NAV-3)
 *
 * Lo que estas pruebas comprueban no es que la vista lea bien: es que **una
 * sede ajena se lea exactamente como una inexistente**. Si se distinguieran,
 * probar identificadores bastaría para averiguar qué administra otra empresa.
 *
 * Cada caso contrasta además la vista con la lectura en bruto, que sigue
 * existiendo para Worker y Kiosco: así se ve que la diferencia es real y no
 * que el dato simplemente no estaba.
 * ---------------------------------------------------------------------- */

test("la vista contesta por las sedes del alcance", () => {
  const red = redEnAlcance(MALECON);

  expect(red.sede("sede-vedado")?.name).toBe("PuntoCash Vedado");
  expect(red.cajasActivas("sede-vedado").length).toBeGreaterThan(0);
  expect(red.trabajadores("sede-vedado").length).toBeGreaterThan(0);
  expect(red.kioscos("sede-vedado")).toHaveLength(2);
  expect(red.asignacionVigente("sede-vedado")?.operatorId).toBe("op-malecon");
});

test("una sede ajena se lee igual que una que no existe", () => {
  const red = redEnAlcance(MALECON);

  /* Matanzas es de Caribe. En bruto se lee entera; por la vista, nada. */
  expect(findSedeById("sede-matanzas")).not.toBeNull();
  expect(workersOf("sede-matanzas").length).toBeGreaterThan(0);

  expect(red.sede("sede-matanzas")).toBeNull();
  expect(red.cajasActivas("sede-matanzas")).toEqual([]);
  expect(red.cajasConHistorico("sede-matanzas")).toEqual([]);
  expect(red.trabajadores("sede-matanzas")).toEqual([]);
  expect(red.kioscos("sede-matanzas")).toEqual([]);
  expect(red.asignacionVigente("sede-matanzas")).toBeNull();

  // Y lo mismo, exactamente, para un identificador inventado.
  expect(red.sede("sede-inventada")).toBeNull();
  expect(red.cajasActivas("sede-inventada")).toEqual([]);
  expect(red.trabajadores("sede-inventada")).toEqual([]);
  expect(red.kioscos("sede-inventada")).toEqual([]);
  expect(red.asignacionVigente("sede-inventada")).toBeNull();
});

test("el equipo de una caja ajena no se ve, aunque la caja exista", () => {
  /* Miramar es de Caribe desde el 30 de junio, y su Caja 01 tiene equipo. */
  expect(equipoDeCaja("sede-miramar:caja-01")).not.toBeNull();

  expect(redEnAlcance(CARIBE).equipoDeCaja("sede-miramar:caja-01")).not.toBeNull();
  expect(redEnAlcance(CARIBE).cajaTieneEquipo("sede-miramar:caja-01")).toBe(true);

  expect(redEnAlcance(MALECON).equipoDeCaja("sede-miramar:caja-01")).toBeNull();
  expect(redEnAlcance(MALECON).cajaTieneEquipo("sede-miramar:caja-01")).toBe(false);
});

test("una caja que no existe se lee como una ajena", () => {
  const red = redEnAlcance(MALECON);
  expect(red.equipoDeCaja("sede-vedado:caja-99")).toBeNull();
  expect(red.cajaTieneEquipo("sede-vedado:caja-99")).toBe(false);
});

test("el alcance global ve la red entera por la misma vista", () => {
  const red = redEnAlcance(GLOBAL_SCOPE);

  expect(red.sede("sede-matanzas")?.name).toBeTruthy();
  expect(red.trabajadores("sede-matanzas").length).toBeGreaterThan(0);
  expect(red.equipoDeCaja("sede-miramar:caja-01")).not.toBeNull();

  /* Incluso la sede sin operador asignado, que es de PuntoCash y de nadie
     más (**FR-SA-HOME-3**). */
  expect(red.sede("sede-santiago")).not.toBeNull();
  expect(redEnAlcance(MALECON).sede("sede-santiago")).toBeNull();
});

test("la vista no fotografía su alcance: lo comprueba en cada lectura", () => {
  /* Dos vistas del mismo alcance creadas en momentos distintos contestan lo
     mismo, y una creada antes de leer no conserva nada del momento en que
     nació. La propiedad importa porque el dominio es mutable: una vista que
     hubiera guardado sus sedes al nacer seguiría contestando por una sede que
     ya no administra nadie. */
  const temprana = redEnAlcance(MALECON);
  const tardia = redEnAlcance(MALECON);

  expect(temprana.sede("sede-vedado")).toEqual(tardia.sede("sede-vedado"));
  expect(temprana.cajasActivas("sede-vedado")).toEqual(tardia.cajasActivas("sede-vedado"));
  expect(temprana.kioscos("sede-vedado")).toEqual(kioscosDeSede("sede-vedado"));
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
  const created = crearCaja(MALECON, SCOPE_CONTEXT, { branchId: "sede-vedado", name: "Caja 05" });
  expect(created.ok).toBe(true);

  const duplicate = crearCaja(MALECON, SCOPE_CONTEXT, { branchId: "sede-vedado", name: "caja 05" });
  expect(duplicate.ok).toBe(false);
  if (!duplicate.ok) expect(duplicate.reason).toBe("nombre-duplicado");
});

test("retirar una caja exige que no tenga jornada abierta ni equipo vinculado", () => {
  const id = "sede-vedado:caja-05";
  const motivo = "Puesto retirado por reforma del mostrador";

  const conJornada = retirarCaja(MALECON, SCOPE_CONTEXT, id, motivo, {
    hasOpenJornada: () => true,
    hasLinkedDevice: () => false,
  });
  expect(conJornada.ok).toBe(false);
  if (!conJornada.ok) expect(conJornada.reason).toBe("jornada-abierta");

  const conEquipo = retirarCaja(MALECON, SCOPE_CONTEXT, id, motivo, {
    hasOpenJornada: () => false,
    hasLinkedDevice: () => true,
  });
  expect(conEquipo.ok).toBe(false);
  if (!conEquipo.ok) expect(conEquipo.reason).toBe("equipo-vinculado");
});

test("retirar una caja no borra nada: sigue resolviendo por id y en el histórico", () => {
  const id = "sede-vedado:caja-05";
  const retirada = retirarCaja(MALECON, SCOPE_CONTEXT, id, "Puesto retirado por reforma del mostrador");
  expect(retirada.ok).toBe(true);

  expect(registersOf("sede-vedado").some((r) => r.id === id)).toBe(false);
  expect(allRegistersOf("sede-vedado").some((r) => r.id === id)).toBe(true);
  expect(findRegisterById(id)?.status).toBe("retirada");
  expect(findRegisterById(id)?.retiredReason).toContain("reforma");

  /* Reactivar la devuelve al servicio, sin restaurar ningún vínculo de equipo. */
  expect(reactivarCaja(MALECON, SCOPE_CONTEXT, id).ok).toBe(true);
  expect(findRegisterById(id)?.status).toBe("activa");

  /* Se deja el estado como estaba: esta caja la creó una prueba anterior. */
  retirarCaja(MALECON, SCOPE_CONTEXT, id, "Limpieza del estado de la prueba");
});

test("un motivo demasiado corto no basta para retirar una caja", () => {
  const result = retirarCaja(MALECON, SCOPE_CONTEXT, "sede-vedado:caja-01", "corto");
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.reason).toBe("motivo-requerido");
});

/* -------------------------------------------------------------------------
 * Trabajadores (reglas A4 y A13)
 * ---------------------------------------------------------------------- */

test("un trabajador se adscribe a una sede, y el alta exige correo", () => {
  const sinCorreo = crearTrabajador(MALECON, SCOPE_CONTEXT, {
    id: "trb-test-1",
    identifier: "prueba@puntocash.com",
    fullName: "Ana Prueba",
    firstName: "Ana",
    documentType: "CI" as const,
    documentId: "00000000001",
    phone: "+53 5 111 1111",
    email: "",
    branchId: "sede-vedado",
  });
  expect(sinCorreo.ok).toBe(false);
  if (!sinCorreo.ok) expect(sinCorreo.reason).toBe("correo-invalido");

  const alta = crearTrabajador(MALECON, SCOPE_CONTEXT, {
    id: "trb-test-1",
    identifier: "prueba@puntocash.com",
    fullName: "Ana Prueba",
    firstName: "Ana",
    documentType: "CI" as const,
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
  const result = crearTrabajador(MALECON, SCOPE_CONTEXT, {
    id: "trb-test-2",
    identifier: "jperez",
    fullName: "Otro Juan",
    firstName: "Otro",
    documentType: "CI" as const,
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

  const conJornada = desactivarTrabajador(MALECON, SCOPE_CONTEXT, "trb-test-1", motivo, "adm-malecon-1", {
    hasOpenJornada: () => true,
  });
  expect(conJornada.ok).toBe(false);
  if (!conJornada.ok) expect(conJornada.reason).toBe("jornada-abierta");

  expect(desactivarTrabajador(MALECON, SCOPE_CONTEXT, "trb-test-1", motivo, "adm-malecon-1").ok).toBe(true);
  expect(findWorkerById("trb-test-1")?.status).toBe("desactivado");

  expect(reactivarTrabajador(MALECON, SCOPE_CONTEXT, "trb-test-1").ok).toBe(true);
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
 * Usuarios administradores (FR-AD-USR-11, FR-AD-USR-13)
 * ---------------------------------------------------------------------- */

test("solo el administrador principal gobierna los usuarios, y a él no lo desactiva nadie", () => {
  /* **FR-AD-USR-11**: §8 entera pertenece al principal. Malecón tiene dos
     usuarios; el principal es el que entregó PuntoCash. */
  expect(esAdministradorPrincipal("adm-malecon-1")).toBe(true);
  expect(esAdministradorPrincipal("adm-malecon-2")).toBe(false);

  /* Un administrador corriente no puede dar de alta ni desactivar a nadie. */
  const ajeno = desactivarUsuarioAdmin(MALECON, "adm-malecon-1", "adm-malecon-2");
  expect(ajeno.ok).toBe(false);
  if (!ajeno.ok) expect(ajeno.reason).toBe("no-es-el-principal");

  /* **Al principal no lo desactiva nadie, él incluido.** Es lo que garantiza
     que la empresa nunca se quede sin quien administre sus usuarios, y lo que
     vuelve innecesaria la vieja guarda del «último activo». */
  const propio = desactivarUsuarioAdmin(MALECON, "adm-malecon-1", "adm-malecon-1");
  expect(propio.ok).toBe(false);
  if (!propio.ok) expect(propio.reason).toBe("es-el-principal");

  /* El principal sí desactiva y reactiva a los demás. */
  expect(desactivarUsuarioAdmin(MALECON, "adm-malecon-2", "adm-malecon-1").ok).toBe(true);
  expect(activeAdminUsersOf("op-malecon")).toHaveLength(1);

  /* **FR-AD-USR-12**: no se traspasa a alguien desactivado, porque dejaría a
     la empresa sin nadie que pueda administrar usuarios. */
  const aDesactivado = transferirAdministradorPrincipal(MALECON, "adm-malecon-1", "adm-malecon-2");
  expect(aDesactivado.ok).toBe(false);
  if (!aDesactivado.ok) expect(aDesactivado.reason).toBe("destino-no-activo");

  reactivarUsuarioAdmin(MALECON, "adm-malecon-1", "adm-malecon-2");
  expect(activeAdminUsersOf("op-malecon")).toHaveLength(2);

  /* El traspaso es inmediato y en un solo acto: nunca hay dos principales ni
     ninguno. */
  const traspaso = transferirAdministradorPrincipal(MALECON, "adm-malecon-1", "adm-malecon-2");
  expect(traspaso.ok).toBe(true);
  expect(esAdministradorPrincipal("adm-malecon-2")).toBe(true);
  expect(esAdministradorPrincipal("adm-malecon-1")).toBe(false);

  // Se devuelve el papel para no alterar el resto de la corrida.
  expect(transferirAdministradorPrincipal(MALECON, "adm-malecon-2", "adm-malecon-1").ok).toBe(true);
  expect(esAdministradorPrincipal("adm-malecon-1")).toBe(true);
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
  const result = suspenderSede(MALECON, "sede-vedado", "Motivo suficientemente largo", "adm-malecon-1");
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.reason).toBe("alcance-insuficiente");
});

test("suspender una sede es reversible y no desmonta nada", () => {
  const motivo = "Revisión de cierres con diferencia en la sucursal";
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
    actorId: "adm-malecon-1",
    actorName: "Marta Sánchez",
    actorRole: "admin-sede",
    type: "caja.alta",
    subject: "Caja 05 · PuntoCash Vedado",
    branchId: "sede-vedado",
    operatorId: "op-malecon",
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

/* -------------------------------------------------------------------------
 * Monedas de sede — decisiones del 15/10/2026
 * ---------------------------------------------------------------------- */

test("la lista de monedas no depende del Cambio de moneda, y añadir no toca ninguna caja", () => {
  /* Matanzas no tiene Cambio de moneda: tiene lista igualmente (FR-AD-MON-5). */
  expect(findSedeById("sede-matanzas")?.services).not.toContain("cambio-moneda");

  const alta = anadirMonedaASede(CARIBE, "sede-matanzas", "CHF");
  expect(alta.ok).toBe(true);
  /* FR-AD-MON-4: ni habilitada ni con saldo en ninguna caja. */
  expect(cajasConMoneda("sede-matanzas", "CHF")).toHaveLength(0);

  expect(anadirMonedaASede(CARIBE, "sede-matanzas", "CHF")).toMatchObject({ reason: "ya-en-la-lista" });
  expect(anadirMonedaASede(CARIBE, "sede-matanzas", "XYZ")).toMatchObject({ reason: "moneda-desconocida" });
  expect(anadirMonedaASede(MALECON, "sede-matanzas", "GBP")).toMatchObject({ reason: "fuera-de-alcance" });
  /* PuntoCash observa y no escribe dentro de una sede (A14). */
  expect(anadirMonedaASede(GLOBAL_SCOPE, "sede-matanzas", "GBP")).toMatchObject({
    reason: "alcance-global-prohibido",
  });

  expect(retirarMonedaDeSede(CARIBE, "sede-matanzas", "CHF").ok).toBe(true);
});

test("retirar exige saldo cero en toda caja, y la quita de las que la tenían en cero", () => {
  /* FR-AD-MON-7: la libra tiene saldo en la Caja 03 de Vedado. */
  const bloqueada = retirarMonedaDeSede(MALECON, "sede-vedado", "GBP");
  expect(bloqueada).toMatchObject({ ok: false, reason: "con-saldo", cajas: ["Caja 03"] });
  expect(monedasDeSede("sede-vedado").some((m) => m.code === "GBP")).toBe(true);

  /* FR-AD-MON-6: el dólar canadiense está en cero en la Caja 01 de Obispo, y
     sale de la lista y de la caja a la vez. */
  expect(monedasDeCaja("sede-habana-vieja:caja-01")).toContain("CAD");
  const retirada = retirarMonedaDeSede(MALECON, "sede-habana-vieja", "CAD");
  expect(retirada).toMatchObject({ ok: true, value: { code: "CAD", cajas: ["Caja 01"] } });
  expect(monedasDeCaja("sede-habana-vieja:caja-01")).not.toContain("CAD");
  expect(monedasDeSede("sede-habana-vieja").some((m) => m.code === "CAD")).toBe(false);

  /* FR-AD-MON-9: Cerro se queda con una y esa no se retira. */
  expect(retirarMonedaDeSede(MALECON, "sede-cerro", "USD").ok).toBe(true);
  expect(retirarMonedaDeSede(MALECON, "sede-cerro", "CUP")).toMatchObject({ reason: "ultima-moneda" });

  /* Se devuelven las listas como estaban. La Caja 01 de Obispo no recupera
     su CAD en cero: ninguna otra prueba lo lee. */
  anadirMonedaASede(MALECON, "sede-habana-vieja", "CAD");
  anadirMonedaASede(MALECON, "sede-cerro", "USD");
});

/* -------------------------------------------------------------------------
 * Tasas — siempre contra CUP, dentro del rango de PuntoCash (15/10/2026)
 * ---------------------------------------------------------------------- */

test("una tasa se fija dentro del rango, y solo donde la sede puede cotizar", () => {
  const usd = rangoDe("USD")!;
  const base = { sedeId: "sede-vedado", code: "USD", versionDelRango: usd.version, autor: "Prueba" };
  const antes = tasaDe("sede-vedado", "USD")!;

  /* FR-AD-TASA-8: fuera de rango no se guarda ni por el dominio. */
  expect(fijarTasa(MALECON, { ...base, compra: 299, venta: 320 })).toMatchObject({
    reason: "compra-fuera-de-rango",
  });
  expect(fijarTasa(MALECON, { ...base, compra: 320, venta: 341 })).toMatchObject({
    reason: "venta-fuera-de-rango",
  });
  expect(fijarTasa(MALECON, { ...base, compra: 328, venta: 320 })).toMatchObject({
    reason: "compra-mayor-que-venta",
  });
  /* FR-AD-TASA-11: PuntoCash movió el rango mientras la pantalla estaba abierta. */
  expect(
    fijarTasa(MALECON, { ...base, versionDelRango: "vieja", compra: 318, venta: 326 }),
  ).toMatchObject({ reason: "rango-cambiado" });

  /* FR-AD-TASA-2: sin rango, sin servicio, o fuera de alcance. */
  expect(
    fijarTasa(MALECON, { ...base, sedeId: "sede-habana-vieja", code: "CAD", compra: 1, venta: 2 }),
  ).toMatchObject({ reason: "sin-rango" });
  expect(fijarTasa(CARIBE, { ...base, sedeId: "sede-matanzas", compra: 318, venta: 326 })).toMatchObject({
    reason: "sin-servicio",
  });
  expect(fijarTasa(GLOBAL_SCOPE, { ...base, compra: 318, venta: 326 })).toMatchObject({
    reason: "alcance-global-prohibido",
  });

  const hecho = fijarTasa(MALECON, { ...base, compra: 320, venta: 329 });
  expect(hecho).toMatchObject({ ok: true, value: { anterior: { compra: antes.compra } } });
  /* A12: el tablero es la misma cifra. */
  expect(tableroPublico("sede-vedado").find((t) => t.currency === "USD")).toMatchObject({
    buy: 320,
    sell: 329,
  });

  fijarTasa(MALECON, { ...base, compra: antes.compra, venta: antes.venta });
});

test("mantener una tasa ajustada por PuntoCash no cambia las cifras y quita la marca", () => {
  /* FR-AD-TASA-12: el euro de Obispo está sembrado como ajustado por PuntoCash. */
  const eur = tasaDe("sede-habana-vieja", "EUR")!;
  const marca = eur.fijadaAlLimite;
  const cifras = { compra: eur.compra, venta: eur.venta };
  expect(marca).toBeTruthy();

  expect(confirmarTasaAjustada(CARIBE, "sede-habana-vieja", "EUR", "Prueba").ok).toBe(false);
  expect(confirmarTasaAjustada(MALECON, "sede-habana-vieja", "CAD", "Prueba")).toMatchObject({
    reason: "sin-tasa",
  });

  const hecho = confirmarTasaAjustada(MALECON, "sede-habana-vieja", "EUR", "Prueba");
  expect(hecho).toMatchObject({ ok: true, value: cifras });
  expect(tasaDe("sede-habana-vieja", "EUR")!.fijadaAlLimite).toBeUndefined();

  eur.fijadaAlLimite = marca;
});

test("el tablero solo exhibe lo que está en vigor, y retirar la moneda arrastra su tasa", () => {
  /* FR-AD-TASA-14: Matanzas conserva su tasa del dólar, pero no la exhibe. */
  expect(tasaDe("sede-matanzas", "USD")).not.toBeNull();
  expect(tableroPublico("sede-matanzas")).toHaveLength(0);

  /* FR-AD-TASA-13: retirar la tasa no retira la moneda. */
  const gbp = tasaDe("sede-vedado", "GBP")!;
  expect(retirarTasa(MALECON, "sede-vedado", "GBP").ok).toBe(true);
  expect(monedasDeSede("sede-vedado").some((m) => m.code === "GBP")).toBe(true);
  expect(tableroPublico("sede-vedado").some((t) => t.currency === "GBP")).toBe(false);
  fijarTasa(MALECON, {
    sedeId: "sede-vedado",
    code: "GBP",
    compra: gbp.compra,
    venta: gbp.venta,
    versionDelRango: rangoDe("GBP")!.version,
    autor: "Prueba",
  });

  /* FR-AD-MON-8: retirar el euro de Obispo se lleva su tasa. */
  expect(EFECTOS_EN_TASAS.tasasQueArrastra("sede-habana-vieja", "EUR")).toEqual(["EUR"]);
  /* Y retirar el CUP, todas. */
  expect(EFECTOS_EN_TASAS.tasasQueArrastra("sede-habana-vieja", "CUP")).toEqual(["USD", "EUR"]);
});

test("el horario se escribe por días y se lee agrupando los seguidos", () => {
  const h = {
    ...horarioDe(["lun", "mar", "mie", "jue", "vie"], "08:30", "17:30"),
    sab: { abre: "09:00", cierra: "13:00" },
  };
  expect(lineasDeHorario(h)).toEqual([
    "Lunes a viernes · 8:30 a.m. – 5:30 p.m.",
    "Sábado · 9:00 a.m. – 1:00 p.m.",
  ]);
  expect(lineasDeHorario(horarioDe(["sab", "dom"], "12:00", "20:00"))).toEqual([
    "Sábado y domingo · 12:00 p.m. – 8:00 p.m.",
  ]);
  /* La cara pública sigue diciendo lo mismo que cuando era texto. */
  expect(findSedeById("sede-vedado")!.hours).toBe("Lunes a sábado · 8:30 a.m. – 6:00 p.m.");
});

test("el administrador corrige dirección, teléfono y horario de su sede, y nada más", () => {
  const sede = findSedeById("sede-cerro")!;
  const antes = { address: sede.address, locality: sede.locality, phone: sede.phone, horario: sede.horario };
  const base = { ...antes };

  /* FR-AD-SEDE-14: PuntoCash corrige con `editarSede`; otro operador no ve la sede. */
  expect(editarDatosDeContacto(GLOBAL_SCOPE, "sede-cerro", base)).toMatchObject({ ok: false });
  expect(editarDatosDeContacto(CARIBE, "sede-cerro", base)).toMatchObject({ reason: "fuera-de-alcance" });

  expect(editarDatosDeContacto(MALECON, "sede-cerro", { ...base, address: "  " })).toMatchObject({
    reason: "direccion-vacia",
  });
  expect(editarDatosDeContacto(MALECON, "sede-cerro", { ...base, phone: "1234" })).toMatchObject({
    reason: "telefono-invalido",
  });
  expect(
    editarDatosDeContacto(MALECON, "sede-cerro", { ...base, horario: horarioDe([], "09:00", "18:00") }),
  ).toMatchObject({ reason: "horario-invalido", horario: { motivo: "sin-dias" } });
  expect(
    editarDatosDeContacto(MALECON, "sede-cerro", {
      ...base,
      horario: { ...base.horario, sab: { abre: "18:00", cierra: "09:00" } },
    }),
  ).toMatchObject({ reason: "horario-invalido", horario: { motivo: "cierra-antes", dia: "sab" } });

  const nombre = sede.name;
  const hecho = editarDatosDeContacto(MALECON, "sede-cerro", { ...base, phone: "+53 7 877 0000" });
  expect(hecho).toMatchObject({ ok: true, value: { cambios: ["telefono"] } });
  expect(findSedeById("sede-cerro")).toMatchObject({ phone: "+53 7 877 0000", name: nombre });

  editarDatosDeContacto(MALECON, "sede-cerro", antes);
  expect(findSedeById("sede-cerro")!.phone).toBe(antes.phone);
});

test("una promoción se publica en las sedes propias, con tope de largo y sin fechas pasadas", () => {
  const hoy = hoyEnCuba();
  const base = { titulo: "Prueba", texto: "Texto", sedes: ["sede-cerro"], desde: hoy, hasta: hoy };

  expect(crearPromocion(GLOBAL_SCOPE, base, "PuntoCash")).toMatchObject({ ok: false });
  expect(crearPromocion(MALECON, { ...base, titulo: "x".repeat(41) }, "P")).toMatchObject({ reason: "titulo-largo" });
  expect(crearPromocion(MALECON, { ...base, texto: "x".repeat(121) }, "P")).toMatchObject({ reason: "texto-largo" });
  expect(crearPromocion(MALECON, { ...base, sedes: ["sede-miramar"] }, "P")).toMatchObject({
    reason: "sede-fuera-de-alcance",
  });
  expect(crearPromocion(MALECON, { ...base, desde: sumarDias(hoy, -1) }, "P")).toMatchObject({
    reason: "inicio-pasado",
  });
  expect(crearPromocion(MALECON, { ...base, hasta: sumarDias(hoy, -1) }, "P")).toMatchObject({
    reason: "fin-antes-de-inicio",
  });

  /* La imagen es opcional, y solo JPG, PNG o WebP, sin pasar de 2 MB. */
  expect(crearPromocion(MALECON, { ...base, imagen: "data:image/gif;base64,R0lGOD==" }, "P")).toMatchObject({
    reason: "imagen-invalida",
  });
  expect(
    crearPromocion(MALECON, { ...base, imagen: `data:image/png;base64,${"A".repeat(3_000_000)}` }, "P"),
  ).toMatchObject({ reason: "imagen-pesada" });

  /* Un solo día vale: inicio y fin cuentan los dos. */
  const hecha = crearPromocion(MALECON, base, "P");
  expect(hecha.ok).toBe(true);
  if (!hecha.ok) return;
  expect(promocionesPublicas("sede-cerro").some((p) => p.id === hecha.value.id)).toBe(true);

  /* Las de red y las de otra empresa no se tocan. */
  expect(editarPromocion(MALECON, "promo-red-giros", base, "P")).toMatchObject({ reason: "de-red" });
  expect(retirarPromocion(MALECON, "promo-caribe-miramar", "P")).toMatchObject({ reason: "no-encontrada" });

  /* Retirar la quita de la pantalla al instante, y ya no se puede volver a tocar. */
  expect(retirarPromocion(MALECON, hecha.value.id, "P")).toMatchObject({ ok: true, value: { estabaVigente: true } });
  expect(promocionesPublicas("sede-cerro").some((p) => p.id === hecha.value.id)).toBe(false);
  expect(retirarPromocion(MALECON, hecha.value.id, "P")).toMatchObject({ reason: "vencida" });
});

test("forzar el cierre añade el cierre sin tocar los movimientos, y solo una vez", () => {
  const j = jornadasDeSede("sede-vedado").find((x) => x.estado === "abierta")!;
  const movimientos = j.movimientos.length;
  const ultimo = j.movimientos.at(-1)!.saldoDespues;

  expect(forzarCierre(GLOBAL_SCOPE, j.id, "Motivo suficiente", "PuntoCash")).toMatchObject({ ok: false });
  expect(forzarCierre(CARIBE, j.id, "Motivo suficiente", "Otro")).toMatchObject({ reason: "no-encontrada" });
  expect(forzarCierre(MALECON, j.id, "corto", "Marta")).toMatchObject({ reason: "motivo-corto" });

  const hecho = forzarCierre(MALECON, j.id, "Motivo suficiente", "Marta");
  expect(hecho).toMatchObject({ ok: true, value: { estado: "forzada", cierreForzado: { por: "Marta" } } });
  /* FR-AD-JOR-12: nada de lo anterior cambia; el saldo final es el de libros. */
  expect(j.movimientos.length).toBe(movimientos);
  expect(j.saldosFinales?.some((s) => s.amount === ultimo)).toBe(true);
  /* FR-AD-JOR-11: una cerrada no se vuelve a cerrar. */
  expect(forzarCierre(MALECON, j.id, "Motivo suficiente", "Marta")).toMatchObject({ reason: "ya-cerrada" });
});


test("cada apertura cuenta contra el cierre anterior de su caja, y toda diferencia tiene motivo", () => {
  const todas = ["sede-vedado", "sede-habana-vieja"].flatMap((s) => jornadasDeSede(s));
  let comparadas = 0;
  for (const j of todas) {
    /* El fondeo es lo contado al abrir. */
    expect(j.fondeo.map((f) => f.amount)).toEqual(j.apertura.monedas.map((m) => m.contado));
    const previo = j.apertura.cierreAnterior;
    if (!previo) continue;
    comparadas += 1;
    const anterior = jornadaPorId(previo.jornadaId)!;
    expect(anterior.registerId).toBe(j.registerId);
    expect(previo.sinArqueo).toBe(anterior.estado === "forzada");
    for (const m of j.apertura.monedas) {
      expect(m.dejado).toBe(anterior.saldosFinales?.find((s) => s.currency === m.currency)?.amount ?? 0);
      expect(m.contado - (m.dejado ?? 0)).toBe(m.diferencia);
      if (m.diferencia !== 0) expect(m.motivo).toBeTruthy();
    }
  }
  expect(comparadas).toBeGreaterThan(10);
});

test("un cierre sin arqueo queda pendiente hasta que la apertura siguiente lo cuenta", () => {
  const forzada = jornadasDeSede("sede-habana-vieja").find((j) => j.estado === "forzada" && j.cierreForzado?.por === "Marta Sánchez")!;
  const c = conciliacionDe(forzada);
  expect(c).toMatchObject({ estado: "contada" });
  if (c?.estado === "contada") {
    expect(c.jornada.apertura.cierreAnterior?.sinArqueo).toBe(true);
    expect(c.diferencias.map((d) => [d.currency, d.diferencia, d.motivo])).toEqual([["CUP", -2000, "Faltante detectado"]]);
  }
  /* Una cerrada con arqueo o una abierta no tienen nada que conciliar. */
  expect(conciliacionDe(jornadasDeSede("sede-vedado").find((j) => j.estado === "cerrada")!)).toBeNull();
});

test("el día de una sede se cuenta por cajas, no en un solo estado", () => {
  const dia = diaDeSede("sede-vedado");
  expect(dia.cajas.length).toBeGreaterThan(1);
  expect(dia.abiertas).toBe(dia.cajas.filter((c) => c.abierta).length);
  /* Un trabajador no tiene dos jornadas abiertas: en turno hay tantos como cajas abiertas. */
  expect(dia.enTurno.length).toBe(dia.abiertas);
  /* Una caja abierta o cerrada sabe adónde llevar; la que nunca abrió, a ninguna. */
  for (const c of dia.cajas) if (c.abierta) expect(c.abierta.registerId).toBe(c.registerId);
});

test("las diferencias del día no cuentan reposiciones ni retiros, y sí los cierres forzados sin contar", () => {
  for (const sede of ["sede-vedado", "sede-habana-vieja"]) {
    for (const d of diferenciasDelDia(sede)) {
      if (d.momento === "sin-conciliar") {
        expect(conciliacionDe(d.jornada)).toMatchObject({ estado: "pendiente" });
        continue;
      }
      expect(d.monedas.length).toBeGreaterThan(0);
      if (d.momento === "apertura") {
        for (const m of d.monedas) {
          const motivo = d.jornada.apertura.monedas.find((x) => x.currency === m.currency)?.motivo;
          expect(["Reposición de fondos", "Retiro de fondos"]).not.toContain(motivo);
        }
      }
    }
  }
});

test("en horario es por día y franja, en hora de Cuba", () => {
  const h = horarioDe(["lun", "mar", "mie", "jue", "vie"], "08:30", "17:30");
  /* Lunes 19/10/2026: 14:00 UTC son las 10:00 en La Habana (UTC−4 en octubre). */
  expect(enHorario(h, new Date("2026-10-19T14:00:00Z"))).toBe(true);
  expect(enHorario(h, new Date("2026-10-19T22:00:00Z"))).toBe(false);
  /* Sábado: cerrado. */
  expect(enHorario(h, new Date("2026-10-17T14:00:00Z"))).toBe(false);
});

test("cada operación completada deja sus movimientos en su jornada, y las demás no mueven nada", () => {
  for (const sede of ["sede-vedado", "sede-habana-vieja"]) {
    const ops = operacionesDeSede(sede);
    expect(ops.length).toBeGreaterThan(20);
    expect(new Set(ops.map((o) => o.codigo)).size).toBe(ops.length);
    for (const o of ops) {
      const j = jornadaPorId(o.jornadaId)!;
      expect(j.registerId).toBe(o.registerId);
      const movs = j.movimientos.filter((m) => m.operationCode === o.codigo);
      if (o.estado === "Completada") {
        /* Un cambio deja dos movimientos; una remesa o un giro, uno. */
        expect(movs.length).toBe(o.servicio === "Cambio de moneda" ? 2 : 1);
      } else {
        expect(movs.length).toBe(0);
      }
    }
  }
});

/* -------------------------------------------------------------------------
 * Revisión completa de /admin (20/10/2026)
 * ---------------------------------------------------------------------- */

test("la única caja activa de una sede en marcha no se retira", () => {
  /* sede-cerro llega sin cajas: la que se crea aquí es la única. */
  const creada = crearCaja(MALECON, SCOPE_CONTEXT, { branchId: "sede-cerro", name: "Caja única QA" });
  expect(creada.ok).toBe(true);
  if (!creada.ok) return;

  const retirada = retirarCaja(MALECON, SCOPE_CONTEXT, creada.value.id, "Prueba de la última caja activa");
  expect(retirada.ok).toBe(false);
  if (!retirada.ok) expect(retirada.reason).toBe("ultima-caja");
});

test("una caja nueva lleva un identificador único aunque el nombre normalizado coincida", () => {
  const a = crearCaja(MALECON, SCOPE_CONTEXT, { branchId: "sede-vedado", name: "Caja Ñandú" });
  expect(a.ok).toBe(true);
  if (!a.ok) return;
  expect(a.value.id).toBe("sede-vedado:caja-nandu");
  retirarCaja(MALECON, SCOPE_CONTEXT, a.value.id, "Limpieza del estado de la prueba");
});

test("una promoción en pantalla no se acorta con un fin ya pasado: se retira", () => {
  const hoy = hoyEnCuba(new Date());
  const hace3 = new Date(Date.now() - 3 * 86_400_000);
  const input = {
    titulo: "Promoción de prueba",
    texto: "Texto de la promoción de prueba.",
    sedes: ["sede-vedado"],
    desde: sumarDias(hoy, -3),
    hasta: sumarDias(hoy, 5),
  };
  const creada = crearPromocion(MALECON, input, "QA", hace3);
  expect(creada.ok).toBe(true);
  if (!creada.ok) return;

  const acortada = editarPromocion(MALECON, creada.value.id, { ...input, hasta: sumarDias(hoy, -1) }, "QA");
  expect(acortada.ok).toBe(false);
  if (!acortada.ok) expect(acortada.reason).toBe("fin-pasado");

  /* Y su inicio, en pantalla, ya no se mueve. */
  const movida = editarPromocion(MALECON, creada.value.id, { ...input, desde: hoy }, "QA");
  expect(movida.ok).toBe(false);
  if (!movida.ok) expect(movida.reason).toBe("inicio-fijo");

  expect(retirarPromocion(MALECON, creada.value.id, "QA").ok).toBe(true);
});
