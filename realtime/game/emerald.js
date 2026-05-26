/* Walk Buddies — EMERALD ARENAS (full-colour GBA rebuild).
 *
 * A grid of cards; every walker gets their own little full-colour Littleroot Town and a
 * Pokémon buddy whose body & mood follow the live Moon Walk Score. Built on the SAME engine
 * as the monochrome prototype (game.js: score blend, moods, coaching, transport) — this file
 * is the re-skin (16px Emerald metatiles + colour sprites) plus the agreed gamification layer.
 *
 * Mechanics (3-persona synthesis MVP): wake-your-buddy day loop · MOVE bar -> Level Up ·
 * walk-day streak + show-up pins · arena berry garden (never wilts) · friends album.
 * Code-gap fixes (R&D): quality multiplier on fill · daily soft cap · IDLE_GRACE 18s ·
 * per-user cadence target (own baseline, not a population norm) · accessibility.
 *
 * Claim safety (ADR-0005, NORMATIVE): everything is encouragement, never a health rating.
 * The MOVE bar is the BUDDY'S energy, not the User's vitality. Rewards are cosmetic. Quality
 * is judged against the User's OWN rolling baseline, never a norm. Coaching opt-in (ADR-0006).
 *
 * Depends on game.js globals: POKEMON, POKE_BY, MOODS, moodFor, walkers, order, ensure,
 * computeScore, buddyLine, connect. (game.js already declares TILE/scene/game/clamp — we
 * must not redeclare those, hence the MT/clampe local names below.)
 */

const ASSETS = 'assets-emerald/';
const MT = 16;                       // Emerald metatile size (px); game.js owns 8px `TILE`
const clampe = x => Math.max(0, Math.min(100, x));
const clamp01 = x => Math.max(0, Math.min(1, x));

// ---- leveling model (leveling-design.md) + R&D code-gap fixes (synthesis §4) ----
const ENERGY_MAX = 100;              // one full bar
const FILL_RATE  = 1.4;              // energy/sec at full movement intensity
const DECAY_RATE = 0.5;              // energy/sec drain once idle past grace (half of fill)
const IDLE_GRACE = 18;               // §4: 8s -> 18s (a natural mid-walk pause is longer than 8s)
const CAD_FLOOR  = 30;               // cycles/min below this = "not really walking"
const CAD_TARGET_FALLBACK = 55;      // until we've learned the user's own baseline cadence
const DAILY_SOFTCAP = 4;             // §4: taper fill after ~4 levels/day (anti-overexertion)

// how many full bars advance one level — front-loaded wins, soft plateau (never a hard cap)
const barsForLevel = lvl => (lvl < 5 ? 1 : lvl < 15 ? 2 : 3);

// per-level cosmetic/expressive rewards (claim-safe — never a number that reads as health)
const REWARDS = {
  2:'a straw hat 🎩', 3:'the title “Morning Stroller” ⭐', 4:'a flower patch for your arena 🌷',
  5:'a second buddy to choose 🐣', 6:'a happy wave emote 👋', 8:'a brand-new path to explore 🏞️',
  10:'a shiny medal 🏅 + family card', 12:'a cozy scarf 🧣', 15:'grown-up buddy art ✨',
};
const rewardFor = lvl => REWARDS[lvl] || 'a little celebration 🎉';

// show-up pins (walk-DAY milestones) — thank-yous, never challenges; streak never "breaks"
const PINS = [
  {days:3,  id:'bronze',    label:'Bronze Walk-Days pin 🥉'},
  {days:7,  id:'silver',    label:'Silver Walk-Days pin 🥈'},
  {days:14, id:'companion', label:'a companion who joins your walks 🐕'},
  {days:30, id:'gold',      label:'Gold “Trailblazer” pin 🥇'},
];

const GARDEN_MAX = 4;                // 5 stages 0..4 (dirt → sprout → young → flowering → ripe)
const GARDEN_NAMES = ['planted','sprouting','growing','flowering','ripe with berries'];

