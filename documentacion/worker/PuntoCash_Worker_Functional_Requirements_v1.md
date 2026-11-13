# PuntoCash — Aplicación Worker
## Documento de Requisitos Funcionales (FRD) · v2.0

**Alcance:** la aplicación del trabajador de caja, `/worker`. No cubre el kiosco de autoservicio ni las consolas de administración.

**Destinatarios:** desarrollo backend y frontend, y QA. Es la especificación contra la que se implementa y se acepta.

**Documentos relacionados:**

| Documento | Qué define |
| --- | --- |
| `PuntoCash_Worker_PRD_v1.md` | El producto y las reglas **R1–R12**, citadas aquí como **[R#]** |
| `../PuntoCash_PRD_v2.md` | La regla **R13** (segundo factor) y los requisitos **RP-*** del producto completo |
| `../admin/PuntoCash_Admin_Sede_Functional_Requirements_v1.md` | Lo que la administración de sede ve y decide de lo que hace Worker: jornadas, aprobaciones, cajas, alertas, tasas, monedas (**FR-AD-***) |
| `../admin/PuntoCash_Super_Admin_Functional_Requirements_v1.md` | Lo que fija PuntoCash para toda la red: servicios por sede, catálogo de monedas y de denominaciones, rangos de tasas (**FR-SA-***) |
| `../kiosko/…` | El kiosco de autoservicio, del que Worker recoge solicitudes (§5.3) |

## Cómo leer este documento

- Cada requisito tiene un código `FR-<área>-<n>`. «Debe» indica comportamiento obligatorio.
- El documento fija las **reglas**: qué datos muestra cada pantalla, qué se permite, qué se rechaza y con qué código, qué se registra y qué ve después la administración.
- Los **textos, avisos y la disposición** de cada pantalla están en la **demostración**, que es la referencia de diseño. Las cuentas y los puestos de la demostración están en el **Apéndice B**.
- Cada **«Ver en la demo»** dice qué hacer para ver ese caso. Contraseña `puntocash`, código de verificación `123456`.
- Cada rechazo del servidor tiene un **código** (`recuento-necesario`). El mensaje que ve el trabajador está en el **Apéndice C**.
- **El servidor revalida toda regla al confirmar**, aunque la pantalla ya la haya comprobado: las condiciones pueden cambiar con la pantalla abierta **[R3]**.
- **Worker opera a ciegas** (§1.6): ningún requisito de este documento puede leerse como permiso para mostrar al trabajador cuánto efectivo tiene su caja.

## Versiones

| Versión | Fecha | Cambio |
| --- | --- | --- |
| 2.0 | 13/11/2026 | **Segunda iteración de Worker. Documento reescrito** en el formato de los FRD de administración (una subsección por pantalla, reglas y códigos, «Ver en la demo», mensajes en el Apéndice C). Lo que cambia de fondo: (1) **Worker opera sobre la red** — la caja, la jornada, las tasas, los servicios y las monedas son los de la sede, y lo que hace el trabajador lo ve la administración al momento (§3). (2) **Worker opera a ciegas**: no ve ningún saldo, ni en pantalla ni en los datos que recibe (§1.6). (3) **La caja lleva billetes**: cada movimiento registra cuántos de cada denominación (§10). (4) **Apertura con totales y cierre a ciegas, billete a billete**, declarados una vez; el cierre es un solo acto y los motivos llegan después (§10.3, §10.6). (5) **Reposición o retiro** y **cambio de billetes**, confirmados por el supervisor nombrado; **recuento** cuando saldrían billetes que los libros no tienen (§10.4, §10.5, §10.7). (6) **Operaciones con billetes**: paso «Efectivo», vuelto, «exacta o no se paga», liquidación (§6). (7) **Cambio de moneda** entre dos divisas y en modo «Recibir un importe» (§7). (8) **Cierre forzado** avisado al trabajador al instante (§11). (9) **Alertas** de la caja, sin cifras (§12). (10) **Perfil** con nombre de usuario, teléfono y contraseña (§13). (11) **Tablas** con una sola regla para abrir filas (§1.4). Salen «Ajustar efectivo», las pantallas Tasas y Alertas, y el simulador de vinculación. |
| 1.13 | 03/11/2026 | Toda moneda de la lista ISO lleva su bandera (FR-FMT-4) |
| 1.12 | 03/11/2026 | Tasas con hasta cuatro decimales (FR-FMT-6) |
| 1.11 | 03/11/2026 | Identificador de acceso como nombre de usuario; «Añadir moneda» ofrece la lista de la sede |
| 1.10 | 26/10/2026 | El saldo de una caja nunca es negativo (FR-CAJA-30) |
| 1.9 | 26/10/2026 | Cómo se escribe una tasa (FR-FMT-6) |
| 1.8 | 13/10/2026 | «Cuenta bloqueada» es trabajador desactivado (FR-AUTH-9) |
| 1.7 | 13/10/2026 | Recuperación de contraseña (§2.13) |
| 1.5–1.6 | 23–28/09/2026 | Vinculación del equipo de caja |
| 1.3–1.4 | 22/09/2026 | Segundo factor e integración del acceso |
| 1.2 | 21/09/2026 | Buscar solicitud del kiosco |

**Requisitos retirados en la 2.0**, cuyos códigos no se reutilizan:

- **FR-CM-5** (panel «Validación de caja»), **FR-CM-16** a **FR-CM-20** (absorbidos en **FR-CTX-6**, **FR-CM-12** y **FR-CM-13**). **FR-CAJA-1** a **FR-CAJA-29** de la 1.13 (saldos, «Ajustar efectivo» y el arqueo antiguo), salvo **FR-CAJA-13** y **FR-CAJA-14** (añadir moneda): la caja se especifica de nuevo en §10 con códigos **FR-CAJA-31** en adelante. **FR-CAJA-30** (saldo nunca negativo) se conserva.
- **FR-HOME-1** a **FR-HOME-4**: Inicio se especifica de nuevo con **FR-HOME-5** en adelante.
- **FR-DEV-9** (simulador `/kiosk/simulador-admin`): la vinculación la hace la consola de administración (**FR-AD-EQ-7**).
- **FR-RM-6**, **FR-GC-9** en su fila de saldo, y todo texto que mostraba «Disponible»: la suficiencia de efectivo la decide el servidor (§6.6).
- Las rutas `/worker/caja/ajustar-efectivo`, `/worker/tasas` y `/worker/alertas`.

---

## 1. Comportamiento global

### 1.1 Shell

**FR-SHELL-1 · Estructura.** Toda pantalla con sesión se representa dentro de un único shell:

| Parte | Contenido |
| --- | --- |
| Cabecera fija | Marca PuntoCash; nombre del trabajador y «Trabajador»; **la caja de este equipo con su sede debajo** (FR-DEV-5); avatar con sus iniciales, que abre el Perfil (§13); «Cerrar sesión» |
| Menú lateral fijo | Cuatro destinos: **Inicio**, **Nueva operación**, **Operaciones**, **Caja** |

- El destino activo se marca como actual para tecnologías de asistencia, no solo con color.
- Fuera del shell solo están la vinculación del equipo, el inicio de sesión, la verificación y la recuperación de contraseña.
- La región de contenido es la única que se desplaza. Ninguna pantalla produce desplazamiento horizontal a 1280px ni a 1440px.

**FR-SHELL-2 · Escritorio.** Worker es una aplicación de **escritorio** para el equipo de una caja: ancho mínimo de diseño 1280px. No se diseña ni se prueba en teléfono.

**FR-SHELL-3 · Avisos globales.** Encima del contenido de cualquier pantalla pueden aparecer, por este orden:

| Aviso | Cuándo | Requisito |
| --- | --- | --- |
| Cierre forzado de su jornada | Diálogo que tapa la pantalla hasta pulsar «Entendido» | §11 |
| Aviso de caja | Sede sin operar, jornada de otro trabajador, jornada abierta en otra caja, jornada anterior cerrada sin contar | **FR-CTX-3** |
| Alertas de la caja | La caja tiene alertas encendidas (solo en Inicio y Caja) | §12 |

### 1.2 Rutas

**FR-NAV-1 · Inventario.**

| Ruta | Pantalla | Requisito |
| --- | --- | --- |
| `/worker/login`, `/worker/verificacion`, `/worker/recuperar-acceso` | Acceso | §2 |
| `/worker/inicio` | Inicio | §4 |
| `/worker/nueva-operacion` | Catálogo de servicios | §5 |
| `/worker/nueva-operacion/solicitud` | Buscar una solicitud del kiosco | §5.3 |
| `/worker/nueva-operacion/cambio-moneda` | Cambio de moneda | §7 |
| `/worker/nueva-operacion/remesas` | Cobrar remesa | §8 |
| `/worker/nueva-operacion/giros`, `/enviar`, `/cobrar` | Giros | §9 |
| `/worker/nueva-operacion/{servicio}` | Servicio en construcción | §5.2 |
| `/worker/operaciones`, `/worker/operaciones/{codigo}` | Historial y detalle de operaciones | §14 |
| `/worker/caja` | Caja | §10.1 |
| `/worker/caja/fondeo-inicial` | Abrir jornada | §10.3 |
| `/worker/caja/fondos` | Reposición o retiro | §10.4 |
| `/worker/caja/cambio-de-billetes` | Cambio de billetes | §10.5 |
| `/worker/caja/arqueo-cierre` | Arqueo y cierre | §10.6 |
| `/worker/caja/anadir-moneda` | Añadir moneda | §10.8 |
| `/worker/caja/movimientos/{id}` | Detalle de un movimiento interno | §10.9 |
| `/worker/perfil`, `/worker/perfil/editar`, `/worker/perfil/contrasena` | Perfil | §13 |

**FR-NAV-2 · Inexistente.** Una ruta inexistente de `/worker`, el servicio de un catálogo que la sede no tiene habilitado (**FR-CAT-6**) y un movimiento que no es de esta caja responden **404**. Un código de operación desconocido muestra «Operación no encontrada» con vuelta al listado.

**FR-NAV-3 · Vuelta.** Toda pantalla a la que se llega desde el catálogo o desde Caja ofrece una vuelta explícita a su origen.

### 1.3 Formatos

**FR-FMT-1** Importes `1.250,00 USD`: agrupación es-ES, dos decimales, código como sufijo. Con signo, `+` explícito o `−` (U+2212).

**FR-FMT-2** Fechas y horas **en hora de Cuba**, `dd/MM/yyyy · HH:mm`.

**FR-FMT-3** Códigos de operación `PC-AAMMDD-NNNNNN`, con el día **en hora de Cuba** y un contador que empieza en cada día. Movimientos de caja `CM-AAMMDD-NNNNNN`.

**FR-FMT-4** Cada moneda lleva su bandera SVG decorativa junto al código, nunca un emoji, oculta a tecnologías de asistencia. Toda moneda de la lista ISO 4217 trae la suya; las que no tienen bandera común llevan una neutra.

**FR-FMT-5** Importes, códigos, documentos y teléfonos con cifras tabulares y sin partirse.

**FR-FMT-6** La tasa se escribe como la cotiza la sede, la divisa contra el peso: `1 USD = 326,00 CUP`, con mínimo dos y máximo cuatro decimales, sin ceros de más.

**FR-FMT-7** Una denominación se escribe con su valor, sin decimales si es entera: «100 USD», «0,25 USD». En tablas de billetes: denominación, cantidad y subtotal.

### 1.4 Tablas y botones

**FR-TAB-1 · Abrir una fila.** Si la fila tiene detalle, se abre **tocando la fila entera**; al final lleva un `›` que es el enlace real, para teclado y para abrir en otra pestaña. No hay «Ver detalle» ni nombre subrayado. Los enlaces a otra cosa dentro de una celda se mantienen.

**FR-TAB-2 · Acciones.** Una lista sirve para encontrar y abrir; las acciones van en el detalle. Si no hay detalle y sí acciones, van en un menú «⋯» al final de la fila.

**FR-TAB-3 · Filas planas.** Las tasas de Inicio y las tablas de billetes no se abren.

**FR-TAB-4 · Botones.** Los grupos de botones van uno al lado del otro; si no caben, cada uno ocupa todo el ancho. Un texto que no cabe pasa a dos líneas dentro del botón.

### 1.5 Accesibilidad

**FR-A11Y-1** Todo control se resuelve desde su etiqueta visible; requerido, inválido y descrito-por se exponen programáticamente.

**FR-A11Y-2** Ningún estado se comunica solo con color: una insignia lleva siempre texto.

**FR-A11Y-3** Controles de al menos 44px de alto, operables por teclado y con foco visible.

### 1.6 Worker opera a ciegas

**FR-CIEGO-1 · Regla.** El trabajador **nunca sabe cuánto efectivo tiene su caja**. Si pudiera verlo, podría copiarlo en el cierre y el cierre a ciegas (§10.6) no comprobaría nada.

**FR-CIEGO-2 · Lo que sí ve.**

| Dato | Dónde |
| --- | --- |
| Qué monedas tiene su caja, sin importes | Caja, Inicio |
| Qué denominaciones tiene cada moneda (el catálogo), sin cantidades | Formularios de conteo y de billetes |
| El libro de movimientos con el importe y los billetes de cada uno, sin saldo | Caja → Movimientos |
| Los importes de cada operación | Flujos de operación, detalle, comprobante |
| Lo que recibió al abrir (los totales que declaró quien cerró) y lo que él mismo cuenta | Abrir jornada, Arqueo y cierre |
| Sus diferencias, **después** de declarar su conteo | Abrir jornada, Arqueo y cierre, recuento |
| Las alertas de su caja, como estado y sin cifras | §12 |

**FR-CIEGO-3 · Lo que no ve en ninguna pantalla.** Saldo de una moneda; «saldo después» de un movimiento; saldo anterior y resultante en un detalle o comprobante; lo esperado por los libros, ni antes ni después de cerrar; cuánto efectivo «disponible» hay para una operación; cuántos billetes de una denominación hay; los límites de una alerta.

**FR-CIEGO-4 · Tampoco en los datos.** El servidor **no envía a Worker ningún saldo**: ni en la información de la caja, ni en los movimientos, ni en las operaciones, ni en las respuestas de sus acciones. No debe poder leerse con las herramientas del navegador.

**FR-CIEGO-5 · Lo que se acepta que sepa.**

- Que existen los billetes concretos que una propuesta le ofrece entregar (§6.3).
- Que una caja no puede pagar una operación concreta, cuando el servidor lo dice al confirmar.
- Que, sumando a mano lo recibido y todas las operaciones del día, podría reconstruir el saldo: cuesta y es fácil equivocarse.

**Ver en la demo:** abrir cualquier pantalla de Worker: ninguna enseña un saldo. Comparar con la ficha de la misma caja en Admin, que sí lo enseña (**FR-AD-CAJA-15**).

### 1.7 Comprobante

**FR-PRINT-1** Una operación tiene comprobante imprimible desde su resultado y desde su detalle; incluye la **liquidación** (§6.7) cuando la hay. No lleva identificadores internos ni metadatos del proveedor **[R10]**, ni saldos (§1.6).

**FR-PRINT-2** Caja ofrece «Imprimir resumen»: lista las monedas de la caja y su jornada, **sin saldos**.

**FR-PRINT-3** **En la demostración no se imprime.** El diseño del comprobante para producción está pendiente; este requisito fija qué debe contener.

---

## 2. Acceso

Antes del acceso está el **equipo**: Worker solo se usa en un ordenador vinculado a una caja de una sede. Sobre ese equipo, el acceso tiene dos pasos y ninguno basta por sí solo: la contraseña identifica la cuenta y el código confirma a la persona. Mientras el segundo paso no se verifica **no existe sesión** **[R13]**.

### 2.1 Vinculación del equipo de caja

**FR-DEV-1 · Sin vincular.** Mientras el equipo no es la caja de ninguna sede, cualquier ruta de `/worker` muestra la **pantalla de vinculación**. Nadie inicia sesión en un equipo sin vincular **[RP-16]**.

**FR-DEV-2 · Pantalla de vinculación.** Fuera del shell, sin sede, caja ni trabajador. Muestra un **código QR** y un **código de seis cifras** («482 913») con su cuenta atrás, y el identificador del equipo. Dice que el administrador lo vincula desde **Equipos → Vincular un equipo** de su consola. Se renueva sola al caducar.

**FR-DEV-3 · Quién vincula.** El **administrador de la sede**, eligiendo la sede, la caja y, si quiere, el rótulo del equipo (**FR-AD-EQ-7**, **FR-AD-EQ-30**). Una caja tiene a lo sumo un equipo.

**FR-DEV-4 · Al vincularse.** Sin que nadie toque el equipo, deja la pantalla de vinculación y muestra el inicio de sesión. El vínculo **lo recuerda el equipo** y sobrevive a recargas, cierres de sesión, cambios de trabajador y fin de jornada. Cerrar sesión devuelve al inicio de sesión, nunca a la vinculación.

**FR-DEV-5 · La caja es del equipo.** Quien inicia sesión en ese equipo opera esa caja. Toda jornada, operación y movimiento producido en él queda contra esa caja **[R12]**.

**FR-DEV-6 · Desvincular.** El administrador puede desvincular el equipo desde su consola. Desde la siguiente petición el equipo vuelve a la pantalla de vinculación y la sesión del trabajador termina. Lo que no se confirmó se descarta; lo confirmado se conserva. **Desvincular no cierra la jornada**, que es de la caja.

**FR-DEV-7 · Credencial.** La identidad del equipo la emite el servidor al vincular y la revoca al desvincular; viaja en una cookie `httpOnly` que el navegador no puede leer ni escribir. Toda petición de Worker lleva la del equipo y la del trabajador; la sesión del trabajador solo vale en el equipo en el que se abrió. Que el equipo esté vinculado **no** es un «equipo de confianza» para el segundo factor **[R13]**.

**Ver en la demo:** en un navegador sin vincular, abrir `/worker`. Para no tener que vincular, la pantalla ofrece **«Demostración · usar un equipo ya vinculado»**, con los equipos de caja que ya tiene la red. Para vincular de verdad: en otra pestaña, entrar en Admin como `marta@malecon-sf.cu` → Equipos → Vincular un equipo, y escribir el código. El QR de la demostración es ilustrativo.

### 2.2 Credenciales

**FR-AUTH-1 · Identificador.** Se entra con el **nombre de usuario** o con el **correo**. El nombre de usuario tiene de 3 a 30 caracteres —letras, números, punto, guion o guion bajo—, **sin «@»**, y es único entre los trabajadores sin distinguir mayúsculas. El correo también es único entre los trabajadores. El trabajador puede cambiar su nombre de usuario desde su Perfil (§13).

**FR-AUTH-2 · Validación.** Los dos campos se validan antes de enviar; cada ausente con su mensaje y el foco en el primero.

**FR-AUTH-3 · Resultados.**

| Resultado | Comportamiento |
| --- | --- |
| Credenciales correctas | **No abre sesión** [R13]: emite un código al correo de la cuenta, bloquea el formulario y lleva a `/worker/verificacion` |
| Credenciales inválidas | Error de formulario; sigue habilitado; foco al identificador |
| Trabajador de **otra sede** que la de la caja (FR-AUTH-8) | Error de formulario; **no se emite código** |
| **Trabajador desactivado** (FR-AUTH-9) | Error de formulario; el formulario queda bloqueado |
| **Sede sin operar** y este equipo no tiene una jornada suya que cerrar (FR-AUTH-10) | Error de formulario; **no se emite código**; el formulario queda bloqueado |
| Error de red | Error de formulario; sigue habilitado |

**FR-AUTH-4** Durante el envío el formulario se deshabilita; un segundo envío no produce un segundo reto.

**FR-AUTH-5** Los mensajes de fallo no llevan acción de reintento propia; el botón de envío es la única acción primaria.

**FR-AUTH-6** Enlace «¿Olvidaste tu contraseña?» → `/worker/recuperar-acceso` (§2.13).

**FR-AUTH-7** Ningún desenlace de fallo emite código.

**FR-AUTH-8 · Otra sede.** Solo abren reto los trabajadores de la **sede de la caja** de este equipo. El mensaje no nombra la sede de la caja ni la del trabajador.

**FR-AUTH-9 · Cuenta bloqueada.** Significa una sola cosa: **el trabajador está desactivado** (**FR-AD-TRAB-12**). No hay bloqueo por contraseñas ni por códigos fallados. Lo resuelve su administrador reactivándolo (**FR-AD-TRAB-15**).

**FR-AUTH-10 · Sede sin operar.** Con la sede suspendida o cerrada, su operador suspendido o la sede sin operador, no entra nadie de ella **salvo** el trabajador que tiene **abierta una jornada en la caja de este equipo**, para poder cerrarla (**FR-CTX-4**).

**FR-AUTH-11 · La contraseña es de la cuenta.** Se guarda contra la cuenta, no contra lo que se teclea: la fijada al recuperar o al cambiarla en el Perfil vale igual entrando por el nombre de usuario que por el correo, y cambiar el nombre de usuario no la pierde.

**FR-AUTH-12 · Sesión propia.** La sesión de Worker es independiente de la de las consolas de administración: entrar en una no cierra la otra en el mismo navegador.

**Ver en la demo:** con el equipo de la demostración de Caja 03 de PuntoCash Vedado, entrar como `jperez`. Otra sede: entrar como `mrivas` (Obispo). Desactivado: `bloqueado@puntocash.com`. Error de red: `error@puntocash.com`.

### 2.3 Decisiones del segundo factor

1. **Un solo método:** código de seis dígitos al correo registrado del trabajador. Sin aplicación de autenticación, SMS ni llave física.
2. **En cada inicio de sesión, sin excepción.** No existe «recordar este equipo»: la caja es un puesto compartido.
3. **Sin códigos de respaldo.** La salida cuando el correo no llega es el reenvío y, agotado, la asistencia del administrador de sede (**FR-AD-TRAB-10**).
4. Las consolas de administración usan el mismo flujo (**FR-AD-ACC-***).

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

**FR-2FA-4** `/worker/verificacion` se representa **fuera del shell**, como el inicio de sesión (FR-SHELL-1). No puede mostrar el nombre del trabajador, su caja, la sede ni el nombre del mercante: cuando esta pantalla se ve, la identidad todavía no está verificada, y la marca visible es siempre PuntoCash.

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

| Operación | Entrada | Resultados |
| --- | --- | --- |
| Autenticar | identificador, contraseña, credencial del equipo (FR-DEV-7) | `challenge-required` (con la vista del reto) · `invalid-credentials` · `other-branch` · `account-blocked` · `sede-sin-operar` · `network-error` |
| Verificar | reto, código | `verified` · `invalid-code` · `code-expired` · `challenge-locked` (motivo: intentos \| envíos) · `challenge-not-found` · `network-error` |
| Reenviar | reto | `sent` · `too-soon` · `challenge-locked` (motivo: envíos) · `challenge-not-found` · `network-error` |

El reto tal como lo ve el cliente: identificador opaco, correo enmascarado, longitud del código, caducidad, disponibilidad de reenvío, intentos restantes y envíos restantes. Nada más (FR-2FA-3). El correo enmascarado lo da el servidor a partir de la cuenta, nunca se deduce de lo tecleado.

### 2.12 Demostración del acceso

- **Equipo:** «Demostración · usar un equipo ya vinculado» en la pantalla de vinculación (FR-DEV-2).
- **Cuentas:** todo trabajador de la red, por nombre de usuario o correo, con `puntocash`; en el Apéndice B, cuáles corresponden a cada caja. `bloqueado@puntocash.com` → cuenta desactivada; `error@puntocash.com` → error de red; `caduca@puntocash.com` → un reto de 20 s para ver el estado caducado.
- **Verificación:** `123456` verifica; `000000` fuerza un error de red; cualquier otro descuenta un intento.
- **Recuperación:** el mismo código; `desconocido@puntocash.com` simula una cuenta inexistente. La contraseña fijada se guarda en el servidor de la demostración, contra la cuenta, y desde ese momento esa cuenta deja de aceptar `puntocash`. Se pierde al reiniciar el servidor.
- **No se envía ningún correo.** El código fijo es de la demostración; **FR-2FA-23** es requisito del backend.

### 2.13 Recuperación de contraseña

Destino de «¿Olvidaste tu contraseña?» (**FR-AUTH-6**). Es la vía para elegir contraseña **sin conocer la actual**; con sesión, el trabajador la cambia desde su Perfil (§13.3).

**FR-REC-1** `/worker/recuperar-acceso`, fuera del shell. No muestra trabajador, caja ni sede.

**FR-REC-2** Tres pasos en una sola pantalla: identificador, código y contraseña nueva. Recargar o abandonar la pantalla cancela el trámite; se dice y se ofrece empezar de nuevo.

**FR-REC-3** Paso 1: se pide nombre de usuario o correo y se envía un código al **correo registrado** de esa cuenta. Antes de enviarlo se avisa de que va a ese correo y de que, si ya no puede entrar en él, el administrador de su sede debe corregirlo (**FR-AD-TRAB-10**).

**FR-REC-4** **La respuesta es idéntica exista la cuenta o no.** Ningún mensaje, código de estado ni tiempo de respuesta distingue los dos casos.

**FR-REC-5** No se dice a dónde fue el código, ni enmascarado.

**FR-REC-6** Paso 2: el código tiene los mismos parámetros que el del acceso (**FR-2FA-2**) y el mismo campo (**FR-2FA-29** a **FR-2FA-32**).

**FR-REC-7** Desenlaces del paso 2: correcto → paso 3; incorrecto → descuenta un intento y dice cuántos quedan; caducado → se distingue y no descuenta; fallo de transporte → no descuenta; intentos o envíos agotados → el trámite muere y no se reabre.

**FR-REC-8** Reenviar emite un código nuevo, invalida el anterior y repone los intentos, no los envíos.

**FR-REC-9** Paso 3: contraseña nueva y repetición, con `autocomplete="new-password"`. Mínimo **ocho caracteres**. Deben coincidir; el rechazo señala el segundo campo.

**FR-REC-10** Guardar invalida la contraseña anterior y cierra las sesiones abiertas de esa cuenta.

**FR-REC-11** **Terminar no abre sesión** **[R13]**: devuelve al inicio de sesión.

**FR-REC-12** Backend: el código no viaja al cliente; el reto se ata a la cuenta en el servidor; las solicitudes se limitan por cuenta y por origen.

---

## 3. La caja en la red

### 3.1 Contexto de trabajo

**FR-CTX-1 · Una sola caja, una sola red.** Worker trabaja sobre la **misma caja y la misma jornada** que consultan Admin y Super Admin: lo que registra el trabajador lo ven al momento en la ficha de la caja, en la jornada y en Aprobaciones. La caja, sus monedas, las tasas, los servicios y las denominaciones son los de la **sede** de la caja.

**FR-CTX-2 · Validez de la sesión.** En cada petición el servidor resuelve quién opera y en qué caja. La sesión deja de valer —y se vuelve al acceso— si:

| Condición | Código |
| --- | --- |
| El equipo ya no está vinculado a ninguna caja | `equipo-sin-vincular` |
| El trabajador no existe o está desactivado | `trabajador-no-disponible` |
| El trabajador ya no es de la sede de la caja (fue reasignado) | `otra-sede` |

**FR-CTX-3 · Avisos de caja.** Antes de que el trabajador intente nada, Inicio y Caja dicen lo que impide trabajar con normalidad. Solo se muestra uno, el primero que se cumpla:

| Situación | Qué dice | Qué puede hacer |
| --- | --- | --- |
| **Sede sin operar**: sede suspendida o cerrada, operador suspendido, sede sin operador, o caja retirada | El motivo | Si la jornada abierta es suya, solo contar y cerrar; si no, nada |
| Tiene una **jornada abierta en otra caja** | En qué caja y desde cuándo | Cerrarla en el equipo de esa caja |
| La caja tiene abierta la **jornada de otro trabajador** | De quién y desde cuándo | Nada: solo ese trabajador la cierra, o la administración la fuerza (**FR-AD-JOR-***) |
| La **jornada anterior se cerró sin contar** (cierre forzado) | Quién la tenía y que esta apertura será el primer conteo | Abrir jornada (§10.3) |

**FR-CTX-4 · Sede sin operar.** No se registra nada nuevo —ni operaciones, ni apertura, ni movimientos de fondos, ni cambios de billetes, ni añadir moneda—, pero **la jornada abierta propia sí puede cerrarse**, para que no quede efectivo en una caja abierta sin salida. Código del servidor: `bloqueada`.

**FR-CTX-5 · Un trabajador, una caja.** Un trabajador no abre una jornada si ya tiene otra abierta en otra caja (`trabajador-con-otra-jornada`), ni opera la jornada abierta de otro en la caja donde se sienta (`jornada-de-otro`).

**FR-CTX-6 · Sin jornada abierta no hay operación** **[R1]**. Todo servicio y toda acción de caja salvo abrir, añadir moneda e imprimir piden la jornada **propia** abierta (`jornada-no-abierta`). Los flujos lo dicen al entrar, con un estado bloqueado y vuelta a Caja; la tarjeta del catálogo sigue visible.

**Ver en la demo:**

- Jornada de otro: con el equipo de Caja 01 de PuntoCash Vedado, entrar como `jperez` (la jornada abierta es de Lidia Gómez).
- Sede sin operar: Admin de Super Admin suspende una sede con jornada abierta; el trabajador de esa jornada entra y solo puede cerrar.

### 3.2 Lo que decide la sede

**FR-CTX-7** Worker no tiene listas propias. Lee de la sede:

| Dato | Lo decide | Requisito |
| --- | --- | --- |
| Servicios que la caja presta | PuntoCash, por sede | **FR-SA-SERV-*** |
| Monedas que puede tener la caja | El administrador de la sede (lista de monedas de la sede) | **FR-AD-MON-2** |
| Tasas de compra y venta, y cuáles están en vigor | El administrador de la sede, dentro del rango de PuntoCash | **FR-AD-TASA-***, **FR-SA-TASA-*** |
| Denominaciones de cada moneda | PuntoCash, para toda la red | **FR-SA-DEN-*** |
| Supervisores que pueden reponer, retirar o cambiar billetes | Los administradores activos de la empresa que opera la sede | **FR-CAJA-40** |
| Límites de las alertas | El administrador de la sede | **FR-AD-ALE-*** |

---

## 4. Inicio — `/worker/inicio`

**FR-HOME-5 · Contenido.**

| Bloque | Contenido |
| --- | --- |
| Cabecera | Saludo con el nombre; «Nueva operación» |
| Avisos | Aviso de caja (**FR-CTX-3**) y alertas de la caja (§12) |
| Mi caja | Nombre de la caja; «Jornada abierta» o «Sin jornada abierta» y la sede; las **monedas** de la caja con su bandera, **sin importes** (§1.6); «Ver caja» |
| Tasas vigentes | Por cada moneda con tasa **en vigor**: compra, venta y **desde cuándo rige** («hoy · 14:30» o «14 oct · 14:30»). Debajo, **«No se cambian hoy»**: las monedas de la lista de la sede sin tasa en vigor, cada una con su porqué (**FR-HOME-6**). Si la sede no tiene Cambio de moneda o ninguna tasa en vigor, lo dice |
| Accesos rápidos | Los servicios **disponibles** y **habilitados en la sede**, más «Ver todos los servicios» |
| Operaciones recientes | Las cinco últimas de esta caja: hora, cliente, servicio, importe y estado; cada fila abre la operación (**FR-TAB-1**); «Ver todas las operaciones» |

Inicio no ejecuta nada ni cambia ningún estado.

**FR-HOME-6 · Por qué una moneda no se cambia.**

| Causa | Texto |
| --- | --- |
| La sede maneja la moneda pero no le ha puesto tasa | «Tu sede no le ha puesto tasa» |
| PuntoCash no ha fijado rango para esa moneda | «PuntoCash todavía no permite cambiarla» |
| La sede no tiene CUP en su lista | «La sede no tiene CUP para cambiarla» |

**Ver en la demo:** Caja 03 de PuntoCash Vedado, `jperez`: CHF y MXN salen en «No se cambian hoy».

---

## 5. Nueva operación

### 5.1 Catálogo — `/worker/nueva-operacion`

**FR-CAT-1** Tarjetas de servicio agrupadas en *Cambio y efectivo*, *Transferencias*, *Pagos y productos* y *Empresas*. Cada una declara su disponibilidad con texto: **Disponible** o **En construcción**.

**FR-CAT-2** La tarjeta entera es el enlace; su nombre accesible incluye nombre, descripción y disponibilidad.

**FR-CAT-3** El buscador filtra por nombre, descripción y categoría, sin distinguir mayúsculas ni acentos. Las categorías sin coincidencias desaparecen; sin resultados, un estado vacío con acción para restaurar el catálogo.

**FR-CAT-4** Una tarjeta propia lleva a **Buscar solicitud** (§5.3).

**FR-CAT-6 · Servicio no habilitado en la sede.** Un servicio que PuntoCash no habilitó en la sede **no aparece** en el catálogo ni en Accesos rápidos, y su ruta responde **404**. El servidor lo rechaza igual con `servicio-no-habilitado`. Los servicios **en construcción** siguen visibles: no dependen de la sede.

**Ver en la demo:** con el equipo de una caja de PuntoCash Trinidad (`rleon`), Cambio de moneda no aparece si PuntoCash se lo quita desde Super Admin → Servicios.

### 5.2 Servicio en construcción — `/worker/nueva-operacion/{servicio}`

**FR-CAT-5** Nombra el servicio, dice que está en construcción y ofrece volver. No simula ningún flujo.

### 5.3 Buscar solicitud — `/worker/nueva-operacion/solicitud`

Recupera una solicitud generada en el kiosco (`KS-AAMMDD-NNNNNN`) y continúa el flujo real de su servicio con los datos precargados.

**FR-SOL-1** Un campo de código, sin autocompletado, y «Buscar solicitud», deshabilitada sin código. Buscar no exige jornada: la exige el flujo de destino.

**FR-SOL-2** Solo el código exacto; sin listados ni búsqueda por otro dato **[R4]**.

**FR-SOL-3** Aquí el motivo del rechazo **sí se distingue**: código no encontrado, solicitud vencida (más de 30 minutos) y solicitud ya utilizada.

**FR-SOL-4** Una solicitud encontrada se resume con los datos justos para reconocerla: el par y el importe en un cambio; beneficiario e importe al cobrar; remitente, beneficiario e importe al enviar un giro.

**FR-SOL-5** «Continuar» marca la solicitud como consumida y lleva al flujo de su servicio con los datos. No registra nada.

**FR-SOL-6** En Cambio de moneda la cotización del kiosco no se hereda: se vuelve a cotizar con las tasas en vigor. En Cobrar remesa y Cobrar giro, el código dispara la búsqueda por código. En Enviar giro, si los datos están completos se salta a la revisión; la confirmación sigue siendo manual y el código del giro solo nace al confirmar.

**FR-SOL-7** El flujo de destino consume los datos una sola vez.

---

## 6. El efectivo de una operación

Común a Cambio de moneda, Cobrar remesa, Enviar giro y Cobrar giro: **una operación se paga exacta o no se paga**, con billetes.

### 6.1 Paso «Efectivo»

**FR-EF-1 · Dónde está.** Cada flujo que mueve efectivo tiene un paso **«Efectivo»** antes de la revisión o la confirmación:

| Flujo | Qué hay en el paso |
| --- | --- |
| Cambio de moneda | Lo que da el cliente, el vuelto y lo que se le entrega |
| Enviar giro | Lo que da el cliente y el vuelto |
| Cobrar remesa, Cobrar giro | Lo que se le entrega |

**FR-EF-2 · Lo que da el cliente.** El trabajador marca, por denominación, los billetes y monedas con los que paga el cliente. Mientras no lleguen al importe a cobrar, no se puede continuar (`cobro-insuficiente`). Cuando llegan, la pantalla lo dice («Los billetes cuadran.»).

**FR-EF-3 · Se conserva.** Lo marcado se conserva al volver atrás y adelante entre pasos. Si cambia el importe de la operación, lo marcado se borra.

**FR-EF-4 · Denominaciones.** Solo se ofrecen las denominaciones **vigentes** del catálogo de esa moneda (**FR-SA-DEN-***). Las cantidades son enteros mayores o iguales que cero (`denominacion-invalida`). Una moneda sin denominaciones no se puede usar (`sin-denominaciones`).

### 6.2 Vuelto

**FR-EF-5** Si el cliente da más de lo que se cobra, la caja propone el **vuelto**, en la **misma moneda** que dio el cliente. Para formarlo cuentan también los billetes que el cliente acaba de dar.

**FR-EF-6** El vuelto propuesto se puede **cambiar** por otros billetes mientras sume lo mismo; si no suma, no se puede continuar.

**FR-EF-7** Si la caja no tiene billetes para el vuelto, se dice que pida otros billetes o el importe justo, y no se puede continuar (`sin-vuelto`). No se registra nada.

### 6.3 Lo que se entrega

**FR-EF-8 · Propuesta.** La caja propone en qué billetes entregar. El trabajador puede **cambiar la propuesta** mientras sume lo mismo. Queda registrado lo que se entregó de verdad.

**FR-EF-9 · Reserva según demanda.** Entre las combinaciones que suman el importe exacto, la propuesta elige la que **menos compromete los billetes que más van a hacer falta**, deducido de lo que salió en operaciones de la sede en los **últimos 7 días**. A igualdad, la de menos billetes. Es el mismo criterio para entregas, vueltos y cambios de billetes. **Desarrollo implementa el algoritmo**; la demostración muestra el comportamiento esperado.

**FR-EF-10 · Lo que se acepta que revele.** Una propuesta revela que esos billetes existen en la caja, no cuántos hay (**FR-CIEGO-5**).

### 6.4 Cuando la caja no puede pagar el importe exacto

**FR-EF-11 · Orden.** En todos los servicios, en este orden:

| Paso | Qué hace | Qué consta |
| --- | --- | --- |
| 1. Redondeo | Se baja el importe a la **denominación más pequeña** del catálogo de esa moneda. La fracción no se puede dar | «A favor de la casa (redondeo)» |
| 2. Parte en CUP | Se paga **lo máximo posible en la moneda** y el resto **en CUP**: con la tasa de **venta** en un cambio y la de **compra** en remesas y giros. Los CUP también tienen que poder pagarse exactos, y su propio redondeo consta | «Pagado en CUP» y su equivalencia |
| 3. Sin salida | Ver **FR-EF-12** | No se registra nada |

- **No se completa en CUP** si la moneda que se paga es CUP, ni si el cliente de un cambio paga en CUP.
- **Nunca se deja a favor de la casa** más que el redondeo del paso 1.

**FR-EF-12 · Sin salida** (`sin-salida`).

| Servicio | Qué se ofrece |
| --- | --- |
| Cambio de moneda | **Otro importe** que la caja sí pueda pagar entero. El botón dice lo que de verdad se cobra y se entrega («Cambiar 35.400,00 CUP y entregar 100,00 EUR»). Al aceptarlo, la operación sigue con ese importe y **lo que el cliente había marcado se borra**: hay que marcar de nuevo. Si no hay ningún importe posible, se dice que no hay salida, que no se registra nada y que el cliente puede volver o ir a otra sede |
| Cobrar remesa, Enviar y Cobrar giro | Nada: el importe lo fija otro. La operación **queda pendiente**: no se registra nada y el cliente puede volver o ir a otra sede |

Si el cliente no acepta, no se registra nada.

**FR-EF-13 · Importes que no se pueden cobrar.** Lo que se cobra en la moneda de origen tiene que ser **múltiplo de su denominación más pequeña** (USD y EUR desde 0,01; CUP desde 1). Si no, el campo de importe lo dice y no se puede continuar (`importe-no-pagable`).

### 6.5 Al confirmar

**FR-EF-14 · Revalidación.** El servidor vuelve a calcular todo al confirmar. Si lo entregado ya no suma lo que toca, o la caja cambió desde que se propuso, no se registra nada y se vuelve al paso «Efectivo» con una propuesta nueva (`propuesta-vencida`).

**FR-EF-15 · Recuento.** Si para pagar saldrían billetes que los libros de la caja no tienen —porque el trabajador cambió la propuesta—, no se registra nada y se pide el **recuento** de esa moneda (§10.7). Contada la moneda, la operación se reintenta sola.

**FR-EF-16 · Atomicidad.** La operación, sus movimientos de caja y los billetes que entran y salen se registran **todos o ninguno**.

### 6.6 Suficiencia de efectivo

**FR-EF-17** La pantalla no sabe si la caja alcanza (§1.6). Lo dice el servidor al proponer o al confirmar; si no alcanza, no se registra nada.

**FR-EF-18 · Proveedor externo.** En Cobrar remesa y Cobrar giro, el servidor comprueba los billetes —y pide recuento si hace falta— **antes** de pedir al proveedor que dé la entrega por hecha, para no completarla fuera si la caja no puede pagarla. **En producción**, la llamada al proveedor debe ir **dentro de la misma acción** que registra la operación, y no debe existir una consulta suelta de «¿alcanza?»: una consulta así, repetida con paciencia, permitiría acotar el saldo.

### 6.7 Liquidación

**FR-EF-19 · Qué es.** Lo que el cliente recibió en efectivo cuando no coincide con lo que daba la tasa o con el importe de la remesa o el giro:

| Línea | Cuándo |
| --- | --- |
| Vuelto al cliente | Dio más de lo que se cobraba |
| Pagado en CUP | Parte del pago se completó en CUP (§6.4, paso 2), con su equivalencia |
| A favor de la casa (redondeo) | Hubo redondeo a la denominación más pequeña, en la moneda o en el CUP del resto |

**FR-EF-20 · Dónde se ve.** En el resultado, en el comprobante (**FR-PRINT-1**) y en el detalle de la operación («Cómo se movió el efectivo», **FR-OPD-12**). La administración la ve en el detalle de la operación (**FR-AD-OPS-***).

**FR-EF-21 · Lo entregado.** «Cliente recibe», «Importe entregado» y «Salió de caja» dicen **lo que el cliente se llevó**: lo debido menos el redondeo, con la parte en CUP aparte. Si no coincide con lo que daba la tasa o con el importe de la remesa o el giro, se dice también ese importe.

---

## 7. Cambio de moneda — `/worker/nueva-operacion/cambio-moneda`

Pasos: **Cambio → Cliente → Efectivo → Revisión**, y el resultado. Exige la jornada propia abierta (**FR-CTX-6**) y el servicio habilitado en la sede (**FR-CAT-6**).

### 7.1 Paso «Cambio»

**FR-CM-1 · Modo.** El trabajador elige cómo lo pide el cliente:

| Modo | Qué escribe | Qué calcula el sistema |
| --- | --- | --- |
| **Cambiar un importe** | Monto a entregar, en la moneda de origen | Lo que recibe, a la baja al céntimo |
| **Recibir un importe** | Monto a recibir, en la moneda de destino | **El menor monto a entregar** —múltiplo de la denominación más pequeña de la moneda de origen— que llega a lo pedido. El cliente puede recibir unos céntimos más. El campo de lo que entrega no se edita |

**FR-CM-2 · Monedas.** Origen y destino se eligen entre las monedas **habilitadas en la caja que se pueden cotizar** con las tasas **en vigor** de la sede. Las monedas de la caja que no se pueden cambiar no aparecen en los selectores y la pantalla dice cuáles son y que se siguen usando en remesas y giros.

**FR-CM-3 · Pares.**

| Par | Cómo se cotiza |
| --- | --- |
| Divisa → CUP | La sede **compra** la divisa a su tasa de compra |
| CUP → divisa | La sede **vende** la divisa a su tasa de venta |
| **Divisa → divisa** | **Pasando por el peso**: la sede compra la de origen a su tasa de compra y vende la de destino a su tasa de venta. No hay tasa cruzada propia. La pantalla da la equivalencia y las dos tasas («1 EUR = 1,0491 USD · EUR a 342,00 y USD a 326,00 CUP»). En el libro quedan dos tramos: compra de la de origen (entrada) y venta de la de destino (salida); el peso no entra ni sale |
| Misma moneda | No se cotiza |

**FR-CM-4 · Importe.** Acepta las dos convenciones de separadores. Vacío, no interpretable, cero o negativo, y no múltiplo de la denominación más pequeña (**FR-EF-13**) se rechazan con su mensaje. Se cotiza mientras se escribe; la cotización es la única fuente de importes y tasa.

**FR-CM-6 · Cotización fijada.** Continuar fija la cotización para los pasos siguientes. **Al confirmar, el servidor vuelve a cotizar** con las tasas en vigor: si la tasa cambió, no se registra nada y se pide volver al primer paso (`sin-tasa`) **[R9]**.

### 7.2 Paso «Cliente»

**FR-CM-7** Se identifica al cliente por tipo y número de documento, o con un escaneo de documento simulado (cliente registrado o no registrado).

**FR-CM-8** Un cliente encontrado se muestra para confirmarlo, con vía para rechazar la coincidencia.

**FR-CM-9** Sin resultado, se ofrece registrar un cliente nuevo con los datos que exige la operación.

**FR-CM-10** No se avanza sin cliente.

### 7.3 Paso «Efectivo»

**FR-CM-21** Lo que da el cliente en la moneda de origen, el vuelto y lo que se le entrega en la de destino, según §6. Si la caja no puede pagar, las salidas de **FR-EF-11** y **FR-EF-12**, con la opción de otro importe.

### 7.4 Revisión y resultado

**FR-CM-11 · Revisión.** Cliente, la operación (par, importes y tasa, o las dos tasas si es entre divisas), el resumen del cambio, **«Billetes de la operación»** (lo que entra y lo que sale, por denominación) y los movimientos de caja que se registrarán, **sin saldos**. Si lo entregado no coincide con lo que daba la tasa, se dice (**FR-EF-21**).

**FR-CM-12 · Confirmar.** Se deshabilita durante el envío. El servidor revalida todo; si algo falla, no registra nada **[R3]**:

| Comprobación | Código |
| --- | --- |
| Cierre forzado de la jornada sin ver | `cierre-forzado` |
| Jornada propia abierta | `jornada-no-abierta`, o `jornada-de-otro` si la abierta es de otro |
| Sede operando | `bloqueada` |
| Servicio habilitado en la sede | `servicio-no-habilitado` |
| Las dos monedas habilitadas en la caja | `moneda-no-habilitada` |
| Tasa en vigor y la misma cotización | `sin-tasa` |
| Lo que da el cliente cubre lo que se cobra | `cobro-insuficiente` |
| Hay vuelto | `sin-vuelto` |
| Lo entregado suma lo que toca y la caja no cambió | `propuesta-vencida` |
| Los billetes que salen están en los libros | `recuento-necesario` (§10.7) |
| La caja puede pagar | `sin-salida` |

**FR-CM-13 · Al registrar.** Una operación `Completada` de servicio `Cambio de moneda`, con el cliente, los importes, la tasa aplicada y la liquidación; y sus movimientos de caja con los billetes de cada uno: entrada de lo que dio el cliente (menos el vuelto), salida de lo entregado, y salida en CUP si se completó en CUP. Todo o nada (**FR-EF-16**).

**FR-CM-14 · Resultado.** Código de operación, importes, liquidación (**FR-EF-19**), comprobante y vía a Operaciones.

**FR-CM-15 · Volver y salir.** Volver entre pasos no descarta lo escrito ni lo marcado (**FR-EF-3**). Salir con datos introducidos pide confirmación.

**Ver en la demo** (Caja 03 de PuntoCash Vedado, `jperez`, con la jornada abierta):

- Cambio justo: entregar 150 USD y marcar un billete de 100 y uno de 50.
- Vuelto: entregar 150 USD y marcar dos billetes de 100.
- Recibir un importe: «Recibir un importe», USD → CUP, pedir 31.800.
- Entre divisas: EUR → USD.
- Redondeo: entregar 100,01 USD → CUP.

---

## 8. Cobrar remesa — `/worker/nueva-operacion/remesas`

Pasos: **Código → Revisar remesa → Efectivo → Confirmar entrega**, y el resultado.

**FR-RM-1** Sin jornada propia abierta, estado bloqueado con vuelta a Caja **[R1]**.

**FR-RM-2** A la remesa solo se llega por su **código exacto** **[R4]**.

**FR-RM-3** Un código que no resuelve muestra «no encontrada» en la misma pantalla, conserva lo escrito y deja reintentar. Código inexistente, coincidencia solo con la referencia y código de otro servicio son indistinguibles.

**FR-RM-4** Los estados del proveedor se guardan tal como llegan y se muestran en español **[R10]**:

| Estado | Etiqueta |
| --- | --- |
| `COMPLETED` | Completada |
| `IN_TRANSIT` | En tránsito |
| `READY` | Lista para entrega |
| `PENDING_PAYMENT` | Pendiente de pago |
| `PAYED` | Pagada |
| `DENIED_PAYMENT` | Pago denegado |
| `PAYOUT_DENIED` | Entrega denegada |

Métodos: `delivery` → Entrega, `transfer` → Transferencia, `pickup` → Recogida.

**FR-RM-5** La revisión muestra la remesa (código, importe, moneda, método, referencia si existe, estado) y el beneficiario, con aviso de verificar la identidad **[R5]**. Solo continúa con estado `READY` **[R6]** y con la moneda de pago habilitada en la caja; cada caso con su mensaje.

**FR-RM-11 · Efectivo.** La caja propone lo que se entrega (**FR-EF-8**); el trabajador lo revisa y continúa cuando cuadra. Sin salida, la remesa **queda pendiente** (**FR-EF-12**).

**FR-RM-12 · Confirmar entrega.** Muestra «Billetes que se entregan». El servidor comprueba los billetes y pide recuento si hace falta **antes** de pedir al proveedor que complete la remesa (**FR-EF-18**). Después:

| Resultado del proveedor | El trabajador ve | Se registra |
| --- | --- | --- |
| Conflicto | La remesa ya no está disponible | Nada **[R2]** |
| Fallo | No se pudo completar | Nada **[R2]** |
| Éxito | Resultado | Salida de caja con sus billetes y operación `Completada` de servicio `Remesa`, con el beneficiario como cliente y la instantánea de la remesa **[R7] [R9]** |

**FR-RM-10** El resultado confirma el pago, con la liquidación si la hay, comprobante y vía a Operaciones.

**Ver en la demo:** la pantalla de código lista los códigos de la demostración con un botón para usarlos. `RM-7X82-9KLM` se paga; `RM-SIN-FONDOS` (999.999 CUP) no tiene salida.

---

## 9. Giros

### 9.1 Selector — `/worker/nueva-operacion/giros`

**FR-GS-1** Dos operaciones del mismo nivel: **Enviar giro** y **Cobrar giro**. Sin métricas, saldos ni listados **[R4]**.

### 9.2 Enviar giro — `/worker/nueva-operacion/giros/enviar`

Pasos: **Registrar giro → Revisar giro → Efectivo → Confirmar envío**, y el resultado.

**FR-GE-1** Sin jornada propia abierta, estado bloqueado **[R1]**.

**FR-GE-3 · Formulario.**

| Sección | Campos |
| --- | --- |
| Remitente | Tipo y número de documento, nombre, primer apellido, segundo apellido, fecha de nacimiento, teléfono, nacionalidad |
| Beneficiario | Nombre completo, correo (opcional), teléfono, dirección, documento, provincia, municipio |
| Datos del giro | Moneda (solo las habilitadas en la caja) e importe. Método: Recogida, solo lectura |

- El segundo apellido es obligatorio; el correo, si se da, debe ser válido.
- Municipio depende de la provincia; cambiar de provincia limpia un municipio incompatible.
- El importe es mayor que cero. Los errores se muestran al intentar continuar.

**FR-GE-9 · Revisión.** Remitente, beneficiario y datos del giro, con aviso de verificar los datos.

**FR-GE-15 · Efectivo.** Lo que da el remitente y el vuelto (§6.1, §6.2).

**FR-GE-10 · Confirmar envío.** Muestra **«Billetes que da el cliente»** y el vuelto. Es irreversible y se deshabilita durante el envío.

**FR-GE-11** El servidor valida jornada, moneda y billetes, y luego pide al proveedor crear el giro. Un fallo del proveedor no registra nada **[R2]**.

**FR-GE-12** Con éxito se registran la entrada de caja con sus billetes (lo que dio el remitente menos el vuelto) y una operación `Completada` de servicio `Giros`, con el remitente como cliente y la instantánea del giro **[R7] [R9]**.

**FR-GE-13** El resultado muestra el código de operación y el **código del giro** que necesitará el beneficiario, el vuelto si lo hubo, comprobante y vía a Operaciones.

**FR-GE-14** Salir con datos introducidos pide confirmación.

### 9.3 Cobrar giro — `/worker/nueva-operacion/giros/cobrar`

Pasos: **Código → Revisar giro → Efectivo → Confirmar entrega**, y el resultado.

**FR-GC-1** Sin jornada propia abierta, estado bloqueado **[R1]**.

**FR-GC-2** Un único campo de código y «Buscar giro»; el código lo da el beneficiario. Sin otras búsquedas, sugerencias ni listados **[R4]**.

**FR-GC-5** Una búsqueda rechazada dice «Giro no encontrado» en la misma pantalla; todas las causas son indistinguibles.

**FR-GC-7** Estados del proveedor en español; en giros, `READY` es «Lista para pago» y `COMPLETED` es «Completado» **[R10]**.

**FR-GC-8** La revisión muestra los datos del giro y el beneficiario, con aviso de verificar la identidad **[R5]**.

**FR-GC-9** No se continúa si el estado no es `READY` **[R6]** o la moneda no está habilitada en la caja, cada caso con su mensaje. Un giro `COMPLETED` se encuentra y se revisa, sin poder continuar.

**FR-GC-11** Sin moneda alternativa, conversión ni pago parcial a elección del trabajador: solo las salidas de **FR-EF-11**.

**FR-GC-18 · Efectivo.** La caja propone lo que se entrega; sin salida, el giro queda pendiente (**FR-EF-12**).

**FR-GC-12 · Confirmar entrega.** Muestra «Billetes que se entregan». El servidor revalida jornada, moneda, billetes (con recuento si hace falta) y estado **antes** de pedir al proveedor que complete el giro (**FR-EF-18**).

**FR-GC-13** Conflicto o fallo del proveedor: no se registra nada, sin reintento automático **[R2]**.

**FR-GC-14** Con éxito, una salida de caja con sus billetes y una operación `Completada` de servicio `Giros`, con el beneficiario como cliente **[R7] [R9]**. Es independiente de la operación de envío que lo originó.

**FR-GC-16** El resultado confirma la entrega, con la liquidación si la hay, comprobante y vía a Operaciones.

**Ver en la demo:** cobrar `TR-260901-000245`; enviar un giro de 500 EUR pagado con 600 EUR para ver el vuelto.

---

## 10. Caja

### 10.1 Pantalla de caja — `/worker/caja`

**FR-CAJA-31 · Contenido.**

| Bloque | Contenido |
| --- | --- |
| Avisos | Aviso de caja (**FR-CTX-3**) y alertas (§12) |
| Resumen | Caja, trabajador, estado de la jornada |
| Monedas de la caja | Las monedas habilitadas, con bandera, **sin importes** |
| Indicadores del día | Cifras del día que no son saldos (por ejemplo, cuántas operaciones), nunca importes de saldo |
| Acciones | **FR-CAJA-32** |
| Movimientos | El libro de la jornada (**FR-CAJA-56**) |

**FR-CAJA-32 · Acciones.** Cada una disponible o deshabilitada con su **motivo en texto**:

| Acción | Ruta | Deshabilitada cuando |
| --- | --- | --- |
| Imprimir resumen | — | Nunca (**FR-PRINT-2**) |
| Abrir jornada | `/worker/caja/fondeo-inicial` | Hay una jornada abierta; la sede no opera; el trabajador tiene jornada en otra caja |
| Añadir moneda | `/worker/caja/anadir-moneda` | La jornada abierta es de otro; la sede no opera |
| Reposición o retiro | `/worker/caja/fondos` | No hay jornada propia abierta; la sede no opera |
| Cambio de billetes | `/worker/caja/cambio-de-billetes` | No hay jornada propia abierta; la sede no opera |
| Arqueo y cierre | `/worker/caja/arqueo-cierre` | No hay jornada propia abierta (con la sede sin operar **sí** se puede, **FR-CTX-4**) |

Entrar por dirección en una acción no disponible muestra por qué: falta la jornada abierta, o la sede no opera.

**FR-CAJA-30 · Saldo nunca negativo.** El saldo de una moneda puede quedar en cero, nunca en descubierto. El servidor rechaza todo lo que lo dejaría negativo.

**FR-CAJA-33 · La caja lleva billetes.** Cada movimiento registra, además del importe, **cuántos billetes y monedas de cada denominación** entran (positivos) o salen (negativos). El inventario de la caja por denominación es la suma de los de su jornada, y cada jornada hereda el de la anterior. Lo exige la regulación.

### 10.2 Conteos billete a billete

Común a abrir, cerrar y recontar.

**FR-CAJA-34 · Formulario.** Por cada moneda, una fila por denominación de mayor a menor, con la cantidad (entero ≥ 0) y el subtotal; el total de la moneda. Desde 1024px, dos monedas por fila. Se cuentan las denominaciones **vigentes** y también las **retiradas que todavía estén en la caja**.

**FR-CAJA-35 · Se declara una vez.** Al pulsar «Continuar» aparece el aviso **«Los valores introducidos no podrán ser cambiados»**, con lo contado. Se puede «Seguir contando» o confirmar; antes de confirmar, cancelar no deja nada.

**FR-CAJA-36 · Diferencias.** Después de declarar, se compara moneda por moneda con la referencia (lo dejado, o los libros):

| Caso | Qué es | Qué se pide |
| --- | --- | --- |
| El total no cuadra | **Diferencia de importe** | Motivo de **FR-CAJA-37** compatible con el signo |
| El total cuadra y los billetes no | **Diferencia de composición**: se muestra qué cambió («+2 de 20 · −1 de 50 · total sin diferencia») | Causa de **FR-CAJA-38** |
| Cuadra todo | — | Nada |

**FR-CAJA-37 · Motivos de una diferencia de importe.**

| Motivo | Signo | Pide |
| --- | --- | --- |
| Sobrante detectado | Solo positiva | — |
| Faltante detectado | Solo negativa | — |
| Reposición de fondos | Solo positiva | **Supervisor** de la lista (**FR-CAJA-40**) |
| Retiro de fondos | Solo negativa | **Supervisor** de la lista |
| Otro | Cualquiera | **Observaciones** |

En un **recuento** (§10.7) solo valen Faltante, Sobrante y Otro: con el supervisor delante, una reposición o un retiro se registran como tales.

**FR-CAJA-38 · Causas de una diferencia de composición.**

| Momento | Causas |
| --- | --- |
| Al abrir | «El supervisor cambió billetes» (pide el supervisor y pasa a su confirmación) · Otro (observaciones) |
| Al cerrar y al recontar | «Entregué o recibí billetes distintos de los registrados» · «Hice un cambio de billetes sin registrarlo» · Otro (observaciones) |

No se pide la operación donde ocurrió.

**FR-CAJA-39 · Siempre a Aprobaciones.** Toda diferencia, de importe o de composición, sin umbral, nace como **solicitud de aprobación** de la administración de la sede, una por moneda (**FR-AD-APR-***). La de un motivo de fondos o de «El supervisor cambió billetes» es un **movimiento de fondos** que confirma el supervisor nombrado. **El inventario se corrige siempre con lo contado**, se apruebe o no.

**FR-CAJA-40 · Supervisores.** La lista son los **administradores activos de la empresa que opera la sede**. El servidor rechaza un supervisor que no esté en ella (`supervisor-requerido`).

**Rechazos comunes.**

| Condición | Código |
| --- | --- |
| Moneda sin denominaciones en el catálogo | `sin-denominaciones` |
| Denominación que no es de esa moneda, o cantidad que no es un entero ≥ 0 | `denominacion-invalida` |
| Conteo vacío o negativo | `conteo-invalido` |
| Falta el motivo | `motivo-requerido` |
| Motivo que no explica esa diferencia o ese signo | `motivo-incompatible` |
| «Otro» sin observaciones | `observaciones-requeridas` |
| Falta el supervisor, o no es de la lista | `supervisor-requerido` |

### 10.3 Abrir jornada — `/worker/caja/fondeo-inicial`

**FR-CAJA-41 · Referencia.** Lo que el trabajador ve ya escrito en el formulario:

| Situación de la caja | Referencia |
| --- | --- |
| La jornada anterior se cerró contando | **Lo que declaró quien cerró**, billete a billete |
| La jornada anterior la cerró la administración (cierre forzado) | **Lo que había en libros**, que nadie contó; con el aviso de **FR-CTX-3** |
| Primera jornada de la caja | Nada: solo se cuenta |

La apertura **no es a ciegas**: quien abre ve lo que recibe y **corrige solo las filas que no recibe**.

**FR-CAJA-42 · Declarar.** Al confirmar (**FR-CAJA-35**) el conteo queda **declarado en el servidor**. Salir y volver lleva a la revisión de lo declarado, no a un conteo nuevo (`conteo-ya-declarado`). Con el conteo declarado no se añade a la caja una moneda que no se contó.

**FR-CAJA-43 · Explicar y abrir.** Se ven las diferencias con la referencia (**FR-CAJA-36**) y se explica cada una. «Abrir jornada» abre con lo contado, que pasa a ser responsabilidad de quien abre.

**FR-CAJA-44 · Al abrir.**

- Un movimiento **«Fondeo inicial»** por moneda, con sus billetes.
- Cada diferencia, su solicitud: diferencia de apertura, de composición o movimiento de fondos (**FR-CAJA-39**). Queda en la jornada de quien abre.
- El detalle del «Fondeo inicial» dice si **coincidió** con lo que entregó quien cerró (o con los libros al forzar el cierre) o cuál fue la diferencia y su motivo.

**Rechazos.**

| Condición | Código |
| --- | --- |
| Ya hay una jornada abierta en la caja | `jornada-abierta` |
| El trabajador tiene otra jornada abierta | `trabajador-con-otra-jornada` |
| La sede no opera | `bloqueada` |
| Abrir sin conteo declarado | `sin-conteo-declarado` |
| Ya había un conteo declarado | `conteo-ya-declarado` |

**Ver en la demo:** Caja 03 de PuntoCash Vedado, `jperez`, sin jornada abierta: Caja → Abrir jornada. Para ver una diferencia, cambiar una fila antes de continuar.

### 10.4 Reposición o retiro — `/worker/caja/fondos`

**FR-CAJA-45 · Datos.**

| Campo | Reglas |
| --- | --- |
| Tipo | **Reposición** (el supervisor trae efectivo) o **Retiro** (se lo lleva) |
| Moneda | Una habilitada en la caja (`moneda-no-habilitada`) |
| Supervisor | De la lista de **FR-CAJA-40** |
| Billetes | Billete a billete, lo que trae o se lleva, contado con él. Al menos uno (`conteo-invalido`) |
| Observaciones | Opcional |

**FR-CAJA-46 · Revisar y confirmar.** «Revisar» muestra lo que se va a registrar; «Confirmar» lo registra.

**FR-CAJA-47 · Efecto.** Entra en los libros **en el acto** como movimiento **«Reposición de fondos»** o **«Retiro de fondos»**, con sus billetes y el supervisor, y queda **pendiente de que ese supervisor lo confirme** (**FR-AD-APR-***). No pasa por aprobación de nadie más.

**FR-CAJA-48 · Retiro de billetes que no hay.** Si se retiran billetes que los libros no tienen, no se registra nada y se pide el **recuento** de esa moneda (§10.7).

**Ver en la demo:** con la jornada abierta, Caja → Reposición o retiro; Reposición, USD, Marta Sánchez, dos billetes de 100.

### 10.5 Cambio de billetes — `/worker/caja/cambio-de-billetes`

Entran unos billetes y salen otros, **en la misma moneda y por el mismo total**.

**FR-CAJA-49 · Con un cliente.**

- El trabajador marca lo que trae el cliente y pide **«Proponer billetes para darle»**.
- La caja propone qué darle **sin repetir las denominaciones que el cliente entregó** (**FR-EF-9**). La propuesta se puede cambiar mientras el total cuadre.
- Si la caja no llega al importe exacto, se dice y no se registra nada (`sin-cambio-exacto`).
- **No pasa por aprobación.**

**FR-CAJA-50 · Con el supervisor.** El trabajador marca lo que entra y lo que sale y elige al supervisor. Queda **pendiente de que lo confirme** (**FR-CAJA-47**).

**FR-CAJA-51 · Efecto.** Un movimiento **«Cambio de billetes»** de importe 0, tipo **Cambio** (ni entrada ni salida), con lo que entró y lo que salió.

**Rechazos.**

| Condición | Código |
| --- | --- |
| Lo que entra y lo que sale no suman lo mismo | `cambio-descuadrado` |
| Entran y salen los mismos billetes | `cambio-sin-efecto` |
| Sale algún billete que los libros no tienen | `recuento-necesario` (§10.7) |
| Con supervisor, sin supervisor de la lista | `supervisor-requerido` |

**Ver en la demo:** con la jornada abierta, Caja → Cambio de billetes, con cliente, un billete de 100 USD.

### 10.6 Arqueo y cierre — `/worker/caja/arqueo-cierre`

**FR-CAJA-52 · A ciegas.** Se cuenta billete a billete (**FR-CAJA-34**) **sin ver lo que dicen los libros**. El formulario empieza vacío.

**FR-CAJA-53 · Un solo acto.** Confirmar el conteo (**FR-CAJA-35**) **cierra la jornada en ese instante**. No hay jornada «congelada» a medias: salir de la pantalla solo puede ser cancelar antes de confirmar, o la caja ya cerrada.

**FR-CAJA-54 · Después de cerrar.** El trabajador ve lo que contó y **la diferencia** de cada moneda, **nunca lo esperado** (§1.6). Si hay diferencias, se piden los motivos **justo después**, todos a la vez, en una ventana que no se cierra ni se abandona sin terminar («Guardar motivos y terminar»). Solo los da quien cerró, desde esa caja, una sola vez (`cierre-sin-explicacion-pendiente`).

**FR-CAJA-55 · Al cerrar.**

| Moneda | Movimiento | Solicitud |
| --- | --- | --- |
| Total distinto de los libros | «Ajuste de cierre», con la diferencia y sus billetes | Diferencia de cierre, o movimiento de fondos si el motivo es de fondos |
| Total igual, billetes distintos | «Ajuste de billetes al cerrar», importe 0 | Diferencia de composición |
| Cuadra todo | «Desglose del conteo de cierre», que deja constancia de los billetes | — |

- Si el trabajador **no llega a dar los motivos** (se va la luz, cierra el navegador), la diferencia llega igual a la administración como **«Sin explicar»**.
- La diferencia es de quien cierra y queda en su jornada.
- Lo contado queda como inventario de la caja y es la referencia de la siguiente apertura (**FR-CAJA-41**).

**Ver en la demo:** con la jornada abierta, Caja → Arqueo y cierre; contar un billete de menos para ver la ventana de motivos.

### 10.7 Recuento

**FR-CAJA-58 · Cuándo.** **Solo lo pide el sistema**, cuando para registrar algo saldrían billetes que **los libros no tienen**: un retiro, un cambio de billetes, o una operación en la que el trabajador cambió la propuesta (`recuento-necesario`). No hay arqueo parcial a voluntad: un recuento no pedido se rechaza (`recuento-no-pedido`).

**FR-CAJA-59 · Cómo.**

- No se registra nada de lo que se intentaba y se pide **contar a ciegas esa moneda**, con el supervisor delante si lo hay.
- **El inventario se corrige con lo contado.**
- La diferencia de importe o de composición va a Aprobaciones como **diferencia en recuento** o de composición, con su motivo (**FR-CAJA-37**, **FR-CAJA-38**). Movimiento: «Ajuste por recuento», «Ajuste de billetes en recuento» o «Desglose del recuento». Sin motivo, «Sin explicar».
- Después, **lo que se intentaba se reintenta solo** sobre lo que hay de verdad. Si los billetes siguen sin estar, se dice y no se registra (`sin-esos-billetes`), sin pedir otro recuento.

**Ver en la demo:** retirar tres billetes de 100 USD cuando los libros tienen dos.

### 10.8 Añadir moneda — `/worker/caja/anadir-moneda`

**FR-CAJA-13 · Qué ofrece.** Las monedas de la **lista de la sede** (**FR-AD-MON-2**) que la caja aún no tiene. Si las tiene todas, lo dice y remite al administrador.

**FR-CAJA-14 · Efecto.** La moneda queda habilitada en la caja, **en cero**. El efectivo entra después por una reposición o una operación.

| Condición | Código |
| --- | --- |
| La sede no opera | `bloqueada` |
| La moneda no está en la lista de la sede | `moneda-fuera-de-la-sede` |
| Ya está habilitada | `ya-habilitada` |
| Hay un conteo de apertura declarado sin abrir | `conteo-ya-declarado` |

### 10.9 Movimientos

**FR-CAJA-56 · Libro.** Los movimientos de la jornada: fecha y hora, concepto, tipo (**Entrada**, **Salida** o **Cambio**), moneda e importe. **Sin saldo después** (§1.6). Buscador y filtros por tipo, moneda y fecha. Cada fila se abre (**FR-TAB-1**): un movimiento de una operación abre la **operación**; uno interno abre **su detalle**.

**FR-CAJA-57 · Detalle de un movimiento interno** — `/worker/caja/movimientos/{id}`.

| Dato | Contenido |
| --- | --- |
| Identificación | Código `CM-…`, fecha y hora, concepto, tipo, moneda e importe |
| Billetes | Tabla por denominación de lo que entró y salió |
| Qué fue | En fondos y cambios: reposición, retiro, cambio con supervisor o con cliente |
| Supervisor | Si lo hay |
| Motivo y observaciones | Si los hay, o «Sin explicar» |
| Estado de la confirmación | Si pasó por Aprobaciones: **pendiente** (de quién), **confirmado** o **rechazado**, quién y cuándo. Un rechazo es una **incidencia** a nombre del trabajador (**FR-AD-TRAB-***) |
| Fondeo inicial | Si coincidió con lo recibido o la diferencia con el cierre anterior |

**Nunca** muestra saldo anterior, saldo resultante ni lo que decían los libros. Un movimiento que no es de esta caja responde 404.

---

## 11. Cierre forzado visto por el trabajador

La administración puede forzar el cierre de una jornada (**FR-AD-JOR-***). El trabajador de esa jornada:

**FR-CF-1 · Lo sabe al momento.** Esté en la pantalla que esté, aparece un diálogo **«El administrador cerró tu jornada»** con **quién** lo hizo, **la caja**, **la fecha y la hora** y **el motivo**. No se cierra con Escape ni pulsando fuera; no tiene botón de cerrar. No muestra ninguna cifra.

**FR-CF-2 · No puede operar.** Desde ese instante no se registra nada: ni operaciones, ni movimientos, ni conteos. Si confirma algo que tenía a medias, el servidor lo rechaza con `cierre-forzado` y la pantalla dice **«El administrador cerró tu jornada. Esto no se registró.»**, sin pedir recontar.

**FR-CF-3 · «Entendido».** Marca el aviso como leído y lleva a Caja, con la jornada cerrada y «Abrir jornada» disponible. El aviso no vuelve. Desde entonces el rechazo es el de cualquier caja sin jornada (`jornada-no-abierta`).

**FR-CF-4 · Solo a quien toca.** Solo lo ve el trabajador de la jornada cerrada.

**FR-CF-5 · La siguiente apertura** recibe lo que había en libros, con su aviso (**FR-CAJA-41**, **FR-CTX-3**).

**FR-CF-6 · Cómo llega.** En la demostración, Worker pregunta al servidor cada 5 segundos y al volver a la pestaña. **En producción** debe ser un canal en vivo.

**Ver en la demo:** abrir la jornada con un trabajador y forzar su cierre desde Admin → Jornadas → la jornada → Forzar cierre.

---

## 12. Alertas de la caja

**FR-ALE-1 · Qué son.** Estados que define el administrador de la sede (**FR-AD-ALE-***) y que se encienden solos mientras la caja con la jornada abierta cruza un límite:

| Alerta | Texto que ve el trabajador |
| --- | --- |
| Efectivo bajo en una moneda | «Efectivo bajo en USD» |
| Efectivo alto en una moneda | «Efectivo alto en USD» |
| Pocos billetes o monedas de una denominación | «Quedan pocos billetes de 5 USD», «Quedan pocas monedas de 0,25 USD» |

**FR-ALE-2 · Dónde.** En Inicio y en Caja, como **«Aviso de tu caja»**, con la lista de alertas y «Avisa a tu supervisor para que reponga, retire o cambie billetes».

**FR-ALE-3 · Sin cifras.** Ni el límite ni lo que hay: ninguna cifra en la pantalla ni en los datos (§1.6).

**FR-ALE-4 · Se van solas** cuando la condición deja de cumplirse. No hay «marcar como atendida» ni historial en Worker. Solo las ve el trabajador de la jornada abierta de esa caja.

**Ver en la demo:** Caja 01 de PuntoCash Vedado tiene alguna alerta según la hora del día; o fijar un mínimo alto desde Admin → Alertas.

---

## 13. Perfil — `/worker/perfil`

### 13.1 Datos

**FR-PERF-1 · Contenido.** Nombre, documento, nombre de usuario, teléfono, correo de verificación **enmascarado** y sede.

**FR-PERF-2 · Lo que no cambia el trabajador.** **Su nombre y su documento**, que dicen quién hizo cada operación, jornada y cuadre, y **su correo**, que es el canal del segundo factor. Los cambia su administrador (**FR-AD-TRAB-9**, **FR-AD-TRAB-10**). La pantalla lo dice.

### 13.2 Cambiar usuario o teléfono — `/worker/perfil/editar`

**FR-PERF-3 · Campos.**

| Campo | Reglas |
| --- | --- |
| Nombre de usuario | **FR-AUTH-1**; único entre los trabajadores |
| Teléfono | Al menos 8 cifras; admite +, espacios y guiones |

**FR-PERF-4 · Al guardar.** Si cambió algo: queda guardado, vuelve al Perfil con «Desde ahora entras con «{usuario}» o con tu correo», y se audita (**FR-PERF-6**). El nombre de usuario anterior deja de servir para entrar; la contraseña no cambia (**FR-AUTH-11**). Si no cambió nada, vuelve con «Sin cambios» y no se audita.

| Condición | Código |
| --- | --- |
| Usuario con formato inválido | `identificador-invalido` |
| Usuario de otro trabajador | `identificador-duplicado` |
| Teléfono inválido | `telefono-invalido` |

### 13.3 Cambiar contraseña — `/worker/perfil/contrasena`

**FR-PERF-5** Contraseña actual, nueva (mínimo 8 caracteres) y repetición; el mismo formulario y las mismas reglas que las consolas de administración (**FR-AD-PERF-5** a **FR-AD-PERF-8**). La sesión sigue abierta; se vuelve al Perfil con la confirmación.

| Condición | Código |
| --- | --- |
| La actual no es correcta | `actual-incorrecta` |
| Menos de 8 caracteres | `demasiado-corta` |
| Igual a la actual | `igual-a-la-actual` |
| La repetición no coincide | `no-coinciden` |

### 13.4 Auditoría

**FR-PERF-6** **[RP-21]**

| Acción | Evento | Datos |
| --- | --- | --- |
| Cambiar usuario o teléfono | `trabajador.datos-propios` | El trabajador como autor (papel «Trabajador»), sede, operador, antes y después |
| Cambiar la contraseña | `trabajador.contrasena-cambiada` | El trabajador como autor, sede, operador; **nunca** la contraseña |

Los ve PuntoCash en su auditoría (**FR-SA-AUD-***).

**Ver en la demo:** avatar de la cabecera → Perfil.

---

## 14. Operaciones

### 14.1 Historial — `/worker/operaciones`

**FR-OPL-1** Las operaciones de **esta caja**, de la más reciente a la más antigua: código, fecha y hora, cliente, servicio, importe y estado. Cada fila abre la operación (**FR-TAB-1**).

**FR-OPL-2** Buscador (código, cliente) y filtros por servicio, estado y fecha (un día o un intervalo). Sin resultados, estado vacío con «Limpiar filtros».

### 14.2 Detalle — `/worker/operaciones/{codigo}`

**FR-OPD-1** Código, fecha y hora, servicio, estado, cliente y los datos del servicio (cambio, remesa o giro).

**FR-OPD-11** La tasa, escrita según **FR-FMT-6**; en un cambio entre divisas, las dos tasas.

**FR-OPD-12 · «Cómo se movió el efectivo».** Cuando hay liquidación (§6.7): vuelto, pagado en CUP y a favor de la casa. Lo entregado según **FR-EF-21**.

**FR-OPD-13** **Sin** estado de caja, saldo anterior ni saldo resultante (§1.6).

**FR-OPD-14** Comprobante (**FR-PRINT-1**).

**FR-OPD-15** Un código que no existe o no es de esta caja muestra «Operación no encontrada».

---

## 15. Errores

**FR-ERR-1** Un rechazo del servidor nunca deja nada registrado a medias.

**FR-ERR-2** El mensaje dice qué pasó y qué hacer, en palabras del trabajador (Apéndice C). Un rechazo sin mensaje propio dice que no se pudo registrar y remite a Caja.

**FR-ERR-3** Los rechazos que se resuelven en otro paso devuelven a ese paso: `propuesta-vencida` al paso «Efectivo»; `sin-tasa` al paso «Cambio»; `recuento-necesario` al recuento.

**FR-ERR-4** Un fallo del proveedor externo no registra nada y no se reintenta solo **[R2]**.

---

## 16. Para producción

| Asunto | Requisito |
| --- | --- |
| Aviso de cierre forzado por un canal en vivo, no por sondeo | **FR-CF-6** |
| Alertas evaluadas en el servidor al registrar cada movimiento, con notificación | **FR-ALE-1**, **FR-AD-ALE-*** |
| Llamada al proveedor dentro de la acción que registra la operación; sin consulta suelta de «¿alcanza?» | **FR-EF-18** |
| Algoritmo de reserva según demanda | **FR-EF-9** |
| Diseño del comprobante imprimible | **FR-PRINT-1** |
| Credencial del equipo emitida y revocada por el servidor | **FR-DEV-7** |
| Kiosco con billetes: registrar los que entran y aplicar el mismo algoritmo si da vuelto | Fuera de este documento |

---

## Apéndice A · Terminología

| Término | Significado |
| --- | --- |
| Caja | El puesto de una sede donde se opera; tiene un equipo vinculado y, a lo sumo, una jornada abierta |
| Equipo | El ordenador vinculado a una caja |
| Jornada | El periodo entre la apertura y el cierre de una caja por un trabajador |
| Libros | Lo que la caja debería tener según sus movimientos |
| Inventario | Cuántos billetes y monedas de cada denominación tiene la caja |
| Denominación | Valor de un billete o una moneda metálica del catálogo de PuntoCash |
| Diferencia de importe | El total contado no coincide con la referencia |
| Diferencia de composición | El total coincide y los billetes no |
| Movimiento de fondos | Reposición, retiro o cambio de billetes con supervisor, pendiente de que el supervisor lo confirme |
| Recuento | Conteo de una moneda que pide el sistema cuando saldrían billetes que los libros no tienen |
| Incidencia | Lo que el trabajador registró y la administración rechazó; queda a su nombre |
| Liquidación | Vuelto, pagado en CUP y a favor de la casa de una operación |
| Sin explicar | Diferencia cuyo motivo no llegó |
| Cierre forzado | Cierre de una jornada hecho por la administración, sin contar |
| Alerta | Estado de una caja abierta que cruza un límite de la sede |
| Sede sin operar | Sede suspendida o cerrada, operador suspendido o sede sin operador |

## Apéndice B · Demostración

**Arrancar.** La demostración trabaja en memoria: los cambios duran hasta reiniciar el servidor, y las jornadas y operaciones de ejemplo se siembran respecto a la hora actual, así que lo que se ve cambia a lo largo del día.

**Equipos.** En un navegador sin vincular, «Demostración · usar un equipo ya vinculado» deja elegir uno de los equipos de caja que ya tiene la red.

**Trabajadores** (contraseña `puntocash`, código `123456`; por nombre de usuario o correo):

| Sede | Trabajadores |
| --- | --- |
| PuntoCash Vedado | `jperez` (Juan Pérez), `lgomez` (Lidia Gómez), `afonseca` (Alberto Fonseca) |
| PuntoCash Obispo | `mrivas` (Marisol Rivas), `cdiaz` (Carlos Díaz) |
| PuntoCash Miramar | `ynunez` (Yanet Núñez) |
| PuntoCash Centro Habana | `dmoreno`, `ifuentes` |
| Otras sedes | `rmesa`, `ecabrera`, `jvaldes`, `sperdomo`, `gsuarez`, `rleon` |
| Desactivado | `nalonso` |

**Códigos de ejemplo.** Remesas: los que lista la pantalla de código, entre ellos `RM-7X82-9KLM` y `RM-SIN-FONDOS`. Giros: `TR-260901-000245`.

**Pruebas automáticas.** Usan puestos de prueba aislados (una sede copia de Vedado con su caja y su trabajador) que solo existen con `PUNTOCASH_PRUEBAS=1`, igual que las rutas `/pruebas/*`, que responden 404 en cualquier otro caso.

## Apéndice C · Mensajes por código

Cada flujo dice el mensaje con las palabras de su pantalla («el cliente», «el beneficiario», «vuelve a los billetes»); aquí va el texto base. Los textos exactos de cada pantalla están en la demostración. «Lo impide la pantalla» quiere decir que el formulario marca el campo antes de enviar; el servidor lo rechaza igual con ese código.

### Caja y operaciones

| Código | Mensaje |
| --- | --- |
| `bloqueada` | La sede no está operando: no se puede registrar. (En la apertura: «…no se puede abrir una jornada.») |
| `cierre-forzado` | El administrador cerró tu jornada. Esto no se registró. |
| `jornada-no-abierta` | La jornada ya no está abierta. Abre una jornada en Caja para registrar la operación. |
| `jornada-de-otro` | La jornada de esta caja es de otro trabajador. |
| `jornada-abierta` | La caja ya tiene una jornada abierta. |
| `trabajador-con-otra-jornada` | Ya tienes una jornada abierta en otra caja. Ciérrala antes de abrir esta. |
| `servicio-no-habilitado` | PuntoCash deshabilitó {servicio} en esta sede. |
| `moneda-no-habilitada` | {Moneda} no está habilitada en esta caja. |
| `moneda-fuera-de-la-sede`, `ya-habilitada` | Lo impide la pantalla: solo ofrece las monedas de la sede que la caja no tiene |
| `sin-tasa` | La tasa cambió: vuelve al primer paso para cotizar de nuevo. |
| `conteo-invalido` | Escribe al menos un billete. |
| `denominacion-invalida` | Revisa los billetes: alguno no es de esa moneda o no es un número entero. |
| `sin-denominaciones` | Esta moneda no tiene billetes en el catálogo. Avisa al supervisor. |
| `conteo-ya-declarado` | Lleva a la revisión de lo ya declarado |
| `sin-conteo-declarado` | No se pudo abrir la jornada. Revisa los motivos e inténtalo de nuevo. |
| `motivo-requerido`, `motivo-incompatible`, `observaciones-requeridas` | Lo impide la pantalla: el campo de motivo, observaciones o supervisor queda marcado |
| `supervisor-requerido` | Elige al supervisor de la lista. |
| `cierre-sin-explicacion-pendiente`, `recuento-sin-explicacion-pendiente` | Lo impide la pantalla: los motivos ya se dieron |
| `recuento-necesario` | Lleva al recuento de esa moneda: «Según los libros, la caja no tiene esos billetes. Antes de registrarlo, contad entre los dos todo el {moneda} que hay en la caja, billete a billete…» |
| `recuento-no-pedido` | No se pudo registrar el recuento. Vuelve a Caja y comprueba su estado. |
| `sin-esos-billetes` | Contada la caja, esos billetes no están. No se registró nada: revisad con el supervisor qué billetes salen de verdad. (En una operación: «…vuelve a marcar con qué billetes se entrega» o «…el vuelto».) |
| `sin-cambio-exacto` | La caja no tiene billetes para darle ese importe exacto sin devolverle los mismos. No se registró nada. |
| `cambio-descuadrado` | Lo que entra y lo que sale tienen que sumar lo mismo. |
| `cambio-sin-efecto` | Entran y salen los mismos billetes: no hay nada que cambiar. |
| `cobro-insuficiente` | El cliente da menos de lo que se le cobra. Revisa los billetes. |
| `sin-vuelto` | La caja no tiene billetes para darle el vuelto. No se registró nada: pídele al cliente que pague con otros billetes o con el importe justo. |
| `importe-no-pagable` | Ese importe tiene fracciones menores que el billete más pequeño: no se puede cobrar en billetes. Cámbialo. |
| `sin-salida` | La caja no puede pagar eso entero. No se registró nada: ofrécele al cliente otra salida o que vuelva más tarde. (Con la opción de otro importe en un cambio, **FR-EF-12**.) |
| `propuesta-vencida` | Los billetes ya no cuadran con lo que toca, quizá porque cambió la caja. Revísalos. |
| `fondos-insuficientes` | La caja no tiene {moneda} suficiente para entregar este cambio. No se registró nada: avisa a tu supervisor o propón al cliente un importe menor. |

### Acceso de la sesión

| Código | Mensaje |
| --- | --- |
| `equipo-sin-vincular` | Vuelve a la pantalla de vinculación |
| `trabajador-no-disponible`, `otra-sede` | Vuelve al inicio de sesión |
| `sede-sin-operar` (acceso) | Tu sede no está operando. PuntoCash suspendió o cerró la operación de esta sede, y no tienes ninguna jornada abierta en esta caja que cerrar. Consulta con el administrador de tu sede. |

### Perfil

| Código | Mensaje |
| --- | --- |
| `identificador-invalido` | El del formato: «El identificador es un nombre de usuario, no un correo: no lleva «@»…», «Usa solo letras, números, punto, guion o guion bajo.», o el de largo |
| `identificador-duplicado` | Ese nombre de usuario ya lo usa otra persona. Elige otro. |
| `telefono-invalido` | Escribe un teléfono de al menos 8 cifras. Puede llevar +, espacios y guiones. |
| `actual-incorrecta` | La contraseña actual no es correcta. |
| `demasiado-corta` | La contraseña necesita al menos 8 caracteres. |
| `igual-a-la-actual` | La contraseña nueva tiene que ser distinta de la actual. |
| `no-coinciden` | Las dos contraseñas no son iguales. |
