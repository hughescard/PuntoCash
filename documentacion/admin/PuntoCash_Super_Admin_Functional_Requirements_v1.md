# PuntoCash — Super Admin
## Documento de Requisitos Funcionales (FRD) · v4.2

**Estado:** **Especificación de implementación. La aplicación no está construida.** Hoy `/super-admin` contiene un README de marcador de posición.

**Destinatarios:** Personas desarrolladoras y QA. Utilizable como especificación de implementación y como referencia de aceptación.

**Alcance:** Únicamente la consola de PuntoCash sobre su red, `/super-admin`. La consola del mercante se especifica en `PuntoCash_Admin_Sede_Functional_Requirements_v1.md`, al que este documento se remite en todo lo que comparte.

**Control de cambios — v4.0 (2026-11-03).** **Auditoría: el objeto de un evento se enlaza a su ficha.** El registro pasa a guardar el identificador del trabajador o de la cuenta de PuntoCash sobre quien se actuó (hasta ahora solo guardaba cómo se llamaba), y **FR-SA-AUD-5** se amplía: el nombre se enlaza a la ficha del trabajador, y a la de la cuenta de PuntoCash cuando quien mira es el principal. Los eventos anteriores a este cambio que no llevan identificador siguen siendo texto, salvo el sembrado de Noelia Alonso.

**Control de cambios — v4.2 (2026-11-03).** **La lista ISO trae también las banderas.** Las 159 monedas ISO llevan su bandera (FR-SA-MON-9), de modo que una moneda añadida al catálogo ya no sale sin ella. Desarrolladores: lista, nombres, símbolos y banderas están en un mismo sitio.

**Control de cambios — v4.1 (2026-11-03).** **Los rangos admiten hasta cuatro decimales.** Un límite de rango (compra o venta, mínimo o máximo) se escribe con hasta 4 decimales; con más se rechaza con «Una tasa o un límite admite hasta 4 decimales». Las cifras se muestran con dos decimales como mínimo y cuatro como máximo, y sin decimales si son enteras.

**Control de cambios — v3.9 (2026-11-03).** **Una promoción de red llega a toda sede, ofrezca o no el servicio que anuncia (FR-SA-PROM-11, nuevo).** Una sede no solo presta servicios: también es el escaparate de PuntoCash, y por eso informa y promociona a sus clientes haya o no una operación detrás del aviso, y lo hace igual la administre PuntoCash o un mercante. Por eso la consola **no** cruza el destino de una promoción con los servicios habilitados de cada sede. Cierra la duda que quedaba abierta desde el tramo 5. Sin cambios de comportamiento.

**Control de cambios — v3.8 (2026-11-03).** **Las monedas se eligen de la lista ISO 4217, y los decimales son cuatro, fijos.** (1) «Añadir moneda» ya no pide código, nombre, símbolo y decimales: PuntoCash **elige una moneda de la lista ISO 4217** (159 monedas, sin metales ni unidades de cuenta) y de ella salen el código, el nombre y el símbolo. Así no se puede registrar una moneda con un código o un símbolo equivocado, ni quedarse con uno que luego no se pueda corregir. La lista solo ofrece las que no están ya en el catálogo, retiradas incluidas (esas se reincorporan). (2) **Toda moneda se maneja con cuatro decimales**, sin excepción y sin que nadie lo pueda editar: es una regla del catálogo, no un dato de cada moneda, así que el alta no lo pregunta y la tabla ya no lo muestra por fila. Dicho: ninguna pantalla existente formatea importes con cuatro decimales todavía; la regla queda fijada en el catálogo y se aplica a medida que cada pantalla se revise. (3) En la tabla, las tres acciones de cada fila (rango, retirar rango, retirar o reincorporar moneda) pasan a un **menú «⋯» de acciones**, para no repetir los mismos tres botones en cada fila. (4) **Worker queda recableado**: «Añadir moneda» en la caja ofrece la lista de monedas de la sede de la caja (la que decide su mercante, **FR-AD-MON-2**) menos las que la caja ya tiene, y ya no tiene catálogo propio. Una moneda nueva del catálogo llega a la caja solo si el mercante la añade antes a su sede. Esto sustituye la salvedad del v3.7 sobre la lista fija de once monedas.

**Control de cambios — v3.7 (2026-11-03).** **PuntoCash mantiene el catálogo de monedas de la plataforma.** Revierte la decisión del 28/10 de dejarlo fijo: la consola añade, retira y reincorpora monedas, y **FR-SA-MON-1 a MON-6** pasan de «sin construir» a construidos. Va en la **misma tabla que los rangos** (una fila por moneda, decisión del 27/10), no en una vista aparte: «Añadir moneda» arriba, y «Retirar moneda» o «Reincorporar» en cada fila. Tres precisiones: (1) el catálogo **se añade y se retira, no se edita**: el código, el nombre, el símbolo y los decimales no cambian después del alta, porque cambiar los decimales de una moneda con saldos movería cifras ya registradas; (2) una moneda retirada **no desaparece**: queda al final de la tabla, con su etiqueta, porque siguen existiendo sedes que la tienen y es desde ahí desde donde se reincorpora (**FR-SA-MON-7**, nuevo); (3) a una moneda retirada **no se le puede abrir un rango nuevo**, pero el que ya tiene se puede seguir cambiando y retirando, porque las sedes que la cotizan lo siguen necesitando (**FR-SA-MON-8**, nuevo). Los eventos de auditoría de estos cambios dejan de estar excluidos de **FR-SA-AUD-2**. Fuera de alcance, y dicho: el símbolo y los decimales se guardan y se muestran aquí, pero ninguna otra pantalla los usa todavía, y **Worker sigue con su lista fija de once monedas** hasta que se recablee contra este dominio (nota de entrega, §8.3): una moneda nueva aparece en Admin y en Super administración, no en la caja del trabajador.

**Control de cambios — v3.6 (2026-11-02).** **A los administradores de una empresa se les llama «administradores», no «usuarios».** Los trabajadores también son usuarios del producto, y llamar «usuarios» solo a los administradores de una empresa confunde. La columna «Personas» del listado dice «N administradores» y «N trabajadores»; el bloque de la ficha se titula «Administradores»; **FR-SA-OPE-1**, **OPE-8**, **OPE-9** y **OPE-10** se redactan igual. Sin cambios de comportamiento. El cambio alcanza también al formulario de alta del operador (el bloque «Administrador principal» y su aviso), a los mensajes de rechazo del alta, a las etiquetas y el grupo de la auditoría («Administrador creado», «Administradores») y, en Admin, a la sección que antes se llamaba «Usuarios» (ahora «Administradores», FRD de Admin v8.3). «Usuarios» queda para las cuentas de PuntoCash, el menú de Super Admin.

**Control de cambios — v3.5 (2026-11-02).** **Auditoría: lo que se pide ahora es lo que se construyó, y el registro se puede descargar.** §14 se reescribe. **FR-SA-AUD-1** fija las columnas (fecha y hora, evento con su objeto, quién y con qué rol, sede y operador, motivo) y que se lee por tandas de 50, sin ventana de fechas obligatoria: a diferencia de Operaciones, el registro de gobierno crece a decenas de actos por semana, y quien audita busca un acto, no un periodo. **FR-SA-AUD-2** distingue lo que se registra de lo que **ninguna pantalla produce hoy**: el alta y la retirada de monedas del catálogo (la tabla de Monedas y tasas no mantiene el catálogo) y la credencial inicial regenerada (la sustituyó el restablecimiento del acceso del principal) salen de la lista de obligatorios hasta que esas acciones existan, y se añade «auditoría exportada». **FR-SA-AUD-4** precisa que la búsqueda mira el motivo **y el objeto**, y que el tipo de evento se elige agrupado por lo que se gobierna. **FR-SA-AUD-5** se limita a lo que el registro sabe: enlaza a la **sede** y al **operador**, no a la persona o a la caja sobre la que se actuó. **FR-SA-AUD-9** (nuevo): **Excel** con lo que hay en pantalla; como este archivo —a diferencia de un reporte— **nombra personas**, la exportación misma queda en el registro con sus filtros. **FR-SA-AUD-10** (nuevo): quien consta como autor es siempre una persona de la consola, no el nombre de un área. §17 deja de decir «sin exportación de la auditoría». Un defecto corregido de paso: el registro vivía en el módulo y no en `globalThis`, de modo que en el servidor de desarrollo lo que registraba una exportación no lo veía la pantalla.

**Control de cambios — v3.4 (2026-11-02).** **Reportes: lo que se pide ahora es lo que se construyó, y el reporte se puede descargar.** §12 estaba escrita antes de decidir qué cuenta como volumen de un mercante cuando una sede cambia de manos, y decía «sin exportación». Se reescribe. REP-1 y REP-2 fijan los cinco cortes y el periodo (el de Admin, con un solo tope: un año). REP-4 deja de pedir «normalizar» en abstracto: el corte por operador muestra el **total** y, con un interruptor, el **promedio por sede administrada**, y la columna «Sedes» dice entre cuántas se divide. REP-5 (nuevo) fija de quién es cada operación: **el mercante que administraba la sede el día en que se hizo**, no el de hoy, de modo que el reporte de un mercante no cambia cuando una sede se entrega a otro; una fila «Sin operador» aparece solo si hay operaciones sin dueño, para que las filas sigan sumando el total. REP-8 (nuevo): se exporta a **Excel** y a **PDF** con los cinco cortes, y por eso la línea de §17 que decía «sin exportación de reportes» pasa a decir solo «de auditoría». La excepción a **[R11]** es la misma que en Admin: el archivo lleva únicamente totales, nunca datos de un cliente.

