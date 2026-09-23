# PuntoCash — Kiosco · Autoservicio
## Documento de Requisitos Funcionales (FRD) · v1.3

**Estado:** Línea base de entrega. Especifica el comportamiento funcional de `/kiosk/autoservicio` tal como está implementado en la demostración y, donde la demostración simula algo, el requisito real que debe sustituirlo.
**Destinatarios:** Personas desarrolladoras y QA. Utilizable como especificación de implementación y de referencia para aceptación.
**Alcance:** Únicamente el producto de autoservicio táctil del kiosco (`/kiosk/autoservicio`). La pantalla de señalización no táctil (`/kiosk/pantalla`) se especifica en `PuntoCash_Kiosk_Pantalla_Functional_Requirements_v1.md`.
**Documentos relacionados:** `PuntoCash_PRD_v2.md` (v2.4) sitúa este módulo dentro del producto completo y define las reglas de negocio **R1–R13**, que este documento hereda sin relajar. `PuntoCash_Worker_Functional_Requirements_v1.md` (v1.3) especifica la pantalla **Buscar solicitud** (`/worker/nueva-operacion/solicitud`, §7.4), que es quien consume lo que este módulo produce. `PuntoCash_Kiosk_Pantalla_Functional_Requirements_v1.md` (v1.4) §7 especifica el requisito real de tasas, datos de sede y promociones, que también rige `/kiosk/autoservicio/tasas` (FR-AS-NAV-2).

