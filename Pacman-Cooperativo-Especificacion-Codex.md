# Pacman cooperativo — especificación para Codex

## 1. Encargo y alcance

Extender el proyecto existente, sin reconstruirlo desde cero. Base declarada por el usuario: Vite 6, Canvas 2D con sprites 100% procedurales, HUD DOM/CSS, WebAudio sintetizado sin assets y Vitest con 18 tests de mapa e IA.

No se ha inspeccionado el repositorio. La estructura sugerida es una propuesta, no una descripción del código actual. Antes de editar, leer AGENTS.md, package.json, el mapa, el bucle, las entidades, la IA y los tests. Ejecutar las comprobaciones existentes y registrar su resultado. Reutilizar la arquitectura cuando sea adecuada y adaptar los nombres de módulos a la organización real.

Implementar primero cooperativo local para dos jugadores. Online queda fuera de esta entrega. Mantener el modo individual si existe. No actualizar Vite ni sustituir Canvas, WebAudio o Vitest para implementar estas mecánicas. No incorporar assets ni dependencias sin una necesidad demostrada.

Fuente funcional: decisiones del usuario en esta conversación. Los valores identificados como propuestos son parámetros iniciales de diseño, no resultados de pruebas de jugabilidad.

## 2. Reglas confirmadas por el usuario

- Dos Pacman interactúan en el mismo laberinto.
- Pacman y fantasmas pueden recoger armas y disparar balas.
- El hielo congela a Pacman y fantasmas durante exactamente 5 segundos.
- La invisibilidad oculta el cuerpo y mantiene visibles los ojos de Pacman o fantasma.
- Un Pacman capturado va a la cárcel de los fantasmas.
- Solo puede rescatarse comiendo fantasmas o mediante una llave.
- La llave solo se habilita cuando hay un Pacman preso y aparece como objeto de recolección.
- No existe rescate manteniendo una interacción durante dos segundos ni cuenta regresiva de diez segundos para perder una vida por una captura.
- El jabón permite disparar una burbuja que inmoviliza durante exactamente 10 segundos. Puede afectar al compañero o a un fantasma; los fantasmas también pueden utilizarlo.
- Un Pacman congelado o dentro de una burbuja no puede ser matado ni capturado por contacto con un fantasma.
- Si ambos Pacman quedan presos, el equipo pierde UNA vida. La partida solo termina cuando ya no quedan vidas.

## 3. Decisiones propuestas para una primera implementación

Implementar estos valores como configuración central modificable:

| Parámetro | Valor inicial |
| --- | --- |
| Vidas compartidas | 3 |
| Duración del hielo | 5 s, confirmada |
| Duración de burbuja | 10 s, confirmada |
| Duración de invisibilidad | 6 s |
| Duración de poder | 8 s |
| Aturdimiento por bala | 2 s |
| Munición por arma | 3 balas |
| Protección al salir de hielo, burbuja o cárcel | 1 s |
| Anticipación del ataque de fantasma invisible | 0,7 s |
| Inmunidad a otra inmovilización tras liberarse | 3 s |

La bala aturde, no mata ni envía a la cárcel. Arma e hielo no afectan al compañero; jabón sí. Los efectos de inmovilización no se acumulan ni se renuevan mediante nuevos impactos. Los fantasmas inmovilizados tampoco pueden ser comidos.

Puntuación y recolección compartidas. Victoria propuesta: completar los coleccionables obligatorios y llegar ambos, libres, a la salida. La llave y los objetos tácticos no forman parte del contador obligatorio. Si el proyecto ya tiene otra condición de victoria, integrar la condición de ambos libres y documentar la adaptación.

## 4. Captura, cárcel y vidas

Un contacto válido entre fantasma peligroso y Pacman libre sin protección produce captura inmediata. Teletransportar al Pacman a una posición interior de la cárcel; borrar su objeto equipado y efectos temporales. Bloquear ataques y recolección desde la cárcel. El jugador conserva señales de ayuda y puede mover su personaje dentro del recinto si su geometría lo permite.

La cárcel debe distinguir spawns de fantasmas, zona del preso y puerta de rescate. Los fantasmas pueden entrar y salir por su acceso habitual; los Pacman no atraviesan la puerta cerrada. La ruta al punto de apertura debe ser alcanzable para el jugador libre.

Mientras quede un Pacman libre, no hay plazo de rescate ni pérdida automática de vida.

Cuando ambos están presos:

1. Resolver una transición única de pérdida de vida; no descontar cada frame.
2. Restar una vida compartida.
3. Si quedan vidas, reiniciar posiciones de ambos Pacman y fantasmas, limpiar proyectiles, llave, inventarios, efectos y progreso de rescate.
4. Conservar puntuación y coleccionables ya recogidos. Reponer un mínimo de recursos de rescate si su agotamiento pudiera impedir futuras liberaciones.
5. Reanudar tras una cuenta de inicio breve y protección inicial configurable.
6. Si quedan cero vidas, mostrar fin de partida y opción de reinicio completo.

