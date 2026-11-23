# Reprueba de los casos ya ejecutados — 29/10/2026

Se repitieron las variantes previamente ejecutadas de **51 casos** y se revisaron las **25 incidencias**. Las variantes que estaban pendientes siguen pendientes. No se añadieron casos de Trabajadores, kiosco ni Super Admin.

**Límite:** staging mostró identificadores de despliegue distintos durante la pasada y dev remoto volvió a avanzar. Estos resultados describen observaciones individuales con evidencia; no certifican una regresión completa sobre un único commit. Véase [versión y límites](VERSION_Y_LIMITES.md).

Se observaron corregidos QA-004, QA-011, QA-020, QA-021 y QA-025. Quedan listas para reprueba y sin cierre definitivo. Las otras 20 conservan sus límites: QA-005 y QA-006 tienen alcance Worker por confirmar; QA-022 se reproduce en datos históricos, sin demostrar que una apertura nueva siga generándolo.

El seguimiento queda con 5 casos aprobados, 18 fallidos, 27 en curso y 1 bloqueado entre los 51 iniciados. Otros 366 siguen pendientes y 15 fuera de alcance. Los aprobados individuales no sustituyen la certificación de versión pendiente.

## Datos de prueba y estado final

Se creó QA-RDEV731-20261029 en Obispo (e3b2b011-a7bb-42c0-b1cb-0a8c773db6ef), se comprobó duplicado, retirada, reactivación y retirada final. Quedó retirada con motivo «Reprueba dev731 finalizada: caja QA sin equipo ni operaciones.», sin equipo, jornada ni movimientos. La caja anterior QA-20261029-01 no se alteró. No se ejecutaron aprobaciones, desvinculaciones ni operaciones financieras.

## Siguiente pasada

La usuaria aclaró que no controla los despliegues; no se asume ni se exige una pausa. Se repite el conjunto completo de 51 casos por bloques desde una carga fresca, registrando el despliegue al inicio y al final. Las correcciones se confirmarán mediante nuevas pruebas, con su versión observada y sin atribuir un SHA no demostrado. Un cambio de despliegue deja pendientes las comprobaciones afectadas.

## Incidencias revisadas

### QA-001 — Persiste

Admin: ambos vacíos, un campo vacío y rechazo genérico conservan foco fuera del primer campo a corregir. Worker se repite después.
Worker vacío sigue dejando foco en botón, se añade al Admin ya repetido.

Evidencia: [50_admin_ambos_vacios.ax.txt](50_admin_ambos_vacios.ax.txt), [51_admin_sin_clave.ax.txt](51_admin_sin_clave.ax.txt), [52_admin_sin_usuario.ax.txt](52_admin_sin_usuario.ax.txt), [53_admin_clave_incorrecta.ax.txt](53_admin_clave_incorrecta.ax.txt), [95_worker_vacio.ax.txt](95_worker_vacio.ax.txt)

### QA-002 — Persiste

Sin intento pendiente vuelve al login sin explicación.

Evidencia: [48_verificacion_sin_reto.ax.txt](48_verificacion_sin_reto.ax.txt)

### QA-003 — Persiste

Worker ambos campos vacíos sigue con aviso general sin errores por campo.

Evidencia: [95_worker_vacio.ax.txt](95_worker_vacio.ax.txt)

### QA-004 — Corregido

A 1440×900 ya no aparece auth.twoFactor.headline; ahora Un paso más para proteger tu jornada.

Evidencia: [98_worker_codigo_escritorio.ax.txt](98_worker_codigo_escritorio.ax.txt), [98_worker_codigo_escritorio.png](98_worker_codigo_escritorio.png)

### QA-005 — Observación persiste; alcance por confirmar

Tras más de 60 s continúa deshabilitado Reenviar mientras corre vigencia de cinco minutos. Se mantiene alcance Worker por confirmar.

Evidencia: [100_worker_reenvio_tras_60.ax.txt](100_worker_reenvio_tras_60.ax.txt), [100_worker_reenvio_tras_60.png](100_worker_reenvio_tras_60.png)

### QA-006 — Observación persiste; alcance por confirmar

Worker sigue sin enviar al completar seis cifras. Se preserva como diferencia frente a FRD posterior, no como incumplimiento confirmado del PDF inicial.

Evidencia: [99_worker_seis_digitos.ax.txt](99_worker_seis_digitos.ax.txt)

### QA-007 — Persiste

Terminal sin vínculo sigue permitiendo credenciales y código antes de mostrar la vinculación. Internas bloqueadas por gate.

Evidencia: [98_worker_codigo_escritorio.ax.txt](98_worker_codigo_escritorio.ax.txt), [101_worker_tras_verificar.ax.txt](101_worker_tras_verificar.ax.txt), [102_worker_operaciones_sin_vinculo.ax.txt](102_worker_operaciones_sin_vinculo.ax.txt)

### QA-008 — Persiste

