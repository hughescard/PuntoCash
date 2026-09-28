# PuntoCash — Capa de Administración
## Documento de Requisitos de Producto (PRD) · v3.1

**Estado:** **Especificación de diseño. Nada de lo descrito aquí está implementado todavía.** A diferencia de `PuntoCash_PRD_v2.md` y de los FRD de Worker y Kiosco, que documentan producto ya construido, este documento define lo que debe construirse.

**Destinatarios:** Producto, negocio, liderazgo técnico, jefatura de proyecto y desarrollo.

**Alcance:** Las dos superficies de administración de PuntoCash — **Admin de sede** (`/admin`, la consola del mercante que administra una o varias sedes) y **Super Admin** (`/super-admin`, la consola de PuntoCash sobre toda su red). Ambas se tratan en un solo PRD porque comparten el mismo modelo de dominio y se distinguen por qué puede hacer cada una.

**Documentos relacionados:** `PuntoCash_PRD_v2.md` (v2.5) es el PRD vigente del producto y define las reglas **R1–R13** y los requisitos de resultado **RP-1 a RP-16**, que esta capa hereda sin relajar y continúa a partir de RP-17. `PuntoCash_Worker_Functional_Requirements_v1.md` (v1.5) **§2.1** define la vinculación del equipo de caja que esta capa opera y **§2.2–§2.12** el acceso que hereda. `PuntoCash_Kiosk_Autoservicio_Functional_Requirements_v1.md` (v1.3) **§1.1** define la vinculación del kiosco. `PuntoCash_Kiosk_Pantalla_Functional_Requirements_v1.md` (v1.4) **§7** define el origen único de datos públicos por sede que esta capa administra. El comportamiento pantalla por pantalla se especifica en `PuntoCash_Admin_Sede_Functional_Requirements_v1.md` y `PuntoCash_Super_Admin_Functional_Requirements_v1.md`.

---

## Control de cambios

- **v3.1 (2026-09-23):** **separación de monedas y pares.** La v3.0 trataba "las monedas de una sede" y "los pares que cotiza" como una sola cosa. Son dos, con dueños y condiciones distintas, y la cadena completa tiene cuatro eslabones: PuntoCash mantiene el **catálogo de monedas** de la plataforma y define un **rango** por par; el mercante declara la **lista de monedas** que maneja su sede —que es exactamente lo que un Worker puede añadir a su caja, y lo que sustituye al catálogo constante de FR-CAJA-13— y después **define los pares** que cotiza, a partir de esas monedas y solo donde PuntoCash tenga rango y le haya habilitado el servicio de Cambio de moneda. Se reescriben el concepto **Política de tasas**, la regla **A5** y las tablas de §5; **RP-22** se ajusta. Queda además matizado, y pendiente de confirmación del negocio, que la lista de monedas **no** depende del servicio de Cambio de moneda, porque una caja necesita monedas para remesas y giros igualmente.
- **v3.0 (2026-09-23):** **corrección del reparto de potestades entre PuntoCash y el mercante.** Las versiones anteriores daban al Super Admin capacidades dentro de la sede que no le corresponden. El criterio correcto, fijado por el negocio, es que **PuntoCash decide qué sedes existen y a quién se las entrega; todo lo que vive dentro de una sede lo gobierna su mercante, y PuntoCash lo ve entero sin tocarlo.** Cinco cambios. (1) **Las cajas las crea y las retira el Admin de sede**, no PuntoCash; una sede nace sin cajas. (2) **Las monedas que una sede opera las decide su mercante**, siempre que PuntoCash le haya habilitado el servicio de Cambio de moneda en esa sede y exista rango definido para el par. (3) **Solo el Admin de sede desactiva trabajadores**; el único recurso de PuntoCash ante un problema dentro de una sede es **suspender al operador o a la sede**, que corta el acceso de todos a la vez. (4) **PuntoCash entrega el primer usuario administrador** al asignar una sede a un mercante, y **ese administrador crea los demás usuarios de su empresa**. (5) Suspender una sede o un operador pasa a bloquear también el acceso de sus trabajadores, y deja de estar impedido por una jornada abierta, porque es la palanca de emergencia. **A3, A4 y A5** se reescriben; se añade **A14**; **RP-22** se ajusta y se añade **RP-26**.
- **v2.0 (2026-09-23):** incorporación de lo que Worker y Kiosco delegaron en esta capa: vinculación de equipos (conceptos Equipo y Reto de vinculación, reglas **A10** y **A11**), fuente única de datos públicos de sede (**A12**), el trabajador adscrito a una sede y no a una caja (**A13**), verificación en dos pasos (**R13**), y renumeración de los requisitos de resultado a **RP-17 a RP-25** para no chocar con los RP-12 a RP-16 del PRD de producto.
- **v1.0 (2026-09-22):** primera versión. Modelo de administración delegada, conceptos Operador, Sede, Asignación, Política de tasas, Solicitud de aprobación y Evento de auditoría, reglas **A1–A9**, y el enlace Caja→Sede que el dominio no tenía.

---

## 1. Por qué existe esta capa

PuntoCash se ha construido de abajo hacia arriba: primero el mostrador (Worker), donde el dinero se mueve de verdad, después el kiosco, que le quita tecleo al mostrador. Las dos superficies existentes comparten una limitación deliberada: **solo saben de una caja o de una sede a la vez**. Un Worker ve la caja del equipo en que inició sesión y nada más **[R12]**; un kiosco muestra y produce datos de la sede a la que está vinculado y nada más.

