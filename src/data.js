// ============================================================
//  data.js — all portfolio content in one place.
//  Edit texts, projects, links and contacts here.
// ============================================================

export const profile = {
  name: 'Berdibek Egeubay',
  role: 'Full-stack & Game Developer',
  tagline: 'I build web platforms, games and tools — from the server down to the last pixel.',
  location: 'Astana, Kazakhstan',
  // Put your PDF into public/cv/ and adjust the path.
  cvUrl: 'cv/Berdibek_Egeubay_CV.pdf',
  cvFileName: 'Berdibek_Egeubay_CV.pdf',
};

export const contacts = [
  { id: 'github',   label: 'GitHub',   value: '@bekw-eg',                  href: 'https://github.com/bekw-eg',       icon: 'github' },
  { id: 'telegram', label: 'Telegram', value: '@zdeathbecaq',              href: 'https://t.me/zdeathbecaq',         icon: 'telegram' },
  { id: 'email',    label: 'Email',    value: 'berdibekegeubai@gmail.com', href: 'mailto:berdibekegeubai@gmail.com', icon: 'email' },
];

// Hotbar: id → item icon from textures.js. color = shard crystal colour in the Void.
export const stack = [
  {
    id: 'unity', color: '#e8ecff', name: 'C# / Unity', rarity: 'epic',
    lines: [
      'Gameplay, physics and UI for 2D/3D games',
      'Skin, boss and save systems',
      'Pixel-perfect rendering and animation',
    ],
  },
  {
    id: 'node', color: '#6cc24a', name: 'Node.js / JS', rarity: 'rare',
    lines: [
      'REST/WebSocket backends and real-time apps',
      'Frontend with Vanilla JS, Vite, Three.js',
      'Auth, rooms, state sync',
    ],
  },
  {
    id: 'python', color: '#ffd43b', name: 'Python', rarity: 'rare',
    lines: [
      'RAG pipelines and LLM prototypes',
      'Scraping, data analysis, automation',
      'Quick APIs with FastAPI/Flask',
    ],
  },
  {
    id: 'go', color: '#3fd4f0', name: 'Go', rarity: 'uncommon',
    lines: [
      'Lightweight services and CLI tools',
      'Concurrency with goroutines',
      'Fast HTTP handlers',
    ],
  },
  {
    id: 'docker', color: '#2f9bff', name: 'Docker', rarity: 'uncommon',
    lines: [
      'Containerized services and databases',
      'docker-compose dev environments',
      'Reproducible deploys',
    ],
  },
  {
    id: 'sqlite', color: '#7fb8e6', name: 'WebSockets / SQLite', rarity: 'rare',
    lines: [
      'State sync between clients',
      'Real-time voice, timers and chat',
      'Embedded DB with zero extra infra',
    ],
  },
  {
    id: 'blender', color: '#ff8a1f', name: 'Blender', rarity: 'uncommon',
    lines: [
      'Low-poly and voxel models',
      '.glb export for web and Unity',
      'Simple animations and renders',
    ],
  },
];

// Ingredient items used only in crafting recipes.
export const extraItems = {
  pixel: { name: 'Pixel Art' },
  rag:   { name: 'RAG' },
  voice: { name: 'Voice Chat' },
  tower: { name: 'Tower Defense' },
  apple: { name: 'Appi' },
  map:   { name: 'City Map' },
};

