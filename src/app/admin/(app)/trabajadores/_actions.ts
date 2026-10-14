"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAdminSession } from "@/features/admin/session-server";
import { SCOPE_CONTEXT } from "@/features/network/assignments";
import { registrarEvento } from "@/features/network/audit";
import { DOCUMENT_TYPES, type DocumentType } from "@/features/customers/customers";
import {
  cambiarCorreoTrabajador,
  crearTrabajador,
  desactivarTrabajador,
  editarTrabajador,
  reactivarTrabajador,
  reasignarTrabajador,
  type NetworkWorker,
  type WorkerWriteDenial,
} from "@/features/network/workers";
import { redEnAlcance } from "@/features/network/scoped-reads";

/**
 * Las escrituras de §7 (Trabajadores): el **alta** (**FR-AD-TRAB-3** a
 * **FR-AD-TRAB-8**) y las acciones de la ficha (**FR-AD-TRAB-12** a
 * **FR-AD-TRAB-15**).
 *
 * El alcance lo comprueba el dominio aunque el formulario solo haya ofrecido
 * sedes propias (**FR-AD-TRAB-5**, **[A1]**), y el alta deja su evento de
 * auditoría (**RP-21**).
 */

/**
 * La credencial inicial de **FR-AD-TRAB-8**: se muestra **una sola vez** y no
 * puede volver a consultarse.
 *
 * La genera esta acción y **no se guarda en ninguna parte** —ni en el dominio,
 * ni en la sesión, ni en la fila del trabajador—, así que «no se puede volver
 * a consultar» es cierto por construcción y no por disciplina de quien escriba
 * la próxima pantalla. En el producto la emite el backend al crear la cuenta;
 * aquí la forma es la misma y el contenido es simulado.
 *
 * Sin caracteres ambiguos: esto se dicta en voz alta o se escribe en un papel
 * que cambia de manos, y una `l` que se lee como `1` convierte una entrega en
 * una llamada de soporte.
 */
const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function credencialInicial(): string {
  let salida = "";
  for (let i = 0; i < 10; i += 1) {
    salida += ALFABETO.charAt(Math.floor(Math.random() * ALFABETO.length));
  }
  return `${salida.slice(0, 5)}-${salida.slice(5)}`;
}

/**
 * Lo tecleado, que vuelve con cada rechazo.
 *
 * React reinicia los campos no controlados de un formulario cuando su acción
 * termina, así que sin esto un identificador repetido vaciaría los nueve
 * campos y obligaría a reteclearlos todos para corregir uno. Se devuelven y la
 * pantalla los repone.
 */
export interface ValoresDelAlta {
  nombre: string;
  primerApellido: string;
  segundoApellido: string;
  tipoDocumento: string;
  documento: string;
  telefono: string;
  correo: string;
  identificador: string;
  sede: string;
}

export type ResultadoAlta =
  | {
      ok: true;
      trabajadorId: string;
      nombre: string;
      identificador: string;
      sede: string;
      credencial: string;
    }
  | {
      ok: false;
      error: string;
      campo?: "identificador" | "documento" | "correo";
      valores: ValoresDelAlta;
    }
  | null;

/** Los rechazos del dominio, con los textos que **FR-AD-TRAB-7** fija. */
const MOTIVOS: Record<WorkerWriteDenial, string> = {
  "alcance-global-prohibido": "Esta acción pertenece al administrador de la sede.",
  "fuera-de-alcance": "No encontramos lo que buscabas.",
  "sede-no-encontrada": "No encontramos lo que buscabas.",
  "sede-cerrada": "Esa sede está cerrada y no admite trabajadores nuevos.",
  "identificador-duplicado": "Ese identificador ya está en uso.",
  "documento-duplicado": "Ya existe un trabajador con ese documento.",
  "correo-requerido": "Introduce un correo válido.",
  "trabajador-no-encontrado": "No encontramos lo que buscabas.",
  "jornada-abierta": "Ese trabajador tiene una jornada abierta.",
  "motivo-requerido": "Escribe el motivo.",
};