**Control de cambios — v3.3 (2026-11-02).** **Promociones de red: el destino se guarda como sedes, no como regla; la saturación dice de quién es el exceso; y la lista es solo de lo que PuntoCash gobierna.** §11 se precisa en cuatro puntos. (1) **FR-SA-PROM-2**: «por operador» y «por provincia» dejan de ser criterios de destino y pasan a ser **atajos para marcar sedes**. Lo que una promoción guarda es «toda la red» —que incluye las sedes que se creen después— o la lista de sedes marcadas; si una sede cambia de operador sigue mostrándola, porque el cliente en la sala ve PuntoCash y no al operador. (2) **FR-SA-PROM-5** se reparte en dos sitios: el formulario dice, por sede, con cuántas coincidiría **a la vez** y de quién es cada una, y el listado avisa de las sedes que hoy ya pasan de cuatro. Separar «de PuntoCash» de «de un operador» importa porque PuntoCash solo puede retirar las suyas. (3) **FR-SA-PROM-9** (nuevo): el listado contiene **solo** las de red; las de un operador cuentan para la saturación y se abren en solo lectura desde la ficha de la sede, pero no son de esta consola. (4) **FR-SA-PROM-10** (nuevo): el administrador de sede ve «Publicada por PuntoCash» en una promoción de red, nunca el nombre de la persona que la publicó. Además, el formulario conserva lo escrito tras un rechazo del servidor (FR-SA-PROM-3 remite a FR-AD-PROM-5).

**Control de cambios — v3.2 (2026-10-28).** **Un operador nunca se queda sin administrador, y el documento deja de admitir lo contrario.** Tres requisitos arrastraban un modelo anterior al administrador principal. **FR-SA-ASG-3** contemplaba asignar una sede a un operador sin usuarios y mandaba crear uno en ese momento: ese caso no existe, porque el alta del operador crea al principal (**FR-SA-OPE-5**), a él no lo desactiva nadie (**FR-AD-USR-13**) y el papel solo se traspasa a otro activo (**FR-AD-USR-12**); el requisito pasa a enunciar la garantía y a prohibir que las pantallas avisen de un caso imposible. **FR-SA-OPE-11** se apoyaba en ese mismo caso y en **FR-AD-USR-8**, que está retirado: ahora es el **restablecimiento del acceso del administrador principal**, disponible siempre y no solo ante una incidencia. **FR-SA-OPE-10** y la lista de eventos de **FR-SA-AUD-2** se ajustan a lo anterior. Sin cambios en el resto. Esta versión es un parche sobre la v3.1: la reescritura completa en el formato de la v8 de Admin sigue pendiente.

**Control de cambios — v3.1 (2026-09-23).** **Separación de monedas y tasas, y catálogo de plataforma.** §9 pasa a llamarse **Monedas y tasas** y se organiza en tres vistas: **9.1 Monedas de la plataforma** (`FR-SA-MON-*`, nuevo), el catálogo del que cada mercante elige las monedas de sus sedes; **9.2 Rangos de la red** (`FR-SA-TASA-1..11`), donde definir el rango de un par es lo que lo pone a disposición de la red y retirarlo lo saca de circulación sin borrar nada; y **9.3 Monedas y pares por sede** (`FR-SA-TASA-12..15`), de solo lectura. Se ajustan la barra lateral, las alertas de §3, FR-SA-SERV-4, §15 y el Apéndice A.

**Control de cambios — v3.0 (2026-09-23).** **PuntoCash deja de intervenir dentro de las sedes.** La v2.0 le daba capacidades que no le corresponden. Cinco cambios. (1) **Desaparece la gestión de cajas**: una sede se crea sin cajas y las crea su mercante; §4.2 y §4.3 se reescriben. (2) **Desaparece la habilitación de monedas por sede** (la §8 de la v2.0), que pasa al mercante condicionada al servicio de Cambio de moneda; lo que queda aquí es el rango y la consulta. (3) **Desaparece la desactivación de trabajadores**: §6 queda enteramente en solo lectura. (4) **El alta de un operador entrega un único usuario administrador**, y ese usuario crea los demás; esta consola no crea usuarios adicionales. (5) Nueva **§13 Suspensión**, que documenta la única palanca de PuntoCash sobre lo que ocurre dentro de una sede: suspender al operador o a la sede corta el acceso de todos sus usuarios y trabajadores a la vez, se permite con jornadas abiertas y es reversible **[A14]**. §7 se amplía para cubrir también las cajas. El Apéndice A refleja el reparto nuevo.

**Control de cambios — v2.0 (2026-09-23).** Incorpora lo que Worker y Kiosco delegaron en la capa de administración: §7 Equipos en solo lectura, promociones de red, acceso con verificación en dos pasos **[R13]** y el trabajador adscrito a una sede.

**Control de cambios — v1.0 (2026-09-22).** Primera versión.

**Documentos relacionados:** `PuntoCash_Administracion_PRD_v1.md` (v3.0) define el modelo de negocio, los conceptos y las reglas **A1–A14**. `PuntoCash_PRD_v2.md` (v2.5) define **R1–R13** y **RP-1 a RP-16**. `PuntoCash_Worker_Functional_Requirements_v1.md` (v1.5) §2 define el acceso que esta consola hereda y §2.1 la vinculación que esta consola observa. `PuntoCash_Kiosk_Pantalla_Functional_Requirements_v1.md` (v1.4) §7 define el origen único de datos que §9 y §11 enmarcan. `CLAUDE.md` y `PuntoCash_Manual_de_Marca_y_UI_v1.pdf` mandan sobre todo lo visual.

**Cómo leer este documento.** Los requisitos se numeran `FR-SA-<área>-<n>`. Donde una pantalla se comporta igual que su equivalente en la consola del mercante, este documento lo dice y remite en lugar de repetirlo.

---

## 0. Qué es este módulo y qué no es

`/super-admin` es la consola con la que PuntoCash gobierna **su red**: qué sedes existen, a quién se las entrega, dentro de qué límites opera cada una, y qué está pasando en todas a la vez.

PuntoCash es la propietaria de la red y de la plataforma; no es la administradora de ningún mostrador. Esa distinción es la que organiza todo este documento, y se resume en dos listas.

**Lo que esta consola decide** son los términos de la relación y los límites de la red: crear una sede, editar sus datos maestros, suspenderla y cerrarla; dar de alta y de baja mercantes; asignar y revocar sedes; entregar a cada mercante su **primer** administrador; fijar los **rangos de tasa** por par de monedas; habilitar los **servicios** de cada sede; y publicar **promociones de red**.

**Lo que esta consola solo mira** es todo lo que vive dentro de una sede: sus cajas, sus equipos vinculados, sus kioscos, sus trabajadores, sus administradores, las monedas que cambia, la tasa que aplica, sus jornadas y sus operaciones. Lo ve entero, con todo el detalle, y no crea, modifica ni da de baja nada de ello **[A14]**, **[RP-26]**.

Cuando algo va mal dentro de una sede, PuntoCash no interviene pieza a pieza: **suspende al operador o suspende la sede** (§13). Es una acción sobre la relación, visible, reversible y auditada, que corta el acceso de todos a la vez sin quitarle al mercante la responsabilidad de lo suyo.

Y como el resto de la capa: no opera caja, no registra operaciones, no verifica identidades, no invoca proveedores externos y no corrige lo que un Worker registró **[A6]**, **[A7]**.

---

## 1. Comportamiento global del módulo

### 1.1 Shell

**FR-SA-SHELL-1** Misma composición de shell que la consola del mercante, con grupos de rutas `(auth)` y `(app)` (equivale a **FR-AD-SHELL-1**).

**FR-SA-SHELL-2** La barra lateral debe agrupar sus destinos en cuatro bloques, por lo que la persona viene a hacer: **Red** (Inicio, Sedes, Operadores, Cajas y equipos, Trabajadores), **Oferta** (Servicios, Monedas y tasas, Promociones), **Actividad** (Jornadas, Operaciones, Reportes) y **Administración** (Usuarios, solo para el principal; Auditoría).

**FR-SA-SHELL-3** La agrupación no separa lo que PuntoCash decide de lo que solo consulta: esa distinción no ayudaba a encontrar nada (nadie busca Promociones o Servicios pensando en «límites»). Lo que PuntoCash puede cambiar en cada pantalla lo dicen sus propios botones **[A14]**.

**FR-SA-SHELL-4** La cabecera muestra la marca **PuntoCash**, un distintivo visible que identifica la consola como administración general de la red, el nombre de la persona con sesión iniciada, y los accesos de Perfil y Cerrar sesión.

**FR-SA-SHELL-5** El distintivo de FR-SA-SHELL-4 es un requisito de seguridad operativa, no decorativo: debe ser imposible confundir de un vistazo una pantalla de esta consola con la del mercante, porque las acciones disponibles y su alcance son muy distintos.

**FR-SA-SHELL-6** Referencia de pantalla y densidad: igual que la consola del mercante (**FR-AD-SHELL-6**). No le aplica la excepción de **FR-AD-SHELL-7**, porque esta consola nunca escanea un QR de vinculación.

**FR-SA-SHELL-7** Ninguna pantalla debe contener flujos por pasos con stepper. La creación de una sede (§4.2) se resuelve en un formulario por secciones.

