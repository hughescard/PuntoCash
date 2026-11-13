# Entrega · Worker, iteración 2
## Nota de entrega · 13 de noviembre de 2026

- **Qué se entrega:** la aplicación del trabajador, `/worker`, operando sobre la red real de la demostración: caja por billetes, a ciegas, con su supervisor, alertas y perfil.
- **Además:** todo lo que esta iteración cambió en **Admin de sede** y en **Super Admin**, que es mucho. §4 lo lista **cambio por cambio**, con el requisito donde leer cada uno.
- **Rama:** `worker/iteracion-2`.

---

## 1. Documentos

| Documento | Versión | Para qué |
| --- | --- | --- |
| `PuntoCash_Worker_Functional_Requirements_v1.md` | **2.0** (entregada: 1.13) | **El módulo de esta entrega.** Reescrito en el formato de los FRD de administración: una subsección por pantalla, reglas, códigos de rechazo y «Ver en la demo». Mensajes por código en el Apéndice C; cuentas en el Apéndice B |
| `../admin/PuntoCash_Admin_Sede_Functional_Requirements_v1.md` | **9.0** (entregada: 8.7) | Los cambios en Admin de sede de §4.1. Sección nueva: §20 Alertas de caja |
| `../admin/PuntoCash_Super_Admin_Functional_Requirements_v1.md` | **6.0** (entregada: 5.2) | Los cambios en Super Admin de §4.2. Sección nueva: §9.7 Denominaciones |
| `PuntoCash_Worker_PRD_v1.md` | 1.1 | Sin cambios |
| `../admin/PuntoCash_Admin_Sede_PRD_v1.md` · `../admin/PuntoCash_Super_Admin_PRD_v1.md` · `../PuntoCash_PRD_v2.md` | 1.19 · 1.2 · 2.5 | Sin cambios; solo por las reglas que citan los FRD |

- El FRD fija las reglas. **El diseño a implementar es el de la demostración**: disposición, componentes, textos y estados.
- La v2.0 del FRD de Worker reescribe la 1.13. Los códigos se conservan donde el requisito sigue; los retirados están al final de su tabla de versiones y no se reutilizan.
- En Admin y Super Admin, la fila 9.0 y la 6.0 de su tabla de versiones resumen lo mismo que §4, numerado.

---

## 2. Vistas de Worker

Worker es de escritorio: referencia a 1280px.

| Vista | Ruta | FRD | Qué hace el trabajador |
| --- | --- | --- | --- |
| Acceso | `/worker/login`, `/verificacion`, `/recuperar-acceso` | §2 | Entra en un equipo vinculado, con usuario o correo y segundo factor; recupera su contraseña |
| Inicio | `/worker/inicio` | §4 | Ve su jornada, las alertas de su caja y las tasas de hoy con su hora, y qué monedas no se cambian hoy y por qué |
| Nueva operación | `/worker/nueva-operacion`, `/solicitud` | §5 | Elige el servicio; busca la solicitud que un cliente dejó en el kiosco |
| Cambio de moneda | `/worker/nueva-operacion/cambio-moneda` | §7 y §6 | Compra, venta o entre dos divisas; «Entregar» o «Recibir un importe»; paso Efectivo con billetes y vuelto |
| Cobrar remesa | `/worker/nueva-operacion/remesas` | §8 y §6 | Paga una remesa con billetes |
| Giros | `/worker/nueva-operacion/giros`, `/enviar`, `/cobrar` | §9 y §6 | Envía o paga un giro con billetes |
| Caja | `/worker/caja` | §10.1 | Ve su caja **sin cifras**: abierta o no, monedas, movimientos y lo pendiente |
| Abrir jornada | `/worker/caja/fondeo-inicial` | §10.3 | Cuenta billete a billete contra lo que dejó el cierre anterior; explica las diferencias |
| Reposición o retiro | `/worker/caja/fondos` | §10.4 | Registra el efectivo que trae o se lleva el supervisor, que lo confirma |
| Cambio de billetes | `/worker/caja/cambio-de-billetes` | §10.5 | Cambia billetes con el supervisor sin cambiar el total |
| Arqueo y cierre | `/worker/caja/arqueo-cierre` | §10.6 | Cuenta a ciegas y cierra en un solo acto; los motivos, después |
| Recuento | (dentro de una operación o de Caja) | §10.7 | Cuenta la moneda entera con el supervisor cuando saldrían billetes que los libros no tienen |
| Añadir moneda | `/worker/caja/anadir-moneda` | §10.8 | Habilita en su caja una moneda de la sede |
| Movimientos | `/worker/caja/movimientos/{id}` | §10.9 | Detalle de un movimiento interno |
| Operaciones | `/worker/operaciones`, `/{codigo}` | §14 | Su historial y el detalle, con la liquidación y el comprobante |
| Perfil | `/worker/perfil`, `/editar`, `/contrasena` | §13 | Cambia su nombre de usuario, su teléfono y su contraseña |