/** Qué campo señalar cuando el rechazo pertenece a uno concreto (§20). */
const CAMPO: Partial<Record<WorkerWriteDenial, "identificador" | "documento" | "correo">> = {
  "identificador-duplicado": "identificador",
  "documento-duplicado": "documento",
  "correo-requerido": "correo",
};

const VACIO: ValoresDelAlta = {
  nombre: "",
  primerApellido: "",
  segundoApellido: "",
  tipoDocumento: "CI",
  documento: "",
  telefono: "",
  correo: "",
  identificador: "",
  sede: "",
};

function esTipoDeDocumento(valor: string): valor is DocumentType {
  return DOCUMENT_TYPES.some((tipo) => tipo.value === valor);
}

export async function crearTrabajadorAction(
  _previo: ResultadoAlta,
  formData: FormData,
): Promise<ResultadoAlta> {
  const session = await getAdminSession();
  if (!session) {
    return { ok: false, error: "Tu sesión terminó. Vuelve a iniciar sesión.", valores: VACIO };
  }

  const leer = (campo: string) => String(formData.get(campo) ?? "").trim();

  const nombre = leer("nombre");
  const primerApellido = leer("primer-apellido");
  const segundoApellido = leer("segundo-apellido");
  const documento = leer("documento");
  const telefono = leer("telefono");
  const correo = leer("correo");
  const identificador = leer("identificador");
  const branchId = leer("sede");

  const valores: ValoresDelAlta = {
    nombre,
    primerApellido,
    segundoApellido,
    tipoDocumento: leer("tipo-documento"),
    documento,
    telefono,
    correo,
    identificador,
    sede: branchId,
  };

  if (!nombre || !primerApellido || !documento || !telefono || !correo || !identificador) {
    return { ok: false, error: "Este campo es obligatorio.", valores };
  }
  if (!branchId) return { ok: false, error: "Elige la sede a la que se adscribe.", valores };

  const resultado = crearTrabajador(session.scope, SCOPE_CONTEXT, {
    /* El dominio pide el identificador de fila; en el producto lo pone la base
       de datos. Basta con que no se repita dentro de una misma carga. */
    id: `trb-${Date.now().toString(36)}`,
    identifier: identificador,
    fullName: `${nombre} ${primerApellido} ${segundoApellido}`.trim(),
    firstName: nombre,
    /* Tipo y número, que **FR-AD-TRAB-3** pide como dos datos. Un valor que
       no esté en el catálogo se trata como «CI» en vez de rechazarse: viene de
       un desplegable cerrado, así que solo llega torcido si alguien manipula
       el envío, y eso no merece un mensaje propio. */
    documentType: esTipoDeDocumento(valores.tipoDocumento) ? valores.tipoDocumento : "CI",
    documentId: documento,
    phone: telefono,
    email: correo,
    branchId,
  });

  if (!resultado.ok) {
    const campo = CAMPO[resultado.reason];
    return campo
      ? { ok: false, error: MOTIVOS[resultado.reason], campo, valores }
      : { ok: false, error: MOTIVOS[resultado.reason], valores };
  }

  const red = redEnAlcance(session.scope);
  const sede = red.sede(branchId);

  registrarEvento({
    actorId: session.user.id,
    actorName: session.user.fullName,
    actorRole: "admin-sede",
    type: "trabajador.alta",
    subject: `${resultado.value.fullName} · ${sede?.name ?? ""}`.trim(),
    branchId,
    operatorId: session.operator.id,
  });

  revalidatePath("/admin", "layout");

  /* No redirige, a diferencia del alta de caja: lo siguiente que tiene que
     pasar es que alguien **lea la credencial y la entregue**, y eso no cabe en
     un listado (**FR-AD-TRAB-8**). */
  return {
    ok: true,
    trabajadorId: resultado.value.id,
    nombre: resultado.value.fullName,
    identificador: resultado.value.identifier,
    sede: sede?.name ?? "",
    credencial: credencialInicial(),
  };
}

