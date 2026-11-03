# PuntoCash — Super administración
## Documento de Requisitos de Producto (PRD) · v1.0

**Estado:** Describe la consola de PuntoCash sobre su red **completa**, tal como se entrega. Lo que queda fuera se nombra en §6; no se da por hecho en ningún punto de este documento.

**Destinatarios:** Producto, negocio, liderazgo técnico, jefatura de proyecto, desarrollo y QA.

**Alcance:** Únicamente la consola **Super administración** (`/super-admin`), la que usa PuntoCash para gobernar su red. **No cubre la consola del mercante** (`/admin`), que tiene su propio PRD.

**Control de cambios — v1.0 (03/11/2026).** Primera versión. La consola tenía su diseño dentro del PRD de la capa de administración (`PuntoCash_Administracion_PRD_v1.md`), escrito cuando aún no estaba construida. Ahora que lo está, tiene documento propio, como Admin de sede y Worker. Las reglas **A1–A14** y los requisitos **RP-17 a RP-26** son de la capa entera y se citan con su número de siempre; este documento añade **RP-27 a RP-30**, que solo rigen aquí.

**Documentos complementarios:** `PuntoCash_Super_Admin_Functional_Requirements_v1.md` (FRD) especifica el comportamiento pantalla por pantalla; este documento no entra en ese nivel. `PuntoCash_Admin_Sede_PRD_v1.md` describe la consola del mercante, que es la otra mitad de la relación y con la que esta comparte conceptos y reglas. `PuntoCash_Administracion_PRD_v1.md` conserva el mapa de las dos consolas. `PuntoCash_PRD_v2.md` define las reglas **R1–R13** del producto.

---

## 1. El producto

PuntoCash es una plataforma de servicios financieros para una red de casas de cambio. La red es de PuntoCash, y de cara al cliente cada sucursal **es** PuntoCash. Pero la explotación diaria de cada sede se entrega en administración a un **mercante privado** —el operador—, que la opera por cuenta de PuntoCash sin ser nunca su dueño.

**Super administración** es la consola con la que PuntoCash gobierna esa red. Responde a tres preguntas, y todo lo que hay en ella sirve a una de las tres:

- **¿Qué red tengo?** Qué sedes existen, a quién está entregada cada una y desde cuándo, qué servicios presta cada sucursal, qué monedas admite la plataforma y entre qué límites se cotizan.
- **¿Qué está pasando?** Qué sedes están operando hoy, qué se ha hecho en cada caja y con cada cliente, cuánto ha movido cada mercante.
- **¿Quién hizo qué?** Todo acto de gobierno, de PuntoCash o de un mercante, con su autor, su fecha, su objeto y su motivo.

Es una consola de oficina: se usa sobre todo en un ordenador, con el ancho mínimo de escritorio del producto como referencia. Funciona también en tableta y en teléfono —las tablas pasan a tarjetas— porque quien responde de la red tiene que poder mirarla fuera de la oficina, pero no está pensada para operar desde el teléfono a diario como la del mercante.

**La marca visible es PuntoCash**, como en todo el producto. Además, la cabecera lleva un distintivo de **Super administración** que no admite confusión con la consola del mercante: las dos se parecen porque comparten sistema de diseño, y sus potestades son muy distintas. Quien tenga las dos abiertas tiene que saber de un vistazo en cuál está.

---

## 2. El problema de negocio que resuelve

El modelo de administración delegada tiene una tensión de fondo: **PuntoCash responde de la marca y de la red, pero no dirige ningún mostrador**. Si no pudiera ver lo que pasa en una sede, no podría responder de su marca. Si pudiera tocar las piezas de una sede —una caja, un trabajador, una tasa— se convertiría en su administradora de hecho, y el mercante dejaría de poder responder de una operación que otro le cambia por debajo.

La consola resuelve esa tensión separando con nitidez dos clases de cosas:

> **Lo que PuntoCash decide** son los términos de la relación y los límites de la red: qué sedes existen y en qué estado, a qué operador se entrega cada una, qué servicios presta, qué monedas admite la plataforma, entre qué límites se cotiza cada una, y qué anuncia la red en todas sus sucursales.
>
> **Lo que PuntoCash solo mira** es todo lo que vive dentro de una sede: sus cajas y equipos, sus trabajadores, sus administradores, sus jornadas, sus operaciones y la tasa que fija su mercante. Lo ve entero y no crea, modifica ni da de baja nada de ello **[A14]**.

