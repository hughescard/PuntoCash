# Tickets de los desarrolladores y seguimiento QA

Consulta: 29/10/2026 15:40 (America/Havana). Workspace antilla-capital; proyecto PuntoCash, 561f3271-48e0-468b-80b0-f70ac7f14f57.

Se leyeron los **43 tickets** devueltos por el listado completo no archivado, incluidos sus detalles: **28 Done y 15 Todo**. No hay otra página en ese listado. Se consultaron comentarios y enlaces externos de los 43: todos devolvieron cero; las notas de corrección están en las descripciones. Cinco consultas inicialmente limitadas se repitieron con éxito. Los resultados se conservan en [TICKETS.json](TICKETS.json). Las imágenes incrustadas se identificaron en el contenido, pero esta consulta no sustituye revisarlas visualmente al ejecutar el caso correspondiente.

## Estado real de la regresión

Los 51 casos con ejecución previa se repitieron en una pasada durante la cual cambió el despliegue. En la nueva pasada iniciada con la copia dev 7549868: **4 casos con sus variantes previamente probadas repetidas, 6 parciales y 41 pendientes**. Esto no significa que los cuatro casos estén completos o aprobados en todos sus requisitos. [Registro de la nueva pasada](../../ejecuciones/regresion_staging_7549868/INFORME.md).

La consulta de Plane no ejecuta tests, no incrementa esos contadores y no cierra incidencias. No se actualizó dev en esta consulta.

## Cruces directos con nuestros hallazgos

| Ticket Plane | Hallazgo QA | Qué cambia para la reprueba |
|---|---|---|
| PUNTOCASH-30 (Done) | QA-004 | Texto Worker corregido observado en la pasada anterior; reconfirmar en la actual. El foco visual de las casillas es un cambio adicional, distinto de QA-001. |
| PUNTOCASH-17 (Done) | QA-011 | Aviso de desvinculación y enlace a jornada: corrección observada; reconfirmar sin desvincular. |
| PUNTOCASH-6 (Done) | QA-020 | Código de operación en el libro enlazado: corrección observada; reconfirmar ambos tramos. |
| PUNTOCASH-8 (Done) | QA-021 | Solicitud enlaza a su movimiento: corrección observada; reconfirmar cierre y ajuste. |
| PUNTOCASH-7 (Done) | QA-025 | Quitar filtros con lista vacía: corrección observada; reconfirmar limpieza conjunta. |
| PUNTOCASH-18 (Done) | QA-009 / QA-012 | Equipo informa que el código es fijo y falta caducidad; no equivale a cumplimiento del requisito entregado. |
| PUNTOCASH-19 (Done) | QA-012 | Ticket cerrado por decisión técnica reportada con Christopher: falta endpoint que valide código e identifique tipo. Mantener diferencia funcional y decisión reportada; aceptación de la usuaria no confirmada. |

## Cómo se usará Plane en cada bloque

1. Consultar el listado ordenado por actualización y comparar con la última captura: nuevos tickets, estados y descripción de lo realizado. Revisar comentarios y enlaces de los que hayan cambiado.
2. Relacionar tickets con casos e incidencias existentes; evitar duplicados. Comprobar commits/PR citados y su pertenencia a dev. Separar «reportado como hecho», «incluido en código dev», «desplegado confirmado» y «comprobado en staging».
3. Registrar los recursos del despliegue al inicio y final del bloque. Un ticket Done o un commit en dev no demuestra que staging ya lo esté sirviendo. La referencia dev 7549868 contiene commits que nombran tickets, pero su SHA desplegado sigue sin confirmar.
4. Priorizar las correcciones reportadas y sus recorridos relacionados; conservar toda la regresión obligatoria: al actualizar dev repetir todo lo ya probado, también lo aprobado. No exigir que la usuaria detenga despliegues.
5. Cerrar un hallazgo solo tras reprueba con evidencia y contraste contra la entrega aplicable. Una limitación del backend o una decisión técnica reportada se registra por separado; no modifica automáticamente el requisito ni supone aceptación de la usuaria.

Se consulta Plane al iniciar cada bloque de trabajo y al detectar cambios; no se ha creado un monitor en segundo plano ni una automatización. No se escribieron comentarios ni se modificaron tickets.

## Límites que los tickets ya documentan

- PUNTOCASH-19/18: validación y tipo de equipo no disponibles por contrato del backend; código fijo y sin caducidad en la implementación. Son diferencias respecto de la entrega que requieren tratarse como tales, aunque el ticket esté cerrado.
- PUNTOCASH-10/11: detalle de operación condicionado a campos y movimientos que, según sus notas, faltaban en los datos consultados por el desarrollador. Se deberán probar con nuestros datos actuales; esa nota no demuestra ausencia actual para todas las operaciones.
- PUNTOCASH-17/22: el equipo indicó que no pudo comprobar con datos reales el caso de jornada abierta. Debe cubrirse con nuestras jornadas disponibles, sin asumir que aquella limitación siga vigente.
- PUNTOCASH-24/26: campos de motivo que el backend exige y que, según esas notas, difieren de la demo. Contrastar con la versión entregada y registrar la discrepancia; la exigencia del backend no la autoriza por sí sola.
- PUNTOCASH-20: filtro de sede duplicado reportado también en la demo y pendiente de consulta al diseño. No se clasificará como desviación visual simplemente por estar en un ticket.