Ya no existen: «Ajustar efectivo», Tasas (`/worker/tasas`), Alertas (`/worker/alertas`) y el simulador de vinculación.

---

## 3. Decisiones que conviene conocer

| Decisión | Dónde |
| --- | --- |
| **Worker opera a ciegas**: no ve ningún saldo, ni en pantalla ni en los datos que recibe. Quien ve las cifras es la administración | Worker §1.6 |
| **La caja lleva billetes**: todo movimiento registra cuántos de cada denominación, y la caja tiene inventario por denominación | Worker §10.2; Admin **FR-AD-CAJA-18** |
| Las **denominaciones** las mantiene **PuntoCash** para toda la red, como el catálogo de monedas | Super Admin §9.7 |
| La apertura se cuenta **una vez** contra lo que dejó el cierre; el cierre es **un solo acto** y los motivos llegan después, o queda «Sin explicar» | Worker §10.3, §10.6; Admin **FR-AD-APR-18** |
| Lo que trae, se lleva o cambia el supervisor **solo lo confirma el supervisor que nombró el trabajador** | Worker §10.4–10.5; Admin **FR-AD-APR-17** |
| Si saldrían billetes que los libros no tienen, **antes se cuenta la moneda entera** con el supervisor (recuento) | Worker §10.7 |
| Un pago es **exacto o no se paga**: si la caja no tiene con qué, se ofrece otra salida o queda pendiente; a favor de la casa solo queda el redondeo | Worker §6.4 |
| Rechazar una diferencia la deja como **incidencia** del trabajador, visible en su ficha | Admin **FR-AD-TRAB-18** |
| Las **alertas** las define la sede en una sección propia; la administración las ve con cifras y el trabajador sin ellas | Admin §20; Worker §12 |
| El trabajador cambia **su usuario y su teléfono**, no su nombre ni su documento, que son los que dan la trazabilidad | Worker §13; Admin **FR-AD-TRAB-19** |
| El **cierre forzado** se le avisa al trabajador al instante, y lo que intentaba registrar no se registra | Worker §11 |

---

## 4. Cambios en Admin de sede y en Super Admin

Esta iteración tocó mucho las dos consolas, porque todo lo que hace el trabajador lo ve y lo gobierna la administración. Cada fila es un cambio; «Dónde leerlo» lleva al requisito.

### 4.1 Admin de sede (FRD 8.7 → 9.0)

**Navegación y reglas de toda la consola**

