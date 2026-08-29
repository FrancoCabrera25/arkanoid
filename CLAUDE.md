# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Estado del proyecto

El juego Arkanoid **aún no está implementado**. El repositorio solo contiene los assets
y el módulo de dibujado de sprites; falta todo lo demás (`index.html`, bucle de juego,
física, colisiones, niveles, HUD, audio).

## Restricciones

- **Cero dependencias**: solo HTML, CSS y JavaScript nativo. No agregar `package.json`,
  bundlers, frameworks ni librerías.
- **Scripts clásicos, no módulos ES**: `assets/spritesheet.js` define globales
  (`SPRITES`, `EXPLOSION_FRAMES`, `loadSpritesheet`, `drawSprite`, `drawFrame`) sin
  `export`. El código nuevo debe cargarse igual, con `<script src="...">` en orden de
  dependencia, antes que el script del juego.
- El render es sobre `<canvas>` 2D (`drawImage` con recorte del atlas).

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

## Audio

`assets/sounds/ball-bounce.mp3` (rebote) y `assets/sounds/break-sound.mp3` (bloque
destruido). Aún no hay código que los reproduzca.
