import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Crosshair, Hand, Maximize, Minimize, Pause, Play, RotateCcw, Volume2, VolumeX, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import mountain from '@/assets/piltriquitron-cartoon.png.asset.json';
import player from '@/assets/personaje-juego.png.asset.json';
import cat from '@/assets/gato-juego.png.asset.json';
import alien from '@/assets/alien-rise.png.asset.json';
import reunion from '@/assets/cat-reunion.png.asset.json';
import { W, H, ENDINGS, CINEMATIC, canAskHelp, newState, newIntroState, introAction, interactIntro, chapterAction, interactChapter, closeComputer, forestIsFree, roomIsFree, shipIsFree, shipIsCombat, respawnAtShipCheckpoint, respawnAtSoldierCheckpoint, update, triggerSpecial, triggerCatUltimate, CAT_ULTIMATE_READY_DELAY, type Ending, type Screen } from './game-engine';
import { draw, type GameImages, type Palette } from './game-renderer';

import { GameComputer } from './GameComputer';
import { GameWelcomeIntro } from './GameWelcomeIntro';
import { GameAudio } from './game-audio';
import greyArt from '@/assets/ship-grey.png.asset.json';
import pickupArt from '@/assets/ship-pickup.png.asset.json';
import pushArt from '@/assets/ship-push.png.asset.json';
import rollArt from '@/assets/ship-roll.png.asset.json';
import contemplateArt from '@/assets/ship-contemplate.png.asset.json';
import shipCatArt from '@/assets/ship-cat.png.asset.json';
import weaponArt from '@/assets/ship-weapon.png.asset.json';
import labArt from '@/assets/ship-laboratory.jpg.asset.json';
import mainArt from '@/assets/ship-main.jpg.asset.json';
import crossArt from '@/assets/ship-cross.jpg.asset.json';

import awkaBuilding from '@/assets/awka-building.png.asset.json';
import awkaMountain from '@/assets/awka-mountain.png.asset.json';
import awkaSeated from '@/assets/awka-seated.png.asset.json';
import awkaBeer from '@/assets/awka-beer.png.asset.json';
import awkaDrink from '@/assets/awka-drink.png.asset.json';
import awkaSmokeIn from '@/assets/awka-smoke-in.png.asset.json';
import awkaSmokeOut from '@/assets/awka-smoke-out.png.asset.json';
import awkaRise from '@/assets/awka-rise.png.asset.json';
import awkaCat from '@/assets/awka-cat.png.asset.json';
import truckArt from '@/assets/military-truck.png.asset.json';
import trumpArt from '@/assets/trump.png.asset.json';
import mileiArt from '@/assets/milei.png.asset.json';
import argArt from '@/assets/soldier-arg.png.asset.json';
import usaArt from '@/assets/soldier-usa.png.asset.json';
import roomArt from '@/assets/bedroom.png.asset.json';
import eatingArt from '@/assets/cat-eating.png.asset.json';
import sleepingArt from '@/assets/player-sleeping.png.asset.json';
import darkArt from '@/assets/bedroom-dark.jpg.asset.json';
import walkArt from '@/assets/room-walk.png.asset.json';
import upArt from '@/assets/room-up.png.asset.json';
import downArt from '@/assets/room-down.png.asset.json';
import runArt from '@/assets/forest-run.png.asset.json';
import restArt from '@/assets/cat-rest.png.asset.json';
import forestArt from '@/assets/forest-background.jpg.asset.json';
import deerArt from '@/assets/forest-deer.png.asset.json';
import shipArt from '@/assets/forest-ufo.png.asset.json';

type PreparedSpecialSprite = { image: HTMLImageElement; anchorX: number; baseY: number; bodyHeight: number };

