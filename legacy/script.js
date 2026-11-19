(() => {
'use strict';

/* =====================================================================
   ДАННЫЕ ПОРТФОЛИО — редактируй здесь
   ===================================================================== */
const PROFILE = {
  name: 'Егеубай Бердыбек',
  role: 'Software Engineer · Астана',
  splashes: ['Открыт к стажировкам!', 'Теперь с JavaScript!', 'Копай блоки!', '100% без багов*', 'Сделано в Астане!', 'Пиксель-перфект!'],
  about: [
    'Я Егеубай — начинающий software engineer из Астаны. Мне 17, учусь на 3 курсе Astana IT University College.',
    'Превращаю идеи в чистый, быстрый и живой софт. Люблю, когда интерфейс двигается с характером, а код под ним остаётся простым.'
  ],
  stats: [['Возраст', '17 лет'], ['Курс', '3-й'], ['Проектов', '10+']],
  quests: [
    { done: true,  title: 'Astana IT University College', text: '2024 — сейчас · Software Engineering: алгоритмы, ООП, базы данных, веб' },
    { done: true,  title: 'Первые реальные проекты', text: '2025 · Командные и личные проекты: от лендингов до full-stack' },
    { done: false, title: 'Стажировка / Junior', text: 'Далее · Ищу команду, где можно быстро расти и делать полезные продукты' }
  ],
  // level: 1–5
  skills: [
    { name: 'HTML / CSS',  level: 5, color: '#e8672c', desc: 'Адаптивная вёрстка, анимации, pixel-perfect.' },
    { name: 'JavaScript',  level: 4, color: '#f1d43a', desc: 'Интерактив, DOM, Canvas, логика интерфейсов.' },
    { name: 'TypeScript',  level: 3, color: '#3b7fd4', desc: 'Типизация, чтобы ловить баги до запуска.' },
    { name: 'React',       level: 3, color: '#5fd8f5', desc: 'Компоненты, хуки, SPA.' },
    { name: 'Python',      level: 4, color: '#3d74b5', desc: 'Скрипты, бэкенд, алгоритмы.' },
    { name: 'Java',        level: 3, color: '#d9452f', desc: 'ООП и учебные проекты.' },
    { name: 'Node.js',     level: 3, color: '#6cbf43', desc: 'REST API и серверная логика.' },
    { name: 'SQL / PostgreSQL', level: 3, color: '#8a6cd1', desc: 'Проектирование таблиц и запросы.' },
    { name: 'Git / GitHub', level: 4, color: '#f05133', desc: 'Ветки, PR, командная работа.' },
    { name: 'Figma',       level: 3, color: '#c45bf0', desc: 'Макеты и прототипы интерфейсов.' },
    { name: 'Motion',      level: 4, color: '#ff5fa2', desc: 'CSS-анимации, Canvas, микро-взаимодействия.' },
    { name: 'Linux / Docker', level: 2, color: '#9aa5b1', desc: 'Терминал, контейнеры, деплой.' }
  ],
  projects: [
    { title: 'Проект Один',    desc: 'Короткое описание: что делает проект и какую задачу решает.', tags: ['Web App', '2026'], link: '#' },
    { title: 'Проект Два',     desc: 'Короткое описание: что делает проект и какую задачу решает.', tags: ['Backend', 'API'], link: '#' },
    { title: 'Проект Три',     desc: 'Короткое описание: что делает проект и какую задачу решает.', tags: ['Mobile', 'UI'], link: '#' },
    { title: 'Проект Четыре',  desc: 'Короткое описание: что делает проект и какую задачу решает.', tags: ['Motion', 'Canvas'], link: '#' }
  ],
  contacts: [
    { label: 'GitHub',    value: 'github.com/…', href: '#' },
    { label: 'Telegram',  value: '@…',           href: '#' },
    { label: 'Instagram', value: '@…',           href: '#' },
    { label: 'LinkedIn',  value: 'linkedin.com/in/…', href: '#' }
  ]
};

const PHRASES = [
  'Hi!', 'Привет-привет!', 'Попробуй найти алмазную руду!', 'Загляни в сундуки с проектами!',
  'Жми клавиши 1–7 для быстрого доступа', 'Ночью тут красиво. Нажми 7!', 'На дереве растут яблоки...',
  'Я машу, потому что рад тебя видеть!', 'Каждый уровень — новая ачивка!'
];

/* ===================================================================== */
const $ = (s, r = document) => r.querySelector(s);
const scene = $('#scene'), ground = $('#ground'), hero = $('#hero'), bubble = $('#bubble'), tree = $('#tree');
const overlay = $('#overlay'), panelBody = $('#panelBody');
const R = Math.random;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
function rng(seed) { let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* ---------- Состояние ---------- */
const SAVE_KEY = 'pixel-portfolio-v1';
const fresh = () => ({ xp: 0, blocks: 0, steve: 0, muted: false, night: false, visited: new Set(), ach: new Set() });
let state = fresh();
try {
  const d = JSON.parse(localStorage.getItem(SAVE_KEY));
  if (d) state = Object.assign(fresh(), d, { visited: new Set(d.visited || []), ach: new Set(d.ach || []) });
} catch (e) { /* хранилище недоступно — играем без сохранения */ }
function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ ...state, visited: [...state.visited], ach: [...state.ach] })); } catch (e) {}
}