Comparación nueva con demo fija f7accf9 a 1440/390/360: títulos staging 36/30 px frente 28/28; composición sigue distinta.

Evidencia: [89_medidas_visuales.json](89_medidas_visuales.json), [89_demo_1440.png](89_demo_1440.png), [90_staging_1440.png](90_staging_1440.png), [91_demo_390.png](91_demo_390.png), [92_staging_390.png](92_staging_390.png), [93_demo_360.png](93_demo_360.png), [94_staging_360.png](94_staging_360.png)

### QA-009 — Persiste

Worker recargado muestra 4EB448 fijo con letras, sin renovación ni caducidad visible.

Evidencia: [08_worker_gate.ax.txt](08_worker_gate.ax.txt)

### QA-010 — Persiste

A 390 y 360 staging sigue sin CASA DE CAMBIO bajo logo, presente en demo.

Evidencia: [91_demo_390.png](91_demo_390.png), [92_staging_390.png](92_staging_390.png), [93_demo_360.png](93_demo_360.png), [94_staging_360.png](94_staging_360.png)

### QA-011 — Corregido

Ahora nombra Carlos Díaz, fecha de apertura, que la jornada permanece y ofrece enlace a esa jornada.

Evidencia: [02_desvincular_abierta.ax.txt](02_desvincular_abierta.ax.txt)

### QA-012 — Persiste parcialmente

000000 sigue dando paso al formulario; no se muestra caducidad. Ahora se muestra Equipo de caja sin selector de clase.

Evidencia: [05_codigo_cero_y_premarca.ax.txt](05_codigo_cero_y_premarca.ax.txt)

### QA-013 — Persiste

Equipos sigue ordenando vinculadas Obispo antes de Cerro.

Evidencia: [01_equipos.ax.txt](01_equipos.ax.txt)

### QA-014 — Persiste

Sin caja libre sigue sin aviso específico ni enlace a crear; al enviar sin caja solo pide elegirla.

Evidencia: [06_cerro_sin_libres.ax.txt](06_cerro_sin_libres.ax.txt)

### QA-015 — Persiste

Se sigue mostrando solo equipo, sin jornada ni enlaces de solución; motivo deshabilitado visible.

Evidencia: [11_retirar_abierta.ax.txt](11_retirar_abierta.ax.txt), [12_retirar_solo_equipo.ax.txt](12_retirar_solo_equipo.ax.txt)

### QA-016 — Persiste

Alta en Cajas sigue mostrando fecha sin autor.

Evidencia: [10_cajas.ax.txt](10_cajas.ax.txt)

### QA-017 — Persiste

Éxito de alta sigue enlazando al listado /admin/devices, no a vincular.

Evidencia: [13_caja_creada.ax.txt](13_caja_creada.ax.txt)

### QA-018 — Persiste

Repetida pérdida de Estado Cierres forzados al recargar Jornadas. Resto de secciones en reprueba.
Operaciones repite pérdida de Servicio Remesas al volver del detalle.

Evidencia: [25_forzadas_antes_recarga.ax.txt](25_forzadas_antes_recarga.ax.txt), [26_forzadas_recarga_pierde.ax.txt](26_forzadas_recarga_pierde.ax.txt), [84_remesas.ax.txt](84_remesas.ax.txt), [87_remesas_regreso_pierde.ax.txt](87_remesas_regreso_pierde.ax.txt)

### QA-019 — Persiste

La tarjeta sigue Pendiente de conciliar sin aviso superior específico. Aviso de abiertas antiguas sí está.

Evidencia: [23_jornadas.ax.txt](23_jornadas.ax.txt)

### QA-020 — Corregido

Código de operación ahora enlaza desde el libro; PC-261023-000048 aparece como enlace en sus tramos.

Evidencia: [30_jornada_cerrada_detalle.ax.txt](30_jornada_cerrada_detalle.ax.txt), [31_salidas_eur.ax.txt](31_salidas_eur.ax.txt)

### QA-021 — Corregido

Repetidas solicitudes de cierre +10 y ajuste -5: ambas abren el movimiento concreto, no el libro.

Evidencia: [41_cierre_pendiente.ax.txt](41_cierre_pendiente.ax.txt), [42_movimiento_desde_solicitud.ax.txt](42_movimiento_desde_solicitud.ax.txt), [43_ajuste_efectivo_solicitud.ax.txt](43_ajuste_efectivo_solicitud.ax.txt), [44_movimiento_ajuste_efectivo.ax.txt](44_movimiento_ajuste_efectivo.ax.txt)

### QA-022 — Persiste en histórico

La jornada sigue mostrando Faltante en la apertura -2000 como movimiento. No se reproduce apertura nueva; se mantiene la limitación fixture/histórico.

Evidencia: [40_apertura_historico.ax.txt](40_apertura_historico.ax.txt)

### QA-023 — Persiste

Ambos diálogos repiten ausencia de consecuencias; validación 9/10 sigue correcta y ambos cancelados.

