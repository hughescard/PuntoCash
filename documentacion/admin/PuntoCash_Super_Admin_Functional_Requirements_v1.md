# PuntoCash — Super Admin
## Documento de Requisitos Funcionales (FRD) · v1.0

**Estado:** **Especificación de implementación. La aplicación no está construida.** Hoy `/super-admin` contiene únicamente un README de marcador de posición. Este documento define lo que debe existir, pantalla por pantalla.

**Destinatarios:** Personas desarrolladoras y QA. Utilizable como especificación de implementación y como referencia de aceptación.

**Alcance:** Únicamente la consola de PuntoCash sobre su red, `/super-admin`. La consola del mercante se especifica en `PuntoCash_Admin_Sede_Functional_Requirements_v1.md`, al que este documento se remite en todo lo que comparte y solo especifica lo que difiere.

**Documentos relacionados:** `PuntoCash_Administracion_PRD_v1.md` define el modelo de negocio, los conceptos de dominio y las reglas **A1–A9**. `PuntoCash_Worker_PRD_v2.md` define las reglas de producto **R1–R12**. `CLAUDE.md` y `PuntoCash_Manual_de_Marca_y_UI_v1.pdf` mandan sobre todo lo visual.

**Cómo leer este documento.** Los requisitos se numeran `FR-SA-<área>-<n>`. Donde una pantalla se comporta igual que su equivalente en la consola del mercante, este documento lo dice y remite al requisito correspondiente en lugar de repetirlo, para que una corrección futura no tenga que hacerse en dos sitios.

---

## 0. Qué es este módulo y qué no es

`/super-admin` es la consola con la que PuntoCash gobierna su red: qué sedes existen, quién las administra, quién trabaja en ellas, dentro de qué límites operan y qué está pasando en todas a la vez.

Es la única superficie del producto con **alcance global**, y la única que puede ejercer cinco potestades de propietaria: crear sedes, dar de alta y de baja mercantes, asignar y revocar sedes, fijar los rangos de tasa, y habilitar o deshabilitar servicios por sede.

Lo que **no** hace, igual que la consola del mercante: no opera caja, no registra operaciones, no verifica identidades, no invoca proveedores externos y no corrige lo que un Worker registró **[A6]**, **[A7]**. Alcance global significa ver todo, no poder deshacer nada.

Hay una asimetría deliberada que conviene entender antes de leer el resto: **el Super Admin puede ver todo lo que ve un Admin de sede, pero no puede hacer todo lo que hace un Admin de sede.** Aprobar solicitudes y forzar cierres son actos de responsabilidad operativa sobre una caja concreta, y esa responsabilidad es del mercante que administra esa sede. PuntoCash audita esas decisiones; no las toma en su lugar.

---

## 1. Comportamiento global del módulo

### 1.1 Shell

**FR-SA-SHELL-1** Misma composición de shell que la consola del mercante: `AppShell` + `AppHeader` + `AppSidebar` + `AppMain` desde `@/components/shell`, con grupos de rutas `(auth)` y `(app)` (equivale a **FR-AD-SHELL-1**).

**FR-SA-SHELL-2** La barra lateral debe contener nueve entradas, en este orden: **Inicio**, **Sedes**, **Operadores**, **Trabajadores**, **Tasas**, **Servicios**, **Operaciones**, **Reportes**, **Auditoría**.

**FR-SA-SHELL-3** La cabecera muestra la marca **PuntoCash**, un distintivo visible que identifica la consola como administración general de la red, el nombre de la persona que ha iniciado sesión, y los accesos de Perfil y Cerrar sesión.

**FR-SA-SHELL-4** El distintivo de FR-SA-SHELL-3 es un requisito de seguridad operativa, no decorativo: debe ser imposible confundir de un vistazo una pantalla de esta consola con la del mercante, porque las acciones disponibles y su alcance son muy distintos.

**FR-SA-SHELL-5** Referencia de pantalla y densidad: igual que la consola del mercante (**FR-AD-SHELL-5**).

**FR-SA-SHELL-6** Ninguna pantalla debe contener flujos por pasos con stepper, con una excepción: la creación de una sede (§4.2), que agrupa datos maestros, cajas iniciales y asignación, y se resuelve en un formulario por secciones, no en un stepper.

### 1.2 Rutas

