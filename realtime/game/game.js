/* Moon Walk × Pokémon — a little Game Boy world that comes alive with how you walk.
 *
 * Each connected walker (a Moon Walk device, or the demo sim) is a Pokémon buddy living
 * in Pallet Town. Their real movement → a Moon Walk Score (0–100) → the buddy's mood and
 * how lively it wanders the world. An opt-in Training Mode lets the buddy "speak" gentle,
 * claim-safe coaching cues in a classic Pokémon dialogue box.
 *
 * Claim safety (ADR-0005): wellness/encouragement only — relative to the user's own
 * movement, never a population norm. Moods are encouragement, not a health rating.
 * Coaching is opt-in (ADR-0006). Transport is the local hub WebSocket with an in-browser
 * simulated fallback (ADR-0007).
 */

// ============ buddies (recolored DMG-green front sprites) ============
const POKEMON = [
  {id:'pikachu',   name:'Pikachu'},   {id:'bulbasaur', name:'Bulbasaur'},
  {id:'charmander',name:'Charmander'},{id:'squirtle',  name:'Squirtle'},
  {id:'jigglypuff',name:'Jigglypuff'},{id:'meowth',    name:'Meowth'},
  {id:'psyduck',   name:'Psyduck'},   {id:'eevee',      name:'Eevee'},
  {id:'mew',       name:'Mew'},       {id:'gengar',     name:'Gengar'},
  {id:'charizard', name:'Charizard'}, {id:'snorlax',    name:'Snorlax'},
];
const POKE_BY = {}; POKEMON.forEach(p => POKE_BY[p.id] = p);

// ============ score → mood (reused from the dashboard; 5 always-positive moods) ============
const MOODS = [
  {key:'asleep',  min:0,  label:'Asleep',     emote:null,
   msg:n=>`${n} is fast asleep 💤  A gentle walk will wake it up.`},
  {key:'sad',     min:14, label:'Sleepy',     emote:'question',
   msg:n=>`${n} is a little sleepy. A few steps will cheer it right up!`},
  {key:'okay',    min:35, label:'Warming up', emote:null,
   msg:n=>`${n} is warming up — you're doing great. Keep going!`},
  {key:'happy',   min:60, label:'Happy',      emote:'happy',
   msg:n=>`${n} is happy! You're moving wonderfully today.`},
  {key:'thrilled',min:80, label:'Thrilled!',  emote:'happy',
   msg:n=>`${n} is thrilled! 🎉 Amazing walking — you made its day!`},
];
function moodFor(score){ let m = MOODS[0]; for (const x of MOODS) if (score >= x.min) m = x; return m; }
const HAPPY_AT = 60; // the gentle goal that makes a buddy happy

// ============ walker data model ============
const WAVE_N = 300, CAD_WIN = 30000;
const walkers = {};   // id -> {wave, cad, cadence, cycles, _score, _parts, poke}
const order = [];
const clamp = x => Math.max(0, Math.min(100, x));
let focusId = null;   // which walker the dialogue box is currently "voicing"

function ensure(id){
  if (!walkers[id]){
    const saved = localStorage.getItem('mw-buddy-' + id);
    const poke = POKE_BY[saved] ? saved : POKEMON[order.length % POKEMON.length].id;
    walkers[id] = {wave:[], cad:[], cadence:0, cycles:0, _score:0,
                   _parts:{rhythm:0,cadence:0,endurance:0,activity:0,swing:0}, poke};
    order.push(id);
    if (focusId === null) focusId = id;
    if (scene && scene.spawnBuddy) scene.spawnBuddy(id);
    if (window.onRosterChange) window.onRosterChange();
  }
  return walkers[id];
}

// Moon Walk Score (0–100) — same blend as the dashboard, now keeping its component parts
// so Training Mode can point at the one thing most worth nudging.
function computeScore(w){
  const cv0 = w.cad.map(p => p[1]).filter(x => x > 0);
  const m  = cv0.length ? cv0.reduce((a,b)=>a+b,0)/cv0.length : 0;
  const sd = cv0.length ? Math.sqrt(cv0.reduce((a,b)=>a+(b-m)*(b-m),0)/cv0.length) : 0;
  const cv = m ? sd/m : 0;
  let mn=1e9, mx=-1e9, moving=0; const wv = w.wave;
  wv.forEach(v=>{ if(v<mn)mn=v; if(v>mx)mx=v; if(Math.abs(v)>40)moving++; });
  const swingAmp = wv.length ? (mx-mn)/2 : 0, mf = wv.length ? moving/wv.length : 0;
  const parts = {
    cadence:   clamp((m-30)/35*100),
    rhythm:    clamp(100 - cv*700),
    endurance: clamp(w.cycles/40*100),
    activity:  clamp(mf*140),
    swing:     clamp(swingAmp/160*100),
  };
  w._parts = parts;
  w._score = Math.round(clamp(
    0.30*parts.rhythm + 0.20*parts.cadence + 0.20*parts.endurance +
    0.15*parts.activity + 0.15*parts.swing));
}