El negocio de PuntoCash, sin embargo, no es un mostrador. Es una **red de casas de cambio**, explotada bajo un modelo de administración delegada que la capa actual no representa en ninguna parte:

> PuntoCash es la propietaria de la red y de la plataforma que la hace funcionar. Cada sede es, de cara al cliente, PuntoCash — misma marca, mismas reglas, mismos servicios, misma experiencia. Pero la explotación diaria de cada sede se entrega en administración a un **mercante privado**, que la opera por cuenta de PuntoCash sin ser en ningún momento su dueño. Un mismo mercante puede tener varias sedes a su cargo.

De ahí salen dos necesidades que ninguna pantalla existente cubre. El mercante necesita gobernar lo que administra: sus cajas, sus equipos, sus trabajadores, sus jornadas, sus descuadres, sus tasas, su volumen. Y PuntoCash necesita gobernar **la red**, que es otra cosa: qué sedes existen, a quién está dada cada una, dentro de qué límites opera cada una, y qué está pasando en todas a la vez.

A esas dos necesidades, el cierre del Kiosco y la vinculación de las cajas añadieron en septiembre una tercera, más apremiante: **hoy el producto no arranca sin esta capa.** Un equipo de caja recién instalado muestra una pantalla de vinculación y nada más hasta que un administrador lo vincula (FR-DEV-1); un kiosco de autoservicio, igual (FR-AS-LINK-1); y el tablero de tasas de una sucursal exhibe cifras que no coinciden con las que esa sede cotiza porque nadie las administra todavía (FR-PANT-DATA-2). La capa de administración dejó de ser el nivel de gobierno que faltaba por encima de una caja y pasó a ser, además, **la pieza sin la cual las otras dos superficies no pueden ponerse en marcha**.

Lo que esta capa sigue sin hacer: **no añade un solo servicio nuevo, no mueve un céntimo y no ejecuta nada en el mostrador.**

---

## 2. El problema de negocio

Delegar la explotación de una sede sin delegar su propiedad crea cuatro tensiones que un sistema de una sola caja no puede resolver:

| Tensión | Qué falla si no se resuelve |
| --- | --- |
| **La sede es de PuntoCash, pero la opera otro** | Sin una noción explícita de asignación, "de quién era esta sede en marzo" es una pregunta sin respuesta en el sistema — justamente la pregunta que aparece cuando hay un problema en marzo. |
| **El mercante responde de su operación, pero no puede ser juez y parte** | Si el mercante pudiera tocar el efectivo o corregir el histórico de sus propias sedes, el control interno del Worker (arqueo, motivo obligatorio, histórico inmutable) quedaría sin valor. Si no pudiera hacer nada, una caja bloqueada un domingo se quedaría bloqueada. |
| **PuntoCash responde de la marca, pero no dirige el mostrador** | Si PuntoCash pudiera dar de alta trabajadores, retirar cajas o desvincular equipos de una sede ajena, se convertiría en administrador de esa sucursal sin serlo, y el mercante dejaría de poder responder de una operación que otro le cambia por debajo. Si no pudiera ver nada, no podría responder de su propia marca. |
| **Un equipo físico no es de fiar por estar encendido** | Un ordenador en un mostrador o un kiosco en una sala de espera son objetos que se mueven, se roban y se conectan a redes ajenas. Si un equipo pudiera declararse a sí mismo "Caja 03 de Vedado", cualquiera podría operar contra la caja de otra sede. La única forma de que un equipo sea un puesto de PuntoCash es que una persona responsable lo declare, desde una consola en la que ya se autenticó. |

La capa resuelve las cuatro con tres principios, que atraviesan todo este documento:

> **PuntoCash decide qué sedes existen y a quién se las entrega. Todo lo que vive dentro de una sede lo gobierna su mercante.** PuntoCash lo ve entero —cajas, equipos, trabajadores, tasas, operaciones— y no crea, modifica ni da de baja nada de ello. Su único recurso ante un problema dentro de una sede es suspender al mercante o a la sede: actúa sobre la relación, no sobre las piezas.

> **El mercante supervisa y desbloquea; nunca opera ni corrige.** Su poder sobre la operación se reduce a dos actos —aprobar un ajuste y forzar el cierre de una jornada—, ambos con motivo obligatorio, ambos aditivos y atribuidos a su nombre, ninguno capaz de alterar lo que un Worker ya registró.

> **Ningún equipo se declara a sí mismo.** Un equipo solo es una caja, o el kiosco de una sede, porque el administrador de esa sede lo declaró desde su panel. Y deja de serlo en el instante en que ese administrador lo desvincula.

---

## 3. Quién lo usa