### 1.2 Rutas

**FR-SA-NAV-1** Inventario de rutas:

| Ruta | Función |
| --- | --- |
| `/super-admin/login` | Acceso, paso 1: credenciales (sin shell) |
| `/super-admin/verificacion` | Acceso, paso 2: código de verificación (sin shell) |
| `/super-admin/inicio` | Panel de salud de la red |
| `/super-admin/sedes` | Listado de todas las sedes |
| `/super-admin/sedes/nueva` | Creación de una sede |
| `/super-admin/sedes/[id]` | Ficha de una sede, con asignación e historial |
| `/super-admin/operadores` | Listado de mercantes |
| `/super-admin/operadores/nuevo` | Alta de un mercante y su administrador inicial |
| `/super-admin/operadores/[id]` | Ficha de un mercante |
| `/super-admin/servicios` | Servicios habilitados por sede |
| `/super-admin/monedas-y-tasas` | Catálogo de monedas, rangos de red, y consulta por sede |
| `/super-admin/promociones` | Promociones de red |
| `/super-admin/equipos` | Inventario de cajas, equipos de caja y kioscos (solo lectura) |
| `/super-admin/trabajadores` | Todos los trabajadores de la red (solo lectura) |
| `/super-admin/trabajadores/[id]` | Ficha de un trabajador (solo lectura) |
| `/super-admin/operaciones` | Historial de toda la red |
| `/super-admin/operaciones/[codigo]` | Detalle de una operación, de solo lectura |
| `/super-admin/reportes` | Consolidado de red y comparativas |
| `/super-admin/auditoria` | Registro de eventos de gobierno |

**FR-SA-NAV-2** Esta consola no tiene selector de alcance: su alcance es la red entera **[A1]**. Donde el filtrado por sede u operador es útil, se ofrece como filtro de la pantalla, nunca como alcance de la sesión.

**FR-SA-NAV-3** Un identificador inexistente se trata con el mismo mensaje genérico que en la consola del mercante (**FR-AD-NAV-3**).

---

## 2. Acceso

**FR-SA-ACC-1** El acceso es **el mismo flujo de dos pasos que Worker y que la consola del mercante**: credenciales y, después, un código de seis dígitos al correo registrado. Ninguna sesión existe hasta que se verifica **[R13]**.

**FR-SA-ACC-2** Rigen, aplicados a `/super-admin/login` y `/super-admin/verificacion`, los requisitos **FR-AUTH-1 a FR-AUTH-7** y **FR-2FA-1 a FR-2FA-32** de `PuntoCash_Worker_Functional_Requirements_v1.md` §2.3 a §2.10, sin repetirlos aquí (equivale a **FR-AD-ACC-2**).

**FR-SA-ACC-3** Lo único que difiere es el destino posterior a la verificación, `/super-admin/inicio`, y el texto de contexto de la pantalla de credenciales.

**FR-SA-ACC-4** Mensajes de error indistinguibles entre usuario inexistente, contraseña incorrecta y usuario desactivado (equivale a **FR-AD-ACC-5**).

**FR-SA-ACC-5** `/super-admin/recuperar-acceso` es un marcador de posición sin comportamiento.

---

## 3. Inicio

El panel que responde "¿cómo está la red ahora mismo?".

**FR-SA-HOME-1** Fila de métricas de red: **sedes activas** (sobre el total), **sedes con jornada abierta ahora**, **sedes sin ninguna caja**, **cajas sin equipo vinculado**, **operadores activos**, **trabajadores activos**, **operaciones del día** y **volumen del día por moneda**.

**FR-SA-HOME-2** El volumen se expresa por moneda, sin convertir a una moneda única (**FR-AD-HOME-1**).

**FR-SA-HOME-3** **Panel de alertas de red**, con las situaciones que PuntoCash debe mirar aunque no sea quien las resuelve, en este orden: sedes sin operador asignado; **sedes asignadas hace más de N días y todavía sin ninguna caja**, que es una sucursal entregada y sin poner en marcha; sedes con cajas sin equipo vinculado; sedes activas sin jornada abierta dentro de su horario; jornadas abiertas fuera de horario; arqueos con diferencia por encima de un umbral; solicitudes de aprobación pendientes con más de 24 horas; tasas fijadas automáticamente al límite y aún no revisadas por su Admin **[A5]**; sedes con el servicio de Cambio de moneda habilitado y **ningún par definido**, que exhiben un tablero vacío **[A12]**; sedes **sin ninguna moneda en su lista**, que no pueden manejar efectivo de ningún tipo; y **pares que varias sedes podrían cotizar pero para los que PuntoCash no ha definido rango**, que es una petición pendiente de la red **[FR-SA-TASA-3]**.

**FR-SA-HOME-4** **Toda alerta de este panel es informativa: ninguna ofrece una acción correctiva sobre la pieza afectada** **[A14]**. Cada una indica la sede y el operador responsable, enlaza a la pantalla donde se consulta, y ofrece el contacto del mercante, que es a quien hay que pedírselo. La única acción disponible desde aquí, y solo para casos graves, es la suspensión de §13.

**FR-SA-HOME-5** La pantalla debe dejar clara esa naturaleza, para que la ausencia de botones se lea como una decisión: "PuntoCash observa la red. Lo que ocurre dentro de una sede lo resuelve su administrador."

**FR-SA-HOME-6** **Tabla de estado de la red**, con una fila por sede activa: código y nombre, operador asignado, estado de la jornada, cajas activas y cuántas sin equipo, kioscos vinculados, operaciones del día y alertas activas. Admite ordenación por cualquier columna y filtro por operador.

**FR-SA-HOME-7** Una sede **sin operador asignado** se distingue visualmente, porque es la única anomalía del panel que solo PuntoCash puede resolver.

---

## 4. Sedes

### 4.1 Listado

**FR-SA-SEDE-1** `/super-admin/sedes` lista todas las sedes con: código, nombre, municipio y provincia, estado, operador asignado, fecha de la asignación vigente, cajas activas, cajas con equipo y trabajadores activos.

**FR-SA-SEDE-2** Filtros: estado, provincia, operador, y conmutadores "sin operador asignado", "sin cajas" y "con cajas sin equipo". Búsqueda por código o nombre.

**FR-SA-SEDE-3** La lista ofrece la acción **Nueva sede**.

### 4.2 Creación

**FR-SA-SEDE-4** `/super-admin/sedes/nueva` crea una sede con un formulario en tres secciones: **datos maestros**, **servicios habilitados** y **asignación inicial**. **No hay sección de cajas**: una sede se crea vacía y las cajas las da de alta su mercante **[A4]**.

**FR-SA-SEDE-5** Datos maestros: código, nombre, dirección, provincia y municipio (del catálogo de `src/features/geography`), teléfono y horario de atención. Todos obligatorios salvo el teléfono.

**FR-SA-SEDE-6** El formulario debe advertir que estos datos son los que la sucursal exhibirá en su kiosco y en su pantalla informativa, y los que aparecerán en el selector de sede de toda Pantalla que se instale en la red **[A12]**, **[FR-PANT-SEDE-2]**, **[FR-PANT-DATA-4]**. No son datos internos.

**FR-SA-SEDE-7** El código de sede debe ser único en la red. Un código repetido se rechaza con "Ya existe una sede con ese código."

**FR-SA-SEDE-8** Servicios habilitados: los que esa sede podrá ofrecer (§8). La sede debe crearse con al menos uno.

**FR-SA-SEDE-9** Asignación inicial: elegir un operador activo, o dejar la sede **sin asignar**. Dejarla sin asignar es una opción válida y explícita: una sede puede existir antes de decidirse quién la administrará.

**FR-SA-SEDE-10** Una sede nace **activa** si tiene operador asignado, y **suspendida** si no lo tiene — porque sin un administrador responsable no puede ponerse en marcha: nadie podría crearle cajas ni vincularle equipos **[A4]**, **[A10]**.

**FR-SA-SEDE-11** El resultado de la creación debe decir con todas sus letras qué falta y quién lo hace, porque la sede queda inservible hasta entonces: "Esta sede todavía no tiene cajas ni equipos. Su administrador debe crearlas y vincular un equipo a cada una antes de que pueda operar."

**FR-SA-SEDE-12** La creación genera un evento de auditoría **[RP-21]**.

### 4.3 Ficha

**FR-SA-SEDE-13** `/super-admin/sedes/[id]` muestra siete bloques: **datos maestros** (editables), **servicios habilitados** (editables), **asignación vigente**, **historial de asignaciones**, **cajas y equipos**, **trabajadores** y **contenido público**.

**FR-SA-SEDE-14** Los datos maestros son editables por el Super Admin y solo por él **[A3]**. Guardar exige confirmación, que debe advertir el efecto de **FR-SA-SEDE-6**. Genera evento de auditoría.

**FR-SA-SEDE-15** El bloque de **asignación vigente** muestra operador, fecha de inicio, motivo y tiempo transcurrido, y ofrece **Revocar**. Sin asignación vigente, muestra el estado sin asignar y ofrece **Asignar**.

**FR-SA-SEDE-16** El **historial de asignaciones** lista todos los tramos pasados con operador, inicio, fin, motivo de inicio y motivo de fin. Es de solo lectura, sin excepción, incluso para el Super Admin **[A2]**, **[R9]**, **[RP-20]**.