// ---- per-walker progression state (persisted) ----
const prog = {};                     // id -> progression object
const card = {};                     // id -> DOM refs
const arenaScene = {};               // id -> Arena scene
const arenaGame  = {};               // id -> Phaser.Game
let _spawnSeed = 0;

const dayKey = () => new Date().toDateString();

function loadProg(id){
  let p = null;
  try { p = JSON.parse(localStorage.getItem('mw-prog-' + id)); } catch(e) {}
  if (!p) p = {level:1, bars:0, energy:0, walkDays:0, lastWalkDay:null, gardenStage:0,
               levelsToday:0, todayKey:dayKey(), baseline:CAD_TARGET_FALLBACK,
               met:[], pins:[], wokeToday:false};
  p.met = p.met || []; p.pins = p.pins || [];
  // day rollover: gentle overnight energy decay, reset daily cap, buddy sleeps until first walk
  const today = dayKey();
  if (p.todayKey !== today){
    p.energy = (p.energy || 0) * 0.4;          // soft reset, never erases a level (§1.5)
    p.levelsToday = 0; p.wokeToday = false; p.todayKey = today; p.softcapNudged = false;
  }
  p.idleSince = performance.now();             // runtime-only
  return p;
}
const PERSIST_KEYS = ['level','bars','energy','walkDays','lastWalkDay','gardenStage',
                      'levelsToday','todayKey','baseline','met','pins','wokeToday'];
function saveProg(id){
  const p = prog[id]; if (!p) return;
  const out = {}; PERSIST_KEYS.forEach(k => out[k] = p[k]);
  localStorage.setItem('mw-prog-' + id, JSON.stringify(out));
}

// ============ one full-colour Littleroot arena + one buddy ============
class Arena extends Phaser.Scene {
  init(data){ this.id = data.id; this.seed = data.seed; }

  preload(){
    this.load.json('lmap', ASSETS + 'littleroot-map.json');
    this.load.spritesheet('mtiles', ASSETS + 'metatiles.png', {frameWidth:MT, frameHeight:MT});
    this.load.spritesheet('garden', ASSETS + 'garden.png', {frameWidth:MT, frameHeight:MT*2});
    POKEMON.forEach(p => this.load.image('poke-'+p.id, ASSETS + 'pokemon/'+p.id+'.png'));
    ['happy','question','shock'].forEach(e => this.load.image('emote-'+e, ASSETS + 'emotes/'+e+'.png'));
  }

