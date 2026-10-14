# PuntoCash — Administración de sede
## Alcance pendiente · Requisitos funcionales de lo todavía no construido · v1.0

**Estado:** **Especificación. Nada de lo que contiene este documento está construido.** Cada una de sus siete áreas tiene ruta en la consola y muestra hoy una pantalla de «en construcción».

**Destinatarios:** Desarrollo de backend y modelado de datos, principalmente. También QA, para saber qué **no** debe probar en esta entrega.

**Alcance:** Las siete secciones de `/admin` que quedaron fuera de la entrega parcial del 14/10/2026 — Jornadas, Aprobaciones, Operaciones, Monedas, Tasas, Promociones y Reportes.

**Por qué existe este documento y no una sección más del FRD.** El FRD entregado describe únicamente pantallas que se pueden abrir y recorrer, porque es el documento contra el que se implementa y contra el que se acepta: un requisito que promete una pantalla inexistente convierte cada lectura en una comprobación de si eso existe o no. Pero estos requisitos ya están pensados y revisados, y **el modelo de datos los necesita**: quien diseñe las tablas de la jornada, de la aprobación o del par de cotización tiene que saber hoy lo que esas pantallas van a pedir mañana, o construirá un esquema que habrá que migrar. Así que se separan sin perderse.

**Cómo se relaciona con el FRD entregado.** Los códigos de requisito **no cambian**: `FR-AD-JOR-*`, `FR-AD-APR-*`, `FR-AD-OPS-*`, `FR-AD-MON-*`, `FR-AD-TASA-*`, `FR-AD-PROM-*` y `FR-AD-REP-*` siguen siendo los mismos que citan el FRD, el PRD y el código. Lo único que se renumera son los números de sección, que aquí van de §1 a §7. La correspondencia, para quien venga de una versión anterior del FRD:

| Antes (FRD v5.2) | Aquí |
| --- | --- |
| §9 Jornadas · §9.1 Forzar cierre | §1 · §1.1 |
| §10 Aprobaciones | §2 |
| §11 Operaciones | §3 |
| §12 Monedas | §4 |
| §13 Tasas | §5 |
| §14 Promociones | §6 |
| §15 Reportes | §7 |

**Documentos relacionados:** `PuntoCash_Admin_Sede_Functional_Requirements_v1.md` (FRD de lo construido) define el comportamiento global —shell, rutas, alcance, estados, errores— que estos requisitos dan por existente; **ese documento manda sobre todo lo transversal** y aquí no se repite. `PuntoCash_Admin_Sede_PRD_v1.md` define el producto, los conceptos y las reglas **A1–A14**.

