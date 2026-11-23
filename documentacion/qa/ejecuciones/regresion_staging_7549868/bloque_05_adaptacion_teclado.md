# Bloque 05 — adaptación y teclado

30/10/2026. Se revisaron las pantallas de login y recuperación en viewport de 390×844.

## Resultados

- Admin login: no presenta desbordamiento horizontal; la interfaz ocupa el ancho disponible.
- Worker login: el portal conserva un ancho interno de 1280 px en viewport de 390 px. Esto coincide con la restricción desktop-first mínima de 1280 px y no se clasifica como fallo móvil.
- Admin recuperación: no presenta desbordamiento horizontal en 390 px.
- Worker recuperación: no presenta desbordamiento horizontal en 390 px.
- Admin y Worker: al recorrer con Tab se pasa de usuario a contraseña, luego a mostrar/ocultar contraseña y después a «Iniciar sesión».

No se modificaron datos ni se ejecutaron solicitudes autenticadas. La comprobación visual completa contra la demo queda pendiente para la comparación formal de las pantallas.