/* ---------- Звук (WebAudio, без файлов) ---------- */
let actx = null;
function ac() {
  if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
  if (actx.state === 'suspended') actx.resume();
  return actx;
}
function tone(f, dur = .08, type = 'square', vol = .05, when = 0, to) {
  if (state.muted) return; const a = ac(); if (!a) return;
  const t = a.currentTime + when, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + .02);
}
function noise(dur = .1, vol = .15, freq = 800) {
  if (state.muted) return; const a = ac(); if (!a) return;
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (R() * 2 - 1) * (1 - i / d.length);
  const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  s.buffer = buf; f.type = 'lowpass'; f.frequency.value = freq; g.gain.value = vol;
  s.connect(f).connect(g).connect(a.destination); s.start();
}
const sfx = {
  click: () => tone(560, .05, 'square', .035),
  hit: () => noise(.06, .14, 700 + R() * 300),
  brk: () => noise(.2, .22, 520),
  xp: () => tone(1500 + R() * 600, .07, 'sine', .045, 0, 2300),
  level: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, .14, 'square', .045, i * .09)),
  ach: () => { tone(784, .12, 'square', .045); tone(1175, .22, 'square', .045, .12); },
  talk: () => tone(260 + R() * 220, .035, 'square', .02),
  open: () => tone(200, .1, 'triangle', .08, 0, 340),
  nope: () => tone(160, .12, 'square', .04)
};

/* ---------- Процедурные текстуры 16×16 ---------- */
const PAL = {
  dirt: ['#866043', '#79553a', '#966c4a', '#6c4a30', '#8b6646'],
  grass: ['#5d9c33', '#6aab3c', '#4f8a2b', '#76b544'],
  stone: ['#7d7d7d', '#737373', '#868686', '#6a6a6a', '#8f8f8f'],
  plank: ['#a0814d', '#9a7b48', '#ab8b55', '#947544']
};
const TYPES = {
  grass:   { hits: 2, xp: 1, col: '#5d9c33' },
  dirt:    { hits: 2, xp: 1, col: '#866043' },
  stone:   { hits: 3, xp: 2, col: '#7d7d7d' },
  coal:    { hits: 3, xp: 3, col: '#2b2b2b', ore: ['#262626', '#3b3b3b', '#1a1a1a'] },
  gold:    { hits: 4, xp: 6, col: '#fcee4b', ore: ['#fcee4b', '#e8a92a', '#fff7a1'] },
  emerald: { hits: 4, xp: 10, col: '#17dd62', ore: ['#17dd62', '#0f9a44', '#9cffc0'] },
  diamond: { hits: 5, xp: 15, col: '#5decf5', ore: ['#5decf5', '#2bc6c9', '#d2fffb'] }
};
function makeTex(kind, seed) {
  const r = rng(seed * 7919 + kind.charCodeAt(0) * 131), c = cv(16, 16), x = c.getContext('2d');
  const put = (i, j, col) => { x.fillStyle = col; x.fillRect(i, j, 1, 1); };
  const pick = p => p[Math.floor(r() * p.length)];
  const depth = Array.from({ length: 16 }, () => 2 + Math.floor(r() * 3));
  for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) {
    let p = PAL.stone;
    if (kind === 'dirt') p = PAL.dirt;
    else if (kind === 'grass') p = j < depth[i] ? PAL.grass : PAL.dirt;
    else if (kind === 'plank') p = (j % 4 === 3) ? ['#6e5531'] : PAL.plank;
    put(i, j, pick(p));
  }
  if (kind === 'plank') for (let b = 0; b < 4; b++) { const jx = (b * 5 + 3) % 16; for (let j = b * 4; j < b * 4 + 3; j++) put(jx, j, '#7a5f36'); }
  const t = TYPES[kind];
  if (t && t.ore) {
    const n = 3 + Math.floor(r() * 2);
    for (let k = 0; k < n; k++) {
      const cx = 1 + Math.floor(r() * 12), cy = 1 + Math.floor(r() * 12);
      [[0, 0], [1, 0], [0, 1], [1, 1], [2, 1], [1, 2]].forEach(([dx, dy]) => { if (r() < .8) put(cx + dx, cy + dy, pick(t.ore)); });
    }
  }
  return c.toDataURL();
}
const TEX = {};
const texFor = kind => (TEX[kind] ||= [1, 2, 3, 4].map(s => makeTex(kind, s)))[Math.floor(R() * 4)];

