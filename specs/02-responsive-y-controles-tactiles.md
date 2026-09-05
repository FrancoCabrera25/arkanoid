# 02 — Responsive y Controles Táctiles

**Estado:** Implementado
**Depende de:** SPEC 01
**Fecha:** 2026-08-29

**Objetivo:** Hacer que el canvas del juego se redimensione de forma responsive dentro de un rango de 320 a 800 px de ancho lógico manteniendo la proporción 4:3, y agregar soporte de controles táctiles (arrastre de paleta, botón de pausa en canvas) con un aviso de "rotá tu dispositivo" en pantallas táctiles en portrait.

## Alcance

**Incluido:**

- Meta tag `viewport` en `index.html` para que el juego se muestre correctamente en dispositivos móviles (sin zoom accidental por pinch/double-tap).
- Resize dinámico del canvas: al cargar la página y en cada `resize`/`orientationchange`, el canvas se recalcula para ocupar el mayor espacio posible manteniendo la proporción 4:3 (800×600), con un ancho lógico mínimo de 320 px y máximo de 800 px (nunca supera el tamaño de diseño original).
- El resize se implementa vía una transformación de escala en el contexto 2D (`ctx.setTransform`), no reescribiendo manualmente las posiciones almacenadas de cada entidad. Esto preserva la nitidez (sin blur de escalado CSS) y mantiene la posición relativa de paleta, pelota y bloques automáticamente durante una partida en curso, sin saltos visuales.
- Controles táctiles: `touchstart`/`touchmove` sobre el canvas mueven la paleta igual que el mouse (mapeo de coordenadas cliente → espacio de diseño, reutilizando la misma fórmula que ya usa `handleMouseMove`). `touch-action: none` en el canvas para evitar que el navegador interprete el arrastre como scroll de la página.
- Botón de pausa dibujado en el canvas (esquina inferior derecha), visible solo durante partida activa (no en pausa/game over/victoria... salvo que definamos que se oculta al pausar, ver Modelo de datos), tocable y clicable, que alterna el mismo estado `gameState.isPaused` que ya usa la tecla `P`. La tecla `P` se mantiene sin cambios para teclado.
- Prompt de "Rotá tu dispositivo": si se detecta capacidad táctil (`'ontouchstart' in window` o `navigator.maxTouchPoints > 0`) y el viewport está en portrait (alto > ancho), se oculta el canvas y se muestra un overlay HTML con el mensaje. El juego se pausa automáticamente mientras el prompt está visible y se reanuda (vuelve a mostrarse el canvas) al pasar a landscape.
- El botón de restart existente (click/tap sobre su rect) sigue funcionando igual, ya que el mapeo de coordenadas de `handleCanvasClick` es compatible con tap sin cambios.

**No incluido (queda para specs futuros):**

- Rediseño del layout de bloques/juego para aprovechar mejor una pantalla en portrait (el juego sigue siendo 4:3 landscape; en portrait se pide rotar, no se re-maquetan los bloques).
- Soporte de `devicePixelRatio` para renderizado nítido en pantallas retina/alta densidad (el canvas usa píxeles lógicos, no físicos del dispositivo).
- Botones on-screen de izquierda/derecha como alternativa al arrastre táctil.
- Fullscreen API o instalación como PWA.
- Ajustes de volumen/mute de audio (sigue fuera de alcance, como en el spec 01).
- Multi-touch o gestos más allá de un único punto de contacto para mover la paleta.

## Modelo de datos

No se introducen estructuras de datos nuevas persistentes. Se agregan variables de estado en memoria dentro de `game.js`:

- `DISPLAY_WIDTH` / `DISPLAY_HEIGHT`: dimensiones reales del canvas en píxeles (recalculadas en cada resize, clamp 320–800 de ancho manteniendo 4:3). Reemplazan el uso directo de `canvas.width`/`canvas.height` como fuente de verdad de tamaño real.
- `SCALE`: `DISPLAY_WIDTH / CANVAS_WIDTH` (donde `CANVAS_WIDTH` sigue siendo 800, el espacio de diseño lógico fijo usado por toda la física existente, sin cambios).
- `isTouchDevice`: booleano calculado una vez al cargar (`'ontouchstart' in window || navigator.maxTouchPoints > 0`).
- `showRotatePrompt`: booleano derivado de `isTouchDevice && DISPLAY_HEIGHT_VIEWPORT > DISPLAY_WIDTH_VIEWPORT` (portrait), recalculado en cada resize/orientationchange.
- `PAUSE_BUTTON`: rect fijo en espacio de diseño (posición/tamaño en la esquina inferior derecha del canvas de 800×600), análogo a `RESTART_BUTTON`.

## Plan de implementación

Cada paso deja el sistema en un estado funcional y verificable.

