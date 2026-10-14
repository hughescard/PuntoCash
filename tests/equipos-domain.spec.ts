import { expect, test } from "@playwright/test";

import {
  GLOBAL_SCOPE,
  SCOPE_CONTEXT,
  desvincularEquipo,
  emitirReto,
  equipoDeCaja,
  findTerminalById,
  formatPairingCode,
  kioscosDeSede,
  marcarActividad,
  operatorScope,
  pairingQrPayload,
  redEnAlcance,
  resolverTerminal,
  retoVigente,
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
 * (**FR-AD-EQ-25**): el reto lo **emite** el servidor, el terminal solo lo
 * muestra, y vincular es un acto del administrador con alcance.
 *
 * Eso convierte en comprobables cosas que antes no lo eran: que un reto es de
 * un solo uso, que caduca mientras alguien elige la sede, que una caja ajena
 * no se puede nombrar, y que el alcance global no vincula nada.
 *
 * ── Disciplina de estado ──────────────────────────────────────────────────
 * En serie y sobre el dominio en memoria compartido, igual que
 * `network-domain`. Toda prueba que vincula **desvincula al final**, y se
 * trabaja sobre **Caribe y sede-matanzas**: las pruebas de navegador de
 * `/admin` entran como Marta, de Antilla, y dependen de que Vedado conserve su
 * caja sin equipo (`admin-cajas`) y sus dos kioscos (`network-domain`).
 */
test.describe.configure({ mode: "serial" });

const ANTILLA = operatorScope("op-antilla");
const CARIBE = operatorScope("op-caribe");

/** Sede de Caribe sin ningún equipo sembrado, y sus cajas. */
const MATANZAS = "sede-matanzas";
const CAJA_LIBRE = "sede-matanzas:caja-01";
const OTRA_CAJA_LIBRE = "sede-matanzas:caja-02";

const EN_DIEZ_MINUTOS = 10 * 60_000;

/** Desvincula si quedó algo vinculado, para que la prueba siguiente parta de cero. */
function limpiar(deviceId: string): void {
  if (findTerminalById(deviceId)) desvincularEquipo(CARIBE, SCOPE_CONTEXT, deviceId);
}

/* -------------------------------------------------------------------------
 * El reto lo emite el servidor (FR-AD-EQ-25, FR-DEV-2)
 * ---------------------------------------------------------------------- */

test("el mismo equipo recibe el mismo reto mientras siga vigente", () => {
  const primero = emitirReto("kiosco", "KIO-9001-0001");
  expect(primero).not.toBeNull();
  expect(primero!.code).toHaveLength(6);
  expect(primero!.deviceId).toBe("KIO-9001-0001");

  /* Un terminal que pregunta dos veces no debe ver dos códigos: el que tiene
     pegado en la pantalla seguiría siendo válido y el administrador tecleando
     el otro. */
  expect(emitirReto("kiosco", "KIO-9001-0001")).toEqual(primero);
  expect(retoVigente("KIO-9001-0001")).toEqual(primero);
});

test("un reto caducado se renueva, y el caducado deja de valer", () => {
  const ahora = new Date("2026-10-05T10:00:00.000Z");
  const viejo = emitirReto("kiosco", "KIO-9002-0001", ahora)!;

  const despues = new Date(ahora.getTime() + EN_DIEZ_MINUTOS + 1000);
  expect(retoVigente("KIO-9002-0001", despues)).toBeNull();

  const nuevo = emitirReto("kiosco", "KIO-9002-0001", despues)!;
  expect(nuevo.code).not.toBe(viejo.code);
  expect(retoVigente("KIO-9002-0001", despues)).toEqual(nuevo);
});

test("el código se muestra agrupado de tres en tres", () => {
  expect(formatPairingCode("482913")).toBe("482 913");
});

/* -------------------------------------------------------------------------
 * «¿Quién soy?» — lo contesta el servidor, no el terminal
 * ---------------------------------------------------------------------- */

test("un equipo sembrado se resuelve como vinculado", () => {
  const sesion = resolverTerminal("caja", "CAJ-0001-0003");
  expect(sesion?.status).toBe("vinculado");
  if (sesion?.status === "vinculado") {
    expect(sesion.terminal.registerId).toBe("sede-vedado:caja-03");
    expect(sesion.terminal.linkedBy).toBe("Marta Sánchez");
  }
});

test("un equipo desconocido se resuelve sin vincular, con su reto si lo tiene", () => {
  const sinReto = resolverTerminal("kiosco", "KIO-9003-0001");
  expect(sinReto).toEqual({ status: "sin-vincular", deviceId: "KIO-9003-0001", pairing: null });

  const reto = emitirReto("kiosco", "KIO-9003-0001")!;
  const conReto = resolverTerminal("kiosco", "KIO-9003-0001");
  expect(conReto).toEqual({ status: "sin-vincular", deviceId: "KIO-9003-0001", pairing: reto });
});

test("un identificador de otra clase no resuelve como vinculado", () => {
  /* El mismo navegador es caja y kiosco a la vez en la demostración, con una
     cookie por clase. Preguntar con la cookie equivocada no debe contestar el
     vínculo de la otra. */
  const sesion = resolverTerminal("kiosco", "CAJ-0001-0003");
  expect(sesion?.status).toBe("sin-vincular");
});

test("sin identificador no hay nada que resolver", () => {
  expect(resolverTerminal("caja", null)).toBeNull();
  expect(resolverTerminal("caja", undefined)).toBeNull();
});

/* -------------------------------------------------------------------------
 * Vincular — el acto del administrador (FR-AD-EQ-3, A10)
 * ---------------------------------------------------------------------- */

test("vincular una caja por código ignora los espacios y queda registrado", () => {
  const reto = emitirReto("caja", "CAJ-9100-0001")!;

  const resultado = vincularEquipo(CARIBE, SCOPE_CONTEXT, {
    reto: { method: "codigo", code: formatPairingCode(reto.code) },
    branchId: MATANZAS,
    registerId: CAJA_LIBRE,
    by: "Reinaldo Ortega",
  });

  expect(resultado.ok).toBe(true);
  if (resultado.ok) {
    expect(resultado.value.id).toBe("CAJ-9100-0001");
    expect(resultado.value.registerId).toBe(CAJA_LIBRE);
    expect(resultado.value.linkedBy).toBe("Reinaldo Ortega");
    expect(resultado.value.linkMethod).toBe("codigo");
    // Sin etiqueta propia, se compone del objeto al que se ató.
    expect(resultado.value.label).toContain("Caja 01");
  }

  // Y el terminal, al preguntar, ya es esa caja.
  expect(resolverTerminal("caja", "CAJ-9100-0001")?.status).toBe("vinculado");
  expect(equipoDeCaja(CAJA_LIBRE)?.id).toBe("CAJ-9100-0001");

  limpiar("CAJ-9100-0001");
});

test("vincular por QR funciona igual, con el contenido del reto", () => {
  const reto = emitirReto("caja", "CAJ-9101-0001")!;

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
  }

  limpiar("CAJ-9101-0001");
});

