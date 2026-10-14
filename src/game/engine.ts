import {
  COLS, COOP, DIR_VEC, EXTRA_LIFE_AT, FRUIT_LIFETIME, FRUIT_THRESHOLDS, MODE_SCHEDULE,
  POINTS, ELROY1, ELROY2, frightTime, type Dir, type GhostKind,
} from './constants';
import { FRUIT_TILE, JAIL_RELEASE_TILE, JAIL_TILE, PAC2_START, parseMaze, T, tileAt, passableBullet, type MazeData } from './map';
import { Pac } from './pac';
import { Ghost, type GhostHost } from './ghost';

export type GameState = 'menu' | 'ready' | 'playing' | 'dying' | 'levelclear' | 'gameover' | 'paused';
export type TacticalItem = 'gun' | 'ice' | 'soap';
export type ProjectileType = TacticalItem;
export interface Bullet { x:number; y:number; dx:number; dy:number; from:'pac'|'ghost'; owner?:number; type?:ProjectileType; travelled?:number; }
export interface WorldItem { x:number; y:number; kind:TacticalItem | 'invisibility'; t:number; }
export const FRUITS = [{kind:'cherry',points:POINTS.cherry},{kind:'key',points:POINTS.key}] as const;
export interface GameEvents {
  onState?(s:GameState,prev:GameState):void; onScore?(score:number,record:number):void; onLives?(n:number):void;
  onLevel?(n:number):void; onApples?(eaten:number,total:number,power:number,powerTotal:number):void;
  onFright?(active:boolean,remaining:number,total:number):void; onCombo?(mult:number):void;
  onSecrets?(found:number,total:number):void; onCollectibles?(n:number,total:number):void;
  onFruit?(active:boolean,idx:number,remaining:number):void; onGhostEaten?(kind:GhostKind,points:number,x:number,y:number):void;
  onAppleEaten?(x:number,y:number,power:boolean):void; onSecretFound?(id:number,x:number,y:number):void;
  onFruitEaten?(idx:number,points:number,x:number,y:number):void; onDeath?(x:number,y:number):void;
  onLevelClear?(level:number):void; onExtraLife?():void; onNote?(note:string):void;
  onWeaponPickup?(who:'pac'|'ghost',x:number,y:number):void; onShoot?(x:number,y:number,from:'pac'|'ghost'):void; onBulletGone?(x:number,y:number):void;
  onRescue?(player:number,method:'key'|'ghosts'):void;
}
const RECORD_KEY='pacman26.record';

/** Simulación determinista de las reglas. Canvas, HUD y audio sólo consumen sus eventos. */
export class Game implements GhostHost {
  state:GameState='menu'; prevState:GameState='menu'; level=1; score=0; record=0; lives=COOP.lives;
  maze:MazeData=parseMaze(); apples:Uint8Array=this.maze.baseApples.slice(); applesEaten=0; powerEaten=0;
  pac=new Pac(); pac2=new Pac(); pacs:Pac[]=[this.pac,this.pac2];
  ghosts:Ghost[]=[new Ghost('blinky'),new Ghost('pinky'),new Ghost('inky'),new Ghost('clyde')];
  mode:'scatter'|'chase'='scatter'; modeIdx=0; modeT=0; fright=0; frightDur=1; combo=0; levelTime=0; stateT=0;
  fruitSpawned=[false,false]; fruitActive=false; fruitIdx=0; fruitT=0; secretsFound=new Set<number>(); collectibles=0; nextExtra=EXTRA_LIFE_AT;
  /** Compatibilidad visual con la pistola original; el inventario real está por personaje. */
  pill: {x:number;y:number;t:number}|null=null; pillTimer:number=COOP.itemSpawnInterval; bullets:Bullet[]=[]; pacArmed=false; armedGhost:Ghost|null=null; ghostAimT=0;
  items:WorldItem[]=[]; rescueKey:{x:number;y:number}|null=null; rescueCycle:Set<GhostKind>|null=null; rescuePowerTimer=0;
  events:GameEvents={}; pausedFrom:GameState='playing'; private simTime=0; private lifeLossPending=false;