Evidencia: [45_aprobar_dialogo.ax.txt](45_aprobar_dialogo.ax.txt), [46_rechazar_dialogo.ax.txt](46_rechazar_dialogo.ax.txt), [47_validacion_motivos.json](47_validacion_motivos.json)

### QA-024 — Persiste

Detalle del ajuste +10 EUR revisado frente a la solicitud pendiente conocida.

Evidencia: [35_ajuste_cierre.ax.txt](35_ajuste_cierre.ax.txt)

### QA-025 — Corregido

Botón Quitar los filtros ahora aparece; probado limpia Tipo/Caja/Trabajador y restaura seis pendientes.

Evidencia: [71_aprobaciones_vacio.ax.txt](71_aprobaciones_vacio.ax.txt), [72_aprobaciones_filtros_limpios.ax.txt](72_aprobaciones_filtros_limpios.ax.txt)

## Casos repetidos

### PRE-001 — Identificar la versión desplegada

Anterior: En curso. Último resultado individual: Bloqueado.

Dev FE 7314956 y BE d2cd8cd comprobados; recursos de staging guardados. SHA desplegado no confirmado, no se equipara a dev. Al finalizar, dev remoto avanzó a 7549868 y los recursos de navegador muestran dos identificadores de despliegue distintos. Vercel no accesible en la conexión (404, sin equipos). Se necesita versión fija/commit o ventana sin despliegues para consolidar la regresión. No se actualizó la copia real a 7549868 durante esta pasada.

Evidencia: [version_recursos_inicial.json](version_recursos_inicial.json), [ALCANCE.json](ALCANCE.json), [VERSION_Y_LIMITES.md](VERSION_Y_LIMITES.md)

### PRE-002 — Fijar referencia funcional y visual

Anterior: Aprobado. Último resultado individual: Aprobado.

Nueve fuentes conservadas verificadas por SHA256 sin cambios. Demo fija f7accf9 comparada otra vez con staging a 1440/390/360. No se cambió base funcional por actualizar dev.

Evidencia: [88_fuentes_verificadas.json](88_fuentes_verificadas.json), [89_medidas_visuales.json](89_medidas_visuales.json)

### PRE-003 — Preparar cuentas y dos puestos independientes

Anterior: En curso. Último resultado individual: En curso.

Repetidos Marta, Daniel, Idalmis, Liudmila y Worker genérico; Carlos rechaza seed igual que antes. Sin dos puestos Worker vinculados ni pruebas de otra empresa.

Evidencia: [60_daniel_inicio.ax.txt](60_daniel_inicio.ax.txt), [65_idalmis_inicio.ax.txt](65_idalmis_inicio.ax.txt), [67_inicio_sin_sedes.ax.txt](67_inicio_sin_sedes.ax.txt), [68_marta_inicio.ax.txt](68_marta_inicio.ax.txt), [96_carlos_rechazo.ax.txt](96_carlos_rechazo.ax.txt), [98_worker_codigo_escritorio.ax.txt](98_worker_codigo_escritorio.ax.txt)

### PRE-004 — Inventariar datos y saldos antes de operar

Anterior: En curso. Último resultado individual: En curso.

Inventario repetido en Inicio: 3 sedes, 9 cajas activas, 5 abiertas, 5 trabajadores en turno, 6 pendientes, 1 operación hoy. No conciliación por caja/proveedor. Caja QA propia creada y finalmente retirada.

Evidencia: [69_marta_inicio_inventario.ax.txt](69_marta_inicio_inventario.ax.txt), [21_caja_final_retirada.ax.txt](21_caja_final_retirada.ax.txt)

### PRE-006 — Comprobar si el segundo factor es real en staging

Anterior: En curso. Último resultado individual: En curso.

Códigos de prueba 123456/987654/654321 vuelven a permitir acceso Admin en cuentas comprobadas. APP_MODE real y entrega de correo no confirmados; no se aprueban límites por inferencia. Worker manual por terminar.
Worker acepta 123456 por verificación manual y llega al gate; sin confirmar APP_MODE ni recepción real del correo.

Evidencia: [59_daniel_verificacion.ax.txt](59_daniel_verificacion.ax.txt), [60_daniel_inicio.ax.txt](60_daniel_inicio.ax.txt), [65_idalmis_inicio.ax.txt](65_idalmis_inicio.ax.txt), [67_inicio_sin_sedes.ax.txt](67_inicio_sin_sedes.ax.txt), [101_worker_tras_verificar.ax.txt](101_worker_tras_verificar.ax.txt)

### PRE-007 — Fijar reglas de trabajo y registro

Anterior: Aprobado. Último resultado individual: Aprobado.

Revisadas reglas de clasificación y estados; 51 IDs conservados, fuentes fijas, evidencia nueva y comparación antes/después. Sin borrar resultados ni cerrar por código. Kioscos y Super Admin siguen fuera.

Evidencia: [ALCANCE.json](ALCANCE.json), [88_fuentes_verificadas.json](88_fuentes_verificadas.json)