// трещины — 4 стадии
const CRACKS = (() => {
  const r = rng(42), c = cv(16, 16), x = c.getContext('2d'), out = [];
  x.fillStyle = 'rgba(0,0,0,.62)';
  const w = [[8, 8, 1, 1], [8, 8, -1, 1], [8, 8, 1, -1], [8, 8, -1, -1], [7, 9, 1, 0]];
  for (let s = 0; s < 4; s++) {
    for (let k = 0; k < 5; k++) w.forEach(p => {
      if (r() < .65) { p[0] += p[2]; p[1] += p[3]; } else { p[0] += Math.floor(r() * 3) - 1; p[1] += Math.floor(r() * 3) - 1; }
      p[0] = Math.max(0, Math.min(15, p[0])); p[1] = Math.max(0, Math.min(15, p[1]));
      x.fillRect(p[0], p[1], 1, 1);
    });
    out.push(c.toDataURL());
  }
  return out;
})();

/* ---------- Пиксельные спрайты 10×10 ---------- */
const SPR = {
  book:   ['.BBBBBBBB.', '.BRRRRRRB.', '.BRYYYYRB.', '.BRRRRRRB.', '.BRYYYRRB.', '.BRRRRRRB.', '.BRRRRRRB.', '.BRRRRRRB.', '.BWWWWWWWB', '..BBBBBBBB'],
  pick:   ['.DDDDDDDD.', 'DDdSSdDDDd', 'Dd..SS..dD', '....SS....', '....SS....', '....Ss....', '....SS....', '....Ss....', '....SS....', '....ss....'],
  chest:  ['.KKKKKKKK.', '.KOOOOOOK.', '.KOoOOOOK.', '.KKKGGKKK.', '.KOOGGOOK.', '.KOOOOOOK.', '.KOOOOoOK.', '.KOOOOOOK.', '.KKKKKKKK.', '..........'],
  sign:   ['KKKKKKKKKK', 'KOOOOOOOOK', 'KOkkkkkkOK', 'KOOOOOOOOK', 'KOkkkkkOOK', 'KOOOOOOOOK', 'KKKKKKKKKK', '....KK....', '....KK....', '....KK....'],
  trophy: ['.YYYYYYYY.', 'YYyyyyyyYY', 'Y.YyyyyY.Y', '.YYyyyyYY.', '..YyyyyY..', '...YyyY...', '....YY....', '....YY....', '..YYYYYY..', '..KKKKKK..'],
  note:   ['...NNNNNNN', '...NNNNNNN', '...N.....N', '...N.....N', '...N.....N', '...N.....N', '.NNN...NNN', 'NNNN..NNNN', 'NNNN..NNNN', '.NN....NN.'],
  sun:    ['....Y.....', '.Y..Y..Y..', '..YYYYYY..', '..YyyyyY..', 'YYYyyyyYYY', '..YyyyyY..', '..YYYYYY..', '.Y..Y..Y..', '....Y.....', '..........'],
  moon:   ['..MMMM....', '.MMMmM....', 'MMMm......', 'MMm.......', 'MMm.......', 'MMm.......', 'MMMm....M.', '.MMMmmMM..', '..MMMMM...', '..........'],
  gem:    ['....HH....', '...HLLM...', '..HLLMMM..', '.HLLMMMMD.', 'HLLMMMMMDD', '.LMMMMMDD.', '..MMMMDD..', '...MMDD...', '....DD....', '..........']
};
const SPAL = {
  B: '#3b2516', R: '#8a3b2a', Y: '#f0d060', W: '#e8e1cf', D: '#4fe3e0', d: '#2aa9a6', S: '#7a5428', s: '#5a3d1c',
  K: '#4a3013', O: '#a5702b', o: '#bd8434', G: '#f6d84a', k: '#3a2410', y: '#ffe98a', N: '#5fd8ff', M: '#e9ecf5', m: '#b9c0d0'
};
function sprite(name, pal = SPAL) {
  const rows = SPR[name], c = cv(rows[0].length, rows.length), x = c.getContext('2d');
  rows.forEach((row, j) => [...row].forEach((ch, i) => { const col = pal[ch]; if (col && ch !== '.') { x.fillStyle = col; x.fillRect(i, j, 1, 1); } }));
  return c;
}
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16), f = v => Math.max(0, Math.min(255, Math.round(v + amt * 255)));
  return '#' + [f(n >> 16), f(n >> 8 & 255), f(n & 255)].map(v => v.toString(16).padStart(2, '0')).join('');
}
const gemPal = hex => ({ H: '#ffffff', L: shade(hex, .22), M: hex, D: shade(hex, -.28) });

