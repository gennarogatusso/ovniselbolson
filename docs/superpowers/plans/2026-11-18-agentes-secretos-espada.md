# Emboscada de agentes secretos con espada — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir una emboscada obligatoria de cuatro agentes secretos después de recoger la espada, con aviso, combate cuerpo a cuerpo, disparos enemigos, R, voltereta y acceso a la base solo tras vencerlos.

**Architecture:** La emboscada tendrá estados y una colección de agentes propios, pero reutilizará las reglas ya probadas del combate de los soldados para movimiento, salto/rodada, proyectiles, colisiones, vida y efectos. Los ataques de espada usarán las animaciones y daños que ya existen; las escenas militares conservarán sus soldados y su comportamiento. Los cinco sprites nuevos se cargarán desde `public/imagens/` y el aviso se dibujará en el canvas del escenario.

**Tech Stack:** TypeScript, React, canvas 2D, Vitest y Web Audio API existentes. No se agregan dependencias.

**Spec:** `docs/superpowers/specs/2026-11-18-agentes-secretos-espada-design.md`

## Global Constraints

- El repositorio oficial es GitHub y la rama de trabajo es `main`; Lovable se usa solamente como vista previa.
- Mantener sin cambios de comportamiento el enfrentamiento `soldierFight` y sus cuatro soldados.
- La emboscada inicia al terminar la animación `swordPickup` (2.5 s).
- Son cuatro agentes: dos regulares y dos con escudo.
- El texto del aviso es exactamente: `Esta es un área restringida, un paso más y disparo`; permanece visible durante 3.5 s al comenzar la emboscada.
- Se reutilizan los ataques actuales: primario de 35 de daño y 112 de alcance; secundario de 70 de daño y 72 de alcance; enfriamiento secundario de 0.9 s.
- La habilidad R conserva su enfriamiento de 5 s; la voltereta reutiliza `SHIP.rollTime` y `SHIP.rollCooldown`.
- No se incorporan dependencias ni se reemplazan fondos, sprites o música de otras escenas.

## Review Focus

1. **Acceso prematuro:** con uno o más agentes vivos, caminar hacia el límite derecho no puede iniciar `baseFade`. Prueba: mantener un agente con vida y avanzar hasta el borde.
2. **Objetivos inválidos de R:** R solo se activa si hay un agente vivo y debe volver a apuntar a otro si el objetivo muere antes del impacto. Prueba: objetivo muerto/no disponible y selección de objetivo vivo.
3. **Daño durante voltereta:** los proyectiles no deben dañar al protagonista mientras `roll > 0`, y el enfriamiento existente debe respetarse. Prueba: impacto durante y después de la rodada.
4. **Ataques repetidos por mantener pulsado:** el primario/secundario solo deben aplicar daño una vez por pulsación, respetando el cooldown y las animaciones actuales. Prueba: mantener ambos controles pulsados en la emboscada.
5. **Reinicio y regresiones:** perder debe reiniciar agentes, salud y proyectiles sin alterar el checkpoint militar. Pruebas: respawn de agentes y pruebas existentes de `soldierFight`.

---

### Task 1: Engine — iniciar y completar la emboscada

**Files:**
- Modify: `src/components/game/game-engine.ts`
- Test: `src/test/game-engine.test.ts`

**Interfaces:**
- Consumes: `GroundSoldier`/lógica actual de `soldierFight`, `SHIP`, `SWORD_PRIMARY_*`, `SWORD_SECONDARY_*`, `shipHit`, `spawnCombatImpact`.
- Produces: estados `agentFight` y `agentEnd`; colección `ship.agents`; constante exportada `AGENT_WARNING_MESSAGE`; helper público `respawnAtAgentCheckpoint(s:S): void`.

- [ ] **Step 1: Write failing tests** en `src/test/game-engine.test.ts` para: inicio automático de la emboscada al acabar `swordPickup`; cuatro agentes (dos regulares y dos con escudo); texto exacto/duración del aviso; `shipIsCombat` habilita el HUD durante la emboscada y los ataques de espada; R apunta a agentes vivos; los dos ataques de espada dañan a agentes y regresan al combate; voltereta evita daño; la base queda bloqueada mientras haya agentes vivos y vuelve a habilitarse al derrotarlos; respawn reinicia el encuentro.
- [ ] **Step 2: Run the focused tests**: `npm test -- src/test/game-engine.test.ts`. Expected: FAIL porque los estados, agentes, función de respawn y comportamiento aún no existen.
- [ ] **Step 3: Implement the engine behavior** en `game-engine.ts`: inicializar `agents` y la bandera de encuentro; al terminar `swordPickup`, preparar los cuatro agentes y entrar a `agentFight`; reutilizar las reglas de movimiento, salto, voltereta, daño, proyectiles y colisiones del combate militar sin reutilizar ni mutar `soldiers`; activar el ataque primario/secundario de espada contra agentes con los valores ya existentes; hacer que las animaciones `swordAttack`/`swordSecondaryAttack` regresen a `agentFight` mientras queden agentes vivos; extender `triggerSpecial` para buscar y perseguir agentes vivos; al quedar todos en cero, pasar a `agentEnd` y luego a `swordEquipped`; bloquear la transición a `baseFade` mientras el encuentro siga activo; añadir `respawnAtAgentCheckpoint` que restablezca vida, agentes, cooldowns, indicadores de pulsación y proyectiles.
- [ ] **Step 4: Run focused tests**: `npm test -- src/test/game-engine.test.ts`. Expected: PASS para los nuevos casos y los casos existentes de espada y soldados.
- [ ] **Step 5: Commit**: `feat: add secret agent sword encounter`.