  create(){
    const map = this.cache.json.get('lmap');
    this.gmap = map; this.W = map.wTiles; this.H = map.hTiles;

    // whole town fits a card (20x20 metatiles); render it directly against the colour atlas
    const tm = this.make.tilemap({data: map.tiles, tileWidth:MT, tileHeight:MT});
    const ts = tm.addTilesetImage('mtiles', 'mtiles', MT, MT, 0, 0);
    tm.createLayer(0, ts, 0, 0);
    this.cameras.main.setBounds(0, 0, this.W*MT, this.H*MT);
    this.cameras.main.setBackgroundColor('#3a6b3a');

    // walkable spawn tiles
    this.walk = map.walkable;
    this.spawns = [];
    for (let r=0; r<this.H; r++) for (let c=0; c<this.W; c++) if (this.walk[r][c]) this.spawns.push({c,r});

    // the user's berry garden — planted on a walkable tile toward the lower town, grows by walk-day
    this.plantTile = this.findPlantTile();
    this.garden = this.add.image(this.plantTile.c*MT + MT/2, this.plantTile.r*MT + MT, 'garden')
      .setOrigin(0.5, 1).setDepth(5 + this.plantTile.r);
    this.garden.setFrame(prog[this.id].gardenStage);

    // spawn the buddy on a walkable tile (deterministic offset per card)
    const s = this.spawns[(this.seed*7) % this.spawns.length] || {c:Math.floor(this.W/2), r:Math.floor(this.H/2)};
    const cont = this.add.container(s.c*MT + MT/2, s.r*MT + MT).setDepth(20 + s.r);
    const sprite = this.add.image(0, 0, 'poke-' + walkers[this.id].poke).setOrigin(0.5, 1);
    sprite.displayHeight = 34; sprite.scaleX = Math.abs(sprite.scaleY);
    this._base = sprite.scaleY;
    const shadow = this.add.ellipse(0, 1, sprite.displayWidth*0.55, 6, 0x103810, 0.4);
    const emote  = this.add.image(0, -sprite.displayHeight - 5, 'emote-happy').setVisible(false).setScale(1);
    const zzz    = this.add.text(sprite.displayWidth*0.45, -sprite.displayHeight, 'z',
                     {fontFamily:'monospace', fontSize:'13px', color:'#ffffff',
                      fontStyle:'bold', stroke:'#103810', strokeThickness:2}).setVisible(false);
    const sparkA = this.add.text(-12, -22, '✨', {fontSize:'13px'}).setOrigin(0.5).setVisible(false);
    const sparkB = this.add.text( 12, -12, '✨', {fontSize:'13px'}).setOrigin(0.5).setVisible(false);
    cont.add([shadow, sprite, emote, zzz, sparkA, sparkB]);

    this.buddy = {cont, sprite, shadow, emote, zzz, sparkA, sparkB,
                  c:s.c, r:s.r, poke:walkers[this.id].poke, moving:false,
                  nextStepAt:0, bob:0, moodKey:null, excitedAt:0, sleepShown:false};
    arenaScene[this.id] = this;
  }

  findPlantTile(){
    // prefer a walkable tile in the lower-left quadrant so the plant frames a corner
    let best = null;
    for (let r=this.H-1; r>=0; r--) for (let c=0; c<this.W; c++)
      if (this.walk[r][c]){ best = {c,r}; if (r > this.H*0.6 && c < this.W*0.5) return {c,r}; }
    return best || {c:1, r:this.H-2};
  }
  canStand(c,r){ return c>=0 && r>=0 && c<this.W && r<this.H && this.walk[r][c]; }

  setGardenStage(stage){ if (this.garden) this.garden.setFrame(clampInt(stage)); }

  pickStep(){
    const b = this.buddy;
    for (const [dc,dr] of Phaser.Utils.Array.Shuffle([[1,0],[-1,0],[0,1],[0,-1]]))
      if (this.canStand(b.c+dc, b.r+dr)) return {nc:b.c+dc, nr:b.r+dr, dc};
    return null;
  }

  bounce(big){
    const s = this.buddy.sprite, base = this._base;
    this.tweens.add({targets:s, y:-(big?20:9), duration:big?280:170, yoyo:true, ease:'Quad.easeOut',
                     onComplete:()=>{ s.y = 0; }});
    this.tweens.add({targets:s, scaleY:base*(big?1.25:1.12), scaleX:base*(big?0.82:0.9),
                     duration:big?140:90, yoyo:true, ease:'Sine.easeInOut'});
  }

  // celebratory flourish for a level-up (no failure framing — pure celebration)
  levelUp(lvl){
    const b = this.buddy;
    b.emote.setTexture('emote-happy').setVisible(true);
    b.sparkA.setVisible(true); b.sparkB.setVisible(true);
    this.bounce(true); this.time.delayedCall(300, ()=>this.bounce(true));
    const t = this.add.text(b.cont.x, b.cont.y-40, 'LV '+lvl+'!', {fontFamily:'monospace',
              fontSize:'16px', color:'#fff04a', fontStyle:'bold', stroke:'#103810', strokeThickness:4}).setOrigin(0.5);
    this.tweens.add({targets:t, y:t.y-24, alpha:0, duration:1400, ease:'Sine.easeOut', onComplete:()=>t.destroy()});
  }

