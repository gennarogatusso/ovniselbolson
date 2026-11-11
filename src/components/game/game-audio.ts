import type { S } from './game-engine';
import ambience from '@/assets/awka-ambience.mp3.asset.json';
export const AWKA_VOLUME = .30;
const FOREST_RAIN_STAGES = new Set(['forestFade','forestRun','deer','burned','ship','beam','lift','vanished','complete']);
export function awkaMusicActive(s:S,playing:boolean){return playing&&s.phase==='awka'&&s.intro.stage!=='depart'&&s.intro.stage!=='done';}

type MusicTheme = 'night'|'horror'|'battle'|'aftermath'|'bedroom'|'forest'|'lab'|'finale';
type ThemeConfig = {
 bpm:number;
 chords:number[][];
 melody:(number|null)[];
 padWave:OscillatorType;
 leadWave:OscillatorType;
 padVolume:number;
 leadVolume:number;
 bassVolume:number;
};

const MUSIC_THEMES:Record<MusicTheme,ThemeConfig> = {
 night:{
  bpm:78,chords:[[38,45,50],[34,41,46],[41,48,53],[36,43,48]],
  melody:[null,62,null,65,null,69,null,65,null,62,null,60,null,57,null,60],
  padWave:'sine',leadWave:'triangle',padVolume:.10,leadVolume:.15,bassVolume:.13,
 },
 horror:{
  bpm:68,chords:[[38,45,50,53],[36,43,48,52],[33,40,45,48],[35,42,47,51]],
  melody:[null,null,74,null,null,69,null,null,72,null,null,65,null,69,null,null],
  padWave:'sawtooth',leadWave:'sine',padVolume:.055,leadVolume:.10,bassVolume:.12,
 },
 battle:{
  bpm:116,chords:[[45,52,57,60],[41,48,53,57],[43,50,55,58],[40,47,52,55]],
  melody:[69,null,72,76,null,72,69,null,67,null,71,74,null,71,67,null],
  padWave:'sawtooth',leadWave:'square',padVolume:.055,leadVolume:.12,bassVolume:.19,
 },
 aftermath:{
  bpm:84,chords:[[38,45,50,53],[34,41,46,50],[41,48,53,57],[36,43,48,52]],
  melody:[null,62,null,null,65,null,69,null,null,67,null,65,null,62,null,57],
  padWave:'triangle',leadWave:'sine',padVolume:.09,leadVolume:.13,bassVolume:.13,
 },
 bedroom:{
  bpm:72,chords:[[57,64,69],[53,60,65],[55,62,67],[52,59,64]],
  melody:[null,69,null,72,null,null,76,null,null,72,null,69,null,67,null,69],
  padWave:'sine',leadWave:'sine',padVolume:.07,leadVolume:.11,bassVolume:.09,
 },
 forest:{
  bpm:64,chords:[[36,43,48,53],[34,41,46,51],[31,38,43,48],[33,40,45,50]],
  melody:[null,null,77,null,null,72,null,null,74,null,null,69,null,null,72,null],
  padWave:'sawtooth',leadWave:'triangle',padVolume:.06,leadVolume:.095,bassVolume:.14,
 },
 lab:{
  bpm:56,chords:[[31,38,45,50],[29,36,43,48],[33,40,45,52],[28,35,42,47]],
  melody:[null,null,69,null,null,72,null,null,67,null,null,65,null,69,null,null],
  padWave:'triangle',leadWave:'sine',padVolume:.075,leadVolume:.065,bassVolume:.12,
 },
 finale:{
  bpm:64,chords:[[50,53,57,62],[46,50,53,58],[41,45,48,53],[48,52,55,60]],
  melody:[null,74,null,77,null,81,null,77,null,74,null,72,null,69,null,72],
  padWave:'sine',leadWave:'sine',padVolume:.075,leadVolume:.12,bassVolume:.12,
 },
};

const hz=(midi:number)=>440*Math.pow(2,(midi-69)/12);

export class GameAudio {
 private context:AudioContext|null=null;
 private master:GainNode|null=null;
 private lastStage='';
 private lastPulse=0;
 private music:HTMLAudioElement|null=null;
 private forestTrack:HTMLAudioElement|null=null;
 private rainTrack:HTMLAudioElement|null=null;
 private forestMusicStarted=false;
 private rainActive=false;
 private gamePaused=false;
 private musicActive=false;
 private volume=0.8;

