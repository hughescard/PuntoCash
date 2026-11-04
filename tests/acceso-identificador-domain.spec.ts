import { expect, test } from "@playwright/test";

import {
  esIdentificadorValido,
  mensajeDeIdentificador,
  revisarIdentificador,
} from "../src/features/auth/identificador";
import {
  registrarContrasenaRecuperada,
  verificarCredencialesAdmin,
} from "../src/features/admin/admin-auth";
import {
  registrarContrasenaRecuperadaSuperAdmin,
  verificarCredencialesSuperAdmin,
} from "../src/features/super-admin/auth";
import { crearUsuarioAdmin } from "../src/features/network/operators";
import { operatorScope } from "../src/features/network/scope";

/**
 * El identificador de acceso es un **nombre de usuario**, distinto del nombre
 * de la persona y distinto de su correo, y en el acceso y en la recuperación
 * valen los dos indistintamente (decisión del 28/10/2026).
 *
 * Corre en el proceso de las pruebas, no contra el servidor: lo que estas
 * escrituras cambian no lo ve ninguna otra suite.
 */

const MALECON = operatorScope("op-malecon");

test("un identificador es un nombre de usuario: nunca un correo", () => {
  expect(esIdentificadorValido("msanchez")).toBe(true);
  expect(esIdentificadorValido("juan.perez")).toBe(true);
  expect(esIdentificadorValido("ana_2")).toBe(true);

  /* La regla que hace que «usuario o correo» tenga una sola respuesta. */
  expect(revisarIdentificador("marta@malecon-sf.cu")).toBe("con-arroba");
  expect(mensajeDeIdentificador("con-arroba")).toContain("no lleva «@»");

  expect(revisarIdentificador("")).toBe("vacio");
  expect(revisarIdentificador("ab")).toBe("corto");
  expect(revisarIdentificador("marta sánchez")).toBe("caracteres");
});

test("al entrar valen el identificador y el correo, y llevan a la misma persona", async () => {
  const porUsuario = await verificarCredencialesAdmin({ identifier: "msanchez", password: "puntocash" });
  const porCorreo = await verificarCredencialesAdmin({ identifier: "marta@malecon-sf.cu", password: "puntocash" });

  expect(porUsuario).toMatchObject({ status: "ok" });
  expect(porCorreo).toMatchObject({ status: "ok" });
  if (porUsuario.status === "ok" && porCorreo.status === "ok") {
    expect(porUsuario.userId).toBe(porCorreo.userId);
  }

  /* Mayúsculas y espacios no distinguen una cuenta de otra. */
  expect(await verificarCredencialesAdmin({ identifier: "  MSanchez ", password: "puntocash" })).toMatchObject({
    status: "ok",
  });
});

test("la contraseña recuperada escribiendo el correo vale al entrar con el identificador", async () => {
  /* Antes se guardaba por la cadena tecleada, así que entrar por el otro
     nombre de la misma persona seguía aceptando la contraseña vieja. */
  registrarContrasenaRecuperada("ibetancourt@centrodivisas.cu", "contrasena-nueva");

  expect(await verificarCredencialesAdmin({ identifier: "ibetancourt", password: "contrasena-nueva" })).toMatchObject({
    status: "ok",
  });
  expect(await verificarCredencialesAdmin({ identifier: "ibetancourt", password: "puntocash" })).toMatchObject({
    status: "invalid-credentials",
  });
});

test("en Super administración pasa lo mismo", async () => {
  const porUsuario = await verificarCredencialesSuperAdmin({ identifier: "emarrero", password: "puntocash" });
  const porCorreo = await verificarCredencialesSuperAdmin({
    identifier: "emarrero@puntocash.com",
    password: "puntocash",
  });
  expect(porUsuario).toMatchObject({ status: "ok" });
  expect(porCorreo).toMatchObject({ status: "ok" });

  registrarContrasenaRecuperadaSuperAdmin("jaguilera@puntocash.com", "otra-contrasena");
  expect(await verificarCredencialesSuperAdmin({ identifier: "jaguilera", password: "otra-contrasena" })).toMatchObject(
    { status: "ok" },
  );
});

test("el alta rechaza un identificador con «@» y un correo que ya usa otro", () => {
  const conArroba = crearUsuarioAdmin(MALECON, "adm-malecon-1", {
    id: "adm-prueba-1",
    identifier: "nuevo@malecon-sf.cu",
    fullName: "Nuevo Usuario",
    email: "nuevo@malecon-sf.cu",
    phone: "+53 5 000 0000",
  });
  expect(conArroba).toMatchObject({ reason: "identificador-invalido" });

  /* Con el correo se entra, así que dos cuentas no pueden compartirlo: no
     habría forma de saber de quién es lo que se teclea. */
  const correoRepetido = crearUsuarioAdmin(MALECON, "adm-malecon-1", {
    id: "adm-prueba-2",
    identifier: "nuevousuario",
    fullName: "Nuevo Usuario",
    email: "marta@malecon-sf.cu",
    phone: "+53 5 000 0000",
  });
  expect(correoRepetido).toMatchObject({ reason: "correo-duplicado" });
});
