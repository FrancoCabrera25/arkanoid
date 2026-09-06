# Arkanoid

Un juego de Arkanoid hecho con HTML, CSS y JavaScript nativo, sin dependencias
(sin `package.json`, bundlers ni librerías).

## Cómo jugar

El `index.html` debe servirse por HTTP (no abrir con `file://`, porque el
spritesheet no carga por CORS):

```
python3 -m http.server 8000
```

Luego abrir `http://localhost:8000`.

**Controles:**

- Mover la paleta: flechas ← → / A / D, mouse, o arrastre táctil.
- Pausar/reanudar: tecla `P`, o el botón de pausa dibujado en el canvas.
- Reiniciar tras Game Over o victoria: tecla `Enter`, o tap/click en el botón en
  canvas.

En dispositivos táctiles en orientación vertical se pide rotar a horizontal
antes de jugar.

## Funcionalidad implementada

- Física de pelota con ángulo de rebote según el punto de impacto en la paleta.
- 10 niveles procedurales con dificultad creciente (más filas de bloques,
  huecos variables y bloques de 2 golpes desde el nivel 3), con transición
  automática entre niveles y pantalla de victoria al completar el nivel 10.
- Vidas, puntuación y velocidad de la pelota creciente con el progreso.
- High score y nivel máximo alcanzado persistidos en `localStorage`.
- Canvas responsive (320–800 px, proporción 4:3) y controles táctiles.
- Animaciones de explosión y sonido al destruir bloques y en cada rebote.

## Desarrollo

El proyecto sigue un flujo de spec-driven development: cada funcionalidad
nueva se diseña primero como un archivo en `specs/` (comando `/spec`) y luego
se implementa a partir del spec aprobado (comando `/spec-impl`). Ver
`specs/01-mvp-jugable.md`, `specs/02-responsive-y-controles-tactiles.md` y
`specs/03-niveles-procedurales.md` para el historial de decisiones, y
`CLAUDE.md` para las restricciones y arquitectura del proyecto.
