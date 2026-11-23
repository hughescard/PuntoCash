# PuntoCash — Kiosco de autoservicio
## Documento de Requisitos Funcionales (FRD) · v2.0

**Alcance:** el kiosco táctil de autoservicio de una sede, `/kiosk/autoservicio`. No cubre la pantalla informativa (`/kiosk/pantalla`), que tiene su propio documento, ni la caja que termina lo que el kiosco prepara, que está en el FRD de Worker.

**Destinatarios:** desarrollo backend y frontend, y QA. Es la especificación contra la que se implementa y se acepta.

**Documentos relacionados:**

| Documento | Qué define |
| --- | --- |
| `../PuntoCash_PRD_v2.md` | El producto completo y las reglas **R1–R13** y **RP-***, citadas aquí como **[R#]** |
| `../worker/PuntoCash_Worker_Functional_Requirements_v1.md` (2.3) | **Buscar solicitud** (§5.3, **FR-SOL-***) y los flujos de caja que terminan lo que el kiosco prepara |
| `PuntoCash_Kiosk_Pantalla_Functional_Requirements_v1.md` (2.0) | La pantalla informativa de la sede, que lee las mismas tasas |
| `../admin/PuntoCash_Admin_Sede_Functional_Requirements_v1.md` | Vincular y desvincular el kiosco (**FR-AD-EQ-***) y las tasas de la sede (**FR-AD-TASA-***) |
| `../admin/PuntoCash_Super_Admin_Functional_Requirements_v1.md` | Los servicios de cada sede, el catálogo de monedas y denominaciones y la tarifa de giros (**FR-SA-TAR-***) |

## Cómo leer este documento

- Cada requisito tiene un código `FR-AS-<área>-<n>`. «Debe» indica comportamiento obligatorio.
- El documento fija las **reglas**: qué muestra cada pantalla, qué se permite, qué se rechaza y qué queda registrado.
- Los **textos y la disposición** de cada pantalla están en la **demostración**, que es la referencia de diseño. Los mensajes que ve el cliente están en el **Apéndice C**.
- Cada **«Ver en la demo»** dice qué hacer para ver ese caso. Los kioscos, sedes y códigos de la demostración están en el **Apéndice B**.
- **El servidor revalida toda regla al registrar la solicitud**, aunque la pantalla ya la haya comprobado: la sede, sus tasas y sus servicios pueden cambiar con el cliente a medias **[R3]**.

## Versiones

| Versión | Fecha | Cambio |
| --- | --- | --- |
| 2.0 | 23/11/2026 | **Documento reescrito** en el formato de los FRD de Worker y de administración, describiendo el sistema y no la demostración. Lo que cambia de fondo: (1) **El kiosco opera sobre la red**: su vínculo, su sede, sus servicios, sus tasas y su tarifa los da el servidor en cada petición, y un cambio de la sede llega al kiosco sin tocarlo (§1.3, §2). (2) **La sede decide**: una sede que no atiende deja el kiosco «no disponible», y un servicio que la sede no ofrece no existe en el kiosco (**FR-AS-SEDE-1** a **SEDE-4**, nuevos). (3) **El kiosco no toca billetes**: prepara la operación y la caja la termina. Lo único de los billetes que comprueba es que lo que el cliente entrega se pueda pagar, y avisa de que la cifra final la confirma la caja (**FR-AS-CM-5**, **FR-AS-RM-6**, **FR-AS-GC-2**). (4) **Cambio de moneda con dos modos**, «Sé cuánto voy a entregar» y «Sé cuánto quiero recibir», con las tasas de la sede (**FR-AS-CM-1** a **CM-4**). (5) **Enviar giro con su tarifa**: el cliente ve lo que recibe el beneficiario, la tarifa y el total antes de recibir su código (**FR-AS-GE-4**, **GE-8**, **GE-9**). (6) **El servidor vuelve a cotizar** el cambio y el giro al registrar, y si la cifra ya no es la que vio el cliente no registra nada (**FR-AS-CM-8**, **FR-AS-GE-6**). (7) **Las solicitudes son de la red**: código único, vigencia con el reloj del servidor, canje en el servidor y solo en una caja de la misma sede (§9). (8) **Carné en caja**: los cobros avisan antes del código de que hay que presentar el carné (**FR-AS-RM-6**, **FR-AS-GC-2**). Sale el simulador `/kiosk/simulador-admin`: el kiosco se vincula desde la consola de la sede |
| 1.3 | 22/09/2026 | Sesión de dispositivo vinculada por el administrador; impresión del código |
| 1.2 | 22/09/2026 | Separación entre la demostración y el producto; almacén compartido, código único, consumo atómico y vigencia en el servidor |
| 1.1 | 22/09/2026 | El tablero de tasas como requisito real |
| 1.0 | 21/09/2026 | Primera versión |

**Requisitos retirados en la 2.0**, cuyos códigos no se reutilizan:

- **FR-AS-LINK-9** (simulador del panel del administrador): la vinculación la hace la consola de la sede (**FR-AD-EQ-17** a **EQ-24**).
- **FR-AS-FORM-5** (escenario fijo del lector simulado): es de la demostración, Apéndice B. **FR-AS-FORM-8** (lector real): absorbido en **FR-AS-FORM-2** y **FORM-3**.
- **FR-AS-DOM-5** y **FR-AS-DOM-6** (solicitudes y numeración en el navegador): las solicitudes son de la red (**FR-AS-DOM-7**, **DOM-8**).
- **FR-AS-IMP-1** (dominio simulado): es de la demostración, Apéndice B.
- La ruta `/kiosk/simulador-admin`.

---

## 1. Comportamiento global

El kiosco es una pantalla táctil sin operador, en la sala de la sede, donde el cliente **prepara** una operación antes de llegar a caja. Captura lo que un trabajador tendría que teclear y entrega un código corto. La caja lo recupera con ese código y termina la operación: recibe el efectivo, entrega el dinero y la registra.

El kiosco nunca:

1. **Mueve efectivo ni toca billetes.** No tiene caja ni jornada **[R1]**. Ni declara billetes ni calcula vuelto: eso lo hace la caja al terminar.
2. **Verifica identidad.** Registra lo que el cliente dice de sí mismo; el trabajador lo comprueba con el documento físico **[R5]**.
3. **Completa un servicio.** Una solicitud no es una operación (§9).

### 1.1 Shell

**FR-AS-SHELL-1 · Cabecera.** Toda pantalla comparte un shell propio con la marca PuntoCash. Con el kiosco vinculado, la cabecera lleva además el nombre de su sede y, si la sede atiende, un acceso permanente **«Inicio»**. Sin barra lateral, sin persona identificada, sin menú y sin «Cerrar sesión»: el kiosco tiene sesión de equipo, no de persona (§2). Sin vincular, la cabecera lleva solo la marca.

**FR-AS-SHELL-2** Ninguna pantalla de flujo pinta su propia cabecera.

**FR-AS-SHELL-3** Cada flujo de más de una pantalla tiene una sola salida explícita, «Cancelar».

**FR-AS-SHELL-4 · Tamaño.** Referencia de escritorio de la aplicación: 1440×900, mínimo 1280px, controles de al menos 48px. El tamaño de la terminal física no está fijado (**FR-AS-IMP-2**).

### 1.2 Rutas

**FR-AS-NAV-1**

| Ruta | Pantalla | Sección |
| --- | --- | --- |
| `/kiosk/autoservicio` | Inicio: los servicios de la sede y la consulta de tasas | §3 |
| `/kiosk/autoservicio/cambio-moneda` | Preparar un cambio de moneda | §4 |
| `/kiosk/autoservicio/remesas` | Preparar el cobro de una remesa | §5 |
| `/kiosk/autoservicio/giros` | Enviar o cobrar un giro | §6.1 |
| `/kiosk/autoservicio/giros/enviar` | Preparar el envío de un giro | §6.2 |
| `/kiosk/autoservicio/giros/cobrar` | Preparar el cobro de un giro | §6.3 |
| `/kiosk/autoservicio/tasas` | Tasas del día de la sede, solo consulta | **FR-AS-NAV-2** |

Toda ruta muestra la pantalla de vinculación mientras el kiosco no esté vinculado (**FR-AS-LINK-1**) y «no disponible» si su sede no atiende (**FR-AS-SEDE-2**). La de un servicio que la sede no ofrece responde «no encontrada» (**FR-AS-SEDE-3**).

**FR-AS-NAV-2 · Tasas.** Consulta pura: no produce solicitud ni lleva a ningún flujo. Muestra el tablero **de la sede del kiosco**, el mismo que la pantalla informativa (Pantalla **FR-PANT-TASAS-1**): compra y venta en CUP de cada moneda con tasa en vigor. Solo existe si la sede ofrece Cambio de moneda. Si la sede no tiene ninguna tasa en vigor, lo dice en lugar de enseñar un tablero vacío.

### 1.3 Lo que decide la sede

**FR-AS-SEDE-1 · Todo es de su sede.** El nombre de la cabecera, los servicios del inicio, las tasas del cambio, las monedas y la tarifa de los giros y la sede de cada solicitud son los de la sede a la que está vinculado el kiosco. El kiosco no guarda nada de eso: lo pregunta a la red en cada petición.

**FR-AS-SEDE-2 · Sede que no atiende.** Si la sede está suspendida, no tiene operador o su operador está suspendido, el kiosco muestra **«El autoservicio no está disponible»**, con la sede en la cabecera y sin «Inicio», catálogo ni flujos. No dice el motivo. Vuelve solo al inicio en cuanto la sede atiende.

**FR-AS-SEDE-3 · Servicios.** El inicio ofrece solo los servicios que PuntoCash tiene habilitados en la sede, de los tres del kiosco. Un servicio deshabilitado no aparece, y su ruta responde «no encontrada». Si la sede no ofrece ninguno, el inicio lo dice, con la misma pantalla de **FR-AS-SEDE-2**.

**FR-AS-SEDE-4 · Cambios sin tocar el kiosco.** El kiosco vuelve a preguntar a la red cada pocos segundos (en la implementación, 3 s) si sigue vinculado, si su sede atiende y qué servicios tiene, y se vuelve a pintar si algo cambió. Lo que el cliente estuviera preparando y ya no se pueda atender se descarta sin generar código. Al registrar, el servidor lo comprueba de nuevo (**FR-AS-DOM-13**).

**Ver en la demo:** con el kiosco de Vedado, en otra pestaña entrar en Super Admin como `emarrero@puntocash.com` y deshabilitar Remesas en PuntoCash Vedado: en unos segundos el inicio del kiosco deja de ofrecerla. Suspender la sede: el kiosco pasa a «no disponible».

---

## 2. Vinculación del equipo

El cliente nunca se identifica, pero el equipo sí tiene sesión, y sin ella no funciona. La crea el administrador de la sede al **vincular** el kiosco desde su consola.

**FR-AS-LINK-1 · Sin vincular.** Mientras el kiosco no tiene sesión de equipo, cualquier ruta muestra la **pantalla de vinculación**: ni catálogo, ni «Inicio», ni forma de preparar una solicitud **[RP-15]**.

**FR-AS-LINK-2 · Pantalla de vinculación.** Dice que el kiosco todavía no pertenece a ninguna sede y que el administrador de la sede lo vincula desde **Equipos** en su consola. Muestra a la vez un **código QR** y un **código de seis cifras** agrupado de tres en tres («482 913»), el identificador del kiosco (`KIO-NNNN-NNNN`) y la cuenta atrás de renovación.

**FR-AS-LINK-3 · Reto.** El QR y el código son dos formas del mismo **reto de vinculación**, que emite el servidor y vale 10 minutos. Al caducar, el kiosco pide otro sin intervención de nadie. Un reto caducado o ya usado no vincula; la caducidad se comprueba otra vez al canjearlo (**FR-AD-EQ-22**).

**FR-AS-LINK-4 · Quién vincula.** El **administrador de la sede**, desde **Equipos → Vincular un equipo**: escribe el código o escanea el QR y elige a cuál de sus sedes pertenece el kiosco. Solo puede vincularlo a sedes que administra (**FR-AD-EQ-7**, **FR-AD-EQ-17** a **EQ-24**). PuntoCash ve los kioscos de toda la red, pero no los vincula ni los desvincula.

**FR-AS-LINK-5 · Al vincularse.** Sin que nadie lo toque, el kiosco deja la pantalla de vinculación y muestra el inicio de su sede. El vínculo **lo recuerda el equipo** y sobrevive a recargas y reinicios.

**FR-AS-LINK-6 · Desvincular.** El administrador puede desvincularlo desde su consola en cualquier momento. En la siguiente comprobación (**FR-AS-SEDE-4**), el kiosco descarta lo que el cliente estuviera preparando, sin generar código, y vuelve a la pantalla de vinculación con el aviso **«Este kiosco fue desvinculado»**, que nombra la sede anterior. Las solicitudes ya generadas siguen siendo válidas en caja.

**FR-AS-LINK-7 · Credencial.** La identidad del equipo la emite el servidor al vincular y la revoca al desvincular; viaja en una cookie `httpOnly`, limitada a `/kiosk/autoservicio`, que el navegador no puede leer ni escribir. El terminal nunca se vincula a sí mismo ni elige su sede. Una petición con una credencial revocada se trata como la de un kiosco sin vincular.

**FR-AS-LINK-8 · No es una sesión de persona.** No identifica a nadie, no tiene cierre de sesión ni segundo factor **[R13]**. La protege que solo un administrador autenticado puede crearla o revocarla.

**Ver en la demo:** en un navegador sin vincular, abrir `/kiosk/autoservicio`. Para no tener que vincular, la pantalla ofrece **«Demostración · usar un kiosco ya vinculado»**. Para vincular de verdad: en otra pestaña, entrar en Admin como `marta@malecon-sf.cu` → Equipos → Vincular un equipo, escribir el código y elegir la sede. Para ver el aviso de **FR-AS-LINK-6**, desvincular el kiosco desde Equipos.

---

## 3. Inicio — `/kiosk/autoservicio`

**FR-AS-HOME-1** Solo información pública: los servicios de la sede y la consulta de tasas. Ningún saldo, historial ni dato de cliente.

**FR-AS-HOME-2** Cada servicio lleva a su flujo. «Consultar tasas» tiene un tratamiento distinto, más sutil, porque no produce solicitud.

**FR-AS-HOME-3** El catálogo del kiosco es fijo, Cambio de moneda, Cobrar remesa y Giros, y no crece con el de Worker.

**FR-AS-HOME-4 · Por sede.** De esos tres, solo los habilitados en la sede (**FR-AS-SEDE-3**). «Consultar tasas» aparece solo con Cambio de moneda.

**Ver en la demo:** el kiosco de Vedado ofrece los tres servicios; uno vinculado a PuntoCash Matanzas, que no cambia moneda, ofrece Remesas y Giros, sin tasas (vincularlo desde Admin como `rortega@caribecambios.cu`).

---

## 4. Cambio de moneda — `/kiosk/autoservicio/cambio-moneda`

Pasos: **Cambio → Tus datos → Revisión**, y la solicitud (§7).

**FR-AS-CM-1 · Modo.** El cliente elige qué sabe del cambio:

| Modo | Qué escribe | Qué calcula el sistema |
| --- | --- | --- |
| **Sé cuánto voy a entregar** (por defecto) | El monto que trae, en la moneda que entrega | Lo que recibe |
| **Sé cuánto quiero recibir** | El monto que quiere, en la moneda que recibe | **El menor monto a entregar** que llega a lo pedido, múltiplo de la denominación más pequeña de la moneda que entrega. Puede recibir unos céntimos más. El campo de lo que entrega no se edita |

Es la misma regla que en caja (Worker **FR-CM-1**). Cambiar de modo vacía el monto.

**FR-AS-CM-2 · Monedas y tasas.** Las monedas son las que la sede puede cotizar con sus **tasas en vigor**, el peso cubano primero; los pares y las tasas, los mismos que aplicaría una caja de la sede (Worker **FR-CM-2**, **FR-CM-3**). Un botón intercambia las dos monedas. La pantalla dice que usa las tasas de hoy en esa sucursal.

**FR-AS-CM-3 · Monto.** Acepta las dos convenciones de separadores. Vacío no es un error: «Continuar» queda apagado. Se rechazan, con su mensaje mientras se escribe, el monto no interpretable, el cero o negativo y, en «Sé cuánto voy a entregar», el que tiene fracciones menores que la denominación más pequeña de la moneda que entrega. Si con ese monto no sale ninguna cantidad que recibir, se dice que es demasiado pequeño. Con un monto rechazado no se enseña ninguna cifra calculada.

**FR-AS-CM-4 · Cotización.** Se cotiza mientras se escribe y se muestra lo que entrega, lo que recibe y la tasa aplicada. «Continuar» fija la cotización para los pasos siguientes. Es una referencia para el cliente: la caja vuelve a cotizar con la tasa del momento (Worker **FR-SOL-6**).

**FR-AS-CM-5 · Sin billetes.** El kiosco no comprueba la caja: no sabe qué billetes tiene. El paso dice que **la cifra que recibe la confirma la caja** al entregarle el dinero, y que si no tiene los billetes exactos puede redondearla a la baja o pagar una parte en CUP (Worker **FR-EF-11**).

**FR-AS-CM-6 · Tus datos.** El formulario de contacto (§8). No busca ni registra un cliente.

**FR-AS-CM-7 · Revisión.** El cambio (entregas, recibes, tasa aplicada), los datos del solicitante y el aviso **«Esto todavía no es una operación»**: en caja se aplica la tasa del momento en que le atiendan.

**FR-AS-CM-8 · Generar código.** Se deshabilita durante el envío. El servidor **vuelve a cotizar** con las tasas en vigor de la sede, en el mismo modo y con el mismo monto pedido. Si lo que entrega o lo que recibe ya no coincide, o el monto ya no se puede pagar, **no registra nada**: el kiosco vuelve al paso «Cambio» con las cifras nuevas y el aviso **«La tasa cambió mientras preparabas tu solicitud»**. Si coincide, registra la solicitud con el modo, el monto pedido, la cotización del servidor y los datos del cliente (**FR-AS-DOM-12**).

**FR-AS-CM-9** Salir con datos introducidos pide confirmación. Los valores iniciales del primer paso no cuentan como datos.

**FR-AS-CM-10 · Solicitud.** Servicio, entregas, recibes, tasa aplicada, a nombre de quién y, como «Importante», que la caja confirma la cifra al entregar el dinero, según sus billetes.

**Ver en la demo:** con el kiosco de Vedado, «Sé cuánto quiero recibir», de CUP a USD, 100 USD: el monto a entregar sale múltiplo de 1 CUP. «Sé cuánto voy a entregar», 1000,50 CUP: rechazado por no poderse pagar en billetes. Para la tasa cambiada: con el cliente en la revisión, cambiar la tasa del USD en Admin → Tasas y pulsar «Generar código».

---

## 5. Cobrar remesa — `/kiosk/autoservicio/remesas`

Pasos: **Código → Revisar**, y la solicitud.

**FR-AS-RM-1 · Solo el código.** La remesa se alcanza solo por su código exacto, con la misma búsqueda que la caja y el mismo rechazo indistinguible **[R4]**. El panel lateral explica de dónde sale el código, sin otra vía de búsqueda.

**FR-AS-RM-2** Un rechazo dice «Remesa no encontrada» y conserva el código para otro intento.

**FR-AS-RM-3 · Revisar.** Solo beneficiario y monto a cobrar: el cliente confirma que reconoce su remesa.

**FR-AS-RM-4 · Generar código.** Registra la solicitud con el código y la remesa tal como la devolvió el proveedor (**FR-AS-DOM-12**).

**FR-AS-RM-5** Localizarla aquí no la paga ni cambia su estado: el pago solo ocurre en caja.

**FR-AS-RM-6 · Antes del código.** La revisión avisa de que **hay que presentar el carné de identidad en caja**, que el trabajador lo fotografía por las dos caras antes de entregar y que sin él no se entrega (Worker **FR-CARNE-1**), y de que la cifra la confirma la caja según sus billetes (**FR-AS-CM-5**). La solicitud lleva la línea «Trae: Tu carné de identidad».

**Ver en la demo:** código `RM-7X82-9KLM`.

---

## 6. Giros

### 6.1 Selector — `/kiosk/autoservicio/giros`

**FR-AS-GS-1** Dos opciones del mismo nivel, Enviar giro y Cobrar giro, sin datos, listados ni sugerencias **[R4]**.

### 6.2 Enviar giro — `/kiosk/autoservicio/giros/enviar`

Pasos: **Remitente → Beneficiario → Monto → Revisión**, y la solicitud.

**FR-AS-GE-1 · Remitente.** El formulario de contacto (§8).

**FR-AS-GE-2 · Beneficiario.** Nombre completo, teléfono, dirección, provincia, municipio y carné de identidad, todos obligatorios. Municipio depende de la provincia, con el mismo catálogo que la caja. Sin correo.

**FR-AS-GE-3** El carné del beneficiario es obligatorio porque lo exige el giro que registrará la caja: sin él, la solicitud no llegaría completa.

**FR-AS-GE-4 · Monto.** El cliente elige qué sabe del giro:

| Forma | El cliente escribe | Se calcula | En la solicitud |
| --- | --- | --- | --- |
| **Sé cuánto debe recibir** (por defecto) | Lo que recibe el beneficiario | Tarifa de ese importe; el total es la suma | `forma: "llegar"` |
| **Sé cuánto voy a entregar** | Lo que entrega | El **mayor giro** que, sumándole su tarifa, no pasa de lo entregado; lo que sobra se le devuelve | `forma: "enviar"` |

Es la misma regla, con la misma tarifa, que en caja (Worker **FR-GE-16**, Super Admin **FR-SA-TAR-3**, **TAR-7**). La moneda se elige entre las de la sede **que tienen tarifa de giros**. El método es siempre Recogida y no se presenta como elección.

**FR-AS-GE-8 · La cuenta, mientras se escribe.** Junto al monto: **recibe el beneficiario**, **tarifa** (con su desglose si lleva porcentaje: «150,00 CUP + 1 %»), **total a entregar** y, si sobra algo, cuánto se le devuelve y por qué («con un giro de X tendrías que entregar Y»). Una línea dice si la tarifa se suma a lo que entrega o se descuenta de ello.

**FR-AS-GE-9 · Rechazos del monto,** mientras se escribe y con «Continuar» apagado: monto no válido; no pagable con las denominaciones de la moneda; por debajo del giro mínimo, y en «Sé cuánto voy a entregar», además, cuánto tiene que entregar como mínimo; moneda sin tarifa en la sede. Con un monto rechazado no se enseña ninguna cuenta.

**FR-AS-GE-5 · Revisión.** Remitente, beneficiario con su carné, la cuenta de **FR-AS-GE-8** y el aviso «Esto todavía no es una operación».

**FR-AS-GE-6 · Generar código.** Se deshabilita durante el envío. El servidor **vuelve a calcular** el giro con la tarifa vigente y la misma forma e importe. Si lo que recibe el beneficiario o el total ya no coincide, o la moneda se quedó sin tarifa, **no registra nada**: el kiosco vuelve al paso «Monto» con la cuenta nueva y el aviso **«La tarifa cambió mientras preparabas tu solicitud»**. Si coincide, registra la solicitud con la forma y la cuenta del servidor: giro, tarifa y total (**FR-AS-DOM-12**).

**FR-AS-GE-7 · Solicitud.** Remitente, beneficiario, provincia y municipio, recibe el beneficiario, tarifa y total a entregar. Sin código de giro: ese código solo nace cuando la caja lo registra ante el proveedor (Worker **FR-GE-13**).

**Ver en la demo:** «Sé cuánto debe recibir», 500 EUR → tarifa 11,00, total 511,00. «Sé cuánto voy a entregar», 9.000 CUP → recibe 8.850. «Sé cuánto voy a entregar», 5 USD → avisa del mínimo y de que hay que entregar al menos 13 USD.

### 6.3 Cobrar giro — `/kiosk/autoservicio/giros/cobrar`

Pasos: **Código → Revisar**, y la solicitud. Las mismas reglas que Cobrar remesa (**FR-AS-RM-1** a **RM-3**, **RM-5**) sobre la búsqueda de giros por código: solo el código exacto **[R4]**, un único «Giro no encontrado», revisión con beneficiario y monto. Cobrar un giro no lleva tarifa (Worker **FR-GC-8**).

**FR-AS-GC-1 · Generar código.** Registra la solicitud con el código y el giro tal como lo devolvió el proveedor (**FR-AS-DOM-12**).

**FR-AS-GC-2 · Antes del código.** Los mismos avisos que **FR-AS-RM-6**: carné en caja y cifra confirmada por la caja. La solicitud lleva «Trae: Tu carné de identidad».

**Ver en la demo:** código `TR-260901-000245`.

---

## 7. La solicitud — resultado común

**FR-AS-TKT-1 · Contenido.** Todo flujo termina en la misma pantalla: «Solicitud lista», el código, «Válido hasta las…» con la hora de generación, y el resumen propio del servicio (**FR-AS-CM-10**, **FR-AS-RM-6**, **FR-AS-GE-7**, **FR-AS-GC-2**).

**FR-AS-TKT-2 · Qué hacer.** Dice que se presente en cualquier caja **de la sede del kiosco** con el código, que un trabajador completará la operación con lo que ya registró y que lleve su carné de identidad.

**FR-AS-TKT-3 · Acciones.** **«Imprimir código»** (principal) y **«Nueva solicitud»**, que vuelve al inicio. Imprimir produce un papel, nunca un archivo **[R11]**; se puede imprimir más de una vez y no es obligatorio: el código en pantalla vale lo mismo.

**FR-AS-TKT-4 · Fallo de impresión.** Sin papel, impresora apagada o ausente: el aviso **«No se pudo imprimir»** dice que la solicitud sigue siendo válida y que anote el código o le haga una foto. El código y el resumen siguen en pantalla y se puede reintentar. Un fallo de impresión nunca invalida ni repite la solicitud.

**FR-AS-TKT-5 · El papel.** Marca PuntoCash, «Solicitud de autoservicio», la sede, el código destacado, la hora de validez y la de generación, el mismo resumen que la pantalla y el texto de que se presente en caja con el código y su carné, y de que **no es un comprobante**: todavía no se ha hecho ningún pago ni cambio (**RP-8**).

---

## 8. Formulario de contacto

**FR-AS-FORM-1 · Campos.** Lo usan «Tus datos» del cambio y «Remitente» del giro: tipo y número de documento, nombre, primer apellido, segundo apellido (opcional) y teléfono.

**FR-AS-FORM-2 · Escanear el carné.** Atajo opcional: leer el QR del carné de identidad cubano con el lector de la terminal. El cliente puede escribir sus datos sin usarlo.

**FR-AS-FORM-3 · Estados del escaneo,** cada uno dicho en texto y no solo con color: invitación a escanear; esperando el carné, con «Cancelar»; datos cargados, con «Escanear de nuevo»; lectura fallida, con «Reintentar».

**FR-AS-FORM-4 · Qué rellena.** Tipo y número de documento, nombre y apellidos; nunca el teléfono, que no está en el QR. Todo sigue editable. Lo leído sigue siendo autodeclarado: no sustituye la verificación en caja **[R5]**.

**FR-AS-FORM-6** «Continuar» exige los campos obligatorios; los errores se muestran al intentar continuar.

**FR-AS-FORM-7** Un aviso permanente dice que los datos no quedan registrados todavía y solo sirven para identificar la solicitud en caja.

---

## 9. La solicitud en la red

**FR-AS-DOM-1 · No es una operación.** No mueve efectivo, no toca ninguna caja, no tiene confirmación de proveedor propia y no aparece en el historial de operaciones.

**FR-AS-DOM-2 · Código y vigencia.** Código `KS-AAMMDD-NNNNNN`, con la fecha de Cuba, distinto de los prefijos `PC-`, `RM-` y `TR-`. Vence **30 minutos** después de generarse.

**FR-AS-DOM-3** Vencida, no se recupera en caja, aunque siga guardada.

**FR-AS-DOM-4 · Consumo.** Se marca consumida cuando un trabajador la canjea desde Buscar solicitud, no al generarla ni al confirmar la operación. Consumida, no se vuelve a recuperar, aunque la operación en caja se cancele **[R6]**.

**FR-AS-DOM-7 · De la red.** La solicitud queda registrada en el servidor, con todo lo preparado, su creación, su vencimiento y su consumo, y se recupera desde **cualquier caja de la misma sede**.

**FR-AS-DOM-8 · Código único.** Lo asigna el servidor al registrar, nunca el terminal. Dos kioscos que generan a la vez no reciben el mismo código.

**FR-AS-DOM-9 · Canje.** Comprobar y consumir son **un solo acto** del servidor, que vuelve a comprobar vigencia, consumo y sede: si dos cajas canjean el mismo código a la vez, una lo consigue y la otra recibe «ya utilizada» **[R6]**. Entre que el trabajador la lee y pulsa «Continuar» pudo vencer o canjearla otra caja; entonces se dice el motivo y no se abre el flujo (Worker **FR-SOL-5**).

**FR-AS-DOM-10 · Reloj.** El vencimiento se evalúa con el reloj del servidor, nunca con el del kiosco ni el de la caja.

**FR-AS-DOM-11 · Sede y kiosco.** Cada solicitud guarda la sede y el kiosco que la generaron, tomados del vínculo del equipo, nunca de lo que envíe el terminal. **Solo se canjea en una caja de esa sede**: en otra, se rechaza nombrando la sede donde se preparó.

**FR-AS-DOM-12 · Qué guarda cada servicio.**

| Servicio | Datos |
| --- | --- |
| `cambio-moneda` | Modo (`cambiar` o `recibir`), monto pedido, la cotización del servidor (monedas, importes, tasa) y los datos del cliente |
| `remesas` | Código y la remesa tal como la devolvió el proveedor |
| `giros-enviar` | Remitente, beneficiario, moneda, importe escrito, forma (`llegar` o `enviar`) y la cuenta del servidor: giro, tarifa y total |
| `giros-cobrar` | Código y el giro tal como lo devolvió el proveedor |

**FR-AS-DOM-13 · Al registrar.** El servidor comprueba que el kiosco sigue vinculado, que su sede atiende y que ofrece el servicio. Si no, no registra nada y el kiosco se vuelve a pintar con lo que corresponda (§1.3, §2). Después, en el cambio y en el envío de giros, vuelve a cotizar (**FR-AS-CM-8**, **FR-AS-GE-6**).

**FR-AS-DOM-14 · Motivos de rechazo en caja.** Los ve el trabajador, no el cliente, y se distinguen (Worker **FR-SOL-3**):

| Motivo | Cuándo |
| --- | --- |
| `no-encontrada` | Ningún código coincide |
| `otra-sede` | Se preparó en el kiosco de otra sede |
| `usada` | Ya se canjeó |
| `vencida` | Pasaron los 30 minutos |

**Ver en la demo:** generar un código en el kiosco de Vedado y buscarlo en Worker con `jperez` (Vedado): se recupera. Buscarlo con `mrivas` (Obispo): «Esta solicitud es de otra sucursal». Volver a buscarlo en Vedado tras canjearlo: «ya fue utilizada».

---

## 10. Condiciones conocidas

**FR-AS-IMP-2 · Tamaño de la terminal.** No está fijado por el negocio. El kiosco usa la referencia de escritorio (**FR-AS-SHELL-4**); cuando se fije, se revisa y, si hace falta, se adapta como se adaptó la pantalla informativa.

**FR-AS-IMP-3 · «Inicio» sin confirmación.** El «Inicio» de la cabecera vuelve al inicio sin pedir confirmación, a diferencia de «Cancelar», que la pide si hay datos introducidos (**FR-AS-SHELL-3**, **FR-AS-CM-9**): quien lo toca a mitad de un flujo pierde lo preparado sin aviso.

**FR-AS-IMP-4 · Sin reinicio por inactividad.** Un kiosco sin actividad no vuelve solo al inicio.

---

## 11. Para producción

| Asunto | Requisito |
| --- | --- |
| QR de vinculación escaneable, con un token de un solo uso emitido por el servidor, no el código en claro | **FR-AS-LINK-3** |
| Aviso de desvinculación y de cambios de la sede por un canal en vivo, no por sondeo | **FR-AS-SEDE-4**, **FR-AS-LINK-6** |
| Solicitudes en un almacén persistente, con consumo atómico | **FR-AS-DOM-7**, **DOM-9** |
| Impresión directa a la impresora de la terminal, con sus errores | **FR-AS-TKT-4** |
| Lector físico del QR del carné | **FR-AS-FORM-2** |
| Búsqueda de remesas y giros contra los proveedores reales que usa la caja | **FR-AS-RM-1**, **§6.3** |
| Tamaño de la terminal y reinicio por inactividad | **FR-AS-IMP-2**, **IMP-4** |

---

## 12. No especificado

- Anular una solicitud antes de que la canjee una caja.
- Servicios distintos de los tres del catálogo.
- Cualquier identificación del cliente recurrente (cuenta, historial, favoritos).
- La tecnología del cliente de autoservicio en producción (web o aplicación nativa).
- El modelo y el ancho de papel de la impresora.

---

## Apéndice A · Terminología

| Término | Significado |
| --- | --- |
| Kiosco | La terminal táctil de autoservicio de una sede, vinculada a ella |
| Vincular | Lo que hace el administrador de la sede para que un kiosco pertenezca a una de sus sedes |
| Reto de vinculación | El QR y el código de seis cifras que muestra un kiosco sin vincular |
| Solicitud | Lo que el cliente prepara en el kiosco; no es una operación |
| Código de solicitud | `KS-AAMMDD-NNNNNN`, lo que el cliente presenta en caja |
| Canjear | Recuperar una solicitud en caja; la consume |
| Sede que no atiende | Sede suspendida, sin operador o con el operador suspendido |
| Forma | Cómo pidió el cliente el giro: lo que recibe el beneficiario (`llegar`) o lo que entrega (`enviar`) |
| Modo | Cómo pidió el cliente el cambio: lo que entrega (`cambiar`) o lo que quiere recibir (`recibir`) |

## Apéndice B · Demostración

**Arrancar.** La demostración trabaja en memoria: las solicitudes, los vínculos y los cambios de la administración duran hasta reiniciar el servidor.

**Kioscos ya vinculados.** En un navegador sin vincular, **«Demostración · usar un kiosco ya vinculado»** deja elegir uno: *Kiosco entrada · Vedado* y *Kiosco sala de espera · Vedado* (PuntoCash Vedado), *Kiosco entrada · Obispo* (PuntoCash Obispo). Para un kiosco de PuntoCash Matanzas, sin Cambio de moneda, vincular uno nuevo desde Admin como `rortega@caribecambios.cu`, que administra esa sede.

**Vincular.** Admin, `marta@malecon-sf.cu` → Equipos → Vincular un equipo, con el código que muestra el kiosco. El QR de la demostración es ilustrativo y no se puede escanear.

**Escaneo del carné.** Simulado: siempre devuelve el mismo carné de demostración, y la pantalla lo dice en un pie que no existe en producción.

**Impresión.** Usa el diálogo de impresión del navegador, que no informa de fallos de la impresora: el aviso de **FR-AS-TKT-4** no se puede provocar.

**Remesas y giros.** Proveedores simulados en memoria, los mismos que usa Worker. Códigos: `RM-7X82-9KLM`, `TR-260901-000245`.

**Caja.** Para canjear: Worker, `jperez` (PuntoCash Vedado) o `mrivas` (PuntoCash Obispo). Contraseña `puntocash`, código `123456`.

**Pruebas automáticas.** `tests/kiosk-smoke.spec.ts` (11), `tests/solicitudes-de-kiosco-domain.spec.ts` (6) y `tests/worker-solicitud-kiosco.spec.ts` (9). Usan el puesto de prueba con la opción `kiosco`, que vincula un kiosco a la sede copia de Vedado.

## Apéndice C · Mensajes

Lo que ve el cliente. Los textos exactos de cada pantalla están en la demostración.

### Kiosco

| Caso | Mensaje |
| --- | --- |
| Desvinculado | **Este kiosco fue desvinculado.** El administrador lo desvinculó de {sede}. Para volver a usarlo, debe vincularlo de nuevo. |
| Sede que no atiende, o sin servicios | **El autoservicio no está disponible.** En este momento no se pueden preparar operaciones desde este kiosco. Consulta al personal de la sucursal. |
| Sede sin tasas en vigor (tasas) | Esta sucursal no publica tasas de cambio en este momento. |

### Importes

| Caso | Mensaje |
| --- | --- |
| No interpretable | Escribe un monto válido. |
| Cero o negativo | El monto debe ser mayor que cero. |
| No pagable en billetes | No se puede entregar en billetes: usa múltiplos de {denominación} {moneda}. |
| Cambio sin resultado | Este monto es demasiado pequeño para cambiarlo. |
| Giro bajo el mínimo | El giro mínimo es de {mínimo}. (Al entregar un importe: «…: con la tarifa, tienes que entregar al menos {entrega mínima}.») |
| Moneda sin tarifa | En esta sucursal no se envían giros en {moneda}. |
| Tasa cambiada al registrar | **La tasa cambió mientras preparabas tu solicitud.** Estos son los montos con la tasa de ahora. Revísalos antes de continuar. |
| Tarifa cambiada al registrar | **La tarifa cambió mientras preparabas tu solicitud.** |

### Cobros y solicitud

| Caso | Mensaje |
| --- | --- |
| Cifra según los billetes de la caja | La cifra que recibes la confirma la caja al entregarte el dinero. Si no tiene los billetes exactos, puede redondearla hacia abajo o pagarte una parte en pesos cubanos (CUP). |
| Carné en caja | **Presenta tu carné de identidad en caja.** El trabajador confirmará tu identidad y fotografiará tu carné por las dos caras antes de entregarte el efectivo. Sin el carné no se puede entregar. |
| Remesa o giro no encontrado | Remesa no encontrada / Giro no encontrado |
| Fallo de impresión | **No se pudo imprimir.** Tu solicitud sigue siendo válida. Anota el código o tómale una foto y preséntalo en caja. |

Los motivos de rechazo que ve el trabajador al buscar la solicitud están en el FRD de Worker, **FR-SOL-3**.