Cuando algo va mal dentro de una sede, PuntoCash no interviene pieza a pieza: **suspende la sede o suspende al operador**. Es un acto sobre la relación, visible, reversible y con motivo, que corta el acceso de todos a la vez sin quitarle al mercante la responsabilidad de lo suyo.

Hay una segunda tensión, de tiempo: **las sedes cambian de manos**. Si el sistema solo supiera quién administra hoy cada sede, una operación de junio en una sede traspasada en julio aparecería como del mercante actual, y su volumen, su auditoría y sus incidencias se atribuirían a quien no estaba. La consola guarda el historial completo de asignaciones y **atribuye cada hecho al mercante que administraba la sede ese día** **[RP-20]**.

---

## 3. Quién lo usa

El rol de esta consola es el **Super Admin**: una persona de PuntoCash con cuenta en la consola. Todas las cuentas tienen las mismas potestades sobre la red; no hay sub-roles. La única diferencia es quién gestiona las propias cuentas de la consola, y eso es de uno solo: el **principal** (§4).

Lo que **no** hace, por diseño: no opera caja, no registra operaciones, no verifica identidades, no invoca proveedores externos **[A6]**, no corrige nada de lo que registró un trabajador **[A7]**, y no crea, modifica ni da de baja nada dentro de una sede **[A14]**.

El **mercante** no llega nunca a esta consola: tiene la suya. El **trabajador** y el **cliente**, tampoco.

**Acceso.** El mismo de dos pasos que el resto del producto: identificador o correo y contraseña, y después un código de seis dígitos al correo registrado. **Ninguna sesión existe hasta que ese código se verifica [R13]**, y no hay «recordar este equipo». El mensaje de rechazo es uno solo para cuenta inexistente, contraseña equivocada o cuenta desactivada. Quien olvida su contraseña la recupera por su cuenta, con el mismo trámite que en Admin y en Worker, y terminar no abre sesión.

---

## 4. Conceptos operativos

Los conceptos de la capa —sede, operador, asignación, caja, equipo, trabajador, administrador principal de un operador, evento de auditoría— son los del PRD de Admin de sede. Aquí se dice lo que esta consola añade o precisa.

| Concepto | Qué es | Quién lo decide |
| --- | --- | --- |
| **Estado de una sede** | Lo que PuntoCash **decide** se guarda: activa, suspendida o cerrada. Lo que es un **hecho** se deriva y no se guarda: **sin asignar** (no tiene operador vigente) y **operador suspendido** (su operador lo está). Una sede sin operador no está sancionada, y por eso no se le llama suspendida. | PuntoCash, lo guardado; el sistema, lo derivado |
| **Asignación (tramo)** | El periodo en que un operador administró una sede, con inicio, fin y motivo. Una sede tiene como mucho un tramo abierto **[A2]**. Revocar y **cerrar la sede** terminan el tramo; ninguno se borra. | PuntoCash **[A3]** |
| **Operador de la fecha** | El que administraba una sede en un momento dado. Es al que se atribuyen una jornada, una operación y su volumen, aunque hoy la sede la administre otro. | Se deriva del historial de tramos |
| **Administrador principal del operador** | El primer administrador del mercante, que PuntoCash crea al dar de alta al operador. Es quien gestiona los demás administradores de su empresa en Admin. PuntoCash le **restablece el acceso** cuando hace falta, y nunca crea a nadie más dentro de la empresa. | PuntoCash lo crea; luego se traspasa dentro de la empresa |
| **Catálogo de monedas** | Las monedas que la plataforma admite. Se eligen de la **lista ISO 4217**, que trae el código, el nombre, el símbolo y la bandera: nada de eso se escribe a mano. Toda moneda se maneja con **cuatro decimales**. Una moneda se **añade**, se **retira** y se **reincorpora**; no se edita. | PuntoCash |
| **Rango de una moneda** | Los límites de compra y de venta, en pesos cubanos, dentro de los cuales cualquier sede de la red puede fijar la tasa de esa moneda. Sin rango, nadie la cotiza. Admite hasta cuatro decimales. | PuntoCash **[A5]** |
| **Servicios de una sede** | Qué presta cada sucursal: Cambio de moneda, Remesas, Giros. Es el límite dentro del cual el mercante monta su operación. | PuntoCash **[A3]** |
| **Promoción de red** | Lo que PuntoCash anuncia en las pantallas de todas sus sucursales, o de las que elija. Convive con las promociones que cada mercante publica para sus sedes. | PuntoCash |
| **Cuenta de PuntoCash** | La cuenta con la que una persona de PuntoCash entra en esta consola: nombre, teléfono, correo, identificador y área. | El principal |
| **Principal** | La única cuenta que gestiona las demás cuentas de la consola. El papel se **traspasa** a otra cuenta activa; a su titular no lo desactiva nadie. | El propio principal, al traspasarlo |
| **Suspensión** | El único recurso de PuntoCash sobre lo que pasa dentro de una sede. Suspender **la sede** corta el acceso de sus trabajadores; suspender **al operador** corta el de sus administradores y el de los trabajadores de todas sus sedes. Reversible, con motivo y auditada **[A14]**. | PuntoCash |

