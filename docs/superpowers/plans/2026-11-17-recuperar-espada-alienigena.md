# Recuperar la espada alienígena Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Insertar el hallazgo y equipamiento de la espada entre el sendero de La Cruz y la instalación secreta.

**Architecture:** Agregar etapas acotadas al estado de la nave para llegada, interacción, recogida y estado equipado. El motor gobierna la secuencia, el renderizador compone los recursos nuevos y UfoGame carga las imágenes; las pruebas del motor verifican el flujo completo.

**Tech Stack:** TypeScript, React, Canvas 2D, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-17-recuperar-espada-alienigena-design.md`

## Global Constraints
- Mantener GitHub `main` como fuente oficial.
- No modificar escenas anteriores salvo la transición final del sendero.
- No avanzar a la instalación secreta ni añadir ataques con espada.
- Preservar controles y mecánicas existentes.

## Review Focus
- El sendero no debe saltarse la escena nueva ni iniciar la base automáticamente.
- La interacción no debe activarse antes de que el protagonista llegue a la espada.
- Los cinco cuadros deben mostrarse una sola vez, en orden y sin fondos blancos.
- La última pose debe permanecer visible después de equipar la espada.
- Los estados de muerte/reinicio anteriores no deben quedar alterados por el nuevo estado final.

---

### Task 1: Modelar el flujo de recogida en el motor

**Files:**
- Modify: `src/components/game/game-engine.ts`
- Test: `src/test/game-engine.test.ts`

**Interfaces:**
- Consumes: `ShipStage`, `shipAction(s)`, `interactShip(s)`, `updateShip(s, dt)` (flujo existente).
- Produces: nuevas etapas `swordIntro`, `swordReady`, `swordPickup`, `swordEquipped`; acción `AGARRAR ESPADA ALIENÍGENA`.

- [ ] **Step 1: Write failing tests** para verificar que completar `trailWalk` entra en `swordIntro` y no en `baseFade`; la llegada termina en `swordReady`; solo entonces `shipAction` ofrece la acción; interactuar inicia `swordPickup`; el temporizador avanza por la animación y termina en `swordEquipped`; el estado final no progresa a la base.
- [ ] **Step 2: Run the focused test** con `npm test -- --run src/test/game-engine.test.ts`.
  Expected: los nuevos casos fallan porque las etapas y transición aún no existen.
- [ ] **Step 3: Implement the minimal engine flow** en `game-engine.ts`, manteniendo sin cambios el comportamiento de movimiento del sendero y los demás capítulos.
- [ ] **Step 4: Run the focused test** con `npm test -- --run src/test/game-engine.test.ts`.
  Expected: los casos nuevos pasan.
- [ ] **Step 5: Commit** el cambio del motor y sus pruebas.

### Task 2: Cargar y representar el escenario y la espada

**Files:**
- Modify: `src/components/game/UfoGame.tsx`
- Modify: `src/components/game/game-renderer.ts`

**Interfaces:**
- Consumes: las nuevas etapas del motor y los recursos ya presentes en `public/imagens/`.
- Produces: recursos `swordScene`, `groundSword` y `swordPickupFrames` en `ShipImages`.

- [ ] **Step 1: Add renderer-focused tests or assertions** para verificar el mapeo de recursos/etapas si existe infraestructura de render; de lo contrario, documentar la verificación manual requerida y cubrir el flujo observable con las pruebas del motor.
- [ ] **Step 2: Run the relevant test** antes del cambio y registrar el resultado.
- [ ] **Step 3: Load** `escenario espada.png`, `espada.png` y `agarrando la espada 1.png` a `agarrando la espada 5.png`; preparar los cinco sprites con transparencia consistente con los assets existentes.
- [ ] **Step 4: Render** el fondo nuevo, la espada en el suelo junto al alienígena con la cruz y la caminata de llegada; al interactuar, dibujar los cinco cuadros en orden; conservar el cuadro final como pose equipada.
- [ ] **Step 5: Run** `npm test -- --run` y `npm run build`; Expected: ambos comandos terminan sin errores.
- [ ] **Step 6: Commit** los cambios de carga y renderizado.

### Task 3: Verificación integral y revisión

**Files:**
- Verify: `src/components/game/game-engine.ts`
- Verify: `src/components/game/game-renderer.ts`
- Verify: `src/components/game/UfoGame.tsx`
- Verify: `src/test/game-engine.test.ts`, `src/test/ship-chapter.test.ts`

- [ ] **Step 1: Run** `npm test -- --run`; Expected: toda la suite pasa.
- [ ] **Step 2: Run** `npm run build`; Expected: compilación correcta.
- [ ] **Step 3: Review** el diff para confirmar que no hay cambios colaterales en controles, combates, escenas previas ni transición a la base.
- [ ] **Step 4: Commit** cualquier ajuste necesario y verificar el SHA final de `main`.
