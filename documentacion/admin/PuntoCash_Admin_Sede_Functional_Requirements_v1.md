# PuntoCash — Admin de sede
## Documento de Requisitos Funcionales (FRD) · v3.0

**Estado:** **Especificación de implementación. La aplicación no está construida.** Hoy `/admin` contiene un README de marcador de posición, y la demostración suple dos de sus secciones con el simulador `/kiosk/simulador-admin`.

**Destinatarios:** Personas desarrolladoras y QA. Utilizable como especificación de implementación y como referencia de aceptación.

**Alcance:** Únicamente la consola del mercante, `/admin`. La consola de PuntoCash se especifica en `PuntoCash_Super_Admin_Functional_Requirements_v1.md`.

**Control de cambios — v3.1 (2026-09-23).** **Separación de Monedas y Tasas.** La v3.0 mezclaba las dos cosas en una sola idea de "par activado". Ahora son dos pantallas con objetos distintos: **§12 Monedas** mantiene la **lista de monedas sueltas** que maneja la sucursal, que es exactamente lo que un Worker puede añadir a su caja (sustituye al catálogo constante de **FR-CAJA-13**); y **§13 Tasas** es donde se **definen los pares** y su tasa, a partir de esas monedas y solo cuando PuntoCash tiene un rango para el par. Desaparece el estado "par activado sin tasa": definir un par fija su tasa en el mismo acto. `FR-AD-MON-*` y `FR-AD-TASA-*` se reescriben; §5 y §16 se ajustan. Queda además matizado, y pendiente de confirmación del negocio, que la **lista de monedas no depende del servicio de Cambio de moneda** (FR-AD-MON-5), porque una sede necesita monedas en caja para remesas y giros igualmente.

**Control de cambios — v3.0 (2026-09-23).** **El mercante gobierna todo lo que vive dentro de sus sedes.** Tres capacidades que la v2.0 daba a PuntoCash pasan aquí: nueva **§4 Cajas** (`FR-AD-CAJA-*`), crear y retirar las cajas de una sede, que ahora nace vacía; nueva **§12 Monedas** (`FR-AD-MON-*`), decidir qué monedas cambia cada sede cuando PuntoCash le habilitó el servicio; y nueva **§8 Usuarios administradores** (`FR-AD-USR-*`), crear los demás usuarios de su empresa a partir del primero que PuntoCash le entregó. Además, el Admin de sede queda como **el único rol que desactiva a un trabajador** **[A14]**, y §7 lo refleja. §5, §6 y §13 se ajustan; el apéndice recoge **A14**.

**Control de cambios — v2.0 (2026-09-23).** Incorpora lo que Worker y Kiosco delegaron en esta consola: **§3 Equipos**, **§14 Promociones**, acceso con verificación en dos pasos **[R13]**, el trabajador adscrito a una sede y no a una caja **[A13]**, y la tasa efectiva como origen del tablero público **[A12]**.

**Control de cambios — v1.0 (2026-09-22).** Primera versión.

**Documentos relacionados:** `PuntoCash_Administracion_PRD_v1.md` (v3.0) define el modelo de negocio, los conceptos y las reglas **A1–A14**. `PuntoCash_PRD_v2.md` (v2.5) define **R1–R13** y **RP-1 a RP-16**. `PuntoCash_Worker_Functional_Requirements_v1.md` (v1.5) especifica la aplicación supervisada; su **§2.1 (FR-DEV-1 a 9)** es la contraparte de §3.2 y su **§2.2–§2.12** el acceso que esta consola hereda. `PuntoCash_Kiosk_Autoservicio_Functional_Requirements_v1.md` (v1.3) **§1.1 (FR-AS-LINK-1 a 9)** es la contraparte de §3.3. `PuntoCash_Kiosk_Pantalla_Functional_Requirements_v1.md` (v1.4) **§7** define el origen único de datos que §12, §13 y §14 alimentan. `CLAUDE.md` y `PuntoCash_Manual_de_Marca_y_UI_v1.pdf` mandan sobre todo lo visual.