**Cómo leer este documento.** Los requisitos se agrupan por área funcional y se numeran `FR-<área>-<n>`. "Debe" describe comportamiento obligatorio. Se referencian reglas del PRD como **[R#]** allí donde un comportamiento existe a causa de ellas. Los requisitos marcados **"requisito real, pendiente de implementación"** describen lo que el producto debe hacer y la demostración todavía no hace.

---

## Control de cambios

- **v1.3 (2026-09-22):** corrige dos errores de la línea base y cierra el módulo. (1) **El kiosco tiene sesión de dispositivo.** La v1.2 decía que "el kiosco no tiene sesión"; es falso. El cliente nunca se identifica, pero el equipo sí: el administrador de la sede lo vincula desde su panel web escaneando un QR o escribiendo un código de seis cifras que el kiosco muestra, al estilo de los dispositivos vinculados de WhatsApp o Telegram, y puede desvincularlo en cualquier momento. Nuevo §1.1 (FR-AS-LINK-1 a FR-AS-LINK-9); FR-AS-SHELL-1 reescrito; la tabla de rutas pasa a §1.2 y añade el simulador de la demo; §8 añade FR-AS-DOM-11, que asocia cada solicitud a la sede y al kiosco que la generaron. (2) **El kiosco imprime.** La v1.2 decía que el kiosco no imprime porque no asume impresora; la terminal sí tiene impresora. FR-AS-TKT-2 y FR-AS-TKT-3 reescritos; nuevos FR-AS-TKT-4 (fallo de impresión) y FR-AS-TKT-5 (contenido del papel). §0 y §10 actualizados. La demo implementa las dos cosas.
- **v1.2 (2026-09-22):** aplica al módulo completo el mismo criterio que la v1.1 aplicó al tablero de tasas: separar lo que la demostración simula de lo que el producto real debe hacer. §0 añade la advertencia de alcance. FR-AS-CM-2 precisa que la cotización debe usar las tasas de la sede donde está instalado el kiosco. §7 añade **FR-AS-FORM-8** (lector de QR real). §8 marca FR-AS-DOM-5 y FR-AS-DOM-6 como mecanismos de la demostración y añade **FR-AS-DOM-7 a FR-AS-DOM-10**: almacén compartido de solicitudes, códigos únicos, consumo atómico y vigencia evaluada por el sistema, no por el terminal. §10 añade lo que queda sin definir. Referencias actualizadas al PRD vigente (`PuntoCash_PRD_v2.md` v2.3), al FRD Worker v1.3 y al FRD de Pantalla v1.3. Ningún comportamiento de interfaz cambia.
- **v1.1 (2026-09-22):** corrige FR-AS-NAV-2, que describía `/kiosk/autoservicio/tasas` como una simple "vista de consulta" sin aclarar que el tablero de tasas que muestra hoy es un mock fijo (`PUBLIC_RATE_BOARD`), no una fuente que refleje las tasas reales del día en la sucursal. Se añade la referencia al requisito real correspondiente, especificado en `PuntoCash_Kiosk_Pantalla_Functional_Requirements_v1.md` v1.1 §7 (FR-PANT-DATA-3), que gobierna esta página por compartir el mismo origen de datos. Ningún comportamiento de interfaz cambia.

## 0. Qué es este módulo y qué no es

El kiosco de autoservicio es una pantalla táctil sin operador, situada en la sucursal, donde un cliente **prepara** una operación por sí mismo antes de llegar a caja. Su función es una sola: capturar lo que un Worker tendría que teclear de todas formas, y entregar al cliente un código corto para presentar en caja.

Tres cosas que el kiosco **nunca** hace, por diseño:

1. **No mueve efectivo.** No existe una "caja de kiosco" en el dominio — igual que un Worker necesita una Jornada abierta antes de tocar dinero **[R1]**, el kiosco no tiene ningún concepto equivalente porque nunca tiene la posibilidad de moverlo.
2. **No verifica identidad.** La identidad se verifica físicamente, por una persona **[R5]**. El kiosco solo registra lo que el cliente declara sobre sí mismo; un Worker lo confirma contra el documento físico en caja. Ningún dato capturado aquí se trata como KYC verificado.
3. **No completa ningún servicio.** Una solicitud de kiosco no es una Operación en el sentido del PRD §4: no tiene efecto en caja, no tiene confirmación de proveedor y no aparece en el histórico de Operaciones. Es únicamente la antesala de una operación real, que sigue ejecutándose en Worker.

La pieza que cierra el círculo es **Buscar solicitud** en Worker (§7.4 del FRD Worker): el trabajador introduce el código, recupera lo que el cliente preparó, y continúa la operación real con esos datos precargados — sin repetir el tecleo y sin saltarse ninguna verificación.

**Una advertencia de alcance, importante para quien construya el producto real a partir de este documento.** Este FRD describe una línea base construida como demostración de interfaz: pantallas y flujos reales, con datos simulados, para que el equipo de desarrollo vea exactamente cómo debe comportarse el kiosco. Varias piezas funcionan en la demo solo porque todo corre en un mismo navegador, y **no deben reproducirse tal cual**:

| Pieza | En la demostración | En el producto real |
| --- | --- | --- |
| Almacén de solicitudes | `localStorage` del navegador; funciona porque kiosco y Worker son dos pestañas del mismo equipo | Almacén compartido, recuperable desde cualquier caja de la sede (FR-AS-DOM-7) |
| Código `KS-` | Generado en el terminal, numerando a partir de lo que ese navegador tiene guardado | Único en todo el sistema, asignado por el almacén (FR-AS-DOM-8) |
| Consumo y vigencia | Evaluados en el navegador | Atómicos y evaluados por el sistema (FR-AS-DOM-9, FR-AS-DOM-10) |
| Lectura del QR del carné | Simulador que siempre devuelve el mismo carné | Lector físico de la terminal (FR-AS-FORM-8) |
| Cotización y tabla de tasas | Tablas fijas en el código | Tasas de la sede donde está instalado el kiosco (FR-AS-CM-2, FR-AS-NAV-2) |
| Remesas y giros | Proveedores simulados en memoria | Los mismos proveedores reales que usa Worker (FR-AS-IMP-1) |
| Sesión del dispositivo | Guardada en `localStorage`; la vincula y desvincula un simulador del panel del administrador (`/kiosk/simulador-admin`) | Credencial emitida y revocada por el servidor desde el panel real del administrador (FR-AS-LINK-7) |
| QR de vinculación | Ilustrativo: tiene forma de QR pero no se puede escanear; el simulador "escanea" leyendo el reto directamente | QR real con un token de un solo uso (FR-AS-LINK-3) |
| Impresión | Diálogo de impresión del navegador | La aplicación habla directamente con la impresora de la terminal y recibe sus errores (FR-AS-TKT-4) |

Este documento no fija la tecnología del cliente de autoservicio en producción: puede seguir siendo web, como en la demo, o ser una aplicación nativa. Cualquiera que sea, debe cumplir lo marcado como requisito real.

---

## 1. Comportamiento global del módulo

**FR-AS-SHELL-1** Toda pantalla de `/kiosk/autoservicio` comparte un shell propio: cabecera fija con la marca PuntoCash y, cuando el kiosco está vinculado, el nombre de la sede a la que pertenece y un único acceso permanente, "Inicio", que regresa a `/kiosk/autoservicio`. No hay barra lateral, ni identidad de operador, ni menú, ni "Cerrar sesión": el kiosco tiene una sesión de dispositivo (§1.1), no la de una persona. Mientras no está vinculado, la cabecera muestra solo la marca.

**FR-AS-SHELL-2** Ninguna pantalla de flujo representa su propia cabecera; todas heredan el shell de autoservicio.

**FR-AS-SHELL-3** Cada flujo con más de una pantalla expone exactamente una acción de salida explícita ("Cancelar"), consistente con el principio de un solo escape por pantalla ya establecido en los flujos de Worker.

**FR-AS-SHELL-4** Referencia de tamaño de pantalla: heredada sin modificar del shell de escritorio de Worker (1440×900, mínimo 1280px). **No se ha adaptado a las dimensiones reales de la terminal física de autoservicio**, porque esas dimensiones aún no han sido especificadas por el negocio — ver §9 "Condiciones conocidas".

### 1.1 Vinculación del dispositivo

El kiosco no es una terminal sin sesión. Quien lo usa, el cliente, nunca se identifica; pero el equipo sí tiene sesión, y sin ella no funciona. Esa sesión la crea el administrador de la sede al **vincular** el kiosco, con el mismo patrón con que se añade un dispositivo en WhatsApp o Telegram.

**FR-AS-LINK-1** Mientras el kiosco no tiene sesión de dispositivo, cualquier ruta de `/kiosk/autoservicio` muestra la **pantalla de vinculación** en lugar de su contenido. No hay catálogo, ni "Inicio", ni forma alguna de preparar una solicitud **[RP-15]**.

**FR-AS-LINK-2** La pantalla de vinculación dice que el kiosco todavía no pertenece a ninguna sede y que el administrador debe vincularlo desde su panel web, en **Kioscos de autoservicio**. Muestra a la vez las dos vías, sin que haya que elegir entre ellas: **Opción 1**, un código QR para escanear desde el panel en un teléfono o tableta; **Opción 2**, un código numérico de seis cifras, agrupado de tres en tres ("482 913"), para escribirlo en el panel desde cualquier equipo. Muestra además el identificador del kiosco (`KIO-NNNN-NNNN`) y una cuenta atrás: "El código se renueva automáticamente en mm:ss".

**FR-AS-LINK-3** El QR y el código son dos formas del mismo **reto de vinculación**. Un reto vale 10 minutos; al caducar, el kiosco genera otro sin intervención de nadie, de modo que un kiosco que se queda en esta pantalla siempre muestra un reto válido. Un reto caducado o ya usado no vincula. En el producto real, el QR contiene un token de un solo uso emitido por el servidor, no el código en claro.

**FR-AS-LINK-4** Vincular es una acción del **administrador de la sede** desde su panel: escanea el QR o escribe el código y elige a cuál de las sedes que administra pertenece el kiosco. Solo puede vincular kioscos a sedes que administra. El superadministrador de PuntoCash ve los kioscos de toda la red, pero no los vincula ni los desvincula. Si el código no coincide con ningún kiosco pendiente, el panel responde "El código no coincide con ningún kiosco pendiente. Revisa el código que muestra el kiosco."; si caducó, "Ese código caducó. El kiosco ya muestra uno nuevo." La sección del panel se especifica en los documentos de Administración; este requisito fija lo que el kiosco necesita de ella.

**FR-AS-LINK-5** En cuanto el kiosco queda vinculado, sin que nadie lo toque, deja la pantalla de vinculación y muestra el inicio (§2). Desde ese momento todo lo que muestra y produce es de su sede: la cabecera lleva el nombre de la sede (FR-AS-SHELL-1), la cotización y el tablero usan las tasas de esa sede (FR-AS-CM-2, FR-AS-NAV-2) y cada solicitud queda asociada a ella (FR-AS-DOM-11).

**FR-AS-LINK-6** El administrador puede **desvincular** el kiosco en cualquier momento, con confirmación en su panel. El kiosco pierde su sesión al instante: descarta lo que un cliente estuviera preparando, sin generar código, y vuelve a la pantalla de vinculación con un aviso, "Este kiosco fue desvinculado", que nombra la sede anterior. Las solicitudes ya generadas no se ven afectadas y siguen siendo válidas en caja.

**FR-AS-LINK-7 (credencial — requisito real, pendiente de implementación).** La sesión de dispositivo es una credencial que emite el servidor al vincular y que el servidor revoca al desvincular. El terminal nunca se vincula a sí mismo ni elige su sede. Cualquier petición del kiosco con una credencial revocada se rechaza, y el kiosco detecta la revocación por sí solo, sin reinicio manual. Este documento no define la tecnología de la credencial.

**FR-AS-LINK-8** La sesión de dispositivo no es una sesión de trabajo: no identifica a ninguna persona, no tiene cierre de sesión en el kiosco y no le aplica la verificación en dos pasos (R13 rige las sesiones de las personas). Lo que la protege es que solo un administrador autenticado puede crearla o revocarla.

**FR-AS-LINK-9** **En la demostración.** El panel del administrador todavía no existe, así que la demo incluye un simulador en `/kiosk/simulador-admin`, que se abre en otra pestaña del mismo navegador: muestra el kiosco, permite elegir sede y vincular con el código o simulando el escaneo del QR, y desvincular con confirmación. La sesión se guarda en `localStorage` bajo `puntocash.kiosk.device`, y el kiosco reacciona al instante a lo que hace el simulador. El QR es ilustrativo y no se puede escanear; la pantalla de vinculación lo dice en un pie de demostración, y el simulador muestra el código vigente como pista. **Todo esto es mecanismo de la demostración**; en producción rige FR-AS-LINK-7.

### 1.2 Rutas

**FR-AS-NAV-1** Inventario de rutas y estado:

| Ruta | Función | Estado |
| --- | --- | --- |
| `/kiosk/autoservicio` | Inicio del kiosco (catálogo de 3 servicios + consulta de tasas) | Implementada |
| `/kiosk/autoservicio/cambio-moneda` | Preparar Cambio de moneda | Implementada |
| `/kiosk/autoservicio/remesas` | Preparar Cobrar remesa | Implementada |
| `/kiosk/autoservicio/giros` | Selector Enviar / Cobrar | Implementada |
| `/kiosk/autoservicio/giros/enviar` | Preparar Enviar giro | Implementada |
| `/kiosk/autoservicio/giros/cobrar` | Preparar Cobrar giro | Implementada |
| `/kiosk/autoservicio/tasas` | Consulta de tasas del día, de solo lectura | Implementada |
| `/kiosk/simulador-admin` | **Solo demostración.** Simulador de la sección "Kioscos de autoservicio" del panel del administrador (FR-AS-LINK-9) | Implementada; se elimina cuando exista el panel real |

Todas las rutas de `/kiosk/autoservicio` muestran la pantalla de vinculación mientras el kiosco no esté vinculado (FR-AS-LINK-1).

**FR-AS-NAV-2** `/kiosk/autoservicio/tasas` no produce ninguna solicitud ni participa en ningún flujo; es una vista de consulta pura, alcanzable y abandonable desde el inicio del kiosco. El tablero que muestra viene del mismo origen de datos que usa el slide de tasas de `/kiosk/pantalla` — en esta línea base, un mock fijo (`PUBLIC_RATE_BOARD`) que no varía por día ni por sucursal. Eso es una simplificación de esta demostración, no un requisito del producto: el tablero real debe reflejar las tasas vigentes del día en la sucursal, según especifica `PuntoCash_Kiosk_Pantalla_Functional_Requirements_v1.md` §7 (FR-PANT-DATA-3), que rige esta página por igual.

---

## 2. Inicio del kiosco

**FR-AS-HOME-1** La pantalla de inicio muestra únicamente información pública, apta para cualquier persona que se acerque sin haberse identificado: el catálogo de 3 servicios (Cambio de moneda, Cobrar remesa, Giros) y el acceso de consulta de tasas. No hay saldos, historial ni datos de cliente alguno.

**FR-AS-HOME-2** Cada tarjeta de servicio enlaza a su flujo de preparación. La tarjeta de "Consultar tasas" tiene un tratamiento visual distinto (tono sutil) para diferenciarla de los tres servicios que sí producen una solicitud.

**FR-AS-HOME-3** El catálogo de este módulo es deliberadamente independiente del catálogo de servicios de Worker: solo ofrece los tres servicios que el negocio aprobó para autoservicio, nunca "todo lo que esté implementado en Worker".

---

## 3. Cambio de moneda

Cuatro pasos: **Cambio → Tus datos → Revisión → Solicitud** (código). Un stepper de 3 posiciones muestra el avance; el paso de solicitud no cuenta como paso del stepper.

**FR-AS-CM-1** El cliente elige moneda de origen ("Entregas"), moneda de destino ("Recibes") e introduce el monto de origen. Ambos lados aceptan cualquiera de las dos convenciones de separadores, igual que en Worker.

**FR-AS-CM-2** El sistema cotiza mientras el cliente escribe, mostrando el monto de destino y la tasa aplicada, usando el mismo motor de cotización que usa Worker (`getExchangeQuote`) — nunca una tabla distinta. En el producto real, la cotización del kiosco usa las tasas vigentes de **la sede donde está instalado el kiosco**, las mismas con las que cotizaría un Worker de esa sede y las mismas que exhibe el tablero de tasas (FR-PANT-DATA-2 del FRD de Pantalla). En la demostración, el motor usa una tabla fija común a todo el despliegue.

**FR-AS-CM-3** Mensajes de validación del monto: vacío → "Introduce el monto que vas a entregar."; no interpretable → "Introduce un monto válido."; cero o negativo → "El monto debe ser mayor que cero."

**FR-AS-CM-4** Continuar fija la cotización (`commit-quote`). Los pasos posteriores leen esa cotización fijada y nunca vuelven a cotizar dentro del kiosco — pero esa cotización es solo una referencia para el cliente: al llegar a Worker mediante Buscar solicitud, la operación real siempre recalcula una cotización viva antes de registrarse (FR-SOL-6 del FRD Worker), de modo que una tasa que cambió entre el kiosco y el mostrador nunca se hereda como válida.

**FR-AS-CM-5** A diferencia del paso equivalente en Worker, este paso **no** valida saldo de caja: el kiosco no tiene caja. La única condición para continuar es una cotización válida sin error de monto.

**FR-AS-CM-6** El paso "Tus datos" usa el formulario compartido de contacto (§7 `KioskClientForm`): tipo y número de documento, nombre, primer apellido, segundo apellido (opcional aquí, a diferencia de Worker), teléfono. Nunca busca ni registra un `Customer`.

**FR-AS-CM-7** La revisión muestra el cambio (entregas / recibes / tasa aplicada) y los datos del solicitante, con el aviso "Esto todavía no es una operación" advirtiendo que la tasa puede recalcularse si el cliente tarda en presentarse en caja.

**FR-AS-CM-8** "Generar código" registra una solicitud de kiosco (§8) con `service: "cambio-moneda"` y los datos de `{ quote, client }`, y navega a la pantalla de solicitud (§6).

**FR-AS-CM-9** Abandonar el flujo con datos significativos introducidos pide confirmación (§4); los valores predefinidos del paso 1 no cuentan como datos introducidos.

---

## 4. Cobrar remesa

Tres pasos: **Código → Revisar → Solicitud**.

**FR-AS-RM-1** La única forma de alcanzar una remesa es su código exacto **[R4]** — mismo componente de búsqueda (`remittanceProvider.findByCode`) y mismo comportamiento de rechazo indistinguible que usa Worker; el panel lateral explica de dónde sale el código, sin ofrecer ninguna vía de búsqueda alternativa.

**FR-AS-RM-2** Una búsqueda rechazada muestra "Remesa no encontrada" y conserva el código introducido para otro intento.

**FR-AS-RM-3** La pantalla de revisión muestra únicamente beneficiario y monto a cobrar — deliberadamente menos que la revisión equivalente de Worker (que además muestra moneda, método de entrega, referencia y estado), porque en el kiosco no hay ninguna decisión de negocio que tomar sobre esos datos: solo confirmar que el cliente reconoce su propia remesa. Incluye el aviso "Presenta tu documento en caja" **[R5]**.

**FR-AS-RM-4** "Generar código" registra una solicitud con `service: "remesas"` y los datos de `{ code, remittance }` — la instantánea completa de la remesa devuelta por el proveedor, no solo el código, para que Worker no tenga que repetir la búsqueda.

**FR-AS-RM-5** Localizar una remesa aquí no la paga ni cambia su estado en ningún sistema; el pago solo ocurre en Worker.

---

## 5. Giros

### 5.1 Selector

**FR-AS-GS-1** `/kiosk/autoservicio/giros` ofrece exactamente dos tarjetas del mismo nivel — Enviar giro / Cobrar giro — sin ningún dato operativo, listado ni sugerencia **[R4]**, igual que el selector equivalente de Worker.

### 5.2 Enviar giro

Cinco pasos: **Remitente → Beneficiario → Monto → Revisión → Solicitud**.

**FR-AS-GE-1** El paso Remitente usa el mismo formulario compartido de contacto que Cambio de moneda (§7).

**FR-AS-GE-2** El paso Beneficiario captura: nombre completo, teléfono, dirección, Provincia, Municipio (del mismo catálogo fijo que usa Worker, con la misma dependencia Provincia→Municipio) y **el carné de identidad del beneficiario**. Los tres primeros y el carné son obligatorios; no se captura correo del beneficiario (Worker sí lo permite, opcional).

**FR-AS-GE-3** El carné del beneficiario es obligatorio aquí porque el giro real que Worker registrará lo exige (`receiverIdentification`, campo del contrato de creación de transferencia) — sin él, Buscar solicitud no podría entregar un giro completo y listo para confirmar.

**FR-AS-GE-4** El paso Monto captura moneda e importe. El método de entrega es siempre "Recogida", igual que en Worker, y no se presenta como una elección.

**FR-AS-GE-5** La revisión final muestra remitente, beneficiario (incluido el carné) y el monto a enviar antes de generar el código.

**FR-AS-GE-6** "Generar código" registra una solicitud con `service: "giros-enviar"` y los datos de `{ sender, beneficiary, senderCurrency, deliveryAmount }`.

**FR-AS-GE-7** La pantalla de solicitud muestra el código, el beneficiario, Provincia/Municipio y el monto — deliberadamente sin mostrar aún el código del giro en sí, porque ese código no existe todavía: solo se genera cuando Worker registra el giro de verdad ante el proveedor externo (FR-SOL-8 del FRD Worker).

### 5.3 Cobrar giro

Tres pasos: **Código → Revisar → Solicitud**. Mismo patrón que Cobrar remesa (§4), sobre `transferProvider.findTransferByCode` en lugar de `remittanceProvider.findByCode` — código-solo **[R4]**, un único "Giro no encontrado" indistinguible, revisión reducida a beneficiario y monto, aviso de verificación de identidad **[R5]**.

**FR-AS-GC-1** "Generar código" registra una solicitud con `service: "giros-cobrar"` y los datos de `{ code, transfer }` — la instantánea completa del giro.

---

## 6. Pantalla de solicitud (resultado común a los cuatro flujos)

**FR-AS-TKT-1** Todo flujo completado termina en la misma pantalla de resultado (`KioskRequestTicket`): un código de solicitud, su ventana de validez ("Válido hasta las…"), y un resumen de filas propio de cada servicio, compuesto por el flujo que lo invoca.

**FR-AS-TKT-2** El texto siempre indica: "Preséntate en cualquier caja de ‹sede› con este código y un trabajador completará la operación con los datos que ya registraste. Lleva tu carné de identidad.", donde ‹sede› es la sede a la que está vinculado el kiosco.

**FR-AS-TKT-3** La pantalla ofrece dos acciones: **"Imprimir código"** (acción principal) y **"Nueva solicitud"**, que regresa al inicio del kiosco. La terminal de autoservicio tiene impresora, y el papel impreso es lo más cómodo para llevar el código a caja. Imprimir produce solo un papel físico, nunca un archivo descargable **[R11]**. Se puede imprimir más de una vez. Imprimir no es obligatorio: el código en pantalla vale lo mismo.

**FR-AS-TKT-4** Si la impresión falla —sin papel, impresora apagada o ausente—, la pantalla muestra el aviso "No se pudo imprimir. Tu solicitud sigue siendo válida. Anota el código o tómale una foto y preséntalo en caja." El código y el resumen siguen en pantalla y se puede volver a intentar. Un fallo de impresión nunca invalida ni repite la solicitud. En la demostración la impresión usa el diálogo de impresión del navegador, que no informa de fallos de la impresora; la aplicación real habla con la impresora de la terminal y usa sus errores para mostrar este aviso.

**FR-AS-TKT-5** El papel impreso contiene: la marca PuntoCash, "Solicitud de autoservicio", el nombre de la sede, el código de solicitud destacado, la hora de validez y la de generación, el mismo resumen de filas que la pantalla, y el texto "Preséntate en caja con este código y tu carné de identidad. Esto no es un comprobante de operación: todavía no se ha realizado ningún pago ni cambio." El papel no se presenta como comprobante, porque no hay ninguna operación que comprobar (mismo principio que RP-8 del PRD).

---

## 7. Formulario compartido de contacto (`KioskClientForm`)

**FR-AS-FORM-1** Componente reutilizado por Cambio de moneda (paso "Tus datos") y Giros · Enviar (paso "Remitente"): tipo de documento, número de documento, nombre, primer apellido, segundo apellido (opcional), teléfono.

**FR-AS-FORM-2** Ofrece un atajo opcional: escanear el QR del carné de identidad cubano con el lector de la propia terminal del kiosco. Es explícitamente opcional — el cliente puede seguir tecleando sus datos sin usarlo en ningún momento.

**FR-AS-FORM-3** El escaneo tiene cuatro estados, cada uno anunciado en texto (nunca solo por color): invitación a escanear, esperando el carné (con opción de cancelar), datos cargados con éxito (con opción de "Escanear de nuevo"), y lectura fallida (con opción de "Reintentar"). Un pie de página declara siempre: "Versión de demostración: la lectura del QR se simula y no usa ningún lector real."

**FR-AS-FORM-4** Un escaneo exitoso rellena tipo y número de documento, nombre, primer y segundo apellido — nunca el teléfono, que no figura en el QR del carné y el cliente siempre escribe. Todos los campos, hayan sido rellenados por escaneo o no, permanecen editables.

**FR-AS-FORM-5** El simulador siempre devuelve el mismo carné de demostración; no hay selector de escenarios visible en la interfaz **[mismo principio que FR-EXT del FRD Worker]**.

**FR-AS-FORM-6** Continuar exige los campos obligatorios completos; los errores se muestran al intentar continuar, no mientras el cliente escribe.

**FR-AS-FORM-7** Un aviso permanente indica: "Tus datos no quedan registrados todavía. Solo se usan para identificar tu solicitud en caja."

**FR-AS-FORM-8 (lector real — requisito real, pendiente de implementación).** En el producto real, "Escanear QR del carné" usa el lector físico de la terminal de autoservicio, con los mismos cuatro estados de FR-AS-FORM-3 y la misma regla de FR-AS-FORM-4 (nunca rellena el teléfono; todo sigue editable). El pie "Versión de demostración: la lectura del QR se simula…" existe solo en la demo y no debe aparecer en producción. Los datos leídos siguen siendo autodeclarados a efectos del producto: el QR no sustituye la verificación física en caja **[R5]**.

---

## 8. El dominio de la solicitud de kiosco

**FR-AS-DOM-1** Una solicitud de kiosco (`KioskRequest`) **no es una Operación** (PRD §4): no mueve efectivo, no tiene confirmación de proveedor propia (salvo la que ya trae de una búsqueda de código, en Remesas y Cobrar giro) y no aparece en el histórico de Operaciones de Worker.

**FR-AS-DOM-2** Cada solicitud tiene un código con el formato `KS-yyMMdd-NNNNNN` — visualmente distinto de los prefijos `PC-`, `RM-`, `TR-` que usa Worker — una fecha de creación y una fecha de expiración fijada 30 minutos después de creada.

**FR-AS-DOM-3** Una solicitud vencida deja de ser válida para su recuperación en Worker (§FR-SOL-3 del FRD Worker), aunque siga existiendo en el almacenamiento.

**FR-AS-DOM-4** Una solicitud registra `consumedAt` cuando un Worker la recupera con éxito desde Buscar solicitud — no cuando el cliente la genera, y no cuando la operación en Worker efectivamente se completa. Un código consumido no puede volver a recuperarse **[mismo principio antifraude que R6]**, incluso si la operación posterior en Worker termina cancelándose sin completarse: el consumo marca que el código ya fue presentado en un mostrador, no que la operación tuvo éxito.

**FR-AS-DOM-5** **Persistencia en la demostración.** El kiosco y Worker se ejecutan en pestañas distintas del mismo navegador durante una demostración, que no comparten memoria de proceso. Por eso las solicitudes se guardan en `localStorage` bajo la clave `puntocash.kiosk.requests`: así un código generado en una pestaña de kiosco es recuperable desde una pestaña de Worker en el mismo navegador. Si `localStorage` no está disponible (modo privado, datos de sitio bloqueados), el módulo recurre a una copia en memoria válida solo para esa pestaña. **Es un mecanismo de la demostración, no del producto:** en producción el kiosco y cada caja son equipos distintos, y lo que rige es FR-AS-DOM-7.

**FR-AS-DOM-6** En la demostración, la numeración de secuencia del código continúa a través de pestañas: al generar un código, el sistema relee lo ya almacenado para ese día en ese navegador y numera a partir del máximo existente. Dos terminales de kiosco distintos generarían códigos repetidos con este mecanismo; en producción rige FR-AS-DOM-8.

**FR-AS-DOM-7 (almacén compartido — requisito real, pendiente de implementación).** Una solicitud generada en cualquier terminal de autoservicio de una sede debe quedar registrada en un almacén compartido y ser recuperable, mediante Buscar solicitud, desde cualquier caja de esa misma sede — que es lo que la pantalla de solicitud promete al cliente ("Preséntate en cualquier caja", FR-AS-TKT-2). El almacén guarda la solicitud completa (servicio, datos preparados, creación, expiración, consumo) y es el mismo que lee Worker. Este documento no define su tecnología.

**FR-AS-DOM-8 (código único — requisito real, pendiente de implementación).** El código `KS-yyMMdd-NNNNNN` debe ser único en todo el sistema, y lo asigna el almacén compartido en el momento de registrar la solicitud — nunca el terminal por su cuenta. Dos kioscos que generan una solicitud en el mismo instante no pueden recibir el mismo código.

**FR-AS-DOM-9 (consumo atómico — requisito real, pendiente de implementación).** Marcar una solicitud como consumida (FR-AS-DOM-4) debe ser una operación atómica del almacén: si dos cajas intentan recuperar el mismo código a la vez, exactamente una lo consigue y la otra recibe "Esta solicitud ya fue utilizada" **[R6]**.

**FR-AS-DOM-10 (vigencia — requisito real, pendiente de implementación).** La expiración de 30 minutos (FR-AS-DOM-2) se evalúa con el reloj del sistema que custodia el almacén, no con el reloj del terminal de kiosco ni el de la caja, de modo que un equipo con la hora desajustada no pueda alargar ni acortar la validez de un código.

**FR-AS-DOM-11** Cada solicitud registra la sede y el kiosco que la generaron (`branchId`, `deviceId`), tomados de la sesión de dispositivo (§1.1). La sede es la que limita dónde se puede recuperar la solicitud (FR-AS-DOM-7). En la demostración, Worker todavía no tiene sede propia, así que Buscar solicitud no filtra por ella.

---

## 9. Condiciones conocidas de la implementación

**FR-AS-IMP-1** Esta línea base funciona contra los mismos módulos de dominio simulados en memoria que usa Worker (cotización, remesas, giros) — ver FR-IMP-1 del FRD Worker.

**FR-AS-IMP-2** **El tamaño y la orientación reales de la terminal física de autoservicio no han sido especificados por el negocio.** A diferencia de `/kiosk/pantalla` (adaptada explícitamente a TV de 32" y a pantallas verticales — ver su FRD propio), `/kiosk/autoservicio` sigue heredando sin modificar la referencia de escritorio de Worker (1440×900, mínimo 1280px). Cuando el negocio especifique el tamaño real de la terminal, este módulo debe revisarse y, si es necesario, adaptarse de la misma forma que se adaptó la pantalla de señalización.

**FR-AS-IMP-3** El acceso permanente "Inicio" del encabezado del kiosco (§1) navega directamente al inicio **sin** pedir confirmación, a diferencia del botón "Cancelar" de cada flujo, que sí la pide cuando hay datos significativos introducidos (§3–5). Es una inconsistencia conocida y no corregida en esta línea base: un cliente que toque "Inicio" a mitad de un flujo pierde sus datos sin aviso.

**FR-AS-IMP-4** No existe reinicio automático por inactividad. Una terminal de autoservicio sin actividad no vuelve por sí sola al inicio; solo lo hace mediante las acciones explícitas descritas en este documento (Cancelar, Inicio, o generar el código y pulsar "Nueva solicitud").

---

## 10. No especificado por este documento

Para lo siguiente no existe requisito funcional alguno:

- Anular o cancelar una solicitud de kiosco ya generada antes de que un Worker la recupere.
- Cualquier otro servicio distinto de los tres del catálogo (§2).
- Cualquier forma de identificación de cliente recurrente (cuenta, historial de solicitudes propias, favoritos).
- Comportamiento ante inactividad prolongada (§9, FR-AS-IMP-4).
- El tamaño real de la terminal física (§9, FR-AS-IMP-2).
- La tecnología del cliente de autoservicio en producción (web o aplicación nativa) y la del almacén compartido de solicitudes (FR-AS-DOM-7).
- Si una solicitud generada en una sede puede recuperarse en una caja de **otra** sede. Este documento solo exige la recuperación dentro de la misma sede.
- La herramienta de administración con la que la sede declara sus tasas (corresponde a la capa de administración del producto).
- Las pantallas de la sección "Kioscos de autoservicio" del panel del administrador (listado, nombres de los kioscos, historial de vinculaciones). §1.1 fija lo que el kiosco necesita de ella; su diseño corresponde a los documentos de Administración.
- El modelo y el ancho de papel de la impresora de la terminal.