---

## 5. Capacidades de esta entrega y su comportamiento de negocio

La consola se organiza en cuatro bloques, por lo que la persona viene a hacer: **Red**, **Oferta**, **Actividad** y **Administración**. El FRD las especifica pantalla por pantalla.

### 5.1 La red

**Sedes.** PuntoCash da de alta una sede —código, nombre, dirección, horario por días, teléfono y servicios— y puede entregarla en el mismo acto a un operador. **Una sede nace sin cajas**: las crea su mercante cuando la pone en marcha **[A4]**. Desde la ficha se edita, se le cambian los servicios, se asigna, se revoca, se suspende, se reactiva y se cierra. La ficha reúne todo lo que hay que saber de una sucursal sin salir de ella: su estado y por qué, su operador y su historial de tramos, sus administradores, sus cajas y equipos, sus trabajadores, las jornadas abiertas, las monedas de su lista y lo que su pantalla está mostrando hoy.

El **código y el nombre** son siempre de PuntoCash, porque son como la plataforma reconoce cada sede. La **dirección, el teléfono y el horario** los mantiene el mercante mientras la administra, porque es quien sabe si son correctos; **cuando la sede no tiene operador, los mantiene PuntoCash**, porque no hay nadie más que pueda hacerlo —también si está suspendida—.

**Revocar** termina el tramo del operador y deja la sede sin asignar; no se permite con jornadas abiertas, porque traspasar una caja abierta dejaría un descuadre sin dueño. Revocar **no retira cajas, no desvincula equipos y no desactiva a nadie**: quien la reciba encuentra la sucursal montada. **Cerrar** una sede es definitivo: tampoco se permite con jornadas abiertas, y **termina en el mismo acto su administración**, porque una sede cerrada no la administra nadie; si el operador la siguiera teniendo, la seguiría contando entre las suyas y nunca se le podría dar de baja. **Suspender**, en cambio, se permite con cajas abiertas: es la palanca de emergencia, y condicionarla a que no haya caja abierta la inutilizaría justo cuando hace falta.

**Operadores.** PuntoCash da de alta al mercante con su documento —NIT, carné de identidad o pasaporte— y, en el mismo acto, a su **administrador principal**, que recibe una credencial de un solo uso visible: se muestra una vez y **es su contraseña**. Desde la ficha del operador se le asignan sedes sin operador, se ve su historial de tramos, sus administradores y su actividad del mes, y se **restablece el acceso del principal** —un correo nuevo y una credencial nueva— cuando el mercante lo necesita: es la única intervención de PuntoCash sobre las personas de una empresa, y existe para que un mercante nunca se quede fuera de su propia consola. Un operador se **suspende** y se **reactiva** con motivo; se **da de baja** solo cuando ya no administra ninguna sede.

**Cajas y equipos.** El inventario de toda la red —cajas, con su equipo y su jornada, y kioscos de autoservicio— en **solo lectura**. Las cajas las crea el mercante y los equipos los vincula él, delante del equipo **[A10]**. Lo que la consola señala es lo que requiere su atención: las sedes que no tienen ninguna caja activa.

**Trabajadores.** Todos los de la red, con su sede, su operador y, si no puede entrar, **por qué**: la sede está cerrada, no tiene operador, su operador está suspendido, la sede está suspendida, o la persona está desactivada. Es lo único que PuntoCash necesita saber de un trabajador, y lo único que puede cambiar es lo de arriba —la sede o el operador—, nunca a la persona **[A14]**.

### 5.2 La oferta

**Servicios.** Una matriz de sedes por servicios, donde se habilita o deshabilita cada servicio en cada sede. Deshabilitar exige motivo, porque deja de prestarse algo que los clientes de esa sucursal usaban.

