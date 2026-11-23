# PuntoCash — Administración de sede
## Documento de Requisitos de Producto (PRD) · v1.18

**Estado:** Describe la consola de administración de sede **completa**. Lo que queda fuera de la capa se nombra en §6; no se da por hecho en ningún punto de este documento.

**Destinatarios:** Producto, negocio, liderazgo técnico, jefatura de proyecto, desarrollo y QA.

**Alcance:** Únicamente la consola **Admin de sede** (`/admin`), la del mercante que administra una o varias sedes. **No cubre Super Admin** (`/super-admin`), la consola de PuntoCash sobre su red: esa superficie no entra en esta entrega y vive en `PuntoCash_Administracion_PRD_v1.md`.

**Control de cambios — v1.18 (21/10/2026).** Revisión completa antes de la entrega. Tres decisiones de producto: **cambiar de sede no hace perder la pantalla** —se conservan el periodo y los filtros, salvo la caja y el trabajador, que son de la sede que se deja—; el **motivo** de desactivar a un trabajador o corregir su correo es obligatorio pero **sin largo mínimo**, porque basta con que diga algo; y un reporte exportado con un trabajador elegido **no lleva el corte por trabajador**, que sería una sola fila. El documento deja de llamarse entrega parcial.

**Control de cambios — v1.17 (20/10/2026).** Los **reportes se exportan** a Excel y a PDF, sobre una plantilla con la identidad de la marca. Es la excepción a **R11** que este documento dejaba abierta: un reporte solo lleva totales, ningún dato de clientes. Listados y auditoría siguen sin exportarse.

**Control de cambios — v1.16 (20/10/2026).** **Reportes** pasa de §6 a §5.4: entra en la entrega, y con ella la consola está completa. Queda definido qué es **volumen** —actividad, en bruto, cada operación completada una vez; en un cambio, la divisa negociada— y que la **posición neta** del cambio se muestra aparte y no es volumen. El volumen solo se consulta en Reportes. §6 queda con lo que está fuera de la capa entera.

**Control de cambios — v1.15 (20/10/2026).** **Aprobaciones** pasa de §6 a §5.4: entra en la entrega. Toda diferencia de efectivo que registra un trabajador —un ajuste, un cierre o una apertura que no coincide— espera el visto bueno de la administración, sin umbral; resolverla deja constancia y no cambia la caja. Inicio deja de señalar las diferencias del día por separado, porque cada una ya es una aprobación pendiente.

**Control de cambios — v1.14 (20/10/2026).** **Operaciones** pasa de §6 a §5.4: entra en la entrega. Lista todas las operaciones, completadas o no, y el detalle es el de Worker con el contexto que el mercante necesita.

**Control de cambios — v1.13 (19/10/2026).** Inicio, Sedes, Cajas, Equipos y Trabajadores leen las jornadas. Una sede tiene varias cajas, así que su jornada se cuenta por cajas. El **volumen** queda para Reportes, que tiene que definir qué cuenta como volumen.

**Control de cambios — v1.12 (19/10/2026).** El conteo de apertura es **a ciegas**.

**Control de cambios — v1.11 (19/10/2026).** El producto dice **cierre**, y no arqueo, que es como se dice en Cuba; el que hace el administrador sin contar es un **cierre forzado**.

**Control de cambios — v1.10 (19/10/2026).** **Continuidad entre jornadas**: cada apertura se compara con el cierre anterior de su caja, toda diferencia lleva motivo, y un cierre sin arqueo queda pendiente de conciliar hasta que la apertura siguiente cuenta la caja. Quien registra la apertura es Worker, y el cambio le llega en su siguiente iteración.

**Control de cambios — v1.9 (16/10/2026).** **Jornadas** pasa de §6 a §5.4: entra en la entrega. Forzar el cierre se permite aunque el trabajador esté operando en esa caja, avisando de que su sesión no podrá seguir.

**Control de cambios — v1.8 (16/10/2026).** La ficha de sede muestra lo que ve el cliente en la sala: tablero de tasas y promociones en pantalla. El glosario corrige qué es el contenido público: las monedas de la lista no se exhiben.

**Control de cambios — v1.7 (16/10/2026).** Una promoción puede llevar una imagen, opcional.

**Control de cambios — v1.6 (16/10/2026).** **Promociones** pasa de §6 a §5.2: entra en la entrega. El título y el texto tienen un largo máximo, una promoción puede durar un solo día, y en la pantalla de la sala cada promoción es su propia diapositiva.

**Control de cambios — v1.5 (15/10/2026).** El documento describe el producto, no la demostración: §5 pasa a llamarse «Capacidades de esta entrega», §6 deja de describir las pantallas provisionales de lo pendiente, la justificación de **A12** deja de referirse al tablero de la demostración, y el backend y la persistencia salen de la lista de lo que queda fuera, porque son parte del producto. Las entradas anteriores de este control de cambios dicen «construida» en el sentido de «incluida en la entrega».

**Control de cambios — v1.4 (15/10/2026).** El mercante **corrige la dirección, el teléfono y el horario** de sus sedes, que son lo que la sucursal anuncia en su pantalla de sala; el **código y el nombre** siguen siendo de PuntoCash. La dirección se puede cambiar entera, y cada cambio queda auditado con el antes y el después. El horario pasa a guardarse **por días**. Se matiza **A3**.

**Control de cambios — v1.3 (15/10/2026).** **Tasas** pasa de §6 a §5.2: entra en la entrega, y el tablero de cada sucursal ya muestra lo que su sede cotiza. Cambio de modelo decidido ese día: una tasa es siempre una moneda contra el peso cubano, con el rango de PuntoCash por moneda; no hay pares cruzados.

**Control de cambios — v1.2 (15/10/2026).** **Monedas** pasa de §6 a §5.2: entra en la entrega. Dos decisiones de ese día: la lista de monedas existe en toda sede, tenga o no Cambio de moneda; y retirar una moneda la quita también de las cajas, que deben tenerla en cero.

**Control de cambios — v1.1 (15/10/2026).** El **perfil** pasa de §6 a §5.3: entra en la entrega y queda definido. Cada persona ve sus datos, corrige su nombre y su teléfono y cambia su contraseña; el correo sigue siendo cosa del principal.

**Control de cambios — v1.0 (14/10/2026).** Primera versión. Se extrae de `PuntoCash_Administracion_PRD_v1.md` (v3.1) §5.1 y todo lo que rige `/admin`, para que esta consola tenga su propio PRD como lo tiene Worker. El documento del que sale conserva el mapa de las dos consolas y sigue siendo la casa de Super Admin; lo que aquí se dice sobre `/admin` manda sobre lo que allí se dijera. Las reglas **A1–A14** y los requisitos de resultado **RP-17 a RP-26** no se renumeran ni se reescriben: son de la capa entera y se citan con su número de siempre.