- **Worker (Trabajador).** Opera la caja del equipo en que inicia sesión. Ve esa caja y nada más **[R12]**. Pertenece a una **sede**, no a una caja: solo puede iniciar sesión en equipos vinculados a cajas de su propia sede **[FR-DEV-6]**. No sabe que existe un mercante.
- **Admin de sede (el mercante).** Persona o empresa a la que PuntoCash entrega en administración una o varias sedes. Gobierna **todo lo que vive dentro** de ellas: crea y retira las cajas, vincula y desvincula los equipos de esas cajas y sus kioscos de autoservicio, da de alta y desactiva a sus trabajadores, crea los demás usuarios administradores de su propia empresa, declara qué monedas maneja cada sede y define los pares que cotiza, con su tasa dentro del rango permitido, publica sus promociones, resuelve las aprobaciones pendientes y supervisa jornadas, arqueos y volumen. **No opera caja, no registra operaciones y no corrige historial.** Ve exactamente las sedes que tiene asignadas hoy, y nada de las ajenas.
- **Super Admin (PuntoCash).** El personal de la empresa propietaria de la red y del software. Decide **qué sedes existen** —las crea, edita sus datos maestros, las suspende y las cierra—, **a quién se las entrega** —da de alta y de baja mercantes, asigna y revoca sedes, y entrega a cada mercante su primer usuario administrador—, y **dentro de qué límites opera cada una** —el catálogo de monedas de la plataforma, los rangos de tasa por par y los servicios habilitados por sede—. Publica promociones de red. Y **lo ve todo**: todas las sedes, cajas, equipos, kioscos, trabajadores, tasas, operaciones y el registro de auditoría completo. **No crea, modifica ni da de baja nada dentro de una sede**: ni una caja, ni un equipo vinculado, ni un trabajador, ni un usuario administrador más allá del primero **[A14]**.

Ninguno de los dos roles nuevos es un rol de ejecución. Ninguna pantalla de `/admin` ni de `/super-admin` completa un servicio, mueve efectivo, invoca a un proveedor externo ni verifica la identidad de un cliente.

**Acceso de los dos roles.** Ambas consolas usan el mismo acceso en dos pasos que Worker, sin variación: identificador y contraseña, y después un código de seis dígitos al correo registrado, con cinco minutos de vigencia, tres intentos y hasta tres envíos. Ninguna sesión existe hasta que ese código se verifica **[R13]**. Los FRD de esta capa remiten a `PuntoCash_Worker_Functional_Requirements_v1.md` §2.2–§2.12 en lugar de repetirlo, como ese documento previó (§2.2, punto 4). Las consolas de administración **no** se usan sobre equipos vinculados: se abren desde un navegador cualquiera, incluido un teléfono — condición necesaria, porque escanear el QR de vinculación de un equipo exige tener la consola a mano en un dispositivo con cámara.

---

## 4. Conceptos operativos nuevos

El dominio actual llega hasta la Caja y se detiene ahí. Esta capa añade siete conceptos por encima y uno transversal, y cierra un hueco que la Fase 1 dejó abierto: **hoy una Caja no pertenece a ninguna Sede porque la Sede no existe como concepto** — hueco que el kiosco ya notó y dejó anotado (FR-AS-DOM-11).

- **Sede.** Una casa de cambio física de la red: código, nombre, dirección, provincia y municipio, horario, teléfono y estado (activa, suspendida, cerrada). Una sede es siempre propiedad de PuntoCash; lo único que cambia de manos es su administración. Toda Caja pertenece a exactamente una Sede, y todo Trabajador también. Una sede **nace sin cajas**: las crea su mercante cuando la pone en marcha. El **registro de sedes** que esta capa mantiene es, además, el origen del que la Pantalla lee su lista de sedes al instalarse (FR-PANT-DATA-4) y del que toda superficie lee los datos de contacto y horario de una sucursal.

- **Operador (mercante).** La persona o empresa a la que se entrega en administración una o más sedes: nombre, datos de contacto, fecha de alta y estado (activo, suspendido, dado de baja). Un Operador nunca es dueño de una Sede; es su administrador temporal. Tiene uno o varios **usuarios administradores**: el primero lo entrega PuntoCash al darlo de alta, y ese primero crea los demás.

- **Asignación.** El vínculo entre una Sede y un Operador durante un periodo: fecha de inicio, fecha de fin (vacía mientras está vigente) y motivo. Una sede tiene como máximo una asignación vigente **[A2]**. Las asignaciones cerradas nunca se borran ni se editan: son el historial de quién respondía por esa sede en cada tramo del tiempo, tan inmutable como el de las operaciones **[R9]**.

- **Caja.** Un puesto de mostrador de una sede, con sus saldos por moneda. La crea y la retira el mercante de esa sede **[A4]**, y es el objeto al que se vincula un equipo. Sin cajas, una sede no puede operar; sin equipo vinculado, una caja tampoco.

- **Equipo.** Un dispositivo físico que el producto reconoce porque un administrador lo declaró. Dos clases, mismo mecanismo, objetos distintos: el **equipo de caja**, atado a una sede y a una de sus cajas (FRD Worker §2.1), y el **kiosco de autoservicio**, atado a una sede (FRD Autoservicio §1.1). Un equipo sin vincular no es nada: muestra su pantalla de vinculación y ninguna ruta de su producto responde. La **Pantalla** informativa es la excepción deliberada — no se vincula ni tiene sesión, y se asigna a su sede en el propio equipo (FR-PANT-SEDE-1 a 7); esta capa no la administra, solo le provee el registro de sedes del que elige.

- **Reto de vinculación.** Lo que un equipo sin vincular muestra para poder ser declarado: un código QR y un código numérico de seis cifras, dos formas de lo mismo, válidos diez minutos y renovados por el propio equipo al caducar. Las dos vías están siempre disponibles.

