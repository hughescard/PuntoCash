# Ronda 02 · Acceso, selector de sede y preparación de Worker

**Revisión de clasificación · 29/10/2026:** QA-005 y QA-006 se contrastaron con Worker FRD 1.8, posterior al PDF inicial de ClickUp. Sus diferencias siguen observadas, pero el alcance encargado para Worker necesita confirmarse. ACC-006 y ACC-007 pasan de Fallido a En curso; no se trata de una corrección del producto. Ver [bases exactas y fuentes](../../BASES_DE_CLASIFICACION.md). Los recuentos del cuerpo describen el cierre original de la ronda; el libro contiene el estado actual.

Ejecución: **28/10/2026, America/Havana**, aproximadamente 22:59–23:20. Entorno: **staging.puntocash.co**. Ejecutor: Codex. Se mantienen fuera kiosco y Super Admin; pantalla informativa sigue incluida, sin probar en esta ronda.

## Resultado

Se completó **NAV-003: selector con ninguna, una y varias sedes**. Quedan registradas **ocho incidencias nuevas, QA-003 a QA-010**; QA-001 y QA-002 siguen abiertas. No se hicieron correcciones ni se consideran repruebas de un despliegue nuevo.

El libro acumula tres casos aprobados (dos preparativos y el selector), ocho fallidos, trece en curso, 393 pendientes y quince exclusiones. Un fallo detectado basta para marcar Fallido; eso no convierte las variantes todavía pendientes en pruebas ejecutadas.

## Qué funcionó

| Prueba | Resultado | Evidencia |
| --- | --- | --- |
| Cuenta sin sedes: Liudmila | Accede y ve Todavía no tienes sedes asignadas, con explicación de qué podrá hacer después. No muestra selector | `01_admin_sin_sedes.ax.txt`, `01_admin_sin_sedes_1440.png` |
| Cuenta no principal: Daniel | Accede con su nombre y tres sedes. Usuarios no aparece y el DOM contiene cero enlaces a /admin/users | `02_no_principal_menu.ax.txt`, `02_no_principal_menu_1440.png` |
| Daniel abre Usuarios por enlace directo | Ve No encontramos lo que buscabas; no aparecen usuarios ni datos de esa sección | `03_usuarios_no_principal.ax.txt`, `03_usuarios_no_principal.png` |
| Selector con varias sedes | Todas mis sedes es la selección inicial; lista CER, OBI y VED, con código/nombre, en orden | `16_selector_varias_sedes.ax.txt`, `16_selector_varias_sedes.png` |
| Selector con una sede: Idalmis | Se muestra CHB — PuntoCash Centro Habana como texto fijo | `17_selector_una_sede.ax.txt`, `17_selector_una_sede_1440.png` |
| Worker genérico | Sus credenciales llegan al código; el envío manual del código permite continuar hasta la pantalla de vinculación | `06_worker_codigo_inicial.ax.txt`, `13_worker_vinculacion.ax.txt` |
| Operaciones Worker sin vínculo | Muestra la vinculación pendiente; no se abrió el listado de operaciones | `15_worker_operaciones_sin_vinculo.ax.txt` |

**NAV-003 queda aprobado** porque se probaron sus tres variantes. La ausencia de datos en Usuarios es una comprobación visual; no demuestra por sí sola un estado HTTP 404. En NAV-008 siguen pendientes alta/ficha/edición por enlace directo y la comprobación HTTP. En HOM-005 todavía falta la sede sin situaciones de atención.

## Incidencias nuevas

### QA-003 · Media · Worker muestra un aviso general cuando faltan usuario y contraseña, sin señalar cada campo

**Qué pasa:** Solo aparece Completa tus credenciales para continuar. No hay un mensaje propio para Usuario ni para Contraseña. Además, el botón sigue seleccionado (QA-001).

**Qué debería pasar:** Mostrar un mensaje junto a cada campo vacío, para saber qué completar. FR-AUTH-2 y FR-A11Y-1.

**Cómo comprobarlo:** 1. Abrir el login de Worker. 2. Vaciar usuario y contraseña. 3. Pulsar Iniciar sesión.

Casos: ACC-002. Evidencia: [04_worker_login_vacio.ax.txt](04_worker_login_vacio.ax.txt), [04_worker_login_vacio.png](04_worker_login_vacio.png).

### QA-004 · Baja · La pantalla del código de Worker muestra auth.twoFactor.headline como parte del mensaje