**Monedas y tasas.** Una tabla con una fila por moneda del catálogo y su rango. **Añadir una moneda** es elegirla de la lista ISO: así no hay forma de dar de alta un código o un símbolo equivocado, que después no tendría arreglo. Una moneda **retirada** no desaparece: las sedes que la tienen la conservan, con su saldo y su historial, y deja de poder añadirse a más sedes; se **reincorpora** desde su misma fila.

**Definir el rango** de una moneda es lo que la abre a la red. **Cambiarlo** mueve los límites que las sedes ya usan, y por eso la pantalla enseña, antes de guardar, qué sedes tienen hoy una tasa fuera del rango nuevo. Al guardar, esas tasas **se llevan al límite más cercano**, el tablero de esas sucursales cambia en el acto y sus mercantes lo ven señalado hasta que lo confirman o eligen otra **[A5]**. Como es un cambio con efecto sobre la red, **pide motivo**. **Retirar el rango** deja de cotizar la moneda en toda la red sin borrar ninguna tasa: si el rango vuelve, las tasas vuelven ajustadas a él.

Una segunda vista, **Tasas por sede**, enseña lo que publica cada sucursal: de solo lectura, porque la tasa la fija el mercante **[A4]**.

**Promociones.** Lo que PuntoCash anuncia en las pantallas de sus sucursales: a **toda la red** —incluidas las sedes que se creen después— o a las sedes que elija, con atajos para marcar las de un operador o una provincia. **Una sede también es el escaparate de PuntoCash**: una promoción de red llega a toda sede marcada aunque no preste el servicio que anuncia, y la administre quien la administre; la consola no cruza el destino con los servicios. Como las pantallas se leen desde el otro lado de una sala, el formulario avisa cuando en una sede coincidirían más de cuatro promociones a la vez y dice de quién es cada una. Retirar una promoción la quita de las pantallas en el acto y **pide motivo**. Las promociones de cada mercante cuentan para esa saturación y se ven desde la ficha de su sede, pero no son de esta consola.

### 5.3 La actividad

**Inicio** responde *¿cómo está la red hoy?*: cuántas sedes han operado, cuántas operaciones y cuántas personas; lo **pendiente que es de PuntoCash** —una sede sin operador, un operador sin sedes, una moneda que alguna sede tiene en su lista y no puede cotizar por falta de rango—; y una tabla de actividad por sede, ordenada por defecto con lo que pide atención primero. Inicio orienta y enlaza; no ejecuta nada.

**Jornadas** responde *¿qué ha pasado en cada caja de la red?*: quién la abrió, cuánto movió y cómo cerró, con el mismo detalle que ve el mercante. Una caja que sigue abierta se ve siempre, aunque se abriera antes del periodo que se consulta. **Forzar un cierre es del mercante**: PuntoCash no cierra cajas ajenas.

**Operaciones** responde *¿qué ha hecho la red con cada cliente?*: todas, completadas o no, con su cliente, su importe, la sede y **el operador que la administraba ese día**. El detalle es el de Worker con el contexto que PuntoCash necesita. De solo lectura **[A6]**, **[A7]**.

**Reportes** responde *¿cuánto ha movido la red, y cada mercante?*: el **volumen** de un periodo por operador, por sede, por servicio, por provincia o por día. El volumen se cuenta como en Admin —actividad en bruto, cada operación completada una vez, por moneda y nunca convertido a una moneda única—. Cada operación es **del mercante que administraba la sede el día en que se hizo**, de modo que el reporte de un mercante no cambia cuando una sede se entrega a otro. Para comparar mercantes de distinto tamaño, el corte por operador puede verse **por sede administrada**. Los reportes se **exportan** a Excel y a PDF con todos los cortes del periodo: solo llevan totales, ningún dato de un cliente, y cada exportación queda registrada.

### 5.4 La administración

**Auditoría** responde *¿quién hizo qué?*: el registro de todo acto de gobierno de la red —de PuntoCash y de los mercantes—, del más reciente al más antiguo, con quién actuó y con qué rol, sobre qué sede y qué operador, sobre qué objeto y con qué motivo, y el antes y el después cuando lo hay. Se filtra por quién actuó, por tipo de acto, por persona, operador, sede, fechas y texto. Desde un evento se llega a la sede, al operador, al trabajador o a la cuenta de PuntoCash sobre la que se actuó. **Nadie puede editar ni borrar un evento**, tampoco PuntoCash **[RP-21]**. Se **exporta a Excel** lo filtrado; como ese archivo, a diferencia de un reporte, **nombra a personas**, la exportación misma deja su evento con los filtros que se usaron.