**FR-SA-SEDE-17** El bloque de **cajas y equipos** lista las cajas de la sede con identificador, estado, equipo vinculado o su ausencia, trabajador con sesión iniciada y estado de la jornada, y los kioscos vinculados. **Es enteramente de solo lectura** **[A14]**: no añade cajas, no las retira, no vincula ni desvincula equipos. No debe existir ningún control para ello, ni siquiera deshabilitado.

**FR-SA-SEDE-18** Cuando la sede no tiene ninguna caja, este bloque debe decir de quién es la tarea, no limitarse a estar vacío: "Esta sede todavía no tiene cajas. Las crea su administrador, {operador}."

**FR-SA-SEDE-19** El bloque de **trabajadores** lista los adscritos a la sede, en solo lectura. No muestra caja, porque un trabajador no tiene caja **[A13]**.

**FR-SA-SEDE-20** El bloque de **contenido público** muestra, en solo lectura, lo que esa sucursal exhibe: las monedas de su lista, los pares que cotiza con su tasa vigente, y sus promociones. Permite verificar la coherencia entre lo que la sede anuncia y lo que cotiza **[A12]**, sin poder cambiar ninguna de las dos.

**FR-SA-SEDE-21** La ficha permite **suspender** y **cerrar** la sede, con el comportamiento de §13.

**FR-SA-SEDE-22** Una sede nunca se elimina. Cerrarla es el final de su ciclo de vida, y todo su histórico permanece accesible **[R9]**.

### 4.4 Asignar y revocar

**FR-SA-ASG-1** **Asignar** exige elegir un operador activo y escribir un motivo de al menos 10 caracteres, y muestra un resumen antes de confirmar: sede, operador, fecha de inicio.

**FR-SA-ASG-2** No es posible asignar una sede con asignación vigente. La interfaz exige revocar primero: "Esta sede ya está asignada a {operador}. Revoca esa asignación antes de asignarla a otro." **[A2]**.

**FR-SA-ASG-3** Un operador **nunca está sin administrador**, así que la asignación no tiene que encaminar a crear ninguno. Su alta crea en el mismo acto al **administrador principal** (**FR-SA-OPE-5**); a ese principal no lo desactiva nadie, ni él mismo (**FR-AD-USR-13**); y el papel solo se traspasa a otro administrador activo (**FR-AD-USR-12**). Ninguna pantalla de esta consola debe contemplar el caso contrario ni avisar de él. Si llegara a darse —solo por una escritura ajena a las dos consolas—, la respuesta es **FR-SA-OPE-11**.

**FR-SA-ASG-4** **Revocar** exige motivo escrito de al menos 10 caracteres y muestra una advertencia previa de lo que implica: el operador dejará de ver la sede de inmediato, sus trabajadores en esa sede dejarán de poder iniciar sesión, la sede quedará sin administrador responsable, **y nadie podrá crear cajas, vincular equipos ni fijar tasas en ella hasta que se asigne otro** **[A4]**, **[A10]**.

**FR-SA-ASG-5** No es posible revocar una asignación con jornadas abiertas en esa sede: "Esta sede tiene jornadas abiertas. Deben cerrarse antes." con enlace a esas jornadas **[R6]**. A diferencia de suspender (§13), revocar no es una palanca de emergencia sino un cambio ordenado de administrador, y traspasar una sucursal con la caja abierta dejaría un descuadre sin dueño.

**FR-SA-ASG-6** Revocar **cierra** el tramo con fecha de fin y motivo; nunca lo borra ni lo edita **[A2]**, **[R9]**.

**FR-SA-ASG-7** Revocar **no retira las cajas ni desvincula los equipos** de la sede: siguen ahí, y el operador entrante los encuentra tal cual **[A11]**, **[A14]**. La confirmación debe decirlo, porque es lo que evita que un cambio de mercante obligue a remontar la sucursal entera.

**FR-SA-ASG-8** Revocar **tampoco desactiva a los trabajadores** de la sede: siguen adscritos a ella y vuelven a poder acceder en cuanto se asigne un operador nuevo. Si el mercante entrante no los quiere, es él quien los desactiva **[A14]**. La confirmación debe decirlo.

**FR-SA-ASG-9** Al confirmar asignar o revocar, el dominio revalida el estado de la asignación. Si otro Super Admin la cambió entretanto, la acción se rechaza y se muestra el estado real **[R3]**, **[R6]**.

**FR-SA-ASG-10** Una sede que queda sin asignación vigente pasa automáticamente a **suspendida**, coherente con FR-SA-SEDE-10, y el hecho se comunica en la confirmación.

**FR-SA-ASG-11** Asignar y revocar generan eventos de auditoría **[RP-21]**.

---

## 5. Operadores

**FR-SA-OPE-1** `/super-admin/operadores` lista los mercantes con: nombre, contacto, estado (activo / suspendido / dado de baja), sedes administradas, administradores activos, trabajadores activos, equipos vinculados, fecha de alta y volumen del periodo.

**FR-SA-OPE-2** Filtros por estado y búsqueda por nombre. Un conmutador "sin sedes" identifica a los operadores dados de alta que aún no administran nada.

**FR-SA-OPE-3** `/super-admin/operadores/nuevo` da de alta un mercante. Campos del operador: nombre o razón social, tipo y número de documento, persona de contacto, teléfono y correo. Campos del **administrador inicial**: nombre, apellidos, correo e identificador de acceso.

**FR-SA-OPE-4** El correo del usuario inicial es obligatorio: es el canal por el que recibirá su código de verificación en cada inicio de sesión **[R13]**.

**FR-SA-OPE-5** El alta crea el operador y **un único** administrador, y muestra su credencial inicial una sola vez, con el mismo tratamiento que **FR-AD-TRAB-8**. Es lo que se entrega a la empresa cuando se le da una sede en administración.

**FR-SA-OPE-6** **Esta consola no crea administradores adicionales.** A partir del primero, los crea el propio mercante desde su panel (**FR-AD-USR-2**) **[A4]**, **[A14]**. El formulario debe decirlo, para que nadie espere volver aquí a dar de alta al segundo: "Esta será la persona con la que la empresa entra por primera vez. Desde su panel podrá crear los demás administradores que necesite."

**FR-SA-OPE-7** El alta **no** asigna sedes. Asignar es un acto propio, desde la ficha de la sede o del operador **[A3]**.

**FR-SA-OPE-8** `/super-admin/operadores/[id]` muestra: datos del operador, **sus sedes vigentes**, **su historial de asignaciones**, **sus administradores**, **sus trabajadores**, **sus cajas y equipos**, **su volumen** y **sus solicitudes de aprobación pendientes**.

**FR-SA-OPE-9** Los bloques de administradores, trabajadores, cajas y equipos, y solicitudes pendientes son **de solo lectura** **[A14]**. Muestran lo que ese mercante tiene montado y lo que tiene sin resolver, sin ofrecer tocarlo ni resolverlo.

**FR-SA-OPE-10** El bloque de administradores debe mostrar cuántos hay activos, **cuál es el principal** y cuándo accedió cada uno por última vez. Es el dato que permite detectar al mercante cuyo principal lleva tiempo sin entrar; la respuesta a eso es **FR-SA-OPE-11**, no crear un usuario por él.

**FR-SA-OPE-11** Esta consola puede **restablecer el acceso del administrador principal** del mercante: cambiarle el correo de verificación y entregarle una credencial nueva, con el mismo tratamiento que **FR-AD-TRAB-8**. Está disponible **siempre**, no solo ante una incidencia. El destinatario es el **principal**, no el usuario inicial: el inicial es un hecho histórico que puede corresponder a otra persona o estar desactivado, mientras que una empresa solo queda fuera de su consola si quien pierde el acceso es el principal. Es la única escritura de esta consola sobre un usuario del mercante, exige motivo escrito de al menos 10 caracteres y genera evento de auditoría. No crea un usuario nuevo ni modifica ningún otro.

**FR-SA-OPE-12** La ficha permite **suspender**, **reactivar** y **dar de baja** al operador, con el comportamiento de §13. Dar de baja exige además que no tenga ninguna sede asignada.

**FR-SA-OPE-13** Un intento de dar de baja con sedes asignadas se rechaza con "Este operador administra {n} sedes. Revoca esas asignaciones antes de darlo de baja." y enlace a esas sedes.

**FR-SA-OPE-14** Un operador nunca se elimina, y todo su historial permanece accesible tras la baja **[R9]**.

**FR-SA-OPE-15** Suspender, reactivar y dar de baja generan eventos de auditoría **[RP-21]**.

---

## 6. Trabajadores

Enteramente de solo lectura **[A14]**.

**FR-SA-TRAB-1** `/super-admin/trabajadores` lista todos los trabajadores de la red con: nombre, identificador, **sede**, operador, correo enmascarado, estado, fecha de alta y última jornada operada. **No hay columna de caja** **[A13]**.

**FR-SA-TRAB-2** Filtros por operador, sede y estado; búsqueda por nombre o identificador.

**FR-SA-TRAB-3** `/super-admin/trabajadores/[id]` muestra la ficha en solo lectura, con sus datos, su sede, su operador, su actividad reciente —incluidas las cajas en que ha operado, que son consecuencia de los equipos en que inició sesión, no de una asignación— y el historial de sedes en las que ha trabajado.

**FR-SA-TRAB-4** **El Super Admin no crea, no edita, no desactiva y no reactiva trabajadores** **[A4]**, **[A14]**, **[RP-26]**. Ninguna de esas acciones debe existir en esta consola, ni siquiera deshabilitada.