**Qué pasa:** Se lee auth.twoFactor.headline para proteger tu jornada. La primera parte del mensaje no se tradujo. No impide introducir el código.

**Qué debería pasar:** Mostrar una frase completa para la persona, sin nombres internos de traducción. Referencia: acceso Worker de la entrega y Manual de Marca/UI.

**Cómo comprobarlo:** 1. Entrar en Worker con una cuenta válida. 2. Mirar el mensaje grande a la izquierda de la pantalla que pide el código.

Casos: V-W-02-1. Evidencia: [06_worker_codigo_inicial.ax.txt](06_worker_codigo_inicial.ax.txt), [06_worker_codigo_inicial.png](06_worker_codigo_inicial.png).

### QA-005 · Media · Worker obliga a esperar cinco minutos para reenviar el código, en vez de un minuto

**Qué pasa:** Con 2:58 de vigencia restante, el botón todavía estaba deshabilitado y decía Reenviar código en 2:58. Usa la espera de cinco minutos del código en lugar de la espera de un minuto para reenviar.

**Qué debería pasar:** Permitir el reenvío al cumplirse 60 segundos, mientras el código original mantiene sus cinco minutos de vigencia. FR-2FA-2 y FR-2FA-10 a FR-2FA-12.

**Cómo comprobarlo:** 1. Llegar al código de Worker. 2. Dejar pasar más de 60 segundos. 3. Revisar Reenviar código.

Casos: ACC-007, ACC-008. Evidencia: [06_worker_codigo_inicial.ax.txt](06_worker_codigo_inicial.ax.txt), [08_worker_reenvio_tras_60s.ax.txt](08_worker_reenvio_tras_60s.ax.txt), [08_worker_reenvio_tras_60s.png](08_worker_reenvio_tras_60s.png).

### QA-006 · Media · Al escribir las seis cifras en Worker, el código no se envía automáticamente

**Qué pasa:** La pantalla sigue esperando con las seis cifras escritas. Solo inicia Verificando código… después de pulsar Verificar y acceder. El mismo código permitió continuar al enviarlo manualmente.

**Qué debería pasar:** Al escribir la sexta cifra, verificar el código una sola vez sin exigir otro clic. Mantener el botón como alternativa. FR-2FA-7.

**Cómo comprobarlo:** 1. Llegar a la pantalla del código de Worker. 2. Escribir seis cifras. 3. Esperar sin pulsar Verificar y acceder.

Casos: ACC-006. Evidencia: [09_worker_seis_digitos_sin_envio.ax.txt](09_worker_seis_digitos_sin_envio.ax.txt), [09_worker_seis_digitos_sin_envio.png](09_worker_seis_digitos_sin_envio.png), [13_worker_vinculacion.ax.txt](13_worker_vinculacion.ax.txt).

### QA-007 · Alta · Worker pide usuario y código antes de indicar que el equipo todavía no está vinculado

**Qué pasa:** Primero muestra el login y permite verificar la cuenta. Después muestra Este equipo todavía no es la caja de ninguna sede. El orden está invertido. Las rutas internas observadas siguen bloqueadas; no se registraron operaciones.

**Qué debería pasar:** Mostrar primero Vincula este equipo como caja. Solo después de que el Admin lo vincule debe permitir el acceso del trabajador. FR-DEV-1 y FR-DEV-4, heredados en la integración de Admin.

**Cómo comprobarlo:** 1. Abrir Worker en un equipo que todavía no tiene caja. 2. Introducir usuario, contraseña y código. 3. Observar la pantalla que aparece después.

Casos: EQ-002. Evidencia: [04_worker_login_vacio.ax.txt](04_worker_login_vacio.ax.txt), [06_worker_codigo_inicial.ax.txt](06_worker_codigo_inicial.ax.txt), [13_worker_vinculacion.ax.txt](13_worker_vinculacion.ax.txt), [15_worker_operaciones_sin_vinculo.ax.txt](15_worker_operaciones_sin_vinculo.ax.txt).

### QA-008 · Media · Los títulos del login de Admin son más grandes que en la demo entregada

**Qué pasa:** A 1440, el mensaje izquierdo mide 36 px en staging y 28 px en la demo; Bienvenido mide 30 frente a 28 px. En 390 y 360, Bienvenido también mide 30 frente a 28 px. Se comprobaron mismo tamaño, zoom normal y campos vacíos; cambian los saltos de línea y la distribución.

