# PuntoCash — Pantalla informativa de la sede
## Documento de Requisitos Funcionales (FRD) · v2.1

**Alcance:** la pantalla informativa no táctil de una sede, `/kiosk/pantalla`: elegir su sede, y mostrar en rotación sus tasas, sus datos y sus promociones. El kiosco táctil de autoservicio tiene su propio documento.

**Destinatarios:** desarrollo backend y frontend, y QA. Es la especificación contra la que se implementa y se acepta.

**Documentos relacionados:**

| Documento | Qué define |
| --- | --- |
| `../PuntoCash_PRD_v2.md` | El producto completo y las reglas **R1–R13**, citadas aquí como **[R#]** |
| `PuntoCash_Kiosk_Autoservicio_Functional_Requirements_v1.md` (2.0) | El kiosco de autoservicio, que muestra el mismo tablero de tasas (**FR-AS-NAV-2**) |
| `../admin/PuntoCash_Admin_Sede_Functional_Requirements_v1.md` | Las tasas que fija el operador de la sede (**FR-AD-TASA-***), sus promociones (**FR-AD-PROM-***), la ficha de la sede y las tarifas que ve su administración (**FR-AD-TAR-***) |
| `../admin/PuntoCash_Super_Admin_Functional_Requirements_v1.md` | El registro de sedes de la red, su estado, las promociones de red y la tarifa de giros (**FR-SA-TAR-***) |

## Cómo leer este documento

- Cada requisito tiene un código `FR-PANT-<área>-<n>`. «Debe» indica comportamiento obligatorio.
- El documento fija las **reglas**: qué muestra la pantalla, de dónde sale y cuándo cambia.
- Los **textos y la disposición** están en la **demostración**, que es la referencia de diseño. Los mensajes están en el **Apéndice C**.
- Cada **«Ver en la demo»** dice qué hacer para ver ese caso. Las sedes y cuentas de la demostración están en el **Apéndice B**.

## Versiones

| Versión | Fecha | Cambio |
| --- | --- | --- |
| 2.1 | 24/11/2026 | **Diapositiva de tarifas de giros.** Entra en el carrusel justo después de Tasas del día cuando la sede ofrece Giros y tiene al menos una moneda con tarifa (**FR-PANT-CAR-1**, **FR-PANT-TARIFAS-1** a **TARIFAS-3**, nuevos). Sus datos llegan y se refrescan como los demás (**FR-PANT-DATA-9**, nuevo) |
| 2.0 | 23/11/2026 | **Documento reescrito** en el formato de los FRD de Worker y de administración, describiendo el sistema y no la demostración. Lo que cambia de fondo: (1) **Los datos son de la red**: el tablero es el que fija el operador de la sede, los datos de la sede salen del registro de sedes y las promociones son las vigentes de esa sede; la pantalla los vuelve a pedir cada 30 s y los cambios aparecen sin recargar (§7). (2) **El tablero coincide con lo que se aplica**: son las mismas tasas en vigor con las que cotizan la caja y el kiosco (**FR-PANT-TASAS-1**, **TASAS-3**). (3) **Cada promoción es su propia diapositiva**, con imagen si la tiene, y sin promociones no hay diapositiva; la de tasas solo entra si la sede publica tasas (**FR-PANT-CAR-1**, **FR-PANT-PROMO-1**). (4) **Sede que no atiende**: la pantalla lo dice en lugar de anunciar tasas y promociones (**FR-PANT-SEDE-8**, nuevo). (5) **Sede cerrada**: desaparece del selector, y una pantalla que la mostraba vuelve a pedir sede con un aviso (**FR-PANT-SEDE-2**, **SEDE-4**). (6) **La pantalla guarda solo qué sede eligió**; el nombre, la ficha y si atiende los da el servidor cada vez (**FR-PANT-SEDE-4**) |
| 1.4 | 22/09/2026 | Selección de sede en el propio equipo |
| 1.3 | 22/09/2026 | El tablero debe mostrar las mismas tasas con las que cotiza la sede |
| 1.2 | 22/09/2026 | Origen único y compartido de tasas, sedes y promociones |
| 1.1 | 22/09/2026 | Separación entre la demostración y el producto |
| 1.0 | 21/09/2026 | Primera versión |

**Requisitos retirados en la 2.0**, cuyos códigos no se reutilizan:

- **FR-PANT-SEDE-7** (catálogo de sedes y almacenamiento de la demostración): es de la demostración, Apéndice B.
- **FR-PANT-DATA-1** y **FR-PANT-DATA-6** (datos fijos en el código y comportamiento provisional): los datos son de la red (§7).
- **FR-PANT-IMP-3** (sede única) e **FR-PANT-IMP-4** (tablero distinto de la cotización): resueltos.

---

## 1. Comportamiento global

La pantalla es un **rótulo de solo lectura** en la sala de la sede. Muestra en rotación información pública: las tasas del día, los datos de la sede y sus promociones. No es un punto de interacción ni un canal operativo: no inicia ni toca ninguna operación, jornada o solicitud, y lo que muestra nunca alimenta una cotización (**FR-PANT-DATA-2**).

### 1.1 Disposición

**FR-PANT-LAYOUT-1 · Sin navegación.** Layout propio, fuera del shell de la aplicación: sin cabecera de navegación, perfil ni controles en su contenido. La cabecera lleva la marca PuntoCash y el reloj. Lo único interactivo es la configuración de §1.2, que no forma parte del contenido.

**FR-PANT-LAYOUT-2 · Orientación.** Horizontal, tipo televisor (referencia 32", 1920×1080 o 1366×768), y vertical, tipo tótem (1080×1920). La disposición responde a la proporción real de la pantalla, sin detectar la orientación por código.

**FR-PANT-LAYOUT-3 · Tamaños relativos.** Tipografía y espacios en unidades relativas al tamaño base de la pantalla, para que la composición se mantenga en cualquier tamaño físico.

**FR-PANT-LAYOUT-4** Legible y sin recortes en las tres resoluciones de referencia.

### 1.2 Selección de sede

La pantalla no se vincula ni tiene sesión: solo exhibe información pública. Basta con que sepa en qué sede está.

**FR-PANT-SEDE-1 · Sin sede.** La primera vez que arranca, o tras cambiar de sede, muestra el **selector de sede** en lugar del carrusel, con la cabecera.

**FR-PANT-SEDE-2 · Selector.** «¿En qué sede está esta pantalla?», cómo se cambia después, una búsqueda «Buscar por nombre, dirección o ciudad» y la lista de las **sedes de la red que no están cerradas**, cada una con nombre, dirección y localidad, del registro de sedes. La búsqueda recibe el foco, filtra mientras se escribe sin distinguir mayúsculas ni tildes («camaguey» encuentra «Camagüey») y un contador dice cuántas coinciden. Sin coincidencias, lo dice.

**FR-PANT-SEDE-3 · Mando.** Se maneja igual con el mando de la TV que con teclado, ratón o pantalla táctil: las flechas recorren la búsqueda y las sedes y Enter elige la enfocada. Con una sola coincidencia, Enter en la búsqueda la elige. Cada sede es un control de al menos 48px con foco visible.

**FR-PANT-SEDE-4 · Elegir.** Elegir una sede la asigna al equipo de inmediato, sin aprobación de nadie, y empieza el carrusel de esa sede. **El equipo guarda solo qué sede eligió**, y lo conserva tras recargas y reinicios; el nombre, la ficha y si atiende los da el servidor en cada consulta. Si la sede guardada se cierra, la pantalla vuelve al selector con el aviso de que esa sede ya no está disponible.

**FR-PANT-SEDE-5 · Cambiar.** Con **Atrás** en el mando (o Esc o Retroceso en un teclado, o el botón Atrás del navegador) se abre «¿Cambiar la sede de esta pantalla?», que nombra la sede actual, con «Seguir mostrando» (enfocado) y «Cambiar sede». Esc o «Seguir mostrando» cierran sin cambios; sin respuesta en 20 s, se cierra solo. «Cambiar sede» borra la asignación y vuelve al selector.

**FR-PANT-SEDE-6** Cualquiera con el mando puede cambiar la sede: es información pública y no afecta a ninguna operación. La confirmación evita cambios accidentales, no deliberados.

**FR-PANT-SEDE-8 · Sede que no atiende.** Si la sede está suspendida, no tiene operador o su operador está suspendido, la pantalla no muestra el carrusel sino **«En este momento no estamos atendiendo»**, con el nombre de la sede, sin decir el motivo. Vuelve sola al carrusel en cuanto la sede atiende (**FR-PANT-DATA-8**).

**Ver en la demo:** abrir `/kiosk/pantalla` en un navegador nuevo y elegir PuntoCash Vedado. Pulsar Esc para cambiarla. Elegir PuntoCash Trinidad, que está suspendida, para ver **FR-PANT-SEDE-8**.

---

## 2. Reloj

**FR-PANT-CLOCK-1** Fecha y hora siempre visibles en la cabecera; no rotan con el carrusel.

**FR-PANT-CLOCK-2** Se actualiza cada segundo con la hora del equipo.

**FR-PANT-CLOCK-3** Con el mismo formato de fecha y hora que el resto de PuntoCash.

---

## 3. Carrusel

**FR-PANT-CAR-1 · Diapositivas.** En este orden:

| Diapositiva | Cuándo entra |
| --- | --- |
| Tasas del día | Si la sede tiene al menos una tasa en vigor |
| Tarifas de giros | Si la sede ofrece Giros y tiene al menos una moneda con tarifa (**FR-PANT-TARIFAS-1**) |
| Información de la sucursal | Siempre |
| Una por cada promoción vigente | Si la sede tiene promociones vigentes hoy |

**FR-PANT-CAR-2** Cada diapositiva dura 12 s, fijos.

**FR-PANT-CAR-3** Al llegar a la última vuelve a la primera.

**FR-PANT-CAR-4** El cambio de diapositiva se anuncia a la tecnología de asistencia. Los indicadores de posición son decorativos.

**FR-PANT-CAR-5** No se puede pausar, adelantar ni retroceder. Al recargar empieza por la primera; solo la sede sobrevive a una recarga.

---

## 4. Tasas del día

**FR-PANT-TASAS-1 · Tablero.** El tablero **de la sede de la pantalla**, el que fija su operador en Admin → Tasas (**FR-AD-TASA-***): cada moneda con tasa en vigor, con su bandera, código y nombre, y su compra y su venta en CUP. Una moneda cuya tasa no está en vigor no aparece. Es el mismo tablero que el kiosco de autoservicio (**FR-AS-NAV-2**).

**FR-PANT-TASAS-2** Solo lectura.

**FR-PANT-TASAS-3 · Las tasas que se aplican.** Las cifras son las mismas con las que cotizan en ese momento las cajas y el kiosco de la sede. Un pie dice que son precios en CUP y que están sujetas a cambio sin previo aviso.

**Ver en la demo:** con la pantalla en PuntoCash Vedado, cambiar la tasa del USD en Admin → Tasas como `marta@malecon-sf.cu` y esperar: el tablero cambia sin recargar.

### Tarifas de giros

**FR-PANT-TARIFAS-1 · Diapositiva.** Las tarifas de giro **de la sede de la pantalla** (**FR-SA-TAR-***): una columna por moneda de la lista de la sede con tarifa, con su bandera, código y nombre; el **giro mínimo**; y cada tramo, por lo que recibe quien cobra, con lo que se paga de tarifa («3,00 USD», «1,00 USD + 2 %», «1,5 %»). Es lo mismo que enseña la consulta del kiosco (FRD de Autoservicio **FR-AS-TAR-1**). Solo entra en la rotación si la sede ofrece Giros y tiene al menos una moneda con tarifa; si no, no hay diapositiva.

**FR-PANT-TARIFAS-2** Solo lectura. Un pie dice quién la paga y sobre qué se calcula, que cobrar un giro no tiene tarifa, y que las fija PuntoCash, iguales en todas las sucursales.

**FR-PANT-TARIFAS-3 · Las tarifas que se cobran.** Las cifras son las mismas con las que cobra en ese momento la caja de la sede. Una tarifa cambiada por PuntoCash aparece sin recargar (**FR-PANT-DATA-8**).

**Ver en la demo:** con la pantalla en PuntoCash Vedado, esperar a la segunda diapositiva (12 s): CUP, USD y EUR. Cambiar la tarifa del USD en Super Admin (`emarrero@puntocash.com`, Tarifas → Giros → USD → Cambiar) y esperar.

---

## 5. Información de la sucursal

**FR-PANT-SUC-1** Nombre, dirección, horario de atención y teléfono **de la sede de la pantalla**, del registro de sedes.

**FR-PANT-SUC-2** Ningún nombre de empresa operadora o administradora: solo PuntoCash y los datos de la sede.

---

## 6. Promociones

**FR-PANT-PROMO-1 · Una por diapositiva.** Las promociones **vigentes hoy** de la sede: las de su operador mientras la administre y las de red de PuntoCash (**FR-AD-PROM-6**). Cada una ocupa su diapositiva, con título (hasta 40 caracteres) y texto (hasta 120), que se limitan al publicarlas y no se recortan aquí. Con imagen (**FR-AD-PROM-12**), la imagen va entera, sin recortar: a la izquierda en horizontal y arriba en vertical.

**FR-PANT-PROMO-2** Contenido informativo: ninguna promoción se canjea desde la pantalla ni desde ningún flujo.

---

## 7. Origen de los datos

**FR-PANT-DATA-2 · Sentido único.** Lo que la pantalla exhibe nunca alimenta ni modifica una operación: la tasa de una operación la da la cotización en el momento de cotizar **[R10]**. Pero el tablero y la cotización leen las tasas de la sede **del mismo origen**, de modo que la cifra que ve el cliente es la que se le aplica, salvo que la sede la cambie entretanto.

**FR-PANT-DATA-3 · Tasas.** Las tasas en vigor de la sede, que cambian cuando las cambia su operador, sin desplegar nada. Solo las monedas que la sede cambia.

**FR-PANT-DATA-9 · Tarifas.** Las tarifas de giro de las monedas de la sede, que cambian cuando PuntoCash las cambia, sin desplegar nada. Solo las de una sede que ofrece Giros.

**FR-PANT-DATA-4 · Sedes.** La lista del selector y los datos de cada sede salen del registro de sedes de la red, administrado centralmente.

**FR-PANT-DATA-5 · Promociones.** Campañas con fecha de inicio y fin, que se dan de alta, se editan y se retiran desde las consolas (**FR-AD-PROM-***), sin cambio de código. La pantalla muestra solo las vigentes hoy.

**FR-PANT-DATA-7 · Un solo origen.** La pantalla, el kiosco y cualquier otro cliente leen las tasas, los datos de sede y las promociones del mismo origen, nunca de copias que haya que sincronizar.

**FR-PANT-DATA-8 · Refresco.** La pantalla vuelve a pedir al servidor sus datos cada **30 s**. Los cambios de tasas, de tarifas, de ficha, de promociones y de si la sede atiende aparecen sin recargar y sin reiniciar el carrusel.

---

## 8. Condiciones conocidas

**FR-PANT-IMP-1 · Tamaño del equipo.** El tamaño y la resolución del equipo real no están fijados por el negocio. La composición se verificó en las tres resoluciones de referencia, no en el equipo.

**FR-PANT-IMP-2 · Sin recuperación.** Sin conexión o ante un fallo de pintado, la aplicación no se recarga sola: se espera que lo gestione el sistema del equipo.

---

## 9. Para producción

| Asunto | Requisito |
| --- | --- |
| Guardar la sede elegida en la configuración local del equipo, con la tecnología del cliente de pantalla | **FR-PANT-SEDE-4** |
| Recibir los cambios de datos por un canal en vivo, si el sondeo de 30 s no basta | **FR-PANT-DATA-8** |
| Confirmar el tamaño y la resolución del equipo | **FR-PANT-IMP-1** |
| Recarga automática ante un fallo, en el sistema del equipo | **FR-PANT-IMP-2** |

---

## 10. No especificado

- Gestión remota de las pantallas: encendido, apagado o asignación de su sede desde una consola.
- La tecnología del cliente de pantalla en producción (web o aplicación nativa).
- Sincronización de la hora con un servidor: el reloj es el del equipo.
- Telemetría o conteo de audiencia.
- Sonido, vídeo o animaciones más allá del paso entre diapositivas.

---

## Apéndice A · Terminología

| Término | Significado |
| --- | --- |
| Pantalla | El televisor o tótem de la sala que muestra el carrusel |
| Tablero | Las tasas de compra y venta en CUP que publica la sede |
| Tasa en vigor | La que la sede puede aplicar ahora; la misma con la que cotiza la caja |
| Promoción vigente | La que está entre su fecha de inicio y su fecha de fin |
| Sede que no atiende | Sede suspendida, sin operador o con el operador suspendido |

## Apéndice B · Demostración

**Arrancar.** La demostración trabaja en memoria: los cambios de tasas, sedes y promociones duran hasta reiniciar el servidor.

**Sede elegida.** Se guarda en el almacenamiento local del navegador (`puntocash.kiosk.pantalla.sede`). Para empezar de cero, abrir la pantalla en una ventana privada o pulsar Esc → «Cambiar sede».

**Sedes.** Las de la red de la demostración. PuntoCash Trinidad está suspendida (**FR-PANT-SEDE-8**). PuntoCash Matanzas no cambia moneda: su carrusel no tiene tablero.

**Cambiar datos.** Tasas y promociones de la sede: Admin, con el operador de la sede (`marta@malecon-sf.cu` administra PuntoCash Vedado y PuntoCash Obispo). Promociones de red y estado de las sedes: Super Admin, `emarrero@puntocash.com`. Contraseña `puntocash`, código `123456`.

**Pruebas automáticas.** La pantalla está cubierta en `tests/kiosk-smoke.spec.ts`.

## Apéndice C · Mensajes

| Caso | Mensaje |
| --- | --- |
| Selector, título | ¿En qué sede está esta pantalla? |
| Selector, explicación | Elige la sede para mostrar su información. Solo se pide la primera vez; para cambiarla después, pulsa Atrás en el mando o Esc en el teclado. |
| Sin coincidencias | Ninguna sede coincide con «{texto}». Revisa lo que escribiste o borra la búsqueda. |
| Sede cerrada | La sede que mostraba esta pantalla ya no está disponible. Elige otra. |
| Cambiar de sede | **¿Cambiar la sede de esta pantalla?** Ahora muestra la información de {sede}. Si continúas, volverá la lista de sedes para elegir otra. Si no respondes, la pantalla sigue como está. |
| Sede que no atiende | **En este momento no estamos atendiendo.** Disculpa las molestias. Puedes consultar otras sucursales de PuntoCash. |
| Pie del tablero | Precio en pesos cubanos (CUP) · Tasas informativas, sujetas a cambio sin previo aviso. |
