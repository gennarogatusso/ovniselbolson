import type { S } from './game-engine';
import ambience from '@/assets/awka-ambience.mp3.asset.json';
export const AWKA_VOLUME = .30;
export function awkaMusicActive(s:S,playing:boolean){return playing&&s.phase==='awka'&&s.intro.stage!=='depart'&&s.intro.stage!=='done';}

// Browser-only, gesture-unlocked synthesis: no remote audio or credentials.
export class GameAudio {
 private context: AudioContext | null = null;
 private master: GainNode | null = null;
 private lastStage = '';
 private lastPulse = 0;
 private music: HTMLAudioElement | null = null;
 private musicActive = false;
 unlock() {
  this.context ??= new AudioContext();
  if (!this.master) { this.master = this.context.createGain(); this.master.gain.value = .12; this.master.connect(this.context.destination); }
  void this.context.resume();
  this.music ??= new Audio(ambience.url);
  this.music.volume=AWKA_VOLUME;this.music.loop=true;
 }
 private tone(frequency: number, duration: number, type: OscillatorType = 'sine', end = frequency, volume = .35) {
  const c=this.context,m=this.master;if(!c||!m||c.state!=='running')return;
  const o=c.createOscillator(),g=c.createGain(),t=c.currentTime;o.type=type;o.frequency.setValueAtTime(frequency,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,end),t+duration);
  g.gain.setValueAtTime(volume,t);g.gain.exponentialRampToValueAtTime(.001,t+duration);o.connect(g);g.connect(m);o.start(t);o.stop(t+duration);
 }
 update(s:S,playing:boolean) {
  const active=awkaMusicActive(s,playing);
  if(active!==this.musicActive){this.musicActive=active;if(active){if(this.music)void this.music.play().catch(()=>{this.musicActive=false;});}else if(this.music){this.music.pause();this.music.currentTime=0;}}
  const a=s.ship;if(!playing||s.phase!=='spaceship'){a.sounds=[];return;}
  for(const event of a.sounds.splice(0)){
   if(event==='pistol')this.tone(380,.09,'square',60,.32);
   else if(event==='laser')this.tone(1600,.24,'sawtooth',130,.25);
   else if(event==='super'){this.tone(110,.75,'sawtooth',30,.8);this.tone(1300,.5,'triangle',50,.5);}
   else if(event==='explosion'){this.tone(65,1.3,'sawtooth',20,.8);this.tone(230,.6,'square',20,.5);}
   else if(event==='psychic')this.tone(85,.9,'triangle',780,.4);
   else if(event==='door')this.tone(170,.4,'sawtooth',45,.2);
   else if(event==='roll')this.tone(160,.22,'triangle',40,.2);
   else if(event==='break')this.tone(250,.3,'square',25,.4);
   else if(event==='pickup')this.tone(220,.5,'sine',660,.3);
   else this.tone(90,.16,'square',25,.35);
  }
  if(this.lastStage!==a.stage){this.lastStage=a.stage;this.lastPulse=0;}
  const interval=a.stage==='emergency'?.65:a.charge>0?.15:a.stage==='contemplate'||a.stage==='end'?1.4:3;
  if(s.t-this.lastPulse>interval){this.lastPulse=s.t;
   if(a.stage==='emergency')this.tone(Math.floor(a.time*2)%2?740:490,.55,'sine',440,.42);
   else if(a.charge>0)this.tone(140+640*a.charge/1.8,.2,'triangle',300+750*a.charge/1.8,.12+a.charge*.1);
   else if(a.stage==='contemplate'||a.stage==='end'){const notes=[196,247,294,370];const n=notes[Math.floor(a.time/1.4)%4]??196;this.tone(n,2,'sine',n,.18);this.tone(n*1.5,2.2,'sine',n*1.5,.1);}
   else if(!['impact','crossFree','crossRise'].includes(a.stage))this.tone(48,2.8,'sine',52,.08);
  }
 }
 close(){this.music?.pause();this.music=null;this.musicActive=false;void this.context?.close();this.context=null;this.master=null;}
}