/* Walk Buddies — SOLO ARENAS.
 *
 * A grid of cards (like pokemon-dashboard.html) where every walker gets their OWN little
 * environment and Pokémon buddy. The buddy moves its body and shows emotion from the live
 * Moon Walk Score/metrics. Each card has a MOVEMENT (energy) bar that fills while you walk
 * and drains toward zero when you idle — fill it to MAX to LEVEL UP.
 *
 * Reuses game.js for the data model, score blend, moods, coaching, and transport
 * (POKEMON, MOODS, moodFor, walkers, order, ensure, computeScore, buddyLine, connect…).
 * Claim safety per ADR-0005: encouragement, never a health rating.
 */

// each walker is dropped into one of these pretty walkable patches of the map
const REGIONS = [
  {c:3,  r:13, w:15, h:13},
  {c:3,  r:24, w:16, h:9 },
  {c:22, r:13, w:15, h:13},
];

// ---- movement / energy → level model (see /tmp/moonwalk-gamification-leveling-design.md) ----
// Tuned for elderly users: rewarding but not exhausting, rest-friendly (grace before any decay),
// and claim-safe (a "keep-moving" meter, never a health rating — ADR-0005).
const ENERGY_MAX  = 100;   // energy to gain a level (~95s of comfortable walking)
const FILL_RATE   = 1.4;   // energy/sec at full movement intensity
const DECAY_RATE  = 0.5;   // energy/sec drain once idle past the grace window (half of fill)
const IDLE_GRACE  = 8;     // seconds of rest allowed before the bar starts draining

// Claim-safe "compensation" unlocked at each level (encouragement & expression, never health).
const REWARDS = {
  2:'a snazzy hat 🎩', 3:'a new title ⭐', 4:'an arena decoration 🌳', 5:'a second buddy slot 🐣',
  6:'a new emote 😄', 8:'a brand-new environment 🏞️', 10:'a shiny medal 🏅', 15:'evolved buddy art ✨',
};
const rewardFor = lvl => REWARDS[lvl] || 'a little celebration 🎉';

const arenaScene = {};     // id -> Arena scene instance
const arenaGame  = {};     // id -> Phaser.Game
const prog = {};           // id -> {energy, level}
const card = {};           // id -> {root DOM refs}
let _regionIdx = 0;

const loadLevel = id => parseInt(localStorage.getItem('mw-level-' + id) || '1', 10);

// ============ one small GBA-style environment + one buddy ============
class Arena extends Phaser.Scene {
  init(data){ this.id = data.id; this.rect = data.rect; }

  preload(){
    this.load.json('map', 'assets/pallet-map.json');
    this.load.spritesheet('tiles', 'assets/overworld.png', {frameWidth:8, frameHeight:8});
    POKEMON.forEach(p => this.load.image('poke-'+p.id, 'assets/pokemon/'+p.id+'.png'));
    ['happy','question','shock'].forEach(e => this.load.image('emote-'+e, 'assets/emotes/'+e+'.png'));
  }

  create(){
    const map = this.cache.json.get('map'), R = this.rect;
    this.gmap = map;
    // crop the chosen patch of Pallet Town into this arena's own little tilemap
    const data = [];
    for (let r=0; r<R.h; r++){ const row=[]; for (let c=0; c<R.w; c++) row.push(map.tiles[R.r+r][R.c+c]); data.push(row); }
    const tm = this.make.tilemap({data, tileWidth:8, tileHeight:8});
    const ts = tm.addTilesetImage('tiles', 'tiles', 8, 8, 0, 0);
    tm.createLayer(0, ts, 0, 0);
    this.cameras.main.setBounds(0, 0, R.w*8, R.h*8);
    this.cameras.main.setBackgroundColor('#0f380f');

    // spawn the buddy on a walkable tile near the middle of the patch
    let sc = Math.floor(R.w/2), sr = Math.floor(R.h/2);
    if (!this.canStand(sc, sr)){
      outer: for (let r=0; r<R.h; r++) for (let c=0; c<R.w; c++) if (this.canStand(c,r)){ sc=c; sr=r; break outer; }
    }
    const cont = this.add.container(sc*8+4, sr*8+8).setDepth(10);
    const sprite = this.add.image(0, 0, 'poke-' + walkers[this.id].poke).setOrigin(0.5, 1);
    sprite.displayHeight = 26; sprite.scaleX = Math.abs(sprite.scaleY);
    this._baseScale = sprite.scaleY;
    const shadow = this.add.ellipse(0, 1, sprite.displayWidth*0.7, 5, 0x0f380f, 0.45);
    const emote  = this.add.image(0, -sprite.displayHeight - 6, 'emote-happy').setVisible(false);
    const zzz    = this.add.text(sprite.displayWidth*0.4, -sprite.displayHeight, 'z',
                     {fontFamily:'monospace', fontSize:'10px', color:'#0f380f', fontStyle:'bold'}).setVisible(false);
    const sparkA = this.add.text(-10, -18, '✨', {fontSize:'10px'}).setOrigin(0.5).setVisible(false);
    const sparkB = this.add.text( 10, -10, '✨', {fontSize:'10px'}).setOrigin(0.5).setVisible(false);
    cont.add([shadow, sprite, emote, zzz, sparkA, sparkB]);

    this.buddy = {cont, sprite, shadow, emote, zzz, sparkA, sparkB,
                  c:sc, r:sr, poke:walkers[this.id].poke, moving:false, nextStepAt:0,
                  bob:0, moodKey:null, excitedAt:0};
    arenaScene[this.id] = this;
  }

