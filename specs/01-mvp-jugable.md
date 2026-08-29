# 01 — MVP Jugable de Arkanoid

**Estado:** Implementado
**Depende de:** —
**Fecha:** 2026-08-29

**Objetivo:** Implementar un MVP jugable de Arkanoid en un único nivel fijo, con paleta controlada por teclado y mouse, física de pelota con ángulo de rebote según el punto de impacto, bloques con animación de explosión y sonido, sistema de vidas y puntuación, estados de victoria/derrota con reinicio, pausa, y high score persistido en `localStorage`.

## Alcance

**Incluido:**

- `index.html` en la raíz del proyecto, sirviendo un `<canvas>` de 800×600 px, cargando `assets/spritesheet.js` y luego `game.js` en orden de dependencia (scripts clásicos, sin módulos ES).
- `game.js` con todo el juego: bucle principal, input, física, colisiones, HUD y estados. Un solo archivo, sin separar por responsabilidad.
- Un único nivel fijo: grid de bloques de 5 filas × 10 columnas, usando los 7 colores de `SPRITES.blocks` (`red`, `cyan`, `green`, `magenta`, `yellow`, `hotpink`, `gray`) distribuidos por fila.
- Paleta controlada simultáneamente por teclado (flechas izquierda/derecha o A/D) y por mouse (sigue la posición horizontal del cursor sobre el canvas). Sin prioridad definida entre ambos inputs: el último evento recibido gana.
- Física de la pelota:
  - Rebote contra paredes izquierda, derecha y superior (reflexión simple).
  - Rebote contra la paleta con ángulo de salida según el punto de impacto (golpear el borde angula más, el centro rebota casi vertical).
  - Colisión pelota-bloque: el bloque impactado se marca destruido, dispara la animación de explosión (`EXPLOSION_FRAMES`, 150 ms) y reproduce `break-sound.mp3`.
  - Cada rebote contra pared o paleta reproduce `ball-bounce.mp3`.
- Puntuación: puntos fijos por bloque destruido (10 pts c/u, sin variar por color), mostrada en el HUD.
- Vidas: 3 vidas iniciales, mostradas como texto `Vidas: N` en el HUD. Si la pelota cae por debajo de la paleta se pierde una vida y se reinician las posiciones de pelota y paleta. Al llegar a 0 vidas, game over.
- Velocidad de la pelota: se incrementa un 5% cada 10 bloques destruidos (progreso del jugador, no un timer).
- Estado de victoria: al destruir los 50 bloques, se detiene el bucle, se muestra el mensaje "¡Ganaste!" y una opción de reinicio (tecla o botón en canvas).
- Estado de derrota: al perder las 3 vidas, se detiene el bucle, se muestra "Game Over" y una opción de reinicio.
- Reinicio: restablece bloques, vidas y score al estado inicial, y reposiciona pelota/paleta. El high score persistido **no** se resetea.
- Pausa: la tecla `P` pausa/reanuda el bucle sin resetear el estado de la partida.
- High score: se guarda el mejor score alcanzado en `localStorage`, se muestra en el HUD junto al score actual, y persiste entre recargas de página.

**No incluido (queda para specs futuros):**

- Múltiples niveles o progresión entre niveles.
- Power-ups.
- Puntajes variables según el color del bloque.
- Configuración de volumen o mute de audio.
- Controles táctiles / responsive para mobile.
- Pantalla de inicio o menú previo a jugar (el juego arranca directo al cargar la página).
- Leaderboard online o cualquier backend/servidor.

## Modelo de datos

Todo vive en memoria dentro de `game.js`, salvo el high score que se persiste en `localStorage`.

- `paddle`: `{ x, y, width: 162, height: 14, speed }`
- `ball`: `{ x, y, radius, dx, dy, speed }`
- `blocks`: array de `{ x, y, width: 32, height: 16, color, alive }`, generado a partir del grid 5×10 al iniciar/reiniciar.
- `explosions`: array de `{ x, y, color, startTime }` — animaciones de explosión en curso, se limpian solas al superar los 150 ms.
- `gameState`: `{ score, lives, isPaused, isGameOver, isWin }`
- `localStorage` key: `arkanoid_highscore` (string numérico, sin versionado — es un único valor escalar, no requiere migración).

## Plan de implementación

Cada paso deja el sistema en un estado funcional y verificable.

