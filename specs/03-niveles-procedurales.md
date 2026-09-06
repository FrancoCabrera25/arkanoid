# 03 — Niveles Procedurales

**Estado:** Implementado
**Depende de:** SPEC 01
**Fecha:** 2026-09-05

**Objetivo:** Reemplazar el nivel único fijo del MVP por 10 niveles generados proceduralmente con dificultad creciente (más filas de bloques, huecos variables y, desde el nivel 3, bloques que requieren 2 golpes), con transición automática entre niveles, pantalla de victoria final tras completar el nivel 10, reinicio siempre en el nivel 1 tras un Game Over, y persistencia en `localStorage` del nivel más alto alcanzado para que la partida arranque ahí directamente al recargar la página.

## Alcance

**Incluido:**

- `generateLevelConfig(level)`: función determinística (sin `Math.random`) que, dado un número de nivel de 1 a 10, calcula la cantidad de filas de bloques, la proporción de bloques duros y el multiplicador de velocidad inicial de la pelota para ese nivel.
- `createBlocks(level)` reemplaza a la generación de bloques fija del spec 01: arma un grid de filas variables (4 a 9 según el nivel) × 10 columnas fijas, con un patrón de huecos determinístico y creciente por nivel (basado en fila/columna/nivel, sin aleatoriedad), usando 6 de los 7 colores de `SPRITES.blocks` para bloques normales de un solo golpe (`red`, `cyan`, `green`, `magenta`, `yellow`, `hotpink`).
- Bloques duros (2 golpes): desde el nivel 3, una proporción creciente de celdas (10% cada 2 niveles, tope 40%) se generan como bloques duros usando el color `gray` (reservado exclusivamente para este propósito). Al recibir el primer golpe, un bloque duro cambia de color a `red` en vez de destruirse (sin animación de explosión ni sonido de rotura, pero sumando puntos); a partir de ahí se comporta exactamente como un bloque `red` normal, y el segundo golpe lo destruye con la animación (`EXPLOSION_FRAMES`) y sonido (`break-sound.mp3`) existentes.
- Puntuación de bloques duros: cada golpe (incluido el que solo lo agrieta) suma los mismos 10 puntos (`POINTS_PER_BLOCK`) que un bloque normal; en total un bloque duro vale 20 puntos.
- Velocidad por nivel: la pelota arranca cada nivel con `speedMultiplier(level) = 1 + 0.1 * (level - 1)` aplicado sobre la velocidad base actual. El bonus existente de +5% cada 10 bloques destruidos (spec 01) sigue aplicando dentro del nivel, pero su contador (`blocksDestroyedInLevel`) se reinicia a 0 al empezar cada nivel nuevo.
- Transición entre niveles: al destruir todos los bloques de un nivel que no es el 10, se muestra en el canvas el mensaje "Nivel X completado" durante ~2000 ms (pelota y paleta congeladas, sin física), y luego se genera automáticamente el nivel siguiente (nueva grilla de bloques, pelota y paleta repositionadas, contador de velocidad reiniciado), conservando vidas y score acumulados. Al pasar a un nivel superior al máximo guardado, se persiste el nuevo valor en `localStorage`.
- Victoria final: al destruir todos los bloques del nivel 10, se detiene el bucle y se muestra "¡Ganaste el juego!" (en vez del mensaje genérico "¡Ganaste!" del spec 01) con la misma opción de reinicio (tecla Enter o botón/tap en canvas).
- Reinicio: tanto tras un Game Over como tras completar el nivel 10, reiniciar siempre vuelve a `nivel 1` con vidas y score en su valor inicial (igual criterio que el spec 01), sin alterar el nivel máximo persistido en `localStorage`.
- Persistencia de progreso: nueva clave `arkanoid_max_level` en `localStorage` (string numérico, sin versionado, mismo criterio minimalista que `arkanoid_highscore`), actualizada cada vez que se alcanza un nivel superior al guardado. Al cargar la página, el juego arranca directo (sin pantalla de selección ni menú) en el nivel leído de esa clave (o nivel 1 si no existe), con vidas y score siempre en su valor inicial.
- HUD: se agrega el indicador "Nivel N / 10" junto al score existente.

**No incluido (queda para specs futuros):**

