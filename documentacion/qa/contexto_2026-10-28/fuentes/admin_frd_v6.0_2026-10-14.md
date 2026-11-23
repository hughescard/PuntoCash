# PuntoCash — Administración de sede
## Documento de Requisitos Funcionales (FRD) · v6.0

**Estado:** Línea base de **entrega parcial** — especifica el comportamiento funcional de la consola de administración de sede **tal como está implementada**. Toda pantalla que este documento describe se puede abrir y recorrer. Lo que está especificado y aún no construido no vive aquí: vive en `PuntoCash_Admin_Sede_Alcance_Pendiente_v1.md`.

**Destinatarios:** Personas desarrolladoras y QA. Utilizable como especificación de implementación y de referencia para aceptación.

**Alcance:** Únicamente `/admin`. **No cubre Super Admin** (`/super-admin`), que tiene su propio documento y no entra en esta entrega.

**Control de cambios — v6.0 (14/10/2026).** **Reestructuración para la entrega parcial.** El documento pasa a tener la forma del FRD de Worker, que es la que los desarrolladores de esta misma red ya saben leer, y a describir **solo lo construido**.

Cuatro cambios de estructura. **(1)** Las siete secciones especificadas y sin pantalla —Jornadas, Aprobaciones, Operaciones, Monedas, Tasas, Promociones y Reportes— salen a `PuntoCash_Admin_Sede_Alcance_Pendiente_v1.md`, **sin que ninguno de sus requisitos cambie ni se renumere**: `FR-AD-JOR-*`, `FR-AD-APR-*`, `FR-AD-OPS-*`, `FR-AD-MON-*`, `FR-AD-TASA-*`, `FR-AD-PROM-*` y `FR-AD-REP-*` siguen siendo los mismos códigos, y el modelo de datos los necesita hoy aunque sus pantallas lleguen después. Un FRD que promete pantallas inexistentes convierte cada lectura en una comprobación de si eso existe o no. **(2)** El inventario de rutas de **FR-AD-NAV-1** gana una columna de **estado**, como el de Worker: implementada o marcador de posición. **(3)** Se añaden las secciones de cierre que Worker tiene y este documento no tenía — **convenciones de formato** y **contrato de accesibilidad** (§1.4 y §1.5), **dependencias funcionales** (§11), **comportamiento relevante para aceptación** (§12), **condiciones conocidas de la implementación** (§13) y **no especificado por este documento** (§14)— y la §18 anterior, que mezclaba las tres últimas en una lista de viñetas, se reparte entre ellas. **(4)** Aparece un **Apéndice A de terminología**, que faltaba; el mapa de reglas a requisitos pasa a ser el Apéndice B y se limita a requisitos que existen en este documento.

Y un cambio de fondo: **lo que la demostración simula pasa a ser requisito numerado**, en la forma «En la demostración» que §7 ya usaba, en vez de quedar en una viñeta de condiciones conocidas o en un comentario del código. Se añaden así **FR-AD-ACC-9** y **FR-AD-ACC-10** (cuentas de demostración y la contraseña recuperada que el servidor recuerda), **FR-AD-EQ-27** a **FR-AD-EQ-29** (el terminal que todavía no pregunta a este servidor, el andamio de equipos esperando vinculación, y el QR que no se descodifica) y **FR-AD-HOME-9** y **FR-AD-HOME-10** (lo que Inicio no puede mostrar todavía, y por qué no se dibuja en cero). Cada uno dice qué rige en producción. Dos requisitos se corrigen contra lo construido: **FR-AD-SHELL-2** y **FR-AD-SHELL-9**, que contaban trece destinos cuando desde la v5.0 son trece para el administrador principal y doce para los demás.

**Historia del documento.** Las versiones v1.0 a v5.2 (22/09/2026 – 13/10/2026) construyeron esta especificación sección a sección junto con las pantallas, y su registro de cambios detallado se conserva en el control de versiones del repositorio. Los cuatro giros que explican por qué el documento dice lo que dice: la **v2.0** incorporó lo que Worker y Kiosco delegaron en esta consola —vinculación de equipos, segundo factor, el trabajador adscrito a una sede y no a una caja—; la **v3.0** corrigió el reparto de potestades entre PuntoCash y el mercante, que las versiones anteriores tenían mal; la **v4.0** convirtió el teléfono de excepción en requisito de primera clase, al confirmar el negocio que esta consola se supervisa a diario desde un móvil; y la **v5.0** estableció el **administrador principal**, con la §8 entera reservada a él. Entre medias, la v4.13 retiró de la asistencia de acceso un «liberar el bloqueo del reto» que no correspondía a ningún estado real, y la v5.2 convirtió la recuperación de contraseña de un marcador en un flujo completo.