/* -------------------------------------------------------------------------
 * Las acciones de la ficha — FR-AD-TRAB-12 a FR-AD-TRAB-15
 * ---------------------------------------------------------------------- */

/**
 * **La guarda de jornada abierta no puede comprobarse desde aquí**, y por eso
 * no se pasa ninguna.
 *
 * **FR-AD-TRAB-13** y **FR-AD-TRAB-14** prohíben desactivar o reasignar a un
 * trabajador con jornada abierta. Pero la jornada vive en `caja-data.ts`, en
 * **el navegador del trabajador**, y este servidor no la ve — el mismo límite
 * que ya documenta §18 para la columna de jornada de §3. Dejar pasar la
 * comprobación en silencio sería peor que no tenerla: por eso las dos
 * pantallas **advierten siempre**, igual que hace la desvinculación de un
 * equipo con **FR-AD-EQ-10**, en vez de avisar solo cuando lo saben y callar
 * cuando no.
 *
 * El dominio ya acepta la guarda (`WorkerGuards`); el día que la jornada viva
 * en el servidor, se le pasa aquí y las advertencias pasan a ser condiciones.
 */

export type ResultadoAccionTrabajador =
  | { ok: true; mensaje: string }
  | { ok: false; error: string }
  | null;

const GENERICO = "No se pudo completar la acción. Vuelve a intentarlo.";

export async function desactivarTrabajadorAction(
  _previo: ResultadoAccionTrabajador,
  formData: FormData,
): Promise<ResultadoAccionTrabajador> {
  const session = await getAdminSession();
  if (!session) return { ok: false, error: "Tu sesión terminó. Vuelve a iniciar sesión." };

  const workerId = String(formData.get("trabajador") ?? "");
  const motivo = String(formData.get("motivo") ?? "").trim();

  if (!motivo) return { ok: false, error: "Escribe el motivo de la desactivación." };

  const resultado = desactivarTrabajador(
    session.scope,
    SCOPE_CONTEXT,
    workerId,
    motivo,
    session.user.fullName,
  );
  if (!resultado.ok) return { ok: false, error: MOTIVOS[resultado.reason] ?? GENERICO };

  registrarEvento({
    actorId: session.user.id,
    actorName: session.user.fullName,
    actorRole: "admin-sede",
    type: "trabajador.desactivado",
    subject: resultado.value.fullName,
    branchId: resultado.value.branchId,
    operatorId: session.operator.id,
  });

  revalidatePath("/admin", "layout");

  return {
    ok: true,
    mensaje: `${resultado.value.fullName} ya no puede iniciar sesión. Lo que operó se conserva intacto.`,
  };
}

export async function reactivarTrabajadorAction(
  _previo: ResultadoAccionTrabajador,
  formData: FormData,
): Promise<ResultadoAccionTrabajador> {
  const session = await getAdminSession();
  if (!session) return { ok: false, error: "Tu sesión terminó. Vuelve a iniciar sesión." };

  const workerId = String(formData.get("trabajador") ?? "");

  const resultado = reactivarTrabajador(session.scope, SCOPE_CONTEXT, workerId);
  if (!resultado.ok) return { ok: false, error: MOTIVOS[resultado.reason] ?? GENERICO };

  const sede = redEnAlcance(session.scope).sede(resultado.value.branchId);

  registrarEvento({
    actorId: session.user.id,
    actorName: session.user.fullName,
    actorRole: "admin-sede",
    type: "trabajador.reactivado",
    subject: resultado.value.fullName,
    branchId: resultado.value.branchId,
    operatorId: session.operator.id,
  });

  revalidatePath("/admin", "layout");

  return {
    ok: true,
    mensaje: `${resultado.value.fullName} vuelve a poder iniciar sesión en ${sede?.name ?? "su sede"}.`,
  };
}

