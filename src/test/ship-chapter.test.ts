import { describe, expect, it } from 'vitest';
import { newIntroState, enterShip, update, interactChapter, crossCanStand, SHIP, type S } from '../components/game/game-engine';
function tick(s:S,seconds:number){for(let t=0;t<seconds;t+=.02)update(s,.02);}
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
 it('reduces damage from laboratory alien attacks without changing their triggers',()=>{
  const projectile=newIntroState();enterShip(projectile);projectile.ship.stage='combat';projectile.ship.x=400;
  projectile.ship.enemies=[{x:400,y:SHIP.floor,hp:32,kind:'direct',cd:0,windup:0,hurt:0,deadTime:0,face:-1}];
  tick(projectile,.04);expect(projectile.ship.hp).toBe(95);
  const psychic=newIntroState();enterShip(psychic);psychic.ship.stage='combat';psychic.ship.enemies=[];
  psychic.ship.x=SHIP.right-1;psychic.ship.push='flight';psychic.ship.pushVx=400;psychic.ship.pushVy=0;
  tick(psychic,.02);expect(psychic.ship.hp).toBe(91);
 });

});