- Pantalla de selección de nivel o menú de inicio: el juego sigue arrancando directo al cargar la página, ahora en el nivel guardado.
- Persistir vidas o score entre recargas de página: solo el nivel máximo alcanzado se persiste, igual que hoy solo se persiste el high score.
- Bloques indestructibles (obstáculo permanente que nunca se destruye): descartado explícitamente a favor de solo bloques de 2 golpes.
- Niveles más allá del 10, o progresión infinita: la progresión es un tope fijo de 10 niveles con una pantalla de victoria final concreta.
- Nuevas mecánicas de power-ups, puntajes variables por color de bloque normal, o nuevos sprites/assets: los bloques duros reutilizan colores ya existentes del spritesheet.
- Selección manual de dificultad por el jugador: la progresión es puramente secuencial 1 → 10.
- Regenerar el nivel o sus bloques ya destruidos al perder una vida dentro de una partida: perder una vida sigue solo reposicionando pelota y paleta (spec 01), sin tocar el estado de los bloques del nivel en curso.

## Modelo de datos

Todo sigue viviendo en memoria dentro de `game.js`, salvo lo indicado como `localStorage`.

- Constantes nuevas: `TOTAL_LEVELS = 10`, `BLOCK_ROWS_MIN = 4`, `BLOCK_ROWS_MAX = 9`, `BLOCK_COLS = 10` (sin cambios), `HARD_BLOCK_START_LEVEL = 3`, `HARD_BLOCK_RATIO_STEP = 0.1`, `HARD_BLOCK_RATIO_MAX = 0.4`, `LEVEL_TRANSITION_DURATION = 2000` (ms).
- `generateLevelConfig(level)` → `{ rows, hardBlockRatio, speedMultiplier }`:
  - `rows = BLOCK_ROWS_MIN + Math.round((level - 1) / (TOTAL_LEVELS - 1) * (BLOCK_ROWS_MAX - BLOCK_ROWS_MIN))`
  - `hardBlockRatio = level < HARD_BLOCK_START_LEVEL ? 0 : Math.min(HARD_BLOCK_RATIO_MAX, Math.floor((level - 1) / 2) * HARD_BLOCK_RATIO_STEP)`
  - `speedMultiplier = 1 + 0.1 * (level - 1)`
- `createBlocks(level)` reemplaza a la función equivalente del spec 01: para cada celda `(row, col)` del grid `rows × BLOCK_COLS`, decide de forma determinística (función de `row`, `col` y `level`, sin `Math.random`) si la celda queda vacía (hueco) o con bloque, y si ese bloque es duro (`color: 'gray'`) o normal (color de la paleta de 6 colores restantes, distribuido por fila como en el spec 01).
- `blocks`: mismo array `{ x, y, width, height, color, alive }` del spec 01, sin campos nuevos. Un bloque duro es simplemente uno cuyo `color` inicial es `'gray'`; al recibir un golpe, si `color === 'gray'` pasa a `'red'` (sin marcar `alive = false`); si ya es `'red'` (sea porque nació así o porque era un duro ya golpeado), el golpe lo destruye (`alive = false`) igual que a cualquier bloque normal.
- `gameState` gana dos campos: `level` (número de nivel actual, 1 a `TOTAL_LEVELS`) y `blocksDestroyedInLevel` (reemplaza al `blocksDestroyed` global del spec 01 como base del bonus de +5% de velocidad; se reinicia a 0 en cada nivel nuevo).
- Estado nuevo en memoria para la transición: `isLevelTransition` (booleano) y `levelTransitionStartTime` (timestamp), usados para mostrar "Nivel X completado" y disparar el avance automático a los `LEVEL_TRANSITION_DURATION` ms.
- `localStorage`: nueva clave `arkanoid_max_level` (string numérico, sin versionado — igual criterio que `arkanoid_highscore`).

## Plan de implementación

Cada paso deja el sistema en un estado funcional y verificable.

