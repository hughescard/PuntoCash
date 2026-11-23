# Ronda 05 — Jornadas, movimientos y operación asociada

29/10/2026, alrededor de 10:45–10:55 de La Habana. Staging, Marta Sánchez. Solo lectura: no se cerraron jornadas, aprobaron diferencias ni generaron operaciones. Kioscos excluidos. SHA desplegado sin confirmar. Base: FRD Admin 8.0 de entrega 21/10, §1.5 y §12/13, conservado en fuentes.

## Resultados satisfactorios

- Obispo lista una abierta y después dos finalizadas. El cierre de otro día incluye su fecha; la cerrada con sobrante muestra +10 EUR (01).
- Estado Cierres forzados deja la jornada de Marisol en Caja 01 (02). Combinarlo con Caja 02 Vedado muestra «Ninguna jornada coincide…» y Quitar los filtros (04). Quitar restaura las diez jornadas del alcance tras terminar la carga.
- Cerradas + Solo con diferencia deja la de Carlos Díaz, Caja 03 Obispo, del 23/10 (05).
- Con caja/trabajador/estado/diferencia elegidos, cambiar sede a Vedado elimina caja y trabajador, conserva Cerradas y Solo con diferencia y devuelve el vacío correcto (06/07). El aviso de jornadas antiguas cambia al alcance de Vedado.
- Detalle de jornada cerrada: equipo, fecha, caja y trabajador corresponden; esperado EUR 760, contado 770, sobrante +10. Libro contiene ajuste +10 que deja saldo 770 (08).
- Filtros Salidas + EUR dejan dos movimientos: −130 y −120. Detalle del de 16:16 conserva −120 y saldo 760 (09/10).
- Desde ese movimiento se abre PC-261023-000048: operación de mostrador completada de la misma caja, trabajador y jornada. Entrega 120 EUR; disponible 880 antes y 760 después. El cliente entrega 43.800 CUP, coincidente con el otro tramo que figura en el libro. Enlace de la operación retorna a la misma jornada (11/12). Esto es consulta de registros existentes; no prueba ejecución nueva en Worker ni otros servicios.

## Incidencias nuevas

**QA-018 — El filtro de Jornadas se pierde al recargar.** Elegir Cierres forzados muestra la jornada correcta, pero no cambia la URL. Recargar devuelve Estado Todas (02/03). La cabecera también volvió a Todas mis sedes, pero el hallazgo se limita a la pérdida inequívoca del filtro Estado. Base: **FR-AD-SCOPE-5**, filtros en URL para conservar al recargar/compartir. Severidad media. No se infiere un fallo del filtrado en sí.

**QA-019 — Falta aviso superior del cierre forzado pendiente.** En Obispo, la tarjeta de Caja 01 dice Sin contar / Pendiente de conciliar. Arriba solo se avisa de la jornada antigua de Caja 03; no hay aviso del cierre forzado pendiente con enlace y explicación de que se contará en la próxima apertura (01). Base: **FR-AD-JOR-20, Señales encima del listado (§12.1)**. Severidad media. La tarjeta sí conserva su estado; no se afirma pérdida de la conciliación.

**QA-020 — Código de operación sin enlace en el libro.** PC-261023-000048 aparece como texto en Movimientos. Se puede llegar a la operación abriendo primero el detalle del movimiento, donde sí existe enlace (08–11). Base: **FR-AD-JOR-5** (columna Operación con enlace), referencia **FR-AD-OPS-9**. Severidad media. La operación existe y es accesible; falta el acceso directo en el libro.

## Pendientes y precisión

Las fechas se mantienen pendientes: cambiar el campo Desde mediante el control automatizado modificó su representación, pero al cambiar Estado reapareció la fecha inicial. No se confirmó que el cambio se aplicara a la aplicación; no se clasifica como fallo del producto ni se aprueba la excepción de abiertas fuera del período.

No se comprobaron vacío global sin jornadas, datos de otros servicios, enlace del trabajador, fila completa/teclado, continuidad con apertura discrepante, inmutabilidad frente a cambios posteriores, permisos entre empresas ni intervención Worker. La combinación de filtros y el recorrido de consulta no equivalen a aprobar todos los casos amplios. La caja QA de ronda 04 sigue retirada; no se utilizó en esta ronda.