### ACC-001 — Acceder con usuario y con correo

Anterior: En curso. Último resultado individual: En curso.

Repetidos accesos por correo de Marta/Daniel/Idalmis/Liudmila y Worker genérico con código manual hasta gate. Identificador alternativo y puesto vinculado siguen pendientes.

Evidencia: [60_daniel_inicio.ax.txt](60_daniel_inicio.ax.txt), [65_idalmis_inicio.ax.txt](65_idalmis_inicio.ax.txt), [67_inicio_sin_sedes.ax.txt](67_inicio_sin_sedes.ax.txt), [68_marta_inicio.ax.txt](68_marta_inicio.ax.txt), [101_worker_tras_verificar.ax.txt](101_worker_tras_verificar.ax.txt)

### ACC-002 — Validar campos obligatorios del acceso

Anterior: Fallido. Último resultado individual: Fallido.

Repetidos tres vacíos Admin y ambos vacíos Worker: foco y mensajes Worker siguen fallando QA-001/003.

Evidencia: [50_admin_ambos_vacios.ax.txt](50_admin_ambos_vacios.ax.txt), [51_admin_sin_clave.ax.txt](51_admin_sin_clave.ax.txt), [52_admin_sin_usuario.ax.txt](52_admin_sin_usuario.ax.txt), [95_worker_vacio.ax.txt](95_worker_vacio.ax.txt)

### ACC-003 — Distinguir rechazo de Admin y rechazo de Worker

Anterior: En curso. Último resultado individual: En curso.

Repetidos rechazos Admin clave errónea/inexistente/desactivada con mismo mensaje y Worker Carlos con seed rechazado. No se infiere fallo de contraseña del seed. Otras variantes Worker siguen pendientes.

Evidencia: [53_admin_clave_incorrecta.ax.txt](53_admin_clave_incorrecta.ax.txt), [54_admin_inexistente.ax.txt](54_admin_inexistente.ax.txt), [55_admin_desactivada.ax.txt](55_admin_desactivada.ax.txt), [96_carlos_rechazo.ax.txt](96_carlos_rechazo.ax.txt)

### ACC-004 — Bloquear envíos repetidos y conservar errores de red

Anterior: En curso. Último resultado individual: En curso.

Repetido estado Verificando con campos y envío deshabilitados en Admin. No se repiten dobles envíos/red lenta que nunca se habían ejecutado.

Evidencia: [65_idalmis_enviando.ax.txt](65_idalmis_enviando.ax.txt), [66_liudmila_enviando.ax.txt](66_liudmila_enviando.ax.txt), [68_marta_enviando.ax.txt](68_marta_enviando.ax.txt)

### ACC-005 — Verificación fuera de la estructura autenticada

Anterior: Fallido. Último resultado individual: Fallido.

Repetida verificación sin reto: acceso protegido, aviso explicativo ausente. Reto válido se repetirá con login.
Con intento válido Admin muestra código fuera del shell y correo enmascarado; sin intento QA-002 persiste.

Evidencia: [48_verificacion_sin_reto.ax.txt](48_verificacion_sin_reto.ax.txt), [59_daniel_verificacion.ax.txt](59_daniel_verificacion.ax.txt)

### ACC-006 — Escribir, pegar y borrar el código

Anterior: En curso. Último resultado individual: En curso.

Admin one-time-code y pegado 12 34-56 vuelven a enviar solos. Worker seis cifras sigue esperando botón; manual avanza. QA-006 alcance pendiente, no se convierte en fallo confirmado.

Evidencia: [59_daniel_verificacion.ax.txt](59_daniel_verificacion.ax.txt), [60_daniel_inicio.ax.txt](60_daniel_inicio.ax.txt), [99_worker_seis_digitos.ax.txt](99_worker_seis_digitos.ax.txt), [101_worker_tras_verificar.ax.txt](101_worker_tras_verificar.ax.txt)

### ACC-007 — Comprobar vigencia y límites del reto

Anterior: En curso. Último resultado individual: En curso.

Repetido contador cinco minutos y espera Worker mayor de 60 s sin reenvío habilitado. QA-005 alcance por confirmar. Caducidad servidor/límites no probados antes siguen pendientes.

Evidencia: [98_worker_codigo_escritorio.ax.txt](98_worker_codigo_escritorio.ax.txt), [100_worker_reenvio_tras_60.ax.txt](100_worker_reenvio_tras_60.ax.txt)

### ACC-008 — Reenviar código e invalidar el anterior

Anterior: En curso. Último resultado individual: En curso.

Repetida espera de reenvío Worker; invalidación del código anterior y agotamiento no se probaron antes ni ahora.

Evidencia: [100_worker_reenvio_tras_60.ax.txt](100_worker_reenvio_tras_60.ax.txt)

### ACC-016 — Cerrar sesión y acceder por URL directa

Anterior: En curso. Último resultado individual: En curso.