**Cómo leer este documento.** Igual que el FRD: requisitos numerados `FR-AD-<área>-<n>`, "debe" para comportamiento obligatorio, reglas de administración como **[A#]** y de producto como **[R#]**. Lo que no está aquí tampoco está definido: la ausencia de un requisito significa que la capacidad no ha sido diseñada, no que quede a criterio de quien la implemente.

---

## 0. Lo que estas siete secciones dependen de que exista

No son siete trozos independientes. Tres dependencias ordenan el trabajo, y conviene verlas antes de estimar nada.

**El enlace Caja→Sede es la pieza de debajo.** El dominio de la Fase 1 no lo tiene: una Caja no pertenece a ninguna Sede. Sin él, ninguna consulta de jornadas, movimientos ni operaciones puede acotarse por sede, y por tanto §1, §2 y §3 no pueden ni listarse. Es lo primero. El FRD entregado lo recoge en **FR-AD-DOM-3**, y es además lo que cierra el hueco que el kiosco dejó anotado en **FR-AS-DOM-11**.

**Monedas (§4) va antes de Tasas (§5), y no al revés.** Un par solo puede definirse con monedas que ya estén en la lista de la sede; retirar una moneda arrastra los pares que la usan. Construir Tasas primero obligaría a inventar una lista de monedas provisional y a rehacerla después.

**Tasas (§5) es lo que cierra el defecto público del producto.** Hoy el tablero de una sucursal —el del kiosco y el de la pantalla informativa— lee cifras fijas del código, distintas de las que esa sede cotiza. **FR-AD-DOM-7** exige que ese contenido se sirva desde este dominio como único origen; eso solo es posible cuando los pares y sus tasas existen, es decir aquí. Mientras no ocurra, el defecto sigue documentado en **FR-PANT-IMP-4** y **[A12]** sigue incumplida en la demostración.

**Y dos datos que el FRD entregado no puede mostrar hasta que estas secciones existan**, y que hoy no se inventan: el **estado de la jornada** de cada caja en la pestaña de Equipos (**FR-AD-EQ-5**) y en la tabla por sede del Inicio (**FR-AD-HOME-6**), que llega con §1; y las **solicitudes generadas en el periodo** por cada kiosco (**FR-AD-EQ-12**), que llega con §2 y §3. Por eso el aviso de **FR-AD-EQ-10** se da siempre al desvincular, en lugar de darse solo cuando hay jornada abierta y callarse cuando no se sabe.

---

## 1. Jornadas

**FR-AD-JOR-1** `/admin/jornadas` lista las jornadas de las cajas del alcance con: sede, caja, trabajador, fecha, hora de apertura, hora de cierre, estado (abierta / cerrada / cerrada forzosamente), operaciones, movimientos y diferencia de arqueo si está cerrada.

**FR-AD-JOR-2** Filtros: rango de fechas, sede, caja, trabajador, estado, y un conmutador "solo con diferencia". Orden por defecto: las abiertas primero, después las cerradas por fecha descendente.

**FR-AD-JOR-3** La diferencia de arqueo se representa con el mismo tratamiento semántico que en Worker —signo, color y magnitud— y por moneda, nunca agregada.

**FR-AD-JOR-4** `/admin/jornadas/[id]` muestra: cabecera con sede, caja, **equipo en el que se operó**, trabajador, apertura y cierre; fondeo inicial por moneda; saldos actuales o finales por moneda; el **libro de movimientos**; y, si está cerrada, el **arqueo** con conteo declarado, saldo esperado y diferencia por moneda.

**FR-AD-JOR-5** El libro de movimientos reutiliza la tabla y los filtros de Worker (`caja-movements-table`, `caja-movements-filters`) en solo lectura, y cada movimiento enlaza a su detalle, también de solo lectura.

**FR-AD-JOR-6** Toda cifra proviene de la instantánea almacenada y nunca se recalcula contra el estado vivo **[R9]**.

### 1.1 Forzar cierre

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

## 2. Aprobaciones

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

## 3. Operaciones

**FR-AD-OPS-1** `/admin/operaciones` lista las operaciones completadas en las sedes del alcance, con: código, fecha y hora, sede, caja, trabajador, servicio, cliente, importe y moneda, y estado.

**FR-AD-OPS-2** Filtros: rango de fechas, sede, caja, trabajador, servicio y estado, más búsqueda por código. Reutiliza el patrón de `operations-filters` de Worker, ampliado con sede, caja y trabajador — dimensiones que allí no existen porque siempre son una sola **[R12]**.

**FR-AD-OPS-3** `/admin/operaciones/[codigo]` muestra el detalle **reutilizando las vistas de Worker** (`operation-detail-view` y las especializadas de cambio de moneda, remesas y las dos variantes de giro) en solo lectura.

**FR-AD-OPS-4** El detalle añade el contexto que el Admin necesita y el Worker no: sede, caja, trabajador, jornada (con enlace) y, cuando la operación provino de una solicitud de kiosco, **el código `KS-` y el kiosco que la generó** **[FR-AS-DOM-11]**.

**FR-AD-OPS-5** El detalle **no** ofrece ninguna acción: ni reimprimir, ni anular, ni corregir, ni reenviar al proveedor **[A6]**, **[A7]**.

**FR-AD-OPS-6** Toda cifra y todo dato provienen de la instantánea histórica **[R9]**, **[R2]**.

**FR-AD-OPS-7** Los estados se muestran siempre traducidos, nunca como enum en bruto **[R10]**.

---

## 4. Monedas

La **lista de monedas que maneja cada sucursal**. Es una lista de monedas sueltas, no de pares: los pares se definen en Tasas (§5) **[A4]**.

**FR-AD-MON-1** `/admin/monedas` gestiona, por cada sede del alcance, qué monedas maneja esa sede. Muestra las monedas de la lista con su código, su nombre y en cuántas cajas de la sede está habilitada hoy cada una.

**FR-AD-MON-2** **Esta lista es lo que un Worker puede añadir a su caja.** El "catálogo" del que habla **FR-CAJA-13** del FRD de Worker —"ofrece únicamente monedas del catálogo"— deja de ser una constante del código y pasa a ser esta lista, resuelta por la sede de la caja. Lo mismo rige para el fondeo inicial, que recoge un importe por cada moneda habilitada (**FR-CAJA-8**).

**FR-AD-MON-3** Las monedas se eligen del **catálogo de monedas que la plataforma soporta**, mantenido por PuntoCash (**FR-SA-MON-1**). El Admin no inventa monedas: elige de las que existen.

**FR-AD-MON-4** Añadir una moneda a la lista de una sede **no la habilita en ninguna caja ni crea ningún saldo**: solo la pone a disposición de sus Workers. Quien la habilita en una caja concreta, y la fondea, es el Worker desde su propia pantalla de Caja **[A6]**. La pantalla debe decirlo, porque es la confusión más probable: "Añadir una moneda aquí no la activa en ninguna caja. Cada trabajador la habilita en la suya cuando la necesite."

**FR-AD-MON-5** **Esta lista no depende del servicio de Cambio de moneda.** Una sede necesita monedas para cualquier servicio que mueva efectivo —una remesa se paga en una moneda, un giro también—, así que la lista está disponible en toda sede activa. Lo que sí depende de ese servicio son los **pares** de §5. (*Esto matiza lo acordado en la v3.0, donde las monedas quedaban condicionadas al servicio de Cambio de moneda; con la lista redefinida como "lo que un Worker puede tener en su caja", esa condición dejaría a una sede de solo remesas sin poder manejar efectivo. Pendiente de confirmación del negocio.*)

**FR-AD-MON-6** **Retirar** una moneda de la lista exige confirmación y tiene efecto solo hacia adelante: impide que un Worker la añada a una caja en lo sucesivo. **No toca ningún saldo existente, ninguna caja que ya la tenga habilitada, ni un solo registro histórico** **[R9]**, **[A7]**.

**FR-AD-MON-7** No es posible retirar una moneda que alguna caja de la sede tenga **habilitada con saldo distinto de cero**. El intento se rechaza nombrando las cajas: "La {moneda} tiene saldo en {cajas}. Debe quedar en cero antes de retirarla de la lista." **[R6]**.

**FR-AD-MON-8** Retirar una moneda **retira también los pares de §5 que la usan**, porque un par sin una de sus monedas no puede cotizarse. La confirmación debe nombrarlos uno a uno antes de aceptar: "Se retirarán también estos pares: USD/CUP, USD/EUR."

**FR-AD-MON-9** No es posible retirar la **última moneda** de una sede activa: dejaría una casa de cambio sin poder manejar efectivo de ningún tipo. El intento se rechaza con una explicación.

**FR-AD-MON-10** Todo cambio genera un evento de auditoría **[RP-21]**.

---

## 5. Tasas

Donde el Admin **define los pares que su sede cotiza y la tasa de cada uno**. Gobierna dos cosas a la vez que hasta ahora estaban separadas: lo que la sede **cotiza** y lo que su tablero **exhibe**. Son el mismo dato **[A12]**, **[RP-25]**.

**FR-AD-TASA-1** `/admin/tasas` lista, por cada sede del alcance, los pares que esa sede tiene definidos, con: monedas del par, tasa de compra, tasa de venta, el rango permitido por PuntoCash, fecha y autor del último cambio, e indicador de si fue fijada automáticamente. Ofrece **Definir par**.

**FR-AD-TASA-2** Un par solo puede definirse si se cumplen **las tres condiciones**, y la pantalla debe decir cuál falta en cada caso, nunca limitarse a no ofrecer la opción **[FR-AD-STATE-6]**:

1. **Ambas monedas están en la lista de la sede** (§4). Si falta una, el mensaje debe enlazar a `/admin/monedas`: "La {moneda} no está en la lista de esta sede. Añádela antes de definir el par."
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

**FR-AD-TASA-13** **Retirar un par** exige confirmación y advierte de su efecto hacia adelante: la sede deja de poder cotizarlo y desaparece de su tablero. No afecta a las operaciones ya registradas de ese par **[R9]**. Retirar un par **no** retira sus monedas de la lista de §4: la sede sigue pudiendo manejarlas en caja.

**FR-AD-TASA-14** Si PuntoCash **deshabilita el servicio** de Cambio de moneda en una sede, sus pares dejan de exhibirse y de poder cotizarse de inmediato, sin que el Admin los retire uno a uno. La pantalla debe reflejar ese estado y **conservar los pares definidos** para cuando el servicio vuelva a habilitarse.

**FR-AD-TASA-15** Si PuntoCash **retira el rango** de un par que alguna sede tiene definido, ese par deja de cotizarse en esas sedes y sus Admins deben verlo marcado con la razón. No se borra: si el rango vuelve, el par vuelve con su última tasa, revalidada contra el rango nuevo.

**FR-AD-TASA-16** Todo cambio genera un evento de auditoría **[RP-21]**.

**FR-AD-TASA-17** Esta pantalla gobierna la tasa; **no** gobierna comisiones ni cargos por servicio, que son competencia de PuntoCash **[A8]**.

---

## 6. Promociones

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

## 7. Reportes

**FR-AD-REP-1** `/admin/reportes` presenta el volumen del alcance en cuatro cortes: **por sede**, **por servicio**, **por trabajador** y **por día**. El corte se elige; no se muestran los cuatro a la vez.

**FR-AD-REP-2** Todo reporte se acota a un rango de fechas, con accesos rápidos a hoy, últimos 7 días, últimos 30 días y mes en curso.

**FR-AD-REP-3** Las cifras se expresan **por moneda**, sin convertir a una moneda única **[FR-AD-HOME-1]**.

**FR-AD-REP-4** Cada corte muestra número de operaciones e importe por moneda. El corte por día añade una representación temporal; los cortes por sede y por trabajador admiten ordenación por cualquier columna.

**FR-AD-REP-5** Toda representación gráfica sigue el sistema visual del manual de marca, sin paleta propia ni elementos decorativos que compitan con las cifras.

**FR-AD-REP-6** Los reportes **no** muestran comisiones, rentas, liquidaciones ni margen **[A8]**.

**FR-AD-REP-7** Esta versión **no incluye exportación a archivo** **[R11]**, y la interfaz no ofrece ningún control de descarga. Pendiente de decisión de negocio (PRD de Admin de sede §6).

---

## 8. Lo que estas secciones no cambian

Nada de lo especificado aquí altera el comportamiento global que el FRD entregado fija, y conviene decirlo porque siete secciones nuevas son la ocasión típica de que se rompa algo transversal.

El **alcance** se resuelve en el dominio y no en la pantalla (**FR-AD-DOM-5**): toda consulta de estas siete secciones recibe el alcance de la sesión y no devuelve un solo registro fuera de él. El **selector de alcance** las filtra a todas, porque todas son datos de sede (**FR-AD-SCOPE-4**). Las pantallas se componen con el mismo shell y las mismas piezas (**FR-AD-SHELL-1**), son utilizables desde **360px** (**FR-AD-SHELL-6**) y sus tablas se representan como tarjeta por fila en pantalla pequeña (**FR-AD-SHELL-13**). Sus cuatro estados de tabla, sus confirmaciones y su trato de los errores son los de **FR-AD-STATE-1 a 8**.

Y ninguna de ellas rompe los dos límites del rol. **No se opera caja** desde ninguna: Jornadas enseña y fuerza un cierre, Aprobaciones resuelve una solicitud, Operaciones solo lee **[A6]**. Y **nada añade, modifica ni recalcula un registro del Worker**: forzar un cierre y resolver una aprobación añaden hechos nuevos junto a los suyos, con nombre, fecha y motivo **[A7]**, **[R9]**.

