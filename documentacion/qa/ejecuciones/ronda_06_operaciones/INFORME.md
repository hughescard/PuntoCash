# Ronda 06 — Operaciones, búsqueda y fechas

29/10/2026, aproximadamente 11:00–11:15 de La Habana. Staging, Marta Sánchez, solo lectura. No se generaron operaciones, aprobaron diferencias ni modificaron jornadas. SHA desplegado sin confirmar. Kioscos excluidos de las comprobaciones; pueden aparecer incidentalmente en listados existentes, pero no se ejecutan sus flujos.

## Método de la iteración

Seleccionar casos relacionados → leer requisito de la entrega → probar acciones y variantes en staging → contrastar observado/esperado → guardar evidencia → actualizar resultado e incidencias. Una variante satisfactoria se registra sin aprobar todo un caso amplio que todavía tiene variantes pendientes. Fallido exige incumplimiento documentado; un impedimento de prueba o una recomendación no se presenta como error.

## Comprobaciones

- **Paginación:** inicial 50 de 51 operaciones. Mostrar la restante deja 51 enlaces, todos únicos, y conserva los 50 anteriores en el mismo orden (01/02). FR-AD-OPS-1. No se clasificó como fallo que el botón diga Mostrar 1 más cuando solo queda una.
- **Fecha aplicada:** el campo Desde se cambió con el teclado del control nativo, de 23/10 a 29/10. Hasta 29/10. El listado quedó con una operación de hoy (03). Esto sí verifica el cambio de fecha, a diferencia del intento automatizado de ronda 05.
- **Búsqueda por código:** con fechas solo hoy y Estado Cancelada (vacío), buscar `pc-261023-000048` encuentra la completada del 23/10, avisa que busca en todas las fechas e ignora los demás filtros, que quedan deshabilitados (04). FR-AD-OPS-2.
- **Nombre sin tildes/minúsculas:** `rolando suarez` encuentra 14 operaciones de Rolando Suárez, incluidas anteriores al período (05). Documento parcial `821219` devuelve esas 14 e incluye el registro de contraste (06). Documento conocido del detalle de la ronda anterior; no se modificó cliente alguno.
- **Borrar búsqueda:** devuelve controles a fecha 29/10 y estado Cancelada. Apareció «Ocurrió un error de red». Reintentar permitió terminar la consulta y el resultado estable fue Ninguna operación coincide con esos filtros (07/08). No se asigna causa técnica al mensaje ni se abre incidencia por el episodio aislado.
- **Quitar filtros + Remesas:** vuelve al período 23–29/10 y Todos; elegir Remesas deja tres registros (09). Se abrió una de mostrador, PC-261023-000033: beneficiario, proveedor, importe y efectivo visibles; 320 USD antes − 170 USD entregados = 150 USD después (10). FR-AD-OPS-3.
- **Regreso al listado:** Volver a Operaciones pierde Remesas, vuelve a Servicio Todos y 50 de 51 operaciones (11). Se amplía QA-018; no se crea otra incidencia por el mismo problema de conservación.
- **Enlace a trabajador:** la remesa/listado enlaza a Marisol Rivas, ficha de la misma sede Obispo (12). Junto al contexto y enlaces a jornada/regreso ya comprobados en ronda 05, cubre **OPS-004 para mostrador**. Kiosco excluido. Se aprueba este caso, no los otros servicios ni el flujo de ejecución financiera.
- **Fecha en Jornadas:** Desde/Hasta 29/10 aplicados por teclado dejan cinco abiertas de días anteriores y excluyen las cerradas anteriores (13). Cumple la excepción de FR-AD-JOR-2. Se completa esa variante que estaba pendiente, manteniendo las demás variantes pendientes de JOR-002.

## Estado y pendientes

No hay ID de incidencia nuevo: **QA-018** se amplía a Operaciones, con evidencia y referencia FR-AD-SCOPE-5; el total continúa en 20. OPS-002 queda Fallido por conservación de filtros, aunque las búsquedas y sus mensajes probados funcionan. OPS-004 pasa a Aprobado en el alcance sin kiosco. OPS-001 queda En curso: paginación probada, faltan datos/variantes no completadas y revisión exhaustiva de estados. OPS-003 conserva En curso: cambio y remesa probados; giros y estados no completados aún pendientes.

No se aprueba la UI frente a la demo en esta ronda. La caja QA de ronda 04 permanece retirada y no se utiliza. No se tocó ninguna opción de credenciales del trabajador.
