# PuntoCash — Aplicación Worker
## Documento de Requisitos Funcionales (FRD) · v1

**Estado:** Línea base de entrega — especifica el comportamiento funcional de la aplicación Worker tal como está implementada actualmente.
**Destinatarios:** Personas desarrolladoras y QA. Utilizable como especificación de implementación y de referencia para aceptación.
**Documento complementario:** `PuntoCash_Worker_PRD_v1.md` (PRD) define el producto, sus usuarios y las reglas de negocio (R1–R12). Este FRD no las repite; las referencia como **[R#]** allí donde un comportamiento existe a causa de una de ellas.

**Cómo leer este documento.** Los requisitos se agrupan por área funcional y se numeran `FR-<área>-<n>`. "Debe" describe comportamiento obligatorio. La terminología sigue el glosario del Apéndice A. Solo se especifica comportamiento implementado; §16 indica lo que queda deliberadamente sin definir.

---

## 1. Comportamiento global del sistema

### 1.1 Shell de la aplicación

**FR-SHELL-1** Toda pantalla Worker autenticada se representa dentro de un único shell: cabecera fija (marca PuntoCash, nombre del trabajador, caja asignada, acceso al perfil y cierre de sesión) y barra lateral fija con exactamente cuatro destinos principales — **Inicio**, **Nueva operación**, **Operaciones**, **Caja**.

**FR-SHELL-2** El destino activo debe marcarse como actual para tecnologías de asistencia, no solo mediante color.

**FR-SHELL-3** Las pantallas no deben representar su propia cabecera ni barra lateral. El inicio de sesión y la recuperación de acceso son las únicas pantallas fuera del shell.

**FR-SHELL-4** La región de contenido principal es el único contenedor con desplazamiento vertical; el shell no se desplaza.

**FR-SHELL-5** Ninguna pantalla debe producir desplazamiento horizontal a nivel de página a 1440px ni a 1280px. Las tablas y diagramas que excedan el ancho se desplazan dentro de su propio contenedor.

### 1.2 Navegación y rutas

**FR-NAV-1** Inventario de rutas y estado:

| Ruta | Función | Estado |
| --- | --- | --- |
| `/worker/login` | Inicio de sesión | Implementada |
| `/worker/recuperar-acceso` | Recuperación de acceso | Solo marcador de posición |
| `/worker/inicio` | Inicio operativo | Implementada |
| `/worker/nueva-operacion` | Catálogo de servicios | Implementada |
| `/worker/nueva-operacion/cambio-moneda` | Cambio de moneda | Implementada |
| `/worker/nueva-operacion/remesas` | Cobrar remesa | Implementada |
| `/worker/nueva-operacion/giros` | Selector de operación de Giros | Implementada |
| `/worker/nueva-operacion/giros/enviar` | Enviar giro | Implementada |
| `/worker/nueva-operacion/giros/cobrar` | Cobrar giro | Implementada |
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

## 2. Autenticación

**FR-AUTH-1** La pantalla de inicio de sesión recoge un identificador (usuario o correo) y una contraseña, y se representa fuera del shell.

**FR-AUTH-2** Ambos campos se validan antes del envío. Cada campo ausente muestra su propio mensaje y el foco se mueve al primer campo que requiere atención.

**FR-AUTH-3** Resultados del envío y comportamiento exigido:

| Resultado | Comportamiento |
| --- | --- |
| Éxito | Mensaje de éxito, formulario bloqueado contra un segundo envío, navegación a `/worker/inicio` |
| Credenciales inválidas | Error a nivel de formulario; el formulario sigue habilitado; el foco vuelve al identificador |
| Cuenta bloqueada | Error a nivel de formulario; **el formulario queda bloqueado** — reintentar no puede resolverlo |
| Error de red | Error a nivel de formulario; el formulario sigue habilitado para reintentar |

**FR-AUTH-4** Durante el envío el formulario se deshabilita, de modo que no pueda enviarse dos veces.

**FR-AUTH-5** Los mensajes de fallo no llevan acción de reintento incorporada; el propio botón de envío es la única acción primaria.

**FR-AUTH-6** El enlace de recuperación de acceso resuelve a una pantalla marcador de posición que devuelve al inicio de sesión. No hay comportamiento de recuperación implementado.

> Comportamiento de demostración actual: cualquier identificador con la contraseña `puntocash` tiene éxito; `bloqueado@puntocash.com` devuelve cuenta bloqueada; `error@puntocash.com` devuelve error de red.

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

Operación de tres pasos: **Cambio → Cliente → Revisión**, seguida de una pantalla de resultado. Un stepper muestra el avance; el resultado no es un paso.

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

**FR-CM-12** Confirmar deshabilita la acción mientras dura el envío, de modo que la operación no pueda crearse dos veces. La confirmación se rechaza si la cotización, el cliente o la comprobación de efectivo dejaron de ser válidos.

**FR-CM-13** En caso de éxito el sistema registra una Operación completada con: la instantánea del cliente, servicio `Cambio de moneda`, estado `Completada`, los importes de origen y destino, la tasa aplicada y la instantánea de caja (antes / movimiento / después) en la moneda de destino **[R9]**.

**FR-CM-14** La pantalla de resultado muestra el código de operación y sus cifras, y ofrece impresión y una vía hacia Operaciones.

**FR-CM-15** Retroceder entre pasos nunca descarta los datos introducidos. Abandonar el flujo con datos significativos introducidos debe pedir confirmación previa; los valores predefinidos no cuentan como datos introducidos.

**FR-CM-16** Cambio de moneda no exige Jornada abierta y no escribe por sí mismo un movimiento de caja; su efecto en efectivo se representa mediante la instantánea de la propia operación y el libro derivado (véase FR-CAJA-12).

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

### 8.3 Libro derivado

**FR-CAJA-12** Además de los movimientos registrados explícitamente, el libro deriva filas de las operaciones completadas: un Cambio de moneda produce dos tramos (una entrada en la moneda de origen y una salida en la de destino, compartiendo el código de operación); toda otra operación de importe único produce un tramo, cuya dirección sigue a la operación — un giro **enviado** es una *entrada*, y tanto un giro **cobrado** como una remesa son *salidas*. Las operaciones que no estén `Completada` no producen fila en el libro.

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
**FR-HIST-4** Los movimientos internos almacenan la Jornada a la que pertenecieron, incluida una que ya se haya cerrado.
**FR-HIST-5** Nada en la aplicación Worker edita ni elimina un registro histórico.

---

## 13. Dependencias funcionales

| Capacidad | Depende de |
| --- | --- |
| Remesas, Enviar giro, Cobrar giro | Jornada abierta; moneda habilitada en esta Caja; proveedor accesible |
| Cobrar remesa / Cobrar giro | Saldo suficiente en la moneda de pago |
| Ajustar efectivo, Arqueo y cierre | Jornada abierta |
| Registrar fondeo inicial | **Ninguna** Jornada abierta |
| Detalle de operación (todas las variantes) | Únicamente un registro almacenado existente |
| Filas del libro derivadas de operaciones | Estado de operación `Completada` |
| Cobro de un giro | Nada de la operación de envío que lo originó — un giro se alcanza solo por su código |

---

## 14. Comportamiento relevante para aceptación

**FR-ACC-1** Los comportamientos anteriores están cubiertos por una batería automatizada de Playwright (451 pruebas al momento de redactar este documento) que abarca: inicio de sesión, inicio, catálogo, los tres servicios, todos los flujos de Caja, el detalle de movimiento, el listado de operaciones y todas las variantes de detalle, más pruebas a nivel de dominio que ejercitan directamente el orden de registro y la aritmética de efectivo.

**FR-ACC-2** Comportamientos críticos para la aceptación — una regresión aquí es un defecto, no una preferencia:
1. Ningún registro local sin éxito externo (FR-RM-7, FR-GC-13).
2. Exactamente un movimiento comercial por operación completada que mueva efectivo, con la dirección y la aritmética correctas (FR-RM-8, FR-GE-12, FR-GC-14).
3. Rechazo indistinguible de código inexistente / coincidencia solo por referencia / tipo de servicio incorrecto (FR-RM-3, FR-GC-5).
4. Un giro `COMPLETED` no puede pagarse dos veces (FR-GC-17).
5. Coherencia motivo/signo en ambos flujos de ajuste (FR-CAJA-18, FR-CAJA-20, FR-CAJA-24).
6. El fondeo inicial sustituye los saldos en lugar de sumarlos (FR-CAJA-9).
7. Los detalles se representan desde la instantánea almacenada y nunca invocan a un proveedor (FR-OPD-2, FR-HIST-3).
8. Ningún enum en bruto ni discriminador interno visible en ningún lugar (FR-OPD-10, FR-EXT-5).
9. Sin desplazamiento horizontal a 1440px ni a 1280px (FR-SHELL-5).

---

## 15. Condiciones conocidas de la implementación

**FR-IMP-1** Esta línea base funciona contra módulos de dominio simulados en memoria, sin backend ni persistencia: los saldos, los movimientos, el estado de la Jornada y las operaciones recién completadas viven en la memoria del navegador durante la sesión. En consecuencia, todo flujo, prueba o demostración que dependa de un estado creado antes en la misma sesión debe navegar mediante enlaces; una carga completa de página restaura el estado inicial precargado.

**FR-IMP-2** Los filtros de fecha relativos se comparan contra el ancla temporal fija de los datos precargados, y no contra el reloj real, de modo que el filtrado se mantiene coherente con independencia del tiempo real transcurrido.

**FR-IMP-3** Los datos de demostración precargados incluyen ambas variantes del detalle de giro (un envío y un cobro, que comparten un mismo código externo de giro), de modo que ambos detalles especializados pueden revisarse sin ejecutar un flujo.

---

## 16. No especificado por este documento

Para todo lo siguiente **no existe requisito funcional alguno y ninguno puede inferirse** — ni de una entrada del catálogo, ni de una pantalla marcador de posición, ni de una ruta existente, ni de un campo sin uso en un contrato de integración:

- Los diez servicios del catálogo marcados como no disponibles.
- Las pantallas Perfil, Tasas y Alertas, y la recuperación de acceso.
- El historial de Jornadas anteriores.
- Permisos, roles, aprobación de supervisor y vigencia de sesión.
- Reportes, analítica y exportaciones.
- Las aplicaciones Kiosk, Branch Admin y Super Admin.

La ausencia de implementación significa que la capacidad aún no ha sido definida funcionalmente: debe diseñarse y aprobarse antes de poder especificarse o construirse.

---

## Apéndice A · Terminología

Se usa de forma consistente en este FRD, en el PRD y en el código. Los términos de dominio en español son el lenguaje del producto y no se traducen.

| Término | Significado |
| --- | --- |
| **Worker / Trabajador** | Empleado de sucursal que opera una caja asignada. |
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