**Cómo leer este documento.** Los requisitos se numeran `FR-AD-<área>-<n>`. "Debe" describe comportamiento obligatorio. Se referencian reglas de administración como **[A#]** y de producto como **[R#]**.

---

## 0. Qué es este módulo y qué no es

`/admin` es la consola con la que un mercante gobierna las sedes que PuntoCash le ha dado en administración. Hace tres cosas de naturaleza distinta.

La primera es **poner la sucursal en marcha**. Una sede llega vacía: PuntoCash la crea, fija sus datos, decide qué servicios puede ofrecer y se la entrega. Todo lo demás lo monta el mercante desde aquí — crea las cajas, vincula el equipo de cada una, vincula los kioscos, da de alta a sus trabajadores, declara qué monedas maneja y define los pares que cotiza. Sin esta consola, una sucursal recién entregada no funciona: un equipo de caja sin vincular no deja iniciar sesión a nadie (FR-DEV-1) y un kiosco sin vincular no prepara nada (FR-AS-LINK-1).

La segunda es **mantenerla declarada**: la tasa del día, las promociones, las altas y bajas de personal, los equipos que se sustituyen.

La tercera es **mirar y desbloquear**: responder *¿qué está pasando ahora en mis sedes?*, *¿hay algo esperándome?*, *¿cómo fue ayer?*, y permitir dos intervenciones muy acotadas cuando la operación se atasca.

Cuatro cosas que esta consola **nunca** hace, por diseño:

1. **No opera caja.** No abre jornadas, no registra operaciones, no ajusta efectivo, no arquea **[A6]**.
2. **No corrige el pasado.** Aprobar, rechazar y forzar un cierre añaden hechos nuevos junto a los del Worker; ninguno modifica, recalcula ni borra **[A7]**, **[R9]**.
3. **No ve fuera de su alcance.** Solo las sedes asignadas al operador de la sesión, en este momento **[A1]**.
4. **No es el producto del mercante.** La marca visible es PuntoCash **[A9]**.

Y una que sí hace y conviene subrayar, porque en la v2.0 estaba repartida: **es el único lugar del producto desde el que se desactiva a una persona, se retira una caja o se desvincula un equipo.** PuntoCash lo ve todo y no toca nada de esto **[A14]**.

---

## 1. Comportamiento global del módulo

### 1.1 Shell

**FR-AD-SHELL-1** Toda pantalla dentro del grupo `(app)` debe componer `AppShell` + `AppHeader` + `AppSidebar` + `AppMain` desde `@/components/shell`, sin reimplementar ninguna pieza. Se sigue la estructura de grupos de rutas de Worker: `(auth)` para las pantallas sin shell y `(app)` para las que lo llevan.

**FR-AD-SHELL-2** La barra lateral debe agrupar sus destinos en tres bloques, porque trece entradas planas no se leen: **Operación** (Inicio, Jornadas, Aprobaciones, Operaciones), **Sucursal** (Sedes, Cajas, Equipos, Trabajadores, Usuarios) y **Configuración** (Monedas, Tasas, Promociones, Reportes).

**FR-AD-SHELL-3** La entrada de Aprobaciones debe mostrar un indicador numérico cuando haya solicitudes pendientes en el alcance vigente; la de Cajas, cuando haya cajas sin equipo vinculado o sedes sin ninguna caja.

**FR-AD-SHELL-4** La cabecera global debe mostrar: la marca **PuntoCash**, el **selector de alcance** (§1.3), el nombre de la persona con sesión iniciada, y los accesos de Perfil y Cerrar sesión. Debe mostrar además, como texto secundario y sin tratamiento de marca, el nombre del operador al que pertenece la sesión — información de contexto, no identidad de producto **[A9]**.

**FR-AD-SHELL-5** La cabecera **no** debe mostrar el logotipo, el color corporativo ni el nombre comercial del operador como marca de la aplicación **[A9]**.

**FR-AD-SHELL-6** Referencia de pantalla: escritorio, 1440×900, mínimo 1280px, con mayor densidad de tabla que Worker (`src/app/ARCHITECTURE.md`).

**FR-AD-SHELL-7** **Excepción de tamaño:** las pantallas de vinculación de §3 deben ser utilizables en un teléfono o tableta a partir de 360px de ancho. Es un requisito funcional, no una concesión responsive: la vía del QR (FR-DEV-2, FR-AS-LINK-2) exige que el administrador tenga la consola abierta en un dispositivo con cámara, delante del equipo que está vinculando.

**FR-AD-SHELL-8** Ninguna pantalla debe contener un flujo por pasos con stepper.

### 1.2 Rutas

**FR-AD-NAV-1** Inventario de rutas:

| Ruta | Función |
| --- | --- |
| `/admin/login` | Acceso, paso 1: credenciales (sin shell) |
| `/admin/verificacion` | Acceso, paso 2: código de verificación (sin shell) |
| `/admin/inicio` | Panel consolidado del alcance vigente |
| `/admin/sedes` | Listado de las sedes administradas |
| `/admin/sedes/[id]` | Ficha de una sede |
| `/admin/cajas` | Cajas de las sedes administradas |
| `/admin/cajas/nueva` | Alta de una caja |
| `/admin/equipos` | Equipos vinculados: cajas y kioscos |
| `/admin/equipos/vincular` | Vincular un equipo por QR o por código |
| `/admin/trabajadores` | Listado de trabajadores |
| `/admin/trabajadores/nuevo` | Alta de trabajador |
| `/admin/trabajadores/[id]` | Ficha y edición de un trabajador |
| `/admin/usuarios` | Usuarios administradores de la empresa |
| `/admin/usuarios/nuevo` | Alta de un usuario administrador |
| `/admin/usuarios/[id]` | Ficha y edición de un usuario administrador |
| `/admin/jornadas` | Listado de jornadas abiertas y cerradas |
| `/admin/jornadas/[id]` | Detalle de una jornada, con arqueo y movimientos |
| `/admin/aprobaciones` | Bandeja de solicitudes pendientes y resueltas |
| `/admin/aprobaciones/[id]` | Detalle y resolución de una solicitud |
| `/admin/operaciones` | Historial consolidado de operaciones |
| `/admin/operaciones/[codigo]` | Detalle de una operación, de solo lectura |
| `/admin/monedas` | Lista de monedas que maneja cada sede |
| `/admin/tasas` | Tasa efectiva por sede dentro del rango de PuntoCash |
| `/admin/promociones` | Promociones de las sedes administradas |
| `/admin/promociones/nueva`, `/admin/promociones/[id]` | Alta y edición de una promoción |
| `/admin/reportes` | Volumen por sede, servicio, trabajador y día |

**FR-AD-NAV-2** Toda ruta con identificador debe validar que el recurso pertenece al alcance vigente **antes** de representar nada. Un recurso existente pero fuera de alcance se trata exactamente igual que uno inexistente: mismo mensaje, mismo estado **[A1]**, **[RP-19]**.

**FR-AD-NAV-3** El mensaje para ese caso debe ser genérico: "No encontramos lo que buscabas." No debe revelar que el recurso existe pero pertenece a otro operador.

**FR-AD-NAV-4** Esta consola **no** se usa sobre un equipo vinculado: no le aplican FR-DEV-1 ni la pantalla de vinculación. Se abre desde cualquier navegador, incluido el de un teléfono.

### 1.3 Selector de alcance

**FR-AD-SCOPE-1** La sesión determina el alcance: el conjunto de sedes con asignación vigente al operador de la sesión. El alcance **no es elegible ni editable**; el selector solo filtra dentro de él **[A1]**.

**FR-AD-SCOPE-2** El selector ofrece "Todas mis sedes" más una entrada por cada sede del alcance, identificada por código y nombre.

**FR-AD-SCOPE-3** Con una sola sede en el alcance, el selector no se representa; la cabecera muestra su código y nombre como texto fijo.

**FR-AD-SCOPE-4** La selección persiste durante la navegación y se aplica a Inicio, Cajas, Equipos, Jornadas, Aprobaciones, Operaciones, Monedas, Tasas, Promociones y Reportes. Sedes, Trabajadores y Usuarios muestran siempre el alcance completo, con la sede como columna cuando aplique.

**FR-AD-SCOPE-5** Al cambiar la selección, los filtros propios de la pantalla activa se conservan; solo cambia la sede.

**FR-AD-SCOPE-6** Si una sede deja de estar asignada al operador mientras la sesión está abierta y era la seleccionada, la siguiente navegación vuelve a "Todas mis sedes" y avisa: "Ya no administras esa sede."

---

## 2. Acceso

**FR-AD-ACC-1** El acceso es **el mismo flujo de dos pasos que Worker**, sin variación: credenciales y, después, un código de seis dígitos al correo registrado, con cinco minutos de vigencia, tres intentos y hasta tres envíos. Ninguna sesión existe hasta que el código se verifica **[R13]**.

**FR-AD-ACC-2** Rigen, aplicados a `/admin/login` y `/admin/verificacion`, los requisitos **FR-AUTH-1 a FR-AUTH-7** y **FR-2FA-1 a FR-2FA-32** de `PuntoCash_Worker_Functional_Requirements_v1.md` §2.3 a §2.10, **sin repetirlos aquí**, tal como ese documento previó (§2.2, punto 4). El dominio `src/features/auth` se reutiliza sin cambios.

**FR-AD-ACC-3** Lo único que difiere es el destino posterior a la verificación, `/admin/inicio`, y el texto de contexto de la pantalla de credenciales, que identifica la consola como "Administración de sede".

**FR-AD-ACC-4** **No aplica FR-AUTH-8** (trabajador de otra sede): esa comprobación es entre un trabajador y la caja de un equipo, y esta consola no se usa sobre equipos vinculados.

**FR-AD-ACC-5** Mensajes de error indistinguibles entre usuario inexistente, contraseña incorrecta y usuario desactivado: "Credenciales incorrectas."

**FR-AD-ACC-6** Un usuario válido cuyo **operador** esté suspendido o dado de baja no debe poder iniciar sesión, y recibe el mismo mensaje indistinguible **[A14]**.

**FR-AD-ACC-7** Un usuario válido de un operador activo pero **sin ninguna sede asignada** sí inicia sesión, y aterriza en un Inicio en estado vacío explícito (**FR-AD-HOME-8**). No es un error: es un mercante que aún no tiene nada a su cargo.

**FR-AD-ACC-8** `/admin/recuperar-acceso` es un marcador de posición sin comportamiento, igual que en Worker.

---

## 3. Equipos

La sección que Worker y Kiosco dan por existente. Sin ella, ninguna de las dos superficies arranca.

### 3.1 Comportamiento común

**FR-AD-EQ-1** `/admin/equipos` presenta dos pestañas: **Cajas** (por defecto) y **Kioscos de autoservicio**. Ambas listan únicamente equipos de sedes del alcance vigente **[A1]**.

**FR-AD-EQ-2** Las dos clases de equipo comparten el mismo acto de vinculación y se diferencian solo en el objeto al que se atan: una caja concreta de una sede, o una sede. Toda la mecánica de §3.4 es común.

**FR-AD-EQ-3** **Esta consola es el único lugar del producto desde el que un equipo se vincula o se desvincula** **[A10]**, **[A14]**, **[FR-DEV-3]**, **[FR-AS-LINK-4]**. El Super Admin ve estos mismos equipos en toda la red y no toca ninguno.

**FR-AD-EQ-4** Toda vinculación y toda desvinculación genera un evento de auditoría con quién, cuándo, qué equipo y sobre qué sede o caja **[RP-21]**, **[RP-24]**.

### 3.2 Equipos de caja

**FR-AD-EQ-5** La pestaña **Cajas** lista todas las cajas de las sedes del alcance, tengan equipo vinculado o no, con: sede, identificador de la caja, estado del vínculo (vinculada / sin equipo), identificador del equipo (`CAJ-NNNN-NNNN`), fecha de vinculación, quién la vinculó, última actividad del equipo y estado de la jornada.

**FR-AD-EQ-6** Listar las cajas sin equipo es el punto de la pantalla, no un detalle: una caja sin equipo es una caja en la que nadie puede iniciar sesión (FR-DEV-1). Deben distinguirse visualmente y ordenarse primero.

**FR-AD-EQ-7** Vincular un equipo de caja exige elegir **sede y caja concreta**, y el selector solo ofrece cajas de sedes del alcance. El dominio revalida esa pertenencia al guardar, no solo la interfaz **[A1]**, **[A10]**.

**FR-AD-EQ-8** **Una caja tiene como máximo un equipo vinculado a la vez** **[A11]**, **[FR-DEV-3]**. El selector marca como no disponibles las cajas que ya tienen equipo e indica cuál. Para sustituir el equipo de una caja hay que desvincular el anterior primero: "La {caja} ya tiene un equipo vinculado. Desvincúlalo antes de vincular otro."

**FR-AD-EQ-9** **Desvincular** exige confirmación y muestra antes, con todas sus letras, lo que va a pasar: el equipo vuelve a su pantalla de vinculación al instante; si hay un trabajador con sesión iniciada en él, su sesión termina y lo que tuviera a medias sin confirmar se descarta; lo ya confirmado se conserva **[FR-DEV-7]**.

**FR-AD-EQ-10** **Desvincular no cierra la Jornada** **[A11]**, **[FR-DEV-7]**. Cuando la caja tiene una Jornada abierta, la confirmación debe advertirlo de forma destacada y explicar la consecuencia exacta: "La {caja} tiene una Jornada abierta. Desvincular el equipo no la cierra: seguirá abierta hasta su arqueo y cierre, y para hacerlo habrá que vincular un equipo a esa caja." La acción se permite —a veces se desvincula precisamente porque el equipo se averió—, pero nunca a ciegas. Es la respuesta a lo que FR-DEV-7 dejó explícitamente a este documento.

**FR-AD-EQ-11** Si el Admin prefiere no dejar la caja sin equipo, la confirmación debe ofrecer, como alternativa y sin salir del diálogo, el enlace a **forzar cierre** de esa jornada (§9.1). No la ejecuta por él: se la pone a mano.

### 3.3 Kioscos de autoservicio

**FR-AD-EQ-12** La pestaña **Kioscos de autoservicio** lista los kioscos vinculados a sedes del alcance, con: sede, identificador (`KIO-NNNN-NNNN`), fecha de vinculación, quién lo vinculó, última actividad y solicitudes generadas en el periodo.

**FR-AD-EQ-13** Vincular un kiosco exige elegir **sede**, y solo entre sedes del alcance **[FR-AS-LINK-4]**. No hay caja que elegir: el kiosco pertenece a la sede.

**FR-AD-EQ-14** Una sede puede tener **varios kioscos** vinculados a la vez; no rige aquí el límite de uno por objeto que sí rige para las cajas.

**FR-AD-EQ-15** **Desvincular** exige confirmación y advierte de lo que ocurre: el kiosco pierde su sesión al instante, descarta sin generar código lo que un cliente estuviera preparando, y vuelve a su pantalla de vinculación con el aviso "Este kiosco fue desvinculado" **[FR-AS-LINK-6]**.

**FR-AD-EQ-16** La confirmación debe aclarar además lo que **no** ocurre: las solicitudes ya generadas por ese kiosco no se ven afectadas y siguen siendo válidas en caja **[FR-AS-LINK-6]**. Es información que evita una llamada de un cliente con un papel en la mano.

### 3.4 El acto de vincular

**FR-AD-EQ-17** `/admin/equipos/vincular` ofrece **las dos vías a la vez, sin obligar a elegir** **[FR-DEV-2]**, **[FR-AS-LINK-2]**: **escanear el QR** que muestra el equipo, con la cámara del dispositivo donde está abierta la consola; y **escribir el código de seis cifras**, en un campo que acepta el formato agrupado de tres en tres ("482 913") e ignora los espacios.

**FR-AD-EQ-18** La pantalla debe decir qué equipo se está vinculando antes de pedir el objeto: al leer un reto válido, muestra la clase de equipo (caja o kiosco) y su identificador, y solo entonces pide la sede —y la caja, si es una caja—.

**FR-AD-EQ-19** El escaneo debe pedir permiso de cámara con una explicación previa de para qué, y degradar con gracia: si no hay cámara o el permiso se deniega, la vía del código sigue disponible en la misma pantalla.

**FR-AD-EQ-20** Errores del código, con los textos que el kiosco y Worker ya especifican **[FR-AS-LINK-4]**: código que no coincide con ningún equipo pendiente → "El código no coincide con ningún kiosco pendiente. Revisa el código que muestra el kiosco." (o "…ningún equipo pendiente…" para cajas); código caducado → "Ese código caducó. El kiosco ya muestra uno nuevo." (o "El equipo ya muestra uno nuevo.").

**FR-AD-EQ-21** El campo del código conserva lo escrito tras un error, para reintentar sin volver a teclearlo entero.

**FR-AD-EQ-22** Al confirmar, el dominio debe **revalidar el reto**: que siga vigente, que no haya sido usado, y que el objeto elegido siga disponible. Un reto de diez minutos que caducó mientras el administrador elegía la sede debe rechazarse, no aplicarse **[R3]**, **[R6]**.

**FR-AD-EQ-23** Un reto es de un solo uso: no puede vincular dos equipos **[R6]**.

**FR-AD-EQ-24** Tras vincular con éxito, la pantalla confirma qué quedó vinculado a qué —"Este equipo es ahora la Caja 03 de PuntoCash Vedado"— y advierte que el equipo cambia solo, sin que nadie lo toque **[FR-DEV-4]**, **[FR-AS-LINK-5]**.

**FR-AD-EQ-25** **La credencial la emite y la revoca el sistema, nunca el terminal** **[A10]**, **[FR-DEV-8]**, **[FR-AS-LINK-7]**. Esta consola no muestra, no copia y no permite exportar ninguna credencial de dispositivo.

**FR-AD-EQ-26** **En la demostración**, esta sección sustituye al simulador `/kiosk/simulador-admin` (FR-DEV-9, FR-AS-LINK-9). Mientras el simulador siga en el repositorio, las dos vías deben producir el mismo efecto sobre la misma sesión de dispositivo, para no tener dos mecanismos divergentes.

---

## 4. Cajas

Una sede llega vacía: PuntoCash la crea y la entrega, y es el mercante quien decide cuántos mostradores abre **[A4]**.

**FR-AD-CAJA-1** `/admin/cajas` lista las cajas de las sedes del alcance con: sede, identificador, estado (activa / retirada), equipo vinculado o su ausencia, trabajador con sesión iniciada, estado de la jornada, fecha de alta y quién la creó.

**FR-AD-CAJA-2** La lista debe distinguir tres situaciones de un vistazo, porque las tres impiden operar y se resuelven de forma distinta: **sedes sin ninguna caja**, **cajas sin equipo vinculado** y **cajas con jornada abierta**.

**FR-AD-CAJA-3** Una **sede sin ninguna caja** debe aparecer como fila propia, no como ausencia: es el estado en que llega toda sede recién asignada, y quien abre esta pantalla por primera vez tiene que entender qué le falta. Texto: "Esta sede todavía no tiene cajas. Crea al menos una para poder vincular un equipo y empezar a operar."

**FR-AD-CAJA-4** `/admin/cajas/nueva` da de alta una caja. Campos: sede e identificador de la caja.

**FR-AD-CAJA-5** El selector de sede ofrece únicamente sedes del alcance, y el dominio revalida al guardar **[A1]**, **[A4]**.

**FR-AD-CAJA-6** El identificador debe ser único dentro de su sede. Uno repetido se rechaza con "Ya existe una caja con ese nombre en esta sede."

**FR-AD-CAJA-7** Una caja nace **activa, sin equipo vinculado y sin jornada**. El resultado del alta debe encaminar al paso siguiente, que es vincularle un equipo (§3.2), con enlace directo.

**FR-AD-CAJA-8** **Retirar** una caja exige confirmación y motivo escrito.

**FR-AD-CAJA-9** No es posible retirar una caja con **jornada abierta**: "Esta caja tiene una jornada abierta. Ciérrala antes de retirarla." con enlace a esa jornada **[R6]**.

**FR-AD-CAJA-10** No es posible retirar una caja con **equipo vinculado**: "Esta caja tiene un equipo vinculado. Desvincúlalo antes de retirarla." con enlace a §3.2. Las dos acciones son del propio Admin, así que el camino está entero en su mano **[A4]**.

**FR-AD-CAJA-11** Retirar una caja **no borra nada**: su histórico de jornadas, movimientos y operaciones permanece íntegro y accesible, y la caja sigue apareciendo en los listados históricos marcada como retirada **[R9]**, **[A7]**.

**FR-AD-CAJA-12** Una caja retirada puede reactivarse. Reactivar no restaura ningún vínculo de equipo: hay que vincular uno de nuevo.

**FR-AD-CAJA-13** No es posible retirar la **última caja activa** de una sede activa: dejaría la sucursal sin ningún mostrador operable. El intento se rechaza con una explicación, no con un error genérico.

**FR-AD-CAJA-14** Alta, retirada y reactivación generan eventos de auditoría **[RP-21]**.

---

## 5. Inicio

El panel que responde "¿qué está pasando ahora?". Todo lo que muestra está acotado al alcance vigente **[A1]**.

**FR-AD-HOME-1** Encabeza con una fila de métricas del día: **sedes con jornada abierta** (sobre el total del alcance), **operaciones del día**, **volumen del día** y **aprobaciones pendientes**. El volumen se expresa **por moneda**, nunca convertido a una moneda única: el producto no tiene una tasa de consolidación definida por el negocio, e inventarla produciría cifras que nadie podría defender.

**FR-AD-HOME-2** Representa un **panel de atención** con las situaciones que piden acción, en este orden de prioridad: **sedes sin ninguna caja**; **cajas sin equipo vinculado**; **sedes sin ninguna moneda en su lista**; **sedes con el servicio de Cambio de moneda habilitado y ningún par definido**; aprobaciones pendientes; jornadas abiertas fuera del horario de su sede; arqueos cerrados con diferencia; tasas fijadas automáticamente al límite y aún no revisadas (**FR-AD-TASA-12**); **pares cuyo rango PuntoCash retiró** (**FR-AD-TASA-15**); promociones vencidas aún publicadas; y sedes sin jornada abierta dentro de su horario.

**FR-AD-HOME-3** Las cuatro primeras encabezan porque describen una sucursal a medio montar, no una incidencia del día: hasta que se resuelven, la sede no puede operar o exhibe un tablero incompleto.

**FR-AD-HOME-4** Cada entrada enlaza a la pantalla donde se resuelve.

**FR-AD-HOME-5** Cuando no hay ninguna situación que atender, el panel muestra un estado tranquilo y explícito ("Todo en orden en tus sedes"), nunca desaparece: su ausencia y su vacío deben distinguirse a simple vista.

**FR-AD-HOME-6** Representa una **tabla de estado por sede**: código y nombre, estado de la jornada (abierta / cerrada / sin abrir), cajas activas y cuántas sin equipo, kioscos vinculados, trabajador en turno, operaciones del día y hora de apertura. Cada fila enlaza a la ficha de la sede.

**FR-AD-HOME-7** Con "Todas mis sedes", la tabla muestra todas; con una sede concreta, se reduce a esa sede y se amplía con el detalle de sus cajas y sus equipos.

**FR-AD-HOME-8** Estado vacío de alcance: un operador sin sedes asignadas debe ver un Inicio que lo explique — "Todavía no tienes sedes asignadas. Cuando PuntoCash te asigne una, aparecerá aquí." — sin métricas en cero ni tablas vacías, que se leerían como un fallo.

---

## 6. Sedes

**FR-AD-SEDE-1** `/admin/sedes` lista las sedes del alcance con: código, nombre, municipio y provincia, estado, cajas activas, cajas con equipo vinculado, kioscos vinculados, trabajadores activos y estado de la jornada de hoy. Siempre muestra el alcance completo **[FR-AD-SCOPE-4]**.

**FR-AD-SEDE-2** Admite búsqueda por código o nombre y filtro por estado. No admite creación, edición ni baja **[A3]**.

**FR-AD-SEDE-3** `/admin/sedes/[id]` muestra la ficha en siete bloques: **datos maestros**, **servicios habilitados**, **cajas y sus equipos**, **kioscos**, **trabajadores**, **jornada en curso** y **contenido público**.

**FR-AD-SEDE-4** Los **datos maestros** —código, nombre, dirección, municipio, provincia, teléfono, horario, estado, fecha de alta— son de solo lectura, y debe declararlo de forma visible: "Estos datos los gestiona PuntoCash." No debe haber ningún control de edición, ni siquiera deshabilitado **[A3]**.

**FR-AD-SEDE-5** El bloque de datos maestros debe advertir además de su alcance real: esos datos son los que la sucursal exhibe en su kiosco y en su pantalla informativa **[A12]**, **[FR-PANT-DATA-4]**. Un teléfono equivocado ahí es un teléfono equivocado en la TV de la sala de espera, y el Admin no puede corregirlo por su cuenta: debe pedirlo a PuntoCash. La ficha debe indicar a quién.

**FR-AD-SEDE-6** El bloque de **servicios habilitados** lista qué servicios puede ofrecer esa sede, en solo lectura, con la misma advertencia: los habilita PuntoCash **[A3]**. Es el bloque que explica por qué el Admin puede o no definir pares de cotización en esa sede (§13).

**FR-AD-SEDE-7** El bloque de **cajas y sus equipos** lista las cajas con identificador, equipo vinculado o su ausencia, estado, trabajador con sesión iniciada y saldo por moneda si hay jornada abierta. Los saldos son de consulta **[A6]**. Enlaza a §4 y a §3.2.

**FR-AD-SEDE-8** El bloque de **kioscos** lista los vinculados a la sede con su identificador y última actividad, y enlaza a §3.3.

**FR-AD-SEDE-9** El bloque de **trabajadores** lista los adscritos a esa sede con nombre, identificador y estado, y enlaza al listado filtrado. **No muestra caja asignada, porque un trabajador no tiene caja** **[A13]**.

**FR-AD-SEDE-10** El bloque de **jornada en curso** muestra, si la hay, hora de apertura, caja, trabajador, fondeo declarado, movimientos hasta el momento y enlace al detalle. Si no la hay, indica desde cuándo la caja está cerrada y cuál fue la última jornada.

**FR-AD-SEDE-11** El bloque de **contenido público** resume lo que esa sucursal está exhibiendo ahora mismo: las monedas que maneja, los pares que cotiza con su tasa vigente, y sus promociones activas, con enlaces a §12, §13 y §14. Es la vista que responde "¿qué está viendo un cliente en mi sala de espera?" **[A12]**.

**FR-AD-SEDE-12** La ficha muestra la **asignación vigente** —desde qué fecha el operador administra esa sede— como dato informativo. No muestra el historial completo de asignaciones: ese historial incluye a otros operadores y pertenece al Super Admin **[A1]**.

**FR-AD-SEDE-13** Una sede **suspendida por PuntoCash** debe mostrarlo de forma destacada, con la fecha y el motivo declarado, y advertir de la consecuencia: ningún trabajador de esa sede puede iniciar sesión y no se abren jornadas nuevas mientras dure **[A14]**. La ficha sigue siendo consultable en su totalidad.

---

## 7. Trabajadores

El área donde el Admin crea personas — y, desde la v3.0, el **único lugar del producto donde se desactiva a una** **[A4]**, **[A14]**.

**FR-AD-TRAB-1** `/admin/trabajadores` lista los trabajadores de todas las sedes del alcance, con: nombre completo, identificador de acceso, **sede**, correo de verificación enmascarado, estado (activo / desactivado), fecha de alta y última jornada operada. **No hay columna de caja** **[A13]**.

**FR-AD-TRAB-2** Admite búsqueda por nombre o identificador y filtros por sede y por estado. Por defecto muestra solo los activos, con el filtro visible y modificable.

**FR-AD-TRAB-3** `/admin/trabajadores/nuevo` da de alta un trabajador. Campos: nombre, primer apellido, segundo apellido (opcional), tipo y número de documento, teléfono, **correo**, identificador de acceso y **sede**.

**FR-AD-TRAB-4** **El alta elige sede, nunca caja** **[A13]**, **[FR-DEV-5]**. El formulario debe explicarlo donde se decide, porque es contraintuitivo para quien viene de pensar en "el trabajador de la caja 3": "El trabajador podrá operar cualquier caja de esta sede. La caja la determina el equipo en el que inicie sesión."

**FR-AD-TRAB-5** El selector de sede ofrece **únicamente** sedes del alcance vigente, y el dominio revalida esa pertenencia al guardar **[A4]**, **[A1]**.

**FR-AD-TRAB-6** El **correo es obligatorio** y es el canal por el que llega el código de verificación en cada inicio de sesión **[R13]**, **[FR-2FA-16 y ss.]**. El formulario debe decirlo: "A este correo llegará el código de verificación cada vez que inicie sesión." Sin correo válido el trabajador no podría acceder nunca, así que el alta no debe permitirse.

**FR-AD-TRAB-7** Validaciones y mensajes: campo obligatorio vacío → "Este campo es obligatorio."; correo con formato inválido → "Introduce un correo válido."; identificador ya existente en la red → "Ese identificador ya está en uso."; documento ya registrado como trabajador → "Ya existe un trabajador con ese documento."

**FR-AD-TRAB-8** El alta genera una credencial inicial que se muestra una sola vez al terminar, con instrucción explícita de entregarla al trabajador. No debe poder volver a consultarse; si se pierde, se regenera.

**FR-AD-TRAB-9** `/admin/trabajadores/[id]` muestra la ficha con sus datos, su sede, su estado y su actividad reciente (últimas jornadas, cajas operadas y volumen), y permite editar los datos, **cambiar su correo**, reasignarlo a otra sede del alcance, regenerar credencial y desactivar.

**FR-AD-TRAB-10** **Asistencia de acceso.** La ficha ofrece **Ayudar con el acceso**, para el caso que el PRD de producto §5.1 llama "la asistencia del administrador de sede": cuando a un trabajador no le llega el código y ha agotado los tres reenvíos. Muestra el correo registrado, permite corregirlo si es el problema, y permite **liberar el bloqueo del reto vigente** para que pueda intentarlo de nuevo. Exige motivo escrito y genera evento de auditoría.

**FR-AD-TRAB-11** **Ayudar con el acceso no entrega, muestra ni genera ningún código de verificación, y no abre sesión por el trabajador.** El segundo factor no se salta ni se delega **[R13]**. La interfaz debe decirlo: "Esto no te da acceso a su cuenta ni te muestra su código; solo le permite volver a intentarlo."

**FR-AD-TRAB-12** **Desactivar** impide al trabajador iniciar sesión, pero no borra ni altera nada de lo que operó **[A7]**. Exige confirmación y motivo escrito, y genera evento de auditoría.

**FR-AD-TRAB-13** Un trabajador con **jornada abierta** no puede desactivarse: "Este trabajador tiene una jornada abierta en {caja} de {sede}. Ciérrala antes de desactivarlo." con enlace directo **[R6]**.

**FR-AD-TRAB-14** Reasignar un trabajador a otra sede tampoco es posible con una jornada abierta, con el mismo patrón. La reasignación tiene efecto inmediato sobre dónde puede iniciar sesión: desde ese momento solo en equipos de su sede nueva **[FR-DEV-6]**, y la confirmación debe advertirlo.

**FR-AD-TRAB-15** Un trabajador desactivado puede reactivarse; reactivar exige confirmar su sede. **No existe ningún caso en que un trabajador desactivado no pueda reactivarse desde esta consola**: PuntoCash no desactiva personas **[A14]**.

**FR-AD-TRAB-16** Si el **operador** o la **sede** están suspendidos por PuntoCash, los trabajadores afectados no pueden iniciar sesión aunque estén activos. La ficha debe distinguir ese estado del de un trabajador desactivado —"No puede acceder: {sede} está suspendida por PuntoCash"— y no ofrecer ninguna acción que sugiera poder resolverlo desde aquí **[A14]**.

---

## 8. Usuarios administradores

Los demás usuarios de la empresa administradora, a partir del primero que PuntoCash entregó al asignarle su primera sede **[A4]**, **[A3]**.

**FR-AD-USR-1** `/admin/usuarios` lista los usuarios administradores del operador de la sesión, con: nombre, identificador, correo enmascarado, estado, fecha de alta, último acceso y si es el usuario inicial entregado por PuntoCash.

**FR-AD-USR-2** `/admin/usuarios/nuevo` da de alta un usuario administrador. Campos: nombre, primer apellido, segundo apellido (opcional), **correo**, identificador de acceso y teléfono.

**FR-AD-USR-3** El correo es obligatorio, por la misma razón que en trabajadores: es el canal del segundo factor **[R13]**.

**FR-AD-USR-4** **Todo usuario administrador de un operador tiene exactamente las mismas potestades sobre todas sus sedes.** No hay sub-roles ni usuarios limitados a una sucursal. El formulario debe decirlo, sin rodeos, porque es la consecuencia que más probablemente sorprenda: "Este usuario podrá hacer todo lo que tú puedes hacer, en todas tus sedes."

**FR-AD-USR-5** El alta genera una credencial inicial que se muestra una sola vez, con el mismo tratamiento que **FR-AD-TRAB-8**.

**FR-AD-USR-6** `/admin/usuarios/[id]` permite editar datos, cambiar correo, regenerar credencial y **desactivar**.

**FR-AD-USR-7** Un usuario **no puede desactivarse a sí mismo**. El control debe estar ausente en la propia ficha, con la razón visible, en lugar de fallar al pulsarlo.

**FR-AD-USR-8** **No es posible desactivar al último usuario administrador activo de un operador.** El intento se rechaza con la consecuencia explicada: "Es el último administrador activo. Si lo desactivas, nadie de tu empresa podría entrar." Es lo que evita que un mercante se deje fuera de su propia consola, situación que no podría resolver por sí mismo.

**FR-AD-USR-9** Un usuario desactivado puede reactivarse desde esta misma pantalla.

**FR-AD-USR-10** Alta, edición, desactivación y reactivación generan eventos de auditoría **[RP-21]**.

---

## 9. Jornadas

**FR-AD-JOR-1** `/admin/jornadas` lista las jornadas de las cajas del alcance con: sede, caja, trabajador, fecha, hora de apertura, hora de cierre, estado (abierta / cerrada / cerrada forzosamente), operaciones, movimientos y diferencia de arqueo si está cerrada.

**FR-AD-JOR-2** Filtros: rango de fechas, sede, caja, trabajador, estado, y un conmutador "solo con diferencia". Orden por defecto: las abiertas primero, después las cerradas por fecha descendente.

**FR-AD-JOR-3** La diferencia de arqueo se representa con el mismo tratamiento semántico que en Worker —signo, color y magnitud— y por moneda, nunca agregada.

**FR-AD-JOR-4** `/admin/jornadas/[id]` muestra: cabecera con sede, caja, **equipo en el que se operó**, trabajador, apertura y cierre; fondeo inicial por moneda; saldos actuales o finales por moneda; el **libro de movimientos**; y, si está cerrada, el **arqueo** con conteo declarado, saldo esperado y diferencia por moneda.

**FR-AD-JOR-5** El libro de movimientos reutiliza la tabla y los filtros de Worker (`caja-movements-table`, `caja-movements-filters`) en solo lectura, y cada movimiento enlaza a su detalle, también de solo lectura.

**FR-AD-JOR-6** Toda cifra proviene de la instantánea almacenada y nunca se recalcula contra el estado vivo **[R9]**.

### 9.1 Forzar cierre

**FR-AD-JOR-7** El detalle de una jornada **abierta** ofrece **Forzar cierre**. No aparece en ninguna otra circunstancia.

**FR-AD-JOR-8** Se presenta con una advertencia previa que explica, sin jerga, qué implica: la caja queda cerrada, el trabajador no podrá seguir operando en ella hasta que abra una jornada nueva, y el cierre quedará marcado como forzado con el nombre del Admin.

**FR-AD-JOR-9** Exige **motivo escrito** de al menos 10 caracteres. Sin motivo, la acción no se habilita. El motivo no tiene valor predefinido ni lista de opciones **[A6]**.

**FR-AD-JOR-10** Un cierre forzado **no realiza arqueo**. Cierra la jornada dejando constancia de que se cerró sin conteo físico, y el saldo final registrado es el saldo en libros. La interfaz debe decirlo: "Esta jornada se cerrará sin arqueo. La diferencia con el efectivo físico no quedará conciliada."

**FR-AD-JOR-11** Al confirmar, el dominio revalida que la jornada sigue abierta. Si el Worker la cerró entretanto, se rechaza con "Esta jornada ya fue cerrada." y la pantalla se actualiza **[R3]**, **[R6]**.

**FR-AD-JOR-12** El cierre forzado **añade** un hecho nuevo —tipo de cierre, admin responsable, sello de tiempo y motivo— y no modifica, recalcula ni elimina ningún movimiento ni operación previos **[A7]**, **[R9]**.

**FR-AD-JOR-13** Forzar el cierre **no desvincula el equipo** de la caja ni al revés: son dos actos independientes sobre dos objetos distintos **[A11]**. Cuando se llega aquí desde **FR-AD-EQ-11**, la confirmación debe recordar que, tras cerrar, el equipo sigue vinculado.

**FR-AD-JOR-14** Una jornada cerrada forzosamente se distingue visualmente de una cerrada por arqueo en todo listado y detalle, y su detalle muestra el motivo y quién lo declaró.

**FR-AD-JOR-15** La acción genera un evento de auditoría **[RP-21]**.

---

## 10. Aprobaciones

**FR-AD-APR-1** `/admin/aprobaciones` es la bandeja de solicitudes del alcance. Dos pestañas: **Pendientes** (por defecto) y **Resueltas**.

**FR-AD-APR-2** Cada fila muestra: tipo (ajuste de efectivo / diferencia de arqueo), sede, caja, trabajador, fecha y hora, moneda e importe, signo de la diferencia, motivo declarado por el Worker y antigüedad.

**FR-AD-APR-3** Las pendientes se ordenan de más antigua a más reciente, porque la antigüedad es lo que las vuelve urgentes. Las resueltas, por fecha de resolución descendente.

**FR-AD-APR-4** Filtros: tipo, sede, rango de fechas y trabajador.

**FR-AD-APR-5** `/admin/aprobaciones/[id]` muestra el detalle completo: todos los datos del hecho original tal como el Worker los registró —conteo declarado, saldo esperado, diferencia, motivo, movimiento o arqueo de origen— con enlace al movimiento o a la jornada, y el contexto de la jornada.

**FR-AD-APR-6** El signo de la diferencia y el motivo declarado por el Worker se muestran juntos y sin reinterpretación **[R8]**.

**FR-AD-APR-7** Ofrece **Aprobar** y **Rechazar**. Ambas exigen motivo escrito de al menos 10 caracteres.

**FR-AD-APR-8** El motivo del Admin **se añade** al del Worker; no lo sustituye, no lo edita y no lo oculta. Ambos quedan visibles una vez resuelta **[A7]**, **[R8]**.

**FR-AD-APR-9** **Aprobar** confirma que el hecho queda asumido. **Rechazar** deja constancia de que el Admin no lo asume y marca la solicitud para revisión fuera del sistema. Ninguna modifica el saldo de la caja, el movimiento ni el arqueo original **[A6]**, **[A7]**.

**FR-AD-APR-10** La interfaz debe dejar claro ese límite en el punto de decisión: "Resolver esta solicitud deja constancia de tu decisión. No modifica el saldo de la caja ni el movimiento registrado."

**FR-AD-APR-11** Al confirmar, el dominio revalida que la solicitud sigue pendiente. Si otro usuario del mismo operador la resolvió entretanto, se rechaza con "Esta solicitud ya fue resuelta." **[R3]**, **[R6]**.

**FR-AD-APR-12** Toda resolución genera un evento de auditoría **[RP-21]**.

**FR-AD-APR-13** Estado vacío de Pendientes: "No tienes solicitudes pendientes." — distinto de un filtro sin resultados, que dice "Ninguna solicitud coincide con los filtros."

---

## 11. Operaciones

**FR-AD-OPS-1** `/admin/operaciones` lista las operaciones completadas en las sedes del alcance, con: código, fecha y hora, sede, caja, trabajador, servicio, cliente, importe y moneda, y estado.

**FR-AD-OPS-2** Filtros: rango de fechas, sede, caja, trabajador, servicio y estado, más búsqueda por código. Reutiliza el patrón de `operations-filters` de Worker, ampliado con sede, caja y trabajador — dimensiones que allí no existen porque siempre son una sola **[R12]**.

**FR-AD-OPS-3** `/admin/operaciones/[codigo]` muestra el detalle **reutilizando las vistas de Worker** (`operation-detail-view` y las especializadas de cambio de moneda, remesas y las dos variantes de giro) en solo lectura.

**FR-AD-OPS-4** El detalle añade el contexto que el Admin necesita y el Worker no: sede, caja, trabajador, jornada (con enlace) y, cuando la operación provino de una solicitud de kiosco, **el código `KS-` y el kiosco que la generó** **[FR-AS-DOM-11]**.

**FR-AD-OPS-5** El detalle **no** ofrece ninguna acción: ni reimprimir, ni anular, ni corregir, ni reenviar al proveedor **[A6]**, **[A7]**.

**FR-AD-OPS-6** Toda cifra y todo dato provienen de la instantánea histórica **[R9]**, **[R2]**.

**FR-AD-OPS-7** Los estados se muestran siempre traducidos, nunca como enum en bruto **[R10]**.

---

## 12. Monedas

La **lista de monedas que maneja cada sucursal**. Es una lista de monedas sueltas, no de pares: los pares se definen en Tasas (§13) **[A4]**.

**FR-AD-MON-1** `/admin/monedas` gestiona, por cada sede del alcance, qué monedas maneja esa sede. Muestra las monedas de la lista con su código, su nombre y en cuántas cajas de la sede está habilitada hoy cada una.

**FR-AD-MON-2** **Esta lista es lo que un Worker puede añadir a su caja.** El "catálogo" del que habla **FR-CAJA-13** del FRD de Worker —"ofrece únicamente monedas del catálogo"— deja de ser una constante del código y pasa a ser esta lista, resuelta por la sede de la caja. Lo mismo rige para el fondeo inicial, que recoge un importe por cada moneda habilitada (**FR-CAJA-8**).

**FR-AD-MON-3** Las monedas se eligen del **catálogo de monedas que la plataforma soporta**, mantenido por PuntoCash (**FR-SA-MON-1**). El Admin no inventa monedas: elige de las que existen.

**FR-AD-MON-4** Añadir una moneda a la lista de una sede **no la habilita en ninguna caja ni crea ningún saldo**: solo la pone a disposición de sus Workers. Quien la habilita en una caja concreta, y la fondea, es el Worker desde su propia pantalla de Caja **[A6]**. La pantalla debe decirlo, porque es la confusión más probable: "Añadir una moneda aquí no la activa en ninguna caja. Cada trabajador la habilita en la suya cuando la necesite."

**FR-AD-MON-5** **Esta lista no depende del servicio de Cambio de moneda.** Una sede necesita monedas para cualquier servicio que mueva efectivo —una remesa se paga en una moneda, un giro también—, así que la lista está disponible en toda sede activa. Lo que sí depende de ese servicio son los **pares** de §13. (*Esto matiza lo acordado en la v3.0, donde las monedas quedaban condicionadas al servicio de Cambio de moneda; con la lista redefinida como "lo que un Worker puede tener en su caja", esa condición dejaría a una sede de solo remesas sin poder manejar efectivo. Pendiente de confirmación del negocio.*)

**FR-AD-MON-6** **Retirar** una moneda de la lista exige confirmación y tiene efecto solo hacia adelante: impide que un Worker la añada a una caja en lo sucesivo. **No toca ningún saldo existente, ninguna caja que ya la tenga habilitada, ni un solo registro histórico** **[R9]**, **[A7]**.

**FR-AD-MON-7** No es posible retirar una moneda que alguna caja de la sede tenga **habilitada con saldo distinto de cero**. El intento se rechaza nombrando las cajas: "La {moneda} tiene saldo en {cajas}. Debe quedar en cero antes de retirarla de la lista." **[R6]**.

**FR-AD-MON-8** Retirar una moneda **retira también los pares de §13 que la usan**, porque un par sin una de sus monedas no puede cotizarse. La confirmación debe nombrarlos uno a uno antes de aceptar: "Se retirarán también estos pares: USD/CUP, USD/EUR."

**FR-AD-MON-9** No es posible retirar la **última moneda** de una sede activa: dejaría una casa de cambio sin poder manejar efectivo de ningún tipo. El intento se rechaza con una explicación.

**FR-AD-MON-10** Todo cambio genera un evento de auditoría **[RP-21]**.

---

## 13. Tasas

Donde el Admin **define los pares que su sede cotiza y la tasa de cada uno**. Gobierna dos cosas a la vez que hasta ahora estaban separadas: lo que la sede **cotiza** y lo que su tablero **exhibe**. Son el mismo dato **[A12]**, **[RP-25]**.

**FR-AD-TASA-1** `/admin/tasas` lista, por cada sede del alcance, los pares que esa sede tiene definidos, con: monedas del par, tasa de compra, tasa de venta, el rango permitido por PuntoCash, fecha y autor del último cambio, e indicador de si fue fijada automáticamente. Ofrece **Definir par**.

**FR-AD-TASA-2** Un par solo puede definirse si se cumplen **las tres condiciones**, y la pantalla debe decir cuál falta en cada caso, nunca limitarse a no ofrecer la opción **[FR-AD-STATE-6]**:

1. **Ambas monedas están en la lista de la sede** (§12). Si falta una, el mensaje debe enlazar a `/admin/monedas`: "La {moneda} no está en la lista de esta sede. Añádela antes de definir el par."
2. **PuntoCash tiene un rango definido para ese par** **[A5]**, **[RP-22]**. Sin rango no hay límite dentro del cual fijar la tasa, así que el par no puede existir. El mensaje debe identificar a quién pedírselo: "PuntoCash todavía no ha definido un rango para {par}. Solicítaselo para poder cotizarlo."
3. **PuntoCash ha habilitado el servicio de Cambio de moneda en esa sede** **[A5]**, **[A3]**.

**FR-AD-TASA-3** La pantalla debe mostrar, junto a los pares definidos, **los pares posibles que no puede definir todavía y por qué** — combinaciones de sus propias monedas para las que PuntoCash no tiene rango. Es lo que convierte una ausencia inexplicable en una petición concreta que el mercante puede hacer.

**FR-AD-TASA-4** Una sede sin el servicio de Cambio de moneda habilitado debe aparecer igualmente en la lista, con la razón visible —"PuntoCash no ha habilitado el Cambio de moneda en esta sede"— y sin controles, en lugar de desaparecer sin explicación **[A3]**.

**FR-AD-TASA-5** **Definir un par fija su tasa en el mismo acto**: compra y venta, ambas dentro del rango. **No existe un par sin tasa.** Un par a medio definir exhibiría una moneda en el tablero sin cifra al lado, que es peor que no exhibirla.

**FR-AD-TASA-6** La pantalla debe declarar, de forma visible y permanente, el alcance real de lo que se edita: "Esta es la tasa con la que cotiza la sede y la que muestra su tablero de tasas en el kiosco y en la pantalla informativa." **[A12]**, **[FR-PANT-DATA-3]**.

**FR-AD-TASA-7** El rango de PuntoCash es de solo lectura y se representa como el límite que es, visualmente presente junto a cada campo editable, no escondido en un texto de ayuda **[A5]**.

**FR-AD-TASA-8** La validación es inmediata y el mensaje dice el límite concreto: "La tasa de venta debe estar entre 118,00 y 124,00." Una tasa fuera de rango no debe poder guardarse ni por la interfaz ni por el dominio **[A5]**, **[RP-22]**.

**FR-AD-TASA-9** Con una sede seleccionada en el alcance, la pantalla la muestra en detalle y permite editar. Con "Todas mis sedes", muestra la comparativa entre sedes y la edición exige entrar en una sede concreta — definir o cambiar la tasa de varias sedes a la vez no debe ser posible, porque cada sede responde de la suya.

**FR-AD-TASA-10** Guardar exige confirmación con un resumen: par, tasa anterior, tasa nueva y sede afectada. La confirmación debe advertir de las dos consecuencias: el cambio afecta a las operaciones que se coticen a partir de ese momento, **y el tablero de la sucursal pasa a mostrar la tasa nueva**; y **no altera ninguna operación ya registrada** **[R9]**.

**FR-AD-TASA-11** Al confirmar, el dominio revalida las tres condiciones de **FR-AD-TASA-2** y el rango vigente. Si PuntoCash movió el rango mientras la pantalla estaba abierta: "PuntoCash cambió el rango permitido. Revisa el valor." **[R3]**.

**FR-AD-TASA-12** Cuando una tasa ha sido **fijada automáticamente al límite** por un cambio de rango de PuntoCash **[A5]**, la pantalla lo marca de forma destacada, indica la fecha y la tasa anterior, y ofrece fijar un valor nuevo dentro del rango actual. Mientras no se revise, aparece en el panel de atención del Inicio (**FR-AD-HOME-2**).

**FR-AD-TASA-13** **Retirar un par** exige confirmación y advierte de su efecto hacia adelante: la sede deja de poder cotizarlo y desaparece de su tablero. No afecta a las operaciones ya registradas de ese par **[R9]**. Retirar un par **no** retira sus monedas de la lista de §12: la sede sigue pudiendo manejarlas en caja.

**FR-AD-TASA-14** Si PuntoCash **deshabilita el servicio** de Cambio de moneda en una sede, sus pares dejan de exhibirse y de poder cotizarse de inmediato, sin que el Admin los retire uno a uno. La pantalla debe reflejar ese estado y **conservar los pares definidos** para cuando el servicio vuelva a habilitarse.

**FR-AD-TASA-15** Si PuntoCash **retira el rango** de un par que alguna sede tiene definido, ese par deja de cotizarse en esas sedes y sus Admins deben verlo marcado con la razón. No se borra: si el rango vuelve, el par vuelve con su última tasa, revalidada contra el rango nuevo.

**FR-AD-TASA-16** Todo cambio genera un evento de auditoría **[RP-21]**.

**FR-AD-TASA-17** Esta pantalla gobierna la tasa; **no** gobierna comisiones ni cargos por servicio, que son competencia de PuntoCash **[A8]**.

---

## 14. Promociones

Lo que la sucursal anuncia en su pantalla informativa. Sustituye al mock fijo de `signage-data.ts` **[FR-PANT-DATA-5]**.

**FR-AD-PROM-1** `/admin/promociones` lista las promociones que afectan a las sedes del alcance, con: título, sedes en las que se muestra, vigencia (desde–hasta), estado (programada / vigente / vencida) y **origen** (propia del operador o de red, publicada por PuntoCash).

**FR-AD-PROM-2** Tres pestañas por estado: **Vigentes** (por defecto), **Programadas** y **Vencidas**.

**FR-AD-PROM-3** El Admin crea, edita y retira **sus propias** promociones. Las de **red** se muestran en solo lectura y **no puede retirarlas ni editarlas**; la interfaz debe explicarlo —"Esta promoción la publica PuntoCash"— en lugar de ofrecer controles que fallan.

**FR-AD-PROM-4** `/admin/promociones/nueva` pide: título, texto, sedes del alcance en las que se muestra (una, varias o todas), fecha de inicio y fecha de fin. Todos obligatorios.

**FR-AD-PROM-5** La fecha de fin debe ser posterior a la de inicio → "La fecha de fin debe ser posterior a la de inicio." Una promoción puede programarse con inicio futuro; nace en estado programada y no se exhibe hasta su fecha.

**FR-AD-PROM-6** **Solo se exhiben las promociones vigentes en la fecha actual** **[FR-PANT-DATA-5]**. Una vencida deja de mostrarse sola, sin que nadie la retire a mano.

**FR-AD-PROM-7** El formulario debe mostrar una **previsualización** de cómo se verá el panel en la pantalla informativa, porque se lee desde el otro extremo de una sala. Debe advertir cuando el texto exceda lo legible a esa distancia.

**FR-AD-PROM-8** El formulario debe indicar **cuántas promociones quedarían en rotación** en cada sede elegida, sumando las propias y las de red, y advertir cuando el número supere lo que el carrusel puede rotar de forma legible. Una sucursal con nueve promociones no anuncia ninguna.

**FR-AD-PROM-9** **Retirar** una promoción vigente exige confirmación y tiene efecto inmediato en las pantallas de sus sedes. Retirar no borra: pasa a vencida y queda en el histórico.

**FR-AD-PROM-10** Alta, edición y retirada generan eventos de auditoría **[RP-21]**.

**FR-AD-PROM-11** Nada de lo publicado aquí puede alimentar ni modificar una operación: es contenido de exhibición **[R10]**, **[FR-PANT-DATA-2]**. Ninguna promoción define una tasa, un descuento aplicable ni una condición comercial que un flujo de Worker lea.

---

## 15. Reportes

**FR-AD-REP-1** `/admin/reportes` presenta el volumen del alcance en cuatro cortes: **por sede**, **por servicio**, **por trabajador** y **por día**. El corte se elige; no se muestran los cuatro a la vez.

**FR-AD-REP-2** Todo reporte se acota a un rango de fechas, con accesos rápidos a hoy, últimos 7 días, últimos 30 días y mes en curso.

**FR-AD-REP-3** Las cifras se expresan **por moneda**, sin convertir a una moneda única **[FR-AD-HOME-1]**.

**FR-AD-REP-4** Cada corte muestra número de operaciones e importe por moneda. El corte por día añade una representación temporal; los cortes por sede y por trabajador admiten ordenación por cualquier columna.

**FR-AD-REP-5** Toda representación gráfica sigue el sistema visual del manual de marca, sin paleta propia ni elementos decorativos que compitan con las cifras.

**FR-AD-REP-6** Los reportes **no** muestran comisiones, rentas, liquidaciones ni margen **[A8]**.

**FR-AD-REP-7** Esta versión **no incluye exportación a archivo** **[R11]**, y la interfaz no ofrece ningún control de descarga. Pendiente de decisión de negocio (PRD de Administración §9).

---

## 16. Modelo de dominio y datos simulados

**FR-AD-DOM-1** La capa se apoya en un módulo de dominio nuevo, `src/features/network`, con datos simulados en memoria, sin backend ni persistencia real.

**FR-AD-DOM-2** Debe exponer, como mínimo: `Operador`, `UsuarioAdmin`, `Sede`, `Caja`, `Asignacion`, `ServiciosSede`, `CatalogoMonedas` (plataforma), `PoliticaTasas` (rangos de red por par), `MonedasSede` (la lista de §12), `ParSede` (par + tasa de compra y venta, §13), `Promocion`, `SolicitudAprobacion` y `EventoAuditoria`, con las consultas acotadas por alcance y las escrituras que esta consola necesita.

**FR-AD-DOM-3** El dominio de Caja existente (`src/features/caja`) debe ampliarse con el enlace **Caja → Sede**, que hoy no existe, y el de trabajadores con **Trabajador → Sede** **[A13]**. Toda consulta de jornadas, movimientos y operaciones debe poder acotarse por sede a través de él. Esto es además lo que cierra el hueco que el kiosco dejó anotado en **FR-AS-DOM-11**: con Caja→Sede, Buscar solicitud ya puede filtrar por sede como exige **[RP-14]**.

**FR-AD-DOM-4** La vinculación de equipos debe apoyarse en el mecanismo compartido que ya existe, `src/features/devices/device-link.ts`, con sus dos consumidores (`features/kiosk/device-session.ts` y `features/worker/register-device.ts`). Esta consola **no** debe implementar un segundo mecanismo paralelo.

**FR-AD-DOM-5** El acotamiento por alcance debe resolverse **en el dominio**, no en la interfaz: las consultas reciben el alcance de la sesión y nunca devuelven registros fuera de él **[A1]**, **[RP-19]**.

**FR-AD-DOM-6** El dominio debe hacer imposible, no solo improbable, que PuntoCash escriba dentro de una sede: las escrituras sobre `Caja`, `Trabajador`, `UsuarioAdmin`, `MonedasSede`, `ParSede` y los vínculos de equipo deben exigir un alcance de operador, y rechazar un alcance global **[A14]**, **[RP-26]**.

**FR-AD-DOM-7** El **contenido público de sede** (pares y tasas exhibidas, datos de sede, promociones) debe servirse desde este dominio como un único origen, y `signage-data.ts` debe pasar a leer de él en lugar de sus constantes fijas **[A12]**, **[RP-25]**, **[FR-PANT-DATA-7]**. Mientras esa sustitución no ocurra, el tablero seguirá mostrando cifras distintas de las que la sede cotiza, que es el defecto que **FR-PANT-IMP-4** ya documenta.

**FR-AD-DOM-8** Los datos simulados deben incluir material suficiente para que las pantallas se vean como se verán en producción: al menos tres operadores, seis sedes repartidas de forma desigual (uno con una sola sede, otro con tres), **una sede recién asignada y sin ninguna caja**, cajas con y sin equipo vinculado, un kiosco vinculado por sede, doce trabajadores, dos usuarios administradores en al menos un operador, jornadas abiertas y cerradas, al menos un arqueo con diferencia, dos solicitudes pendientes y una resuelta, **una sede con dos monedas en su lista y un par posible que PuntoCash no tiene con rango**, **una sede sin el servicio de Cambio de moneda habilitado pero con monedas en su lista**, promociones en los tres estados y de los dos orígenes, y un historial de operaciones de varios días.

**FR-AD-DOM-9** Al menos un operador debe tener **una sola sede**, para que **FR-AD-SCOPE-3** sea verificable sin construir datos a mano.

---

## 17. Comportamiento transversal

**FR-AD-STATE-1** Toda tabla implementa cuatro estados distinguibles: con datos, cargando, vacía por ausencia de datos, y vacía por filtros sin resultados. Los dos vacíos nunca comparten mensaje.

**FR-AD-STATE-2** Toda acción que escribe debe mostrar estado de envío, impedir el doble envío y confirmar el resultado.

**FR-AD-STATE-3** Toda acción irreversible o con consecuencia sobre la operación —desactivar trabajador o usuario, retirar una caja, forzar cierre, resolver solicitud, definir, cambiar o retirar un par, añadir o retirar una moneda de la lista, vincular o desvincular un equipo, retirar una promoción— pide confirmación explícita en un diálogo que resume qué va a pasar.

**FR-AD-STATE-4** Ningún error muestra jerga interna, códigos de excepción ni nombres de campo del dominio **[R10]**.

**FR-AD-STATE-5** Toda pantalla mantiene la usabilidad por teclado y la jerarquía de datos financieros que el manual de marca exige.

**FR-AD-STATE-6** Cuando una acción está impedida por algo que PuntoCash controla —servicio no habilitado, par sin rango, sede u operador suspendidos—, la interfaz debe decir **quién** lo controla y **qué pedir**, nunca limitarse a deshabilitar el control **[A3]**, **[A14]**.

---

## 18. Condiciones conocidas y fuera de alcance

- **Nada de esto está implementado.** `/admin` contiene hoy un README de marcador de posición, y la demostración suple §3 con `/kiosk/simulador-admin`.
- **Sin backend.** Dominio simulado en memoria; una recarga completa restaura los datos precargados.
- **Sin sub-roles.** Todos los usuarios administradores de un operador tienen las mismas potestades sobre todas sus sedes **[FR-AD-USR-4]**.
- **Sin administración de Pantallas informativas.** Se asignan a su sede en el propio equipo (FR-PANT-SEDE-1 a 7).
- **Sin edición de datos maestros de sede, servicios ni rangos de tasa**, que son de PuntoCash **[A3]**.
- **Sin exportación de reportes** **[R11]**.
- **Sin notificaciones** fuera de la consola.
- **Sin recuperación de acceso** funcional. La asistencia de **FR-AD-TRAB-10** cubre la pantalla, no el mecanismo de fondo.
- **Sin nada económico** **[A8]**.
- **Revisión visual obligatoria** antes de dar por terminada cualquier pantalla, a 1440×900 —y a 360px para las de §3, por **FR-AD-SHELL-7**—, conforme al procedimiento de `CLAUDE.md`.

---

## Apéndice A · Mapa de reglas a requisitos

| Regla | Requisitos que la implementan |
| --- | --- |
| **A1** Aislamiento por alcance | FR-AD-NAV-2, FR-AD-NAV-3, FR-AD-SCOPE-1, FR-AD-EQ-1, FR-AD-EQ-7, FR-AD-CAJA-5, FR-AD-TRAB-5, FR-AD-SEDE-12, FR-AD-DOM-5 |
| **A2** Una asignación vigente | FR-AD-SEDE-12 (lectura); la gestión es del Super Admin |
| **A3** Solo PuntoCash decide qué sedes existen y sus límites | FR-AD-SEDE-2, FR-AD-SEDE-4, FR-AD-SEDE-5, FR-AD-SEDE-6, FR-AD-MON-3, FR-AD-TASA-2, FR-AD-TASA-4, FR-AD-STATE-6 |
| **A4** El mercante gobierna lo de dentro | FR-AD-CAJA-1 a 14, FR-AD-EQ-3, FR-AD-TRAB-3 a 15, FR-AD-USR-1 a 10, FR-AD-MON-1 a 10, FR-AD-TASA-1 a 17 |
| **A5** Tasa dentro del rango, sobre monedas propias y servicio habilitado | FR-AD-TASA-2, FR-AD-TASA-5, FR-AD-TASA-7, FR-AD-TASA-8, FR-AD-TASA-11, FR-AD-TASA-12, FR-AD-TASA-15 |
| **A6** Supervisa y desbloquea, no opera | FR-AD-SEDE-7, FR-AD-JOR-7 a 9, FR-AD-APR-9, FR-AD-APR-10, FR-AD-OPS-5, FR-AD-TRAB-11 |
| **A7** No altera lo del Worker | FR-AD-CAJA-11, FR-AD-JOR-12, FR-AD-APR-8, FR-AD-APR-9, FR-AD-TRAB-12, FR-AD-OPS-5 |
| **A8** Sin economía PuntoCash↔mercante | FR-AD-TASA-11, FR-AD-REP-6 |
| **A9** PuntoCash es la marca visible | FR-AD-SHELL-4, FR-AD-SHELL-5 |
| **A10** Los equipos los vincula el Admin | FR-AD-EQ-3, FR-AD-EQ-7, FR-AD-EQ-13, FR-AD-EQ-17, FR-AD-EQ-25 |
| **A11** Un equipo, un puesto | FR-AD-EQ-8, FR-AD-EQ-10, FR-AD-EQ-14, FR-AD-JOR-13 |
| **A12** Fuente única del contenido de sede | FR-AD-SEDE-5, FR-AD-SEDE-11, FR-AD-MON-2, FR-AD-TASA-6, FR-AD-PROM-6, FR-AD-DOM-7 |
| **A13** El trabajador es de una sede | FR-AD-TRAB-1, FR-AD-TRAB-4, FR-AD-TRAB-14, FR-AD-SEDE-9, FR-AD-DOM-3 |
| **A14** PuntoCash observa y actúa solo sobre la sede entera | FR-AD-EQ-3, FR-AD-TRAB-15, FR-AD-TRAB-16, FR-AD-SEDE-13, FR-AD-ACC-6, FR-AD-DOM-6, FR-AD-STATE-6 |
| **R3** Revalidación al confirmar | FR-AD-EQ-22, FR-AD-JOR-11, FR-AD-APR-11, FR-AD-TASA-8 |
| **R6** Nada resuelto se reprocesa | FR-AD-EQ-22, FR-AD-EQ-23, FR-AD-CAJA-9, FR-AD-TRAB-13, FR-AD-JOR-11, FR-AD-APR-11 |
| **R8** Signo y motivo coherentes | FR-AD-APR-6, FR-AD-APR-8 |
| **R9** Histórico inmutable | FR-AD-CAJA-11, FR-AD-JOR-6, FR-AD-JOR-12, FR-AD-MON-6, FR-AD-OPS-6, FR-AD-TASA-10, FR-AD-TASA-13 |
| **R10** Sin enums en bruto | FR-AD-OPS-7, FR-AD-PROM-11, FR-AD-STATE-4 |
| **R11** Sin descarga | FR-AD-REP-7 |
| **R12** Worker acotado a la caja de su equipo | Intacta; FR-AD-OPS-2 explica por qué esta consola amplía filtros que allí no existen |
| **R13** Sin segundo factor no hay sesión | FR-AD-ACC-1, FR-AD-ACC-2, FR-AD-TRAB-6, FR-AD-TRAB-11, FR-AD-USR-3 |