Quien consta como autor de un evento es **siempre una persona**, no el nombre de un área. En la consola del mercante, lo que hizo PuntoCash se muestra como «PuntoCash»: al mercante le basta saber que fue la red, y no tiene por qué conocer a su personal.

**Usuarios** son las cuentas de PuntoCash, y esa sección **solo existe para el principal**: para el resto no aparece en el menú y sus rutas responden como inexistentes, no como prohibidas. El principal da de alta cuentas —que reciben una credencial que **es su contraseña**—, las edita, les cambia el correo, les regenera la credencial —que **deja de valer la anterior**—, las desactiva y las reactiva con motivo, y **traspasa el papel** a otra cuenta activa, también con motivo. A su titular no lo desactiva nadie, ni él mismo: es lo que garantiza que PuntoCash nunca se quede sin nadie capaz de dar de alta a otra persona.

**El perfil** de cada persona enseña sus datos y le deja **cambiar su contraseña**, pidiendo la actual. Sus datos los corrige el principal desde Usuarios —el principal, los suyos también—.

---

## 6. Lo que queda fuera de esta entrega

Todas las secciones de la consola están en la entrega. Queda fuera:

- **La comisión por operación** de cada operador y, con ella, todo lo económico entre PuntoCash y sus mercantes —rentas, liquidaciones, deuda— **[A8]**. Es un **dominio aparte**, que se desarrollará más adelante. Cuando exista afectará a Inicio, Operadores y Reportes.
- **El dominio de clientes.** Vienen servicios que exigen un contrato del cliente con PuntoCash y que se usarán desde cualquier sede, la administre quien la administre. Es también un **dominio aparte**, para más adelante. Hasta entonces, el cliente vive dentro de cada operación.
- **Sub-roles** dentro de la consola: todas las cuentas de PuntoCash pueden lo mismo sobre la red.
- La **exportación de listados** distintos de los reportes y la auditoría.
- La **administración de las pantallas informativas**, que se asignan a su sede en el propio equipo.
- Las **notificaciones** por correo, SMS o push: las alertas viven dentro de la consola.
- El **backend y la persistencia reales**: como el resto del producto, la consola se entrega contra un dominio simulado en memoria, con datos de demostración.

---

## 7. Reglas

Rigen las catorce reglas de la capa, **A1–A14**, enunciadas en el PRD de Admin de sede, y las **R1–R13** del producto. Sobre esta consola se aplican así:

- **A1** — Su alcance es la red entera. No hay selector de alcance: donde filtrar por sede o por operador es útil, es un filtro de la pantalla, no del alcance de la sesión.
- **A2** — Una sede tiene como mucho un operador vigente; asignar una sede asignada exige revocar antes. Los tramos cerrados no se editan ni se borran.
- **A3** — Esta consola es la única que crea sedes, les da código y nombre, las suspende y las cierra; da de alta y de baja operadores; asigna y revoca; entrega el primer administrador; mantiene el catálogo de monedas, los rangos y los servicios.
- **A4, A10, A13, A14** — Todo lo que vive dentro de una sede se ve aquí con detalle y no se toca. Las únicas acciones de esta consola sobre una sede ajena son sobre la sede entera o sobre su operador.
- **A5** — Mover un rango nunca deja una tasa fuera: las que quedarían fuera se llevan al límite, se registran una a una y se señalan a su mercante.
- **A6, A7** — Ninguna pantalla opera ni corrige.
- **A8** — Ni comisiones ni liquidaciones (§6).
- **A9** — PuntoCash es la marca; el distintivo de Super administración la acompaña, no la sustituye.
- **A11, A12** — Lo que esta consola decide para una sede (servicios, rango, promociones de red) es lo que esa sucursal aplica y exhibe, sin copia que sincronizar.

**El motivo.** Todo acto que **quita o sanciona algo, o cambia un límite de la red que ya está en vigor**, exige un motivo escrito de al menos diez caracteres, que queda en la auditoría con el nombre de quien actuó: asignar y revocar una sede —también la asignación inicial al darla de alta—; suspender, reactivar y cerrar una sede; suspender, reactivar y dar de baja un operador; restablecer el acceso de su principal; deshabilitar un servicio; retirar una moneda del catálogo; cambiar o retirar un rango; retirar una promoción de red; y, en las cuentas de PuntoCash, desactivar, reactivar y traspasar el papel de principal. **Crear algo nuevo no lo pide**: dar de alta una sede, un operador o una cuenta, definir el primer rango de una moneda, añadir o reincorporar una moneda o publicar una promoción. Tampoco lo pide lo que corrige un dato sin quitar nada: editar una sede, editar o cambiar el correo de una cuenta, o regenerar su credencial. Lo que se crea se explica solo; lo que se quita o se cambia es lo que alguien preguntará después por qué.

