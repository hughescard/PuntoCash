# Contra qué se clasifica un hallazgo de QA

Revisión de criterio: **29/10/2026**. No se ejecutaron pruebas nuevas ni se corrigió el producto en esta revisión.

Un resultado observado no basta para llamarlo incumplimiento. Debe identificarse **qué se entregó, dónde se exige el comportamiento, qué ocurrió y cuál es la diferencia**. Una regla escrita en una versión posterior no demuestra por sí sola que formó parte del encargo inicial.

## Bases que se usan

| Clasificación | Contra qué se contrasta | Qué debe acompañar al hallazgo |
| --- | --- | --- |
| Incumplimiento funcional | Requisito de una entrega aplicable, con versión e ID | Acción, resultado observado, resultado exigido, fuente y evidencia |
| Diferencia visual | Demo de la entrega correspondiente, con tamaño y estado comparables; manual de marca como autoridad visual | Captura de demo y staging, versión de referencia y diferencia concreta |
| Defecto de contenido visible | Contenido de la pantalla implementada y referencia de entrega; por ejemplo una clave interna sin traducir | Texto literal que aparece y captura. No inventar la frase de sustitución si no está fijada |
| Diferencia con documentación posterior | Documento posterior al encargo confirmado | Registrar la diferencia y dejar el alcance por validar antes de exigir la corrección como incumplimiento de ese encargo |
| Mejora o preferencia | No existe una obligación de entrega identificada | Separarla de los errores; explicar que es una propuesta |

El código de `dev` sirve para investigar la causa. **No define por sí solo lo que debía entregarse**, ni demuestra qué commit está desplegado. Las recomendaciones generales de una skill tampoco sustituyen los requerimientos.

## QA-005 y QA-006: fuente exacta y límite de alcance

La base usada fue el [FRD Worker 1.8 conservado desde el commit 388ba76](contexto_2026-10-28/fuentes/worker_frd_v1.8_referenciado_admin_2026-10-14.md), no el documento Worker actual ni el PDF inicial adjunto a ClickUp.

**FR-2FA-2 (§2.4)** distingue dos tiempos:

- **Vigencia del código: 5 minutos.** Tiempo durante el que sirve el código recibido.
- **Espera entre envíos: 60 segundos.** Tiempo antes de poder pedir que envíen otro.

Por eso **QA-005 no dice que caducar a los cinco minutos esté mal**. La diferencia observada es que Worker mantiene el reenvío deshabilitado durante la cuenta de cinco minutos, en lugar de habilitarlo tras un minuto. La captura guardada lo muestra aún deshabilitado con 2:58 restantes.

**FR-2FA-7 (§2.5)** dice: «Al completarse el sexto dígito la verificación se envía sola». Añade que el botón permanece como alternativa. **QA-006** compara esa regla con Worker: escribir las seis cifras dejó la pantalla esperando y solo comenzó a verificar tras pulsar el botón.

### Por qué se había usado esa versión

La [nota de la primera entrega Admin, de 14/10](contexto_2026-10-28/fuentes/admin_entrega_2026-10-14.md), en §1, cita el FRD Worker como contexto vigente e indica que Admin hereda su acceso. El [FRD Admin 8.0, FR-AD-ACC-2](contexto_2026-10-28/fuentes/admin_frd_v8.0_2026-10-21.md), adopta expresamente FR-2FA-1 a FR-2FA-32 **para las pantallas de Admin**.

Esa cadena explica la referencia usada y fundamenta el acceso de Admin. **No equivale a demostrar que las reglas posteriores se encargaron de nuevo para Worker.** La instrucción original del QA fija como base de la primera entrega Worker los PDF de ClickUp, cuyo acceso no incluye este segundo factor. La incorporación de cambios a Worker debe distinguirse de la herencia de requisitos por Admin.

En consecuencia, **QA-005 y QA-006 quedan como diferencias comprobadas contra el FRD posterior, con el alcance Worker por confirmar**. ACC-006 y ACC-007 vuelven a En curso: se conservan las observaciones y evidencias, pero dejan de contar como casos fallidos confirmados mientras se resuelve esa aplicación de alcance. Esto no afirma que se hayan corregido.

## Base identificada para los hallazgos registrados