**FR-SA-NAV-1** Inventario de rutas:

| Ruta | Función |
| --- | --- |
| `/super-admin/login` | Acceso (sin shell) |
| `/super-admin/inicio` | Panel de salud de la red |
| `/super-admin/sedes` | Listado de todas las sedes |
| `/super-admin/sedes/nueva` | Creación de una sede |
| `/super-admin/sedes/[id]` | Ficha de una sede, con asignación e historial |
| `/super-admin/operadores` | Listado de mercantes |
| `/super-admin/operadores/nuevo` | Alta de un mercante |
| `/super-admin/operadores/[id]` | Ficha de un mercante |
| `/super-admin/trabajadores` | Todos los trabajadores de la red |
| `/super-admin/trabajadores/[id]` | Ficha de un trabajador, de solo lectura |
| `/super-admin/tasas` | Rangos permitidos y tasas efectivas por sede |
| `/super-admin/servicios` | Servicios habilitados por sede |
| `/super-admin/operaciones` | Historial de toda la red |
| `/super-admin/operaciones/[codigo]` | Detalle de una operación, de solo lectura |
| `/super-admin/reportes` | Consolidado de red y comparativas |
| `/super-admin/auditoria` | Registro de eventos de gobierno |

**FR-SA-NAV-2** Esta consola no tiene selector de alcance: su alcance es la red entera **[A1]**. Donde el filtrado por sede u operador es útil, se ofrece como filtro de la pantalla, nunca como alcance de la sesión.

**FR-SA-NAV-3** Un identificador inexistente debe tratarse con el mismo mensaje genérico que en la consola del mercante (**FR-AD-NAV-3**).

---

## 2. Acceso

**FR-SA-ACC-1** `/super-admin/login` reutiliza el patrón de `/worker/login` y `/admin/login`, con texto de contexto que identifica la consola como administración general de PuntoCash.

**FR-SA-ACC-2** Mensajes de error indistinguibles entre usuario inexistente, contraseña incorrecta y usuario desactivado (equivale a **FR-AD-ACC-2**).

**FR-SA-ACC-3** Tras iniciar sesión, la navegación va a `/super-admin/inicio`.

**FR-SA-ACC-4** `/super-admin/recuperar-acceso` es un marcador de posición sin comportamiento.

---

## 3. Inicio

El panel que responde "¿cómo está la red ahora mismo?".

**FR-SA-HOME-1** Fila de métricas de red: **sedes activas** (sobre el total), **sedes con jornada abierta ahora**, **operadores activos**, **trabajadores activos**, **operaciones del día** y **volumen del día por moneda**.

**FR-SA-HOME-2** El volumen se expresa por moneda, sin convertir a una moneda única, por la misma razón que en la consola del mercante (**FR-AD-REP-3**).

**FR-SA-HOME-3** **Panel de alertas de red**, con las situaciones que PuntoCash debe mirar aunque no sea quien las resuelve, en este orden: sedes sin operador asignado, sedes activas sin jornada abierta dentro de su horario, jornadas abiertas fuera de horario, arqueos con diferencia por encima de un umbral, solicitudes de aprobación pendientes con más de 24 horas de antigüedad, y tasas fijadas automáticamente al límite por un cambio de rango y aún no revisadas por su Admin **[A5]**.

**FR-SA-HOME-4** Cada alerta debe indicar la sede y el operador responsable, y enlazar a la pantalla donde se consulta. Las alertas que corresponde resolver a un Admin de sede deben identificarse como tales, para que quede claro que PuntoCash observa pero no interviene **[A6]**.

**FR-SA-HOME-5** **Tabla de estado de la red**, con una fila por sede activa: código y nombre, operador asignado, estado de la jornada, cajas abiertas, operaciones del día y alertas activas. Admite ordenación por cualquier columna y filtro por operador.

**FR-SA-HOME-6** Una sede **sin operador asignado** debe distinguirse visualmente en la tabla, porque es una anomalía de gobierno que solo PuntoCash puede resolver.

---

## 4. Sedes

### 4.1 Listado

**FR-SA-SEDE-1** `/super-admin/sedes` lista todas las sedes de la red con: código, nombre, municipio y provincia, estado, operador asignado, fecha de la asignación vigente, número de cajas y número de trabajadores activos.