- **Monedas y política de tasas.** Una cadena de cuatro eslabones, cada uno decidido por quien corresponde y condición del siguiente.

  1. **PuntoCash mantiene el catálogo de monedas** que la plataforma soporta, y define por **par de monedas** un **rango permitido** (compra y venta, con mínimo y máximo). Un par sin rango no lo cotiza nadie en la red.
  2. **El mercante declara la lista de monedas que maneja cada sede**, elegidas de ese catálogo. Esa lista es exactamente lo que un Worker puede añadir a su caja: sustituye al catálogo constante del que hoy habla FR-CAJA-13, y acota también el fondeo inicial. No depende del servicio de Cambio de moneda, porque una caja necesita monedas para pagar una remesa o un giro igualmente.
  3. **PuntoCash habilita los servicios de cada sede.** Si entre ellos está el Cambio de moneda, esa sede puede cotizar.
  4. **El mercante define los pares que su sede cotiza**, combinando monedas de su propia lista, solo donde PuntoCash tenga rango para el par, y fijando en el mismo acto la **tasa efectiva** de compra y venta dentro de ese rango. Esa tasa es la que el motor de cotización usa en esa sede *y* la que su tablero público exhibe.

  Una tasa fuera del rango vigente es un estado imposible, no una advertencia **[A5]**. No existe un par sin tasa: definirlo la fija.

- **Contenido público de sede.** Todo lo que una sucursal exhibe sin que nadie se identifique: el tablero de tasas, los datos de contacto y horario, y las promociones vigentes. Lo declara esta capa, una sola vez por sede, y lo leen del mismo origen el kiosco de autoservicio y la Pantalla, con independencia de la tecnología de cada cliente **[RP-13, FR-PANT-DATA-7]**. Una **promoción** es una campaña con fecha de inicio y fin, no contenido permanente del despliegue (FR-PANT-DATA-5); las hay de sede, publicadas por el mercante, y de red, publicadas por PuntoCash.

- **Solicitud de aprobación.** Un hecho de caja que el Worker no puede resolver por sí solo y que espera el visto bueno del Admin de la sede: un ajuste de efectivo por encima de un umbral, o un descuadre de arqueo. Nace en la operación del Worker y su resolución —aprobada o rechazada, siempre con motivo— se registra como un hecho nuevo, sin alterar el movimiento ni el arqueo originales **[A7]**.

- **Evento de auditoría.** Transversal. Todo acto de gobierno con consecuencias deja un registro inmutable con quién, qué, cuándo, sobre qué y por qué. El registro es de solo lectura incluso para el Super Admin.

```
PuntoCash  ──decide qué sedes existen, a quién se entregan y dentro de qué límites──┐
   │                                                                                │
   ├── Operador (mercante) ──administra vía Asignación (histórica)───────────────────┤
   │        │                                                                       │
   │        └── usuarios administradores: el 1.º lo entrega PuntoCash, los demás él  │
   │                                                                                │
   └── Sede ◄───────────────────────────────────────────────────────────────────────┘
         │   (PuntoCash: datos maestros · servicios habilitados · rangos de tasa)
         │
         │   ── todo lo de abajo lo gobierna el mercante; PuntoCash solo lo ve ──   [A14]
         │
         ├── Monedas de la sede (lista) ──> lo que un Worker puede añadir a su caja       [A4]
         ├── Pares definidos = lo que cotiza = lo que exhibe su tablero · promociones     [A12]
         │        └── lo leen: Kiosco Autoservicio · Pantalla                    [RP-13]
         │
         ├── Trabajador (pertenece a la sede, no a una caja)                      [A13]
         │
         ├── Kiosco de autoservicio ──vinculado por el Admin──> sesión de dispositivo  [A10]
         │
         └── Caja (creada por el Admin) ──vinculada a un Equipo──> sesión de dispositivo
               │
               └── Jornada ──> Operación ──> Movimiento de caja   (dominio Fase 1, sin cambios)
                        │
                        └── Solicitud de aprobación ──resuelta por──> Admin de sede   [A6]
```

---

## 5. Capacidades de la capa

### 5.1 Admin de sede (`/admin`)

La consola del mercante, con un **selector de alcance** permanente que filtra entre "todas mis sedes" y una sede concreta.

| Capacidad | Qué hace |
| --- | --- |
| **Inicio** | Estado consolidado ahora mismo: jornadas abiertas, aprobaciones pendientes, descuadres, jornadas sin cerrar, cajas sin equipo, sedes sin cajas, volumen. |
| **Cajas** | Crear y retirar las cajas de sus sedes **[A4]**. Una sede llega vacía; el mercante la pone en marcha. |
| **Equipos · Cajas** | Vincular el equipo de un puesto a una caja, escaneando el QR o escribiendo el código; ver qué equipo ocupa cada caja; desvincular **[A10]**, **[A11]**. |
| **Equipos · Kioscos** | Lo mismo para los kioscos de autoservicio, cuyo objeto de vinculación es la sede **[A10]**. |
| **Sedes** | Ficha de cada sede que administra. Los datos maestros son de solo lectura — los edita PuntoCash **[A3]**. |
| **Trabajadores** | Alta, edición, desactivación, reactivación y asistencia de acceso de sus trabajadores, adscritos a una **sede** **[A4]**, **[A13]**. Es el **único** rol que desactiva a una persona **[A14]**. |
| **Usuarios** | Crear, editar y desactivar los demás usuarios administradores de su propia empresa, a partir del primero que PuntoCash le entregó **[A4]**. |
| **Jornadas** | Jornadas abiertas y cerradas, con arqueo, diferencias y libro de movimientos. Incluye forzar el cierre, con motivo **[A6]**. |
| **Aprobaciones** | Bandeja de ajustes y descuadres pendientes; aprobar o rechazar con motivo **[A6]**. |
| **Operaciones** | Historial consolidado de sus sedes, de solo lectura **[R9]**. |
| **Monedas** | Declarar la lista de monedas que maneja cada sede, del catálogo de la plataforma. Es lo que un Worker puede añadir a su caja **[A4]**. |
| **Tasas** | Definir los pares que cotiza cada sede, con monedas de su lista y donde PuntoCash tenga rango y servicio habilitado, fijando la tasa dentro del rango. Es a la vez la que la sede cotiza y la que su tablero exhibe **[A5]**, **[A12]**. |
| **Promociones** | Alta, edición y retirada de las promociones de sus sedes, con vigencia **[A12]**. |
| **Reportes** | Volumen por sede, servicio, trabajador y día. Sin comisión, renta ni liquidación **[A8]**. |

