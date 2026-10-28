# /super-admin — consola de PuntoCash

La consola con la que PuntoCash gobierna su red: sedes, operadores, servicios,
monedas y rangos de tasa, promociones de red, y la consulta de todo lo demás.
Especificada en `documentacion/admin/PuntoCash_Super_Admin_Functional_Requirements_v1.md`.

- `(auth)` — acceso en dos pasos y recuperación, sin shell.
- `(app)` — el shell y las pantallas. `_compartido/` guarda las piezas que
  usan varias pantallas de esta consola.
- La sesión vive en `src/features/super-admin`; el dominio es el mismo
  `src/features/network` que usa Admin de sede, leído con alcance global.
