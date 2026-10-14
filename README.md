# PAC-MAN 2026 — The Living Maze

Reinterpretación 2026 del clásico de 1980: mecánica arcade fiel con estética de jardín nocturno inmersivo.

## Stack

TypeScript + Vite + Canvas 2D. HUD en DOM/CSS. Audio sintetizado con WebAudio (cero assets).

## Ejecutar

```bash
npm install
npm run dev        # http://localhost:5173
npm run typecheck  # tsc --noEmit
npm test           # vitest (18 tests: mapa + IA)
```

## Sprites

El juego funciona 100% con sprites procedurales, pero si colocás la hoja de sprites en
`public/assets/sprite-sheet.png` se extraen automáticamente manzana, manzana dorada,
cerezas y llave (recorte con flood-fill de fondo + recorte de bounding box).

## Reglas arcade implementadas

- 263 manzanas (10 pts) + 4 manzanas doradas (50 pts)
- Personalidades originales:
  - **Blinky** (El Perseguidor): apunta a la casilla de Pac. Con pocos ítems restantes entra en modo Elroy (+velocidad, persigue siempre).
  - **Pinky** (La Emboscadora): 4 casillas por delante de Pac, con el desbordamiento clásico hacia arriba.
  - **Inky** (El Estratega): duplica el vector desde Blinky hacia 2 casillas delante de Pac.
  - **Clyde** (El Errante): persigue si está a más de 8 casillas, si no se dispersa.
- Ciclos scatter/chase por tabla (7s/20s/7s/20s/5s/20s/5s/∞), con reversión al cambiar de fase
- Modo fright con duración decreciente por nivel, combo 200/400/800/1600 y parpadeo final
- Los fantasmas comidos vuelven como ojos a la fuente central y renacen
- Túnel lateral con ralentización de fantasmas
- 3 caminos secretos ocultos en los setos (solo Pac pasa; +100 al descubrirlos)
- Coleccionables por nivel: cerezas (100) y llave dorada (1000), apareados por progreso
- Vida extra cada 10.000 puntos; récord persistido en localStorage

## Laberinto

Diseño propio de 23×25 inspirado en el mockup: fuente central (casa de fantasmas), corredores de setos con lámparas, túnel lateral y 3 pasajes secretos escondidos dentro de los setos.

## Arquitectura

```
src/
  core/      loop de timestep fijo, input (teclado + swipe + d-pad)
  game/      constantes arcade, mapa + física en grilla, Pac, IA de fantasmas,
             engine de estados, audio WebAudio
  render/    capa estática del laberinto, sprites procedurales, extracción PNG,
             partículas y textos flotantes, renderer principal
  ui/        HUD en español (paneles del mockup), pantallas menú/pausa/gameover
tests/       validez del mapa (conectividad, sin callejones) y targeting de IA
```

## Controles

Flechas / WASD · **P** pausa · **M** silencio · Enter/JUGAR para empezar · swipe + d-pad en táctil.

## Modo cooperativo local

- **Jugador 1:** WASD y **F** para usar el objeto equipado.
- **Jugador 2:** flechas y **Enter** para usar el objeto equipado.
- Las vidas, puntuación y coleccionables son compartidos. Una captura lleva a la cárcel; si ambos quedan presos se pierde una única vida.
- La configuración de duraciones, munición y protección está centralizada en `COOP` dentro de `src/game/constants.ts`.
