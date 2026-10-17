import { describe, expect, it } from 'vitest';
import { DIFFICULTY, newState, update, shotInterval, projectileDamage, canAskHelp } from '../components/game/game-engine';

describe('OVNI difficulty and narrative', () => {
  it('increases movement by exactly 20 percent',()=>expect(DIFFICULTY.movement).toBe(1.20));
  it('increases real firing frequency by 20 percent',()=>{expect(shotInterval(100)).toBeCloseTo(1.4/1.20);expect(shotInterval(30)).toBeCloseTo(.9/1.20);});
  it('increases aggression by exactly 20 percent',()=>expect(DIFFICULTY.aggression).toBe(1.20));
  it('preserves health and weapon damage',()=>{const s=newState();expect(s.p.hp).toBe(100);expect(s.u.hp).toBe(100);expect(projectileDamage({})).toBe(4);});
  it('applies movement and firing changes in the live simulation',()=>{const s=newState();s.phase='fight';s.u.vis=true;s.u.x=500;s.u.tx=1000;s.u.cd=0;update(s,.1);expect(s.u.x).toBeCloseTo(516.8);expect(s.u.cd).toBeCloseTo(1.4/1.2);expect(s.lasers).toHaveLength(1);});
  it('recruits nearby helpers once',()=>{const s=newState();s.phase='fight';s.p.x=460;s.keys.e=true;expect(canAskHelp(s)).toBe(true);update(s,.016);expect(s.recruited).toBe(true);expect(s.phase).toBe('help');expect(canAskHelp(s)).toBe(false);});
  it('stones collide and cause actual damage',()=>{const s=newState();s.phase='fight';s.u.x=500;s.u.tx=500;s.u.y=120;s.shots.push({x:500,y:120,vx:0,vy:0,life:1,kind:'stone'});update(s,.001);expect(s.u.hp).toBe(97);});
  it('lasers damage companions without changing projectile damage',()=>{const s=newState();s.phase='fight';s.recruited=true;const a=s.allies[0];s.lasers.push({x:a.x,y:420,vx:0,vy:0,life:1});update(s,.001);expect(a.hp).toBe(88);});
  it('original ending remains exclusive without helpers',()=>{const s=newState();s.phase='fight';s.u.hp=4;s.u.x=500;s.u.tx=500;s.shots.push({x:500,y:120,vx:0,vy:0,life:1});update(s,.001);expect(s.phase).toBe('boom');expect(update(s,2)).toBe('win');});
  it('cooperative defeat progresses through the complete ordered ending',()=>{
    const s=newState();s.phase='fight';s.recruited=true;s.u.hp=3;s.u.x=500;s.u.tx=500;s.shots.push({x:500,y:120,vx:0,vy:0,life:1,kind:'stone'});update(s,.001);expect(s.phase).toBe('crash');
    const phases:string[]=[];let result:string|null=null;
    for(let i=0;i<2000&&!result;i++){if(phases.at(-1)!==s.phase)phases.push(s.phase);result=update(s,.05);if(String(s.phase)==='reunion'){expect(s.cat.gone).toBe(false);expect(s.alien.reveal).toBe(0);}expect(s.shots).toHaveLength(0);expect(s.lasers).toHaveLength(0);}
    expect(phases).toEqual(['crash','arrive','reunion','alien','speech','attack','fade']);expect(result).toBe('continue');expect(s.allies.every(a=>a.dead&&a.hp===0)).toBe(true);expect(s.cat.gone).toBe(false);
  });
  it('restart resets allies, cat, cinematic and recruitment',()=>{const s=newState();expect(s.phase).toBe('walk');expect(s.recruited).toBe(false);expect(s.cat.gone).toBe(false);expect(s.alien.reveal).toBe(0);expect(s.allies.every(a=>a.hp===100&&!a.dead)).toBe(true);});
});