### 5.2 Super Admin (`/super-admin`)

La consola de PuntoCash sobre su red. Tres potestades y una observación completa.

| Capacidad | Qué hace |
| --- | --- |
| **Inicio** | Salud de la red: sedes activas, jornadas abiertas, cajas sin equipo, sedes sin cajas, alertas críticas, volumen agregado. |
| **Sedes** | **Crear** una sede, editar sus datos maestros, suspenderla y cerrarla. Ver su asignación vigente y todo el historial **[A2]**, **[A3]**. No crea ni retira sus cajas. |
| **Operadores** | **Alta y baja** de mercantes; **asignar y revocar** sedes; **entregar el primer usuario administrador** **[A3]**. Ver las sedes, trabajadores, equipos y volumen de cada uno. |
| **Servicios** | Qué servicios está habilitada a ofrecer cada sede — el límite de red dentro del cual el mercante decide. |
| **Monedas y tasas** | El **catálogo de monedas** de la plataforma y los **rangos permitidos** por par. Ve la lista de monedas y los pares de cada sede, sin decidirlos. |
| **Promociones** | Promociones de red, visibles en todas las sedes o en un subconjunto **[A12]**. |
| **Cajas y equipos** | Inventario de todas las cajas, equipos de caja y kioscos de la red, con su estado. **Solo lectura** **[A14]**. |
| **Trabajadores** | Todos los trabajadores de la red. **Solo lectura**: no los crea, no los edita y no los desactiva **[A14]**. |
| **Operaciones** | Historial de toda la red, de solo lectura. |
| **Reportes** | Consolidado de red, con comparativa entre sedes y entre mercantes. |
| **Auditoría** | El registro completo de eventos de gobierno, de solo lectura para todo el mundo. |

Su recurso ante un problema dentro de una sede no es una acción sobre la pieza afectada, sino sobre la relación: **suspender al operador**, que corta el acceso de sus usuarios administradores y de todos los trabajadores de sus sedes, o **suspender la sede**, que corta el de esa sucursal. Ambas son reversibles y quedan auditadas **[A14]**.

---

## 6. Reglas de administración

Catorce reglas rigen esta capa. Se numeran **A1–A14** para no confundirse con las **R1–R13** del producto, que siguen vigentes sin excepción y se tratan en §7.