// курсор-кирка и фоновые текстуры
(() => {
  const s = sprite('pick'), c = cv(30, 30), x = c.getContext('2d');
  x.imageSmoothingEnabled = false; x.drawImage(s, 0, 0, 30, 30);
  const root = document.documentElement.style;
  root.setProperty('--pick-cursor', `url(${c.toDataURL()}) 15 3, crosshair`);
  root.setProperty('--stone', `url(${makeTex('stone', 9)})`);
  root.setProperty('--dirt', `url(${makeTex('dirt', 5)})`);
  root.setProperty('--plank', `url(${makeTex('plank', 3)})`);
})();

/* ---------- Небо ---------- */
(() => {
  const clouds = $('#clouds');
  for (let i = 0; i < 6; i++) {
    const c = document.createElement('div'); c.className = 'cloud';
    const w = 120 + R() * 160, dur = 60 + R() * 70;
    Object.assign(c.style, { top: (4 + R() * 30) + '%', width: w + 'px', animationDuration: dur + 's', animationDelay: (-R() * dur) + 's' });
    clouds.append(c);
  }
  const stars = $('#stars');
  for (let i = 0; i < 70; i++) {
    const s = document.createElement('div'); s.className = 'star';
    s.style.left = (R() * 100) + '%'; s.style.top = (R() * 62) + '%';
    stars.append(s);
  }
})();

/* ---------- Текст меню ---------- */
$('#logo').textContent = PROFILE.name;
$('#role').textContent = PROFILE.role;
const splash = $('#splash');
let splashI = Math.floor(R() * PROFILE.splashes.length);
splash.textContent = PROFILE.splashes[splashI];
splash.addEventListener('click', () => { splashI = (splashI + 1) % PROFILE.splashes.length; splash.textContent = PROFILE.splashes[splashI]; sfx.click(); });

/* ---------- Речь и анимации Стива ---------- */
let sayTimer, typeTimer, waveTimer, lastAct = Date.now();
function say(text, hold = 3200) {
  clearTimeout(sayTimer); clearInterval(typeTimer);
  bubble.hidden = false;
  bubble.classList.toggle('big', text.length <= 4);
  bubble.classList.remove('pop'); void bubble.offsetWidth; bubble.classList.add('pop');
  const typed = document.createElement('span'), ghost = document.createElement('span');
  ghost.className = 'ghost'; ghost.textContent = text; bubble.replaceChildren(typed, ghost);
  hero.classList.add('talking');
  let i = 0;
  typeTimer = setInterval(() => {
    i++; typed.textContent = text.slice(0, i); ghost.textContent = text.slice(i);
    if (i % 2) sfx.talk();
    if (i >= text.length) {
      clearInterval(typeTimer); hero.classList.remove('talking');
      sayTimer = setTimeout(() => { bubble.hidden = true; }, hold);
    }
  }, 38);
}
function wave(ms = 1800) {
  clearTimeout(waveTimer); hero.classList.add('waving');
  waveTimer = setTimeout(() => hero.classList.remove('waving'), ms);
}
function jump() { hero.classList.remove('jump'); void hero.offsetWidth; hero.classList.add('jump'); }

function poke() {
  lastAct = Date.now();
  state.steve++; jump(); wave(1400);
  say(state.steve === 1 ? 'Hi! Рад знакомству!' : PHRASES[Math.floor(R() * PHRASES.length)]);
  unlock('hello');
  const r = hero.getBoundingClientRect();
  addXP(1, r.left + r.width / 2, r.top + r.height * .3);
}
hero.addEventListener('click', poke);
hero.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); poke(); } });

