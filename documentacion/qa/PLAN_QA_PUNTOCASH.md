# PuntoCash · Plan de QA y seguimiento

Preparado el **28/10/2026**. Entorno de ejecución: **staging**. Código de referencia: **`dev` de frontend y backend**, identificando el commit realmente desplegado en cada ronda.

El registro de trabajo es [PuntoCash · Plan y seguimiento de QA](../../outputs/01a18543-9e5b-7f40-835a-1145ac9623cc/PuntoCash_Plan_y_Seguimiento_QA.xlsx). Sus IDs se conservan durante las ejecuciones y repruebas. **QA iniciado el 28/10/2026:** [ronda 01 de acceso de Admin](ejecuciones/ronda_01_acceso_admin/INFORME.md) y [ronda 02 de acceso, selector y Worker](ejecuciones/ronda_02_acceso_y_worker/INFORME.md). Los estados actuales están en el libro.

## Qué contiene

**417 casos en alcance**: 226 funcionales, 42 flujos completos, 138 comparaciones visuales, 7 preparativos y 4 comprobaciones posteriores a las entregas cuyo alcance debe confirmarse.

**Super Admin y kiosco quedan fuera del QA. La pantalla informativa se mantiene**, con sus datos de sede, tasas y promociones y su comparación visual. La exclusión de kiosco comprende su vinculación, consultas, solicitudes, recuperación en Worker y trazabilidad en Admin. Los casos mixtos se limitan a la parte de Admin, Worker o pantalla informativa que sigue en alcance.

El libro conserva **432 registros e IDs originales**: 417 casos en alcance y **15 casos exclusivos de kiosco marcados No aplica**, con motivo y fecha. Estas exclusiones no cuentan como aprobaciones ni como pruebas ejecutadas. En Requisitos, las reglas exclusivas de kiosco están excluidas y las reglas compartidas indican cobertura parcial.

| Hoja | Uso |
| --- | --- |
| Resumen | Avance calculado por tipo y bloque. Distingue aprobado, fallo, bloqueo y exclusión justificada |
| Casos | Lista filtrable con preparación, pasos, resultado esperado, requisitos, dependencias, estado, evidencia e incidencia |
| Requisitos | Relación entre requisitos de las fuentes y los casos previstos. Separa reglas funcionales, documentación de la demo y reglas sustituidas |
| Incidencias | Registro vacío para anotar problemas, versiones, evidencia y su reprueba |
| Fuentes | Entregas, documentos, referencia visual, repositorios, entorno y datos necesarios |

## Bloques de trabajo