  // the morning "wake your buddy" moment
  wake(){
    const b = this.buddy; b.zzz.setVisible(false); b.sleepShown = false;
    b.emote.setTexture('emote-happy').setVisible(true);
    this.bounce(true);
    this.time.delayedCall(900, ()=>{ if (moodFor(walkers[this.id]._score).key !== 'thrilled') b.emote.setVisible(false); });
  }

  update(time, delta){
    const b = this.buddy, w = walkers[this.id], p = prog[this.id]; if (!b || !w || !p) return;
    if (b.poke !== w.poke){
      b.sprite.setTexture('poke-' + w.poke);
      b.sprite.displayHeight = 34; b.sprite.scaleX = Math.abs(b.sprite.scaleY); this._base = b.sprite.scaleY;
      b.poke = w.poke;
    }

    // wake-your-buddy gate: until the first walk of the day, the buddy sleeps regardless of score
    const asleep = !p.wokeToday;
    const mood = asleep ? MOODS[0] : moodFor(w._score), cad = w.cadence||0;

    if (b.moodKey !== mood.key || (asleep && !b.sleepShown)){
      b.moodKey = mood.key;
      if (asleep){
        b.zzz.setVisible(true); b.emote.setVisible(false);
        b.sparkA.setVisible(false); b.sparkB.setVisible(false); b.sleepShown = true;
      } else {
        b.zzz.setVisible(false);
        if (mood.emote){ b.emote.setTexture('emote-'+mood.emote).setVisible(true); } else b.emote.setVisible(false);
        const thr = mood.key==='thrilled';
        b.sparkA.setVisible(thr); b.sparkB.setVisible(thr);
      }
    }

    // gentle breathing bob; sparkle twinkle
    b.bob += delta/1000 * (asleep ? 1.0 : 2.0 + cad/30);
    if (!b.moving) b.sprite.y = -Math.abs(Math.sin(b.bob)) * (asleep ? 0.7 : 1.4);
    if (b.sparkA.visible){ b.sparkA.alpha = .5+.5*Math.sin(b.bob*1.7); b.sparkB.alpha = .5+.5*Math.sin(b.bob*1.7+2); }
    if (!asleep && (mood.key==='happy'||mood.key==='thrilled') && time>b.excitedAt && !b.moving){
      this.bounce(false); b.excitedAt = time + Phaser.Math.Between(1500, 3000);
    }

    if (asleep || mood.key==='asleep') return;           // naps in place
    if (!b.moving && time>b.nextStepAt){
      const step = this.pickStep();
      if (step){
        b.moving = true;
        if (step.dc!==0){ b.sprite.setFlipX(step.dc<0); }
        const dur = Math.max(220, (({sad:640,okay:480,happy:360,thrilled:280})[mood.key]||480) - cad*1.4);
        const hop = ({sad:4,okay:6,happy:9,thrilled:12})[mood.key]||6;
        b.c = step.nc; b.r = step.nr; b.cont.setDepth(20 + b.r);
        this.tweens.add({targets:b.cont, x:b.c*MT+MT/2, y:b.r*MT+MT, duration:dur, ease:'Sine.easeInOut',
                         onComplete:()=>{ b.moving=false; }});
        this.tweens.add({targets:b.sprite, y:-hop, duration:dur/2, yoyo:true, ease:'Quad.easeOut',
                         onComplete:()=>{ b.sprite.y=0; }});
        const rest = ({sad:[2000,3400],okay:[1000,2000],happy:[500,1100],thrilled:[250,600]})[mood.key]||[1000,2000];
        b.nextStepAt = time + dur + Phaser.Math.Between(rest[0],rest[1])*(1-Math.min(.5,cad/120));
      } else b.nextStepAt = time + 700;
    }
  }
}
const clampInt = s => Math.max(0, Math.min(GARDEN_MAX, Math.round(s)));