| Hallazgo | Base del contraste | Clasificación y precisión |
| --- | --- | --- |
| QA-001: cursor tras validación o rechazo | FR-AUTH-2 y FR-AUTH-3 del PDF original Worker; Admin los hereda por FR-AD-ACC-2 | Funcional. Esas reglas ya existen en el PDF original |
| QA-002: falta explicar por qué termina la pantalla del código | FR-2FA-13 de Worker 1.8, adoptado por FR-AD-ACC-2 | Funcional en **Admin**, que es donde se reprodujo. No se atribuye al PDF Worker inicial |
| QA-003: errores por campo en Worker | FR-AUTH-2 y FR-A11Y-1 del PDF original Worker | Funcional. Contrasta el aviso general con los mensajes por cada campo exigidos |
| QA-004: auth.twoFactor.headline visible | Contenido observado de la pantalla Worker y manual de marca/UI, comunicación clara | Texto sin resolver. Se denuncia la clave visible; no se fija una frase alternativa inventada |
| QA-005: espera para reenviar | FR-2FA-2 y FR-2FA-10 a 12 de Worker 1.8 | Diferencia contra documento posterior; **alcance Worker por confirmar** |
| QA-006: envío al completar seis cifras | FR-2FA-7 de Worker 1.8 | Diferencia contra documento posterior; **alcance Worker por confirmar** |
| QA-007: vinculación después del acceso | Integración de equipos entregada en Admin, §3 y §18; FR-DEV-1/4 de la referencia Worker | Funcional de integración. La nota Admin contempla el terminal y la consola; no se atribuye al PDF Worker inicial |
| QA-008: tamaños de títulos Admin | Demo de entrega del 21/10, commit f7accf9, comparada con staging a 1440, 390 y 360 | Diferencia visual. Incluye capturas y medidas; no es una preferencia de tamaño |
| QA-009: código de vinculación mostrado | Mecanismo de vinculación de la entrega Admin §3; detalle de pantalla FR-DEV-2 de la referencia Worker | Diferencia de la integración entregada y de su representación. La prueba no demuestra la caducidad interna del servidor |
| QA-010: texto bajo el logo móvil | Demo de entrega del 21/10, commit f7accf9, a 390 y 360 | Diferencia visual. Se omite un elemento visible de la referencia entregada |
| QA-011: aviso de desvinculación con jornada abierta incompleto | FRD Admin 8.0, entrega 21/10, §3.2 FR-AD-EQ-10/11 | Funcional. Omite trabajador, fecha de apertura y enlace a esa jornada; cancelado sin desvincular |
| QA-012: identificación sin validar reto ni mostrar sus datos | FRD Admin 8.0, entrega 21/10, §3.4 FR-AD-EQ-18/20 y rechazos al identificar | Funcional. `000000` se anuncia identificado; dev solo valida longitud. No se afirma que se haya consumado un vínculo inválido |
| QA-013: grupo vinculado sin ordenar por sede | FRD Admin 8.0, entrega 21/10, §3.1 FR-AD-EQ-6 | Funcional de listado. Obispo precede a Cerro; evidencia de orden completo en ronda 03 |
| QA-014: ninguna caja libre sin aviso ni enlace de alta | FRD Admin 8.0, entrega 21/10, §3.4 FR-AD-EQ-7/8 | Funcional. Cerro solo ofrece una caja ocupada deshabilitada, sin alternativa para crear |
| QA-015: bloqueos de retirada incompletos | FRD Admin 8.0, entrega 21/10, §4.3 FR-AD-CAJA-9/10 | Funcional. Omite jornada y enlaces de solución; sí impide confirmar |
| QA-016: alta sin autor visible | FRD Admin 8.0, entrega 21/10, §4.1 FR-AD-CAJA-1 | Funcional de contenido. Fecha sin nombre del creador; no se infiere pérdida de auditoría |
| QA-017: enlace de éxito de alta no lleva a vincular | FRD Admin 8.0, entrega 21/10, §4.2 FR-AD-CAJA-7 | Funcional de navegación. Lleva al listado de Equipos, requiere otro paso |
| QA-018: filtros de Jornadas/Operaciones no se conservan | FRD Admin 8.0, entrega 21/10, FR-AD-SCOPE-5 | Funcional. Jornadas: Estado vuelve a Todas al recargar. Operaciones (ronda 06): Servicio Remesas vuelve a Todos al regresar de detalle. Filtros ausentes de URL |
| QA-019: falta aviso de cierre forzado pendiente | FRD Admin 8.0, entrega 21/10, §12.1 FR-AD-JOR-20 | Funcional. Tarjeta sí indica pendiente; falta señal superior con enlace y explicación |
| QA-020: operación sin enlace en el libro | FRD Admin 8.0, entrega 21/10, §12.2 FR-AD-JOR-5 y referencia FR-AD-OPS-9 | Funcional de navegación. El detalle de movimiento sí enlaza; libro muestra texto |
| QA-021: solicitud abre libro en lugar del movimiento | FRD Admin 8.0, entrega 21/10, §14.3 FR-AD-APR-5 | Funcional de navegación. Registro existe; enlace va a jornada #movements |
| QA-022: histórico de apertura con movimiento por su diferencia | FRD Admin 8.0, entrega 21/10, §14.3 FR-AD-APR-5 | Inconsistencia de datos existentes contra regla. Pendiente generación nueva Worker para distinguir fixture/histórico; no se infiere doble descuento |
| QA-023: decisión sin explicación de consecuencias | FRD Admin 8.0, entrega 21/10, §14.4 FR-AD-APR-9/10 | Funcional de contenido. Diálogos cancelados; mínimo de motivo sí funciona |
| QA-024: movimiento sin estado/enlace de aprobación | FRD Admin 8.0, entrega 21/10, §12.4 FR-AD-JOR-17 y FR-AD-APR-15 | Funcional de relación. Solicitud pendiente conocida no se enlaza desde su ajuste |
| QA-025: vacío filtrado sin Quitar los filtros | FRD Admin 8.0, entrega 21/10, §14.2 FR-AD-APR-13 | Funcional. Mensaje correcto, limpieza conjunta ausente |

Las referencias posteriores deben seguir identificándose como tales en el resto del QA. Si una parte del detalle no puede vincularse al alcance realmente encargado, se deja por validar; no se completa esa cadena por suposición.

## Registro a partir de esta revisión

Cada incidencia incluirá en Resultado esperado la **base del contraste**: fuente, versión e ID o captura de referencia. La nota de alcance identificará si es la entrega inicial, una integración posterior o una regla pendiente de confirmar. Los informes anteriores conservan lo observado y enlazan esta revisión para que las clasificaciones iniciales no se lean como si hubieran sido confirmadas de nuevo.
