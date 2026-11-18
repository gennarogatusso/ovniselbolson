# Emboscada de agentes secretos durante la escena de la espada

## Intención
Después de recoger la espada alienígena, el protagonista debe afrontar una emboscada de agentes secretos antes de poder entrar en la base. El combate debe sentirse como la escena de los soldados que ya existe, con la espada como arma del protagonista.

## Diseño elegido
**Reutilizar la estructura de combate de los soldados y añadir una fase propia para los agentes.** Se comparte la lógica probada de movimiento, vida, daño, proyectiles, impactos, voltereta, habilidad R y HUD. La fase nueva conserva sus propios agentes, sprites, diálogo, sonidos y condición de victoria. No se crea un segundo motor de combate ni se modifica la batalla militar existente.

La alternativa de construir un sistema de combate independiente se descarta porque duplicaría mecánicas que el juego ya tiene y aumentaría el riesgo de diferencias o errores.

## Secuencia y comportamiento
1. Al terminar la animación de recoger la espada, aparecen cuatro agentes en el mismo escenario: dos agentes regulares y dos agentes con escudo, usando los cinco sprites ya cargados en `public/imagens/`.
2. Al aparecer, se muestra un aviso visual destacado con el texto: **«Esta es un área restringida, un paso más y disparo»**. El aviso se presenta como una alerta de seguridad integrada en la escena, sin tapar permanentemente la acción.
3. Comienza el combate. Los agentes apuntan, disparan proyectiles y atacan al protagonista. Se muestran barras de vida individuales sobre ellos, además de los efectos de disparo, impacto y eliminación.
4. El protagonista conserva los controles del combate: movimiento, ataque primario y secundario de espada, R y voltereta. R debe apuntar a un agente vivo; la voltereta mantiene la invulnerabilidad y el enfriamiento existentes.
5. El ataque primario y el secundario de espada reciben sonidos diferenciados. Se agregan/ajustan sonidos para disparos enemigos, impactos, escudos, daño al jugador, R, voltereta y derrota de agentes.
6. La entrada a la base queda bloqueada mientras haya agentes vivos. Al derrotar a los cuatro, se cierra el combate y vuelve a habilitarse el avance normal con la espada hacia la base.

## Derrota y reinicio
Si el protagonista pierde toda la vida durante la emboscada, reaparece en el punto de control del encuentro con la vida restaurada y los agentes reiniciados, siguiendo el comportamiento de recuperación de la batalla militar.

## Límites y preservación
- No cambiar la escena militar existente ni sus cuatro soldados, balance, cinemáticas o controles.
- No alterar escenas previas de la nave, el bosque, La Cruz ni la recolección de la espada.
- Reutilizar el aspecto visual y las mecánicas existentes; usar los sprites de agentes ya subidos sin reemplazarlos ni deformar sus proporciones.
- Mantener compatibilidad con teclado y controles móviles.
- El texto de advertencia debe aparecer al inicio del encuentro y no repetirse durante cada ataque.

## Comprobaciones de aceptación
- La emboscada empieza una sola vez al terminar la recolección de la espada.
- El texto de advertencia aparece cuando llegan los agentes.
- Los cuatro agentes tienen barra de vida y pueden recibir daño de ambos ataques de espada y de R.
- Los agentes disparan y sus proyectiles/impactos tienen efectos visuales y sonoros.
- R y voltereta funcionan durante todo el combate, también en móvil.
- No se puede entrar a la base con un solo agente vivo; sí se puede avanzar tras derrotarlos a todos.
- La derrota reinicia la emboscada y no altera el checkpoint de otros combates.
