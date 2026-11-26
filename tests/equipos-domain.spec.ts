import { expect, test } from "@playwright/test";

import {
  GLOBAL_SCOPE,
  SCOPE_CONTEXT,
  desvincularEquipo,
  emitirReto,
  equipoDeCaja,
  findTerminalById,
  formatPairingCode,
  idDeEquipo,
  kioscosDeSede,
  marcarActividad,
  operatorScope,
  pairingQrPayload,
  redEnAlcance,
  resolverTerminal,
  retoVigente,
  TERMINALS,
  vincularEquipo,
} from "../src/features/network";

/**
 * El dominio de EQUIPOS — Admin FRD §3, tramo 1.
 *
 * Sin navegador: lo que se comprueba son las reglas del acto de vincular, que
 * es donde está el valor. La pantalla llega en los tramos siguientes.
 *
 * ── Qué cambió, y por qué estas pruebas son el punto de la entrega ────────
 * Hasta aquí el vínculo de un terminal vivía en el `localStorage` de esa
 * máquina y el registro central era otra cosa, contra **FR-AD-DOM-4**. La
 * verdad se mudó al servidor, que es la forma del producto real
 * (**FR-AD-EQ-25**): el terminal muestra su código fijo, vincular es un acto
 * del administrador con alcance, y el identificador del equipo lo da el
 * servidor al vincular (decisión del 26/11/2026).
 *
 * Eso convierte en comprobables cosas que antes no lo eran: que un código no
 * vincula dos veces, que cada vinculación da un identificador nuevo, que una
 * caja ajena no se puede nombrar, y que el alcance global no vincula nada.
 *
 * ── Disciplina de estado ──────────────────────────────────────────────────
 * En serie y sobre el dominio en memoria compartido, igual que
 * `network-domain`. Toda prueba que vincula **desvincula al final**, y se
 * trabaja sobre **Caribe y sede-matanzas**: las pruebas de navegador de
 * `/admin` entran como Marta, de Malecón, y dependen de que Vedado conserve su
 * caja sin equipo (`admin-cajas`) y sus dos kioscos (`network-domain`).
 */
test.describe.configure({ mode: "serial" });

const MALECON = operatorScope("op-malecon");
const CARIBE = operatorScope("op-caribe");

/** Sede de Caribe sin ningún equipo sembrado, y sus cajas. */
const MATANZAS = "sede-matanzas";
const CAJA_LIBRE = "sede-matanzas:caja-01";
const OTRA_CAJA_LIBRE = "sede-matanzas:caja-02";

/** Desvincula si quedó algo vinculado, para que la prueba siguiente parta de cero. */
function limpiar(id: string): void {
  if (findTerminalById(id)) desvincularEquipo(CARIBE, SCOPE_CONTEXT, id);
}

/* -------------------------------------------------------------------------
 * El código lo genera el equipo y no caduca (decisión del 26/11/2026)
 * ---------------------------------------------------------------------- */

test("el equipo se anuncia con su código, y es siempre el mismo", () => {
  const primero = emitirReto("kiosco", "9A0011");
  expect(primero).toEqual({ code: "9A0011", kind: "kiosco" });

  /* Un terminal que se anuncia dos veces no cambia de código: el que tiene
     en pantalla sigue siendo el que el administrador va a teclear. */
  expect(emitirReto("kiosco", "9a0011")).toEqual(primero);
  expect(retoVigente("9A0011")).toEqual(primero);
});

test("un código que no tiene seis caracteres hexadecimales no se anuncia", () => {
  expect(emitirReto("kiosco", "9A001")).toBeNull();
  expect(emitirReto("kiosco", "9A00G1")).toBeNull();
  expect(emitirReto("caja", "CAJ-9002-0001")).toBeNull();
});

test("el código se muestra agrupado de tres en tres", () => {
  expect(formatPairingCode("49214C")).toBe("492 14C");
});

/* -------------------------------------------------------------------------
 * «¿Quién soy?» — lo contesta el servidor, no el terminal
 * ---------------------------------------------------------------------- */

test("un equipo sembrado se resuelve como vinculado, con su identificador", () => {
  const sesion = resolverTerminal("caja", "7C1A03");
  expect(sesion?.status).toBe("vinculado");
  if (sesion?.status === "vinculado") {
    expect(sesion.terminal.id).toBe("CA-1A0E7C03");
    expect(sesion.terminal.registerId).toBe("sede-vedado:caja-03");
    expect(sesion.terminal.linkedBy).toBe("Marta Sánchez");
  }
  expect(idDeEquipo("caja", "7c1a03")).toBe("CA-1A0E7C03");
});