 // Música procedural: no necesita descargar archivos ni servicios externos.
 private musicTheme:MusicTheme|null=null;
 private musicBus:GainNode|null=null;
 private musicTimer:number|null=null;
 private musicStep=0;
 private nextMusicTime=0;
 private musicNodes=new Set<OscillatorNode>();
 private nextMainShot=0;
 private lastLaserCount=0;
 private lastPhase='';
 private lastIntroStage='';
 private lastChapterStage='';
 private lastJetScreenX=[Number.NaN,Number.NaN];
 private nextJetWhoosh=0;

 unlock(){
  this.context??=new AudioContext();
  if(!this.master){this.master=this.context.createGain();this.master.gain.value=.12*this.volume;this.master.connect(this.context.destination);}
  void this.context.resume();
  this.music??=new Audio(ambience.url);
  this.music.volume=AWKA_VOLUME*this.volume;this.music.loop=true;
  this.forestTrack??=new Audio('/imagens/audio%20bosque%20-%20final.mp3');
  this.forestTrack.loop=true;this.forestTrack.preload='auto';
  this.rainTrack??=new Audio('/imagens/lluvia.mp3');
  this.rainTrack.loop=true;this.rainTrack.preload='auto';
 }

 setVolume(value:number){
  this.volume=Math.max(0,Math.min(1,value));
  if(this.master&&this.context)this.master.gain.setTargetAtTime(.12*this.volume,this.context.currentTime,.035);
  if(this.music)this.music.volume=AWKA_VOLUME*this.volume;
  if(this.forestTrack)this.forestTrack.volume=.72*this.volume;
  if(this.rainTrack)this.rainTrack.volume=.42*this.volume;
 }

 resetForestAudio(){
  this.forestMusicStarted=false;this.rainActive=false;this.gamePaused=false;
  for(const track of [this.forestTrack,this.rainTrack]){
   if(!track)continue;
   track.pause();track.currentTime=0;
  }
 }