**Documentos complementarios:** `PuntoCash_Admin_Sede_Functional_Requirements_v1.md` (FRD) especifica el comportamiento pantalla por pantalla de las secciones de esta entrega; este documento no entra en ese nivel. `PuntoCash_Admin_Sede_Alcance_Pendiente_v1.md` es el registro de cómo se especificaron las secciones que entraron después; ya no tiene requisitos vigentes. `PuntoCash_PRD_v2.md` sitúa esta consola dentro del producto completo y define las reglas **R1–R13**. `PuntoCash_Worker_PRD_v1.md` y su FRD describen la aplicación que esta consola supervisa.

---

## 1. El producto

PuntoCash es una plataforma de servicios financieros para una red de casas de cambio. La red es propiedad de PuntoCash y, de cara al cliente, cada sucursal **es** PuntoCash: misma marca, mismos servicios, misma experiencia. Pero la explotación diaria de cada sede se entrega en administración a un **mercante privado**, que la opera por cuenta de PuntoCash sin ser en ningún momento su dueño. Un mismo mercante puede tener varias sedes a su cargo.

La **consola de administración de sede** es el producto de ese mercante. Es donde pone en marcha una sucursal que PuntoCash le acaba de entregar, donde la mantiene declarada día a día, y donde mira lo que está pasando en todas las suyas a la vez.

Dos rasgos la separan del resto del producto, y conviene tenerlos presentes antes de leer cualquier requisito.

El primero es que **no es una aplicación de escritorio**. Worker y el kiosco corren sobre máquinas instaladas en una sucursal; esta consola se abre desde cualquier navegador y se supervisa a diario **desde un teléfono**. Es la superficie que un mercante mira en un semáforo para saber si sus tres sedes abrieron. De ahí que el teléfono no sea una adaptación posterior sino la condición de partida: toda pantalla debe ser utilizable desde 360px de ancho.

El segundo es que **la marca visible sigue siendo PuntoCash**. Esta es la superficie donde más tentador resultaría poner el logotipo del mercante, y es precisamente donde no va: el nombre de su empresa aparece como dato de contexto, nunca como identidad de la aplicación **[A9]**.

Su identidad visual la fija el Manual de Marca y UI de PuntoCash, que es la fuente de verdad.

---

## 2. El problema de negocio que resuelve

Antes de esta consola, el producto tenía dos superficies y las dos sabían de una sola cosa a la vez: un Worker ve la caja del equipo en que inició sesión y nada más **[R12]**; un kiosco produce y muestra datos de la sede a la que está vinculado y nada más. El negocio, en cambio, es una red administrada por delegación, y eso crea cuatro tensiones que un sistema de una sola caja no puede resolver.

| Tensión | Qué falla si no se resuelve |
| --- | --- |
| **La sede es de PuntoCash, pero la opera otro** | Sin una noción explícita de asignación, «de quién era esta sede en marzo» es una pregunta sin respuesta en el sistema — justamente la pregunta que aparece cuando hay un problema en marzo. |
| **El mercante responde de su operación, pero no puede ser juez y parte** | Si pudiera tocar el efectivo o corregir el histórico de sus propias sedes, el control interno del Worker —cierre con conteo, motivo obligatorio, histórico inmutable— quedaría sin valor. Si no pudiera hacer nada, una caja bloqueada un domingo se quedaría bloqueada. |
| **PuntoCash responde de la marca, pero no dirige el mostrador** | Si PuntoCash pudiera dar de alta trabajadores o retirar cajas de una sede ajena, se volvería administradora de hecho de esa sucursal sin serlo, y el mercante dejaría de poder responder de una operación que otro le cambia por debajo. Si no pudiera ver nada, no podría responder de su propia marca. |
| **Un equipo físico no es de fiar por estar encendido** | Un ordenador de mostrador o un kiosco de sala de espera son objetos que se mueven, se roban y se conectan a redes ajenas. Si un equipo pudiera declararse a sí mismo «Caja 03 de Vedado», cualquiera podría operar contra la caja de otra sede. |

Hay además una razón de calendario que explica por qué esta consola se entrega antes que el resto de la capa de administración: **el producto no arranca sin ella.** Un equipo de caja recién instalado muestra una pantalla de vinculación y nada más hasta que un administrador lo vincula; un kiosco de autoservicio, igual. La consola dejó de ser el nivel de gobierno que faltaba por encima de una caja y pasó a ser la pieza sin la cual las otras dos superficies no se ponen en marcha.

El producto resuelve las cuatro tensiones con tres principios que atraviesan todos los requisitos:

> **PuntoCash decide qué sedes existen y a quién se las entrega. Todo lo que vive dentro de una sede lo gobierna su mercante.** PuntoCash lo ve entero —cajas, equipos, trabajadores, tasas, operaciones— y no crea, modifica ni da de baja nada de ello. Su único recurso ante un problema dentro de una sede es suspender al mercante o a la sede: actúa sobre la relación, no sobre las piezas.

> **El mercante supervisa y desbloquea; nunca opera ni corrige.** Su poder sobre la operación se reduce a dos actos —aprobar un ajuste y forzar el cierre de una jornada—, ambos con motivo obligatorio, ambos aditivos y atribuidos a su nombre, ninguno capaz de alterar lo que un Worker ya registró.

> **Ningún equipo se declara a sí mismo.** Un equipo solo es una caja, o el kiosco de una sede, porque el administrador de esa sede lo declaró desde su consola. Y deja de serlo en el instante en que ese administrador lo desvincula.

---

## 3. Quién lo usa

El rol de esta consola es el **Admin de sede**: la persona autenticada con la que un mercante gobierna las sedes que tiene asignadas.

Lo que gobierna: crea y retira las cajas de sus sedes, vincula y desvincula los equipos de esas cajas y sus kioscos de autoservicio, da de alta y desactiva a sus trabajadores, crea los demás usuarios administradores de su propia empresa, declara qué monedas maneja cada sede y fija la tasa de cada moneda que cotiza, publica sus promociones, resuelve las aprobaciones pendientes y supervisa jornadas, cierres y volumen.

Lo que **no** hace, por diseño y no por falta de construcción: no opera caja —no abre jornadas, no registra operaciones, no ajusta efectivo, no hace el cierre de caja **[A6]**—, no corrige el pasado **[A7]**, y no ve una sola sede fuera de las que administra en este momento **[A1]**.