test("un reto es de un solo uso", () => {
  const reto = emitirReto("caja", "CAJ-9102-0001")!;
  const input = {
    reto: { method: "codigo" as const, code: reto.code },
    branchId: MATANZAS,
    registerId: CAJA_LIBRE,
    by: "Reinaldo Ortega",
  };

  expect(vincularEquipo(CARIBE, SCOPE_CONTEXT, input).ok).toBe(true);

  /* El segundo intento no encuentra el reto: se consumió. Es **FR-AD-EQ-23**,
     y es lo que impide que un código fotografiado vincule un segundo equipo. */
  const segundo = vincularEquipo(CARIBE, SCOPE_CONTEXT, { ...input, registerId: OTRA_CAJA_LIBRE });
  expect(segundo.ok).toBe(false);
  if (!segundo.ok) expect(segundo.reason).toBe("codigo-no-coincide");

  limpiar("CAJ-9102-0001");
});

test("un reto que caducó mientras se elegía la sede se rechaza, no se aplica", () => {
  const ahora = new Date("2026-10-05T12:00:00.000Z");
  const reto = emitirReto("caja", "CAJ-9103-0001", ahora)!;

  /* **FR-AD-EQ-22** y **[R3]**: la revalidación ocurre al confirmar, no al
     leer el código. Diez minutos dan de sobra para elegir mal. */
  const tarde = new Date(ahora.getTime() + EN_DIEZ_MINUTOS + 1);
  const resultado = vincularEquipo(
    CARIBE,
    SCOPE_CONTEXT,
    {
      reto: { method: "codigo", code: reto.code },
      branchId: MATANZAS,
      registerId: CAJA_LIBRE,
      by: "Reinaldo Ortega",
    },
    tarde,
  );

  expect(resultado.ok).toBe(false);
  if (!resultado.ok) expect(resultado.reason).toBe("codigo-caducado");
  expect(findTerminalById("CAJ-9103-0001")).toBeNull();
});