**FR-SA-SEDE-2** Filtros: estado de la sede, provincia, operador, y un conmutador "sin operador asignado". Búsqueda por código o nombre.

**FR-SA-SEDE-3** La lista ofrece la acción **Nueva sede**.

### 4.2 Creación

**FR-SA-SEDE-4** `/super-admin/sedes/nueva` crea una sede mediante un formulario en tres secciones: **datos maestros**, **cajas iniciales** y **asignación inicial**.

**FR-SA-SEDE-5** Datos maestros: código, nombre, dirección, provincia y municipio (del catálogo de `src/features/geography`), teléfono y horario de atención. Todos obligatorios salvo el teléfono.

**FR-SA-SEDE-6** El código de sede debe ser único en la red. Un código repetido se rechaza con "Ya existe una sede con ese código."

**FR-SA-SEDE-7** Cajas iniciales: número de cajas a crear, con sus identificadores. La sede debe crearse con al menos una caja.

**FR-SA-SEDE-8** Asignación inicial: elegir un operador activo, o dejar la sede **sin asignar**. Dejarla sin asignar es una opción válida y explícita, no un descuido: una sede puede existir antes de decidirse quién la administrará.

**FR-SA-SEDE-9** Una sede recién creada nace en estado **activa** si tiene operador asignado, y en estado **suspendida** si no lo tiene — porque sin un administrador responsable no debe poder operarse.

**FR-SA-SEDE-10** La creación genera un evento de auditoría **[RP-16]**.

### 4.3 Ficha

**FR-SA-SEDE-11** `/super-admin/sedes/[id]` muestra cinco bloques: **datos maestros** (editables), **asignación vigente**, **historial de asignaciones**, **cajas** y **trabajadores**.

**FR-SA-SEDE-12** Los datos maestros son editables por el Super Admin y solo por él **[A3]**. Guardar exige confirmación y genera un evento de auditoría.

**FR-SA-SEDE-13** El bloque de **asignación vigente** muestra operador, fecha de inicio, motivo de la asignación y tiempo transcurrido, y ofrece la acción **Revocar**. Si no hay asignación vigente, muestra el estado sin asignar y ofrece **Asignar**.

**FR-SA-SEDE-14** El **historial de asignaciones** lista todos los tramos pasados con operador, fecha de inicio, fecha de fin, motivo de inicio y motivo de fin. Es de solo lectura, sin excepción, incluso para el Super Admin **[A2]**, **[R9]**, **[RP-15]**.

**FR-SA-SEDE-15** Los bloques de **cajas** y **trabajadores** se comportan igual que sus equivalentes en la consola del mercante (**FR-AD-SEDE-5**, **FR-AD-SEDE-6**), en solo lectura.

**FR-SA-SEDE-16** La ficha permite **suspender** y **cerrar** una sede, ambas con motivo obligatorio. Una sede suspendida no admite apertura de jornadas nuevas; una sede cerrada, además, no admite asignación de operadores ni de trabajadores.

**FR-SA-SEDE-17** No debe ser posible suspender ni cerrar una sede con una jornada abierta. El intento se rechaza con "Esta sede tiene jornadas abiertas. Deben cerrarse antes." y enlace al listado de esas jornadas **[R6]**.

**FR-SA-SEDE-18** Una sede nunca se elimina. Cerrarla es el final de su ciclo de vida, y todo su histórico permanece accesible **[R9]**.

### 4.4 Asignar y revocar

**FR-SA-ASG-1** **Asignar** exige elegir un operador activo y escribir un motivo de al menos 10 caracteres, y muestra un resumen antes de confirmar: sede, operador, fecha de inicio.

**FR-SA-ASG-2** No debe ser posible asignar una sede que ya tiene asignación vigente. La interfaz debe exigir revocar primero, y explicarlo: "Esta sede ya está asignada a {operador}. Revoca esa asignación antes de asignarla a otro." **[A2]**.

**FR-SA-ASG-3** **Revocar** exige motivo escrito de al menos 10 caracteres y muestra una advertencia previa de lo que implica: el operador dejará de ver la sede de inmediato, sus trabajadores en esa sede dejarán de poder iniciar sesión, y la sede quedará sin administrador responsable hasta que se asigne otro.

**FR-SA-ASG-4** No debe ser posible revocar una asignación con jornadas abiertas en esa sede, por la misma razón que FR-SA-SEDE-17 y con el mismo patrón de mensaje y enlace.