  constructor(){
    this.pac.player=1; this.pac2.player=2;
    try { this.record=Number(localStorage.getItem(RECORD_KEY))||0; } catch { this.record=0; }
    this.resetLevel(true);
  }
  get applesLeft(){ return this.maze.totalApples+this.maze.totalPower-this.applesEaten-this.powerEaten; }
  isInvisible(p: Pac | Ghost){ return p.invisibleUntil > this.simTime; }
  get elroy(){ return this.applesLeft<=ELROY2?2:this.applesLeft<=ELROY1?1:0; }
  get pacTile(){ return this.pac.tile(); } get pacFacing():Dir{return this.pac.facing;} get blinkyTile(){return this.ghosts[0].tile();} get levelSpeed(){return 1;} random(){return Math.random();}
  private setState(s:GameState){ const prev=this.state; this.prevState=prev; this.state=s; this.stateT=0; this.events.onState?.(s,prev); }
  setStatePublic(s:GameState){this.setState(s);}
  startGame(){ this.level=1;this.score=0;this.lives=COOP.lives;this.collectibles=0;this.nextExtra=EXTRA_LIFE_AT;this.resetLevel(true);this.events.onScore?.(this.score,this.record);this.events.onLives?.(this.lives);this.events.onLevel?.(this.level);this.setState('ready'); }
  resetLevel(full:boolean){ if(full){this.apples=this.maze.baseApples.slice();this.applesEaten=0;this.powerEaten=0;this.secretsFound.clear();this.fruitSpawned=[false,false];this.events.onSecrets?.(0,this.maze.secretCount);this.events.onApples?.(0,this.maze.totalApples,0,this.maze.totalPower);} this.resetPositions(); }
  resetPositions(){
    this.pac.reset(); this.pac2.reset(); this.pac2.x=PAC2_START.x;this.pac2.y=PAC2_START.y;this.pac2.dir='right';this.pac2.facing='right';
    for(const g of this.ghosts)g.resetForLife(); this.fright=0;this.combo=0;this.modeIdx=0;this.modeT=0;this.mode=MODE_SCHEDULE[0].mode;this.levelTime=0;this.fruitActive=false;this.bullets=[];this.items=[];this.pill=null;this.rescueKey=null;this.rescueCycle=null;this.lifeLossPending=false;this.pacArmed=false;this.armedGhost=null;this.events.onFright?.(false,0,1);this.events.onCombo?.(1);this.events.onFruit?.(false,0,0);
  }
  togglePause(){if(this.state==='paused'){this.state=this.pausedFrom;this.events.onState?.(this.state,'paused');}else if(this.state==='playing'||this.state==='ready'){this.pausedFrom=this.state;this.setState('paused');}}
  update(dt:number){ if(this.state==='ready'){if((this.stateT+=dt)>=2)this.setState('playing');return;} if(this.state==='dying'){if((this.stateT+=dt)>=1)this.resolveLifeLoss();return;} if(this.state==='levelclear'){if((this.stateT+=dt)>=2.8){this.level++;this.events.onLevel?.(this.level);this.resetLevel(true);this.setState('ready');}return;} if(this.state==='playing')this.updatePlaying(dt); }
  private updatePlaying(dt:number){
    this.simTime+=dt;this.levelTime+=dt;this.updateTimedStates();
    if(this.fright>0){this.fright=Math.max(0,this.fright-dt);this.events.onFright?.(this.fright>0,this.fright,this.frightDur);if(!this.fright){for(const g of this.ghosts)g.endFright();this.combo=0;}}
    else {this.modeT+=dt;while(this.modeIdx<MODE_SCHEDULE.length-1&&this.modeT>=MODE_SCHEDULE[this.modeIdx].t){this.modeT-=MODE_SCHEDULE[this.modeIdx++].t;this.mode=MODE_SCHEDULE[this.modeIdx].mode;for(const g of this.ghosts)g.reverse();}}
    for(const p of this.pacs){p.update(dt,this.maze,this.level,p.powerUntil>this.simTime);this.eatAtPac(p);}
    for(const g of this.ghosts)g.update(dt,this);
    this.updateProjectiles(dt); this.collectItems(dt); this.checkContacts(); this.resolveKeyDoor(); this.evaluateRescueResources(dt); this.evaluateBothJailed();
    if(this.state!=='playing')return;
    this.updateFruit(dt); this.spawnItems(dt);
    if(this.applesLeft===0&&this.pacs.every(p=>p.condition==='active')){this.setState('levelclear');this.events.onLevelClear?.(this.level);}
  }
  private updateTimedStates(){
    for(const p of this.pacs){if(p.condition!=='jailed'&&p.conditionUntil>0&&this.simTime>=p.conditionUntil){p.condition='active';p.conditionUntil=0;p.immuneUntil=this.simTime+COOP.immobilizeImmunity;}}
    for(const g of this.ghosts){if(g.condition!=='active'&&g.conditionUntil>0&&this.simTime>=g.conditionUntil){g.condition='active';g.conditionUntil=0;g.immuneUntil=this.simTime+COOP.immobilizeImmunity;}}
  }
  private eatAtPac(p:Pac){if(p.condition!=='active')return;const t=p.tile();if(t.x<0||t.x>=COLS)return;const i=t.y*COLS+t.x,a=this.apples[i];if(!a)return;this.apples[i]=0;if(a===1){this.applesEaten++;this.addScore(POINTS.apple);this.events.onAppleEaten?.(t.x,t.y,false);}else{this.powerEaten++;this.addScore(POINTS.power);p.powerUntil=this.simTime+COOP.powerDuration;this.startFright();this.events.onAppleEaten?.(t.x,t.y,true);}this.events.onApples?.(this.applesEaten,this.maze.totalApples,this.powerEaten,this.maze.totalPower);if(this.maze.tiles[i]===T.Secret){const id=this.maze.secretTiles.get(i)!;if(!this.secretsFound.has(id)){this.secretsFound.add(id);this.addScore(POINTS.secret);this.events.onSecretFound?.(id,t.x,t.y);this.events.onSecrets?.(this.secretsFound.size,this.maze.secretCount);}}}
  private startFright(){const t=frightTime(this.level);if(t<=0)return;this.fright=t;this.frightDur=t;this.combo=0;for(const g of this.ghosts)g.startFright();}
  /** Usa F para J1 y Enter para J2. Un proyectil nunca impacta al emisor. */
  firePac(player=1):boolean{const p=this.pacs[player-1];if(!p||p.condition!=='active'||this.state!=='playing')return false;if(!p.weapon&&player===1&&this.pacArmed){p.weapon='gun';p.ammo=1;}if(!p.weapon||p.ammo<=0)return false;const d=DIR_VEC[p.facing];this.bullets.push({x:p.x,y:p.y,dx:d.x,dy:d.y,from:'pac',owner:player,type:p.weapon,travelled:0});p.ammo--;if(!p.ammo)p.weapon=null;this.pacArmed=!!this.pac.weapon;this.events.onShoot?.(p.x,p.y,'pac');return true;}
  private updateProjectiles(dt:number){for(let i=this.bullets.length-1;i>=0;i--){const b=this.bullets[i];const distance=COOP.projectileSpeed*dt,steps=Math.max(1,Math.ceil(distance/.2));let gone=false;for(let s=0;s<steps&&!gone;s++){const d=distance/steps;b.x+=b.dx*d;b.y+=b.dy*d;b.travelled=(b.travelled??0)+d;if(b.x<=-.5)b.x+=COLS;else if(b.x>=COLS+.5)b.x-=COLS;if(!passableBullet(tileAt(this.maze,Math.floor(b.x),Math.floor(b.y)))||(b.travelled??0)>=COOP.projectileRange){gone=true;break;}if(b.from==='pac')gone=this.hitProjectilePac(b);else gone=this.hitProjectileGhost(b);}if(gone){this.bullets.splice(i,1);this.events.onBulletGone?.(b.x,b.y);}}}
  private hitProjectilePac(b:Bullet){
    if(b.type==='soap') for(let i=0;i<this.pacs.length;i++){
      if(i+1===b.owner)continue;
      const p=this.pacs[i];
      if(p.condition==='active'&&Math.hypot(p.x-b.x,p.y-b.y)<.6){this.applyHit(p,'soap');return true;}
    }
    for(const g of this.ghosts){if(!g.isDeadly()||g.condition!=='active'||Math.hypot(g.x-b.x,g.y-b.y)>=.6)continue;this.applyHit(g,b.type??'gun');return true;}return false;
  }
  private hitProjectileGhost(b:Bullet){for(let i=0;i<this.pacs.length;i++){if(i+1===b.owner)continue;const p=this.pacs[i];if(p.condition!=='active'||Math.hypot(p.x-b.x,p.y-b.y)>=.6)continue;this.applyHit(p,b.type??'gun');return true;}return false;}
  private applyHit(target:Pac|Ghost,type:ProjectileType){if(target.immuneUntil>this.simTime)return;const duration=type==='ice'?COOP.iceDuration:type==='soap'?COOP.bubbleDuration:COOP.bulletStunDuration;target.condition=type==='ice'?'frozen':type==='soap'?'bubbled':'stunned';target.conditionUntil=this.simTime+duration;}
  private checkContacts(){for(const p of this.pacs){if(p.condition!=='active'||p.immuneUntil>this.simTime)continue;for(const g of this.ghosts){if(!g.isDeadly()||g.condition!=='active'||Math.hypot(g.x-p.x,g.y-p.y)>=.75)continue;if(g.frightFlag&&(p.powerUntil>this.simTime||this.fright>0)){this.eatGhost(g);continue;}this.capture(p);break;}}}
  private capture(p:Pac){p.condition='jailed';p.conditionUntil=0;p.weapon=null;p.ammo=0;p.invisibleUntil=0;p.powerUntil=0;p.hasKey=false;p.x=JAIL_TILE.x;p.y=JAIL_TILE.y;p.dir=null;this.events.onDeath?.(p.x,p.y);if(!this.rescueCycle){this.rescueCycle=new Set(this.ghosts.map(g=>g.kind));this.spawnRescueKey();}}
  private eatGhost(g:Ghost){const pts=POINTS.ghost[Math.min(this.combo,POINTS.ghost.length-1)];this.combo++;this.addScore(pts);if(this.armedGhost===g)this.armedGhost=null;g.eaten();this.rescueCycle?.delete(g.kind);this.events.onGhostEaten?.(g.kind,pts,g.x,g.y);if(this.rescueCycle&&this.rescueCycle.size===0)this.releasePrisoner('ghosts');}
  private collectItems(dt:number){for(let i=this.items.length-1;i>=0;i--){const item=this.items[i];item.t-=dt;if(item.t<=0){this.items.splice(i,1);continue;}for(const p of this.pacs){if(p.condition!=='active'||p.tile().x!==item.x||p.tile().y!==item.y)continue;if(item.kind==='invisibility')p.invisibleUntil=Math.max(p.invisibleUntil,this.simTime+COOP.invisibilityDuration);else{p.weapon=item.kind;p.ammo=COOP.ammo;this.pacArmed=!!this.pac.weapon;this.events.onWeaponPickup?.('pac',item.x,item.y);}this.items.splice(i,1);break;}}
    const key=this.rescueKey;
    if(key)for(const p of this.pacs){if(p.condition==='active'&&p.tile().x===key.x&&p.tile().y===key.y){p.hasKey=true;this.rescueKey=null;}}
  }
  private spawnItems(dt:number){this.pillTimer-=dt;if(this.pillTimer>0||this.items.length||this.pill)return;const cells=this.itemCells();if(!cells.length)return;const cell=cells[Math.floor(this.random()*cells.length)],k:(TacticalItem|'invisibility')[]=['gun','ice','soap','invisibility'];this.items.push({x:cell%COLS,y:(cell/COLS)|0,kind:k[Math.floor(this.random()*k.length)],t:12});this.pill={x:cell%COLS,y:(cell/COLS)|0,t:12};this.pillTimer=COOP.itemSpawnInterval;}
  private itemCells(){const r:number[]=[];for(let i=0;i<this.maze.tiles.length;i++)if(this.maze.tiles[i]===T.Path&&i!==FRUIT_TILE.y*COLS+FRUIT_TILE.x)r.push(i);return r;}
  private spawnRescueKey(){const jailed=this.pacs.filter(p=>p.condition==='jailed');const free=this.pacs.find(p=>p.condition==='active');if(!jailed.length||!free)return;const cells=this.itemCells().filter(i=>{const x=i%COLS,y=(i/COLS)|0;return Math.hypot(x+.5-free.x,y+.5-free.y)>4&&Math.hypot(x+.5-JAIL_RELEASE_TILE.x,y+.5-JAIL_RELEASE_TILE.y)>2;});const i=(cells.length?cells:this.itemCells())[0];if(i!==undefined)this.rescueKey={x:i%COLS,y:(i/COLS)|0};}
  private resolveKeyDoor(){if(!this.pacs.some(p=>p.condition==='jailed'))return;for(const p of this.pacs)if(p.hasKey&&Math.hypot(p.x-JAIL_RELEASE_TILE.x,p.y-JAIL_RELEASE_TILE.y)<1.1){p.hasKey=false;this.releasePrisoner('key');return;}}
  private releasePrisoner(method:'key'|'ghosts'){for(const p of this.pacs)if(p.condition==='jailed'){p.condition='active';p.x=JAIL_RELEASE_TILE.x;p.y=JAIL_RELEASE_TILE.y;p.dir='left';p.immuneUntil=this.simTime+COOP.releaseProtection;this.events.onRescue?.(p.player,method);}this.rescueKey=null;this.rescueCycle=null;}
  private evaluateRescueResources(dt:number){if(!this.rescueCycle)return;if(!this.pacs.some(p=>p.condition==='active'))return;const powers=this.apples.reduce((n,v)=>n+(v===2?1:0),0);if(powers===0){this.rescuePowerTimer-=dt;if(this.rescuePowerTimer<=0){const cell=this.itemCells()[0];if(cell!==undefined){this.apples[cell]=2;this.rescuePowerTimer=8;}}}}
  private evaluateBothJailed(){if(this.pacs.every(p=>p.condition==='jailed')&&!this.lifeLossPending){this.lifeLossPending=true;this.setState('dying');}}
  private resolveLifeLoss(){if(!this.lifeLossPending)return;this.lifeLossPending=false;this.lives--;this.events.onLives?.(this.lives);if(this.lives<=0){this.setState('gameover');return;}this.resetPositions();this.setState('ready');}
  private updateFruit(dt:number){for(let i=0;i<FRUIT_THRESHOLDS.length;i++)if(!this.fruitSpawned[i]&&this.applesEaten>=FRUIT_THRESHOLDS[i]){this.fruitSpawned[i]=true;this.fruitActive=true;this.fruitIdx=i;this.fruitT=FRUIT_LIFETIME;}if(!this.fruitActive)return;this.fruitT-=dt;if(this.fruitT<=0){this.fruitActive=false;return;}for(const p of this.pacs)if(p.condition==='active'&&p.tile().x===FRUIT_TILE.x&&p.tile().y===FRUIT_TILE.y){this.fruitActive=false;this.collectibles++;const pts=FRUITS[this.fruitIdx].points;this.addScore(pts);this.events.onFruitEaten?.(this.fruitIdx,pts,FRUIT_TILE.x,FRUIT_TILE.y);}}
  private addScore(pts:number){this.score+=pts;if(this.score>=this.nextExtra){this.nextExtra+=EXTRA_LIFE_AT;this.lives++;this.events.onExtraLife?.();this.events.onLives?.(this.lives);}if(this.score>this.record){this.record=this.score;try{localStorage.setItem(RECORD_KEY,String(this.record));}catch{console.warn('No se pudo guardar el récord');}}this.events.onScore?.(this.score,this.record);}
}