  canStand(lc, lr){
    const R = this.rect;
    if (lc<0 || lr<0 || lc>=R.w || lr>=R.h) return false;
    return !!(this.gmap.walkable[R.r+lr] && this.gmap.walkable[R.r+lr][R.c+lc]);
  }

  pickStep(){
    const b = this.buddy;
    for (const [dc,dr] of Phaser.Utils.Array.Shuffle([[1,0],[-1,0],[0,1],[0,-1]]))
      if (this.canStand(b.c+dc, b.r+dr)) return {nc:b.c+dc, nr:b.r+dr, dc};
    return null;
  }

  // a happy hop in place — used for excitement and level-ups (buddy "moves its body")
  bounce(big){
    const b = this.buddy, s = b.sprite, base = this._baseScale;
    this.tweens.add({targets:s, y:-(big?16:8), duration:big?260:170, yoyo:true, ease:'Quad.easeOut',
                     onComplete:()=>{ s.y = 0; }});
    this.tweens.add({targets:s, scaleY:base*(big?1.25:1.12), scaleX:base*(big?0.8:0.9),
                     duration:big?130:90, yoyo:true, ease:'Sine.easeInOut'});
  }

  levelUp(){
    const b = this.buddy;
    b.emote.setTexture('emote-happy').setVisible(true);
    b.sparkA.setVisible(true); b.sparkB.setVisible(true);
    this.bounce(true); this.time.delayedCall(280, ()=>this.bounce(true));
    const t = this.add.text(b.cont.x, b.cont.y-30, 'LV UP!', {fontFamily:'monospace',
              fontSize:'11px', color:'#9bbc0f', fontStyle:'bold', stroke:'#0f380f', strokeThickness:3}).setOrigin(0.5);
    this.tweens.add({targets:t, y:t.y-18, alpha:0, duration:1200, ease:'Sine.easeOut', onComplete:()=>t.destroy()});
  }

  update(time, delta){
    const b = this.buddy, w = walkers[this.id]; if (!b || !w) return;
    if (b.poke !== w.poke){
      b.sprite.setTexture('poke-' + w.poke);
      b.sprite.displayHeight = 26; b.sprite.scaleX = Math.abs(b.sprite.scaleY); this._baseScale = b.sprite.scaleY;
      b.poke = w.poke;
    }
    const mood = moodFor(w._score), cad = w.cadence||0;

    if (b.moodKey !== mood.key){
      b.moodKey = mood.key;
      if (mood.emote){ b.emote.setTexture('emote-'+mood.emote).setVisible(true); } else b.emote.setVisible(false);
      b.zzz.setVisible(mood.key==='asleep');
      const thr = mood.key==='thrilled';
      b.sparkA.setVisible(thr); b.sparkB.setVisible(thr);
    }
    // gentle breathing bob; sparkle twinkle
    b.bob += delta/1000 * (mood.key==='asleep' ? 1.0 : 2.0 + cad/30);
    if (!b.moving) b.sprite.y = -Math.abs(Math.sin(b.bob)) * (mood.key==='asleep'?0.6:1.3);
    if (b.sparkA.visible){ b.sparkA.alpha = .5+.5*Math.sin(b.bob*1.7); b.sparkB.alpha = .5+.5*Math.sin(b.bob*1.7+2); }
    // happy buddies do little excited bounces now and then ("show emotion with the body")
    if ((mood.key==='happy'||mood.key==='thrilled') && time>b.excitedAt && !b.moving){
      this.bounce(false); b.excitedAt = time + Phaser.Math.Between(1400, 2800);
    }

    if (mood.key==='asleep') return;                 // naps in place
    if (!b.moving && time>b.nextStepAt){
      const step = this.pickStep();
      if (step){
        b.moving = true;
        if (step.dc!==0){ b.sprite.setFlipX(step.dc<0); }
        const dur = Math.max(180, (({sad:560,okay:420,happy:320,thrilled:240})[mood.key]||420) - cad*1.4);
        const hop = ({sad:3,okay:5,happy:7,thrilled:9})[mood.key]||5;
        b.c = step.nc; b.r = step.nr;
        this.tweens.add({targets:b.cont, x:b.c*8+4, y:b.r*8+8, duration:dur, ease:'Sine.easeInOut',
                         onComplete:()=>{ b.moving=false; }});
        this.tweens.add({targets:b.sprite, y:-hop, duration:dur/2, yoyo:true, ease:'Quad.easeOut',
                         onComplete:()=>{ b.sprite.y=0; }});
        const rest = ({sad:[1800,3200],okay:[900,1800],happy:[400,1000],thrilled:[200,550]})[mood.key]||[900,1800];
        b.nextStepAt = time + dur + Phaser.Math.Between(rest[0],rest[1])*(1-Math.min(.5,cad/120));
      } else b.nextStepAt = time + 600;
    }
  }
}