/* ---------- Опыт ---------- */
const need = l => 8 + l * 4;
function levelInfo(xp) { let l = 0; while (xp >= need(l)) { xp -= need(l); l++; } return { level: l, cur: xp, need: need(l) }; }
function renderXP() {
  const L = levelInfo(state.xp);
  $('#lvl').textContent = L.level;
  $('#xpfill').style.width = (L.cur / L.need * 100) + '%';
}
function floatText(text, x, y) {
  const f = document.createElement('div'); f.className = 'float'; f.textContent = text;
  f.style.left = x + 'px'; f.style.top = y + 'px'; document.body.append(f);
  f.animate([{ transform: 'translate(-50%,0)', opacity: 1 }, { transform: 'translate(-50%,-50px)', opacity: 0 }], { duration: 900, easing: 'ease-out' }).onfinish = () => f.remove();
}
function addXP(n, x, y) {
  const bar = $('#xpbar').getBoundingClientRect(), tx = bar.left + bar.width / 2, ty = bar.top + 4;
  const k = Math.min(8, Math.max(1, Math.ceil(n / 2)));
  floatText('+' + n + ' XP', x, y - 10);
  for (let i = 0; i < k; i++) {
    const o = document.createElement('div'); o.className = 'orb';
    o.style.left = x + 'px'; o.style.top = y + 'px'; document.body.append(o);
    const sx = (R() - .5) * 70, sy = -25 - R() * 45;
    o.animate([
      { transform: 'translate(0,0)' },
      { transform: `translate(${sx}px,${sy}px)`, offset: .35 },
      { transform: `translate(${tx - x}px,${ty - y}px) scale(.6)` }
    ], { duration: 650 + i * 70, easing: 'ease-in' }).onfinish = () => { o.remove(); sfx.xp(); };
  }
  const before = levelInfo(state.xp).level;
  state.xp += n; save();
  setTimeout(() => {
    renderXP();
    const after = levelInfo(state.xp).level;
    if (after > before) {
      sfx.level(); const lv = $('#lvl'); lv.classList.remove('up'); void lv.offsetWidth; lv.classList.add('up');
      say('Новый уровень: ' + after + '!'); wave(1500);
      checkAch();
    }
  }, 750);
}

/* ---------- Достижения ---------- */
const ACH = [
  { id: 'hello',    name: 'Привет, Стив!',  desc: 'Кликни по персонажу' },
  { id: 'first',    name: 'Первый шаг',     desc: 'Открой любой раздел' },
  { id: 'explorer', name: 'Исследователь',  desc: 'Загляни во все четыре раздела' },
  { id: 'chest',    name: 'Кладоискатель',  desc: 'Открой сундук с проектом' },
  { id: 'miner',    name: 'Шахтёр',         desc: 'Сломай 10 блоков' },
  { id: 'diamond',  name: 'Алмазы!',        desc: 'Добудь алмазную руду' },
  { id: 'apple',    name: 'Садовник',       desc: 'Сорви яблоко с дерева' },
  { id: 'night',    name: 'Сова',           desc: 'Включи ночь' },
  { id: 'level5',   name: 'Опытный',        desc: 'Достигни 5 уровня' }
];
function toast(a) {
  const t = document.createElement('div'); t.className = 'toast';
  t.append(sprite('trophy'));
  const d = document.createElement('div');
  d.innerHTML = `<div class="h">Достижение получено!</div><div class="n">${esc(a.name)}</div>`;
  t.append(d); $('#toasts').append(t);
  setTimeout(() => t.remove(), 4300);
}
function unlock(id) {
  if (state.ach.has(id)) return;
  state.ach.add(id); save();
  toast(ACH.find(a => a.id === id)); sfx.ach();
  if (current === 'achievements') PANELS.achievements.render(panelBody);
}
function checkAch() {
  if (state.visited.size >= 1) unlock('first');
  if (state.visited.size >= 4) unlock('explorer');
  if (state.blocks >= 10) unlock('miner');
  if (levelInfo(state.xp).level >= 5) unlock('level5');
}