Un mercante tiene **uno o varios usuarios administradores**. El primero lo entrega PuntoCash al asignarle su primera sede; ese primero crea los demás. Sobre la operación —sedes, cajas, equipos, trabajadores, monedas, tasas, promociones, aprobaciones y reportes— **todos pueden exactamente lo mismo, en todas las sedes de la empresa**: no hay sub-roles, ni supervisores con permisos recortados, ni usuarios limitados a una sucursal. La **única** diferencia entre un usuario y otro es quién administra el grupo de usuarios, y eso pertenece a uno solo: el **administrador principal** (§4).

El **Worker** no sabe que existe un mercante, y el **Cliente** no llega nunca a esta superficie. Ninguna pantalla de `/admin` completa un servicio, mueve efectivo, invoca a un proveedor externo ni verifica la identidad de un cliente.

**Acceso.** El mismo de dos pasos que Worker, sin variación: identificador y contraseña, y después un código de seis dígitos al correo registrado, con cinco minutos de vigencia, tres intentos y hasta tres envíos. **Ninguna sesión existe hasta que ese código se verifica [R13]**, y no hay «recordar este equipo». Esta consola no se usa sobre equipos vinculados: se abre desde un navegador cualquiera — condición necesaria, porque escanear el QR de un equipo exige tener la consola a mano en un dispositivo con cámara.

---

## 4. Conceptos operativos y cómo se relacionan

El dominio de la Fase 1 llegaba hasta la Caja y se detenía ahí: una Caja no pertenecía a ninguna Sede porque la Sede no existía como concepto. Esta capa añade los conceptos de encima, y el que faltaba debajo.

| Concepto | Qué es | Quién lo decide |
| --- | --- | --- |
| **Sede** | Una casa de cambio física de la red: código, nombre, dirección, provincia y municipio, horario, teléfono y estado (activa, suspendida, cerrada). Siempre propiedad de PuntoCash; lo único que cambia de manos es su administración. Toda Caja pertenece a una Sede, y todo Trabajador también. **Una sede nace sin cajas.** | PuntoCash **[A3]** |
| **Operador** (mercante) | La persona o empresa a la que se entrega en administración una o más sedes: nombre, contacto, fecha de alta y estado (activo, suspendido, dado de baja). Nunca es dueña de una Sede. | PuntoCash **[A3]** |
| **Asignación** | El vínculo Sede↔Operador durante un periodo, con inicio, fin y motivo. Una sede tiene como máximo una asignación vigente **[A2]**, y las cerradas no se borran ni se editan: son el historial de quién respondía por esa sede en cada tramo del tiempo. | PuntoCash **[A3]** |
| **Usuario administrador** | La cuenta con la que una persona del mercante entra en esta consola. El primero lo entrega PuntoCash; los demás los crea el **administrador principal**. | PuntoCash el primero; el principal los demás **[A4]** |
| **Administrador principal** | El usuario que gobierna el grupo de usuarios de su empresa. Es el único que da de alta, edita, desactiva y reactiva usuarios administradores; para los demás esa sección **no existe**. El papel **se traspasa** a otro usuario activo, en un solo acto, y **a su titular no lo desactiva nadie**. | El mercante (el propio titular, al traspasarlo) |
| **Caja** | Un puesto de mostrador de una sede, con sus saldos por moneda. Es el objeto al que se vincula un equipo. Sin cajas una sede no opera; sin equipo vinculado, una caja tampoco. | El mercante **[A4]** |
| **Equipo** | Un dispositivo que el producto reconoce porque un administrador lo declaró. Dos clases, mismo mecanismo, objetos distintos: el **equipo de caja**, atado a una sede y a una de sus cajas, y el **kiosco de autoservicio**, atado a una sede. Un equipo sin vincular no es nada. | El mercante **[A10]** |
| **Reto de vinculación** | Lo que un equipo sin vincular muestra para poder ser declarado: un QR y un código de seis cifras, dos formas de lo mismo, válidos diez minutos, renovados por el propio equipo y **de un solo uso**. | El equipo lo muestra; el mercante lo canjea |
| **Trabajador** | El empleado que opera en el mostrador. **Pertenece a una sede, no a una caja**: la caja la determina el equipo en el que inicia sesión, y solo puede iniciar sesión en equipos de su propia sede **[A13]**. | El mercante **[A4]** |
| **Evento de auditoría** | Transversal. Todo acto de gobierno con consecuencias deja un registro inmutable con quién, qué, cuándo, sobre qué y por qué. De solo lectura incluso para PuntoCash. | — |

La cadena de las monedas y la tasa tiene cuatro eslabones, cada uno decidido por quien corresponde y condición del siguiente. **PuntoCash mantiene el catálogo de monedas** de la plataforma y define por moneda, contra el peso cubano, un **rango permitido** de compra y venta; una moneda sin rango no la cotiza nadie en la red. **El mercante declara la lista de monedas que maneja cada sede**, del catálogo, y esa lista es exactamente lo que un Worker puede añadir a su caja. La lista existe en toda sede, tenga o no Cambio de moneda: una sede de solo remesas también maneja efectivo en varias monedas. **PuntoCash habilita los servicios de cada sede**, y si entre ellos está el Cambio de moneda, esa sede puede cotizar. **El mercante fija entonces la tasa de cada moneda que cotiza** —siempre contra el peso cubano: lo que paga y lo que cobra por una unidad—, solo para monedas de su propia lista y donde haya rango, y siempre **dentro** de ese rango. Esa tasa es la que el motor de cotización usa en esa sede *y* la que su tablero público exhibe: son el mismo dato **[A12]**.

Lo mismo vale para todo el **contenido público de sede** —tablero de tasas, datos de contacto y horario, promociones vigentes—: lo declara esta consola, una sola vez por sede, y lo leen del mismo origen el kiosco de autoservicio y la Pantalla informativa. No existe una segunda copia que alguien deba sincronizar a mano.

```
PuntoCash  ──decide qué sedes existen, a quién se entregan y dentro de qué límites──┐
   │                                                                                │
   ├── Operador (mercante) ──administra vía Asignación (histórica)───────────────────┤
   │        │                                                                       │
   │        └── usuarios administradores: el 1.º lo entrega PuntoCash;               │
   │            los demás los crea el administrador principal                        │
   │                                                                                │
   └── Sede ◄───────────────────────────────────────────────────────────────────────┘
         │   (PuntoCash: código y nombre · servicios habilitados · rangos de tasa)
         │
         │   ── todo lo de abajo lo gobierna el mercante; PuntoCash solo lo ve ──   [A14]
         │
         ├── Monedas de la sede (lista) ──> lo que un Worker puede añadir a su caja   [A4]
         ├── Pares definidos = lo que cotiza = lo que exhibe su tablero · promociones [A12]
         │        └── lo leen: Kiosco Autoservicio · Pantalla                  [RP-13]
         │
         ├── Trabajador (pertenece a la sede, no a una caja)                    [A13]
         │
         ├── Kiosco de autoservicio ──vinculado por el Admin──> sesión de dispositivo [A10]
         │
         └── Caja (creada por el Admin) ──vinculada a un Equipo──> sesión de dispositivo
               │
               └── Jornada ──> Operación ──> Movimiento de caja   (dominio Worker, intacto)
                        │
                        └── Solicitud de aprobación ──resuelta por──> Admin de sede  [A6]
```