| Cambio | Dónde leerlo |
| --- | --- |
| **Alertas** entra en el menú, grupo Configuración, después de Tasas (14 destinos; 13 en el teléfono) | **FR-AD-SHELL-2**, §1.3 |
| Rutas nuevas: `/admin/cajas/[id]`, `/admin/alertas`, `/admin/alertas/[sedeId]` | **FR-AD-NAV-1** |
| El selector de alcance también filtra Alertas | **FR-AD-SCOPE-4** |
| En Sedes, el selector de la cabecera **se ve desactivado**, porque la lista ya es de todas las sedes | **FR-AD-SCOPE-8** (nuevo) |
| **Tablas**: si la fila tiene ficha, **la fila entera** la abre y sus acciones van en la ficha; si no tiene ficha, las acciones van en un menú «⋯» al final de la fila, aunque sea una sola | **FR-AD-SHELL-18** (nuevo) |
| **Botones** uno al lado del otro, también en el teléfono; un texto largo pasa a dos líneas dentro del botón. Los avisos que enumeran cajas o tasas ponen **una por línea** | **FR-AD-SHELL-19** (nuevo) |
| Equipos, Monedas y Tasas: las acciones de cada fila pasan al menú «⋯» | §3.1, §9.1, §10.2 |
| Los códigos de operación usan la **hora de Cuba** | §13 |

**Cajas**

| Cambio | Dónde leerlo |
| --- | --- |
| La lista de Cajas enseña el **efectivo** de cada caja, y cada fila abre su ficha | **FR-AD-CAJA-1** |
| **Ficha de caja** nueva: estado ahora, alertas, efectivo por moneda **con sus billetes**, pendiente de aprobar, últimos movimientos, jornadas anteriores | §4.6, **FR-AD-CAJA-15** a **-18** (nuevos) |
| «Retirar» y «Reactivar» una caja pasan a su ficha | **FR-AD-CAJA-7**, **-12** |
| Una reposición o un retiro **no se llaman sobrante ni faltante** | **FR-AD-CAJA-16** |
| La ficha tiene cifras; el trabajador, la misma caja sin ellas | **FR-AD-CAJA-17** |
| PuntoCash ve la misma ficha, sin acciones | **FR-AD-CAJA-19**; Super Admin **FR-SA-EQ-10** |

**Inicio y Sedes**

| Cambio | Dónde leerlo |
| --- | --- |
| Inicio tiene una entrada nueva, **«Caja con alertas»** (fila 9; las siguientes se renumeran) | §5.1 |
| La ficha de sede tiene nueve bloques: entra **Alertas de caja**, que las **consulta** (activas por caja y enlace «Ver en Alertas»); se definen en Alertas | **FR-AD-SEDE-3**, **-7**, **-17** (nuevo) |

**Trabajadores**

| Cambio | Dónde leerlo |
| --- | --- |
| **Incidencias**: columna en la lista y bloque en la ficha con las diferencias rechazadas del trabajador | **FR-AD-TRAB-18** (nuevo) |
| El trabajador cambia **él mismo** su nombre de usuario y su teléfono; queda en la auditoría como suyo. El nombre y el documento solo los cambia la administración | **FR-AD-TRAB-19** (nuevo) |

**Jornadas**

| Cambio | Dónde leerlo |
| --- | --- |
| La lista enseña al abrir «Billetes distintos · total sin diferencia» cuando solo cambió la composición | §12.1 |
| La apertura guarda por moneda **el motivo** (reposición, retiro, faltante, sobrante, otro), **el supervisor** nombrado y **los billetes** dejados y contados | §12.3, **FR-AD-JOR-19** |
| El detalle enseña **los billetes** de la apertura, de cada movimiento y del cierre | **FR-AD-JOR-21** (nuevo) |
| El cierre ahora lo hace **el trabajador en Worker**, a ciegas y en un solo acto; el detalle lo muestra así | **FR-AD-JOR-22** (nuevo) |
| Movimientos nuevos: reposición, retiro y cambio de billetes (tipo «Cambio»: no entra ni sale); el detalle de un movimiento dice qué fue, sus billetes, el recuento si lo hubo, el supervisor y su aprobación | **FR-AD-JOR-17**, §12.4 |
| Forzar un cierre **se le avisa al trabajador** al instante | **FR-AD-JOR-14** |

**Operaciones**

| Cambio | Dónde leerlo |
| --- | --- |
| El detalle enseña **la liquidación** (lo que entró y salió de verdad, el vuelto) y **los billetes** de la operación | **FR-AD-OPS-10** (nuevo) |