**Documentos relacionados:** `PuntoCash_Admin_Sede_PRD_v1.md` define el producto, sus usuarios, los conceptos y las reglas **A1–A14**. Este FRD no las repite; las referencia como **[A#]** allí donde un comportamiento existe a causa de una de ellas. `PuntoCash_PRD_v2.md` define **R1–R13** y **RP-1 a RP-16**, y `PuntoCash_Admin_Sede_PRD_v1.md` §8 los requisitos de resultado **RP-17 a RP-26**. `PuntoCash_Admin_Sede_Alcance_Pendiente_v1.md` especifica las siete secciones sin construir. `PuntoCash_Worker_Functional_Requirements_v1.md` (v1.8) especifica la aplicación supervisada: su **§2.1 (FR-DEV-1 a 9)** es la contraparte de §3.2, su **§2.3–§2.11** el acceso que esta consola hereda (§2), y su **§2.13 (FR-REC-1 a 12)** la recuperación de contraseña que comparten. `PuntoCash_Kiosk_Autoservicio_Functional_Requirements_v1.md` **§1.1 (FR-AS-LINK-1 a 9)** es la contraparte de §3.3. `PuntoCash_Kiosk_Pantalla_Functional_Requirements_v1.md` **§7** define el origen único de datos de sede que las secciones pendientes alimentarán. `CLAUDE.md` y `PuntoCash_Manual_de_Marca_y_UI_v1.pdf` mandan sobre todo lo visual.

**Cómo leer este documento.** Los requisitos se agrupan por área y se numeran `FR-AD-<área>-<n>`. "Debe" describe comportamiento obligatorio. Se referencian reglas de administración como **[A#]** y de producto como **[R#]**. Los requisitos marcados **«En la demostración»** describen el andamio de esta línea base, no el producto, y cada uno dice qué rige en su lugar cuando haya backend. La terminología sigue el glosario del Apéndice A. Solo se especifica comportamiento implementado; §14 indica lo que queda deliberadamente sin definir.

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

Y una que sí hace y conviene subrayar, porque en el producto está repartida entre varias superficies y aquí se concentra: **es el único lugar del producto desde el que se desactiva a una persona, se retira una caja o se desvincula un equipo.** PuntoCash lo ve todo y no toca nada de esto **[A14]**.

**De las tres cosas, esta entrega cubre entera la primera y la mitad de la segunda.** Está construido todo lo que pone una sucursal en marcha —cajas, equipos de caja, kioscos, trabajadores— y todo lo que tiene que ver con las personas: su alta, su credencial, su edición, su sede, su desactivación, la ayuda con su acceso, y los usuarios administradores de la empresa con su administrador principal. Está construido el acceso completo, con su recuperación de contraseña. De la tercera hay Inicio y las fichas de sede, con lo que de ellas no depende de secciones que faltan. Lo que **no** está es lo que declara la sede día a día —monedas, pares y tasa, promociones— y lo que mira la operación en detalle —jornadas, aprobaciones, operaciones y reportes—: las siete secciones que `PuntoCash_Admin_Sede_Alcance_Pendiente_v1.md` especifica y que §14 nombra una a una.

---

## 1. Comportamiento global del módulo

### 1.1 Shell

**FR-AD-SHELL-1** Toda pantalla dentro del grupo `(app)` debe componer `AppShell` + `AppHeader` + `AppSidebar` + `AppMain` desde `@/components/shell`, sin reimplementar ninguna pieza. Se sigue la estructura de grupos de rutas de Worker: `(auth)` para las pantallas sin shell y `(app)` para las que lo llevan.

**FR-AD-SHELL-2** La barra lateral debe agrupar sus destinos en tres bloques, porque trece entradas planas no se leen: **Operación** (Inicio, Jornadas, Aprobaciones, Operaciones), **Sucursal** (Sedes, Cajas, Equipos, Trabajadores, Usuarios) y **Configuración** (Monedas, Tasas, Promociones, Reportes). **Son trece para el administrador principal y doce para los demás**, porque Usuarios solo existe para él (**FR-AD-USR-11**); la diferencia la decide el servidor al armar el menú, no el navegador ocultando una entrada ya pintada.

**FR-AD-SHELL-3** La entrada de Aprobaciones debe mostrar un indicador numérico cuando haya solicitudes pendientes en el alcance vigente; la de Cajas, cuando haya cajas sin equipo vinculado o sedes sin ninguna caja.

**FR-AD-SHELL-4** La cabecera global debe mostrar: la marca **PuntoCash**, el **selector de alcance** (§1.3), el nombre de la persona con sesión iniciada, y los accesos de Perfil y Cerrar sesión. Debe mostrar además, como texto secundario y sin tratamiento de marca, el nombre del operador al que pertenece la sesión — información de contexto, no identidad de producto **[A9]**.

**FR-AD-SHELL-5** La cabecera **no** debe mostrar el logotipo, el color corporativo ni el nombre comercial del operador como marca de la aplicación **[A9]**.

**FR-AD-SHELL-6** **Esta consola no es de escritorio.** A diferencia de Worker y Kiosco, que corren en máquinas de una sucursal, `/admin` se supervisa a diario desde un teléfono. **Toda** pantalla debe ser utilizable a partir de **360px** de ancho y hasta 1440×900, que sigue siendo la referencia de escritorio. No se impone ancho mínimo, no se limita el zoom, y ninguna pantalla puede producir desplazamiento horizontal.

**FR-AD-SHELL-7** *(Absorbido en FR-AD-SHELL-6.)* Las pantallas de vinculación de §3 eran la excepción que obligaba a pensar en el teléfono, porque la vía del QR (FR-DEV-2, FR-AS-LINK-2) exige tener la consola delante del equipo que se vincula. Ahora lo que era su excepción es la regla de todas.

**FR-AD-SHELL-8** Ninguna pantalla debe contener un flujo por pasos con stepper.

### 1.1.1 Comportamiento en pantalla pequeña

**FR-AD-SHELL-9** Por debajo de 1024px la barra lateral no se representa. La navegación se reparte en dos piezas que no compiten: una **barra inferior** fija con tres destinos frecuentes —Inicio, Jornadas y Aprobaciones— más una entrada «Más», y un **cajón** que «Más» abre con el resto de los destinos en sus tres bloques (**FR-AD-SHELL-2**), el acceso al perfil y el cierre de sesión. Cuando alguno de los destinos del cajón tiene aviso, «Más» lo señala con un punto, para que un indicador no quede escondido detrás de una entrada que no lo muestra.

> **Por qué tres y no cuatro.** La v4.0 pedía cuatro destinos e incluía Cajas. Medido a 375px, con cinco entradas cada una dispone de unos 70px y la etiqueta «Aprobaciones» ocupa 69: no cabe sin recortar el texto o quitarle la etiqueta, y las dos cosas empeoran una barra que se aprende leyéndola. Cajas pasa al cajón —donde está completa, con su indicador— y «Más» hereda el punto de aviso. Se enmienda el requisito en vez de dejar el código discrepando de él.

**FR-AD-SHELL-10** Las dos navegaciones deben leer **una sola definición** de destinos. La consola no puede ofrecer secciones distintas según el tamaño de la pantalla.

**FR-AD-SHELL-11** El cajón debe comportarse como un diálogo: foco atrapado mientras está abierto, cierre con Escape y con un control visible, y el resto de la página anunciada como inerte. Debe cerrarse solo al llegar al destino elegido.

**FR-AD-SHELL-12** El selector de alcance no cabe en la cabecera de un teléfono. Debe representarse en una franja propia inmediatamente bajo la cabecera, a todo lo ancho y fuera del área que se desplaza, para que el nombre de la sede se lea entero. Lo que se retire de la cabecera —nombre de la persona, operador, cierre de sesión— debe estar en el cajón.

**FR-AD-SHELL-13** Las tablas se representan **como una tarjeta por fila** por debajo de 1024px, con cada dato acompañado de su etiqueta. No se recurre al desplazamiento horizontal: en un teléfono es un gesto que casi nadie descubre. La tarjeta muestra los mismos datos que la fila y conserva su enlace al detalle.

**FR-AD-SHELL-14** Los controles interactivos mantienen sus 44–48px de altura. La única reducción admitida es la de las casillas del código de verificación, porque el control real es el campo que las cubre entero y no cada casilla.

**FR-AD-SHELL-15** Los filtros de una pantalla se apilan en una columna, y los que no caben se agrupan tras un control que los abre. Ningún filtro puede quedar solo accesible en escritorio.

**FR-AD-SHELL-16** Los diálogos de confirmación de **FR-AD-STATE-3** deben ser legibles y accionables a 360px, con sus acciones apiladas y la acción primaria alcanzable sin desplazar.
### 1.2 Rutas

**FR-AD-NAV-1** Inventario de rutas y estado. «Marcador de posición» significa que la ruta existe y representa una pantalla de «en construcción» que nombra la sección y ofrece una vía de regreso: la navegación está completa para que nadie confunda *todavía no* con *no va a existir*, y ninguna de esas pantallas define ni simula un flujo **[§14]**.

| Ruta | Función | Estado |
| --- | --- | --- |
| `/admin` | No es una pantalla: redirige a Inicio | Implementada |
| `/admin/login` | Acceso, paso 1: credenciales (sin shell) | Implementada |
| `/admin/verificacion` | Acceso, paso 2: código de verificación (sin shell) | Implementada |
| `/admin/recuperar-acceso` | Recuperación de contraseña (sin shell) | Implementada |
| `/admin/inicio` | Panel consolidado del alcance vigente | Implementada |
| `/admin/sedes` | Listado de las sedes administradas | Implementada |
| `/admin/sedes/[id]` | Ficha de una sede | Implementada |
| `/admin/cajas` | Cajas de las sedes administradas | Implementada |
| `/admin/cajas/nueva` | Alta de una caja | Implementada |
| `/admin/equipos` | Equipos vinculados: cajas y kioscos | Implementada |
| `/admin/equipos/vincular` | Vincular un equipo por QR o por código | Implementada |
| `/admin/trabajadores` | Listado de trabajadores | Implementada |
| `/admin/trabajadores/nuevo` | Alta de trabajador | Implementada |
| `/admin/trabajadores/[id]` | Ficha de un trabajador | Implementada |
| `/admin/trabajadores/[id]/editar` | Edición de sus datos personales | Implementada |
| `/admin/trabajadores/[id]/acceso` | Ayudar con el acceso | Implementada |
| `/admin/usuarios` | Usuarios administradores de la empresa | Implementada — **solo para el administrador principal** |
| `/admin/usuarios/nuevo` | Alta de un usuario administrador | Implementada — **solo para el administrador principal** |
| `/admin/usuarios/[id]` | Ficha de un usuario administrador | Implementada — **solo para el administrador principal** |
| `/admin/usuarios/[id]/editar` | Edición de sus datos personales | Implementada — **solo para el administrador principal** |
| `/admin/perfil` | Datos de la persona con sesión iniciada | Marcador de posición **[§14]** |
| `/admin/jornadas` | Jornadas abiertas y cerradas | Marcador de posición |
| `/admin/aprobaciones` | Bandeja de solicitudes | Marcador de posición |
| `/admin/operaciones` | Historial consolidado de operaciones | Marcador de posición |
| `/admin/monedas` | Monedas que maneja cada sede | Marcador de posición |
| `/admin/tasas` | Pares y tasa efectiva por sede | Marcador de posición |
| `/admin/promociones` | Promociones de las sedes administradas | Marcador de posición |
| `/admin/reportes` | Volumen por sede, servicio, trabajador y día | Marcador de posición |

Las siete rutas de marcador de posición que corresponden a secciones especificadas, y las rutas de detalle que cada una añadirá —`/admin/jornadas/[id]`, `/admin/aprobaciones/[id]`, `/admin/operaciones/[codigo]`, `/admin/promociones/nueva` y `/admin/promociones/[id]`—, se especifican en `PuntoCash_Admin_Sede_Alcance_Pendiente_v1.md`. Esas rutas de detalle **todavía no existen** y responden 404.

**FR-AD-NAV-2** Toda ruta con identificador debe validar que el recurso pertenece al alcance vigente **antes** de representar nada. Un recurso existente pero fuera de alcance se trata exactamente igual que uno inexistente: mismo mensaje, mismo estado **[A1]**, **[RP-19]**.

**FR-AD-NAV-3** El mensaje para ese caso debe ser genérico: "No encontramos lo que buscabas." No debe revelar que el recurso existe pero pertenece a otro operador. Es el mismo trato que reciben las rutas de §8 para quien no es el administrador principal (**FR-AD-USR-11**).

**FR-AD-NAV-4** Esta consola **no** se usa sobre un equipo vinculado: no le aplican FR-DEV-1 ni la pantalla de vinculación. Se abre desde cualquier navegador, incluido el de un teléfono.

**FR-AD-NAV-5** Las pantallas de acceso —credenciales, verificación y recuperación— se representan **fuera del shell**, en el grupo de rutas `(auth)`. Antes de que exista sesión no puede aparecer en pantalla ni una persona, ni un operador, ni una sede.

### 1.3 Selector de alcance

**FR-AD-SCOPE-1** La sesión determina el alcance: el conjunto de sedes con asignación vigente al operador de la sesión. El alcance **no es elegible ni editable**; el selector solo filtra dentro de él **[A1]**.

**FR-AD-SCOPE-2** El selector ofrece "Todas mis sedes" más una entrada por cada sede del alcance, identificada por código y nombre.

**FR-AD-SCOPE-3** Con una sola sede en el alcance, el selector no se representa; la cabecera muestra su código y nombre como texto fijo.

**FR-AD-SCOPE-4** La selección persiste durante la navegación y se aplica a Inicio, Cajas, Equipos, Jornadas, Aprobaciones, Operaciones, Monedas, Tasas, Promociones y Reportes. Sedes, Trabajadores y Usuarios muestran siempre el alcance completo, con la sede como columna cuando aplique.

**FR-AD-SCOPE-5** Al cambiar la selección, los filtros propios de la pantalla activa se conservan; solo cambia la sede.

**FR-AD-SCOPE-6** Si una sede deja de estar asignada al operador mientras la sesión está abierta y era la seleccionada, la siguiente navegación vuelve a "Todas mis sedes" y avisa: "Ya no administras esa sede."

### 1.4 Convenciones de formato

Son las del producto, no las de esta consola: un importe se lee igual en el mostrador y en el teléfono del mercante. Rigen aquí **FR-FMT-1 a FR-FMT-5** de `PuntoCash_Worker_Functional_Requirements_v1.md` §1.3, **sin repetirlos**. Lo que sigue es lo propio de esta superficie.

**FR-AD-FMT-1** El **volumen y cualquier agregado de dinero se expresan por moneda, nunca convertidos a una moneda única** **[FR-AD-HOME-1]**. El producto no tiene definida por el negocio una tasa de consolidación, e inventar una produciría cifras que nadie podría defender. Vale para Inicio, para las fichas y para los reportes cuando lleguen.

**FR-AD-FMT-2** Los identificadores de equipo siguen `CAJ-NNNN-NNNN` para los de caja y `KIO-NNNN-NNNN` para los kioscos. El código del reto de vinculación son **seis cifras**, y se admite y se muestra agrupado de tres en tres ("482 913"), ignorando los espacios al leerlo.

**FR-AD-FMT-3** El **correo de verificación** de un trabajador o de un usuario administrador se muestra **enmascarado** en todo listado y en toda ficha, igual que en la propia pantalla de verificación. La única excepción deliberada es la asistencia de acceso, que lo muestra entero porque allí se viene a encontrar la errata (**FR-AD-TRAB-10**).

**FR-AD-FMT-4** Ninguna pantalla muestra una credencial de dispositivo, ni permite copiarla ni exportarla **[A10]**, **[FR-AD-EQ-25]**. Las credenciales de personas —la inicial de un trabajador o de un usuario administrador— se muestran **una sola vez**, en el resultado del alta o de la regeneración, y no vuelven a ser consultables.

### 1.5 Contrato de accesibilidad

Rigen **FR-A11Y-1 a FR-A11Y-3** de `PuntoCash_Worker_Functional_Requirements_v1.md` §1.5. Esta consola añade dos exigencias propias, que vienen de usarse en un teléfono.

**FR-AD-A11Y-1** El destino activo de la navegación debe marcarse como actual para las tecnologías de asistencia, no solo mediante color — y en las dos navegaciones, la lateral y la del teléfono.

**FR-AD-A11Y-2** Todo control interactivo mantiene **44–48px de altura** (**FR-AD-SHELL-14**), y el cajón de navegación se comporta como un diálogo: foco atrapado, cierre con Escape y con un control visible, resto de la página inerte (**FR-AD-SHELL-11**).
---

## 2. Acceso

**FR-AD-ACC-1** El acceso es **el mismo flujo de dos pasos que Worker**, sin variación: credenciales y, después, un código de seis dígitos al correo registrado, con cinco minutos de vigencia, tres intentos y hasta tres envíos. Ninguna sesión existe hasta que el código se verifica **[R13]**.

**FR-AD-ACC-2** Rigen, aplicados a `/admin/login` y `/admin/verificacion`, los requisitos **FR-AUTH-1 a FR-AUTH-7** y **FR-2FA-1 a FR-2FA-32** de `PuntoCash_Worker_Functional_Requirements_v1.md` §2.3 a §2.10, **sin repetirlos aquí**, tal como ese documento previó (§2.2, punto 4). El dominio `src/features/auth` se reutiliza sin cambios.

**FR-AD-ACC-3** Lo único que difiere es el destino posterior a la verificación, `/admin/inicio`, y el texto de contexto de la pantalla de credenciales, que identifica la consola como "Administración de sede".

**FR-AD-ACC-4** **No aplica FR-AUTH-8** (trabajador de otra sede): esa comprobación es entre un trabajador y la caja de un equipo, y esta consola no se usa sobre equipos vinculados.

**FR-AD-ACC-5** Mensajes de error indistinguibles entre usuario inexistente, contraseña incorrecta y usuario desactivado: "Credenciales incorrectas."

**FR-AD-ACC-6** Un usuario válido cuyo **operador** esté suspendido o dado de baja no debe poder iniciar sesión, y recibe el mismo mensaje indistinguible **[A14]**.

**FR-AD-ACC-7** Un usuario válido de un operador activo pero **sin ninguna sede asignada** sí inicia sesión, y aterriza en un Inicio en estado vacío explícito (**FR-AD-HOME-8**). No es un error: es un mercante que aún no tiene nada a su cargo.

**FR-AD-ACC-8** `/admin/recuperar-acceso` recupera la contraseña, **con el mismo flujo de tres pasos que Worker** —identificador, código y contraseña nueva— y las mismas reglas, que no deben poder separarse entre consolas: no se dice a dónde fue el código ni enmascarado, la respuesta es idéntica exista la cuenta o no, y **terminar no abre sesión** **[R13]** (Worker FRD **§2.13**, **FR-REC-1** a **FR-REC-12**). Lo único propio de esta consola es a quién se le pide ayuda cuando el correo registrado ya no sirve: **al administrador principal de la empresa**, que es el único que puede regenerar una credencial (**FR-AD-USR-11**) —y si quien se quedó fuera es el propio principal, a PuntoCash—.

**FR-AD-ACC-9** **En la demostración**, el acceso de esta consola reconoce estas cuentas, todas con la contraseña `puntocash`: `marta@antillasf.cu` (Antilla, **administradora principal**, tres sedes), `dcastro@antillasf.cu` (Antilla, segundo usuario, **no principal**), `rortega@caribecambios.cu` (Caribe, tres sedes), `ibetancourt@centrodivisas.cu` (Centro Divisas, **una sola sede**, para ver **FR-AD-SCOPE-3** sin construir datos a mano), `lperez@cienfuegoscambio.cu` (operador activo **sin ninguna sede**, para ver **FR-AD-ACC-7**), `yperez@orientedivisas.cu` (operador **suspendido**: no entra, **[A14]**) y `error@puntocash.com` (error de red). El código de verificación es `123456`; `000000` fuerza un error de red. En la recuperación, `desconocido@puntocash.com` simula una cuenta inexistente —la pantalla es idéntica y ningún código funciona, que es justo lo que el flujo exige— y `error@puntocash.com` hace fallar la solicitud.

**FR-AD-ACC-10** **En la demostración**, la contraseña que alguien fija recuperando su acceso **se recuerda en el proceso del servidor** hasta que este se reinicie, y a partir de ese momento esa cuenta deja de aceptar `puntocash` y acepta la nueva. Es lo que permite terminar el recorrido y comprobar la mitad que de verdad importa: que la anterior ya no sirve. Hay un detalle que conviene conocer porque costó encontrarlo: la pantalla de recuperación es de cliente y el acceso de `/admin` se comprueba **en el servidor** —a propósito, para que la identidad de quien acierta la contraseña no cruce al navegador—, así que la pantalla entrega lo fijado al servidor con una acción dedicada. *En producción rige **FR-REC-10** de Worker: guardar invalida la contraseña anterior y cierra las sesiones abiertas de esa cuenta, y quien la guarda es el backend.*

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

**FR-AD-EQ-11** Si el Admin prefiere no dejar la caja sin equipo, la confirmación debe ofrecer, como alternativa y sin salir del diálogo, el enlace a **forzar cierre** de esa jornada (**FR-AD-JOR-7**, alcance pendiente §1.1). No la ejecuta por él: se la pone a mano. **En la demostración**, ese enlace lleva a la sección de Jornadas y no al cierre de esa jornada concreta, porque la sección no está construida y este servidor tampoco sabe si la caja tiene jornada abierta (**FR-AD-IMP-3**). El texto se redacta en consecuencia —«si prefieres no dejarla sin equipo, puedes forzar el cierre de su jornada desde Jornadas»— en lugar de prometer un destino que no existe.

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

**FR-AD-EQ-27** **En la demostración**, **el terminal todavía no pregunta a este servidor**, y es la condición que más conviene entender antes de probar esta sección. La vinculación y los retos viven en `features/network/devices.ts`, que es la fuente única que **FR-AD-DOM-4** exige, y §3.4 ya canjea contra ella. Pero Worker y el kiosco siguen leyendo su vínculo de `features/devices/device-link.ts` —el `localStorage` de cada máquina—, así que **el código que muestra un terminal no llega aquí**: vincular desde la consola no cambia lo que muestra ese terminal, ni al revés. Lo que queda es recablear los dos terminales y el simulador contra la fuente única, tras lo cual `device-link.ts` y `/kiosk/simulador-admin` desaparecen (**FR-AD-EQ-26**, **FR-DEV-8**). *En producción el reto que el administrador teclea es el que el equipo muestra; eso es todo lo que FR-AD-EQ-17 a FR-AD-EQ-24 describen.*

**FR-AD-EQ-28** **En la demostración**, y como consecuencia directa de **FR-AD-EQ-27**, el servidor mantiene **siempre un equipo de caja y un kiosco esperando vinculación**, y `/admin/equipos/vincular` muestra sus códigos en un aviso que dice con todas las letras que en el producto se leen de la pantalla del equipo. Sin ese andamio la pantalla no tendría ningún código que encontrar y no se podría recorrer. Cada vinculación deja sitio a la siguiente, para que no se agote tras la primera pasada. Desaparece con el recableado.

**FR-AD-EQ-29** **En la demostración**, **el QR no se descodifica.** De **FR-AD-EQ-17** y **FR-AD-EQ-19** está construido todo lo que es producto: las dos vías a la vez, el encuadre, la explicación previa de para qué se usa la cámara, y el aviso de que no hay cámara o se denegó el permiso con la vía del código intacta al lado. Lo que falta es la lectura del código de barras, porque el terminal de la demostración tampoco genera un QR escaneable: leerlo exigiría una biblioteca de visión por un gesto que se implementará contra el equipo real. *En producción rige FR-AD-EQ-17: las dos vías, y las dos funcionando.*

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

**FR-AD-HOME-2** Representa un **panel de atención** con las situaciones que piden acción, en este orden de prioridad (las que dependen de secciones no construidas se nombran aquí porque el orden es el requisito; lo que hoy se representa lo acota **FR-AD-HOME-10**): **sedes sin ninguna caja**; **cajas sin equipo vinculado**; **sedes suspendidas por PuntoCash** —que no se resuelven desde aquí, pero explican por qué una sucursal no opera y evitan que se busque la causa en otra parte (**FR-AD-SEDE-13**)—; **sedes sin ninguna moneda en su lista**; **sedes con el servicio de Cambio de moneda habilitado y ningún par definido**; aprobaciones pendientes; jornadas abiertas fuera del horario de su sede; arqueos cerrados con diferencia; tasas fijadas automáticamente al límite y aún no revisadas (**FR-AD-TASA-12**); **pares cuyo rango PuntoCash retiró** (**FR-AD-TASA-15**); promociones vencidas aún publicadas; y sedes sin jornada abierta dentro de su horario.

**FR-AD-HOME-3** Las primeras encabezan porque describen **una sucursal que no puede operar o que está a medio montar**, no una incidencia del día: hasta que se resuelven, la sede no atiende a nadie o exhibe un tablero incompleto. Las que vienen después son incidencias de la operación corriente, que piden atención pero no impiden abrir.

**FR-AD-HOME-4** Cada entrada enlaza a la pantalla donde se resuelve.

**FR-AD-HOME-5** Cuando no hay ninguna situación que atender, el panel muestra un estado tranquilo y explícito ("Todo en orden en tus sedes"), nunca desaparece: su ausencia y su vacío deben distinguirse a simple vista.

**FR-AD-HOME-6** Representa una **tabla de estado por sede**: código y nombre, localidad, estado de la sede, cajas activas y cuántas de ellas sin equipo, kioscos vinculados, trabajadores activos, estado de la jornada (abierta / cerrada / sin abrir), trabajador en turno, operaciones del día y hora de apertura. Cada fila enlaza a la ficha de la sede. Las cuatro últimas son las que dependen de Jornadas y Operaciones (**FR-AD-HOME-9**).

**FR-AD-HOME-7** Con "Todas mis sedes", la tabla muestra todas; con una sede concreta, se reduce a esa sede y se amplía con el detalle de sus cajas y sus equipos.

**FR-AD-HOME-8** Estado vacío de alcance: un operador sin sedes asignadas debe ver un Inicio que lo explique — "Todavía no tienes sedes asignadas. Cuando PuntoCash te asigne una, aparecerá aquí." — sin métricas en cero ni tablas vacías, que se leerían como un fallo.

**FR-AD-HOME-9** **En la demostración**, Inicio no cumple todavía **FR-AD-HOME-1** ni la parte final de **FR-AD-HOME-6**, y la razón es de dependencia y no de diseño. De las cuatro métricas que FR-AD-HOME-1 pide —sedes con jornada abierta, operaciones del día, volumen del día y aprobaciones pendientes— **no se representa ninguna**: las tres primeras son datos de Jornadas y Operaciones, y la cuarta necesita solicitudes de aprobación, que el dominio simulado todavía no trae (**FR-AD-IMP-6**). En su lugar se muestran las cuatro cifras de alcance que sí se pueden calcular con certeza: sedes, cajas activas, trabajadores activos y sedes sin caja. De la tabla por sede faltan las cuatro columnas que dependen de esas mismas secciones: **estado de la jornada, trabajador en turno, operaciones del día y hora de apertura**.

**Lo que falta no se dibuja vacío ni en cero**, y esa es la parte del requisito que debe conservarse: una cifra en cero se lee como una sucursal parada, no como un dato que todavía no existe, y este demo es la referencia que van a seguir quienes implementen — una cifra inventada se copia igual que una verdadera. La sección lo anuncia en su descripción en lugar de pintar columnas en blanco. *En producción rigen FR-AD-HOME-1 y FR-AD-HOME-6 enteros.*

**FR-AD-HOME-10** **En la demostración**, el panel de atención de **FR-AD-HOME-2** representa las tres situaciones cuyo dato existe para toda la red: **sedes sin ninguna caja**, **cajas activas sin equipo vinculado** y **sedes suspendidas por PuntoCash**. Las dos primeras son además las de mayor prioridad, así que el panel cumple su encabezamiento. Las que dependen de Monedas, Tasas, Promociones o Jornadas —sedes sin monedas, pares sin definir, tasas fijadas al límite, rangos retirados, promociones vencidas, jornadas fuera de horario y arqueos con diferencia— **no se listan ni se simulan**, y el orden de FR-AD-HOME-2 se conserva para que añadirlas no obligue a reordenarlo. El conteo de cajas sin equipo es **el mismo cálculo** con el que el menú pone su indicador en Cajas (**FR-AD-SHELL-3**), para que el aviso y el indicador no puedan contar cosas distintas. *En producción rige FR-AD-HOME-2 entero.*

---

## 6. Sedes

**FR-AD-SEDE-1** `/admin/sedes` lista las sedes del alcance con: código, nombre, municipio y provincia, estado, cajas activas, cajas con equipo vinculado, kioscos vinculados, trabajadores activos y estado de la jornada de hoy. Siempre muestra el alcance completo **[FR-AD-SCOPE-4]**.

**FR-AD-SEDE-2** Admite búsqueda por código o nombre y filtro por estado. No admite creación, edición ni baja **[A3]**.

**FR-AD-SEDE-3** `/admin/sedes/[id]` muestra la ficha en siete bloques: **datos maestros**, **servicios habilitados**, **cajas y sus equipos**, **kioscos**, **trabajadores**, **jornada en curso** y **contenido público**.

**FR-AD-SEDE-4** Los **datos maestros** —código, nombre, dirección, municipio, provincia, teléfono, horario, estado, fecha de alta— son de solo lectura, y debe declararlo de forma visible: "Estos datos los gestiona PuntoCash." No debe haber ningún control de edición, ni siquiera deshabilitado **[A3]**.

**FR-AD-SEDE-5** El bloque de datos maestros debe advertir además de su alcance real: esos datos son los que la sucursal exhibe en su kiosco y en su pantalla informativa **[A12]**, **[FR-PANT-DATA-4]**. Un teléfono equivocado ahí es un teléfono equivocado en la TV de la sala de espera, y el Admin no puede corregirlo por su cuenta: debe pedirlo a PuntoCash. La ficha debe indicar a quién.

**FR-AD-SEDE-6** El bloque de **servicios habilitados** lista qué servicios puede ofrecer esa sede, en solo lectura, con la misma advertencia: los habilita PuntoCash **[A3]**. Es el bloque que explica por qué el Admin puede o no definir pares de cotización en esa sede (**FR-AD-TASA-2**, alcance pendiente §5).

**FR-AD-SEDE-7** El bloque de **cajas y sus equipos** lista las cajas con identificador, equipo vinculado o su ausencia, estado, trabajador con sesión iniciada y saldo por moneda si hay jornada abierta. Los saldos son de consulta **[A6]**. Enlaza a §4 y a §3.2.

**FR-AD-SEDE-8** El bloque de **kioscos** lista los vinculados a la sede con su identificador y última actividad, y enlaza a §3.3.

**FR-AD-SEDE-9** El bloque de **trabajadores** lista los adscritos a esa sede con nombre, identificador y estado, y enlaza al listado filtrado. **No muestra caja asignada, porque un trabajador no tiene caja** **[A13]**.

**FR-AD-SEDE-10** El bloque de **jornada en curso** muestra, si la hay, hora de apertura, caja, trabajador, fondeo declarado, movimientos hasta el momento y enlace al detalle. Si no la hay, indica desde cuándo la caja está cerrada y cuál fue la última jornada.

**FR-AD-SEDE-11** El bloque de **contenido público** resume lo que esa sucursal está exhibiendo ahora mismo: las monedas que maneja, los pares que cotiza con su tasa vigente, y sus promociones activas, con enlaces a Monedas, Tasas y Promociones. Es la vista que responde "¿qué está viendo un cliente en mi sala de espera?" **[A12]**.

**FR-AD-SEDE-12** La ficha muestra la **asignación vigente** —desde qué fecha el operador administra esa sede— como dato informativo. No muestra el historial completo de asignaciones: ese historial incluye a otros operadores y pertenece al Super Admin **[A1]**.

**FR-AD-SEDE-13** Una sede **suspendida por PuntoCash** debe mostrarlo de forma destacada, con la fecha y el motivo declarado, y advertir de la consecuencia: ningún trabajador de esa sede puede iniciar sesión y no se abren jornadas nuevas mientras dure **[A14]**. La ficha sigue siendo consultable en su totalidad.

---

## 7. Trabajadores

El área donde el Admin crea personas — y, desde la v3.0, el **único lugar del producto donde se desactiva a una** **[A4]**, **[A14]**.

**FR-AD-TRAB-1** `/admin/trabajadores` lista los trabajadores de todas las sedes del alcance, con: nombre completo, identificador de acceso, **sede**, correo de verificación enmascarado, estado (activo / desactivado), fecha de alta y última jornada operada. **No hay columna de caja** **[A13]**.

**FR-AD-TRAB-2** Admite búsqueda por nombre o identificador y filtros por sede y por estado. Por defecto muestra solo los activos, con el filtro visible y modificable.

**FR-AD-TRAB-3** `/admin/trabajadores/nuevo` da de alta un trabajador. Campos: nombre, primer apellido, segundo apellido (opcional), tipo y número de documento, teléfono, **correo**, identificador de acceso y **sede**.

**FR-AD-TRAB-4** **El alta elige sede, nunca caja** **[A13]**, **[FR-DEV-5]**. El formulario no ofrece ninguna caja, y ninguna pantalla de esta sección presenta al trabajador como adscrito a una: la caja la determina el equipo en el que inicie sesión, no su ficha. **La ausencia del selector es la explicación**, y no se acompaña de ningún texto que la justifique.

**FR-AD-TRAB-5** El selector de sede ofrece **únicamente** sedes del alcance vigente, y el dominio revalida esa pertenencia al guardar **[A4]**, **[A1]**.

**FR-AD-TRAB-6** El **correo es obligatorio** y es el canal por el que llega el código de verificación en cada inicio de sesión **[R13]**, **[FR-2FA-16 y ss.]**. Sin correo válido el trabajador no podría acceder nunca, así que el alta no debe permitirse. **La etiqueta del campo basta**: ni el alta ni la ficha acompañan el correo de ningún texto que explique para qué sirve. Lo que sí debe decirse es el rechazo, cuando falta o no es válido (**FR-AD-TRAB-7**).

**FR-AD-TRAB-7** Validaciones y mensajes: campo obligatorio vacío → "Este campo es obligatorio."; correo con formato inválido → "Introduce un correo válido."; identificador ya existente en la red → "Ese identificador ya está en uso."; documento ya registrado como trabajador → "Ya existe un trabajador con ese documento."

**FR-AD-TRAB-8** El alta genera una credencial inicial que se muestra una sola vez al terminar, con instrucción explícita de entregarla al trabajador. No debe poder volver a consultarse; si se pierde, se regenera.

**La credencial es su contraseña**, no un pase de un solo uso: le sirve indefinidamente, y **el producto no le obliga a cambiarla al entrar**. La cambia él, cuando quiera, por la vía de «¿Olvidaste tu contraseña?» de Worker (**Worker FRD §2.13**, **FR-REC-1** y ss.), que es el único sitio donde elige una suya. De ahí se siguen dos cosas que conviene no descubrir tarde. **El administrador conoce una contraseña válida de su trabajador** mientras este no la cambie; lo único que le impide entrar como él es el segundo factor, cuyo código va al correo del trabajador **[R13]** —es decir, la promesa de **FR-AD-TRAB-11** se sostiene sobre R13 y no sobre el diseño de la credencial—. Y **regenerar pisa la contraseña que el trabajador hubiera elegido**: es un restablecimiento, no una reemisión, y por eso se confirma antes de hacerlo.

**FR-AD-TRAB-9** `/admin/trabajadores/[id]` muestra la ficha con sus datos, su sede, su estado y su actividad reciente (últimas jornadas, cajas operadas y volumen), y permite editar los datos, **cambiar su correo**, reasignarlo a otra sede del alcance, regenerar credencial y desactivar. **Editar los datos es `/admin/trabajadores/[id]/editar`, una pantalla aparte** —son seis campos y **FR-AD-SHELL-15** no los quiere en un modal— **y alcanza a nombre, apellidos, tipo y número de documento, y teléfono; no al identificador de acceso, ni al correo, ni a la sede.** El identificador es con lo que inicia sesión y cambiarlo en caliente dejaría fuera a quien esté trabajando; el correo es el canal del segundo factor y se cambia dentro de **FR-AD-TRAB-10**, donde quien lo corrige está viendo el problema que causa; la sede decide dónde puede iniciar sesión y tiene su propia acción con su propia advertencia (**FR-AD-TRAB-14**). **Los tres se omiten de esa pantalla sin explicación alguna**: no estar es la explicación, como la caja ausente del alta en **FR-AD-TRAB-4**, y quien los busque los tiene en la ficha con su propia acción.

**FR-AD-TRAB-10** **Asistencia de acceso.** Es `/admin/trabajadores/[id]/acceso`, y responde al caso que el PRD de producto §5.1 llama «la asistencia del administrador de sede»: el trabajador dice que **no le llega el código**. La pantalla muestra el correo registrado **sin enmascarar** —al contrario que el listado y la ficha, porque lo que se viene a hacer aquí es **detectar que está mal escrito** y una dirección enmascarada esconde justo la errata que se busca— y permite corregirlo, con **motivo escrito** y evento de auditoría. Corregirlo arregla también la recuperación de contraseña de Worker (**Worker FRD §2.13**), que manda su código a esa misma dirección.

> **Por qué no hay nada más aquí.** Hasta la v4.12 este requisito pedía además **liberar el bloqueo del reto vigente**. No hay tal bloqueo: el reto es de un solo intento de acceso en una sola máquina (**Worker FRD FR-2FA-1**, **FR-2FA-15**), y a quien se le agotan los intentos o los envíos le basta con volver al inicio de sesión para que nazca otro entero. No queda nada atascado que un administrador tenga que soltar, de modo que era una acción sin estado detrás. **Tampoco debe inventarse un bloqueo de cuenta por contraseñas falladas**: acertar la contraseña no abre nada sin el segundo factor **[R13]**, así que lo único que se ganaría es dejar sin operar a una caja con cola delante. El único bloqueo que un trabajador puede encontrarse y que solo esta consola resuelve es **estar desactivado**, y tiene su propia acción en **FR-AD-TRAB-15**.

**FR-AD-TRAB-11** **Ayudar con el acceso no entrega, muestra ni genera ningún código de verificación, y no abre sesión por el trabajador.** El segundo factor no se salta ni se delega **[R13]**. La interfaz debe decirlo, y **antes de cualquier control**, porque es la expectativa equivocada con la que se llega: "Esto no te da acceso a su cuenta. No te muestra su código ni lo genera, y no inicia sesión por él."

**FR-AD-TRAB-12** **Desactivar** impide al trabajador iniciar sesión, pero no borra ni altera nada de lo que operó **[A7]**. Exige confirmación y motivo escrito, y genera evento de auditoría.

**FR-AD-TRAB-13** Un trabajador con **jornada abierta** no puede desactivarse: "Este trabajador tiene una jornada abierta en {caja} de {sede}. Ciérrala antes de desactivarlo." con enlace directo **[R6]**.

**FR-AD-TRAB-14** Reasignar un trabajador a otra sede tampoco es posible con una jornada abierta, con el mismo patrón. La reasignación tiene efecto inmediato sobre dónde puede iniciar sesión: desde ese momento solo en equipos de su sede nueva **[FR-DEV-6]**, y la confirmación debe advertirlo.

**FR-AD-TRAB-15** Un trabajador desactivado puede reactivarse; reactivar exige confirmar su sede. **No existe ningún caso en que un trabajador desactivado no pueda reactivarse desde esta consola**: PuntoCash no desactiva personas **[A14]**.

**FR-AD-TRAB-16** Si el **operador** o la **sede** están suspendidos por PuntoCash, los trabajadores afectados no pueden iniciar sesión aunque estén activos. La ficha debe distinguir ese estado del de un trabajador desactivado —"No puede acceder: {sede} está suspendida por PuntoCash"— y no ofrecer ninguna acción que sugiera poder resolverlo desde aquí **[A14]**.

**FR-AD-TRAB-17** **En la demostración**, la guarda de jornada abierta de **FR-AD-TRAB-13** y **FR-AD-TRAB-14** **no puede comprobarse**: la jornada vive en `caja-data.ts`, en el navegador del trabajador, y este servidor no la ve —el mismo límite que **FR-AD-IMP-3** recoge para la columna de jornada de **FR-AD-EQ-5**—. Por eso los diálogos de desactivar y de reasignar **advierten siempre** de que no es posible con una jornada abierta, con enlace a Jornadas, en vez de avisar solo cuando lo saben y callar cuando no; y por eso la confirmación **no bloquea**. El dominio ya acepta la guarda (`WorkerGuards`) y rechaza con `jornada-abierta`: lo único que falta es quién se la pase. *Todo esto es mecanismo de la demostración; en producción rigen FR-AD-TRAB-13 y FR-AD-TRAB-14, que son prohibiciones y deben impedir la acción.*

---

## 8. Usuarios administradores

Los demás usuarios de la empresa administradora, a partir del primero que PuntoCash entregó al asignarle su primera sede **[A4]**, **[A3]**.

**FR-AD-USR-1** `/admin/usuarios` lista los usuarios administradores del operador de la sesión, con: nombre, identificador, correo enmascarado, estado, fecha de alta, último acceso y **papel**. El papel se dice con palabras completas —**«Administrador»** o **«Administrador principal»**— en su propia columna, no como etiqueta junto al nombre: dos etiquetas apiladas se amontonan en cuanto la columna se estrecha, y «Principal» a secas obliga a adivinar principal de qué. La fila de quien mira sí se marca, para no tener que buscar el propio nombre entre varios parecidos. **No se lista quién fue el usuario inicial**: es un dato de PuntoCash, no de esta consola, y lo que aquí decide algo es el papel.

**FR-AD-USR-2** `/admin/usuarios/nuevo` da de alta un usuario administrador. Campos: nombre, primer apellido, segundo apellido (opcional), **correo**, identificador de acceso y teléfono.

**FR-AD-USR-3** El correo es obligatorio, por la misma razón que en trabajadores: es el canal del segundo factor **[R13]**.

**FR-AD-USR-4** **Sobre la operación, todos los usuarios administradores de un operador pueden exactamente lo mismo, en todas sus sedes.** No hay sub-roles ni usuarios limitados a una sucursal: sedes, cajas, equipos, trabajadores, monedas, tasas, promociones, aprobaciones y reportes son iguales para todos. **La única diferencia entre un usuario y otro es §8**, que pertenece al administrador principal (**FR-AD-USR-11**). El alta debe decirlo sin rodeos, porque es la consecuencia que más probablemente sorprenda: "Este usuario podrá hacer todo lo que tú puedes hacer en la operación, en todas tus sedes."

> **No es un sistema de permisos, y el documento lo dice para que no se construya uno.** Hay exactamente **una** llave y **una** sección detrás. Modelarlo como roles, matrices o capacidades sería construir diez veces lo que hace falta y abrir la puerta a combinaciones que el negocio no ha pedido.

**FR-AD-USR-5** El alta genera una credencial inicial que se muestra una sola vez, con el mismo tratamiento que **FR-AD-TRAB-8**.

**FR-AD-USR-6** `/admin/usuarios/[id]` muestra **sus datos y sus acciones, y nada más**: ni un bloque que explique qué puede hacer un administrador ni de dónde salió su cuenta. Un administrador aprende sus capacidades en el manual al empezar a usar el sistema, no en una ficha que abre para corregir un teléfono. Lo único que la pantalla explica es **por qué falta un control**, que es otra cosa. Permite editar datos, cambiar correo, regenerar credencial y **desactivar**. **Editar los datos es `/admin/usuarios/[id]/editar`, una pantalla aparte**, y alcanza a **nombre, apellidos y teléfono**; no al identificador de acceso ni al correo, que tiene su propia acción por ser el canal del segundo factor. Es la misma división que **FR-AD-TRAB-9**, y los tres campos excluidos se omiten **sin explicación en pantalla**. **Editarse a uno mismo sí se puede**: corregir el propio nombre o teléfono no deja a nadie fuera, y lo que **FR-AD-USR-7** protege es la desactivación.

**FR-AD-USR-7** *(sustituido por **FR-AD-USR-13**.)* Su regla —nadie se desactiva a sí mismo— queda absorbida: el único que puede desactivar es el principal, y al principal no lo desactiva nadie.

**FR-AD-USR-8** *(retirado.)* Existía para que una empresa no se quedara sin administradores activos. **FR-AD-USR-13** lo garantiza por construcción: siempre queda el principal.

**FR-AD-USR-9** Un usuario desactivado puede reactivarse desde esta misma pantalla.

**FR-AD-USR-10** Alta, edición, desactivación y reactivación generan eventos de auditoría **[RP-21]**.

### 8.1 El administrador principal

**FR-AD-USR-11** **Toda la §8 pertenece a un único usuario: el administrador principal de la empresa.** Solo él da de alta, edita, cambia el correo, regenera credenciales, desactiva y reactiva usuarios administradores. Para los demás **la sección no existe**: no aparece en el menú y sus rutas responden como inexistentes (**FR-AD-NAV-3**), no como prohibidas. La diferencia importa: «no tienes permiso» invita a pedirlo y deja a alguien esperando; «no está ahí» no abre esa conversación. **Esta decisión se toma en el servidor**, al armar el menú y al resolver la ruta; ocultarla en el cliente dejaría el enlace en el HTML entregado.

**FR-AD-USR-12** **El papel se traspasa, y lo traspasa su titular**, desde su propia ficha, eligiendo a **un usuario activo** de la empresa. Es inmediato y en un solo acto: al confirmar hay exactamente un principal, el nuevo, y quien lo traspasó **deja de ver §8** —conservando todo lo demás—. No existe un estado con dos principales ni con ninguno. Existe porque la alternativa —atar el papel para siempre a la cuenta que creó PuntoCash— convierte cualquier relevo de personal, incluso uno planificado, en un ticket de soporte.

**FR-AD-USR-13** **Al administrador principal no lo desactiva nadie, ni él mismo.** El control no se ofrece, y la ficha dice por qué y qué hacer: traspasar primero. Es lo que garantiza que **nunca se llegue a cero administradores capaces de dar de alta a otro**, y por eso **FR-AD-USR-8** sobra.

**FR-AD-USR-14** **«Principal» y «usuario inicial» no son lo mismo, y el dominio los guarda aparte.** El inicial es un hecho histórico que no cambia —quién entregó PuntoCash al crear la empresa (**FR-SA-OPE-5**)— y sigue importando porque es la cuenta cuyo acceso PuntoCash puede restablecer. El principal es la llave de §8, y se mueve. Al nacer una empresa coinciden.

> **Condición conocida, y es la contrapartida de este diseño.** Si el principal traspasa el papel y después quien lo recibió pierde el acceso —se va sin traspasar, o no puede entrar en su correo—, **la empresa se queda sin §8**: nadie de dentro puede recuperarla, y lo que PuntoCash puede restablecer es el acceso del **inicial**, que ya no es el principal. La salida sería que PuntoCash pudiera **reasignar** el papel, y eso pertenece al FRD de la consola de PuntoCash, no a este. Queda nombrado aquí para que no se descubra en producción.

---
## 9. Modelo de dominio y datos simulados

**Esta sección describe el modelo entero, incluidas las entidades de las secciones que todavía no tienen pantalla.** Es deliberado: quien diseñe el esquema de datos lo necesita completo hoy, o construirá tablas que habrá que migrar en cuanto llegue Tasas o Aprobaciones. Lo que no existe son las pantallas, no los conceptos.

**FR-AD-DOM-1** La capa se apoya en un módulo de dominio nuevo, `src/features/network`, con datos simulados en memoria, sin backend ni persistencia real.

**FR-AD-DOM-2** Debe exponer, como mínimo: `Operador`, `UsuarioAdmin`, `Sede`, `Caja`, `Asignacion`, `ServiciosSede`, `CatalogoMonedas` (plataforma), `PoliticaTasas` (rangos de red por par), `MonedasSede` (la lista de monedas de una sede), `ParSede` (par + tasa de compra y venta), `Promocion`, `SolicitudAprobacion` y `EventoAuditoria`, con las consultas acotadas por alcance y las escrituras que esta consola necesita.

**FR-AD-DOM-3** El dominio de Caja existente (`src/features/caja`) debe ampliarse con el enlace **Caja → Sede**, que hoy no existe, y el de trabajadores con **Trabajador → Sede** **[A13]**. Toda consulta de jornadas, movimientos y operaciones debe poder acotarse por sede a través de él. Esto es además lo que cierra el hueco que el kiosco dejó anotado en **FR-AS-DOM-11**: con Caja→Sede, Buscar solicitud ya puede filtrar por sede como exige **[RP-14]**.

**FR-AD-DOM-4** La vinculación de equipos debe apoyarse en el mecanismo compartido que ya existe, `src/features/devices/device-link.ts`, con sus dos consumidores (`features/kiosk/device-session.ts` y `features/worker/register-device.ts`). Esta consola **no** debe implementar un segundo mecanismo paralelo.

**FR-AD-DOM-5** El acotamiento por alcance debe resolverse **en el dominio**, no en la interfaz: las consultas reciben el alcance de la sesión y nunca devuelven registros fuera de él **[A1]**, **[RP-19]**.

**FR-AD-DOM-6** El dominio debe hacer imposible, no solo improbable, que PuntoCash escriba dentro de una sede: las escrituras sobre `Caja`, `Trabajador`, `UsuarioAdmin`, `MonedasSede`, `ParSede` y los vínculos de equipo deben exigir un alcance de operador, y rechazar un alcance global **[A14]**, **[RP-26]**.

**FR-AD-DOM-7** El **contenido público de sede** (pares y tasas exhibidas, datos de sede, promociones) debe servirse desde este dominio como un único origen, y `signage-data.ts` debe pasar a leer de él en lugar de sus constantes fijas **[A12]**, **[RP-25]**, **[FR-PANT-DATA-7]**. Mientras esa sustitución no ocurra, el tablero seguirá mostrando cifras distintas de las que la sede cotiza, que es el defecto que **FR-PANT-IMP-4** ya documenta.

**FR-AD-DOM-8** Los datos simulados deben incluir material suficiente para que las pantallas se vean como se verán en producción: al menos tres operadores, seis sedes repartidas de forma desigual (uno con una sola sede, otro con tres), **una sede recién asignada y sin ninguna caja**, cajas con y sin equipo vinculado, un kiosco vinculado por sede, doce trabajadores, dos usuarios administradores en al menos un operador, jornadas abiertas y cerradas, al menos un arqueo con diferencia, dos solicitudes pendientes y una resuelta, **una sede con dos monedas en su lista y un par posible que PuntoCash no tiene con rango**, **una sede sin el servicio de Cambio de moneda habilitado pero con monedas en su lista**, promociones en los tres estados y de los dos orígenes, y un historial de operaciones de varios días.

**FR-AD-DOM-9** Al menos un operador debe tener **una sola sede**, para que **FR-AD-SCOPE-3** sea verificable sin construir datos a mano.

---
## 10. Comportamiento transversal

**FR-AD-STATE-1** Toda tabla implementa cuatro estados distinguibles: con datos, cargando, vacía por ausencia de datos, y vacía por filtros sin resultados. Los dos vacíos nunca comparten mensaje.

**FR-AD-STATE-2** Toda acción que escribe debe mostrar estado de envío, impedir el doble envío y confirmar el resultado.

**FR-AD-STATE-3** Toda acción irreversible o con consecuencia sobre la operación —desactivar trabajador o usuario, retirar una caja, forzar cierre, resolver solicitud, definir, cambiar o retirar un par, añadir o retirar una moneda de la lista, vincular o desvincular un equipo, retirar una promoción— pide confirmación explícita en un diálogo que resume qué va a pasar.

**FR-AD-STATE-4** Ningún error muestra jerga interna, códigos de excepción ni nombres de campo del dominio **[R10]**.

**FR-AD-STATE-5** Toda pantalla mantiene la usabilidad por teclado y la jerarquía de datos financieros que el manual de marca exige.

**FR-AD-STATE-7** Toda pantalla nueva se comprueba a **360px, 390px y 1440px** antes de darse por terminada. Una pantalla que solo se revisó en escritorio no está terminada: esta consola se usa más en un teléfono que delante de un monitor (**FR-AD-SHELL-6**).

**FR-AD-STATE-8** Ninguna pantalla produce desplazamiento horizontal a 360px. Es la comprobación que delata que algo se diseñó para 1440 y nadie volvió a mirarlo.

**FR-AD-STATE-6** Cuando una acción está impedida por algo que PuntoCash controla —servicio no habilitado, par sin rango, sede u operador suspendidos—, la interfaz debe decir **quién** lo controla y **qué pedir**, nunca limitarse a deshabilitar el control **[A3]**, **[A14]**.

---
## 11. Dependencias funcionales

| Capacidad | Depende de |
| --- | --- |
| Cualquier pantalla del shell | Un segundo factor verificado — unas credenciales correctas no alcanzan ninguna **[R13]** |
| Cualquier pantalla del shell | Un usuario activo, de un operador activo **[A14]** |
| Que una pantalla muestre algo | Al menos una sede en el alcance; sin ninguna, Inicio lo explica y el resto queda vacío por ausencia, no por filtro (**FR-AD-ACC-7**, **FR-AD-HOME-8**) |
| Ver la sección de Usuarios (§8) | Ser el **administrador principal** del operador de la sesión (**FR-AD-USR-11**) |
| Vincular un equipo de caja | Una sede del alcance **con al menos una caja activa y sin equipo vinculado**, y un reto vigente y no usado |
| Vincular un kiosco | Una sede del alcance y un reto vigente y no usado |
| Desvincular un equipo | Nada más que el vínculo. **No** exige que la jornada esté cerrada **[A11]**, **[FR-DEV-7]** |
| Crear una caja | Una sede del alcance, y un identificador libre dentro de esa sede |
| Retirar una caja | Sin jornada abierta, sin equipo vinculado, y que no sea la última activa de una sede activa |
| Reactivar una caja | Nada. **No** restaura ningún vínculo de equipo: hay que vincular uno de nuevo |
| Dar de alta un trabajador | Una sede del alcance; un identificador libre en toda la red; un documento no registrado; un correo válido |
| Desactivar o reasignar un trabajador | Sin jornada abierta **[R6]** — con la condición de demostración de **FR-AD-TRAB-17** |
| Reactivar un trabajador | Confirmar su sede. **Siempre es posible**: PuntoCash no desactiva personas **[A14]** |
| Que un trabajador pueda iniciar sesión | Estar activo; su sede y su operador no suspendidos; y un equipo vinculado a una caja **de su sede** (**FR-DEV-1**, **FR-AUTH-8**) |
| Dar de alta, editar o desactivar un usuario administrador | Ser el administrador principal (**FR-AD-USR-11**) |
| Desactivar un usuario administrador | Que no sea el principal (**FR-AD-USR-13**) |
| Traspasar el papel de principal | Ser su titular, y un destinatario **activo** distinto de uno mismo (**FR-AD-USR-12**) |
| Recuperar la contraseña | Nada: se llega sin sesión y la respuesta es idéntica exista la cuenta o no (**FR-REC-4**) |
| Que la ficha de un trabajador muestre su actividad reciente | **Jornadas** (alcance pendiente §1). Hoy se anuncia en lugar de dibujarse en blanco |
| Que Inicio muestre las métricas y columnas de FR-AD-HOME-1 y 6 | **Jornadas** y **Operaciones** (**FR-AD-HOME-9**) |
| Que el tablero público de una sede muestre lo que esa sede cotiza | **Tasas** (alcance pendiente §5) y **FR-AD-DOM-7** |

---

## 12. Comportamiento relevante para aceptación

**FR-AD-QA-1** Lo especificado en este documento está cubierto por una batería automatizada de Playwright —**123 pruebas** al momento de redactarlo, entre las que recorren la consola (`admin-acceso`, `admin-shell`, `admin-movil`, `admin-responsive`, `admin-sedes`, `admin-cajas`, `admin-equipos`, `admin-trabajadores`, `admin-usuarios`) y las que ejercitan el dominio sin navegador (`network-domain`, `equipos-domain`)—. La división es deliberada: las reglas del dominio —alcance, guardas, traspaso, unicidad— se prueban sin navegador, porque son aritmética y no interfaz; y cada sección de pantalla tiene **una** prueba de navegación y congruencia, que vigila que el documento y lo que se ve no se contradigan en lo que de verdad distingue a esa sección.

**FR-AD-QA-2** Comportamientos críticos para la aceptación — una regresión aquí es un defecto, no una preferencia:

1. **Ningún dato fuera del alcance**, por ninguna vía: ni por listado, ni por filtro, ni pegando una URL con el identificador de un recurso ajeno, que debe responder como inexistente y no como prohibido (**FR-AD-NAV-2**, **FR-AD-NAV-3**, **FR-AD-DOM-5**).
2. **Ninguna sesión sin segundo factor verificado**: unas credenciales correctas no alcanzan ninguna pantalla del shell, y el código nunca llega al cliente (**FR-AD-ACC-1**, **FR-AD-ACC-2**).
3. **Un único mensaje de rechazo en el acceso** para cuenta inexistente, contraseña incorrecta, usuario desactivado y operador suspendido (**FR-AD-ACC-5**, **FR-AD-ACC-6**).
4. **§8 no existe para quien no es el principal**, en sus dos mitades: la entrada ausente del menú **en el HTML entregado**, y la ruta respondiendo 404 (**FR-AD-USR-11**).
5. **Al administrador principal no lo desactiva nadie**, y nunca hay dos ni ninguno (**FR-AD-USR-12**, **FR-AD-USR-13**).
6. **Una caja, un equipo**: vincular sobre una caja que ya tiene equipo se rechaza, y el reto es de un solo uso (**FR-AD-EQ-8**, **FR-AD-EQ-23**).
7. **Desvincular no cierra la Jornada**, y la confirmación lo advierte antes (**FR-AD-EQ-10**).
8. **Retirar una caja no borra nada** y la deja visible en los listados históricos (**FR-AD-CAJA-11**).
9. **Desactivar a un trabajador no altera nada de lo que operó** (**FR-AD-TRAB-12**).
10. **La asistencia de acceso no muestra, no genera y no usa ningún código**, y lo dice antes de cualquier control (**FR-AD-TRAB-11**).
11. **Ninguna credencial de dispositivo es visible, copiable ni exportable** (**FR-AD-EQ-25**).
12. **La marca visible es PuntoCash**: el nombre del operador aparece como dato de contexto y nunca con tratamiento de marca (**FR-AD-SHELL-4**, **FR-AD-SHELL-5**, **[RP-23]**).
13. **Sin desplazamiento horizontal a 360px** en ninguna pantalla, y las tablas como tarjeta por fila por debajo de 1024px (**FR-AD-STATE-8**, **FR-AD-SHELL-13**).
14. **Las dos navegaciones ofrecen los mismos destinos** — no hay secciones que aparezcan o desaparezcan según el tamaño de la pantalla (**FR-AD-SHELL-10**).
15. **Una credencial de persona se muestra una sola vez** y no vuelve a ser consultable (**FR-AD-TRAB-8**, **FR-AD-USR-5**, **FR-AD-FMT-4**).

---

## 13. Condiciones conocidas de la implementación

Lo que esta línea base tiene de andamio. Cada condición dice qué la causa y qué la retira; ninguna es una decisión de producto, y los requisitos marcados «En la demostración» de cada sección son su cara visible.

**FR-AD-IMP-1** **Sin backend ni persistencia.** La consola funciona contra módulos de dominio simulados en memoria (`src/features/network`, y el de Caja y trabajadores de la Fase 1). Una recarga completa de página restaura los datos precargados, de modo que todo recorrido que dependa de algo creado antes en la misma sesión debe navegar mediante enlaces. Lo que se da de alta —un trabajador, una caja, un usuario— desaparece al reiniciar el servidor de desarrollo.

**FR-AD-IMP-2** **El dominio en memoria es del servidor, y eso tiene una consecuencia en las pruebas.** A diferencia de Worker, cuyos mocks viven en el navegador, el de esta consola vive en el proceso del servidor y lo comparten todas las trabajadoras de Playwright a la vez. Una prueba que escriba deja su efecto hecho **para el resto de la corrida**. Por eso las pruebas de navegación de §7 y §8 recorren y leen, y abren y cancelan los diálogos de las acciones que mutarían la red; lo que se ejercita escribiendo se ejercita en `network-domain.spec.ts`, sin navegador.

**FR-AD-IMP-3** **Dos datos que el dominio no sabe para toda la red, y ninguno se inventa.** El **estado de la jornada** de cada caja (**FR-AD-EQ-5**, **FR-AD-HOME-6**) vive en `caja-data.ts` y lo mutan los flujos de Worker **en el navegador del trabajador**, que este servidor no ve; de ahí **FR-AD-TRAB-17** y el aviso incondicional de **FR-AD-EQ-10**. Y las **solicitudes generadas en el periodo** por cada kiosco (**FR-AD-EQ-12**) las produce el propio kiosco y viven en su navegador. La primera llega con Jornadas; la segunda, con Aprobaciones y Operaciones.

**FR-AD-IMP-4** **El vínculo de los terminales está en dos sitios.** Es lo que describen **FR-AD-EQ-27** y **FR-AD-EQ-28**: la fuente única que **FR-AD-DOM-4** exige ya existe y §3.4 canjea contra ella, pero Worker y el kiosco siguen leyendo su vínculo del `localStorage` de cada máquina. Hasta que los dos terminales y el simulador se recableen, vincular desde la consola no cambia lo que muestra un terminal. Es la condición de esta entrega con más consecuencias para quien pruebe el producto de punta a punta.

**FR-AD-IMP-5** **El contenido público de sede todavía no sale de este dominio.** **FR-AD-DOM-7** exige que el tablero de tasas, los datos de sede y las promociones se sirvan desde aquí como único origen, y `signage-data.ts` sigue teniendo sus constantes fijas. No puede ser de otra manera todavía: los pares y sus tasas se declaran en una sección que no está construida. Mientras siga así, el tablero de una sucursal muestra cifras distintas de las que esa sede cotiza —el defecto que **FR-PANT-IMP-4** ya documenta— y **[A12]** sigue incumplida en la demostración.

**FR-AD-IMP-6** **Los datos precargados no cubren todavía todo lo que FR-AD-DOM-8 pide.** Están los tres operadores con reparto desigual de sedes, la sede recién asignada y sin ninguna caja, las cajas con y sin equipo, los kioscos, los trabajadores y los usuarios administradores con su principal — es decir, todo lo que las secciones construidas necesitan para verse como se verán. Lo que falta son los datos de las secciones que no existen: pares sin rango, promociones en sus tres estados, solicitudes pendientes y el historial de varios días. Se añaden con cada sección, no antes.

**FR-AD-IMP-7** **Revisión visual obligatoria** antes de dar por terminada cualquier pantalla, a **360px, 390px y 1440px** (**FR-AD-STATE-7**), comprobando que ninguna produce desplazamiento horizontal a 360px (**FR-AD-STATE-8**), conforme al procedimiento de `CLAUDE.md`. La parte automatizable está en `tests/admin-responsive.spec.ts`: recorre a los tres anchos todas las pantallas construidas y mide a 360px el alto táctil de la barra inferior y de la franja de alcance (**FR-AD-SHELL-14**) y la forma del diálogo de confirmación (**FR-AD-SHELL-16**). Lo que la suite no juzga —jerarquía, respiro, legibilidad— sigue siendo revisión humana.

---

## 14. No especificado por este documento

Para todo lo siguiente **no existe requisito funcional alguno en este documento y ninguno puede inferirse** — ni de una ruta existente, ni de una pantalla de «en construcción», ni de una entidad del dominio, ni de un campo sin uso.

**Especificado aparte, no aquí.** Las siete secciones de `PuntoCash_Admin_Sede_Alcance_Pendiente_v1.md` —Jornadas, Aprobaciones, Operaciones, Monedas, Tasas, Promociones y Reportes— sí tienen requisito funcional, en ese documento. Sus pantallas de marcador de posición no definen ni simulan nada de él.

**La pantalla de Perfil.** `/admin/perfil` existe en la cabecera desde la v2.0 y en el inventario de rutas desde la v4.0, y sigue siendo un marcador de posición sin un solo requisito propio. **Y desde la v5.0 es un hueco, no solo una pendiente:** mientras §8 fue de todos, un administrador corregía su propio nombre o teléfono entrando en ella; con el modelo del administrador principal, quien no lo es **no tiene ningún sitio** donde ver ni cambiar sus propios datos, ni su contraseña salvo pasando por la recuperación como si la hubiera olvidado. Queda nombrado así para que se decida, no para que se descubra.

**El cierre de sesión, la vigencia de la sesión y la sesión concurrente en dos navegadores.** El **acceso** sí está especificado por completo, en §2. Lo que pasa después de abrir sesión —cuánto dura, si caduca, qué ocurre con dos pestañas— no.

**Las notificaciones** fuera de la consola: correo, SMS o push. Las alertas viven dentro, en el panel de atención de Inicio.

**La exportación a archivo** de cualquier cosa **[R11]**. Ni reportes, ni listados, ni auditoría. Es una decisión de producto que el PRD deja abierta, no algo que pueda colarse por un botón de descarga.

**Los sub-roles.** Sobre la operación, todos los usuarios administradores de un operador pueden exactamente lo mismo en todas sus sedes (**FR-AD-USR-4**). La única diferencia es §8, y es **una llave**, no un sistema de permisos: nada en este documento autoriza a construir roles, matrices ni capacidades.

**La edición de los datos maestros de una sede, de sus servicios habilitados y de sus rangos de tasa**, que son de PuntoCash **[A3]**. Esta consola los muestra y dice a quién pedir el cambio.

**Lo económico entre PuntoCash y el mercante** —comisiones, rentas, liquidaciones, deuda— **[A8]**.

**La administración de las Pantallas informativas.** Se asignan a su sede en el propio equipo (**FR-PANT-SEDE-1 a 7**); esta capa solo les provee el registro de sedes. Saber cuántas hay y dónde sería una capacidad nueva por definir.

**La consola de PuntoCash** (`/super-admin`), que tiene su propio documento y no entra en esta entrega. Lo que de ella se nombra aquí —que ve estos mismos equipos y no toca ninguno, que entrega el primer usuario administrador, que puede restablecer el acceso del usuario inicial— se nombra como límite de esta consola, no como especificación de aquella.

**La reasignación del papel de administrador principal por parte de PuntoCash.** Es la salida a la condición conocida de §8.1 —una empresa que se queda sin §8 porque el principal traspasó y quien lo recibió perdió el acceso— y pertenece al FRD de esa otra consola.

La ausencia de implementación significa que la capacidad aún no ha sido definida funcionalmente: debe diseñarse y aprobarse antes de poder especificarse o construirse.

---

## Apéndice A · Terminología

Amplía el Apéndice A de `PuntoCash_Worker_Functional_Requirements_v1.md`, vigente sin cambios. Se usa de forma consistente en este FRD, en el PRD y en el código; los términos de dominio en español son el lenguaje del producto y no se traducen.

| Término | Significado |
| --- | --- |
| **Sede** | Una casa de cambio física de la red, siempre propiedad de PuntoCash. Nace sin cajas. |
| **Operador** / **mercante** | La persona o empresa a la que PuntoCash entrega una o más sedes en administración. Nunca es propietaria. |
| **Admin de sede** | El rol autenticado con el que un Operador usa `/admin`. |
| **Usuario administrador** | La cuenta de una persona del mercante en esta consola. |
| **Administrador principal** | El único usuario de un operador que gobierna §8. El papel se traspasa; a su titular no lo desactiva nadie. |
| **Usuario inicial** | El primer usuario administrador de un operador, entregado por PuntoCash. Hecho histórico que no cambia, y **distinto** del principal, que se mueve. Al nacer una empresa coinciden. |
| **Alcance** | El conjunto de sedes que una sesión puede ver. Se deriva de la sesión y nunca lo elige el usuario; el selector solo filtra dentro de él. |
| **Asignación** | El vínculo histórico Sede↔Operador durante un periodo, con inicio, fin y motivo. |
| **Caja** | Un puesto de mostrador de una sede, creado y retirado por su mercante, y objeto al que se vincula un equipo. |
| **Equipo** | Un dispositivo declarado por un administrador: el equipo de una caja (`CAJ-…`) o un kiosco de autoservicio (`KIO-…`). Sin vincular no es nada. |
| **Reto de vinculación** | El QR y el código de seis cifras que un equipo sin vincular muestra; válidos diez minutos, renovados solos, de un solo uso. |
| **Vincular** / **desvincular** | Atar un equipo a su objeto —una caja, o una sede— y deshacerlo. Desvincular corta la sesión del dispositivo al instante y **nunca cierra una Jornada**. |
| **Trabajador** | El empleado del mostrador. Pertenece a una **sede**, no a una caja. |
| **Credencial inicial** | La contraseña que el Admin entrega al dar de alta a un trabajador o a un usuario administrador. Se muestra una sola vez y sirve indefinidamente hasta que su dueño la cambia. **Regenerarla es un restablecimiento**, no una reemisión. |
| **Asistencia de acceso** | La pantalla con la que un Admin corrige el correo de verificación de un trabajador que no recibe su código. No entrega, no muestra y no genera ningún código. |
| **Jornada** | La sesión de trabajo de una Caja, abierta con fondos declarados y cerrada por conciliación. La abre y la cierra el Worker; esta consola solo la mira — y, cuando Jornadas exista, podrá forzar su cierre. |
| **Solicitud de aprobación** | Un ajuste o descuadre que espera el visto bueno del Admin de la sede. |
| **Contenido público de sede** | Tasas exhibidas, monedas operadas, datos de contacto y promociones de una sucursal; origen único para el kiosco y la Pantalla. |
| **Evento de auditoría** | Registro inmutable de un acto de gobierno: quién, qué, cuándo, sobre qué y por qué. |
| **Suspender** | Acción de PuntoCash sobre un operador o una sede que corta el acceso de todos sus usuarios y trabajadores a la vez. Es su único recurso ante un problema dentro de una sede **[A14]**. |

---

## Apéndice B · Mapa de reglas a requisitos

Solo requisitos que existen en este documento. Las reglas que además se implementan en secciones no construidas lo indican, y sus requisitos están en `PuntoCash_Admin_Sede_Alcance_Pendiente_v1.md`.

| Regla | Requisitos de este documento que la implementan | También en el alcance pendiente |
| --- | --- | --- |
| **A1** Aislamiento por alcance | FR-AD-NAV-2, FR-AD-NAV-3, FR-AD-SCOPE-1 a 6, FR-AD-EQ-1, FR-AD-EQ-7, FR-AD-CAJA-5, FR-AD-TRAB-5, FR-AD-SEDE-12, FR-AD-DOM-5 | Todas sus secciones |
| **A2** Una asignación vigente | FR-AD-SEDE-12 (lectura); la gestión es del Super Admin | — |
| **A3** Solo PuntoCash decide qué sedes existen y sus límites | FR-AD-SEDE-2, FR-AD-SEDE-4, FR-AD-SEDE-5, FR-AD-SEDE-6, FR-AD-STATE-6 | FR-AD-MON-3, FR-AD-TASA-2, FR-AD-TASA-4 |
| **A4** El mercante gobierna lo de dentro | FR-AD-CAJA-1 a 14, FR-AD-EQ-3, FR-AD-TRAB-3 a 17, FR-AD-USR-1 a 14 | FR-AD-MON-1 a 10, FR-AD-TASA-1 a 17 |
| **A5** Tasa dentro del rango, sobre monedas propias y servicio habilitado | — (su pantalla no está construida) | FR-AD-TASA-2, 5, 7, 8, 11, 12, 15 |
| **A6** Supervisa y desbloquea, no opera | FR-AD-SEDE-7, FR-AD-TRAB-11 | FR-AD-JOR-7 a 9, FR-AD-APR-9, FR-AD-APR-10, FR-AD-OPS-5 |
| **A7** No altera lo del Worker | FR-AD-CAJA-11, FR-AD-TRAB-12 | FR-AD-JOR-12, FR-AD-APR-8, FR-AD-APR-9, FR-AD-OPS-5 |
| **A8** Sin economía PuntoCash↔mercante | §14 (no especificado) | FR-AD-TASA-17, FR-AD-REP-6 |
| **A9** PuntoCash es la marca visible | FR-AD-SHELL-4, FR-AD-SHELL-5 | — |
| **A10** Los equipos los vincula el Admin | FR-AD-EQ-3, FR-AD-EQ-7, FR-AD-EQ-13, FR-AD-EQ-17, FR-AD-EQ-25, FR-AD-FMT-4 | — |
| **A11** Un equipo, un puesto | FR-AD-EQ-8, FR-AD-EQ-10, FR-AD-EQ-14 | FR-AD-JOR-13 |
| **A12** Fuente única del contenido de sede | FR-AD-SEDE-5, FR-AD-SEDE-11, FR-AD-DOM-7, FR-AD-IMP-5 | FR-AD-MON-2, FR-AD-TASA-6, FR-AD-PROM-6 |
| **A13** El trabajador es de una sede | FR-AD-TRAB-1, FR-AD-TRAB-4, FR-AD-TRAB-14, FR-AD-SEDE-9, FR-AD-DOM-3 | — |
| **A14** PuntoCash observa y actúa solo sobre la sede entera | FR-AD-EQ-3, FR-AD-TRAB-15, FR-AD-TRAB-16, FR-AD-SEDE-13, FR-AD-ACC-6, FR-AD-DOM-6, FR-AD-STATE-6 | — |
| **R3** Revalidación al confirmar | FR-AD-EQ-22 | FR-AD-JOR-11, FR-AD-APR-11, FR-AD-TASA-11 |
| **R6** Nada resuelto se reprocesa | FR-AD-EQ-22, FR-AD-EQ-23, FR-AD-CAJA-9, FR-AD-TRAB-13 | FR-AD-JOR-11, FR-AD-APR-11 |
| **R8** Signo y motivo coherentes | — | FR-AD-APR-6, FR-AD-APR-8 |
| **R9** Histórico inmutable | FR-AD-CAJA-11 | FR-AD-JOR-6, FR-AD-JOR-12, FR-AD-MON-6, FR-AD-OPS-6, FR-AD-TASA-10, FR-AD-TASA-13 |
| **R10** Sin enums en bruto | FR-AD-STATE-4 | FR-AD-OPS-7, FR-AD-PROM-11 |
| **R11** Sin descarga | §14 (no especificado) | FR-AD-REP-7 |
| **R12** Worker acotado a la caja de su equipo | Intacta; esta consola es su continuación un nivel arriba **[A1]** | FR-AD-OPS-2 explica por qué amplía filtros que allí no existen |
| **R13** Sin segundo factor no hay sesión | FR-AD-ACC-1, FR-AD-ACC-2, FR-AD-ACC-8, FR-AD-TRAB-6, FR-AD-TRAB-8, FR-AD-TRAB-11, FR-AD-USR-3 | — |