**FR-SA-TRAB-5** Tampoco presta asistencia de acceso (**FR-AD-TRAB-10**): esa ayuda la da el administrador de su sede, que es quien conoce a la persona.

**FR-SA-TRAB-6** La ficha debe explicar esa ausencia donde se nota, y decir cuál es el recurso real: "Los trabajadores los gestiona su administrador, {operador}. Si hay un problema con esta persona, el recurso de PuntoCash es suspender la sede o al operador." — con enlace a §13.

**FR-SA-TRAB-7** La ficha debe distinguir tres razones por las que un trabajador no puede acceder, porque se resuelven de forma distinta: **desactivado por su administrador**, **su sede está suspendida por PuntoCash** y **su operador está suspendido por PuntoCash**. Solo las dos últimas las revierte esta consola.

---

## 7. Cajas y equipos de la red

El inventario de todo lo que está montado. Enteramente de solo lectura.

**FR-SA-EQ-1** `/super-admin/equipos` presenta dos pestañas: **Cajas** y **Kioscos de autoservicio**, con el alcance de toda la red.

**FR-SA-EQ-2** La pestaña **Cajas** lista todas las cajas de la red con: sede, operador, identificador de la caja, estado de la caja (activa / retirada), estado del vínculo, identificador del equipo (`CAJ-NNNN-NNNN`), fecha de vinculación, quién la vinculó, última actividad y estado de la jornada.

**FR-SA-EQ-3** La pestaña **Kioscos** lista los kioscos vinculados con: sede, operador, identificador (`KIO-NNNN-NNNN`), fecha de vinculación, quién lo vinculó, última actividad y solicitudes generadas en el periodo.

**FR-SA-EQ-4** Filtros en ambas: operador, sede, provincia y estado del vínculo. Conmutadores "sin equipo" y "sedes sin cajas" aíslan lo que impide operar.

**FR-SA-EQ-5** **Ninguna pantalla de esta consola crea o retira una caja, ni vincula o desvincula un equipo** **[A4]**, **[A10]**, **[A14]**, **[RP-26]**. No debe existir ningún control que lo haga, ni siquiera deshabilitado, ni un formulario de código, ni un lector de QR.

**FR-SA-EQ-6** La pantalla debe explicar esa ausencia donde se nota, no dejarla como un vacío inexplicable: "Las cajas las crea el administrador de cada sede, y los equipos los vincula él, delante del equipo." Sin esa frase, la primera reacción de quien usa esta consola será buscar el botón que falta.

**FR-SA-EQ-7** Para cada caja sin equipo y cada sede sin cajas, la fila debe ofrecer el contacto del operador responsable, que es a quien hay que pedírselo.

**FR-SA-EQ-8** La pestaña de cajas debe permitir ver también las **retiradas**, con la fecha y el motivo declarado por el mercante, porque su histórico de operaciones sigue siendo consultable **[R9]**.

**FR-SA-EQ-9** Esta pantalla **no inventaría las Pantallas informativas**: no se vinculan, no tienen sesión y el producto no sabe cuántas hay ni dónde (FR-PANT-SEDE-1 a 7). Debe decirlo donde alguien lo buscaría, para que su ausencia se lea como una decisión y no como un fallo.

---

## 8. Servicios por sede

Uno de los tres límites de red que PuntoCash fija **[A3]**.

**FR-SA-SERV-1** `/super-admin/servicios` presenta una matriz de sedes por servicios, donde cada celda indica si ese servicio está habilitado en esa sede.

**FR-SA-SERV-2** La matriz distingue tres estados de celda: **habilitado**, **deshabilitado** y **no disponible en el producto** — este último para los servicios del catálogo que aún no tienen flujo implementado, que no pueden habilitarse en ninguna sede.

**FR-SA-SERV-3** Habilitar o deshabilitar es potestad exclusiva del Super Admin, exige confirmación y genera un evento de auditoría **[RP-21]**.

**FR-SA-SERV-4** El servicio de **Cambio de moneda** tiene una consecuencia propia que la confirmación debe nombrar: habilitarlo es lo que permite al mercante **definir pares de cotización** en esa sede y fijarles tasa (**FR-AD-TASA-2**); deshabilitarlo hace que sus pares dejen de exhibirse y de poder cotizarse de inmediato, sin que el mercante los retire uno a uno, y los conserva para cuando vuelva a habilitarse (**FR-AD-TASA-14**) **[A5]**. No afecta a la **lista de monedas** de la sede, que sus cajas necesitan para remesas y giros igualmente (**FR-AD-MON-5**).

**FR-SA-SERV-5** Deshabilitar **no afecta a las operaciones ya registradas** de ese servicio en esa sede **[R9]**.

**FR-SA-SERV-6** El efecto es hacia adelante: el servicio deja de aparecer en el catálogo de Worker de esa sede **y en el del kiosco de autoservicio de esa sede**, y deja de poder iniciarse. La confirmación debe mencionar las dos superficies.

**FR-SA-SERV-7** No es posible deshabilitar el **último servicio** de una sede activa: dejaría una sucursal abierta sin nada que ofrecer. El intento se rechaza con una explicación.

**FR-SA-SERV-8** La matriz admite filtro por operador y por provincia, y búsqueda de sede.

---

## 9. Monedas y tasas

Tres vistas, dos de ellas editables. Es el marco dentro del cual cada mercante decide **[A3]**, **[A5]**.

### 9.1 Monedas de la plataforma

**FR-SA-MON-1** La primera vista mantiene el **catálogo de monedas que la plataforma soporta**: código ISO, nombre y símbolo, tomados de la lista ISO 4217, y cuatro decimales para todas. Es de donde cada mercante elige las monedas de sus sedes (**FR-AD-MON-3**), y por tanto lo que acota, en último término, qué efectivo puede existir en una caja de la red.

**FR-SA-MON-2** Cada moneda del catálogo debe mostrar en cuántas sedes está en la lista y en cuántas cajas está habilitada hoy, para que retirarla no sea una decisión a ciegas. Cuentan las sedes que no están cerradas y las cajas activas. En la tabla, la fila dice sedes («en la lista de N») y la confirmación de retirar dice sedes y cajas.

**FR-SA-MON-3** Añadir una moneda al catálogo la pone a disposición de toda la red; no la activa en ninguna sede. Quien la incorpora a una sucursal es su mercante **[A4]**.

**FR-SA-MON-4** **Retirar** una moneda del catálogo exige motivo y solo tiene efecto hacia adelante: impide que un mercante la añada a nuevas sedes. **No la quita de las sedes que ya la tienen, no toca saldos y no altera ningún registro histórico** **[R9]**, **[A14]**. La confirmación debe decir en cuántas sedes seguirá presente y que quitarla de cada una es decisión de su mercante.

**FR-SA-MON-5** No es posible retirar del catálogo la moneda local: es la que toda caja de la red necesita.

**FR-SA-MON-6** Todo cambio en el catálogo genera un evento de auditoría **[RP-21]**: la alta (también la reincorporación) y la retirada, esta última con su motivo.

**FR-SA-MON-7** Una moneda retirada **no desaparece del catálogo**: se muestra al final de la tabla con la etiqueta «Retirada» y desde ahí se puede **reincorporar**, sin motivo, para que los mercantes vuelvan a poder añadirla. Una retirada **no se da de alta de nuevo**: el intento se rechaza y remite a reincorporar.

**FR-SA-MON-8** A una moneda retirada que **no tiene rango** no se le puede definir uno: no se abre a la red una moneda que ya no se ofrece. Si **ya lo tiene**, se puede seguir cambiando y retirando, porque las sedes que la cotizan lo siguen necesitando. Una moneda retirada no cuenta entre los Pendientes de Inicio como «moneda sin rango».

**FR-SA-MON-9** El catálogo **se añade y se retira, no se edita**. Al añadir, PuntoCash **elige la moneda de la lista ISO 4217** y no escribe el código, el nombre ni el símbolo; los decimales son **siempre cuatro** y nadie los edita. **La bandera también viene de la lista**: cada moneda ISO trae la suya, y la moneda nueva se ve con ella desde el primer momento.

### 9.2 Rangos de la red

**FR-SA-TASA-1** La segunda vista lista cada **par de monedas** con su rango permitido de compra y de venta, la fecha del último cambio, su autor y **cuántas sedes lo tienen definido**.

**FR-SA-TASA-2** Un par **sin rango definido no puede ser cotizado por ninguna sede** **[FR-AD-TASA-2]**, **[RP-22]**. Definir un rango para un par es, por tanto, lo que lo pone a disposición de la red, y es una decisión que solo PuntoCash puede tomar.

**FR-SA-TASA-3** La vista debe mostrar también los **pares posibles sin rango** —combinaciones del catálogo de §9.1 que ninguna sede puede cotizar todavía—, con cuántas sedes tienen ambas monedas en su lista y esperan poder cotizarlo. Es lo que convierte una petición de un mercante en una decisión informada.

**FR-SA-TASA-4** Editar un rango exige que el mínimo sea menor que el máximo y que ambos sean positivos. Mensajes: "El mínimo debe ser menor que el máximo."; "Introduce un valor válido."

**FR-SA-TASA-5** Antes de guardar, el sistema debe calcular y mostrar **qué sedes quedarían fuera de rango**, nombrándolas una por una con su tasa vigente y el valor al que quedarían fijadas.

