# Ronda 01 · Acceso de Admin de sede

Ejecución: **28/10/2026, America/Havana**, desde aproximadamente las 22:36. Entorno: **https://staging.puntocash.co/**. Ejecutor: Codex, navegador integrado IAB. Se revisaron credenciales, segundo factor y los dos primeros pasos de recuperación. El registro de estados es el libro de QA; esta nota conserva el detalle de la ronda.

## Versión y referencia

Se consultaron de nuevo las puntas remotas de `dev`; coinciden con las copias sincronizadas:

- Frontend: `c811442284d1023241e488f141a40ce1263b668a`.
- Backend: `d2cd8cdccd4c65ce17fb364e3fc4141b451c80c5`.

**No se confirmó el commit efectivamente desplegado.** Los resultados describen staging en el momento de la ejecución y no certifican que ese despliegue corresponda a esas puntas. No se ejecutaron despliegues ni seeds.

La referencia funcional permanece fijada a los PDF originales de Worker adjuntos a ClickUp y las dos entregas de Admin conservadas en `contexto_2026-10-28/fuentes`: primera entrega `388ba76` (FRD 6.0/PRD 1.0) y segunda `f7accf9` (FRD 8.0/PRD 1.18). Admin hereda el acceso de Worker 1.8; se consultó esa versión histórica para FR-AUTH-2, FR-AUTH-3 y FR-2FA-13, además de FR-AD-ACC-2. Los cambios posteriores permanecen separados. El manual de marca sigue siendo la autoridad visual.

## Resultados observados

| Comprobación de Admin | Resultado observado | Evidencia |
| --- | --- | --- |
| Login sin ambos campos, solo identificador y solo contraseña | Aparecen los mensajes, pero el botón sigue seleccionado. **Debería colocarse el cursor en el primer campo vacío** para corregirlo (FR-AUTH-2) | `01_login_vacio.ax.txt`, `01_login_vacio.png`, `02_sin_contrasena.png`, `03_sin_usuario.ax.txt`, `03_sin_usuario.png` |
| Contraseña incorrecta de Marta | Rechazo genérico, formulario vuelve a habilitarse. El foco queda en el área de página | `04_clave_incorrecta.ax.txt`, `04_clave_incorrecta.png` |
| Cuenta inexistente | Mismo rechazo genérico | `05_cuenta_inexistente.ax.txt` |
| Cuenta desactivada del seed (`yperez@orientedivisas.cu`) | Mismo rechazo genérico | `06_cuenta_desactivada.ax.txt` |
| Envío de credenciales | Se observó `Verificando…`; identificador, contraseña y envío deshabilitados durante la petición | Observación directa de esta ronda; falta la prueba controlada de red lenta/doble envío/transporte |
| Credenciales correctas de Marta | Lleva a `/admin/verification`, fuera del shell; correo enmascarado; contador de cinco minutos y reenvío con espera | `07_verificacion.ax.txt`, `07_verificacion.png` |
| Campo del código | Un control etiquetado; `autocomplete="one-time-code"`; seis casillas representadas | Observación del DOM de la interfaz y `07_verificacion.png` |
| Pegado `12 34-56` | Disparó `Verificando código…` sin pulsar el botón y terminó en Inicio | Observación directa y `08_inicio_admin.ax.txt`, `08_inicio_admin.png` |
| Sesión resultante | Marta Sánchez, Antilla Servicios Financieros, tres sedes y alcance Todas mis sedes | `08_inicio_admin.ax.txt`, `08_inicio_admin.png` |
| Cierre de sesión | Vuelve al login | `09_cierre_sesion.ax.txt` |
| Acceso directo a `/admin/home` después de salir | Vuelve al login sin mostrar el contenido autenticado | `10_inicio_sin_sesion.ax.txt` |
| Después de cerrar sesión, abrir el enlace de la pantalla que pide el código | **Devuelve al login sin explicar que ese intento de acceso ya terminó y hay que empezar de nuevo**, incumpliendo FR-2FA-13 | `11_verificacion_sin_reto.ax.txt`, `11_verificacion_sin_reto.png` |
| Recuperación sin identificador | Error visible; foco permanece en el botón | `12_recuperacion_vacia.ax.txt`, `12_recuperacion_vacia.png` |
| Recuperación para cuenta existente e inexistente | Ambas llegan al paso del código con el mismo aviso genérico, sin mostrar dirección ni correo enmascarado | `13_recuperacion_existente.ax.txt`, `13_recuperacion_existente.png`, `14_recuperacion_inexistente.ax.txt`, `14_recuperacion_inexistente.png` |
| Ayuda antes de recuperar | Remite al administrador principal para corregir el correo | `12_recuperacion_vacia.ax.txt` |