test("un equipo desconocido se resuelve sin vincular, pendiente si se anunció", () => {
  const sinAnunciar = resolverTerminal("kiosco", "9A0031");
  expect(sinAnunciar).toEqual({ status: "sin-vincular", codigo: "9A0031", pairing: null });

  const reto = emitirReto("kiosco", "9A0031")!;
  const anunciado = resolverTerminal("kiosco", "9A0031");
  expect(anunciado).toEqual({ status: "sin-vincular", codigo: "9A0031", pairing: reto });
});

test("un código de otra clase no resuelve como vinculado", () => {
  /* El mismo navegador es caja y kiosco a la vez en la demostración, con una
     cookie por clase. Preguntar con la cookie equivocada no debe contestar el
     vínculo de la otra. */
  const sesion = resolverTerminal("kiosco", "7C1A03");
  expect(sesion?.status).toBe("sin-vincular");
  expect(idDeEquipo("kiosco", "7C1A03")).toBeNull();
});

test("sin código no hay nada que resolver", () => {
  expect(resolverTerminal("caja", null)).toBeNull();
  expect(resolverTerminal("caja", undefined)).toBeNull();
});

/* -------------------------------------------------------------------------
 * Vincular — el acto del administrador (FR-AD-EQ-3, A10)
 * ---------------------------------------------------------------------- */

test("vincular una caja por código ignora espacios y mayúsculas, y le da su identificador", () => {
  const reto = emitirReto("caja", "9C1001")!;

  const resultado = vincularEquipo(CARIBE, SCOPE_CONTEXT, {
    reto: { method: "codigo", code: formatPairingCode(reto.code).toLowerCase() },
    branchId: MATANZAS,
    registerId: CAJA_LIBRE,
    by: "Reinaldo Ortega",
  });

  expect(resultado.ok).toBe(true);
  if (!resultado.ok) return;
  const id = resultado.value.id;
  /* El identificador lo da el servidor: `CA-` y ocho caracteres hexadecimales. */
  expect(id).toMatch(/^CA-[0-9A-F]{8}$/);
  expect(resultado.value.codigo).toBe("9C1001");
  {
    expect(resultado.value.registerId).toBe(CAJA_LIBRE);
    expect(resultado.value.linkedBy).toBe("Reinaldo Ortega");
    expect(resultado.value.linkMethod).toBe("codigo");
    // Sin etiqueta propia, se compone del objeto al que se ató.
    expect(resultado.value.label).toContain("Caja 01");
  }

  // Y el terminal, al preguntar con su código, ya es esa caja.
  expect(resolverTerminal("caja", "9C1001")?.status).toBe("vinculado");
  expect(equipoDeCaja(CAJA_LIBRE)?.id).toBe(id);

  limpiar(id);
});

test("vincular por QR funciona igual, con el contenido del reto", () => {
  const reto = emitirReto("caja", "9C1011")!;

  const resultado = vincularEquipo(CARIBE, SCOPE_CONTEXT, {
    reto: { method: "qr", payload: pairingQrPayload(reto) },
    branchId: MATANZAS,
    registerId: CAJA_LIBRE,
    by: "Reinaldo Ortega",
    label: "Mostrador de la entrada",
  });

  expect(resultado.ok).toBe(true);
  if (resultado.ok) {
    expect(resultado.value.linkMethod).toBe("qr");
    expect(resultado.value.label).toBe("Mostrador de la entrada");
    limpiar(resultado.value.id);
  }
});

test("un código no vincula dos veces", () => {
  const reto = emitirReto("caja", "9C1021")!;
  const input = {
    reto: { method: "codigo" as const, code: reto.code },
    branchId: MATANZAS,
    registerId: CAJA_LIBRE,
    by: "Reinaldo Ortega",
  };

  const primero = vincularEquipo(CARIBE, SCOPE_CONTEXT, input);
  expect(primero.ok).toBe(true);

  /* Al vincular deja de estar pendiente. Es **FR-AD-EQ-23**: el mismo
     código no ata el equipo a una segunda caja. */
  const segundo = vincularEquipo(CARIBE, SCOPE_CONTEXT, { ...input, registerId: OTRA_CAJA_LIBRE });
  expect(segundo.ok).toBe(false);
  if (!segundo.ok) expect(segundo.reason).toBe("codigo-no-coincide");

  if (primero.ok) limpiar(primero.value.id);
});