---

## 5. Capacidades de esta entrega y su comportamiento de negocio

El FRD las especifica pantalla por pantalla.

### 5.1 Acceso

El administrador entra con identificador y contraseña y, después, con el código que recibe en su correo registrado. Hasta que verifica el código no existe sesión alguna **[R13]**.

El mensaje de rechazo es **uno solo** para todos los motivos —cuenta inexistente, contraseña incorrecta, usuario desactivado, empresa suspendida—, porque distinguirlos diría desde fuera qué cuentas existen y en qué estado está una empresa. Un usuario válido de una empresa activa **sin ninguna sede asignada** sí entra, y aterriza en un Inicio que lo explica: no es un error, es un mercante que todavía no tiene nada a su cargo.

Quien olvida su contraseña la recupera por su cuenta, con el mismo trámite de tres pasos que Worker: identificador, código al correo registrado, contraseña nueva. **Terminar no abre sesión** — un código verificado ahí demuestra el correo, no sustituye al acceso. Si el correo registrado ya no sirve, quien lo corrige es su administrador principal; y si quien se quedó fuera es el propio principal, PuntoCash.

### 5.2 Poner la sucursal en marcha

Es lo que el mercante hace los primeros días con una sede que acaba de recibir, y la razón por la que esta consola se entrega primero.

**Sedes.** La ficha de cada sede que administra, con sus datos maestros, los servicios que PuntoCash le ha habilitado, sus cajas y equipos, sus kioscos, sus trabajadores, la jornada en curso y el contenido que esa sucursal está exhibiendo ahora mismo. El **código y el nombre** los gestiona PuntoCash **[A3]**, porque son la forma en que la plataforma reconoce cada sede. La **dirección, el teléfono y el horario** los mantiene el mercante, porque es quien sabe si son correctos y porque se ven en la televisión de la sala de espera: un teléfono equivocado ahí es un cliente que no puede llamar. El horario se escribe por días, y el texto que ve el cliente lo produce el sistema. Cada cambio queda en el registro de auditoría con el antes y el después, de modo que PuntoCash ve, por ejemplo, que una sede cambió de dirección.

**Cajas.** Crea los mostradores que la sede va a tener, y los retira cuando dejan de existir. Una sede sin ninguna caja aparece como tal, no como una ausencia: es el estado en que llega toda sede recién asignada y quien abre la pantalla por primera vez tiene que entender qué le falta. Retirar una caja exige motivo y **no borra nada**: su histórico de jornadas, movimientos y operaciones permanece íntegro **[R9]**, y la caja sigue apareciendo en los listados históricos marcada como retirada.

**Equipos.** Vincula el ordenador de cada puesto a una caja concreta, y cada kiosco a su sede, escaneando el QR que el equipo muestra o escribiendo su código de seis cifras. Las dos vías están siempre disponibles a la vez. Una caja tiene **como máximo un equipo** a la vez **[A11]**; una sede puede tener varios kioscos. Desvincular corta la sesión del dispositivo al instante y, si había un trabajador operando, también la suya — pero **nunca cierra una Jornada**, porque la Jornada es de la caja y no del equipo. El producto avisa de eso antes de desvincular, y de lo que **no** ocurre: las solicitudes que un kiosco ya generó siguen siendo válidas en caja.

La credencial del dispositivo **la emite y la revoca el sistema**, nunca el terminal, y esta consola no la muestra, no la copia y no permite exportarla **[A10]**.

**Tasas.** Fija, para cada moneda que su sede cotiza, la compra y la venta en pesos cubanos, dentro del rango que PuntoCash fija para esa moneda **[A5]**. Esa es la tasa con la que la sede cotiza **y** la que su tablero —el del kiosco y el de la pantalla informativa— muestra: el mismo dato, no dos copias **[A12]**. Cambiarla se confirma viendo el antes y el ahora, porque es el momento en que cambia una cifra en una sala de espera; no altera ninguna operación ya hecha **[R9]**. Las tasas se cambian sede por sede: con todas las sedes a la vista, la pantalla compara y no edita. Cuando falta algo para poder cotizar una moneda —el servicio, el rango, la propia moneda en la lista— la pantalla dice qué y a quién pedírselo. Y si PuntoCash mueve un rango y una tasa queda fuera, el sistema la lleva al nuevo límite y se lo señala al mercante hasta que la confirme o elija otra.

**Monedas.** Decide qué monedas maneja cada sede, eligiéndolas del catálogo de PuntoCash; esa lista es lo que sus trabajadores pueden habilitar en su caja **[A4]**. Añadir una moneda **no la activa en ninguna caja** —cada trabajador la habilita en la suya cuando la necesita— y la pantalla lo dice, porque es la confusión más probable. Retirarla significa que la sede deja de manejarla en todas partes: sale de la lista y de las cajas que la tenían, y por eso **solo se puede con saldo cero en todas ellas**; el producto lo dice nombrando las cajas antes de ofrecer la confirmación. Lo ya operado en esa moneda no cambia **[R9]**. Una sede activa no puede quedarse sin ninguna moneda.

**Promociones.** Publica lo que cada sucursal anuncia en su pantalla informativa: título, texto, una imagen si quiere, sedes y fechas. Se exhibe solo mientras está vigente y deja de verse sola al terminar, sin que nadie tenga que acordarse de quitarla. Como se lee desde el otro lado de una sala, el título y el texto tienen un **largo máximo** que no se puede pasar, cada promoción ocupa **su propia diapositiva**, y el formulario avisa cuando en una sede coincidirían más de cuatro a la vez, porque un cliente que espera no llega a verlas todas. PuntoCash también publica promociones para la red: el mercante las ve en su lista y no puede cambiarlas ni retirarlas. Retirar una propia la quita de las pantallas al instante y la deja en el histórico **[A12]**.

### 5.3 Las personas

**Trabajadores.** Da de alta a su personal eligiendo **sede, nunca caja** **[A13]**, y recibe al terminar una **credencial inicial** que debe entregarle: se muestra una sola vez y no puede volver a consultarse. Esa credencial **es su contraseña**, no un pase de un solo uso: le sirve indefinidamente, y el producto no le obliga a cambiarla al entrar. La cambia él, cuando quiera, por la recuperación de contraseña de Worker, que es el único sitio donde elige una suya.