**Qué debería pasar:** Conservar los tamaños y distribución entregados: mensaje izquierdo de 28 px y Bienvenido de 28 px. Referencia visual fija: demo f7accf9.

**Cómo comprobarlo:** 1. Abrir la demo de la entrega del 21/10 y staging con ambos campos vacíos. 2. Comparar a 1440×900. 3. Repetir a 390×844 y 360×800.

Casos: V-A-01-1, V-A-01-2. Evidencia: [07_demo_admin_login_1440.png](07_demo_admin_login_1440.png), [10_staging_admin_login_1440.png](10_staging_admin_login_1440.png), [11_medidas_login_1440.json](11_medidas_login_1440.json), [12_medidas_390.json](12_medidas_390.json), [14_medidas_360.json](14_medidas_360.json).

### QA-009 · Media · La vinculación muestra un código fijo con letras, en vez de seis cifras con renovación

**Qué pasa:** Muestra 4EB 448 y el texto Este código no cambia: es el de este equipo. No muestra el contador de renovación ni el identificador CAJ separado. No se comprobó la caducidad interna del servidor ni se intentó vincular una caja.

**Qué debería pasar:** Mostrar seis cifras agrupadas de tres en tres y el contador El código se renueva automáticamente en mm:ss. La validez especificada es de diez minutos. FR-DEV-2.

**Cómo comprobarlo:** 1. Abrir la pantalla Vincula este equipo como caja. 2. Revisar el código para escribir en Admin y su aviso de renovación.

Casos: EQ-002. Evidencia: [13_worker_vinculacion.ax.txt](13_worker_vinculacion.ax.txt), [13_worker_vinculacion.png](13_worker_vinculacion.png).

### QA-010 · Media · En móvil, el logo del login Admin pierde el texto CASA DE CAMBIO que tenía la demo

**Qué pasa:** La demo muestra CASA DE CAMBIO bajo el nombre; staging solo muestra PUNTO CASH y el símbolo. La diferencia se repite a 390 y 360 píxeles. En escritorio staging sí muestra ese texto.

**Qué debería pasar:** Conservar el logo de la entrega, incluido CASA DE CAMBIO debajo de PUNTO CASH. Referencia: demo fija f7accf9 en esos dos anchos.

**Cómo comprobarlo:** 1. Abrir el login Admin en la demo entregada y en staging. 2. Comparar la parte superior a 390×844 y a 360×800.

Casos: V-A-01-2. Evidencia: [12_demo_admin_login_390.png](12_demo_admin_login_390.png), [12_staging_admin_login_390.png](12_staging_admin_login_390.png), [14_demo_admin_login_360.png](14_demo_admin_login_360.png), [14_staging_admin_login_360.png](14_staging_admin_login_360.png).

## Referencia y condiciones de comparación

La demo se ejecutó desde una copia temporal del commit de la segunda entrega de Admin, **f7accf9**, sin usar los cambios actuales del directorio de trabajo. La aplicación de referencia pudo compilarse y abrirse; el primer intento con Turbopack no admitió el enlace de dependencias y se utilizó webpack. Esa limitación local no es una incidencia del producto.

Las puntas remotas de `dev` volvieron a coincidir con las copias locales: frontend **c811442284d1023241e488f141a40ce1263b668a** y backend **d2cd8cdccd4c65ce17fb364e3fc4141b451c80c5**. **El commit efectivamente desplegado sigue sin confirmarse.** Los resultados describen staging durante esta ronda.

Para el login de Admin se igualaron explícitamente los campos vacíos. En 1440 y 390 también coincide el campo seleccionado; en 360 el foco está en campos distintos, y esa diferencia no se usa como fallo: se comparan el logo y los tamaños de texto. Se midió el tamaño real de la página y de los títulos, además de guardar capturas:

| Estado vacío | Demo | Staging | Archivos |
| --- | --- | --- | --- |
| 1440×900, zoom normal | Mensaje izquierdo 28 px; Bienvenido 28 px | Mensaje izquierdo 36 px; Bienvenido 30 px | `07_demo_admin_login_1440.png`, `10_staging_admin_login_1440.png`, `11_medidas_login_1440.json` |
| 390×844 | Bienvenido 28 px | Bienvenido 30 px | `12_demo_admin_login_390.png`, `12_staging_admin_login_390.png`, `12_medidas_390.json` |
| 360×800 | Bienvenido 28 px | Bienvenido 30 px | `14_demo_admin_login_360.png`, `14_staging_admin_login_360.png`, `14_medidas_360.json` |