1. **Resize dinámico del canvas.** Agregar meta `viewport` en `index.html`. En `game.js`, implementar `resizeCanvas()` que calcula `DISPLAY_WIDTH`/`DISPLAY_HEIGHT` (clamp 320–800 de ancho, proporción 4:3), setea `canvas.width`/`canvas.height` a esos valores reales, calcula `SCALE` y aplica `ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0)` al inicio de `draw()`. Escuchar `resize` y `orientationchange` para volver a llamar `resizeCanvas()`. Sin controles táctiles ni botón de pausa todavía. Verificable: redimensionar la ventana del navegador reescala el tablero completo (bloques, paleta, pelota, HUD) sin blur, respetando los límites de 320 y 800 px, y una partida en curso mantiene la posición relativa de sus elementos sin saltos ni romper colisiones.
2. **Controles táctiles de paleta.** Agregar handlers `touchstart`/`touchmove` sobre el canvas que muevan la paleta con la misma fórmula de mapeo de coordenadas que `handleMouseMove`, marcando `hasUserInteracted = true`. Agregar `touch-action: none` al canvas vía CSS. Verificable: en un emulador táctil (DevTools "Toggle device toolbar") o dispositivo real, arrastrar el dedo sobre el canvas mueve la paleta sin hacer scroll de la página.
3. **Botón de pausa en canvas.** Dibujar `PAUSE_BUTTON` durante partida activa (no game over/victoria) y extender el hit-test de `handleCanvasClick` (que ya soporta tap) para alternar `gameState.isPaused` al tocarlo/clicarlo. Verificable: tocar o clicar el botón pausa y reanuda el juego igual que la tecla `P`.
4. **Prompt de rotar dispositivo.** Agregar el overlay HTML en `index.html` (oculto por defecto) y la lógica en `game.js` que calcula `isTouchDevice`/`showRotatePrompt`, oculta el `<canvas>` y muestra el overlay cuando corresponde, pausando el juego mientras está visible y reanudando al volver a landscape. Verificable: en el emulador móvil de DevTools, alternar entre orientación portrait y landscape muestra/oculta el prompt y pausa/reanuda el juego correctamente.

## Criterios de aceptación

- [x] Redimensionar la ventana del navegador reescala el canvas (bloques, paleta, pelota, HUD) manteniendo la proporción 4:3, sin blur perceptible.
- [x] El canvas nunca supera 800×600 px ni baja de 320 px de ancho lógico (se clampa en ambos extremos).
- [x] Redimensionar la ventana con una partida en curso mantiene la posición relativa de pelota, paleta y bloques vivos, sin saltos ni romper la detección de colisiones.
- [x] En un dispositivo o emulador táctil, arrastrar el dedo sobre el canvas mueve la paleta, sin generar scroll de la página.
- [x] El botón de pausa dibujado en el canvas alterna pausa/reanudación al tocarlo o clicarlo, igual que la tecla `P`.
- [x] En un dispositivo o emulador táctil en orientación portrait, se oculta el canvas y se muestra el mensaje pidiendo rotar el dispositivo; el juego queda pausado mientras el mensaje está visible.
- [x] Al rotar (o simular landscape) en un dispositivo táctil, el prompt desaparece, el canvas vuelve a mostrarse y el juego se puede reanudar.
- [x] En desktop (sin touch), el prompt de rotar nunca aparece, incluso si la ventana se redimensiona angosta/alta.
- [x] Los controles de teclado y mouse existentes (spec 01) siguen funcionando sin cambios de comportamiento.

## Decisiones tomadas y descartadas

- **Escala vía `ctx.setTransform` en vez de reescribir posiciones almacenadas en cada resize:** la física y las constantes de layout (`BLOCK_WIDTH`, `PADDLE_WIDTH`, `BALL_RADIUS`, velocidades, etc.) quedan intactas en el espacio de diseño de 800×600 del spec 01; solo el renderizado y el mapeo de input consideran `SCALE`. Es matemáticamente equivalente a "reescalar todo proporcionalmente" (lo que pidió el usuario) pero sin el riesgo de bugs de drift acumulado al recalcular manualmente cada posición en cada evento de resize.
- **Canvas real (no CSS-stretch)**, tal como decidió el usuario: `canvas.width`/`canvas.height` cambian de verdad en cada resize, evitando el blur típico de estirar por CSS un canvas de resolución fija.
- **Sin soporte de `devicePixelRatio`:** se mantiene simple (píxeles lógicos = píxeles de canvas), coherente con el resto del proyecto que no persigue nitidez retina. Puede quedar para un spec futuro si se vuelve un problema visual real.
- **Prompt de rotar solo para dispositivos táctiles en portrait, no para cualquier ventana angosta:** una ventana de escritorio angosta no tiene forma de "rotarse", así que solo aplica cuando hay capacidad táctil de por medio; en desktop el clamp de 320–800 ya cubre el caso de ventana angosta.
- **Botón de pausa en canvas en vez de HTML fuera del canvas:** mantiene consistencia con el resto de la UI (que ya vive dentro del canvas, incluyendo el botón de reinicio) y reutiliza el mismo mecanismo de hit-test por click/tap que ya existe.
- **Ancho lógico mínimo de 320 px, máximo de 800 px:** balancea legibilidad/precisión táctil (piso) con no exceder el tamaño de diseño original del MVP (techo), evitando además la complejidad de un layout que "crece" más allá de lo que el spec 01 diseñó.
- **La tecla `P` se mantiene sin cambios:** el botón de pausa en canvas es un control adicional para touch, no un reemplazo del control de teclado existente en desktop.

## Riesgos identificados

- **Cálculo de `showRotatePrompt` con falsos positivos/negativos:** algunos dispositivos híbridos (laptops con pantalla táctil) tienen `maxTouchPoints > 0` sin ser "mobile". Mitigación: combinar la detección táctil con la condición de portrait, de forma que una laptop táctil en uso normal (landscape) nunca dispare el prompt; solo se activa si además está en portrait, escenario poco común en laptops.
- **`touch-action: none` puede interferir con gestos nativos del navegador** (pull-to-refresh, swipe de navegación) si se aplica de forma muy amplia. Mitigación: aplicar `touch-action: none` únicamente al elemento `<canvas>`, no al `<body>` completo.
- **Doble disparo de eventos táctiles y de mouse en dispositivos híbridos** (algunos navegadores emiten tanto `touchstart` como `mousedown`/`click` sintéticos para el mismo tap). Mitigación: los handlers de pausa/restart ya son idempotentes (alternar un booleano, o reiniciar el juego), por lo que un doble disparo no debería causar un estado inconsistente observable.