**FR-SA-ASG-5** Revocar **cierra** el tramo de asignación con fecha de fin y motivo; nunca lo borra ni lo edita **[A2]**, **[R9]**.

**FR-SA-ASG-6** Al confirmar asignar o revocar, el sistema debe revalidar el estado de la asignación. Si otro Super Admin la cambió entretanto, la acción se rechaza y se muestra el estado real **[R3]**, **[R6]**.

**FR-SA-ASG-7** Una sede que queda sin asignación vigente pasa automáticamente a **suspendida**, coherente con FR-SA-SEDE-9, y el hecho debe comunicarse en la confirmación de la revocación.

**FR-SA-ASG-8** Asignar y revocar generan eventos de auditoría **[RP-16]**.

---

## 5. Operadores

**FR-SA-OPE-1** `/super-admin/operadores` lista los mercantes con: nombre, contacto, estado (activo / suspendido / dado de baja), número de sedes administradas, número de trabajadores activos, fecha de alta y volumen del periodo.

**FR-SA-OPE-2** Filtros por estado y búsqueda por nombre. Un conmutador "sin sedes" identifica a los operadores dados de alta que aún no administran nada.

**FR-SA-OPE-3** `/super-admin/operadores/nuevo` da de alta un mercante. Campos: nombre o razón social, tipo y número de documento, persona de contacto, teléfono, correo, y el identificador de acceso del usuario Admin inicial.

**FR-SA-OPE-4** El alta crea el operador y su primer usuario Admin en un solo acto, y muestra la credencial inicial una sola vez, con el mismo tratamiento que el alta de trabajadores (**FR-AD-TRAB-7**).

**FR-SA-OPE-5** El alta **no** asigna sedes. Asignar es un acto propio, que se hace desde la ficha de la sede o desde la ficha del operador **[A3]**.

**FR-SA-OPE-6** `/super-admin/operadores/[id]` muestra la ficha con: datos del operador, **sus sedes vigentes**, **su historial de asignaciones** (todas las sedes que ha administrado alguna vez, con sus tramos), **sus trabajadores**, **su volumen** y **sus solicitudes de aprobación pendientes**.

**FR-SA-OPE-7** El bloque de solicitudes pendientes es de solo lectura: muestra lo que ese mercante tiene sin resolver, sin ofrecer resolverlo. PuntoCash observa; el mercante decide **[A6]**.

**FR-SA-OPE-8** La ficha ofrece **asignar una sede** al operador, con el mismo comportamiento y las mismas validaciones de §4.4.

**FR-SA-OPE-9** La ficha permite **suspender** y **dar de baja** al operador, ambas con motivo obligatorio. Suspender impide a sus usuarios Admin iniciar sesión sin tocar sus asignaciones; dar de baja, además, exige que no tenga ninguna sede asignada.

**FR-SA-OPE-10** Un intento de dar de baja a un operador con sedes asignadas debe rechazarse con "Este operador administra {n} sedes. Revoca esas asignaciones antes de darlo de baja." y enlace a esas sedes.

**FR-SA-OPE-11** Un operador nunca se elimina, y todo su historial permanece accesible tras la baja **[R9]**.

**FR-SA-OPE-12** Suspender, reactivar y dar de baja generan eventos de auditoría **[RP-16]**.

---

## 6. Trabajadores

**FR-SA-TRAB-1** `/super-admin/trabajadores` lista todos los trabajadores de la red con: nombre, identificador, sede, operador, caja asignada, estado, fecha de alta y última jornada operada.

**FR-SA-TRAB-2** Filtros por operador, sede y estado; búsqueda por nombre o identificador.

**FR-SA-TRAB-3** `/super-admin/trabajadores/[id]` muestra la ficha en solo lectura, con sus datos, su sede, su operador, su actividad reciente y el historial de sedes en las que ha trabajado.

**FR-SA-TRAB-4** El Super Admin **no crea ni edita** trabajadores: eso es del mercante **[A4]**. La ficha no debe ofrecer controles de edición, ni siquiera deshabilitados.

**FR-SA-TRAB-5** El Super Admin **sí puede desactivar** a cualquier trabajador de la red, con motivo obligatorio. Es la potestad de corte de la propietaria **[A4]**.

