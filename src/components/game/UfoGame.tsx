import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Crosshair, Hand, Maximize, Minimize, Pause, Play, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import mountain from '@/assets/piltriquitron-cartoon.png.asset.json';
import player from '@/assets/personaje-juego.png.asset.json';
import cat from '@/assets/gato-juego.png.asset.json';
import alien from '@/assets/alien-rise.png.asset.json';
import reunion from '@/assets/cat-reunion.png.asset.json';
import { W, H, ENDINGS, CINEMATIC, canAskHelp, newState, newIntroState, introAction, interactIntro, chapterAction, interactChapter, roomIsFree, update, type Ending, type Screen } from './game-engine';
import { draw, type GameImages, type Palette } from './game-renderer';

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
import wakingArt from '@/assets/player-waking.png.asset.json';
import darkArt from '@/assets/bedroom-dark.jpg.asset.json';
import walkArt from '@/assets/room-walk.png.asset.json';
import upArt from '@/assets/room-up.png.asset.json';
import downArt from '@/assets/room-down.png.asset.json';
import runArt from '@/assets/forest-run.png.asset.json';
import restArt from '@/assets/cat-rest.png.asset.json';
import forestArt from '@/assets/forest-background.jpg.asset.json';
import deerArt from '@/assets/forest-deer.png.asset.json';
import shipArt from '@/assets/forest-ufo.png.asset.json';