Cerrar sesión vuelve a login; acceso directo a home sin sesión volvió a login (49). No se prueba todavía reinicio/Atrás/Worker.

Evidencia: [64_cierre_sesion.ax.txt](64_cierre_sesion.ax.txt), [49_home_sin_sesion.ax.txt](49_home_sin_sesion.ax.txt)

### REC-001 — Recuperar acceso sin revelar la cuenta

Anterior: En curso. Último resultado individual: En curso.

Repetidos vacío, existente e inexistente: respuesta genérica sin correo; no se verifica código ni se cambia contraseña. HTTP/Worker siguen pendientes.

Evidencia: [56_recuperacion_vacia_y_ayuda.ax.txt](56_recuperacion_vacia_y_ayuda.ax.txt), [57_recuperacion_existente.ax.txt](57_recuperacion_existente.ax.txt), [58_recuperacion_inexistente.ax.txt](58_recuperacion_inexistente.ax.txt)

### REC-005 — Ayuda cuando no se puede recibir el correo

Anterior: En curso. Último resultado individual: En curso.

Ayuda previa sigue remitiendo al principal para corregir correo. Otras ayudas no ejecutadas antes siguen pendientes.

Evidencia: [56_recuperacion_vacia_y_ayuda.ax.txt](56_recuperacion_vacia_y_ayuda.ax.txt)

### NAV-003 — Selector con varias, una y ninguna sede

Anterior: Aprobado. Último resultado individual: Aprobado.

Repetidos tres escenarios: Daniel opciones CER/OBI/VED con Todas inicial; Idalmis una sede fija CHB; Liudmila ninguna y sin selector.

Evidencia: [61_selector_varias.ax.txt](61_selector_varias.ax.txt), [65_idalmis_inicio.ax.txt](65_idalmis_inicio.ax.txt), [67_inicio_sin_sedes.ax.txt](67_inicio_sin_sedes.ax.txt)

### NAV-005 — Conservar filtros al cambiar de sede

Anterior: Fallido. Último resultado individual: Fallido.

Repetidas todas las variantes antes ejecutadas en Jornadas y Operaciones: cambio de sede correcto, persistencia/retorno siguen fallando QA-018.

Evidencia: [25_forzadas_antes_recarga.ax.txt](25_forzadas_antes_recarga.ax.txt), [26_forzadas_recarga_pierde.ax.txt](26_forzadas_recarga_pierde.ax.txt), [28_cambio_sede.ax.txt](28_cambio_sede.ax.txt), [84_remesas.ax.txt](84_remesas.ax.txt), [87_remesas_regreso_pierde.ax.txt](87_remesas_regreso_pierde.ax.txt)

### NAV-008 — No principal sin sección Usuarios

Anterior: En curso. Último resultado individual: En curso.

Daniel sin Usuarios en menú/DOM (0 enlaces), URL directa sin datos muestra no encontrado. HTTP/otras rutas siguen pendientes.

Evidencia: [62_no_principal_menu.ax.txt](62_no_principal_menu.ax.txt), [63_no_principal_usuarios_directo.ax.txt](63_no_principal_usuarios_directo.ax.txt)

### HOM-005 — Inicio sin incidencias y sin sedes

Anterior: En curso. Último resultado individual: En curso.

Liudmila sin sedes sigue mostrando estado informativo sin selector y sin datos ficticios. Escenario con sedes sin incidencias sigue pendiente.

Evidencia: [67_inicio_sin_sedes.ax.txt](67_inicio_sin_sedes.ax.txt)

### CAJ-001 — Listado por sede y estados vacíos

Anterior: Fallido. Último resultado individual: Fallido.

Listado repetido con activa/retirada, motivo, recuentos e inclusión/exclusión de Equipos. Alta sin autor persiste QA-016.

Evidencia: [10_cajas.ax.txt](10_cajas.ax.txt), [21_caja_final_retirada.ax.txt](21_caja_final_retirada.ax.txt), [22_equipos_caja_retirada_fuera.ax.txt](22_equipos_caja_retirada_fuera.ax.txt)

### CAJ-002 — Crear caja y acceder a vinculación

Anterior: Fallido. Último resultado individual: Fallido.

Alta nueva normaliza espacios, activa sin equipo/jornada e incorpora Equipos. Siguen faltando autor y acceso directo a vincular, QA-016/017. Caja nueva finalmente retirada.

Evidencia: [13_caja_creada.ax.txt](13_caja_creada.ax.txt), [14_caja_nueva_en_equipos.ax.txt](14_caja_nueva_en_equipos.ax.txt)

### CAJ-004 — Rechazar alta inválida o duplicada

Anterior: En curso. Último resultado individual: En curso.

Duplicado con mayúsculas distintas rechazado y conserva datos. Otras variantes no ejecutadas antes siguen pendientes.

Evidencia: [15_duplicado.ax.txt](15_duplicado.ax.txt)

### CAJ-005 — Bloquear retirada por jornada o vínculo

