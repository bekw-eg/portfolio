// ============================================================
//  sound.js — процедурные 8-bit звуки через Web Audio API.
//  Никаких аудиофайлов: квадратные/треугольные волны + шум.
// ============================================================

const STORAGE_KEY = 'mc-portfolio:muted';
let ctx = null;
let master = null;
let muted = readMuted();
const listeners = new Set();

function readMuted() {
  try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch { return false; }
}

function ensure() {
  if (muted) return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.22;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone({ freq = 440, to = null, type = 'square', dur = 0.08, vol = 0.5, delay = 0 }) {
  const ac = ensure();
  if (!ac) return;
  const t0 = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise({ dur = 0.12, vol = 0.4, freq = 1200, delay = 0 }) {
  const ac = ensure();
  if (!ac) return;
  const t0 = ac.currentTime + delay;
  const len = Math.floor(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  // «битый» шум: держим значение по 6 сэмплов — звучит 8-битно
  let v = 0;
  for (let i = 0; i < len; i++) { if (i % 6 === 0) v = Math.random() * 2 - 1; d[i] = v * (1 - i / len); }
  const src = ac.createBufferSource();
  src.buffer = buf;
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = freq;
  const g = ac.createGain();
  g.gain.value = vol;
  src.connect(filter).connect(g).connect(master);
  src.start(t0);
}

const NOTES = [523.25, 587.33, 659.25, 698.46, 783.99, 880, 987.77, 1046.5];

export const sound = {
  click() { tone({ freq: 880, to: 440, dur: 0.06, vol: 0.35 }); },
  hover() { tone({ freq: 1320, dur: 0.025, vol: 0.08, type: 'triangle' }); },
  slot(i = 0) { tone({ freq: NOTES[i % NOTES.length], dur: 0.07, vol: 0.3 }); },
  pop() { tone({ freq: 300, to: 900, dur: 0.09, vol: 0.3, type: 'triangle' }); },
  place(i = 0) { tone({ freq: 220 + i * 40, to: 160 + i * 30, dur: 0.06, vol: 0.3 }); noise({ dur: 0.05, vol: 0.15, freq: 900 }); },
  craft() {
    [0, 2, 4, 7].forEach((n, i) => tone({ freq: NOTES[n], dur: 0.12, vol: 0.28, delay: i * 0.07 }));
  },
  levelUp() {
    [0, 4, 7, 4, 7].forEach((n, i) => tone({ freq: NOTES[n] * (i > 2 ? 2 : 1), dur: 0.14, vol: 0.25, type: 'triangle', delay: i * 0.09 }));
  },
  advancement() {
    [4, 5, 7].forEach((n, i) => tone({ freq: NOTES[n], dur: 0.18, vol: 0.22, type: 'square', delay: i * 0.1 }));
  },
  breakBlock(name = '') {
    const soft = /leaves|grass|dirt|gravel/.test(name);
    noise({ dur: soft ? 0.1 : 0.16, vol: 0.5, freq: soft ? 700 : 1800 });
    tone({ freq: soft ? 140 : 110, to: 60, dur: 0.1, vol: 0.25 });
  },
  chatOpen() { tone({ freq: 660, dur: 0.04, vol: 0.2 }); tone({ freq: 990, dur: 0.05, vol: 0.2, delay: 0.04 }); },
  error() { tone({ freq: 160, to: 90, dur: 0.18, vol: 0.3 }); },

  get muted() { return muted; },
  setMuted(v) {
    muted = !!v;
    try { localStorage.setItem(STORAGE_KEY, muted ? '1' : '0'); } catch { /* приватный режим */ }
    if (muted && ctx) ctx.suspend();
    listeners.forEach((fn) => fn(muted));
  },
  toggle() { this.setMuted(!muted); if (!muted) this.click(); return muted; },
  onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
};