export function UfoGame() {
 const cv=useRef<HTMLCanvasElement>(null), host=useRef<HTMLDivElement>(null), st=useRef(newState()), images=useRef<GameImages|null>(null), palette=useRef<Palette|null>(null);
 const [screen,setScreen]=useState<Screen>('title'), [ending,setEnding]=useState<Ending|null>(null), [touch,setTouch]=useState(false),[expanded,setExpanded]=useState(false),[loading,setLoading]=useState(true),[assetError,setAssetError]=useState(false),[context,setContext]=useState(false),[combat,setCombat]=useState(false);
 const [action,setAction]=useState<string|null>(null), [intro,setIntro]=useState(false), [freeRoom,setFreeRoom]=useState(false);
 const screenRef=useRef(screen);screenRef.current=screen;
 useEffect(()=>{
  const mq=window.matchMedia('(pointer: coarse)');const changed=()=>setTouch(mq.matches);changed();mq.addEventListener('change',changed);
  const readPalette=()=>{if(!host.current)return;const css=getComputedStyle(host.current);const colors={} as Palette;for(const key of ['turquoise','sky','rose','gold','sunset','light','ice','panel','ink','forest','trunk','wall','roof','leaf','road','curb','lane','shadow','hill','metal','glass','laser','smoke','stone','skin','red','alien'] as const)colors[key]=css.getPropertyValue('--game-'+key).trim();palette.current=colors;};readPalette();
  const load=(url:string)=>new Promise<HTMLImageElement>((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=url;});let active=true;
    Promise.all([load(mountain.url),load(player.url),load(cat.url),load(alien.url),load(reunion.url),load('/imagens/imagem-cb85a873.png'),load('/imagens/imagem-4233f6e4.png'),load('/imagens/imagem-3241014a.png'),load('/imagens/imagem-97d3754a.png'),load('/imagens/imagem-2fed5c3b.webp'),load('/imagens/imagem-499d0608.png'),load('/imagens/imagem-28e06bb0.webp'),load('/imagens/imagem-debb83e3.webp'),load('/imagens/imagem-63fa9a4e.webp'),load(awkaBuilding.url),load(awkaMountain.url),load(awkaSeated.url),load(awkaBeer.url),load(awkaDrink.url),load(awkaSmokeIn.url),load(awkaSmokeOut.url),load(awkaRise.url),load(awkaCat.url),load(truckArt.url),load(trumpArt.url),load(mileiArt.url),load(argArt.url),load(usaArt.url),load(roomArt.url),load(eatingArt.url),load(sleepingArt.url),load(wakingArt.url),load(darkArt.url),load(walkArt.url),load(upArt.url),load(downArt.url),load(runArt.url),load(restArt.url),load(forestArt.url),load(deerArt.url),load(shipArt.url)] as const).then(([mountain,player,cat,alien,reunion,alien1,alien2,alien3,alien4,fighter,gun,ally1,ally2,house,building,introMountain,seated,beer,drink,smokeIn,smokeOut,rise,introCat,truck,trump,milei,arg,usa,bedroom,eating,sleeping,waking,dark,walk,up,down,run,restingCat,forest,deer,ship])=>{if(!active)return;images.current={chapter:{truck,trump,milei,arg,usa,bedroom,eating,sleeping,waking,dark,walk,up,down,run,restingCat,forest,deer,ship},mountain,player,cat,alien,reunion,fighter,gun,allies:[ally1,ally2],house,alienFrames:[alien1,alien2,alien3,alien4],intro:{building,mountain:introMountain,seated,beer,drink,smokeIn,smokeOut,rise,cat:introCat}};setLoading(false);}).catch(()=>{if(active){setAssetError(true);setLoading(false);}});
  return()=>{active=false;mq.removeEventListener('change',changed);};
 },[]);
 useEffect(()=>{
  const map:Record<string,string>={a:'l',arrowleft:'l',d:'r',arrowright:'r',w:'j',arrowup:'j',' ':'j',s:'c',arrowdown:'c',e:'e'};
  const clear=()=>{st.current.keys={};st.current.fire=false;};
  const down=(e:KeyboardEvent)=>{const key=e.key.toLowerCase();if(key==='escape'){clear();setScreen(s=>s==='play'?'paused':s==='paused'?'play':s);return;}if(map[key]&&screenRef.current==='play'){e.preventDefault();st.current.keys[map[key]]=true;}};
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
    
    if(screen==='play'){ 
     const result=update(st.current,dt);acc+=dt;
     if(acc>.12){acc=0;setContext(canAskHelp(st.current));setCombat(st.current.phase==='fight');setAction(introAction(st.current)??chapterAction(st.current));setIntro(st.current.phase==='awka'||CINEMATIC.has(st.current.phase));setFreeRoom(roomIsFree(st.current));}
     if(result){setEnding(result==='win'?'revenge':result==='continue'?(st.current.chapter.stage==='complete'?'abduction':'continuation'):null);setScreen(result==='lose'?'lose':'win');}
    }else if(screen!=='paused'){
     // Mantener vivos humo y chispas detrás de las pantallas finales.
     const s=st.current;s.t+=dt;s.fx=s.fx.filter(f=>(f.life-=dt)>0);
     if(s.phase==='over'&&Math.random()<dt*6)s.fx.push({x:s.u.x+(Math.random()-.5)*60,y:st.current.p.y-20,life:1.2,c:'smoke'});
    }
    draw(ctx,st.current,images.current,colors);host.current?.setAttribute('data-phase',st.current.phase);host.current?.setAttribute('data-ufo-health',String(st.current.u.hp));host.current?.setAttribute('data-intro-stage',st.current.intro.stage);host.current?.setAttribute('data-chapter-stage',st.current.chapter.stage);
   }catch(err){console.error('Error en el juego',err);}
   raf=requestAnimationFrame(loop);
  };raf=requestAnimationFrame(loop);return()=>cancelAnimationFrame(raf);
 },[screen,loading,assetError]);
 const start=()=>{st.current=newIntroState();setIntro(true);setAction(null);setEnding(null);setContext(false);setCombat(false);setScreen('play');};
 const pause=()=>{st.current.keys={};st.current.fire=false;setScreen('paused');};
 const fullscreen=async()=>{const el=host.current;if(!el)return;if(document.fullscreenElement){await document.exitFullscreen();return;}if(expanded){setExpanded(false);return;}try{if(el.requestFullscreen){await el.requestFullscreen();setExpanded(true);}else setExpanded(true);}catch{setExpanded(true);}};
  const hold=(k:string)=>({onPointerDown:(e:PointerEvent<HTMLButtonElement>)=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);st.current.keys[k]=true;},onPointerUp:()=>{st.current.keys[k]=false;},onPointerCancel:()=>{st.current.keys[k]=false;}});
 const joystickMove=(e:PointerEvent<HTMLDivElement>)=>{const r=e.currentTarget.getBoundingClientRect(),dx=(e.clientX-(r.left+r.width/2))/(r.width*.34),dy=(e.clientY-(r.top+r.height/2))/(r.height*.34);st.current.keys.l=dx<-.18;st.current.keys.r=dx>.18;if(roomIsFree(st.current)){st.current.keys.j=dy<-.25;st.current.keys.c=dy>.25;}};
 const joystickStart=(e:PointerEvent<HTMLDivElement>)=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);joystickMove(e);};
 const joystickStop=()=>{st.current.keys.l=false;st.current.keys.r=false;st.current.keys.j=false;st.current.keys.c=false;};
 const fire=(e:PointerEvent)=>{if(screen!=='play'||st.current.phase==='awka'||CINEMATIC.has(st.current.phase))return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);st.current.fire=true;};
 const controlClass='game-control rounded-full border border-silver/50 bg-background/70 text-foreground touch-none';
 return <div ref={host} className={`ufo-game ${expanded?'game-expanded':''}`} data-screen={screen}>
  <div className="game-stage">
   {screen==='title'&&<img className="game-title-background" src={mountain.url} alt=""/>}
   <canvas ref={cv} width={W} height={H} aria-label="OVNIS EN EL BOLSÓN, escenario de juego" className="h-full w-full" onPointerDown={e=>{if(e.pointerType==='mouse'&&e.button===0)fire(e);}} onPointerUp={()=>{st.current.fire=false;}} onPointerCancel={()=>{st.current.fire=false;}} onContextMenu={e=>e.preventDefault()}/>
   <div className="absolute right-2 top-2 z-20 flex gap-2">
    {screen==='play'&&<Button size="icon" variant="outline" title="Pausar" aria-label="Pausar" onClick={pause}><Pause/></Button>}
    <Button size="icon" variant="outline" title={expanded?'Salir de pantalla completa':'Pantalla completa'} aria-label={expanded?'Salir de pantalla completa':'Pantalla completa'} onClick={fullscreen}>{expanded?<Minimize/>:<Maximize/>}</Button>
   </div>
      {screen==='play'&&touch&&(freeRoom||(!intro&&!CINEMATIC.has(st.current.phase)))&&<div className="game-touch pointer-events-none absolute inset-x-0 bottom-2 z-10 flex justify-between px-3">
        <div className="pointer-events-auto flex items-end gap-2"><div className="game-joystick" role="group" aria-label="Joystick de movimiento" onPointerDown={joystickStart} onPointerMove={joystickMove} onPointerUp={joystickStop} onPointerCancel={joystickStop}><span className="game-joystick-thumb"/><ArrowLeft className="game-joystick-left"/><ArrowRight className="game-joystick-right"/></div><Button className={`${controlClass} game-move-control`} aria-label={freeRoom?"Caminar hacia abajo":"Agacharse"} {...hold('c')}><ArrowDown/></Button></div>
    <div className="pointer-events-auto flex items-end gap-2">{context&&<Button className={controlClass} aria-label="Pedir ayuda a los pibes" {...hold('e')}><Hand/></Button>}<Button className={controlClass} aria-label={freeRoom?"Caminar hacia arriba":"Saltar"} {...hold('j')}><ArrowUp/></Button>{combat&&<Button className={`${controlClass} game-fire-control`} aria-label="Disparar" onPointerDown={fire} onPointerUp={()=>{st.current.fire=false;}} onPointerCancel={()=>{st.current.fire=false;}}><Crosshair/></Button>}</div>
   </div>}
   {screen==='play'&&action&&<Button className={`game-intro-action ${freeRoom&&touch?'game-room-action':''} absolute bottom-3 left-1/2 z-20 -translate-x-1/2`} onClick={()=>{if(st.current.phase==='awka')interactIntro(st.current);else interactChapter(st.current);setAction(null);}}><Hand/>{action}</Button>}
   {screen==='play'&&!touch&&context&&<Button className="absolute bottom-4 left-1/2 -translate-x-1/2" onClick={()=>{st.current.keys.e=true;}}><Hand/> PEDIR AYUDA A LOS PIBES · E</Button>}
   {screen!=='play'&&<div className="game-overlay absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/65 px-5 text-center">
        {screen==='title'&&<div className="game-title-card"><p className="font-mono text-xs text-celeste">UFOCAT Test 1.1</p><p className="font-serif text-lg italic text-foreground/90">Vos y tu gato pasan un momento de terror en las afueras de El Bolsón</p><Button size="lg" onClick={start} disabled={loading||assetError}><Play/>{loading?'CARGANDO…':'JUGAR'}</Button>{assetError&&<p role="alert">No se pudieron cargar las imágenes. Recargá la página para reintentar.</p>}</div>}
    {screen==='paused'&&<><h2 className="game-title font-serif">Pausa</h2><Button size="lg" onClick={()=>setScreen('play')}><Play/>CONTINUAR</Button><Button variant="ghost" onClick={()=>{setScreen('title');st.current=newState();}}>MENÚ DEL JUEGO</Button></>}
    {screen==='win'&&ending&&<><h2 className="game-ending font-serif">{ENDINGS[ending].title}</h2><p className="font-mono text-xs text-celeste">{ENDINGS[ending].sub}</p><Button onClick={start}><RotateCcw/> VOLVER A JUGAR</Button><Button variant="outline" onClick={()=>{st.current=newState();setScreen('title');}}>MENÚ DEL JUEGO</Button></>}
    {screen==='lose'&&<><h2 className="game-title font-serif">TE DERROTARON</h2><p className="font-mono text-xs">El gato sigue a bordo del platillo.</p><Button onClick={start}><RotateCcw/>VOLVER A JUGAR</Button></>}
    {!loading&&<Button variant="link" asChild><Link to="/">VOLVER A APFAA</Link></Button>}
   </div>}
  </div>
 </div>;
}
