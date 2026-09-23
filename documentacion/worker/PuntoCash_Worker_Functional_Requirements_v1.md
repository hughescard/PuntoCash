# PuntoCash — Aplicación Worker
## Documento de Requisitos Funcionales (FRD) · v1.5

**Estado:** Línea base de entrega — especifica el comportamiento funcional de la aplicación Worker tal como está implementada actualmente.
**Destinatarios:** Personas desarrolladoras y QA. Utilizable como especificación de implementación y de referencia para aceptación.
**Control de cambios — v1.5 (23/09/2026).** **Vinculación del equipo de caja.** Antes de que nadie pueda iniciar sesión, el equipo de cada puesto tiene que estar vinculado a una sede y a una de sus cajas, con el mismo mecanismo que el kiosco de autoservicio (QR o código, desde el panel del administrador de sede). El vínculo lo recuerda el equipo; el inicio de sesión del trabajador es solo para operar su jornada. Nuevo §2.1 (**FR-DEV-1 a FR-DEV-9**); las subsecciones siguientes de §2 se renumeran (2.2 a 2.12) sin cambiar sus requisitos. FR-SHELL-1 y FR-SHELL-3 se ajustan; FR-NAV-1 añade la regla de la pantalla de vinculación; §2 añade **FR-AUTH-8** (trabajador de otra sede) y su fila en FR-AUTH-3; el punto 2 de §2.2 aclara que el vínculo no es un equipo de confianza; §2.11 y §2.12 añaden el resultado `other-branch` y la cuenta de demostración; §13, FR-ACC-2 (punto 12), §15 (FR-IMP-5) y el Apéndice A se actualizan.
**Control de cambios — v1.4 (22/09/2026).** **Consolidación del acceso.** El segundo factor se había especificado en un documento aparte, `PuntoCash_Worker_2FA_Functional_Requirements_v1.md`, cuyo nombre y contenido eran de Worker: se integra aquí y ese documento queda obsoleto. §2 pasa a llamarse **Acceso** y se reorganiza en once subsecciones que cubren los dos pasos completos — decisiones de producto, credenciales (FR-AUTH-1..7), el reto (FR-2FA-1..3), la pantalla de verificación (FR-2FA-4..9), reenvío (FR-2FA-10..12), fin del reto (FR-2FA-13..15), el correo del código (FR-2FA-16..22), la seguridad que corresponde al backend (FR-2FA-23..28), la accesibilidad del campo (FR-2FA-29..32), el contrato para el backend y el comportamiento de demostración. Se añaden FR-IMP-4 y el punto 11 de FR-ACC-2; §13 y §16 se ajustan; el Apéndice A añade *Reto de verificación*. Los requisitos no cambian de contenido respecto del documento que se integra: solo se renumeran dentro de la serie `FR-2FA-*` y los tres que duplicaban el paso 1 se absorben en FR-AUTH-3, FR-AUTH-4 y FR-AUTH-7.
**Control de cambios — v1.3 (22/09/2026).** Se añade el **segundo factor de autenticación**, que faltaba: las credenciales correctas ya no abren sesión, emiten un reto de verificación. §1.2 añade la ruta `/worker/verificacion` (FR-NAV-1); §2 reescribe el desenlace de éxito de FR-AUTH-3; §16 deja de listar la vigencia de sesión junto a lo no especificado sin matizar. El PRD incorpora la regla **R13**. Ningún otro requisito de v1.2 cambia.
**Control de cambios — v1.2 (21/09/2026).** Se añade **Buscar solicitud** (§7.4), la pantalla que recupera una solicitud generada en el kiosco de autoservicio (`KS-...`) y precarga sus datos en el flujo real correspondiente. Nueva ruta `/worker/nueva-operacion/solicitud` (FR-NAV-1). Se corrige §16, que ya no puede afirmar que la aplicación Kiosk carece de requisito funcional — ver `PuntoCash_Kiosk_Autoservicio_Functional_Requirements_v1.md` y `PuntoCash_Kiosk_Pantalla_Functional_Requirements_v1.md`. Se actualiza la cifra de pruebas automatizadas de FR-ACC-1 (451 → 454). Ningún requisito de v1.1 cambia.
**Documento complementario:** `PuntoCash_Worker_PRD_v1.md` (PRD) define el producto, sus usuarios y las reglas de negocio (R1–R12; **R13** se incorpora en el PRD vigente). Este FRD no las repite; las referencia como **[R#]** allí donde un comportamiento existe a causa de una de ellas. `PuntoCash_PRD_v2.md` sitúa a Worker dentro del producto completo, junto al kiosco de autoservicio.

**Cómo leer este documento.** Los requisitos se agrupan por área funcional y se numeran `FR-<área>-<n>`. "Debe" describe comportamiento obligatorio. La terminología sigue el glosario del Apéndice A. Solo se especifica comportamiento implementado; §16 indica lo que queda deliberadamente sin definir.

---

## 1. Comportamiento global del sistema

### 1.1 Shell de la aplicación

**FR-SHELL-1** Toda pantalla Worker autenticada se representa dentro de un único shell: cabecera fija (marca PuntoCash, nombre del trabajador, la caja de este equipo con su sede debajo (FR-DEV-5), acceso al perfil y cierre de sesión) y barra lateral fija con exactamente cuatro destinos principales — **Inicio**, **Nueva operación**, **Operaciones**, **Caja**.

**FR-SHELL-2** El destino activo debe marcarse como actual para tecnologías de asistencia, no solo mediante color.

**FR-SHELL-3** Las pantallas no deben representar su propia cabecera ni barra lateral. La vinculación del equipo (FR-DEV-2), el inicio de sesión, la verificación y la recuperación de acceso son las únicas pantallas fuera del shell.

**FR-SHELL-4** La región de contenido principal es el único contenedor con desplazamiento vertical; el shell no se desplaza.

**FR-SHELL-5** Ninguna pantalla debe producir desplazamiento horizontal a nivel de página a 1440px ni a 1280px. Las tablas y diagramas que excedan el ancho se desplazan dentro de su propio contenedor.

### 1.2 Navegación y rutas

**FR-NAV-1** Inventario de rutas y estado:

| Ruta | Función | Estado |
| --- | --- | --- |
| `/worker/login` | Inicio de sesión (paso 1: credenciales) | Implementada |
| `/worker/verificacion` | Verificación en dos pasos (paso 2: código) | Implementada |
| `/worker/recuperar-acceso` | Recuperación de acceso | Solo marcador de posición |
| `/worker/inicio` | Inicio operativo | Implementada |
| `/worker/nueva-operacion` | Catálogo de servicios | Implementada |
| `/worker/nueva-operacion/cambio-moneda` | Cambio de moneda | Implementada |
| `/worker/nueva-operacion/remesas` | Cobrar remesa | Implementada |
| `/worker/nueva-operacion/giros` | Selector de operación de Giros | Implementada |
| `/worker/nueva-operacion/giros/enviar` | Enviar giro | Implementada |
| `/worker/nueva-operacion/giros/cobrar` | Cobrar giro | Implementada |
| `/worker/nueva-operacion/solicitud` | Buscar solicitud (código de kiosco) | Implementada |
| `/worker/nueva-operacion/{otros}` | Servicios no disponibles | Solo marcador de posición |
| `/worker/operaciones` | Listado de operaciones | Implementada |
| `/worker/operaciones/{codigo}` | Detalle de operación | Implementada |
| `/worker/caja` | Pantalla de caja | Implementada |
| `/worker/caja/fondeo-inicial` | Abrir Jornada | Implementada |
| `/worker/caja/anadir-moneda` | Habilitar una moneda | Implementada |
| `/worker/caja/ajustar-efectivo` | Corregir un saldo | Implementada |
| `/worker/caja/arqueo-cierre` | Cerrar Jornada | Implementada |
| `/worker/caja/movimientos/{id}` | Detalle de movimiento interno | Implementada |
| `/worker/perfil`, `/worker/tasas`, `/worker/alertas` | — | Solo marcador de posición |

Mientras el equipo no está vinculado a una caja, **cualquier** ruta de `/worker` muestra la pantalla de vinculación en lugar de su contenido (FR-DEV-1). La demostración añade `/kiosk/simulador-admin`, que simula el panel del administrador para vincular y desvincular el equipo (FR-DEV-9).

**FR-NAV-2** Un slug de servicio desconocido debe devolver 404. Un código de operación desconocido **no**: se representa una tarjeta "Operación no encontrada" con una vía de regreso al listado.

**FR-NAV-3** Toda pantalla alcanzada desde el catálogo o desde Caja debe ofrecer una vía explícita de regreso a su origen.

### 1.3 Convenciones de formato

**FR-FMT-1** El dinero se muestra como `1.250,00 USD` (agrupación es-ES, dos decimales, código de moneda como sufijo). Los importes con signo usan un `+` explícito o el signo menos `−` (U+2212).
**FR-FMT-2** Las marcas de tiempo de operación son `dd/MM/yyyy · HH:mm`.
**FR-FMT-3** Los códigos de operación siguen `PC-yyMMdd-NNNNNN`; los identificadores de movimiento de caja siguen `CM-YYMMDD-NNNNNN`.
**FR-FMT-4** La identidad de la moneda se acompaña de una bandera SVG decorativa junto al código — nunca un emoji. Las banderas se ocultan a las tecnologías de asistencia.
**FR-FMT-5** Importes, códigos, documentos y teléfonos se representan con cifras tabulares y no deben partirse en varias líneas.

### 1.4 Impresión

**FR-PRINT-1** La impresión usa el diálogo de impresión del navegador y una sección de la página exclusiva para impresión. No hay generación de PDF ni artefacto descargable **[R11]**.
**FR-PRINT-2** El contenido exclusivo de impresión está presente en el DOM pero nunca es visible en pantalla, y se oculta a las tecnologías de asistencia.
**FR-PRINT-3** Un comprobante no debe contener identificadores internos ni metadatos del proveedor **[R10]**.
**FR-PRINT-4** Se ofrece impresión desde: la pantalla de resultado de una operación, el detalle de una operación, el detalle de un movimiento interno, el resumen de Caja y el resultado del cierre de Jornada.

### 1.5 Contrato de accesibilidad

**FR-A11Y-1** Todo control de formulario se resuelve desde su etiqueta visible; los estados requerido, inválido y descrito-por se exponen programáticamente.
**FR-A11Y-2** Ningún estado puede comunicarse solo mediante color — una insignia de estado siempre lleva texto.
**FR-A11Y-3** Los controles interactivos miden al menos 44–48px de alto, son operables por teclado y tienen indicador de foco visible.

---

## 2. Acceso

Antes del acceso está el **equipo**: Worker solo se usa en un ordenador vinculado a una caja de una sede (§2.1). Sobre ese equipo, el acceso del trabajador tiene dos pasos y ninguno basta por sí solo: la contraseña identifica la cuenta, el código confirma a la persona. **Mientras el segundo paso no se verifica no existe sesión** **[R13]** — no se alcanza ninguna pantalla del shell, ni la caja, ni el nombre del trabajador en la cabecera. Las dos pantallas se representan fuera del shell (FR-SHELL-3).

### 2.1 Vinculación del equipo de caja

Worker no se usa en cualquier ordenador: se usa en el **equipo de una caja**. Hay dos sesiones, con dos funciones distintas. La **sesión del equipo** dice "este ordenador es la Caja 03 de PuntoCash Vedado"; la crea el administrador de la sede una sola vez y el equipo la recuerda. La **sesión del trabajador** dice "Juan Pérez está operando esta caja"; se abre con contraseña y segundo factor en cada inicio de sesión (§2.2 a §2.12) y termina al cerrar sesión. El mecanismo de vinculación es el mismo del kiosco de autoservicio (`PuntoCash_Kiosk_Autoservicio_Functional_Requirements_v1.md` §1.1).

**FR-DEV-1** Mientras el equipo no está vinculado a una caja, cualquier ruta de `/worker` —el inicio de sesión incluido— muestra la **pantalla de vinculación** en lugar de su contenido. Nadie puede iniciar sesión en un equipo sin vincular **[RP-16]**.

**FR-DEV-2** La pantalla de vinculación se representa fuera del shell (FR-SHELL-3), con la marca PuntoCash y sin nombre de sede, caja ni trabajador. Dice que el equipo todavía no es la caja de ninguna sede y que el administrador debe vincularlo desde su panel web, en **Cajas**, eligiendo la sede y la caja; y que se hace una sola vez. Muestra a la vez las dos vías: **Opción 1**, un código QR para escanear desde el panel en un teléfono o tableta; **Opción 2**, un código de seis cifras agrupado de tres en tres ("482 913"), para escribirlo en el panel. Muestra además el identificador del equipo (`CAJ-NNNN-NNNN`) y la cuenta atrás "El código se renueva automáticamente en mm:ss". El QR y el código son el mismo reto de vinculación: vale 10 minutos y el equipo lo renueva solo al caducar. En el producto real el QR contiene un token de un solo uso emitido por el servidor.

**FR-DEV-3** Vincular es una acción del **administrador de la sede** desde la sección **Cajas** de su panel: escanea el QR o escribe el código y elige una de las sedes que administra y **cuál de sus cajas** es ese equipo. Una caja tiene como máximo un equipo vinculado a la vez. El superadministrador de PuntoCash ve los equipos de toda la red, pero no los vincula ni los desvincula. Los errores del panel son los del kiosco: código que no coincide con ningún equipo pendiente, y código caducado. La sección del panel se especifica en los documentos de Administración; este requisito fija lo que Worker necesita de ella.

**FR-DEV-4** En cuanto el equipo queda vinculado, sin que nadie lo toque, deja la pantalla de vinculación y muestra el inicio de sesión (§2.3). El vínculo **lo recuerda el equipo**: sobrevive a recargas, reinicios, cierres de sesión, cambios de trabajador y el fin de la Jornada. Cerrar sesión devuelve siempre al inicio de sesión, nunca a la vinculación.

**FR-DEV-5** La caja es del **equipo**, no de la cuenta del trabajador: quien inicia sesión en ese equipo opera esa caja. La cabecera muestra el nombre de la caja y, debajo, el nombre de su sede (FR-SHELL-1). Toda Jornada, operación, movimiento y comprobante producido en el equipo queda registrado contra su caja **[R12]**.

**FR-DEV-6** Solo pueden iniciar sesión en una caja los trabajadores de la **sede** de esa caja (FR-AUTH-8).

**FR-DEV-7** El administrador puede **desvincular** el equipo en cualquier momento, con confirmación en su panel. El equipo pierde su sesión al instante: la pantalla que esté a la vista —inicio de sesión, verificación o cualquier pantalla del shell, a mitad de una operación incluso— se sustituye por la pantalla de vinculación, con el aviso "Este equipo fue desvinculado" que nombra la caja y la sede anteriores, y la sesión del trabajador en ese equipo termina. Una operación sin confirmar se descarta; lo ya confirmado se conserva. **Desvincular no cierra la Jornada**: la Jornada es de la caja, no del equipo, y sigue abierta hasta su arqueo y cierre. Lo que deba hacer el panel del administrador si la caja tiene una Jornada abierta se especifica en los documentos de Administración.

**FR-DEV-8 (credencial — requisito real, pendiente de implementación).** La sesión del equipo es una credencial que emite el servidor al vincular y revoca al desvincular; el equipo nunca se vincula a sí mismo ni elige su caja. El servidor solo abre una sesión de trabajador en un equipo con credencial válida, y toda petición de Worker lleva las dos: la del equipo y la del trabajador. Con la credencial del equipo revocada, cualquier petición se rechaza y el equipo lo detecta por sí solo. La credencial del equipo **no** es un "equipo de confianza" para el segundo factor: R13 se aplica en cada inicio de sesión (§2.2, punto 2).

**FR-DEV-9** **En la demostración.** El panel del administrador todavía no existe: el simulador `/kiosk/simulador-admin`, sección **Cajas**, abierto en otra pestaña del mismo navegador, vincula el equipo con el código o simulando el escaneo del QR, y lo desvincula. La sesión del equipo se guarda en `localStorage` bajo `puntocash.caja.device`. Cada sede de la demo tiene cuatro cajas, pero los datos operativos simulados (saldos, Jornada, movimientos) son de una sola, **Caja 03**: el simulador solo permite elegir esa y marca las demás como "sin datos en la demo". El QR es ilustrativo y no se puede escanear. **Todo esto es mecanismo de la demostración**; en producción rige FR-DEV-8.

### 2.2 Decisiones de producto

Acordadas con el equipo. Se enuncian porque el resto de esta sección es su consecuencia:

1. **Un solo método: código de seis dígitos al correo registrado del trabajador.** No hay aplicación de autenticación (TOTP), ni SMS, ni llave física. El correo es el único canal que la empresa ya tiene para cada trabajador desde que la cuenta se crea.
2. **En cada inicio de sesión, sin excepción.** No existe "recordar este equipo" para el segundo factor. Que el equipo esté vinculado a su caja (§2.1) no cambia esto: el vínculo dice qué caja es el equipo, no quién lo usa. La caja es un puesto compartido y los trabajadores se alternan en el mostrador: un equipo recordado convertiría al siguiente turno en una sesión heredada. Es también lo que hace auditable la apertura de jornada — cada sesión tiene su propia verificación.
3. **Sin códigos de respaldo.** Un pliego de diez códigos de un solo uso acaba, en una casa de cambio, impreso en un papel dentro del mostrador. La salida cuando el correo no llega es el reenvío y, agotado el reenvío, la asistencia del administrador de sede.
4. **Alcance: Worker.** `/admin` y `/super-admin` heredarán el mismo flujo cuando se construyan — el dominio (`src/features/auth`) está escrito para reutilizarse sin cambios. Lo que cambie allí será a lo sumo el destino posterior a la verificación, y sus FRDs remiten a esta sección en vez de repetirla.

### 2.3 Paso 1 — Credenciales

**FR-AUTH-1** La pantalla de inicio de sesión recoge un identificador (usuario o correo) y una contraseña, y se representa fuera del shell.

**FR-AUTH-2** Ambos campos se validan antes del envío. Cada campo ausente muestra su propio mensaje y el foco se mueve al primer campo que requiere atención.

**FR-AUTH-3** Resultados del envío y comportamiento exigido:

| Resultado | Comportamiento |
| --- | --- |
| Credenciales correctas | **No abre sesión** [R13]: se emite un código al correo del trabajador, se confirma el envío, el formulario queda bloqueado contra un segundo envío y se navega a `/worker/verificacion`. La confirmación dice lo que ocurrió — credenciales verificadas y código enviado — nunca "sesión iniciada" |
| Credenciales inválidas | Error a nivel de formulario; el formulario sigue habilitado; el foco vuelve al identificador |
| Credenciales correctas de un trabajador de **otra sede** | Error a nivel de formulario, "Esta caja no es de tu sede" (FR-AUTH-8); **no se emite código**; el formulario sigue habilitado; el foco vuelve al identificador |
| Cuenta bloqueada | Error a nivel de formulario; **el formulario queda bloqueado** — reintentar no puede resolverlo |
| Error de red | Error a nivel de formulario; el formulario sigue habilitado para reintentar |

**FR-AUTH-4** Durante el envío el formulario se deshabilita, y sigue deshabilitado mientras carga el destino. Un segundo envío no puede producir un segundo reto, porque emitir un código nuevo invalidaría el que acaba de salir (FR-2FA-10).

**FR-AUTH-5** Los mensajes de fallo no llevan acción de reintento incorporada; el propio botón de envío es la única acción primaria.

**FR-AUTH-6** El enlace de recuperación de acceso resuelve a una pantalla marcador de posición que devuelve al inicio de sesión. No hay comportamiento de recuperación implementado.

**FR-AUTH-7** Ninguno de los desenlaces de fallo emite código alguno. Solo unas credenciales correctas abren un reto.

**FR-AUTH-8** Unas credenciales correctas solo abren un reto si el trabajador pertenece a la **sede de la caja** de este equipo (FR-DEV-6). Si pertenece a otra, el resultado es un rechazo con el título "Esta caja no es de tu sede" y el mensaje "Solo pueden iniciar sesión en esta caja los trabajadores de su sede. Usa una caja de tu sede o solicita asistencia al administrador." No se envía código, porque una cuenta de otra sede no tiene nada que verificar en este equipo. El mensaje no nombra la sede de la caja ni la del trabajador (FR-2FA-4).

### 2.4 El reto de verificación

**FR-2FA-1** Un **reto** es el objeto que representa un acceso a medio hacer. Nace cuando las credenciales son correctas, y muere al verificarse, al agotarse o al abandonarse. Mientras un reto vive no existe sesión **[R13]**.

**FR-2FA-2** Parámetros del reto. Son los valores que la pantalla representa y los que el backend debe aplicar; si cambian, cambian en los dos lados a la vez:

| Parámetro | Valor | Por qué |
| --- | --- | --- |
| Longitud del código | 6 dígitos | Un millón de combinaciones contra 3 intentos y 5 minutos. Seis dígitos es lo que una persona retiene de un vistazo. |
| Vigencia del código | 5 minutos | Suficiente para abrir el correo en el teléfono; corto para que un código leído por encima del hombro no sirva al rato. |
| Intentos por código | 3 | Absorbe el error de tecleo, no un tanteo. |
| Envíos por reto | 3 (el inicial + 2 reenvíos) | Límite real del reto: impide usar el reenvío para reiniciar los intentos indefinidamente. |
| Espera entre envíos | 60 s | Evita el envío repetido por impaciencia, que es lo que hace que el correo termine en spam. |

**FR-2FA-3** Lo único que el cliente conoce de un reto es: el correo de destino **enmascarado**, la longitud del código, el instante de caducidad, el instante a partir del cual puede reenviar, los intentos restantes y los envíos restantes. El **código nunca viaja al cliente** — ni en el cuerpo de una respuesta, ni en una cabecera, ni en un registro de consola.

### 2.5 Paso 2 — Pantalla de verificación

**FR-2FA-4** `/worker/verificacion` se representa **fuera del shell**, como el inicio de sesión (FR-SHELL-3). No puede mostrar el nombre del trabajador, su caja, la sede ni el nombre del mercante: cuando esta pantalla se ve, la identidad todavía no está verificada, y la marca visible es siempre PuntoCash.

**FR-2FA-5** La pantalla declara a dónde fue el código, con el correo **enmascarado** (`j•••z@puntocash.com`). Nunca la dirección completa: a esta pantalla se llega con una contraseña, y una contraseña acertada no debe poder usarse para confirmar la dirección de correo de un trabajador.

**FR-2FA-6** El campo del código:

1. Es **un único control de formulario**, con su etiqueta visible, presentado sobre seis casillas. Las casillas son representación, no controles, y se ocultan a las tecnologías de asistencia. Seis campos independientes rompen el autorrelleno del código, reparten mal el pegado y se anuncian como seis controles sin etiqueta propia.
2. Acepta solo dígitos. Un pegado que traiga espacios, guiones o texto alrededor se reduce a sus dígitos en lugar de rechazarse.
3. Se llena de izquierda a derecha: el cursor va siempre al final, y un clic sobre cualquier casilla no permite escribir en un hueco intermedio.
4. Declara `autocomplete="one-time-code"`, de modo que el sistema operativo pueda ofrecer el código recibido, y se marca para que un gestor de contraseñas **no** lo almacene.
5. Muestra la cuenta atrás de vigencia como descripción del campo.

**FR-2FA-7** Al completarse el sexto dígito la verificación **se envía sola**. El botón de envío permanece, habilitado solo con el código completo, porque es la única acción primaria de la pantalla y la vía de quien navega con teclado o llega al campo por otro camino.

**FR-2FA-8** Desenlaces de la verificación y comportamiento exigido:

| Resultado | Comportamiento |
| --- | --- |
| **Verificado** | Mensaje de éxito, pantalla bloqueada contra un segundo envío, navegación a `/worker/inicio`. El código se consume: no puede volver a usarse. |
| **Código incorrecto** | Error a nivel de formulario que **dice cuántos intentos quedan**; el campo se vacía, se marca inválido y recupera el foco. |
| **Código caducado** | Advertencia, no error: no hay nada que corregir. El campo se cierra y la acción disponible pasa a ser el reenvío. La caducidad manda sobre cualquier aviso anterior. |
| **Intentos agotados** | El reto muere. Error a nivel de formulario, campo y reenvío cerrados, y la única acción es volver a iniciar sesión. El mensaje señala que, si el trabajador no reconoce esos intentos, avise al administrador de su sede. |
| **Envíos agotados** | El reto muere, con el mismo cierre. El mensaje remite a iniciar sesión de nuevo o a la asistencia del administrador. |
| **Error de red** | Error a nivel de formulario; **no consume intento** — nada llegó a comprobarse — y el código sigue válido mientras no caduque. |
| **Sin reto vigente** | Ver FR-2FA-13. |

**FR-2FA-9** Un código incorrecto y un código caducado deben distinguirse en el mensaje. No es información que ayude a un atacante — ya tiene la contraseña si llegó aquí — y confundirlos hace que el trabajador teclee tres veces un código que nunca iba a servir.

### 2.6 Reenvío

**FR-2FA-10** Reenviar emite un código nuevo e **invalida el anterior**: en cada instante hay como máximo un código válido por reto. El mensaje de confirmación lo dice, porque un trabajador con dos correos a la vista tecleará el primero.

**FR-2FA-11** El reenvío reinicia la vigencia y los intentos, y **descuenta un envío**. Los envíos no se reponen: son el límite del reto.

**FR-2FA-12** El botón de reenvío declara siempre su estado en el propio texto, nunca solo por color o por estar apagado: `Reenviar código en 43 s` durante la espera, `Reenviar código` cuando está disponible, `Sin reenvíos disponibles` cuando se agotaron. Pedir un reenvío antes de tiempo — si llegara a ocurrir — se responde con una advertencia que remite a la cuenta atrás, no con un error.

### 2.7 Fin del reto

**FR-2FA-13** **Sin reto vigente no hay nada que verificar.** Es lo que ocurre al recargar la pantalla, al llegar por enlace directo o al volver con el botón del navegador. La pantalla lo dice tal cual — la verificación ya no está activa y hay que iniciar sesión otra vez — en lugar de redirigir en silencio a una pantalla que el trabajador no pidió.

**FR-2FA-14** "Usar otra cuenta" descarta el reto y devuelve al inicio de sesión. Es la salida de quien se equivocó de cuenta, y evita que el reto siga vivo mientras otra persona inicia sesión en el mismo equipo.

**FR-2FA-15** Un reto muerto no se reabre. Cualquier continuación empieza por el inicio de sesión, con credenciales.

### 2.8 El correo del código

Es el único correo que PuntoCash envía durante el acceso. La plantilla vive en `src/features/auth/emails/verification-code-email.ts` y puede revisarse representada en `/design-system/correos`.

**FR-2FA-16** Contenido obligatorio: el nombre del trabajador, el código, su vigencia, la advertencia de un solo uso, el momento del intento de acceso (`dd/MM/yyyy · HH:mm`, FR-FMT-2), el aviso de no compartirlo y la indicación de qué hacer si el intento no fue suyo. Es la única señal de acceso indebido que un trabajador recibe antes de que alguien entre con su cuenta.

**FR-2FA-17** El código **no va en el asunto**. El asunto se lee en la pantalla de bloqueo del teléfono, delante de quien esté al lado del mostrador.

**FR-2FA-18** El correo **no lleva enlace ni botón que complete el acceso**. Un código verificable desde el correo convierte el buzón en la credencial: quien tenga acceso al correo entra sin pasar por la caja. El código se teclea en la pantalla que ya está abierta.

**FR-2FA-19** El correo no nombra la sede, la caja ni al mercante que administra la sede, por el mismo motivo que la pantalla (FR-2FA-4) y por la regla de marca A9.

**FR-2FA-20** Se envía en `multipart/alternative`, con cuerpo HTML y cuerpo de texto plano. Un cliente que bloquea HTML debe seguir mostrando el código legible, y un correo solo-HTML puntúa peor en los filtros de spam — inaceptable en un correo del que depende poder abrir la caja.

**FR-2FA-21** El correo debe ser reconociblemente PuntoCash **con las imágenes bloqueadas**, que es como lo recibirá la mayoría: el logotipo es texto y el isotipo es una imagen opcional. Sin tipografía Montserrat disponible, la marca se sostiene con la alternativa del sistema.

**FR-2FA-22** Sin adjuntos y sin `List-Unsubscribe`: es un correo transaccional de seguridad, no una comunicación de la que se pueda dar de baja.

### 2.9 Seguridad del segundo factor

Lo que sigue no es comportamiento de pantalla: es responsabilidad del backend, y se especifica aquí porque sin ello el resto de la sección no protege nada.

**FR-2FA-23** El código se genera con un generador criptográficamente seguro. No se deriva del identificador, de la hora ni de un contador.

**FR-2FA-24** Se almacena su **hash**, nunca el código. La comparación es en tiempo constante, y el registro se borra al verificarse.

**FR-2FA-25** Los tres límites — vigencia, intentos y envíos — se hacen cumplir **en el servidor**. Lo que la pantalla muestra es un reflejo de ellos, no su implementación: una cuenta atrás agotada en el cliente no es lo que impide verificar.

**FR-2FA-26** Se audita que un código se envió, a qué cuenta y cuándo, y el resultado de cada intento de verificación. **Nunca el código.**

**FR-2FA-27** El reto se identifica con un valor opaco y no adivinable, y no admite verificación desde otra sesión de navegador que la que lo originó.

**FR-2FA-28** La verificación se limita por tasa también por cuenta y por origen, además de por reto: los límites por reto no sirven de nada si se pueden crear retos en cadena.

### 2.10 Accesibilidad del campo del código

**FR-2FA-29** El campo cumple el contrato general (FR-A11Y-1): se resuelve desde su etiqueta visible, y expone inválido y descrito-por de forma programática. Su `aria-describedby` referencia únicamente elementos que se representan — la descripción o el error, más el párrafo que dice a qué correo fue el código — de modo que el control se anuncie con su destino y no queden referencias huérfanas.

**FR-2FA-30** Las casillas miden 48×56px, por encima del mínimo de 44px (FR-A11Y-3). El foco es un borde navy visible con anillo, nunca solo una sombra.

**FR-2FA-31** Ningún estado se comunica solo por color (FR-A11Y-2): el error lleva texto, la cuenta atrás lleva cifras, y el botón de reenvío lleva su estado escrito.

**FR-2FA-32** El envío automático al sexto dígito no deja a nadie sin vía manual: el botón de envío sigue presente y operable por teclado.

### 2.11 Contrato para el backend

El frontend está escrito contra tres operaciones y tres uniones de resultado (`src/features/auth/mock-auth.ts` y `src/features/auth/two-factor.ts`). Sustituir el mock por el backend real no debería exigir cambios en las pantallas.

| Operación | Entrada | Resultados |
| --- | --- | --- |
| Autenticar | identificador, contraseña, credencial del equipo (FR-DEV-8) | `challenge-required` (con la vista del reto) · `invalid-credentials` · `other-branch` · `account-blocked` · `network-error` |
| Verificar | reto, código | `verified` · `invalid-code` · `code-expired` · `challenge-locked` (motivo: intentos \| envíos) · `challenge-not-found` · `network-error` |
| Reenviar | reto | `sent` · `too-soon` · `challenge-locked` (motivo: envíos) · `challenge-not-found` · `network-error` |

El reto tal como lo ve el cliente: identificador opaco, correo enmascarado, longitud del código, caducidad, disponibilidad de reenvío, intentos restantes, envíos restantes. Nada más (FR-2FA-3).

### 2.12 Comportamiento de demostración del acceso

> Equipo: antes del inicio de sesión, el equipo debe vincularse a una caja con el simulador `/kiosk/simulador-admin` (FR-DEV-9).
>
> Credenciales: cualquier identificador con la contraseña `puntocash` abre un reto —en la demo, toda cuenta pertenece a la sede de la caja del equipo—; `otrasede@puntocash.com` con esa contraseña devuelve trabajador de otra sede; `bloqueado@puntocash.com` devuelve cuenta bloqueada; `error@puntocash.com` devuelve error de red.
>
> Verificación: el código `482913` verifica; `000000` fuerza un error de red; cualquier otro descuenta un intento. El identificador `caduca@puntocash.com` crea un reto con 20 s de vigencia, para poder ver el estado caducado sin esperar cinco minutos.
>
> El código correcto es fijo en el mock: es un demo de interfaz, no un generador. FR-2FA-23 es requisito del backend. **No se envía ningún correo**: `buildVerificationCodeEmail()` lo construye y nada lo despacha.

---

## 3. Inicio (inicio operativo)

**FR-HOME-1** Muestra un saludo con el nombre del Worker y su caja asignada.

**FR-HOME-2** Presenta bloques de resumen de solo lectura: **Mi caja** (efectivo disponible por moneda, con indicador de nivel bajo expresado como texto), **Tasas vigentes** (compra/venta por moneda con una etiqueta de actualización), **Accesos rápidos**, **Operaciones recientes** y **Alertas**.

**FR-HOME-3** Cada bloque enlaza a la pantalla dueña del dato (`/worker/caja`, `/worker/tasas`, `/worker/operaciones`, `/worker/alertas`). Inicio no ejecuta ninguna operación ni modifica estado.

**FR-HOME-4** Todas las cifras están acotadas a la caja del Worker autenticado **[R12]**.

---

## 4. Nueva operación (catálogo de servicios)

**FR-CAT-1** El catálogo representa 13 tarjetas de servicio agrupadas en cuatro categorías: *Cambio y efectivo*, *Transferencias*, *Pagos y productos*, *Empresas*.

**FR-CAT-2** Cada tarjeta declara su disponibilidad como texto: **Disponible** (3 servicios: Cambio de moneda, Remesas, Giros) o **En construcción** (los 10 restantes).

**FR-CAT-3** La tarjeta completa es el enlace; su nombre accesible incluye el nombre del servicio, su descripción y su disponibilidad.

**FR-CAT-4** La búsqueda filtra tarjetas por nombre, descripción y categoría, sin distinguir mayúsculas ni acentos. Las categorías sin coincidencias se eliminan por completo. Un resultado vacío muestra un estado vacío con una acción que restaura el catálogo completo; el campo ofrece además su propio control de limpieza.

**FR-CAT-5** La tarjeta de un servicio no disponible resuelve a una pantalla marcador de posición que nombra el servicio y ofrece una vía de regreso. Ninguna de esas pantallas define ni simula un flujo de trabajo **[§16]**.

---

## 5. Cambio de moneda

Operación de tres pasos: **Cambio → Cliente → Revisión**, seguida de una pantalla de resultado. Un stepper muestra el avance; el resultado no es un paso. Como toda operación, exige una Jornada abierta (FR-CM-16 y FR-CM-17).

### 5.1 Paso 1 — Cambio

**FR-CM-1** El Worker selecciona una moneda de origen ("Cliente entrega") y una de destino ("Cliente recibe") del conjunto soportado (CUP, USD, EUR, GBP) e introduce el importe de origen.

**FR-CM-2** El importe acepta cualquiera de las dos convenciones de separadores; el último separador seguido de uno o dos dígitos se interpreta como marca decimal.

**FR-CM-3** Mensajes de validación del importe: vacío → "Introduce el monto a entregar."; no interpretable → "Introduce un monto válido."; cero o negativo → "El monto debe ser mayor que cero."

**FR-CM-4** El sistema cotiza el cambio mientras el Worker escribe y muestra el importe de destino y la tasa aplicada. La cotización es la única fuente del importe, la tasa y el par; ninguna pantalla los recalcula.

**FR-CM-5** Un panel de **Validación de caja** muestra lo disponible en la caja en la moneda de destino, lo que la operación requiere y lo que quedaría. El efectivo insuficiente impide continuar.

**FR-CM-6** Continuar fija la cotización. Los pasos 2 y 3 leen esa cotización fijada y nunca vuelven a cotizar, de modo que un cambio posterior de tasa no puede reescribir una operación ya revisada **[R9]**.

### 5.2 Paso 2 — Cliente

**FR-CM-7** El Worker identifica al cliente introduciendo tipo y número de documento, o mediante un escaneo de documento simulado que ofrece dos resultados ensayables (un cliente registrado y uno no registrado).

**FR-CM-8** Un cliente encontrado se muestra para su confirmación, con una vía explícita para rechazar la coincidencia y registrar a otra persona.

**FR-CM-9** Una búsqueda sin resultados ofrece registrar un cliente nuevo, capturando los datos KYC que el registro de la operación requiere.

**FR-CM-10** La operación no puede avanzar sin un cliente seleccionado o recién creado.

### 5.3 Paso 3 — Revisión, y resultado

**FR-CM-11** La pantalla de revisión muestra el cambio fijado, el cliente, la tasa aplicada y el impacto en caja. Es el último punto antes del registro.

**FR-CM-12** Confirmar deshabilita la acción mientras dura el envío, de modo que la operación no pueda crearse dos veces. La confirmación se rechaza si la cotización, el cliente, la Jornada o la comprobación de efectivo dejaron de ser válidos.

**FR-CM-13** En caso de éxito el sistema registra una Operación completada con: la instantánea del cliente, servicio `Cambio de moneda`, estado `Completada`, los importes de origen y destino, la tasa aplicada y la instantánea de caja (antes / movimiento / después) en la moneda de destino **[R9]**, junto con los dos movimientos de caja comerciales de FR-CM-18.

**FR-CM-14** La pantalla de resultado muestra el código de operación y sus cifras, y ofrece impresión y una vía hacia Operaciones.

**FR-CM-15** Retroceder entre pasos nunca descarta los datos introducidos. Abandonar el flujo con datos significativos introducidos debe pedir confirmación previa; los valores predefinidos no cuentan como datos introducidos.

**FR-CM-16** Cambio de moneda exige Jornada abierta **[R1]**. Toda operación debe realizarse dentro de una Jornada porque su efecto en efectivo se registra como movimiento de caja, y ese movimiento debe quedar asociado a la Jornada en que ocurrió.

**FR-CM-17** Sin Jornada abierta, el flujo representa un estado bloqueado ("Caja cerrada" / "Debes abrir una jornada antes de realizar un cambio de moneda.") con una vía hacia Caja, y sin ninguno de los pasos ni del formulario de cambio **[R1]**. Este estado se evalúa al entrar al flujo; el catálogo sigue mostrando la tarjeta como Disponible.

**FR-CM-18** Al confirmar, y solo si todo es válido, el sistema registra **dos** movimientos de caja comerciales, ambos con el código de la operación y la instantánea de la Jornada abierta: una **Entrada** en la moneda de origen (lo que el cliente entrega; saldo antes → saldo antes + importe) y una **Salida** en la moneda de destino (lo que el cliente recibe; saldo antes → saldo antes − importe), con el concepto `Cambio de moneda`. Ambos ajustan el saldo vivo de su moneda **[R7]**. Los registros son propios del libro, no filas derivadas de la operación.

**FR-CM-19** Al confirmar se revalida, en este orden exacto y antes de registrar nada **[R3]**: Jornada abierta → ambas monedas habilitadas → saldo suficiente en la moneda de destino. Si alguna falla, no se registra ninguna operación ni ningún movimiento ni cambio de saldo, y el Worker permanece en la pantalla de revisión con el motivo (por ejemplo, "La jornada ya no está abierta. Abre una jornada en Caja para registrar la operación."). Los dos movimientos y los dos cambios de saldo son atómicos: se registran ambos o ninguno.

**FR-CM-20** La pantalla de revisión advierte del efecto antes de confirmar: se registrarán dos movimientos de caja en la Jornada abierta, con su entrada y su salida. La comprobación de efectivo de los pasos 1 a 3 lee el saldo vivo de la caja en la moneda de destino.

---

## 6. Remesas (Cobrar remesa)

Pago de una remesa entrante: **Código → Revisar remesa → Confirmar entrega → Resultado**.

**FR-RM-1** Sin Jornada abierta, el flujo representa un estado bloqueado ("Caja cerrada") con una vía hacia Caja, y sin campo de código **[R1]**.

**FR-RM-2** La única forma de alcanzar una remesa es su código exacto **[R4]**. Sin listados, sin búsqueda por ningún otro atributo, sin sugerencias.

**FR-RM-3** Una búsqueda que no resuelva a una remesa representa el estado "no encontrada" de la pantalla de código, conservando el código introducido y permitiendo otro intento. Los siguientes casos son indistinguibles entre sí y de un código inexistente:
- un código que no existe,
- un valor que solo coincide con una `reference`,
- un código que pertenece a otro tipo de servicio.

**FR-RM-4** Los estados del proveedor se almacenan exactamente como se reciben y se muestran como etiquetas en español **[R10]**:

| Estado almacenado | Etiqueta mostrada |
| --- | --- |
| `COMPLETED` | Completada |
| `IN_TRANSIT` | En tránsito |
| `READY` | Lista para entrega |
| `PENDING_PAYMENT` | Pendiente de pago |
| `PAYED` | Pagada |
| `DENIED_PAYMENT` | Pago denegado |
| `PAYOUT_DENIED` | Entrega denegada |

Los métodos de entrega se muestran como `delivery` → Entrega, `transfer` → Transferencia, `pickup` → Recogida.

**FR-RM-5** La pantalla de revisión muestra la remesa (código, importe, moneda, método de entrega, referencia cuando existe, estado) y el beneficiario (nombre, documento de identidad y los datos de contacto que devolvió el proveedor). Incluye una advertencia de verificación de identidad **[R5]**.

**FR-RM-6** Continuar a la confirmación exige estado `READY` **[R6]** *y* efectivo suficiente en la caja en la moneda de pago. Un estado no pagable y un saldo insuficiente muestran cada uno su propio mensaje, y la acción de continuar queda deshabilitada.

**FR-RM-7** La confirmación invoca primero el completado del proveedor. Ante un fallo no se registra nada **[R2]**:

| Resultado del proveedor | El Worker ve | Estado del sistema |
| --- | --- | --- |
| Conflicto | "La remesa ya no está disponible para entrega." | Sin operación, sin movimiento, sin cambio de saldo |
| Fallo | "No se pudo completar la remesa. Intenta nuevamente o solicita asistencia." | Sin operación, sin movimiento, sin cambio de saldo |

**FR-RM-8** Ante el éxito del proveedor el sistema registra, en este orden: una **Salida** comercial en la moneda de pago vinculada a un nuevo código de operación, y después una Operación completada (servicio `Remesa`, estado `Completada`, Cliente = el beneficiario) que conserva la instantánea de la remesa, incluido el estado devuelto por el proveedor **[R7] [R9]**.

**FR-RM-9** Si en el momento del registro la caja ya no puede cubrir el pago, se informa al Worker y no se registra ninguna operación **[R3]**.

**FR-RM-10** La pantalla de resultado confirma el pago y ofrece impresión y una vía hacia Operaciones.

---

## 7. Giros

### 7.1 Selector de operación

**FR-GS-1** `/worker/nueva-operacion/giros` es un selector de operación titulado **Giros**, con el subtítulo "Selecciona la operación que deseas realizar." No redirige ni lanza automáticamente ninguna de las dos operaciones.

**FR-GS-2** Ofrece exactamente dos operaciones del mismo nivel:

| Tarjeta | Descripción | Destino |
| --- | --- | --- |
| **Enviar giro** | Registrar un nuevo giro para que otra persona pueda cobrarlo. | `/giros/enviar` |
| **Cobrar giro** | Entregar un giro existente al beneficiario mediante su código. | `/giros/cobrar` |

**FR-GS-3** El selector no debe mostrar métricas, saldos, giros pendientes o recientes, ni tabla alguna **[R4]**.

### 7.2 Enviar giro

Pasos: **Registrar giro → Revisar giro → Confirmar envío → Resultado**.

**FR-GE-1** Sin Jornada abierta, un estado bloqueado ("Caja cerrada" / "Debes abrir una jornada antes de registrar un giro.") con una vía hacia Caja **[R1]**.

**FR-GE-2** Una franja de contexto muestra Caja, Trabajador, Jornada actual (Abierta) y el número de monedas habilitadas, leídos del estado vivo.

**FR-GE-3** El formulario captura, en tres secciones:

| Sección | Campos |
| --- | --- |
| **Remitente** | Tipo de documento, número de documento, nombre, primer apellido, **segundo apellido**, fecha de nacimiento, teléfono, nacionalidad |
| **Beneficiario** | Nombre completo, correo electrónico *(opcional)*, teléfono, dirección, documento de identidad, **Provincia**, **Municipio** |
| **Datos del giro** | Moneda, importe. El método de entrega es un valor de solo lectura: **Recogida** |

**FR-GE-4** El segundo apellido es obligatorio. El correo electrónico es opcional, pero debe ser una dirección válida cuando se proporciona.

**FR-GE-5** Provincia y Municipio provienen de un catálogo fijo. Municipio permanece deshabilitado hasta que se selecciona una Provincia y solo ofrece municipios de esa provincia; cambiar de Provincia limpia un Municipio incompatible.

**FR-GE-6** El selector de moneda ofrece únicamente las monedas habilitadas actualmente en la caja.

**FR-GE-7** El importe debe ser mayor que cero. La acción de continuar permanece deshabilitada hasta que todo el formulario es válido; los errores de campo se muestran cuando el Worker intenta continuar, no mientras escribe.

**FR-GE-8** Un panel de resumen en vivo acompaña al formulario.

**FR-GE-9** La revisión muestra Remitente, Beneficiario, Datos del giro y el impacto en Caja ("Entrada de efectivo"), con una advertencia de verificación de datos. Los importes se muestran con la bandera de su moneda.

**FR-GE-10** La confirmación es irreversible y así lo advierte. Queda deshabilitada mientras se envía.

**FR-GE-11** Al confirmar, el sistema valida la Jornada abierta y la habilitación de la moneda, y luego invoca al proveedor para crear la transferencia. Un fallo del proveedor produce un mensaje de error y **ninguna** operación, **ningún** movimiento y **ningún** cambio de saldo **[R2]**.

**FR-GE-12** Ante el éxito del proveedor el sistema registra una **Entrada** comercial en la moneda del giro y una Operación completada (servicio `Giros`, estado `Completada`, Cliente = el **remitente**) que conserva la instantánea del giro: código externo, referencia cuando existe, datos del remitente, datos del beneficiario, **códigos y etiquetas** de provincia y municipio, método de entrega, moneda, importe y el estado del proveedor en la creación **[R7] [R9]**.

**FR-GE-13** La pantalla de resultado muestra el código de operación y el **código del giro** que necesitará el beneficiario, y ofrece impresión y una vía hacia Operaciones. No redirige automáticamente.

**FR-GE-14** Abandonar el flujo con datos introducidos pide confirmación; el diálogo indica que no se creará ningún giro externo ni se modificará saldo alguno.

### 7.3 Cobrar giro

Pasos: **Código → Revisar giro → Confirmar entrega → Resultado**. "Giro no encontrado" es un estado de error de la pantalla de código, no una pantalla aparte.

**FR-GC-1** Sin Jornada abierta, un estado bloqueado ("Debes abrir una jornada antes de cobrar un giro.") y sin campo de código **[R1]**.

**FR-GC-2** La pantalla de código presenta un único campo (placeholder `Ej. TR-260901-000245`) con autocompletado desactivado, una acción **Buscar giro** a todo el ancho, deshabilitada hasta que se introduce un código, y la nota "El código debe ser proporcionado directamente por el beneficiario."

**FR-GC-3** Un panel lateral enumera las validaciones de pago que se aplicarán y la forma esperada del giro (Servicio: Giro interprovincial · Método: Recogida · Impacto en caja: Salida de efectivo).

**FR-GC-4** La pantalla no debe contener un segundo campo de búsqueda, ni datalist, ni tabla, ni sugerencias, ni búsquedas recientes, ni búsqueda por nombre, documento, teléfono, provincia, municipio, remitente o importe **[R4]**.

**FR-GC-5** Una búsqueda rechazada marca el campo como inválido y muestra, entre el campo y la acción, un único mensaje: **"Giro no encontrado"** / "Verifica el código con el beneficiario e inténtalo nuevamente." Todas las causas de rechazo son indistinguibles —código inexistente, coincidencia solo por referencia, o un servicio que no es una transferencia— y no puede filtrarse ningún dato del registro subyacente.

**FR-GC-6** Editar el código limpia el error. Un código válido posterior continúa con normalidad.

**FR-GC-7** Los estados del proveedor se muestran como etiquetas en español; en giros, `READY` es **"Lista para pago"** y `COMPLETED` es **"Completado"**. El valor almacenado es siempre el estado en bruto **[R10]**.

**FR-GC-8** La pantalla de revisión muestra **Datos del giro** (código, importe a entregar con la bandera de su moneda, moneda, método de entrega, referencia cuando existe, insignia de estado) y **Beneficiario** (nombre, documento de identidad, teléfono, dirección, Provincia / Municipio), más la advertencia de verificación de identidad **[R5]**.

**FR-GC-9** Continuar a la confirmación se bloquea, con un mensaje específico, cuando se cumple cualquiera de estas condiciones:

| Condición | Mensaje |
| --- | --- |
| El estado no es `READY` **[R6]** | "Este giro no está disponible para pago." |
| La moneda de pago no está habilitada en esta Caja | "{MON} no está habilitada en esta caja." |
| El saldo de la caja es inferior al importe | "La caja no dispone de suficiente {MON} para entregar este giro." + importe disponible |

**FR-GC-10** `receiverProvince` / `receiverMunicipality` son **datos del beneficiario, no enrutamiento**. La caja actual no tiene por qué coincidir con ellos, no se reserva ningún puesto de pago y no se garantiza liquidez en el momento de la creación.

**FR-GC-11** No debe ofrecerse en ningún punto del flujo moneda alternativa, conversión ni pago parcial.

**FR-GC-12** La confirmación revalida, en este orden exacto, antes de invocar al proveedor **[R3]**: Jornada abierta → moneda habilitada → saldo suficiente → estado aún pagable. Solo entonces se invoca el completado del proveedor.

**FR-GC-13** Resultados del proveedor:

| Resultado | El Worker ve | Estado del sistema |
| --- | --- | --- |
| Conflicto (409) | "El giro ya no está disponible para pago." | No se registra nada |
| No encontrado (404) / fallo | "No se pudo completar el giro. Intenta nuevamente o solicita asistencia." | No se registra nada |

No se intenta reintento automático ni asiento compensatorio **[R2]**.

**FR-GC-14** En caso de éxito el sistema registra exactamente una **Salida** comercial (saldoAntes → saldoAntes − importe) vinculada a un código de operación **nuevo**, y una Operación completada (servicio `Giros`, estado `Completada`, Cliente = el **beneficiario**) que conserva la instantánea del cobro: código externo, referencia, datos del beneficiario, códigos y etiquetas de provincia/municipio, método de entrega, moneda, importe y el estado de completado del proveedor almacenado en bruto **[R7] [R9]**.

**FR-GC-15** La operación de cobro es independiente de la operación Enviar giro que la originó: códigos de operación distintos, Cliente distinto y dirección de efectivo opuesta. Ambas comparten legítimamente el mismo código externo de giro.

**FR-GC-16** La pantalla de resultado indica "Giro entregado correctamente" y ofrece impresión y una vía hacia Operaciones.

**FR-GC-17** Un giro cuyo estado sea `COMPLETED` resuelve normalmente en la búsqueda y representa su pantalla de revisión, con **Continuar a confirmar** deshabilitado y mostrando el mensaje de no pagable de FR-GC-9 **[R6]**.

### 7.4 Buscar solicitud

`/worker/nueva-operacion/solicitud`, alcanzada desde una tarjeta propia del catálogo ("¿El cliente trae un código de kiosco?"). Recupera una solicitud generada en el kiosco de autoservicio (`KS-yyMMdd-NNNNNN`, ver `PuntoCash_Kiosk_Autoservicio_Functional_Requirements_v1.md` §8) y continúa la operación real correspondiente con esos datos precargados. No es en sí misma un servicio ni un paso de ningún flujo de operación: es una puerta de entrada alternativa a los flujos ya descritos en §5–§7.

**FR-SOL-1** La pantalla presenta un único campo de código, sin autocompletado, y una acción "Buscar solicitud" deshabilitada hasta que se introduce un valor. No hay Jornada exigida para *buscar* — la exigencia de Jornada abierta sigue perteneciendo a cada flujo de destino (FR-CM-16, FR-RM-1, FR-GE-1, FR-GC-1) y se evalúa quien la recibe, no esta pantalla.

**FR-SOL-2** La búsqueda invoca `findSelfServiceRequestByCode`, que solo reconoce el código exacto — sin listados ni búsqueda por ningún otro atributo, igual que Remesas y Giros **[R4]**.

**FR-SOL-3** A diferencia de las búsquedas orientadas al cliente (FR-RM-3, FR-GC-5), aquí el motivo del rechazo **sí se distingue**, porque quien busca es un Worker autenticado, no la persona a quien podría beneficiar descubrir el estado de un código ajeno: "Código no encontrado", "Esta solicitud ya venció" (código válido pero fuera de su ventana de 30 minutos) y "Esta solicitud ya fue utilizada" (código ya consumido por otro Worker) son tres mensajes distintos.

**FR-SOL-4** Una solicitud encontrada se representa como un resumen (`RequestSummary`) con filas propias de su servicio (`summaryRows()`): Cambio de moneda muestra el par de monedas y el monto de origen; Remesas y Cobrar giro muestran beneficiario e importe; Enviar giro muestra remitente, beneficiario y monto — nunca el detalle completo de la instantánea, solo lo suficiente para que el Worker confirme que es la solicitud correcta antes de continuar.

**FR-SOL-5** "Continuar" es la única acción sobre una solicitud encontrada. No hay edición del resumen ni posibilidad de fusionar dos solicitudes.

**FR-SOL-6** Al pulsar "Continuar", el sistema, en este orden: marca la solicitud como consumida (`markSelfServiceRequestConsumed`, ver FR-AS-DOM-4 del FRD de Autoservicio), registra los datos como una entrega pendiente para el flujo de destino (`setPendingWorkerHandoff`) y navega a la ruta de ese servicio. Ninguna operación ni movimiento de caja se registra aquí — Buscar solicitud solo entrega datos a un flujo que ya existía; el registro real ocurre donde siempre ocurrió, en la confirmación de ese flujo. En **Cambio de moneda** específicamente, la cotización del kiosco nunca se hereda como definitiva: el flujo de destino vuelve a cotizar en vivo (FR-CM-4) desde cero, de modo que una tasa que cambió entre el kiosco y el mostrador no puede colarse en una operación real **[R9]**.

**FR-SOL-7** El flujo de destino consume la entrega pendiente una sola vez y la limpia inmediatamente después de leerla, de modo que una recarga de página o una doble invocación (React Strict Mode) no la reaplique dos veces. En **Cobrar remesa** y **Cobrar giro**, el código de la solicitud dispara automáticamente la misma búsqueda por código que el Worker haría a mano (FR-RM-2, FR-GC-2), sin adivinar ni completar el resto del flujo por él.

**FR-SOL-8** En **Enviar giro**, si los datos precargados de remitente, beneficiario y monto son completos y válidos, el flujo salta directamente al paso de revisión (FR-GE-9) — pero la confirmación sigue siendo un paso manual y explícito del Worker (FR-GE-10), y el **código real del giro** (el que el beneficiario necesitará para cobrarlo) solo se genera cuando esa confirmación invoca al proveedor externo con éxito (FR-GE-12): una solicitud de kiosco nunca trae ni simula un código de giro por adelantado.

**FR-SOL-9** Un Worker puede llegar al catálogo de servicios y elegir un flujo directamente, sin pasar por Buscar solicitud, exactamente como antes de que existiera esta pantalla — Buscar solicitud es una vía adicional, nunca obligatoria.

---

## 8. Caja

### 8.1 Pantalla de caja

**FR-CAJA-1** Presenta: el resumen de la caja (Caja, Trabajador, estado operativo, última actualización), los indicadores del día, **Saldos de caja** por moneda con banderas e indicador textual de nivel bajo, el panel de acciones, las alertas y el libro de movimientos.

**FR-CAJA-2** El panel de acciones expone las capacidades de la caja, cada una disponible o deshabilitada con un **motivo textual**:

| Acción | Disponible cuando | Etiqueta al estar deshabilitada |
| --- | --- | --- |
| Imprimir resumen | Siempre | — |
| Registrar fondeo inicial | No hay Jornada abierta | "Jornada abierta" |
| Añadir moneda | Siempre | — |
| Ajustar efectivo | Jornada abierta | "Requiere jornada abierta" |
| Arqueo y cierre | Jornada abierta | "Requiere jornada abierta" |

**FR-CAJA-3** Los movimientos son filtrables por texto libre (operación o concepto), **Tipo** (entrada/salida), **Moneda** y **Fecha**, y cada fila muestra fecha y hora, código de operación cuando lo tiene, tipo, concepto, moneda, importe y saldo resultante.

**FR-CAJA-4** El enrutamiento desde el libro depende del origen del movimiento **[PRD §5.4]**: un movimiento **comercial** enlaza mediante su código de operación al detalle de la operación y no ofrece "Ver detalle"; un movimiento **interno** ofrece "Ver detalle" hacia su propia pantalla de detalle de movimiento.

**FR-CAJA-5** "Imprimir resumen" imprime el estado actual de la caja mediante el mecanismo estándar de impresión.

### 8.2 Fondeo inicial (apertura de la Jornada)

**FR-CAJA-6** Tres pasos: formulario → revisión → resultado. El formulario nunca abre la Jornada; solo lo hace la confirmación de la revisión.

**FR-CAJA-7** Si ya hay una Jornada abierta, la pantalla representa un estado bloqueado que explica que no es posible un nuevo fondeo hasta que esa Jornada se cierre.

**FR-CAJA-8** El formulario recoge un importe de apertura por cada moneda habilitada, con banderas y sin emojis.

**FR-CAJA-9** Confirmar abre la Jornada y debe, de forma atómica:
1. **Sustituir** el saldo de cada moneda habilitada por el importe declarado — nunca sumarlo a lo que hubiera. Una moneda sin importe declarado abre en 0.
2. Registrar un movimiento de entrada **Fondeo inicial** por cada moneda fondeada por encima de 0 (un importe de 0 no produce fila), cada uno con la instantánea de la Jornada (caja, trabajador, `openedAt`).
3. Persistir la Jornada como `OPEN` con `closedAt = null`.

**FR-CAJA-10** La pantalla de resultado confirma la apertura, ofrece impresión y encamina a Caja.

**FR-CAJA-11** Desde el formulario el Worker puede salir a habilitar una moneda que falte; los importes ya escritos se conservan para su regreso.

### 8.3 Movimientos comerciales en el libro

**FR-CAJA-12** Toda operación completada que mueve efectivo registra sus movimientos comerciales en el libro en el momento de completarse, dentro de una Jornada abierta, con el código de la operación y la instantánea de esa Jornada: un Cambio de moneda registra dos (una entrada en la moneda de origen y una salida en la de destino, compartiendo el código de operación); toda otra operación de importe único registra uno, cuya dirección sigue a la operación — un giro **enviado** es una *entrada*, y tanto un giro **cobrado** como una remesa son *salidas*. Las operaciones que no estén `Completada` no producen movimiento. Los movimientos comerciales enlazan a su operación (FR-CAJA-4); no tienen pantalla de detalle propia.

### 8.4 Añadir moneda

**FR-CAJA-13** Ofrece únicamente monedas del catálogo que **no** estén ya habilitadas; una moneda ya habilitada no puede ofrecerse ni habilitarse dos veces.

**FR-CAJA-14** Habilitar una moneda la incorpora a los saldos de la caja en 0 y devuelve al Worker a su punto de origen. Cancelar no habilita nada.

### 8.5 Ajustar efectivo

**FR-CAJA-15** Requiere Jornada abierta. Tres pasos: formulario → **Revisar ajuste de efectivo** → **Ajuste registrado correctamente**.

**FR-CAJA-16** El Worker selecciona una moneda e introduce el **efectivo físico contado**. La diferencia (`contado − registrado`) se calcula y se muestra con signo explícito; la diferencia nunca se introduce directamente.

**FR-CAJA-17** El **Motivo** es obligatorio: *Faltante detectado*, *Sobrante detectado*, *Error de registro*, *Otro*. Las observaciones son opcionales.

**FR-CAJA-18** Las opciones de motivo se filtran según el signo de la diferencia **[R8]**: una diferencia negativa no puede explicarse con "Sobrante detectado", ni una positiva con "Faltante detectado". Los dos motivos genéricos son siempre válidos. Si el signo se invierte después de haber elegido un motivo direccional, esa selección se **limpia, nunca se intercambia**; un motivo genérico se mantiene.

**FR-CAJA-19** Una diferencia de cero muestra un aviso explicativo y no puede confirmarse.

**FR-CAJA-20** La misma regla motivo/signo se impone en la frontera de dominio, con independencia del filtrado de la interfaz, y una combinación contradictoria se rechaza.

**FR-CAJA-21** Confirmar fija el saldo de la moneda seleccionada exactamente en el importe contado y registra exactamente un movimiento **Ajuste de efectivo** con el importe de la diferencia, el saldo antes y después, el motivo, las observaciones y la instantánea de la Jornada. La dirección sigue al signo. No se tocan otras monedas, ni movimientos históricos, ni el `openedAt` de la Jornada ni su estado — la Jornada sigue abierta.

### 8.6 Arqueo y cierre

**FR-CAJA-22** Requiere Jornada abierta. Tres pasos: conteo → revisión → resultado.

**FR-CAJA-23** El conteo cubre **todas** las monedas habilitadas; un envío que omita alguna, o que traiga un conteo negativo o no finito, se rechaza como arqueo inválido.

**FR-CAJA-24** Toda moneda cuya diferencia sea distinta de cero exige un motivo compatible con su signo **[R8]**; el motivo "Otro" exige además observaciones.

**FR-CAJA-25** Confirmar cierra la Jornada y debe:
1. Fijar el saldo de cada moneda en su importe contado.
2. Registrar un movimiento **Ajuste de cierre** por cada diferencia distinta de cero, cada uno con esperado, contado, diferencia, motivo, observaciones y una instantánea de Jornada marcada como `CLOSED`.
3. Persistir la Jornada como `CLOSED` con `closedAt` y una auditoría de cierre que resume monedas auditadas, cuadradas y con diferencias.

**FR-CAJA-26** Una vez cerrada, las capacidades de caja condicionadas a Jornada abierta vuelven a quedar no disponibles, y Registrar fondeo inicial vuelve a estar disponible.

### 8.7 Detalle de movimiento interno

**FR-CAJA-27** `/worker/caja/movimientos/{id}` representa el registro de auditoría de un movimiento **interno** únicamente. Muestra la identidad del movimiento, su concepto, sus importes (antes, movimiento, después), su instantánea de Jornada —incluida una Jornada ya cerrada— y, en los ajustes, el motivo y las observaciones.

**FR-CAJA-28** Un identificador de movimiento desconocido representa un estado de "no encontrado" con una vía de regreso a Caja.

**FR-CAJA-29** La pantalla admite impresión mediante el mecanismo estándar y no ofrece ninguna acción de modificación.

---

## 9. Operaciones (historial)

### 9.1 Listado

**FR-OPS-1** Lista las operaciones de la caja, de la más reciente a la más antigua, con código, fecha y hora, cliente, servicio, importe y estado, más una acción "Ver detalle" por fila.

**FR-OPS-2** La búsqueda por texto libre coincide con **código, nombre del cliente, número de documento del cliente y servicio**, sin distinguir mayúsculas ni acentos.

**FR-OPS-3** Filtros: **Servicio**, **Estado** y **Fecha** (Todos · Hoy · Últimos 7 días · Últimos 30 días · **Personalizado**).

**FR-OPS-4** "Personalizado" revela **Desde** / **Hasta**. Cualquiera de las dos mitades puede usarse sola; el rango es inclusivo en ambos extremos, de modo que una operación registrada a última hora de la fecha *Hasta* sigue coincidiendo. Un **Desde** posterior a **Hasta** muestra un mensaje de validación y no aplica filtro de rango, en lugar de devolver cero resultados en silencio. Salir de "Personalizado" oculta los campos.

**FR-OPS-5** "Limpiar filtros" restaura el listado sin filtrar, devuelve Fecha a Todos y limpia Desde/Hasta; está deshabilitado cuando no hay ningún filtro activo.

**FR-OPS-6** Cuando nada coincide, se muestra un estado vacío con una vía de regreso.

**FR-OPS-7** La paginación es de 20 filas por página, con un indicador "Mostrando X–Y de N operaciones" y una ventana numerada de páginas. Cambiar cualquier filtro o el rango personalizado devuelve a la página 1.

**FR-OPS-8** Los estados son exactamente: **Completada**, **En proceso**, **Rechazada**, **Fallida**, **Cancelada**. *Rechazada* (decisión de negocio o autorización) y *Fallida* (fallo técnico) nunca son intercambiables, y siempre se distinguen por su texto.

### 9.2 Detalle — resolución

**FR-OPD-1** La pantalla de detalle resuelve una vista especializada según el contenido del propio registro:

| Registro | Vista |
| --- | --- |
| `amount.kind = exchange` | Detalle de Cambio de moneda |
| Servicio `Remesa` con instantánea de remesa | Detalle de Remesa |
| Servicio `Giros` con `transferAction: "send"` | Detalle **Giro enviado** |
| Servicio `Giros` con `transferAction: "payout"` | Detalle **Giro cobrado** |
| Cualquier otro caso | Detalle genérico, que muestra solo lo que el registro contiene |

**FR-OPD-2** Todo detalle se representa **exclusivamente a partir del registro almacenado**. Ninguna pantalla de detalle puede invocar a un proveedor ni volver a derivar cifras de saldos vivos **[R9]**.

**FR-OPD-3** Ninguna pantalla de detalle ofrece acciones de modificación: ni completar, ni cancelar, ni editar, ni reintentar.

**FR-OPD-4** Todo detalle incluye la franja de comprobante y la nota de confidencialidad.

### 9.3 Detalle — Giro (ambas variantes)

**FR-OPD-5** La cabecera muestra "Detalle de operación", la insignia de acción local (**Giro enviado** / **Giro cobrado**), la insignia de estado de la operación y el código de operación.

**FR-OPD-6** Tarjeta de contraparte: **Remitente** en un envío (nombre, documento, fecha de nacimiento, teléfono, nacionalidad); **Beneficiario** en un cobro (nombre, documento de identidad, teléfono, Provincia / Municipio). Solo se muestran los campos que el registro realmente contiene.

**FR-OPD-7** La tarjeta **Operación** muestra el código de operación, el servicio, el **Tipo de operación** (`Envío` / `Cobro` — la etiqueta en español del discriminador almacenado, nunca el valor en bruto), la fecha y hora, el trabajador y la Caja.

**FR-OPD-8** La tarjeta **Giro** muestra el código del giro, la referencia cuando existe, el método de entrega (**Recogida**), el importe etiquetado como *Importe enviado* o *Importe entregado*, la moneda con su bandera y el estado como insignia en español. A su lado: los datos del beneficiario en un envío, o un resumen del cobro en un cobro.

**FR-OPD-9** La tarjeta **Movimiento de efectivo** muestra Saldo anterior → el movimiento (*Entrada — Giro* positivo en un envío, *Salida — Giro* negativo en un cobro) → Saldo resultante, más el tipo de movimiento, la moneda y el código de operación vinculado — todo ello desde la instantánea histórica **[R9]**.

**FR-OPD-10** Los estados en bruto del proveedor, los métodos de entrega en bruto y el discriminador interno de envío/cobro nunca deben aparecer en pantalla **[R10]**.

### 9.4 Detalle — otras vistas especializadas

**FR-OPD-11** El detalle de Cambio de moneda muestra ambos tramos del cambio, la tasa aplicada y la instantánea de caja capturada en su momento.

**FR-OPD-12** El detalle de Remesa muestra el beneficiario, la procedencia de la operación, la remesa (código, referencia, método de entrega, importe, moneda, estado como etiqueta en español) y el movimiento de efectivo.

---

## 10. Comportamiento de la integración externa

**FR-EXT-1** Los servicios externos se alcanzan a través de fronteras de proveedor con la forma de la API documentada: búsqueda por código (`GET /api/services/code/{code}`), completado (`PUT /api/services/{id}/complete`) y creación de transferencia.

**FR-EXT-2** Los resultados del completado deben distinguirse como **éxito**, **no encontrado (404)**, **conflicto (409)** y **fallo**, y mapearse a los mensajes especificados en FR-RM-7 y FR-GC-13.

**FR-EXT-3** El endpoint de búsqueda puede recurrir a coincidir con una `reference`. La frontera **debe verificar que el `code` del registro devuelto sea igual al código introducido** y rechazar una coincidencia solo por referencia, presentándola como el mismo "no encontrado" genérico **[R4]**.

**FR-EXT-4** La frontera debe rechazar también un registro cuyo tipo de servicio no corresponda al flujo que realiza la búsqueda, igualmente como "no encontrado" genérico.

**FR-EXT-5** Los enums en bruto cruzan la frontera sin cambios — estados (`COMPLETED`, `IN_TRANSIT`, `READY`, `PENDING_PAYMENT`, `PAYED`, `DENIED_PAYMENT`, `PAYOUT_DENIED`) y métodos de entrega (`delivery`, `transfer`, `pickup`). Provincia y municipio cruzan como **códigos**; las etiquetas se resuelven para mostrarlas y se almacenan junto a los códigos en las instantáneas históricas.

**FR-EXT-6** Hoy Giros solo usa `pickup`; el tipo se mantiene completo para que un futuro método de entrega no exija cambiar la frontera.

**FR-EXT-7** Ninguna pantalla de Operaciones puede invocar a un proveedor **[R9]**.

> Comportamiento actual: las fronteras son simulaciones deterministas alcanzables mediante valores de campo ordinarios. No se expone ningún selector de escenarios en la interfaz, y no hay credenciales ni tokens en ninguna fixture del navegador.

---

## 11. Comportamiento ante errores

**FR-ERR-1** Los problemas de campo se adjuntan a su propio campo. Los problemas de operación se representan como alerta a nivel de formulario o de pantalla.
**FR-ERR-2** Una alerta de error declara la causa y, cuando existe, la siguiente acción.
**FR-ERR-3** Una confirmación fallida deja al Worker en la pantalla de confirmación con sus datos intactos, nunca en una pantalla de éxito.
**FR-ERR-4** Los mensajes antidescubrimiento son la excepción deliberada a FR-ERR-2: no deben revelar la causa **[R4]**.
**FR-ERR-5** Los estados bloqueados (sin Jornada abierta) son explicativos y ofrecen la vía correctiva, en lugar de deshabilitar controles sin explicación.
**FR-ERR-6** Un registro inexistente es un estado propio de la aplicación, no un error del framework (FR-NAV-2, FR-CAJA-28).

---

## 12. Comportamiento histórico

**FR-HIST-1** Los registros de operación almacenan el cliente, la tasa aplicada, el estado externo y el antes/después de la caja tal como se capturaron en el momento del registro.
**FR-HIST-2** Los valores geográficos se almacenan **tanto** como código de catálogo **como** etiqueta resuelta en su momento, de modo que un reetiquetado posterior del catálogo no pueda volver ambiguo un registro antiguo.
**FR-HIST-3** El estado externo de un registro nunca se actualiza, ni siquiera cuando el mismo elemento externo ha cambiado de estado por otra operación.
**FR-HIST-4** Todo movimiento de caja —interno o comercial— almacena la Jornada a la que pertenece, incluida una que ya se haya cerrado.
**FR-HIST-5** Nada en la aplicación Worker edita ni elimina un registro histórico.

---

## 13. Dependencias funcionales

| Capacidad | Depende de |
| --- | --- |
| Cambio de moneda | Jornada abierta; monedas de origen y destino habilitadas en esta Caja; saldo suficiente en la moneda de destino |
| Remesas, Enviar giro, Cobrar giro | Jornada abierta; moneda habilitada en esta Caja; proveedor accesible |
| Cobrar remesa / Cobrar giro | Saldo suficiente en la moneda de pago |
| Ajustar efectivo, Arqueo y cierre | Jornada abierta |
| Registrar fondeo inicial | **Ninguna** Jornada abierta |
| Detalle de operación (todas las variantes) | Únicamente un registro almacenado existente |
| Movimientos comerciales del libro | Operación `Completada` registrada dentro de una Jornada abierta |
| Cobro de un giro | Nada de la operación de envío que lo originó — un giro se alcanza solo por su código |
| Buscar solicitud | Nada — la búsqueda no exige Jornada; el flujo de destino exige la suya propia al continuar |
| Cualquier pantalla del shell | Un segundo factor verificado — un reto abierto no da acceso a ninguna **[R13]** |
| Inicio de sesión | Un equipo vinculado a una caja (FR-DEV-1), de la sede del trabajador (FR-AUTH-8) |

---

## 14. Comportamiento relevante para aceptación

**FR-ACC-1** Los comportamientos anteriores están cubiertos por una batería automatizada de Playwright (454 pruebas al momento de redactar este documento) que abarca: inicio de sesión, inicio, catálogo, los tres servicios, Buscar solicitud, todos los flujos de Caja, el detalle de movimiento, el listado de operaciones y todas las variantes de detalle, más pruebas a nivel de dominio que ejercitan directamente el orden de registro y la aritmética de efectivo.

**FR-ACC-2** Comportamientos críticos para la aceptación — una regresión aquí es un defecto, no una preferencia:
1. Ningún registro local sin éxito externo (FR-RM-7, FR-GC-13).
2. Exactamente un movimiento comercial por cada tramo de efectivo de una operación completada —uno en remesas y giros, dos en Cambio de moneda—, con la dirección y la aritmética correctas y asociado a la Jornada (FR-CM-18, FR-RM-8, FR-GE-12, FR-GC-14).
3. Rechazo indistinguible de código inexistente / coincidencia solo por referencia / tipo de servicio incorrecto (FR-RM-3, FR-GC-5).
4. Un giro `COMPLETED` no puede pagarse dos veces (FR-GC-17).
5. Coherencia motivo/signo en ambos flujos de ajuste (FR-CAJA-18, FR-CAJA-20, FR-CAJA-24).
6. El fondeo inicial sustituye los saldos en lugar de sumarlos (FR-CAJA-9).
7. Los detalles se representan desde la instantánea almacenada y nunca invocan a un proveedor (FR-OPD-2, FR-HIST-3).
8. Ningún enum en bruto ni discriminador interno visible en ningún lugar (FR-OPD-10, FR-EXT-5).
9. Sin desplazamiento horizontal a 1440px ni a 1280px (FR-SHELL-5).
10. Ninguna operación sin Jornada abierta, sin excepción; ningún movimiento de caja sin Jornada asociada (FR-CM-16, FR-CM-19, FR-RM-1, FR-GE-1, FR-GC-1).
11. Ninguna sesión sin segundo factor verificado: unas credenciales correctas no alcanzan ninguna pantalla del shell, y el código nunca llega al cliente (FR-2FA-1, FR-2FA-3, FR-2FA-8).
12. Ningún inicio de sesión en un equipo sin vincular ni en la caja de otra sede; desvincular el equipo termina la sesión del trabajador en él sin cerrar la Jornada (FR-DEV-1, FR-DEV-7, FR-AUTH-8).

---

## 15. Condiciones conocidas de la implementación

**FR-IMP-1** Esta línea base funciona contra módulos de dominio simulados en memoria, sin backend ni persistencia: los saldos, los movimientos, el estado de la Jornada y las operaciones recién completadas viven en la memoria del navegador durante la sesión. En consecuencia, todo flujo, prueba o demostración que dependa de un estado creado antes en la misma sesión debe navegar mediante enlaces; una carga completa de página restaura el estado inicial precargado.

**FR-IMP-2** Los filtros de fecha relativos se comparan contra el ancla temporal fija de los datos precargados, y no contra el reloj real, de modo que el filtrado se mantiene coherente con independencia del tiempo real transcurrido.

**FR-IMP-4** El reto de verificación vive **en memoria del cliente**, como el resto de los dominios simulados. De ahí que una recarga lo pierda — FR-2FA-13 no es una decisión de producto sino el comportamiento honesto de esta simulación, y con backend real será una sesión de reto de servidor que sí sobrevive a la recarga. **El requisito que debe conservarse es que se diga qué pasó, no que la recarga anule la verificación.**

**FR-IMP-5** La sesión del equipo vive en `localStorage` y la administra un simulador (FR-DEV-9). A diferencia del resto de los dominios simulados, **sí sobrevive a la recarga**, porque ese es precisamente el comportamiento que el producto exige del vínculo (FR-DEV-4). Los datos operativos son de una única caja simulada, Caja 03; por eso el simulador solo permite vincular el equipo a esa caja.

**FR-IMP-3** Los datos de demostración precargados incluyen ambas variantes del detalle de giro (un envío y un cobro, que comparten un mismo código externo de giro), de modo que ambos detalles especializados pueden revisarse sin ejecutar un flujo.

---

## 16. No especificado por este documento

Para todo lo siguiente **no existe requisito funcional alguno y ninguno puede inferirse** — ni de una entrada del catálogo, ni de una pantalla marcador de posición, ni de una ruta existente, ni de un campo sin uso en un contrato de integración:

- Los diez servicios del catálogo marcados como no disponibles.
- Las pantallas Perfil, Tasas y Alertas, y la recuperación de acceso.
- El historial de Jornadas anteriores.
- Permisos, roles y aprobación de supervisor.
- Cierre de sesión, vigencia de sesión y sesión concurrente en dos equipos. El **acceso** sí está especificado por completo, en §2.
- El alta y el cambio del correo del trabajador: ocurren al crear o editar el trabajador, capacidad del Admin de sede (regla A4).
- Segundos factores alternativos (TOTP, llave física) y códigos de respaldo: descartados en §2.2, no diseñados.
- El desbloqueo de una cuenta por el Admin de sede: §2 remite a él, pero la capacidad se especifica en el FRD de Admin de sede.
- Reportes, analítica y exportaciones.
- Las aplicaciones Branch Admin y Super Admin.

El kiosco de autoservicio y su pantalla de señalización **sí** tienen requisito funcional propio, en documentos independientes: `PuntoCash_Kiosk_Autoservicio_Functional_Requirements_v1.md` y `PuntoCash_Kiosk_Pantalla_Functional_Requirements_v1.md`. Este FRD solo especifica, dentro de su propio alcance, la puerta de entrada que Worker les ofrece (§7.4 Buscar solicitud).

La ausencia de implementación significa que la capacidad aún no ha sido definida funcionalmente: debe diseñarse y aprobarse antes de poder especificarse o construirse.

---

## Apéndice A · Terminología

Se usa de forma consistente en este FRD, en el PRD y en el código. Los términos de dominio en español son el lenguaje del producto y no se traducen.

| Término | Significado |
| --- | --- |
| **Worker / Trabajador** | Empleado de sucursal que opera la caja del equipo en que inicia sesión, dentro de su sede. |
| **Equipo de caja** | El ordenador de un puesto de mostrador, vinculado por el administrador de la sede a una sede y a una de sus cajas. Recuerda el vínculo; el trabajador inicia sesión sobre él. |
| **Vinculación** | Acto con el que el administrador de una sede ata un equipo a esa sede (y, si es de caja, a una de sus cajas), escaneando el QR o escribiendo el código de seis cifras que el equipo muestra. |
| **Caja** | La caja registradora y sus saldos por moneda. |
| **Jornada** | La sesión de trabajo de una Caja, abierta con fondos declarados y cerrada por conciliación. |
| **Operación** | Un acto comercial de servicio completado, con código permanente. |
| **Movimiento de caja** | Una línea del libro de la caja: comercial (ligada a una operación) o interna. |
| **Cliente** | La persona atendida en una operación, tal como quedó registrada en ella. |
| **Remitente** | Quien envía un giro — el Cliente de una operación *Enviar giro*. |
| **Beneficiario** | Quien recibe una remesa o un giro — el Cliente de una operación de cobro. |
| **Remesa** | Remesa entrante creada fuera de PuntoCash, pagada a su beneficiario. |
| **Giro** | Transferencia interprovincial dentro de Cuba, con dos operaciones de mostrador: **Enviar giro** y **Cobrar giro**. |
| **Cambio de moneda** | Cambio entre dos monedas soportadas. |
| **Comprobante** | El recibo impreso de una operación o del resumen de caja. |
| **Arqueo y cierre** | Conteo físico y conciliación que cierra la Jornada. |
| **Fondeo inicial** | El efectivo de apertura declarado que inicia una Jornada. |
| **Ajuste de efectivo** | Corrección declarada del saldo de una moneda tras un conteo físico. |
| **Reto de verificación** | Un acceso a medio hacer: nace con unas credenciales correctas y muere al verificarse, agotarse o abandonarse. No es una sesión. |