**R1–R13.** **R3** aplica de lleno: toda acción revalida sus condiciones al confirmar, y una sede que cambió mientras la pantalla estaba abierta se rechaza, no se aplica sobre un estado viejo. **R6** aplica: una sede ya cerrada no se cierra, un tramo ya revocado no se revoca, una suspensión no se repite. **R9** aplica con toda su fuerza: revocar, cerrar, suspender, mover un rango o retirar una moneda no altera ninguna jornada ni operación registrada. **R11** aplica a todo salvo a los reportes y a la auditoría, que se exportan con las condiciones de §5.3 y §5.4. **R13** aplica a toda cuenta de PuntoCash, sin excepción. **R2**, **R4**, **R5**, **R7** y **R8** no tienen aplicación directa: esta consola no opera, no atiende clientes y no mueve efectivo.

---

## 8. Requisitos que debe cumplir el resultado final

Rigen sobre esta consola **RP-17 a RP-26**, de la capa entera. Estos cuatro son propios de ella:

**RP-27.** Toda jornada, operación y cifra de volumen debe atribuirse al operador que administraba su sede en la fecha en que ocurrió, y esa atribución no debe cambiar cuando la sede pasa a otro operador.

**RP-28.** Ninguna sede cerrada debe tener un operador vigente, y ningún operador debe quedar sin poder darse de baja por conservar una sede que ya no existe.

**RP-29.** Todo acto de PuntoCash que quita o sanciona algo, o que cambia un límite de la red ya en vigor, debe llevar un motivo escrito, y el registro debe atribuirlo a la persona que lo hizo, no a un área.

**RP-30.** Toda credencial que la consola entrega a una persona debe ser, desde ese instante, su contraseña, y la anterior debe dejar de servir. Ninguna credencial se muestra más de una vez.

---

## Apéndice A · Terminología

Amplía el Apéndice A del PRD de Admin de sede, vigente sin cambios.

| Término | Significado |
| --- | --- |
| **Super Admin** | El rol de una persona de PuntoCash con cuenta en esta consola. Todas pueden lo mismo sobre la red. |
| **Principal** (de PuntoCash) | La única cuenta que gestiona las demás cuentas de la consola. El papel se traspasa; a su titular no lo desactiva nadie. No confundir con el **administrador principal** de un operador, que es de la empresa del mercante. |
| **Cuenta de PuntoCash** | La cuenta de una persona de PuntoCash en esta consola. La gestiona el principal en **Usuarios**. |
| **Sin asignar** | Estado derivado de una sede que no tiene operador vigente. No es una sanción. |
| **Operador suspendido** | Estado derivado de una sede cuyo operador está suspendido: la sede no está sancionada, pero nadie de ella puede entrar. |
| **Tramo** | Un periodo de administración de una sede por un operador: inicio, fin y motivos. |
| **Operador de la fecha** | El que administraba una sede en un momento dado; al que se atribuyen sus jornadas, operaciones y volumen. |
| **Restablecer el acceso del principal** | Dar al administrador principal de un operador un correo y una credencial nuevos. Es la única intervención de PuntoCash sobre las personas de una empresa. |
| **Catálogo de monedas** | Las monedas de la plataforma, elegidas de la lista ISO 4217 con su nombre, símbolo y bandera, todas con cuatro decimales. Se añaden, se retiran y se reincorporan; no se editan. |
| **Rango** | Límites de compra y de venta en pesos cubanos, por moneda, para toda la red. Hasta cuatro decimales. |
| **Promoción de red** | La que publica PuntoCash para toda la red o para las sedes que elige. |
| **Saturación** | Más de cuatro promociones a la vez en la pantalla de una misma sede. |
| **Volumen** | Actividad en bruto: cada operación completada una vez, por moneda, sin convertir. En un cambio cuenta la divisa negociada. |
| **Por sede administrada** | El volumen de un operador dividido entre las sedes que administró en el periodo, para comparar mercantes de distinto tamaño. |