### Task 2: Renderer — sprites, barras y aviso de área restringida

**Files:**
- Modify: `src/components/game/game-renderer.ts`

**Interfaces:**
- Consumes: `ship.agents`, `agentFight`, `agentEnd`, `AGENT_WARNING_MESSAGE`, `AGENT_WARNING_DURATION`.
- Produces: dibujo de los agentes con estados visuales idle/walk/aim; barras de vida individuales; proyectiles/efectos de combate; cartel de advertencia dentro de la escena.

- [ ] **Step 1: Extend `ShipImages`** con las imágenes de agente regular (quieto, caminando y apuntando) y las dos poses del agente con escudo; dibujar cuatro agentes, orientados hacia el protagonista, usando sus poses según movimiento/ataque/impacto. Mantener barras de vida individuales y el estilo actual del HUD.
- [ ] **Step 2: Incluir `agentFight`/`agentEnd` en la composición de la escena de la espada**, dibujar los proyectiles enemigos, destellos de disparo e impactos y mostrar durante `AGENT_WARNING_DURATION` la advertencia en un panel visible de estilo alerta, con buen contraste y sin ocultar permanentemente al jugador ni a los agentes. Usar `AGENT_WARNING_MESSAGE` como única fuente literal del texto.
- [ ] **Step 3: Run `npm run build`** para comprobar los tipos de imágenes y la integración del canvas. Expected: Vite build exitoso.
- [ ] **Step 4: Review the changed renderer diff** para confirmar que las ramas de escenas militares, base, bosque y La Cruz no cambian; commit `feat: render secret agents and restricted-area warning`.

### Task 3: Asset loader and controls — escritorio y móvil

**Files:**
- Modify: `src/components/game/UfoGame.tsx`

**Interfaces:**
- Consumes: nuevos campos de imagen de `ShipImages` y helpers `shipIsCombat`/`respawnAtAgentCheckpoint`.
- Produces: cinco sprites nuevos cargados y preparados; entrada de checkpoint; R, voltereta y ataques de espada habilitados también en móvil.

- [ ] **Step 1: Load these exact existing files** dentro del `Promise.all` y preparar sus transparencias: `agente secreto.png`, `agente secreto caminando.png`, `agente secreto apuntando.png`, `agentre secreto escudo.png`, `agentre secreto escudo 2.png` (conservar el nombre `agentre`, tal como está en el repositorio). Asociarlos a `ShipImages` sin alterar el orden/destructuring de los demás assets.
- [ ] **Step 2: Extender la recuperación de derrota** para llamar a `respawnAtAgentCheckpoint` cuando el resultado sea `lose` durante `agentFight`; adaptar el joystick vertical, el botón de ataque primario, secundario, R y voltereta para la emboscada. Mantener X exclusivo del combate militar.
- [ ] **Step 3: Run** `npm run build` y `npm test -- src/test/game-engine.test.ts`; Expected: ambos PASS. Revisar que el bloque `soldierFight` siga usando sus controles originales; commit `feat: wire secret agent assets and mobile controls`.

### Task 4: Audio — golpes de espada y combate de agentes

**Files:**
- Modify: `src/components/game/game-engine.ts`
- Modify: `src/components/game/game-audio.ts`
- Test: `src/test/game-engine.test.ts`

**Interfaces:**
- Consumes: cola `ship.sounds`, eventos existentes `roll`, `super`, `impact`, métodos `tone()` y `noise()`.
- Produces: eventos `swordPrimary`, `swordSecondary`, `agentArrival`, `agentShot`, `agentHit` y `agentDefeated` (además de reutilizar `roll`, `super` e `impact`).

- [ ] **Step 1: Add engine assertions** para los eventos de sonido emitidos al usar cada ataque, al disparar un agente, al impactar y al derrotarlo.
- [ ] **Step 2: Run** `npm test -- src/test/game-engine.test.ts`; Expected: FAIL por los eventos nuevos ausentes.
- [ ] **Step 3: Emit the named events** en los puntos de acción correspondientes del motor; no emitir sonidos de disparo en cada frame ni repetir el sonido de entrada.
- [ ] **Step 4: Add synthesised sound envelopes** en `GameAudio` usando `tone()`/`noise()`: primario metálico corto, secundario más grave/potente, disparo seco, impacto y señal breve de llegada/derrota. Reutilizar el sonido ya existente de R y voltereta.
- [ ] **Step 5: Run focused tests** y revisar la cola de eventos para evitar acumulación de sonidos; commit `feat: add sword and agent combat sounds`.

### Task 5: Final verification and regression check

**Files:**
- Verify: `src/components/game/game-engine.ts`
- Verify: `src/components/game/game-renderer.ts`
- Verify: `src/components/game/UfoGame.tsx`
- Verify: `src/components/game/game-audio.ts`
- Verify: `src/test/game-engine.test.ts`

- [ ] **Step 1: Run the full test suite**: `npm test`. Expected: all Vitest tests pass.
- [ ] **Step 2: Run lint**: `npm run lint`. Expected: zero ESLint errors.
- [ ] **Step 3: Run production build**: `npm run build`. Expected: Vite build exits with code 0.
- [ ] **Step 4: Inspect the final diff** against the current `main` head. Confirm only the listed files changed and the prior military/forest/cross/base flows remain intact.
- [ ] **Step 5: Commit any final corrections** with a descriptive message and verify the resulting GitHub commit and changed-file list.
