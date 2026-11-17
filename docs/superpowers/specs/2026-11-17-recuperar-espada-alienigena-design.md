# Recuperar la espada alienígena — Diseño

## Intención
Insertar una escena breve de hallazgo y recuperación de la espada entre el sendero que se aleja de La Cruz y la instalación secreta.

## Comportamiento acordado
- Al terminar el sendero, entrar en un escenario nuevo con el fondo `public/imagens/escenario espada.png`.
- Mostrar `public/imagens/espada.png` tirada cerca del alienígena con la cruz que aparece en ese fondo.
- El protagonista camina hasta encontrarla y se detiene.
- Mostrar la acción `AGARRAR ESPADA ALIENÍGENA`.
- Al activarla, reproducir en orden los cinco sprites `agarrando la espada 1.png` a `agarrando la espada 5.png`.
- Al terminar, dejar al protagonista equipado con la espada y detener el avance en esa escena.

## Límites
- No continuar todavía hacia la instalación secreta.
- No agregar ataques ni nuevas mecánicas de combate con la espada.
- No alterar escenas, controles, armas, enemigos, música ni animaciones existentes fuera de la transición necesaria desde el sendero.
- Mantener el repositorio GitHub como fuente oficial y hacer cambios localizados.

## Implementación propuesta
Añadir etapas explícitas al capítulo de la nave para la llegada, la espera de interacción, la animación de recogida y el estado final equipado. El motor controla las transiciones; el renderizador dibuja el fondo, la espada en el suelo y los sprites preparados con transparencia; la carga de imágenes se limita a los nuevos recursos.

## Criterio de aceptación
El sendero actual termina en la nueva escena, el jugador puede recoger la espada con la acción indicada, se ven los cinco cuadros en orden, el personaje queda equipado y no se inicia la escena de la instalación. Las pruebas existentes de la secuencia anterior deben seguir pasando.