// ============ per-walker card (DOM) + its Phaser arena ============
const pokeOptions = POKEMON.map(p=>`<option value="${p.id}">${p.name}</option>`).join('');

function createCard(id){
  if (card[id]) return;
  prog[id] = loadProg(id);
  const seed = _spawnSeed++;

  const grid = document.getElementById('grid');
  const el = document.createElement('div');
  el.className = 'card'; el.id = 'card-' + id;
  el.innerHTML = `
    <div class="chead">
      <span class="lv" title="Level (never goes down)"><span class="lvn">${prog[id].level}</span></span>
      <span class="who">Walker ${id}</span>
      <span class="mood" aria-live="polite"><span class="mface">😴</span><span class="mlabel">…</span></span>
    </div>
    <div class="arena" id="arena-${id}"></div>
    <div class="energy" role="progressbar" aria-label="Your buddy's MOVE energy"
         aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
      <div class="efill"></div>
      <span class="elabel"><span class="etxt">MOVE</span> <span class="epct">0%</span></span>
    </div>
    <div class="srow">
      <span class="score">0</span><small>/100 Moon Walk Score</small>
      <span class="moodchip">…</span>
    </div>
    <div class="stats">
      <span class="stat" title="Distinct days you've walked — only ever goes up">👟 <b class="wd">0</b> walk-days</span>
      <span class="stat garden" title="Your berry plant grows every walk-day and never wilts">🌱 <b class="gname">planted</b></span>
      <span class="pins"></span>
    </div>
    <div class="dlg" aria-live="polite"></div>
    <div class="pick">
      <label for="sel-${id}">Buddy</label>
      <select id="sel-${id}" aria-label="Choose buddy for Walker ${id}">${pokeOptions}</select>
      <button class="album-btn" type="button" aria-label="Open friends album">📖 Friends</button>
    </div>`;
  grid.appendChild(el);

  const refs = {
    el, lvn:el.querySelector('.lvn'), mface:el.querySelector('.mface'), mlabel:el.querySelector('.mlabel'),
    efill:el.querySelector('.efill'), energy:el.querySelector('.energy'), epct:el.querySelector('.epct'),
    score:el.querySelector('.score'), moodchip:el.querySelector('.moodchip'),
    wd:el.querySelector('.wd'), gname:el.querySelector('.gname'), pins:el.querySelector('.pins'),
    dlg:el.querySelector('.dlg'), sel:el.querySelector('select'), album:el.querySelector('.album-btn'),
  };
  refs.sel.value = walkers[id].poke;
  refs.sel.onchange = e => { walkers[id].poke = e.target.value; localStorage.setItem('mw-buddy-'+id, e.target.value); };
  refs.album.onclick = () => openAlbum(id);
  card[id] = refs;
  renderPins(id);

  const g = new Phaser.Game({
    type: Phaser.AUTO, parent: 'arena-' + id, pixelArt: true, backgroundColor: '#3a6b3a',
    scale: {mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width:20*MT, height:20*MT},
  });
  g.events.once('ready', () => g.scene.add('arena', Arena, true, {id, seed}));
  arenaGame[id] = g;
}

const MOOD_FACE = {asleep:'😴', sad:'😪', okay:'🙂', happy:'😄', thrilled:'🤩'};

function renderPins(id){
  const p = prog[id], c = card[id]; if (!c) return;
  c.pins.innerHTML = p.pins.map(pid => {
    const def = PINS.find(x=>x.id===pid); return def ? `<span class="pin" title="${def.label}">${def.label.match(/\p{Emoji}/u)?.[0]||'🏅'}</span>` : '';
  }).join('');
}