function prepareTransparentSprite(source: HTMLImageElement, sourceX=0, regionWidth=source.naturalWidth): Promise<PreparedSpecialSprite> {
 const width=Math.max(1,Math.min(regionWidth,source.naturalWidth-sourceX)),height=source.naturalHeight;
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
 const context=canvas.getContext('2d',{willReadFrequently:true});
 const fallback={image:source,anchorX:width/2,baseY:height,bodyHeight:height};
 if(!context)return Promise.resolve(fallback);
 context.drawImage(source,sourceX,0,width,height,0,0,width,height);
 const frame=context.getImageData(0,0,width,height),pixels=frame.data,total=width*height,removed=new Uint8Array(total),queue=new Int32Array(total);
 const nearWhite=(index:number)=>{const offset=index*4,r=pixels[offset]??0,g=pixels[offset+1]??0,b=pixels[offset+2]??0,min=Math.min(r,g,b),max=Math.max(r,g,b);return min>214&&max-min<42;};
 let tail=0,head=0;
 const seed=(index:number)=>{if(index>=0&&index<total&&!removed[index]&&nearWhite(index)){removed[index]=1;queue[tail++]=index;}};
 for(let x=0;x<width;x++){seed(x);seed((height-1)*width+x);}
 for(let y=0;y<height;y++){seed(y*width);seed(y*width+width-1);}
 while(head<tail){
  const index=queue[head++]!,x=index%width,y=Math.floor(index/width);
  if(x>0)seed(index-1);if(x<width-1)seed(index+1);if(y>0)seed(index-width);if(y<height-1)seed(index+width);
 }
 for(let index=0;index<total;index++)if(removed[index])pixels[index*4+3]=0;
 // Reduce the one-pixel pale fringe left by JPEG compression without erasing enclosed white highlights.
 for(let y=1;y<height-1;y++)for(let x=1;x<width-1;x++){
  const index=y*width+x;if(removed[index])continue;
  let edge=false;for(let oy=-1;oy<=1&&!edge;oy++)for(let ox=-1;ox<=1;ox++)if(removed[(y+oy)*width+x+ox]){edge=true;break;}
  if(!edge)continue;
  const offset=index*4,r=pixels[offset]??0,g=pixels[offset+1]??0,b=pixels[offset+2]??0,min=Math.min(r,g,b),max=Math.max(r,g,b),brightness=(r+g+b)/3;
  if(min>170&&max-min<62){const fringe=Math.max(0,Math.min(.9,(brightness-170)/82));pixels[offset+3]=Math.round((pixels[offset+3]??255)*(1-fringe));}
 }
 let left=width,right=-1,top=height,bottom=-1,bodyLeft=width,bodyRight=-1,bodyTop=height,bodyBottom=-1;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const index=y*width+x,offset=index*4,alpha=pixels[offset+3]??0;if(alpha>10){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
  const r=pixels[offset]??255,g=pixels[offset+1]??255,b=pixels[offset+2]??255;
  if(alpha>24&&r<112&&g<112&&b<138){bodyLeft=Math.min(bodyLeft,x);bodyRight=Math.max(bodyRight,x);bodyTop=Math.min(bodyTop,y);bodyBottom=Math.max(bodyBottom,y);}
 }
 if(right<left||bottom<top)return Promise.resolve(fallback);
 const padding=3,cropWidth=right-left+1,cropHeight=bottom-top+1,output=document.createElement('canvas');
 output.width=cropWidth+padding*2;output.height=cropHeight+padding*2;
 const out=output.getContext('2d');if(!out)return Promise.resolve(fallback);
 context.putImageData(frame,0,0);out.imageSmoothingEnabled=false;out.drawImage(canvas,left,top,cropWidth,cropHeight,padding,padding,cropWidth,cropHeight);
 const hasBody=bodyRight>=bodyLeft&&bodyBottom>=bodyTop;
 const prepared={anchorX:hasBody?(bodyLeft+bodyRight)/2-left+padding:output.width/2,baseY:hasBody?bodyBottom-top+padding:output.height,bodyHeight:hasBody?bodyBottom-bodyTop+1:output.height};
 return new Promise(resolve=>{const image=new Image();image.onload=()=>resolve({...prepared,image});image.onerror=()=>resolve(fallback);image.src=output.toDataURL('image/png');});
}