**Aprobaciones**

| Cambio | Dónde leerlo |
| --- | --- |
| **Sale «Ajuste de efectivo»**; los tipos son: diferencia de apertura, de cierre, **de composición**, **movimiento de fondos** y **diferencia en recuento** | **FR-AD-APR-1** |
| Un movimiento de fondos **solo lo resuelve el supervisor que nombró el trabajador**; otro administrador lo ve pero no lo resuelve (código `solo-el-supervisor`) | **FR-AD-APR-17** (nuevo), Apéndice C |
| Si el trabajador no explica una diferencia, llega como **«Sin explicar»** | **FR-AD-APR-18** (nuevo) |
| Filtros por los tipos nuevos; el detalle enseña la referencia según el tipo, el supervisor y **los billetes** | **FR-AD-APR-4**, **-8**, **-9** |
| **Rechazar** deja la diferencia como **incidencia** del trabajador | §14.4; **FR-AD-TRAB-18** |

**Alertas de caja (sección nueva)**

| Cambio | Dónde leerlo |
| --- | --- |
| Tres alertas: **efectivo bajo**, **efectivo alto** y **pocos billetes** de una denominación; solo con la jornada abierta; son un estado, no un aviso que se archiva | §20.1, **FR-AD-ALE-1** a **-4** |
| Pantalla **Alertas**: activas ahora, reglas por sede e historial | §20.2, **FR-AD-ALE-5** |
| **Definir** las alertas de una sede, por moneda: mínimo, máximo y mínimo de billetes por denominación | §20.3 |
| Historial calculado de los movimientos y de las versiones de las reglas | §20.4 |
| Auditoría `caja.alertas-definidas` | §20.5 |

**Modelo, dependencias y mensajes**

| Cambio | Dónde leerlo |
| --- | --- |
| Entidades nuevas `Denominacion`, `Billetes`, `ReglasDeAlerta`; `SolicitudAprobacion` con los tipos nuevos | §16 |
| Dependencias y comportamiento crítico de aceptación (puntos 27 a 29) | §18, §19 |
| Términos nuevos y códigos nuevos (`solo-el-supervisor`, bloque de Alertas) | Apéndices A y C |

### 4.2 Super Admin (FRD 5.2 → 6.0)