| Regla | Enunciado | Por qué existe |
| --- | --- | --- |
| **A1** | **Aislamiento por alcance.** El Worker ve su caja; el Admin de sede ve exactamente las sedes que tiene asignadas en este momento; el Super Admin ve la red. Nadie ve hacia los lados, y el alcance no es una preferencia elegible: se deriva de la sesión. | Es la extensión natural de **[R12]** un nivel hacia arriba. Un mercante viendo el volumen del mercante de al lado sería una filtración de negocio, no un fallo de permisos. |
| **A2** | **Una sede tiene como máximo un operador vigente.** Revocar una asignación la cierra con fecha y motivo, nunca la borra. Asignar una sede ya asignada exige revocar primero. El historial de asignaciones es inmutable. | Sin esto, "quién respondía por esta sede cuando pasó aquello" no tiene respuesta. Con esto, siempre la tiene. |
| **A3** | **Solo PuntoCash decide qué sedes existen y quién las administra.** Es el único que crea una sede, edita sus datos maestros, la suspende y la cierra; el único que da de alta y de baja mercantes, y que les asigna y revoca sedes; el único que entrega a un mercante su primer usuario administrador; y el único que fija los rangos de tasa y los servicios habilitados de cada sede. Nada de eso ocurre dentro de la sede: son los términos de la relación y los límites de la red. | La sede es propiedad de PuntoCash y la marca también. Lo delegado es la explotación, no la titularidad ni los límites dentro de los cuales se explota. |
| **A4** | **Todo lo que vive dentro de una sede lo gobierna su mercante.** Las cajas, los equipos vinculados, los trabajadores, los demás usuarios administradores de su empresa, las monedas que la sede maneja y los pares que cotiza los crea, los modifica y los da de baja el Admin de esa sede, y solo en sedes que administra. Una sede nace vacía y es su mercante quien la pone en marcha. | Quien responde de una operación tiene que poder configurarla. Si otro pudiera retirarle una caja o desactivarle un trabajador por debajo, el mercante dejaría de poder responder de lo que ocurre en su mostrador. |
| **A5** | **La tasa efectiva de una sede siempre cabe dentro del rango vigente de PuntoCash.** El mercante declara libremente qué monedas maneja su sede, del catálogo de la plataforma; pero solo puede **definir un par de cotización** si las dos monedas están en esa lista, PuntoCash tiene un rango definido para el par, y le ha habilitado ahí el servicio de Cambio de moneda. Definir el par fija su tasa en el mismo acto. Una tasa fuera de rango se rechaza al guardarse. Si PuntoCash mueve un rango y deja tasas vigentes fuera, esas tasas se fijan automáticamente al límite más cercano, se audita y se avisa al Admin afectado; si retira el rango, el par deja de cotizarse sin borrarse. | Una sede con una tasa arbitraria rompe la promesa de marca única. La cadena catálogo → lista de la sede → servicio → rango → par reparte cada decisión donde corresponde: PuntoCash pone el marco de la red, el mercante decide dentro de él lo que su sucursal hace. |
| **A6** | **El Admin supervisa y desbloquea; no opera.** Ninguna pantalla de `/admin` registra una operación, mueve efectivo, abre una jornada ni invoca a un proveedor externo. Sus dos únicas acciones sobre la operación viva son aprobar o rechazar una solicitud de aprobación, y forzar el cierre de una jornada. Ambas exigen motivo escrito. | Sin las dos excepciones, una caja bloqueada se queda bloqueada; con más que esas dos, el control interno del Worker pierde su valor. |
| **A7** | **Nada de lo que hace un Admin altera lo que registró un Worker.** Aprobar, rechazar y forzar un cierre **añaden** un hecho nuevo, atribuido al Admin, con su sello de tiempo y su motivo. Ningún movimiento, arqueo ni operación cambia, se recalcula ni desaparece. | Es **[R9]** aplicado a la capa de gobierno. Un histórico que un supervisor puede reescribir no es un histórico. |
| **A8** | **Lo económico entre PuntoCash y el mercante queda fuera del producto.** Ninguna consola muestra comisiones, rentas, liquidaciones ni deuda. El mercante ve volumen operado. | Decisión explícita de alcance. Meter liquidaciones abriría un dominio contable entero que el negocio no ha definido. |
| **A9** | **PuntoCash es siempre la marca visible.** Ninguna superficie —tampoco la consola del mercante— muestra el nombre comercial, el logotipo ni la identidad del operador privado como marca de la aplicación. El nombre del mercante aparece como dato donde es información, nunca como marca. | Fijado en el manual de marca y en `CLAUDE.md`. Esta capa es donde más tentador sería romperlo. |
| **A10** | **Los equipos los vincula y los desvincula el Admin de la sede.** Ningún equipo se declara a sí mismo, ninguno elige su caja ni su sede, y el Super Admin los ve todos pero no toca ninguno. La credencial la emite y la revoca el sistema al vincular y al desvincular, nunca el terminal. | FR-DEV-3 y FR-AS-LINK-4. Declarar qué equipo es un puesto de PuntoCash exige estar delante de ese equipo, leyendo el código que muestra: es un acto local de quien responde por esa sucursal. |
| **A11** | **Un equipo, un puesto.** Una caja tiene como máximo un equipo vinculado a la vez, y un kiosco pertenece a una sola sede. Desvincular corta la sesión del dispositivo al instante y, si había un trabajador operando, termina también la suya — pero **nunca cierra una Jornada**, porque la Jornada es de la caja y no del equipo. | FR-DEV-3, FR-DEV-7, FR-AS-LINK-6. Cerrar la Jornada al desvincular haría que un cambio de ordenador produjera un cierre sin arqueo, que es precisamente lo que el producto evita. |
| **A12** | **Lo que esta capa declara para una sede es lo único que esa sede exhibe y aplica.** Las tasas del tablero público son las mismas con las que la sede cotiza; las monedas listadas son las que la sede realmente opera; los datos de contacto son los del registro de sedes; las promociones son las vigentes en la fecha. No existe una segunda copia que alguien deba sincronizar a mano, y cambiar cualquiera de esos datos no debe requerir un despliegue de código. | **[RP-12, RP-13]** y FR-PANT-DATA-3 a 7. Hoy el tablero de la demo anuncia 315/325 mientras la cotización aplica 320, y lista monedas que ningún flujo opera. |
| **A13** | **El trabajador pertenece a una sede, no a una caja.** La caja que opera la determina el equipo en que inicia sesión, y solo puede iniciar sesión en equipos vinculados a cajas de su propia sede. El alta de un trabajador elige sede; nunca caja. | FR-DEV-5 y FR-DEV-6. La caja es un puesto compartido por turnos; atarla a la cuenta de una persona contradiría el modelo de equipo vinculado. |
| **A14** | **PuntoCash observa dentro de la sede y actúa solo sobre la sede entera.** Ninguna consola de PuntoCash crea, modifica ni da de baja una caja, un equipo vinculado, un trabajador o un usuario administrador más allá del primero. Su único recurso ante un problema dentro de una sede es **suspender al operador** —que corta el acceso de sus usuarios administradores y de todos los trabajadores de sus sedes— o **suspender la sede** —que corta el de esa sucursal—. Ambas son reversibles, exigen motivo y quedan auditadas. | Es el criterio que corrige la v2.0. PuntoCash es dueña de la red y del software, no del mostrador: interviniendo pieza a pieza en una sede ajena se convertiría en su administrador de hecho, sin serlo y sin responder de ella. Actuar sobre la relación entera es visible, reversible y no le quita al mercante la responsabilidad de lo suyo. |

---

## 7. Cómo rigen R1–R13 sobre esta capa