export function UfoGame() {
 const cv=useRef<HTMLCanvasElement>(null), host=useRef<HTMLDivElement>(null), st=useRef(newState()), images=useRef<GameImages|null>(null), palette=useRef<Palette|null>(null);
 const [screen,setScreen]=useState<Screen>('title'), [ending,setEnding]=useState<Ending|null>(null), [touch,setTouch]=useState(false),[expanded,setExpanded]=useState(false),[loading,setLoading]=useState(true),[assetError,setAssetError]=useState(false),[context,setContext]=useState(false),[combat,setCombat]=useState(false);
 const [action,setAction]=useState<string|null>(null), [intro,setIntro]=useState(false), [freeRoom,setFreeRoom]=useState(false), [welcomeVisible,setWelcomeVisible]=useState(false), [specialCooldown,setSpecialCooldown]=useState(0),[catUltimateUsed,setCatUltimateUsed]=useState(false),[catUltimateReady,setCatUltimateReady]=useState(false);
 const welcomeActiveRef=useRef(false);
 const audio=useRef<GameAudio|null>(null);
 const [computer,setComputer]=useState(false),[creditsOpen,setCreditsOpen]=useState(false),[controlsOpen,setControlsOpen]=useState(false);
 const [masterVolume,setMasterVolume]=useState(.8),[volumeOpen,setVolumeOpen]=useState(false);
 const screenRef=useRef(screen);screenRef.current=screen;
 useEffect(()=>{
  const mq=window.matchMedia('(pointer: coarse)');const changed=()=>setTouch(mq.matches);changed();mq.addEventListener('change',changed);
  const readPalette=()=>{if(!host.current)return;const css=getComputedStyle(host.current);const colors={} as Palette;for(const key of ['turquoise','sky','rose','gold','sunset','light','ice','panel','ink','forest','trunk','wall','roof','leaf','road','curb','lane','shadow','hill','metal','glass','laser','smoke','stone','skin','red','alien','energy'] as const)colors[key]=css.getPropertyValue('--game-'+key).trim();palette.current=colors;};readPalette();
  const load=(url:string)=>new Promise<HTMLImageElement>((resolve,reject)=>{const i=new Image();i.crossOrigin='anonymous';i.onload=()=>resolve(i);i.onerror=reject;i.src=url;});let active=true;
    Promise.all([load(mountain.url),load(player.url),load(cat.url),load(alien.url),load(reunion.url),load('/imagens/imagem-cb85a873.png'),load('/imagens/imagem-4233f6e4.png'),load('/imagens/imagem-3241014a.png'),load('/imagens/imagem-97d3754a.png'),load('/imagens/imagem-2fed5c3b.webp'),load('/imagens/imagem-499d0608.png'),load('/imagens/imagem-28e06bb0.webp'),load('/imagens/imagem-debb83e3.webp'),load('/imagens/imagem-63fa9a4e.webp'),load(awkaBuilding.url),load(awkaMountain.url),load(awkaSeated.url),load(awkaBeer.url),load(awkaDrink.url),load(awkaSmokeIn.url),load(awkaSmokeOut.url),load(awkaRise.url),load(awkaCat.url),load(truckArt.url),load(trumpArt.url),load(mileiArt.url),load(argArt.url),load(usaArt.url),load(roomArt.url),load(eatingArt.url),load(sleepingArt.url),load(darkArt.url),load(walkArt.url),load(upArt.url),load(downArt.url),load(runArt.url),load(restArt.url),load(forestArt.url),load(deerArt.url),load(shipArt.url),load(greyArt.url),load(pickupArt.url),load(pushArt.url),load(rollArt.url),load(contemplateArt.url),load(shipCatArt.url),load(weaponArt.url),load(labArt.url),load(mainArt.url),load(crossArt.url),load('/imagens/la%20cruz%20plano.png'),load('/imagens/bosque%20despues%20de%20la%20cruz.png'),load('/imagens/soldado%20cubriendose.png'),load('/imagens/soldado%20disparando%20bazooka.png'),load('/imagens/soldados%20avanzando.png'),load('/imagens/soldados%20cubriendose%20de%20disparo.png'),load('/imagens/soldados%20cubriendose%20y%20disparando.png'),load('/imagens/soldados%20disparando%20desde%20el%20suelo.png'),load('/imagens/1a.png'),load('/imagens/2a.png'),load('/imagens/3a.png'),load('/imagens/4a.png'),load('/imagens/5a.png'),load('/imagens/6a.png'),load('/imagens/7a.png'),load('/imagens/8a.png'),load('/imagens/9a.png'),load('/imagens/gato%20volando%20en%20el%20aire.png'),load('/imagens/arbol.png'),load('/imagens/1.jpg'),load('/imagens/2.jpg'),load('/imagens/3.jpg'),load('/imagens/4.jpg'),load('/imagens/5.jpg'),load('/imagens/6.jpg'),load('/imagens/7.jpg'),load('/imagens/bola%20violeta.jpg'),load('/imagens/consejo%201.png'),load('/imagens/consejo%202.png'),load('/imagens/acostado%20en%20el%20ovni.png'),load('/imagens/PERSONAJE%20POR%20DORMIRSE%20%20Y%20POR%20LEVANTARSE%20corregido.png')] as const).then(async ([mountain,player,cat,alien,reunion,alien1,alien2,alien3,alien4,fighter,gun,ally1,ally2,house,building,introMountain,seated,beer,drink,smokeIn,smokeOut,rise,introCat,truck,trump,milei,arg,usa,bedroom,eating,sleeping,dark,walk,up,down,run,restingCat,forest,deer,ship,grey,pickup,push,roll,contemplate,shipCat,weapon,laboratory,main,cross,roadCross,afterCross,soldierCover,soldierBazooka,soldierAdvance,soldierUnderFire,soldierShieldFire,soldierProneFire,catUltimateFrame1,catUltimateFrame2,catUltimateFrame3,catUltimateFrame4,catUltimateFrame5,catUltimateFrame6,catUltimateFrame7,catUltimateFrame8,catUltimateFrame9,catFlying,tree,special1,special2,special3,special4,special5,special6,special7,specialBall,consejo1,consejo2,shipLying,correctedWaking])=>{if(!active)return;const [catUltimateFrames,catFlyingPrepared]=await Promise.all([Promise.all([catUltimateFrame1,catUltimateFrame2,catUltimateFrame3,catUltimateFrame4,catUltimateFrame5,catUltimateFrame6,catUltimateFrame7,catUltimateFrame8,catUltimateFrame9].map(frame=>prepareTransparentSprite(frame))),prepareTransparentSprite(catFlying)]);const specialFrames=await Promise.all([special1,special2,special3,special4,special5,special6,special7].map(source=>prepareTransparentSprite(source)));const half=Math.floor(specialBall.naturalWidth/2);const specialProjectileFrames=await Promise.all([prepareTransparentSprite(specialBall,0,half),prepareTransparentSprite(specialBall,half,specialBall.naturalWidth-half)]);images.current={ship:{grey,pickup,push,roll,contemplate,cat:shipCat,weapon,laboratory,main,cross,road:roadCross,afterCross,soldiers:{cover:soldierCover,bazooka:soldierBazooka,advancing:soldierAdvance,underFire:soldierUnderFire,shieldFire:soldierShieldFire,proneFire:soldierProneFire},catThrow:catUltimateFrames.map(frame=>frame.image),catFlying:catFlyingPrepared.image,lying:shipLying},chapter:{truck,trump,milei,arg,usa,bedroom,eating,sleeping,waking:correctedWaking,dark,walk,up,down,run,restingCat,forest,deer,ship},specialFrames,specialProjectileFrames:[specialProjectileFrames[0].image,specialProjectileFrames[1].image],combatTips:[consejo1,consejo2],mountain,player,cat,alien,reunion,fighter,gun,allies:[ally1,ally2],house,tree,alienFrames:[alien1,alien2,alien3,alien4],intro:{building,mountain:introMountain,seated,beer,drink,smokeIn,smokeOut,rise,cat:introCat}};setLoading(false);}).catch(()=>{if(active){setAssetError(true);setLoading(false);}});
  return()=>{active=false;audio.current?.close();mq.removeEventListener('change',changed);};
 },[]);
 useEffect(()=>{
  const map:Record<string,string>={a:'l',arrowleft:'l',d:'r',arrowright:'r',w:'j',arrowup:'j',' ':'j',s:'c',arrowdown:'c',e:'e',shift:'roll'};
  const clear=()=>{st.current.keys={};st.current.fire=false;};
  const down=(e:KeyboardEvent)=>{if(st.current.chapter.computer)return;const key=e.key.toLowerCase();if(key==='r'&&screenRef.current==='play'&&!e.repeat){e.preventDefault();if(triggerSpecial(st.current))setSpecialCooldown(5);return;}if(key==='x'&&screenRef.current==='play'&&!e.repeat){e.preventDefault();if(triggerCatUltimate(st.current)){setCatUltimateUsed(true);setCatUltimateReady(false);}return;}if(key==='escape'&&welcomeActiveRef.current)return;if(key==='escape'){clear();setCreditsOpen(false);setScreen(s=>s==='play'?'paused':s==='paused'?'play':s);return;}if(map[key]&&screenRef.current==='play'){e.preventDefault();st.current.keys[map[key]]=true;}};
  const up=(e:KeyboardEvent)=>{const k=map[e.key.toLowerCase()];if(k)st.current.keys[k]=false;};
  const blur=()=>{clear();setScreen(s=>s==='play'?'paused':s);};
  window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',blur);window.addEventListener('pointerup',clear);
  const fs=()=>setExpanded(Boolean(document.fullscreenElement));document.addEventListener('fullscreenchange',fs);
  return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',blur);window.removeEventListener('pointerup',clear);document.removeEventListener('fullscreenchange',fs);};
 },[]);
 useEffect(()=>{if(screen!=='play'&&!expanded)return;const previous=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=previous;};},[screen,expanded]);
 useEffect(()=>{
  const ctx=cv.current?.getContext('2d');if(!ctx||loading||assetError||!palette.current)return;
  const colors=palette.current;
  ctx.imageSmoothingEnabled=false;let raf=0,last=performance.now(),acc=0;
  const loop=(now:number)=>{const dt=Math.min(.05,(now-last)/1000);last=now;
      try{
    
    if(screen==='play'&&!welcomeActiveRef.current){ 
     const result=update(st.current,dt);acc+=dt;
     if(acc>.12){acc=0;setComputer(st.current.chapter.computer);setContext(canAskHelp(st.current));setCombat(st.current.phase==='fight'||shipIsCombat(st.current));setSpecialCooldown(st.current.phase==='spaceship'?st.current.ship.specialCd:st.current.specialCd);setCatUltimateUsed(st.current.ship.catUltimateUsed);setCatUltimateReady(st.current.phase==='spaceship'&&st.current.ship.stage==='soldierFight'&&st.current.ship.time>=CAT_ULTIMATE_READY_DELAY&&!st.current.ship.catUltimateUsed&&st.current.ship.soldiers.some(soldier=>soldier.hp>0));setAction(introAction(st.current)??chapterAction(st.current));setIntro(st.current.phase==='awka'||CINEMATIC.has(st.current.phase)||st.current.phase==='spaceship'&&!shipIsCombat(st.current)&&!shipIsFree(st.current));setFreeRoom(roomIsFree(st.current)||shipIsFree(st.current)||forestIsFree(st.current));}
     if(result==='lose'&&st.current.phase==='spaceship'&&st.current.ship.stage==='combat'){
      respawnAtShipCheckpoint(st.current);setComputer(false);setContext(false);setCombat(false);setAction(null);setIntro(true);setFreeRoom(false);
     }else if(result==='lose'&&st.current.phase==='spaceship'&&st.current.ship.stage==='soldierFight'){
      respawnAtSoldierCheckpoint(st.current);setCatUltimateUsed(false);setCatUltimateReady(false);setComputer(false);setContext(false);setCombat(true);setAction(null);setIntro(false);setFreeRoom(false);
     }else if(result){setEnding(result==='win'?'revenge':result==='continue'?(['end','soldierEnd'].includes(st.current.ship.stage)?'cross':st.current.chapter.stage==='complete'?'abduction':'continuation'):null);setScreen(result==='lose'?'lose':'win');}
    }else if(screen!=='paused'&&screen!=='play'){
     // Mantener vivos humo y chispas detrás de las pantallas finales.
     const s=st.current;s.t+=dt;s.fx=s.fx.filter(f=>(f.life-=dt)>0);
     if(s.phase==='over'&&Math.random()<dt*6)s.fx.push({x:s.u.x+(Math.random()-.5)*60,y:st.current.p.y-20,life:1.2,c:'smoke'});
    }
    audio.current?.update(st.current,screen==='play'&&!welcomeActiveRef.current);
     draw(ctx,st.current,images.current,colors);host.current?.setAttribute('data-ship-stage',st.current.ship.stage);host.current?.setAttribute('data-phase',st.current.phase);host.current?.setAttribute('data-ufo-health',String(st.current.u.hp));host.current?.setAttribute('data-intro-stage',st.current.intro.stage);host.current?.setAttribute('data-chapter-stage',st.current.chapter.stage);
   }catch(err){console.error('Error en el juego',err);}
   raf=requestAnimationFrame(loop);
  };raf=requestAnimationFrame(loop);return()=>cancelAnimationFrame(raf);
 },[screen,loading,assetError]);
 const start=()=>{setCreditsOpen(false);setControlsOpen(false);setVolumeOpen(false);audio.current??=new GameAudio();try{audio.current.unlock();audio.current.setVolume(masterVolume);audio.current.resetForestAudio();}catch{ /* Audio must never block gameplay. */ }st.current=newIntroState();welcomeActiveRef.current=true;setComputer(false);setIntro(true);setAction(null);setEnding(null);setContext(false);setCombat(false);setCatUltimateUsed(false);setCatUltimateReady(false);setWelcomeVisible(true);setScreen('play');};
 const pause=()=>{st.current.keys={};st.current.fire=false;setScreen('paused');};
 const fullscreen=async()=>{const el=host.current;if(!el)return;if(document.fullscreenElement){await document.exitFullscreen();return;}if(expanded){setExpanded(false);return;}try{if(el.requestFullscreen){await el.requestFullscreen();setExpanded(true);}else setExpanded(true);}catch{setExpanded(true);}};
  const hold=(k:string)=>({onPointerDown:(e:PointerEvent<HTMLButtonElement>)=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);st.current.keys[k]=true;},onPointerUp:()=>{st.current.keys[k]=false;},onPointerCancel:()=>{st.current.keys[k]=false;}});
 const joystickMove=(e:PointerEvent<HTMLDivElement>)=>{if(!e.currentTarget.hasPointerCapture(e.pointerId))return;const r=e.currentTarget.getBoundingClientRect(),dx=(e.clientX-(r.left+r.width/2))/(r.width*.34),dy=(e.clientY-(r.top+r.height/2))/(r.height*.34);st.current.keys.l=dx<-.18;st.current.keys.r=dx>.18;if(roomIsFree(st.current)||forestIsFree(st.current)||st.current.ship.stage==='crossFree'||st.current.ship.stage==='soldierFight'){st.current.keys.j=dy<-.25;st.current.keys.c=dy>.25;}};
 const joystickStart=(e:PointerEvent<HTMLDivElement>)=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);joystickMove(e);};
 const joystickStop=()=>{st.current.keys.l=false;st.current.keys.r=false;st.current.keys.j=false;st.current.keys.c=false;};
 const aim=(e:PointerEvent)=>{if(!shipIsCombat(st.current)||!cv.current)return;const r=cv.current.getBoundingClientRect();st.current.ship.aimX=(e.clientX-r.left)/r.width*W;st.current.ship.aimY=(e.clientY-r.top)/r.height*H;st.current.ship.aimActive=true;};
 const fire=(e:PointerEvent)=>{if(screen!=='play'||!(st.current.phase==='fight'||shipIsCombat(st.current)))return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);if(e.currentTarget===cv.current)aim(e);st.current.fire=true;};
 const controlClass='game-control rounded-full border border-silver/50 bg-background/70 text-foreground touch-none';
 const specialProgress=Math.max(0,Math.min(1,1-specialCooldown/5));
 const specialLabel=specialCooldown>0?Math.ceil(specialCooldown):'R';
 return <div ref={host} className={`ufo-game ${expanded?'game-expanded':''}`} data-screen={screen}>
  <div className="game-stage">
   {screen==='title'&&<img className="game-title-background" src="/imagens/menu%20de%20juego.png" alt=""/>}
   <canvas ref={cv} width={W} height={H} aria-label="OVNIS EN EL BOLSÓN, escenario de juego" className="h-full w-full" onPointerDown={e=>{if(e.pointerType==='mouse'&&e.button===0)fire(e);}} onPointerMove={aim} onPointerUp={()=>{st.current.fire=false;}} onPointerCancel={()=>{st.current.fire=false;}} onContextMenu={e=>e.preventDefault()}/>
   {welcomeVisible&&<GameWelcomeIntro onComplete={()=>{welcomeActiveRef.current=false;setWelcomeVisible(false);}}/>}
   {screen!=='title'&&!(screen==='play'&&welcomeVisible)&&<div className="absolute right-2 top-2 z-20 flex gap-2">
    {screen==='play'&&<Button size="icon" variant="outline" title="Pausar" aria-label="Pausar" onClick={pause}><Pause/></Button>}
    <div className="game-volume-anchor">
     <Button size="icon" variant="outline" title="Control de volumen" aria-label="Control de volumen" aria-expanded={volumeOpen} aria-controls="game-volume-panel" onClick={()=>setVolumeOpen(open=>!open)}>
      {masterVolume===0?<VolumeX/>:<Volume2/>}
     </Button>
     {volumeOpen&&<div id="game-volume-panel" className="game-volume-panel" role="group" aria-label="Volumen del juego">
      <label htmlFor="ufo-game-volume">VOLUMEN</label>
      <input id="ufo-game-volume" type="range" min="0" max="100" step="1" value={Math.round(masterVolume*100)} aria-label="Volumen del juego" onChange={e=>{const next=Number(e.currentTarget.value)/100;setMasterVolume(next);audio.current?.setVolume(next);}}/>
      <output htmlFor="ufo-game-volume">{Math.round(masterVolume*100)}%</output>
     </div>}
    </div>
    <Button size="icon" variant="outline" title={expanded?'Salir de pantalla completa':'Pantalla completa'} aria-label={expanded?'Salir de pantalla completa':'Pantalla completa'} onClick={fullscreen}>{expanded?<Minimize/>:<Maximize/>}</Button>
   </div>}
      {screen==='play'&&!computer&&touch&&(freeRoom||combat||(!intro&&!CINEMATIC.has(st.current.phase)))&&<div className={`game-touch game-mobile-layout ${shipIsCombat(st.current)?'game-ship-touch':''} ${combat?'game-combat-layout':''} pointer-events-none absolute inset-x-0 bottom-2 z-10 flex justify-between px-3`}>
        <div className="game-touch-left pointer-events-auto flex items-end gap-2">
         <div className="game-joystick" role="group" aria-label="Joystick de movimiento" onPointerDown={joystickStart} onPointerMove={joystickMove} onPointerUp={joystickStop} onPointerCancel={joystickStop}><span className="game-joystick-thumb"/><ArrowLeft className="game-joystick-left"/><ArrowRight className="game-joystick-right"/></div>
         {!shipIsCombat(st.current)&&st.current.ship.stage!=='crossWalk'&&<Button className={`${controlClass} game-move-control`} aria-label={freeRoom?"Caminar hacia abajo":"Agacharse"} {...hold('c')}><ArrowDown/></Button>}
        </div>
        <div className="game-touch-right game-action-cluster pointer-events-auto">
         {context&&<Button className={`${controlClass} game-context-control`} aria-label="Pedir ayuda a los pibes" {...hold('e')}><Hand/></Button>}
         {(!shipIsCombat(st.current)||st.current.ship.stage==='soldierFight')&&st.current.ship.stage!=='crossWalk'&&<Button className={`${controlClass} game-jump-control pointer-events-auto`} aria-label={freeRoom?"Caminar hacia arriba":"Saltar"} {...hold('j')}><ArrowUp/></Button>}
         {combat&&<Button className={`${controlClass} game-roll-control pointer-events-auto`} aria-label="Rodar" {...hold('roll')}><RotateCcw/></Button>}
         {st.current.ship.stage==='soldierFight'&&<Button className={`${controlClass} game-cat-ultimate-control`} aria-label="Ataque definitivo del gato · X" title="Ataque definitivo del gato · X" disabled={!catUltimateReady||catUltimateUsed} onClick={()=>{if(triggerCatUltimate(st.current)){setCatUltimateUsed(true);setCatUltimateReady(false);}}}><span>X</span></Button>}
         {combat&&<Button className={`${controlClass} game-fire-control pointer-events-auto`} aria-label="Disparar" onPointerDown={fire} onPointerUp={()=>{st.current.fire=false;}} onPointerCancel={()=>{st.current.fire=false;}}><Crosshair/></Button>}
        </div>
   </div>}
    {screen==='play'&&!computer&&!touch&&st.current.ship.stage==='soldierFight'&&<Button type="button" variant="outline" className="game-cat-ultimate-hud" aria-label="Ataque definitivo del gato · X" title="Ataque definitivo del gato · X" disabled={!catUltimateReady||catUltimateUsed} onClick={()=>{if(triggerCatUltimate(st.current)){setCatUltimateUsed(true);setCatUltimateReady(false);}}}><span>X</span><small>GATO</small></Button>}
   {screen==='play'&&combat&&!computer&&<Button type="button" variant="outline" className="game-special-hud" aria-label={specialCooldown>0?`Ataque especial, disponible en ${Math.ceil(specialCooldown)} segundos`:'Ataque especial disponible · R'} title={specialCooldown>0?`Recargando: ${Math.ceil(specialCooldown)} s`:'Ataque especial · R'} disabled={specialCooldown>0} onClick={()=>{if(triggerSpecial(st.current))setSpecialCooldown(5);}}>
      <svg className="game-special-ring" viewBox="0 0 64 64" aria-hidden="true">
       <circle className="game-special-ring-track" cx="32" cy="32" r="25"/>
       <circle className="game-special-ring-progress" cx="32" cy="32" r="25" strokeDasharray="157.08" strokeDashoffset={157.08*(1-specialProgress)}/>
      </svg>
      <Zap className="game-special-icon" aria-hidden="true"/>
      <span className="game-special-count">{specialLabel}</span>
     </Button>}
   {screen==='play'&&!computer&&action&&<Button className={`game-intro-action ${(freeRoom||shipIsCombat(st.current))&&touch?'game-room-action':''} absolute bottom-3 left-1/2 z-20 -translate-x-1/2`} onClick={()=>{if(st.current.phase==='awka')interactIntro(st.current);else interactChapter(st.current);setAction(null);}}><Hand/>{action}</Button>}
   {screen==='play'&&!computer&&!touch&&context&&<Button className="absolute bottom-4 left-1/2 -translate-x-1/2" onClick={()=>{st.current.keys.e=true;}}><Hand/> PEDIR AYUDA A LOS PIBES · E</Button>}
   {screen==='play'&&computer&&<GameComputer onClose={()=>{closeComputer(st.current);setComputer(false);}}/>}
    {screen==='title'&&<nav className="game-menu" aria-label="Menú principal de UFOCAT">
     <button type="button" className="game-menu-hit game-menu-play" aria-label="Jugar" onClick={start} disabled={loading||assetError}/>
     <button type="button" className="game-menu-hit game-menu-controls" aria-label="Controles" aria-expanded={controlsOpen} aria-controls="game-controls-dialog" onClick={()=>setControlsOpen(true)}>CONTROLES</button>
     <button type="button" className="game-menu-hit game-menu-credits" aria-label="Créditos" onClick={()=>setCreditsOpen(true)}/>
     <Link to="/" className="game-menu-hit game-menu-exit" aria-label="Salir de UFOCAT"/>
     {controlsOpen&&<div className="game-credits-backdrop" onClick={()=>setControlsOpen(false)}>
      <section id="game-controls-dialog" className="game-credits-card game-controls-card" role="dialog" aria-modal="true" aria-labelledby="game-controls-title" onClick={e=>e.stopPropagation()}>
       <h2 id="game-controls-title">CONTROLES</h2>
       <div className="game-controls-list">
        <p><kbd>W A S D</kbd><span>Moverse. A/D para los lados; W/S para subir y bajar según la escena.</span></p>
        <p><kbd>W / ESPACIO</kbd><span>Saltar durante la aventura y los combates.</span></p>
        <p><kbd>SHIFT / <RotateCcw aria-hidden="true"/></kbd><span>Rodar para esquivar. En móvil, botón con icono de girar.</span></p>
        <p><kbd>R / <Zap aria-hidden="true"/></kbd><span>Usar la habilidad especial.</span></p>
        <p><kbd>X</kbd><span>Lanzar al gato y activar su rayo definitivo durante el combate militar.</span></p>
        <p><kbd>E / TAP / <Hand aria-hidden="true"/></kbd><span>Interactuar, aceptar opciones o pedir ayuda.</span></p>
        <p><kbd>CLIC IZQ. / <Crosshair aria-hidden="true"/></kbd><span>Disparar durante los combates. En móvil, botón de disparo.</span></p>
        <p><kbd>JOYSTICK</kbd><span>Moverse en celulares y dispositivos táctiles.</span></p>
       </div>
       <button type="button" className="game-credits-close" onClick={()=>setControlsOpen(false)}>VOLVER</button>
      </section>
     </div>}
     {creditsOpen&&<div className="game-credits-backdrop" onClick={()=>setCreditsOpen(false)}>
      <section className="game-credits-card" role="dialog" aria-modal="true" aria-labelledby="game-credits-title" onClick={e=>e.stopPropagation()}>
       <h2 id="game-credits-title">CRÉDITOS</h2>
       <p>Creado por Gennaro Montecino &amp; la SI (Super Inteligencia)</p>
       <button type="button" className="game-credits-close" onClick={()=>setCreditsOpen(false)}>VOLVER</button>
      </section>
     </div>}
     {loading&&<p className="game-menu-status">CARGANDO…</p>}
     {assetError&&<p className="game-menu-error" role="alert">No se pudieron cargar las imágenes. Recargá la página para reintentar.</p>}
    </nav>}
    {screen!=='play'&&screen!=='title'&&<div className="game-overlay absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/65 px-5 text-center">
     {screen==='paused'&&<><h2 className="game-title font-serif">Pausa</h2><Button size="lg" onClick={()=>setScreen('play')}><Play/>CONTINUAR</Button><Button variant="ghost" onClick={()=>{setScreen('title');st.current=newState();}}>MENÚ DEL JUEGO</Button></>}
     {screen==='win'&&ending&&<><h2 className="game-ending font-serif">{ENDINGS[ending].title}</h2><p className="font-mono text-xs text-celeste">{ENDINGS[ending].sub}</p><Button onClick={start}><RotateCcw/> VOLVER A JUGAR</Button><Button variant="outline" onClick={()=>{st.current=newState();setScreen('title');}}>MENÚ DEL JUEGO</Button></>}
     {screen==='lose'&&<><h2 className="game-title font-serif">TE DERROTARON</h2><p className="font-mono text-xs">El gato sigue a bordo del platillo.</p><Button onClick={start}><RotateCcw/>VOLVER A JUGAR</Button></>}
     {!loading&&<Button variant="link" asChild><Link to="/">VOLVER A APFAA</Link></Button>}
    </div>}
  </div>
 </div>;
}