export async function reasignarTrabajadorAction(
  _previo: ResultadoAccionTrabajador,
  formData: FormData,
): Promise<ResultadoAccionTrabajador> {
  const session = await getAdminSession();
  if (!session) return { ok: false, error: "Tu sesión terminó. Vuelve a iniciar sesión." };

  const workerId = String(formData.get("trabajador") ?? "");
  const branchId = String(formData.get("sede") ?? "");

  if (!branchId) return { ok: false, error: "Elige la sede a la que lo reasignas." };

  const resultado = reasignarTrabajador(session.scope, SCOPE_CONTEXT, workerId, branchId);
  if (!resultado.ok) return { ok: false, error: MOTIVOS[resultado.reason] ?? GENERICO };

  const sede = redEnAlcance(session.scope).sede(resultado.value.branchId);

  registrarEvento({
    actorId: session.user.id,
    actorName: session.user.fullName,
    actorRole: "admin-sede",
    type: "trabajador.editado",
    subject: `${resultado.value.fullName} · reasignado a ${sede?.name ?? branchId}`,
    branchId: resultado.value.branchId,
    operatorId: session.operator.id,
  });

  revalidatePath("/admin", "layout");

  return {
    ok: true,
    mensaje: `${resultado.value.fullName} queda adscrito a ${sede?.name ?? "su nueva sede"}. Desde ahora solo puede iniciar sesión en equipos de esa sede.`,
  };
}

/* -------------------------------------------------------------------------
 * Editar los datos — FR-AD-TRAB-9
 * ---------------------------------------------------------------------- */

/**
 * Lo tecleado en la edición, que vuelve con cada rechazo por la misma razón
 * que en el alta: React reinicia los campos no controlados cuando la acción
 * termina, y aquí el daño sería mayor —son datos que **ya existían** y que
 * alguien acaba de corregir a mano—.
 */
export interface ValoresDeEdicion {
  nombre: string;
  primerApellido: string;
  segundoApellido: string;
  tipoDocumento: string;
  documento: string;
  telefono: string;
}

/**
 * Qué campo señalar (§20). **Un formulario de seis campos no puede decir
 * «este campo es obligatorio» y dejar que lo busquen**: el rechazo nombra
 * siempre al suyo, y la pantalla lo marca.
 */
export type CampoDeEdicion = "nombre" | "primer-apellido" | "documento" | "telefono";

export type ResultadoEdicion =
  | { ok: false; error: string; campo?: CampoDeEdicion; valores: ValoresDeEdicion }
  | null;

const OBLIGATORIOS: readonly { campo: CampoDeEdicion; lee: (v: ValoresDeEdicion) => string }[] = [
  { campo: "nombre", lee: (v) => v.nombre },
  { campo: "primer-apellido", lee: (v) => v.primerApellido },
  { campo: "documento", lee: (v) => v.documento },
  { campo: "telefono", lee: (v) => v.telefono },
];

/**
 * **El éxito no devuelve nada: redirige a la ficha.**
 *
 * No hay pantalla intermedia que enseñar —a diferencia del alta, que debe
 * mostrar la credencial una sola vez (**FR-AD-TRAB-8**)—, y la ficha con los
 * datos ya corregidos es la confirmación más honesta que existe: se ve lo
 * guardado, no un mensaje que lo afirma.
 */