| Regla | Alcance sobre la capa de administración |
| --- | --- |
| **R1** Ninguna operación sin Jornada abierta | No aplica por vía directa: la administración no realiza operaciones. Aplica indirectamente en **forzar cierre**, que cierra una Jornada y por tanto impide toda operación posterior en esa caja hasta que se abra otra. |
| **R2** Nada local sin éxito del proveedor externo | No aplica: ninguna pantalla de administración invoca a un proveedor externo. |
| **R3** Revalidación al confirmar | Aplica de lleno. Aprobar una solicitud, forzar un cierre, guardar una tasa, retirar una caja, **vincular un equipo** o desvincularlo revalidan sus condiciones al confirmar: una solicitud ya resuelta, una jornada ya cerrada, un rango que cambió o **un reto de vinculación caducado** deben rechazar la confirmación, no aplicarla sobre un estado viejo. |
| **R4** Acceso por código, vía única y opaca | No aplica a los listados: quien pregunta es un supervisor autenticado sobre su propio alcance, no el público. Sí aplica en espíritu al **código de vinculación**, que es de un solo uso y caduca. |
| **R5** Identidad verificada físicamente por una persona | No aplica: esta capa no atiende clientes. Y explícitamente: ninguna pantalla de administración puede dar por verificada una identidad que un Worker no verificó. |
| **R6** Un registro resuelto no vuelve a procesarse | Aplica. Una solicitud ya resuelta no se resuelve dos veces; una jornada ya cerrada no se fuerza a cerrar; una asignación ya revocada no se revoca de nuevo; **un reto de vinculación ya usado no vincula un segundo equipo**. |
| **R7** El efecto en efectivo es un movimiento asociado a la Jornada | Aplica como prohibición: la administración nunca produce un movimiento de caja **[A6]**. |
| **R8** Coherencia entre signo de la diferencia y motivo | Aplica en **aprobaciones**: la resolución conserva el signo y el motivo declarados por el Worker, y el motivo del Admin se añade, nunca sustituye. |
| **R9** El histórico refleja lo que era cierto entonces | Aplica con toda su fuerza, y es la raíz de **[A7]** y de la inmutabilidad del historial de asignaciones. Toda vista de administración lee instantáneas almacenadas. Cambiar una tasa, retirar una caja, retirar una promoción, desvincular un equipo o suspender una sede no altera ninguna operación ya registrada. |
| **R10** Los enums en bruto nunca se muestran | Aplica sin cambios a todo estado mostrado en estas consolas. |
| **R11** La impresión produce comprobante físico, no archivo | Aplica a lo que se imprime. Los **reportes** son la excepción prevista: si se quiere exportación, es una decisión de producto que §9 deja abierta, no algo que se cuele por un botón de descarga. |
| **R12** Las cifras de un Worker se acotan a la caja de su equipo | Se mantiene intacta, y esta capa es su continuación coherente: el Admin se acota a sus sedes, el Super Admin a la red **[A1]**. Su equivalente de dispositivo —un kiosco solo produce datos de su sede— lo hace cumplir esta capa al vincular **[A10]**. |
| **R13** Ninguna sesión de trabajo sin segundo factor verificado | Aplica de lleno a las **personas** de esta capa: Admin de sede y Super Admin acceden con el mismo flujo de dos pasos que Worker, sin excepción ni "recordar este equipo". No aplica a las **sesiones de dispositivo** que esta capa crea, que no identifican a ninguna persona; lo que las protege es que solo un administrador ya verificado puede crearlas o revocarlas **[FR-AS-LINK-8]**. |

---

## 8. Requisitos de resultado final

Continuando la numeración del PRD de producto, que llega hasta RP-16:

- **RP-17.** Ninguna pantalla de administración puede producir, por sí sola, un movimiento de caja, una operación, una identidad verificada o una confirmación de proveedor externo.
- **RP-18.** Ninguna acción de un Admin de sede o de un Super Admin puede modificar, recalcular ni eliminar un registro creado por un Worker. Solo puede añadir hechos nuevos junto a él.
- **RP-19.** Un usuario de administración nunca debe poder alcanzar —por navegación, por URL directa, por filtro o por identificador— datos de una sede que no esté dentro de su alcance vigente.
- **RP-20.** Debe ser posible responder, en cualquier momento y para cualquier fecha pasada, quién administraba una sede determinada en esa fecha.
- **RP-21.** Toda acción de gobierno con consecuencias debe quedar en el registro de auditoría con quién, qué, cuándo, sobre qué y por qué, y ese registro no debe poder alterarse desde ninguna superficie del producto.
- **RP-22.** No debe existir ningún estado del sistema en el que una sede cotice una tasa fuera del rango que PuntoCash tiene fijado para ese par; ni un par sin rango definido; ni un par cuyas dos monedas no estén en la lista de esa sede; ni cotización alguna con el servicio de Cambio de moneda deshabilitado en esa sede. Ni tampoco un par definido sin tasa.
- **RP-23.** La consola del mercante no debe, en ningún momento, presentarse como un producto del mercante: la marca visible es siempre PuntoCash.
- **RP-24.** Todo equipo vinculado del producto —equipo de caja o kiosco de autoservicio— debe poder vincularse y desvincularse únicamente desde la consola del administrador de su sede, por las dos vías (QR y código), y toda vinculación y desvinculación debe quedar auditada con quién la hizo y cuándo. Ningún equipo puede declararse a sí mismo. Este requisito es lo que RP-15 y RP-16 delegan en esta capa.
- **RP-25.** Las tasas, las monedas operadas, los datos de sede y las promociones que cualquier superficie de PuntoCash exhiba en una sucursal deben provenir de lo que esta capa declara para esa sede, en un único lugar, sin despliegue de código y sin copia paralela. Las tasas que se exhiben deben ser las mismas con las que esa sede cotiza. Este requisito es lo que RP-12 y RP-13 delegan en esta capa.
- **RP-26.** Ninguna consola de PuntoCash debe poder crear, modificar ni dar de baja una caja, un equipo vinculado, un trabajador o un usuario administrador de una sede, ni fijar su tasa efectiva ni sus monedas. Su único recurso sobre lo que ocurre dentro de una sede es suspender al operador o a la sede, y ambas acciones deben ser reversibles y quedar auditadas.