1. **Estructura base.** Crear `index.html` con el `<canvas>` 800×600 y los `<script src="...">` de `assets/spritesheet.js` y `game.js` en orden. Sin lógica de juego todavía.
2. **Tablero estático.** En `game.js`, implementar `loadSpritesheet(cb)` para dibujar el estado inicial: paleta, pelota y grid completo de 50 bloques, sin movimiento. Verificable: recargar la página muestra el tablero completo sin pantalla en negro.
3. **Movimiento de paleta.** Agregar el bucle (`requestAnimationFrame`) y el control de la paleta por teclado y mouse. Verificable: la paleta se mueve con flechas/A-D y siguiendo el mouse.
4. **Física de la pelota.** Agregar movimiento y rebote de la pelota contra paredes y paleta (con ángulo según punto de impacto), sin colisión de bloques todavía. Verificable: la pelota rebota indefinidamente sin perder vidas.
5. **Colisión con bloques.** Agregar detección de colisión pelota-bloque: destruir el bloque, disparar la animación de explosión y reproducir `break-sound.mp3`; reproducir `ball-bounce.mp3` en rebotes de pared/paleta. Verificable: los bloques desaparecen con animación y sonido al ser golpeados.
6. **Vidas y puntuación.** Agregar HUD con score, vidas y high score (leído de `localStorage`); pérdida de vida al caer la pelota, con reposicionamiento de pelota/paleta. Verificable: perder una vida decrementa el contador y reposiciona los elementos.
7. **Victoria y derrota.** Detectar 0 bloques vivos (victoria) o 0 vidas (derrota), detener el bucle, mostrar el mensaje correspondiente con opción de reinicio, y persistir el high score en `localStorage` al finalizar la partida. Verificable: se puede ganar o perder una partida y reiniciarla.
8. **Velocidad progresiva y pausa.** Agregar el incremento de velocidad de la pelota cada 10 bloques destruidos y la pausa con la tecla `P`. Verificable: la pelota se acelera con el progreso y el juego se pausa/reanuda correctamente.

## Criterios de aceptación

- [x] `python3 -m http.server 8000` + abrir `http://localhost:8000` carga el tablero inicial sin pantalla en negro.
- [x] La paleta se mueve con teclado (flechas o A/D) y con el mouse.
- [x] La pelota rebota correctamente contra paredes y paleta, con ángulo variable según el punto de impacto.
- [x] Al golpear un bloque, este desaparece con la animación de explosión (`EXPLOSION_FRAMES`) y se reproduce `break-sound.mp3`.
- [x] Cada rebote contra pared o paleta reproduce `ball-bounce.mp3`.
- [x] El score aumenta 10 puntos por cada bloque destruido y se muestra en el HUD.
- [x] Se muestran las vidas restantes (`Vidas: N`) y se decrementan al caer la pelota, reposicionando pelota y paleta.
- [x] Al llegar a 0 vidas se muestra "Game Over" con opción de reiniciar.
- [x] Al destruir los 50 bloques se muestra "¡Ganaste!" con opción de reiniciar.
- [x] Reiniciar restablece bloques, vidas y score al estado inicial sin resetear el high score.
- [x] El high score persiste en `localStorage` tras recargar la página.
- [x] La velocidad de la pelota aumenta un 5% cada 10 bloques destruidos.
- [x] La tecla `P` pausa y reanuda el bucle sin perder el estado de la partida.

## Decisiones tomadas y descartadas

- **Un solo nivel fijo** en vez de múltiples niveles: mantiene el MVP acotado; niveles adicionales quedan para un spec futuro.
- **3 vidas** en vez de una sola: da margen de juego sin alargar demasiado el MVP.
- **Teclado + mouse simultáneos**, sin prioridad definida: el último input recibido gana. Es un detalle de implementación, no bloquea el spec.
- **Puntos fijos por bloque** (no variables por color): simplifica el modelo de datos; valores por color quedan fuera de alcance.
- **Sin pantalla de inicio/menú**: el juego arranca directo al cargar la página, coherente con un MVP mínimo.
- **High score en `localStorage` sin versionado de esquema**: es un único valor escalar, no requiere migración.
- **Velocidad de pelota ligada a bloques destruidos, no a un timer**: liga la dificultad al progreso del jugador (decisión explícita del usuario).
- **Un solo archivo `game.js`** en vez de separar por responsabilidad: simplifica la coordinación de globals entre múltiples `<script>` para un MVP.

## Riesgos identificados

- **Autoplay de audio bloqueado por el navegador:** algunos navegadores bloquean la reproducción de audio hasta que hay una interacción del usuario. Mitigación: no reproducir ningún sonido antes del primer input del jugador (mover la paleta).
- **Tunneling en colisiones a alta velocidad:** con bloques de 16 px de alto y la pelota acelerando, a velocidades altas la pelota podría "atravesar" un bloque sin detectar la colisión. Mitigación: acotar el incremento máximo de velocidad o usar un paso de detección de colisión suficientemente fino.