No confundir preso con congelado o en burbuja: dos Pacman inmovilizados no descuentan una vida.

## 5. Las dos vías de rescate

### Llave

Al pasar de cero a un Pacman preso, crear un ciclo de rescate y generar una única llave en una celda transitable alcanzable desde el jugador libre, fuera de la cárcel, sin superposición con objetos o personajes. Preferir una distancia mínima configurable mediante distancia de caminos. Nunca esperar indefinidamente a un azar de aparición.

El Pacman libre recoge la llave al tocarla. Se transporta en un espacio especial, independiente del objeto táctico. Al tocar la zona exterior de apertura de la puerta, abrir y liberar al preso sin tiempo de interacción. Consumir la llave, borrar el ciclo y colocar al liberado en una celda segura de salida con protección breve.

Los fantasmas no pueden recoger ni bloquear físicamente la llave. Si se completa el rescate por la otra vía, retirar la llave del mapa o inventario. Si el portador también es capturado, resolver pérdida de vida y limpiar la llave.

Si no hay celda elegible por las preferencias de distancia, relajar esas preferencias; nunca relajar alcanzabilidad. Un mapa sin ruta válida debe fallar su validación antes de jugar.

### Comer fantasmas

Interpretación propuesta de «comiendo a los fantasmas»: comer una vez a cada fantasma participante durante el ciclo de rescate. Guardar un conjunto de IDs pendientes tomado al iniciar el ciclo. Comer al mismo fantasma dos veces no cuenta dos veces. El progreso se conserva entre píldoras de poder y se borra al terminar el ciclo o perder una vida.

Al vaciar el conjunto, liberar automáticamente al preso, retirar cualquier llave y mostrar una notificación. Los fantasmas comidos regresan a su casa y se regeneran según el sistema existente; su regeneración no revierte el progreso.

Garantizar disponibilidad de al menos una píldora de poder durante el ciclo si no queda ninguna: generar una de rescate alcanzable. Si se agota sin terminar, reponer otra tras un intervalo configurable. La llave sigue siendo una alternativa garantizada.

## 6. Inventario y proyectiles

Cada personaje lleva un objeto táctico: arma, hielo o jabón. Al recoger otro, intercambiar y dejar el anterior en una celda disponible; aplicar bloqueo breve de recolección para evitar intercambios automáticos repetidos. Si no hay celda libre, rechazar el intercambio con señal visual, sin destruir objetos.

La invisibilidad y el poder se activan al recoger la píldora y no ocupan inventario. La llave ocupa su espacio propio. Recoger de nuevo el mismo efecto refresca hasta su duración máxima; no suma tiempo indefinidamente.

Los proyectiles salen en la dirección actual del personaje, chocan contra muros y afectan solo al primer objetivo válido. Definir velocidad, radio, alcance y enfriamiento en configuración. Utilizar colisión barrida o subpasos para que las balas no atraviesen paredes u objetivos con un frame largo. Destruir el proyectil al impacto y limitar cantidad simultánea.

Guardar propietario, equipo y tipo en cada proyectil. Evitar autoimpacto. El jabón puede alcanzar al compañero; nunca al emisor. Un impacto sobre un personaje inmovilizado consume el proyectil sin extender el efecto. Invulnerabilidad bloquea efectos hostiles; la protección breve no debe impedir recoger objetos o abrir la cárcel.

## 7. Estados y precedencia

Separar estado de partida, condición física y efectos. Evitar combinaciones de booleanos incompatibles.

- Partida: inicio, jugando, pausa, pérdida de vida, victoria, fin.
- Condición de entidad: activa, aturdida, congelada, burbuja, presa; retorno/regeneración adicional para fantasmas.
- Efectos independientes: invisibilidad, poder y protección temporal.
- Inventario y ciclo de rescate independientes de las animaciones.

Congelado o burbuja: sin movimiento, disparos, recolección ni captura; pausa de los temporizadores de poder/invisibilidad. Protección e inmunidad se cuentan con tiempo de simulación. Preso: limpiar efectos. Aturdido: inmóvil pero puede ser capturado/comido, salvo protección independiente.

Orden por tick: leer acciones; actualizar movimiento; detectar y resolver impactos de proyectiles; recoger objetos; resolver contactos de captura o consumo; aplicar rescates; evaluar ambos presos y pérdida de vida; evaluar victoria. Mantener resoluciones idempotentes y desempates por IDs estables. Si una píldora de poder se recoge en el mismo tick que un contacto, el poder ya se aplica. La protección por hielo/burbuja tiene prioridad sobre comer o capturar.

