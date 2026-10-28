/**
 * EL CATÁLOGO DE MENSAJES de la consola — Apéndice C del FRD.
 *
 * Cada rechazo del servidor tiene un **código**, que es lo que define el FRD,
 * y aquí su **mensaje**, que es lo que ve el usuario. Las acciones de servidor
 * no escriben textos de error: piden el de su código con `mensaje()`. Así el
 * FRD, este archivo y la pantalla no pueden decir cosas distintas, y el
 * apéndice C del FRD se genera a partir de aquí.
 *
 * Los `{nombre}` se sustituyen al construir el mensaje.
 */

export const MENSAJES = {
  comun: {
    "sesion-terminada": "Tu sesión terminó. Vuelve a iniciar sesión.",
    "no-encontrada": "No encontramos lo que buscabas.",
    "alcance-global-prohibido": "Esta acción pertenece al administrador de la sede.",
    "campo-obligatorio": "Este campo es obligatorio.",
    "correo-invalido": "Introduce un correo válido.",
  },
  equipos: {
    "codigo-no-coincide": "El código no coincide con ningún equipo pendiente. Revisa el código que muestra el equipo.",
    "codigo-caducado": "Ese código caducó. El equipo ya muestra uno nuevo.",
    "codigo-caducado-al-vincular": "Ese código caducó mientras elegías. El {equipo} ya muestra uno nuevo.",
    "equipo-ya-vinculado": "Ese equipo ya está vinculado. Desvincúlalo antes de volver a vincularlo.",
    "caja-ya-vinculada": "{caja} ya tiene un equipo vinculado. Desvincúlalo antes de vincular otro.",
    "caja-requerida": "Elige la caja a la que pertenece este equipo.",
    "caja-retirada": "Esa caja está retirada y no admite un equipo.",
    "sede-cerrada": "Esa sede está cerrada y no admite equipos nuevos.",
    "etiqueta-requerida": "Escribe la etiqueta del equipo.",
    "etiqueta-kiosco-requerida": "Los kioscos necesitan una etiqueta.",
    "error-inesperado": "No se pudo desvincular. Vuelve a intentarlo.",
  },
  cajas: {
    "sede-requerida": "Elige la sede donde va la caja.",
    "nombre-requerido": "Escribe el identificador de la caja.",
    "nombre-duplicado": "Ya existe una caja con ese nombre en esta sede.",
    "sede-cerrada": "Esa sede está cerrada, así que no admite cambios en sus cajas.",
    "motivo-requerido": "Escribe el motivo, con al menos {min} caracteres.",
    "jornada-abierta":
      "Esta caja tiene una jornada abierta. Hasta que se haga su cierre, o lo fuerces desde la jornada, no se puede retirar.",
    "equipo-vinculado": "Esta caja tiene un equipo vinculado. Desvincúlalo antes de retirarla.",
    "ultima-caja":
      "Es la única caja activa de una sede en funcionamiento: retirarla dejaría la sucursal sin ningún mostrador donde atender. Crea otra caja antes de retirar esta.",
    "ya-retirada": "Esa caja ya estaba retirada.",
    "no-retirada": "Esa caja no está retirada.",
  },
  sedes: {
    "direccion-vacia": "Escribe la dirección de la sucursal.",
    "municipio-vacio": "Escribe el municipio y la provincia.",
    "telefono-invalido": "Escribe un teléfono con al menos 8 cifras, por ejemplo +53 7 861 5520.",
    "sede-cerrada": "Esa sede está cerrada, así que no admite cambios en sus datos.",
    "horario-sin-dias": "La sucursal tiene que abrir al menos un día.",
    "horario-incompleto": "Escribe la hora de apertura y la de cierre del {dia}.",
    "horario-cierra-antes": "El {dia}, la hora de cierre tiene que ser posterior a la de apertura.",
    "error-inesperado": "No se pudo guardar. Vuelve a intentarlo.",
  },
  trabajadores: {
    "sede-requerida": "Elige la sede a la que lo reasignas.",
    "tipo-documento-requerido": "Elige un tipo de documento.",
    "sede-cerrada": "Esa sede está cerrada y no admite trabajadores nuevos.",
    "identificador-duplicado": "Ese identificador ya está en uso.",
    "documento-duplicado": "Ya existe un trabajador con ese documento.",
    "jornada-abierta":
      "Tiene una jornada abierta. Hasta que se haga su cierre, o lo fuerces desde la jornada, no se puede.",
    "motivo-requerido": "Escribe el motivo.",
    "error-inesperado": "No se pudo completar la acción. Vuelve a intentarlo.",
  },
  usuarios: {
    "alcance-insuficiente": "Esta acción pertenece al administrador de la empresa.",
    "identificador-duplicado": "Ese identificador ya está en uso.",
    "no-es-el-principal": "Esta sección pertenece al administrador principal de tu empresa.",
    "es-el-principal": "Al administrador principal no lo desactiva nadie. Traspasa el papel antes, si hace falta.",
    "es-uno-mismo": "No puedes traspasarte el papel a ti mismo.",
    "destino-requerido": "Elige a quién le traspasas la administración.",
    "destino-no-activo":
      "Solo puedes traspasarlo a un administrador activo: uno desactivado dejaría a tu empresa sin nadie que administre usuarios.",
    "error-inesperado": "No se pudo completar la acción. Vuelve a intentarlo.",
  },
  perfil: {
    "actual-incorrecta": "La contraseña actual no es correcta.",
    "demasiado-corta": "La contraseña necesita al menos {min} caracteres.",
    "igual-a-la-actual": "La contraseña nueva tiene que ser distinta de la actual.",
    "no-coinciden": "Las dos contraseñas no son iguales.",
    "error-inesperado": "No se pudo guardar. Vuelve a intentarlo.",
  },
  monedas: {
    "moneda-requerida": "Elige la moneda que quieres añadir.",
    "sede-cerrada": "Esa sede está cerrada, así que no admite cambios en sus monedas.",
    "moneda-desconocida": "Esa moneda no está en el catálogo de PuntoCash.",
    "ya-en-la-lista": "{moneda} ya está en la lista de esta sede.",
    "no-en-la-lista": "{moneda} ya no estaba en la lista de esta sede.",
    "con-saldo": "{moneda} tiene saldo en {cajas}. Debe quedar en cero antes de retirarla de la lista.",
    "ultima-moneda":
      "Es la única moneda de una sede en funcionamiento: sin ella sus cajas no podrían manejar efectivo. Añade otra antes de retirar esta.",
  },
  tasas: {
    "sede-cerrada": "Esa sede está cerrada, así que no admite cambios en sus tasas.",
    "sin-servicio": "PuntoCash no ha habilitado el Cambio de moneda en esta sede.",
    "moneda-local": "El peso cubano es la moneda contra la que se cotiza todo: no tiene tasa propia.",
    "fuera-de-la-lista": "{moneda} no está en la lista de esta sede. Añádela en Monedas antes de fijar su tasa.",
    "sin-moneda-local": "El peso cubano no está en la lista de esta sede. Añádelo en Monedas antes de fijar ninguna tasa.",
    "sin-rango": "PuntoCash todavía no ha definido un rango para {moneda}. Solicítaselo para poder cotizarla.",
    "compra-fuera-de-rango": "La tasa de compra está fuera del rango de PuntoCash.",
    "venta-fuera-de-rango": "La tasa de venta está fuera del rango de PuntoCash.",
    "compra-mayor-que-venta": "La compra no puede ser mayor que la venta.",
    "rango-cambiado": "PuntoCash cambió el rango permitido. Revisa el valor.",
    "sin-tasa": "{moneda} ya no tenía tasa en esta sede.",
  },
  promociones: {
    "titulo-vacio": "Escribe el título.",
    "titulo-largo": "El título no puede pasar de {max} caracteres.",
    "texto-vacio": "Escribe el texto.",
    "texto-largo": "El texto no puede pasar de {max} caracteres.",
    "sin-sedes": "Elige al menos una sede.",
    "fecha-invalida": "Elige la fecha de inicio y la de fin.",
    "inicio-pasado": "La fecha de inicio no puede ser anterior a hoy.",
    "inicio-fijo": "Esta promoción ya está en pantalla: su fecha de inicio no se cambia.",
    "fin-pasado": "La fecha de fin no puede ser anterior a hoy. Para terminarla ya, retírala.",
    "fin-antes-de-inicio": "La fecha de fin no puede ser anterior a la de inicio.",
    "sede-cerrada": "Esa sede está cerrada y no admite promociones.",
    "imagen-invalida": "La imagen tiene que ser JPG, PNG o WebP.",
    "imagen-pesada": "La imagen pesa demasiado. Prueba con una más pequeña.",
    vencida: "Esta promoción ya venció y no se puede cambiar.",
    "de-red": "Esta promoción la publica PuntoCash y no se puede cambiar.",
    "vencida-al-retirar": "Esta promoción ya venció.",
    "error-inesperado": "No se pudo guardar. Vuelve a intentarlo.",
  },
  jornadas: {
    "motivo-corto": "Escribe el motivo, con al menos {min} caracteres.",
    "ya-cerrada": "Esta jornada ya fue cerrada.",
    "error-inesperado": "No se pudo cerrar. Vuelve a intentarlo.",
  },
  aprobaciones: {
    "motivo-corto": "Escribe el motivo, con al menos {min} caracteres.",
    "ya-resuelta": "Esta solicitud ya fue resuelta.",
    "error-inesperado": "No se pudo resolver. Vuelve a intentarlo.",
  },
} as const;