De eso se siguen dos cosas que conviene no descubrir tarde. El administrador **conoce una contraseña válida** de su trabajador mientras este no la cambie; lo único que le impide entrar como él es el segundo factor, cuyo código va al correo del trabajador **[R13]**. Y **regenerar la credencial pisa la contraseña que el trabajador hubiera elegido**: es un restablecimiento, no una reemisión, y por eso se confirma antes de hacerlo.

El correo es obligatorio porque es el canal del segundo factor: sin un correo válido el trabajador no podría acceder nunca.

Puede además **editar sus datos**, **reasignarlo a otra sede** —con efecto inmediato sobre dónde puede iniciar sesión—, **desactivarlo** y **reactivarlo**. Esta consola es el **único lugar del producto donde se desactiva a una persona** **[A14]**, y desactivar no borra ni altera nada de lo que esa persona operó **[A7]**. Estar desactivado es también la única clase de «cuenta bloqueada» que existe en el producto, y se resuelve aquí, reactivando.

Y puede **ayudar con el acceso** cuando un trabajador dice que no le llega el código. Lo que esa pantalla hace es enseñar el correo registrado **sin enmascarar** —porque de lo que se trata es de encontrar la errata, y una dirección enmascarada esconde justo eso— y permitir corregirlo, con motivo escrito. Lo que **no** hace, y lo dice antes de cualquier control porque es la expectativa equivocada con la que se llega: no muestra el código, no lo genera y no inicia sesión por el trabajador. El segundo factor no se salta ni se delega **[R13]**.

**Usuarios administradores.** El administrador principal da de alta a los demás usuarios de su empresa, los edita, les cambia el correo, les regenera la credencial, los desactiva y los reactiva. El alta advierte de la consecuencia que más sorprende: *este usuario podrá hacer todo lo que tú puedes hacer en la operación, en todas tus sedes*.

Para quien no es el principal, esa sección **no existe** — no aparece en el menú y sus rutas responden como inexistentes, no como prohibidas. La diferencia importa: «no tienes permiso» invita a pedirlo y deja a alguien esperando; «no está ahí» no abre esa conversación.

El papel **se traspasa**, y lo traspasa su titular eligiendo a un usuario activo. Es inmediato: al confirmar hay exactamente un principal, el nuevo, y quien lo traspasó deja de ver la sección conservando todo lo demás. Existe porque la alternativa —atar el papel para siempre a la cuenta que PuntoCash entregó— convierte cualquier relevo de personal, incluso uno planificado, en un ticket de soporte. Y **al principal no lo desactiva nadie, ni él mismo**: es lo que garantiza que una empresa nunca se quede sin ningún usuario capaz de dar de alta a otro.

**El perfil.** Cada persona con sesión, sea o no el principal, tiene un perfil donde ve sus datos, corrige su nombre y su teléfono y **cambia su contraseña**, que pide la actual aunque ya haya sesión: lo que protege es la sesión que alguien dejó abierta. **El correo no se cambia ahí.** Es el canal del segundo factor y de la recuperación, y si una sesión pudiera redirigirlo, quien encontrara una abierta se quedaría con la cuenta **[R13]**; lo sigue cambiando el principal, y el perfil dice a quién pedírselo. Cambiar la contraseña **no cierra la sesión desde la que se cambia**, al contrario que recuperarla —aquí ya hay un segundo factor verificado—, pero sí cierra las demás de esa cuenta.

### 5.4 Mirar

**Inicio** responde *¿qué está pasando ahora en mis sedes?*: las métricas del día —sedes operando —las que tienen al menos una caja con jornada abierta—, cajas abiertas, trabajadores en turno, operaciones, aprobaciones pendientes—, un **panel de atención** con lo que pide acción —encabezado por las situaciones que describen una sucursal a medio montar, porque hasta que se resuelven la sede no puede operar—, y una tabla de estado por sede. Una sede tiene varias cajas y cada una su jornada, así que Inicio no dice «la sede está abierta»: dice cuántas de sus cajas lo están, para que no se esconda la que no abrió. Y señala lo que se sale de lo normal en el día: una caja abierta fuera del horario de su sede, una sede en horario sin ninguna caja abierta, las diferencias que esperan aprobación, un cierre forzado que nadie ha vuelto a contar. Inicio orienta y enlaza; no ejecuta nada.

**Reportes** responde *¿cuánto han trabajado mis sedes?*: el **volumen** de un periodo por sede, por servicio, por trabajador o por día. El volumen mide **actividad** y se cuenta como en cualquier casa de cambio: en bruto —lo comprado y lo vendido se suman— y cada operación completada una sola vez. En un cambio de moneda cuenta la **divisa** negociada; los pesos que el cliente recibe o entrega son el precio de esa divisa, y contarlos también contaría la operación dos veces. En una remesa, lo pagado; en un giro, su importe, enviado o pagado. Todo va **por moneda, nunca convertido a una moneda única**: el negocio no tiene definida una tasa de consolidación, e inventarla produciría cifras que nadie podría defender. Junto al volumen del cambio, la **posición neta** de cada divisa —lo comprado menos lo vendido— dice si una sucursal acumula divisa o se queda sin ella; es útil para reponer o retirar fondos, pero no es volumen: dos cajas con la misma posición pueden haber trabajado cantidades muy distintas. El volumen solo está en Reportes —en Inicio serían varias cifras por moneda en una tarjeta— y la ficha de cada trabajador enlaza al suyo. Ni comisiones, ni rentas, ni márgenes **[A8]**. Y se **exportan** a Excel —para trabajar las cifras— y a PDF —para enviar o archivar—, con los cuatro cortes del periodo en un solo archivo y la identidad de la marca. Es la única descarga de la consola: «sin descarga» **[R11]** existe para que los datos de los clientes no circulen como archivo, y un reporte solo lleva totales. Cada exportación queda registrada.

**Jornadas** responde *¿qué ha pasado en cada caja?*: quién la abrió, con qué fondeo, qué movió, cómo cerró y si el cierre cuadró. Las diferencias se ven por moneda, con su signo, y nunca sumadas. Una caja que **sigue abierta de un día anterior** se señala arriba, porque es una caja que nadie cerró y el efectivo de dentro no tiene responsable a la vista. El libro de movimientos es de solo lectura; el mercante no corrige nada de lo que el trabajador registró **[A7]**.

