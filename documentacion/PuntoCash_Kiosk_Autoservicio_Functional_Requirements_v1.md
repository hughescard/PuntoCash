# PuntoCash — Kiosco · Autoservicio
## Documento de Requisitos Funcionales (FRD) · v1.0

**Estado:** Línea base de entrega. Especifica el comportamiento funcional de `/kiosk/autoservicio` tal como está implementado actualmente.
**Destinatarios:** Personas desarrolladoras y QA. Utilizable como especificación de implementación y de referencia para aceptación.
**Alcance:** Únicamente el producto de autoservicio táctil del kiosco (`/kiosk/autoservicio`). La pantalla de señalización no táctil (`/kiosk/pantalla`) se especifica en `PuntoCash_Kiosk_Pantalla_Functional_Requirements_v1.md`.
**Documentos relacionados:** `PuntoCash_Worker_PRD_v1.md` y `PuntoCash_Worker_Functional_Requirements_v1.md` (FRD Worker, v1.2) definen las reglas de negocio **R1–R12** que este documento hereda sin relajar, y especifican la pantalla **Buscar solicitud** (`/worker/nueva-operacion/solicitud`, §7.4 del FRD Worker), que es quien consume lo que este módulo produce. `PuntoCash_PRD_v2.md` sitúa este módulo dentro del producto completo.

