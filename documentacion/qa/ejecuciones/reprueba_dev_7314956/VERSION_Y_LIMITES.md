# Versión y límite de la reprueba

29/10/2026. Se repitieron las variantes previamente ejecutadas de los 51 casos iniciados y se revisaron las 25 incidencias. No se confundió esa repetición con ejecutar todas las variantes que seguían pendientes.

La copia real del frontend se actualizó sin modificaciones locales, por avance rápido, de `c811442284d1023241e488f141a40ce1263b668a` a `7314956f66483929c206d3229ad1e36bcec8d7de`. Backend permaneció en `d2cd8cdccd4c65ce17fb364e3fc4141b451c80c5`.

Al finalizar la pasada, la punta remota frontend era **`7549868256df700863a54bd8d18446e633c2f493`**. No se actualizó de nuevo la copia real durante la ejecución para no sustituir la referencia de partida.

Recursos DOM observados en el navegador:

- Inicio: webpack con parámetro `dpl_BCps6kDfiw8Qi5dS9QbaibuTPnJs`.
- Final, tras navegación/recargas y una pestaña Worker nueva: webpack con `dpl_GsmaTFKmZBpmsst3WBHsMiiuidyW`.

Ambos están guardados en `version_recursos_inicial.json` y `version_recursos_final.json`. El nombre del fichero webpack coincide; su parámetro de despliegue cambia. Esto **no permite asignar el commit a cada pantalla ni certificar uniformidad de versión**: puede intervenir navegación con recursos anteriores y un despliegue posterior. No se atribuye cada cambio de comportamiento a un SHA sin prueba.

Se intentó identificar el despliegue mediante Vercel por hostname y ambos IDs: la conexión devolvió 404; no lista equipos disponibles. No se dispone de metadatos Git del despliegue. No se cambiaron ajustes, aliases ni despliegues.

Las cinco correcciones observadas tienen evidencia de ejecución, pero quedan **Lista para reprueba**, sin cierre definitivo, hasta una pasada consolidada sobre una versión fija. Los resultados individuales conservan fecha/historial; **no equivalen a un aprobado de regresión de dev 7314956 ni 7549868**. PRE-001 queda Bloqueado por versión no fijada.

Se ha solicitado una URL inmutable con commit o una ventana de staging sin despliegues. Esto es una condición para una regresión consistente, no una petición para cambiar permisos del producto ni un fallo funcional nuevo.

## Acuerdo posterior

La usuaria aclaró que no controla los despliegues y no puede garantizar una pausa. Se continúa el QA por bloques con carga fresca e identificador de despliegue al inicio y al final. Las observaciones se atribuyen al despliegue observado, sin inventar su SHA. Un cambio se registra y deja pendientes las comprobaciones afectadas. No se requiere que la usuaria detenga staging. Al actualizar dev se repite todo lo ya probado, como indicó la usuaria.
