# PuntoCash — Verificación en dos pasos (2FA)
## Documento de Requisitos Funcionales (FRD) · v1.0

**Estado:** Especificación de entrega. Describe el segundo factor de autenticación del acceso Worker tal como está diseñado e implementado en el demo.
**Destinatarios:** Personas desarrolladoras de frontend y backend, y QA.
**Motivo del documento:** el acceso Worker se especificó y se construyó sin segundo factor (FRD Worker v1.2, §2). Todos los productos de la empresa exigen 2FA, de modo que el acceso del Worker estaba incompleto. Este documento cierra ese hueco.
**Documentos complementarios:** `PuntoCash_Worker_Functional_Requirements_v1.md` (v1.3) — §2 Autenticación remite a este documento para todo el segundo paso. `PuntoCash_Worker_PRD_v2.md` (v2.1) — introduce la regla **R13**, que es la razón de ser de todo lo que sigue.

**Cómo leer este documento.** Los requisitos se numeran `FR-2FA-<n>`. "Debe" describe comportamiento obligatorio. **[R#]** referencia una regla de negocio del PRD. §11 recoge lo que en el demo está simulado y §12 lo que queda deliberadamente sin definir.

---

## 1. Alcance y decisiones tomadas

**Qué se especifica.** El segundo paso del acceso a `/worker`: la pantalla de verificación, el correo que la acompaña, y los límites del reto.

**Decisiones de producto, acordadas con el equipo:**

1. **Un solo método: código de seis dígitos al correo registrado del trabajador.** No hay aplicación de autenticación (TOTP), ni SMS, ni llave física. El correo es el único canal que la empresa ya tiene para cada trabajador desde que la cuenta se crea.
2. **En cada inicio de sesión, sin excepción.** No existe "recordar este equipo". La caja es un puesto compartido y los trabajadores se alternan en el mostrador: un equipo recordado convertiría al siguiente turno en una sesión heredada. Es también lo que hace auditable la apertura de jornada — cada sesión tiene su propia verificación.
3. **Sin códigos de respaldo.** Un pliego de diez códigos de un solo uso acaba, en una casa de cambio, impreso en un papel dentro del mostrador. La salida cuando el correo no llega es el reenvío y, agotado el reenvío, la asistencia del administrador de sede.
4. **Alcance de esta entrega: Worker.** `/admin` y `/super-admin` heredarán el mismo flujo cuando se construyan — el dominio (`src/features/auth`) ya está escrito para reutilizarse sin cambios. Lo que cambie allí será a lo sumo el destino posterior a la verificación.

**Qué no cambia.** El primer paso — identificador y contraseña — conserva todo el comportamiento de FR-AUTH-1 a FR-AUTH-6, salvo su desenlace de éxito (FR-2FA-4).

---

## 2. El reto de verificación

**FR-2FA-1** Un **reto** es el objeto que representa un acceso a medio hacer. Nace cuando las credenciales son correctas, y muere al verificarse, al agotarse o al abandonarse. Mientras un reto vive **no existe sesión**: el trabajador no tiene acceso a ninguna pantalla del shell, ni a su caja, ni a su nombre en la cabecera **[R13]**.

**FR-2FA-2** Parámetros del reto. Son los valores que la pantalla representa y los que el backend debe aplicar; si cambian, cambian en los dos lados a la vez:

| Parámetro | Valor | Por qué |
| --- | --- | --- |
| Longitud del código | 6 dígitos | Un millón de combinaciones contra 3 intentos y 5 minutos. Seis dígitos es lo que una persona retiene de un vistazo. |
| Vigencia del código | 5 minutos | Suficiente para abrir el correo en el teléfono; corto para que un código leído por encima del hombro no sirva al rato. |
| Intentos por código | 3 | Absorbe el error de tecleo, no un tanteo. |
| Envíos por reto | 3 (el inicial + 2 reenvíos) | Límite real del reto: impide usar el reenvío para reiniciar los intentos indefinidamente. |
| Espera entre envíos | 60 s | Evita el envío repetido por impaciencia, que es lo que hace que el correo termine en spam. |

**FR-2FA-3** Lo único que el cliente conoce de un reto es: el correo de destino **enmascarado**, la longitud del código, el instante de caducidad, el instante a partir del cual puede reenviar, los intentos restantes y los envíos restantes. El **código nunca viaja al cliente** — ni en el cuerpo de una respuesta, ni en una cabecera, ni en un registro de consola.

---

## 3. Paso 1 — Inicio de sesión

**FR-2FA-4** Las credenciales correctas **no abren sesión**. Su desenlace es un reto: el sistema emite un código, lo envía al correo registrado y la pantalla navega a `/worker/verificacion`. La confirmación que se muestra antes de navegar dice lo que ocurrió — credenciales verificadas y código enviado — no "sesión iniciada".

**FR-2FA-5** Durante el envío el formulario se deshabilita y sigue deshabilitado mientras carga el destino. Un segundo envío no puede producir un segundo reto, porque emitir un código nuevo invalidaría el que acaba de salir (FR-2FA-13).

**FR-2FA-6** Los desenlaces de fallo del paso 1 no cambian: credenciales inválidas, cuenta bloqueada y error de red se comportan según FR-AUTH-3. Ninguno de ellos emite código alguno.

---

## 4. Paso 2 — Pantalla de verificación

**FR-2FA-7** `/worker/verificacion` se representa **fuera del shell**, como el inicio de sesión (FR-SHELL-3). No puede mostrar el nombre del trabajador, su caja, la sede ni el nombre del mercante: cuando esta pantalla se ve, la identidad todavía no está verificada, y la marca visible es siempre PuntoCash.

**FR-2FA-8** La pantalla declara a dónde fue el código, con el correo **enmascarado** (`j•••z@puntocash.com`). Nunca la dirección completa: a esta pantalla se llega con una contraseña, y una contraseña acertada no debe poder usarse para confirmar la dirección de correo de un trabajador.

**FR-2FA-9** El campo del código:

1. Es **un único control de formulario**, con su etiqueta visible, presentado sobre seis casillas. Las casillas son representación, no controles, y se ocultan a las tecnologías de asistencia. Seis campos independientes rompen el autorrelleno del código, reparten mal el pegado y se anuncian como seis controles sin etiqueta propia.
2. Acepta solo dígitos. Un pegado que traiga espacios, guiones o texto alrededor se reduce a sus dígitos en lugar de rechazarse.
3. Se llena de izquierda a derecha: el cursor va siempre al final, y un clic sobre cualquier casilla no permite escribir en un hueco intermedio.
4. Declara `autocomplete="one-time-code"`, de modo que el sistema operativo pueda ofrecer el código recibido, y se marca para que un gestor de contraseñas **no** lo almacene.
5. Muestra la cuenta atrás de vigencia como descripción del campo.

**FR-2FA-10** Al completarse el sexto dígito la verificación **se envía sola**. El botón de envío permanece, habilitado solo con el código completo, porque es la única acción primaria de la pantalla y la vía de quien navega con teclado o llega al campo por otro camino.

**FR-2FA-11** Desenlaces de la verificación y comportamiento exigido:

| Resultado | Comportamiento |
| --- | --- |
| **Verificado** | Mensaje de éxito, pantalla bloqueada contra un segundo envío, navegación a `/worker/inicio`. El código se consume: no puede volver a usarse. |
| **Código incorrecto** | Error a nivel de formulario que **dice cuántos intentos quedan**; el campo se vacía, se marca inválido y recupera el foco. |
| **Código caducado** | Advertencia, no error: no hay nada que corregir. El campo se cierra y la acción disponible pasa a ser el reenvío. |
| **Intentos agotados** | El reto muere. Error a nivel de formulario, campo y reenvío cerrados, y la única acción es volver a iniciar sesión. El mensaje señala que, si el trabajador no reconoce esos intentos, avise al administrador de su sede. |
| **Envíos agotados** | El reto muere, con el mismo cierre. El mensaje remite a iniciar sesión de nuevo o a la asistencia del administrador. |
| **Error de red** | Error a nivel de formulario; **no consume intento** — nada llegó a comprobarse — y el código sigue válido mientras no caduque. |
| **Sin reto vigente** | Ver FR-2FA-16. |

**FR-2FA-12** Un código incorrecto y un código caducado deben distinguirse en el mensaje. No es información que ayude a un atacante — ya tiene la contraseña si llegó aquí — y confundirlos hace que el trabajador teclee tres veces un código que nunca iba a servir.

---

## 5. Reenvío

**FR-2FA-13** Reenviar emite un código nuevo e **invalida el anterior**: en cada instante hay como máximo un código válido por reto. El mensaje de confirmación lo dice, porque un trabajador con dos correos a la vista tecleará el primero.

**FR-2FA-14** El reenvío reinicia la vigencia y los intentos, y **descuenta un envío**. Los envíos no se reponen: son el límite del reto.

**FR-2FA-15** El botón de reenvío declara siempre su estado en el propio texto, nunca solo por color o por estar apagado: `Reenviar código en 43 s` durante la espera, `Reenviar código` cuando está disponible, `Sin reenvíos disponibles` cuando se agotaron. Pedir un reenvío antes de tiempo — si llegara a ocurrir — se responde con una advertencia que remite a la cuenta atrás, no con un error.

---

## 6. Fin del reto

**FR-2FA-16** **Sin reto vigente no hay nada que verificar.** Es lo que ocurre al recargar la pantalla, al llegar por enlace directo o al volver con el botón del navegador. La pantalla lo dice tal cual — la verificación ya no está activa y hay que iniciar sesión otra vez — en lugar de redirigir en silencio a una pantalla que el trabajador no pidió.

**FR-2FA-17** "Usar otra cuenta" descarta el reto y devuelve al inicio de sesión. Es la salida de quien se equivocó de cuenta, y evita que el reto siga vivo mientras otra persona inicia sesión en el mismo equipo.

**FR-2FA-18** Un reto muerto no se reabre. Cualquier continuación empieza por el inicio de sesión, con credenciales.

---

## 7. El correo del código

**FR-2FA-19** Contenido obligatorio del correo: el nombre del trabajador, el código, su vigencia, la advertencia de un solo uso, el momento del intento de acceso (`dd/MM/yyyy · HH:mm`, FR-FMT-2), el aviso de no compartirlo y la indicación de qué hacer si el intento no fue suyo. Es la única señal de acceso indebido que un trabajador recibe antes de que alguien entre con su cuenta.

**FR-2FA-20** El código **no va en el asunto**. El asunto se lee en la pantalla de bloqueo del teléfono, delante de quien esté al lado del mostrador.

**FR-2FA-21** El correo **no lleva enlace ni botón que complete el acceso**. Un código verificable desde el correo convierte el buzón en la credencial: quien tenga acceso al correo entra sin pasar por la caja. El código se teclea en la pantalla que ya está abierta.

**FR-2FA-22** El correo no nombra la sede, la caja ni al mercante que administra la sede, por el mismo motivo que la pantalla (FR-2FA-7) y por la regla de marca A9.

**FR-2FA-23** Se envía en `multipart/alternative`, con cuerpo HTML y cuerpo de texto plano. Un cliente que bloquea HTML debe seguir mostrando el código legible, y un correo solo-HTML puntúa peor en los filtros de spam — inaceptable en un correo del que depende poder abrir la caja.

**FR-2FA-24** El correo debe ser reconociblemente PuntoCash **con las imágenes bloqueadas**, que es como lo recibirá la mayoría: el logotipo es texto y el isotipo es una imagen opcional. Sin tipografía Montserrat disponible, la marca se sostiene con la alternativa del sistema.

**FR-2FA-25** Sin adjuntos y sin `List-Unsubscribe`: es un correo transaccional de seguridad, no una comunicación de la que se pueda dar de baja.

---

## 8. Seguridad — lo que el backend debe hacer y lo que no

**FR-2FA-26** El código se genera con un generador criptográficamente seguro. No se deriva del identificador, de la hora ni de un contador.

**FR-2FA-27** Se almacena su **hash**, nunca el código. La comparación es en tiempo constante, y el registro se borra al verificarse.

**FR-2FA-28** Los tres límites — vigencia, intentos y envíos — se hacen cumplir **en el servidor**. Lo que la pantalla muestra es un reflejo de ellos, no su implementación: una cuenta atrás agotada en el cliente no es lo que impide verificar.

**FR-2FA-29** Se audita que un código se envió, a qué cuenta y cuándo, y el resultado de cada intento de verificación. **Nunca el código.**

**FR-2FA-30** El reto se identifica con un valor opaco y no adivinable, y no admite verificación desde otra sesión de navegador que la que lo originó.

**FR-2FA-31** La verificación se limita por tasa también por cuenta y por origen, además de por reto: los límites por reto no sirven de nada si se pueden crear retos en cadena.

---

## 9. Accesibilidad

**FR-2FA-32** El campo del código cumple el contrato general (FR-A11Y-1): se resuelve desde su etiqueta visible, y expone inválido y descrito-por de forma programática. Su `aria-describedby` referencia únicamente elementos que se representan — la descripción o el error, más el párrafo que dice a qué correo fue el código — de modo que el control se anuncie con su destino y no queden referencias huérfanas.

**FR-2FA-33** Las casillas miden 48×56px, por encima del mínimo de 44px (FR-A11Y-3). El foco es un borde navy visible con anillo, nunca solo una sombra.

**FR-2FA-34** Ningún estado se comunica solo por color (FR-A11Y-2): el error lleva texto, la cuenta atrás lleva cifras, y el botón de reenvío lleva su estado escrito.

**FR-2FA-35** El envío automático al sexto dígito no deja a nadie sin vía manual: el botón de envío sigue presente y operable por teclado.

---

## 10. Contrato para el backend

El frontend está escrito contra tres operaciones y dos uniones de resultado (`src/features/auth/two-factor.ts`). Sustituir el mock por el backend real no debería exigir cambios en la pantalla.

| Operación | Entrada | Resultados |
| --- | --- | --- |
| Autenticar | identificador, contraseña | `challenge-required` (con la vista del reto) · `invalid-credentials` · `account-blocked` · `network-error` |
| Verificar | reto, código | `verified` · `invalid-code` · `code-expired` · `challenge-locked` (motivo: intentos \| envíos) · `challenge-not-found` · `network-error` |
| Reenviar | reto | `sent` · `too-soon` · `challenge-locked` (motivo: envíos) · `challenge-not-found` · `network-error` |

El reto tal como lo ve el cliente: identificador opaco, correo enmascarado, longitud del código, caducidad, disponibilidad de reenvío, intentos restantes, envíos restantes. Nada más (FR-2FA-3).

---

## 11. Condiciones conocidas de la implementación

- El reto vive **en memoria del cliente** (módulo de dominio simulado), como el resto del demo. De ahí que una recarga lo pierda — FR-2FA-16 no es una decisión de producto sino el comportamiento honesto de esta simulación, y con backend real será una sesión de reto de servidor que sí sobrevive a la recarga. **El requisito que debe conservarse es que se diga qué pasó, no que la recarga anule la verificación.**
- **No se envía ningún correo.** `buildVerificationCodeEmail()` construye el correo; nada lo despacha.
- Cuentas y códigos de demostración: código `482913` verifica; `000000` fuerza un error de red; cualquier otro descuenta un intento. El identificador `caduca@puntocash.com` crea un reto con 20 s de vigencia, para poder ver el estado caducado sin esperar cinco minutos.
- El código correcto es fijo en el mock: es un demo de interfaz, no un generador. FR-2FA-26 es requisito del backend.
- **Pruebas:** la batería de Playwright existente incluía un caso que daba por hecho que el inicio de sesión llegaba a `/worker/inicio`; ahora afirma la llegada a `/worker/verificacion`. No se ejecutó en el entorno donde se escribió este cambio (registro de npm bloqueado): correr `npm run typecheck && npm run test:ui` en la máquina del equipo.

---

## 12. No especificado por este documento

- Recuperación de acceso y restablecimiento de contraseña (`/worker/recuperar-acceso` sigue siendo marcador de posición, FR-AUTH-6).
- Alta del correo del trabajador y su cambio: ocurre al crear o editar el trabajador, capacidad del Admin de sede (regla A4).
- Cierre de sesión, caducidad de sesión y sesión concurrente en dos equipos.
- 2FA de `/admin` y `/super-admin`, más allá de la decisión de §1.4 de reutilizar este mismo flujo.
- Segundos factores alternativos (TOTP, llave física) y códigos de respaldo: descartados en §1, no diseñados.
- Desbloqueo de una cuenta por el Admin de sede: la pantalla remite a él, pero la capacidad se especifica en el FRD de Admin de sede.

---

## Apéndice A · Mapa de reglas a requisitos

| Regla | Dónde se hace cumplir |
| --- | --- |
| **R13** Ninguna sesión de trabajo se abre sin un segundo factor verificado | FR-2FA-1, FR-2FA-4, FR-2FA-11, FR-2FA-28 |
| **R12** Un Worker solo ve su propia caja | FR-2FA-7 — antes de verificar no ve ni caja ni sede |
| **A9** PuntoCash es siempre la marca visible | FR-2FA-7, FR-2FA-22, FR-2FA-24 |
| **R5** La identidad se verifica físicamente, por una persona | No se relaja: el 2FA autentica al trabajador ante el sistema; la identidad del **cliente** sigue verificándose en el mostrador |