export async function editarTrabajadorAction(
  _previo: ResultadoEdicion,
  formData: FormData,
): Promise<ResultadoEdicion> {
  const session = await getAdminSession();
  const leer = (campo: string) => String(formData.get(campo) ?? "").trim();

  const workerId = leer("trabajador");
  const valores: ValoresDeEdicion = {
    nombre: leer("nombre"),
    primerApellido: leer("primer-apellido"),
    segundoApellido: leer("segundo-apellido"),
    tipoDocumento: leer("tipo-documento") || "CI",
    documento: leer("documento"),
    telefono: leer("telefono"),
  };

  if (!session) {
    return { ok: false, error: "Tu sesión terminó. Vuelve a iniciar sesión.", valores };
  }

  /* Se señala **el primero** que falte, no todos a la vez: corregido ese, el
     envío siguiente señala el que quede. Es lo que hace el alta. */
  const vacio = OBLIGATORIOS.find((c) => !c.lee(valores));
  if (vacio) {
    return { ok: false, error: "Este campo es obligatorio.", campo: vacio.campo, valores };
  }
  if (!esTipoDeDocumento(valores.tipoDocumento)) {
    return { ok: false, error: "Elige un tipo de documento.", valores };
  }

  const resultado = editarTrabajador(session.scope, SCOPE_CONTEXT, workerId, {
    fullName: `${valores.nombre} ${valores.primerApellido} ${valores.segundoApellido}`.trim(),
    firstName: valores.nombre,
    documentType: valores.tipoDocumento,
    documentId: valores.documento,
    phone: valores.telefono,
  });

  if (!resultado.ok) {
    return CAMPO[resultado.reason] === "documento"
      ? { ok: false, error: MOTIVOS[resultado.reason], campo: "documento", valores }
      : { ok: false, error: MOTIVOS[resultado.reason] ?? GENERICO, valores };
  }

  registrarEvento({
    actorId: session.user.id,
    actorName: session.user.fullName,
    actorRole: "admin-sede",
    type: "trabajador.editado",
    subject: `${resultado.value.fullName} · datos personales`,
    branchId: resultado.value.branchId,
    operatorId: session.operator.id,
  });

  revalidatePath("/admin", "layout");
  redirect(`/admin/trabajadores/${workerId}`);
}

/* -------------------------------------------------------------------------
 * Regenerar la credencial — FR-AD-TRAB-8, segunda mitad
 * ---------------------------------------------------------------------- */

/**
 * **FR-AD-TRAB-8** cierra diciendo «si se pierde, se regenera». Esto es esa
 * mitad.
 *
 * **No escribe en el dominio, y eso no es un atajo: es el invariante.** La
 * credencial no se guarda en ninguna parte —ni en el trabajador, ni en la
 * sesión, ni en un registro aparte—, así que «no se puede volver a consultar»
 * sigue siendo cierto por construcción. Regenerar es emitir una nueva y
 * enseñarla una vez; el día que haya backend, lo que cambia es que la cuenta
 * pasa a aceptar la nueva y a rechazar la anterior, y eso ocurre allí.
 *
 * Lo que sí deja es **evento de auditoría** (**RP-21**): quién la regeneró y
 * cuándo es exactamente lo que se pregunta cuando alguien no puede entrar.
 */
export type ResultadoCredencial =
  | { ok: true; nombre: string; identificador: string; credencial: string }
  | { ok: false; error: string }
  | null;

export async function regenerarCredencialAction(
  _previo: ResultadoCredencial,
  formData: FormData,
): Promise<ResultadoCredencial> {
  const session = await getAdminSession();
  if (!session) return { ok: false, error: "Tu sesión terminó. Vuelve a iniciar sesión." };

  const workerId = String(formData.get("trabajador") ?? "");

  /* Se busca **dentro del alcance**, como todas las lecturas de esta consola
     (**FR-AD-DOM-5**): un identificador ajeno no llega siquiera a encontrarse. */
  const red = redEnAlcance(session.scope);
  let trabajador: NetworkWorker | null = null;
  for (const sede of session.sedes) {
    const encontrado = red.trabajadores(sede.id).find((w) => w.id === workerId);
    if (encontrado) {
      trabajador = encontrado;
      break;
    }
  }
  if (!trabajador) return { ok: false, error: "No encontramos lo que buscabas." };

  registrarEvento({
    actorId: session.user.id,
    actorName: session.user.fullName,
    actorRole: "admin-sede",
    type: "trabajador.editado",
    subject: `${trabajador.fullName} · credencial regenerada`,
    branchId: trabajador.branchId,
    operatorId: session.operator.id,
  });

  return {
    ok: true,
    nombre: trabajador.fullName,
    identificador: trabajador.identifier,
    credencial: credencialInicial(),
  };
}