 private tone(frequency:number,duration:number,type:OscillatorType='sine',end=frequency,volume=.35){
  const c=this.context,m=this.master;if(!c||!m||c.state!=='running')return;
  const o=c.createOscillator(),g=c.createGain(),t=c.currentTime;
  o.type=type;o.frequency.setValueAtTime(frequency,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,end),t+duration);
  g.gain.setValueAtTime(volume,t);g.gain.exponentialRampToValueAtTime(.001,t+duration);
  o.connect(g);g.connect(m);o.start(t);o.stop(t+duration);
 }

 private noise(duration:number,volume:number,lowpass:number,highpass=120){
  const c=this.context,m=this.master;if(!c||!m||c.state!=='running')return;
  const length=Math.max(1,Math.floor(c.sampleRate*duration)),buffer=c.createBuffer(1,length,c.sampleRate),data=buffer.getChannelData(0);
  for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*(1-i/length);
  const source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain(),t=c.currentTime;
  source.buffer=buffer;filter.type='lowpass';filter.frequency.setValueAtTime(lowpass,t);filter.frequency.exponentialRampToValueAtTime(Math.max(60,highpass),t+duration);
  gain.gain.setValueAtTime(volume,t);gain.gain.exponentialRampToValueAtTime(.001,t+duration);
  source.connect(filter);filter.connect(gain);gain.connect(m);source.start(t);source.stop(t+duration);
 }

 private musicNote(bus:GainNode,note:number,when:number,duration:number,wave:OscillatorType,volume:number){
  const c=this.context;if(!c)return;
  const oscillator=c.createOscillator(),gain=c.createGain();
  oscillator.type=wave;oscillator.frequency.setValueAtTime(hz(note),when);
  gain.gain.setValueAtTime(.0001,when);
  gain.gain.linearRampToValueAtTime(volume,when+Math.min(.16,duration*.22));
  gain.gain.setValueAtTime(volume,when+duration*.55);
  gain.gain.exponentialRampToValueAtTime(.0001,when+duration);
  oscillator.connect(gain);gain.connect(bus);
  oscillator.onended=()=>{this.musicNodes.delete(oscillator);oscillator.disconnect();gain.disconnect();};
  this.musicNodes.add(oscillator);oscillator.start(when);oscillator.stop(when+duration+.03);
 }

 private musicKick(when:number){
  const c=this.context,bus=this.musicBus;if(!c||!bus)return;
  const o=c.createOscillator(),g=c.createGain();
  o.type='sine';o.frequency.setValueAtTime(125,when);o.frequency.exponentialRampToValueAtTime(42,when+.19);
  g.gain.setValueAtTime(.2,when);g.gain.exponentialRampToValueAtTime(.001,when+.22);
  o.connect(g);g.connect(bus);o.start(when);o.stop(when+.23);
  o.onended=()=>{o.disconnect();g.disconnect();};
 }

 private musicNoise(when:number,duration:number,volume:number,cutoff:number){
  const c=this.context,bus=this.musicBus;if(!c||!bus)return;
  const length=Math.max(1,Math.floor(c.sampleRate*duration)),buffer=c.createBuffer(1,length,c.sampleRate),data=buffer.getChannelData(0);
  for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*(1-i/length);
  const source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain();
  source.buffer=buffer;filter.type='highpass';filter.frequency.value=cutoff;
  gain.gain.setValueAtTime(volume,when);gain.gain.exponentialRampToValueAtTime(.001,when+duration);
  source.connect(filter);filter.connect(gain);gain.connect(bus);source.start(when);source.stop(when+duration);
  source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
 }

 private musicOrganChord(bus:GainNode,chord:number[],when:number,duration:number){
  const c=this.context;if(!c)return;
  for(const [index,note] of chord.entries()){
   const partials:[number,number,OscillatorType][]=[[1,.065,'sine'],[2,.018,'triangle']];
   for(const [multiple,volume,wave] of partials){
    const oscillator=c.createOscillator(),gain=c.createGain();
    oscillator.type=wave;oscillator.frequency.setValueAtTime(hz(note)*multiple*(index%2?1.001:1),when);
    gain.gain.setValueAtTime(.0001,when);
    gain.gain.linearRampToValueAtTime(volume,when+Math.min(2.4,duration*.28));
    gain.gain.setValueAtTime(volume,when+duration*.66);
    gain.gain.linearRampToValueAtTime(.0001,when+duration);
    oscillator.connect(gain);gain.connect(bus);
    oscillator.onended=()=>{this.musicNodes.delete(oscillator);oscillator.disconnect();gain.disconnect();};
    this.musicNodes.add(oscillator);oscillator.start(when);oscillator.stop(when+duration+.04);
   }
  }
 }

 private musicPianoNote(bus:GainNode,note:number,when:number,duration:number,volume:number){
  const c=this.context;if(!c)return;
  const partials:[number,number][]=[[1,1],[2,.24],[3,.07]];
  for(const [multiple,level] of partials){
   const oscillator=c.createOscillator(),gain=c.createGain();
   oscillator.type='sine';oscillator.frequency.setValueAtTime(hz(note)*multiple,when);
   gain.gain.setValueAtTime(.0001,when);
   gain.gain.linearRampToValueAtTime(volume*level,when+.018);
   gain.gain.exponentialRampToValueAtTime(.0001,when+duration);
   oscillator.connect(gain);gain.connect(bus);
   oscillator.onended=()=>{this.musicNodes.delete(oscillator);oscillator.disconnect();gain.disconnect();};
   this.musicNodes.add(oscillator);oscillator.start(when);oscillator.stop(when+duration+.03);
  }
 }

 private stopMusic(){
  if(this.musicTimer!==null){window.clearInterval(this.musicTimer);this.musicTimer=null;}
  const oldBus=this.musicBus;
  if(oldBus&&this.context){
   const now=this.context.currentTime;
   oldBus.gain.cancelScheduledValues(now);oldBus.gain.setTargetAtTime(.0001,now,.12);
   window.setTimeout(()=>oldBus.disconnect(),650);
  }
  for(const oscillator of this.musicNodes){try{oscillator.stop((this.context?.currentTime??0)+.16);}catch{/* Ya estaba detenido. */}}
  this.musicBus=null;this.musicTheme=null;
 }

 private setMusic(theme:MusicTheme|null){
  if(theme===this.musicTheme)return;
  this.stopMusic();
  if(!theme||!this.context||!this.master)return;
  const c=this.context,now=c.currentTime;
  this.musicTheme=theme;this.musicStep=0;this.nextMusicTime=now+.06;
  this.musicBus=c.createGain();this.musicBus.gain.setValueAtTime(.0001,now);
  this.musicBus.gain.linearRampToValueAtTime(.82,now+1.25);this.musicBus.connect(this.master);
  this.musicTimer=window.setInterval(()=>this.scheduleMusic(),80);
  this.scheduleMusic();
 }

 private scheduleMusic(){
  const c=this.context,bus=this.musicBus,theme=this.musicTheme;
  if(!c||!bus||!theme||c.state!=='running')return;
  const config=MUSIC_THEMES[theme],stepDuration=60/config.bpm/2;
  let guard=0;
  while(this.nextMusicTime<c.currentTime+.30&&guard++<24){
   const step=this.musicStep%32,bar=Math.floor(step/(theme==='finale'?16:8)),chord=config.chords[bar%config.chords.length]??config.chords[0]??[];
   if(theme==='finale'){
    if(step%16===0)this.musicOrganChord(bus,chord,this.nextMusicTime,stepDuration*15.8);
    if(step%4===0&&chord[0]!==undefined)this.musicNote(bus,chord[0]-12,this.nextMusicTime,stepDuration*3.6,'sine',config.bassVolume);
    const piano=config.melody[step%16];
    if(piano!==null&&piano!==undefined)this.musicPianoNote(bus,piano,this.nextMusicTime,stepDuration*2.6,config.leadVolume);
    if(step%8===4&&chord[2]!==undefined)this.musicNote(bus,chord[2]+12,this.nextMusicTime,stepDuration*3.4,'triangle',.025);
   }else{
    if(step%8===0)for(const note of chord)this.musicNote(bus,note,this.nextMusicTime,stepDuration*7.5,config.padWave,config.padVolume);
    if(step%4===0&&chord[0]!==undefined)this.musicNote(bus,chord[0]-12,this.nextMusicTime,stepDuration*3.5,'triangle',config.bassVolume);
    const melody=config.melody[step%16];
    if(melody!==null&&melody!==undefined)this.musicNote(bus,melody,this.nextMusicTime,stepDuration*1.8,config.leadWave,config.leadVolume);
   }
   if(theme==='battle'){
    if(step%8===0||step%8===4)this.musicKick(this.nextMusicTime);
    else if(step%8===2||step%8===6)this.musicNoise(this.nextMusicTime,.13,.075,850);
    if(step%2===0)this.musicNoise(this.nextMusicTime,.045,.025,6200);
   }
   this.nextMusicTime+=stepDuration;this.musicStep++;
  }
 }

 private chooseTheme(s:S,playing:boolean):MusicTheme|null{
  if(!playing||s.phase==='awka')return null;
  if(s.phase==='spaceship'){
   if(['awakening','verdict','catEntry','eyeCharge','rescue','rise','labFree','door'].includes(s.ship.stage))return 'lab';
   if(s.ship.stage==='combat'||s.ship.stage==='overload')return 'battle';
   if(s.ship.stage==='emergency')return 'aftermath';
   if(['crossRise','crossFree','contemplate','end'].includes(s.ship.stage))return 'finale';
   // Los sonidos del laboratorio y del resto de la nave no se modifican.
   return null;
  }
  if(s.phase==='walk')return 'night';
  if(['descend','beam','rise','draw'].includes(s.phase))return 'horror';
  if(s.phase==='fight')return 'battle';
  if(['crash','arrive','reunion','alien','speech','attack','jets','fade','aftermath'].includes(s.phase))return 'aftermath';
  if(s.phase==='bedroom'){
   if(['forestFade','forestRun','deer','burned','ship','beam','lift','vanished'].includes(s.chapter.stage))return 'forest';
   if(['light','wakeChoice','waking','missing','search','exit'].includes(s.chapter.stage))return 'horror';
   return 'bedroom';
  }
  return null;
 }

 private updateSceneSounds(s:S){
  if(s.phase!==this.lastPhase){
   if(s.phase==='descend'){this.tone(72,1.7,'sine',48,.28);this.tone(410,.8,'triangle',180,.09);}
   else if(s.phase==='beam'){this.noise(.9,.18,1500,180);this.tone(260,.9,'sawtooth',75,.18);this.tone(880,.16,'sine',650,.08);}
   else if(s.phase==='rise'){this.tone(180,.85,'sawtooth',720,.18);}
   else if(s.phase==='draw'){this.tone(760,.045,'square',260,.18);this.tone(115,.11,'triangle',70,.18);}
   else if(s.phase==='fight'){this.tone(95,.35,'sine',48,.2);}
   else if(s.phase==='boom'){this.noise(.8,.28,900,70);this.tone(72,.95,'sawtooth',25,.38);}
   else if(s.phase==='crash'){
    // Impacto pesado contra la ladera: golpe metálico, tierra y vibración grave.
    this.noise(1.35,.38,1100,48);this.tone(58,1.75,'sawtooth',24,.50);
    this.tone(230,.62,'square',38,.18);this.noise(.48,.16,2800,210);
   }
   else if(s.phase==='jets'){this.noise(1.35,.25,2600,260);this.tone(780,1.1,'sawtooth',95,.16);}
   else if(s.phase==='aftermath'){
    this.tone(92,.7,'sine',62,.13);
    if(s.chapter.stage==='truck'){
     // Motor diésel del camión entrando y frenando junto a la nave.
     this.noise(1.9,.24,420,55);this.tone(66,1.8,'sawtooth',152,.24);
     this.tone(148,1.15,'sawtooth',82,.13);this.noise(.3,.10,1650,380);
    }
   }
   this.lastPhase=s.phase;
  }

  // Doppler de cada avión al cruzar el encuadre a gran velocidad.
  if(s.phase==='jets'){
   const now=this.context?.currentTime??0;
   for(let i=0;i<s.jets.length;i++){
    const jet=s.jets[i];if(!jet)continue;
    const screenX=jet.x-s.cam,previous=this.lastJetScreenX[i]??Number.NaN;
    if(Number.isFinite(previous)&&previous<190&&screenX>=190&&now>=this.nextJetWhoosh){
     this.noise(.72,.22,3200,160);this.tone(190,.72,'sawtooth',58,.17);
     this.tone(920,.38,'sine',280,.055);this.nextJetWhoosh=now+.48;
    }
    this.lastJetScreenX[i]=screenX;
   }
  }else{this.lastJetScreenX=[Number.NaN,Number.NaN];}

  if(s.phase==='awka'&&s.intro.stage!==this.lastIntroStage){
   if(s.intro.stage==='drinking'){
    // Choque corto del vaso y dos notas suaves de trago.
    this.tone(1050,.075,'sine',720,.2);this.tone(170,.3,'sine',92,.24);this.tone(430,.16,'triangle',285,.09);
   }else if(s.intro.stage==='smoking'){
    this.tone(1450,.035,'square',950,.08);this.noise(.22,.045,1500,500);
   }else if(s.intro.stage==='depart'){this.tone(220,.2,'triangle',115,.11);}
   this.lastIntroStage=s.intro.stage;
  }else if(s.phase!=='awka'){this.lastIntroStage=s.intro.stage;}

  if((s.phase==='bedroom'||s.phase==='aftermath')&&s.chapter.stage!==this.lastChapterStage){
   const stage=s.chapter.stage;
   if(stage==='meal'){this.tone(420,.08,'triangle',260,.08);this.tone(310,.11,'sine',220,.07);}
   else if(stage==='quiet'){this.tone(260,.8,'sine',180,.09);}
   else if(stage==='light'){this.tone(520,.7,'sine',1040,.10);}
   else if(stage==='waking'){this.tone(180,.45,'triangle',260,.08);}
   else if(stage==='missing'){this.tone(390,.5,'sine',240,.13);}
   else if(stage==='forestRun'){this.noise(1.8,.16,850,180);}
   else if(stage==='deer'){this.tone(190,.9,'sawtooth',38,.22);this.noise(.4,.11,650,110);}
   else if(stage==='burned'){this.tone(66,1.3,'sine',42,.2);}
   else if(stage==='ship'){this.tone(58,2.1,'sawtooth',42,.2);this.tone(430,1.4,'sine',160,.08);}
   else if(stage==='beam'){this.noise(.85,.17,1800,160);this.tone(300,.7,'sawtooth',82,.16);}
   else if(stage==='lift'){this.tone(150,1.1,'sawtooth',620,.18);}
   this.lastChapterStage=stage;
  }else if(s.phase!=='bedroom'&&s.phase!=='aftermath'){this.lastChapterStage=s.chapter.stage;}

  if(s.phase==='fight'){
   const now=this.context?.currentTime??0;
   if(s.fire&&s.p.roll===0&&now>=this.nextMainShot){
    this.tone(460,.055,'square',125,.2);this.tone(96,.12,'sine',38,.22);this.nextMainShot=now+.22;
   }
   if(s.lasers.length>this.lastLaserCount)this.tone(1180,.13,'sawtooth',260,.09);
   this.lastLaserCount=s.lasers.length;
  }else{this.lastLaserCount=0;this.nextMainShot=0;}
 }

 update(s:S,playing:boolean){
  const active=awkaMusicActive(s,playing);
  if(active!==this.musicActive){
   this.musicActive=active;
   if(active){if(this.music)void this.music.play().catch(()=>{this.musicActive=false;});}
   else if(this.music){this.music.pause();this.music.currentTime=0;}
  }
  const a=s.ship;
  if(!playing){
   a.sounds=[];
   this.forestTrack?.pause();this.rainTrack?.pause();this.gamePaused=true;
   this.setMusic(null);
   this.lastPhase=s.phase;this.lastIntroStage=s.intro.stage;this.lastChapterStage=s.chapter.stage;
   return;
  }

  if(this.gamePaused){
   this.gamePaused=false;
   if(this.forestMusicStarted&&this.forestTrack?.paused)void this.forestTrack.play().catch(()=>{});
  }
  // La banda sonora del bosque comienza al salir de la habitación y permanece activa hasta el final.
  if(!this.forestMusicStarted&&s.phase==='bedroom'&&s.chapter.stage==='exit'){
   this.forestMusicStarted=true;
   if(this.forestTrack){this.forestTrack.currentTime=0;void this.forestTrack.play().catch(()=>{});}
  }
  const rainInForest=this.forestMusicStarted&&s.phase==='bedroom'&&FOREST_RAIN_STAGES.has(s.chapter.stage);
  if(rainInForest){
   this.rainActive=true;
   if(this.rainTrack?.paused)void this.rainTrack.play().catch(()=>{});
  }else if(this.rainActive){
   this.rainActive=false;
   if(this.rainTrack){this.rainTrack.pause();this.rainTrack.currentTime=0;}
  }
  this.setMusic(this.forestMusicStarted?null:this.chooseTheme(s,playing));
  this.updateSceneSounds(s);

  if(s.phase!=='spaceship'){a.sounds=[];return;}
  for(const event of a.sounds.splice(0)){
   if(event==='pistol')this.tone(380,.09,'square',60,.32);
   else if(event==='laser')this.tone(1600,.24,'sawtooth',130,.25);
   else if(event==='super'){this.tone(110,.75,'sawtooth',30,.8);this.tone(1300,.5,'triangle',50,.5);}
   else if(event==='explosion'){this.tone(65,1.3,'sawtooth',20,.8);this.tone(230,.6,'square',20,.5);}
   else if(event==='psychic')this.tone(85,.9,'triangle',780,.4);
   else if(event==='door')this.tone(170,.4,'sawtooth',45,.2);
   else if(event==='roll')this.tone(160,.22,'triangle',40,.2);
   else if(event==='break')this.tone(250,.3,'square',25,.4);
   else if(event==='corehit'){this.noise(.28,.18,1800,220);this.tone(180,.24,'sawtooth',62,.25);}
   else if(event==='pickup')this.tone(220,.5,'sine',660,.3);
   else this.tone(90,.16,'square',25,.35);
  }
  if(this.lastStage!==a.stage){this.lastStage=a.stage;this.lastPulse=0;}
  const interval=a.stage==='emergency'?.65:a.charge>0?.15:a.stage==='contemplate'||a.stage==='end'?1.4:3;
  if(s.t-this.lastPulse>interval){this.lastPulse=s.t;
   if(a.stage==='emergency')this.tone(Math.floor(a.time*2)%2?740:490,.55,'sine',440,.42);
   else if(a.charge>0)this.tone(140+640*a.charge/1.8,.2,'triangle',300+750*a.charge/1.8,.12+a.charge*.1);
   else if((a.stage==='contemplate'||a.stage==='end')&&this.musicTheme!=='finale'){
    const notes=[146.83,174.61,196,220,196,174.61,164.81,146.83];
    const n=notes[Math.floor(a.time/1.4)%notes.length]??146.83;
    this.tone(n,2.15,'sine',n*.998,.18);this.tone(n*2,2.35,'sine',n*2,.075);
   }
   else if(!['impact','crossFree','crossRise'].includes(a.stage)&&this.musicTheme!=='finale')this.tone(48,2.8,'sine',52,.08);
  }
 }

 close(){
  this.music?.pause();this.music=null;this.musicActive=false;
  this.forestTrack?.pause();this.forestTrack=null;
  this.rainTrack?.pause();this.rainTrack=null;
  this.forestMusicStarted=false;this.rainActive=false;this.gamePaused=false;
  this.stopMusic();
  for(const oscillator of this.musicNodes){try{oscillator.stop();}catch{/* Ya estaba detenido. */}}
  this.musicNodes.clear();
  void this.context?.close();this.context=null;this.master=null;
 }
}