// ============ per-walker card (DOM) + its Phaser arena ============
const pokeOptions = POKEMON.map(p=>`<option value="${p.id}">${p.name}</option>`).join('');

function createCard(id){
  if (card[id]) return;
  const region = REGIONS[_regionIdx++ % REGIONS.length];
  prog[id] = {energy:0, level:loadLevel(id), idleSince:performance.now()};

  const grid = document.getElementById('grid');
  const el = document.createElement('div');
  el.className = 'card'; el.id = 'card-' + id;
  el.innerHTML = `
    <div class="chead">
      <span class="lv" title="Level"><span class="lvn">${prog[id].level}</span></span>
      <span class="who">Walker ${id}</span>
      <span class="mood">…</span>
    </div>
    <div class="arena" id="arena-${id}"></div>
    <div class="energy" title="Keep moving to fill the bar — reach the end to level up!">
      <div class="efill"></div><span class="elabel">MOVE</span>
    </div>
    <div class="srow"><span class="score">0</span><small>/100 Moon Walk Score</small><span class="moodchip"></span></div>
    <div class="dlg"></div>
    <div class="pick"><label>Buddy</label><select aria-label="Choose buddy for Walker ${id}">${pokeOptions}</select></div>`;
  grid.appendChild(el);

  const refs = {
    el, lvn:el.querySelector('.lvn'), mood:el.querySelector('.mood'),
    efill:el.querySelector('.efill'), score:el.querySelector('.score'),
    moodchip:el.querySelector('.moodchip'), dlg:el.querySelector('.dlg'),
    sel:el.querySelector('select'),
  };
  refs.sel.value = walkers[id].poke;
  refs.sel.onchange = e => { walkers[id].poke = e.target.value; localStorage.setItem('mw-buddy-'+id, e.target.value); };
  card[id] = refs;

  const g = new Phaser.Game({
    type: Phaser.AUTO, parent: 'arena-' + id, pixelArt: true, backgroundColor: '#0f380f',
    scale: {mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: region.w*8, height: region.h*8},
  });
  // add + auto-start the arena scene once the game has booted, passing this walker's data
  g.events.once('ready', () => g.scene.add('arena', Arena, true, {id, rect:region}));
  arenaGame[id] = g;
}

// ============ movement-bar / leveling loop ============
function onLevelUp(id){
  if (arenaScene[id]) arenaScene[id].levelUp();
  const name = POKE_BY[walkers[id].poke].name, lvl = prog[id].level;
  if (card[id]){ card[id].dlg.textContent = `🎉 ${name} reached Level ${lvl}! You earned ${rewardFor(lvl)}`; card[id].dlg.classList.add('lvup'); }
}

let _lastT = performance.now();
function progressLoop(){
  const now = performance.now(), dt = Math.min(0.1, (now-_lastT)/1000); _lastT = now;
  order.forEach(id => {
    const w = walkers[id], p = prog[id], c = card[id]; if (!p || !c) return;
    // movement intensity from the live signals (cadence-led, with an activity nudge)
    const cad = w.cadence || 0, act = (w._parts && w._parts.activity) || 0;
    const intensity = 0.7*Math.max(0, Math.min(1, (cad-30)/25)) + 0.3*(act/100);
    if (intensity > 0.02){ p.energy += FILL_RATE*intensity*dt; p.idleSince = now; }   // walking → fill
    else if (now - p.idleSince > IDLE_GRACE*1000){ p.energy -= DECAY_RATE*dt; }        // idle past grace → gentle drain
    if (p.energy >= ENERGY_MAX){ p.level++; p.energy -= ENERGY_MAX; localStorage.setItem('mw-level-'+id, p.level); onLevelUp(id); }
    p.energy = Math.max(0, Math.min(ENERGY_MAX, p.energy));

    const mood = moodFor(w._score);
    c.efill.style.width = (p.energy/ENERGY_MAX*100) + '%';
    c.efill.style.opacity = (intensity <= 0.02) ? '0.6' : '1';   // dim while resting/draining
    c.lvn.textContent = p.level;
    c.score.textContent = w._score;
    c.mood.textContent = mood.label;
    c.moodchip.textContent = mood.label;
  });
  requestAnimationFrame(progressLoop);
}
requestAnimationFrame(progressLoop);

// re-voice each buddy's dialogue line periodically (coaching when Training Mode is on)
setInterval(() => order.forEach(id => {
  const c = card[id]; if (!c || c.dlg.classList.contains('lvup')) return;
  c.dlg.textContent = buddyLine(id);
}), 4000);
setInterval(() => order.forEach(id => { const c=card[id]; if (c) c.dlg.classList.remove('lvup'); }), 3500);

// roster hook: game.js calls this whenever a new walker appears
window.onRosterChange = () => order.forEach(id => { if (!card[id]) createCard(id); });