Anterior: Fallido. Último resultado individual: Fallido.

Ambos bloqueos repetidos y cancelados. QA-015 persiste.

Evidencia: [11_retirar_abierta.ax.txt](11_retirar_abierta.ax.txt), [12_retirar_solo_equipo.ax.txt](12_retirar_solo_equipo.ax.txt)

### CAJ-007 — Retirar caja y conservar histórico

Anterior: En curso. Último resultado individual: En curso.

Repetidos rechazo de 9 caracteres, retirada con 10, motivo guardado y retirada final QA. Sin histórico financiero previo para comprobar conservación de movimientos.

Evidencia: [16_motivo_corto.ax.txt](16_motivo_corto.ax.txt), [17_caja_retirada.ax.txt](17_caja_retirada.ax.txt), [21_caja_final_retirada.ax.txt](21_caja_final_retirada.ax.txt)

### CAJ-008 — Reactivar caja retirada

Anterior: En curso. Último resultado individual: En curso.

Reactivación conserva ausencia de equipo, vuelve activa y reaparece en Equipos. Sin vínculo previo ni movimientos. Finalmente retirada.

Evidencia: [18_aviso_reactivar.ax.txt](18_aviso_reactivar.ax.txt), [19_caja_reactivada.ax.txt](19_caja_reactivada.ax.txt), [20_reactivada_en_equipos.ax.txt](20_reactivada_en_equipos.ax.txt)

### EQ-001 — Listado de equipos de caja

Anterior: Fallido. Último resultado individual: Fallido.

Repetido listado 9 activas/3 sin equipo, Obispo 4/2. Orden QA-013 persiste. Kioscos excluidos.

Evidencia: [01_equipos.ax.txt](01_equipos.ax.txt), [04_equipos_filtro_obispo.ax.txt](04_equipos_filtro_obispo.ax.txt)

### EQ-002 — Terminal sin vínculo

Anterior: Fallido. Último resultado individual: Fallido.

Repetido login/código antes de gate y acceso interno /operations bloqueado; código fijo con letras. QA-007/009 persisten, no se vincula ningún equipo.

Evidencia: [95_worker_vacio.ax.txt](95_worker_vacio.ax.txt), [98_worker_codigo_escritorio.ax.txt](98_worker_codigo_escritorio.ax.txt), [101_worker_tras_verificar.ax.txt](101_worker_tras_verificar.ax.txt), [102_worker_operaciones_sin_vinculo.ax.txt](102_worker_operaciones_sin_vinculo.ax.txt)

### EQ-003 — Identificar por código y por QR

Anterior: Fallido. Último resultado individual: Fallido.

Código Worker aceptado; paso con clase fija Equipo de caja, sin caducidad ni CAJ. QR/cámara no ejecutados antes ni ahora. QA-012 persiste parcialmente.

Evidencia: [09_codigo_worker_identificado.ax.txt](09_codigo_worker_identificado.ax.txt)

### EQ-004 — Código incorrecto, caducado y reutilizado

Anterior: Fallido. Último resultado individual: Fallido.

000000 aceptado; 12345 rechazado y conservado. Caducado/reutilizado no ejecutados.

Evidencia: [05_codigo_cero_y_premarca.ax.txt](05_codigo_cero_y_premarca.ax.txt), [07_codigo_incompleto.ax.txt](07_codigo_incompleto.ax.txt)

### EQ-005 — Elegir sede y caja de equipo de caja

Anterior: Fallido. Último resultado individual: Fallido.

Premarca Caja 02/Obispo y bloquea ocupadas; cambiar sede limpia caja. Persiste falta de alternativa en Cerro.

Evidencia: [05_codigo_cero_y_premarca.ax.txt](05_codigo_cero_y_premarca.ax.txt), [06_cerro_sin_libres.ax.txt](06_cerro_sin_libres.ax.txt)

### EQ-008 — Desvincular caja sin jornada

Anterior: En curso. Último resultado individual: En curso.

Aviso sin jornada y Cancelar repetidos; conserva vínculo. Desvinculación efectiva sigue sin ejecutar.

Evidencia: [03_desvincular_cerrada.ax.txt](03_desvincular_cerrada.ax.txt)

### EQ-009 — Desvincular caja con jornada abierta

Anterior: Fallido. Último resultado individual: En curso.

QA-011 corregido en aviso; cancelado sin tocar vínculo. No se ejecuta revocación real.

Evidencia: [02_desvincular_abierta.ax.txt](02_desvincular_abierta.ax.txt)

### JOR-001 — Listado, orden y recuento de jornadas

Anterior: En curso. Último resultado individual: En curso.

Listado repetido: total 10, Obispo 3; abiertas primero, cierre en día posterior con fecha y EUR separado. No se valida conteo financiero exhaustivo.

Evidencia: [23_jornadas.ax.txt](23_jornadas.ax.txt), [75_jornadas_obispo.ax.txt](75_jornadas_obispo.ax.txt)

