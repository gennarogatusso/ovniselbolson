import { describe, expect, it } from 'vitest';
import { interactIntro, introAction, newIntroState, update } from '../components/game/game-engine';

function advance(s: ReturnType<typeof newIntroState>, seconds: number) {
  for (let t = 0; t < seconds; t += .05) update(s, .05);
}
describe('AWKA introduction', () => {
  it('requires exactly two completed drinks and rejects overlapping interactions', () => {
    const s = newIntroState(); advance(s, 1.7);
    expect(introAction(s)).toBe('Beber cerveza');
    interactIntro(s); interactIntro(s); advance(s, 1.6);
    expect(s.intro.drinks).toBe(1); expect(s.intro.stage).toBe('beer');
    interactIntro(s); advance(s, 1.6);
    expect(s.intro.drinks).toBe(2); expect(s.intro.stage).toBe('approach');
    advance(s, 3.2); expect(introAction(s)).toBe('Aceptar');
  });
  it('waits for acceptance, finishes smoking and warning, then lets the player leave', () => {
    const s = newIntroState(); s.intro.stage = 'offer'; advance(s, 5);
    expect(s.intro.stage).toBe('offer'); interactIntro(s);
    advance(s, 4.9); expect(s.intro.stage).toBe('warning');
    advance(s, 3.1); expect(s.intro.stage).toBe('rising');
    advance(s, 1.3); expect(introAction(s)).toBe('Irse de la cervecería');
    expect(s.p.x).toBe(-650);
  });
  it('joins the original opening without resetting the protagonist, cat or camera', () => {
    const s = newIntroState(), player = s.p, cat = s.cat;
    s.intro.stage = 'leave'; interactIntro(s); advance(s, 5.7);
    expect(s.phase).toBe('walk'); expect(s.p).toBe(player); expect(s.cat).toBe(cat);
    expect(s.p.x).toBe(200); expect(s.cat.x).toBeCloseTo(150); expect(s.cam).toBeCloseTo(0, 1);
    expect(s.u.vis).toBe(false); expect(s.p.hp).toBe(100); expect(s.p.armed).toBe(0);
    advance(s, 3.6); expect(s.phase).toBe('descend'); expect(s.u.vis).toBe(true);
  });
  it('does not repeat a held keyboard interaction across two drinks', () => {
    const s = newIntroState(); advance(s, 1.7); s.keys.e = true; advance(s, 4);
    expect(s.intro.drinks).toBe(1); expect(s.intro.stage).toBe('beer');
    s.keys.e = false; update(s, .05); s.keys.e = true; advance(s, 1.7);
    expect(s.intro.drinks).toBe(2);
  });
});