/* ---------- Земля и копание ---------- */
function rollType(row) {
  if (row === 0) return 'grass';
  if (row === 1) return R() < .25 ? 'stone' : 'dirt';
  const x = R();
  if (x < .05) return 'diamond'; if (x < .11) return 'gold'; if (x < .16) return 'emerald'; if (x < .3) return 'coal';
  return 'stone';
}
function setType(el, type) {
  el.dataset.type = type; el.dataset.dmg = 0;
  el.style.backgroundImage = `url(${texFor(type)})`;
  el.style.removeProperty('--crack');
  el.setAttribute('aria-label', 'Блок: ' + type);
}
function buildGround() {
  const B = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--b')) || 64;
  const cols = Math.ceil(innerWidth / B) + 1;
  ground.style.gridTemplateColumns = `repeat(${cols}, ${B}px)`;
  const frag = document.createDocumentFragment();
  for (let row = 0; row < 3; row++) for (let col = 0; col < cols; col++) {
    const b = document.createElement('div'); b.className = 'block';
    b.dataset.row = row; setType(b, rollType(row)); frag.append(b);
  }
  ground.replaceChildren(frag);
  markProtected();
}
function markProtected() {
  const rects = [hero, tree].map(e => e.getBoundingClientRect());
  ground.querySelectorAll('.block[data-row="0"]').forEach(b => {
    const r = b.getBoundingClientRect();
    b.classList.toggle('protected', rects.some(h => r.right > h.left + h.width * .2 && r.left < h.right - h.width * .2));
  });
}
function particles(x, y, color, n = 10) {
  for (let i = 0; i < n; i++) {
    const p = document.createElement('div'); p.className = 'particle';
    p.style.left = x + 'px'; p.style.top = y + 'px';
    p.style.background = i % 3 ? color : shade(color, -.2);
    document.body.append(p);
    const dx = (R() - .5) * 120, dy = -30 - R() * 70;
    p.animate([
      { transform: 'translate(0,0)' },
      { transform: `translate(${dx * .6}px,${dy}px)`, offset: .4 },
      { transform: `translate(${dx}px,${dy + 110}px)`, opacity: 0 }
    ], { duration: 600 + R() * 300, easing: 'ease-out' }).onfinish = () => p.remove();
  }
}
ground.addEventListener('click', e => {
  const el = e.target.closest('.block'); if (!el || el.classList.contains('air')) return;
  lastAct = Date.now();
  if (el.classList.contains('protected')) {
    el.classList.remove('nope'); void el.offsetWidth; el.classList.add('nope'); sfx.nope();
    say(el.getBoundingClientRect().left < innerWidth / 2 ? 'Эй! Не копай под меня!' : 'Дерево пусть растёт :)');
    return;
  }
  const t = TYPES[el.dataset.type], dmg = (+el.dataset.dmg || 0) + 1;
  el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit');
  if (dmg < t.hits) {
    el.dataset.dmg = dmg; sfx.hit();
    el.style.setProperty('--crack', `url(${CRACKS[Math.min(3, Math.floor(dmg / t.hits * 4))]})`);
    return;
  }
  // блок сломан
  sfx.brk();
  const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  particles(cx, cy, t.col);
  const type = el.dataset.type;
  el.classList.add('air'); el.style.backgroundImage = ''; el.style.removeProperty('--crack');
  state.blocks++;
  addXP(t.xp, cx, cy);
  if (type === 'diamond') { unlock('diamond'); say('АЛМАЗЫ!!!'); wave(1600); }
  else if (state.blocks === 1) say('Отлично! Копай дальше — внизу руда.');
  checkAch();
  const row = +el.dataset.row;
  setTimeout(() => { el.classList.remove('air'); setType(el, rollType(row)); el.classList.remove('regen'); void el.offsetWidth; el.classList.add('regen'); }, 7000 + R() * 5000);
});

/* ---------- Дерево ---------- */
let appleReady = true;
tree.addEventListener('click', () => {
  lastAct = Date.now();
  tree.classList.remove('shake'); void tree.offsetWidth; tree.classList.add('shake');
  const r = tree.getBoundingClientRect();
  particles(r.left + r.width / 2, r.top + r.height * .25, '#3f8f2a', 8);
  sfx.hit();
  if (!appleReady) { say('Яблоки ещё не выросли...'); return; }
  appleReady = false; tree.classList.add('picked');
  say('Ням! Яблоко.'); unlock('apple');
  addXP(3, r.left + r.width / 2, r.top + r.height * .3);
  setTimeout(() => { appleReady = true; tree.classList.remove('picked'); }, 15000);
});

/* ---------- Окна разделов ---------- */
let current = null;
const SECTIONS = ['about', 'skills', 'projects', 'contacts'];
const roman = ['I', 'II', 'III', 'IV', 'V'];