1. **Config procedural de niveles y HUD.** Implementar `generateLevelConfig(level)` y `createBlocks(level)` con las fórmulas de filas y huecos (sin bloques duros todavía). Agregar `gameState.level` (inicializado en 1) y mostrarlo en el HUD como "Nivel 1 / 10". Verificable: el nivel 1 se genera y juega con el nuevo grid (4 filas × 10 columnas, con huecos determinísticos), sin bloques duros, y el HUD muestra el nivel actual.
2. **Bloques duros.** Extender `createBlocks` para marcar bloques como duros (`color: 'gray'`) según `hardBlockRatio`. Extender la colisión pelota-bloque para que golpear un bloque `gray` lo recoloree a `red` (sumando 10 puntos, sin explosión ni sonido de rotura) en vez de destruirlo, y que golpear un bloque `red` lo destruya normalmente. Verificable: desde el nivel 3, algunos bloques grises requieren dos golpes (primero cambian a rojo, luego desaparecen con animación y sonido) mientras el resto se destruye en un golpe.
3. **Velocidad por nivel.** Aplicar `speedMultiplier` a la velocidad inicial de la pelota al generar cada nivel, y reiniciar `blocksDestroyedInLevel` a 0 en cada nivel nuevo (el bonus de +5% cada 10 bloques sigue acumulándose sobre esa base dentro del nivel). Verificable: la pelota arranca visiblemente más rápido en niveles avanzados que en el nivel 1, y el bonus por bloques destruidos vuelve a empezar de cero en cada nivel nuevo.
4. **Transición entre niveles y victoria final.** Al detectar que todos los bloques del nivel actual están destruidos: si `level < TOTAL_LEVELS`, mostrar "Nivel X completado" durante `LEVEL_TRANSITION_DURATION` (pelota/paleta congeladas), luego incrementar `level`, regenerar bloques con `createBlocks(level)`, reposicionar pelota y paleta, reiniciar `blocksDestroyedInLevel`, conservar vidas/score, y persistir `arkanoid_max_level` si el nuevo `level` supera al valor guardado; si `level === TOTAL_LEVELS`, detener el bucle y mostrar "¡Ganaste el juego!" con opción de reinicio. Verificable: completar un nivel intermedio muestra la transición y avanza solo al siguiente sin perder vidas/score; completar el nivel 10 muestra la pantalla de victoria final.
5. **Reinicio y reanudación persistida.** El reinicio (tras Game Over o tras "¡Ganaste el juego!") siempre restablece `gameState.level = 1` junto con vidas y score, sin tocar `arkanoid_max_level`. Al cargar la página, `gameState.level` se inicializa leyendo `arkanoid_max_level` de `localStorage` (o 1 si no existe) y el juego arranca directo en ese nivel, con vidas y score en su valor inicial. Verificable: perder las 3 vidas y reiniciar vuelve siempre al nivel 1; recargar la página tras haber alcanzado, por ejemplo, el nivel 4, arranca el juego directo en el nivel 4 con 3 vidas y score 0.

## Criterios de aceptación

- [ ] El nivel 1 se genera con la fórmula procedural (4 filas × 10 columnas, sin bloques duros) y el HUD muestra "Nivel 1 / 10".
- [ ] Cada nivel del 1 al 10 tiene un patrón de huecos distinto y determinístico (rejugar el mismo nivel produce siempre el mismo layout).
- [ ] La cantidad de filas de bloques crece con el nivel, de 4 en el nivel 1 a 9 en el nivel 10, sin salirse del canvas ni superponerse con la paleta.
- [ ] A partir del nivel 3 aparecen bloques duros (color gris), con una proporción que crece cada 2 niveles hasta un máximo de 40%.
- [ ] Golpear un bloque duro por primera vez lo cambia de gris a rojo sin destruirlo (sin animación de explosión ni sonido de rotura); el segundo golpe lo destruye con la animación y sonido existentes.
- [ ] Cada golpe a un bloque (incluido el primero de uno duro) suma 10 puntos al score.
- [ ] La velocidad inicial de la pelota aumenta con cada nivel según `speedMultiplier`, y el bonus de +5% cada 10 bloques se reinicia al empezar un nivel nuevo.
- [ ] Al destruir todos los bloques de un nivel distinto del 10, se muestra "Nivel X completado" ~2 segundos y el juego avanza automáticamente al siguiente nivel conservando vidas y score.
- [ ] Al destruir todos los bloques del nivel 10 se muestra "¡Ganaste el juego!" con opción de reinicio, en vez de la pantalla de victoria genérica del spec 01.
- [ ] Perder las 3 vidas y reiniciar siempre vuelve al nivel 1, con vidas y score en su valor inicial.
- [ ] El nivel más alto alcanzado se persiste en `localStorage` (`arkanoid_max_level`) y, tras recargar la página, el juego arranca directo en ese nivel (con vidas y score en su valor inicial), sin pantalla de selección de nivel.
- [ ] El high score (`arkanoid_highscore`, spec 01) sigue funcionando sin cambios de comportamiento.
- [ ] Los controles de teclado, mouse y táctiles (specs 01 y 02) y el resize responsive (spec 02) siguen funcionando sin cambios de comportamiento en cualquier nivel.