test("una caja tiene como máximo un equipo", () => {
  const primero = emitirReto("caja", "CAJ-9104-0001")!;
  expect(
    vincularEquipo(CARIBE, SCOPE_CONTEXT, {
      reto: { method: "codigo", code: primero.code },
      branchId: MATANZAS,
      registerId: CAJA_LIBRE,
      by: "Reinaldo Ortega",
    }).ok,
  ).toBe(true);

  /* **FR-AD-EQ-8**: sustituir el equipo de una caja exige desvincular el
     anterior primero, y el dominio es quien lo impide. */
  const segundo = emitirReto("caja", "CAJ-9104-0002")!;
  const choque = vincularEquipo(CARIBE, SCOPE_CONTEXT, {
    reto: { method: "codigo", code: segundo.code },
    branchId: MATANZAS,
    registerId: CAJA_LIBRE,
    by: "Reinaldo Ortega",
  });
  expect(choque.ok).toBe(false);
  if (!choque.ok) expect(choque.reason).toBe("caja-ya-vinculada");

  limpiar("CAJ-9104-0001");
});

test("una sede puede tener varios kioscos", () => {
  const uno = emitirReto("kiosco", "KIO-9105-0001")!;
  const dos = emitirReto("kiosco", "KIO-9105-0002")!;
  const comun = { branchId: MATANZAS, by: "Reinaldo Ortega" };

  expect(vincularEquipo(CARIBE, SCOPE_CONTEXT, { ...comun, reto: { method: "codigo", code: uno.code } }).ok).toBe(true);
  /* **FR-AD-EQ-14**: aquí no rige el límite de uno por objeto. */
  expect(vincularEquipo(CARIBE, SCOPE_CONTEXT, { ...comun, reto: { method: "codigo", code: dos.code } }).ok).toBe(true);

  expect(kioscosDeSede(MATANZAS)).toHaveLength(2);
  // Y un kiosco no se ata a ningún mostrador.
  expect(findTerminalById("KIO-9105-0001")?.registerId).toBeUndefined();

  limpiar("KIO-9105-0001");
  limpiar("KIO-9105-0002");
  expect(kioscosDeSede(MATANZAS)).toHaveLength(0);
});

test("a una caja hay que decirle qué caja es; a un kiosco no", () => {
  const reto = emitirReto("caja", "CAJ-9106-0001")!;
  const sinCaja = vincularEquipo(CARIBE, SCOPE_CONTEXT, {
    reto: { method: "codigo", code: reto.code },
    branchId: MATANZAS,
    by: "Reinaldo Ortega",
  });
  expect(sinCaja.ok).toBe(false);
  if (!sinCaja.ok) expect(sinCaja.reason).toBe("caja-requerida");

  // El reto no se consumió: el error no cuesta volver a empezar.
  expect(retoVigente("CAJ-9106-0001")).not.toBeNull();
});