const PANELS = {
  about: { title: 'Обо мне', render(b) {
    b.innerHTML = `
      <div class="about">
        <div class="well">${PROFILE.about.map(p => `<p>${esc(p)}</p>`).join('')}</div>
        <div class="stats">${PROFILE.stats.map(([k, v]) => `<div class="well stat">${esc(k)}<b>${esc(v)}</b></div>`).join('')}</div>
        <div class="sub">Журнал квестов</div>
        <div class="well quests">${PROFILE.quests.map(q => `
          <div class="quest ${q.done ? '' : 'todo'}"><span class="chk">${q.done ? '✓' : ''}</span>
            <div><b>${esc(q.title)}</b><small>${esc(q.text)}</small></div></div>`).join('')}
        </div>
      </div>`;
  } },

  skills: { title: 'Инвентарь навыков', render(b) {
    b.innerHTML = `<div class="inv" role="list"></div><div class="mc-tip skill-detail" aria-live="polite"></div>
      <p class="muted">Наведи или нажми на предмет. Число в слоте — уровень от 1 до 5.</p>`;
    const inv = $('.inv', b), det = $('.skill-detail', b);
    PROFILE.skills.forEach((s, i) => {
      const btn = document.createElement('button'); btn.className = 'islot'; btn.setAttribute('aria-label', s.name);
      btn.append(sprite('gem', gemPal(s.color)));
      btn.insertAdjacentHTML('beforeend', `<span class="cnt">${s.level}</span>`);
      const show = () => {
        inv.querySelectorAll('.sel').forEach(e => e.classList.remove('sel')); btn.classList.add('sel');
        det.innerHTML = `<div class="name">${esc(s.name)}</div>
          <div class="pips">${[1, 2, 3, 4, 5].map(n => `<span class="pip ${n <= s.level ? 'on' : ''}"></span>`).join('')}</div>
          <div class="ench">Мастерство ${roman[s.level - 1]}</div><div class="lore">${esc(s.desc)}</div>`;
      };
      btn.addEventListener('mouseenter', show); btn.addEventListener('focus', show);
      btn.addEventListener('click', () => { show(); sfx.click(); });
      inv.append(btn); if (i === 0) show();
    });
  } },

  projects: { title: 'Сундуки с проектами', render(b) {
    b.innerHTML = `<div class="chests"></div>`;
    const list = $('.chests', b);
    PROFILE.projects.forEach(p => {
      const card = document.createElement('article'); card.className = 'well chest';
      card.append(sprite('chest'));
      const info = document.createElement('div');
      info.innerHTML = `<h3>${esc(p.title)}</h3><p>${esc(p.desc)}</p>
        <div class="tags">${p.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>
        <a class="mc-btn small" href="${esc(p.link)}" target="_blank" rel="noopener">Открыть ↗</a>`;
      card.append(info);
      card.addEventListener('click', () => {
        card.classList.remove('opened'); void card.offsetWidth; card.classList.add('opened');
        sfx.open(); unlock('chest');
      });
      list.append(card);
    });
  } },

  contacts: { title: 'Контакты', render(b) {
    b.innerHTML = `<div class="signs">${PROFILE.contacts.map(c =>
      `<a class="sign" href="${esc(c.href)}" target="_blank" rel="noopener"><span class="k">${esc(c.label)}</span><span class="v">${esc(c.value)}</span></a>`).join('')}</div>
      <p class="muted">Давай сделаем что-то вместе — пиши в любой из каналов.</p>`;
  } },

  achievements: { title: 'Достижения', render(b) {
    const got = ACH.filter(a => state.ach.has(a.id)).length;
    b.innerHTML = `<div class="achs"></div>
      <div class="ach-foot"><span>Открыто: <b>${got}</b> из ${ACH.length} · Уровень ${levelInfo(state.xp).level} · Блоков: ${state.blocks}</span>
      <button class="mc-btn small danger" id="resetBtn">Начать заново</button></div>`;
    const list = $('.achs', b);
    ACH.forEach(a => {
      const row = document.createElement('div'); row.className = 'well ach' + (state.ach.has(a.id) ? '' : ' locked');
      row.append(sprite('trophy'));
      row.insertAdjacentHTML('beforeend', `<div><b>${esc(a.name)}</b><span>${esc(a.desc)}</span></div>`);
      list.append(row);
    });
    const reset = $('#resetBtn', b); let armed = false;
    reset.addEventListener('click', () => {
      if (!armed) { armed = true; reset.textContent = 'Точно? Нажми ещё раз'; setTimeout(() => { armed = false; reset.textContent = 'Начать заново'; }, 3000); return; }
      const muted = state.muted; state = fresh(); state.muted = muted;
      try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
      save(); renderXP(); applyNight(); PANELS.achievements.render(b); sfx.click();
    });
  } }
};