**Cómo leer este documento.** Los requisitos se agrupan por área funcional y se numeran `FR-<área>-<n>`. "Debe" describe comportamiento obligatorio. Se referencian reglas del PRD Worker como **[R#]** allí donde un comportamiento existe a causa de ellas. Solo se especifica comportamiento implementado.

---

## 0. Qué es este módulo y qué no es

El kiosco de autoservicio es una pantalla táctil sin operador, situada en la sucursal, donde un cliente **prepara** una operación por sí mismo antes de llegar a caja. Su función es una sola: capturar lo que un Worker tendría que teclear de todas formas, y entregar al cliente un código corto para presentar en caja.

Tres cosas que el kiosco **nunca** hace, por diseño:

1. **No mueve efectivo.** No existe una "caja de kiosco" en el dominio — igual que un Worker necesita una Jornada abierta antes de tocar dinero **[R1]**, el kiosco no tiene ningún concepto equivalente porque nunca tiene la posibilidad de moverlo.
2. **No verifica identidad.** La identidad se verifica físicamente, por una persona **[R5]**. El kiosco solo registra lo que el cliente declara sobre sí mismo; un Worker lo confirma contra el documento físico en caja. Ningún dato capturado aquí se trata como KYC verificado.
3. **No completa ningún servicio.** Una solicitud de kiosco no es una Operación en el sentido del PRD Worker §4: no tiene efecto en caja, no tiene confirmación de proveedor y no aparece en el histórico de Operaciones. Es únicamente la antesala de una operación real, que sigue ejecutándose en Worker.

La pieza que cierra el círculo es **Buscar solicitud** en Worker (§7.4 del FRD Worker): el trabajador introduce el código, recupera lo que el cliente preparó, y continúa la operación real con esos datos precargados — sin repetir el tecleo y sin saltarse ninguna verificación.

---

## 1. Comportamiento global del módulo

**FR-AS-SHELL-1** Toda pantalla de `/kiosk/autoservicio` comparte un shell propio: cabecera fija con la marca PuntoCash y un único acceso permanente, "Inicio", que regresa a `/kiosk/autoservicio`. No hay barra lateral, ni identidad de operador, ni menú — el kiosco no tiene sesión.

**FR-AS-SHELL-2** Ninguna pantalla de flujo representa su propia cabecera; todas heredan el shell de autoservicio.

**FR-AS-SHELL-3** Cada flujo con más de una pantalla expone exactamente una acción de salida explícita ("Cancelar"), consistente con el principio de un solo escape por pantalla ya establecido en Worker (PRD Worker §17).

**FR-AS-SHELL-4** Referencia de tamaño de pantalla: heredada sin modificar del shell de escritorio de Worker (1440×900, mínimo 1280px). **No se ha adaptado a las dimensiones reales de la terminal física de autoservicio**, porque esas dimensiones aún no han sido especificadas por el negocio — ver §9 "Condiciones conocidas".

### 1.1 Rutas

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

**FR-AS-NAV-2** `/kiosk/autoservicio/tasas` no produce ninguna solicitud ni participa en ningún flujo; es una vista de consulta pura, alcanzable y abandonable desde el inicio del kiosco.

---

## 2. Inicio del kiosco

**FR-AS-HOME-1** La pantalla de inicio muestra únicamente información pública, apta para cualquier persona que se acerque sin haberse identificado: el catálogo de 3 servicios (Cambio de moneda, Cobrar remesa, Giros) y el acceso de consulta de tasas. No hay saldos, historial ni datos de cliente alguno.

**FR-AS-HOME-2** Cada tarjeta de servicio enlaza a su flujo de preparación. La tarjeta de "Consultar tasas" tiene un tratamiento visual distinto (tono sutil) para diferenciarla de los tres servicios que sí producen una solicitud.

**FR-AS-HOME-3** El catálogo de este módulo es deliberadamente independiente del catálogo de servicios de Worker: solo ofrece los tres servicios que el negocio aprobó para autoservicio, nunca "todo lo que esté implementado en Worker".

---

## 3. Cambio de moneda

Cuatro pasos: **Cambio → Tus datos → Revisión → Solicitud** (código). Un stepper de 3 posiciones muestra el avance; el paso de solicitud no cuenta como paso del stepper.

**FR-AS-CM-1** El cliente elige moneda de origen ("Entregas"), moneda de destino ("Recibes") e introduce el monto de origen. Ambos lados aceptan cualquiera de las dos convenciones de separadores, igual que en Worker.

**FR-AS-CM-2** El sistema cotiza mientras el cliente escribe, mostrando el monto de destino y la tasa aplicada, usando el mismo motor de cotización que usa Worker (`getExchangeQuote`) — nunca una tabla distinta.

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

**FR-AS-TKT-2** El texto siempre indica: "Preséntate en cualquier caja con este código y un trabajador completará la operación con los datos que ya registraste. Lleva tu carné de identidad."

**FR-AS-TKT-3** La única acción disponible es "Nueva solicitud", que regresa al inicio del kiosco. **No hay impresión**: a diferencia de Worker (que sí imprime comprobantes, R11), el kiosco no asume que exista una impresora en la terminal, y no debe prometer una capacidad que no tiene — mismo principio que RP-8 del PRD Worker.

---

## 7. Formulario compartido de contacto (`KioskClientForm`)

**FR-AS-FORM-1** Componente reutilizado por Cambio de moneda (paso "Tus datos") y Giros · Enviar (paso "Remitente"): tipo de documento, número de documento, nombre, primer apellido, segundo apellido (opcional), teléfono.

**FR-AS-FORM-2** Ofrece un atajo opcional: escanear el QR del carné de identidad cubano con el lector de la propia terminal del kiosco. Es explícitamente opcional — el cliente puede seguir tecleando sus datos sin usarlo en ningún momento.

**FR-AS-FORM-3** El escaneo tiene cuatro estados, cada uno anunciado en texto (nunca solo por color): invitación a escanear, esperando el carné (con opción de cancelar), datos cargados con éxito (con opción de "Escanear de nuevo"), y lectura fallida (con opción de "Reintentar"). Un pie de página declara siempre: "Versión de demostración: la lectura del QR se simula y no usa ningún lector real."

**FR-AS-FORM-4** Un escaneo exitoso rellena tipo y número de documento, nombre, primer y segundo apellido — nunca el teléfono, que no figura en el QR del carné y el cliente siempre escribe. Todos los campos, hayan sido rellenados por escaneo o no, permanecen editables.

**FR-AS-FORM-5** El simulador siempre devuelve el mismo carné de demostración; no hay selector de escenarios visible en la interfaz **[mismo principio que FR-EXT del FRD Worker]**.

**FR-AS-FORM-6** Continuar exige los campos obligatorios completos; los errores se muestran al intentar continuar, no mientras el cliente escribe.

**FR-AS-FORM-7** Un aviso permanente indica: "Tus datos no quedan registrados todavía. Solo se usan para identificar tu solicitud en caja."

---

## 8. El dominio de la solicitud de kiosco

**FR-AS-DOM-1** Una solicitud de kiosco (`KioskRequest`) **no es una Operación** (PRD Worker §4): no mueve efectivo, no tiene confirmación de proveedor propia (salvo la que ya trae de una búsqueda de código, en Remesas y Cobrar giro) y no aparece en el histórico de Operaciones de Worker.

**FR-AS-DOM-2** Cada solicitud tiene un código con el formato `KS-yyMMdd-NNNNNN` — visualmente distinto de los prefijos `PC-`, `RM-`, `TR-` que usa Worker — una fecha de creación y una fecha de expiración fijada 30 minutos después de creada.

**FR-AS-DOM-3** Una solicitud vencida deja de ser válida para su recuperación en Worker (§FR-SOL-3 del FRD Worker), aunque siga existiendo en el almacenamiento.

**FR-AS-DOM-4** Una solicitud registra `consumedAt` cuando un Worker la recupera con éxito desde Buscar solicitud — no cuando el cliente la genera, y no cuando la operación en Worker efectivamente se completa. Un código consumido no puede volver a recuperarse **[mismo principio antifraude que R6]**, incluso si la operación posterior en Worker termina cancelándose sin completarse: el consumo marca que el código ya fue presentado en un mostrador, no que la operación tuvo éxito.

**FR-AS-DOM-5** **Persistencia entre pestañas.** El kiosco y Worker se ejecutan en pestañas distintas del navegador durante una demostración, que no comparten memoria de proceso. Por eso las solicitudes se guardan en `localStorage` bajo la clave `puntocash.kiosk.requests`, no en un array en memoria: así un código generado en una pestaña de kiosco es recuperable desde una pestaña de Worker en el mismo navegador. Si `localStorage` no está disponible (modo privado, datos de sitio bloqueados), el módulo recurre a una copia en memoria válida solo para esa pestaña.

**FR-AS-DOM-6** La numeración de secuencia del código continúa a través de pestañas: al generar un código, el sistema relee lo ya almacenado para ese día y numera a partir del máximo existente, en lugar de reiniciar por pestaña.

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
- Impresión de la solicitud (§6, FR-AS-TKT-3).
- Comportamiento ante inactividad prolongada (§9, FR-AS-IMP-4).
- El tamaño real de la terminal física (§9, FR-AS-IMP-2).