Lo único que puede hacer con una jornada es **forzar su cierre**, y solo si está abierta. Existe para la caja que alguien dejó abierta y para el trabajador que no puede volver a cerrarla. Exige un motivo escrito, **no cuenta el efectivo** —el saldo final es el de libros, y la jornada queda marcada como cerrada sin conteo— y **no toca** el equipo vinculado ni ningún movimiento anterior. Se permite aunque el trabajador esté operando en ese momento, porque quien fuerza un cierre suele estar resolviendo justo eso; el producto le avisa con el nombre del trabajador, que no podrá seguir hasta abrir una jornada nueva **[A6]**, **[R1]**.

Una caja **no empieza de cero cada día**: lo que deja un cierre es lo que encuentra la apertura siguiente. Quien abre cuenta el efectivo **a ciegas** —sin ver antes lo que dejó el cierre anterior, porque quien ve la cifra tiende a copiarla en lugar de contar— y después el sistema la compara, y toda diferencia queda explicada —una reposición o un retiro de fondos, que son legítimos pero tienen que decir quién y por qué, o un faltante o un sobrante—. El mercante ve, en cada jornada, lo dejado, lo contado y la explicación. Y como un cierre forzado deja el efectivo sin contar, esa jornada queda **pendiente de conciliar** hasta que la apertura siguiente lo cuenta; mientras tanto, la consola lo señala, porque es dinero que nadie ha comprobado.

**Aprobaciones** responde *¿qué diferencias de efectivo esperan mi visto bueno?*: toda diferencia de efectivo que registra un trabajador —un ajuste de saldo durante la jornada, un cierre que no cuadra, una apertura que no encuentra lo que dejó el cierre anterior, también cuando alguien repuso o retiró fondos— llega aquí con su signo y el motivo que él dio, y espera que la administración la apruebe o la rechace con un motivo propio. **No hay umbral**: un umbral sería la cifra por debajo de la cual se puede sacar dinero sin que nadie lo mire. Resolver **deja constancia** de la decisión y no cambia nada de lo que el trabajador registró —el saldo ya quedó ajustado—; rechazar marca la diferencia para revisarla fuera del sistema **[A6]**, **[A7]**. Las más antiguas van primero, porque es la antigüedad lo que las vuelve urgentes, y cada jornada dice en qué quedó cada una de sus diferencias.

**Operaciones** responde *¿qué han hecho mis cajas con cada cliente?*: cada cambio de moneda, cada remesa pagada, cada giro enviado o pagado, con su cliente, su importe y su estado. Se listan **todas**, también las rechazadas, fallidas o canceladas, porque muchas en una misma caja dicen algo. El detalle es el mismo que ve el trabajador, con lo que él no necesita y el mercante sí: dónde se hizo, quién la hizo, en qué jornada y, si vino del kiosco, qué solicitud la originó. Es de **solo lectura**: desde aquí no se reimprime, no se anula ni se corrige nada **[A6]**, **[A7]**.

Todo lo que esta consola muestra está acotado al **alcance vigente** de la sesión: las sedes que el operador administra en este momento. El selector de alcance filtra dentro de ese conjunto; no lo elige ni lo amplía **[A1]**.

---

## 6. Lo que queda fuera de esta entrega

Todas las secciones de la consola están en la entrega. Queda fuera de la capa entera, pendiente de definición de negocio: las **comisiones, rentas y liquidaciones** entre PuntoCash y sus mercantes **[A8]**; la **exportación de listados y de auditoría** a archivo, que requiere conciliar la necesidad real con **[R11]**; los **sub-roles** dentro de la consola; la **administración de las Pantallas informativas**, que se asignan a su sede en el propio equipo; y las **notificaciones** por correo, SMS o push, porque las alertas viven dentro de la consola.

---

## 7. Reglas de administración