test("cada vinculación da un identificador nuevo, único entre cajas y kioscos", () => {
  const reto = emitirReto("caja", "9C1031")!;
  const datos = { reto: { method: "codigo" as const, code: reto.code }, branchId: MATANZAS, registerId: CAJA_LIBRE, by: "Reinaldo Ortega" };
  const primera = vincularEquipo(CARIBE, SCOPE_CONTEXT, datos);
  expect(primera.ok).toBe(true);
  if (!primera.ok) return;

  /* Al desvincular se retira el identificador; el código del equipo sigue
     siendo el mismo y, al volver a anunciarse, vuelve a estar pendiente. */
  limpiar(primera.value.id);
  expect(findTerminalById(primera.value.id)).toBeNull();
  emitirReto("caja", "9C1031");
  const segunda = vincularEquipo(CARIBE, SCOPE_CONTEXT, datos);
  expect(segunda.ok).toBe(true);
  if (!segunda.ok) return;
  expect(segunda.value.id).not.toBe(primera.value.id);

  /* Ninguna caja comparte los ocho caracteres con un kiosco, ni al revés. */
  const ochos = TERMINALS.map((t) => t.id.slice(3));
  expect(new Set(ochos).size).toBe(ochos.length);

  limpiar(segunda.value.id);
});

test("una caja tiene como máximo un equipo", () => {
  const primero = emitirReto("caja", "9C1041")!;
  const vinculado = vincularEquipo(CARIBE, SCOPE_CONTEXT, {
    reto: { method: "codigo", code: primero.code },
    branchId: MATANZAS,
    registerId: CAJA_LIBRE,
    by: "Reinaldo Ortega",
  });
  expect(vinculado.ok).toBe(true);

  /* **FR-AD-EQ-8**: sustituir el equipo de una caja exige desvincular el
     anterior primero, y el dominio es quien lo impide. */
  const segundo = emitirReto("caja", "9C1042")!;
  const choque = vincularEquipo(CARIBE, SCOPE_CONTEXT, {
    reto: { method: "codigo", code: segundo.code },
    branchId: MATANZAS,
    registerId: CAJA_LIBRE,
    by: "Reinaldo Ortega",
  });
  expect(choque.ok).toBe(false);
  if (!choque.ok) expect(choque.reason).toBe("caja-ya-vinculada");

  if (vinculado.ok) limpiar(vinculado.value.id);
});

test("una sede puede tener varios kioscos", () => {
  const uno = emitirReto("kiosco", "9C1051")!;
  const dos = emitirReto("kiosco", "9C1052")!;
  const comun = { branchId: MATANZAS, by: "Reinaldo Ortega" };

  const a = vincularEquipo(CARIBE, SCOPE_CONTEXT, { ...comun, reto: { method: "codigo", code: uno.code } });
  /* **FR-AD-EQ-14**: aquí no rige el límite de uno por objeto. */
  const b = vincularEquipo(CARIBE, SCOPE_CONTEXT, { ...comun, reto: { method: "codigo", code: dos.code } });
  expect(a.ok && b.ok).toBe(true);
  if (!a.ok || !b.ok) return;

  expect(kioscosDeSede(MATANZAS)).toHaveLength(2);
  /* Un kiosco no se ata a ningún mostrador, y su identificador empieza por `KI-`. */
  expect(a.value.registerId).toBeUndefined();
  expect(a.value.id).toMatch(/^KI-[0-9A-F]{8}$/);

  limpiar(a.value.id);
  limpiar(b.value.id);
  expect(kioscosDeSede(MATANZAS)).toHaveLength(0);
});

test("a una caja hay que decirle qué caja es; a un kiosco no", () => {
  const reto = emitirReto("caja", "9C1061")!;
  const sinCaja = vincularEquipo(CARIBE, SCOPE_CONTEXT, {
    reto: { method: "codigo", code: reto.code },
    branchId: MATANZAS,
    by: "Reinaldo Ortega",
  });
  expect(sinCaja.ok).toBe(false);
  if (!sinCaja.ok) expect(sinCaja.reason).toBe("caja-requerida");

  // El equipo sigue pendiente: el error no cuesta volver a empezar.
  expect(retoVigente("9C1061")).not.toBeNull();
});

test("una caja de otra sede no se puede nombrar", () => {
  const reto = emitirReto("caja", "9C1071")!;
  const resultado = vincularEquipo(CARIBE, SCOPE_CONTEXT, {
    reto: { method: "codigo", code: reto.code },
    branchId: MATANZAS,
    /* Existe, pero es de Malecón. Pasarla junto a una sede propia es el
       intento que **FR-AD-EQ-7** manda revalidar en el dominio. */
    registerId: "sede-vedado:caja-04",
    by: "Reinaldo Ortega",
  });

  expect(resultado.ok).toBe(false);
  if (!resultado.ok) expect(resultado.reason).toBe("caja-no-encontrada");
});

/* -------------------------------------------------------------------------
 * Alcance (A1, A14)
 * ---------------------------------------------------------------------- */