// ============ Training Mode coaching cues (opt-in, claim-safe encouragement) ============
const CUES = {
  rhythm:    n => `Try to keep an even, steady pace — nice and smooth, like a song. ${n} loves a steady rhythm!`,
  cadence:   n => `A few quicker, lighter steps will get ${n} bouncing! Pick up the pace just a little.`,
  endurance: n => `You're warmed up — keep walking a little longer to power ${n} up!`,
  activity:  n => `Let's get moving! A bit more motion in each step really wakes ${n} up.`,
  swing:     n => `Swing your arms and legs freely — big, easy movements make ${n} so happy!`,
};
function coachLine(w){
  const name = POKE_BY[w.poke].name, s = w._score;
  if (s >= 80) return `You're walking wonderfully today — ${name} is so proud of you! 🎉`;
  // weakest component is the gentlest, most useful thing to nudge
  const weakest = Object.entries(w._parts).sort((a,b)=>a[1]-b[1])[0][0];
  const cue = CUES[weakest](name);
  if (s >= HAPPY_AT) return `${name} is happy! ${cue}`;
  return cue;
}
// What the focused buddy "says": coaching cue when Training Mode is on, gentle mood line otherwise.
function buddyLine(id){
  const w = walkers[id]; if (!w) return '';
  const name = POKE_BY[w.poke].name;
  return window.trainingMode ? `${name}: ${coachLine(w)}`
                             : `${name}: ${moodFor(w._score).msg(name)}`;
}

// ============ Phaser world ============
const TILE = 8;
let scene = null, game = null;

class World extends Phaser.Scene {
  constructor(){ super('world'); }

  preload(){
    this.load.json('map', 'assets/pallet-map.json');
    this.load.spritesheet('tiles', 'assets/overworld.png', {frameWidth:TILE, frameHeight:TILE});
    POKEMON.forEach(p => this.load.image('poke-'+p.id, 'assets/pokemon/'+p.id+'.png'));
    ['happy','question','shock'].forEach(e => this.load.image('emote-'+e, 'assets/emotes/'+e+'.png'));
  }

  create(){
    const map = this.cache.json.get('map');
    this.mapData = map;
    this.W = map.wTiles; this.H = map.hTiles;

    // build the tile world from the parsed block grid
    const tilemap = this.make.tilemap({data: map.tiles, tileWidth:TILE, tileHeight:TILE});
    const tileset = tilemap.addTilesetImage('tiles', 'tiles', TILE, TILE, 0, 0);
    tilemap.createLayer(0, tileset, 0, 0);

    // walkable tiles a buddy may stand on / wander to
    this.walkable = map.walkable;
    this.spawnTiles = [];
    for (let r=0; r<this.H; r++) for (let c=0; c<this.W; c++)
      if (this.walkable[r][c]) this.spawnTiles.push({c, r});
    Phaser.Utils.Array.Shuffle(this.spawnTiles);
    this._spawnIdx = 0;

    this.cameras.main.setBounds(0, 0, this.W*TILE, this.H*TILE);
    this.cameras.main.setBackgroundColor('#0f380f');

    this.buddies = {};
    scene = this;
    if (window.onSceneReady) window.onSceneReady();
  }

  canStand(c, r){
    return c>=0 && r>=0 && c<this.W && r<this.H && this.walkable[r][c];
  }
  occupied(c, r, exceptId){
    for (const id in this.buddies){
      if (id === exceptId) continue;
      const b = this.buddies[id];
      if (b.c === c && b.r === r) return true;
    }
    return false;
  }

