# Cross-product patterns

Composite, business-aware components shared by two or more products
(operation summaries, amount fields, status cells, ticket blocks).

They are built only from `@/components/ui` primitives. If a primitive is
missing, add it to the design system rather than styling ad hoc here.

## Tablas y listas: abrir una fila y sus acciones (regla del 12/11/2026)

Una sola regla en Worker, Admin y Super Admin:

1. **Si la fila tiene detalle, se abre tocando la fila entera** (`ResponsiveTable` con `rowLink`). En escritorio lleva un `›` al final, que es el enlace real. En móvil se toca toda la tarjeta. No hay botón «Ver detalle», ni columna para él, ni nombre subrayado. Los enlaces a *otra* cosa dentro de una celda llevan `relative z-10`.
2. **Si existe ficha, las acciones van en la ficha.** La lista sirve para encontrar y abrir.
3. **Si no hay ficha y sí acciones**, van en un menú «⋯» al final de la fila, aunque sea una sola (`rowActions`, que usa `ActionMenu`). En la tarjeta, el menú va arriba a la derecha.
4. **Si no hay nada que abrir ni hacer**, la fila es plana.

Las listas compactas de dentro de una ficha siguen la misma regla con `ElementoDeLista`.

**Excepción:** la matriz de Servicios de Super Admin. Es una cuadrícula para activar y desactivar servicios, no una lista: allí, un clic perdido entre dos interruptores no debe sacarte de la pantalla.