**FR-SA-TASA-6** La confirmación debe ser explícita sobre las consecuencias: "{n} sedes tienen hoy una tasa fuera del nuevo rango. Al guardar, su tasa se fijará automáticamente al límite más cercano, **su tablero público pasará a mostrar ese valor** y se avisará a sus administradores." **[A5]**, **[A12]**.

**FR-SA-TASA-7** Al guardar, las tasas fuera del rango nuevo se fijan al límite más cercano, cada fijación genera su propio evento de auditoría, y cada sede afectada queda marcada para que su Admin lo vea (**FR-AD-TASA-12**) **[A5]**, **[RP-22]**.

**FR-SA-TASA-8** Esa fijación automática es la **única** escritura que esta consola produce sobre la tasa de una sede, y es una consecuencia mecánica de mover el rango, no una decisión sobre esa sede. Fijar la tasa efectiva de una sede a voluntad no es posible desde aquí **[A5]**, **[A14]**, **[RP-26]**.

**FR-SA-TASA-9** **Retirar el rango** de un par exige motivo y confirmación, y debe advertir de su efecto: las sedes que lo tengan definido dejan de cotizarlo y de exhibirlo. Sus pares **no se borran**: quedan marcados con la razón y vuelven con su última tasa, revalidada, si el rango se restablece (**FR-AD-TASA-15**). La confirmación debe nombrar cuántas sedes quedan afectadas.

**FR-SA-TASA-10** El cambio o la retirada de un rango **no altera ninguna operación ya registrada**, y la confirmación debe decirlo **[R9]**.

**FR-SA-TASA-11** Todo cambio de rango genera un evento de auditoría **[RP-21]**.

### 9.3 Monedas y pares por sede

**FR-SA-TASA-12** La tercera vista lista, para cada sede: las **monedas de su lista** (§12 del FRD de Admin), los **pares que tiene definidos** con su tasa vigente, el rango aplicable, la fecha del último cambio, quién lo hizo y si fue fijada automáticamente.

**FR-SA-TASA-13** Es **de solo lectura**: las monedas y los pares los decide el mercante **[A4]**, **[A5]**, **[RP-26]**.

**FR-SA-TASA-14** La vista debe permitir identificar de un vistazo cinco situaciones, todas ellas motivo de conversación con un mercante y ninguna resoluble desde aquí: sedes que cotizan pegadas a un límite; tasas fijadas automáticamente y aún sin revisar; sedes con el servicio de Cambio de moneda habilitado y **ningún par definido**; sedes con **monedas en su lista cuyos pares no tienen rango**, que es una petición implícita de **FR-SA-TASA-3**; y sedes **sin ninguna moneda en su lista**, que no pueden manejar efectivo de ningún tipo.

**FR-SA-TASA-15** Para cada una de esas situaciones, la fila debe ofrecer el contacto del operador responsable **[FR-SA-STATE-4]**.

---

## 10. Operaciones

**FR-SA-OPS-1** `/super-admin/operaciones` se comporta igual que su equivalente en la consola del mercante (**FR-AD-OPS-1** a **FR-AD-OPS-7**), con dos diferencias: el alcance es la red entera, y los filtros incluyen **operador**.

**FR-SA-OPS-2** El detalle reutiliza las vistas de Worker en solo lectura, y añade al contexto de sede, caja, equipo, trabajador y jornada también el **operador responsable en la fecha de la operación** — leído del historial de asignaciones vigente **en esa fecha**, no de la asignación actual **[RP-20]**, **[R9]**.

**FR-SA-OPS-3** FR-SA-OPS-2 es el requisito que da sentido al historial de asignaciones: una operación de marzo debe mostrar quién administraba la sede en marzo, aunque hoy la administre otro.

**FR-SA-OPS-4** El detalle no ofrece ninguna acción **[A6]**, **[A7]**.

---

## 11. Promociones de red

**FR-SA-PROM-1** `/super-admin/promociones` gestiona las promociones que PuntoCash publica sobre su red, distintas de las que cada mercante publica para sus sedes (**FR-AD-PROM-1**). Las presenta en tres pestañas por estado —**Vigentes** (por defecto), **Programadas** y **Vencidas**— con su número, calculado con la fecha de hoy en la hora de Cuba, y ofrece «Nueva promoción» en la cabecera. Cada fila dice dónde se muestra, sus fechas y quién la publicó; una retirada lo dice con su fecha.

**FR-SA-PROM-2** Cada promoción de red se dirige a **toda la red** o a **las sedes que se marquen**.

- **Toda la red** llega a todas las sedes abiertas, también a las que se creen después.
- **Sedes elegidas** guarda las sedes marcadas. El formulario ofrece dos atajos para marcarlas —**las de un operador** y **las de una provincia**— que **suman** a lo ya marcado, y «Marcar todas» y «Quitar todas». Los atajos no son una regla: lo que se guarda son esas sedes, y si una cambia de operador sigue mostrando la promoción.
- Cada sede de la lista muestra su provincia y su operador de hoy («Sin operador» si no tiene), y «suspendida» si lo está. Las sedes cerradas no se ofrecen: no admiten promociones.
- Sin ninguna sede marcada, el servidor rechaza con «Elige al menos una sede, o marca toda la red.» y el formulario conserva lo escrito.

**FR-SA-PROM-3** Campos, validaciones, estados (programada / vigente / vencida), previsualización, imagen opcional y retirada se comportan igual que en la consola del mercante (**FR-AD-PROM-4** a **FR-AD-PROM-9**, **FR-AD-PROM-12**). En una promoción vigente, la fecha de inicio no se cambia.

**FR-SA-PROM-4** Una promoción de red **no puede ser editada ni retirada por el Admin de sede**, que la ve en solo lectura **[FR-AD-PROM-3]**. El formulario lo indica siempre, con un aviso informativo —«Solo PuntoCash puede cambiarla o retirarla»—, para que quien la publica sepa que el mercante no podrá quitarla de su sala de espera.

**FR-SA-PROM-5** Una sala que rota demasiadas promociones no anuncia ninguna: cada una ocupa su propia pantalla 12 segundos, y con más de **cuatro** a la vez un cliente que espera no llega a verlas todas. Lo que cuenta es cuántas se ven **a la vez** en el día más cargado del periodo, no cuántas lo tocan.

- **En el formulario**, para cada sede a la que llegaría, con fechas puestas: con cuántas promociones coincidiría y **de quién es cada una** («1 de PuntoCash, 3 de Malecón Servicios Financieros S.R.L.»), sumando las de red y las de los operadores. Si alguna sede pasara de cuatro, un aviso de advertencia la nombra con ese desglose y recuerda que las de un operador solo puede retirarlas su administrador. Es un aviso, no un bloqueo. Con «toda la red», solo se nombran las sedes que pasarían de cuatro; si ninguna, una línea dice cuál sería la más cargada.
- **En el listado**, un aviso de advertencia nombra las sedes que **hoy** tienen más de cuatro promociones vigentes, con el desglose por quién las publica.

**FR-SA-PROM-6** Solo se exhiben las vigentes en la fecha actual **[FR-PANT-DATA-5]**.

**FR-SA-PROM-7** Nada de lo publicado aquí puede alimentar ni modificar una operación **[R10]**, **[FR-PANT-DATA-2]**.

**FR-SA-PROM-8** Alta, edición y retirada generan eventos de auditoría **[RP-21]**: `promocion-red.alta`, `promocion-red.editada` y `promocion-red.retirada`, con quién y cuándo y, en alta y edición, título, texto, sedes («Toda la red» o sus nombres), fechas y si lleva imagen, antes y después.

**FR-SA-PROM-9** El listado contiene **solo** las promociones de red. Las de un operador no son de esta consola: cuentan para la saturación (**FR-SA-PROM-5**) y se abren **en solo lectura** desde «Promociones en pantalla hoy» de la ficha de la sede, que enlaza cada una e indica quién la publica. Esa ficha dice de quién es, que PuntoCash no la cambia ni la retira porque la gobierna el administrador del operador, y enlaza al operador. Una de red ya terminada o retirada también se abre en solo lectura. Ninguna de las dos ofrece controles que fallarían.

**FR-SA-PROM-10** En la consola del mercante, una promoción de red figura como «Publicada por **PuntoCash**» (**FR-AD-PROM-3**); nunca se muestra el nombre de la persona de PuntoCash que la publicó. Ese nombre queda en el registro de auditoría y en la ficha de esta consola.

**FR-SA-PROM-11** El destino de una promoción de red **no depende de los servicios de la sede**: puede llegar a una sede que no ofrece el servicio que anuncia. Una sede cumple también una función publicitaria para PuntoCash —informa y promociona ante sus clientes—, la administre PuntoCash o un mercante, y esa función no está atada a lo que se opere en ella. La consola no avisa ni bloquea por esto.

**Ver en la demo:** `/super-admin/promociones` con `emarrero@puntocash.com`. Vigentes: una de toda la red y una dirigida a Santiago, Holguín y Camagüey; Programadas: la del horario de fin de año. Atajos: «Nueva promoción», «Solo las sedes que elija» y marcar las de La Habana. Saturación: publicar tres promociones vigentes hoy en PuntoCash Santiago y abrir una cuarta.

---

## 12. Reportes

**FR-SA-REP-1** `/super-admin/reportes` presenta el volumen de la red en cinco cortes: **por operador**, **por sede**, **por servicio**, **por provincia** y **por día**. Se elige el corte en «Agrupar por»; las cifras de arriba (operaciones completadas y volumen por moneda) son las del periodo entero y no cambian con el corte.

