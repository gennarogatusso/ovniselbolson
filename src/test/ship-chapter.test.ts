import { describe, expect, it } from 'vitest';
import { newIntroState, enterShip, update, interactChapter, crossCanStand, SHIP, SWORD_PRIMARY_IMPACT_TIME, SWORD_PRIMARY_SOUND_TIME, triggerSpecial, type S } from '../components/game/game-engine';
function tick(s:S,seconds:number){for(let t=0;t<seconds;t+=.02)update(s,.02);}
function makeAgent(id:number,x:number,kind:S['ship']['agents'][number]['kind']):S['ship']['agents'][number]{
 return {id,x,y:SHIP.floor,hp:160,maxHp:160,kind,cd:100,walk:0,hurt:0,deadTime:0,firePose:0,face:-1,state:'guard',blockFlash:0,shieldBlocks:0,shieldBreak:0,knockbackX:0,stagger:0};
}
describe('Ship stabilization through Cerro de la Cruz',()=>{
 it('finishes the laboratory rescue and requires walking to its exit',()=>{const s=newIntroState();enterShip(s);tick(s,21);expect(s.ship.stage).toBe('labFree');expect(s.ship.labDead).toBe(1);s.keys.l=true;tick(s,2);interactChapter(s);tick(s,1.3);expect(s.ship.stage).toBe('combat');expect(s.ship.enemies).toHaveLength(4);});
 it('connects aimed box hits, pickup, charged reactor shot and Cross ending',()=>{
  const s=newIntroState();enterShip(s);s.ship.stage='combat';s.ship.x=480;s.ship.aimActive=true;s.ship.aimX=SHIP.boxX;s.ship.aimY=SHIP.boxY;s.fire=true;
  tick(s,1.8);expect(s.ship.boxBroken).toBe(true);expect(s.ship.boxHp).toBe(0);s.fire=false;tick(s,1);interactChapter(s);expect(s.ship.stage).toBe('pickup');tick(s,2.5);expect(s.ship.armed).toBe(true);
  s.ship.aimActive=true;s.ship.aimX=SHIP.reactorX;s.ship.aimY=SHIP.reactorY;s.fire=true;tick(s,1.7);expect(s.ship.stage).toBe('combat');tick(s,.2);expect(s.ship.stage).toBe('overload');tick(s,18);expect(s.ship.stage).toBe('crossFree');
  s.keys={l:true};tick(s,3.5);s.keys={j:true};tick(s,.95);expect(crossCanStand(s.chapter.roomX,s.chapter.roomY)).toBe(true);interactChapter(s);expect(s.ship.stage).toBe('contemplate');let result:string|null=null;for(let i=0;i<310;i++)result=update(s,.02)??result;expect(result).toBe('continue');expect(s.ship.stage).toBe('end');
 });
 it('limits rolling and returns telekinesis victims to the ground',()=>{const s=newIntroState();enterShip(s);s.ship.stage='combat';s.keys['roll']=true;tick(s,.2);expect(s.ship.roll).toBeGreaterThan(0);tick(s,.4);expect(s.ship.roll).toBe(0);tick(s,2);expect(s.ship.roll).toBe(0);s.ship.push='lean';s.ship.pushFrom=700;tick(s,4);expect(s.ship.push).toBe('none');expect(s.ship.y).toBe(SHIP.floor);expect(s.ship.x).toBeGreaterThanOrEqual(SHIP.left);});
 it('reacts to hits in the first ship combat room without freezing player movement',()=>{
  const s=newIntroState();enterShip(s);s.ship.stage='combat';s.ship.x=360;
  const enemy:(typeof s.ship.enemies)[number]={x:500,y:SHIP.floor,hp:32,kind:'direct',cd:3,windup:0,hurt:0,deadTime:0,face:-1};
  s.ship.enemies=[enemy];
  s.ship.shots=[{x:482,y:SHIP.floor-48,vx:700,vy:0,life:1}];
  s.keys.r=true;
  const playerX=s.ship.x;
  update(s,.02);
  expect(enemy.hp).toBe(28);
  expect(enemy.hurt).toBeGreaterThan(.3);
  expect(enemy.stagger).toBeGreaterThan(0);
  expect(enemy.knockbackX).toBeGreaterThan(0);
  expect(s.ship.x).toBeGreaterThan(playerX);
  const enemyXAfterHit=enemy.x;
  tick(s,.1);
  expect(enemy.x).toBeGreaterThan(enemyXAfterHit);
 });
 it('keeps agent combat running during a sword swing and applies damage on the contact frame',()=>{
  const s=newIntroState();enterShip(s);s.ship.stage='agentFight';s.ship.agentCombatActive=true;s.ship.agentWarning=0;s.ship.x=100;s.ship.face=1;
  const target=makeAgent(0,210,'regular');s.ship.agents=[target];s.fire=true;
  const bolt={x:800,y:20,vx:-100,vy:0,life:3,kind:'rifle' as const};s.ship.bolts=[bolt];
  update(s,.02);
  expect(s.ship.stage).toBe('agentFight');
  expect(s.ship.swordSwingRemaining).toBeGreaterThan(1);
  expect(target.hp).toBe(160);
  const boltX=bolt.x,targetX=target.x;
  s.fire=false;tick(s,SWORD_PRIMARY_SOUND_TIME+.02);expect(s.ship.sounds).toContain('swordPrimary');expect(target.hp).toBe(160);tick(s,SWORD_PRIMARY_IMPACT_TIME-SWORD_PRIMARY_SOUND_TIME+.06);
  expect(bolt.x).toBeLessThan(boltX);
  expect(target.x).not.toBe(targetX);
  expect(target.hp).toBeLessThan(160);
  expect(target.knockbackX).toBeGreaterThan(0);
 });
 it('shows shield sparks, breaks after two sword blocks and lets R break it immediately',()=>{
  const sword=newIntroState();enterShip(sword);sword.ship.stage='agentFight';sword.ship.agentCombatActive=true;sword.ship.agentWarning=0;sword.ship.x=100;sword.ship.face=1;
  const shield=makeAgent(0,210,'shield');sword.ship.agents=[shield];
  for(let i=0;i<2;i++){
   sword.fire=true;update(sword,.02);sword.fire=false;
   tick(sword,SWORD_PRIMARY_SOUND_TIME+.02);
   expect(sword.ship.sounds).toContain('swordPrimary');
   expect(shield.hp).toBe(160);
   tick(sword,SWORD_PRIMARY_IMPACT_TIME-SWORD_PRIMARY_SOUND_TIME+.06);
   expect(shield.hp).toBe(160);
   expect(sword.fx.filter(f=>f.glow&&f.shape==='spark').length).toBeGreaterThanOrEqual(12);
   if(i===0){expect(shield.shieldBlocks).toBe(1);tick(sword,SWORD_PRIMARY_DURATION);}
  }
  expect(shield.shieldBreak).toBeGreaterThan(0);

  tick(sword,SWORD_PRIMARY_DURATION);
  sword.fire=true;update(sword,.02);sword.fire=false;
  tick(sword,SWORD_PRIMARY_IMPACT_TIME+.06);
  expect(shield.hp).toBeCloseTo(160-45.5);

  const special=newIntroState();enterShip(special);special.ship.stage='agentFight';special.ship.agentCombatActive=true;special.ship.agentWarning=0;special.ship.x=100;special.ship.face=1;
  const specialShield=makeAgent(0,210,'shield');special.ship.agents=[specialShield];
  expect(triggerSpecial(special)).toBe(true);
  tick(special,1.25);
  expect(specialShield.hp).toBe(160);
  expect(specialShield.shieldBlocks).toBe(0);
  expect(specialShield.shieldBreak).toBeGreaterThan(0);
 });
 it('reduces damage from laboratory alien attacks without changing their triggers',()=>{
  const projectile=newIntroState();enterShip(projectile);projectile.ship.stage='combat';projectile.ship.x=400;
  projectile.ship.enemies=[{x:400,y:SHIP.floor,hp:32,kind:'direct',cd:0,windup:0,hurt:0,deadTime:0,face:-1}];
  tick(projectile,.04);expect(projectile.ship.hp).toBe(95);
  const psychic=newIntroState();enterShip(psychic);psychic.ship.stage='combat';psychic.ship.enemies=[];
  psychic.ship.x=SHIP.right-1;psychic.ship.push='flight';psychic.ship.pushVx=400;psychic.ship.pushVy=0;
  tick(psychic,.02);expect(psychic.ship.hp).toBe(91);
 });

});