**FR-SA-TRAB-6** La desactivación por parte del Super Admin debe distinguirse de la desactivación por parte del Admin de sede, tanto en la ficha como en auditoría: quién cortó importa.

**FR-SA-TRAB-7** No debe ser posible desactivar a un trabajador con jornada abierta, con el mismo mensaje y enlace que **FR-AD-TRAB-10** **[R6]**.

**FR-SA-TRAB-8** Quien desactiva es quien reactiva. Un trabajador desactivado por su Admin de sede solo puede reactivarlo ese Admin; uno desactivado por PuntoCash solo puede reactivarlo el Super Admin. En el segundo caso, la ficha del trabajador en `/admin` debe explicar por qué no puede reactivarlo —"Este trabajador fue desactivado por PuntoCash"— en lugar de ofrecer un control que falla (complementa **FR-AD-TRAB-12**).

---

## 7. Tasas

**FR-SA-TASA-1** `/super-admin/tasas` tiene dos vistas: **Rangos de la red** y **Tasas por sede**.

**FR-SA-TASA-2** **Rangos de la red** lista cada par de monedas con su rango permitido de compra y de venta —mínimo y máximo—, la fecha del último cambio y su autor. Es la vista editable.

**FR-SA-TASA-3** Editar un rango exige que mínimo sea menor que máximo y que ambos sean positivos. Mensajes: "El mínimo debe ser menor que el máximo."; "Introduce un valor válido."

**FR-SA-TASA-4** Antes de guardar un rango, el sistema debe calcular y mostrar **qué sedes quedarían fuera de rango** con el valor nuevo, nombrándolas una por una con su tasa vigente y el valor al que quedarían fijadas.

**FR-SA-TASA-5** La confirmación debe ser explícita sobre la consecuencia: "{n} sedes tienen hoy una tasa fuera del nuevo rango. Al guardar, su tasa se fijará automáticamente al límite más cercano y se avisará a sus administradores." **[A5]**.

**FR-SA-TASA-6** Al guardar, las tasas efectivas fuera del rango nuevo se fijan automáticamente al límite más cercano, cada fijación genera su propio evento de auditoría, y cada sede afectada queda marcada para que su Admin lo vea (**FR-AD-TASA-7**) **[A5]**, **[RP-17]**.

**FR-SA-TASA-7** El cambio de rango **no altera ninguna operación ya registrada**, y la confirmación debe decirlo **[R9]**.

**FR-SA-TASA-8** **Tasas por sede** lista, para cada sede y par de monedas, la tasa efectiva vigente, el rango aplicable, la fecha del último cambio, quién lo hizo y si fue fijada automáticamente. Es de solo lectura: la tasa efectiva la fija el Admin de la sede **[A5]**.

**FR-SA-TASA-9** La vista por sede debe permitir identificar de un vistazo las sedes que operan pegadas a un límite y las que fueron fijadas automáticamente y aún no han sido revisadas.

**FR-SA-TASA-10** Todo cambio de rango genera un evento de auditoría **[RP-16]**.

---

## 8. Servicios por sede

**FR-SA-SERV-1** `/super-admin/servicios` presenta una matriz de sedes por servicios, donde cada celda indica si ese servicio está habilitado en esa sede.

**FR-SA-SERV-2** La matriz debe distinguir tres estados de celda: **habilitado**, **deshabilitado** y **no disponible en el producto** — este último para los servicios del catálogo que aún no tienen flujo implementado, que no pueden habilitarse en ninguna sede.

**FR-SA-SERV-3** Habilitar o deshabilitar un servicio en una sede es potestad exclusiva del Super Admin, exige confirmación y genera un evento de auditoría **[RP-16]**.

**FR-SA-SERV-4** Deshabilitar un servicio **no afecta a las operaciones ya registradas** de ese servicio en esa sede, que permanecen íntegras en el histórico **[R9]**.

**FR-SA-SERV-5** El efecto de deshabilitar es hacia adelante: el servicio deja de aparecer en el catálogo de Worker de esa sede y en el catálogo del Kiosco de esa sede, y deja de poder iniciarse.

**FR-SA-SERV-6** La confirmación debe advertir de ese efecto con el número de sedes y el servicio nombrados, sin jerga.

**FR-SA-SERV-7** La matriz admite filtro por operador y por provincia, y búsqueda de sede.

