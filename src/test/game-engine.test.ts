import { describe, expect, it } from 'vitest';
import { shouldStartCrossMusic } from '../components/game/game-audio';
import { DIFFICULTY, GROUND, newState, newIntroState, canSkipOpeningScene, skipOpeningScene, canSkipAftermathScene, skipAftermathScene, update, shotInterval, projectileDamage, canAskHelp, respawnAtShipCheckpoint, respawnAtSoldierCheckpoint, enterShip, shipAction, interactShip, shipIsCombat, triggerSpecial, triggerCatUltimate, SOLDIER_DAMAGE_FACTOR, CAT_ULTIMATE_READY_DELAY, CAT_ULTIMATE_THROW_DURATION, CAT_ULTIMATE_BEAM_DURATION, SPECIAL_ATTACK_ANIM_DURATION, SPECIAL_ATTACK_RELEASE_DELAY, SPECIAL_PROJECTILE_SPEED, SPECIAL_ATTACK_DAMAGE_FACTOR, SPECIAL_ATTACK_UFO_DAMAGE, SPECIAL_ATTACK_SHIP_DAMAGE, COMBAT_TIP_SLIDE_DURATION, COMBAT_TIP_HOLD_DURATION, COMBAT_TIP_CARD_DURATION, COMBAT_TIP_SEQUENCE_DURATION } from '../components/game/game-engine';

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
  it('moves the UFO and telegraphs its first aimed attack before firing',()=>{const s=newState();s.phase='fight';s.u.vis=true;s.u.x=500;s.u.tx=1000;s.u.cd=0;update(s,.1);expect(s.u.x).toBeCloseTo(516.8);expect(s.u.attack).toBe('aimed');expect(s.u.windup).toBeGreaterThan(0);expect(s.lasers).toHaveLength(0);update(s,.72);expect(s.u.attack).toBe('idle');expect(s.lasers).toHaveLength(1);});
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
  it('lets the player damage a soldier and keeps reduced bazooka damage dangerous',()=>{
    const s=newState();enterShip(s);s.ship.stage='soldierFight';s.ship.x=132;s.ship.y=452;
    s.ship.soldiers=[{id:0,x:250,y:452,hp:170,maxHp:170,role:'bazooka',cd:10,walk:0,hurt:0,deadTime:0,state:'cover'}];
    s.ship.shots=[{x:170,y:394,vx:760,vy:0,life:1}];update(s,.1);
    expect(s.ship.soldiers[0]!.hp).toBe(158);
    s.ship.hurt=0;s.ship.bolts=[{x:s.ship.x,y:s.ship.y-46,vx:0,vy:0,life:1,kind:'rocket'}];
    update(s,.016);expect(s.ship.hp).toBeCloseTo(79.2);
  });
  it('targets a living soldier with the special attack and keeps the five-second cooldown',()=>{
    const s=newState();enterShip(s);s.ship.stage='soldierFight';
    s.ship.soldiers=[{id:0,x:320,y:452,hp:170,maxHp:170,role:'shield',cd:10,walk:0,hurt:0,deadTime:0,state:'cover'}];
    expect(triggerSpecial(s)).toBe(true);expect(s.ship.specialCd).toBe(5);
    expect(s.ship.shots[0]?.specialTarget).toBe('soldier');
    expect(triggerSpecial(s)).toBe(false);
  });
  it('requires moving right and choosing SEGUIR EL CAMINO before the final approach',()=>{
    const s=newState();enterShip(s);s.ship.stage='soldierFight';
    s.ship.soldiers=[0,1,2,3].map((id)=>({id,x:700+id*35,y:452,hp:0,maxHp:160,role:id%2?'bazooka':'shield',cd:3,walk:0,hurt:0,deadTime:0,state:'cover'}));
    expect(update(s,.016)).toBe(null);expect(s.ship.stage).toBe('soldierEnd');
    update(s,.8);expect(s.ship.stage).toBe('soldierEnd');update(s,.2);expect(s.ship.stage).toBe('soldierExit');expect(shipAction(s)).toBe(null);
    s.keys.r=true;update(s,1);s.keys.r=false;
    expect(shipAction(s)).toBe('SEGUIR EL CAMINO');
    interactShip(s);expect(s.ship.stage).toBe('trailWalk');
    s.keys.j=true;for(let i=0;i<100&&s.ship.stage==='trailWalk';i++)update(s,.1);
    expect(s.ship.stage).toBe('trailEnd');expect(s.ship.trailProgress).toBe(1);expect(update(s,.016)).toBe(null);
  });
  it('restarts the military encounter at full health if the player is defeated',()=>{
    const s=newState();enterShip(s);s.ship.stage='soldierFight';s.ship.hp=0;
    respawnAtSoldierCheckpoint(s);expect(s.ship.stage).toBe('soldierFight');
    expect(s.ship.hp).toBe(100);expect(s.ship.soldiers).toHaveLength(4);
  });

  it('reduces rifle and bazooka damage by exactly 35 percent',()=>{
    const s=newState();enterShip(s);s.ship.stage='soldierFight';s.ship.x=132;s.ship.y=452;s.ship.soldiers=[{id:0,x:900,y:452,hp:160,maxHp:160,role:'bazooka',cd:100,walk:0,hurt:0,deadTime:0,state:'cover'}];
    s.ship.bolts=[{x:s.ship.x,y:s.ship.y-46,vx:0,vy:0,life:1,kind:'rifle'}];
    update(s,.016);expect(s.ship.hp).toBeCloseTo(89.6);
    s.ship.hurt=0;s.ship.bolts=[{x:s.ship.x,y:s.ship.y-46,vx:0,vy:0,life:1,kind:'rocket'}];
    update(s,.016);expect(s.ship.hp).toBeCloseTo(68.8);
    expect(SOLDIER_DAMAGE_FACTOR).toBe(.65);
  });
  it('jumps vertically during the soldier fight and lands back on the floor',()=>{
    const s=newState();enterShip(s);s.ship.stage='soldierFight';s.ship.soldiers=[{id:0,x:900,y:452,hp:160,maxHp:160,role:'bazooka',cd:100,walk:0,hurt:0,deadTime:0,state:'cover'}];
    s.keys.j=true;update(s,.1);expect(s.ship.y).toBeLessThan(452);
    const firstY=s.ship.y;update(s,.1);expect(s.ship.y).toBeLessThan(firstY);
    s.keys.j=false;update(s,1);expect(s.ship.y).toBe(452);expect(s.ship.vy).toBe(0);
  });
  it('waits seven seconds, plays the nine-frame 1.8-second throw, then kills all four soldiers',()=>{
    const s=newState();enterShip(s);s.ship.stage='soldierFight';s.ship.soldiers=[0,1,2,3].map((id)=>({id,x:700+id*35,y:452,hp:160,maxHp:160,role:id%2?'bazooka':'shield',cd:100,walk:0,hurt:0,deadTime:0,state:'cover'}));
    s.ship.bolts=[{x:s.ship.x,y:s.ship.y-46,vx:0,vy:0,life:1,kind:'rocket'}];
    expect(CAT_ULTIMATE_READY_DELAY).toBe(7);expect(CAT_ULTIMATE_THROW_DURATION).toBe(1.8);expect(CAT_ULTIMATE_BEAM_DURATION).toBe(4.5);
    expect(triggerCatUltimate(s)).toBe(false);
    update(s,6.9);expect(s.ship.stage).toBe('soldierFight');expect(triggerCatUltimate(s)).toBe(false);
    update(s,.1);expect(s.ship.time).toBeCloseTo(7);
    expect(triggerCatUltimate(s)).toBe(true);expect(s.ship.stage).toBe('soldierUltimateThrow');
    expect(s.ship.catUltimateUsed).toBe(true);expect(s.ship.bolts).toHaveLength(0);
    expect(triggerCatUltimate(s)).toBe(false);
    const enemyCooldown=s.ship.soldiers[0]!.cd;
    update(s,.9);expect(s.ship.stage).toBe('soldierUltimateThrow');expect(s.ship.bolts).toHaveLength(0);expect(s.ship.soldiers[0]!.cd).toBe(enemyCooldown);
    update(s,.9);expect(s.ship.stage).toBe('soldierUltimateAscend');
    update(s,.72);expect(s.ship.stage).toBe('soldierUltimateBeam');expect(s.ship.soldiers.every(e=>e.hp===0)).toBe(true);
    update(s,4.5);expect(s.ship.stage).toBe('soldierEnd');
    update(s,.8);expect(s.ship.stage).toBe('soldierEnd');update(s,.2);expect(s.ship.stage).toBe('soldierExit');expect(shipAction(s)).toBe(null);
    s.keys.r=true;update(s,1);s.keys.r=false;
    expect(s.ship.x).toBeGreaterThanOrEqual(650);expect(shipAction(s)).toBe('SEGUIR EL CAMINO');
    interactShip(s);expect(s.ship.stage).toBe('trailWalk');
    s.keys.r=true;update(s,1);s.keys.r=false;expect(s.ship.trailProgress).toBe(0);
    s.keys.j=true;for(let i=0;i<100&&s.ship.stage==='trailWalk';i++)update(s,.1);
    expect(s.ship.trailProgress).toBe(1);expect(s.ship.stage).toBe('baseFade');expect(update(s,.016)).toBe(null);
    update(s,1.6);expect(s.ship.stage).toBe('baseApproach');
    for(let i=0;i<100&&s.ship.stage==='baseApproach';i++)update(s,.1);
    expect(s.ship.baseProgress).toBe(1);expect(s.ship.stage).toBe('baseEnd');expect(update(s,.1)).toBe(null);
  });
  it('keeps the post-ultimate transition under one second after the beam has ended',()=>{
    const s=newState();enterShip(s);s.ship.stage='soldierEnd';s.ship.soldiers=[];
    update(s,.85);expect(s.ship.stage).toBe('soldierEnd');
    update(s,.16);expect(s.ship.stage).toBe('soldierExit');
  });
  it('resets the cat ultimate when retrying the military encounter',()=>{
    const s=newState();enterShip(s);s.ship.stage='soldierFight';s.ship.catUltimateUsed=true;
    respawnAtSoldierCheckpoint(s);expect(s.ship.catUltimateUsed).toBe(false);expect(s.ship.stage).toBe('soldierFight');
  });
  it('starts the new cross soundtrack on the landing impact and not in earlier or later scenes',()=>{
    const s=newState();enterShip(s);
    s.ship.stage='emergency';expect(shouldStartCrossMusic(s)).toBe(false);
    s.ship.stage='impact';expect(shouldStartCrossMusic(s)).toBe(true);
    s.ship.stage='crossRise';expect(shouldStartCrossMusic(s)).toBe(false);
    s.ship.stage='baseEnd';expect(shouldStartCrossMusic(s)).toBe(false);
  });
  it('skips the opening directly into a ready-to-play fight with the main UFO',()=>{
    const s=newIntroState();
    expect(canSkipOpeningScene(s)).toBe(true);
    expect(skipOpeningScene(s)).toBe(true);
    expect(s.phase).toBe('fight');expect(s.pt).toBe(0);expect(s.p.x).toBe(200);
    expect(s.p.armed).toBe(1);expect(s.cat.gone).toBe(true);
    expect(s.u.vis).toBe(true);expect(s.u.hp).toBe(100);expect(s.combatTipsTime).toBe(0);
    expect(canSkipOpeningScene(s)).toBe(false);expect(skipOpeningScene(s)).toBe(false);
  });
  it('offers the first skip only before the main UFO fight begins',()=>{
    const s=newState();
    for(const phase of ['walk','descend','beam','rise','draw'] as const){s.phase=phase;expect(canSkipOpeningScene(s)).toBe(true);}
    s.phase='fight';expect(canSkipOpeningScene(s)).toBe(false);
    s.phase='crash';expect(canSkipOpeningScene(s)).toBe(false);
  });
  it('skips only the Trump and Milei aftermath sequence into the next bedroom chapter',()=>{
    const s=newState();s.phase='aftermath';s.chapter.stage='trump';s.chapter.time=4;s.keys.r=true;s.fire=true;
    expect(canSkipAftermathScene(s)).toBe(true);expect(skipAftermathScene(s)).toBe(true);
    expect(s.phase).toBe('bedroom');expect(s.chapter.stage).toBe('roomFade');expect(s.chapter.time).toBe(0);
    expect(s.keys).toEqual({});expect(s.fire).toBe(false);expect(s.chapter.computer).toBe(false);
    expect(canSkipAftermathScene(s)).toBe(false);expect(skipAftermathScene(s)).toBe(false);
  });
  it('does not show the aftermath skip during the earlier UFO crash cinematics or later gameplay',()=>{
    const s=newState();s.phase='jets';expect(canSkipAftermathScene(s)).toBe(false);
    s.phase='aftermath';
    for(const stage of ['truck','unload','trump','approach','milei','leave'] as const){s.chapter.stage=stage;expect(canSkipAftermathScene(s)).toBe(true);}
    s.phase='bedroom';expect(canSkipAftermathScene(s)).toBe(false);
  });
  it('restart resets allies, cat, cinematic and recruitment,()=>{const s=newState();expect(s.phase).toBe('walk');expect(s.recruited).toBe(false);expect(s.cat.gone).toBe(false);expect(s.alien.reveal).toBe(0);expect(s.allies.every(a=>a.hp===100&&!a.dead)).toBe(true);});

  it('adds an impact burst, hit stop and camera response when the UFO is hit',()=>{
    const s=newState();s.phase='fight';s.u.vis=true;s.u.x=500;s.u.tx=500;s.u.y=120;s.shots.push({x:500,y:120,vx:0,vy:0,life:1});update(s,.016);
    expect(s.u.hp).toBe(96);expect(s.u.hit).toBeGreaterThan(0);expect(s.hitStop).toBeGreaterThan(0);expect(s.cameraShake).toBeGreaterThan(0);expect(s.fx.some(f=>f.shape==='ring')).toBe(true);
    const frozen=s.t;update(s,.01);expect(s.t).toBeCloseTo(frozen);
  });
  it('unlocks burst and orbital attacks as the UFO loses health',()=>{
    const s=newState();s.phase='fight';s.u.vis=true;s.u.hp=60;s.u.x=500;s.u.tx=500;s.u.cd=0;update(s,.016);expect(s.u.phase).toBe(2);expect(s.u.attack).toBe('burst');
    s.u.windup=.01;update(s,.02);expect(s.lasers.filter(l=>l.kind==='ufoBurst')).toHaveLength(3);
    s.lasers=[];s.u.hp=25;s.u.attack='idle';s.u.cd=0;s.u.patternIndex=0;update(s,.016);expect(s.u.phase).toBe(3);expect(s.u.attack).toBe('orbital');
    s.u.windup=.01;update(s,.02);expect(s.lasers.some(l=>l.kind==='ufoOrbital')).toBe(true);
  });
  it('keeps attack warnings visible during windup',()=>{
    const s=newState();s.phase='fight';s.u.vis=true;s.u.x=500;s.u.tx=500;s.u.cd=0;update(s,.016);expect(s.u.windup).toBeGreaterThan(0);expect(s.u.windupDuration).toBeGreaterThan(0);
    const target=s.u.attackX;update(s,.2);expect(s.u.attackX).toBe(target);expect(s.u.windup).toBeLessThan(.70);
  });
  it('adds camera feedback without changing the player input state',()=>{
    const s=newState();s.phase='fight';s.u.vis=true;s.u.hp=70;s.u.x=500;s.u.tx=500;s.shots.push({x:500,y:120,vx:0,vy:0,life:1});update(s,.016);
    expect(s.cameraPulse).toBeGreaterThan(0);expect(s.p.hp).toBe(100);s.keys.r=true;update(s,.016);expect(s.keys.r).toBe(true);
  });

});