El rechazo compartido en los tres accesos dice: «Credenciales incorrectas», seguido de ayuda para revisar los datos y solicitar asistencia a PuntoCash. No se considera demostrada la protección contra enumeración a nivel HTTP ni de tiempos de respuesta: en esta ronda se comparó la interfaz.

## Incidencias

**QA-001 · Media · El login muestra el error, pero no coloca el cursor donde hay que corregir.**

1. Abrir `/admin/login` sin sesión.
2. Pulsar Iniciar sesión con ambos campos vacíos.
3. Repetir con solo identificador y con solo contraseña.
4. Probar una contraseña incorrecta.

**Qué pasa:** aparecen los mensajes de error, pero el botón Iniciar sesión sigue seleccionado cuando falta un dato. Tras una contraseña incorrecta tampoco se coloca el cursor en Usuario. La persona tiene que seleccionar el campo manualmente para corregirlo.

**Qué debería pasar:** si falta un dato, colocar el cursor en el primer campo vacío; si se rechaza la contraseña, volver al campo de usuario. Lo exigen FR-AUTH-2/3, heredados por FR-AD-ACC-2. La recuperación vacía mostró el mismo patrón. Casos relacionados: ACC-002 y ACC-003. Falta comprobar Worker.

**QA-002 · Media · La pantalla del código vuelve al login sin explicar que hay que empezar de nuevo.**

1. Cerrar sesión.
2. Abrir directamente `/admin/verification`.

**Qué pasa:** después de cerrar sesión, la persona abre el enlace de la pantalla que pide el código. Como ya no tiene un inicio de sesión pendiente, staging la manda directamente al login, sin explicar por qué.

**Qué debería pasar:** primero mostrar un aviso como «Este intento de acceso ya terminó; inicia sesión de nuevo», con una opción para volver al acceso. Lo exige FR-2FA-13, heredado por FR-AD-ACC-2. **El acceso sigue protegido; el fallo es la falta de explicación.** ACC-005 queda Fallido. Falta comprobar Worker.

Ambas incidencias están abiertas en la hoja Incidencias. No se publicaron en GitHub ni ClickUp, no se corrigió código y no hay repruebas todavía.

## Límites y continuación

- Staging aceptó `123456`, introducido con separadores. Esto es compatible con el modo de desarrollo documentado en el backend, pero **no acredita la configuración desplegada ni la recepción del correo**. No se aprobaron rechazo de código incorrecto, entrega real, límites de intentos ni invalidación del anterior tras reenvío.
- Los casos comunes a Admin y Worker conservan **En curso** cuando solo se revisó la parte de Admin. Encontrar un incumplimiento basta para marcar Fallido y describir qué variantes siguen pendientes.
- En el inicio observado había tres sedes, nueve cajas activas, cinco abiertas, cinco Workers en turno y cinco aprobaciones pendientes. Esto es una instantánea inicial, no una conciliación ni una validación de esas cifras.
- **La igualdad visual con la demo sigue pendiente.** Las capturas guardadas muestran el estado observado; no son una aprobación de los anchos de aceptación. El ajuste solicitado a 1440×900 no se reflejó de forma estable en las capturas: por ejemplo, verificación produjo 868×818 e Inicio 1309×818. Se registran sus dimensiones reales y se restableció el ajuste del navegador al terminar. Hay que resolver la captura a resoluciones estables antes de cerrar casos UI.
- La lectura de valores de campos mediante el DOM devuelve valores enmascarados. No se usó la longitud de esa lectura para aprobar ni denunciar el filtrado de caracteres del código.
- No se cambiaron contraseñas, permisos, equipos, configuraciones, saldos ni históricos. Solo se abrieron/cerraron sesiones y se solicitaron retos de acceso/recuperación; las recuperaciones se abandonaron antes de verificar códigos. El navegador terminó en el login.
- Kiosco y Super Admin siguen excluidos. Pantalla informativa incluida, aún sin probar.

La siguiente tanda continuará con las variantes pendientes del acceso, la reproducción visual contra la demo fijada y la preparación del puesto Worker. La apertura, operación financiera y administración de datos pertenecen a bloques posteriores.

## Registro de trabajo

Las evidencias de esta ronda se conservan en esta carpeta; los árboles accesibles acompañan las capturas. Aprobado exige fecha y evidencia; Fallido enlaza incidencia; un caso parcial no se cierra. Se mantienen los IDs originales y las 15 exclusiones de kiosco. No se sobrescriben resultados de rondas posteriores al repetir un caso.