// Crafting-table projects. grid = 9 cells (null = empty), values are item ids.
export const projects = [
  {
    id: 'antistall',
    title: 'AntiStall',
    icon: 'clock',
    stack: ['Node.js', 'WebSockets', 'SQLite'],
    grid: [
      null,     'node',  null,
      'sqlite', 'voice', 'sqlite',
      null,     'tower', null,
    ],
    summary: 'A teamwork platform that fights procrastination.',
    features: [
      'Pomodoro timer synced across the whole team',
      'Built-in voice chat for every room',
      'Task roadmap with progress tracking',
      'Tower Defense mini-game for breaks',
    ],
    links: { code: '', demo: '' },
  },
  {
    id: 'trapple',
    title: 'Trapple',
    icon: 'apple',
    stack: ['C#', 'Unity', 'Pixel Art'],
    grid: [
      'pixel', 'apple', 'pixel',
      'unity', 'unity', 'unity',
      null,    'pixel', null,
    ],
    summary: 'A 2D platformer about Appi the apple.',
    features: [
      'Several worlds with unique mechanics',
      'Bosses with attack patterns',
      'Skin wardrobe',
      'Throwing mechanic',
    ],
    links: { code: 'https://github.com/bekw-eg/Trapple', demo: '' },
  },
  {
    id: 'aicity',
    title: 'AI City Advisor',
    icon: 'compass',
    stack: ['Python', 'RAG'],
    grid: [
      null,     'map',    null,
      'python', 'rag',    'python',
      null,     'python', null,
    ],
    summary: 'A smart city guide — concept and prototype built at a hackathon.',
    features: [
      'Recommends places based on your interests',
      'RAG over a base of places and reviews',
      'Built by a team during a hackathon',
    ],
    links: { code: '', demo: '' },
  },
];

// The Path: journey stops shown as floating islands. status: done | now | next
export const journey = [
  {
    id: 'college', icon: 'book', status: 'done', when: 'Ongoing',
    title: 'AITU College',
    desc: 'Software Engineering: algorithms, web, databases and team projects.',
  },
  {
    id: 'practice', icon: 'pickaxe', status: 'done', when: 'Internship',
    title: 'Industrial Internship',
    desc: 'Development and game design — from mechanics and balance to production code.',
  },
  {
    id: 'datathon', icon: 'diamond', status: 'now', when: "Oct '26",
    title: "DATATHON '26",
    desc: '24 hours with a real dataset: find the signal, build the model, pitch it to the jury.',
  },
  {
    id: 'next', icon: 'compass', status: 'next', when: 'Next',
    title: 'Your team?',
    desc: 'Looking for the next island to land on — internship or junior role.',
  },
];

// The Book of Answers — "about me" as chapters. Edit freely.
export const book = [
  {
    q: 'Who are you?',
    a: [
      "I'm Berdibek — a full-stack and game developer from Astana, Kazakhstan.",
      'I study Software Engineering at AITU College and spend the rest of my time shipping things: web platforms, games and small tools.',
    ],
  },
  {
    q: 'What do you build?',
    a: [
      'Real-time web apps (timers, voice rooms, shared state over WebSockets), 2D games in Unity, and AI prototypes in Python.',
      'This site is one too: a procedural voxel world in Three.js with zero external assets.',
    ],
  },
  {
    q: 'Favourite stack?',
    a: [
      'Node.js + WebSockets + SQLite when something has to be live and simple.',
      'C# and Unity for games, Python for data and RAG, Go and Docker when it needs to run fast and anywhere.',
    ],
  },
  {
    q: 'Do you work in teams?',
    a: [
      'Yes — hackathons and my internship were all team work: splitting tasks, reviewing code, and pitching the result together.',
      'I am comfortable being the one who glues the backend, the frontend and the demo into one thing that works.',
    ],
  },
  {
    q: 'Are you open to work?',
    a: [
      'Yes. I am looking for an internship or a junior role in full-stack or game development.',
      'Astana on-site or remote both work.',
    ],
  },
  {
    q: 'How do I reach you?',
    a: [
      'Telegram is the fastest: @zdeathbecaq.',
      'Email works too: berdibekegeubai@gmail.com — or just light the portal at the bottom of this page.',
    ],
  },
];

// Chat commands (descriptions for autocomplete). Handlers live in ui.js.
export const chatCommands = [
  { cmd: '/cv',       desc: 'download resume' },
  { cmd: '/contacts', desc: 'show contacts' },
  { cmd: '/shards',   desc: 'where is the next shard?' },
  { cmd: '/music',    desc: 'toggle music' },
  { cmd: '/mute',     desc: 'toggle all sound' },
  { cmd: '/help',     desc: 'list commands' },
];
