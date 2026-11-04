import { expect, test } from "@playwright/test";

import * as auditoria from "../src/features/network/audit";
import { AUDIT_EVENTS, registrarEvento } from "../src/features/network/audit";
import { ADMIN_USERS } from "../src/features/network/operators";
import { PUNTOCASH_USERS } from "../src/features/super-admin/usuarios";
import { filasDeAuditoria } from "../src/app/super-admin/(app)/auditoria/datos";
import { AREAS, etiquetaDeEvento } from "../src/app/super-admin/(app)/auditoria/etiquetas";
import { describirFiltro, filtrarAuditoria, SIN_FILTRO, type FiltroDeAuditoria } from "../src/app/super-admin/(app)/auditoria/filtro";

/**
 * Auditoría: lo que el registro dice y cómo se consulta.
 *
 * Corre en el proceso de la prueba, sin el servidor: lo que registra no llega
 * al servidor de desarrollo.
 */

const con = (f: Partial<FiltroDeAuditoria>): FiltroDeAuditoria => ({ ...SIN_FILTRO, ...f });

test("el registro se lee del más reciente al más antiguo", () => {
  const filas = filasDeAuditoria();
  expect(filas.length).toBe(AUDIT_EVENTS.length);
  for (let i = 1; i < filas.length; i++) expect(filas[i - 1]!.cuando >= filas[i]!.cuando).toBe(true);
});

test("todo evento se dice en lenguaje de negocio, sin el identificador del dominio", () => {
  for (const e of filasDeAuditoria()) {
    expect(e.evento, e.tipo).not.toBe("Otro acto de gobierno");
    expect(e.evento, e.tipo).not.toMatch(/[.]|-[a-z]/);
  }
  /* Y el filtro de tipo ofrece cada tipo una sola vez. */
  const tipos = AREAS.flatMap((a) => a.tipos.map((t) => t.tipo));
  expect(new Set(tipos).size).toBe(tipos.length);
  /* El catálogo de monedas se gobierna desde la consola: sus tres actos se filtran. */
  for (const t of ["moneda-plataforma.alta", "moneda-plataforma.retirada", "moneda-plataforma.reincorporada"] as const) {
    expect(tipos).toContain(t);
    expect(etiquetaDeEvento(t)).toMatch(/catálogo/);
  }
  expect(tipos).not.toContain("operador.credencial-inicial-regenerada");
});

test("quien consta como autor es una persona de la consola, no el nombre de un área", () => {
  for (const e of AUDIT_EVENTS) {
    const persona =
      e.actorRole === "super-admin"
        ? PUNTOCASH_USERS.find((u) => u.id === e.actorId)?.fullName
        : ADMIN_USERS.find((u) => u.id === e.actorId)?.fullName;
    expect(persona, `${e.id} · ${e.actorName}`).toBe(e.actorName);
  }
});

test("el filtro por quién actuó separa a PuntoCash de los mercantes", () => {
  const todas = filasDeAuditoria();
  const dePuntoCash = filtrarAuditoria(todas, con({ rol: "super-admin" }));
  const deMercantes = filtrarAuditoria(todas, con({ rol: "admin-sede" }));
  expect(dePuntoCash.length).toBeGreaterThan(0);
  expect(deMercantes.length).toBeGreaterThan(0);
  expect(dePuntoCash.length + deMercantes.length).toBe(todas.length);
  expect(dePuntoCash.every((e) => e.rol === "super-admin")).toBe(true);
});

test("las fechas son días de Cuba y los dos extremos entran", () => {
  const todas = filasDeAuditoria();
  /* El traspaso de Miramar: 30 de junio, 13:00 y 13:05 en Cuba. */
  expect(filtrarAuditoria(todas, con({ desde: "2026-06-30", hasta: "2026-06-30" })).map((e) => e.id).sort()).toEqual(["aud-1", "aud-2"]);
  /* Un día antes de las 12:00Z del 1 de octubre sigue siendo el 1 en Cuba (08:00). */
  expect(filtrarAuditoria(todas, con({ desde: "2026-10-01", hasta: "2026-10-01" })).length).toBeGreaterThanOrEqual(5);
  expect(filtrarAuditoria(todas, con({ desde: "2099-01-01" }))).toHaveLength(0);
});

test("la búsqueda mira el motivo y el objeto, sin distinguir mayúsculas", () => {
  const todas = filasDeAuditoria();
  expect(filtrarAuditoria(todas, con({ texto: "TECHO" })).length).toBeGreaterThanOrEqual(2);
  expect(filtrarAuditoria(todas, con({ texto: "noelia" })).map((e) => e.id)).toContain("aud-3");
  expect(filtrarAuditoria(todas, con({ texto: "esto no está en ningún sitio" }))).toHaveLength(0);
});

test("los filtros se combinan y por operador y por sede acotan", () => {
  const todas = filasDeAuditoria();
  const f = filtrarAuditoria(todas, con({ operador: "op-bahia", rol: "admin-sede" }));
  expect(f.length).toBeGreaterThan(0);
  expect(f.every((e) => e.operadorId === "op-bahia" && e.rol === "admin-sede")).toBe(true);
  expect(filtrarAuditoria(todas, con({ sede: "sede-miramar" })).every((e) => e.sedeId === "sede-miramar")).toBe(true);
  expect(filtrarAuditoria(todas, con({ tipo: "rango.definido" })).every((e) => e.tipo === "rango.definido")).toBe(true);
});

test("un evento nuevo aparece el primero, con su antes y su después", () => {
  registrarEvento({
    actorId: "sa-2",
    actorName: "Jorge Aguilera Ruiz",
    actorRole: "super-admin",
    type: "servicio.deshabilitado",
    subject: "PuntoCash Cerro · Giros",
    branchId: "sede-cerro",
    reason: "Prueba de dominio de Auditoría",
    before: "Habilitado",
    after: "Deshabilitado",
  });
  const primera = filasDeAuditoria()[0]!;
  expect(primera.evento).toBe("Servicio deshabilitado en una sede");
  expect(primera.antes).toBe("Habilitado");
  expect(primera.despues).toBe("Deshabilitado");
  expect(primera.sede).toBe("PuntoCash Cerro");
});

test("el registro no ofrece forma de editar ni de borrar", () => {
  const nombres = Object.keys(auditoria);
  expect(nombres.filter((n) => /edit|borr|elimin|delet|remove|update|modific|clear/i.test(n))).toEqual([]);
});

test("los filtros puestos se dicen en palabras para la cabecera del archivo", () => {
  expect(describirFiltro(SIN_FILTRO, {})).toBe("Sin filtros: todo el registro");
  const d = describirFiltro(con({ rol: "admin-sede", desde: "2026-10-01", texto: " techo " }), {});
  expect(d).toContain("Un mercante");
  expect(d).toContain("2026-10-01 a …");
  expect(d).toContain("«techo»");
});