### JOR-002 — Todos los filtros de jornadas

Anterior: En curso. Último resultado individual: En curso.

Repetidos estado/caja/diferencia, vacío y limpieza, cambio de sede limpia persona/caja y conserva generales. Desde/Hasta hoy mantiene cinco abiertas previas. Faltan variantes ya pendientes.

Evidencia: [24_jornadas_vacio_filtros.ax.txt](24_jornadas_vacio_filtros.ax.txt), [27_cerradas_con_diferencia.ax.txt](27_cerradas_con_diferencia.ax.txt), [28_cambio_sede.ax.txt](28_cambio_sede.ax.txt), [29_jornadas_solo_hoy.ax.txt](29_jornadas_solo_hoy.ax.txt)

### JOR-003 — Avisos de jornadas anteriores y forzadas sin conciliar

Anterior: Fallido. Último resultado individual: Fallido.

Avisos de abiertas antiguas correctos por alcance; falta aviso de cierre forzado pendiente, QA-019 persiste.

Evidencia: [23_jornadas.ax.txt](23_jornadas.ax.txt), [28_cambio_sede.ax.txt](28_cambio_sede.ax.txt)

### JOR-004 — Abrir detalle y enlaces

Anterior: En curso. Último resultado individual: En curso.

Detalle cerrado y recorrido movimiento→operación→misma jornada repetidos; cabecera, equipo y cifras coherentes. Fila completa/teclado siguen pendientes previos.

Evidencia: [30_jornada_cerrada_detalle.ax.txt](30_jornada_cerrada_detalle.ax.txt), [34_regreso_jornada.ax.txt](34_regreso_jornada.ax.txt)

### JOR-005 — Libro, filtros y detalle de movimiento

Anterior: Fallido. Último resultado individual: Fallido.

Repetidos filtros salidas/EUR, detalle 120 y ajuste +10. QA-020 corregido; QA-024 persiste: ajuste sin estado/enlace de aprobación.

Evidencia: [31_salidas_eur.ax.txt](31_salidas_eur.ax.txt), [32_movimiento_120eur.ax.txt](32_movimiento_120eur.ax.txt), [35_ajuste_cierre.ax.txt](35_ajuste_cierre.ax.txt)

### OPS-001 — Listado de operaciones y expansión

Anterior: En curso. Último resultado individual: En curso.

Paginación 50→51 únicos sin cambios de orden; Remesas tres. No completadas siguen sin probar como antes.

Evidencia: [76_operaciones_inicial.ax.txt](76_operaciones_inicial.ax.txt), [77_paginacion.json](77_paginacion.json), [84_remesas.ax.txt](84_remesas.ax.txt)

### OPS-002 — Filtros y búsqueda de cualquier fecha

Anterior: Fallido. Último resultado individual: Fallido.

Repetidos fecha hoy, estado Cancelada, búsqueda código/nombre/documento, mensaje de ignorar filtros, borrado y limpieza. QA-018 sigue en retorno. El error de red previo no reaparece.

Evidencia: [78_operaciones_solo_hoy.ax.txt](78_operaciones_solo_hoy.ax.txt), [79_operaciones_hoy_cancelada.ax.txt](79_operaciones_hoy_cancelada.ax.txt), [80_busqueda_codigo.ax.txt](80_busqueda_codigo.ax.txt), [81_busqueda_nombre.ax.txt](81_busqueda_nombre.ax.txt), [82_busqueda_documento.ax.txt](82_busqueda_documento.ax.txt), [83_busqueda_borrada.ax.txt](83_busqueda_borrada.ax.txt), [87_remesas_regreso_pierde.ax.txt](87_remesas_regreso_pierde.ax.txt)

### OPS-003 — Detalle de cambio, remesa, giro enviado y cobrado

Anterior: En curso. Último resultado individual: En curso.

Cambio y remesa repetidos con datos guardados coherentes; giros/no completadas siguen pendientes anteriores.

Evidencia: [33_operacion_cambio.ax.txt](33_operacion_cambio.ax.txt), [85_remesa_detalle.ax.txt](85_remesa_detalle.ax.txt)

### OPS-004 — Contexto y origen de operación

Anterior: Aprobado. Último resultado individual: Aprobado.

Contexto de mostrador y enlaces a trabajador, jornada y retorno repetidos en cambio/remesa. Kioscos excluidos.

Evidencia: [33_operacion_cambio.ax.txt](33_operacion_cambio.ax.txt), [34_regreso_jornada.ax.txt](34_regreso_jornada.ax.txt), [85_remesa_detalle.ax.txt](85_remesa_detalle.ax.txt), [86_trabajador_desde_remesa.ax.txt](86_trabajador_desde_remesa.ax.txt), [87_remesas_regreso_pierde.ax.txt](87_remesas_regreso_pierde.ax.txt)

### OPS-006 — Vinculación entre libro y operación

Anterior: En curso. Último resultado individual: En curso.