---

## 9. Fuera de alcance

Explícitamente no cubierto por esta versión, y pendiente de definición de negocio:

- **Comisiones, rentas y liquidaciones** entre PuntoCash y sus mercantes **[A8]**.
- **Exportación de reportes y de auditoría** a archivo. Requiere una decisión que concilie la necesidad real de llevarse un reporte con **[R11]**.
- **Sub-roles dentro de una consola.** Todos los usuarios administradores de un mercante tienen exactamente las mismas potestades sobre todas sus sedes; no hay un supervisor con permisos recortados ni un usuario limitado a una sucursal. Lo mismo en PuntoCash: no se separa quien consulta de quien revoca una sede.
- **Administración de las Pantallas informativas.** Se asignan a su sede en el propio equipo (FR-PANT-SEDE-1 a 7); esta capa solo les provee el registro de sedes. Si el negocio quiere saber cuántas hay y dónde, es una capacidad nueva por definir.
- **Notificaciones** por correo, SMS o push. Las alertas viven dentro de la consola.
- **Recuperación de acceso** para los dos roles nuevos, que sigue siendo un marcador de posición como en Worker. Tampoco se define el mecanismo de fondo de la asistencia que un Admin presta a un trabajador que no recibe su código.
- **Backend y persistencia reales.** Como todo el producto hasta ahora, esta capa se construye contra módulos de dominio simulados en memoria, y sustituye al simulador `/kiosk/simulador-admin` que la demostración usa hoy para vincular equipos (FR-DEV-9, FR-AS-LINK-9).

---

## Apéndice A · Terminología

Amplía el Apéndice A de `PuntoCash_Worker_Functional_Requirements_v1.md` y el de `PuntoCash_PRD_v2.md`, ambos vigentes sin cambios.

| Término | Significado |
| --- | --- |
| **Sede** | Una casa de cambio física de la red, siempre propiedad de PuntoCash. Nace sin cajas; las crea su mercante. |
| **Operador** / **mercante** | La persona o empresa a la que PuntoCash entrega una o más sedes en administración. Nunca es propietaria. |
| **Admin de sede** | El rol autenticado con el que un Operador usa `/admin`. Un operador puede tener varios usuarios con este rol, todos con las mismas potestades. |
| **Super Admin** | El rol autenticado con el que PuntoCash usa `/super-admin`. |
| **Asignación** | El vínculo histórico Sede↔Operador durante un periodo, con inicio, fin y motivo. |
| **Caja** | Un puesto de mostrador de una sede, creado y retirado por su mercante, y objeto al que se vincula un equipo. |
| **Equipo** | Un dispositivo declarado por un administrador: el equipo de una caja, o un kiosco de autoservicio. |
| **Reto de vinculación** | El QR y el código de seis cifras que un equipo sin vincular muestra; válidos diez minutos, renovados solos, de un solo uso. |
| **Catálogo de monedas** | Las monedas que la plataforma soporta, mantenido por PuntoCash. |
| **Lista de monedas de una sede** | Las monedas que esa sucursal maneja, elegidas del catálogo por su mercante. Es lo que un Worker puede añadir a su caja. |
| **Par** | Dos monedas de la lista de una sede que esa sede cotiza, con su tasa de compra y de venta. Lo define el mercante; exige rango de PuntoCash. |
| **Rango de tasas** | Mínimo y máximo que PuntoCash permite por par de monedas, en toda la red. Sin rango, nadie cotiza ese par. |
| **Tasa efectiva** | La tasa que una sede aplica realmente y exhibe en su tablero, siempre contenida en su rango. |
| **Contenido público de sede** | Tasas exhibidas, monedas operadas, datos de contacto y promociones de una sucursal; origen único para kiosco y Pantalla. |
| **Promoción** | Campaña con fecha de inicio y fin que una sucursal exhibe mientras está vigente. De sede o de red, según quién la publique. |
| **Solicitud de aprobación** | Un ajuste o descuadre que espera el visto bueno del Admin de la sede. |
| **Forzar cierre** | Acción del Admin que cierra una Jornada que el Worker dejó abierta, con motivo obligatorio y sin arqueo. |
| **Suspender** | Acción de PuntoCash sobre un operador o una sede que corta el acceso de todos sus usuarios y trabajadores a la vez. Reversible, motivada y auditada; es su único recurso ante un problema dentro de una sede **[A14]**. |
| **Evento de auditoría** | Registro inmutable de un acto de gobierno: quién, qué, cuándo, sobre qué y por qué. |
| **Alcance** | El conjunto de sedes que una sesión puede ver. Derivado de la sesión, nunca elegido por el usuario. |
