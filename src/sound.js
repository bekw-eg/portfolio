// ============================================================
//  sound.js — procedural 8-bit SFX and ambient music (Web Audio API).
//  No audio files: square/triangle oscillators, noise and a delay line.
// ============================================================

const MUTE_KEY = 'void-portfolio:muted';
const MUSIC_KEY = 'void-portfolio:music';
let ctx = null;
let master = null;
let sfxBus = null;
let musicBus = null;
let delay = null;
let muted = read(MUTE_KEY) === '1';
let musicWanted = read(MUSIC_KEY) !== '0';
let musicTimer = 0;
let musicStep = 0;
let nextNoteTime = 0;
const listeners = new Set();

function read(k) { try { return localStorage.getItem(k); } catch { return null; } }
function write(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } }

function ensure() {
  if (muted) return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.22; sfxBus.connect(master);
    musicBus = ctx.createGain(); musicBus.gain.value = 0.0; musicBus.connect(master);
    // echo for the music
    delay = ctx.createDelay(1); delay.delayTime.value = 0.375;
    const fb = ctx.createGain(); fb.gain.value = 0.35;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800;
    delay.connect(lp).connect(fb).connect(delay);
    lp.connect(musicBus);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone({ freq = 440, to = null, type = 'square', dur = 0.08, vol = 0.5, delay: d = 0, bus = null, attack = 0.005 }) {
  const ac = ensure();
  if (!ac) return;
  const t0 = typeof d === 'number' && d > 1000 ? d : ac.currentTime + d;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(bus || sfxBus);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
  return g;
}

function noise({ dur = 0.12, vol = 0.4, freq = 1200, delay: d = 0 }) {
  const ac = ensure();
  if (!ac) return;
  const t0 = ac.currentTime + d;
  const len = Math.floor(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  let v = 0;
  for (let i = 0; i < len; i++) { if (i % 6 === 0) v = Math.random() * 2 - 1; data[i] = v * (1 - i / len); }
  const src = ac.createBufferSource(); src.buffer = buf;
  const filter = ac.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = freq;
  const g = ac.createGain(); g.gain.value = vol;
  src.connect(filter).connect(g).connect(sfxBus);
  src.start(t0);
}

// ---------- ambient music --------------------------------------------
// Slow chords (Am – F – C – G) + sparse pentatonic plinks through an echo.
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
const CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];
const PENTA = [69, 72, 74, 76, 79, 81, 84];
const BEAT = 0.5; // seconds per step

function scheduleMusic() {
  if (!ctx || muted || !musicWanted) return;
  while (nextNoteTime < ctx.currentTime + 0.3) {
    const bar = Math.floor(musicStep / 8) % CHORDS.length;
    const stepInBar = musicStep % 8;
    if (stepInBar === 0) {
      // pad: three soft triangle voices, 4 seconds
      for (const n of CHORDS[bar]) {
        const osc = ctx.createOscillator(); const g = ctx.createGain();
        osc.type = 'triangle'; osc.frequency.value = midi(n);
        g.gain.setValueAtTime(0.0001, nextNoteTime);
        g.gain.exponentialRampToValueAtTime(0.06, nextNoteTime + 1.2);
        g.gain.exponentialRampToValueAtTime(0.0001, nextNoteTime + BEAT * 8 + 0.4);
        osc.connect(g).connect(musicBus);
        osc.start(nextNoteTime); osc.stop(nextNoteTime + BEAT * 8 + 0.5);
      }
      // bass
      const b = ctx.createOscillator(); const bg = ctx.createGain();
      b.type = 'square'; b.frequency.value = midi(CHORDS[bar][0] - 12);
      bg.gain.setValueAtTime(0.0001, nextNoteTime);
      bg.gain.exponentialRampToValueAtTime(0.02, nextNoteTime + 0.05);
      bg.gain.exponentialRampToValueAtTime(0.0001, nextNoteTime + BEAT * 3);
      b.connect(bg).connect(musicBus); b.start(nextNoteTime); b.stop(nextNoteTime + BEAT * 3 + 0.1);
    }
    // plinks
    if (Math.random() < (stepInBar % 2 ? 0.25 : 0.55)) {
      const n = PENTA[Math.floor(Math.random() * PENTA.length)];
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = 'square'; o.frequency.value = midi(n);
      g.gain.setValueAtTime(0.0001, nextNoteTime);
      g.gain.exponentialRampToValueAtTime(0.025, nextNoteTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, nextNoteTime + 0.35);
      o.connect(g); g.connect(musicBus); g.connect(delay);
      o.start(nextNoteTime); o.stop(nextNoteTime + 0.4);
    }
    nextNoteTime += BEAT;
    musicStep++;
  }
}

function startMusic() {
  const ac = ensure();
  if (!ac || !musicWanted) return;
  if (musicTimer) return;
  nextNoteTime = ac.currentTime + 0.1;
  musicBus.gain.cancelScheduledValues(ac.currentTime);
  musicBus.gain.setTargetAtTime(1, ac.currentTime, 1.5);
  musicTimer = setInterval(scheduleMusic, 100);
  scheduleMusic();
}
function stopMusic() {
  if (musicTimer) { clearInterval(musicTimer); musicTimer = 0; }
  if (ctx && musicBus) musicBus.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
}

const NOTES = [523.25, 587.33, 659.25, 698.46, 783.99, 880, 987.77, 1046.5];

export const sound = {
  click() { tone({ freq: 880, to: 440, dur: 0.06, vol: 0.3 }); },
  hover() { tone({ freq: 1320, dur: 0.025, vol: 0.06, type: 'triangle' }); },
  slot(i = 0) { tone({ freq: NOTES[i % NOTES.length], dur: 0.07, vol: 0.25 }); },
  place(i = 0) { tone({ freq: 220 + i * 40, to: 160 + i * 30, dur: 0.06, vol: 0.25 }); noise({ dur: 0.05, vol: 0.12, freq: 900 }); },
  page() { noise({ dur: 0.14, vol: 0.25, freq: 3000 }); tone({ freq: 700, to: 900, dur: 0.05, vol: 0.06, type: 'triangle', delay: 0.05 }); },
  craft() { [0, 2, 4, 7].forEach((n, i) => tone({ freq: NOTES[n], dur: 0.12, vol: 0.24, delay: i * 0.07 })); },
  shard() { [4, 7, 9, 12].forEach((n, i) => tone({ freq: midi(72 + n), dur: 0.25, vol: 0.2, type: 'triangle', delay: i * 0.06 })); },
  socket() { tone({ freq: 196, to: 392, dur: 0.25, vol: 0.25, type: 'triangle' }); noise({ dur: 0.08, vol: 0.12, freq: 2000 }); },
  portal() {
    tone({ freq: 110, to: 880, dur: 1.4, vol: 0.25, type: 'sawtooth', attack: 0.3 });
    [0, 4, 7, 12, 16].forEach((n, i) => tone({ freq: midi(64 + n), dur: 0.5, vol: 0.18, type: 'triangle', delay: 0.4 + i * 0.1 }));
  },
  levelUp() { [0, 4, 7, 4, 7].forEach((n, i) => tone({ freq: NOTES[n] * (i > 2 ? 2 : 1), dur: 0.14, vol: 0.22, type: 'triangle', delay: i * 0.09 })); },
  advancement() { [4, 5, 7].forEach((n, i) => tone({ freq: NOTES[n], dur: 0.18, vol: 0.2, delay: i * 0.1 })); },
  breakBlock(name = '') {
    const soft = /chorus|planks|bookshelf/.test(name);
    noise({ dur: soft ? 0.1 : 0.16, vol: 0.45, freq: soft ? 700 : 1800 });
    tone({ freq: soft ? 140 : 110, to: 60, dur: 0.1, vol: 0.22 });
  },
  chatOpen() { tone({ freq: 660, dur: 0.04, vol: 0.18 }); tone({ freq: 990, dur: 0.05, vol: 0.18, delay: 0.04 }); },
  error() { tone({ freq: 160, to: 90, dur: 0.18, vol: 0.25 }); },

  get muted() { return muted; },
  get musicOn() { return !muted && musicWanted; },
  setMuted(v) {
    muted = !!v;
    write(MUTE_KEY, muted ? '1' : '0');
    if (muted) { stopMusic(); ctx?.suspend(); }
    else { ensure(); if (musicWanted) startMusic(); }
    listeners.forEach((fn) => fn(muted));
  },
  toggle() { this.setMuted(!muted); if (!muted) this.click(); return muted; },
  toggleMusic() {
    musicWanted = !musicWanted;
    write(MUSIC_KEY, musicWanted ? '1' : '0');
    if (musicWanted) startMusic(); else stopMusic();
    listeners.forEach((fn) => fn(muted));
    return musicWanted;
  },
  /** Call after a user gesture (the sound gate). */
  enable() { this.setMuted(false); },
  onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
};