Repetido enlace de libro/movimiento/operación y regreso: 120 EUR sale, 760 queda y 43800 CUP en contrapartida. Sin comprobar no completadas ni detalle contrapartida.

Evidencia: [30_jornada_cerrada_detalle.ax.txt](30_jornada_cerrada_detalle.ax.txt), [32_movimiento_120eur.ax.txt](32_movimiento_120eur.ax.txt), [33_operacion_cambio.ax.txt](33_operacion_cambio.ax.txt), [34_regreso_jornada.ax.txt](34_regreso_jornada.ax.txt)

### APR-002 — Listado, orden y pestañas

Anterior: Aprobado. Último resultado individual: Aprobado.

Repetido orden/6 pendientes/5 resueltas, pestaña persistente al recargar y Obispo 1 pendiente/3 resueltas. Misma atribución y signos.

Evidencia: [36_aprobaciones_pendientes.ax.txt](36_aprobaciones_pendientes.ax.txt), [37_aprobaciones_resueltas.ax.txt](37_aprobaciones_resueltas.ax.txt), [38_resueltas_recarga.ax.txt](38_resueltas_recarga.ax.txt), [73_aprobaciones_obispo_pendiente.ax.txt](73_aprobaciones_obispo_pendiente.ax.txt), [74_aprobaciones_obispo_resueltas.ax.txt](74_aprobaciones_obispo_resueltas.ax.txt)

### APR-003 — Filtros y estados vacíos

Anterior: Fallido. Último resultado individual: En curso.

Repetidos filtro compuesto, vacío y limpieza. QA-025 corregido; fechas/otros vacíos nunca ejecutados siguen pendientes.

Evidencia: [70_aprobaciones_combo.ax.txt](70_aprobaciones_combo.ax.txt), [71_aprobaciones_vacio.ax.txt](71_aprobaciones_vacio.ax.txt), [72_aprobaciones_filtros_limpios.ax.txt](72_aprobaciones_filtros_limpios.ax.txt)

### APR-004 — Detalle y relación con jornada/movimiento

Anterior: Fallido. Último resultado individual: Fallido.

Repetidos tres tipos, resolución separada, valores/observaciones y origen. QA-021 corregido; QA-022 histórico y QA-024 persisten, sin apertura nueva.

Evidencia: [39_apertura_rechazada.ax.txt](39_apertura_rechazada.ax.txt), [40_apertura_historico.ax.txt](40_apertura_historico.ax.txt), [41_cierre_pendiente.ax.txt](41_cierre_pendiente.ax.txt), [43_ajuste_efectivo_solicitud.ax.txt](43_ajuste_efectivo_solicitud.ax.txt), [35_ajuste_cierre.ax.txt](35_ajuste_cierre.ax.txt)

### APR-005 — Aprobar y rechazar con motivo

Anterior: Fallido. Último resultado individual: Fallido.

Repetidos ambos diálogos, validación y cancelación sin resolver. QA-023 persiste.

Evidencia: [45_aprobar_dialogo.ax.txt](45_aprobar_dialogo.ax.txt), [46_rechazar_dialogo.ax.txt](46_rechazar_dialogo.ax.txt), [47_validacion_motivos.json](47_validacion_motivos.json)

### V-A-01-1 — Acceso · escritorio

Anterior: Fallido. Último resultado individual: Fallido.

Repetida comparación equivalente 1440×900, demo entregada congelada f7accf9 y staging; persiste QA-008.

Evidencia: [89_demo_1440.png](89_demo_1440.png), [90_staging_1440.png](90_staging_1440.png), [89_medidas_visuales.json](89_medidas_visuales.json)

### V-A-01-2 — Acceso · adaptación

Anterior: Fallido. Último resultado individual: Fallido.

Repetidas capturas 390×844 y 360×800, mismos campos vacíos/foco. QA-008/010 persisten.

Evidencia: [91_demo_390.png](91_demo_390.png), [92_staging_390.png](92_staging_390.png), [93_demo_360.png](93_demo_360.png), [94_staging_360.png](94_staging_360.png), [89_medidas_visuales.json](89_medidas_visuales.json)

### V-W-02-1 — Acceso Worker · escritorio

Anterior: Fallido. Último resultado individual: En curso.

Repetido texto de error en escritorio a 1440×900: QA-004 corregido. Comparación visual completa Worker frente a entrega sigue pendiente como antes.

Evidencia: [98_worker_codigo_escritorio.ax.txt](98_worker_codigo_escritorio.ax.txt), [98_worker_codigo_escritorio.png](98_worker_codigo_escritorio.png)

## Continuación por bloques — 7549868

La usuaria aclaró que no controla los despliegues; no se exige una pausa. Se inició una nueva repetición con seguimiento por bloque. [Resultados y pendientes del bloque 01](../regresion_staging_7549868/INFORME.md). El libro conserva los resultados individuales de esta pasada anterior; la continuación no transforma en aprobados los casos que siguen incompletos.
