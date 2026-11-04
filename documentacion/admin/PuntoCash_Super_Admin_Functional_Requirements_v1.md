# PuntoCash — Super administración
## Documento de Requisitos Funcionales (FRD) · v5.2

**Alcance:** la consola de PuntoCash sobre su red, `/super-admin`. No cubre la consola del mercante (`/admin`).

**Destinatarios:** desarrollo backend y frontend, y QA. Es la especificación contra la que se implementa y se acepta.

**Documentos relacionados:**

| Documento | Qué define |
| --- | --- |
| `PuntoCash_Super_Admin_PRD_v1.md` | El producto, sus conceptos y los requisitos **RP-27 a RP-30**, propios de esta consola |
| `PuntoCash_Admin_Sede_PRD_v1.md` | Las reglas de la capa **A1–A14**, citadas aquí como **[A#]**, y **RP-17 a RP-26** |
| `../PuntoCash_PRD_v2.md` | Las reglas de producto **R1–R13**, citadas como **[R#]** |
| `PuntoCash_Admin_Sede_Functional_Requirements_v1.md` | La consola del mercante (**FR-AD-***): lo que esta consola observa y no toca, y las piezas que ambas comparten (detalle de jornada, cálculo y exportación de reportes, formulario de promoción) |
| `../worker/PuntoCash_Worker_Functional_Requirements_v1.md` | El acceso en dos pasos y la recuperación de contraseña (**FR-AUTH-***, **FR-2FA-***, **FR-REC-***), y el detalle de las operaciones |
| `../kiosko/…` | El kiosco de autoservicio y la pantalla informativa, que leen de la capa de administración lo que cada sede exhibe |

## Cómo leer este documento

- Cada requisito tiene un código `FR-SA-<área>-<n>`. «Debe» indica comportamiento obligatorio.
- El documento fija las **reglas**: qué datos muestra cada pantalla, qué se permite, qué se rechaza y con qué código, qué se guarda y qué se audita.
- Los **textos, avisos y la disposición** de cada pantalla están en la **demostración**, que es la referencia de diseño. Aquí solo se citan los textos que son regla de negocio.
- Cada **«Ver en la demo»** dice qué pasos seguir. Las cuentas están en el **Apéndice B**; salvo que se diga otra cosa, se entra con `emarrero@puntocash.com`, contraseña `puntocash`, código `123456`.
- Cada rechazo del servidor tiene un **código** (`jornadas-abiertas`). El mensaje que ve el usuario está en el **Apéndice C**.
- **El servidor revalida toda regla al confirmar**, aunque la pantalla ya la haya comprobado: las condiciones pueden cambiar con la pantalla abierta **[R3]**.
- Un identificador inexistente responde como un recurso inexistente (**FR-SA-NAV-3**).
- **Motivo** significa siempre: obligatorio, de al menos 10 caracteres sin contar los espacios al principio y al final, y guardado en el evento de auditoría con el nombre de quien actuó (**FR-SA-STATE-2**).

## Versiones

| Versión | Fecha | Cambio |
| --- | --- | --- |
| 5.2 | 03/11/2026 | **PuntoCash resuelve las diferencias de efectivo que quedan sin dueño al traspasar una sede** (§11.3, **FR-SA-APR-1 a APR-5**, nuevos): menú «Aprobaciones», pendiente en Inicio |
| 5.1 | 03/11/2026 | Un mercante ve cada sede solo desde que es suya; PuntoCash, todo (**FR-SA-DOM-4**) |
| 5.0 | 03/11/2026 | **Reescritura completa en el formato de la v8 del FRD de Admin.** El documento describe la consola construida, no un diseño previo: una subsección por pantalla y por acción, rechazos con código, auditoría en tablas y «Ver en la demo». Incorpora las decisiones del 03/11: cerrar una sede termina su administración (**FR-SA-ASG-13**); una sede suspendida sin operador se asigna y PuntoCash mantiene su contacto (**FR-SA-SEDE-24**, **FR-SA-ASG-12**); toda credencial entregada es la contraseña (**FR-SA-OPE-16**, **FR-SA-USR-6**); motivo al cambiar un rango ya definido, al retirar una promoción de red y al traspasar el principal (**FR-SA-TASA-16**, **FR-SA-PROM-12**, **FR-SA-USR-10**). Secciones nuevas: Jornadas (**FR-SA-JOR**), Usuarios (**FR-SA-USR**) y Perfil (**FR-SA-PERF**). Los códigos de la v4.2 se conservan donde el requisito sigue; los redefinidos y los retirados se listan abajo |
| 4.2 | 03/11/2026 | Banderas de la lista ISO (FR-SA-MON-9) |
| 4.1 | 03/11/2026 | Rangos con hasta 4 decimales |
| 4.0 | 03/11/2026 | Auditoría: el objeto de un evento enlaza a su ficha (FR-SA-AUD-5) |
| 3.9 | 03/11/2026 | Una promoción de red llega a toda sede, ofrezca o no el servicio (FR-SA-PROM-11) |
| 3.8 | 03/11/2026 | Monedas de la lista ISO 4217, cuatro decimales fijos, menú de acciones, Worker recableado |
| 3.7 | 03/11/2026 | PuntoCash mantiene el catálogo de monedas |
| 3.6 | 02/11/2026 | «Administradores» en lugar de «usuarios administradores» |
| 3.5 | 02/11/2026 | Auditoría construida y exportable |
| 3.4 | 02/11/2026 | Reportes construidos y exportables; cada operación al mercante de su fecha |
| 3.3 | 02/11/2026 | Promociones de red: destino como sedes, saturación con autor, solo las de red |
| 3.2 | 28/10/2026 | Un operador nunca se queda sin administrador; restablecer el acceso del principal |
| 3.1 | 23/09/2026 | Monedas y tasas en tres vistas; catálogo de plataforma |
| 3.0 | 23/09/2026 | PuntoCash deja de intervenir dentro de las sedes; suspensión como único recurso |
| 2.0 | 23/09/2026 | Equipos, promociones de red, acceso en dos pasos, trabajador adscrito a sede |
| 1.0 | 22/09/2026 | Primera versión |

**Códigos redefinidos en la v5.0** (el código sigue, el contenido cambia): **FR-SA-ACC-5** (la recuperación de contraseña existe), **FR-SA-HOME-1 a HOME-7** (Inicio tal como se construyó), **FR-SA-SEDE-10** (una sede nace activa; «sin asignar» se deriva), **FR-SA-ASG-10** (revocar deja la sede sin asignar, no suspendida), **FR-SA-TASA-1** y **TASA-2** (rangos por moneda contra el peso cubano, no por par), **FR-SA-STATE-2** (qué actos piden motivo).

**Códigos que pasan a una tabla** (siguen vigentes dentro de ella): **FR-SA-SEDE-5, 7, 8 y 9** → tabla de **FR-SA-SEDE-4**; **FR-SA-SEDE-15, 16, 19, 20 y 21** → tabla de **FR-SA-SEDE-13**; **FR-SA-TASA-3** → **FR-SA-MON-2**.

**Códigos retirados:** **FR-SA-TASA-14** y **TASA-15** (la vista de tasas por sede no señala situaciones ni ofrece contacto: es de consulta), **FR-SA-DOM-5 a DOM-7** (detalles de la simulación, que ya no son requisitos), **FR-SA-SHELL-3** (su contenido pasa a FR-SA-SHELL-2).

---

## 1. Comportamiento global

### 1.1 Estructura

**FR-SA-SHELL-1 · Estructura.** Misma composición que la consola del mercante: rutas de acceso sin estructura común (`(auth)`) y rutas de trabajo con cabecera, navegación y contenido (`(app)`). Sin sesión, toda ruta de trabajo lleva a `/super-admin/login`; `/super-admin` lleva a `/super-admin/inicio`.

**FR-SA-SHELL-2 · Navegación.** Los destinos se agrupan en cuatro bloques, por lo que la persona viene a hacer:

| Bloque | Destinos |
| --- | --- |
| Red | Inicio · Sedes · Operadores · Cajas y equipos · Trabajadores |
| Oferta | Servicios · Monedas y tasas · Promociones |
| Actividad | Jornadas · Aprobaciones (**FR-SA-APR-1**) · Operaciones · Reportes |
| Administración | Usuarios (**solo el principal**, **FR-SA-USR-1**) · Auditoría |

- «Sedes» lleva un indicador con el número de sedes **sin asignar**, y «Aprobaciones» con el de diferencias sin quien las resuelva; sin ninguna, no llevan indicador.
- Desde 1024px, la navegación es lateral y cabe entera a 900px de alto. Por debajo, una barra inferior con Inicio, Sedes, Operadores y «Más», que abre la navegación completa, el nombre de la persona, Perfil y Cerrar sesión.

**Ver en la demo:** entrar con `emarrero@puntocash.com` (ve Usuarios) y con `jaguilera@puntocash.com` (no lo ve). Estrechar la ventana por debajo de 1024px para la barra inferior.

**FR-SA-SHELL-4 · Cabecera.** Marca PuntoCash; el distintivo **«Super administración»** («Super admin» en el teléfono); desde 1024px, el nombre de la persona y «PuntoCash · {área}», y «Cerrar sesión»; en todos los anchos, el círculo con las iniciales, que lleva al Perfil.

**FR-SA-SHELL-5 · Distintivo.** El distintivo es un requisito de seguridad operativa: ninguna pantalla de esta consola debe poder confundirse con una de la consola del mercante.

**FR-SA-SHELL-6 · Referencia de pantalla.** Escritorio a 1440×900 como referencia y 1280px como ancho mínimo de escritorio. Ninguna pantalla se desborda de lado a 1280, 1024, 768 ni 390px.

**FR-SA-SHELL-7 · Sin flujos por pasos.** Ninguna pantalla usa un asistente por pasos. Las altas son formularios por secciones.

**FR-SA-SHELL-8 · Tablas y tarjetas.** Los listados son tablas desde 1280px y tarjetas por debajo (a dos columnas desde 768px). En la tabla, los nombres largos se recortan con el valor entero disponible al pasar por encima; en las tarjetas no se recorta nada. Ninguna tabla crece con su contenido hasta salirse de la pantalla.

**FR-SA-SHELL-9 · Acciones de fila.** Cuando una fila tiene más de una acción, van en un menú «⋯» accesible, que se abre hacia arriba si no cabe debajo y nunca queda fuera de la pantalla.

### 1.2 Rutas

**FR-SA-NAV-1 · Inventario.**

| Ruta | Pantalla |
| --- | --- |
| `/super-admin/login` · `/super-admin/verificacion` · `/super-admin/recuperar-acceso` | Acceso (§2) |
| `/super-admin/inicio` | Inicio (§3) |
| `/super-admin/sedes` · `/nueva` · `/[id]` · `/[id]/editar` | Sedes (§4) |
| `/super-admin/operadores` · `/nuevo` · `/[id]` | Operadores (§5) |
| `/super-admin/equipos` (`?pestana=kioscos`) | Cajas y equipos (§6) |
| `/super-admin/trabajadores` · `/[id]` | Trabajadores (§7) |
| `/super-admin/servicios` | Servicios (§8) |
| `/super-admin/monedas-y-tasas` (`?vista=sedes`) | Monedas y tasas (§9) |
| `/super-admin/promociones` · `/nueva` · `/[id]` | Promociones (§10) |
| `/super-admin/jornadas` · `/[id]` | Jornadas (§11) |
| `/super-admin/aprobaciones` · `/[id]` | Aprobaciones sin quien las resuelva (§11.3) |
| `/super-admin/operaciones` · `/[codigo]` | Operaciones (§12) |
| `/super-admin/reportes` · `GET /super-admin/reportes/exportar/{pdf\|xlsx}` | Reportes (§13) |
| `/super-admin/auditoria` · `/[id]` · `GET /super-admin/auditoria/exportar` | Auditoría (§14) |
| `/super-admin/usuarios` · `/nuevo` · `/[id]` · `/[id]/editar` | Usuarios (§15), solo el principal |
| `/super-admin/perfil` · `/perfil/contrasena` | Perfil (§16) |

**FR-SA-NAV-2 · Sin selector de alcance.** El alcance de esta consola es la red entera **[A1]**. Donde filtrar por sede u operador es útil, es un filtro de la pantalla, nunca del alcance de la sesión.

**FR-SA-NAV-3 · Inexistente.** Un identificador que no existe —sede, operador, trabajador, jornada, operación, promoción, evento, cuenta— muestra dentro de la estructura común la pantalla de «no encontrado», con un enlace a Inicio. Una ruta desconocida, igual.

**Filtros en la dirección.** Los filtros de todos los listados viven en la dirección de la página: una URL filtrada se puede compartir y volver a abrir. Las búsquedas de texto no distinguen mayúsculas ni tildes («camaguey» encuentra «Camagüey»).

### 1.3 Formatos

**FR-SA-FMT-1.**

| Dato | Formato |
| --- | --- |
| Importe | `1.250,00 USD`, dos decimales |
| Tasa y límite de rango | Hasta 4 decimales, mínimo 2 si no es entera: `318` · `318,50` · `318,525` |
| Fecha y hora | Hora de Cuba (`America/Havana`). «12 oct 2026 · 14:20» |
| Correo de una persona | **Enmascarado** en todo listado y ficha (`e•••@puntocash.com`), salvo donde se edita |
| Credencial entregada | `XXXXX-XXXXX`, alfabeto sin caracteres ambiguos |
| Moneda | Bandera SVG decorativa (de la lista ISO), código y nombre |

---

## 2. Acceso

### 2.1 Credenciales y verificación — `/super-admin/login`, `/super-admin/verificacion`

**FR-SA-ACC-1 · Dos pasos.** Identificador **o** correo y contraseña; después, un código de seis dígitos al correo registrado. **Ninguna sesión existe hasta verificar el código [R13].** No hay «recordar este equipo».

**FR-SA-ACC-2 · Herencia.** Rigen sin repetirlos **FR-AUTH-1 a FR-AUTH-7** y **FR-2FA-1 a FR-2FA-32** de Worker, aplicados a estas rutas.

**FR-SA-ACC-3 · Diferencias.** Tras verificar, `/super-admin/inicio`. Los textos de ayuda remiten «al área de sistemas de PuntoCash». La sesión dura **12 horas** y se comprueba en cada petición: una cuenta desactivada con la sesión abierta vuelve al acceso en su siguiente petición. Las cookies de sesión y de verificación pendiente son propias de esta consola: un código pendiente de `/admin` no abre sesión aquí.

**FR-SA-ACC-4 · Rechazo único.** Cuenta inexistente, contraseña incorrecta y cuenta desactivada responden con el mismo rechazo (`credenciales-incorrectas`).

**Ver en la demo:** `rvaldes@puntocash.com` (desactivada) y `emarrero@puntocash.com` con una contraseña equivocada dan el mismo mensaje.

### 2.2 Recuperación — `/super-admin/recuperar-acceso`

**FR-SA-ACC-5 · Recuperar la contraseña.** El mismo trámite de tres pasos que Worker y Admin (**FR-REC-***): identificador o correo, código al correo registrado, contraseña nueva. **Terminar no abre sesión**: vuelve a `/super-admin/login`.

---

## 3. Inicio

### 3.1 Inicio — `/super-admin/inicio`

Responde «¿cómo está la red hoy?». **No ejecuta nada**: orienta y enlaza.

**FR-SA-HOME-1 · Resumen.** Bajo el saludo, una frase con las sedes dadas de alta **no cerradas** y cuántas están activas, sin asignar, suspendidas y con su operador suspendido, y cuántos operadores están activos.

**FR-SA-HOME-2 · Hoy en la red.** Tres cifras del día (hora de Cuba):

| Cifra | Cálculo |
| --- | --- |
| Sedes con operaciones | Sedes en estado **activa** con al menos una operación hoy, sobre el total de sedes activas |
| Operaciones del día | Operaciones de hoy en sedes no cerradas, contadas como en el Inicio de Admin (**FR-AD-HOME-1**) |
| Trabajadores que han operado | Personas distintas con alguna operación hoy |

**FR-SA-HOME-3 · Pendientes.** Solo lo que resuelve PuntoCash, y solo si hay algo. Cada uno con su enlace:

| Pendiente | Cuándo | Enlace |
| --- | --- | --- |
| Sede sin operador | Sede no cerrada sin asignar. Dice desde cuándo | Ficha de la sede |
| Operador sin sedes | Operador activo sin ningún tramo vigente. Dice desde cuándo está de alta | Ficha del operador |
| Moneda que no se puede cotizar | Moneda del catálogo, no retirada, sin rango, que tienen en su lista sedes no cerradas, con operador y con Cambio de moneda. Nombra esas sedes | Monedas y tasas |
| Diferencias sin quien las resuelva | Hay alguna (**FR-SA-APR-1**). Dice cuántas y de qué sedes | Aprobaciones |

**FR-SA-HOME-4 · Informativos.** Ningún pendiente ofrece una acción en el sitio: lleva a la pantalla donde se resuelve.

**FR-SA-HOME-5 · Lo que no es pendiente.** Una suspensión no es un pendiente: es una decisión ya tomada, y se ve en el estado de cada sede.

**FR-SA-HOME-6 · Actividad por sede.** Una fila por sede no cerrada:

| Dato | Contenido |
| --- | --- |
| Sede | Nombre (enlace), código y municipio |
| Operador | Enlace, o «Sin operador» |
| Estado | Estado de la sede (**FR-SA-SEDE-2**) |
| Operaciones hoy | Número y cuántos trabajadores |
| Última operación | Fecha y hora, trabajador y servicio, o ninguna |

- Filtro por operador, con la opción de sedes sin operador si las hay.
- Todas las columnas se ordenan pulsando su cabecera; por debajo de 1280px, con un selector «Ordenar por». El orden no va a la dirección.

**FR-SA-HOME-7 · Orden por defecto.** Por estado —sin asignar, suspendida, operador suspendido, activa— y después por nombre: lo que pide atención, primero.

**Ver en la demo:** Inicio. PuntoCash Santiago aparece sin operador; Cienfuegos Cambio, sin sedes; el CAD, esperado por dos sedes que no pueden cotizarlo.

---

## 4. Sedes

### 4.1 Listado — `/super-admin/sedes`

**FR-SA-SEDE-1 · Contenido.** Todas las sedes, también las cerradas.

| Dato | Contenido |
| --- | --- |
| Sede | Nombre (enlace a la ficha), código, municipio y provincia |
| Estado | **FR-SA-SEDE-2** |
| Operador | El vigente (enlace) y desde cuándo, o «Sin operador» |
| Cajas | Cajas activas y cuántas tienen equipo, señalado si alguna no lo tiene; «Sin cajas» si ninguna |
| Trabajadores | Trabajadores activos de la sede |

Orden fijo por estado (sin asignar, suspendida, operador suspendido, activa, cerrada) y después por nombre. Ofrece **Nueva sede**.

**FR-SA-SEDE-2 · Estado de una sede.** Se guarda lo que PuntoCash decide y se deriva lo que es un hecho:

| Estado | Cómo se obtiene | Prioridad |
| --- | --- | --- |
| Cerrada | Guardado | 1 |
| Suspendida | Guardado | 2 |
| Sin asignar | No tiene tramo vigente | 3 |
| Operador suspendido | Su operador vigente no está activo | 4 |
| Activa | Ninguno de los anteriores | 5 |

Una sede sin operador **no** es una sede suspendida: la suspensión es una sanción con motivo y fecha; quedarse sin operador, no.

**FR-SA-SEDE-3 · Filtros.** Búsqueda por código o nombre; estado; provincia; operador (con «Sin operador asignado»); conmutadores «Sin cajas» (ninguna caja activa) y «Con cajas sin equipo». Contador de sedes visibles sobre el total.

**Ver en la demo:** Sedes. Marcar «Sin cajas» deja PuntoCash Cerro y Pinar del Río.

### 4.2 Nueva sede — `/super-admin/sedes/nueva`

**FR-SA-SEDE-4 · Formulario.** Tres secciones, sin pasos:

| Sección | Campo | Obligatorio | Reglas |
| --- | --- | --- | --- |
| Datos | Código | Sí | 2 a 8 letras o números, sin espacios; se guarda en mayúsculas; **único en la red** (**FR-SA-SEDE-7**) |
| Datos | Nombre | Sí | Viene con «PuntoCash » |
| Datos | Dirección · Provincia · Municipio | Sí | Provincia de la lista de provincias de Cuba |
| Datos | Teléfono | Sí | Dígitos, espacios, guiones y «+»; al menos 8 dígitos |
| Datos | Horario | Sí | Por días: al menos uno abierto; cada día abierto con apertura y cierre, y el cierre después de la apertura. Viene lunes a sábado 09:00–18:00 |
| Servicios | Servicios habilitados | Al menos uno | Los servicios disponibles del producto (hoy: Cambio de moneda, Remesas, Giros); vienen todos marcados |
| Asignación inicial | Operador | No | Solo operadores activos, o «Sin asignar por ahora» |
| Asignación inicial | Motivo de la asignación | Si hay operador | **Motivo** |

**FR-SA-SEDE-6 · Datos públicos.** El formulario advierte que los datos de la sede son públicos: se ven en el kiosco, en la pantalla de la sucursal y en el selector de sede de las pantallas.

**FR-SA-SEDE-10 · Al crear.** La sede nace **activa**, **sin cajas** y con los servicios marcados. Si se eligió operador, se le asigna en el mismo acto (**FR-SA-ASG-1**); si no, queda **sin asignar** (estado derivado). Si la asignación fallara en ese instante, la sede queda creada sin asignar y la respuesta lo dice.

**FR-SA-SEDE-11 · Resultado.** La confirmación se queda en la pantalla y dice qué falta y quién lo hace: con operador, que su administrador debe crear las cajas y vincular un equipo a cada una; sin operador, que no puede operar hasta que se le asigne uno. Ofrece crear otra sede y ver su ficha.

**Rechazos.**

| Condición | Código |
| --- | --- |
| Código vacío o mal formado | `codigo-invalido` |
| Código ya usado | `codigo-duplicado` |
| Nombre, dirección o municipio vacíos; provincia no válida | `campo-requerido` |
| Teléfono no válido | `telefono-invalido` |
| Horario sin días, con horas incompletas o cierre antes de apertura | `horario-invalido` (se señala el día) |
| Ningún servicio | `sin-servicios` |
| Operador inexistente o no activo | `operador-inactivo` |
| Hay operador y el motivo no es válido | `motivo-requerido` |

Ante un rechazo, el formulario conserva lo escrito y señala el campo.

**Ver en la demo:** Sedes → Nueva sede, con código «VED» (`codigo-duplicado`).

### 4.3 Ficha de sede — `/super-admin/sedes/[id]`

**FR-SA-SEDE-13 · Bloques.**

| Bloque | Contenido | Acciones |
| --- | --- | --- |
| Estado | Estado (**FR-SA-SEDE-2**) y, según el estado, aviso: suspendida (motivo, fecha y quién), operador suspendido, sin operador, cerrada | — |
| Datos de la sede | Código, nombre, dirección, municipio y provincia, teléfono, horario por días, alta en la red | «Editar datos» (no en cerradas) |
| Servicios habilitados | Cambio de moneda, Remesas, Giros: habilitado o no | «Cambiar servicios» (no en cerradas) |
| Asignación vigente | Operador, desde cuándo y cuánto tiempo, motivo; sus **administradores** (principal marcado, identificador, correo enmascarado, teléfono, estado, último acceso) | «Revocar» o «Asignar un operador» (no en cerradas) |
| Historial de asignaciones | Tramos cerrados, del más reciente: operador, fechas, motivo de inicio y de fin | — |
| Estado de la sede | Historial de suspensiones y reactivaciones (fecha, motivo, quién), leído del registro de auditoría | «Suspender la sede» o «Reactivar la sede», y «Cerrar la sede» (no en cerradas) |
| Cajas y equipos | Cada caja —también retiradas— con su equipo y su jornada en curso (trabajador, si tiene la sesión iniciada, desde cuándo, saldos); cada kiosco con su última actividad | Ninguna |
| Trabajadores | Nombre, identificador, estado | Ninguna |
| Contenido público | Monedas de su lista; tasas que publica hoy; promociones en pantalla hoy, con quién las publica | Ninguna |

**FR-SA-SEDE-17 · Lo que no se toca.** Cajas, equipos, kioscos, trabajadores, administradores y contenido público son de **solo lectura**, sin controles deshabilitados **[A14]**.

**FR-SA-SEDE-18 · Sede sin cajas.** El bloque dice de quién es la tarea: su administrador (con el nombre del operador), o el que tenga cuando se le asigne.

**FR-SA-SEDE-22 · Nunca se elimina.** Una sede no se borra en ningún caso: se cierra (**FR-SA-SUS-8**).

**Ver en la demo:** Sedes → PuntoCash Trinidad (suspendida, con su historial), PuntoCash Santiago (sin operador), PuntoCash Camagüey (operador suspendido).

### 4.4 Editar datos — `/super-admin/sedes/[id]/editar`

**FR-SA-SEDE-14 · Qué edita PuntoCash.** Siempre, el **código** y el **nombre** **[A3]**.

**FR-SA-SEDE-24 · Contacto sin operador.** La **dirección, provincia, municipio, teléfono y horario** los edita PuntoCash **solo mientras la sede no tiene operador vigente** —también si está suspendida—. Con operador los mantiene su mercante (**FR-AD-SEDE-***), y la pantalla lo dice nombrándolo.

- Una sede cerrada no se edita: la ruta responde como inexistente.
- Mismas reglas y rechazos que el alta (**4.2**), más `sede-cerrada`.
- Guardar sin cambios no registra nada.

**Ver en la demo:** PuntoCash Santiago → Editar datos (todo editable); PuntoCash Vedado → Editar datos (solo código y nombre).

### 4.5 Cambiar servicios (desde la ficha)

**FR-SA-SERV-9.** El diálogo muestra los tres servicios. Quitar alguno exige **motivo** y avisa de que ningún trabajador podrá prestarlo; añadir no. Mismo efecto, rechazos y auditoría que la matriz (**§8**).

### 4.6 Asignar un operador

Desde la ficha de la sede («Asignar un operador») o desde la del operador («Asignar una sede», **FR-SA-ASG-12**).

**FR-SA-ASG-1 · Campos.** Operador (solo activos) y **motivo**. Si no hay ningún operador activo, el diálogo lo dice y no ofrece el formulario. Antes de confirmar, un resumen: sede, operador, desde hoy.

**FR-SA-ASG-2 · Una sede, un operador.** No se asigna una sede con tramo vigente: hay que revocar antes **[A2]**.

**FR-SA-ASG-3 · Siempre con administrador.** Todo operador tiene su administrador principal desde el alta (**FR-SA-OPE-5**), y a él no lo desactiva nadie: asignar nunca necesita crear un administrador, y ninguna pantalla avisa de ese caso.

**Efecto.** Abre un tramo con la fecha y el motivo. **No cambia el estado guardado de la sede**: una sede suspendida sigue suspendida tras asignarla, hasta que se reactive. Los administradores del operador la ven en su consola en el acto.

| Condición | Código |
| --- | --- |
| Motivo no válido | `motivo-requerido` |
| La sede no existe | `sede-no-encontrada` |
| La sede está cerrada | `sede-cerrada` |
| El operador no existe | `operador-no-encontrado` |
| El operador no está activo | `operador-inactivo` |
| La sede ya tiene tramo vigente (otra persona la asignó) | `ya-asignada` |

**Ver en la demo:** PuntoCash Santiago → Asignar un operador.

### 4.7 Revocar

**FR-SA-ASG-4 · Confirmación.** Muestra antes qué pasa: el operador deja de ver la sede en el acto; sus trabajadores dejan de poder entrar; nadie puede crear cajas, vincular equipos ni fijar tasas hasta que se asigne otro. Pide **motivo**.

**FR-SA-ASG-5 · Bloqueo.** Con **jornadas abiertas** en la sede no se revoca: el diálogo no pide motivo, lista las jornadas (caja, trabajador, desde cuándo) y solo ofrece cerrarlo. Traspasar una caja abierta dejaría un descuadre sin dueño. Código `jornadas-abiertas`.

**FR-SA-ASG-6 · Efecto.** Cierra el tramo con fecha y motivo; nunca lo borra ni lo edita **[A2]**, **[R9]**.

**FR-SA-ASG-7 / FR-SA-ASG-8 · Lo que no hace.** No retira cajas, no desvincula equipos y no desactiva trabajadores: quien la reciba encuentra la sucursal montada.

**FR-SA-ASG-10 · Estado.** La sede queda **sin asignar**. No pasa a suspendida.

| Condición | Código |
| --- | --- |
| Motivo no válido | `motivo-requerido` |
| La sede no existe | `sede-no-encontrada` |
| Jornadas abiertas | `jornadas-abiertas` |
| No tiene tramo vigente (otra persona la revocó) | `sin-asignacion-vigente` |

**FR-SA-ASG-9 · Revalidación.** Asignar y revocar revalidan el estado del tramo al confirmar **[R3]**, **[R6]**.

**Ver en la demo:** PuntoCash Obispo → Revocar (tiene una jornada abierta: bloqueo). PuntoCash Cerro → Revocar (sin jornadas: confirmación).

### 4.8 Suspender y reactivar la sede

**FR-SA-SUS-1 · El recurso de PuntoCash.** Ante un problema dentro de una sede, PuntoCash tiene tres acciones: suspender la sede, suspender al operador (**§5.6**) y cerrar la sede. Ninguna toca una pieza de la sede **[A14]**.

**FR-SA-SUS-2 · Suspender una sede.** Impide que cualquier trabajador de la sede inicie sesión y que se abran jornadas nuevas. Sus administradores la siguen viendo, como suspendida.

**FR-SA-SUS-4 · Motivo.** Suspender y reactivar piden **motivo**.

**FR-SA-SUS-5 · Con cajas abiertas.** **Se permite con jornadas abiertas**: es la palanca de emergencia, y condicionarla la inutilizaría cuando hace falta.

**FR-SA-SUS-6 · Aviso.** Con jornadas abiertas, el diálogo las lista y advierte que quedarán abiertas sin poder cerrarse mientras dure la suspensión.

**FR-SA-SUS-7 · Lo que no hace.** No cierra jornadas, no desvincula equipos, no retira cajas y no desactiva a nadie.

**FR-SA-SUS-10 · Reactivar.** Devuelve la sede a activa y restablece el acceso en el acto.

**Efecto.** Suspender guarda motivo, fecha y la persona que suspendió. Reactivar los borra (quedan en la auditoría).

| Condición | Código |
| --- | --- |
| Motivo no válido | `motivo-requerido` |
| La sede no existe | `sede-no-encontrada` |
| La sede está cerrada | `sede-cerrada` |
| Ya estaba suspendida | `ya-suspendida` |
| Reactivar una que no está suspendida | `no-suspendida` |

**Ver en la demo:** PuntoCash Trinidad → Reactivar la sede. PuntoCash Obispo → Suspender la sede (avisa de su jornada abierta, no bloquea).

### 4.9 Cerrar la sede

**FR-SA-SUS-8 · Definitivo.** Cerrar es el final del ciclo de vida de la sucursal y no se deshace. **No se permite con jornadas abiertas**: el diálogo las lista y no pide motivo (`jornadas-abiertas`). Pide **motivo**.

**FR-SA-ASG-13 · Termina su administración.** Si la sede tiene tramo vigente, se cierra **en el mismo instante**, con el motivo «Cierre de la sede: {motivo}». Una sede cerrada no la administra nadie: el operador deja de tenerla entre las suyas, y puede darse de baja si no le quedan otras **[RP-28]**. El tramo queda en el historial.

**FR-SA-SUS-9 · Lo que no hace.** No retira cajas ni desvincula equipos: si quedan, el diálogo lo dice y pide que su operador los libere antes.

**Después.** Una sede cerrada no se edita, no cambia de servicios, no se asigna, no se suspende y no recibe promociones. Sale de Inicio, Servicios, Monedas y tasas y del formulario de promociones; sigue en Sedes, Cajas y equipos, Trabajadores, Jornadas, Operaciones, Reportes (si operó en el periodo) y Auditoría.

| Condición | Código |
| --- | --- |
| Motivo no válido | `motivo-requerido` |
| La sede no existe | `sede-no-encontrada` |
| Ya estaba cerrada | `sede-cerrada` |
| Jornadas abiertas | `jornadas-abiertas` |

**FR-SA-SUS-12 · No es rutina.** Ninguna de estas acciones se presenta como alternativa a lo que corresponde al mercante: la pantalla describe cada una como lo que es —medida de urgencia, cambio ordenado o final—.

### 4.10 Auditoría

**FR-SA-SEDE-12** **[RP-21]**

| Acción | Evento | Datos |
| --- | --- | --- |
| Crear | `sede.creada` | Autor, sede; después: dirección, localidad, teléfono, horario |
| Editar (si cambió algo) | `sede.editada` | Autor, sede; antes y después de código, nombre, dirección, teléfono y horario |
| Cambiar servicios | `servicio.habilitado` · `servicio.deshabilitado` | Uno por servicio. Ver **FR-SA-SERV-3** |

**FR-SA-ASG-11**

| Acción | Evento | Datos |
| --- | --- | --- |
| Asignar | `sede.asignada` | Autor, sede, operador, motivo; antes «Sin operador asignado», después el operador |
| Revocar | `sede.revocada` | Autor, sede, operador saliente, motivo; antes el operador, después «Sin operador asignado» |

**FR-SA-SUS-11**

| Acción | Evento | Datos |
| --- | --- | --- |
| Suspender | `sede.suspendida` | Autor, sede, operador vigente, motivo; después: jornadas abiertas al suspender |
| Reactivar | `sede.reactivada` | Autor, sede, operador vigente, motivo |
| Cerrar | `sede.cerrada` | Autor, sede, operador que tenía, motivo |
| Cerrar con tramo vigente | además `sede.revocada` | Motivo «Cierre de la sede: …»; antes el operador, después «Sin operador asignado» |

---

## 5. Operadores

### 5.1 Listado — `/super-admin/operadores`

**FR-SA-OPE-1 · Contenido.** Todos los operadores: activos, suspendidos y dados de baja.

| Dato | Contenido |
| --- | --- |
| Operador | Nombre (enlace a la ficha) y fecha de alta |
| Contacto | Persona de contacto y teléfono |
| Estado | Activo · Suspendido · Dado de baja |
| Sedes | Sedes con tramo vigente, o «Sin sedes» |
| Personas | Administradores activos y trabajadores activos de sus sedes |
| Equipos | Equipos de caja y kioscos de sus sedes |
| Operaciones del mes | Operaciones del mes en curso **atribuidas al operador de la fecha** de cada una **[RP-27]**: cuentan las de sedes que ya no administra, si las hizo él. Sin importes: el volumen está en Reportes |

Orden por estado (activo, suspendido, de baja) y nombre. Ofrece **Nuevo operador**.

**FR-SA-OPE-2 · Filtros.** Búsqueda por nombre o persona de contacto; estado; conmutador «Sin sedes».

### 5.2 Nuevo operador — `/super-admin/operadores/nuevo`

**FR-SA-OPE-3 · Campos.**

| Sección | Campo | Obligatorio | Reglas |
| --- | --- | --- | --- |
| Operador | Nombre o razón social | Sí | Único entre operadores, sin distinguir mayúsculas |
| Operador | Tipo de documento | Sí | NIT (empresa), carné de identidad o pasaporte; viene NIT |
| Operador | Número de documento | Sí | 4 a 20 letras, números o guiones, sin espacios |
| Operador | Persona de contacto · Teléfono · Correo | Sí | Teléfono y correo como en **FR-SA-SEDE-4** |
| Administrador principal | Nombre · Primer apellido | Sí | — |
| Administrador principal | Segundo apellido | No | — |
| Administrador principal | Teléfono | Sí | — |
| Administrador principal | Correo | Sí | **FR-SA-OPE-4**: es el canal de su código de verificación. Único entre los administradores de la red |
| Administrador principal | Identificador de acceso | Sí | Nombre de usuario: 3 a 30 caracteres, letras, números, punto, guion o guion bajo, sin «@». Único entre los administradores de la red (**FR-AD-ACC-11**) |

**FR-SA-OPE-5 · Al guardar.** Crea el operador **activo** y **un único** administrador, que es su **principal** y su usuario inicial. **FR-SA-OPE-7:** el alta no asigna sedes; se asignan después, desde su ficha o la de la sede.

**FR-SA-OPE-16 · La credencial es la contraseña.** La confirmación se queda en la pantalla y muestra, **una sola vez**, el identificador y una **credencial** que desde ese instante **es la contraseña** de ese administrador **[RP-30]**: con ella entra en `/admin`. No se puede volver a consultar; si se pierde, se restablece el acceso (**FR-SA-OPE-11**).

**FR-SA-OPE-6 · Un solo administrador.** Esta consola no crea más administradores de una empresa: los crea su principal desde `/admin` **[A4]**.

| Condición | Código |
| --- | --- |
| Nombre vacío | `campo-requerido` |
| Ya existe un operador con ese nombre | `operador-duplicado` |
| Documento mal formado | `documento-invalido` |
| Contacto, nombre o apellido vacíos | `campo-requerido` |
| Teléfono no válido | `telefono-invalido` |
| Correo no válido | `correo-invalido` |
| Identificador vacío o mal formado (se dice si es la longitud o los caracteres) | `identificador-invalido` |
| Identificador ya usado por otro administrador | `identificador-duplicado` |
| Correo ya usado por otro administrador | `correo-duplicado` |

**Ver en la demo:** Operadores → Nuevo operador. Con el identificador `msanchez`, `identificador-duplicado`. Al terminar, entrar en `/admin/login` con el identificador y la credencial mostrada.

### 5.3 Ficha del operador — `/super-admin/operadores/[id]`

**FR-SA-OPE-8 · Bloques.**

| Bloque | Contenido | Acciones |
| --- | --- | --- |
| Estado | Si está suspendido: motivo, fecha y quién. Si está de baja, que ya no opera | — |
| Datos | Nombre, documento, contacto (teléfono y correo enlazados), alta | Ninguna: los datos de un operador no se editan |
| Sedes | Sus sedes vigentes, con desde cuándo y su estado | «Asignar una sede» (solo si está activo) |
| Operaciones del mes | Total y por sede, atribuidas por fecha | — |
| Historial de asignaciones | Tramos cerrados, con fechas y motivos | — |
| Administradores | Activos sobre el total; cada uno con «Principal», identificador, correo enmascarado, último acceso y estado | «Restablecer el acceso del principal» (salvo de baja) |
| Trabajadores | Por sede vigente | Ninguna |
| Cajas y equipos | Por sede: cajas activas, con equipo, kioscos | Ninguna |
| Estado del operador | Historial de suspensiones, reactivaciones y baja | «Suspender» o «Reactivar», y «Dar de baja» (salvo de baja) |

**FR-SA-OPE-9 · Solo lectura.** Administradores, trabajadores, cajas y equipos no tienen controles, ni deshabilitados **[A14]**.

**FR-SA-OPE-10 · Administradores.** El bloque dice que los gestiona su principal desde su consola.

**Ver en la demo:** Operadores → Caribe Cambios S.A. (Miramar desde el 30 de junio); Oriente Divisas (suspendido); Atlántico Casas de Cambio (de baja, con su tramo de Miramar en el historial).

### 5.4 Asignar una sede (desde el operador)

**FR-SA-ASG-12.** Ofrece las sedes **no cerradas sin operador vigente**, estén o no suspendidas. Sin ninguna, el diálogo lo dice y ofrece crear una sede. Mismos campos, efecto, rechazos y auditoría que **FR-SA-ASG-1**.

### 5.5 Restablecer el acceso del principal

**FR-SA-OPE-11.** Es la única intervención de PuntoCash sobre las personas de una empresa, y existe para que un mercante no se quede nunca fuera de su consola.

| Campo | Obligatorio | Reglas |
| --- | --- | --- |
| Correo de verificación | Sí | Viene el actual. Si se cambia, no puede ser el de otro administrador de la red |
| Motivo | Sí | **Motivo** |

**Efecto.** Fija el correo, deja al principal **activo** si estaba desactivado, y muestra **una sola vez** el identificador y una credencial nueva, que **es su contraseña desde ese instante; la anterior deja de servir** **[RP-30]**. No crea administradores ni cambia quién es el principal. Se permite con el operador suspendido.

| Condición | Código |
| --- | --- |
| Motivo no válido | `motivo-requerido` |
| El operador no existe | `operador-no-encontrado` |
| Está dado de baja | `dado-de-baja` |
| No tiene principal | `usuario-no-encontrado` |
| Correo no válido | `correo-invalido` |
| Correo de otro administrador | `correo-duplicado` |

**Ver en la demo:** Operadores → Malecón Servicios Financieros S.R.L. → Restablecer el acceso del principal. Después, entrar en `/admin/login` como `msanchez` con la credencial nueva.

### 5.6 Suspender, reactivar y dar de baja

**FR-SA-SUS-3 · Suspender un operador.** Impide que sus administradores entren **y** que entre ningún trabajador de **ninguna** de sus sedes. Sus sedes pasan a mostrarse «operador suspendido». Se permite con jornadas abiertas, con el mismo aviso que **FR-SA-SUS-6**, y no desmonta nada (**FR-SA-SUS-7**). Pide **motivo**.

**FR-SA-SUS-10 · Reactivar.** Restablece el acceso de todos en el acto. Pide **motivo**.

**FR-SA-OPE-12 · Dar de baja.** Definitivo; pide **motivo**. Se permite desde activo o suspendido.

**FR-SA-OPE-13 · Bloqueo.** Con sedes vigentes no se da de baja: el diálogo las lista con su enlace y no pide motivo. Una sede **cerrada** no cuenta, porque cerrarla terminó su tramo (**FR-SA-ASG-13**).

**FR-SA-OPE-14 · Nunca se elimina.** Un operador de baja conserva todo su historial; no se le asignan sedes y sus administradores no vuelven a entrar.

| Condición | Código |
| --- | --- |
| Motivo no válido | `motivo-requerido` |
| El operador no existe | `operador-no-encontrado` |
| Está dado de baja | `dado-de-baja` |
| Suspender uno ya suspendido | `ya-suspendido` |
| Reactivar uno que no está suspendido | `no-suspendido` |
| Dar de baja con sedes vigentes | `tiene-sedes` |

**Ver en la demo:** Oriente Divisas → Reactivar. Caribe Cambios S.A. → Dar de baja (bloqueado: administra tres sedes). Cienfuegos Cambio S.R.L. → Dar de baja (sin sedes: confirmación).

### 5.7 Auditoría

**FR-SA-OPE-15** **[RP-21]**

| Acción | Evento | Datos |
| --- | --- | --- |
| Alta | `operador.alta` | Autor, operador y su administrador principal |
| Restablecer el acceso | `operador.acceso-principal-restablecido` | Autor, operador y principal, motivo; antes y después del correo si cambió |
| Suspender · Reactivar · Dar de baja | `operador.suspendido` · `operador.reactivado` · `operador.baja` | Autor, operador, motivo. Al suspender, después: sedes afectadas y jornadas abiertas |

---

## 6. Cajas y equipos — `/super-admin/equipos`

Inventario de la red, de **solo lectura**: las cajas las crea el mercante y los equipos los vincula él, delante del equipo **[A10]**, **[A14]**.

**FR-SA-EQ-1 · Pestañas.** «Cajas» y «Kioscos de autoservicio» (`?pestana=kioscos`), cada una con su número: cajas **activas** y kioscos vinculados.

**FR-SA-EQ-2 · Cajas.**

| Dato | Contenido |
| --- | --- |
| Caja | Nombre y sede (enlace) |
| Operador | El vigente de la sede, o «Sin operador» |
| Estado | Activa o retirada (con fecha y motivo de la retirada) |
| Equipo | Identificador, rótulo, fecha y quién lo vinculó; o «Sin equipo», señalado |
| Jornada | La más reciente: estado, trabajador y fecha, con enlace; o que nunca se abrió |
| Última actividad | La más reciente entre la señal del equipo y la última jornada |

**FR-SA-EQ-8 · Retiradas.** Se ocultan por defecto y se muestran con «Mostrar también las retiradas».

**FR-SA-EQ-3 · Kioscos.** Identificador y rótulo, sede, operador, fecha y autor de la vinculación, última actividad y **operaciones de los últimos 30 días** que se originaron en ese kiosco.

**FR-SA-EQ-4 · Filtros.** Cajas: búsqueda (caja, sede o equipo), operador, sede, provincia, vínculo (con o sin equipo). Kioscos: búsqueda (identificador, rótulo o sede), operador, provincia.

**FR-SA-EQ-5 · Sin controles.** Ninguna pantalla de esta consola crea o retira una caja, ni vincula, desvincula o renombra un equipo.

**FR-SA-EQ-6 · Explicar la ausencia.** La pantalla dice de quién es cada cosa: las cajas y los equipos son del administrador de cada sede.

**FR-SA-EQ-7 · Sedes sin cajas.** Encima de la tabla, las sedes no cerradas **sin ninguna caja activa**, con un enlace a Sedes filtradas por «Sin cajas».

**FR-SA-EQ-9 · Pantallas informativas.** No se inventarían: no se vinculan ni tienen sesión. La pestaña de kioscos lo dice.

**Ver en la demo:** Cajas y equipos (aviso de PuntoCash Cerro y Pinar del Río); marcar «Mostrar también las retiradas» para ver las dos cajas de Pinar.

---

## 7. Trabajadores

### 7.1 Listado — `/super-admin/trabajadores`

**FR-SA-TRAB-1 · Contenido.** Todos los trabajadores de la red, activos y desactivados, por sede y nombre.

| Dato | Contenido |
| --- | --- |
| Trabajador | Nombre (enlace) e identificador |
| Sede y operador | Enlaces; o «Sin operador» |
| Correo de verificación | Enmascarado |
| Estado | **FR-SA-TRAB-7** |
| Alta | Fecha |
| Última jornada | Enlace: abierta ahora, o fecha y caja; o ninguna |

**FR-SA-TRAB-2 · Filtros.** Búsqueda por nombre o identificador; operador; sede; estado: pueden entrar, no pueden entrar (por cualquier motivo, incluida la desactivación), desactivados por su administrador.

**FR-SA-TRAB-7 · Por qué no puede entrar.** Se muestra el motivo más amplio, que es el que hay que levantar primero:

| Orden | Motivo | Quién lo resuelve |
| --- | --- | --- |
| 1 | Sede cerrada | Nadie: es definitivo |
| 2 | Sede sin operador | PuntoCash, asignándola |
| 3 | Operador suspendido | PuntoCash, reactivándolo |
| 4 | Sede suspendida | PuntoCash, reactivándola |
| 5 | Desactivado | Su administrador, en `/admin` |

Si además está desactivado, el estado lo añade.

### 7.2 Ficha — `/super-admin/trabajadores/[id]`

**FR-SA-TRAB-3 · Contenido.** Si no puede entrar, el motivo y quién lo resuelve. Datos (identificador, documento, teléfono, correo enmascarado, alta, estado en su consola); su sede y su operador con sus estados y el contacto del operador; su actividad reciente (las 8 jornadas más recientes, con enlace a Jornadas filtradas por esa persona si hay más); y las sedes en las que ha trabajado.

**FR-SA-TRAB-4 · Solo lectura.** Esta consola no da de alta, no edita, no desactiva y no reactiva trabajadores **[A14]**.

**FR-SA-TRAB-5 · Sin asistencia de acceso.** Tampoco ayuda con el acceso: lo hace su administrador (**FR-AD-TRAB-***).

**FR-SA-TRAB-6 · El recurso real.** La ficha lo dice: los trabajadores los gestiona su administrador, y el recurso de PuntoCash ante un problema es suspender la sede o al operador.

**Ver en la demo:** Trabajadores, filtro «No pueden entrar»: hay de Trinidad (sede suspendida) y de Camagüey y Holguín (operador suspendido).

---

## 8. Servicios — `/super-admin/servicios`

**FR-SA-SERV-1 · Matriz.** Sedes no cerradas por servicios disponibles (hoy: Cambio de moneda, Remesas, Giros). Cada servicio dice en cuántas de las sedes visibles está habilitado. Por debajo de 1024px, una tarjeta por sede. Los servicios que el producto aún no ofrece se nombran aparte y no se pueden habilitar.

**FR-SA-SERV-8 · Filtros.** Búsqueda de sede, operador (con «Sin operador asignado») y provincia.

**FR-SA-SERV-2 / FR-SA-SERV-3 · Cambiar.** Pulsar una celda abre la confirmación, que dice qué cambia: el servicio aparece o deja de aparecer en las cajas de la sede y en su kiosco desde ese momento. **Deshabilitar pide motivo**; habilitar no.

**FR-SA-SERV-4 · Cambio de moneda.** Habilitarlo permite a su mercante fijar tasas. Deshabilitarlo saca sus tasas del tablero y de la cotización en el acto; las tasas se conservan y vuelven si se habilita de nuevo. La lista de monedas de la sede no cambia: la siguen necesitando remesas y giros.

**FR-SA-SERV-5 / FR-SA-SERV-6 · Hacia adelante.** No cambia ninguna operación ya registrada **[R9]**.

**FR-SA-SERV-7 · Último servicio.** Una sede activa no se queda sin servicios: el diálogo lo dice y no pide motivo.

| Condición | Código |
| --- | --- |
| Motivo no válido al deshabilitar | `motivo-requerido` |
| La sede no existe | `sede-no-encontrada` |
| La sede está cerrada | `sede-cerrada` |
| Servicio que el producto no ofrece | `servicio-no-disponible` |
| Otra persona acaba de cambiarlo | `servicio-cambiado` |
| Último servicio de una sede activa | `ultimo-servicio` |

**Auditoría.** `servicio.habilitado` o `servicio.deshabilitado`, uno por servicio: autor, sede, operador vigente y, al deshabilitar, el motivo. Igual desde la ficha de la sede (**FR-SA-SERV-9**).

**Ver en la demo:** Servicios. PuntoCash Matanzas no tiene Cambio de moneda.

---

## 9. Monedas y tasas — `/super-admin/monedas-y-tasas`

Dos vistas: **Monedas y rangos** (por defecto) y **Tasas por sede** (`?vista=sedes`).

### 9.1 Monedas y rangos

**FR-SA-MON-1 · Tabla.** Una fila por moneda del catálogo, salvo el peso cubano, que es la referencia: no lleva rango y no se retira (**FR-SA-MON-5**). Primero las disponibles; al final las retiradas (**FR-SA-MON-7**).

| Dato | Contenido |
| --- | --- |
| Moneda | Bandera, código, nombre, símbolo; «Retirada» si lo está |
| Compra (CUP) · Venta (CUP) | Rango «mínimo – máximo», o «Sin rango» |
| Sedes | **FR-SA-MON-2** |
| Último cambio | Fecha y autor del rango |
| Acciones | Menú «⋯» (**FR-SA-SHELL-9**) |

**FR-SA-MON-2 · Uso.** Con rango: cuántas sedes la **cotizan** (su tablero la publica) y en la lista de cuántas está. Sin rango: cuántas sedes **la esperan** —la tienen en su lista y tienen Cambio de moneda, y no pueden cotizarla—, señalado; o en la lista de cuántas está. Solo cuentan sedes no cerradas.

**Acciones de cada fila.**

| Acción | Cuándo |
| --- | --- |
| Definir rango / Cambiar rango | Salvo moneda retirada sin rango (**FR-SA-MON-8**) |
| Retirar rango | Si tiene rango |
| Retirar del catálogo | Si está disponible |
| Reincorporar al catálogo | Si está retirada |

### 9.2 Definir o cambiar el rango

**FR-SA-TASA-1 · Qué es.** El rango de una moneda son los límites de compra y de venta, **en pesos cubanos por unidad**, dentro de los cuales cualquier sede fija su tasa **[A5]**. Una tasa es siempre una moneda contra el peso cubano; no hay pares cruzados.

**FR-SA-TASA-2 · Sin rango no se cotiza.** Ninguna sede publica ni aplica la tasa de una moneda sin rango **[RP-22]**.

**FR-SA-TASA-4 · Campos.** Compra mínima y máxima, venta mínima y máxima, todos obligatorios, con coma o punto decimal. Vienen con el rango actual.

| Regla | Código |
| --- | --- |
| Todos mayores que cero | `valor-invalido` |
| **FR-SA-TASA-17** · Hasta 4 decimales | `demasiados-decimales` |
| Mínimo menor que máximo, en compra y en venta | `minimo-mayor` |
| Compra mínima ≤ venta mínima **y** compra máxima ≤ venta máxima | `rango-incoherente` |

La coherencia garantiza que llevar compra y venta a sus límites por separado nunca deja una compra por encima de la venta.

**FR-SA-TASA-16 · Motivo al cambiar.** **Definir** el primer rango no pide motivo. **Cambiar** un rango ya definido pide **motivo**, porque mueve límites que las sedes ya usan.

**FR-SA-TASA-5 / FR-SA-TASA-6 · Antes de guardar.** La pantalla calcula y muestra qué sedes **no cerradas** tienen hoy una tasa fuera del rango nuevo, con su tasa actual y la que quedaría, y advierte de que al guardar se fijarán al límite, su tablero cambiará y se avisará a sus administradores. Si ninguna queda fuera, también lo dice.

**FR-SA-TASA-7 · Al guardar.** Cada tasa de una sede no cerrada que queda fuera se **fija al límite más cercano**, compra y venta por separado, y se marca como ajustada por PuntoCash con su valor anterior: su mercante la ve señalada hasta que la confirma o elige otra (**FR-AD-TASA-***). Las tasas de sedes cerradas no se mueven.

**FR-SA-TASA-8 · Única escritura.** Ese ajuste es la **única** escritura de esta consola sobre la tasa de una sede **[RP-26]**.

**FR-SA-TASA-10 · Hacia adelante.** No cambia ninguna operación registrada **[R9]**.

| Condición | Código |
| --- | --- |
| Reglas de la tabla anterior | (sus códigos) |
| Cambiar sin motivo válido | `motivo-requerido` |
| Peso cubano | `moneda-local` |
| No está en el catálogo | `moneda-desconocida` |
| Retirada y sin rango | `moneda-retirada` |

**Ver en la demo:** Monedas y tasas → USD → Cambiar rango, compra 300–310 y venta 310–320: la pantalla nombra las sedes que quedarían fuera. JPY → Definir rango: no pide motivo.

### 9.3 Retirar el rango

**FR-SA-TASA-9.** Pide **motivo** y advierte qué sedes dejan de cotizar la moneda y de mostrarla en su tablero. **Las tasas no se borran**: vuelven, ajustadas al rango, si se define de nuevo.

| Condición | Código |
| --- | --- |
| Motivo no válido | `motivo-requerido` |
| Ya no tiene rango | `sin-rango` |

### 9.4 Añadir una moneda al catálogo

**FR-SA-MON-9 · De la lista ISO.** Se elige de la **lista ISO 4217** (159 monedas, sin metales ni unidades de cuenta); el código, el nombre, el símbolo y la **bandera** vienen con ella y no se escriben. La lista ofrece solo las que no están en el catálogo; las retiradas no se ofrecen: se reincorporan. **Toda moneda se maneja con 4 decimales**, fijos y no editables. El catálogo **se añade y se retira, no se edita**.

**FR-SA-MON-10 · Banderas.** Toda moneda de la lista ISO trae su bandera, en el mismo sitio que la lista (`network/iso-monedas.ts` y `public/banderas/`). Las monedas de varios países sin bandera común (XAF, XOF, XCD, XPF) llevan una bandera neutra.

**FR-SA-MON-3 · Efecto.** La moneda queda disponible para toda la red, **sin activarse en ninguna sede** y **sin rango**: cada mercante la añade a sus sedes, y para cotizarla hace falta definir su rango.

| Condición | Código |
| --- | --- |
| No es de la lista ISO | `codigo-invalido` |
| Ya está en el catálogo | `ya-existe` |
| Está retirada | `esta-retirada` |

### 9.5 Retirar y reincorporar

**FR-SA-MON-4 · Retirar.** Pide **motivo** y advierte en cuántas sedes y cajas seguirá. **Solo cambia lo que viene**: ningún mercante puede añadirla a más sedes; las que la tienen la conservan, con saldos e historial, hasta que su mercante la quite. Su rango y sus tasas se mantienen.

**FR-SA-MON-7 · No desaparece.** Una retirada sigue en la tabla, al final, con su etiqueta.

**FR-SA-MON-8 · Sin rango nuevo.** A una retirada sin rango no se le define uno: no se abre a la red una moneda que ya no se ofrece. Con rango, se puede cambiar y retirar.

**Reincorporar.** Sin motivo. Vuelve a estar disponible para añadirse a las sedes.

| Condición | Código |
| --- | --- |
| Retirar sin motivo válido | `motivo-requerido` |
| No está en el catálogo | `no-existe` |
| Peso cubano | `moneda-local` |
| Ya estaba retirada | `ya-retirada` |
| Reincorporar una que no está retirada | `no-esta-retirada` |

### 9.6 Tasas por sede — `?vista=sedes`

**FR-SA-TASA-12 · Contenido.** Una tarjeta por sede no cerrada, con su operador y si no tiene Cambio de moneda. Por cada moneda de su lista: compra y venta (resaltadas si están en vigor), el rango, por qué no se publica si no se publica (sin rango, o sin Cambio de moneda) y el último cambio —quién y cuándo, o «fijada al límite por PuntoCash»—. El peso cubano figura como moneda de referencia.

Filtros: búsqueda de sede, operador y moneda (con moneda, cada tarjeta muestra solo esa y el peso cubano).

**FR-SA-TASA-13 · Solo lectura.** Las monedas de una sede y sus tasas las decide su mercante **[A4]**, **[A5]**.

### 9.7 Auditoría

**FR-SA-TASA-11 / FR-SA-MON-6** **[RP-21]**

| Acción | Evento | Datos |
| --- | --- | --- |
| Definir · Cambiar rango | `rango.definido` · `rango.cambiado` | Autor, moneda; antes y después de compra y venta; al cambiar, motivo |
| Cada tasa fijada al límite | `tasa.fijada-al-limite` | Autor, sede, operador vigente; antes y después de compra y venta; motivo del cambio |
| Retirar rango | `rango.retirado` | Autor, moneda, motivo; antes el rango, después cuántas sedes dejan de cotizarla |
| Añadir moneda | `moneda-plataforma.alta` | Autor, moneda; después: símbolo y 4 decimales |
| Retirar moneda | `moneda-plataforma.retirada` | Autor, moneda, motivo; después: en cuántas sedes sigue |
| Reincorporar | `moneda-plataforma.reincorporada` | Autor, moneda |

---

## 10. Promociones

### 10.1 Reglas

**FR-SA-PROM-1 · Qué son.** Lo que PuntoCash anuncia en la pantalla informativa de sus sedes. Conviven con las promociones que cada mercante publica para las suyas.

**FR-SA-PROM-2 · Destino.** «Toda la red» —todas las sedes no cerradas, **también las que se creen después**— o las sedes que se marquen. Lo que se guarda es «toda la red» o la lista de sedes: «por operador» y «por provincia» son atajos para marcar, no criterios. Una sede marcada sigue mostrándola aunque cambie de operador.

**FR-SA-PROM-11 · Escaparate.** El destino **no depende de los servicios de la sede**: una sede también es el escaparate de PuntoCash, y anuncia aunque no preste el servicio, la administre quien la administre. La consola no avisa ni bloquea.

**FR-SA-PROM-3 · Campos.**

| Campo | Obligatorio | Reglas |
| --- | --- | --- |
| Título | Sí | Hasta 40 caracteres |
| Texto | Sí | Hasta 120 caracteres |
| Imagen | No | JPG, PNG o WebP, hasta 2 MB; el navegador la reduce y recodifica |
| Dónde se muestra | Sí | Toda la red, o al menos una sede no cerrada |
| Desde · Hasta | Sí | Inicio no anterior a hoy; fin no anterior al inicio ni a hoy. Una promoción ya en pantalla no cambia su inicio |

El formulario conserva lo escrito ante un rechazo e incluye la vista previa de la diapositiva.

**FR-SA-PROM-5 · Saturación.** En la pantalla, cada promoción es una diapositiva de 12 segundos; con más de **cuatro** a la vez, un cliente que espera no las ve todas. El formulario dice, por sede, con cuántas coincidiría a la vez en el periodo y de quién es cada una («1 de PuntoCash, 3 de {operador}»), y avisa si alguna pasaría de cuatro; **no bloquea**. El listado avisa de las sedes que **hoy** tienen más de cuatro. Cuentan las de red y las de los operadores.

**FR-SA-PROM-6 / FR-SA-PROM-7.** Solo se exhiben las vigentes en la fecha. Nada de lo publicado alimenta ni modifica una operación.

**Estado.** Programada (aún no empieza), vigente, vencida (terminó o se retiró). Se calcula con la fecha de Cuba.

### 10.2 Listado — `/super-admin/promociones`

**FR-SA-PROM-9 · Solo las de red.** Pestañas Vigentes (por defecto), Programadas y Vencidas, con su número. Columnas: título (enlace), dónde se muestra, fechas, quién la publicó (y la fecha de retirada si se retiró). Las de los operadores no están en la lista: cuentan para la saturación y se abren, en lectura, desde la ficha de su sede. Ofrece **Nueva promoción**.

### 10.3 Nueva promoción y edición

`/super-admin/promociones/nueva` para crear. Una promoción de red **no vencida** se edita en su propia ficha, `/super-admin/promociones/[id]`, que ofrece además **Retirar**. Una de red vencida o retirada, o una de un operador, se abre en **solo lectura**.

**FR-SA-PROM-4 / FR-SA-PROM-10 · Solo PuntoCash.** El administrador de sede la ve en su lista como «Publicada por PuntoCash» —nunca con el nombre de la persona— y no puede editarla ni retirarla.

| Condición | Código |
| --- | --- |
| Título vacío · largo | `titulo-vacio` · `titulo-largo` |
| Texto vacío · largo | `texto-vacio` · `texto-largo` |
| Ninguna sede y no es toda la red | `sin-sedes` |
| Sede inexistente | `no-encontrada` |
| Sede cerrada | `sede-cerrada` |
| Fechas vacías o mal formadas | `fecha-invalida` |
| Inicio anterior a hoy | `inicio-pasado` |
| Cambiar el inicio de una ya en pantalla | `inicio-fijo` |
| Fin anterior al inicio | `fin-antes-de-inicio` |
| Fin anterior a hoy | `fin-pasado` |
| Imagen de otro formato · demasiado pesada | `imagen-invalida` · `imagen-pesada` |
| Editar una de un operador | `del-operador` |
| Editar o retirar una vencida | `vencida` |

### 10.4 Retirar

**FR-SA-PROM-12 · Con motivo.** Retirar pide **motivo**. La quita de las pantallas **en el acto** (o impide que llegue a verse, si estaba programada). No se borra: pasa a Vencidas con la fecha y quién la retiró.

**Ver en la demo:** Promociones → abrir una vigente → Retirar.

### 10.5 Auditoría

**FR-SA-PROM-8** **[RP-21]**

| Acción | Evento | Datos |
| --- | --- | --- |
| Publicar | `promocion-red.alta` | Autor; después: título, texto, destino, fechas, si lleva imagen |
| Editar | `promocion-red.editada` | Autor; antes y después de lo mismo |
| Retirar | `promocion-red.retirada` | Autor, título, si estaba en pantalla o aún no había empezado, motivo |

---

## 11. Jornadas

### 11.1 Listado — `/super-admin/jornadas`

**FR-SA-JOR-1 · Contenido.** Todas las jornadas de la red, de todas las sedes. Primero las abiertas; después por día de apertura, de la más reciente; después por sede.

| Dato | Contenido |
| --- | --- |
| Caja y sede | Caja (enlace a la jornada) y sede (enlace) |
| Operador | **El que administraba la sede cuando se abrió** **[RP-27]** |
| Trabajador | Enlace a su ficha |
| Jornada | Fecha, apertura y cierre (con la fecha si cerró otro día), o abierta |
| Estado | Abierta · Cerrada · Cierre forzado |
| Operaciones | Número |
| Cierre | Cuadrada; las diferencias por moneda con su signo; sin contar —pendiente de conciliar o contada al abrir la siguiente—; o nada si está abierta |

**FR-SA-JOR-2 · Filtros.** Desde y hasta (por defecto, los últimos 7 días), operador, sede y estado. **Una jornada abierta se muestra siempre**, aunque se abriera antes del periodo: es una caja que nadie cerró. Desde la ficha de un trabajador se llega filtrado por esa persona, con la opción de quitar el filtro.

### 11.2 Detalle — `/super-admin/jornadas/[id]`

**FR-SA-JOR-3 · Contenido.** El mismo cuerpo que en Admin (**FR-AD-JOR-***): la jornada, la apertura con lo contado y lo dejado por el cierre anterior, los saldos, el cierre y los movimientos. La cabecera nombra la sede y **el operador de la fecha**. Si sigue abierta de un día anterior, lo señala y dice que forzar el cierre es de su administrador. Si tuvo cierre forzado, quién, cuándo, el motivo y si ya se contó.

**FR-SA-JOR-4 · Sin acciones.** No se fuerza un cierre ni se resuelve una aprobación desde la jornada **[A6]**, **[A14]**. La única aprobación que resuelve PuntoCash es la que no tiene quien la resuelva (§11.3).

### 11.3 Aprobaciones sin quien las resuelva — `/super-admin/aprobaciones`

**FR-SA-APR-1 · Cuáles.** Una diferencia de efectivo (ajuste, cierre o apertura) **pendiente** cuya jornada se abrió cuando la sede era de un operador que **ya no la administra**. Nadie de la sede puede resolverla: la empresa de entonces perdió la sede, y la de ahora solo ve su propia etapa (**FR-AD-SCOPE-7**). Las resuelve **PuntoCash** (decisión del 03/11/2026). Las demás son de cada mercante y aquí no aparecen.

**FR-SA-APR-2 · Lista.** «Pendientes», de la más antigua: tipo y diferencia con su signo y el motivo del trabajador; sede, caja y trabajador; operador de entonces y operador de hoy; fecha y antigüedad. Debajo, «Resueltas por PuntoCash», con la fecha y quién. Sin pendientes, la pantalla lo dice. Una diferencia que no es de esta lista responde como inexistente.

**FR-SA-APR-3 · Resolver.** El detalle dice por qué la resuelve PuntoCash, muestra lo que registró el trabajador (referencia, contado, diferencia, motivo, observaciones, jornada) y ofrece **Aprobar** y **Rechazar**, con un motivo de al menos 10 caracteres que se añade al del trabajador. Como en Admin (**FR-AD-APR-***): resolver **deja constancia, no cambia la caja** ni el movimiento registrado; rechazar la marca para revisarla fuera del sistema.

**FR-SA-APR-4 · Revalidación.** Al confirmar, el servidor comprueba que siga pendiente (`ya-resuelta`) y sin quien la resuelva (`no-es-huerfana`: por ejemplo, la sede volvió a la empresa de entonces). En los dos casos no se guarda nada y la pantalla lo explica.

**FR-SA-APR-5 · Auditoría.** `solicitud.aprobada` o `solicitud.rechazada`, con la persona de PuntoCash como autor, la sede, el **operador de entonces** y el motivo. La resolución queda marcada como de PuntoCash.

| Condición | Código |
| --- | --- |
| Motivo de menos de 10 caracteres | `motivo-corto` |
| No existe | `no-encontrada` |
| Ya resuelta | `ya-resuelta` |
| Ya tiene quien la resuelva | `no-es-huerfana` |

**Ver en la demo:** Aprobaciones: las diferencias de los últimos días de Atlántico en PuntoCash Miramar (27 a 29/06/2026). Con `rortega@caribecambios.cu`, en Admin, no aparecen.

**Ver en la demo:** Jornadas (una caja de PuntoCash Obispo sigue abierta desde ayer). Jornadas con «Desde» 01/06/2026 y operador Atlántico Casas de Cambio: las jornadas de Miramar de junio.

---

## 12. Operaciones

### 12.1 Listado — `/super-admin/operaciones`

**FR-SA-OPS-1 · Contenido.** Todas las operaciones de la red —completadas, en proceso, rechazadas, fallidas y canceladas—, de la más reciente.

| Dato | Contenido |
| --- | --- |
| Operación | Código, fecha y hora, estado |
| Servicio | Servicio y, en un giro, enviado o pagado; si vino del kiosco, lo dice |
| Cliente | Nombre y documento |
| Importe | En un cambio, lo que entrega y lo que recibe; en lo demás, el importe |
| Sede y operador | Sede y **el operador de ese día**, o «Sin operador ese día» |
| Trabajador | Enlace a su ficha |

Filtros: búsqueda (código, cliente o documento), desde y hasta (por defecto, los últimos 7 días), operador, sede, servicio y estado.

### 12.2 Detalle — `/super-admin/operaciones/[codigo]`

**FR-SA-OPS-2 · Contexto.** Sede, **operador responsable** —el de ese día, y si hoy la administra otro, quién—, caja y equipo, trabajador, jornada y origen (mostrador o solicitud de kiosco). Debajo, el detalle de Worker según el servicio.

**FR-SA-OPS-3 · Por qué.** Es lo que da sentido al historial de asignaciones: una operación de junio en Miramar es de Atlántico, aunque hoy la sede sea de Caribe **[RP-20]**, **[RP-27]**.

**FR-SA-OPS-4 · Sin acciones.** No se reimprime, no se anula ni se corrige **[A6]**, **[A7]**.

**Ver en la demo:** Operaciones con «Desde» 01/06/2026 y operador Atlántico Casas de Cambio; abrir una: «El que administraba la sede ese día. Hoy la administra Caribe Cambios S.A.».

---

## 13. Reportes — `/super-admin/reportes`

**FR-SA-REP-1 · Cortes.** El volumen de un periodo por **operador** (por defecto), **sede**, **servicio**, **provincia** o **día**. El corte por día lleva un gráfico; el corte por servicio, si hubo cambio de moneda, la tabla de lo comprado, lo vendido, el volumen y la **posición neta** de cada divisa (que no es volumen).

**FR-SA-REP-2 · Periodo.** Por defecto los últimos 7 días. Atajos: hoy, últimos 7 días, últimos 30 días, mes en curso; o desde y hasta. Máximo **un año**: si se pasa, se recorta y se dice.

**FR-SA-REP-3 · Volumen.** Solo operaciones **completadas**, cada una una vez, por moneda y **sin convertir**. En un cambio, la divisa negociada (compra o venta); en una remesa, lo pagado; en un giro, su importe, enviado o pagado (**FR-AD-REP-***). Sin operaciones, la pantalla lo dice.

**FR-SA-REP-5 · De quién es cada operación.** Del operador que administraba la sede **el día en que se hizo** **[RP-27]**. Una fila «Sin operador» aparece solo si hay operaciones sin dueño, para que las filas sumen el total.

**FR-SA-REP-4 · Comparar operadores.** El corte por operador incluye a quien tuvo algún tramo en el periodo o alguna operación atribuida, con la columna **Sedes** (las que administró en el periodo). Con «Por sede administrada», cada cifra se divide entre esas sedes, para comparar mercantes de distinto tamaño.

**FR-SA-REP-6 · Por sede.** Las sedes no cerradas y las cerradas que operaron en el periodo, cada una con su operador o sus operadores del periodo.

**FR-SA-REP-7 · Sin economía.** Ni comisiones, ni rentas, ni márgenes **[A8]**.

**FR-SA-REP-8 · Exportar.** «Exportar a Excel» y «Exportar a PDF» descargan el periodo de la pantalla con **todos** los cortes, el de operador por sede administrada y el de cambio por divisa. Solo totales: ninguna fila nombra a un cliente. Cada exportación se registra como `reporte.exportado`, con formato y periodo.

**Ver en la demo:** Reportes → «Por operador» con el periodo de junio de 2026: Atlántico aparece con las operaciones de Miramar.

---

## 14. Auditoría

### 14.1 Registro — `/super-admin/auditoria`

**FR-SA-AUD-1 · Contenido.** Todo acto de gobierno de la red —de PuntoCash y de los mercantes—, del más reciente al más antiguo, **50 a la vez** con «Mostrar más eventos». Sin ventana de fechas obligatoria: quien audita busca un acto, no un periodo.

| Dato | Contenido |
| --- | --- |
| Fecha y hora | Hora de Cuba |
| Evento | El acto en lenguaje de negocio y su objeto |
| Quién | Persona y rol: PuntoCash, o mercante con su operador |
| Sede y operador | Enlaces, si los tiene |
| Motivo declarado | El motivo, si lo tiene |

**FR-SA-AUD-3 / FR-SA-AUD-4 · Filtros.** Quién actuó (PuntoCash, mercantes o ambos); tipo de evento, agrupado por lo que se gobierna; persona; operador; sede; desde y hasta (por día de Cuba, ambos incluidos); búsqueda en el **objeto y el motivo**. Cambiar un filtro vuelve a los 50 primeros.

**FR-SA-AUD-2 · Qué se registra.** Como mínimo, todos los actos de este documento y de la consola del mercante. Los tipos, por área:

| Área | Tipos |
| --- | --- |
| Sedes | `sede.creada` · `.editada` · `.asignada` · `.revocada` · `.suspendida` · `.reactivada` · `.cerrada` |
| Operadores | `operador.alta` · `.suspendido` · `.reactivado` · `.baja` · `.acceso-principal-restablecido` |
| Servicios | `servicio.habilitado` · `.deshabilitado` |
| Monedas y tasas | `moneda-plataforma.alta` · `.retirada` · `.reincorporada` · `rango.definido` · `.cambiado` · `.retirado` · `tasa.fijada-al-limite` · y los del mercante: `moneda-sede.*`, `par.*` |
| Promociones | `promocion-red.alta` · `.editada` · `.retirada` · y `promocion-sede.*` |
| Cajas y equipos | `caja.*`, `equipo-caja.*`, `kiosco.*` (mercante) |
| Trabajadores | `trabajador.*` (mercante) |
| Administradores | `usuario-admin.*` (mercante) |
| Jornadas y aprobaciones | `solicitud.aprobada` · `.rechazada` (mercante, o PuntoCash en las de **FR-SA-APR-1**), `jornada.cierre-forzado` (mercante) |
| Cuentas de PuntoCash | `usuario-puntocash.alta` · `.editado` · `.credencial-regenerada` · `.desactivado` · `.reactivado` · `.principal-traspasado` · `.contrasena-cambiada` |
| Reportes y auditoría | `reporte.exportado` · `auditoria.exportada` |

**FR-SA-AUD-8 · Lenguaje de negocio.** Ningún evento se muestra con su identificador interno ni con un valor en bruto **[R10]**.

### 14.2 Detalle — `/super-admin/auditoria/[id]`

**FR-SA-AUD-7.** Fecha y hora, quién actuó, sobre qué, sede, operador, motivo declarado y, si lo hay, **antes y después**.

**FR-SA-AUD-5 · Enlaces.** Desde la lista y el detalle se llega a la **sede** y al **operador** del evento, y a su **objeto** cuando el evento lo guarda: un **trabajador** (a su ficha) o una **cuenta de PuntoCash** (a su ficha en Usuarios, **solo para el principal**; para los demás es texto).

### 14.3 Reglas

**FR-SA-AUD-6 · Inalterable.** Nadie edita ni borra un evento desde ninguna superficie del producto, tampoco esta **[RP-21]**. No hay controles, ni deshabilitados.

**FR-SA-AUD-10 · Autor.** El autor es siempre una **persona** —una cuenta de PuntoCash o un administrador de un mercante—, nunca el nombre de un área **[RP-29]**. En la consola del mercante, un acto de PuntoCash se muestra como «PuntoCash».

**FR-SA-AUD-9 · Exportar.** «Exportar a Excel» descarga **todos** los eventos que cumplen los filtros de la pantalla (no solo los 50 visibles), con los filtros escritos en la cabecera y quién lo generó. Como ese archivo **nombra a personas**, la exportación deja su propio evento, `auditoria.exportada`, con el número de eventos y los filtros.

**Ver en la demo:** Auditoría → filtro «Solo PuntoCash»; abrir «Sede suspendida» de PuntoCash Trinidad (Jorge Aguilera Ruiz).

---

## 15. Usuarios — cuentas de PuntoCash

### 15.1 Quién la ve

**FR-SA-USR-1 · Solo el principal.** La sección solo existe para el **principal**: para el resto no está en la navegación, y todas sus rutas responden como inexistentes (**FR-SA-NAV-3**), no como prohibidas. El servidor comprueba que quien actúa es el principal en cada escritura (`no-es-el-principal`).

**FR-SA-USR-2 · El principal.** Hay exactamente uno. El primero viene dado; después solo cambia por **traspaso** (**FR-SA-USR-10**). A su titular no lo desactiva nadie, ni él mismo.

**Ver en la demo:** con `jaguilera@puntocash.com`, `/super-admin/usuarios` responde «no encontrado».

### 15.2 Listado — `/super-admin/usuarios`

**FR-SA-USR-3.** Todas las cuentas, activas y desactivadas: el principal primero, después las activas, después por nombre. Datos: nombre (con «Tú» en la propia), identificador, correo enmascarado, estado, alta, último acceso, papel (principal o super administrador). Búsqueda por nombre o identificador. Ofrece **Dar de alta**.

### 15.3 Dar de alta — `/super-admin/usuarios/nuevo`

**FR-SA-USR-4 · Campos.**

| Campo | Obligatorio | Reglas |
| --- | --- | --- |
| Nombre · Primer apellido | Sí | — |
| Segundo apellido | No | — |
| Teléfono | Sí | Como en **FR-SA-SEDE-4** |
| Área | Sí | Texto libre |
| Correo | Sí | Único entre las cuentas de PuntoCash |
| Identificador de acceso | Sí | Como en **FR-SA-OPE-3**; único entre las cuentas de PuntoCash |

**FR-SA-USR-5 · Aviso.** El alta advierte que la cuenta verá y gobernará toda la red, pero no esta sección.

**FR-SA-USR-6 · Credencial.** La confirmación muestra **una sola vez** el identificador y una credencial que **es su contraseña** desde ese instante **[RP-30]**.

### 15.4 Ficha y acciones — `/super-admin/usuarios/[id]`

**FR-SA-USR-7 · Ficha.** Estado, identificador, área, teléfono, correo enmascarado, alta, último acceso y papel. Si está desactivada, lo dice.

| Acción | Campos | Efecto |
| --- | --- | --- |
| **Editar datos** (`/editar`) | Nombre, apellidos, teléfono, área | Guarda. Sin cambios, no registra nada |
| **Cambiar correo** | Correo (único) | Los próximos códigos van ahí. Si es el propio, avisa de que un error lo dejaría sin poder entrar |
| **Regenerar credencial** | — | **FR-SA-USR-8**: muestra una sola vez una credencial nueva, que es la contraseña; **la anterior deja de servir** |
| **Desactivar** | **Motivo** | No puede entrar; lo que hizo no se borra. Una sesión abierta se corta en su siguiente petición. No se ofrece sobre el principal |
| **Reactivar** | **Motivo** | Vuelve a poder entrar |
| **Traspasar la administración de cuentas** | Cuenta activa de destino y **motivo** | **FR-SA-USR-10**: solo en la ficha del propio principal, si hay otra cuenta activa |

**FR-SA-USR-9 · Al principal no lo desactiva nadie.** Su ficha lo dice, y cómo dejar el puesto: traspasar primero.

**FR-SA-USR-10 · Traspaso.** Inmediato y en un solo acto: el destino pasa a ser el principal y quien traspasa deja de serlo, pierde la sección y conserva todo lo demás. Pide **motivo**, porque cambia quién gobierna las cuentas de la consola.

| Condición | Código |
| --- | --- |
| Quien actúa no es el principal | `no-es-el-principal` |
| La cuenta no existe | `usuario-no-encontrado` |
| Campo obligatorio vacío | `campo-requerido` |
| Teléfono no válido | `telefono-invalido` |
| Correo no válido | `correo-invalido` |
| Correo de otra cuenta | `correo-duplicado` |
| Identificador mal formado · de otra cuenta | `identificador-invalido` · `identificador-duplicado` |
| Desactivar al principal | `es-el-principal` |
| Motivo no válido | `motivo-requerido` |
| Desactivar una ya desactivada | `ya-desactivado` |
| Reactivar una activa | `ya-activo` |
| Traspasar sin elegir destino | `destino-requerido` |
| Traspasarse a sí mismo | `es-uno-mismo` |
| Traspasar a una cuenta no activa | `destino-no-activo` |

**Ver en la demo:** Usuarios → Dar de alta; con la credencial mostrada, entrar en `/super-admin/login` con esa cuenta (la contraseña `puntocash` ya no le sirve).

### 15.5 Auditoría

**FR-SA-USR-11** **[RP-21]**

| Acción | Evento | Datos |
| --- | --- | --- |
| Dar de alta | `usuario-puntocash.alta` | Autor, cuenta |
| Editar (si cambió algo) · Cambiar correo | `usuario-puntocash.editado` | Autor, cuenta; el correo anterior y el nuevo |
| Regenerar credencial | `usuario-puntocash.credencial-regenerada` | Autor, cuenta. Nunca la credencial |
| Desactivar · Reactivar | `usuario-puntocash.desactivado` · `.reactivado` | Autor, cuenta, motivo |
| Traspasar | `usuario-puntocash.principal-traspasado` | Autor, principal anterior y nuevo, motivo |

---

## 16. Perfil

**FR-SA-PERF-1 · Perfil — `/super-admin/perfil`.** Cualquier sesión. Nombre, identificador, correo enmascarado, teléfono y área, en lectura. El principal ve un enlace a su ficha en Usuarios, donde los corrige; los demás, a quién pedírselo.

**FR-SA-PERF-2 · Cambiar la contraseña — `/super-admin/perfil/contrasena`.**

| Regla, en orden | Código |
| --- | --- |
| La actual es correcta | `actual-incorrecta` |
| La nueva tiene al menos 8 caracteres | `demasiado-corta` |
| La nueva es distinta de la actual | `igual-a-la-actual` |
| La repetida coincide | `no-coinciden` |

**FR-SA-PERF-3 · Efecto.** Guarda la nueva; **la sesión desde la que se cambia sigue abierta**. Se registra `usuario-puntocash.contrasena-cambiada` con la cuenta, nunca la contraseña.

---

## 17. Comportamiento transversal

**FR-SA-STATE-1 · Estados de pantalla.** Rigen los de la consola del mercante (**FR-AD-STATE-***): vacío con texto propio por listado y por «sin resultados con estos filtros», error de carga con «Volver a intentarlo», formularios que conservan lo escrito ante un rechazo.

**FR-SA-STATE-2 · Motivo.** Piden **motivo** los actos que quitan o sancionan algo, o cambian un límite de la red en vigor **[RP-29]**:

| Pide motivo | No pide motivo |
| --- | --- |
| Asignar una sede (también al crearla con operador) · revocar · suspender, reactivar y cerrar una sede | Crear y editar una sede |
| Suspender, reactivar y dar de baja un operador · restablecer el acceso de su principal | Dar de alta un operador |
| Deshabilitar un servicio | Habilitar un servicio |
| Cambiar un rango ya definido · retirar un rango | Definir el primer rango |
| Retirar una moneda del catálogo | Añadir y reincorporar una moneda |
| Retirar una promoción de red | Publicar y editar una promoción de red |
| Desactivar, reactivar y traspasar una cuenta de PuntoCash | Dar de alta, editar, cambiar el correo y regenerar la credencial de una cuenta · cambiar la propia contraseña |
| Aprobar o rechazar una diferencia sin quien la resuelva | — |

**FR-SA-STATE-3 · Antes de confirmar.** Toda acción con consecuencias muestra antes qué va a cambiar y a quién afecta. Las que se bloquean (revocar o cerrar con jornadas abiertas, dar de baja con sedes, quitar el último servicio) lo dicen en el diálogo, con lo que hay que resolver, y no piden motivo.

**FR-SA-STATE-4 · Lo que no se puede cambiar.** Donde esta consola muestra algo que no puede cambiar, dice de quién es y, si sirve, ofrece el contacto del operador.

**FR-SA-DOM-1 · Dominio compartido.** Esta consola usa el mismo dominio que la del mercante (`src/features/network`).

**FR-SA-DOM-2 · Alcance explícito.** Toda lectura y escritura recibe el alcance como parámetro, y el alcance global es un valor explícito, nunca la ausencia del parámetro. Toda escritura de gobierno rechaza un alcance que no sea global (`alcance-insuficiente`, o `solo-puntocash` en promociones).

**FR-SA-DOM-3 · Lo que el dominio no expone a esta consola.** Ninguna escritura sobre cajas, equipos, trabajadores, administradores de un mercante (salvo el restablecimiento del principal), monedas de una sede ni tasas de una sede (salvo el ajuste al límite, **FR-SA-TASA-8**) acepta el alcance global **[RP-26]**.

**FR-SA-DOM-4 · Operador en una fecha.** El dominio responde quién administraba una sede en cualquier instante **[RP-20]**, y Jornadas, Operaciones, Reportes y los recuentos de Operadores lo usan **[RP-27]**. Con el alcance de un operador, las lecturas de jornadas, solicitudes y operaciones devuelven solo lo ocurrido en sus tramos (**FR-AD-SCOPE-7**); con el alcance global, todo.

---

## 18. Fuera de alcance

- **Comisión por operación** y todo lo económico entre PuntoCash y sus mercantes **[A8]**: dominio aparte, para más adelante.
- **Dominio de clientes**: dominio aparte, para más adelante. Hoy el cliente vive dentro de cada operación.
- Sub-roles en la consola; exportación de otros listados; administración de las pantallas informativas; notificaciones.
- Backend y persistencia reales: la demostración trabaja contra un dominio en memoria (**Apéndice B**).

---

## Apéndice A · Qué puede cada rol

| | Super Admin | Principal de PuntoCash | Admin de sede |
| --- | --- | --- | --- |
| Crear, editar, asignar, revocar, suspender y cerrar sedes | Sí | Sí | No (edita contacto de las suyas) |
| Dar de alta, suspender y dar de baja operadores; restablecer su principal | Sí | Sí | No |
| Servicios, catálogo de monedas, rangos, promociones de red | Sí | Sí | No |
| Cajas, equipos, trabajadores, administradores, monedas y tasas de una sede | Solo ve | Solo ve | Sí, en sus sedes |
| Forzar cierres | No | No | Sí |
| Resolver aprobaciones | Solo las que no tienen quien las resuelva | Ídem | Las de su etapa en sus sedes |
| Jornadas, operaciones, reportes y auditoría de toda la red | Sí | Sí | Solo de sus sedes |
| Cuentas de PuntoCash | No | Sí | No |

---

## Apéndice B · Demostración

Todas las cuentas usan la contraseña `puntocash` (salvo las que reciban una credencial en la demostración) y el código `123456`. Se entra con el correo o con el identificador.

| Cuenta | Papel |
| --- | --- |
| `emarrero@puntocash.com` · Elena Marrero Fonseca | Principal: ve Usuarios |
| `jaguilera@puntocash.com` · Jorge Aguilera Ruiz | Super administrador |
| `rvaldes@puntocash.com` · Raúl Valdés Pino | Desactivada: no entra |

| Situación de la red | Dónde |
| --- | --- |
| Sede sin operador | PuntoCash Santiago |
| Sede suspendida | PuntoCash Trinidad (Bahía Cambios) |
| Operador suspendido | Oriente Divisas: PuntoCash Camagüey y Holguín |
| Operador de baja, con historial | Atlántico Casas de Cambio: Miramar hasta el 30/06/2026 |
| Sede traspasada | PuntoCash Miramar: Atlántico hasta el 30/06, Caribe después. Hay jornadas y operaciones del 27 al 29 de junio |
| Operador sin sedes | Cienfuegos Cambio S.R.L. |
| Sede sin cajas | PuntoCash Cerro; Pinar del Río (solo cajas retiradas) |
| Sede sin Cambio de moneda | PuntoCash Matanzas |
| Moneda sin rango que esperan sedes | CAD |
| Caja abierta de un día anterior | PuntoCash Obispo |
| Diferencias sin quien las resuelva | PuntoCash Miramar, 27 a 29/06/2026 (Aprobaciones) |

La demostración trabaja **en memoria**: los cambios duran hasta reiniciar el servidor, y las jornadas y operaciones se siembran relativas al día de hoy (la última semana, más las de Miramar de junio).

---

## Apéndice C · Códigos de rechazo y mensajes

| Código | Mensaje |
| --- | --- |
| `alcance-insuficiente` | Esta acción solo la puede hacer PuntoCash. |
| `solo-puntocash` | Esta acción es de PuntoCash. |
| `credenciales-incorrectas` | Revisa el usuario y la contraseña e intenta nuevamente. |
| `sesion-terminada` | Tu sesión ha terminado. Vuelve a entrar. |
| `motivo-requerido` | Escribe el motivo: al menos 10 caracteres. |
| `campo-requerido` | Completa este campo para continuar. (o el texto del campo: «Escribe el nombre de la sede.», «Escribe la dirección.»…) |
| `codigo-invalido` (sede) | Usa de 2 a 8 letras o números, sin espacios. |
| `codigo-duplicado` | Ya existe una sede con ese código. |
| `telefono-invalido` | Escribe un teléfono válido, con su prefijo. |
| `horario-invalido` | Marca al menos un día en que abra. · Completa las horas del {día}. · El {día} cierra antes de abrir. |
| `sin-servicios` | Habilita al menos un servicio. |
| `sede-no-encontrada` | No encontramos esa sede. |
| `sede-cerrada` | La sede está cerrada. |
| `jornadas-abiertas` | Esta sede tiene jornadas abiertas. Deben cerrarse antes. |
| `ya-suspendida` | La sede ya estaba suspendida. Recarga para ver su estado. |
| `no-suspendida` | La sede no está suspendida. Recarga para ver su estado. |
| `ultimo-servicio` | Una sede activa necesita al menos un servicio. |
| `servicio-no-disponible` | Ese servicio no está disponible en el producto. |
| `servicio-cambiado` | Otra persona acaba de habilitarlo (deshabilitarlo). Recarga para ver el estado. |
| `operador-no-encontrado` | No encontramos ese operador. |
| `operador-inactivo` | Ese operador no está activo. |
| `ya-asignada` | Esta sede ya tiene operador. Otra persona la acaba de asignar: recarga para ver su estado. |
| `sin-asignacion-vigente` | Esta sede ya no tiene operador. Otra persona acaba de revocarla: recarga para ver su estado. |
| `operador-duplicado` | Ya existe un operador con ese nombre. |
| `documento-invalido` | Escribe el número del documento, sin espacios. |
| `identificador-invalido` | El identificador es un nombre de usuario, no un correo: no lleva «@». Usa letras, números, punto, guion o guion bajo. (Si falla la longitud: de 3 a 30 caracteres.) |
| `identificador-duplicado` | Ya hay un administrador (una cuenta) con ese identificador de acceso. |
| `correo-invalido` | Escribe un correo electrónico válido. |
| `correo-duplicado` | Ya hay un administrador (una cuenta) con ese correo. Con el correo también se entra, así que no puede repetirse. |
| `ya-suspendido` | El operador ya estaba suspendido. Recarga para ver su estado. |
| `no-suspendido` | El operador no está suspendido. Recarga para ver su estado. |
| `dado-de-baja` | El operador está dado de baja. |
| `tiene-sedes` | Este operador administra {n} sedes. Revoca esas asignaciones antes de darlo de baja. |
| `usuario-no-encontrado` | Este operador no tiene administrador principal. · No encontramos esa cuenta. Puede que ya no exista. |
| `moneda-local` | El peso cubano es la moneda contra la que se cotiza todo: no lleva rango (no se puede retirar). |
| `moneda-desconocida` · `no-existe` | Esa moneda no está en el catálogo. |
| `moneda-retirada` | Esta moneda está retirada del catálogo: reincorpórala antes de definirle un rango. |
| `valor-invalido` | Introduce un valor válido. |
| `demasiados-decimales` | Una tasa o un límite admite hasta 4 decimales. |
| `minimo-mayor` | El mínimo debe ser menor que el máximo. |
| `rango-incoherente` | La compra no puede quedar por encima de la venta: la compra mínima tiene que ser menor o igual que la venta mínima, y la compra máxima, menor o igual que la venta máxima. |
| `sin-rango` | Esta moneda ya no tiene rango. Recarga para ver su estado. |
| `codigo-invalido` (moneda) | Elige una moneda de la lista. |
| `ya-existe` | Esa moneda ya está en el catálogo. |
| `esta-retirada` | Esa moneda está retirada del catálogo. Reincorpórala en lugar de añadirla de nuevo. |
| `ya-retirada` | Esa moneda ya estaba retirada. Recarga para ver su estado. |
| `no-esta-retirada` | Esa moneda no está retirada. Recarga para ver su estado. |
| `titulo-vacio` · `titulo-largo` | Escribe el título. · El título no puede pasar de 40 caracteres. |
| `texto-vacio` · `texto-largo` | Escribe el texto. · El texto no puede pasar de 120 caracteres. |
| `sin-sedes` | Elige al menos una sede, o marca toda la red. |
| `no-encontrada` | No encontramos lo que buscabas. |
| `fecha-invalida` | Elige la fecha de inicio y la de fin. |
| `inicio-pasado` | La fecha de inicio no puede ser anterior a hoy. |
| `inicio-fijo` | Esta promoción ya está en pantalla: su fecha de inicio no se cambia. |
| `fin-pasado` | La fecha de fin no puede ser anterior a hoy. Para terminarla ya, retírala. |
| `fin-antes-de-inicio` | La fecha de fin no puede ser anterior a la de inicio. |
| `imagen-invalida` · `imagen-pesada` | La imagen tiene que ser JPG, PNG o WebP. · La imagen pesa demasiado. Prueba con una más pequeña. |
| `del-operador` | Esta promoción la publica un operador: PuntoCash la ve, pero no la cambia. |
| `vencida` | Esta promoción ya venció (y no se puede cambiar). |
| `no-es-el-principal` | Solo el principal puede administrar las cuentas de la consola. |
| `es-el-principal` | El principal no se desactiva: sin él no habría quien diera de alta a otro. |
| `ya-activo` · `ya-desactivado` | Esta cuenta ya está activa. · Esta cuenta ya está desactivada. |
| `destino-requerido` | Elige quién pasa a administrar las cuentas. |
| `es-uno-mismo` | No puedes traspasarte el papel a ti mismo. |
| `destino-no-activo` | Solo se puede traspasar a una cuenta activa. |
| `actual-incorrecta` | La contraseña actual no es correcta. |
| `demasiado-corta` | La contraseña necesita al menos 8 caracteres. |
| `igual-a-la-actual` | La contraseña nueva tiene que ser distinta de la actual. |
| `no-coinciden` | Las dos contraseñas no son iguales. |
| `motivo-corto` | Escribe el motivo, con al menos 10 caracteres. |
| `ya-resuelta` | Esta solicitud ya fue resuelta. |
| `no-es-huerfana` | Ya la puede resolver su mercante: la sede volvió a la empresa que la tenía ese día. |