---

## 9. Operaciones

**FR-SA-OPS-1** `/super-admin/operaciones` se comporta igual que su equivalente en la consola del mercante (**FR-AD-OPS-1** a **FR-AD-OPS-7**), con dos diferencias: el alcance es la red entera, y los filtros incluyen **operador** además de sede, caja, trabajador, servicio, estado y rango de fechas.

**FR-SA-OPS-2** El detalle de operación reutiliza las mismas vistas de Worker en solo lectura, y añade al contexto de sede, caja, trabajador y jornada también el **operador** responsable en la fecha de la operación — que debe leerse del historial de asignaciones vigente **en esa fecha**, no de la asignación actual **[RP-15]**, **[R9]**.

**FR-SA-OPS-3** FR-SA-OPS-2 es el requisito que da sentido al historial de asignaciones: una operación de marzo debe mostrar quién administraba la sede en marzo, aunque hoy la administre otro.

**FR-SA-OPS-4** El detalle no ofrece ninguna acción **[A6]**, **[A7]**.

---

## 10. Reportes

**FR-SA-REP-1** `/super-admin/reportes` presenta el volumen de la red en cinco cortes: **por operador**, **por sede**, **por servicio**, **por provincia** y **por día**.

**FR-SA-REP-2** Rango de fechas y accesos rápidos, igual que **FR-AD-REP-2**.

**FR-SA-REP-3** Cifras por moneda, sin conversión a moneda única **[FR-AD-REP-3]**.

**FR-SA-REP-4** El corte **por operador** debe permitir comparar mercantes entre sí en número de operaciones y volumen por moneda, normalizado por número de sedes administradas para que la comparación sea legible.

**FR-SA-REP-5** El corte **por sede** debe permitir identificar las sedes de mayor y menor actividad de la red, con el operador de cada una a la vista.

**FR-SA-REP-6** Ninguna representación gráfica debe introducir una paleta propia ni elementos decorativos: rige el sistema visual del manual de marca (**FR-AD-REP-5**).

**FR-SA-REP-7** Los reportes no muestran comisiones, rentas, liquidaciones ni margen **[A8]**, y no incluyen exportación a archivo en esta versión **[R11]**.

---

## 11. Auditoría

La pantalla que hace verificable todo lo anterior.

**FR-SA-AUD-1** `/super-admin/auditoria` lista los eventos de gobierno de toda la red, del más reciente al más antiguo, con: fecha y hora, actor (persona y rol), tipo de evento, objeto afectado (sede, operador, trabajador, jornada, tasa, servicio o solicitud) y motivo declarado.

**FR-SA-AUD-2** Tipos de evento que deben quedar registrados, como mínimo: creación, edición, suspensión y cierre de sede; alta, suspensión, reactivación y baja de operador; asignación y revocación de sede; alta, edición, desactivación y reactivación de trabajador; cambio de rango de tasas; cambio de tasa efectiva; fijación automática de tasa al límite; habilitación y deshabilitación de servicio; resolución de solicitud de aprobación; y cierre forzado de jornada.

**FR-SA-AUD-3** Filtros: rango de fechas, tipo de evento, actor, rol del actor, operador y sede. Búsqueda libre sobre el motivo declarado.

**FR-SA-AUD-4** Cada evento debe enlazar al objeto afectado, cuando ese objeto siga siendo alcanzable.

**FR-SA-AUD-5** El registro es **de solo lectura desde toda superficie del producto**, incluida esta. No debe existir ningún control de edición ni de borrado, ni siquiera deshabilitado **[RP-16]**.

**FR-SA-AUD-6** El detalle de un evento debe mostrar, cuando aplique, el **valor anterior y el valor nuevo** del cambio — una tasa que pasó de un valor a otro, una sede que pasó de un operador a otro— para que el registro sea legible sin reconstruirlo mentalmente.

**FR-SA-AUD-7** Los eventos deben mostrarse con lenguaje de negocio, nunca con nombres de campo del dominio ni enums en bruto **[R10]**.

---

## 12. Modelo de dominio y datos simulados

**FR-SA-DOM-1** Esta consola se apoya en el mismo módulo `src/features/network` que la consola del mercante (**FR-AD-DOM-1** a **FR-AD-DOM-3**), consumiendo las mismas entidades con alcance global.