## 8. Invisibilidad y poder

La invisibilidad no da inmunidad. Dibujar solo ojos, conservando orientación y geometría coherentes; no dibujar dos ojos automáticamente en todos los ángulos. Para el compañero, permitir contorno tenue identificable. No mostrar el contorno a la IA enemiga ni usar información visual como estado lógico.

Fantasma ante Pacman invisible: perseguir última posición conocida, después buscar o patrullar; detectar por proximidad configurable y línea de visión. No consultar su posición exacta para perseguirlo fuera de esas condiciones.

Fantasma invisible: mostrar ojos y animar recuperación del cuerpo durante 0,7 s antes de ataque o captura. Durante esa anticipación no captura. Atacar cancela la invisibilidad tanto en Pacman como en fantasmas.

La píldora de poder beneficia solo al Pacman que la recoge en esta propuesta. Un fantasma vulnerable es comido por contacto con ese Pacman, excepto si está congelado o en burbuja. Si dos Pacman tocan al mismo fantasma, resolver su consumo una sola vez.

## 9. IA de fantasmas

Extender las pruebas e IA existentes. Elegir objetivos entre Pacman libres y detectables; excluir presos y evitar acampar junto a personajes inmovilizados. Dar funciones configurables de perseguidor, interceptor, patrullero y guardia móvil, sin bloquear permanentemente la puerta.

Los fantasmas recogen objetos útiles en rutas cercanas; no desvían todas sus acciones hacia el equipamiento. Disparan solo con dirección válida, línea de visión y enfriamiento cumplido. Introducir reacción configurable y anticipación visible; no disparar al instante de adquirir un objeto.

Usar el mismo sistema de colisiones y objetos para ambos equipos. Los fantasmas no recogen llave ni poder. La IA no conoce posiciones de Pacman invisibles salvo detección autorizada. El comportamiento debe poder verificarse con RNG de semilla fija.

## 10. Mejoras propuestas para la base técnica

### Simulación desacoplada

Adoptar actualización fija propuesta de 60 Hz con acumulador e interpolación visual en requestAnimationFrame. Limitar recuperación de ticks tras pausas largas. Al ocultar la pestaña o perder foco, pausar la partida y vaciar entradas sostenidas. No usar setTimeout para efectos del juego: todos dependen del reloj de simulación y se detienen al pausar.

Mantener lógica de reglas pura cuando sea posible: recibe estado, acciones, dt y RNG; devuelve estado/eventos. Canvas, DOM y WebAudio consumen eventos, sin decidir capturas o vidas. Esto facilita tests y una futura adaptación online sin implementarla ahora.

### Organización sugerida, adaptar al repositorio

| Área | Responsabilidad |
| --- | --- |
| Configuración | Duraciones, velocidades, dificultad, controles |
| Mundo/mapa | Transitabilidad, coleccionables, cárcel, puntos de aparición |
| Entidades | Pacman, fantasmas, inventarios, estados |
| Sistemas | Movimiento, IA, proyectiles, efectos, captura, rescate |
| Sesión | Vidas, puntuación, pausas, transiciones, victoria |
| Render | Cámara, cachés procedurales, animaciones y efectos |
| Entrada | Teclado y mandos, acciones normalizadas |
| Presentación | HUD DOM y eventos sonoros |

No introducir ECS, framework o reestructuración masiva solo por seguir esta tabla. Extraer responsabilidades gradualmente donde el código actual lo necesite.

### Mejora visual en Canvas 2D

Crear profundidad aparente con texturas procedurales de césped, bordes de setos, caminos y sombras de contacto. Mantener iluminación desde arriba a la derecha en todos los sprites. Cachear mapa estático y atlas procedurales en canvas auxiliares; no regenerar texturas, gradientes complejos o ruido cada frame.

Animar boca, movimiento de fantasmas y giros intermedios. Interpolar orientación visual sin cambiar dirección lógica antes de un giro válido. Identificar jugadores con accesorio turquesa/coral, número y marcador inferior; no depender solo del color.

Hielo translúcido con grietas, burbuja transparente con reflejos y ojos visibles durante invisibilidad. Limitar partículas y preservar lectura de pasillos. Ofrecer modo de efectos reducidos. La propuesta apunta a apariencia volumétrica natural; el hiperrealismo no se promete manteniendo exclusivamente gráficos procedurales 2D.

Separar resolución lógica de tamaño CSS; ajustar backing store por devicePixelRatio con límite configurable. Empezar con cámara compartida y mapa completo legible. No introducir pantalla dividida hasta comprobar que el tamaño del mapa la requiere.

### HUD y sonido

