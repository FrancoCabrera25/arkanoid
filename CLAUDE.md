# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Estado del proyecto

El juego está implementado sobre `index.html` + `game.js`, incorporando los specs
`01` (MVP jugable), `02` (responsive y controles táctiles) y `03` (niveles
procedurales). Ver `specs/` para el detalle de qué incluye cada uno y por qué.

## Flujo de trabajo: spec-driven development

Todo cambio de producto pasa por un spec en `specs/` antes de tocar código. El
flujo usa dos comandos:

1. **`/spec <descripción o slug>`** — diseña el spec de forma guiada (entiende
   contexto, hace preguntas de clarificación, escribe el archivo) y lo guarda en
   `specs/NN-slug.md` con **Estado: Draft**. No implementa nada.
2. **`/spec-impl NN-slug`** — valida que el spec esté **Aprobado**, crea (o
   reutiliza) la rama `spec-NN-slug` según `AutoCreateBranch` en
   `specs/.spec-config.yml`, e implementa el plan paso a paso con pausas para
   revisar cada diff.

Reglas derivadas de este flujo:

- No implementar directamente sobre `main` cambios de alcance de spec; usar la
  rama `spec-NN-slug` correspondiente y mergear al terminar (ver el historial de
  specs 02 y 03, mergeados vía PR).
- Un spec nuevo declara explícitamente de qué spec(s) depende (`Depende de:`) y
  qué queda fuera de alcance (`No incluido`), para que specs futuros sepan qué
  no asumir todavía.
- Cada spec numera secuencialmente (`01-`, `02-`, `03-`, ...) y el nombre de
  archivo (`NN-slug.md`) determina el nombre de la rama.

### Estructura de un archivo de spec

Cada `specs/NN-slug.md` sigue esta forma (ver `specs/01-mvp-jugable.md` como
referencia completa):

- Encabezado con **Estado** (Draft/Aprobado/Implementado), **Depende de** y
  **Fecha**, y un **Objetivo** de una oración.
- **Alcance**: qué incluye y qué queda explícitamente fuera (para specs futuros).
- **Modelo de datos**: qué estructuras en memoria y qué claves de `localStorage`
  se agregan o modifican.
- **Plan de implementación**: pasos numerados, cada uno dejando el sistema en un
  estado funcional y verificable.
- **Criterios de aceptación**: checklist verificable manualmente.
- **Decisiones tomadas y descartadas**: alternativas consideradas y por qué se
  eligió la actual (incluye decisiones explícitas del usuario).
- **Riesgos identificados**: con su mitigación.

## Restricciones

- **Cero dependencias**: solo HTML, CSS y JavaScript nativo. No agregar `package.json`,
  bundlers, frameworks ni librerías.
- **Scripts clásicos, no módulos ES**: `assets/spritesheet.js` define globales
  (`SPRITES`, `EXPLOSION_FRAMES`, `loadSpritesheet`, `drawSprite`, `drawFrame`) sin
  `export`. `game.js` se carga igual, con `<script src="...">` en `index.html` en
  orden de dependencia (spritesheet antes que el juego).
- **Un solo archivo `game.js`**, sin separar por responsabilidad (decisión del
  spec 01, mantenida en 02 y 03).
- El render es sobre `<canvas>` 2D (`drawImage` con recorte del atlas), en un
  espacio de diseño fijo de 800×600 (`CANVAS_WIDTH`/`CANVAS_HEIGHT`); el resize
  responsive (spec 02) escala vía `ctx.setTransform`, nunca reescribiendo las
  posiciones almacenadas.
- Generación de contenido (niveles) es **determinística**, sin `Math.random`
  (spec 03): mismo nivel siempre produce el mismo layout.

## Ejecutar

No hay build ni tests. `assets/spritesheet.js` carga la imagen mediante `new Image()`
con ruta **relativa a la página** (`assets/spritesheet-breakout.png`), por lo que el
`index.html` debe vivir en la raíz del proyecto y servirse por HTTP (abrirlo con
`file://` rompe la carga del canvas por CORS):

    python3 -m http.server 8000    # luego http://localhost:8000

## Arquitectura del spritesheet (`assets/spritesheet.js`)

- La imagen se carga una vez y se copia a un `<canvas>` offscreen (`ssImg`); todo el
  dibujado usa ese canvas, no el `Image` original.
- La carga es asíncrona con cola de callbacks: llamar `loadSpritesheet(cb)` y arrancar
  el bucle de juego **dentro** del callback. Antes de que termine, `drawSprite` y
  `drawFrame` retornan sin dibujar en silencio — una pantalla en negro suele significar
  que se dibujó antes de tiempo, no un bug de coordenadas.
- `drawSprite(ctx, name, x, y, w, h)`: `name` es una clave de `SPRITES` (`paddle`,
  `ball`) o, con el prefijo `block_`, un color de `SPRITES.blocks`
  (`block_red`, `block_cyan`, `block_green`, `block_magenta`, `block_yellow`,
  `block_hotpink`, `block_gray`). Un nombre desconocido no dibuja y no avisa.
- `drawFrame(ctx, frame, x, y, w, h)`: recibe un frame explícito, usado para las
  animaciones de `EXPLOSION_FRAMES[color]` (4 frames por color, `EXPLOSION_DURATION`
  = 150 ms de duración total).
- Los bloques miden 32×16 px en el atlas y la paleta y el paddle 162×14; conviene
  mantener esas proporciones al escalar.
- `gray` está reservado exclusivamente para bloques duros sin golpear (spec 03):
  al recibir el primer golpe pasan a `red` y se comportan como un bloque normal.

## Audio

`assets/sounds/ball-bounce.mp3` (rebote, en cada rebote de pared/paleta) y
`assets/sounds/break-sound.mp3` (bloque destruido, incluido el segundo golpe de
un bloque duro). Reproducidos vía `playSound()` en `game.js`, que no suena nada
hasta el primer input del jugador (`hasUserInteracted`) para evitar el bloqueo
de autoplay del navegador.
