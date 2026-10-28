# PuntoCash — Administración de sede
## Documento de Requisitos Funcionales (FRD) · v8.1

**Alcance:** la consola de administración de sede, `/admin`. No cubre la consola de PuntoCash (`/super-admin`).

**Destinatarios:** desarrollo backend y frontend, y QA. Es la especificación contra la que se implementa y se acepta.

**Documentos relacionados:**

| Documento | Qué define |
| --- | --- |
| `PuntoCash_Admin_Sede_PRD_v1.md` | El producto, sus conceptos y las reglas **A1–A14**, citadas aquí como **[A#]** |
| `../PuntoCash_PRD_v2.md` | Las reglas de producto **R1–R13** y los requisitos **RP-***, citados como **[R#]** y **[RP-#]** |
| `../worker/PuntoCash_Worker_Functional_Requirements_v1.md` | El acceso y la recuperación de contraseña, que esta consola reutiliza (**FR-AUTH-***, **FR-REC-***), y la jornada y las operaciones que aquí se consultan |
| `PuntoCash_Super_Admin_Functional_Requirements_v1.md` | Lo que hace PuntoCash: sedes, operadores, servicios, catálogo de monedas, rangos de tasas y promociones de red (**FR-SA-***) |
| `../kiosko/…` | El kiosco de autoservicio (**FR-AS-***) y la pantalla informativa (**FR-PANT-***), que leen de esta consola el contenido público de cada sede |

## Cómo leer este documento

- Cada requisito tiene un código `FR-AD-<área>-<n>`. «Debe» indica comportamiento obligatorio.
- El documento fija las **reglas**: qué datos muestra cada pantalla, qué se permite, qué se rechaza y con qué código, qué se guarda y qué se audita.
- Los **textos, avisos y la disposición** de cada pantalla están en la **demostración**, que es la referencia de diseño.
- Cada **«Ver en la demo»** dice con qué cuenta entrar y qué pasos seguir para ver ese caso. Todas las cuentas usan la contraseña `puntocash` y el código de verificación `123456`.
- Cada rechazo del servidor tiene un **código** (`ultima-caja`). El mensaje que ve el usuario para cada código está en el **Apéndice C**.
- **El servidor revalida toda regla al confirmar**, aunque la pantalla ya la haya comprobado: las condiciones pueden cambiar con la pantalla abierta **[R3]**.
- Todo «no existe o está fuera del alcance de la sesión» se rechaza con el mismo código, `no-encontrada`, y responde igual que un recurso inexistente (**FR-AD-NAV-3**).

## Versiones

| Versión | Fecha | Cambio |
| --- | --- | --- |
| 8.1 | 26/10/2026 | **Se dice quién pone el rótulo de un equipo, que estaba sin decir.** El rótulo se mostraba en Equipos, en la ficha de sede, en la jornada y en el diálogo de forzar cierre, pero ningún requisito decía de dónde salía ni dónde se cambia, y el formulario de vincular no lo pedía. Nuevo **FR-AD-EQ-30**: lo pone el administrador de la sede al vincular —opcional en una caja, obligatorio en un kiosco— y puede cambiarlo después desde Equipos. **FR-AD-EQ-7 / 8 / 13 / 14** añaden el campo, y **FR-AD-EQ-5** y **FR-AD-EQ-12** la acción. Ninguna otra regla cambia |
| 8.0 | 21/10/2026 | Documento reescrito para desarrollo: una subsección por pantalla, reglas y códigos de rechazo en lugar de textos de interfaz, referencias a la demostración y catálogo de mensajes (Apéndice C). Ninguna regla de la 7.16 se pierde; se escriben las que la consola ya cumplía y el documento no decía (cierre de sesión, revalidación de la sesión en cada petición, sedes cerradas fuera de los selectores, sedes cerradas fuera del panel de atención). Salen las secciones «Qué es este módulo» y «No especificado». Los códigos de requisito se conservan |
| 7.16 | 21/10/2026 | Revisión completa antes de la segunda entrega: filtros al cambiar de sede, 404 de rutas inexistentes, pantalla de error, motivos sin largo mínimo en Trabajadores, aviso de Usuarios que se cierra, exportación sin el corte por trabajador si hay uno elegido |
| 7.15 | 20/10/2026 | Exportación de reportes a Excel y PDF |
| 7.14 | 20/10/2026 | §15 Reportes y la definición de volumen |
| 7.13 | 20/10/2026 | §14 Aprobaciones |
| 7.11–7.12 | 20/10/2026 | §13 Operaciones; nombre de una jornada |
| 7.5–7.10 | 16–20/10/2026 | §12 Jornadas, continuidad entre jornadas, «cierre» en lugar de «arqueo», jornadas en el resto de la consola, indicadores del menú |
| 7.1–7.4 | 16/10/2026 | §11 Promociones, imagen de promoción, lo que ve el cliente en la ficha de sede |
| 7.0 | 15/10/2026 | El documento describe el sistema, no la demostración |
| 6.1–6.4 | 15/10/2026 | §8.2 Perfil, §9 Monedas, §10 Tasas, edición de los datos de una sede |
| 6.0 | 14/10/2026 | Entrega parcial |

Requisitos retirados, cuyos códigos no se reutilizan: **FR-AD-ACC-9**, **FR-AD-ACC-10**, **FR-AD-EQ-26** a **FR-AD-EQ-29**, **FR-AD-HOME-9**, **FR-AD-HOME-10**, **FR-AD-TRAB-17**, **FR-AD-PERF-9**, **FR-AD-MON-11**, **FR-AD-TASA-19**, **FR-AD-DOM-8**, **FR-AD-DOM-9**, **FR-AD-QA-1**, **FR-AD-IMP-1** a **FR-AD-IMP-7**, **FR-AD-SHELL-7** (absorbido en **FR-AD-SHELL-6**), **FR-AD-USR-7** (sustituido por **FR-AD-USR-13**) y **FR-AD-USR-8**.

---

## 1. Comportamiento global del módulo

### 1.1 Estructura común

**FR-AD-SHELL-1 · Shell.**

- Toda pantalla con sesión tiene la misma estructura: cabecera, navegación y área de contenido. No hay variantes por sección.
- Las pantallas de acceso (credenciales, verificación y recuperación) van sin shell (**FR-AD-NAV-5**).
- Sin sesión, cualquier ruta del shell redirige a `/admin/login`.

**FR-AD-SHELL-6 · Anchos.**

- Toda pantalla se puede usar desde **360px** de ancho hasta 1440×900, que es la referencia de escritorio.
- No se impone ancho mínimo ni se limita el zoom.
- Ninguna pantalla produce desplazamiento horizontal.

**FR-AD-SHELL-8 · Flujos por pasos.** Ninguna pantalla usa un stepper.

**Por debajo de 1024px:**

| Requisito | Regla |
| --- | --- |
| **FR-AD-SHELL-13** | Cada tabla se muestra como **una tarjeta por fila**, con cada dato acompañado de su etiqueta. La tarjeta lleva los mismos datos que la fila y conserva su enlace al detalle. Sin desplazamiento horizontal |
| **FR-AD-SHELL-14** | Los controles interactivos mantienen 44–48px de altura. Solo se reducen las casillas del código de verificación, porque el control real es el campo que las cubre |
| **FR-AD-SHELL-15** | Los filtros se apilan en una columna. Los que no caben se agrupan tras un control que los abre. Ningún filtro queda accesible solo en escritorio |
| **FR-AD-SHELL-16** | Los diálogos de confirmación (**FR-AD-STATE-3**) se leen y se accionan a 360px, con las acciones apiladas y la acción primaria alcanzable sin desplazar |

**Ver en la demo:** `marta@malecon-sf.cu`, cualquier sección, estrechando la ventana por debajo de 1024px. Filtros agrupados: **Operaciones**. Diálogo: **Equipos** → «Desvincular» a 360px.

---

### 1.2 Cabecera

**FR-AD-SHELL-4 · Contenido.**

| Dato | Contenido |
| --- | --- |
| Marca | PuntoCash |
| Alcance | El selector de alcance (§1.5). Con una sola sede, su código y nombre como texto fijo. Sin ninguna sede, nada |
| Persona | Nombre de la persona con sesión iniciada |
| Operador | Nombre del operador de la sesión, como texto secundario y sin tratamiento de marca **[A9]** |
| Acciones | Perfil → `/admin/perfil`; «Cerrar sesión» |

**FR-AD-SHELL-5 · Marca.** La cabecera no muestra el logotipo, el color corporativo ni el nombre comercial del operador como marca de la aplicación **[A9]**.

**Cerrar sesión.** Termina la sesión en el servidor, olvida la sede elegida en el selector y lleva a `/admin/login`.

**Ver en la demo:** `marta@malecon-sf.cu`, cualquier pantalla en escritorio. Una sola sede: `ibetancourt@centrodivisas.cu`. Sin sedes: `lperez@cienfuegoscambio.cu`.

---

### 1.3 Navegación lateral (desde 1024px)

**FR-AD-SHELL-2 · Destinos.** Tres bloques, en este orden:

| Bloque | Destinos |
| --- | --- |
| Operación | Inicio, Jornadas, Aprobaciones, Operaciones |
| Sucursal | Sedes, Cajas, Equipos, Trabajadores, Usuarios |
| Configuración | Monedas, Tasas, Promociones, Reportes |

- **Usuarios** solo existe para el administrador principal (**FR-AD-USR-11**): trece destinos para él, doce para los demás.
- El servidor decide si incluye Usuarios al armar el menú. La entrada no llega al navegador de quien no es principal.

**Ver en la demo:** `marta@malecon-sf.cu` (trece destinos) y `dcastro@malecon-sf.cu` (doce, sin Usuarios).

**FR-AD-SHELL-3 · Indicadores.** Tres destinos llevan un número cuando es mayor que cero:

| Destino | Cuenta |
| --- | --- |
| Aprobaciones | Solicitudes pendientes |
| Cajas | Sedes sin ninguna caja activa (sin cajas, o con todas retiradas) |
| Equipos | Cajas activas sin equipo vinculado |

- Los tres cuentan en las sedes que deja ver el selector de la cabecera (**FR-AD-SCOPE-4**): con una sede elegida, el número es el de esa sede.
- Cada número coincide con lo que muestra la sección al entrar: el aviso de Equipos cuenta las mismas cajas, y cada sede contada es la que Cajas muestra sin tabla (**FR-AD-CAJA-3**) o con el aviso de ninguna caja activa (**FR-AD-CAJA-2**).

**Ver en la demo:** `marta@malecon-sf.cu`, con «Todas mis sedes»: Cajas marca 1 (PuntoCash Cerro) y Equipos marca 3 (Cajas 02 y 04 de PuntoCash Obispo, Caja 04 de PuntoCash Vedado). Elegir PuntoCash Vedado en el selector: Cajas pierde el número y Equipos marca 1.

---

### 1.4 Navegación en teléfono (por debajo de 1024px)

**FR-AD-SHELL-9 · Barra inferior y cajón.** La barra lateral no se muestra. En su lugar:

- **Barra inferior fija** con Inicio, Jornadas, Aprobaciones (con su indicador) y «Más».
- **Cajón**, que abre «Más», con todos los destinos en sus tres bloques (**FR-AD-SHELL-2**) y sus indicadores, el nombre de la persona, el operador, Perfil y «Cerrar sesión».
- Si algún destino que solo está en el cajón tiene indicador (Cajas o Equipos), «Más» lo señala con un punto.

**FR-AD-SHELL-10 · Una sola definición.** La barra lateral, la barra inferior y el cajón leen la misma lista de destinos. La consola ofrece las mismas secciones en cualquier tamaño de pantalla.

**FR-AD-SHELL-11 · El cajón es un diálogo.**

- Foco atrapado mientras está abierto.
- Se cierra con Escape y con un control visible.
- El resto de la página se anuncia como inerte.
- Se cierra solo al llegar al destino elegido, también si el destino es la sección en la que ya se está o si se navega con la vuelta atrás del navegador.

**FR-AD-SHELL-12 · Cabecera en teléfono.**

- En la cabecera quedan la marca y el acceso a Perfil.
- El selector de alcance va en una **franja propia** inmediatamente bajo la cabecera, a todo lo ancho y fuera del área que se desplaza, para que el nombre de la sede se lea entero.
- El nombre de la persona, el operador y «Cerrar sesión» pasan al cajón.

**Ver en la demo:** `marta@malecon-sf.cu`, estrechar la ventana por debajo de 1024px. El punto de «Más» aparece porque Cajas y Equipos tienen indicador. Sin el punto: `lperez@cienfuegoscambio.cu`.

---

### 1.5 Selector de alcance

**FR-AD-SCOPE-1 · Alcance.** La sesión fija el alcance: las sedes con asignación vigente al operador de la sesión. El alcance no se elige ni se edita; el selector solo filtra dentro de él **[A1]**. El servidor vuelve a resolver el alcance en cada petición.

**FR-AD-SCOPE-2 · Opciones.** «Todas mis sedes» más una entrada por cada sede del alcance, identificada por código y nombre, ordenadas por nombre.

**FR-AD-SCOPE-3 · Una sola sede.** El selector no se muestra; la cabecera muestra el código y el nombre de la sede como texto fijo.

**Ver en la demo:** `ibetancourt@centrodivisas.cu`.

**FR-AD-SCOPE-4 · Dónde se aplica.**

| Filtran por la sede elegida | Muestran siempre todo el alcance |
| --- | --- |
| Inicio, Cajas, Equipos, Jornadas, Aprobaciones, Operaciones, Monedas, Tasas, Promociones, Reportes, y los indicadores del menú (**FR-AD-SHELL-3**) | Sedes, Trabajadores y Usuarios, con la sede como columna cuando aplica |

- La selección se conserva durante la navegación.
- Una sesión nueva empieza en «Todas mis sedes».

**FR-AD-SCOPE-5 · Al cambiar de sede.**

- Los filtros de la pantalla activa viven en su dirección (parámetros de la URL), de modo que se conservan al recargar y al compartir el enlace.
- Al cambiar de sede se conservan todos (periodo, pestaña, estado, servicio, texto buscado) **salvo `caja` y `trabajador`**, que se quitan.

**Ver en la demo:** `marta@malecon-sf.cu`, **Operaciones**: elegir un estado y una caja, y cambiar de sede en la cabecera. El estado y el periodo siguen; la caja vuelve a todas.

**FR-AD-SCOPE-6 · Sede que deja de estar asignada.** Si la sede elegida deja de estar asignada al operador con la sesión abierta:

- La siguiente navegación, sea a la pantalla que sea, vuelve a «Todas mis sedes» y avisa una vez dentro del shell.
- La selección se olvida en ese momento. Si la sede vuelve a asignarse más tarde, la consola no se filtra a ella sin que nadie la elija.

No se puede ver en la demo.

---

### 1.6 Rutas

**FR-AD-NAV-1 · Inventario de rutas.**

| Ruta | Función |
| --- | --- |
| `/admin` | Redirige a `/admin/inicio` |
| `/admin/login` | Acceso, paso 1: credenciales (sin shell) |
| `/admin/verificacion` | Acceso, paso 2: código de verificación (sin shell) |
| `/admin/recuperar-acceso` | Recuperación de contraseña (sin shell) |
| `/admin/inicio` | Panel consolidado del alcance vigente |
| `/admin/sedes` | Listado de las sedes administradas |
| `/admin/sedes/[id]` | Ficha de una sede |
| `/admin/sedes/[id]/editar` | Dirección, teléfono y horario de una sede |
| `/admin/cajas` | Cajas de las sedes administradas |
| `/admin/cajas/nueva` | Alta de una caja |
| `/admin/equipos` | Equipos vinculados: cajas y kioscos |
| `/admin/equipos/vincular` | Vincular un equipo por QR o por código |
| `/admin/trabajadores` | Listado de trabajadores |
| `/admin/trabajadores/nuevo` | Alta de trabajador |
| `/admin/trabajadores/[id]` | Ficha de un trabajador |
| `/admin/trabajadores/[id]/editar` | Edición de sus datos personales |
| `/admin/trabajadores/[id]/acceso` | Ayudar con el acceso |
| `/admin/usuarios` | Usuarios administradores de la empresa. **Solo para el administrador principal** |
| `/admin/usuarios/nuevo` | Alta de un usuario administrador. **Solo para el administrador principal** |
| `/admin/usuarios/[id]` | Ficha de un usuario administrador. **Solo para el administrador principal** |
| `/admin/usuarios/[id]/editar` | Edición de sus datos personales. **Solo para el administrador principal** |
| `/admin/perfil` | Datos de la persona con sesión iniciada |
| `/admin/perfil/editar` | Edición de sus propios datos personales |
| `/admin/perfil/contrasena` | Cambio de su propia contraseña |
| `/admin/jornadas` | Jornadas de las cajas del alcance |
| `/admin/jornadas/[id]` | Una jornada: apertura, saldos, cierre, movimientos y cierre forzado |
| `/admin/jornadas/[id]/movimientos/[movimientoId]` | Un movimiento de la jornada, en solo lectura |
| `/admin/aprobaciones` | Bandeja de solicitudes de aprobación: pendientes y resueltas |
| `/admin/aprobaciones/[id]` | Una solicitud: lo que registró el trabajador y su resolución |
| `/admin/operaciones` | Operaciones de las cajas del alcance |
| `/admin/operaciones/[codigo]` | Una operación, en solo lectura, con su contexto: sede, caja, trabajador y jornada |
| `/admin/monedas` | Monedas que maneja cada sede |
| `/admin/tasas` | Tabla de tasas de las sedes del alcance |
| `/admin/tasas/[sedeId]` | Tasas de una sede, con su edición |
| `/admin/promociones` | Promociones de las sedes administradas |
| `/admin/promociones/nueva` | Alta de una promoción |
| `/admin/promociones/[id]` | Una promoción: su edición, o su lectura si no se puede cambiar |
| `/admin/reportes` | Volumen por sede, servicio, trabajador y día |
| `/admin/reportes/exportar/{xlsx\|pdf}` | El reporte en pantalla, como archivo (**FR-AD-REP-7**) |

**FR-AD-NAV-2 · Validación de alcance.** Toda ruta con identificador comprueba que el recurso pertenece al alcance vigente **antes** de representar nada **[A1]**, **[RP-19]**.

**FR-AD-NAV-3 · Respuesta única de «no encontrado».** Responden igual, dentro del shell y con estado HTTP 404, y con el código `no-encontrada`:

- un recurso inexistente;
- un recurso existente de otro operador (sin revelar que existe);
- una ruta de §8 pedida por quien no es el administrador principal (**FR-AD-USR-11**);
- cualquier dirección que no existe dentro de `/admin`.

**Ver en la demo** (`marta@malecon-sf.cu`):

- Recurso ajeno: `/admin/sedes/sede-matanzas` (sede de otra empresa).
- Dirección inexistente: `/admin/cualquier-cosa`.
- Ruta de §8 sin ser principal: `dcastro@malecon-sf.cu`, `/admin/usuarios`.

**FR-AD-NAV-4 · Navegador.** La consola se abre desde cualquier navegador, también el de un teléfono, sin equipo vinculado: no aplican FR-DEV-1 ni la pantalla de vinculación.

**FR-AD-NAV-5 · Acceso fuera del shell.** Las pantallas de credenciales, verificación y recuperación se representan fuera del shell. Antes de que exista sesión no se muestra ninguna persona, operador ni sede.

---

### 1.7 Formatos

Rigen **FR-FMT-1 a FR-FMT-5** de `PuntoCash_Worker_Functional_Requirements_v1.md` §1.3. Además:

**FR-AD-FMT-1 · Dinero por moneda.** El volumen y cualquier agregado de dinero se expresan **por moneda**, nunca convertidos a una moneda única. Vale para reportes, saldos de las fichas y cualquier cifra de dinero futura.

**FR-AD-FMT-2 · Identificadores de equipo y código de vinculación.**

| Dato | Formato |
| --- | --- |
| Equipo de caja | `CAJ-NNNN-NNNN` |
| Kiosco | `KIO-NNNN-NNNN` |
| Código del reto de vinculación | Seis cifras. Se muestra y se admite agrupado de tres en tres («482 913»); al leerlo se ignoran los espacios |

**FR-AD-FMT-3 · Correo de verificación.** El correo de verificación de un trabajador o de un usuario administrador se muestra **enmascarado** en todo listado y en toda ficha. Excepciones, que lo muestran entero: la asistencia de acceso de un trabajador (**FR-AD-TRAB-10**) y el diálogo «Cambiar correo» de un usuario administrador (**FR-AD-USR-6**).

**FR-AD-FMT-4 · Credenciales.**

- Ninguna pantalla muestra, copia ni exporta una credencial de dispositivo **[A10]**, **FR-AD-EQ-25**.
- La credencial inicial de una persona (trabajador o usuario administrador) se muestra **una sola vez**, en el resultado del alta o de la regeneración, y no vuelve a ser consultable.

**Ver en la demo:** `marta@malecon-sf.cu`. Identificadores: **Equipos**. Correo enmascarado: **Trabajadores**, cualquier ficha. Credencial una sola vez: **Trabajadores** → alta de un trabajador.

---

### 1.8 Accesibilidad

Rigen **FR-A11Y-1 a FR-A11Y-3** de `PuntoCash_Worker_Functional_Requirements_v1.md` §1.5. Además:

**FR-AD-A11Y-1 · Destino actual.** El destino activo se marca como actual para las tecnologías de asistencia (`aria-current="page"`), no solo con color, en la barra lateral, en la barra inferior y en el cajón.

**FR-AD-A11Y-2 · Controles y cajón.** Todo control interactivo mantiene 44–48px de altura (**FR-AD-SHELL-14**), y el cajón de navegación se comporta como un diálogo (**FR-AD-SHELL-11**).

---

## 2. Acceso

### 2.1 Credenciales y verificación — `/admin/login`, `/admin/verificacion`

**FR-AD-ACC-1 · Flujo.** El mismo flujo de dos pasos que Worker, sin variación:

1. Credenciales: usuario o correo, y contraseña.
2. Código de seis dígitos enviado al correo registrado: cinco minutos de vigencia, tres intentos y hasta tres envíos.

- La sesión solo existe cuando el código se verifica **[R13]**.
- El servidor guarda a quién pertenece el reto; el cliente solo entrega el código.

**FR-AD-ACC-2 · Requisitos heredados.** Rigen en `/admin/login` y `/admin/verificacion` **FR-AUTH-1 a FR-AUTH-7** y **FR-2FA-1 a FR-2FA-32** de `PuntoCash_Worker_Functional_Requirements_v1.md` §2.3 a §2.10.

**FR-AD-ACC-3 · Lo propio de esta consola.**

- Tras verificar, el destino es `/admin/inicio`.
- El texto de contexto de la pantalla de credenciales identifica la consola como Administración de sede.

**FR-AD-ACC-4 · Sin comprobación de sede del equipo.** FR-AUTH-8 no aplica.

**Ver en la demo:** `marta@malecon-sf.cu` → código → Inicio. Error de red en el paso 1: `error@puntocash.com`.

**FR-AD-ACC-5 / FR-AD-ACC-6 · Rechazo único.** Estos casos reciben **exactamente el mismo mensaje**, «Credenciales incorrectas.», que no permite distinguirlos:

| Condición |
| --- |
| El usuario no existe |
| La contraseña es incorrecta |
| El usuario está desactivado |
| El operador del usuario está suspendido o dado de baja **[A14]** |

- El usuario y el estado del operador se comprueban también al verificar el código, y en cada petición con la sesión abierta: si el usuario queda desactivado o el operador suspendido, la siguiente petición lleva a `/admin/login`.

**Ver en la demo:**

- Contraseña incorrecta: `marta@malecon-sf.cu` con cualquier otra contraseña.
- Usuario inexistente: cualquier correo no listado.
- Operador suspendido: `yperez@orientedivisas.cu`.
- Usuario desactivado: con `marta@malecon-sf.cu`, **Usuarios** → desactivar a Daniel Castro; cerrar sesión y entrar con `dcastro@malecon-sf.cu`.

**FR-AD-ACC-7 · Sin sedes.** Un usuario válido de un operador activo sin ninguna sede asignada **sí** inicia sesión y llega a Inicio en estado vacío (**FR-AD-HOME-8**).

**Ver en la demo:** `lperez@cienfuegoscambio.cu`.

---

### 2.2 Recuperación de contraseña — `/admin/recuperar-acceso`

**FR-AD-ACC-8.** El mismo flujo de tres pasos que Worker, con sus mismas reglas (Worker FRD §2.13, **FR-REC-1** a **FR-REC-12**):

1. Identificador.
2. Código.
3. Contraseña nueva.

Reglas que no pueden diferir entre consolas:

- No se dice a dónde se envió el código, ni enmascarado.
- La respuesta es idéntica exista la cuenta o no.
- Terminar **no abre sesión**: se vuelve a `/admin/login` con sus dos pasos **[R13]**.

Lo propio de esta consola: la ayuda, cuando el correo registrado ya no sirve, remite **al administrador principal de la empresa** (el único que puede regenerar una credencial, **FR-AD-USR-11**) o, si quien se quedó fuera es el principal, a PuntoCash.

**Ver en la demo:** `/admin/login` → «¿Olvidaste tu contraseña?» con `marta@malecon-sf.cu`. Cuenta inexistente (pantalla idéntica, ningún código sirve): `desconocido@puntocash.com`.

---

## 3. Equipos

**FR-AD-EQ-2 · Mecánica común.** Equipos de caja y kioscos comparten el mismo acto de vinculación (§3.3). Solo cambia el objeto al que se atan: una caja de una sede, o una sede.

**FR-AD-EQ-3 · Exclusividad.** Esta consola es el **único** lugar del producto desde el que un equipo se vincula o se desvincula **[A10]**, **[A14]**, **[FR-DEV-3]**, **[FR-AS-LINK-4]**. El Super Admin ve los mismos equipos en toda la red y no modifica ninguno.

**FR-AD-EQ-25 · Credencial del equipo.** La emite y la revoca el sistema, nunca el terminal **[A10]**, **[FR-DEV-8]**, **[FR-AS-LINK-7]**. La consola no la muestra, no la copia y no permite exportarla.

### 3.1 Listado de equipos — `/admin/equipos`

**FR-AD-EQ-1 · Pestañas.**

- Dos pestañas: **Cajas** (por defecto) y **Kioscos de autoservicio** (`?pestana=kioscos`). Cualquier otro valor muestra Cajas.
- Cada pestaña indica cuántas filas tiene.
- Las dos listan solo equipos de las sedes que deja ver el selector de alcance (**FR-AD-SCOPE-4**) **[A1]**.
- Ofrece «Vincular un equipo» → `/admin/equipos/vincular`.

**FR-AD-EQ-5 · Pestaña Cajas.** Una fila por cada caja **activa** de esas sedes, tenga equipo o no.

| Dato | Contenido |
| --- | --- |
| Sede | Nombre |
| Caja | Identificador |
| Estado del vínculo | «Vinculada» o «Sin equipo» |
| Equipo | Rótulo e identificador (`CAJ-NNNN-NNNN`) del equipo vinculado |
| Vinculado | Fecha de vinculación y quién la vinculó |
| Última actividad | Fecha y hora de la última señal del equipo |
| Jornada | Como en Cajas (**FR-AD-CAJA-1**): si tiene una abierta, trabajador, desde cuándo, si está en sesión y enlace a `/admin/jornadas/{id}`; si no, cerrada |
| Acción | Si tiene equipo, «Editar etiqueta» (**FR-AD-EQ-30**) y «Desvincular»; si no, «Vincular un equipo» → `/admin/equipos/vincular` |

**FR-AD-EQ-6 · Cajas sin equipo.**

- Van **primero**; dentro de cada grupo, por sede y por caja.
- Se distinguen visualmente.
- Encima de la tabla, un aviso de advertencia con el número de cajas sin equipo. Es el mismo número que el indicador del menú (**FR-AD-SHELL-3**).

**Ver en la demo:** `marta@malecon-sf.cu`, **Equipos**: Cajas 02 y 04 de PuntoCash Obispo y Caja 04 de PuntoCash Vedado arriba. Sin cajas: `lperez@cienfuegoscambio.cu`.

**FR-AD-EQ-12 · Pestaña Kioscos de autoservicio.** Una fila por cada kiosco vinculado a esas sedes.

| Dato | Contenido |
| --- | --- |
| Sede | Nombre |
| Kiosco | Rótulo e identificador (`KIO-NNNN-NNNN`) |
| Vinculado | Fecha de vinculación y quién lo vinculó |
| Última actividad | Fecha y hora de la última señal del kiosco |
| Solicitudes | Solicitudes generadas en el periodo (pendiente de dependencia, §18) |
| Acción | «Editar etiqueta» (**FR-AD-EQ-30**) y «Desvincular» |

**Ver en la demo:** `marta@malecon-sf.cu`, **Equipos** → Kioscos de autoservicio (dos en PuntoCash Vedado). Sin kioscos: `rortega@caribecambios.cu`. La columna de solicitudes no se puede ver en la demo.

---

### 3.2 Desvincular un equipo de caja

Se inicia con «Desvincular» en una caja con equipo y se confirma en un diálogo, sin motivo.

**FR-AD-EQ-9 · Lo que dice el diálogo antes de confirmar.**

- El equipo vuelve a su pantalla de vinculación al instante.
- Si un trabajador tiene sesión iniciada en él, su sesión termina: lo que tuviera a medias sin confirmar se descarta y lo ya confirmado se conserva **[FR-DEV-7]**.

**FR-AD-EQ-10 · Caja con jornada abierta.** La acción **se permite** **[A11]**, **[FR-DEV-7]**. El diálogo lo advierte de forma destacada:

- nombra al trabajador y desde cuándo está abierta;
- explica que desvincular **no cierra la jornada**, que seguirá abierta hasta su cierre, y que para hacerlo habrá que vincular un equipo a esa caja.

**FR-AD-EQ-11 · Alternativa.** En ese caso el diálogo ofrece, sin salir de él, un enlace a forzar el cierre de **esa** jornada → `/admin/jornadas/{id}` (**FR-AD-JOR-7**). No la cierra por sí mismo.

**Ver en la demo** (`marta@malecon-sf.cu`, **Equipos**, «Desvincular»):

- Con jornada abierta: Caja 01 de PuntoCash Obispo.
- Sin jornada abierta: cualquier caja con equipo cuya jornada esté cerrada.

**Rechazos del servidor.**

| Condición | Código |
| --- | --- |
| La sesión terminó | `sesion-terminada` |
| La sesión tiene alcance de toda la red (PuntoCash) | `alcance-global-prohibido` |
| El equipo no existe, ya no está vinculado o está fuera del alcance | `no-encontrada` |

**Efecto.**

- El vínculo se elimina; la caja queda sin equipo.
- La jornada de la caja no se modifica.
- El terminal vuelve a su pantalla de vinculación; el reto nuevo lo pide el propio terminal.

---

### 3.3 Desvincular un kiosco

Se inicia con «Desvincular» en un kiosco y se confirma en un diálogo, sin motivo.

**FR-AD-EQ-15 · Lo que dice el diálogo antes de confirmar.** El kiosco pierde su sesión al instante, descarta sin generar código lo que un cliente estuviera preparando, y vuelve a su pantalla de vinculación con su aviso de desvinculación **[FR-AS-LINK-6]**.

**FR-AD-EQ-16 · Lo que no cambia.** El diálogo aclara además que las solicitudes ya generadas por ese kiosco no se ven afectadas y siguen siendo válidas en caja **[FR-AS-LINK-6]**.

**Ver en la demo:** `marta@malecon-sf.cu`, **Equipos** → Kioscos de autoservicio → «Desvincular».

**Rechazos del servidor.** Los mismos que en 3.2.

---

### 3.4 Vincular un equipo — `/admin/equipos/vincular`

**FR-AD-EQ-17 · Paso 1: identificar el equipo.** Las dos vías a la vez, sin obligar a elegir **[FR-DEV-2]**, **[FR-AS-LINK-2]**:

- **Escanear el QR** que muestra el equipo, con la cámara del dispositivo donde está abierta la consola.
- **Escribir el código** de seis cifras (**FR-AD-FMT-2**).

**FR-AD-EQ-19 · Cámara.**

- Antes de pedir el permiso, la pantalla explica para qué se usa la cámara.
- Sin cámara o con el permiso denegado, la vía del código sigue disponible en la misma pantalla.

**FR-AD-EQ-21 · Reintento.** Tras un error, el campo del código conserva lo escrito.

**Rechazos al identificar.** Identificar no consume el reto.

| Condición | Código |
| --- | --- |
| El código no coincide con ningún equipo pendiente | `codigo-no-coincide` |
| El reto caducó | `codigo-caducado` |
| El equipo ya está vinculado | `equipo-ya-vinculado` |
| La sesión terminó | `sesion-terminada` |

**FR-AD-EQ-20 · Textos.** Los mensajes de `codigo-no-coincide` y `codigo-caducado` son los que ya especifican Kiosco y Worker **[FR-AS-LINK-4]**. El de `codigo-no-coincide` no nombra la clase de equipo, porque con un código que no coincide no se sabe si es una caja o un kiosco.

**Ver en la demo** (`marta@malecon-sf.cu`, **Equipos** → «Vincular un equipo»; la pantalla muestra los códigos de un equipo de caja y un kiosco pendientes):

- Identificar: escribir cualquiera de los dos códigos.
- No coincide: escribir `000000`.
- Caducado: dejar la pantalla abierta más de diez minutos sin recargar y escribir el código mostrado.
- Sin cámara o permiso denegado: «Usar la cámara» en un dispositivo sin cámara, o denegar el permiso.
- La lectura del QR no se puede ver en la demo.

**FR-AD-EQ-18 · Paso 2: elegir el objeto.** Solo tras identificar un reto válido, la pantalla muestra la clase de equipo (caja o kiosco), su identificador y la hora a la que caduca el código, y pide el objeto. Este paso es la confirmación (**FR-AD-STATE-3**).

**FR-AD-EQ-7 / FR-AD-EQ-8 / FR-AD-EQ-13 / FR-AD-EQ-14 · Campos.**

| Campo | Obligatorio | Reglas |
| --- | --- | --- |
| Sede | Sí | Solo sedes del alcance que no están cerradas; una suspendida se admite y se marca como tal **[A1]**, **[FR-AS-LINK-4]**. Si el usuario tiene una sola, no se elige: se usa esa |
| Caja | Solo para un equipo de caja | Solo cajas activas de la sede elegida. Una caja admite **un equipo como máximo** **[A11]**, **[FR-DEV-3]**: las que ya tienen equipo aparecen no disponibles, con el identificador del equipo que la ocupa. Para sustituir el equipo de una caja hay que desvincular el anterior primero. Si la sede no tiene ninguna caja activa sin equipo, la pantalla lo indica y ofrece crear una caja → `/admin/cajas/nueva?sede={sedeId}` |
| Etiqueta | Solo para un kiosco | El rótulo con el que la consola nombra al equipo (**FR-AD-EQ-30**). En una caja es **opcional**: vacía, se usa el nombre de la caja, que ya la identifica. En un kiosco es **obligatoria**, porque una sede puede tener varios y el identificador no distingue el de la entrada del de la sala de espera. Código de rechazo si falta en un kiosco: `etiqueta-requerida` |

- Un kiosco no lleva caja: pertenece a la sede.
- Una sede puede tener **varios kioscos** vinculados a la vez.

Si el usuario no tiene ninguna sede donde vincular un equipo, la pantalla muestra un aviso en lugar del formulario.

**Ver en la demo** (`marta@malecon-sf.cu`, identificar el código del equipo de caja):

- Caja ocupada: elegir PuntoCash Vedado; Cajas 01 a 03 aparecen no disponibles.
- Sede sin cajas: elegir PuntoCash Cerro.
- Sede suspendida: con `abarrios@bahiacambios.cu`, PuntoCash Trinidad.
- Una sola sede: `ibetancourt@centrodivisas.cu`.
- Kiosco: identificar el código del kiosco; solo pide sede.
- Sin sedes: `lperez@cienfuegoscambio.cu`, entrar en `/admin/equipos/vincular`.

**FR-AD-EQ-22 / FR-AD-EQ-23 · Rechazos al vincular.** El servidor revalida todo al confirmar **[R3]**, **[R6]**: el alcance primero, después el reto (vigente y sin usar) y por último el objeto (sigue disponible). Un reto es de un solo uso: no puede vincular dos equipos.

| Condición | Código |
| --- | --- |
| La sede no existe o está fuera del alcance | `no-encontrada` |
| La sede está cerrada | `sede-cerrada` |
| El código no coincide con ningún reto pendiente (también si ya se usó) | `codigo-no-coincide` |
| El reto caducó mientras se elegía el objeto | `codigo-caducado-al-vincular` |
| El equipo ya está vinculado | `equipo-ya-vinculado` |
| Equipo de caja sin caja elegida | `caja-requerida` |
| La caja no existe o no es de esa sede | `no-encontrada` |
| La caja está retirada | `caja-retirada` |
| La caja ya tiene un equipo vinculado | `caja-ya-vinculada` |
| La sesión tiene alcance de toda la red (PuntoCash) | `alcance-global-prohibido` |
| La sesión terminó | `sesion-terminada` |

**Ver en la demo:** caducado al vincular: identificar un código, elegir el objeto, esperar más de diez minutos y pulsar «Vincular el equipo».

**FR-AD-EQ-24 · Al vincular.**

- Se crea el vínculo con el equipo, la sede, la caja (si es de caja), la fecha, quién lo vinculó y la vía (QR o código).
- El reto se consume.
- La pantalla confirma qué quedó vinculado a qué: clase de equipo, caja si la hay, sede e identificador del equipo.
- Advierte que el equipo cambia solo, sin que nadie lo toque **[FR-DEV-4]**, **[FR-AS-LINK-5]**.
- Ofrece «Vincular otro equipo» y volver a `/admin/equipos`.

**Ver en la demo:** `marta@malecon-sf.cu`, vincular el equipo de caja pendiente a la Caja 04 de PuntoCash Vedado.

---

### 3.5 Auditoría

**FR-AD-EQ-4** **[RP-21]**, **[RP-24]**

| Acción | Evento | Datos |
| --- | --- | --- |
| Vincular un equipo de caja | `equipo-caja.vinculado` | Autor, fecha, sede, caja, identificador del equipo |
| Desvincular un equipo de caja | `equipo-caja.desvinculado` | Autor, fecha, sede, caja, identificador del equipo |
| Vincular un kiosco | `kiosco.vinculado` | Autor, fecha, sede, identificador del kiosco |
| Desvincular un kiosco | `kiosco.desvinculado` | Autor, fecha, sede, identificador del kiosco |

---

## 4. Cajas

### 4.1 Listado de cajas — `/admin/cajas`

**FR-AD-CAJA-1 · Contenido.**

- Muestra las cajas, activas y retiradas, de las sedes que deja ver el selector de alcance (**FR-AD-SCOPE-4**).
- Las agrupa en un bloque por sede, ordenados por nombre de sede.
- Cada bloque indica si la sede está suspendida y cuántas de sus cajas están activas sobre el total.
- Ofrece «Crear caja», salvo que el usuario no tenga ninguna sede.

Datos de cada caja:

| Dato | Contenido |
| --- | --- |
| Caja | Identificador |
| Equipo | Rótulo del equipo vinculado, o la indicación de que no tiene |
| Estado | Activa o retirada. Si está retirada, también el motivo de la retirada |
| Jornada | Si tiene una abierta: trabajador, fecha y hora de apertura, si el trabajador tiene la sesión iniciada en ese momento, y enlace a `/admin/jornadas/{id}`. Si no tiene: cerrada. Si la caja está retirada: nada |
| Alta | Fecha de creación y nombre de quien la creó |
| Acción | «Retirar» si está activa; «Reactivar» si está retirada |

Por debajo de 1024px cada caja es una tarjeta (**FR-AD-SHELL-13**).

**Ver en la demo:** entrar con `marta@malecon-sf.cu` y abrir **Cajas**. Para ver las tarjetas, estrechar la ventana por debajo de 1024px. Una sede suspendida: `abarrios@bahiacambios.cu`, bloque PuntoCash Trinidad.

**FR-AD-CAJA-2 · Situaciones que piden acción.** La pantalla destaca cada una de estas situaciones:

| Situación | Cómo se indica | Ver en la demo (Cajas; `marta@malecon-sf.cu` salvo que se indique otra) |
| --- | --- | --- |
| Caja sin equipo vinculado | En la columna Equipo, como advertencia | Bloque PuntoCash Obispo |
| Caja con jornada abierta | En la columna Jornada, con enlace a la jornada | Caja 01 de PuntoCash Obispo |
| Sede con cajas pero ninguna activa | Aviso de advertencia encima de la tabla de la sede, con enlace a `/admin/cajas/nueva?sede={sedeId}` | Con `abarrios@bahiacambios.cu`: bloque PuntoCash Pinar del Río |

**FR-AD-CAJA-3 · Sede sin ninguna caja.** El bloque de la sede aparece igualmente, sin tabla. En su lugar, un texto que explica que hace falta crear una caja y el botón «Crear la primera caja» → `/admin/cajas/nueva?sede={sedeId}`.

**Ver en la demo:** `marta@malecon-sf.cu`, Cajas, bloque PuntoCash Cerro.

**Sin sedes.** Un usuario sin ninguna sede asignada ve un aviso informativo en lugar de los bloques.

**Ver en la demo:** `lperez@cienfuegoscambio.cu`, Cajas.

---

### 4.2 Crear una caja — `/admin/cajas/nueva`

**FR-AD-CAJA-4 / FR-AD-CAJA-5 · Campos.**

| Campo | Obligatorio | Reglas |
| --- | --- | --- |
| Sede | Sí | Solo las sedes del usuario que no están cerradas; una suspendida se admite y se marca como tal. Si el usuario tiene una sola sede, no se elige: se usa esa. Si la URL trae `?sede={id}` y esa sede es elegible, viene seleccionada |
| Identificador de la caja | Sí | Texto libre. Se guarda sin espacios al principio y al final |

Si el usuario no tiene ninguna sede donde crear una caja, la pantalla muestra un aviso en lugar del formulario.

**Ver en la demo:**

- Con varias sedes: `marta@malecon-sf.cu`, Cajas → Crear caja.
- Con una sola sede: `ibetancourt@centrodivisas.cu`, Cajas → Crear caja.
- Sin sedes: `lperez@cienfuegoscambio.cu`, entrar directamente en `/admin/cajas/nueva`.

**FR-AD-CAJA-6 · Rechazos.** El servidor valida todos los casos, también los que la pantalla ya impide. Ante un rechazo, el formulario conserva lo escrito.

| Condición | Código |
| --- | --- |
| Sede sin elegir | `sede-requerida` |
| Identificador vacío | `nombre-requerido` |
| Ya existe en esa sede una caja con ese identificador, sin distinguir mayúsculas de minúsculas | `nombre-duplicado` |
| La sede está cerrada | `sede-cerrada` |
| La sede no existe o está fuera del alcance | `no-encontrada` (se responde igual que una inexistente, **FR-AD-NAV-3**) |

**Ver en la demo:** `marta@malecon-sf.cu`, Crear caja, sede PuntoCash Vedado, identificador «Caja 01».

**FR-AD-CAJA-7 · Al guardar.**

- La caja se crea activa, sin equipo y sin jornada, con la fecha de alta y el nombre de quien la creó.
- Recibe un identificador interno único en toda la red.
- La pantalla vuelve a `/admin/cajas` con un aviso de éxito y un enlace a `/admin/equipos/vincular`.

**Ver en la demo:** crear cualquier caja con `marta@malecon-sf.cu`.

---

### 4.3 Retirar una caja

Se inicia con «Retirar» en una caja activa y se confirma en un diálogo.

**Bloqueos.** Si se da alguna de estas condiciones, el diálogo **no pide motivo**. Explica cada condición que se cumple y ofrece una acción para resolverla. Si se cumplen varias, la acción es la de la primera que aparece en la tabla.

| Requisito | Condición | Acción ofrecida | Código del servidor |
| --- | --- | --- | --- |
| **FR-AD-CAJA-9** | La caja tiene una jornada abierta **[R6]** | Ir a la jornada → `/admin/jornadas/{id}` | `jornada-abierta` |
| **FR-AD-CAJA-10** | La caja tiene un equipo vinculado | Ir a Equipos → `/admin/equipos` | `equipo-vinculado` |
| **FR-AD-CAJA-13** | Es la única caja activa de una sede con estado activa | Crear una caja → `/admin/cajas/nueva?sede={sedeId}` | `ultima-caja` |

**Ver en la demo** (`marta@malecon-sf.cu`, Cajas, «Retirar»):

- Jornada abierta y equipo a la vez: Caja 01 de PuntoCash Obispo.
- Solo equipo: cualquier caja con equipo y jornada cerrada.
- Única caja activa: crear una caja en PuntoCash Cerro y pulsar «Retirar» en ella.

**FR-AD-CAJA-8 · Confirmación.** Sin bloqueos, el diálogo pide un **motivo** obligatorio de al menos 10 caracteres, sin contar los espacios al principio y al final.

**Ver en la demo:** `marta@malecon-sf.cu`, Cajas, «Retirar» en una caja de PuntoCash Obispo marcada sin equipo.

**Rechazos del servidor.**

| Condición | Código |
| --- | --- |
| Motivo vacío o de menos de 10 caracteres | `motivo-requerido` |
| Jornada abierta | `jornada-abierta` |
| Equipo vinculado | `equipo-vinculado` |
| Única caja activa de una sede activa | `ultima-caja` |
| La caja ya estaba retirada | `ya-retirada` |
| La sede está cerrada | `sede-cerrada` |
| La caja no existe o está fuera del alcance | `no-encontrada` |

**FR-AD-CAJA-11 · Efecto.**

- La caja pasa a retirada y guarda la fecha, el motivo y el autor.
- No se borra ni se modifica ninguna de sus jornadas, movimientos u operaciones **[R9]**, **[A7]**.
- La caja sigue apareciendo en los listados y filtros históricos.

---

### 4.4 Reactivar una caja

**FR-AD-CAJA-12.** Se inicia con «Reactivar» en una caja retirada y se confirma en un diálogo, sin motivo.

- La caja pasa a activa **sin equipo**: no recupera ningún vínculo anterior y hay que vincularle uno.
- El diálogo lo advierte antes de confirmar.

| Condición | Código |
| --- | --- |
| La caja no está retirada | `no-retirada` |
| La sede está cerrada | `sede-cerrada` |
| La caja no existe o está fuera del alcance | `no-encontrada` |

**Ver en la demo:** retirar una caja como en 4.3 y pulsar «Reactivar» en ella.

---

### 4.5 Auditoría

**FR-AD-CAJA-14** **[RP-21]**

| Acción | Evento | Datos |
| --- | --- | --- |
| Crear | `caja.alta` | Autor, fecha, sede, caja |
| Retirar | `caja.retirada` | Autor, fecha, sede, caja, motivo |
| Reactivar | `caja.reactivada` | Autor, fecha, sede, caja |

---

## 5. Inicio

### 5.1 Inicio — `/admin/inicio`

Todo lo que muestra se limita a las sedes que deja ver el selector de alcance (**FR-AD-SCOPE-4**) **[A1]**.

**FR-AD-HOME-1 · Métricas del día.**

| Métrica | Contenido |
| --- | --- |
| Sedes operando | Sedes con al menos una caja con jornada abierta, sobre el total de sedes visibles: «1 de 3» |
| Cajas abiertas | Cajas activas con jornada abierta, sobre el total de cajas activas |
| Trabajadores en turno | Trabajadores con una jornada abierta |
| Operaciones del día | Operaciones completadas hoy (hora de Cuba) en cualquier caja |
| Aprobaciones pendientes | Solicitudes en estado pendiente. Se destaca como advertencia si es mayor que cero |

El volumen se consulta en Reportes (**FR-AD-REP-12**).

**Ver en la demo:** `marta@malecon-sf.cu`, Inicio.

**FR-AD-HOME-2 / FR-AD-HOME-3 / FR-AD-HOME-4 · Panel de atención.** Muestra una entrada por cada situación que pide acción, en este orden de prioridad. Las cinco primeras describen una sucursal que no puede operar o está a medio montar; las demás, incidencias de la operación corriente. Cada entrada enlaza a la pantalla donde se resuelve. Las horas son de Cuba.

| # | Situación | Condición exacta | Una entrada por | Enlace | Ver en la demo (Inicio; `marta@malecon-sf.cu` salvo que se indique otra) |
| --- | --- | --- | --- | --- | --- |
| 1 | Sede sin ninguna caja activa | La sede no tiene ninguna caja activa (no tiene cajas, o todas están retiradas). Cuenta lo mismo que el indicador de Cajas del menú (**FR-AD-SHELL-3**) | Sede | `/admin/cajas` | PuntoCash Cerro |
| 2 | Cajas sin equipo vinculado | La sede tiene cajas activas sin equipo vinculado. La entrada dice cuántas. El total cuenta lo mismo que el indicador de Equipos del menú (**FR-AD-SHELL-3**) | Sede | `/admin/equipos` | PuntoCash Obispo |
| 3 | Sede suspendida por PuntoCash (**FR-AD-SEDE-13**) | Estado de la sede: suspendida | Sede | `/admin/sedes/{id}` | Con `abarrios@bahiacambios.cu`: PuntoCash Trinidad |
| 4 | Sede sin ninguna moneda | La sede no está cerrada y su lista de monedas está vacía | Sede | `/admin/monedas` | Con `abarrios@bahiacambios.cu`: PuntoCash Pinar del Río |
| 5 | Cambio de moneda sin tasas | La sede no está cerrada, tiene habilitado Cambio de moneda, tiene al menos una moneda en su lista y no tiene ninguna tasa fijada | Sede | `/admin/tasas/{sedeId}` | PuntoCash Cerro |
| 6 | Aprobaciones pendientes (§14) | Hay al menos una solicitud pendiente. Una sola entrada para todas: dice cuántas son y, de la más antigua, su antigüedad, su tipo, su caja y su sede | Todas | `/admin/aprobaciones` | Aparece siempre con esta cuenta |
| 7 | Caja abierta fuera de horario | Caja activa con jornada abierta, y la hora actual está fuera de la franja de hoy en el horario de su sede, **o** la jornada se abrió un día anterior. La entrada distingue los dos casos y dice quién la abrió y cuándo | Jornada | `/admin/jornadas/{id}` | Caja 01 de PuntoCash Obispo (abierta desde ayer) |
| 8 | Cierre forzado pendiente de conciliar (**FR-AD-JOR-20**) | Jornada con cierre forzado a la que todavía no ha seguido ninguna apertura de su caja, sea de la fecha que sea. Las diferencias de cierre y de apertura no tienen entrada propia: cuentan en la entrada 6 | Jornada | `/admin/jornadas/{id}` | Forzar el cierre de la Caja 01 de PuntoCash Obispo (**FR-AD-JOR-7**) y volver a Inicio |
| 9 | Tasa ajustada por PuntoCash (**FR-AD-TASA-12**) | Tasa que el sistema llevó al límite de un rango nuevo y que nadie de la empresa ha confirmado | Sede y moneda | `/admin/tasas/{sedeId}` | EUR de PuntoCash Obispo |
| 10 | Tasa cuyo rango retiró PuntoCash (**FR-AD-TASA-15**) | Tasa definida en la sede cuya moneda no tiene rango de PuntoCash | Sede y moneda | `/admin/tasas/{sedeId}` | Con `abarrios@bahiacambios.cu`: CAD de PuntoCash Trinidad |
| 11 | Sede en horario sin ninguna caja abierta | La sede está activa, tiene al menos una caja activa con equipo, ninguna caja tiene jornada abierta y la hora actual está dentro de la franja de hoy en su horario | Sede | `/admin/sedes/{id}` | Entre lunes y sábado de 9:00 a 18:00, forzar el cierre de la Caja 01 de PuntoCash Obispo y volver a Inicio |

«Dentro de la franja»: la hora de apertura del día es menor o igual que la actual, y la actual es menor que la de cierre. Un día cerrado no tiene franja.

**FR-AD-HOME-5 · Panel vacío.** Sin ninguna situación, el panel sigue presente y muestra un estado explícito de que todo está en orden.

**Ver en la demo:** No se puede ver en la demo.

**FR-AD-HOME-6 · Estado por sede.** Una fila por sede visible. Cada fila enlaza a `/admin/sedes/{id}`.

| Dato | Contenido |
| --- | --- |
| Sede | Código, nombre y localidad (municipio y provincia) |
| Estado | Activa, Suspendida o Cerrada |
| Cajas | Cajas activas, y cuántas de ellas sin equipo vinculado, como advertencia |
| Kioscos | Kioscos vinculados |
| Trabajadores | Trabajadores activos |
| Jornada | Cuántas cajas activas tienen jornada abierta sobre el total —«3 de 4 abiertas»— y la hora de la primera apertura de hoy. Si ninguna está abierta, la indicación de que ninguna lo está. Sin cajas activas: nada |
| En turno | Nombre de cada trabajador con una jornada abierta en la sede |
| Operaciones hoy | Operaciones completadas hoy en la sede |

Por debajo de 1024px cada sede es una tarjeta (**FR-AD-SHELL-13**).

**FR-AD-HOME-7 · Una sede elegida.** Con «Todas mis sedes», la tabla muestra todas las sedes visibles. Con una sede elegida en el selector, la tabla se reduce a esa sede y la pantalla añade el detalle de sus cajas y equipos:

| Dato | Contenido |
| --- | --- |
| Caja | Identificador de cada caja activa |
| Equipo | Rótulo e identificador del equipo vinculado, o la indicación de que no tiene, como advertencia |
| Jornada | Si tiene una abierta: trabajador, desde cuándo, si el trabajador tiene la sesión iniciada en ese momento, y enlace a `/admin/jornadas/{id}`. Si no: cerrada |

Debajo, los kioscos vinculados a la sede con su rótulo e identificador, o la indicación de que no tiene ninguno. Si la sede no tiene cajas activas, un enlace a `/admin/cajas` en lugar de la tabla.

**Ver en la demo:** `marta@malecon-sf.cu`, elegir PuntoCash Obispo en la cabecera y abrir Inicio.

**FR-AD-HOME-8 · Sin sedes.** Un usuario sin ninguna sede asignada ve, en lugar de métricas, panel y tabla, un texto que explica que la sede aparecerá cuando PuntoCash se la asigne y qué podrá hacer entonces.

**Ver en la demo:** `lperez@cienfuegoscambio.cu`, Inicio.

---

## 6. Sedes

### 6.1 Listado de sedes — `/admin/sedes`

**FR-AD-SEDE-1 · Contenido.** Muestra todas las sedes asignadas al usuario, sin aplicar el selector de alcance (**FR-AD-SCOPE-4**), ordenadas por nombre.

| Dato | Contenido |
| --- | --- |
| Código | Código de la sede |
| Sede | Nombre, con enlace a `/admin/sedes/{id}` |
| Localidad | Municipio y provincia |
| Estado | Activa, Suspendida o Cerrada |
| Cajas activas | Número de cajas activas |
| Sin equipo | Cajas activas sin equipo vinculado. Mayor que cero, como advertencia |
| Kioscos | Kioscos vinculados |
| Trabajadores | Trabajadores activos |
| Jornada | Cuántas cajas activas tienen jornada abierta sobre el total —«2 de 3 abiertas»—, o la indicación de que ninguna está abierta. Sin cajas activas: nada |

Por debajo de 1024px cada sede es una tarjeta con código y localidad bajo el nombre (**FR-AD-SHELL-13**).

**Ver en la demo:** `marta@malecon-sf.cu`, Sedes.

**FR-AD-SEDE-2 · Filtros.**

| Filtro | Valores | Por defecto |
| --- | --- | --- |
| Búsqueda | Texto libre. Encuentra la sede por código, nombre o localidad, sin distinguir mayúsculas de minúsculas | Vacío |
| Estado | Todos los estados, Activas, Suspendidas, Cerradas | Todos los estados |

- Los filtros se guardan en la dirección de la pantalla (**FR-AD-SCOPE-5**).
- Si los filtros no devuelven ninguna sede, la tabla lo indica.
- Crear y cerrar sedes es exclusivo de PuntoCash **[A3]**. Lo que el administrador puede corregir de una sede se edita desde su ficha (**FR-AD-SEDE-14**).

**Ver en la demo:** `abarrios@bahiacambios.cu`, Sedes, estado Suspendidas.

**Sin sedes.** Un usuario sin ninguna sede asignada ve un aviso informativo en lugar de la tabla.

**Ver en la demo:** `lperez@cienfuegoscambio.cu`, Sedes.

---

### 6.2 Ficha de sede — `/admin/sedes/[id]`

**FR-AD-SEDE-3 · Contenido.** La ficha tiene ocho bloques: datos de la sede, servicios habilitados, cajas y sus equipos, kioscos, trabajadores, tasas, promociones y jornadas de hoy. Una sede que no existe o está fuera del alcance responde `no-encontrada` (**FR-AD-NAV-3**).

**Ver en la demo:** `marta@malecon-sf.cu`, Sedes → PuntoCash Obispo.

**FR-AD-SEDE-13 · Sede suspendida.** Encima de los bloques, un aviso destacado con el motivo, la fecha de la suspensión y quién la declaró, y la consecuencia: ningún trabajador de la sede puede iniciar sesión y no se abren jornadas nuevas mientras dure **[A14]**. La ficha se puede consultar entera.

**Ver en la demo:** `abarrios@bahiacambios.cu`, Sedes → PuntoCash Trinidad.

**FR-AD-SEDE-4 / FR-AD-SEDE-5 / FR-AD-SEDE-12 · Datos de la sede.** Solo lectura, sin ningún campo editable en sitio.

| Dato | Lo mantiene |
| --- | --- |
| Código | PuntoCash **[A3]** |
| Nombre | PuntoCash **[A3]** |
| Dirección | El administrador |
| Municipio y provincia | El administrador |
| Teléfono | El administrador |
| Horario | El administrador. Se muestra con el texto que genera el sistema (**FR-AD-SEDE-15**) |
| Estado | PuntoCash |
| Fecha de alta en la red | PuntoCash |
| Asignación vigente | Fecha desde la que el operador administra la sede. Solo la vigente: el historial de asignaciones es del Super Admin **[A1]** |

- El bloque indica quién mantiene cada dato.
- El bloque advierte que estos datos son los que la sucursal exhibe en su pantalla informativa **[A12]**, **[FR-PANT-DATA-4]**, y que el código y el nombre se piden a PuntoCash.
- El código y el nombre no se cambian desde ninguna pantalla de esta consola.
- «Editar datos», junto al título del bloque → `/admin/sedes/{id}/editar`. No se ofrece si la sede está cerrada.

**FR-AD-SEDE-6 · Servicios habilitados.** Solo lectura. Cambio de moneda, Remesas y Giros, cada uno marcado como habilitado o no habilitado. El bloque indica que los habilita PuntoCash **[A3]**. Determina si se pueden fijar tasas en la sede (**FR-AD-TASA-2**).

**Ver en la demo:** `rortega@caribecambios.cu`, Sedes → PuntoCash Matanzas (sin Cambio de moneda).

**FR-AD-SEDE-7 · Cajas y sus equipos.** Todas las cajas de la sede, activas y retiradas. Los saldos son de consulta **[A6]**.

| Dato | Contenido |
| --- | --- |
| Caja | Identificador |
| Equipo | Rótulo del equipo vinculado, o la indicación de que no tiene, como advertencia |
| Jornada | Solo si tiene una abierta: el trabajador, si tiene la sesión iniciada o no, y el saldo actual por moneda |
| Estado | Activa o Retirada |

- Enlaces a `/admin/cajas` y a `/admin/equipos`.
- Sin cajas, en lugar de la lista, un texto que explica que hace falta crear al menos una.

**Ver en la demo:** `marta@malecon-sf.cu`, ficha de PuntoCash Obispo (Caja 01 con jornada abierta, Caja 02 sin equipo). Sin cajas: ficha de PuntoCash Cerro.

**FR-AD-SEDE-8 · Kioscos.** Los kioscos vinculados a la sede con su rótulo, su identificador y su última actividad, o la indicación de que no tiene actividad registrada. Enlace «Gestionar equipos» → `/admin/equipos`. Sin kioscos, un texto que lo indica.

**Ver en la demo:** `marta@malecon-sf.cu`, ficha de PuntoCash Obispo.

**FR-AD-SEDE-9 · Trabajadores.** Los trabajadores adscritos a la sede con nombre, identificador y estado (Activo o Desactivado). Sin caja asignada: un trabajador no tiene caja **[A13]**. Enlace «Gestionar trabajadores» → `/admin/trabajadores?sede={sedeId}`. Sin trabajadores, un texto que lo indica.

**Ver en la demo:** `marta@malecon-sf.cu`, ficha de PuntoCash Obispo. Sin trabajadores: ficha de PuntoCash Cerro.

**FR-AD-SEDE-11 · Tasas y Promociones.** Muestran lo que la pantalla informativa de la sede muestra hoy, leído de la misma fuente que la pantalla.

| Bloque | Contenido | Sin datos | Enlace |
| --- | --- | --- | --- |
| Tasas | El tablero: moneda, compra y venta, solo las tasas en vigor, con las cifras como las muestra el tablero (**FR-AD-TASA-18**) | Indica que la sede no publica ninguna tasa y la pantalla no muestra el tablero | «Gestionar tasas» → `/admin/tasas/{sedeId}` |
| Promociones | Las promociones en pantalla hoy, de la empresa y de red: título con enlace a `/admin/promociones/{id}`, texto y miniatura si tiene imagen | Indica que no hay ninguna en pantalla hoy | «Gestionar promociones» → `/admin/promociones` |

La lista de monedas de la sede no aparece en estos bloques **[A12]**.

**Ver en la demo:** `marta@malecon-sf.cu`, ficha de PuntoCash Vedado. Sin tasas: ficha de PuntoCash Cerro.

**FR-AD-SEDE-10 · Jornadas de hoy.** Encabeza con cuántas cajas activas tienen jornada abierta sobre el total. Una fila por caja activa:

| Situación de la caja | Contenido | La fila abre |
| --- | --- | --- |
| Con jornada abierta | Trabajador, «en sesión» si la está operando ahora, desde cuándo está abierta y número de movimientos hasta el momento | Esa jornada |
| Sin jornada abierta | Desde cuándo está cerrada (fecha y hora del último cierre) y quién tuvo la última jornada | La última jornada cerrada |
| Nunca abrió | La indicación de que todavía no ha abierto ninguna jornada | Nada |

El fondeo y el resto de la jornada están en su detalle (**FR-AD-JOR-4**). Sin cajas activas, el bloque indica que la sede no puede abrir jornadas.

**Ver en la demo:** `marta@malecon-sf.cu`, ficha de PuntoCash Obispo: Caja 01 abierta desde ayer, Caja 03 cerrada, Cajas 02 y 04 sin ninguna jornada. «En sesión»: ficha de PuntoCash Vedado, Caja 01.

---

### 6.3 Editar datos de la sede — `/admin/sedes/[id]/editar`

**FR-AD-SEDE-14 · Pantalla.** Se llega desde «Editar datos» en la ficha. Ofrece «Volver a la sede» → `/admin/sedes/{id}`. El encabezado muestra el nombre de la sede y recuerda que el código y el nombre los gestiona PuntoCash; no forman parte del formulario.

| Condición al abrir | Resultado |
| --- | --- |
| La sede no existe o está fuera del alcance | `no-encontrada` (**FR-AD-NAV-3**) |
| La sede está cerrada | Redirige a `/admin/sedes/{id}` |
| La sede está suspendida | Se edita con normalidad |

**Campos.**

| Campo | Obligatorio | Reglas |
| --- | --- | --- |
| Dirección | Sí | Se guarda sin espacios al principio y al final |
| Municipio y provincia | Sí | Se guarda sin espacios al principio y al final |
| Teléfono | Sí | Solo cifras, «+» inicial, espacios y guiones. Al menos 8 cifras. Se guarda sin espacios al principio y al final y con los espacios repetidos reducidos a uno |
| Horario | Sí | Por días, según **FR-AD-SEDE-15** |

**FR-AD-SEDE-15 · Horario.**

- Cada día de la semana, de lunes a domingo, está cerrado o abierto.
- Un día abierto tiene hora de apertura y hora de cierre, en formato de 24 horas `HH:MM`.
- La hora de cierre es posterior a la de apertura el mismo día.
- Al menos un día está abierto.
- Las horas de un día marcado como cerrado se ignoran al guardar.
- Un día que se marca como abierto sin horas previas propone 09:00 a 18:00.
- «Copiar el lunes a los días abiertos» copia la franja del lunes a todos los demás días marcados como abiertos. Solo se ofrece si el lunes está abierto.
- Una vista previa muestra el horario como quedará escrito en la pantalla informativa, y se actualiza al editar.
- El horario se guarda por días, no como texto. El texto lo genera el sistema, con este formato:
  - Agrupa los días **seguidos** con la misma franja: «Lunes a viernes · 8:30 a.m. – 5:30 p.m.»; dos días seguidos, «Sábado y domingo · …»; un día solo, «Sábado · 9:00 a.m. – 1:00 p.m.».
  - Horas en formato de 12 horas con «a.m.» o «p.m.».
  - Los días cerrados no se nombran.
- El horario guardado es la fuente de los avisos de Inicio que dependen de la hora (**FR-AD-HOME-2**).

**Ver en la demo:** `marta@malecon-sf.cu`, Sedes → PuntoCash Obispo → «Editar datos».

**Rechazos del servidor.** El servidor valida todos los casos. Ante un rechazo, el formulario conserva lo escrito y muestra el error junto al campo; un error de horario señala el día.

| Condición | Código |
| --- | --- |
| Dirección vacía | `direccion-vacia` |
| Municipio y provincia vacío | `municipio-vacio` |
| Teléfono con caracteres no admitidos o con menos de 8 cifras | `telefono-invalido` |
| Ningún día abierto | `horario-sin-dias` |
| Un día abierto sin hora de apertura o de cierre válida | `horario-incompleto` |
| Un día con hora de cierre igual o anterior a la de apertura | `horario-cierra-antes` |
| La sede está cerrada | `sede-cerrada` |
| La sede no existe o está fuera del alcance | `no-encontrada` |

**Ver en la demo:** `marta@malecon-sf.cu`, editar PuntoCash Obispo con teléfono «1234», o con el sábado de 18:00 a 9:00, o con todos los días cerrados.

**FR-AD-SEDE-14 / FR-AD-SEDE-16 · Al guardar.**

- Se guardan dirección, municipio y provincia, teléfono y horario.
- La pantalla vuelve a `/admin/sedes/{id}`. Si cambió algún dato, con un aviso de éxito que indica que la pantalla informativa pasa a mostrar los datos.
- La pantalla informativa de la sucursal muestra siempre la dirección, el teléfono y el horario vigentes: lo guardado llega a una pantalla ya instalada sin reiniciarla ni volver a elegir su sede **[A12]**, **[FR-PANT-DATA-4]**.

**Ver en la demo:** abrir `/kiosk/pantalla` y elegir PuntoCash Obispo. En otra pestaña, con `marta@malecon-sf.cu`, cambiar el teléfono de PuntoCash Obispo y guardar. La diapositiva de la sucursal muestra el teléfono nuevo en su siguiente refresco, sin recargarla.

---

### 6.4 Auditoría

**FR-AD-SEDE-14** **[RP-21]** Solo se registra un guardado que cambia al menos un dato.

| Acción | Evento | Datos |
| --- | --- | --- |
| Editar datos de la sede | `sede.editada` | Autor, fecha, sede, campos cambiados (dirección, municipio y provincia, teléfono, horario), y dirección, municipio, teléfono y horario completos antes y después |

---

## 7. Trabajadores

**Adscripción.** Un trabajador pertenece a una **sede**, nunca a una caja **[A13]**, **[FR-DEV-5]**. La caja la determina el equipo en el que inicia sesión. Esta sección es el único lugar del producto donde se desactiva a una persona **[A4]**, **[A14]**.

### 7.1 Listado de trabajadores — `/admin/trabajadores`

**FR-AD-TRAB-1 · Contenido.**

- Muestra los trabajadores de todas las sedes del alcance, sin aplicar el selector de la cabecera (**FR-AD-SCOPE-4**).
- Orden: por nombre de sede y, dentro de cada sede, por nombre del trabajador.
- Ofrece «Dar de alta» → `/admin/trabajadores/nuevo`.

Datos de cada trabajador:

| Dato | Contenido |
| --- | --- |
| Trabajador | Nombre completo, con enlace a `/admin/trabajadores/{id}` |
| Identificador | Identificador de acceso |
| Sede | Nombre de su sede |
| Correo de verificación | Enmascarado (**FR-AD-FMT-3**) |
| Estado | «Activo» o «Desactivado» |
| Alta | Fecha de alta |
| Última jornada | Si tiene una abierta: que está abierta ahora y su caja. Si no: fecha de apertura y caja de la más reciente. Enlace a `/admin/jornadas/{id}`. Si nunca abrió ninguna: «Ninguna» |

Ninguna columna ni dato de esta sección presenta al trabajador asociado a una caja **[A13]**.

Por debajo de 1024px cada trabajador es una tarjeta (**FR-AD-SHELL-13**). Un usuario sin trabajadores en sus sedes ve un aviso de lista vacía, distinto del de filtros sin resultados (**FR-AD-STATE-1**).

**Ver en la demo:** `marta@malecon-sf.cu`, **Trabajadores**. Sin trabajadores: `lperez@cienfuegoscambio.cu`, Trabajadores.

**FR-AD-TRAB-2 · Filtros.**

| Filtro | Valores | Por defecto |
| --- | --- | --- |
| Búsqueda | Texto contenido en el nombre o en el identificador, sin distinguir mayúsculas | Vacío |
| Sede | «Todas mis sedes» o una sede del alcance. Solo aparece si el alcance tiene más de una sede | Todas |
| Estado | Activos, desactivados o todos | **Activos** |

- El filtro de estado está siempre visible y se puede cambiar.
- Los filtros viven en la dirección (`texto`, `sede`, `estado`) (**FR-AD-SCOPE-5**). `?sede={id}` llega preseleccionado desde la ficha de una sede.

**Ver en la demo:** `marta@malecon-sf.cu`, Trabajadores, cambiar el estado a «Todos los estados». Sin filtro de sede: `ibetancourt@centrodivisas.cu`.

---

### 7.2 Dar de alta un trabajador — `/admin/trabajadores/nuevo`

**FR-AD-TRAB-3 / FR-AD-TRAB-4 / FR-AD-TRAB-5 / FR-AD-TRAB-6 · Campos.**

| Campo | Obligatorio | Reglas |
| --- | --- | --- |
| Nombre | Sí | Se guarda sin espacios al principio y al final |
| Primer apellido | Sí | Ídem |
| Segundo apellido | No | Ídem |
| Tipo de documento | Sí | Del catálogo de tipos de documento. Por defecto, CI |
| Número de documento | Sí | Único entre todos los trabajadores de la red |
| Teléfono | Sí | Texto libre |
| Correo | Sí | Formato de correo válido. Recibe el código de verificación de cada inicio de sesión **[R13]** |
| Identificador de acceso | Sí | Único en toda la red, sin distinguir mayúsculas de minúsculas |
| Sede | Sí | Solo sedes del alcance vigente que no estén cerradas. Una suspendida se admite y se marca «· suspendida» (**FR-AD-TRAB-14**). Si el usuario tiene una sola sede elegible, no se elige: se usa esa |

- **El alta elige sede, nunca caja** **[A13]**: el formulario no tiene campo de caja.
- La pantalla no explica la ausencia de caja ni para qué sirve el correo: ni el alta ni la ficha llevan texto que lo justifique.
- Si el usuario no tiene ninguna sede elegible, la pantalla muestra un aviso en lugar del formulario.

**Ver en la demo:**

- Con varias sedes: `marta@malecon-sf.cu`, Trabajadores → Dar de alta.
- Con una sede suspendida en la lista: `abarrios@bahiacambios.cu`, Trabajadores → Dar de alta, campo Sede.
- Con una sola sede: `ibetancourt@centrodivisas.cu`, Trabajadores → Dar de alta.
- Sin sedes: `lperez@cienfuegoscambio.cu`, entrar directamente en `/admin/trabajadores/nuevo`.

**FR-AD-TRAB-7 · Rechazos.** El servidor valida todos los casos. Cada rechazo se muestra junto al campo que lo causa, incluida la sede. El formulario conserva lo escrito.

| Condición | Código |
| --- | --- |
| Un campo obligatorio vacío (el primero que falte) | `campo-obligatorio` |
| Correo con formato inválido | `correo-invalido` |
| Ya existe un trabajador con ese identificador en la red | `identificador-duplicado` |
| Ya existe un trabajador con ese documento | `documento-duplicado` |
| La sede está cerrada | `sede-cerrada` |
| La sede no existe o está fuera del alcance **[A1]** | `no-encontrada` |

**Ver en la demo** (`marta@malecon-sf.cu`, Dar de alta, resto de campos rellenos):

- Identificador duplicado: identificador `jperez`.
- Documento duplicado: número `88041203211`.
- Correo inválido: correo `abc`.

**FR-AD-TRAB-8 · Al guardar: credencial inicial.**

- El trabajador se crea **activo**, con su fecha de alta, en la sede elegida.
- El servidor genera una **credencial inicial** y la devuelve **una sola vez**. La pantalla de resultado muestra el identificador y la credencial, con la instrucción de entregarla al trabajador, y enlaza a su ficha y a dar de alta a otro.
- La credencial **no puede volver a consultarse**: ninguna pantalla ni respuesta la devuelve después (**FR-AD-FMT-4**). Si se pierde, se regenera (7.6).
- **La credencial es la contraseña de la cuenta**, no un pase de un solo uso: sirve indefinidamente y el acceso no obliga a cambiarla. El trabajador la cambia, cuando quiera, desde «¿Olvidaste tu contraseña?» de Worker (**Worker FRD §2.13**, **FR-REC-1** y ss.).

**Ver en la demo:** dar de alta cualquier trabajador con `marta@malecon-sf.cu`.

---

### 7.3 Ficha de un trabajador — `/admin/trabajadores/[id]`

Un trabajador que no existe o es de una sede fuera del alcance responde `no-encontrada`, con 404 (**FR-AD-NAV-2**, **FR-AD-NAV-3**).

**FR-AD-TRAB-9 · Contenido.**

| Bloque | Contenido |
| --- | --- |
| Cabecera | Nombre completo, identificador y sede |
| Datos | Estado, identificador de acceso, tipo y número de documento, teléfono, correo de verificación **enmascarado** (**FR-AD-FMT-3**), fecha de alta |
| Sede | Nombre de su sede. Ninguna caja **[A13]** |
| Actividad reciente | Su jornada abierta, si la tiene: caja, sede, fecha y hora de apertura, enlace a `/admin/jornadas/{id}`. Las cajas en que ha operado, con un enlace a su volumen por día en Reportes → `/admin/reportes?corte=dia&trabajador={id}` (**FR-AD-REP-12**). Sus **diez últimas jornadas**, de la más reciente a la más antigua; cada una se abre pulsándola → `/admin/jornadas/{id}` |
| Acciones | «Editar datos» → `/admin/trabajadores/{id}/editar`; «Regenerar credencial»; «Ayudar con el acceso» → `/admin/trabajadores/{id}/acceso`; «Reasignar a otra sede», solo si hay otra sede del alcance no cerrada; «Desactivar» si está activo o «Reactivar» si está desactivado |

Datos de cada jornada de la actividad reciente:

| Dato | Contenido |
| --- | --- |
| Fecha | Fecha de apertura |
| Caja | Identificador de la caja; con la sede si el usuario tiene más de una |
| Apertura y cierre | Horas de apertura y de cierre; fecha y hora del cierre si fue otro día; sin cierre si sigue abierta |
| Estado | Estado de la jornada (**FR-AD-JOR-1**) |
| Operaciones | Número de operaciones completadas |
| Cierre | Igual que la columna Cierre de Jornadas: cuadrada, diferencia por moneda, o sin contar con «Pendiente de conciliar» si aplica (**FR-AD-JOR-1**, **FR-AD-JOR-20**) |

Si tiene más de diez jornadas, la ficha indica cuántas tiene en total y enlaza a `/admin/jornadas`.

**Ver en la demo:** `marta@malecon-sf.cu`, Trabajadores → Carlos Díaz (jornada abierta desde ayer en la Caja 01 de PuntoCash Obispo). El caso de más de diez jornadas no se puede ver en la demo.

**FR-AD-TRAB-16 · Estado de acceso.** La ficha distingue por qué un trabajador no puede iniciar sesión:

| Causa | Quién la resuelve | Qué muestra la ficha |
| --- | --- | --- |
| Está desactivado | Esta consola (7.8) | Aviso con quién lo desactivó, cuándo y el motivo |
| Su sede está suspendida por PuntoCash | PuntoCash | Aviso de que no puede acceder aunque esté activo, con la causa y que la decide PuntoCash **[A14]** (**FR-AD-STATE-6**) |
| Su sede está cerrada | PuntoCash | Ídem |
| Su sede no tiene operador asignado | PuntoCash | Ídem |
| Su operador está suspendido por PuntoCash | PuntoCash | Ídem |

En las causas que controla PuntoCash, la ficha no ofrece ninguna acción para resolverlas **[A14]**.

**Ver en la demo:**

- Sede suspendida: `abarrios@bahiacambios.cu`, Trabajadores → Raúl León.
- Desactivado: desactivar a un trabajador como en 7.7 y abrir su ficha.
- Sede cerrada, sede sin operador y operador suspendido: no se pueden ver en la demo.

---

### 7.4 Editar los datos de un trabajador — `/admin/trabajadores/[id]/editar`

**FR-AD-TRAB-9 · Campos.** Pantalla propia, no un diálogo (**FR-AD-SHELL-15**). Viene rellena con los datos actuales.

| Campo | Obligatorio | Reglas |
| --- | --- | --- |
| Nombre | Sí | Sin espacios al principio y al final |
| Primer apellido | Sí | Ídem |
| Segundo apellido | No | Ídem |
| Tipo de documento | Sí | Del catálogo de tipos de documento |
| Número de documento | Sí | Único entre todos los trabajadores de la red, sin contar el suyo |
| Teléfono | Sí | Texto libre |

- **El identificador de acceso, el correo y la sede no se editan aquí.** El correo se cambia en 7.5 y la sede en 7.9. La pantalla no explica su ausencia.
- Al guardar, vuelve a la ficha.

| Condición | Código |
| --- | --- |
| Un campo obligatorio vacío (el primero que falte) | `campo-obligatorio` |
| Tipo de documento fuera del catálogo | `tipo-documento-requerido` |
| Otro trabajador tiene ese documento | `documento-duplicado` |
| El trabajador no existe o está fuera del alcance | `no-encontrada` |

**Ver en la demo:** `marta@malecon-sf.cu`, Trabajadores → Juan Pérez → «Editar datos». Documento duplicado: número `91072355442`.

---

### 7.5 Ayudar con el acceso — `/admin/trabajadores/[id]/acceso`

Responde al caso en que el trabajador dice que no le llega el código de verificación.

**FR-AD-TRAB-11 · Lo que no hace.** Esta pantalla y su escritura **no entregan, muestran ni generan ningún código de verificación, y no abren sesión por el trabajador** **[R13]**. Ninguna respuesta del servidor incluye un código ni un reto. La pantalla lo indica **antes de cualquier control**.

**FR-AD-TRAB-10 · Corregir el correo.** Es la única acción de esta pantalla.

- El acceso de un trabajador no tiene bloqueo de cuenta por contraseñas falladas ni un reto bloqueado que liberar: a quien agota intentos o envíos le basta con volver al inicio de sesión (**Worker FRD FR-2FA-1**, **FR-2FA-15**). El único bloqueo que resuelve esta consola es estar desactivado (7.8).
- Muestra el correo registrado **sin enmascarar** (excepción de **FR-AD-FMT-3**).
- Permite sustituirlo.

| Campo | Obligatorio | Reglas |
| --- | --- | --- |
| Correo de verificación | Sí | Formato de correo válido. Viene relleno con el actual |
| Motivo | Sí | Texto libre, **sin largo mínimo**: basta con que no esté vacío |

| Condición | Código |
| --- | --- |
| Correo vacío o con formato inválido | `correo-invalido` |
| Motivo vacío | `motivo-requerido` |
| El trabajador no existe o está fuera del alcance | `no-encontrada` |

**Efecto.**

- Los códigos de verificación siguientes van al correo nuevo.
- La recuperación de contraseña de Worker usa el mismo correo (**Worker FRD §2.13**), así que también queda corregida.

**Ver en la demo:** `marta@malecon-sf.cu`, Trabajadores → Juan Pérez → «Ayudar con el acceso».

---

### 7.6 Regenerar la credencial

**FR-AD-TRAB-8 · Regenerar.** Se inicia con «Regenerar credencial» en la ficha y se confirma en un diálogo, sin motivo.

- **Es un restablecimiento**: la credencial nueva sustituye a la anterior **y a cualquier contraseña que el trabajador haya elegido después**. El diálogo lo advierte antes de confirmar.
- La credencial nueva se muestra **una sola vez**, junto al identificador, con el mismo tratamiento que la del alta (7.2).
- Se puede regenerar con el trabajador activo o desactivado.

| Condición | Código |
| --- | --- |
| El trabajador no existe o está fuera del alcance | `no-encontrada` |

**Ver en la demo:** `marta@malecon-sf.cu`, Trabajadores → Juan Pérez → «Regenerar credencial».

---

### 7.7 Desactivar un trabajador

Se inicia con «Desactivar» en la ficha de un trabajador activo y se confirma en un diálogo (**FR-AD-STATE-3**).

**Bloqueo.** Si se da esta condición, el diálogo **no pide motivo**: dice dónde está la jornada abierta (caja y sede) y que se puede forzar su cierre desde ella.

| Requisito | Condición | Acción ofrecida | Código del servidor |
| --- | --- | --- | --- |
| **FR-AD-TRAB-13** | El trabajador tiene una jornada abierta **[R6]** | «Ir a la jornada» → `/admin/jornadas/{id}` | `jornada-abierta` |

**Ver en la demo:** `marta@malecon-sf.cu`, Trabajadores → Carlos Díaz → «Desactivar».

**FR-AD-TRAB-12 · Confirmación.** Sin bloqueo, el diálogo pide un **motivo** obligatorio, **sin largo mínimo**. Advierte que el trabajador no podrá iniciar sesión y que nada de lo que operó se borra ni se altera.

**Ver en la demo:** `marta@malecon-sf.cu`, Trabajadores → Marisol Rivas → «Desactivar».

**Rechazos del servidor.**

| Condición | Código |
| --- | --- |
| Motivo vacío | `motivo-requerido` |
| Jornada abierta | `jornada-abierta` |
| El trabajador no existe o está fuera del alcance | `no-encontrada` |

**FR-AD-TRAB-12 · Efecto.**

- El trabajador pasa a «Desactivado» y guarda el motivo, la fecha y el autor.
- No puede iniciar sesión.
- No se borra ni se modifica nada de lo que operó: jornadas, movimientos y operaciones **[A7]**.

---

### 7.8 Reactivar un trabajador

**FR-AD-TRAB-15.** Se inicia con «Reactivar» en la ficha de un trabajador desactivado y se confirma en un diálogo, sin motivo.

- El trabajador vuelve a «Activo» **en la sede que tenía**. El diálogo lo dice y nombra esa sede. Si debe ir a otra, se reasigna después (7.9).
- **Reactivar siempre es posible desde esta consola**: PuntoCash no desactiva trabajadores **[A14]**.
- Recupera el acceso con su identificador y su contraseña vigente.

| Condición | Código |
| --- | --- |
| El trabajador no existe o está fuera del alcance | `no-encontrada` |

**Ver en la demo:** desactivar a Marisol Rivas como en 7.7, filtrar el listado por «Desactivados», abrir su ficha y pulsar «Reactivar».

---

### 7.9 Reasignar a otra sede

**FR-AD-TRAB-14.** Se inicia con «Reasignar a otra sede» en la ficha y se confirma en un diálogo. El control solo aparece si existe otra sede del alcance que no esté cerrada.

**Bloqueo.** Mismo patrón que 7.7: con una jornada abierta, el diálogo no ofrece elegir sede.

| Requisito | Condición | Acción ofrecida | Código del servidor |
| --- | --- | --- | --- |
| **FR-AD-TRAB-14** | El trabajador tiene una jornada abierta **[R6]** | «Ir a la jornada» → `/admin/jornadas/{id}` | `jornada-abierta` |

**Ver en la demo:** `marta@malecon-sf.cu`, Trabajadores → Carlos Díaz → «Reasignar a otra sede».

**Campos.**

| Campo | Obligatorio | Reglas |
| --- | --- | --- |
| Nueva sede | Sí | Sedes del alcance no cerradas, salvo la actual. Una suspendida se admite y se marca «· suspendida» |

- La confirmación advierte que el cambio tiene **efecto inmediato** sobre dónde puede iniciar sesión.

**Ver en la demo:** `marta@malecon-sf.cu`, Trabajadores → Marisol Rivas → «Reasignar a otra sede». Hacia una sede activa desde una suspendida: `abarrios@bahiacambios.cu`, Trabajadores → Raúl León → «Reasignar a otra sede».

**Rechazos del servidor.**

| Condición | Código |
| --- | --- |
| Sede sin elegir | `sede-requerida` |
| Jornada abierta | `jornada-abierta` |
| La sede de destino está cerrada | `sede-cerrada` |
| El trabajador o la sede de destino no existen o están fuera del alcance | `no-encontrada` |

**Efecto.**

- El trabajador queda adscrito a la sede nueva.
- Desde ese momento solo puede iniciar sesión en equipos de cajas de su sede nueva **[FR-DEV-6]**.

---

### 7.10 Auditoría

**[RP-21]**

| Acción | Evento | Datos |
| --- | --- | --- |
| Dar de alta | `trabajador.alta` | Autor, fecha, sede, trabajador |
| Editar datos | `trabajador.editado` | Autor, fecha, sede, trabajador |
| Regenerar credencial | `trabajador.editado` | Autor, fecha, sede, trabajador, que se regeneró la credencial. Nunca la credencial |
| Reasignar | `trabajador.editado` | Autor, fecha, trabajador, sede nueva |
| Corregir el correo (**FR-AD-TRAB-10**) | `trabajador.asistencia-acceso` | Autor, fecha, sede, trabajador, correo anterior, correo nuevo, motivo |
| Desactivar (**FR-AD-TRAB-12**) | `trabajador.desactivado` | Autor, fecha, sede, trabajador, motivo |
| Reactivar | `trabajador.reactivado` | Autor, fecha, sede, trabajador |

---

## 8. Usuarios administradores

Los usuarios administradores de la empresa (el operador de la sesión) **[A4]**, **[A3]**. Pertenecen al operador, no a una sede.

### 8.1 Usuarios administradores — sección del administrador principal

#### 8.1.1 Acceso y papeles

**FR-AD-USR-11 · Solo el administrador principal.**

- Toda la sección (`/admin/usuarios`, `/admin/usuarios/nuevo`, `/admin/usuarios/[id]`, `/admin/usuarios/[id]/editar`) pertenece a **un único usuario por empresa: el administrador principal**.
- Solo él da de alta, edita, cambia el correo, regenera la credencial, desactiva, reactiva y traspasa el papel.
- Para cualquier otro usuario **la sección no existe**:
  - la entrada «Usuarios» no está en el menú, y se omite **en el servidor**, al construir el menú; el HTML entregado no la contiene (**FR-AD-SHELL-2**);
  - sus rutas responden como inexistentes, con 404 (**FR-AD-NAV-3**), no como prohibidas.
- Toda escritura de la sección comprueba en el servidor que quien actúa es el principal.

**Ver en la demo:** `dcastro@malecon-sf.cu`: el menú no tiene Usuarios, y entrar en `/admin/usuarios` responde 404. `marta@malecon-sf.cu`: el menú tiene Usuarios.

**FR-AD-USR-4 · Un único nivel de permisos sobre la operación.**

- Todos los usuarios administradores de un operador pueden exactamente lo mismo en la operación, en **todas** sus sedes: sedes, cajas, equipos, trabajadores, monedas, tasas, promociones, aprobaciones y reportes.
- La única diferencia entre usuarios es esta sección, que es del principal.
- El modelo tiene una sola marca, «es el principal». Sin roles, sub-roles, permisos por capacidad ni usuarios limitados a una sede.

**FR-AD-USR-14 · Principal e inicial son dos datos distintos.**

| Dato | Qué es | Cambia |
| --- | --- | --- |
| Usuario inicial | El usuario que entregó PuntoCash al crear la empresa (**FR-SA-OPE-5**). Es la cuenta cuyo acceso PuntoCash puede restablecer | Nunca |
| Administrador principal | El titular de esta sección | Solo por traspaso (8.1.6) |

- Al crear la empresa, los dos son el mismo usuario.
- Hay **exactamente un** principal por empresa en todo momento.

---

#### 8.1.2 Listado de usuarios — `/admin/usuarios`

**FR-AD-USR-1 · Contenido.**

- Muestra todos los usuarios administradores del operador de la sesión, activos y desactivados.
- Orden: el principal primero; después los activos; dentro de cada grupo, por nombre.
- Búsqueda por nombre o identificador, en la dirección (`texto`).
- Ofrece «Dar de alta» → `/admin/usuarios/nuevo`.

Datos de cada usuario:

| Dato | Contenido |
| --- | --- |
| Usuario | Nombre completo, con enlace a `/admin/usuarios/{id}`. La fila de quien mira lleva una marca |
| Identificador | Identificador de acceso |
| Correo de verificación | Enmascarado (**FR-AD-FMT-3**) |
| Estado | «Activo» o «Desactivado» |
| Alta | Fecha de alta |
| Último acceso | Fecha y hora del último acceso completado, con el código ya verificado; o que nunca ha entrado |
| Papel | «Administrador» o «Administrador principal», en su propia columna |

- El listado no muestra quién es el usuario inicial.
- Encima de la lista, un aviso dice al principal que la sección es solo suya. **Se puede cerrar**, y una vez cerrado no vuelve a mostrarse.

Por debajo de 1024px cada usuario es una tarjeta (**FR-AD-SHELL-13**).

**Ver en la demo:** `marta@malecon-sf.cu`, **Usuarios**. Para cerrar el aviso, su control de cierre; al volver a entrar ya no aparece.

---

#### 8.1.3 Dar de alta un usuario — `/admin/usuarios/nuevo`

**FR-AD-USR-2 / FR-AD-USR-3 · Campos.**

| Campo | Obligatorio | Reglas |
| --- | --- | --- |
| Nombre | Sí | Sin espacios al principio y al final |
| Primer apellido | Sí | Ídem |
| Segundo apellido | No | Ídem |
| Teléfono | Sí | Texto libre |
| Correo | Sí | Formato de correo válido. Es el canal del segundo factor **[R13]** |
| Identificador de acceso | Sí | Único entre todos los usuarios administradores, sin distinguir mayúsculas de minúsculas |

- El usuario nace en la empresa de quien lo crea, con potestad sobre todas sus sedes. No se elige sede.
- **FR-AD-USR-4:** antes de confirmar, la pantalla advierte que el usuario nuevo podrá hacer todo lo que hace quien lo crea en la operación, en todas sus sedes, salvo esta sección.

**Ver en la demo:** `marta@malecon-sf.cu`, Usuarios → Dar de alta.

**Rechazos.** Cada rechazo de campo se muestra junto a su campo. El formulario conserva lo escrito.

| Condición | Código |
| --- | --- |
| Un campo obligatorio vacío (el primero que falte) | `campo-obligatorio` |
| Correo con formato inválido | `correo-invalido` |
| Ya existe un usuario administrador con ese identificador | `identificador-duplicado` |
| Quien actúa no es el principal | `no-es-el-principal` |

**Ver en la demo:** `marta@malecon-sf.cu`, Dar de alta, identificador `dcastro@malecon-sf.cu`.

**FR-AD-USR-5 · Al guardar.**

- El usuario se crea activo, con papel «Administrador», no inicial, con su fecha de alta.
- Se genera una **credencial inicial** con el mismo tratamiento que **FR-AD-TRAB-8**: se muestra una sola vez junto al identificador y no puede volver a consultarse.

**Ver en la demo:** dar de alta cualquier usuario con `marta@malecon-sf.cu`.

---

#### 8.1.4 Ficha de un usuario — `/admin/usuarios/[id]`

Un usuario que no existe o es de otra empresa responde `no-encontrada`, con 404 (**FR-AD-NAV-2**, **FR-AD-NAV-3**).

**FR-AD-USR-6 · Contenido.** Solo sus datos y sus acciones.

| Bloque | Contenido |
| --- | --- |
| Cabecera | Nombre completo e identificador; si es el propio usuario, lo indica |
| Aviso | Si está desactivado: que no puede entrar y que puede reactivarse desde aquí |
| Datos | Estado, identificador de acceso, teléfono, correo de verificación **enmascarado** (**FR-AD-FMT-3**), fecha de alta, último acceso o que nunca ha entrado |
| Acciones | «Editar datos» → `/admin/usuarios/{id}/editar`; «Cambiar correo»; «Regenerar credencial»; «Traspasar la administración de usuarios» (8.1.6); «Desactivar» si está activo y no es el principal; «Reactivar» si está desactivado |

La única explicación de la pantalla es la de un control ausente (**FR-AD-USR-13**).

**Ver en la demo:** `marta@malecon-sf.cu`, Usuarios → Daniel Castro.

**FR-AD-USR-13 · Al principal no lo desactiva nadie, ni él mismo.**

- En la ficha del principal no se ofrece «Desactivar».
- En su lugar, la ficha explica por qué y qué hacer: traspasar primero el papel. Si no hay otro usuario activo al que traspasarlo, lo indica.
- El servidor rechaza la desactivación del principal con `es-el-principal`.
- Garantiza que la empresa siempre tiene un administrador capaz de dar de alta a otro.

**Ver en la demo:** `marta@malecon-sf.cu`, Usuarios → Marta Sánchez. Sin otro usuario activo: `rortega@caribecambios.cu`, Usuarios → Reinaldo Ortega.

---

#### 8.1.5 Acciones de la ficha

**FR-AD-USR-6 · Editar datos — `/admin/usuarios/[id]/editar`.** Pantalla propia, no un diálogo. Viene rellena con los datos actuales.

| Campo | Obligatorio | Reglas |
| --- | --- | --- |
| Nombre | Sí | Sin espacios al principio y al final |
| Primer apellido | Sí | Ídem |
| Segundo apellido | No | Ídem |
| Teléfono | Sí | Texto libre |

- **El identificador de acceso y el correo no se editan aquí.** La pantalla no explica su ausencia.
- El principal puede editar sus propios datos.
- Al guardar, vuelve a la ficha.

| Condición | Código |
| --- | --- |
| Un campo obligatorio vacío (el primero que falte) | `campo-obligatorio` |
| Quien actúa no es el principal | `no-es-el-principal` |
| El usuario no existe o es de otra empresa | `no-encontrada` |

**Ver en la demo:** `marta@malecon-sf.cu`, Usuarios → Daniel Castro → «Editar datos».

**FR-AD-USR-6 · Cambiar correo.** Se inicia con «Cambiar correo» y se hace en un diálogo, sin motivo.

| Campo | Obligatorio | Reglas |
| --- | --- | --- |
| Correo de verificación | Sí | Formato de correo válido. Viene relleno con el correo actual entero (excepción de **FR-AD-FMT-3**) |

- Si el principal cambia el suyo, el diálogo le advierte que el próximo código irá a esa dirección.
- Los códigos siguientes, de acceso y de recuperación, van al correo nuevo.

| Condición | Código |
| --- | --- |
| Correo vacío o con formato inválido | `correo-invalido` |
| Quien actúa no es el principal | `no-es-el-principal` |
| El usuario no existe o es de otra empresa | `no-encontrada` |

**Ver en la demo:** `marta@malecon-sf.cu`, Usuarios → Daniel Castro → «Cambiar correo». El aviso propio: en la ficha de Marta Sánchez.

**FR-AD-USR-5 · Regenerar credencial.** Igual que 7.6: se confirma en un diálogo sin motivo, es un restablecimiento que sustituye la contraseña vigente, y la credencial nueva se muestra una sola vez. El principal puede regenerar la suya.

| Condición | Código |
| --- | --- |
| Quien actúa no es el principal | `no-es-el-principal` |
| El usuario no existe o es de otra empresa | `no-encontrada` |

**Ver en la demo:** `marta@malecon-sf.cu`, Usuarios → Daniel Castro → «Regenerar credencial».

**Desactivar.** Se inicia con «Desactivar» en un usuario activo que no es el principal, y se confirma en un diálogo, sin motivo (**FR-AD-STATE-3**).

- El usuario pasa a «Desactivado» y no puede iniciar sesión.
- No se borra ni se modifica nada de lo que hizo **[A7]**.

| Condición | Código |
| --- | --- |
| El usuario es el principal (**FR-AD-USR-13**) | `es-el-principal` |
| Quien actúa no es el principal | `no-es-el-principal` |
| El usuario no existe o es de otra empresa | `no-encontrada` |

**Ver en la demo:** `marta@malecon-sf.cu`, Usuarios → Daniel Castro → «Desactivar».

**FR-AD-USR-9 · Reactivar.** Se inicia con «Reactivar» en un usuario desactivado, desde la misma ficha, y se confirma en un diálogo, sin motivo.

- El usuario vuelve a «Activo», con su identificador y su contraseña vigente, y recupera todas las potestades de **FR-AD-USR-4**. El diálogo lo advierte.

| Condición | Código |
| --- | --- |
| Quien actúa no es el principal | `no-es-el-principal` |
| El usuario no existe o es de otra empresa | `no-encontrada` |

**Ver en la demo:** desactivar a Daniel Castro y pulsar «Reactivar» en su ficha.

---

#### 8.1.6 Traspasar el papel de principal

**FR-AD-USR-12.** El principal traspasa el papel **desde su propia ficha**, con «Traspasar la administración de usuarios», y lo confirma en un diálogo.

- El control solo aparece en la ficha del principal y solo si hay al menos otro usuario activo en la empresa.
- El diálogo advierte que quien traspasa deja de ver esta sección.

| Campo | Obligatorio | Reglas |
| --- | --- | --- |
| Destinatario | Sí | Un usuario **activo** de la empresa distinto de quien traspasa |

**Rechazos del servidor.**

| Condición | Código |
| --- | --- |
| Destinatario sin elegir | `destino-requerido` |
| El destinatario es quien traspasa | `es-uno-mismo` |
| El destinatario no está activo | `destino-no-activo` |
| Quien actúa no es el principal | `no-es-el-principal` |
| El destinatario no existe o es de otra empresa | `no-encontrada` |

**Efecto.**

- **Inmediato y en un solo acto**: al confirmar hay exactamente un principal, el destinatario. En ningún momento hay dos principales ni ninguno.
- Quien traspasó pasa a «Administrador»: **deja de ver esta sección** y conserva todo lo demás.
- La confirmación lleva a `/admin/inicio` con una carga completa del shell, que llega ya sin la entrada «Usuarios».
- El usuario inicial no cambia (**FR-AD-USR-14**).

**Ver en la demo:** `marta@malecon-sf.cu`, Usuarios → Marta Sánchez → «Traspasar la administración de usuarios», destinatario Daniel Castro. Después, el menú de Marta no tiene Usuarios.

---

#### 8.1.7 Auditoría

**FR-AD-USR-10** **[RP-21]**

| Acción | Evento | Datos |
| --- | --- | --- |
| Dar de alta | `usuario-admin.alta` | Autor, fecha, usuario |
| Editar datos | `usuario-admin.editado` | Autor, fecha, usuario |
| Cambiar correo | `usuario-admin.editado` | Autor, fecha, usuario, correo anterior, correo nuevo |
| Regenerar credencial | `usuario-admin.editado` | Autor, fecha, usuario, que se regeneró la credencial. Nunca la credencial |
| Traspasar el papel | `usuario-admin.editado` | Autor, fecha, principal anterior, principal nuevo |
| Desactivar | `usuario-admin.desactivado` | Autor, fecha, usuario |
| Reactivar | `usuario-admin.reactivado` | Autor, fecha, usuario |

---

### 8.2 Perfil

Lo que cada persona con sesión ve y cambia de sí misma, sea o no el principal.

#### 8.2.1 Perfil — `/admin/perfil`

**FR-AD-PERF-1 / FR-AD-PERF-2 · Contenido.**

- Es de **toda persona con sesión**. Es **la misma pantalla para el principal y para los demás**; la única diferencia es la indicación del correo (**FR-AD-PERF-4**).
- No explica qué puede hacer cada papel.
- Se llega desde el acceso de Perfil de la cabecera y, por debajo de 1024px, desde el cajón (**FR-AD-SHELL-4**, **FR-AD-SHELL-9**). No está en la barra lateral.

| Bloque | Contenido |
| --- | --- |
| Tus datos | Nombre, identificador de acceso, teléfono, correo de verificación **enmascarado** (**FR-AD-FMT-3**), papel («Administrador» o «Administrador principal», como en **FR-AD-USR-1**) y empresa. Acción «Editar» → `/admin/perfil/editar` |
| Contraseña | Un valor oculto de largo fijo y la acción «Cambiar contraseña» → `/admin/perfil/contrasena` |

**FR-AD-PERF-4 · Dónde se cambia el correo.** Junto al correo, la pantalla indica dónde se cambia:

| Quien mira | Indicación |
| --- | --- |
| No es el principal | Que se lo pida al administrador principal, por su nombre |
| Es el principal | Que se cambia desde su ficha en Usuarios, con enlace a `/admin/usuarios/{su id}` |

**Ver en la demo:** `dcastro@malecon-sf.cu`, Perfil (remite a Marta Sánchez). `marta@malecon-sf.cu`, Perfil (enlace a su ficha).

---

#### 8.2.2 Editar los datos propios — `/admin/perfil/editar`

**FR-AD-PERF-3 · Campos.** Pantalla propia, con los mismos campos que **FR-AD-USR-6**. Viene rellena con los datos actuales.

| Campo | Obligatorio | Reglas |
| --- | --- | --- |
| Nombre | Sí | Sin espacios al principio y al final |
| Primer apellido | Sí | Ídem |
| Segundo apellido | No | Ídem |
| Teléfono | Sí | Texto libre |

- **FR-AD-PERF-4:** **el correo y el identificador no se cambian desde el perfil.** Ninguno de los dos aparece en esta pantalla, y su ausencia no se explica. El correo solo lo cambia el principal desde §8; el identificador no lo cambia nadie.
- **La escritura actúa sobre quien tiene la sesión y sobre nadie más**: no recibe ningún identificador de usuario de destino. Por eso no exige ser el principal.
- Ante un rechazo, el formulario conserva lo escrito.
- Al guardar, vuelve a `/admin/perfil`, y el nombre nuevo se ve también en la cabecera.

| Condición | Código |
| --- | --- |
| Un campo obligatorio vacío (el primero que falte) | `campo-obligatorio` |

**Ver en la demo:** `dcastro@malecon-sf.cu`, Perfil → «Editar».

---

#### 8.2.3 Cambiar la contraseña — `/admin/perfil/contrasena`

**FR-AD-PERF-5 · Campos.**

| Campo | Obligatorio | Reglas |
| --- | --- | --- |
| Contraseña actual | Sí | Debe ser la vigente. Se pide aunque haya sesión |
| Contraseña nueva | Sí | Al menos 8 caracteres, la misma regla que la recuperación (**FR-REC** de Worker). Distinta de la actual |
| Repetición de la nueva | Sí | Igual a la nueva |

- Las contraseñas se comparan tal cual, sin quitar espacios.
- Cada rechazo se muestra en el campo al que corresponde. Un rechazo **conserva** lo escrito en los tres campos, y el mensaje de un campo se retira en cuanto se corrige ese campo.
- La escritura actúa solo sobre quien tiene la sesión.

**Rechazos**, comprobados en este orden:

| Condición | Campo | Código |
| --- | --- | --- |
| La contraseña actual no es la vigente | Actual | `actual-incorrecta` |
| La nueva tiene menos de 8 caracteres | Nueva | `demasiado-corta` |
| La nueva es igual a la actual | Nueva | `igual-a-la-actual` |
| La repetición no coincide con la nueva | Repetición | `no-coinciden` |

**Ver en la demo** (`marta@malecon-sf.cu`, Perfil → «Cambiar contraseña»):

- Actual incorrecta: actual `otra`.
- Demasiado corta: actual `puntocash`, nueva `1234`.
- Igual a la actual: actual y nueva `puntocash`.
- No coinciden: actual `puntocash`, nueva `nuevaclave1`, repetición `nuevaclave2`.

**FR-AD-PERF-6 · Al guardar.**

- Vuelve a `/admin/perfil` con una confirmación de que la contraseña cambió y de que la sesión sigue abierta.
- **Desde ese momento la contraseña anterior deja de servir.**

**FR-AD-PERF-7 · Sesiones.**

- **La sesión desde la que se cambia sigue abierta.**
- **Las demás sesiones de esa cuenta se cierran**, igual que en **FR-REC-10** de Worker.

**Ver en la demo:** cambiar la contraseña con `marta@malecon-sf.cu` (actual `puntocash`). El cierre de las demás sesiones no se puede ver en la demo.

---

#### 8.2.4 Auditoría

**[RP-21]**

| Acción | Requisito | Evento | Datos |
| --- | --- | --- | --- |
| Editar los datos propios | **FR-AD-PERF-3** | `usuario-admin.editado` | Autor, fecha, que fue desde su perfil |
| Cambiar la contraseña | **FR-AD-PERF-8** | `usuario-admin.contrasena-cambiada` | Autor y fecha. **Nunca** la contraseña, ni la anterior ni la nueva |

---

## 9. Monedas

- Cada sede tiene su **lista de monedas**: las que maneja esa sucursal **[A4]**.
- Las monedas se eligen del **catálogo de la plataforma**, que mantiene PuntoCash (**FR-SA-MON-1**).
- La tasa de cada moneda contra el peso cubano se fija en Tasas (§10).

### 9.1 Lista de monedas — `/admin/monedas`

**FR-AD-MON-1 · Contenido.**

- Muestra la lista de cada sede que deja ver el selector de alcance (**FR-AD-SCOPE-4**), en un bloque por sede, ordenados por nombre de sede.
- Cada bloque indica si la sede está suspendida o cerrada y cuántas monedas tiene.
- Una sede suspendida se gestiona igual que una activa. Una sede cerrada aparece sin «Añadir moneda» ni «Retirar».
- Debajo de la lista de cada sede, «Añadir moneda», salvo que la sede ya tenga todas las del catálogo (**FR-AD-MON-3**).

Datos de cada moneda, en el orden en que se añadieron:

| Dato | Contenido |
| --- | --- |
| Moneda | Bandera, código y nombre |
| Habilitada en cajas | Cuántas cajas **activas** de la sede la tienen habilitada hoy, sobre el total de cajas activas, y sus nombres. Si no está en ninguna, la indicación de que no lo está |
| Acción | «Retirar» |

Por debajo de 1024px cada moneda es una tarjeta, con las cajas como subtítulo (**FR-AD-SHELL-13**).

**FR-AD-MON-5 · Independiente del Cambio de moneda.** La lista existe y se gestiona igual en toda sede, tenga o no habilitado el servicio de Cambio de moneda. La pantalla no muestra el servicio. Las tasas sí dependen de él (§10).

**Sin sedes.** Un usuario sin ninguna sede asignada ve un aviso informativo en lugar de los bloques.

**Ver en la demo:**

- `marta@malecon-sf.cu`, **Monedas**.
- Sede suspendida: `abarrios@bahiacambios.cu`, bloque PuntoCash Trinidad.
- Sede sin Cambio de moneda, con su lista: `rortega@caribecambios.cu`, bloque PuntoCash Matanzas.
- Sede sin monedas: `abarrios@bahiacambios.cu`, bloque PuntoCash Pinar del Río.
- Sin sedes: `lperez@cienfuegoscambio.cu`, Monedas.
- Sede cerrada: no se puede ver en la demo.

---

### 9.2 Añadir una moneda

Se inicia con «Añadir moneda» en el bloque de una sede y se hace en un diálogo.

**FR-AD-MON-3 · Campos.**

| Campo | Obligatorio | Reglas |
| --- | --- | --- |
| Moneda | Sí | Solo las monedas del catálogo que la sede todavía no tiene |

**FR-AD-MON-4 · Efecto.**

- La moneda se añade al final de la lista de la sede, con su fecha de alta.
- **No se habilita en ninguna caja ni se crea ningún saldo.** Queda a disposición de los trabajadores de la sede, que la habilitan y fondean en su caja **[A6]**.
- El diálogo advierte de esto antes de añadir.

**Rechazos del servidor.**

| Condición | Código |
| --- | --- |
| Moneda sin elegir | `moneda-requerida` |
| La moneda no está en el catálogo | `moneda-desconocida` |
| La moneda ya está en la lista de la sede | `ya-en-la-lista` |
| La sede está cerrada | `sede-cerrada` |
| La sede no existe o está fuera del alcance | `no-encontrada` |

**Ver en la demo:** `abarrios@bahiacambios.cu`, Monedas, «Añadir moneda» en PuntoCash Pinar del Río.

---

### 9.3 Retirar una moneda

Se inicia con «Retirar» en una moneda y se confirma en un diálogo. Retirar significa que **la sede deja de manejar la moneda**.

**Bloqueos.** Si se da alguna de estas condiciones, el diálogo explica la condición en lugar de ofrecer la confirmación. Si se cumplen las dos, se explica la primera de la tabla.

| Requisito | Condición | Qué dice el diálogo | Código del servidor |
| --- | --- | --- | --- |
| **FR-AD-MON-9** | Es la única moneda de una sede con estado activa | Que es la última y hay que añadir otra antes | `ultima-moneda` |
| **FR-AD-MON-7** | Alguna caja de la sede, **activa o retirada**, tiene la moneda con saldo distinto de cero **[R6]** | Las cajas con saldo, por su nombre (una retirada, marcada como tal) | `con-saldo` |

**Ver en la demo:**

- Con saldo: `marta@malecon-sf.cu`, Monedas, «Retirar» en GBP de PuntoCash Vedado (saldo en Caja 03).
- Última moneda: `abarrios@bahiacambios.cu`, Monedas, añadir una moneda a PuntoCash Pinar del Río y pulsar «Retirar» en ella.

**FR-AD-MON-6 / FR-AD-MON-8 · Confirmación.** Sin bloqueos, el diálogo dice antes de confirmar:

- de qué cajas se quitará también la moneda, por su nombre (todas la tienen en cero, por **FR-AD-MON-7**);
- qué tasas se retirarán con ella y que dejarán de verse en el tablero de la sede: la de esa moneda, si la tiene; si la moneda es el **peso cubano**, **todas** las tasas de la sede, por su moneda;
- que las operaciones y movimientos ya registrados en esa moneda no cambian **[R9]**, **[A7]**.

**Ver en la demo:**

- Quitarla de una caja en cero: `marta@malecon-sf.cu`, Monedas, «Retirar» en CAD de PuntoCash Obispo (Caja 01).
- Con su tasa: `abarrios@bahiacambios.cu`, Monedas, «Retirar» en CAD de PuntoCash Trinidad.
- Peso cubano con todas las tasas: `abarrios@bahiacambios.cu`, Monedas, «Retirar» en CUP de PuntoCash Trinidad.

**Rechazos del servidor.** Al confirmar, el servidor vuelve a comprobar todas las condiciones.

| Condición | Código |
| --- | --- |
| Única moneda de una sede activa | `ultima-moneda` |
| Alguna caja de la sede, activa o retirada, la tiene con saldo distinto de cero. El rechazo nombra esas cajas | `con-saldo` |
| La moneda ya no estaba en la lista | `no-en-la-lista` |
| La sede está cerrada | `sede-cerrada` |
| La sede no existe o está fuera del alcance | `no-encontrada` |

**Efecto.**

- La moneda sale de la lista de la sede. Sus trabajadores ya no pueden habilitarla.
- Sale también de **todas las cajas de la sede que la tenían habilitada**, activas o retiradas.
- Se retiran las tasas indicadas en la confirmación (**FR-AD-MON-8**), igual que en 10.5.
- No se modifica ningún registro histórico **[R9]**, **[A7]**.

---

### 9.4 Lo que lee Worker

**FR-AD-MON-2.** La lista de la sede es lo que Worker ofrece:

- al añadir una moneda a una caja (**FR-CAJA-13**), resuelta por la sede de la caja;
- en el fondeo inicial, que pide un importe por cada moneda habilitada (**FR-CAJA-8**).

---

### 9.5 Auditoría

**FR-AD-MON-10** **[RP-21]**

| Acción | Evento | Datos |
| --- | --- | --- |
| Añadir | `moneda-sede.alta` | Autor, fecha, sede, moneda |
| Retirar | `moneda-sede.retirada` | Autor, fecha, sede, moneda, cajas de las que se quitó, tasas retiradas con ella |

---

## 10. Tasas

- Una tasa es siempre **una moneda contra el peso cubano**: **compra** (lo que la sede paga al cliente por una unidad) y **venta** (lo que le cobra), las dos en CUP. Entre dos monedas extranjeras no hay tasa.
- La tasa que la sede cotiza y la que exhibe su tablero son el mismo dato **[A12]**, **[RP-25]**.
- PuntoCash fija un **rango** por moneda, uno para la compra y otro para la venta, válido en toda la red **[A5]**.
- Una tasa definida está **en vigor** cuando se cumplen las cuatro condiciones de **FR-AD-TASA-2**. Una que deja de cumplirlas no se borra (10.6).

### 10.1 Tabla de tasas — `/admin/tasas`

**FR-AD-TASA-9 · Contenido.** La pantalla es siempre una tabla y no edita nada.

- Una columna por cada sede que deja ver el selector de alcance (**FR-AD-SCOPE-4**), en orden de nombre.
- Una fila por moneda que aparece en la lista de alguna de esas sedes, salvo el peso cubano, en el orden en que aparecen.
- Un acceso por sede a `/admin/tasas/[sedeId]`, que es donde se editan.
- Con más de una sede a la vista, un aviso de que las tasas se cambian sede por sede. Cambiar la tasa de varias sedes a la vez no es posible.

Contenido de cada celda:

| Situación | Contenido |
| --- | --- |
| Tasa en vigor | «compra / venta», y la marca «Ajustada por PuntoCash» si la tiene (**FR-AD-TASA-12**) |
| La sede no tiene Cambio de moneda | «No cotiza» |
| La moneda no está en la lista de la sede | «No la maneja» |
| El peso cubano no está en la lista de la sede | «Sin peso cubano» |
| PuntoCash no tiene rango para la moneda | «Sin rango de PuntoCash» |
| Se cumplen las condiciones y no hay tasa | «Sin tasa» |

Una tasa definida que no está en vigor muestra el motivo, no sus cifras. Si se dan varios motivos, se muestra el primero de la tabla.

**Tasas ajustadas por PuntoCash.** Si alguna tasa de las sedes a la vista tiene la marca de **FR-AD-TASA-12**, un aviso de advertencia las enumera (moneda y sede), cada una con enlace a `/admin/tasas/[sedeId]`.

**FR-AD-TASA-6 · Alcance de lo que se edita.** Esta pantalla y la de 10.2 indican de forma visible y permanente que la tasa es la que cotiza cada sede y la que muestra su tablero en el kiosco y en la pantalla informativa **[A12]**, **[FR-PANT-DATA-3]**.

Por debajo de 1024px cada moneda es una tarjeta (**FR-AD-SHELL-13**).

**Sin sedes.** Un usuario sin ninguna sede asignada ve un aviso informativo en lugar de la tabla.

**Ver en la demo:**

- `marta@malecon-sf.cu`, **Tasas**: «Sin tasa» (USD en PuntoCash Cerro), «Sin rango de PuntoCash» (CAD en PuntoCash Obispo), «No la maneja» (GBP en PuntoCash Cerro), y el aviso de ajustadas (EUR en PuntoCash Obispo).
- «No cotiza»: `rortega@caribecambios.cu`, Tasas, columna PuntoCash Matanzas.
- «Sin peso cubano»: `abarrios@bahiacambios.cu`, añadir USD a PuntoCash Pinar del Río en Monedas y abrir Tasas.
- Una sola columna: `marta@malecon-sf.cu`, elegir PuntoCash Vedado en el selector de la cabecera y abrir Tasas.
- Sin sedes: `lperez@cienfuegoscambio.cu`, Tasas.

---

### 10.2 Tasas de una sede — `/admin/tasas/[sedeId]`

**FR-AD-TASA-9 · Acceso.**

- Entrar en esta ruta **no cambia** el selector de alcance de la cabecera. Volver a Tasas devuelve la tabla con el mismo filtro.
- Una sede inexistente o fuera del alcance responde `no-encontrada` (**FR-AD-NAV-2**).
- Si la cabecera tiene filtrada **otra** sede, la ruta redirige a `/admin/tasas`.

**Ver en la demo:**

- `marta@malecon-sf.cu`, Tasas, acceso a PuntoCash Obispo.
- Otra sede filtrada: con PuntoCash Vedado elegida en la cabecera, entrar en `/admin/tasas/sede-habana-vieja`.
- Fuera del alcance: `marta@malecon-sf.cu`, entrar en `/admin/tasas/sede-miramar`.

**FR-AD-TASA-1 · Contenido.** Encabeza la pantalla el nombre de la sede, marcada si está suspendida.

Tasas definidas de la sede, en el orden de su lista de monedas:

| Dato | Contenido |
| --- | --- |
| Moneda | Bandera, código y nombre. La marca «Ajustada por PuntoCash» si la tiene (**FR-AD-TASA-12**). Si la tasa no está en vigor, el motivo (10.6), salvo la falta de Cambio de moneda, que ya dice el aviso de sede |
| Compra | Cifra en CUP |
| Venta | Cifra en CUP |
| Rango de PuntoCash | Intervalo de compra e intervalo de venta, o la indicación de que no hay rango (**FR-AD-TASA-7**) |
| Último cambio | Fecha y autor. El autor es «PuntoCash» cuando el cambio lo hizo el sistema (**FR-AD-TASA-12**) |
| Acciones | «Cambiar» («Revisar» si está ajustada por PuntoCash), solo si la tasa está en vigor; «Retirar» |

Debajo, **las monedas de la lista de la sede que no tienen tasa** (sin el peso cubano), cada una con «Fijar tasa» o con el motivo por el que no puede fijarse (**FR-AD-TASA-2**). Y un enlace a `/admin/monedas` para añadir a la lista la moneda que falte.

Por debajo de 1024px cada tasa es una tarjeta (**FR-AD-SHELL-13**).

**FR-AD-TASA-2 / FR-AD-TASA-3 · Condiciones para tener tasa.** Una moneda solo puede tener tasa si se cumplen las cuatro. Donde falta una, la pantalla dice cuál en lugar de limitarse a no ofrecer la acción **[FR-AD-STATE-6]**. El peso cubano nunca tiene tasa propia.

| Condición | Si falta, la pantalla | Código |
| --- | --- | --- |
| (1) PuntoCash ha habilitado el **Cambio de moneda** en la sede **[A3]** | Ver **FR-AD-TASA-4** | `sin-servicio` |
| (2) La moneda está en la **lista de la sede** (§9) | Lo indica y remite a Monedas | `fuera-de-la-lista` |
| (3) El **peso cubano** está en la lista de la sede | Ver **FR-AD-TASA-4** | `sin-moneda-local` |
| (4) PuntoCash tiene un **rango** para la moneda **[A5]**, **[RP-22]** | La moneda aparece igualmente, con el motivo y la indicación de que el rango se solicita a PuntoCash (**FR-AD-TASA-3**) | `sin-rango` |

**FR-AD-TASA-4 · Avisos de sede.**

| Situación | Contenido de la pantalla |
| --- | --- |
| La sede no tiene Cambio de moneda | Un aviso informativo con el motivo. **Ningún control.** Las tasas que conserva de cuando tenía el servicio se listan en solo lectura (**FR-AD-TASA-14**). No se listan las monedas sin tasa ni se muestra el aviso de peso cubano |
| La sede tiene el servicio y le falta el peso cubano en su lista | Un aviso de advertencia de que no puede fijar ninguna tasa, con enlace a `/admin/monedas` |
| La sede está cerrada | Ningún control |

**FR-AD-TASA-17 · Lo que se gobierna aquí.** Esta pantalla gestiona compra y venta. Las comisiones y los cargos por servicio son de PuntoCash **[A8]**.

**Ver en la demo:**

- Tasas en vigor, ajustada y moneda sin rango: `marta@malecon-sf.cu`, Tasas → PuntoCash Obispo.
- Moneda con «Fijar tasa»: `marta@malecon-sf.cu`, Tasas → PuntoCash Cerro (USD).
- Sin Cambio de moneda, con una tasa conservada: `rortega@caribecambios.cu`, Tasas → PuntoCash Matanzas.
- Sin peso cubano: `abarrios@bahiacambios.cu`, Tasas → PuntoCash Pinar del Río.
- Sede suspendida: `abarrios@bahiacambios.cu`, Tasas → PuntoCash Trinidad.
- Sede cerrada: no se puede ver en la demo.

---

### 10.3 Fijar o cambiar una tasa

Se inicia con «Fijar tasa» en una moneda sin tasa o con «Cambiar» en una tasa en vigor. Es un **diálogo en dos pasos** (**FR-AD-TASA-10**).

**FR-AD-TASA-5.** Fijar una tasa es definir **compra y venta en el mismo acto**, las dos dentro del rango. No existe una moneda cotizada con una sola de las dos cifras.

**Paso 1 · Cifras (FR-AD-TASA-7 / FR-AD-TASA-8).**

| Campo | Obligatorio | Reglas |
| --- | --- | --- |
| Compra | Sí | Dentro del rango de compra de PuntoCash, límites incluidos. Admite decimales con coma o con punto. Al cambiar una tasa, viene con la cifra actual |
| Venta | Sí | Dentro del rango de venta de PuntoCash, límites incluidos. Mismas reglas. **No puede ser menor que la compra** |

- Junto a cada campo, en solo lectura, el rango de PuntoCash de ese lado **[A5]**.
- La validación es inmediata, al teclear, y dice el límite concreto que se incumple.
- Con un error, o con las dos cifras iguales a las actuales, el diálogo no pasa al paso 2.

**Paso 2 · Revisión (FR-AD-TASA-10).**

- Muestra la moneda, la sede, y compra y venta **antes y ahora** (sin «antes» si la tasa no existía).
- Advierte de que las operaciones que se coticen desde ese momento usan la tasa nueva y el tablero de la sucursal pasa a mostrarla, y de que ninguna operación ya registrada cambia **[R9]**.
- Solo este paso guarda. Permite volver al paso 1.

**Ver en la demo:**

- Fijar: `marta@malecon-sf.cu`, Tasas → PuntoCash Cerro, «Fijar tasa» en USD.
- Fuera de rango: en ese diálogo, compra 299.
- Compra mayor que venta: compra 330, venta 320.

**FR-AD-TASA-11 · Rechazos del servidor.** Al confirmar, el servidor revalida las condiciones de **FR-AD-TASA-2** y el **rango vigente** **[R3]**. Ante un rechazo, el diálogo conserva las cifras.

| Condición | Código |
| --- | --- |
| La sede no tiene Cambio de moneda | `sin-servicio` |
| La moneda es el peso cubano | `moneda-local` |
| La moneda no está en la lista de la sede | `fuera-de-la-lista` |
| El peso cubano no está en la lista de la sede | `sin-moneda-local` |
| PuntoCash no tiene rango para la moneda | `sin-rango` |
| PuntoCash cambió el rango después de que el diálogo lo mostrara | `rango-cambiado` |
| Compra vacía o fuera del rango | `compra-fuera-de-rango` |
| Venta vacía o fuera del rango | `venta-fuera-de-rango` |
| La compra es mayor que la venta **[A5]**, **[RP-22]** | `compra-mayor-que-venta` |
| La sede está cerrada | `sede-cerrada` |
| La sede no existe o está fuera del alcance | `no-encontrada` |

**Efecto.**

- La tasa guarda compra, venta, fecha y autor.
- Si tenía la marca de ajustada por PuntoCash, la pierde.
- Las operaciones que se coticen desde ese momento usan la tasa nueva, y el tablero de la sede la muestra (10.7). Ninguna operación registrada cambia **[R9]**.

---

### 10.4 Tasa ajustada por PuntoCash

**FR-AD-TASA-12 · Ajuste automático.** Cuando PuntoCash mueve un rango y una tasa queda fuera, el sistema la **lleva al nuevo límite** (**FR-SA-TASA-8**):

- solo cambia el lado o los lados que quedaron fuera;
- guarda la fecha del ajuste y las cifras anteriores;
- el autor del cambio es «PuntoCash»;
- la tasa queda marcada como «Ajustada por PuntoCash».

**Lo que muestra la sede ajustada (`/admin/tasas/[sedeId]`).** Por cada tasa marcada, un aviso de advertencia destacado que dice, lado por lado, la fecha, qué límite movió PuntoCash (bajó el máximo o subió el mínimo) y de qué cifra a qué cifra pasó la tasa. El aviso ofrece dos acciones:

| Acción | Efecto |
| --- | --- |
| «Mantener» (con la cifra ajustada; las dos si se ajustaron los dos lados) | Confirma la tasa **tal como está**, sin cambiar las cifras. Quita la marca. Autor y fecha pasan a ser los de quien confirma |
| «Elegir otra» | Abre el diálogo de 10.3 con las cifras actuales. Al guardar, quita la marca |

La fila lleva la marca y la acción «Revisar» en lugar de «Cambiar», que abre el mismo diálogo.

Mientras no se confirme o se cambie, la tasa aparece también en el panel de atención de Inicio (**FR-AD-HOME-2**) y en el aviso de la tabla de 10.1.

| Condición al pulsar «Mantener» | Código |
| --- | --- |
| La tasa ya no existe | `sin-tasa` |
| La sede está cerrada | `sede-cerrada` |
| La sede no existe o está fuera del alcance | `no-encontrada` |

**Ver en la demo:** `marta@malecon-sf.cu`, Tasas → PuntoCash Obispo, EUR: aviso, «Mantener 365,00» y «Elegir otra».

---

### 10.5 Retirar una tasa

**FR-AD-TASA-13.** Se inicia con «Retirar» en una tasa y se confirma en un diálogo, sin motivo. El diálogo advierte del efecto antes de confirmar.

**Efecto.**

- La sede deja de cotizar esa moneda y la moneda desaparece de su tablero.
- La moneda **sigue en la lista de la sede** (§9): sus cajas pueden seguir manejándola.
- No afecta a ninguna operación registrada **[R9]**.

| Condición | Código |
| --- | --- |
| La moneda ya no tenía tasa | `sin-tasa` |
| La sede está cerrada | `sede-cerrada` |
| La sede no existe o está fuera del alcance | `no-encontrada` |

**Ver en la demo:** `marta@malecon-sf.cu`, Tasas → PuntoCash Vedado, «Retirar» en GBP.

---

### 10.6 Cambios de PuntoCash que afectan a una tasa

**FR-AD-TASA-14 · Cambio de moneda deshabilitado.**

- Las tasas de la sede dejan de cotizarse y de exhibirse de inmediato.
- **No se borran.** Se listan en solo lectura (**FR-AD-TASA-4**) y vuelven a estar en vigor solas si PuntoCash vuelve a habilitar el servicio.

**Ver en la demo:** `rortega@caribecambios.cu`, Tasas → PuntoCash Matanzas (USD).

**FR-AD-TASA-15 · Rango retirado.**

- Las sedes que tenían tasa de esa moneda dejan de cotizarla y la ven con el motivo. Solo se ofrece «Retirar».
- **No se borra.** Si el rango vuelve, la tasa vuelve, revalidada contra el rango nuevo.
- Si el rango nuevo no contiene la tasa, se ajusta a su límite y queda marcada para confirmar, igual que en **FR-AD-TASA-12**.

**Ver en la demo:** `abarrios@bahiacambios.cu`, Tasas → PuntoCash Trinidad, CAD (tasa sin rango de PuntoCash). La vuelta del rango no se puede ver en la demo.

---

### 10.7 Tablero de la sucursal

**FR-AD-TASA-18.** El tablero de una sede lee de aquí **[A12]**, **[FR-AD-DOM-7]**:

- la consulta de tasas del kiosco de autoservicio (`/kiosk/autoservicio/tasas`) y la diapositiva de tasas de la pantalla informativa (`/kiosk/pantalla`) muestran **solo las tasas en vigor de su sede**;
- una sede sin ninguna tasa en vigor, o cerrada, no muestra un tablero vacío: el kiosco indica que la sucursal no publica tasas en ese momento y la pantalla informativa saca esa diapositiva de su rotación;
- las cifras se muestran **sin decimales cuando no los tienen** («318») y con dos cuando los tienen («318,50»). Una cifra con decimales no se redondea.

**Ver en la demo:**

- Pantalla informativa: abrir `/kiosk/pantalla` y elegir PuntoCash Vedado. Sin diapositiva de tasas: elegir PuntoCash Cerro o PuntoCash Matanzas.
- Kiosco: abrir `/kiosk/autoservicio`, vincularlo con `marta@malecon-sf.cu` en **Equipos → Vincular** con el código que muestra (§3.4), elegir PuntoCash Vedado y entrar en la consulta de tasas.

---

### 10.8 Auditoría

**FR-AD-TASA-16** **[RP-21]**

| Acción | Evento | Datos |
| --- | --- | --- |
| Fijar | `par.definido` | Autor, fecha, sede, moneda, cifras nuevas |
| Cambiar | `par.cambiado` | Autor, fecha, sede, moneda, cifras antes y después |
| Mantener una tasa ajustada | `par.cambiado` | Autor, fecha, sede, moneda, cifras (iguales antes y después), indicación de que se confirmó el ajuste de PuntoCash |
| Retirar | `par.retirado` | Autor, fecha, sede, moneda, cifras antes, sin tasa después |

Retirar una tasa al retirar su moneda queda en el evento de la moneda (9.5).

---

## 11. Promociones

- Lo que cada sucursal anuncia en su pantalla informativa, aparte de sus tasas y sus datos de contacto **[A12]**.
- Dos orígenes: las de la **empresa**, que publica su administrador para sus sedes, y las de **red**, que publica PuntoCash para toda la red o para algunas sedes.
- El estado de una promoción se calcula con la fecha de hoy en la hora de Cuba: **programada** (antes de su inicio), **vigente** (entre inicio y fin, los dos incluidos) o **vencida** (después de su fin, o retirada). Nadie lo cambia.

### 11.1 Listado de promociones — `/admin/promociones`

**FR-AD-PROM-1 · Contenido.**

- Lista las promociones que se exhiben en alguna de las sedes que deja ver el selector de alcance (**FR-AD-SCOPE-4**): las de la empresa y las de red.
- Ofrece «Nueva promoción» en la cabecera.

| Dato | Contenido |
| --- | --- |
| Promoción | Título, con enlace a `/admin/promociones/[id]` |
| Sedes | Las sedes del alcance donde se muestra. «Todas tus sedes» si son todas y el usuario tiene más de una |
| Fechas | Desde y hasta. Un solo día si coinciden |
| Publica | «Tu empresa» o «PuntoCash». Si se retiró, también la fecha de retirada |

Por debajo de 1024px cada promoción es una tarjeta (**FR-AD-SHELL-13**).

**FR-AD-PROM-2 · Pestañas.**

| Pestaña | Contenido | Orden |
| --- | --- | --- |
| Vigentes (por defecto) | Las vigentes hoy | Por fecha de inicio |
| Programadas | Las que empiezan después de hoy | Por fecha de inicio |
| Vencidas | Las terminadas y las retiradas | De la que terminó más tarde a la que terminó antes. Una retirada terminó el día en que se retiró |

- Cada pestaña muestra su número de promociones.
- La pestaña elegida vive en la dirección (`?pestana=programadas`, `?pestana=vencidas`).
- Cada pestaña vacía tiene su propio mensaje.

**FR-AD-PROM-8 · Aviso de saturación.** Si alguna sede a la vista tiene hoy **más de cuatro** promociones vigentes, un aviso de advertencia nombra cada una de esas sedes con su número.

**FR-AD-PROM-3 · Promociones de red.** Aparecen en la lista como las demás. Una promoción de otra empresa no aparece.

**Ver en la demo:**

- `marta@malecon-sf.cu`, **Promociones**: en Vigentes, una de red con «Todas tus sedes» y una de la empresa en dos sedes; en Programadas, una de un solo día; en Vencidas, una terminada.
- Lista filtrada: elegir PuntoCash Vedado en el selector de la cabecera.
- Aviso de saturación: con `marta@malecon-sf.cu`, crear tres promociones vigentes desde hoy en PuntoCash Vedado.
- Pestaña vacía: elegir PuntoCash Cerro en la cabecera y abrir Vencidas.

---

### 11.2 Nueva promoción — `/admin/promociones/nueva`

**FR-AD-PROM-4 / FR-AD-PROM-5 / FR-AD-PROM-7 / FR-AD-PROM-12 · Campos.**

| Campo | Obligatorio | Reglas |
| --- | --- | --- |
| Título | Sí | Máximo **40** caracteres. El formulario no deja escribir más y muestra el contador. Se guarda sin espacios al principio y al final |
| Texto | Sí | Máximo **120** caracteres, con las mismas reglas |
| Imagen | No | Una. JPG, PNG o WebP. Al elegirla se reduce en el dispositivo a un máximo de **1920 píxeles** por su lado mayor. Si sigue pesando más de **2 MB**, se rechaza. Acciones: «Añadir imagen»; con imagen, su miniatura, «Cambiar imagen» y «Quitar imagen». El título y el texto siguen siendo obligatorios con imagen |
| Sedes | Sí, al menos una | Casillas con las sedes del alcance completo que no están cerradas, y «Marcar todas» si hay más de una. Viene marcada la sede filtrada en la cabecera, o la única si no hay más |
| Desde | Sí | Por día, en la hora de Cuba. Viene con la fecha de hoy. No puede ser anterior a hoy. Una fecha futura hace nacer la promoción **programada** |
| Hasta | Sí | Por día, incluido. Puede ser igual a Desde (promoción de un solo día). No puede ser anterior a Desde ni a hoy. Para terminar antes una promoción, se retira (**FR-AD-PROM-9**) |

**FR-AD-PROM-7 · Vista previa.** El formulario muestra la diapositiva tal como se verá en la pantalla informativa, con su imagen, y cambia mientras se escribe.

**FR-AD-PROM-8 · Coincidencias.** Con fechas puestas, el formulario dice para cada sede marcada **con cuántas promociones coincidiría a la vez**:

- Cuenta las promociones de la empresa y las de red que se muestran en esa sede y no han vencido (sin la propia, al editar).
- «A la vez» es el **mayor número que estarían en pantalla juntas en un mismo día** del periodo, no cuántas tocan el periodo en algún momento.
- Si en alguna sede pasarían de **cuatro** a la vez (contando la propia), muestra en su lugar un aviso de advertencia con esas sedes y su número. Es un aviso: no impide guardar.

**Ver en la demo** (`marta@malecon-sf.cu`, Promociones → Nueva promoción, sede PuntoCash Vedado):

- Formulario, contador y vista previa: escribir título y texto.
- Imagen: «Añadir imagen».
- «A la vez»: desde hoy hasta dentro de 80 días. Toca cuatro promociones en el periodo, pero coincidiría con 3 a la vez.
- Aviso de más de cuatro: publicar una promoción en PuntoCash Vedado para dentro de 5 días (solo ese día) y abrir otra Nueva promoción con las mismas fechas y sede.
- Sede premarcada: elegir PuntoCash Vedado en la cabecera antes de entrar. Única sede: `ibetancourt@centrodivisas.cu`.

**FR-AD-PROM-5 · Rechazos del servidor.** Ante un rechazo, el formulario conserva todo lo escrito, imagen incluida.

| Condición | Código |
| --- | --- |
| Título vacío | `titulo-vacio` |
| Título de más de 40 caracteres | `titulo-largo` |
| Texto vacío | `texto-vacio` |
| Texto de más de 120 caracteres | `texto-largo` |
| Ninguna sede | `sin-sedes` |
| Alguna sede no existe o está fuera del alcance | `no-encontrada` |
| Alguna sede está cerrada | `sede-cerrada` |
| Falta alguna fecha o no es válida | `fecha-invalida` |
| Inicio anterior a hoy (salvo, al editar, el inicio que ya tenía) | `inicio-pasado` |
| Fin anterior al inicio | `fin-antes-de-inicio` |
| Fin anterior a hoy | `fin-pasado` |
| Imagen que no es JPG, PNG ni WebP | `imagen-invalida` |
| Imagen de más de 2 MB | `imagen-pesada` |

**Ver en la demo:** `marta@malecon-sf.cu`, Nueva promoción, escribir título, texto y fecha de fin sin marcar ninguna sede, y pulsar «Publicar promoción».

**FR-AD-PROM-4 · Al guardar.**

- La promoción se crea de la empresa, con las sedes, las fechas, la imagen si la tiene, la fecha de alta y el nombre de quien la creó.
- La pantalla vuelve a `/admin/promociones` con un aviso de éxito que dice cuándo se verá: ya, si es vigente; o la fecha de inicio, si es programada.

**Ver en la demo:** publicar cualquier promoción con `marta@malecon-sf.cu`, una desde hoy y otra desde mañana.

---

### 11.3 Una promoción — `/admin/promociones/[id]`

**FR-AD-PROM-3 / FR-AD-PROM-4 · Contenido según la promoción.**

| Promoción | Pantalla |
| --- | --- |
| De la empresa, programada o vigente | **Edición**: el formulario de 11.2 con los datos puestos (sedes: las del alcance donde se muestra), «Guardar cambios» y, en la cabecera, «Retirar». Si es vigente, **Desde no se puede cambiar** |
| De la empresa, vencida o retirada | **Lectura**: texto, sedes, fechas, quién la publicó y la vista previa, sin controles. Un aviso indica que terminó, o quién la retiró y cuándo, y que para volver a anunciarla hay que crear una nueva |
| De red | **Lectura** igual, sin controles. Un aviso indica que la publica PuntoCash y que no se puede cambiar ni retirar |
| De otra empresa, o inexistente | `no-encontrada` (**FR-AD-NAV-3**) |

**Rechazos del servidor al editar.** Los de 11.2, y además:

| Condición | Código |
| --- | --- |
| La promoción es vigente y Desde cambió | `inicio-fijo` |
| La promoción ya venció o se retiró | `vencida` |
| La promoción es de red | `de-red` |
| La promoción no existe o es de otra empresa | `no-encontrada` |

**Al guardar.** Se guardan los cambios con la fecha y el nombre de quien editó. Quitar o cambiar la imagen de una vigente se ve en sus pantallas como cualquier otro cambio (**FR-AD-PROM-12**). La pantalla vuelve a `/admin/promociones` con el mismo aviso de éxito que al crear.

**Ver en la demo** (`marta@malecon-sf.cu`, Promociones):

- Edición de una vigente, con Desde fijo: «Cobra tu remesa sin filas».
- Edición de una programada: «Este sábado abrimos hasta las 8».
- Lectura de una de red, con imagen: «Envía un giro a cualquier provincia».
- Lectura de una terminada: pestaña Vencidas, «Remesas de verano».
- Lectura de una retirada: retirar una como en 11.4 y abrirla.
- De otra empresa: `rortega@caribecambios.cu`, entrar en `/admin/promociones/promo-malecon-remesas`.

---

### 11.4 Retirar una promoción

**FR-AD-PROM-9.** Se inicia con «Retirar» en la edición de una promoción de la empresa, programada o vigente, y se confirma en un diálogo, sin motivo.

- Para una vigente, el diálogo dice en qué sedes deja de verse al instante. Para una programada, que no llegará a verse.
- En los dos casos, que pasa a Vencidas con la fecha de retirada.

Una promoción vencida o retirada no se retira ni se edita.

**Efecto.**

- Guarda la fecha y el autor de la retirada. **No se borra**: pasa a Vencidas y queda en el histórico.
- Deja de mostrarse de inmediato en las pantallas de sus sedes.
- La pantalla vuelve a `/admin/promociones?pestana=vencidas` con un aviso de éxito.

| Condición | Código |
| --- | --- |
| La promoción ya venció o se retiró | `vencida-al-retirar` |
| La promoción es de red | `de-red` |
| La promoción no existe o es de otra empresa | `no-encontrada` |

**Ver en la demo:**

- Vigente: `marta@malecon-sf.cu`, Promociones, abrir «Cobra tu remesa sin filas» y pulsar «Retirar».
- Programada: lo mismo con «Este sábado abrimos hasta las 8».

---

### 11.5 Pantalla informativa

**FR-AD-PROM-6 / FR-AD-PROM-12 · Lo que se exhibe.**

- **Solo las promociones vigentes hoy** **[FR-PANT-DATA-5]**. Una vencida deja de mostrarse sola.
- Una promoción de una empresa se exhibe en una sede **solo mientras esa empresa la administra**. Si PuntoCash reasigna la sede, las del administrador anterior dejan de anunciarse en ella.
- **Cada promoción es su propia diapositiva** del carrusel, con el título y el texto grandes y su imagen si la tiene, ordenadas por fecha de inicio.
- La imagen se muestra **entera, sin recortar**: a la izquierda del título y el texto en una pantalla horizontal, encima en una vertical.
- Una sede sin ninguna promoción vigente no tiene diapositiva de promociones.

**FR-AD-PROM-11 · Solo exhibición.** Nada de lo publicado aquí alimenta ni modifica una operación **[R10]**, **[FR-PANT-DATA-2]**. Ninguna promoción define una tasa, un descuento aplicable ni una condición comercial que lea un flujo de Worker.

**Ver en la demo:** abrir `/kiosk/pantalla` y elegir PuntoCash Vedado: la promoción de red con imagen y la de la empresa. Una sede sin promociones vigentes y la reasignación de una sede no se pueden ver en la demo.

---

### 11.6 Auditoría

**FR-AD-PROM-10** **[RP-21]**

| Acción | Evento | Datos |
| --- | --- | --- |
| Publicar | `promocion-sede.alta` | Autor, fecha, título, texto, sedes, fechas, si tiene imagen |
| Editar | `promocion-sede.editada` | Autor, fecha, antes y después de título, texto, sedes y fechas, y si tenía imagen antes y después (**FR-AD-PROM-12**) |
| Retirar | `promocion-sede.retirada` | Autor, fecha, título, si estaba en pantalla o aún no había empezado |

---

## 12. Jornadas

Una jornada es el día de trabajo de una caja: la abre un trabajador con su fondeo inicial, registra movimientos y hace su cierre contando el efectivo. Las abre y las cierra Worker. Esta consola las consulta y, como única intervención, puede forzar el cierre de una abierta **[A6]**.

### 12.1 Listado de jornadas — `/admin/jornadas`

**FR-AD-JOR-1 · Contenido.**

- Muestra las jornadas de las cajas de las sedes que deja ver el selector de alcance (**FR-AD-SCOPE-4**).
- Orden: primero las abiertas; después las demás, de la más reciente a la más antigua.

Datos de cada jornada:

| Dato | Contenido |
| --- | --- |
| Caja | Identificador de la caja. Con el nombre de la sede si hay más de una sede a la vista |
| Trabajador | Nombre. Enlaza a `/admin/trabajadores/{id}` si el trabajador está en el alcance del usuario |
| Fecha | Día de apertura |
| Apertura y cierre | Hora de apertura y hora de cierre. Si el cierre fue otro día, también su fecha. Si sigue abierta, sin cierre |
| Estado | «Abierta», «Cerrada» o «Cierre forzado» |
| Operaciones | Número de operaciones completadas con cliente. No cuenta movimientos |
| Al abrir | «Coincide»; o, por cada moneda que no coincidió con el cierre anterior, la diferencia nombrada por su motivo (**FR-AD-JOR-19**); o «—» si no hay cierre anterior |
| Cierre | «Cuadrada»; o la diferencia de cada moneda que no cuadró (**FR-AD-JOR-3**); o, en un cierre forzado, «Sin contar» con «Pendiente de conciliar» o «Contada al abrir la siguiente» debajo (**FR-AD-JOR-20**); o «—» si sigue abierta |

- Se entra a una jornada pulsando su fila o su tarjeta en cualquier parte. La fila se resalta al pasar el puntero y termina en «›», que es el enlace real a `/admin/jornadas/{id}` (teclado y abrir en otra pestaña). La tarjeta lleva el mismo «›» junto al estado.
- Dentro de la fila, el único enlace propio es el del trabajador. La caja y la fecha no enlazan.
- Por debajo de 1024px cada jornada es una tarjeta, con el estado como marca (**FR-AD-SHELL-13**).

**Ver en la demo:** `marta@malecon-sf.cu`, **Jornadas**. Para ver las tarjetas, estrechar la ventana por debajo de 1024px.

**FR-AD-JOR-3 · Diferencia de cierre.** Mismo tratamiento que en Worker: palabra, signo y color. Siempre por moneda, nunca sumada entre monedas.

| Caso | Formato | Color |
| --- | --- | --- |
| Falta efectivo | «Faltante −300,00 CUP» | Rojo |
| Sobra efectivo | «Sobrante +200,00 CUP» | Verde |
| Sin diferencia | «Cuadrada» | Neutro |

**FR-AD-JOR-2 · Filtros.**

| Filtro | Valores | Por defecto |
| --- | --- | --- |
| Desde / Hasta | Fechas, sobre el día de apertura | Los últimos siete días, hoy incluido |
| Caja | Todas, o una caja | Todas |
| Trabajador | Todos, o un trabajador | Todos |
| Estado | Todas, «Abiertas», «Cerradas», «Cierres forzados» | Todas |
| Solo con diferencia | Casilla. Deja las jornadas con alguna diferencia de apertura o de cierre | Sin marcar |

- El filtro de sede es el selector de alcance de la cabecera.
- Una jornada abierta se lista aunque empezara antes de «Desde»: el rango de fechas no se aplica a las abiertas.
- Por debajo de 640px los filtros quedan tras un botón «Filtros», que indica cuántos hay activos (**FR-AD-SHELL-15**).
- Dos vacíos distintos (**FR-AD-STATE-1**): las cajas del alcance no tienen ninguna jornada; o ninguna jornada coincide con los filtros, con «Quitar los filtros».

**Ver en la demo:**

- Filtros: `marta@malecon-sf.cu`, Jornadas, Estado «Cierres forzados».
- Sin ninguna jornada: `ibetancourt@centrodivisas.cu`, Jornadas.
- Ninguna coincide: `marta@malecon-sf.cu`, Jornadas, Estado «Cierres forzados» y Caja «Caja 02 · PuntoCash Vedado».

**Señales encima del listado.** Cada una es un aviso de advertencia con una entrada por jornada (caja y sede) y enlace a `/admin/jornadas/{id}`:

| Requisito | Situación | Contenido del aviso | Ver en la demo (Jornadas; `marta@malecon-sf.cu`) |
| --- | --- | --- | --- |
| **FR-AD-JOR-16** | Jornada abierta desde un día anterior | Caja, sede, trabajador y fecha de apertura de cada una, e indicación de que se puede forzar el cierre desde la jornada | Caja 01 de PuntoCash Obispo |
| **FR-AD-JOR-20** | Cierre forzado pendiente de conciliar | Caja y sede de cada una, e indicación de que el primer conteo será el de la próxima apertura | Forzar el cierre de la Caja 01 de PuntoCash Obispo (12.5) y volver a Jornadas |

---

### 12.2 Detalle de una jornada — `/admin/jornadas/[id]`

**FR-AD-JOR-4 · Contenido.**

| Bloque | Contenido |
| --- | --- |
| Cabecera | Nombre de la jornada, sede, fecha y hora de apertura. «Forzar cierre» si está abierta (**FR-AD-JOR-7**). Enlace a `/admin/jornadas` |
| La jornada | Estado; trabajador, con enlace a su ficha si está en el alcance; equipo en el que se operó (rótulo e identificador, o «—»); apertura (fecha y hora); cierre (hora, o fecha y hora si fue otro día; si sigue abierta, la indicación de que está abierta) |
| Apertura | La apertura comparada con el cierre anterior (**FR-AD-JOR-19**) |
| Saldos | Por moneda: fondeo inicial y saldo actual si está abierta, o saldo final si está cerrada |
| Cierre | Solo si la cerró el trabajador. Por moneda: esperado, contado, diferencia (**FR-AD-JOR-3**), motivo declarado por el trabajador y estado de su aprobación (**FR-AD-APR-15**) |
| Cierre forzado | Solo en un cierre forzado (**FR-AD-JOR-14**) |
| Movimientos | El libro de movimientos (**FR-AD-JOR-5**) |

**Nombre de la jornada.** Caja, trabajador y día de apertura, con este formato: «Caja 01 · Lidia Gómez · 20 oct 2026». Es el nombre de la jornada en toda la consola.

**FR-AD-JOR-16 · Abierta desde un día anterior.** Un aviso de advertencia con la fecha desde la que sigue abierta.

**Ver en la demo:** `marta@malecon-sf.cu`, Jornadas, Caja 01 de PuntoCash Obispo (la abierta desde ayer).

**FR-AD-JOR-6 · Cifras guardadas.** Toda cifra de una jornada cerrada es la que se guardó al cerrarla y no se recalcula contra el estado vivo **[R9]**. Solo una abierta calcula su saldo actual, a partir de su fondeo y sus movimientos.

**FR-AD-JOR-5 · Libro de movimientos.** Solo lectura, con las columnas del libro de Worker:

| Columna | Contenido |
| --- | --- |
| Hora | Hora del movimiento |
| Concepto | Concepto. Enlaza al detalle del movimiento (**FR-AD-JOR-17**) |
| Operación | Código de la operación, con enlace a ella (**FR-AD-OPS-9**); «—» si es un movimiento interno de caja |
| Tipo | «Entrada» o «Salida» |
| Importe | Con signo y moneda |
| Saldo después | Saldo de esa moneda tras el movimiento |

- Filtros: **tipo** (todos, entradas, salidas) y **moneda** (todas, o una de las del libro).
- Por debajo de 1024px, una tarjeta por movimiento.

**Ver en la demo:** `marta@malecon-sf.cu`, Jornadas, cualquier jornada, sección de movimientos.

**Rechazos.**

| Condición | Código |
| --- | --- |
| La jornada no existe o está fuera del alcance | `no-encontrada` (se responde igual que una inexistente, **FR-AD-NAV-3**) |

---

### 12.3 Continuidad entre jornadas

**FR-AD-JOR-18 · Lo que se guarda al abrir.** Toda jornada guarda su **apertura** al abrirse. La registra Worker (§18). Se guarda al abrir y no se recalcula **[R9]**.

| Dato | Contenido |
| --- | --- |
| Jornada anterior | La jornada anterior de esa caja, o ninguna si es la primera |
| Por moneda: dejado | Saldo final de la jornada anterior |
| Por moneda: contado | Lo que cuenta quien abre. Es el fondeo inicial de la jornada |
| Por moneda: diferencia | Contado − dejado |
| Por moneda: motivo | Obligatorio si la diferencia no es cero: «Reposición de fondos», «Retiro de fondos», «Faltante detectado», «Sobrante detectado» u «Otro» |
| Por moneda: observaciones | Texto del trabajador |

**FR-AD-JOR-19 · Sección «Apertura» del detalle.**

- Indica con qué cierre se compara: el de la jornada anterior de la caja, con su trabajador, fecha y hora de cierre, y enlace a `/admin/jornadas/{id}` de esa jornada.
- Por moneda: lo dejado, lo contado, y «Coincide» o la diferencia con sus observaciones. Debajo, el estado de su aprobación (**FR-AD-APR-15**).
- Si la jornada anterior tuvo un cierre forzado, lo indica: lo dejado es el saldo en libros, y esta apertura es el primer conteo de la caja desde entonces.
- Si no hay jornada anterior, indica que es la primera jornada registrada de la caja y muestra solo lo contado.

La diferencia se nombra por su motivo:

| Motivo | Se muestra | Color |
| --- | --- | --- |
| Reposición de fondos | «Reposición +40.000,00 CUP» | Sin color |
| Retiro de fondos | «Retiro −500,00 USD» | Sin color |
| Faltante detectado / Sobrante detectado | «Faltante …» / «Sobrante …», como en el cierre (**FR-AD-JOR-3**) | Rojo / verde |
| Otro | «Diferencia» con el importe con signo | El de su signo |

**Ver en la demo** (`marta@malecon-sf.cu`, Jornadas):

- Comparada tras un cierre forzado, con faltante: jornada de la Caja 03 de PuntoCash Obispo de hace tres días.
- Reposición o retiro: marcar «Solo con diferencia» y abrir una con «Reposición» o «Retiro» en la columna Al abrir.
- Primera jornada de la caja: llevar «Desde» a hace siete días y abrir una jornada de ese día.

**FR-AD-JOR-20 · Conciliación de un cierre forzado.**

- Una jornada con cierre forzado queda **pendiente de conciliar** hasta que la caja abre la jornada siguiente. Esa apertura es su conteo.
- Su detalle, en el bloque del cierre forzado:
  - Pendiente: «Pendiente de conciliar», e indicación de que el primer conteo será el de la próxima apertura.
  - Contada: la jornada siguiente (trabajador, fecha y hora de apertura, con enlace) y lo que se encontró: que coincidió con el saldo en libros o, por cada moneda que no coincidió, su motivo en minúscula y la cantidad sin signo («faltante detectado de 2.000,00 CUP», separadas por comas). El motivo «Otro» se nombra «diferencia».
- En el listado: «Sin contar» con «Pendiente de conciliar» o «Contada al abrir la siguiente» en la columna Cierre (**FR-AD-JOR-1**), y aviso encima de las pendientes (12.1).

**Ver en la demo** (`marta@malecon-sf.cu`, Jornadas):

- Contada: jornada de la Caja 03 de PuntoCash Obispo de hace cuatro días.
- Pendiente: forzar el cierre de la Caja 01 de PuntoCash Obispo (12.5).

---

### 12.4 Detalle de un movimiento — `/admin/jornadas/[id]/movimientos/[movimientoId]`

**FR-AD-JOR-17 · Contenido.** Solo lectura. En la cabecera, el concepto, el nombre de la jornada y «Volver a la jornada».

| Dato | Contenido |
| --- | --- |
| Fecha y hora | Del movimiento |
| Tipo | «Entrada» o «Salida» |
| Importe | Con signo y moneda |
| Saldo antes | Solo en un ajuste |
| Saldo después | Saldo de esa moneda tras el movimiento |
| Operación | Código de la operación de la que sale, con enlace (**FR-AD-OPS-9**), o «Movimiento interno de caja» |
| Motivo y observaciones | Solo en un ajuste, tal como los declaró el trabajador |
| Aprobación | Si el movimiento registró una diferencia: estado de su solicitud, con enlace (**FR-AD-APR-15**) |

**Ver en la demo:** `marta@malecon-sf.cu`, Jornadas, una jornada de hace cinco días, movimiento «Ajuste de efectivo».

| Condición | Código |
| --- | --- |
| La jornada o el movimiento no existen o están fuera del alcance | `no-encontrada` |

---

### 12.5 Forzar cierre

**FR-AD-JOR-7.** «Forzar cierre» aparece en la cabecera del detalle de una jornada **abierta**, y solo ahí. Se confirma en un diálogo.

**FR-AD-JOR-8 / FR-AD-JOR-10 / FR-AD-JOR-13 · Diálogo.** Antes de pedir el motivo, informa de:

| Información | Cuándo |
| --- | --- |
| Que el trabajador está operando ahora en esa caja y no podrá registrar más operaciones en ella. Va antes que todo lo demás | Si el trabajador tiene en ese momento la caja abierta en su equipo |
| Que la caja queda cerrada, que el trabajador no podrá operar en ella hasta abrir una jornada nueva, y que el cierre queda marcado como forzado a nombre de quien lo hace | Siempre |
| Que la jornada se cierra sin contar el efectivo y que el primer conteo será el de quien abra la próxima jornada en esa caja | Siempre |
| Que el equipo, por su rótulo, sigue vinculado a la caja | Si la caja tiene equipo |

- Que el trabajador esté operando **no bloquea** la acción.
- El botón de confirmar es «Cerrar sin contar».

**FR-AD-JOR-9 · Campos.**

| Campo | Obligatorio | Reglas |
| --- | --- | --- |
| Motivo | Sí | Texto libre, al menos 10 caracteres sin contar los espacios al principio y al final. Sin valores predefinidos ni lista de opciones **[A6]**. Hasta cumplirlo, el botón de confirmar no se habilita |

**Ver en la demo** (`marta@malecon-sf.cu`, Jornadas, «Forzar cierre»):

- Sin sesión del trabajador, con equipo: Caja 01 de PuntoCash Obispo.
- Con el trabajador operando: jornada de hoy de la Caja 01 de PuntoCash Vedado.

**FR-AD-JOR-11 · Rechazos del servidor.** Al confirmar, el servidor revalida que la jornada sigue abierta **[R3]**, **[R6]**.

| Condición | Código |
| --- | --- |
| Motivo vacío o de menos de 10 caracteres | `motivo-corto` |
| La jornada ya no está abierta (el trabajador hizo su cierre entretanto). La pantalla se actualiza y muestra la jornada como quedó | `ya-cerrada` |
| La jornada no existe o está fuera del alcance | `no-encontrada` |

**FR-AD-JOR-10 / FR-AD-JOR-12 / FR-AD-JOR-13 · Efecto.**

- La jornada pasa a «Cierre forzado» sin conteo físico.
- Saldo final de cada moneda: el saldo en libros en ese momento.
- Se **añade** el hecho del cierre: tipo de cierre (forzado), administrador, momento y motivo.
- No se modifica, recalcula ni elimina ningún movimiento ni operación anteriores **[A7]**, **[R9]**.
- El equipo sigue vinculado a la caja **[A11]**.
- La jornada queda pendiente de conciliar (**FR-AD-JOR-20**).

**FR-AD-JOR-14 · Después.**

- La pantalla vuelve al detalle con un aviso de éxito: la caja está cerrada y el trabajador tendrá que abrir una jornada nueva para volver a operar en ella.
- En el listado y en el detalle la jornada aparece como «Cierre forzado», distinta de una cerrada por el trabajador.
- El detalle muestra quién la cerró, cuándo, su motivo y su conciliación (**FR-AD-JOR-20**).

**Ver en la demo:** `marta@malecon-sf.cu`, forzar el cierre de la Caja 01 de PuntoCash Obispo. Un cierre forzado anterior: Caja 03 de PuntoCash Obispo, hace cuatro días.

---

### 12.6 Auditoría

**FR-AD-JOR-15** **[RP-21]**

| Acción | Evento | Datos |
| --- | --- | --- |
| Forzar cierre | `jornada.cierre-forzado` | Autor, fecha, sede, jornada (por su nombre), motivo |

---

## 13. Operaciones

Las operaciones de las cajas con sus clientes: cambios de moneda, pagos de remesas, giros enviados y pagados. **Solo lectura** **[A6]**, **[A7]**.

### 13.1 Listado de operaciones — `/admin/operaciones`

**FR-AD-OPS-1 · Contenido.**

- Muestra todas las operaciones de las cajas de las sedes que deja ver el selector de alcance (**FR-AD-SCOPE-4**), en cualquier estado: completadas, en proceso, rechazadas, fallidas y canceladas. Una rechazada o fallida se lista igual que una completada.
- Orden: de la más reciente a la más antigua.
- Se muestran de 50 en 50, con el recuento («50 de 312 operaciones») y «Mostrar 50 más».

Datos de cada operación:

| Dato | Contenido |
| --- | --- |
| Operación | Código; debajo, fecha y hora |
| Servicio | Servicio. En un giro, si se envió o se pagó. «Desde el kiosco» si nació de una solicitud de kiosco |
| Cliente | Nombre |
| Importe | En un cambio, lo que el cliente entrega y lo que recibe: «200,00 GBP → 79.000,00 CUP». En los demás servicios, el importe. En una que no se completó, lo que se llegó a registrar, que puede ser solo lo que el cliente entregaba |
| Caja y trabajador | La caja, con su sede si hay más de una a la vista. El trabajador, con enlace a su ficha si está en el alcance |
| Estado | Traducido (**FR-AD-OPS-7**) |

- Se entra a una operación pulsando su fila o su tarjeta en cualquier parte, como en Jornadas (**FR-AD-JOR-1**).
- Por debajo de 1024px, una tarjeta por operación (**FR-AD-SHELL-13**).

**Ver en la demo:** `marta@malecon-sf.cu`, **Operaciones**. Las que nacieron de un kiosco aparecen en PuntoCash Vedado y PuntoCash Obispo.

**FR-AD-OPS-2 · Filtros.**

| Filtro | Valores | Por defecto |
| --- | --- | --- |
| Búsqueda | Texto. Busca en código, nombre del cliente y número de documento, por coincidencia parcial, sin distinguir mayúsculas ni tildes | Vacía |
| Desde / Hasta | Fechas, sobre el día de la operación | Los últimos siete días, hoy incluido |
| Caja | Todas, o una caja | Todas |
| Trabajador | Todos, o un trabajador | Todos |
| Servicio | Todos, o un servicio | Todos |
| Estado | Todos, o un estado | Todos |

- Son los filtros del historial de Worker más caja y trabajador **[R12]**. El filtro de sede es el selector de alcance de la cabecera.
- **Mientras la búsqueda tiene texto**, busca en todas las fechas y los demás filtros no se aplican. La pantalla lo indica.
- Por debajo de 640px los filtros quedan tras «Filtros» (**FR-AD-SHELL-15**).
- Dos vacíos distintos (**FR-AD-STATE-1**): las cajas del alcance no tienen ninguna operación; o ninguna coincide con los filtros, con «Quitar los filtros».

**Ver en la demo:**

- Búsqueda fuera del rango: `marta@malecon-sf.cu`, Operaciones, copiar el código de una operación de hace cinco días, llevar «Desde» a hoy y buscar ese código.
- Sin ninguna operación: `ibetancourt@centrodivisas.cu`, Operaciones.

---

### 13.2 Detalle de una operación — `/admin/operaciones/[codigo]`

**FR-AD-OPS-3 · Contenido.** Las mismas piezas que el detalle de Worker, en solo lectura.

| Bloque | Contenido |
| --- | --- |
| Cabecera | Código, servicio (en un giro, si se envió o se pagó), fecha y hora, estado. Enlace a `/admin/operaciones` |
| Cambio de moneda | Cliente; lo que entrega y lo que recibe, con la tasa aplicada; estado de la operación; estado de caja |
| Remesa | Beneficiario, la operación, la remesa y el movimiento de efectivo |
| Giro | Remitente o beneficiario, según se haya enviado o pagado; la operación, el giro y el movimiento de efectivo |

**FR-AD-OPS-4 · Contexto de la operación.** Bloque encima del detalle **[FR-AS-DOM-11]**:

| Dato | Contenido |
| --- | --- |
| Sede | Nombre |
| Caja | Identificador y el equipo en que se operó |
| Trabajador | Nombre, con enlace a su ficha si está en el alcance |
| Jornada | Nombre de la jornada (12.2), con enlace y su estado |
| Origen | «En el mostrador», o la solicitud de kiosco que la originó: «Solicitud KS-…», con el rótulo y el identificador del kiosco |

**FR-AD-OPS-5 · Sin acciones.** El detalle no ofrece ninguna acción sobre la operación: ni reimprimir el comprobante, ni anular, ni corregir, ni reenviar al proveedor **[A6]**, **[A7]**.

**FR-AD-OPS-6 · Datos guardados.** Toda cifra y todo dato salen de la instantánea guardada al completarse la operación: el cliente como era entonces, la tasa aplicada, el saldo de la caja antes y después **[R9]**, **[R2]**.

**FR-AD-OPS-7 · Estados.** Siempre traducidos, con el mismo tratamiento que en Worker, nunca como valor en bruto **[R10]**: «Completada», «En proceso», «Rechazada», «Fallida», «Cancelada».

**Ver en la demo:** `marta@malecon-sf.cu`, Operaciones:

- Un cambio, una remesa y un giro: abrir una de cada servicio.
- Desde un kiosco: abrir una marcada «Desde el kiosco».
- No completada: filtrar Estado «Rechazada», «Fallida» o «Cancelada».

**FR-AD-OPS-8 · Rechazos.**

| Condición | Código |
| --- | --- |
| La operación no existe o está fuera del alcance | `no-encontrada` (**FR-AD-NAV-3**) |

---

### 13.3 Enlace desde Jornadas

**FR-AD-OPS-9.**

- En el libro de movimientos de una jornada y en el detalle de un movimiento, el código de la operación enlaza a `/admin/operaciones/{codigo}` (**FR-AD-JOR-5**, **FR-AD-JOR-17**).
- Solo las operaciones completadas mueven efectivo y tienen movimientos en el libro.

**Ver en la demo:** `marta@malecon-sf.cu`, Jornadas, cualquier jornada, columna Operación de sus movimientos.

---

## 14. Aprobaciones

Toda diferencia de efectivo que registra un trabajador queda pendiente del visto bueno de la administración. Resolverla deja constancia de la decisión y no cambia nada de lo que el trabajador registró **[A6]**, **[A7]**.

### 14.1 Solicitudes de aprobación

**FR-AD-APR-1 · Cuándo nace una solicitud.**

- Una solicitud por cada diferencia distinta de cero que registra el trabajador, **una por moneda**.
- **Sin umbral**: toda diferencia, por pequeña que sea.
- Nace en estado pendiente. La registra Worker (§18).

| Tipo | Origen | Lo que había antes de contar |
| --- | --- | --- |
| Ajuste de efectivo | El trabajador corrige el saldo de su caja durante la jornada | Saldo registrado |
| Diferencia de cierre | Lo contado al cerrar no coincide con lo esperado | Saldo esperado |
| Diferencia de apertura | Lo contado al abrir no coincide con lo que dejó el cierre anterior (**FR-AD-JOR-18**). **Todas** piden aprobación, también una reposición o un retiro de fondos | Lo dejado al cierre anterior |

Datos de la solicitud: tipo, sede, caja, jornada, trabajador, fecha y hora en que se registró, moneda, lo que había antes, lo contado, la diferencia (contado − lo que había), motivo y observaciones del trabajador, movimiento que la registró si lo hay, estado y resolución.

---

### 14.2 Bandeja — `/admin/aprobaciones`

**FR-AD-APR-2 · Contenido.**

- Muestra las solicitudes de las sedes que deja ver el selector de alcance (**FR-AD-SCOPE-4**).
- Dos pestañas, cada una con su número: **Pendientes** (por defecto) y **Resueltas**. Son enlaces: la pestaña va en la dirección (`?pestana=resueltas`).

Datos de cada solicitud:

| Dato | Contenido |
| --- | --- |
| Solicitud | Tipo; debajo, fecha y hora |
| Caja y trabajador | La caja, con su sede si hay más de una a la vista, y el trabajador |
| Diferencia y motivo | La diferencia con moneda y signo, nombrada como en Jornadas (**FR-AD-JOR-3**, **FR-AD-JOR-19**); debajo, el motivo del trabajador |
| Antigüedad | Solo en Pendientes: «hace 2 h», «hace 3 días» |
| Resolución | Solo en Resueltas: «Aprobada» o «Rechazada», quién y cuándo |

- Se entra a una solicitud pulsando su fila o su tarjeta en cualquier parte (**FR-AD-JOR-1**).
- Por debajo de 1024px, una tarjeta por solicitud, con su estado como marca (**FR-AD-SHELL-13**).

**FR-AD-APR-6 · Diferencia y motivo.** El signo de la diferencia y el motivo del trabajador se muestran juntos y sin reinterpretación, en la bandeja y en el detalle **[R8]**.

**FR-AD-APR-3 · Orden.**

- Pendientes: de la más antigua a la más reciente.
- Resueltas: por fecha de resolución, de la más reciente a la más antigua.

**FR-AD-APR-4 · Filtros.**

| Filtro | Valores | Por defecto |
| --- | --- | --- |
| Tipo | Todos, «Ajuste de efectivo», «Diferencia de cierre», «Diferencia de apertura» | Todos |
| Caja | Todas, o una caja | Todas |
| Trabajador | Todos, o un trabajador | Todos |
| Desde / Hasta | Fechas, sobre el día en que se registró la solicitud | Sin fecha |

- El filtro de sede es el selector de alcance de la cabecera.
- Por debajo de 640px los filtros quedan tras «Filtros» (**FR-AD-SHELL-15**).

**FR-AD-APR-13 · Vacíos** (**FR-AD-STATE-1**).

| Situación | Qué se muestra |
| --- | --- |
| No existe ninguna solicitud en el alcance, en cualquiera de las dos pestañas | Que los trabajadores todavía no han registrado ninguna diferencia |
| Pendientes vacía, con alguna resuelta | Que no hay solicitudes pendientes, con enlace a Resueltas |
| Resueltas vacía, con alguna pendiente | Que todavía no se ha resuelto ninguna |
| Ninguna coincide con los filtros | Ese hecho, con «Quitar los filtros» |

**FR-AD-APR-16 · Recuento de pendientes.** El número de pendientes aparece en el indicador de Aprobaciones del menú (**FR-AD-SHELL-3**), en la métrica de Inicio (**FR-AD-HOME-1**) y en una sola entrada del panel de atención (**FR-AD-HOME-2**). Las tres cifras son la de la pestaña Pendientes con el mismo alcance.

**Ver en la demo:**

- Bandeja: `marta@malecon-sf.cu`, **Aprobaciones**; pestaña Resueltas para las de hace más de tres días.
- Sin ninguna solicitud: `ibetancourt@centrodivisas.cu`, Aprobaciones.
- Ninguna coincide: `marta@malecon-sf.cu`, Aprobaciones, Desde y Hasta en una fecha anterior a hace ocho días.
- Pendientes vacía con resueltas, y Resueltas vacía con pendientes: no se puede ver en la demo.

---

### 14.3 Detalle de una solicitud — `/admin/aprobaciones/[id]`

**FR-AD-APR-5 · Contenido.**

| Bloque | Contenido |
| --- | --- |
| Cabecera | Tipo de solicitud, nombre de la jornada y sede, estado («Pendiente», «Aprobada» o «Rechazada»). Enlace a la bandeja |
| Lo que registró el trabajador | Ver la tabla siguiente, tal como lo registró |
| Resolución | Pendiente: su antigüedad, «Aprobar» y «Rechazar» (14.4). Resuelta: **FR-AD-APR-8** |

| Dato | Contenido |
| --- | --- |
| Fecha y hora | Cuándo lo registró |
| Trabajador | Nombre |
| Jornada | Nombre de la jornada, con enlace y su estado |
| Moneda | Código |
| Lo que había antes de contar | Saldo registrado (ajuste), saldo esperado (cierre) o lo dejado al cierre anterior (apertura) |
| Contado | Importe |
| Diferencia | Con signo, nombrada por su motivo (**FR-AD-APR-6**) |
| Motivo del trabajador | Tal como lo declaró |
| Observaciones | Si las dejó |
| Movimiento | Enlace a `/admin/jornadas/{id}/movimientos/{movimientoId}` si la diferencia generó un movimiento. Una diferencia de apertura no genera movimiento |

**FR-AD-APR-8 · Resolución.** Una resuelta muestra, debajo de lo que registró el trabajador: la decisión, quién la tomó, cuándo y el motivo de la administración. El motivo de la administración se añade al del trabajador: no lo sustituye, no lo edita y no lo oculta **[A7]**, **[R8]**. Una rechazada indica además que queda para revisarla fuera del sistema (**FR-AD-APR-9**).

**Ver en la demo** (`marta@malecon-sf.cu`, Aprobaciones):

- Ajuste con movimiento: una «Ajuste de efectivo» pendiente.
- Apertura, sin movimiento: Tipo «Diferencia de apertura», en cualquiera de las dos pestañas.
- Rechazada: Resueltas, una marcada «Rechazada».

**FR-AD-APR-14 · Rechazos.**

| Condición | Código |
| --- | --- |
| La solicitud no existe o está fuera del alcance | `no-encontrada` (**FR-AD-NAV-3**) |

---

### 14.4 Aprobar o rechazar

**FR-AD-APR-7.** Una solicitud pendiente ofrece «Aprobar» y «Rechazar». Cualquiera de los dos abre un diálogo.

**FR-AD-APR-9 / FR-AD-APR-10 · Diálogo.** Antes de pedir el motivo, informa de:

- qué registra la decisión: al aprobar, que la administración asume la diferencia; al rechazar, que no la asume y que queda marcada para revisarla fuera del sistema;
- que resolver deja constancia de la decisión y no modifica el saldo de la caja ni el movimiento registrado.

| Campo | Obligatorio | Reglas |
| --- | --- | --- |
| Motivo de la administración | Sí | Al menos 10 caracteres sin contar los espacios al principio y al final. Hasta cumplirlo, el botón de confirmar no se activa |

**Ver en la demo:** `marta@malecon-sf.cu`, Aprobaciones, una pendiente, «Aprobar» o «Rechazar».

**FR-AD-APR-11 · Rechazos del servidor.** Al confirmar, el servidor revalida que la solicitud sigue pendiente **[R3]**, **[R6]**.

| Condición | Código |
| --- | --- |
| Motivo vacío o de menos de 10 caracteres | `motivo-corto` |
| Otro usuario de la empresa la resolvió entretanto. La pantalla se actualiza y muestra la resolución que quedó | `ya-resuelta` |
| La solicitud no existe o está fuera del alcance | `no-encontrada` |

**FR-AD-APR-9 · Efecto.**

- La solicitud pasa a aprobada o rechazada y guarda la fecha, el autor y su motivo.
- No se modifica el saldo de la caja, el movimiento ni el cierre **[A6]**, **[A7]**.
- La pantalla vuelve al detalle con la confirmación de la decisión («Solicitud aprobada» o «Solicitud rechazada») y ya no ofrece los botones (**FR-AD-APR-11**).

---

### 14.5 La resolución en Jornadas

**FR-AD-APR-15.** Bajo cada moneda con diferencia en las secciones Apertura y Cierre del detalle de una jornada (**FR-AD-JOR-4**, **FR-AD-JOR-19**), y en el detalle de un movimiento de ajuste (**FR-AD-JOR-17**), el estado de su solicitud con enlace a ella:

| Estado | Se muestra |
| --- | --- |
| Pendiente | «Pendiente de aprobación» |
| Aprobada | «Aprobada por {nombre}» |
| Rechazada | «Rechazada por {nombre}» |

**Ver en la demo:** `marta@malecon-sf.cu`, Jornadas, «Solo con diferencia», abrir una jornada con diferencia de cierre.

---

### 14.6 Auditoría

**FR-AD-APR-12** **[RP-21]**

| Acción | Evento | Datos |
| --- | --- | --- |
| Aprobar | `solicitud.aprobada` | Autor, fecha, sede, solicitud (tipo, diferencia con signo y moneda, caja, trabajador), motivo |
| Rechazar | `solicitud.rechazada` | Autor, fecha, sede, solicitud (tipo, diferencia con signo y moneda, caja, trabajador), motivo |

---

## 15. Reportes

El volumen de lo operado por las sedes en un periodo. **Solo lectura.**

### 15.1 Qué cuenta como volumen

**FR-AD-REP-8 · Definición.** Es la única definición de volumen del producto: la usa todo lo que muestre volumen.

- Mide **actividad**: el valor de lo operado.
- Solo cuentan las operaciones en estado **Completada**.
- **Cada operación cuenta una sola vez**, en una sola moneda, por lo que el cliente vino a hacer.
- Se cuenta **en bruto**: compras y ventas se suman, no se compensan.
- Nunca se convierte a una moneda única: cada cifra va en su moneda (**FR-AD-FMT-1**).

| Operación | Importe que cuenta | Moneda | Sentido |
| --- | --- | --- | --- |
| Cambio de moneda en que el cliente entrega divisa | Lo que entrega el cliente | La divisa entregada | Compra |
| Cambio de moneda en que el cliente entrega CUP | Lo que recibe el cliente | La divisa recibida | Venta |
| Remesa | Lo pagado al beneficiario | La del pago | — |
| Giro enviado | Importe del giro (entra efectivo en la caja) | La del giro | Enviado |
| Giro pagado | Importe del giro (sale efectivo de la caja) | La del giro | Pagado |

- En un cambio de moneda los pesos cubanos de la contrapartida no cuentan. Ejemplo: el cliente entrega 100 USD y recibe 39.000 CUP → 100 USD de compra.
- Agregación: por moneda, la suma de los importes que cuentan; **operaciones**, el número de operaciones que cuentan.
- Una operación entra en un periodo por su día, en hora de Cuba, con «desde» y «hasta» incluidos.

**FR-AD-REP-9 · Posición neta.**

- Por divisa: **comprado − vendido**, con signo.
- Se muestra aparte, junto a lo comprado y lo vendido (**FR-AD-REP-10**). Nunca en lugar del volumen ni sumada a él.
- Volumen de una divisa en el cambio = comprado + vendido.

---

### 15.2 Reportes — `/admin/reportes`

**FR-AD-REP-1 · Contenido y dirección.**

- Muestra el volumen de las sedes que deja ver el selector de alcance (**FR-AD-SCOPE-4**), en un corte a la vez: **por sede**, **por servicio**, **por trabajador** o **por día**.
- El corte se elige con enlaces bajo «Agrupar por». Decide qué es cada fila, no qué operaciones cuentan.
- El corte, el periodo y el trabajador van en la dirección: un reporte se guarda o se comparte como enlace.

| Parámetro | Valores | Por defecto | Reglas |
| --- | --- | --- | --- |
| `corte` | `sede`, `servicio`, `trabajador`, `dia` | `sede` | Otro valor: el de por defecto |
| `desde`, `hasta` | AAAA-MM-DD | Los últimos siete días, hoy incluido | Una fecha que no existe en el calendario se ignora y se usa la de por defecto. Máximo 365 días contando los dos extremos; si se pide más, se recorta al último año hasta «hasta» y la pantalla lo indica |
| `trabajador` | Identificador de un trabajador de las sedes a la vista | Ninguno (todos) | Uno que no está entre ellos se ignora. Con `corte=trabajador` no se aplica |

**FR-AD-REP-2 · Qué operaciones.** Bajo ese rótulo, lo que decide qué operaciones cuentan: el periodo y el trabajador.

- Se aplican al cambiarlos, sin botón.
- Accesos rápidos: «Hoy», «Últimos 7 días», «Últimos 30 días» y «Mes en curso» (del día 1 a hoy). El que coincide con el periodo en uso aparece marcado.
- **Desde** y **hasta** para cualquier otro periodo.
- **Trabajador**: para ver lo de una persona por sede, por servicio o por día. **Agrupando por trabajador no hay filtro de trabajador.**
- Con un trabajador elegido, un aviso encima del total indica que el total y la tabla (y el gráfico, en el corte por día) son solo suyos, con «Ver todos los trabajadores» para quitar el filtro. Su nombre aparece también en el título del total y del gráfico.

**Ver en la demo:**

- `marta@malecon-sf.cu`, **Reportes**: los cuatro cortes y los accesos rápidos.
- Filtro de trabajador: elegir Lidia Gómez en Trabajador.
- Periodo recortado: entrar en `/admin/reportes?desde=2020-01-01`.

**FR-AD-REP-3 · Total del periodo.** Debajo del periodo: el número de operaciones completadas y el volumen de cada moneda, cada uno en su tarjeta. Las monedas nunca se suman entre sí. Las monedas son las que tienen volumen en el periodo: CUP primero, después las divisas por su código.

**FR-AD-REP-4 · Tablas de los cortes.** Cada corte es una tabla con el **número de operaciones** y **una columna por moneda**, con «—» donde no hubo nada. En cada corte, la suma de las filas de cada moneda es igual al total del periodo (**FR-AD-REP-3**).

| Corte | Filas | Enlace |
| --- | --- | --- |
| Por sede | Todas las sedes a la vista, también las que no operaron. Con el código de la sede | Ficha de la sede |
| Por servicio | Ver **FR-AD-REP-10** | — |
| Por trabajador | Todos los trabajadores activos de esas sedes, también los que no operaron; los desactivados, solo si operaron en el periodo. Con su sede si hay más de una a la vista | Ficha del trabajador |
| Por día | Todos los días del periodo, también los que no tuvieron operaciones | — |

- Por sede y por trabajador: se ordenan por cualquier columna pulsando su cabecera.
- Por debajo de 1024px cada fila es una tarjeta (**FR-AD-SHELL-13**) y el orden se elige con un selector «Ordenar por».

**Ver en la demo:** `marta@malecon-sf.cu`, Reportes, «Por sede»: PuntoCash Cerro aparece sin operaciones.

**FR-AD-REP-10 · Por servicio.**

- Una línea por servicio y sentido, en este orden: compra de divisa, venta de divisa, remesas pagadas, giros enviados, giros pagados. Solo las que tuvieron operaciones.
- Debajo, **«Cambio de moneda por divisa»**, si hubo cambios en el periodo. Por divisa: operaciones, **comprado**, **vendido**, **volumen** y **posición neta** con su signo (**FR-AD-REP-9**).

**Ver en la demo:** `marta@malecon-sf.cu`, Reportes, «Por servicio».

**FR-AD-REP-5 · Gráfico por día.**

- Solo en el corte por día, encima de la tabla: barras del volumen diario **en una moneda**.
- La moneda se elige; por defecto, CUP.
- Al pasar el puntero o enfocar una barra: el día, el importe y las operaciones.
- Color primario del manual de marca, sin paleta propia. La tabla de debajo es su vista accesible.

**Ver en la demo:** `marta@malecon-sf.cu`, Reportes, «Por día».

**FR-AD-REP-6 · Contenido excluido.** Los reportes no muestran comisiones, rentas, liquidaciones ni margen **[A8]**.

**FR-AD-REP-11 · Sin operaciones.**

- El total aparece en cero, con la indicación de que no hubo ninguna operación completada en el periodo.
- Los cortes por sede, por trabajador y por día muestran igualmente sus filas en cero (**FR-AD-REP-4**).
- El corte por servicio muestra esa misma indicación en lugar de la tabla.

**Ver en la demo:** `marta@malecon-sf.cu`, entrar en `/admin/reportes?desde=2025-01-01&hasta=2025-01-31`.

**FR-AD-REP-12 · Dónde se muestra el volumen.**

- Solo en Reportes. Inicio muestra el número de operaciones, no el volumen (**FR-AD-HOME-1**).
- La ficha de un trabajador enlaza a su volumen por día: `/admin/reportes?corte=dia&trabajador={id}` (**FR-AD-TRAB-9**).

**Ver en la demo:** `marta@malecon-sf.cu`, Trabajadores, Lidia Gómez, enlace a su volumen.

---

### 15.3 Exportar — `/admin/reportes/exportar/{formato}`

**FR-AD-REP-7 · Exportación.**

- «Exportar a Excel» y «Exportar a PDF», en la cabecera de la pantalla.
- Ruta: `/admin/reportes/exportar/xlsx` o `/admin/reportes/exportar/pdf`, con `desde`, `hasta` y, si lo hay, `trabajador`, con las mismas reglas que la pantalla (15.2).
- Sale del mismo cálculo que la pantalla, con el alcance de la sesión y la sede elegida en la cabecera **[A1]**.

| Contenido | Regla |
| --- | --- |
| Cortes | Los cuatro: por sede, por servicio (con «Cambio de moneda por divisa»), por trabajador y por día, sea cual sea el corte que se está mirando |
| Periodo, trabajador y sedes | Los que hay en pantalla |
| Con un trabajador elegido | Sin el corte por trabajador; la portada indica de quién es (**FR-AD-REP-2**) |
| Datos | Solo totales: sedes, servicios, trabajadores, días e importes. Nunca un cliente, un documento ni una operación. Es la única descarga de la consola **[R11]** |
| Título | «Resumen de operaciones» |
| Mercante | Su nombre junto al título, como dato de contexto, nunca como marca **[A9]** |
| Nombre del archivo | `puntocash-resumen-de-operaciones_{desde}_{hasta}`, más `_{trabajador}` si hay filtro (nombre en minúsculas, sin tildes, con guiones), y la extensión `.xlsx` o `.pdf` |

| Condición | Código |
| --- | --- |
| Formato distinto de `xlsx` o `pdf` | `no-encontrada` |

**Ver en la demo:** `marta@malecon-sf.cu`, Reportes, «Exportar a Excel» y «Exportar a PDF», con y sin un trabajador elegido.

---

### 15.4 Plantilla de los archivos

**FR-AD-REP-13.** Sigue el manual de marca: Montserrat en sus cuatro pesos, la paleta oficial, el dorado como acento y nunca como superficie. Misma estructura en los dos formatos. La plantilla está en el código, no en un archivo aparte.

**Contenido común.**

| Pieza | Contenido |
| --- | --- |
| Título | «Resumen de operaciones» |
| Datos del reporte | Periodo, sedes, trabajador, cuándo y quién lo generó |
| Total del periodo | Operaciones y un recuadro por moneda |
| Definición de volumen | En una frase |
| Cortes | Cada uno con su tabla |

**Tablas.** Cabecera gris claro; divisores horizontales finos; sin líneas verticales; cifras a la derecha; «—» donde no hubo nada; fila de total donde sumar tiene sentido, nunca entre divisas (no la lleva «Cambio de moneda por divisa»).

**PDF.**

- Tamaño carta. Apaisado si las columnas no caben en vertical.
- Primera página: banda navy con el logotipo para fondo oscuro, el nombre del documento y el de la empresa; filete dorado debajo.
- Páginas siguientes: logotipo pequeño y nombre del documento.
- Pie de cada página: el periodo y «Página N de M».

**Excel.**

- Hoja **Resumen**: logotipo, los datos del reporte, el total y la definición.
- Una hoja por corte, con su título y su tabla.
- Las cifras son números, no texto. Los días son fechas.
- Los totales de cada hoja de corte son fórmulas. Los del Resumen son cifras.
- Los ceros se muestran como «—» sin dejar de ser cero.
- Cabecera fija al desplazar, con filtros.
- Cada hoja se imprime a una página de ancho, con el periodo y la paginación al pie.

**Ver en la demo:** abrir los dos archivos exportados en 15.3.

---

### 15.5 Auditoría

**FR-AD-REP-7** **[RP-21]**

| Acción | Evento | Datos |
| --- | --- | --- |
| Exportar | `reporte.exportado` | Autor, fecha, formato, periodo, sedes, trabajador; la sede elegida en la cabecera, si hay una |

---

## 16. Modelo de dominio

**FR-AD-DOM-1 · Dominio de red.** La consola trabaja sobre un dominio de red compartido con la consola de PuntoCash y con las superficies que leen el contenido público de cada sede. Incluye:

- operadores, sedes, asignaciones, cajas, equipos y trabajadores;
- usuarios administradores, monedas, tasas y promociones;
- solicitudes de aprobación y auditoría.

**FR-AD-DOM-2 · Entidades.**

| Entidad | Contenido |
| --- | --- |
| `Operador` | La empresa mercante: nombre, identificación legal, contacto, estado (activo, suspendido, baja) |
| `UsuarioAdmin` | Una persona del operador en esta consola: identificador de acceso, nombre, teléfono, correo de verificación, estado, si es el **usuario inicial** y si es el **administrador principal**, fecha de alta y último acceso |
| `Sede` | Código, nombre, dirección, municipio y provincia, teléfono, horario por días, estado (activa, suspendida, cerrada) con los datos de la suspensión, fecha de alta |
| `ServiciosSede` | Los servicios que PuntoCash habilitó en la sede: cambio de moneda, remesas, giros |
| `Asignacion` | Sede ↔ Operador por periodos: inicio, fin y motivo de cada uno |
| `Caja` | Sede, identificador, estado (activa, retirada), alta con su autor, retirada con fecha y motivo |
| Equipo | El dispositivo vinculado a una caja (`CAJ-NNNN-NNNN`) o a una sede (kiosco, `KIO-NNNN-NNNN`): rótulo, quién y cuándo lo vinculó, última actividad |
| Trabajador | Sede, identificador de acceso, nombre, documento (tipo y número), teléfono, correo de verificación, estado, desactivación con fecha, motivo y autor |
| `CatalogoMonedas` | Las monedas de la plataforma, mantenidas por PuntoCash |
| `MonedasSede` | La lista de monedas de una sede, con su fecha de alta |
| `PoliticaTasas` | El rango de PuntoCash por moneda, contra el peso cubano: mínimo y máximo de compra y de venta, y una versión que cambia cada vez que PuntoCash lo mueve |
| `ParSede` | La tasa de una moneda en una sede, contra el peso cubano: compra, venta, último cambio con su autor y, si PuntoCash la ajustó al mover un rango, la marca con las cifras anteriores |
| `Promocion` | Origen (empresa o red), título, texto, imagen opcional, sedes, fechas desde y hasta (por día, hora de Cuba), autor, retirada con fecha y autor |
| `SolicitudAprobacion` | Tipo (ajuste de efectivo, diferencia de cierre, diferencia de apertura), jornada, moneda, diferencia con signo, motivo y observaciones del trabajador, estado y resolución (decisión, autor, fecha, motivo) |
| `EventoAuditoria` | Tipo, autor y su papel, fecha, sede y operador, sujeto, antes y después, motivo |

Las consultas se acotan por alcance (**FR-AD-DOM-5**). Las escrituras son las que exige cada sección de este documento.

**FR-AD-DOM-3 · Caja y trabajador, de una sede.**

- El dominio de Caja incluye el enlace **Caja → Sede**, y el de trabajadores **Trabajador → Sede** **[A13]**.
- Toda consulta de jornadas, movimientos y operaciones se puede acotar por sede a través de ese enlace.
- La búsqueda de solicitudes del kiosco también se filtra por sede (**FR-AS-DOM-11**, **[RP-14]**).

**FR-AD-DOM-4 · Vinculación de equipos.** Es un único mecanismo para el equipo de caja de Worker, para el kiosco y para esta consola:

- el reto que muestra el equipo es el que el administrador canjea;
- el vínculo resultante es el que el equipo consulta en el servidor.

**FR-AD-DOM-5 · Alcance en el servidor.** Toda consulta recibe el alcance de la sesión y nunca devuelve registros fuera de él **[A1]**, **[RP-19]**.

**FR-AD-DOM-6 · PuntoCash no escribe dentro de una sede.** Las escrituras sobre `Caja`, `Trabajador`, `UsuarioAdmin`, `MonedasSede`, `ParSede` y los vínculos de equipo exigen un alcance de operador. Con alcance global se rechazan con `alcance-global-prohibido` **[A14]**, **[RP-26]**.

**FR-AD-DOM-7 · Contenido público de sede.** Las tasas en vigor, los datos de contacto y horario, y las promociones vigentes se sirven desde este dominio como origen único. Es lo que leen el kiosco de autoservicio y la pantalla informativa **[A12]**, **[RP-25]**, **[FR-PANT-DATA-7]**.

---

## 17. Comportamiento transversal

**FR-AD-STATE-1 · Estados de una tabla.**

- Toda tabla tiene cuatro estados: con datos, cargando, vacía por ausencia de datos y vacía por filtros sin resultados. Los dos vacíos tienen mensajes distintos.
- «Cargando» se aplica a lo que se carga dentro de una pantalla ya mostrada.
- Una pantalla que se resuelve en el servidor no empieza a responder antes de saber si la ruta existe, para que un recurso ajeno siga respondiendo 404 (**FR-AD-NAV-2**).

**FR-AD-STATE-2 · Envío.** Toda acción que escribe muestra que se está enviando, impide el doble envío y confirma el resultado.

**FR-AD-STATE-3 · Confirmación.** Estas acciones se confirman en un diálogo que resume qué va a pasar:

- desactivar un trabajador o un usuario;
- retirar una caja;
- forzar un cierre;
- resolver una solicitud;
- fijar, cambiar o retirar una tasa;
- añadir o retirar una moneda de la lista;
- desvincular un equipo;
- retirar una promoción.

Vincular un equipo no lleva diálogo: su paso 2 muestra el equipo, la sede y la caja antes de vincular, y es la confirmación.

**FR-AD-STATE-4 · Errores.**

- Ningún error muestra jerga interna, códigos de excepción ni nombres de campo del dominio **[R10]**.
- El usuario ve el mensaje del código de rechazo (Apéndice C).
- Un fallo inesperado al cargar una pantalla se muestra dentro del shell, con «Volver a intentarlo» y «Volver a Inicio».

**Ver en la demo:** cualquier pantalla con un rechazo, por ejemplo crear en Vedado una caja «Caja 01» con `marta@malecon-sf.cu`.

**FR-AD-STATE-5 · Teclado y jerarquía.** Toda pantalla se puede usar con el teclado y respeta la jerarquía de datos financieros del manual de marca.

**FR-AD-STATE-6 · Lo que controla PuntoCash.** Cuando una acción está impedida por algo que controla PuntoCash, la pantalla dice quién lo controla y qué pedir, en lugar de solo deshabilitar el control **[A3]**, **[A14]**. Son casos de este tipo:

- un servicio no habilitado;
- una moneda sin rango;
- una sede o un operador suspendidos.

**Ver en la demo:** `abarrios@bahiacambios.cu`, Tasas → PuntoCash Trinidad (CAD sin rango; sede suspendida).

**FR-AD-STATE-7 · Anchos de aceptación.** Toda pantalla se comprueba a **360px, 390px y 1440px** antes de aceptarse (**FR-AD-SHELL-6**).

**FR-AD-STATE-8 · Sin desplazamiento horizontal.** Ninguna pantalla produce desplazamiento horizontal a 360px.

---

## 18. Dependencias funcionales

| Capacidad | Depende de |
| --- | --- |
| Cualquier pantalla del shell | Un segundo factor verificado **[R13]** |
| Cualquier pantalla del shell | Un usuario activo, de un operador activo **[A14]** |
| Que una pantalla muestre algo | Al menos una sede en el alcance; sin ninguna, las pantallas se muestran vacías por ausencia, no por filtro (**FR-AD-ACC-7**, **FR-AD-HOME-8**) |
| Ver la sección de Usuarios (§8) | Ser el **administrador principal** del operador de la sesión (**FR-AD-USR-11**) |
| Vincular un equipo de caja | Una sede del alcance **con al menos una caja activa y sin equipo vinculado**, y un reto vigente y no usado |
| Vincular un kiosco | Una sede del alcance y un reto vigente y no usado |
| Desvincular un equipo | Nada más que el vínculo. No exige que la jornada esté cerrada **[A11]**, **[FR-DEV-7]** |
| Crear una caja | Una sede del alcance, y un identificador libre dentro de esa sede |
| Retirar una caja | Sin jornada abierta, sin equipo vinculado, y que no sea la última activa de una sede activa |
| Reactivar una caja | Nada. No restaura ningún vínculo de equipo |
| Dar de alta un trabajador | Una sede del alcance; un identificador libre en toda la red; un documento no registrado; un correo válido |
| Desactivar o reasignar un trabajador | Sin jornada abierta **[R6]** |
| Reactivar un trabajador | Nada: vuelve a su sede de siempre. **Siempre es posible**: PuntoCash no desactiva personas **[A14]** |
| Que un trabajador pueda iniciar sesión | Estar activo; su sede y su operador no suspendidos; y un equipo vinculado a una caja **de su sede** (**FR-DEV-1**, **FR-AUTH-8**) |
| Dar de alta, editar, cambiar el correo, regenerar la credencial, desactivar o reactivar un usuario administrador | Ser el administrador principal (**FR-AD-USR-11**) |
| Desactivar un usuario administrador | Que no sea el principal (**FR-AD-USR-13**) |
| Traspasar el papel de principal | Ser su titular, y un destinatario **activo** distinto de uno mismo (**FR-AD-USR-12**) |
| Recuperar la contraseña | Nada: se llega sin sesión y la respuesta es idéntica exista la cuenta o no (**FR-REC-4**) |
| Añadir una moneda a una sede | Una sede del alcance no cerrada, y una moneda del catálogo que la sede no tenga. **No** depende del servicio de Cambio de moneda (**FR-AD-MON-5**) |
| Retirar una moneda de una sede | Saldo cero en todas sus cajas, y que no sea la última de una sede activa (**FR-AD-MON-7**, **FR-AD-MON-9**) |
| Que Equipos muestre las solicitudes generadas por cada kiosco (**FR-AD-EQ-12**) | Que las solicitudes de kiosco se registren para toda la red y no solo en el kiosco. Operaciones ya sabe qué operación nació de cuál (**FR-AD-OPS-4**); las que no se canjearon no existen fuera del kiosco |
| Resolver una solicitud | Que siga pendiente al confirmar, y un motivo de al menos 10 caracteres (**FR-AD-APR-7**, **FR-AD-APR-11**) |
| Que una diferencia registrada en Worker llegue a Aprobaciones (§14) | Que **Worker** registre cada ajuste de efectivo, cada cierre con diferencia y cada apertura con diferencia con su motivo, y que de cada uno nazca su solicitud. La apertura comparada es la misma dependencia de la fila anterior |
| Fijar la tasa de una moneda | Cambio de moneda habilitado en la sede; la moneda y el peso cubano en su lista; un rango de PuntoCash para la moneda; las dos cifras dentro de él, y la compra no mayor que la venta (**FR-AD-TASA-2**, **FR-AD-TASA-8**) |
| Que el tablero de una sede muestre una moneda | Que su tasa esté **en vigor**: las mismas cuatro condiciones (**FR-AD-TASA-18**) |
| Publicar una promoción | Una sede del alcance no cerrada; título y texto dentro de su largo; inicio no anterior a hoy, y fin no anterior al inicio; la imagen, si la lleva, JPG, PNG o WebP de hasta 2 MB (**FR-AD-PROM-5**, **FR-AD-PROM-7**, **FR-AD-PROM-12**) |
| Editar o retirar una promoción | Que sea de la empresa y no haya terminado (**FR-AD-PROM-3**, **FR-AD-PROM-9**) |
| Forzar el cierre de una jornada | Que siga abierta al confirmar, y un motivo de al menos 10 caracteres (**FR-AD-JOR-9**, **FR-AD-JOR-11**) |
| Que una jornada muestre su apertura comparada con el cierre anterior (§12.3) | Que **Worker**, al abrir una jornada, registre lo dejado por el cierre anterior, lo contado **a ciegas** —el trabajador cuenta antes de ver lo dejado— y el motivo y las observaciones de toda diferencia. |

---

## 19. Comportamiento crítico para la aceptación

**FR-AD-QA-2** Una regresión en cualquiera de estos puntos es un defecto bloqueante:

1. **Ningún dato fuera del alcance**, por ninguna vía: listado, filtro o URL con el identificador de un recurso ajeno, que responde como inexistente (**FR-AD-NAV-2**, **FR-AD-NAV-3**, **FR-AD-DOM-5**).
2. **Ninguna sesión sin segundo factor verificado.** El código de verificación nunca llega al cliente (**FR-AD-ACC-1**, **FR-AD-ACC-2**).
3. **Un único rechazo en el acceso** para cuenta inexistente, contraseña incorrecta, usuario desactivado y operador suspendido (**FR-AD-ACC-5**, **FR-AD-ACC-6**).
4. **§8.1 no existe para quien no es el principal**: ni en el menú del HTML entregado ni como ruta, que responde 404 (**FR-AD-USR-11**).
5. **Siempre hay exactamente un administrador principal**, y a él no lo desactiva nadie (**FR-AD-USR-12**, **FR-AD-USR-13**).
6. **Una caja, un equipo**, y el reto de vinculación es de un solo uso (**FR-AD-EQ-8**, **FR-AD-EQ-23**).
7. **Desvincular no cierra la jornada**, y la confirmación lo advierte antes (**FR-AD-EQ-10**).
8. **Retirar una caja no borra nada** y la deja visible en los listados históricos (**FR-AD-CAJA-11**).
9. **Desactivar a un trabajador no altera nada de lo que operó** (**FR-AD-TRAB-12**).
10. **La asistencia de acceso no muestra, no genera y no usa ningún código**, y lo dice antes de cualquier control (**FR-AD-TRAB-11**).
11. **Ninguna credencial de dispositivo es visible, copiable ni exportable** (**FR-AD-EQ-25**).
12. **La marca visible es PuntoCash**; el nombre del operador es un dato de contexto (**FR-AD-SHELL-4**, **FR-AD-SHELL-5**, **[RP-23]**).
13. **Sin desplazamiento horizontal a 360px**, y las tablas como una tarjeta por fila por debajo de 1024px (**FR-AD-STATE-8**, **FR-AD-SHELL-13**).
14. **Las dos navegaciones ofrecen los mismos destinos** (**FR-AD-SHELL-10**).
15. **Una credencial de persona se muestra una sola vez** (**FR-AD-TRAB-8**, **FR-AD-USR-5**, **FR-AD-FMT-4**).
16. **El perfil solo actúa sobre quien tiene la sesión** y no cambia el correo. Cambiar la contraseña exige la actual (**FR-AD-PERF-3** a **FR-AD-PERF-5**).
17. **Una moneda con saldo en alguna caja no se retira**, y la que se retira sale también de las cajas (**FR-AD-MON-6**, **FR-AD-MON-7**).
18. **Ninguna tasa fuera del rango de PuntoCash**, ni por la interfaz ni por el dominio, y el tablero de una sucursal muestra exactamente lo que su sede cotiza (**FR-AD-TASA-8**, **FR-AD-TASA-11**, **FR-AD-TASA-18**).
19. **Solo se exhiben las promociones vigentes hoy**; las de red no se modifican desde aquí; título y texto no pasan de su largo (**FR-AD-PROM-3**, **FR-AD-PROM-6**, **FR-AD-PROM-7**).
20. **Forzar un cierre no modifica nada anterior** y queda distinguido, con su motivo y su autor, en el listado y en el detalle (**FR-AD-JOR-12**, **FR-AD-JOR-14**).
21. **Toda diferencia entre un cierre y la apertura siguiente se ve**, por moneda y con su motivo. Un cierre forzado queda pendiente de conciliar hasta la apertura siguiente (**FR-AD-JOR-19**, **FR-AD-JOR-20**).
22. **Operaciones solo lee**: todas se listan con su estado traducido, el detalle no ofrece ninguna acción y una operación de otra empresa responde como inexistente (**FR-AD-OPS-1**, **FR-AD-OPS-5**, **FR-AD-OPS-8**).
23. **Resolver una solicitud no modifica la caja** —ni el saldo, ni el movimiento, ni el cierre, ni el motivo del trabajador—, exige motivo y no sobrescribe una ya resuelta. Una diferencia cuenta una sola vez en Inicio (**FR-AD-APR-8**, **FR-AD-APR-9**, **FR-AD-APR-11**, **FR-AD-HOME-2**).
24. **El volumen se cuenta una vez y por moneda**: un cambio cuenta la divisa y no los pesos, solo cuentan las completadas, las filas de cada corte suman el total del periodo, y el archivo exportado dice lo mismo que la pantalla, sin ningún dato de clientes (**FR-AD-REP-3**, **FR-AD-REP-7**, **FR-AD-REP-8**).
25. **Al cambiar de sede se conservan el periodo, la pestaña y los filtros generales**, y se quitan la caja y el trabajador (**FR-AD-SCOPE-5**).
26. **Una dirección inexistente responde 404 dentro del shell**, con el mismo mensaje que una sede ajena (**FR-AD-NAV-3**).

---

## Apéndice A · Terminología

Amplía el Apéndice A del FRD de Worker.

| Término | Significado |
| --- | --- |
| **Sede** | Una casa de cambio física de la red, propiedad de PuntoCash. Nace sin cajas |
| **Operador** / **mercante** | La empresa a la que PuntoCash entrega una o más sedes en administración |
| **Admin de sede** | El papel con el que una persona del operador usa `/admin` |
| **Usuario administrador** | La cuenta de una persona del operador en esta consola |
| **Administrador principal** | El único usuario de un operador que gobierna §8.1. El papel se traspasa; a su titular no lo desactiva nadie |
| **Usuario inicial** | El primer usuario de un operador, entregado por PuntoCash. Dato histórico, distinto del principal |
| **Alcance** | Las sedes que una sesión puede ver. Se deriva de la sesión; el selector de la cabecera solo filtra dentro de él |
| **Asignación** | El vínculo Sede ↔ Operador durante un periodo |
| **Caja** | Un puesto de mostrador de una sede, al que se vincula un equipo |
| **Equipo** | El dispositivo de una caja (`CAJ-…`) o un kiosco de autoservicio (`KIO-…`) |
| **Reto de vinculación** | El QR y el código de seis cifras que muestra un equipo sin vincular. Válido diez minutos, de un solo uso |
| **Vincular** / **desvincular** | Atar un equipo a su caja o a su sede, y deshacerlo. Desvincular corta la sesión del dispositivo y no cierra la jornada |
| **Trabajador** | El empleado de mostrador. Pertenece a una sede, no a una caja |
| **Credencial inicial** | La contraseña que se entrega al dar de alta a un trabajador o un usuario. Se muestra una sola vez. Regenerarla es un restablecimiento |
| **Asistencia de acceso** | La pantalla con la que se corrige el correo de verificación de un trabajador que no recibe su código |
| **Jornada** | La sesión de trabajo de una caja, de la apertura al cierre. Se nombra «{caja} · {trabajador} · {día de apertura}»: «Caja 01 · Lidia Gómez · 20 oct 2026» |
| **Cierre** | El conteo del efectivo al terminar la jornada, moneda por moneda, con motivo para lo que no cuadra |
| **Cierre forzado** | El cierre que hace el administrador en una jornada abierta, sin contar el efectivo. Queda pendiente de conciliar hasta la apertura siguiente (§12.3, §12.5) |
| **Solicitud de aprobación** | Una diferencia de efectivo registrada por un trabajador que espera la decisión de la administración |
| **Volumen** | El valor de lo operado en un periodo, por moneda, según **FR-AD-REP-8** |
| **Posición neta** | En el cambio de moneda, por divisa, lo comprado menos lo vendido. No es volumen (**FR-AD-REP-9**) |
| **Contenido público de sede** | Tasas en vigor, datos de contacto y horario, y promociones vigentes de una sucursal |
| **Evento de auditoría** | Registro inmutable de un acto de gobierno: quién, qué, cuándo, sobre qué y por qué |
| **Suspender** | Acción de PuntoCash sobre un operador o una sede que corta el acceso de todos sus usuarios y trabajadores **[A14]** |

---

## Apéndice B · Mapa de reglas a requisitos

| Regla | Requisitos que la implementan |
| --- | --- |
| **A1** Aislamiento por alcance | FR-AD-NAV-2, FR-AD-NAV-3, FR-AD-SCOPE-1 a 6, FR-AD-EQ-1, FR-AD-EQ-7, FR-AD-CAJA-5, FR-AD-TRAB-5, FR-AD-SEDE-12, FR-AD-DOM-5 |
| **A2** Una asignación vigente | FR-AD-SEDE-12 (lectura) |
| **A3** Solo PuntoCash decide qué sedes existen y sus límites | FR-AD-SEDE-2, FR-AD-SEDE-4, FR-AD-SEDE-5, FR-AD-SEDE-6, FR-AD-STATE-6, FR-AD-MON-3, FR-AD-TASA-2, FR-AD-TASA-4 |
| **A4** El mercante gobierna lo de dentro | FR-AD-CAJA-1 a 14, FR-AD-EQ-3, FR-AD-TRAB-3 a 16, FR-AD-USR-1 a 14, FR-AD-PERF-3, FR-AD-MON-1 a 10, FR-AD-TASA-1 a 18, FR-AD-SEDE-14, FR-AD-PROM-1 a 12, FR-AD-JOR-1 a 20, FR-AD-APR-1 a 16, FR-AD-REP-1 a 13 |
| **A5** Tasa dentro del rango, sobre monedas propias y servicio habilitado | FR-AD-TASA-2, 5, 7, 8, 11, 12, 15 |
| **A6** Supervisa y desbloquea, no opera | FR-AD-SEDE-7, FR-AD-TRAB-11, FR-AD-JOR-7 a 9, FR-AD-OPS-5, FR-AD-APR-9, FR-AD-APR-10 |
| **A7** No altera lo del Worker | FR-AD-CAJA-11, FR-AD-TRAB-12, FR-AD-JOR-12, FR-AD-OPS-5, FR-AD-APR-8, FR-AD-APR-9 |
| **A8** Sin economía PuntoCash ↔ mercante | FR-AD-TASA-17, FR-AD-REP-6 |
| **A9** PuntoCash es la marca visible | FR-AD-SHELL-4, FR-AD-SHELL-5 |
| **A10** Los equipos los vincula el Admin | FR-AD-EQ-3, FR-AD-EQ-7, FR-AD-EQ-13, FR-AD-EQ-17, FR-AD-EQ-25, FR-AD-FMT-4 |
| **A11** Un equipo, un puesto | FR-AD-EQ-8, FR-AD-EQ-10, FR-AD-EQ-14, FR-AD-JOR-13 |
| **A12** Fuente única del contenido de sede | FR-AD-SEDE-5, FR-AD-SEDE-11, FR-AD-SEDE-16, FR-AD-DOM-7, FR-AD-MON-2, FR-AD-TASA-6, FR-AD-TASA-18, FR-AD-PROM-6 |
| **A13** El trabajador es de una sede | FR-AD-TRAB-1, FR-AD-TRAB-4, FR-AD-TRAB-14, FR-AD-SEDE-9, FR-AD-DOM-3 |
| **A14** PuntoCash observa y actúa solo sobre la sede entera | FR-AD-EQ-3, FR-AD-TRAB-15, FR-AD-TRAB-16, FR-AD-SEDE-13, FR-AD-ACC-6, FR-AD-DOM-6, FR-AD-STATE-6 |
| **R3** Revalidación al confirmar | FR-AD-EQ-22, FR-AD-TASA-11, FR-AD-JOR-11, FR-AD-APR-11 |
| **R6** Nada resuelto se reprocesa | FR-AD-EQ-22, FR-AD-EQ-23, FR-AD-CAJA-9, FR-AD-TRAB-13, FR-AD-JOR-11, FR-AD-APR-11 |
| **R8** Signo y motivo coherentes | FR-AD-JOR-3, FR-AD-JOR-19, FR-AD-APR-6, FR-AD-APR-8 |
| **R9** Histórico inmutable | FR-AD-CAJA-11, FR-AD-MON-6, FR-AD-TASA-10, FR-AD-TASA-13, FR-AD-JOR-6, FR-AD-JOR-12, FR-AD-JOR-18, FR-AD-OPS-6 |
| **R10** Sin enums en bruto | FR-AD-STATE-4, FR-AD-PROM-11, FR-AD-OPS-7 |
| **R11** Sin descarga | FR-AD-REP-7 es su única excepción |
| **R13** Sin segundo factor no hay sesión | FR-AD-ACC-1, FR-AD-ACC-2, FR-AD-ACC-8, FR-AD-TRAB-6, FR-AD-TRAB-8, FR-AD-TRAB-11, FR-AD-USR-3, FR-AD-PERF-4, FR-AD-PERF-5, FR-AD-PERF-7 |

---

## Apéndice C · Catálogo de mensajes

El mensaje que ve el usuario para cada código de rechazo. Un código se busca primero en la sección de la pantalla y después en «Comunes». Los `{nombre}` se sustituyen por el dato correspondiente. Este catálogo se genera a partir de la demostración (`src/app/admin/(app)/mensajes.ts`), de modo que el documento y la pantalla dicen lo mismo.

### Comunes a toda la consola

| Código | Mensaje |
| --- | --- |
| `sesion-terminada` | Tu sesión terminó. Vuelve a iniciar sesión. |
| `no-encontrada` | No encontramos lo que buscabas. |
| `alcance-global-prohibido` | Esta acción pertenece al administrador de la sede. |
| `campo-obligatorio` | Este campo es obligatorio. |
| `correo-invalido` | Introduce un correo válido. |

### Equipos — §3

| Código | Mensaje |
| --- | --- |
| `codigo-no-coincide` | El código no coincide con ningún equipo pendiente. Revisa el código que muestra el equipo. |
| `codigo-caducado` | Ese código caducó. El equipo ya muestra uno nuevo. |
| `codigo-caducado-al-vincular` | Ese código caducó mientras elegías. El {equipo} ya muestra uno nuevo. |
| `equipo-ya-vinculado` | Ese equipo ya está vinculado. Desvincúlalo antes de volver a vincularlo. |
| `caja-ya-vinculada` | {caja} ya tiene un equipo vinculado. Desvincúlalo antes de vincular otro. |
| `caja-requerida` | Elige la caja a la que pertenece este equipo. |
| `caja-retirada` | Esa caja está retirada y no admite un equipo. |
| `sede-cerrada` | Esa sede está cerrada y no admite equipos nuevos. |
| `error-inesperado` | No se pudo desvincular. Vuelve a intentarlo. |

### Cajas — §4

| Código | Mensaje |
| --- | --- |
| `sede-requerida` | Elige la sede donde va la caja. |
| `nombre-requerido` | Escribe el identificador de la caja. |
| `nombre-duplicado` | Ya existe una caja con ese nombre en esta sede. |
| `sede-cerrada` | Esa sede está cerrada, así que no admite cambios en sus cajas. |
| `motivo-requerido` | Escribe el motivo, con al menos {min} caracteres. |
| `jornada-abierta` | Esta caja tiene una jornada abierta. Hasta que se haga su cierre, o lo fuerces desde la jornada, no se puede retirar. |
| `equipo-vinculado` | Esta caja tiene un equipo vinculado. Desvincúlalo antes de retirarla. |
| `ultima-caja` | Es la única caja activa de una sede en funcionamiento: retirarla dejaría la sucursal sin ningún mostrador donde atender. Crea otra caja antes de retirar esta. |
| `ya-retirada` | Esa caja ya estaba retirada. |
| `no-retirada` | Esa caja no está retirada. |

### Sedes — §6

| Código | Mensaje |
| --- | --- |
| `direccion-vacia` | Escribe la dirección de la sucursal. |
| `municipio-vacio` | Escribe el municipio y la provincia. |
| `telefono-invalido` | Escribe un teléfono con al menos 8 cifras, por ejemplo +53 7 861 5520. |
| `sede-cerrada` | Esa sede está cerrada, así que no admite cambios en sus datos. |
| `horario-sin-dias` | La sucursal tiene que abrir al menos un día. |
| `horario-incompleto` | Escribe la hora de apertura y la de cierre del {dia}. |
| `horario-cierra-antes` | El {dia}, la hora de cierre tiene que ser posterior a la de apertura. |
| `error-inesperado` | No se pudo guardar. Vuelve a intentarlo. |

### Trabajadores — §7

| Código | Mensaje |
| --- | --- |
| `sede-requerida` | Elige la sede a la que lo reasignas. |
| `tipo-documento-requerido` | Elige un tipo de documento. |
| `sede-cerrada` | Esa sede está cerrada y no admite trabajadores nuevos. |
| `identificador-duplicado` | Ese identificador ya está en uso. |
| `documento-duplicado` | Ya existe un trabajador con ese documento. |
| `jornada-abierta` | Tiene una jornada abierta. Hasta que se haga su cierre, o lo fuerces desde la jornada, no se puede. |
| `motivo-requerido` | Escribe el motivo. |
| `error-inesperado` | No se pudo completar la acción. Vuelve a intentarlo. |

### Usuarios administradores — §8.1

| Código | Mensaje |
| --- | --- |
| `alcance-insuficiente` | Esta acción pertenece al administrador de la empresa. |
| `identificador-duplicado` | Ese identificador ya está en uso. |
| `no-es-el-principal` | Esta sección pertenece al administrador principal de tu empresa. |
| `es-el-principal` | Al administrador principal no lo desactiva nadie. Traspasa el papel antes, si hace falta. |
| `es-uno-mismo` | No puedes traspasarte el papel a ti mismo. |
| `destino-requerido` | Elige a quién le traspasas la administración. |
| `destino-no-activo` | Solo puedes traspasarlo a un administrador activo: uno desactivado dejaría a tu empresa sin nadie que administre usuarios. |
| `error-inesperado` | No se pudo completar la acción. Vuelve a intentarlo. |

### Perfil — §8.2

| Código | Mensaje |
| --- | --- |
| `actual-incorrecta` | La contraseña actual no es correcta. |
| `demasiado-corta` | La contraseña necesita al menos {min} caracteres. |
| `igual-a-la-actual` | La contraseña nueva tiene que ser distinta de la actual. |
| `no-coinciden` | Las dos contraseñas no son iguales. |
| `error-inesperado` | No se pudo guardar. Vuelve a intentarlo. |

### Monedas — §9

| Código | Mensaje |
| --- | --- |
| `moneda-requerida` | Elige la moneda que quieres añadir. |
| `sede-cerrada` | Esa sede está cerrada, así que no admite cambios en sus monedas. |
| `moneda-desconocida` | Esa moneda no está en el catálogo de PuntoCash. |
| `ya-en-la-lista` | {moneda} ya está en la lista de esta sede. |
| `no-en-la-lista` | {moneda} ya no estaba en la lista de esta sede. |
| `con-saldo` | {moneda} tiene saldo en {cajas}. Debe quedar en cero antes de retirarla de la lista. |
| `ultima-moneda` | Es la única moneda de una sede en funcionamiento: sin ella sus cajas no podrían manejar efectivo. Añade otra antes de retirar esta. |

### Tasas — §10

| Código | Mensaje |
| --- | --- |
| `sede-cerrada` | Esa sede está cerrada, así que no admite cambios en sus tasas. |
| `sin-servicio` | PuntoCash no ha habilitado el Cambio de moneda en esta sede. |
| `moneda-local` | El peso cubano es la moneda contra la que se cotiza todo: no tiene tasa propia. |
| `fuera-de-la-lista` | {moneda} no está en la lista de esta sede. Añádela en Monedas antes de fijar su tasa. |
| `sin-moneda-local` | El peso cubano no está en la lista de esta sede. Añádelo en Monedas antes de fijar ninguna tasa. |
| `sin-rango` | PuntoCash todavía no ha definido un rango para {moneda}. Solicítaselo para poder cotizarla. |
| `compra-fuera-de-rango` | La tasa de compra está fuera del rango de PuntoCash. |
| `venta-fuera-de-rango` | La tasa de venta está fuera del rango de PuntoCash. |
| `compra-mayor-que-venta` | La compra no puede ser mayor que la venta. |
| `rango-cambiado` | PuntoCash cambió el rango permitido. Revisa el valor. |
| `sin-tasa` | {moneda} ya no tenía tasa en esta sede. |

### Promociones — §11

| Código | Mensaje |
| --- | --- |
| `titulo-vacio` | Escribe el título. |
| `titulo-largo` | El título no puede pasar de {max} caracteres. |
| `texto-vacio` | Escribe el texto. |
| `texto-largo` | El texto no puede pasar de {max} caracteres. |
| `sin-sedes` | Elige al menos una sede. |
| `fecha-invalida` | Elige la fecha de inicio y la de fin. |
| `inicio-pasado` | La fecha de inicio no puede ser anterior a hoy. |
| `inicio-fijo` | Esta promoción ya está en pantalla: su fecha de inicio no se cambia. |
| `fin-pasado` | La fecha de fin no puede ser anterior a hoy. Para terminarla ya, retírala. |
| `fin-antes-de-inicio` | La fecha de fin no puede ser anterior a la de inicio. |
| `sede-cerrada` | Esa sede está cerrada y no admite promociones. |
| `imagen-invalida` | La imagen tiene que ser JPG, PNG o WebP. |
| `imagen-pesada` | La imagen pesa demasiado. Prueba con una más pequeña. |
| `vencida` | Esta promoción ya venció y no se puede cambiar. |
| `de-red` | Esta promoción la publica PuntoCash y no se puede cambiar. |
| `vencida-al-retirar` | Esta promoción ya venció. |
| `error-inesperado` | No se pudo guardar. Vuelve a intentarlo. |

### Jornadas — §12

| Código | Mensaje |
| --- | --- |
| `motivo-corto` | Escribe el motivo, con al menos {min} caracteres. |
| `ya-cerrada` | Esta jornada ya fue cerrada. |
| `error-inesperado` | No se pudo cerrar. Vuelve a intentarlo. |

### Aprobaciones — §14

| Código | Mensaje |
| --- | --- |
| `motivo-corto` | Escribe el motivo, con al menos {min} caracteres. |
| `ya-resuelta` | Esta solicitud ya fue resuelta. |
| `error-inesperado` | No se pudo resolver. Vuelve a intentarlo. |