**FR-SA-REP-2** El periodo se elige con rangos rápidos (hoy, últimos 7 días, últimos 30 días, mes en curso) o con dos fechas, igual que **FR-AD-REP-2**; un periodo de más de un año se recorta y la pantalla lo dice. Cambiar de corte conserva el periodo.

**FR-SA-REP-3** Cifras por moneda, sin conversión a moneda única (**FR-AD-REP-3**). Cada operación completada cuenta una vez y en bruto; la posición neta de un cambio de moneda se muestra aparte, nunca como volumen.

**FR-SA-REP-4** El corte **por operador** compara mercantes entre sí: operaciones, **«Sedes»** (las que administró en algún momento del periodo) y volumen por moneda. Un interruptor, «Total del mercante» / «Por sede administrada», divide operaciones y volumen entre sus sedes, para que un mercante de tres sedes y uno de una se puedan comparar; «Sedes» no se divide, y un mercante sin sedes en el periodo no aparece en esa vista. El interruptor solo existe en este corte.

**FR-SA-REP-5** Cada operación es **del mercante que administraba la sede el día en que se hizo**, no del que la administra hoy (**FR-SA-OPS-2**). Una fila «Sin operador» aparece solo si hay operaciones sin dueño, para que la suma de las filas siga siendo el total.

**FR-SA-REP-6** El corte **por sede** identifica las sedes de mayor y menor actividad, con el operador de cada una a la vista —los dos, si cambió en el periodo—; se abre ordenado por operaciones, de mayor a menor. Las sedes cerradas solo salen si operaron en el periodo. El corte **por provincia** agrupa las sedes del reporte por su provincia, y el **por servicio** separa compra y venta de divisa y añade el cambio por divisa (comprado, vendido, volumen y posición neta). Ninguna gráfica introduce una paleta propia ni elementos decorativos (**FR-AD-REP-5**).

**FR-SA-REP-7** Los reportes no muestran comisiones, rentas, liquidaciones ni margen **[A8]**.

**FR-SA-REP-8** «Exportar a Excel» y «Exportar a PDF» descargan el periodo de la pantalla con **los cinco cortes**, más la vista por sede administrada, en `/super-admin/reportes/exportar/{xlsx|pdf}`. Sin sesión de PuntoCash llevan al acceso; otro formato responde 404. Cada exportación queda en la auditoría como «reporte exportado». El archivo lleva solo totales **[R11]**.

**Ver en la demo:** `/super-admin/reportes` con `emarrero@puntocash.com`. «Agrupar por» recorre los cinco cortes; en «Por operador», «Por sede administrada» divide entre sedes; «Exportar a Excel» y «Exportar a PDF» descargan el periodo en pantalla.

---

## 13. Suspensión: el recurso de PuntoCash

La única palanca de esta consola sobre lo que ocurre dentro de una sede. No actúa sobre la pieza afectada, sino sobre la relación entera **[A14]**.

**FR-SA-SUS-1** PuntoCash dispone de tres acciones de este tipo: **suspender una sede**, **suspender un operador** y **cerrar una sede**. Las dos primeras son reversibles; la tercera es el final del ciclo de vida de la sucursal.

**FR-SA-SUS-2** **Suspender una sede** impide que cualquier trabajador de esa sede inicie sesión, y que se abra ninguna jornada nueva en sus cajas. Los administradores del mercante siguen entrando en su panel y siguen viendo esa sede, en estado suspendido **[FR-AD-SEDE-13]**.

**FR-SA-SUS-3** **Suspender un operador** impide que sus administradores inicien sesión **y** que ningún trabajador de ninguna de sus sedes lo haga. Es la acción de mayor alcance de esta consola y su confirmación debe decir, con números concretos, a cuántas sedes, cuántos administradores y cuántos trabajadores afecta.

**FR-SA-SUS-4** Ambas exigen **motivo escrito** de al menos 10 caracteres y confirmación.

**FR-SA-SUS-5** **Suspender se permite con jornadas abiertas**, a diferencia de revocar (**FR-SA-ASG-5**) y de cerrar (**FR-SA-SUS-8**). Es deliberado: la suspensión es la palanca de emergencia, y condicionarla a que no haya caja abierta la inutilizaría justo cuando hace falta.

**FR-SA-SUS-6** Cuando hay jornadas abiertas, la confirmación debe advertir de la consecuencia exacta: esas jornadas **quedan abiertas y sin poder cerrarse** mientras dure la suspensión, porque nadie podrá iniciar sesión para arquearlas. Debe listar cuáles son.

**FR-SA-SUS-7** Suspender **no cierra jornadas, no desvincula equipos, no retira cajas y no desactiva a nadie** **[A14]**, **[A11]**, **[R9]**. Todo queda como está y vuelve a estar disponible al reactivar. La confirmación debe decirlo, porque es lo que distingue una suspensión de una ruptura.

**FR-SA-SUS-8** **Cerrar una sede** es definitivo y **no** se permite con jornadas abiertas: "Esta sede tiene jornadas abiertas. Deben cerrarse antes." con enlace a esas jornadas **[R6]**. Una sucursal no se cierra dejando efectivo sin conciliar.

**FR-SA-SUS-9** Cerrar una sede **no desvincula sus equipos ni retira sus cajas**: esas son acciones de su administrador **[A14]**. La confirmación debe advertirlo y decir cuántos equipos y cuántas cajas quedarán en una sede cerrada, para que PuntoCash pueda pedirle al mercante que los libere.

**FR-SA-SUS-10** **Reactivar** una sede o un operador exige motivo escrito y restablece el acceso de inmediato. La ficha debe mostrar el historial de suspensiones con sus motivos y fechas, en solo lectura **[R9]**.

**FR-SA-SUS-11** Toda suspensión y toda reactivación genera un evento de auditoría, con el alcance afectado registrado en números **[RP-21]**, **[RP-26]**.

**FR-SA-SUS-12** Ninguna de estas acciones debe presentarse como una alternativa rutinaria a lo que corresponde al mercante. Donde la consola las ofrece —en las alertas de §3, en la ficha de un trabajador (**FR-SA-TRAB-6**)— debe indicar primero el camino normal, que es pedírselo al administrador de la sede.

---

## 14. Auditoría

La pantalla que hace verificable todo lo anterior.

**FR-SA-AUD-1** `/super-admin/auditoria` lista los eventos de gobierno de toda la red, del más reciente al más antiguo, con: fecha y hora (en Cuba), el evento y el objeto afectado, quién actuó (persona y rol; en un mercante, también su operador), la sede y el operador a los que se refiere, y el motivo declarado. Se enseñan **50 a la vez**, con «Mostrar más eventos»; no hay ventana de fechas obligatoria. Pulsar un evento abre su detalle.

**FR-SA-AUD-2** Tipos de evento que deben quedar registrados, como mínimo. **De PuntoCash:** creación, edición, suspensión, reactivación y cierre de sede; alta, suspensión, reactivación y baja de operador; asignación y revocación de sede; alta del administrador inicial y restablecimiento del acceso del administrador principal (**FR-SA-OPE-11**); habilitación y deshabilitación de servicio; definición, cambio y retirada de rango de tasas; fijación automática de tasa al límite; alta, edición y retirada de promoción de red; alta, edición, desactivación y reactivación de cuentas de PuntoCash, traspaso de la administración principal y cambio de contraseña; **reporte exportado** y **auditoría exportada**. **Del mercante:** alta, retirada y reactivación de caja; vinculación y desvinculación de equipo de caja; vinculación y desvinculación de kiosco; alta, edición, desactivación, reactivación y asistencia de acceso de trabajador; alta, edición, desactivación y reactivación de administrador; alta y retirada de moneda en la lista de una sede; definición, cambio y retirada de la tasa de una sede; alta, edición y retirada de promoción de sede; resolución de solicitud de aprobación; cierre forzado de jornada. **Alta, reincorporación y retirada de moneda del catálogo de la plataforma** (**FR-SA-MON-6**).

**FR-SA-AUD-3** La pantalla permite filtrar por **quién actuó** —PuntoCash, un mercante o ambos—, que es lo que separa los dos bloques de FR-SA-AUD-2: ver solo lo que hizo PuntoCash, o solo lo que hizo un mercante, es la consulta más frecuente cuando se revisa un incidente.

**FR-SA-AUD-4** Filtros: rango de fechas (por día de Cuba, los dos extremos incluidos), tipo de evento, persona, quién actuó, operador y sede. El tipo se elige en una lista **agrupada por lo que se gobierna** (sedes, operadores, servicios, monedas y tasas, promociones, cajas y equipos, trabajadores, administradores, jornadas y aprobaciones, cuentas de PuntoCash, reportes y auditoría). La búsqueda libre mira el **motivo y el objeto**: buscar una sede o una persona por su nombre es lo primero que se intenta al revisar un incidente. Los filtros viajan en la dirección y sobreviven a recargar.

**FR-SA-AUD-5** Cada evento enlaza a la **sede** y al **operador** a los que se refiere, cuando los tiene, y a **la persona sobre quien se actuó** cuando esa persona tiene ficha en esta consola: un **trabajador** (siempre) o una **cuenta de PuntoCash** (solo si quien mira es el principal, que es quien puede abrir esa sección). Para ello el registro guarda, junto al texto con que se nombraba, el identificador del objeto. Una **caja**, un equipo o un **administrador de sede** se nombran pero no se enlazan: esta consola no tiene ficha propia para ellos. El enlace aparece en el listado y en el detalle.