// ============ movement → energy → level loop (claim-safe leveling) ============
function wakeBuddy(id){
  const p = prog[id], w = walkers[id], name = POKE_BY[w.poke].name;
  p.wokeToday = true;
  const today = dayKey();
  if (p.lastWalkDay !== today){                 // first walk of a NEW calendar day
    p.lastWalkDay = today;
    p.walkDays += 1;                            // additive lifetime counter — never resets
    if (p.gardenStage < GARDEN_MAX) p.gardenStage += 1;   // garden ripens by walk-day, never wilts
    if (arenaScene[id]) arenaScene[id].setGardenStage(p.gardenStage);
    metFriend(id, w.poke);
    checkPins(id);
  }
  if (arenaScene[id]) arenaScene[id].wake();
  if (card[id]){ setDlg(id, `☀️ Good morning! ${name} woke up and is happy to walk with you.`); }
  saveProg(id);
}

function metFriend(id, sp){
  const p = prog[id]; if (!p.met.includes(sp)){ p.met.push(sp); }
}

function checkPins(id){
  const p = prog[id], w = walkers[id], name = POKE_BY[w.poke].name;
  PINS.forEach(def => {
    if (p.walkDays >= def.days && !p.pins.includes(def.id)){
      p.pins.push(def.id); renderPins(id);
      flashDlg(id, `🎉 ${p.walkDays} walk-days! Thank you for showing up — you earned ${def.label}.`);
    }
  });
}

function onLevelUp(id){
  const p = prog[id], name = POKE_BY[walkers[id].poke].name;
  metFriend(id, walkers[id].poke);
  if (arenaScene[id]) arenaScene[id].levelUp(p.level);
  flashDlg(id, `🎉 ${name} reached Level ${p.level}! You unlocked ${rewardFor(p.level)}`);
}

function setDlg(id, txt){ const c = card[id]; if (c && !c.dlg.classList.contains('lvup')) c.dlg.textContent = txt; }
function flashDlg(id, txt){
  const c = card[id]; if (!c) return;
  c.dlg.textContent = txt; c.dlg.classList.add('lvup');
  clearTimeout(c._dlgT); c._dlgT = setTimeout(()=>c.dlg.classList.remove('lvup'), 4200);
}

let _lastT = performance.now();
function progressLoop(){
  const now = performance.now(), dt = Math.min(0.1, (now-_lastT)/1000); _lastT = now;
  order.forEach(id => {
    const w = walkers[id], p = prog[id], c = card[id]; if (!p || !c) return;

    const cad = w.cadence || 0, act = (w._parts && w._parts.activity) || 0;
    const rhythm = (w._parts && w._parts.rhythm) || 0;

    // §4: per-user cadence target — learn the User's OWN comfortable pace, not a fixed norm
    if (cad > CAD_FLOOR){ p.baseline = p.baseline*0.997 + cad*0.003; }
    const target = Math.max(42, Math.min(80, p.baseline || CAD_TARGET_FALLBACK));

    const cadComp = clamp01((cad - CAD_FLOOR) / (target - CAD_FLOOR));
    const m = 0.7*cadComp + 0.3*(act/100);      // movement intensity 0..1

    if (m > 0.15){
      if (!p.wokeToday) wakeBuddy(id);           // wake-your-buddy: first real movement of the day
      let fill = FILL_RATE * m;
      fill *= 0.85 + 0.15*(rhythm/100);          // §4: gentle quality multiplier (floored, never a penalty)
      if (p.levelsToday >= DAILY_SOFTCAP){       // §4: daily soft cap — taper, never stop
        fill *= 0.35;
        if (!p.softcapNudged){ p.softcapNudged = true;
          flashDlg(id, `${POKE_BY[w.poke].name} is happily tired 😊 Rest sounds lovely — you've done wonderfully today.`); }
      }
      p.energy += fill * dt; p.idleSince = now;
    } else if (now - p.idleSince > IDLE_GRACE*1000){
      p.energy -= DECAY_RATE * dt;               // resting past grace → gentle drain (never below 0)
    }
    p.energy = clampe(p.energy / ENERGY_MAX * 100) / 100 * ENERGY_MAX;

    if (p.energy >= ENERGY_MAX){
      p.energy -= ENERGY_MAX; p.bars += 1;
      if (p.bars >= barsForLevel(p.level)){ p.bars = 0; p.level += 1; p.levelsToday += 1; onLevelUp(id); }
      saveProg(id);
    }

    const mood = moodFor(w._score), asleep = !p.wokeToday;
    const shownMood = asleep ? MOODS[0] : mood;
    const pct = Math.round(p.energy/ENERGY_MAX*100);
    c.efill.style.width = pct + '%';
    c.energy.setAttribute('aria-valuenow', String(pct));
    c.epct.textContent = pct + '%';
    c.efill.classList.toggle('resting', m <= 0.15);
    c.lvn.textContent = p.level;
    c.score.textContent = w._score;
    c.mface.textContent = MOOD_FACE[shownMood.key] || '🙂';
    c.mlabel.textContent = asleep ? 'Asleep' : shownMood.label;
    c.moodchip.textContent = asleep ? 'Asleep' : shownMood.label;
    c.wd.textContent = p.walkDays;
    c.gname.textContent = GARDEN_NAMES[p.gardenStage];
  });
  requestAnimationFrame(progressLoop);
}
requestAnimationFrame(progressLoop);

