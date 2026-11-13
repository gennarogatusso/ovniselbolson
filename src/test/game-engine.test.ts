import { describe, expect, it } from 'vitest';
import { DIFFICULTY, GROUND, newState, update, shotInterval, projectileDamage, canAskHelp, respawnAtShipCheckpoint, respawnAtSoldierCheckpoint, enterShip, shipAction, interactShip, shipIsCombat, triggerSpecial, SPECIAL_ATTACK_ANIM_DURATION, SPECIAL_ATTACK_RELEASE_DELAY, SPECIAL_PROJECTILE_SPEED, SPECIAL_ATTACK_DAMAGE_FACTOR, SPECIAL_ATTACK_UFO_DAMAGE, SPECIAL_ATTACK_SHIP_DAMAGE, COMBAT_TIP_SLIDE_DURATION, COMBAT_TIP_HOLD_DURATION, COMBAT_TIP_CARD_DURATION, COMBAT_TIP_SEQUENCE_DURATION } from '../components/game/game-engine';

describe('OVNI difficulty and narrative', () => {
  it('shows both combat-tip images once when the UFO fight begins and keeps each readable for 3.4 seconds',()=>{
    const s=newState();s.phase='draw';s.pt=2.19;
    update(s,.02);
    expect(s.phase).toBe('fight');expect(s.combatTipsTime).toBe(0);
    expect(COMBAT_TIP_HOLD_DURATION).toBe(3.4);expect(COMBAT_TIP_SLIDE_DURATION).toBe(1);expect(COMBAT_TIP_CARD_DURATION).toBe(5.4);expect(COMBAT_TIP_SEQUENCE_DURATION).toBe(10.8);
    update(s,COMBAT_TIP_SLIDE_DURATION+COMBAT_TIP_HOLD_DURATION);
    expect(s.combatTipsTime).toBeCloseTo(4.4);
    update(s,COMBAT_TIP_SLIDE_DURATION);
    expect(s.combatTipsTime).toBeCloseTo(COMBAT_TIP_CARD_DURATION);
    update(s,COMBAT_TIP_SLIDE_DURATION+COMBAT_TIP_HOLD_DURATION);
    expect(s.combatTipsTime).toBeCloseTo(9.8);
    update(s,COMBAT_TIP_SLIDE_DURATION);
    expect(s.combatTipsTime).toBe(-1);
    update(s,1);
    expect(s.combatTipsTime).toBe(-1);
  });
  it('uses a quick original-sprite attack, a moderate homing speed and half damage',()=>{expect(SPECIAL_ATTACK_ANIM_DURATION).toBe(1.2);expect(SPECIAL_ATTACK_RELEASE_DELAY).toBe(0.8);expect(SPECIAL_PROJECTILE_SPEED).toBe(300);expect(SPECIAL_ATTACK_DAMAGE_FACTOR).toBe(0.5);expect(SPECIAL_ATTACK_UFO_DAMAGE).toBe(17.5);expect(SPECIAL_ATTACK_SHIP_DAMAGE).toBe(16);});
  it('increases movement by exactly 20 percent',()=>expect(DIFFICULTY.movement).toBe(1.20));
  it('increases real firing frequency by 20 percent',()=>{expect(shotInterval(100)).toBeCloseTo(1.4/1.20);expect(shotInterval(30)).toBeCloseTo(.9/1.20);});
  it('increases aggression by exactly 20 percent',()=>expect(DIFFICULTY.aggression).toBe(1.20));
  it('preserves health and weapon damage',()=>{const s=newState();expect(s.p.hp).toBe(100);expect(s.u.hp).toBe(100);expect(projectileDamage({})).toBe(4);});
  it('applies movement and firing changes in the live simulation',()=>{const s=newState();s.phase='fight';s.u.vis=true;s.u.x=500;s.u.tx=1000;s.u.cd=0;update(s,.1);expect(s.u.x).toBeCloseTo(516.8);expect(s.u.cd).toBeCloseTo(1.4/1.2);expect(s.lasers).toHaveLength(1);});
  it('recruits nearby helpers once',()=>{const s=newState();s.phase='fight';s.p.x=460;s.keys.e=true;expect(canAskHelp(s)).toBe(true);update(s,.016);expect(s.recruited).toBe(true);expect(s.phase).toBe('help');expect(canAskHelp(s)).toBe(false);});
  it('keeps the forest entry in walking mode until the player starts moving',()=>{
    const s=newState();s.phase='bedroom';s.chapter.stage='forestRun';
    update(s,.1);
    expect(s.chapter.forestHasMoved).toBe(false);expect(s.chapter.moving).toBe(false);
    s.keys.r=true;update(s,.1);
    expect(s.chapter.forestHasMoved).toBe(true);expect(s.chapter.moving).toBe(true);
    s.keys.r=false;update(s,.1);
    expect(s.chapter.forestHasMoved).toBe(true);expect(s.chapter.moving).toBe(false);
  });
  it('stones collide and cause actual damage',()=>{const s=newState();s.phase='fight';s.u.x=500;s.u.tx=500;s.u.y=120;s.shots.push({x:500,y:120,vx:0,vy:0,life:1,kind:'stone'});update(s,.001);expect(s.u.hp).toBe(97);});
  it('special attack homes into the UFO, hits while airborne, and locks for five seconds',()=>{const s=newState();s.phase='fight';s.u.vis=true;s.u.x=500;s.u.tx=500;s.u.y=120;s.u.cd=100;s.p.y=GROUND-80;expect(triggerSpecial(s)).toBe(true);expect(s.specialCd).toBe(5);expect(s.specialAnim).toBe(SPECIAL_ATTACK_ANIM_DURATION);expect(triggerSpecial(s)).toBe(false);update(s,.4);expect(s.u.hp).toBe(100);expect(s.shots[0]?.delay).toBeCloseTo(.4);for(let i=0;i<220&&s.u.hp===100;i++)update(s,.016);expect(s.u.hp).toBe(82.5);expect(s.specialCd).toBeLessThan(5);});
  it('special attack tracks and defeats the nearest living ship enemy with a separate five-second cooldown',()=>{const s=newState();s.phase='spaceship';s.ship.stage='combat';s.ship.x=145;s.ship.y=452;s.ship.enemies=[{x:340,y:452,hp:32,kind:'direct',cd:100,windup:0,hurt:0,deadTime:0,face:-1},{x:700,y:452,hp:32,kind:'direct',cd:100,windup:0,hurt:0,deadTime:0,face:-1}];expect(triggerSpecial(s)).toBe(true);expect(s.ship.specialCd).toBe(5);expect(triggerSpecial(s)).toBe(false);update(s,.4);expect(s.ship.enemies[0]!.hp).toBe(32);for(let i=0;i<200;i++)update(s,.016);expect(s.ship.enemies[0]!.hp).toBe(16);expect(s.ship.enemies[0]!.deadTime).toBe(0);expect(s.ship.enemies[1]!.hp).toBe(32);});
  it('lasers damage companions without changing projectile damage',()=>{const s=newState();s.phase='fight';s.recruited=true;const a=s.allies[0];s.lasers.push({x:a.x,y:420,vx:0,vy:0,life:1});update(s,.001);expect(a.hp).toBe(88);});
  it('original ending remains exclusive without helpers',()=>{const s=newState();s.phase='fight';s.u.hp=4;s.u.x=500;s.u.tx=500;s.shots.push({x:500,y:120,vx:0,vy:0,life:1});update(s,.001);expect(s.phase).toBe('boom');expect(update(s,2)).toBe('win');});
  it('cooperative defeat progresses through the complete ordered ending',()=>{
    const s=newState();s.phase='fight';s.recruited=true;s.u.hp=3;s.u.x=500;s.u.tx=500;s.shots.push({x:500,y:120,vx:0,vy:0,life:1,kind:'stone'});update(s,.001);expect(s.phase).toBe('crash');
    const phases:string[]=[];let result:string|null=null;
    for(let i=0;i<2000&&!result;i++){if(phases.at(-1)!==s.phase)phases.push(s.phase);result=update(s,.05);if(String(s.phase)==='reunion'){expect(s.cat.gone).toBe(false);expect(s.alien.reveal).toBe(0);}if(String(s.phase)==='fade'){expect(s.jets.every(jet=>jet.x>3200)).toBe(true);expect(s.ufoHits).toBeGreaterThan(0);expect(s.alienHit).toBe(true);expect(s.alien.reveal).toBe(0);expect(s.jetShots).toHaveLength(0);}expect(s.shots).toHaveLength(0);expect(s.lasers).toHaveLength(0);}
        expect(phases).toEqual(['crash','arrive','reunion','alien','speech','attack','jets','fade']);expect(result).toBe('continue');expect(s.allies.every(a=>a.dead&&a.hp===0)).toBe(true);expect(s.cat.gone).toBe(false);
  });
  it('respawns at the laboratory bed checkpoint after ship combat defeat',()=>{const s=newState();s.phase='spaceship';s.ship.stage='combat';s.ship.hp=0;s.ship.reactorHp=25;s.ship.boxBroken=true;expect(update(s,.016)).toBe('lose');respawnAtShipCheckpoint(s);expect(s.phase).toBe('spaceship');expect(s.ship.stage).toBe('awakening');expect(s.ship.hp).toBe(100);expect(s.ship.reactorHp).toBe(100);expect(s.ship.boxBroken).toBe(false);});

  it('continues from the cross contemplation into the road and military scene',()=>{
    const s=newState();enterShip(s);s.ship.stage='contemplate';s.ship.time=5.9;
    update(s,.2);expect(s.ship.stage).toBe('crossSunset');
    s.ship.time=6.9;update(s,.2);expect(s.ship.stage).toBe('crossWalkIntro');
    for(let i=0;i<100&&s.ship.stage==='crossWalkIntro';i++)update(s,.05);
    expect(s.ship.stage).toBe('crossWalk');expect(shipAction(s)).toBe('Irse de La Cruz');
    interactShip(s);expect(s.ship.stage).toBe('militaryIntro');expect(s.ship.soldiers).toHaveLength(4);
    expect(s.ship.soldiers.filter(e=>e.role==='bazooka')).toHaveLength(2);
    expect(s.ship.soldiers.filter(e=>e.role==='shield')).toHaveLength(2);
    update(s,2.3);expect(s.ship.stage).toBe('soldierFight');expect(shipIsCombat(s)).toBe(true);
  });
  it('lets the player damage a soldier and makes bazooka impacts much stronger',()=>{
    const s=newState();enterShip(s);s.ship.stage='soldierFight';s.ship.x=132;s.ship.y=452;
    s.ship.soldiers=[{id:0,x:250,y:452,hp:170,maxHp:170,role:'bazooka',cd:10,walk:0,hurt:0,deadTime:0,state:'cover'}];
    s.ship.shots=[{x:170,y:394,vx:760,vy:0,life:1}];update(s,.15);
    expect(s.ship.soldiers[0]!.hp).toBe(158);
    s.ship.hurt=0;s.ship.bolts=[{x:s.ship.x,y:s.ship.y-46,vx:0,vy:0,life:1,kind:'rocket'}];
    update(s,.016);expect(s.ship.hp).toBe(68);
  });
  it('targets a living soldier with the special attack and keeps the five-second cooldown',()=>{
    const s=newState();enterShip(s);s.ship.stage='soldierFight';
    s.ship.soldiers=[{id:0,x:320,y:452,hp:170,maxHp:170,role:'shield',cd:10,walk:0,hurt:0,deadTime:0,state:'cover'}];
    expect(triggerSpecial(s)).toBe(true);expect(s.ship.specialCd).toBe(5);
    expect(s.ship.shots[0]?.specialTarget).toBe('soldier');
    expect(triggerSpecial(s)).toBe(false);
  });
  it('shows CONTINUARÁ after the four soldiers have been defeated',()=>{
    const s=newState();enterShip(s);s.ship.stage='soldierFight';
    s.ship.soldiers=[0,1,2,3].map((id)=>({id,x:700+id*35,y:452,hp:0,maxHp:160,role:id%2?'bazooka':'shield',cd:3,walk:0,hurt:0,deadTime:0,state:'cover'}));
    expect(update(s,.016)).toBe(null);expect(s.ship.stage).toBe('soldierEnd');
    expect(update(s,4.1)).toBe('continue');
  });
  it('restarts the military encounter at full health if the player is defeated',()=>{
    const s=newState();enterShip(s);s.ship.stage='soldierFight';s.ship.hp=0;
    respawnAtSoldierCheckpoint(s);expect(s.ship.stage).toBe('soldierFight');
    expect(s.ship.hp).toBe(100);expect(s.ship.soldiers).toHaveLength(4);
  });
  it('restart resets allies, cat, cinematic and recruitment',()=>{const s=newState();expect(s.phase).toBe('walk');expect(s.recruited).toBe(false);expect(s.cat.gone).toBe(false);expect(s.alien.reveal).toBe(0);expect(s.allies.every(a=>a.hp===100&&!a.dead)).toBe(true);});
});