# Bloque 02 — Worker y disponibilidad de staging

29/10/2026. Plane se consultó antes de empezar: 43 tickets, sin cambios de ID ni fecha de actualización respecto de la captura anterior. Las notas de PUNTOCASH-30/17/18/19 guían la reprueba, sin aprobar sus correcciones automáticamente.

## Ejecutado

**ACC-002, Worker:** ambos campos vacíos, solo contraseña vacía y solo usuario vacío muestran «Completa tus credenciales para continuar». No se muestra el mensaje particular del campo que falta ni se señala como inválido; el foco permanece en «Iniciar sesión». Se conservan QA-001 y QA-003, contrastados con FR-AUTH-2 y FR-A11Y-1 del PDF original Worker, sin aplicar una preferencia de buenas prácticas. Las tres variantes no dependen de acceder al servidor. Evidencias 06–09; la variante de ambos vacíos ya se había probado y se repitió.

**ACC-004:** al intentar acceder en Admin aparece «No se pudo conectar con PuntoCash / Ocurrió un error de red», se conservan las entradas y vuelve a habilitarse el envío. La variante previa del estado «Verificando» ya está en 07_admin_enviando del bloque 01; se corrige el seguimiento de repetición de parcial a variantes previas repetidas. El caso completo conserva En curso.

**ACC-001/ACC-003:** se intentó acceso Worker con la cuenta genérica y con cdiaz. El aviso genérico no demuestra contraseña incorrecta: el acceso Admin presenta error de red y el servicio API muestra 502. No se cuenta como repetición válida de rechazo por credenciales, ni como defecto de las cuentas. Siguen parciales.

## Disponibilidad que impidió continuar

## Iteración adicional del 30/10/2026

Se repitió la validación con los campos limpiados expresamente para aislar el autocompletado del navegador. En Admin aparecen mensajes específicos para usuario y contraseña; en Worker las variantes de ambos vacíos, solo usuario y solo contraseña siguen mostrando únicamente «Completa tus credenciales para continuar». Por ello QA-001 y QA-003 permanecen fallidos para Worker. Esta iteración no cambia los estados globales ni permite avanzar a Equipos.

La apertura directa de https://staging.api.puntocash.co/ muestra «502 Bad Gateway» y «nginx/1.28.3 (Ubuntu)» (05_api_502). Admin muestra error de red; Worker muestra «No fue posible iniciar sesión. Comprueba tus credenciales e inténtalo de nuevo.» No se establece una causa del 502 ni se atribuye a un despliegue por suposición.

La pestaña antigua de Worker devolvió primero ERR_NETWORK_CHANGED; una pestaña nueva sí cargó el portal. No se eludió ninguna advertencia de seguridad ni se alteró la red. El problema del servicio se documenta por separado de los fallos funcionales.

No se pudo avanzar a segundo factor Worker ni a la pantalla autenticada de Equipos: QA-004, QA-005/006, QA-007/009 y QA-011/012/013/014 no se reprueban ni se cierran en este bloque. Las cinco correcciones observadas en la pasada anterior conservan su estado pendiente de confirmación. No se modificaron cajas, equipos, jornadas, permisos ni contraseñas.

## Control de versión y avance

Recursos observados en Worker y Admin: dpl_GsmaTFKmZBpmsst3WBHsMiiuidyW, igual a la carga del bloque 01. Se guardan JSON al inicio y después de los intentos. No se afirma SHA desplegado, versión del API ni vigilancia continua. La copia dev no se actualizó durante este bloque. Se restauró el tamaño del navegador tras comprobar la vista de escritorio.

La nueva pasada queda con **6 casos que tienen repetidas sus variantes previamente ejecutadas, 4 parciales y 41 pendientes**, sobre los mismos 51 casos. Repetir esas variantes no equivale a completar todos los requisitos pendientes del caso. El libro conserva sus estados globales: no hay aprobaciones ni incidencias nuevas en este bloque.

Los resultados del bloque 01 también se incorporan al historial del libro, con su evidencia y sin perder el registro anterior. Se retomarán verificación Worker y Equipos cuando el servicio permita acceder.