export type Seccion = keyof typeof MENSAJES;
type Codigos = { [S in Seccion]: keyof (typeof MENSAJES)[S] | keyof (typeof MENSAJES)["comun"] };

/**
 * Los rechazos del dominio que significan «no existe para ti» se dicen todos
 * con un único código: distinguirlos le diría a quien prueba identificadores
 * qué existe fuera de su alcance (**FR-AD-NAV-3**).
 */
export function codigoPublico(reason: string): string {
  return /fuera-de-alcance$/.test(reason) || /no-encontrad[oa]$/.test(reason) ? "no-encontrada" : reason;
}

/** El mensaje de un código, buscándolo en su sección y después en los comunes. */
export function mensaje<S extends Seccion>(
  seccion: S,
  codigo: Codigos[S] | string,
  valores: Readonly<Record<string, string | number>> = {},
): string {
  const publico = codigoPublico(String(codigo));
  const propios = MENSAJES[seccion] as Readonly<Record<string, string>>;
  const comunes = MENSAJES.comun as Readonly<Record<string, string>>;
  const plantilla = propios[publico] ?? comunes[publico] ?? propios["error-inesperado"] ?? "No se pudo completar la acción. Vuelve a intentarlo.";
  return plantilla.replace(/\{(\w+)\}/g, (_, k: string) => String(valores[k] ?? `{${k}}`));
}