**FR-SA-DOM-2** Las funciones de consulta del dominio deben recibir el alcance como parámetro explícito, y el alcance global debe ser un valor de ese parámetro, no la ausencia de él: así una llamada sin alcance es un error visible y no una fuga silenciosa de datos **[A1]**, **[RP-14]**.

**FR-SA-DOM-3** El dominio debe exponer una consulta de **operador vigente en una fecha dada** para una sede, que resuelve FR-SA-OPS-2 leyendo el historial de asignaciones **[RP-15]**.

**FR-SA-DOM-4** Los datos simulados deben ampliarse respecto a **FR-AD-DOM-5** con lo que solo esta consola necesita: al menos una sede **sin operador asignado**, al menos una asignación **cerrada** (una sede que cambió de mercante), al menos un operador **dado de baja**, y un registro de auditoría poblado con eventos de varios tipos y varias fechas.

**FR-SA-DOM-5** La asignación cerrada de FR-SA-DOM-4 debe tener operaciones registradas **dentro de su tramo**, para que FR-SA-OPS-2 sea verificable: esas operaciones deben mostrar el operador antiguo, no el actual.

---

## 13. Comportamiento transversal

**FR-SA-STATE-1** Rigen sin cambios los requisitos transversales de la consola del mercante: estados de tabla, estados de envío, confirmación de acciones irreversibles, ausencia de jerga en errores y usabilidad por teclado (**FR-AD-STATE-1** a **FR-AD-STATE-5**).

**FR-SA-STATE-2** Toda acción de gobierno de esta consola —sin excepción— exige **motivo escrito** de al menos 10 caracteres, sin valor predefinido y sin lista de opciones.

**FR-SA-STATE-3** Toda acción de gobierno debe mostrar, antes de confirmar, un resumen de qué va a cambiar y a quién afecta, con los nombres concretos de las sedes, operadores o personas implicadas — nunca un recuento abstracto sin identificar.

---

## 14. Condiciones conocidas y fuera de alcance

- **Nada de esto está implementado.** `/super-admin` contiene hoy un README de marcador de posición.
- **Sin backend**, como el resto del producto.
- **Sin sub-roles**: el Super Admin es un rol único e indivisible en esta versión, lo que significa que cualquier persona con esta consola puede revocar una sede o dar de baja un mercante. Si el negocio quiere separar quien consulta de quien decide, es una decisión pendiente.
- **Sin gestión de cajas** más allá de crearlas al crear la sede.
- **Sin exportación de reportes ni de auditoría** **[R11]**, pendiente de decisión de negocio. La auditoría es el caso donde esa carencia más probablemente se note.
- **Sin notificaciones** fuera de la consola: el aviso a un Admin por una tasa fijada al límite vive dentro de `/admin`, no en su correo.
- **Sin recuperación de acceso** funcional.
- **Sin nada económico** **[A8]**.
- **Revisión visual obligatoria** a 1440×900 antes de dar por terminada cualquier pantalla, conforme a `CLAUDE.md`.

---

## Apéndice A · Qué puede cada rol

Tabla de contraste, que resume el reparto de potestades y debe usarse como referencia rápida al implementar cualquier control:

| Acto | Worker | Admin de sede | Super Admin |
| --- | --- | --- | --- |
| Registrar una operación | Sí | No | No |
| Mover efectivo, arquear, cerrar por arqueo | Sí | No | No |
| Forzar cierre de jornada | No | Sí, en sus sedes | No |
| Resolver una solicitud de aprobación | No | Sí, en sus sedes | No (solo la consulta) |
| Crear y editar trabajadores | No | Sí, en sus sedes | No |
| Desactivar un trabajador | No | Sí, en sus sedes | Sí, en toda la red |
| Fijar la tasa efectiva de una sede | No | Sí, dentro del rango | No |
| Fijar el rango permitido | No | No | Sí |
| Crear, editar, suspender o cerrar una sede | No | No | Sí |
| Asignar o revocar una sede | No | No | Sí |
| Alta o baja de un operador | No | No | Sí |
| Habilitar servicios en una sede | No | No | Sí |
| Ver el historial de asignaciones de una sede | No | Solo el tramo propio | Sí, completo |
| Consultar el registro de auditoría | No | No | Sí, en solo lectura |
| Modificar algo ya registrado por un Worker | No | No | No |