| Orden | Área | Qué comprobamos |
| --- | --- | --- |
| 1 | Preparación | Versión desplegada, referencia de entrega, cuentas, dos terminales, saldos iniciales y escenarios del proveedor |
| 2 | Acceso y recuperación | Identificador/contraseña, segundo factor, reenvío, vigencia, intentos, errores, sesiones y recuperación en ambos productos |
| 3 | Navegación y alcance | Todas las rutas, botones y enlaces, selector de sede, persistencia de filtros, móvil, aislamiento de empresas y 404 |
| 4 | Inicio | Métricas, avisos, prioridades, horarios, estado por sede y sus enlaces |
| 5 | Sedes | Listado, búsqueda/estados, ficha, edición de contacto/horario y actualización de la pantalla informativa |
| 6 | Cajas | Crear, validar, retirar, bloquear retiradas, reactivar, conservar históricos y auditar |
| 7 | Equipos | QR/código, cámara, caducidad, uso único, caja ocupada, vínculo real, persistencia y desvinculación con/sin jornada |
| 8 | Personas | Alta, ficha, edición, correo, credencial, desactivar/reactivar y reasignar trabajadores; administradores, principal y Perfil |
| 9 | Monedas y tasas | Catálogo/lista/caja, saldos, retiradas y cascadas, rangos, compra/venta, revisión, ajuste automático y tablero |
| 10 | Promociones | Creación, edición, retirada, fechas, textos, imágenes, coincidencias simultáneas y contenido de sala |
| 11 | Jornadas | Listado/filtros, apertura y cierre, diferencias, movimientos, cierre forzado y conciliación posterior |
| 12 | Operaciones de Admin | Todos los estados/servicios, búsqueda y filtros, detalles, origen de mostrador y enlaces con jornada/persona |
| 13 | Aprobaciones | Tres orígenes, una por moneda, sin umbral, filtros, aprobar/rechazar y doble resolución |
| 14 | Reportes | Totales por moneda, cortes, filtros, volumen/posición neta, gráfico, exportaciones y plantillas |
| 15 | Worker | Inicio, catálogo, Cambio de moneda, Remesas, Enviar giro, Cobrar giro y resultados |
| 16 | Caja e histórico Worker | Fondeo, monedas, ajustes, conteo/cierre, filtros, paginación, detalles e impresión |
| 17 | Flujos completos | Recorridos entre Admin, Worker, otra caja/sede y pantalla informativa |
| 18 | Transversales | Todos los controles, validaciones, errores, cancelación, revalidación, formatos, persistencia, auditoría, teclado y adaptación |
| 19 | Igualdad visual | Cada pantalla y los estados relevantes, diálogos, comprobantes y archivos, frente a la demo entregada |
| 20 | Cambios posteriores | Etiqueta de equipos, expresión de tasa, aclaración de saldo no negativo y denominación de cierre Worker |

No se limita la prueba a que una página abra o que termine una operación. Se comprueban también sus efectos en saldos, movimientos, históricos, recuentos, otras sesiones y otras secciones.

## Flujos completos previstos

1. Puesta en marcha de sede: configuración, caja, terminal, trabajador y primera operación.
2. Alta de Worker hasta primera jornada y consulta en Admin.
3. Caja nueva hasta operación, movimientos e informe exportado.
4. Cambio de tasa antes de cotizar y reflejo en Worker y pantalla informativa.
5. Cambio de tasa con una operación ya en revisión.
6. Añadir moneda de sede hasta habilitarla y operarla en Caja.
7. Retirar moneda usada: bloqueo por saldo, retirada permitida e histórico.
8. Retirar tasa manteniendo la moneda para otros servicios.
9. Rango cambiado, tasa ajustada y confirmación del Admin.
10. Ajuste con faltante hasta aprobación.
11. Ajuste con sobrante hasta rechazo.
12. Cierre cuadrado y nueva apertura coincidente.
13. Cierre con varias diferencias y decisiones independientes por moneda.
14. Apertura con reposición de fondos y aprobación.
15. Apertura con retiro declarado y aprobación.
16. Apertura con faltante u Otro y comparación con cierre anterior.
17. Forzar cierre con Worker operando y revisión abierta.
18. Forzar cierre abandonado y conciliarlo con la apertura siguiente.
19. Desvincular caja durante una operación sin confirmar.
20. Sustituir terminal conservando la jornada de la caja.
21. Cerrar, desvincular, retirar, reactivar y volver a vincular una caja.
22. Bloquear desactivación de Worker con jornada, resolverla y desactivar/reactivar.
23. Reasignar trabajador entre sedes y comprobar ambos terminales e histórico.
24. Corregir correo de Worker y volver a recibir acceso/recuperación.
25. Regenerar credencial después de cambio de contraseña y recuperarla después.
26. Crear Admin no principal y comprobar operación y ausencia de Usuarios.
27. Traspasar principal con ambas sesiones abiertas y restituirlo.
28. Cambiar contraseña desde Perfil con varias sesiones abiertas.
29. Cobrar remesa hasta caja, comprobante, consulta Admin y reporte.
30. Enviar y cobrar giro entre sedes, conservando ambas instantáneas.
31. Dos cajas intentan pagar el mismo giro.
32. Dos cajas intentan pagar la misma remesa.
33. Fallo de proveedor y ausencia de registros/completadas especulativos.
34. Saldo consumido entre revisión y confirmación de otro pago.
35. **No aplica — kiosco excluido:** kiosco hasta Cambio de moneda.
36. **No aplica — kiosco excluido:** kiosco hasta cobro de remesa.
37. **No aplica — kiosco excluido:** kiosco hasta envío de giro.
38. **No aplica — kiosco excluido:** kiosco hasta cobro de giro.
39. **No aplica — kiosco excluido:** solicitud consumida y operación abandonada.
40. **No aplica — kiosco excluido:** desvincular kiosco con solicitudes existentes.
41. Cambiar contacto/horario y observar una pantalla ya instalada.
42. Publicar, editar y retirar promoción observando la sala.
43. Operaciones de dos sedes/personas y reportes con filtros cruzados.
44. Crear y resolver diferencia, comparando todos los indicadores.
45. Editar personas/configuración después de operar y comprobar inmutabilidad.
46. Intentar leer y modificar recursos QA desde otra empresa.
47. Terminar sesión con un formulario listo para confirmar.
48. Cierre diario completo de dos cajas, conciliando todas las secciones por moneda.