// re-voice each buddy's line periodically (coaching only when Training Mode is on — ADR-0006)
setInterval(() => order.forEach(id => {
  const c = card[id], p = prog[id]; if (!c || !p) return;
  if (c.dlg.classList.contains('lvup')) return;
  c.dlg.textContent = p.wokeToday ? buddyLine(id)
    : `${POKE_BY[walkers[id].poke].name} is sleeping 💤 Take a few steps to wake your buddy.`;
}), 4500);

// low-frequency autosave (baseline/energy drift) so progress survives a refresh
setInterval(() => order.forEach(id => saveProg(id)), 8000);

// ============ Friends Album overlay (gentle gallery — no "X of Y" checklist) ============
function openAlbum(id){
  const p = prog[id];
  const friends = p.met.length ? p.met : [walkers[id].poke];
  const friendCards = friends.map(sp => `
    <figure class="afriend">
      <img src="${ASSETS}pokemon/${sp}.png" alt="${POKE_BY[sp].name}" />
      <figcaption>${POKE_BY[sp].name}</figcaption>
    </figure>`).join('');
  const pinList = p.pins.length
    ? p.pins.map(pid => { const d = PINS.find(x=>x.id===pid); return `<li>${d?d.label:pid}</li>`; }).join('')
    : '<li class="muted">More keepsakes arrive as you keep walking 🌼</li>';
  const rewardsEarned = Object.keys(REWARDS).map(Number).filter(l => l <= p.level)
    .map(l => `<li>Lv ${l}: ${REWARDS[l]}</li>`).join('') || '<li class="muted">Level up to unlock keepsakes ✨</li>';

  let ov = document.getElementById('album');
  if (!ov){ ov = document.createElement('div'); ov.id = 'album'; document.body.appendChild(ov); }
  ov.innerHTML = `
    <div class="album-box" role="dialog" aria-label="Friends album for Walker ${id}">
      <button class="album-close" aria-label="Close">✕</button>
      <h2>Walker ${id} · Friends Album</h2>
      <p class="album-sub">Friends you've walked with — your album grows as you go. No checklist, no rush. 🌿</p>
      <div class="afriends">${friendCards}</div>
      <div class="album-cols">
        <div><h3>👟 ${p.walkDays} walk-days</h3><ul>${pinList}</ul></div>
        <div><h3>🎁 Keepsakes</h3><ul>${rewardsEarned}</ul></div>
      </div>
    </div>`;
  ov.style.display = 'flex';
  ov.querySelector('.album-close').onclick = () => ov.style.display = 'none';
  ov.onclick = e => { if (e.target === ov) ov.style.display = 'none'; };
}

// roster hook: game.js calls this whenever a new walker appears
window.onRosterChange = () => order.forEach(id => { if (!card[id]) createCard(id); });