## Decisiones tomadas y descartadas

- **Generación procedural determinística (sin `Math.random`)** en vez de niveles diseñados a mano: permite verificar de forma reproducible el layout de cada nivel y evita mantener 10 arrays de datos a mano.
- **Tope fijo de 10 niveles** en vez de progresión infinita: permite una pantalla de victoria final concreta en vez de un juego que nunca termina de ganarse (decisión explícita del usuario tras detectar la contradicción con "generación procedural").
- **El nivel 1 pasa de 5×10 (50 bloques, spec 01) a 4×10 (40 bloques)** como piso de la fórmula de filas: se prioriza la progresión consistente 4→9 filas sobre preservar el conteo exacto de bloques del MVP original.
- **Bloques duros reutilizan colores existentes del spritesheet (gris → rojo)** en vez de agregar un sprite "agrietado" nuevo: cumple la restricción de cero dependencias/assets nuevos del proyecto (`CLAUDE.md`) y simplifica la colisión, ya que un duro golpeado una vez se comporta exactamente como un bloque rojo normal.
- **El color gris queda reservado exclusivamente para bloques duros sin golpear:** el pool de colores para bloques normales de un solo golpe pasa de 7 a 6 (`red`, `cyan`, `green`, `magenta`, `yellow`, `hotpink`).
- **Solo bloques de 2 golpes, sin bloques indestructibles:** se descartó explícitamente la opción de obstáculos permanentes para no complicar la condición de victoria (todo bloque debe poder destruirse).
- **Transición automática (~2s) entre niveles**, sin requerir input del jugador: mantiene el ritmo de juego sin agregar un control nuevo, consistente con que el juego nunca tuvo pantallas de menú (spec 01).
- **Reinicio tras Game Over (o tras ganar el juego completo) siempre vuelve al nivel 1**, no al checkpoint guardado: un Game Over es un reinicio completo de esa sesión de juego; `arkanoid_max_level` solo determina en qué nivel arranca una carga de página nueva, no un reintento dentro de la misma sesión.
- **Solo se persiste el nivel máximo alcanzado, no vidas ni score:** mismo criterio minimalista que el high score del spec 01 (un único valor escalar, sin versionado ni migración).
- **Arranque directo en el nivel guardado, sin pantalla de selección ni menú:** mantiene la filosofía "sin pantalla de inicio" del spec 01 en vez de ampliar el alcance con una nueva pantalla previa al juego.

## Riesgos identificados

- **Tunneling a velocidades altas:** el spec 01 ya identificó este riesgo con el bonus de +5% cada 10 bloques; ahora se agrava porque `speedMultiplier` puede llegar a 1.9x en el nivel 10, sumado al bonus dentro del nivel. Mitigación: mismo criterio del spec 01 (acotar el incremento máximo combinado o usar un paso de detección de colisión suficientemente fino) si se observa el problema en la práctica.
- **Layouts degenerados en niveles con muchas filas y huecos:** la fórmula determinística de huecos podría, para algún nivel puntual, dejar una fila entera vacía o un patrón poco jugable. Mitigación: al implementar la fórmula, revisar visualmente los 10 niveles y ajustar las constantes si alguno queda con muy pocos bloques o un patrón degenerado.
- **Confusión visual entre un bloque duro ya golpeado (rojo) y un bloque normal rojo:** no hay distinción visual entre ambos tras el primer golpe. Mitigación: aceptado como decisión de diseño (ver Decisiones) — es intencional que un duro ya agrietado se comporte igual que uno normal.