| Cambio | Dónde leerlo |
| --- | --- |
| **Denominaciones**: tercera pestaña de Monedas y tasas. PuntoCash mantiene los billetes y monedas de cada divisa para toda la red: **añadir** (tipo y valor, hasta 2 decimales, sin motivo), **retirar** con motivo —dice cuántas unidades quedan en cajas abiertas, que las conservan— y **reincorporar** | §9.7, **FR-SA-DEN-1** a **-8** (nuevos) |
| Una moneda nueva del catálogo llega **sin denominaciones**, y su tarjeta lo avisa | **FR-SA-DEN-8** |
| Auditoría `denominacion.alta`, `.retirada`, `.reincorporada`; retirar pide motivo | §9.8, **FR-SA-STATE-2** |
| Códigos de denominaciones con sus mensajes | Apéndice C, bloque «Denominaciones» |
| **Ficha de caja** de solo lectura, `/super-admin/sedes/[id]/cajas/[cajaId]`: la misma que ve el mercante, con cifras y alertas, sin acciones | **FR-SA-EQ-10** (nuevo), **FR-SA-NAV-1** |
| Se llega a esa ficha desde la ficha de sede y desde cada fila de Cajas y equipos | **FR-SA-SEDE-13**, §6 |
| En la ficha de sede, una caja cerrada dice **cuándo y quién** la cerró y **lo que quedó dentro**; tras un cierre forzado, «sin contar»; sin ninguna jornada, «Sin jornadas todavía» | **FR-SA-SEDE-13** |
| **Aprobaciones**: los tipos son los de la caja por billetes (apertura, cierre, composición, movimiento de fondos, recuento); sale el «ajuste» | **FR-SA-APR-1** |
| El detalle de una aprobación enseña la **referencia según el tipo** y **los billetes** | **FR-SA-APR-3** |
| La resolución guarda **la cuenta** de PuntoCash que la resolvió, no solo su nombre | **FR-SA-APR-5** |
| El detalle de una jornada enseña **los billetes** y el cierre hecho en Worker | **FR-SA-JOR-3** |
| El detalle de una operación enseña **la liquidación** | **FR-SA-OPS-2** |
| **Auditoría**: tipos nuevos —denominaciones, `caja.alertas-definidas`, `trabajador.datos-propios`, `trabajador.contrasena-cambiada`— | **FR-SA-AUD-2** |
| Auditoría: un tercer autor, **el trabajador**, en lo que cambia de sí mismo; el filtro «Quién actuó» tiene **«Solo trabajadores»** | **FR-SA-AUD-1**, **-3**, **-10** |
| La ficha del trabajador avisa que su usuario y su teléfono los puede cambiar él | **FR-SA-TRAB-3** |
| **Tablas**: la fila entera abre su ficha en todos los listados y en las listas de las fichas (cajas y promociones de una sede, sedes y administradores de un operador); Jornadas pierde su enlace duplicado; las acciones de los rangos van en «⋯». Excepción: la matriz de Servicios | **FR-SA-SHELL-10** (nuevo), **FR-SA-SHELL-9** |
| **Botones** uno al lado del otro; una caja por línea en los avisos | **FR-SA-SHELL-11** (nuevo) |
| Cuentas de demostración: cajas con alertas | Apéndice B |

---

## 5. Demostración

| Consola | Cuenta | Papel |
| --- | --- | --- |
| Worker | `jperez`, `lgomez`, `afonseca` (Vedado); `mrivas`, `cdiaz` (Obispo); resto en el Apéndice B del FRD de Worker | Trabajadores |
| Admin de sede | `marta@malecon-sf.cu` | Principal de Malecón Servicios Financieros (Vedado y Obispo); puede ser la supervisora que nombra el trabajador |
| Super Admin | `emarrero@puntocash.com` | Principal de PuntoCash |

Contraseña `puntocash`, código `123456`. En un navegador sin vincular, Worker ofrece «Demostración · usar un equipo ya vinculado».

**Arrancar.** `npm install`, `npm run build` y `npm start` (o `npm run dev`). Si ya tenías el servidor de desarrollo, páralo y borra `.next` antes de arrancar: hay rutas que ya no existen. La demostración trabaja en memoria y siembra jornadas y operaciones respecto a la hora actual, así que lo que se ve cambia a lo largo del día.

**Pruebas.** `npm run typecheck` y `npm run test:ui`, contra la compilación de producción. Worker se prueba en un segundo servidor con `PUNTOCASH_PRUEBAS=1` (puestos de prueba aislados y rutas `/pruebas/*`, que sin esa variable responden 404). Resultado del 13/11: **Worker 342 pasan; consolas 503 pasan y 1 se salta**. Una pasada cortada a medias deja estado en memoria (por ejemplo, un cierre forzado): reinicia el servidor antes de repetir.

---

## 6. Fuera de esta entrega

| Asunto | Estado |
| --- | --- |
| **Billetes en el kiosco** de autoservicio | Siguiente bloque |
| **Incidencias** del trabajador en la ficha de Super Admin | Pendiente: hoy solo en Admin |
| Diseño final del **comprobante** impreso | Pendiente; hoy lleva los datos y la liquidación |
| Aviso **en vivo** del cierre forzado: hoy Worker pregunta cada 5 segundos | Para producción (**FR-CF-6**, Worker §16) |
| Evaluación de las **alertas en el servidor** y notificaciones | Para producción |
| Backend y persistencia reales | Pendientes en todo el producto |
| Worker en tableta o teléfono | No se prueba: Worker es de escritorio |
