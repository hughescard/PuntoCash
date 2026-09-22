# PuntoCash — Admin de sede
## Documento de Requisitos Funcionales (FRD) · v1.0

**Estado:** **Especificación de implementación. La aplicación no está construida.** Hoy `/admin` contiene únicamente un README de marcador de posición. Este documento define lo que debe existir, pantalla por pantalla.

**Destinatarios:** Personas desarrolladoras y QA. Utilizable como especificación de implementación y como referencia de aceptación.

**Alcance:** Únicamente la consola del mercante, `/admin`. La consola de PuntoCash se especifica en `PuntoCash_Super_Admin_Functional_Requirements_v1.md`.

**Documentos relacionados:** `PuntoCash_Administracion_PRD_v1.md` define el modelo de negocio, los conceptos de dominio y las reglas **A1–A9** que este documento implementa. `PuntoCash_Worker_PRD_v2.md` define las reglas de producto **R1–R12**, que esta consola hereda sin relajar. `PuntoCash_Worker_Functional_Requirements_v1.md` (v1.2) especifica la aplicación sobre la que esta consola supervisa, y es la fuente de los conceptos Caja, Jornada, Operación, Movimiento y Arqueo que aquí se consultan. `CLAUDE.md` y `PuntoCash_Manual_de_Marca_y_UI_v1.pdf` mandan sobre todo lo visual.