Catorce reglas rigen esta capa. Se numeran **A1–A14** para no confundirse con las **R1–R13** del producto, que siguen vigentes sin excepción. El FRD las referencia como **[A#]** allí donde determinan un comportamiento.

| Regla | Enunciado | Por qué existe |
| --- | --- | --- |
| **A1** | **Aislamiento por alcance.** El Worker ve su caja; el Admin de sede ve exactamente las sedes que tiene asignadas en este momento; el Super Admin ve la red. Nadie ve hacia los lados, y el alcance no es una preferencia elegible: se deriva de la sesión. | Es la extensión natural de **[R12]** un nivel hacia arriba. Un mercante viendo el volumen del mercante de al lado sería una filtración de negocio, no un fallo de permisos. |
| **A2** | **Una sede tiene como máximo un operador vigente.** Revocar una asignación la cierra con fecha y motivo, nunca la borra. El historial de asignaciones es inmutable. | Sin esto, «quién respondía por esta sede cuando pasó aquello» no tiene respuesta. Con esto, siempre la tiene. |
| **A3** | **Solo PuntoCash decide qué sedes existen y quién las administra.** Es el único que crea una sede, le da su código y su nombre, la suspende y la cierra; el único que da de alta y de baja mercantes y les asigna y revoca sedes; el único que entrega a un mercante su primer usuario administrador; y el único que fija los rangos de tasa y los servicios habilitados de cada sede. | La sede es propiedad de PuntoCash y la marca también. Lo delegado es la explotación, no la titularidad ni los límites dentro de los cuales se explota. Los datos de contacto —dirección, teléfono y horario— son parte de la explotación y los mantiene el mercante. |
| **A4** | **Todo lo que vive dentro de una sede lo gobierna su mercante.** Las cajas, los equipos vinculados, los trabajadores, los demás usuarios administradores de su empresa, las monedas que la sede maneja y las tasas que cotiza los crea, los modifica y los da de baja el Admin de esa sede, y solo en sedes que administra. Una sede nace vacía y es su mercante quien la pone en marcha. | Quien responde de una operación tiene que poder configurarla. Si otro pudiera retirarle una caja o desactivarle un trabajador por debajo, dejaría de poder responder de lo que ocurre en su mostrador. |
| **A5** | **La tasa efectiva de una sede siempre cabe dentro del rango vigente de PuntoCash.** El mercante declara libremente qué monedas maneja su sede, del catálogo de la plataforma; pero solo puede **fijar la tasa** de una moneda si ella y el peso cubano están en esa lista, PuntoCash tiene rango para esa moneda, y le ha habilitado ahí el servicio de Cambio de moneda. Compra y venta se fijan en el mismo acto: no hay moneda cotizada sin tasa. Si PuntoCash mueve un rango y deja tasas fuera, esas tasas se fijan al límite más cercano, se audita y se avisa; si retira el rango, la tasa deja de cotizarse sin borrarse. | Una sede con una tasa arbitraria rompe la promesa de marca única. La cadena catálogo → lista de la sede → servicio → rango → par reparte cada decisión donde corresponde. |
| **A6** | **El Admin supervisa y desbloquea; no opera.** Ninguna pantalla de `/admin` registra una operación, mueve efectivo, abre una jornada ni invoca a un proveedor externo. Sus dos únicas acciones sobre la operación viva son aprobar o rechazar una solicitud y forzar el cierre de una jornada. Ambas exigen motivo escrito. | Sin las dos excepciones, una caja bloqueada se queda bloqueada; con más que esas dos, el control interno del Worker pierde su valor. |
| **A7** | **Nada de lo que hace un Admin altera lo que registró un Worker.** Aprobar, rechazar y forzar un cierre **añaden** un hecho nuevo, atribuido al Admin, con su sello de tiempo y su motivo. Ningún movimiento, cierre ni operación cambia, se recalcula ni desaparece. | Es **[R9]** aplicado a la capa de gobierno. Un histórico que un supervisor puede reescribir no es un histórico. |
| **A8** | **Lo económico entre PuntoCash y el mercante queda fuera del producto.** Ninguna consola muestra comisiones, rentas, liquidaciones ni deuda. El mercante ve volumen operado. | Decisión explícita de alcance. Meter liquidaciones abriría un dominio contable entero que el negocio no ha definido. |
| **A9** | **PuntoCash es siempre la marca visible.** Ninguna superficie —tampoco la consola del mercante— muestra el nombre comercial, el logotipo ni la identidad del operador privado como marca de la aplicación. El nombre del mercante aparece como dato donde es información, nunca como marca. | Fijado en el manual de marca. Esta capa es donde más tentador sería romperlo. |
| **A10** | **Los equipos los vincula y los desvincula el Admin de la sede.** Ningún equipo se declara a sí mismo, ninguno elige su caja ni su sede, y el Super Admin los ve todos pero no toca ninguno. La credencial la emite y la revoca el sistema al vincular y al desvincular, nunca el terminal. | Declarar qué equipo es un puesto de PuntoCash exige estar delante de ese equipo, leyendo el código que muestra: es un acto local de quien responde por esa sucursal. |
| **A11** | **Un equipo, un puesto.** Una caja tiene como máximo un equipo vinculado a la vez, y un kiosco pertenece a una sola sede. Desvincular corta la sesión del dispositivo al instante y, si había un trabajador operando, termina también la suya — pero **nunca cierra una Jornada**, porque la Jornada es de la caja y no del equipo. | Cerrar la Jornada al desvincular haría que un cambio de ordenador produjera un cierre forzado, que es precisamente lo que el producto evita. |
| **A12** | **Lo que esta capa declara para una sede es lo único que esa sede exhibe y aplica.** Las tasas del tablero público son las mismas con las que la sede cotiza; las monedas listadas son las que la sede opera; los datos de contacto son los del registro de sedes; las promociones son las vigentes en la fecha. No existe una segunda copia que alguien deba sincronizar a mano, y cambiar cualquiera de esos datos no debe requerir un despliegue de código. | Un cliente que lee en la sala una cifra y en caja le aplican otra deja de fiarse de la casa de cambio. Y dos copias del mismo dato que alguien sincroniza a mano terminan diferenciándose. |
| **A13** | **El trabajador pertenece a una sede, no a una caja.** La caja que opera la determina el equipo en que inicia sesión, y solo puede iniciar sesión en equipos vinculados a cajas de su propia sede. El alta de un trabajador elige sede; nunca caja. | La caja es un puesto compartido por turnos; atarla a la cuenta de una persona contradiría el modelo de equipo vinculado. |
| **A14** | **PuntoCash observa dentro de la sede y actúa solo sobre la sede entera.** Ninguna consola de PuntoCash crea, modifica ni da de baja una caja, un equipo vinculado, un trabajador o un usuario administrador más allá del primero. Su único recurso ante un problema dentro de una sede es **suspender al operador** —que corta el acceso de sus usuarios administradores y de todos los trabajadores de sus sedes— o **suspender la sede**. Ambas son reversibles, exigen motivo y quedan auditadas. | PuntoCash es dueña de la red y del software, no del mostrador: interviniendo pieza a pieza en una sede ajena se volvería su administradora de hecho, sin serlo y sin responder de ella. |

### 7.1 Cómo rigen R1–R13 sobre esta consola

Las trece reglas del producto siguen vigentes. Tres de ellas no tienen vía de aplicación directa aquí y conviene decirlo, porque su ausencia en los requisitos no es un olvido: **R2** (nada local sin éxito del proveedor) no aplica, ninguna pantalla de administración invoca a un proveedor externo; **R5** (identidad verificada físicamente) no aplica, esta consola no atiende clientes, y explícitamente ninguna de sus pantallas puede dar por verificada una identidad que un Worker no verificó; **R7** (el efecto en efectivo es un movimiento de la Jornada) aplica como prohibición, porque la administración nunca produce un movimiento de caja **[A6]**.

De las demás: **R1** aplica indirectamente en forzar cierre, que impide toda operación posterior en esa caja hasta que se abra otra jornada. **R3** aplica de lleno — aprobar, forzar un cierre, guardar una tasa, retirar una caja o vincular un equipo revalidan sus condiciones al confirmar, y un reto caducado mientras el administrador elegía la sede debe rechazarse, no aplicarse. **R4** aplica en espíritu al código de vinculación, que es de un solo uso y caduca. **R6** aplica: una solicitud ya resuelta no se resuelve dos veces, una jornada ya cerrada no se fuerza a cerrar, un reto ya usado no vincula un segundo equipo. **R8** aplica en aprobaciones: el motivo del Admin se añade al del Worker, nunca lo sustituye. **R9** aplica con toda su fuerza y es la raíz de **[A7]**. **R10** aplica a todo estado mostrado. **R11** aplica a todo menos a los reportes de volumen, que se exportan porque solo llevan totales y ningún dato de clientes. **R12** se mantiene intacta y esta consola es su continuación coherente. **R13** aplica de lleno a las personas de esta capa, sin excepción ni «recordar este equipo»; no aplica a las sesiones de dispositivo que esta consola crea, que no identifican a nadie — lo que las protege es que solo un administrador ya verificado puede crearlas o revocarlas.

---

## 8. Requisitos que debe cumplir el resultado final

Lo que el producto terminado debe garantizar. Son criterios de negocio: cada uno es verificable observando el sistema, y su incumplimiento es un defecto, no una preferencia. Continúan la numeración del PRD de producto, que llega hasta RP-16, y se comparten con Super Admin; aquí se citan los que rigen sobre esta consola.

**RP-17.** Ninguna pantalla de administración puede producir, por sí sola, un movimiento de caja, una operación, una identidad verificada o una confirmación de proveedor externo.

**RP-18.** Ninguna acción de un Admin de sede puede modificar, recalcular ni eliminar un registro creado por un Worker. Solo puede añadir hechos nuevos junto a él.

**RP-19.** Un usuario de administración nunca debe poder alcanzar —por navegación, por URL directa, por filtro o por identificador— datos de una sede que no esté dentro de su alcance vigente.

**RP-20.** Debe ser posible responder, en cualquier momento y para cualquier fecha pasada, quién administraba una sede determinada en esa fecha.

**RP-21.** Toda acción de gobierno con consecuencias debe quedar en el registro de auditoría con quién, qué, cuándo, sobre qué y por qué, y ese registro no debe poder alterarse desde ninguna superficie del producto.

**RP-22.** No debe existir ningún estado del sistema en el que una sede cotice una tasa fuera del rango que PuntoCash tiene fijado para esa moneda; ni una moneda cotizada sin rango definido; ni una tasa de una moneda que no esté en la lista de esa sede; ni cotización alguna con el servicio de Cambio de moneda deshabilitado en esa sede. Ni tampoco una moneda cotizada con la compra o la venta sin fijar.

**RP-23.** La consola del mercante no debe, en ningún momento, presentarse como un producto del mercante: la marca visible es siempre PuntoCash.

**RP-24.** Todo equipo vinculado del producto —equipo de caja o kiosco de autoservicio— debe poder vincularse y desvincularse únicamente desde la consola del administrador de su sede, por las dos vías (QR y código), y toda vinculación y desvinculación debe quedar auditada con quién la hizo y cuándo. Ningún equipo puede declararse a sí mismo.

**RP-25.** Las tasas, las monedas operadas, los datos de sede y las promociones que cualquier superficie de PuntoCash exhiba en una sucursal deben provenir de lo que esta capa declara para esa sede, en un único lugar, sin despliegue de código y sin copia paralela. Las tasas que se exhiben deben ser las mismas con las que esa sede cotiza.

**RP-26.** Ninguna consola de PuntoCash debe poder crear, modificar ni dar de baja una caja, un equipo vinculado, un trabajador o un usuario administrador de una sede, ni fijar su tasa efectiva ni sus monedas. Su único recurso sobre lo que ocurre dentro de una sede es suspender al operador o a la sede, y ambas acciones deben ser reversibles y quedar auditadas.

---

## Apéndice A · Terminología

Amplía el Apéndice A de `PuntoCash_Worker_Functional_Requirements_v1.md` y el de `PuntoCash_PRD_v2.md`, ambos vigentes sin cambios. Los términos de dominio en español son el lenguaje del producto y no se traducen.

| Término | Significado |
| --- | --- |
| **Sede** | Una casa de cambio física de la red, siempre propiedad de PuntoCash. Nace sin cajas; las crea su mercante. |
| **Operador** / **mercante** | La persona o empresa a la que PuntoCash entrega una o más sedes en administración. Nunca es propietaria. |
| **Admin de sede** | El rol autenticado con el que un Operador usa `/admin`. Un operador puede tener varios usuarios con este rol, todos con las mismas potestades sobre la operación. |
| **Administrador principal** | El único usuario de un operador que gobierna el grupo de usuarios administradores de su empresa. El papel se traspasa; a su titular no lo desactiva nadie. |
| **Usuario inicial** | El primer usuario administrador de un operador, entregado por PuntoCash. Es un hecho histórico que no cambia, y **no** es lo mismo que el administrador principal, que se mueve. Al nacer una empresa coinciden. |
| **Alcance** | El conjunto de sedes que una sesión puede ver. Derivado de la sesión, nunca elegido por el usuario. |
| **Asignación** | El vínculo histórico Sede↔Operador durante un periodo, con inicio, fin y motivo. |
| **Caja** | Un puesto de mostrador de una sede, creado y retirado por su mercante, y objeto al que se vincula un equipo. |
| **Equipo** | Un dispositivo declarado por un administrador: el equipo de una caja, o un kiosco de autoservicio. |
| **Reto de vinculación** | El QR y el código de seis cifras que un equipo sin vincular muestra; válidos diez minutos, renovados solos, de un solo uso. |
| **Credencial inicial** | La contraseña que el Admin entrega a un trabajador o a un usuario administrador al darlo de alta. Se muestra una sola vez y sirve indefinidamente hasta que su dueño la cambia. |
| **Catálogo de monedas** | Las monedas que la plataforma soporta, mantenido por PuntoCash. |
| **Lista de monedas de una sede** | Las monedas que esa sucursal maneja, elegidas del catálogo por su mercante. Es lo que un Worker puede añadir a su caja. |
| **Tasa** | Lo que una sede paga y cobra, en pesos cubanos, por una unidad de una moneda de su lista. La fija el mercante dentro del rango de PuntoCash; es la misma que exhibe su tablero. |
| **Rango de tasas** | Mínimo y máximo de compra y de venta que PuntoCash permite para cada moneda, contra el peso cubano, en toda la red. Sin rango, nadie cotiza esa moneda. |
| **Tasa efectiva** | La tasa que una sede aplica realmente y exhibe en su tablero, siempre contenida en su rango. |
| **Contenido público de sede** | Tasas en vigor, datos de contacto y horario, y promociones vigentes de una sucursal; origen único para kiosco y Pantalla. |
| **Promoción** | Campaña con fecha de inicio y fin que una sucursal exhibe mientras está vigente. De sede o de red, según quién la publique. |
| **Solicitud de aprobación** | Una diferencia de efectivo que registró un trabajador —un ajuste durante la jornada, una diferencia de cierre o una diferencia de apertura— y que espera el visto bueno de la administración. Resolverla deja constancia de la decisión; no cambia la caja. |
| **Cierre** | El conteo del efectivo con que el trabajador termina su jornada: moneda por moneda, lo contado contra lo que dicen los libros, y un motivo para lo que no cuadra. Es lo que en otros sitios se llama *arqueo*; en Cuba se dice cierre, y así lo nombra el producto. |
| **Forzar cierre** | Acción del Admin que cierra una Jornada que el Worker dejó abierta, con motivo obligatorio y sin contar el efectivo: un **cierre forzado**. Queda pendiente de conciliar hasta que la apertura siguiente cuenta la caja. |
| **Suspender** | Acción de PuntoCash sobre un operador o una sede que corta el acceso de todos sus usuarios y trabajadores a la vez. Reversible, motivada y auditada; es su único recurso ante un problema dentro de una sede **[A14]**. |
| **Evento de auditoría** | Registro inmutable de un acto de gobierno: quién, qué, cuándo, sobre qué y por qué. |