test("nadie vincula en una sede ajena, y no llega a saber si el código servía", () => {
  const reto = emitirReto("caja", "9C1081")!;

  /* El alcance se comprueba **antes** que el código, a propósito: así quien
     prueba identificadores de sede no averigua además si acertó el código. */
  const resultado = vincularEquipo(MALECON, SCOPE_CONTEXT, {
    reto: { method: "codigo", code: reto.code },
    branchId: MATANZAS,
    registerId: CAJA_LIBRE,
    by: "Marta Sánchez",
  });

  expect(resultado.ok).toBe(false);
  if (!resultado.ok) expect(resultado.reason).toBe("fuera-de-alcance");
  // Y sigue pendiente: el dueño de la sede todavía puede vincularlo.
  expect(retoVigente("9C1081")).not.toBeNull();
});

test("PuntoCash no vincula equipos dentro de una sede", () => {
  const reto = emitirReto("caja", "9C1091")!;

  /* **A14** y **FR-AD-EQ-3**: observa dentro de la sede y actúa solo sobre la
     sede entera. Vincular es del mercante. */
  const resultado = vincularEquipo(GLOBAL_SCOPE, SCOPE_CONTEXT, {
    reto: { method: "codigo", code: reto.code },
    branchId: MATANZAS,
    registerId: CAJA_LIBRE,
    by: "PuntoCash",
  });

  expect(resultado.ok).toBe(false);
  if (!resultado.ok) expect(resultado.reason).toBe("alcance-global-prohibido");
});

/* -------------------------------------------------------------------------
 * Desvincular (FR-AD-EQ-9, FR-AD-EQ-10)
 * ---------------------------------------------------------------------- */

test("desvincular devuelve el terminal a su pantalla de vinculación", () => {
  const reto = emitirReto("caja", "9C1101")!;
  const vinculado = vincularEquipo(CARIBE, SCOPE_CONTEXT, {
    reto: { method: "codigo", code: reto.code },
    branchId: MATANZAS,
    registerId: CAJA_LIBRE,
    by: "Reinaldo Ortega",
  });
  expect(vinculado.ok).toBe(true);
  if (!vinculado.ok) return;

  const resultado = desvincularEquipo(CARIBE, SCOPE_CONTEXT, vinculado.value.id);
  expect(resultado.ok).toBe(true);

  /* El terminal lo sabe en cuanto vuelve a preguntar, y lo que ve es «sin
     vincular», con el mismo código: se volverá a anunciar él (**FR-AS-LINK-6**). */
  expect(resolverTerminal("caja", "9C1101")).toEqual({
    status: "sin-vincular",
    codigo: "9C1101",
    pairing: null,
  });
  expect(equipoDeCaja(CAJA_LIBRE)).toBeNull();
});

test("no se desvincula un equipo de otra empresa, ni uno que no existe", () => {
  const ajeno = desvincularEquipo(MALECON, SCOPE_CONTEXT, "CA-3C8A2E01");
  expect(ajeno.ok).toBe(false);
  if (!ajeno.ok) expect(ajeno.reason).toBe("fuera-de-alcance");

  const global = desvincularEquipo(GLOBAL_SCOPE, SCOPE_CONTEXT, "CA-1A0E7C03");
  expect(global.ok).toBe(false);
  if (!global.ok) expect(global.reason).toBe("alcance-global-prohibido");

  const inventado = desvincularEquipo(CARIBE, SCOPE_CONTEXT, "CA-00000000");
  expect(inventado.ok).toBe(false);
  if (!inventado.ok) expect(inventado.reason).toBe("equipo-no-encontrado");

  // Y el equipo ajeno sigue donde estaba.
  expect(findTerminalById("CA-3C8A2E01")).not.toBeNull();
});

/* -------------------------------------------------------------------------
 * Lo que ve el administrador (FR-AD-EQ-1)
 * ---------------------------------------------------------------------- */

test("la vista con alcance solo entrega equipos de sedes propias", () => {
  const malecon = redEnAlcance(MALECON);
  expect(malecon.equipos("sede-vedado").length).toBeGreaterThan(0);
  expect(malecon.equipo("CA-1A0E7C03")?.registerId).toBe("sede-vedado:caja-03");

  /* Miramar es de Caribe: sus equipos existen y para Malecón no. */
  expect(malecon.equipos("sede-miramar")).toEqual([]);
  expect(malecon.equipo("CA-3C8A2E01")).toBeNull();
  expect(redEnAlcance(CARIBE).equipo("CA-3C8A2E01")).not.toBeNull();
});

test("la última actividad la sella el propio terminal", () => {
  const antes = findTerminalById("CA-1A0E7C01")!.lastSeenAt;
  const ahora = new Date("2026-10-05T09:30:00.000Z");

  marcarActividad("CA-1A0E7C01", ahora);
  expect(findTerminalById("CA-1A0E7C01")!.lastSeenAt).toBe(ahora.toISOString());

  // Se deja como estaba: otras pruebas leen esta fila.
  marcarActividad("CA-1A0E7C01", new Date(antes!));
});