  spawnBuddy(id){
    if (this.buddies[id]) return;
    // find an unoccupied walkable spawn tile
    let tile = null;
    for (let i=0; i<this.spawnTiles.length; i++){
      const t = this.spawnTiles[(this._spawnIdx + i) % this.spawnTiles.length];
      if (!this.occupied(t.c, t.r)){ tile = t; this._spawnIdx = (this._spawnIdx + i + 1) % this.spawnTiles.length; break; }
    }
    tile = tile || this.spawnTiles[0];

    const cont = this.add.container(tile.c*TILE + TILE/2, tile.r*TILE + TILE);
    cont.setDepth(10 + tile.r);

    const sprite = this.add.image(0, 0, 'poke-' + walkers[id].poke).setOrigin(0.5, 1);
    sprite.displayHeight = 22; sprite.scaleX = sprite.scaleY;          // ~3 tiles tall buddy
    const shadow = this.add.ellipse(0, 1, sprite.displayWidth*0.7, 5, 0x0f380f, 0.45);
    const emote = this.add.image(0, -sprite.displayHeight - 6, 'emote-happy').setVisible(false);
    emote.setScale(0.9);
    const zzz = this.add.text(sprite.displayWidth*0.4, -sprite.displayHeight, 'z', {
      fontFamily:'monospace', fontSize:'9px', color:'#0f380f', fontStyle:'bold'}).setVisible(false);
    const plate = this.add.text(0, 6, 'Walker ' + id, {
      fontFamily:'monospace', fontSize:'7px', color:'#0f380f',
      backgroundColor:'#9bbc0f', padding:{x:2,y:1}}).setOrigin(0.5, 0);
    const sparkA = this.add.text(-sprite.displayWidth*0.5, -sprite.displayHeight*0.7, '✨',
      {fontSize:'9px'}).setOrigin(0.5).setVisible(false);
    const sparkB = this.add.text(sprite.displayWidth*0.5, -sprite.displayHeight*0.4, '✨',
      {fontSize:'9px'}).setOrigin(0.5).setVisible(false);

    cont.add([shadow, sprite, plate, emote, zzz, sparkA, sparkB]);
    cont.setInteractive(new Phaser.Geom.Rectangle(-12, -28, 24, 34), Phaser.Geom.Rectangle.Contains);
    cont.on('pointerdown', () => { focusId = id; if (window.onFocusChange) window.onFocusChange(); });

    this.buddies[id] = {
      cont, sprite, shadow, emote, zzz, plate, sparkA, sparkB,
      c: tile.c, r: tile.r, poke: walkers[id].poke,
      moving:false, nextStepAt:0, moodKey:null, bob:0,
    };
  }

  removeBuddy(id){
    const b = this.buddies[id]; if (!b) return;
    b.cont.destroy(); delete this.buddies[id];
  }

  // pick a neighbouring walkable, unoccupied tile to wander to
  pickStep(id){
    const b = this.buddies[id];
    const dirs = Phaser.Utils.Array.Shuffle([[1,0],[-1,0],[0,1],[0,-1]]);
    for (const [dc,dr] of dirs){
      const nc = b.c+dc, nr = b.r+dr;
      if (this.canStand(nc,nr) && !this.occupied(nc,nr,id)) return {nc,nr,dc};
    }
    return null;
  }

  update(time, delta){
    for (const id in this.buddies){
      const b = this.buddies[id], w = walkers[id]; if (!w) continue;

      // keep the sprite in sync if the user changed buddy in the picker
      if (b.poke !== w.poke){
        b.sprite.setTexture('poke-' + w.poke);
        b.sprite.displayHeight = 22; b.sprite.scaleX = b.sprite.scaleY;
        b.poke = w.poke;
      }

      const score = w._score, mood = moodFor(score), cad = w.cadence || 0;

      // mood transitions: emote bubble, sleepy z's, sparkles for thrilled
      if (b.moodKey !== mood.key){
        b.moodKey = mood.key;
        if (mood.emote){ b.emote.setTexture('emote-' + mood.emote).setVisible(true); }
        else b.emote.setVisible(false);
        b.zzz.setVisible(mood.key === 'asleep');
        const thrilled = mood.key === 'thrilled';
        b.sparkA.setVisible(thrilled); b.sparkB.setVisible(thrilled);
      }

      // gentle idle breathing/bob; livelier with cadence
      b.bob += delta/1000 * (mood.key==='asleep' ? 1.2 : 2.2 + cad/30);
      if (!b.moving){
        const amp = mood.key==='asleep' ? 0.6 : 1.4;
        b.sprite.y = -Math.abs(Math.sin(b.bob)) * amp;
      }
      if (b.sparkA.visible){ b.sparkA.alpha = 0.5+0.5*Math.sin(b.bob*1.7); b.sparkB.alpha = 0.5+0.5*Math.sin(b.bob*1.7+2); }

      // wandering: faster & more frequent steps when happier and walking faster
      if (mood.key === 'asleep'){ continue; }            // naps in place
      if (!b.moving && time > b.nextStepAt){
        const step = this.pickStep(id);
        if (step){
          b.moving = true;
          if (step.dc !== 0) b.sprite.setFlipX(step.dc < 0);
          const baseDur = ({sad:560, okay:420, happy:320, thrilled:240})[mood.key] || 420;
          const dur = Math.max(180, baseDur - cad*1.4);  // live cadence speeds the stride
          const hop = ({sad:3, okay:5, happy:7, thrilled:9})[mood.key] || 5;
          b.c = step.nc; b.r = step.nr;
          b.cont.setDepth(10 + b.r);
          this.tweens.add({
            targets: b.cont, x: b.c*TILE+TILE/2, y: b.r*TILE+TILE, duration: dur, ease:'Sine.easeInOut',
            onComplete: () => { b.moving = false; },      // free the buddy to wander again
          });
          this.tweens.add({                               // the little hop arc
            targets: b.sprite, y: -hop, duration: dur/2, yoyo:true, ease:'Quad.easeOut',
            onComplete: () => { b.sprite.y = 0; },
          });
          // rest interval between steps: peppier moods (and faster walking) wander more
          const rest = ({sad:[1800,3200], okay:[900,1800], happy:[400,1000], thrilled:[200,550]})[mood.key] || [900,1800];
          b.nextStepAt = time + dur + Phaser.Math.Between(rest[0], rest[1]) * (1 - Math.min(0.5, cad/120));
        } else {
          b.nextStepAt = time + 600;                      // boxed in; try again shortly
        }
      }
    }
  }
}