test("una caja de otra sede no se puede nombrar", () => {
  const reto = emitirReto("caja", "CAJ-9107-0001")!;
  const resultado = vincularEquipo(CARIBE, SCOPE_CONTEXT, {
    reto: { method: "codigo", code: reto.code },
    branchId: MATANZAS,
    /* Existe, pero es de Antilla. Pasarla junto a una sede propia es el
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
  const reto = emitirReto("caja", "CAJ-9108-0001")!;

  /* El alcance se comprueba **antes** que el reto, a propósito: así quien
     prueba identificadores de sede no averigua además si acertó el código. */
  const resultado = vincularEquipo(ANTILLA, SCOPE_CONTEXT, {
    reto: { method: "codigo", code: reto.code },
    branchId: MATANZAS,
    registerId: CAJA_LIBRE,
    by: "Marta Sánchez",
  });

  expect(resultado.ok).toBe(false);
  if (!resultado.ok) expect(resultado.reason).toBe("fuera-de-alcance");
  // Y sigue sin consumirse: el dueño de la sede todavía puede usarlo.
  expect(retoVigente("CAJ-9108-0001")).not.toBeNull();
});

test("PuntoCash no vincula equipos dentro de una sede", () => {
  const reto = emitirReto("caja", "CAJ-9109-0001")!;

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
  const reto = emitirReto("caja", "CAJ-9110-0001")!;
  expect(
    vincularEquipo(CARIBE, SCOPE_CONTEXT, {
      reto: { method: "codigo", code: reto.code },
      branchId: MATANZAS,
      registerId: CAJA_LIBRE,
      by: "Reinaldo Ortega",
    }).ok,
  ).toBe(true);

  const resultado = desvincularEquipo(CARIBE, SCOPE_CONTEXT, "CAJ-9110-0001");
  expect(resultado.ok).toBe(true);

  /* El terminal lo sabe en cuanto vuelve a preguntar, y lo que ve es «sin
     vincular y sin reto»: el reto nuevo lo pedirá él (**FR-AS-LINK-6**). */
  expect(resolverTerminal("caja", "CAJ-9110-0001")).toEqual({
    status: "sin-vincular",
    deviceId: "CAJ-9110-0001",
    pairing: null,
  });
  expect(equipoDeCaja(CAJA_LIBRE)).toBeNull();
});

test("no se desvincula un equipo de otra empresa, ni uno que no existe", () => {
  const ajeno = desvincularEquipo(ANTILLA, SCOPE_CONTEXT, "CAJ-0003-0001");
  expect(ajeno.ok).toBe(false);
  if (!ajeno.ok) expect(ajeno.reason).toBe("fuera-de-alcance");

  const global = desvincularEquipo(GLOBAL_SCOPE, SCOPE_CONTEXT, "CAJ-0001-0003");
  expect(global.ok).toBe(false);
  if (!global.ok) expect(global.reason).toBe("alcance-global-prohibido");

  const inventado = desvincularEquipo(CARIBE, SCOPE_CONTEXT, "CAJ-0000-0000");
  expect(inventado.ok).toBe(false);
  if (!inventado.ok) expect(inventado.reason).toBe("equipo-no-encontrado");

  // Y el equipo ajeno sigue donde estaba.
  expect(findTerminalById("CAJ-0003-0001")).not.toBeNull();
});

/* -------------------------------------------------------------------------
 * Lo que ve el administrador (FR-AD-EQ-1)
 * ---------------------------------------------------------------------- */

test("la vista con alcance solo entrega equipos de sedes propias", () => {
  const antilla = redEnAlcance(ANTILLA);
  expect(antilla.equipos("sede-vedado").length).toBeGreaterThan(0);
  expect(antilla.equipo("CAJ-0001-0003")?.registerId).toBe("sede-vedado:caja-03");

  /* Miramar es de Caribe: sus equipos existen y para Antilla no. */
  expect(antilla.equipos("sede-miramar")).toEqual([]);
  expect(antilla.equipo("CAJ-0003-0001")).toBeNull();
  expect(redEnAlcance(CARIBE).equipo("CAJ-0003-0001")).not.toBeNull();
});

test("la última actividad la sella el propio terminal", () => {
  const antes = findTerminalById("CAJ-0001-0001")!.lastSeenAt;
  const ahora = new Date("2026-10-05T09:30:00.000Z");

  marcarActividad("CAJ-0001-0001", ahora);
  expect(findTerminalById("CAJ-0001-0001")!.lastSeenAt).toBe(ahora.toISOString());

  // Se deja como estaba: otras pruebas leen esta fila.
  marcarActividad("CAJ-0001-0001", new Date(antes!));
});