function openPanel(id) {
  const p = PANELS[id]; if (!p) return;
  lastAct = Date.now(); current = id;
  sfx.open();
  $('#panelTitle').textContent = p.title;
  p.render(panelBody);
  overlay.hidden = false; panelBody.parentElement.scrollTop = 0;
  setActive(id);
  if (SECTIONS.includes(id) && !state.visited.has(id)) {
    state.visited.add(id);
    addXP(5, innerWidth / 2, innerHeight / 2);
  }
  checkAch(); save();
  $('#closeBtn').focus({ preventScroll: true });
}
function closePanel() { overlay.hidden = true; current = null; sfx.click(); }
$('#closeBtn').addEventListener('click', closePanel);
overlay.addEventListener('click', e => { if (e.target === overlay) closePanel(); });
document.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => openPanel(b.dataset.open)));

/* ---------- Хотбар ---------- */
function applyNight() {
  scene.classList.toggle('night', state.night);
  const slot = hotbar.children[6]; if (slot) slot.querySelector('canvas').replaceWith(sprite(state.night ? 'moon' : 'sun'));
}
function toggleTime() { state.night = !state.night; applyNight(); sfx.click(); if (state.night) { unlock('night'); say('Спокойной ночи!'); } save(); }
function toggleSound() { state.muted = !state.muted; hotbar.children[5].classList.toggle('muted', state.muted); save(); if (!state.muted) sfx.click(); }

const SLOTS = [
  { id: 'about', name: 'Обо мне', icon: 'book' },
  { id: 'skills', name: 'Навыки', icon: 'pick' },
  { id: 'projects', name: 'Проекты', icon: 'chest' },
  { id: 'contacts', name: 'Контакты', icon: 'sign' },
  { id: 'achievements', name: 'Достижения', icon: 'trophy' },
  { id: 'sound', name: 'Звук вкл/выкл', icon: 'note', action: toggleSound },
  { id: 'time', name: 'День / ночь', icon: 'sun', action: toggleTime },
  {}, {}
];
const hotbar = $('#hotbar');
SLOTS.forEach((s, i) => {
  const b = document.createElement('button'); b.className = 'slot' + (s.id ? '' : ' empty');
  b.dataset.id = s.id || '';
  if (s.id) {
    b.setAttribute('aria-label', s.name);
    b.append(sprite(s.icon));
    b.insertAdjacentHTML('beforeend', `<span class="num">${i + 1}</span><span class="tip mc-tip">${esc(s.name)}</span>`);
    b.addEventListener('click', () => activate(i));
  } else b.tabIndex = -1;
  hotbar.append(b);
});
function setActive(id) { [...hotbar.children].forEach(c => c.classList.toggle('active', !!id && c.dataset.id === id)); }
function activate(i) {
  const s = SLOTS[i]; if (!s || !s.id) return;
  if (s.action) { s.action(); return; }
  openPanel(s.id);
}
hotbar.children[5].classList.toggle('muted', state.muted);
applyNight();

addEventListener('keydown', e => {
  if (e.key === 'Escape' && !overlay.hidden) { closePanel(); return; }
  if (e.target.closest('input,textarea') || e.ctrlKey || e.metaKey || e.altKey) return;
  const n = parseInt(e.key, 10);
  if (n >= 1 && n <= 9) activate(n - 1);
});

/* ---------- Подсказки, если пользователь заскучал ---------- */
setInterval(() => {
  if (!overlay.hidden || Date.now() - lastAct < 22000) return;
  lastAct = Date.now(); wave(1500); say(PHRASES[1 + Math.floor(R() * (PHRASES.length - 1))]);
}, 5000);

/* ---------- Старт ---------- */
buildGround(); renderXP();
let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(buildGround, 200); });

const loader = $('#loader'), fill = $('#loadFill'), tip = $('#loadTip');
const tips = ['Строим рельеф...', 'Сажаем деревья...', 'Прячем алмазы...', 'Будим Стива...'];
let prog = 0;
const tick = setInterval(() => {
  prog = Math.min(100, prog + 6 + R() * 12);
  fill.style.width = prog + '%';
  tip.textContent = tips[Math.min(tips.length - 1, Math.floor(prog / 26))];
  if (prog >= 100) {
    clearInterval(tick);
    setTimeout(() => {
      loader.classList.add('done'); setTimeout(() => loader.remove(), 500);
      setTimeout(() => { wave(2600); say('Hi!', 1100); }, 350);
      setTimeout(() => say('Я ' + PROFILE.name.split(' ')[0] + '. Добро пожаловать в мой мир!', 2600), 2300);
      setTimeout(() => say('Кликай по блокам — их можно копать!', 3000), 7600);
      lastAct = Date.now();
    }, 250);
  }
}, 90);

})();