// ============ transport: live hub WebSocket, with in-browser sim fallback ============
function handleMsg(m){
  if (m.type === 'sample'){ const w = ensure(m.walker); w.wave.push(m.gz); if (w.wave.length > WAVE_N) w.wave.shift(); }
  else if (m.type === 'metrics'){ const w = ensure(m.walker); w.cadence = m.cadence; w.cycles = m.cycles;
    w.cad.push([m.t, m.cadence]); const cut = m.t - CAD_WIN; while (w.cad.length && w.cad[0][0] < cut) w.cad.shift(); }
  else if (m.type === 'roster'){ (m.walkers||[]).forEach(id => ensure(id)); }
}

let simTimer = null;
function startSim(){
  if (simTimer) return;
  if (window.setState) window.setState('sim');
  const PRELOAD = CAD_WIN;
  const W = [{id:'A',amp:140,base:64,ph:0},{id:'B',amp:135,base:50,ph:1.7},{id:'C',amp:120,base:30,ph:3.1}]
    .map(w => Object.assign(w, {lastCad:w.base}));   // A thriving, B happy, C just getting going
  const cadAt = (w, sec) => w.base + 4*Math.sin(sec/7);
  handleMsg({type:'roster', walkers:W.map(w=>w.id)});
  W.forEach(w => {
    const wk = ensure(w.id);
    for (let T=0; T<=PRELOAD; T+=250) wk.cad.push([T, Math.round(cadAt(w, T/1000)*10)/10]);
    for (let i=0; i<WAVE_N; i++){
      const sec = (PRELOAD-(WAVE_N-i)*20)/1000, f = cadAt(w, sec)/60;
      wk.wave.push(Math.round((w.amp*Math.sin(2*Math.PI*f*sec + w.ph) + (Math.random()*14-7))*10)/10);
    }
    w.cycAcc = w.base/60*(PRELOAD/1000);
    wk.cadence = Math.round(cadAt(w, PRELOAD/1000)*10)/10; wk.cycles = Math.floor(w.cycAcc);
  });
  const t0 = performance.now(); let k = 0;
  simTimer = setInterval(() => {
    const sec = (performance.now()-t0)/1000 + PRELOAD/1000, nowMs = Math.round(sec*1000); k++;
    W.forEach(w => {
      const cad = cadAt(w, sec); w.lastCad = cad;
      const f = cad/60, v = w.amp*Math.sin(2*Math.PI*f*sec + w.ph) + (Math.random()*14-7);
      handleMsg({type:'sample', walker:w.id, t:nowMs, gz:Math.round(v*10)/10});
    });
    if (k%12===0) W.forEach(w => { w.cycAcc += w.lastCad*(0.24/60);
      handleMsg({type:'metrics', walker:w.id, t:nowMs, cadence:Math.round(w.lastCad*10)/10, cycles:Math.floor(w.cycAcc)}); });
  }, 20);
}
function stopSim(){ if (simTimer){ clearInterval(simTimer); simTimer = null; } }

let ws = null, everOpen = false, fbTimer = null;
function connect(){
  const url = document.getElementById('wsurl').value.trim();
  if (ws){ try{ ws.close(); }catch(e){} }
  everOpen = false; clearTimeout(fbTimer);
  fbTimer = setTimeout(() => { if (!everOpen) startSim(); }, 2500);
  try { ws = new WebSocket(url); }
  catch(e){ startSim(); return; }
  ws.onopen    = () => { everOpen = true; clearTimeout(fbTimer); stopSim(); if (window.setState) window.setState('live'); };
  ws.onmessage = e  => handleMsg(JSON.parse(e.data));
  ws.onclose   = () => { if (everOpen){ if (window.setState) window.setState('off'); setTimeout(connect, 1500); } };
  ws.onerror   = () => {};
}

// recompute scores a few times a second (visuals read _score every frame)
setInterval(() => { order.forEach(id => computeScore(walkers[id])); }, 400);