En los formularios vacíos a 390 y 360 no se observó desbordamiento horizontal: el ancho del documento coincide con el de la ventana. Esto no aprueba todos los estados móviles de la pantalla.

La primera limitación de capturas de la ronda anterior se explicó por el zoom y por pestañas con tamaños distintos. Para Admin se resolvió usando medidas comprobadas y la misma pestaña en las comparaciones móviles. **Las capturas Worker no tienen todavía el alto de aceptación de 900 px**; el manifiesto registra sus dimensiones reales. Los defectos de texto y comportamiento se comprobaron, pero no se afirma haber completado la comparación visual de Worker a 1440×900 y 1280×900.

Las reglas del código de acceso y la vinculación se contrastaron con **Worker 1.8 heredado por las entregas Admin**, junto con los requisitos de integración de Admin 8.0. No se atribuyen el segundo factor y la vinculación a los PDF iniciales de Worker si entraron en esa evolución. El original de ClickUp sigue siendo la referencia de la primera entrega; los cambios posteriores siguen separados.

## Límites de los resultados

- **Carlos no pudo avanzar con la contraseña declarada en el seed.** La cuenta genérica worker@demo.cash sí llegó al código con la suya. No se conoce si se cambió la contraseña o el estado de Carlos en staging; se registra como cuenta no disponible, sin inventar una causa ni abrir un defecto de credenciales.
- En Worker se vaciaron ambos campos explícitamente antes de registrar QA-003. Un primer envío previo al vaciado no se considera prueba del formulario vacío, porque el navegador podía haber autocompletado datos.
- El botón de reenvío se observó todavía deshabilitado cuando el código tenía 2:58 restantes, es decir, más de un minuto después de emitirse. No se confunde la validez del código (cinco minutos) con la espera de reenvío (sesenta segundos).
- La espera de reenvío incorrecta es observable incluso en el modo de desarrollo. La aceptación de códigos de prueba no certifica rechazo de códigos reales incorrectos, contenido del correo, hash, límites del servidor ni invalidación del anterior tras reenviar.
- En QA-007 se comprobó el orden de las pantallas y el bloqueo de Operaciones. **No se afirma que un equipo sin vincular pueda operar dinero**: las rutas internas observadas siguen mostrando la vinculación pendiente.
- En QA-009 se comprobó el código mostrado y lo que anuncia la pantalla. No se esperaron diez minutos ni se comprobó la caducidad interna del servidor. No se intentó canjear el código para afirmar que el flujo completo de vinculación falla.
- El paso del código de Worker muestra un botón habilitado aun estando vacío; esa variante no se envió de forma controlada en esta ronda y queda para ampliar la comprobación del estado del botón. No se añade un fallo independiente sin completar esa prueba.
- No se aprobaron las variantes de estado, envío, rechazo, mostrar contraseña y carga todavía no comparadas visualmente. Los casos UI marcados Fallido tienen una diferencia concreta confirmada; siguen pendientes sus demás variantes.

## Datos y sesiones al terminar

No se crearon ni editaron cajas, personas, equipos o configuraciones. No se vincularon dispositivos, no se cambiaron contraseñas y no se abrieron jornadas ni se registraron operaciones financieras. Solo se iniciaron/cerraron sesiones y se emitieron los códigos normales del acceso.

Las sesiones de Admin usadas se cerraron y la pestaña principal quedó en login. La pestaña Worker se conservó para continuar desde la vinculación pendiente. Antes de operar se debe verificar su identidad y caja, sin dar por probada la convivencia de sesiones. Se retiró el ajuste temporal de viewport y se repuso el zoom previo de la pestaña principal.

El libro conserva los resultados de la ronda 01 y añade las observaciones de la ronda 02, sus incidencias y evidencias. No se publicaron mensajes, issues ni comentarios en servicios externos. La referencia temporal local no modifica los repositorios reales ni el código de la demo en el directorio de trabajo.

Siguiente tramo: comprobar el canje de vinculación desde Admin con un puesto QA identificado y completar las variantes del acceso Worker que dependen de él. No se considerará listo para operar mientras la identidad, sede y caja no estén comprobadas.