**FR-SA-AUD-6** El registro es **de solo lectura desde toda superficie del producto**, incluida esta. No debe existir ningún control de edición ni de borrado, ni siquiera deshabilitado **[RP-21]**. El módulo del registro solo expone añadir y consultar.

**FR-SA-AUD-7** El detalle de un evento muestra, cuando aplique, el **valor anterior y el valor nuevo** — una tasa que pasó de un valor a otro, una sede que pasó de un operador a otro, una caja que pasó de activa a retirada — para que el registro sea legible sin reconstruirlo mentalmente.

**FR-SA-AUD-8** Los eventos se muestran con lenguaje de negocio, nunca con el identificador del dominio ni enums en bruto **[R10]**.

**FR-SA-AUD-9** «Exportar a Excel» descarga **lo que hay en pantalla** —la misma selección, en el mismo orden— en `/super-admin/auditoria/exportar`, con los filtros en la dirección. El archivo dice en su cabecera cuántos eventos trae y con qué filtros, y lleva la fecha como fecha. A diferencia de un reporte, **este archivo nombra personas** (los trabajadores y administradores sobre los que se actuó), y es por eso que **la exportación misma queda en el registro**, con el número de eventos y los filtros. Sin sesión de PuntoCash lleva al acceso.

**FR-SA-AUD-10** Quien consta como autor de un evento es **una persona** —de las cuentas de PuntoCash o de los administradores de un mercante—, nunca el nombre de un área.

**Ver en la demo:** `/super-admin/auditoria` con `emarrero@puntocash.com`. «Solo mercantes» deja lo de Ana Barrios, Yuliet Pérez y Marta Sánchez; con Desde y Hasta el 30 de junio salen los dos eventos del traspaso de Miramar, y el detalle de uno muestra el antes y el después con enlace a la sede y al operador; «Exportar a Excel» descarga la selección y deja un evento «Auditoría exportada».

---

## 15. Modelo de dominio y datos simulados

**FR-SA-DOM-1** Esta consola se apoya en el mismo módulo `src/features/network` que la del mercante (**FR-AD-DOM-1** a **FR-AD-DOM-4**), consumiendo las mismas entidades con alcance global.

**FR-SA-DOM-2** Las consultas del dominio reciben el alcance como parámetro explícito, y el alcance global es un valor de ese parámetro, no la ausencia de él: así una llamada sin alcance es un error visible y no una fuga silenciosa **[A1]**, **[RP-19]**.

**FR-SA-DOM-3** Las **escrituras** sobre `Caja`, `Trabajador`, `UsuarioAdmin` (salvo la regeneración de **FR-SA-OPE-11**), `MonedasSede`, `ParSede` (salvo la fijación automática de **FR-SA-TASA-7**) y los vínculos de equipo deben **rechazar el alcance global** en el propio dominio **[A14]**, **[RP-26]**, **[FR-AD-DOM-6]**. La imposibilidad no puede depender de que esta consola no dibuje el botón.

**FR-SA-DOM-4** El dominio debe exponer una consulta de **operador vigente en una fecha dada** para una sede, que resuelve FR-SA-OPS-2 leyendo el historial de asignaciones **[RP-20]**.

**FR-SA-DOM-5** El inventario de §7 debe leerse del mismo mecanismo `src/features/devices/device-link.ts` que la consola del mercante escribe **[FR-AD-DOM-4]**, sin una copia propia.

**FR-SA-DOM-6** Los datos simulados amplían los de **FR-AD-DOM-8** con lo que solo esta consola necesita: al menos una sede **sin operador asignado**; una sede **asignada y todavía sin cajas**; una asignación **cerrada** (una sede que cambió de mercante); un operador **dado de baja**; un operador **suspendido** con sedes y trabajadores, para verificar §13; un par **con rango definido y sin ninguna sede que lo cotice**; un par **sin rango que dos sedes podrían cotizar**, para verificar FR-SA-TASA-3; una sede **con monedas en su lista y ningún par definido**; promociones de red y de mercante conviviendo en una misma sede; y un registro de auditoría poblado con eventos de los dos roles y de varias fechas.

**FR-SA-DOM-7** La asignación cerrada debe tener operaciones registradas **dentro de su tramo**, para que FR-SA-OPS-2 sea verificable: esas operaciones deben mostrar el operador antiguo, no el actual.

---

## 16. Comportamiento transversal

**FR-SA-STATE-1** Rigen sin cambios los requisitos transversales de la consola del mercante: estados de tabla, estados de envío, confirmación de acciones irreversibles, ausencia de jerga en errores y usabilidad por teclado (**FR-AD-STATE-1** a **FR-AD-STATE-5**).

**FR-SA-STATE-2** Toda acción de gobierno de esta consola —sin excepción— exige **motivo escrito** de al menos 10 caracteres, sin valor predefinido y sin lista de opciones.

**FR-SA-STATE-3** Toda acción de gobierno debe mostrar, antes de confirmar, un resumen de qué va a cambiar y a quién afecta, con los nombres concretos de las sedes, operadores, cajas o personas implicadas — nunca un recuento abstracto sin identificar.

**FR-SA-STATE-4** Donde esta consola muestra algo que no puede cambiar, debe decir **de quién es** y **qué pedir**, no limitarse a mostrarlo sin controles **[A14]**. Aplica al menos a: cajas y equipos (**FR-SA-EQ-6**), trabajadores (**FR-SA-TRAB-6**), monedas y pares por sede (**FR-SA-TASA-13**, **FR-SA-TASA-15**) y administradores (**FR-SA-OPE-6**).

---

## 17. Condiciones conocidas y fuera de alcance

- **Nada de esto está implementado.** `/super-admin` contiene hoy un README de marcador de posición.
- **Sin backend**, como el resto del producto.
- **Sin sub-roles**: el Super Admin es un rol único e indivisible, lo que significa que cualquier persona con esta consola puede revocar una sede, suspender a un mercante o darlo de baja. Si el negocio quiere separar quien consulta de quien decide, es una decisión pendiente.
- **Sin gestión de cajas, equipos, trabajadores, administradores, listas de monedas por sede ni pares de cotización.** Son ausencias deliberadas **[A14]**, especificadas en FR-SA-EQ-5, FR-SA-TRAB-4, FR-SA-OPE-6, FR-SA-TASA-8 y FR-SA-TASA-13, y explicadas al usuario en FR-SA-STATE-4. No son carencias por cubrir más adelante.
- **Sin inventario de Pantallas informativas** **[FR-SA-EQ-9]**.
- **Exportación:** los reportes (**FR-SA-REP-8**, solo totales) y la auditoría (**FR-SA-AUD-9**, que nombra personas y por eso deja huella) se exportan a Excel; el reporte también a PDF. Ninguna otra pantalla exporta **[R11]**.
- **Sin notificaciones** fuera de la consola: un mercante suspendido se entera al intentar entrar, no por correo. Merece revisión del negocio.
- **Sin recuperación de acceso** funcional.
- **Sin nada económico** **[A8]**.
- **Revisión visual obligatoria** a 1440×900 antes de dar por terminada cualquier pantalla, conforme a `CLAUDE.md`.

---

## Apéndice A · Qué puede cada rol

Tabla de contraste, para consultar al implementar cualquier control. La columna del Super Admin es deliberadamente corta.

| Acto | Worker | Admin de sede | Super Admin |
| --- | --- | --- | --- |
| Registrar una operación | Sí | No | No |
| Mover efectivo, arquear, cerrar por arqueo | Sí | No | No |
| Forzar cierre de jornada | No | Sí, en sus sedes | No |
| Resolver una solicitud de aprobación | No | Sí, en sus sedes | No (solo la consulta) |
| **Crear o retirar una caja** | No | **Sí, en sus sedes** | **No (solo la ve)** |
| **Vincular o desvincular el equipo de una caja** | No | **Sí, en sus sedes** | **No (solo lo ve)** |
| **Vincular o desvincular un kiosco** | No | **Sí, en sus sedes** | **No (solo lo ve)** |
| **Crear, editar o desactivar un trabajador** | No | **Sí, en sus sedes** | **No (solo lo ve)** |
| **Asistir a un trabajador con su acceso** | No | **Sí, en sus sedes** | **No** |
| **Crear otros administradores** | No | **Sí, de su empresa** | **Solo el primero de cada mercante** |
| **Declarar qué monedas maneja una sede** | No | **Sí, del catálogo de la plataforma** | **No (solo las ve)** |
| **Definir los pares que cotiza una sede y su tasa** | No | **Sí, si tiene el servicio y hay rango** | **No (solo la fijación automática al mover el rango)** |
| **Mantener el catálogo de monedas de la plataforma** | No | No | **Sí** |
| Publicar una promoción de sede | No | Sí, en sus sedes | No |
| Fijar o retirar el rango permitido de un par | No | No | Sí |
| Habilitar servicios en una sede | No | No | Sí |
| Publicar una promoción de red | No | No | Sí |
| Crear una sede o editar sus datos maestros | No | No | Sí |
| Asignar o revocar una sede | No | No | Sí |
| Alta o baja de un operador | No | No | Sí |
| **Suspender una sede o un operador** | No | No | **Sí — su único recurso sobre lo que pasa dentro** |
| Ver el historial de asignaciones de una sede | No | Solo el tramo propio | Sí, completo |
| Consultar el registro de auditoría | No | No | Sí, en solo lectura |
| Modificar algo ya registrado por un Worker | No | No | No |