**Cómo leer este documento.** Los requisitos se agrupan por área funcional y se numeran `FR-AD-<área>-<n>`. "Debe" describe comportamiento obligatorio. Se referencian reglas del PRD de Administración como **[A#]** y del PRD de producto como **[R#]** allí donde un comportamiento existe a causa de ellas.

---

## 0. Qué es este módulo y qué no es

`/admin` es la consola con la que un mercante gobierna las sedes que PuntoCash le ha dado en administración. Su trabajo es responder tres preguntas a lo largo del día — *¿qué está pasando ahora en mis sedes?*, *¿hay algo esperándome?*, *¿cómo fue ayer?* — y permitir dos intervenciones muy acotadas cuando la operación se atasca.

Cuatro cosas que esta consola **nunca** hace, por diseño:

1. **No opera caja.** No abre jornadas, no registra operaciones, no ajusta efectivo, no arquea, no imprime comprobantes de operación. Todo eso es Worker, y sigue siéndolo **[A6]**.
2. **No corrige el pasado.** Aprobar, rechazar y forzar un cierre añaden hechos nuevos junto a los del Worker; ninguno modifica, recalcula ni borra lo que el Worker registró **[A7]**, **[R9]**.
3. **No ve fuera de su alcance.** Solo las sedes asignadas al operador de la sesión, en este momento. Ni por navegación, ni por URL, ni por filtro **[A1]**.
4. **No es el producto del mercante.** La marca visible es PuntoCash. El nombre del operador aparece como dato donde es información, nunca como identidad de la aplicación **[A9]**.

---

## 1. Comportamiento global del módulo

### 1.1 Shell

**FR-AD-SHELL-1** Toda pantalla dentro del grupo de rutas con shell debe componer `AppShell` + `AppHeader` + `AppSidebar` + `AppMain` desde `@/components/shell`, sin reimplementar ninguna de esas piezas. Se sigue la misma estructura de grupos de rutas que Worker: `(auth)` para las pantallas sin shell y `(app)` para las que lo llevan.

**FR-AD-SHELL-2** La barra lateral debe contener exactamente ocho entradas, en este orden: **Inicio**, **Sedes**, **Trabajadores**, **Jornadas**, **Aprobaciones**, **Operaciones**, **Tasas**, **Reportes**. La entrada de Aprobaciones debe mostrar un indicador numérico cuando haya solicitudes pendientes dentro del alcance vigente.

**FR-AD-SHELL-3** La cabecera global debe mostrar: la marca **PuntoCash**, el **selector de alcance** (§1.3), el nombre de la persona que ha iniciado sesión, y los accesos de Perfil y Cerrar sesión. Debe mostrar además, como texto secundario y sin tratamiento de marca, el nombre del operador al que pertenece la sesión — es información de contexto, no identidad de producto **[A9]**.

**FR-AD-SHELL-4** La cabecera **no** debe mostrar en ningún caso el logotipo, el color corporativo ni el nombre comercial del operador como marca de la aplicación **[A9]**.

**FR-AD-SHELL-5** Referencia de pantalla: escritorio, 1440×900, mínimo 1280px, igual que Worker. La densidad de tabla de esta consola es mayor que la de Worker, conforme a `src/app/ARCHITECTURE.md`: el Admin lee listados largos, no ejecuta flujos paso a paso.

**FR-AD-SHELL-6** Ninguna pantalla de `/admin` debe contener un flujo por pasos con stepper. Esta consola es de consulta y de decisiones puntuales; los flujos guiados son de Worker y de Kiosco.

### 1.2 Rutas

**FR-AD-NAV-1** Inventario de rutas:

| Ruta | Función |
| --- | --- |
| `/admin/login` | Acceso (sin shell) |
| `/admin/inicio` | Panel consolidado del alcance vigente |
| `/admin/sedes` | Listado de las sedes administradas |
| `/admin/sedes/[id]` | Ficha de una sede |
| `/admin/trabajadores` | Listado de trabajadores |
| `/admin/trabajadores/nuevo` | Alta de trabajador |
| `/admin/trabajadores/[id]` | Ficha y edición de un trabajador |
| `/admin/jornadas` | Listado de jornadas abiertas y cerradas |
| `/admin/jornadas/[id]` | Detalle de una jornada, con arqueo y movimientos |
| `/admin/aprobaciones` | Bandeja de solicitudes pendientes y resueltas |
| `/admin/aprobaciones/[id]` | Detalle y resolución de una solicitud |
| `/admin/operaciones` | Historial consolidado de operaciones |
| `/admin/operaciones/[codigo]` | Detalle de una operación, de solo lectura |
| `/admin/tasas` | Tasa efectiva por sede dentro del rango de PuntoCash |
| `/admin/reportes` | Volumen por sede, servicio, trabajador y día |

**FR-AD-NAV-2** Toda ruta con identificador (`[id]`, `[codigo]`) debe validar que el recurso pertenece al alcance vigente de la sesión **antes** de representar nada. Un recurso existente pero fuera de alcance debe tratarse exactamente igual que uno inexistente: mismo mensaje, mismo estado, sin distinguir un caso del otro **[A1]**, **[RP-14]**.

**FR-AD-NAV-3** El mensaje para ese caso debe ser genérico: "No encontramos lo que buscabas." No debe revelar que el recurso existe pero pertenece a otro operador.

### 1.3 Selector de alcance

**FR-AD-SCOPE-1** La sesión determina el alcance: el conjunto de sedes con asignación vigente al operador de la sesión. El alcance **no es elegible ni editable** por el usuario; el selector solo filtra dentro de él **[A1]**.

**FR-AD-SCOPE-2** El selector debe ofrecer "Todas mis sedes" más una entrada por cada sede del alcance, identificada por código y nombre.

**FR-AD-SCOPE-3** Cuando el alcance contiene una sola sede, el selector no debe representarse; en su lugar la cabecera muestra el código y el nombre de esa sede como texto fijo.

**FR-AD-SCOPE-4** La selección debe persistir mientras dura la navegación y aplicarse a todas las pantallas que muestran datos de sede: Inicio, Jornadas, Aprobaciones, Operaciones, Tasas y Reportes. Sedes y Trabajadores muestran siempre el alcance completo, con la sede como columna.

**FR-AD-SCOPE-5** Al cambiar la selección, los filtros propios de la pantalla activa (fechas, servicio, estado) deben conservarse; solo cambia la sede.

**FR-AD-SCOPE-6** Si una sede deja de estar asignada al operador mientras la sesión está abierta y era la sede seleccionada, la siguiente navegación debe volver a "Todas mis sedes" y avisar: "Ya no administras esa sede."

---

## 2. Acceso

**FR-AD-ACC-1** `/admin/login` reutiliza el patrón visual de `/worker/login`: panel de marca (`BrandPanel`) a un lado y formulario al otro. Cambia el texto de contexto, que debe identificar la consola como "Administración de sede".

**FR-AD-ACC-2** El formulario pide identificador y contraseña. Los mensajes de error deben ser indistinguibles entre usuario inexistente, contraseña incorrecta y usuario desactivado: "Credenciales incorrectas."

**FR-AD-ACC-3** Un usuario válido cuyo operador esté suspendido o dado de baja no debe poder iniciar sesión, y debe recibir el mismo mensaje indistinguible de FR-AD-ACC-2.

**FR-AD-ACC-4** Un usuario válido de un operador activo pero **sin ninguna sede asignada** sí inicia sesión, y aterriza en un Inicio en estado vacío explícito (§3.5). No es un error: es un mercante que aún no tiene nada a su cargo.

**FR-AD-ACC-5** Tras iniciar sesión, la navegación va a `/admin/inicio`.

**FR-AD-ACC-6** `/admin/recuperar-acceso` es un marcador de posición sin comportamiento, igual que en Worker.

---

## 3. Inicio

El panel que responde "¿qué está pasando ahora?". Todo lo que muestra está acotado al alcance vigente **[A1]**.

**FR-AD-HOME-1** Debe encabezar con una fila de métricas del día para el alcance seleccionado: **sedes con jornada abierta** (sobre el total del alcance), **operaciones del día**, **volumen del día** y **aprobaciones pendientes**. El volumen se expresa por moneda, nunca convertido a una moneda única, para no inventar una tasa de consolidación que el negocio no ha definido.

**FR-AD-HOME-2** Debe representar un **panel de atención** con las situaciones que piden acción, en este orden de prioridad: aprobaciones pendientes, jornadas abiertas fuera del horario de su sede, arqueos cerrados con diferencia, y sedes sin jornada abierta dentro de su horario. Cada entrada enlaza a la pantalla donde se resuelve.

**FR-AD-HOME-3** Cuando no hay ninguna situación que atender, el panel debe mostrar un estado tranquilo y explícito ("Todo en orden en tus sedes"), nunca desaparecer: su ausencia y su vacío deben distinguirse a simple vista.

**FR-AD-HOME-4** Debe representar una **tabla de estado por sede**, con una fila por sede del alcance: código y nombre, estado de la jornada (abierta / cerrada / sin abrir), caja o cajas, trabajador en turno, operaciones del día y hora de apertura. Cada fila enlaza a la ficha de la sede.

**FR-AD-HOME-5** Con "Todas mis sedes" seleccionado, la tabla muestra todas las sedes; con una sede concreta, la tabla se reduce a esa sede y se amplía con el detalle de sus cajas.

**FR-AD-HOME-6** Estado vacío de alcance: un operador sin sedes asignadas debe ver un Inicio que lo explique con todas sus letras — "Todavía no tienes sedes asignadas. Cuando PuntoCash te asigne una, aparecerá aquí." — sin métricas en cero ni tablas vacías, que se leerían como un fallo.

---

## 4. Sedes

**FR-AD-SEDE-1** `/admin/sedes` lista las sedes del alcance con: código, nombre, municipio y provincia, estado de la sede, número de cajas, número de trabajadores activos y estado de la jornada de hoy. Siempre muestra el alcance completo, con independencia del selector **[FR-AD-SCOPE-4]**.

**FR-AD-SEDE-2** La lista admite búsqueda por código o nombre y filtro por estado de sede. No admite ninguna acción de creación, edición ni baja **[A3]**.

**FR-AD-SEDE-3** `/admin/sedes/[id]` muestra la ficha de una sede en cuatro bloques: **datos maestros**, **cajas**, **trabajadores** y **jornada en curso**.

**FR-AD-SEDE-4** El bloque de **datos maestros** —código, nombre, dirección, municipio, provincia, teléfono, horario, estado, fecha de alta— es de solo lectura, y debe declararlo de forma visible: "Estos datos los gestiona PuntoCash." No debe haber ningún control de edición, ni siquiera deshabilitado **[A3]**.

**FR-AD-SEDE-5** El bloque de **cajas** lista las cajas de la sede con identificador, estado, trabajador asignado y saldo por moneda si hay jornada abierta. Los saldos son de consulta: ninguna acción de este bloque los modifica **[A6]**.

**FR-AD-SEDE-6** El bloque de **trabajadores** lista los trabajadores asignados a esa sede con nombre, identificador, caja asignada y estado, y enlaza al listado de trabajadores filtrado por la sede.

**FR-AD-SEDE-7** El bloque de **jornada en curso** muestra, si la hay, hora de apertura, trabajador, fondeo declarado, movimientos hasta el momento y enlace al detalle de la jornada. Si no la hay, indica desde cuándo la caja está cerrada y cuál fue la última jornada.

**FR-AD-SEDE-8** La ficha debe mostrar la **asignación vigente** —desde qué fecha el operador administra esa sede— como dato informativo. No muestra el historial completo de asignaciones: ese historial incluye a otros operadores y pertenece al Super Admin **[A1]**.

---

## 5. Trabajadores

La única área donde el Admin crea algo **[A4]**.

**FR-AD-TRAB-1** `/admin/trabajadores` lista los trabajadores de todas las sedes del alcance, con: nombre completo, identificador de acceso, sede, caja asignada, estado (activo / desactivado), fecha de alta y última jornada operada.

**FR-AD-TRAB-2** La lista admite búsqueda por nombre o identificador y filtros por sede y por estado. Por defecto muestra solo los activos, con el filtro visible y modificable.

**FR-AD-TRAB-3** `/admin/trabajadores/nuevo` da de alta un trabajador. Campos: nombre, primer apellido, segundo apellido (opcional), tipo y número de documento, teléfono, identificador de acceso, sede y caja asignada.

**FR-AD-TRAB-4** El selector de sede del alta debe ofrecer **únicamente** sedes del alcance vigente. El servidor debe revalidar esa pertenencia al guardar, no solo la interfaz **[A4]**, **[A1]**.

**FR-AD-TRAB-5** El selector de caja debe ofrecer únicamente cajas de la sede elegida, y debe indicar cuáles ya tienen un trabajador activo asignado. Asignar a una caja ocupada debe ser posible pero debe pedir confirmación explícita, porque una caja puede tener varios trabajadores en turnos distintos.

**FR-AD-TRAB-6** Validaciones y mensajes: campo obligatorio vacío → "Este campo es obligatorio."; identificador de acceso ya existente en la red → "Ese identificador ya está en uso."; número de documento ya registrado como trabajador → "Ya existe un trabajador con ese documento."

**FR-AD-TRAB-7** El alta genera una credencial inicial que se muestra una sola vez al terminar, con instrucción explícita de entregarla al trabajador. No debe poder volver a consultarse después; si se pierde, se regenera.

**FR-AD-TRAB-8** `/admin/trabajadores/[id]` muestra la ficha con sus datos, su sede, su caja, su estado y su actividad reciente (últimas jornadas y volumen operado), y permite editar los datos, reasignar sede o caja dentro del alcance, regenerar credencial y desactivar.

**FR-AD-TRAB-9** **Desactivar** impide al trabajador iniciar sesión, pero no borra ni altera nada de lo que operó **[A7]**. Exige confirmación y motivo escrito, y queda registrado en auditoría.

**FR-AD-TRAB-10** Un trabajador con **jornada abierta** no puede desactivarse. El intento debe rechazarse con: "Este trabajador tiene una jornada abierta en {caja}. Ciérrala antes de desactivarlo." — con enlace directo a esa jornada **[R6]**.

**FR-AD-TRAB-11** Reasignar un trabajador a otra sede tampoco es posible con una jornada abierta, y debe rechazarse con el mismo patrón de mensaje y enlace.

**FR-AD-TRAB-12** Un trabajador desactivado **por este Admin** puede reactivarse. Reactivar exige volver a elegir sede y caja, porque su asignación anterior pudo quedar obsoleta. Un trabajador desactivado por PuntoCash **no** puede reactivarse desde esta consola: la ficha debe explicarlo —"Este trabajador fue desactivado por PuntoCash"— en lugar de ofrecer un control que falla.

---

## 6. Jornadas

**FR-AD-JOR-1** `/admin/jornadas` lista las jornadas de las cajas del alcance con: sede, caja, trabajador, fecha, hora de apertura, hora de cierre, estado (abierta / cerrada / cerrada forzosamente), número de operaciones, número de movimientos y diferencia de arqueo si está cerrada.

**FR-AD-JOR-2** Filtros: rango de fechas, sede, caja, trabajador, estado, y un conmutador "solo con diferencia". Orden por defecto: las abiertas primero, después las cerradas por fecha descendente.

**FR-AD-JOR-3** La diferencia de arqueo debe representarse con el mismo tratamiento semántico que en Worker —signo, color y magnitud— y debe mostrarse por moneda, nunca agregada.

**FR-AD-JOR-4** `/admin/jornadas/[id]` muestra el detalle: cabecera con sede, caja, trabajador, apertura y cierre; fondeo inicial declarado por moneda; saldos actuales o finales por moneda; el **libro de movimientos** de la jornada; y, si está cerrada, el **arqueo** con conteo declarado, saldo esperado y diferencia por moneda.

**FR-AD-JOR-5** El libro de movimientos debe reutilizar la tabla y los filtros de movimientos de Worker (`caja-movements-table`, `caja-movements-filters`) en modo de solo lectura, y cada movimiento debe enlazar a su detalle, también de solo lectura.

**FR-AD-JOR-6** Toda cifra mostrada proviene de la instantánea almacenada de esa jornada y nunca se recalcula contra el estado vivo **[R9]**.

### 6.1 Forzar cierre

**FR-AD-JOR-7** El detalle de una jornada **abierta** ofrece la acción **Forzar cierre**. No aparece en ninguna otra circunstancia.

**FR-AD-JOR-8** La acción debe presentarse con una advertencia previa que explique, sin jerga, qué implica: la caja queda cerrada, el trabajador no podrá seguir operando en ella hasta que abra una jornada nueva, y el cierre quedará marcado como forzado con el nombre del Admin.

**FR-AD-JOR-9** Forzar cierre **exige motivo escrito**, de al menos 10 caracteres. Sin motivo, la acción no se habilita. El motivo no debe tener valor predefinido ni lista de opciones: es una declaración de la persona que asume el cierre **[A6]**.

**FR-AD-JOR-10** Un cierre forzado **no realiza arqueo**. Cierra la jornada dejando constancia de que se cerró sin conteo físico, y el saldo final registrado es el saldo en libros en ese instante. La interfaz debe decirlo con todas sus letras: "Esta jornada se cerrará sin arqueo. La diferencia con el efectivo físico no quedará conciliada."

**FR-AD-JOR-11** Al confirmar, el sistema debe **revalidar** que la jornada sigue abierta. Si el Worker la cerró entretanto, la acción se rechaza con "Esta jornada ya fue cerrada." y la pantalla se actualiza al estado real **[R3]**, **[R6]**.

**FR-AD-JOR-12** El cierre forzado **añade** un hecho nuevo a la jornada —tipo de cierre, admin responsable, sello de tiempo y motivo— y no modifica, recalcula ni elimina ningún movimiento ni operación previos **[A7]**, **[R9]**.

**FR-AD-JOR-13** Una jornada cerrada forzosamente debe distinguirse visualmente de una cerrada por arqueo en todo listado y detalle donde aparezca, y su detalle debe mostrar el motivo declarado y quién lo declaró.

**FR-AD-JOR-14** La acción genera un evento de auditoría **[RP-16]**.

---

## 7. Aprobaciones

**FR-AD-APR-1** `/admin/aprobaciones` es la bandeja de solicitudes del alcance. Dos pestañas: **Pendientes** (por defecto) y **Resueltas**.

**FR-AD-APR-2** Cada fila muestra: tipo (ajuste de efectivo / diferencia de arqueo), sede, caja, trabajador, fecha y hora, moneda e importe, signo de la diferencia, motivo declarado por el Worker y antigüedad de la solicitud.

**FR-AD-APR-3** Las solicitudes pendientes se ordenan de más antigua a más reciente, porque la antigüedad es lo que las vuelve urgentes. Las resueltas, por fecha de resolución descendente.

**FR-AD-APR-4** Filtros: tipo, sede, rango de fechas y trabajador.

**FR-AD-APR-5** `/admin/aprobaciones/[id]` muestra el detalle completo: todos los datos del hecho original tal como el Worker los registró —conteo declarado, saldo esperado, diferencia, motivo, movimiento o arqueo de origen— con enlace al movimiento o a la jornada correspondiente, y el contexto de la jornada en la que ocurrió.

**FR-AD-APR-6** El signo de la diferencia y el motivo declarado por el Worker deben mostrarse juntos y sin reinterpretación, conservando la coherencia que Worker ya exige entre ambos **[R8]**.

**FR-AD-APR-7** El detalle ofrece dos acciones: **Aprobar** y **Rechazar**. Ambas exigen motivo escrito de al menos 10 caracteres.

**FR-AD-APR-8** El motivo del Admin **se añade** al del Worker; no lo sustituye, no lo edita y no lo oculta. Ambos deben quedar visibles en el detalle una vez resuelta **[A7]**, **[R8]**.

**FR-AD-APR-9** **Aprobar** confirma que el hecho queda asumido: el ajuste o la diferencia se dan por buenos y la solicitud pasa a resuelta. **Rechazar** deja constancia de que el Admin no lo asume y marca la solicitud para que el hecho se revise fuera del sistema. Ninguna de las dos modifica el saldo de la caja, el movimiento ni el arqueo original: la solicitud es un acto de gobierno sobre un hecho ya registrado, no una corrección de ese hecho **[A6]**, **[A7]**.

**FR-AD-APR-10** La interfaz debe dejar claro ese límite en el punto de decisión, para que nadie espere un efecto que no ocurre: "Resolver esta solicitud deja constancia de tu decisión. No modifica el saldo de la caja ni el movimiento registrado."

**FR-AD-APR-11** Al confirmar, el sistema debe revalidar que la solicitud sigue pendiente. Si otro usuario del mismo operador la resolvió entretanto, se rechaza con "Esta solicitud ya fue resuelta." y se muestra el estado real **[R3]**, **[R6]**.

**FR-AD-APR-12** Toda resolución genera un evento de auditoría **[RP-16]**.

**FR-AD-APR-13** Estado vacío de Pendientes: "No tienes solicitudes pendientes." — diferenciado visualmente de un filtro que no arroja resultados, que debe decir "Ninguna solicitud coincide con los filtros."

---

## 8. Operaciones

**FR-AD-OPS-1** `/admin/operaciones` lista las operaciones completadas en las sedes del alcance, con: código de operación, fecha y hora, sede, caja, trabajador, servicio, cliente, importe y moneda, y estado.

**FR-AD-OPS-2** Filtros: rango de fechas, sede, caja, trabajador, servicio y estado, más búsqueda por código de operación. Los filtros deben reutilizar el patrón de `operations-filters` de Worker, ampliado con sede, caja y trabajador — dimensiones que en Worker no existen porque allí siempre son una sola **[R12]**.

**FR-AD-OPS-3** `/admin/operaciones/[codigo]` muestra el detalle de una operación **reutilizando las vistas de detalle de Worker** (`operation-detail-view` y las vistas especializadas de cambio de moneda, remesas y las dos variantes de giro) en modo de solo lectura.

**FR-AD-OPS-4** El detalle debe añadir a lo que muestra Worker el contexto que el Admin sí necesita y el Worker no: sede, caja, trabajador que la ejecutó y jornada a la que pertenece, con enlace a esa jornada.

**FR-AD-OPS-5** El detalle **no** debe ofrecer ninguna acción: ni reimprimir, ni anular, ni corregir, ni reenviar al proveedor **[A6]**, **[A7]**.

**FR-AD-OPS-6** Toda cifra y todo dato provienen de la instantánea histórica de la operación, nunca de una consulta viva al proveedor externo ni de un recálculo **[R9]**, **[R2]**.

**FR-AD-OPS-7** Los estados se muestran siempre traducidos, nunca como enum en bruto del proveedor **[R10]**.

---

## 9. Tasas

**FR-AD-TASA-1** `/admin/tasas` muestra, por cada sede del alcance y cada par de monedas habilitado, tres columnas: el **rango permitido por PuntoCash** (mínimo y máximo, de compra y de venta), la **tasa efectiva vigente** de esa sede, y la fecha y autor del último cambio.

**FR-AD-TASA-2** Con una sede seleccionada en el alcance, la pantalla muestra esa sede en detalle y permite editar. Con "Todas mis sedes", muestra la comparativa entre sedes y la edición exige entrar en una sede concreta — cambiar la tasa de varias sedes a la vez no debe ser posible, porque cada sede responde de la suya.

**FR-AD-TASA-3** El rango de PuntoCash es de solo lectura y debe representarse como el límite que es, visualmente presente junto al campo editable, no escondido en un texto de ayuda **[A5]**.

**FR-AD-TASA-4** Al introducir una tasa, la validación debe ser inmediata y el mensaje debe decir el límite concreto: "La tasa de venta debe estar entre 118,00 y 124,00." Una tasa fuera de rango no debe poder guardarse ni por la interfaz ni por el dominio **[A5]**, **[RP-17]**.

**FR-AD-TASA-5** Guardar exige confirmación con un resumen del cambio: par de monedas, tasa anterior, tasa nueva y sede afectada. La confirmación debe advertir que el cambio afecta a las operaciones que se coticen a partir de ese momento, y que **no altera ninguna operación ya registrada** **[R9]**.

**FR-AD-TASA-6** Al confirmar, el sistema debe revalidar el rango vigente. Si PuntoCash lo movió mientras la pantalla estaba abierta, el guardado se rechaza con el nuevo rango a la vista: "PuntoCash cambió el rango permitido. Revisa el valor." **[R3]**.

**FR-AD-TASA-7** Cuando una tasa efectiva ha sido **fijada automáticamente al límite** por un cambio de rango de PuntoCash **[A5]**, la pantalla debe marcarlo de forma destacada, indicar la fecha en que ocurrió y cuál era la tasa anterior, y ofrecer al Admin fijar un valor nuevo dentro del rango actual.

**FR-AD-TASA-8** Todo cambio de tasa efectiva genera un evento de auditoría **[RP-16]**.

**FR-AD-TASA-9** Esta pantalla gobierna la tasa; **no** gobierna comisiones ni cargos por servicio, que son competencia de PuntoCash y no aparecen aquí **[A8]**.

---

## 10. Reportes

**FR-AD-REP-1** `/admin/reportes` presenta el volumen del alcance en cuatro cortes: **por sede**, **por servicio**, **por trabajador** y **por día**. El corte se elige; no se muestran los cuatro a la vez.

**FR-AD-REP-2** Todo reporte se acota a un rango de fechas, con accesos rápidos a hoy, últimos 7 días, últimos 30 días y mes en curso.

**FR-AD-REP-3** Las cifras se expresan **por moneda**, sin convertir a una moneda única. El producto no tiene una tasa de consolidación definida por el negocio, e inventarla produciría cifras que nadie podría defender.

**FR-AD-REP-4** Cada corte muestra número de operaciones e importe por moneda. El corte por día añade una representación temporal; el corte por sede y por trabajador admiten ordenación por cualquier columna.

**FR-AD-REP-5** Toda representación gráfica debe seguir el sistema visual de PuntoCash definido en el manual de marca, y no debe introducir una paleta propia ni elementos decorativos que compitan con las cifras.

**FR-AD-REP-6** Los reportes **no** muestran comisiones, rentas, liquidaciones ni margen **[A8]**. Muestran volumen operado.

**FR-AD-REP-7** Esta versión **no incluye exportación a archivo** **[R11]**, y la interfaz no debe ofrecer ningún control de descarga. Queda pendiente de decisión de negocio (PRD de Administración §9).

---

## 11. Modelo de dominio y datos simulados

**FR-AD-DOM-1** La capa de administración se apoya en un módulo de dominio nuevo, `src/features/network`, con la misma naturaleza que los existentes: datos simulados en memoria, sin backend ni persistencia real.

**FR-AD-DOM-2** El módulo debe exponer, como mínimo: `Operador`, `Sede`, `Asignacion`, `PoliticaTasas` (rango por par de monedas), `SolicitudAprobacion` y `EventoAuditoria`, junto con las funciones de consulta acotadas por alcance y las de escritura que esta consola necesita.

**FR-AD-DOM-3** El dominio de Caja existente (`src/features/caja`) debe ampliarse con el enlace **Caja → Sede**, que hoy no existe. Toda caja debe pertenecer a una sede, y toda consulta de jornadas, movimientos y operaciones debe poder acotarse por sede a través de él.

**FR-AD-DOM-4** El acotamiento por alcance debe resolverse **en el dominio**, no en la interfaz: las funciones de consulta reciben el alcance de la sesión y nunca devuelven registros fuera de él, de modo que una pantalla mal construida no pueda filtrar datos ajenos **[A1]**, **[RP-14]**.

**FR-AD-DOM-5** Los datos simulados deben incluir material suficiente para que las pantallas se vean como se verán en producción: al menos tres operadores, seis sedes repartidas entre ellos de forma desigual (uno con una sola sede, otro con tres), doce trabajadores, jornadas abiertas y cerradas, al menos un arqueo con diferencia, al menos dos solicitudes pendientes y una resuelta, y un historial de operaciones de varios días.

**FR-AD-DOM-6** Al menos un operador de los datos simulados debe tener **una sola sede**, para que el comportamiento del selector de alcance en ese caso (**FR-AD-SCOPE-3**) sea verificable sin construir datos a mano.

---

## 12. Comportamiento transversal

**FR-AD-STATE-1** Toda tabla debe implementar cuatro estados distinguibles: con datos, cargando, vacía por ausencia de datos, y vacía por filtros que no arrojan resultados. Los dos vacíos nunca deben compartir mensaje.

**FR-AD-STATE-2** Toda acción que escribe —crear, editar, desactivar, aprobar, rechazar, forzar cierre, guardar tasa— debe mostrar estado de envío, impedir el doble envío y confirmar el resultado.

**FR-AD-STATE-3** Toda acción irreversible o con consecuencia sobre la operación —desactivar trabajador, forzar cierre, resolver solicitud, cambiar tasa— debe pedir confirmación explícita en un diálogo que resuma qué va a pasar.

**FR-AD-STATE-4** Ningún error debe mostrar jerga interna, códigos de excepción ni nombres de campo del dominio **[R10]**.

**FR-AD-STATE-5** Toda pantalla debe mantener la usabilidad por teclado y la jerarquía de datos financieros que el manual de marca exige, igual que Worker.

---

## 13. Condiciones conocidas y fuera de alcance

- **Nada de esto está implementado.** `/admin` contiene hoy un README de marcador de posición.
- **Sin backend.** Como el resto del producto, se construye contra dominio simulado en memoria; una recarga completa restaura los datos precargados.
- **Sin sub-roles.** El Admin de sede es un rol único e indivisible en esta versión.
- **Sin gestión de cajas.** Las cajas se consultan, no se crean ni se dan de baja.
- **Sin exportación de reportes** **[R11]**, pendiente de decisión de negocio.
- **Sin notificaciones** fuera de la consola.
- **Sin recuperación de acceso** funcional.
- **Sin nada económico**: comisiones, rentas y liquidaciones quedan fuera **[A8]**.
- **Revisión visual obligatoria** antes de dar por terminada cualquier pantalla, a 1440×900, conforme al procedimiento de `CLAUDE.md`.

---

## Apéndice A · Mapa de reglas a requisitos

| Regla | Requisitos que la implementan |
| --- | --- |
| **A1** Aislamiento por alcance | FR-AD-NAV-2, FR-AD-NAV-3, FR-AD-SCOPE-1, FR-AD-TRAB-4, FR-AD-SEDE-8, FR-AD-DOM-4 |
| **A2** Una asignación vigente | FR-AD-SEDE-8 (lectura); la gestión es del Super Admin |
| **A3** Solo PuntoCash crea y asigna sedes | FR-AD-SEDE-2, FR-AD-SEDE-4 |
| **A4** El mercante crea sus trabajadores | FR-AD-TRAB-3 a FR-AD-TRAB-12 |
| **A5** Tasa efectiva dentro del rango | FR-AD-TASA-3, FR-AD-TASA-4, FR-AD-TASA-6, FR-AD-TASA-7 |
| **A6** Supervisa y desbloquea, no opera | FR-AD-SEDE-5, FR-AD-JOR-7 a FR-AD-JOR-9, FR-AD-APR-9, FR-AD-APR-10, FR-AD-OPS-5 |
| **A7** No altera lo del Worker | FR-AD-JOR-12, FR-AD-APR-8, FR-AD-APR-9, FR-AD-TRAB-9, FR-AD-OPS-5 |
| **A8** Sin economía PuntoCash↔mercante | FR-AD-TASA-9, FR-AD-REP-6 |
| **A9** PuntoCash es la marca visible | FR-AD-SHELL-3, FR-AD-SHELL-4 |
| **R3** Revalidación al confirmar | FR-AD-JOR-11, FR-AD-APR-11, FR-AD-TASA-6 |
| **R6** Nada resuelto se reprocesa | FR-AD-TRAB-10, FR-AD-JOR-11, FR-AD-APR-11 |
| **R8** Signo y motivo coherentes | FR-AD-APR-6, FR-AD-APR-8 |
| **R9** Histórico inmutable | FR-AD-JOR-6, FR-AD-JOR-12, FR-AD-OPS-6, FR-AD-TASA-5 |
| **R10** Sin enums en bruto | FR-AD-OPS-7, FR-AD-STATE-4 |
| **R11** Sin descarga | FR-AD-REP-7 |
| **R12** Worker acotado a su caja | Intacta; FR-AD-OPS-2 explica por qué esta consola amplía filtros que allí no existen |