Se conserva la numeración original para corresponder con los IDs F-001 a F-048 del libro. **42 flujos siguen en alcance; F-035 a F-040 están excluidos.** Los otros nueve casos excluidos son EQ-010, SOL-001 a SOL-004, V-W-18-1, V-W-18-2, V-D-04 y V-X-04.

Los recorridos que requieran un escenario de rango, suspensión o reasignación de operador necesitan datos preparados por el equipo. No amplían el QA a la consola Super Admin.

## Comparación visual

Se contrasta cada pantalla de Admin y Worker con su equivalente de la demo de entrega, además de los diálogos y documentos de salida. Incluye estructura, orden, textos, iconos, colores, tipografía, tamaños, márgenes, alineación, jerarquía y acciones.

La comparación usa la misma resolución y un estado/datos equivalentes. Incluye formulario vacío/relleno, validación, carga, error, vacío, filtros sin resultados, confirmación, deshabilitado y éxito, cuando existan. Las variantes están especificadas en cada caso visual; una pantalla no se cierra visualmente solo por revisar su estado inicial.

- Admin: **1440×900**, **390×844** y control mínimo **360×800**. Tablas como tarjetas por debajo de 1024 px.
- Worker: **1440×900** y **1280×900**, según el requisito de escritorio.
- Documentos: todas las páginas de los comprobantes y reportes y todas las hojas exportadas.
- Pantalla informativa dependiente: horizontal y vertical.

Un texto dinámico o importe distinto por usar otros datos de prueba no demuestra una alteración visual. Un cambio de disposición, componente, texto funcional o estado respecto a lo entregado se registra aunque el flujo siga funcionando. El manual de PuntoCash sigue siendo la autoridad visual.

## Cómo marcar el avance

- **Pendiente:** todavía no se ejecutó.
- **En curso:** ejecución comenzada.
- **Aprobado:** esperado observado, fecha y evidencia registradas. La columna Cierre comprobado y el resumen exigen ambos datos.
- **Fallido:** incumple un resultado esperado. Registrar incidencia y evidencia.
- **Bloqueado:** falta dato, acceso, integración, respuesta de proveedor o configuración para comprobarlo. Escribir qué impide continuar.
- **No aplica:** exclusión con motivo y fecha. No cuenta como una aprobación.

La evidencia puede ser captura, vídeo, archivo, respuesta del servidor o comprobación del equipo para condiciones internas que no se demuestran mirando la pantalla. Una revisión de código por sí sola no aprueba un flujo.

Las descripciones de fallos deben ser breves y concretas: qué hace la persona, qué ocurre y qué debería ocurrir. Usar un ejemplo cuando aclare la situación. Evitar términos internos como «reto» en la explicación; dejar rutas y códigos de requisito como referencia para reproducir y corregir. La descripción debe entenderse sin leer este chat.

