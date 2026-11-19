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

// Hotbar: id → item icon from textures.js.
export const stack = [
  {
    id: 'unity', name: 'C# / Unity', rarity: 'epic',
    lines: [
      'Gameplay, physics and UI for 2D/3D games',
      'Skin, boss and save systems',
      'Pixel-perfect rendering and animation',
    ],
  },
  {
    id: 'node', name: 'Node.js / JS', rarity: 'rare',
    lines: [
      'REST/WebSocket backends and real-time apps',
      'Frontend with Vanilla JS, Vite, Three.js',
      'Auth, rooms, state sync',
    ],
  },
  {
    id: 'python', name: 'Python', rarity: 'rare',
    lines: [
      'RAG pipelines and LLM prototypes',
      'Scraping, data analysis, automation',
      'Quick APIs with FastAPI/Flask',
    ],
  },
  {
    id: 'go', name: 'Go', rarity: 'uncommon',
    lines: [
      'Lightweight services and CLI tools',
      'Concurrency with goroutines',
      'Fast HTTP handlers',
    ],
  },
  {
    id: 'docker', name: 'Docker', rarity: 'uncommon',
    lines: [
      'Containerized services and databases',
      'docker-compose dev environments',
      'Reproducible deploys',
    ],
  },
  {
    id: 'sqlite', name: 'WebSockets / SQLite', rarity: 'rare',
    lines: [
      'State sync between clients',
      'Real-time voice, timers and chat',
      'Embedded DB with zero extra infra',
    ],
  },
  {
    id: 'blender', name: 'Blender', rarity: 'uncommon',
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

// Advancement tree. parent = id of the parent node (for connector lines).
export const advancements = [
  {
    id: 'college', icon: 'book', frame: 'task',
    title: 'Studying at AITU College',
    desc: 'Software Engineering: algorithms, web, databases, team projects.',
    parent: null,
  },
  {
    id: 'practice', icon: 'pickaxe', frame: 'goal',
    title: 'Industrial Internship',
    desc: 'Development and game design: from mechanics and balance to production code.',
    parent: 'college',
  },
  {
    id: 'datathon', icon: 'diamond', frame: 'challenge',
    title: "DATATHON '26",
    desc: 'Competed in a data analysis and ML challenge.',
    parent: 'practice',
  },
];

// Chat commands (descriptions for autocomplete). Handlers live in ui.js.
export const chatCommands = [
  { cmd: '/cv',       desc: 'download resume' },
  { cmd: '/contacts', desc: 'show contacts' },
  { cmd: '/mute',     desc: 'toggle sound' },
  { cmd: '/help',     desc: 'list commands' },
];