HUD DOM: vidas compartidas, puntuación, recolección pendiente, estado e inventario por jugador. Durante rescate: icono de llave, portador y fantasmas pendientes. Indicadores breves para 5 s de hielo y 10 s de burbuja. Menú con controles, volumen, pausa y reinicio. Todos los textos visibles en español.

WebAudio: activar AudioContext con interacción del usuario, controlar volumen maestro, limitar voces simultáneas y liberar nodos terminados. Crear sonidos diferenciados de captura, pérdida de vida, rescate, disparo, hielo y burbuja. Pausar/suspender audio junto con el juego. No crear contextos nuevos por sonido.

### Controles

Jugador 1: WASD, F para usar objeto, G para señal. Jugador 2: flechas, Enter para objeto, Shift derecho para señal. Escape pausa. Controles configurables; admitir mandos si el proyecto ya los soporta. Prevenir scroll únicamente mientras el área de juego está activa. Documentar posible ghosting de teclado y permitir reasignación. No prometer juego cómodo para dos personas en una pantalla táctil pequeña.

## 11. Plan de implementación

1. Diagnóstico real del repositorio y ejecución de sus 18 tests declarados; informar cantidad real y fallos previos.
2. Configuración, segundo jugador, entrada independiente, estados y vidas compartidas.
3. Cárcel, pérdida única de vida, reinicio parcial y llave garantizada.
4. Poder y rescate por conjunto de fantasmas comidos.
5. Proyectiles, arma, hielo y jabón con protección y precedencia.
6. Invisibilidad y extensión de IA.
7. HUD, sonido y mejoras procedurales de lectura y profundidad.
8. Tests, build y prueba manual con ambos jugadores.

Cada fase debe ser jugable y conservar las comprobaciones anteriores. No entregar botones ficticios, reglas sin integrar ni pseudocódigo como implementación final.

## 12. Tests requeridos en Vitest

Conservar los tests existentes y añadir pruebas de comportamiento, con simulación y RNG controlados:

- Una captura envía a cárcel sin descontar vida.
- Dos capturas descuentan exactamente una vida, incluso al avanzar múltiples ticks.
- Reinicio con vidas restantes conserva recolección/puntuación y limpia efectos, llave y proyectiles; cero vidas produce fin.
- Hielo dura 5 s; burbuja dura 10 s; pausa no consume duración.
- Contacto fantasma no captura a Pacman congelado/en burbuja.
- Dos jugadores inmovilizados no cuentan como dos presos.
- Nuevos impactos no prolongan inmovilización y se respeta inmunidad posterior.
- Jabón afecta al compañero; bala e hielo no.
- Llave aparece solo con preso, es única y alcanzable; apertura libera y consume llave.
- Rescate por fantasmas cuenta IDs únicos y persiste entre efectos de poder; limpia llave al terminar.
- Recursos de rescate siguen disponibles tras agotamiento y reinicio parcial.
- Invisibilidad oculta información a IA fuera de detección y termina al atacar.
- Proyectiles no atraviesan paredes con dt o velocidad elevados.
- Contactos simultáneos no duplican puntuación, rescate o pérdida de vida.
- No hay victoria con un jugador preso o sin ambos en salida.

Ejecutar los scripts reales de test y build de package.json, no asumir sus nombres. Informar resultados y fallos pendientes. Prueba manual: teclado simultáneo, intercambio de objetos, todos los estados, captura doble, cada vía de rescate, pausa/pérdida de foco, sonido y redimensionado.

## 13. Criterios de entrega

Entregar código integrado, configuración documentada, tests y resumen de cambios. Explicar qué archivos se modificaron, cómo se ejecuta y qué se verificó. No afirmar haber probado navegador, mandos o audio si no se hizo.

La entrega se acepta cuando dos personas pueden completar un nivel, rescatar por ambas vías, utilizar los objetos, perder una vida por captura doble y continuar hasta agotar vidas, sin bloqueos de rescate ni errores de estado.

## 14. Prompt para utilizar este documento en Codex CLI

> Leé AGENTS.md y Pacman-Cooperativo-Especificacion-Codex.md. Inspeccioná el proyecto existente y sus tests antes de editar. Implementá la versión cooperativa local de forma incremental, manteniendo Vite, Canvas 2D procedural, HUD DOM/CSS, WebAudio sintetizado y Vitest. Priorizá las reglas confirmadas del apartado 2; usá los valores propuestos como configuración inicial. Ambos Pacman presos descuentan una sola vida compartida y reinician posiciones si quedan vidas. Completá cárcel, las dos vías de rescate, objetos, estados, IA y HUD. Ejecutá tests y build reales y reportá resultados. No reconstruyas el proyecto desde cero ni implementes online.