Toda clasificación debe indicar además **contra qué se contrasta el suceso**: documento y versión de entrega, requisito concreto o captura de la demo entregada. Una regla posterior no se aplica al encargo inicial por suposición. Ver [bases de clasificación y revisión de QA-005/QA-006](BASES_DE_CLASIFICACION.md).

Se trabajará en tramos de dos o tres pantallas, incluyendo sus estados visuales. A medida que las secciones estén disponibles se recorrerán los flujos relacionados. Una corrección exige repetir el caso fallido y los recorridos afectados; la incidencia se cierra después de la reprueba.

El libro será el registro de ejecución. Al actualizarlo, se conservarán resultados anteriores e IDs y se añadirán incidencias/repruebas; no se reconstruirá una lista vacía encima del trabajo ya realizado.

**Regla de regresión indicada por la usuaria:** al actualizar la referencia de dev, repetir todas las comprobaciones ya ejecutadas, incluidas las aprobadas, y comparar si los hallazgos persisten o están corregidos. La referencia de requisitos y demo entregada no cambia por actualizar el código. Fijar también el despliegue probado: si staging cambia durante la pasada y no se puede vincular a un commit único, conservar las observaciones pero no certificar la regresión ni cerrar definitivamente hallazgos sobre una versión mezclada.

La usuaria no controla los despliegues; no se le exige detenerlos ni se asume una pausa. Continuar por bloques con carga fresca, registrando los recursos de despliegue al inicio y al final. Atribuir cada resultado a lo realmente observado y repetir las comprobaciones afectadas cuando cambie. La falta de SHA desplegado limita la atribución a dev, pero no impide seguir probando staging y guardar evidencias.

**Seguimiento de los desarrolladores en Plane:** por indicación de la usuaria, consultar los tickets de PuntoCash antes de cada bloque y cuando se detecten cambios. Comparar tickets nuevos, estados, descripciones y comentarios con la captura anterior; relacionarlos con nuestros casos e incidencias y comprobar los commits o PR citados. Distinguir lo reportado como hecho, su inclusión en dev, su despliegue y su comprobación efectiva en staging. «Done» no aprueba nuestro QA ni cambia por sí solo un requisito entregado. Las decisiones técnicas o diferencias aceptadas por el equipo se anotan sin atribuir aceptación a la usuaria. La consulta no autoriza escribir comentarios o modificar tickets. [Primera consulta y cruces de incidencias](plane/2026-10-29/INFORME.md). No se ha creado una automatización de seguimiento.

## Alcance y datos

Worker se referencia contra los PDF de ClickUp. Admin se referencia contra sus dos entregas acumuladas, incluidos los requisitos de integración que hereda. Las excepciones antiguas de Worker —por ejemplo, Cambio de moneda sin jornada y recuperación como marcador— se distinguen de su evolución al integrarse con Admin. No se ejecutan expectativas incompatibles contra la misma versión sin fijar cuál rige.

Las limitaciones de almacenamiento simulado, códigos fijos y cifras sembradas de la demo no sustituyen los requisitos del producto real. Un escenario que no se pueda comprobar en staging queda Bloqueado, no aprobado por imitar una simulación.

Las retiradas y desactivaciones se prueban donde están definidas. No se inventan eliminaciones físicas ni borrados de históricos. Los datos QA se identifican y sus configuraciones reversibles se restauran cuando proceda, conservando los hechos financieros y sus códigos.

Fuentes y accesos: [Contexto de entregas](contexto_2026-10-28/CONTEXTO_PARA_QA.md) y [Cuentas de los seeds](contexto_2026-10-28/ACCESOS_QA_DESDE_SEEDS.md). Los informes anteriores sirven para preparar reproducciones, sin dar por vigentes sus resultados.