## Inventario completo

| Ticket | Estado reportado | Título original | Commit nombrado en la copia dev |
|---|---|---|
| PUNTOCASH-1 | Done | change/2fa focus login | [a6e02f0](https://github.com/AntiCapDevs/punto-cash-frontend/commit/a6e02f0a47ff046fa72a8ec6addfdb6ba5481bdf) |
| PUNTOCASH-2 | Done | add/forget password to worker | Sin coincidencia explícita por ID en los 100 commits consultados |
| PUNTOCASH-3 | Done | change/back button on detailView and forms | [d5fb704](https://github.com/AntiCapDevs/punto-cash-frontend/commit/d5fb704df69faace0da4064de846d7d867cc8270) |
| PUNTOCASH-4 | Done | change/deactivate worker modal | [11af355](https://github.com/AntiCapDevs/punto-cash-frontend/commit/11af355164008ce4fdd5384028e1ff30a535b0ad) |
| PUNTOCASH-5 | Done | change/form card create cash-register | [5127e1a](https://github.com/AntiCapDevs/punto-cash-frontend/commit/5127e1ab5e9b020c75379d85231553dc081902f9) |
| PUNTOCASH-6 | Done | add/in table movements on shift/{id} add Link to operation/{code} to info in column operation | [722688f](https://github.com/AntiCapDevs/punto-cash-frontend/commit/722688fa4cb3fcb50ccefeb538ebd75c1223cfc7) |
| PUNTOCASH-7 | Done | add/button to delet filters on admin/approvals when the data is empty | [c798305](https://github.com/AntiCapDevs/punto-cash-frontend/commit/c798305c9962b430ba816c9f77650e7664d6c08b) |
| PUNTOCASH-8 | Done | add/Link to /admin/shifts/{id}/movements/{id} on approvals/{id} | [0c4921e](https://github.com/AntiCapDevs/punto-cash-frontend/commit/0c4921e7ed788df6af62101429d09944bf44e2c3) |
| PUNTOCASH-9 | Done | change/In labels change the text style on approvals/{id} | [2271dea](https://github.com/AntiCapDevs/punto-cash-frontend/commit/2271dea82489380b05858549bb437aab5e61aa8d) |
| PUNTOCASH-10 | Done | change/Operation/{id} type remesa style | [be05924](https://github.com/AntiCapDevs/punto-cash-frontend/commit/be05924dc4f8073ad21d2440705eb053c2ca4193) |
| PUNTOCASH-11 | Done | add/cash-register state to operation/{id} type currencies exchange | [90fc2ac](https://github.com/AntiCapDevs/punto-cash-frontend/commit/90fc2acb78c4419e130fc98c306ceeb455b47e12) |
| PUNTOCASH-12 | Done | change/seat list styles to respet design | [b6a00e5](https://github.com/AntiCapDevs/punto-cash-frontend/commit/b6a00e5f4126c841a03bc7d5627db4185f732c35) |
| PUNTOCASH-13 | Done | add/Last shift to seat list on shift column | Sin coincidencia explícita por ID en los 100 commits consultados |
| PUNTOCASH-14 | Done | change/retire cash-register modal to respect design on admin/cash-register | [21d4ab2](https://github.com/AntiCapDevs/punto-cash-frontend/commit/21d4ab2b09f916d8ef08ac22a028616a29e003a1) |
| PUNTOCASH-15 | Done | change/scroll-y on navbar to scroll-y-none to respect design | [de2388a](https://github.com/AntiCapDevs/punto-cash-frontend/commit/de2388a9b8f94131757ed9ec779969c8ae875232) |
| PUNTOCASH-16 | Done | change/text warning color on admin/devices to respect design | [48887e6](https://github.com/AntiCapDevs/punto-cash-frontend/commit/48887e6033c8efa7b4b39a2b14a78e88b61d24ef) |
| PUNTOCASH-17 | Done | change/styles in unlink modal to respect design and add link to forec shift closes | [195c0a9](https://github.com/AntiCapDevs/punto-cash-frontend/commit/195c0a9f17cdba2fb0bd7d8352afb4f8965f9311) |
| PUNTOCASH-18 | Done | change/styles in admin/devices/link?register={id} to respect design | [36bab38](https://github.com/AntiCapDevs/punto-cash-frontend/commit/36bab38f63158046b336018277108a3d1417284e) |
| PUNTOCASH-19 | Done | fix/devices/link behavior | Sin coincidencia explícita por ID en los 100 commits consultados |
| PUNTOCASH-20 | Todo | fix/in workers the seat filter is repeated is on header and on the view. This appears in stagging and demo so ask to designer. | Sin coincidencia explícita por ID en los 100 commits consultados |
| PUNTOCASH-21 | Done | change/Help worker with access to his account styles to respect design | [37f1103](https://github.com/AntiCapDevs/punto-cash-frontend/commit/37f11031435b03fb448abb7f54bed15c2fe9f4fd) |
| PUNTOCASH-22 | Done | change/seat reasign styles on worker/{id} to respect design | [539e1b2](https://github.com/AntiCapDevs/punto-cash-frontend/commit/539e1b2c4eeee5529d56b605386c2283db1d7fa8) |
| PUNTOCASH-23 | Done | change/text warning color on users to respect design | [540c3e6](https://github.com/AntiCapDevs/punto-cash-frontend/commit/540c3e6afa0bbd3751695bc718725476445c6e25) |
| PUNTOCASH-24 | Done | change/Modal in change email in user/{id} to respect desing | [a9dc13f](https://github.com/AntiCapDevs/punto-cash-frontend/commit/a9dc13f96b4330aad1f59637a59e42d9d1d51f7d) |
| PUNTOCASH-25 | Done | change/buttons tyle in users/{id} to respect design | [1c52d8f](https://github.com/AntiCapDevs/punto-cash-frontend/commit/1c52d8ff65e3afed90bd46d695a5de8a00d6e678) |
| PUNTOCASH-26 | Done | change/deactivate modal in user/{id} to respect design | [0d2234b](https://github.com/AntiCapDevs/punto-cash-frontend/commit/0d2234be575d52bfa43514376902ff6d90028c74) |
| PUNTOCASH-27 | Done | fix/currencies retire error when seat is closed | [f9e2d36](https://github.com/AntiCapDevs/punto-cash-frontend/commit/f9e2d36b942d841d0e710c4dcc95c34ff1ae488d) |
| PUNTOCASH-28 | Done | fix/add promotion in a close seat handle error | [cbdd1ce](https://github.com/AntiCapDevs/punto-cash-frontend/commit/cbdd1ce2366d81f7076e8de8c3a11d6d7e23270c) |
| PUNTOCASH-29 | Todo | fix/add promotion backend error 500 | Sin coincidencia explícita por ID en los 100 commits consultados |
| PUNTOCASH-30 | Done | fix/2fa code focus | [b7695fb](https://github.com/AntiCapDevs/punto-cash-frontend/commit/b7695fbb391cc5a38a00c09ece7009fed2237ec6) |
| PUNTOCASH-31 | Todo | check/Alerts in worker/home | Sin coincidencia explícita por ID en los 100 commits consultados |
| PUNTOCASH-32 | Todo | fix/Exchange currency and remmitte flow | Sin coincidencia explícita por ID en los 100 commits consultados |
| PUNTOCASH-33 | Todo | delete/ In worker home keep only availables cards | Sin coincidencia explícita por ID en los 100 commits consultados |
| PUNTOCASH-34 | Todo | check/Currencies in /worker/cash-register/add-currency?returnTo=initial-funding | Sin coincidencia explícita por ID en los 100 commits consultados |
| PUNTOCASH-35 | Todo | check/ in worker/cash-register/initial-funding currencies with jumps info | Sin coincidencia explícita por ID en los 100 commits consultados |
| PUNTOCASH-36 | Todo | add/traduction to this error {     "success": false,     "statusCode": 400,     "message": "Observations are required for CUP when reason is OTHER" } in worker/cash-register/initial-funding | Sin coincidencia explícita por ID en los 100 commits consultados |
| PUNTOCASH-37 | Todo | add/error translate in inital-refund | Sin coincidencia explícita por ID en los 100 commits consultados |
| PUNTOCASH-38 | Todo | fix/behavior in initail refund after complete process | Sin coincidencia explícita por ID en los 100 commits consultados |
| PUNTOCASH-39 | Todo | change/styles in bill wire money to respect design | Sin coincidencia explícita por ID en los 100 commits consultados |
| PUNTOCASH-40 | Todo | change/cash adjust on worker/cash-register/adjust-cash to respect design | Sin coincidencia explícita por ID en los 100 commits consultados |
| PUNTOCASH-41 | Todo | change/send wire money in worker/new-operation/money-transfers/send | Sin coincidencia explícita por ID en los 100 commits consultados |
| PUNTOCASH-42 | Todo | fix/nacionality select need to be a country select with iso3 | Sin coincidencia explícita por ID en los 100 commits consultados |
| PUNTOCASH-43 | Todo | change/operation detail in worker/operaciones/{id} to respect design | Sin coincidencia explícita por ID en los 100 commits consultados |

Los commits se comprobaron en el historial local de dev ya actualizado; no se deduce que sean el contenido de staging. Las cinco correcciones observadas en la pasada anterior continúan pendientes de confirmación en la nueva pasada.