/* -------------------------------------------------------------------------
 * Ayudar con el acceso — FR-AD-TRAB-10 y FR-AD-TRAB-11
 * ---------------------------------------------------------------------- */

/**
 * **Lo que esta acción no hace es su requisito principal.**
 *
 * **FR-AD-TRAB-11** es terminante: ayudar con el acceso **no entrega, muestra
 * ni genera ningún código de verificación, y no abre sesión por el
 * trabajador**. El segundo factor no se salta ni se delega **[R13]**. Así que
 * aquí no hay —y no debe haber nunca— ninguna lectura del reto, ningún código
 * en la respuesta y ninguna cookie de sesión ajena.
 *
 * Lo que sí hace es **corregir el correo** cuando el código va a una dirección
 * equivocada, con motivo escrito y evento de auditoría (**RP-21**).
 *
 * ── Por qué no hay una segunda acción, que la hubo ───────────────────────
 * Hasta la v4.12 esto tenía también un «liberar el bloqueo del reto», porque
 * el requisito lo pedía. **No bloqueaba nada que hubiera que liberar**: el
 * reto es de un solo intento de acceso en una sola máquina, y a quien se le
 * agota le basta con volver al inicio de sesión para que nazca otro entero.
 * Era una acción sin estado detrás. El único bloqueo que un trabajador puede
 * encontrarse y que solo un administrador resuelve es **estar desactivado**, y
 * para eso está su propio botón en la ficha (**FR-AD-TRAB-15**).
 */
export type ResultadoAsistencia =
  | { ok: true; mensaje: string }
  | { ok: false; error: string }
  | null;

export async function cambiarCorreoAction(
  _previo: ResultadoAsistencia,
  formData: FormData,
): Promise<ResultadoAsistencia> {
  const session = await getAdminSession();
  if (!session) return { ok: false, error: "Tu sesión terminó. Vuelve a iniciar sesión." };

  const workerId = String(formData.get("trabajador") ?? "");
  const correo = String(formData.get("correo") ?? "").trim();
  const motivo = String(formData.get("motivo") ?? "").trim();

  if (!correo) return { ok: false, error: "Introduce un correo válido." };
  if (!motivo) return { ok: false, error: "Escribe por qué lo cambias." };

  const resultado = cambiarCorreoTrabajador(session.scope, SCOPE_CONTEXT, workerId, correo, motivo);
  if (!resultado.ok) return { ok: false, error: MOTIVOS[resultado.reason] ?? GENERICO };

  /* El evento guarda **las dos direcciones**: el motivo por el que se consulta
     esta auditoría es casi siempre «¿a dónde iban los códigos antes?». */
  registrarEvento({
    actorId: session.user.id,
    actorName: session.user.fullName,
    actorRole: "admin-sede",
    /* El tipo propio de la asistencia, no el genérico de edición: quien
       audite «quién tocó el acceso de alguien» busca exactamente esto. */
    type: "trabajador.asistencia-acceso",
    subject: `${resultado.value.worker.fullName} · correo ${resultado.value.anterior} → ${resultado.value.worker.email} · ${motivo}`,
    branchId: resultado.value.worker.branchId,
    operatorId: session.operator.id,
  });

  revalidatePath("/admin", "layout");

  return {
    ok: true,
    mensaje: `Los próximos códigos irán a ${resultado.value.worker.email}. Dile que vuelva a intentarlo desde la pantalla de inicio de sesión.`,
  };
}
