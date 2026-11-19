// ============================================================
//  data.js — весь контент портфолио в одном месте.
//  Редактируй тексты, проекты, ссылки и контакты здесь.
// ============================================================

export const profile = {
  name: 'Бердібек Егеубай',
  nameLatin: 'Berdibek Egeubay',
  role: 'Full-stack & Game Developer',
  tagline: 'Собираю веб-платформы, игры и инструменты — от сервера до последнего пикселя.',
  location: 'Астана, Казахстан',
  // Положи свой PDF в public/cv/ и поправь путь.
  cvUrl: 'cv/Berdibek_Egeubay_CV.pdf',
  cvFileName: 'Berdibek_Egeubay_CV.pdf',
};

export const contacts = [
  { id: 'github',   label: 'GitHub',   value: '@bekw-eg',                  href: 'https://github.com/bekw-eg',          icon: 'github' },
  { id: 'telegram', label: 'Telegram', value: '@zdeathbecaq',              href: 'https://t.me/zdeathbecaq',            icon: 'telegram' },
  { id: 'email',    label: 'Email',    value: 'berdibekegeubai@gmail.com', href: 'mailto:berdibekegeubai@gmail.com',    icon: 'email' },
];

// Хотбар: id → иконка из textures.js (drawItemIcon).
export const stack = [
  {
    id: 'unity', name: 'C# / Unity', rarity: 'epic',
    lines: [
      'Геймплей, физика и UI для 2D/3D игр',
      'Системы скинов, боссов и сохранений',
      'Pixel-perfect рендер и анимации',
    ],
  },
  {
    id: 'node', name: 'Node.js / JS', rarity: 'rare',
    lines: [
      'REST/WebSocket-бэкенды и real-time',
      'Фронтенд на Vanilla JS, Vite, Three.js',
      'Авторизация, комнаты, синхронизация',
    ],
  },
  {
    id: 'python', name: 'Python', rarity: 'rare',
    lines: [
      'RAG-пайплайны и прототипы с LLM',
      'Парсинг, анализ данных, автоматизация',
      'Быстрые API на FastAPI/Flask',
    ],
  },
  {
    id: 'go', name: 'Go', rarity: 'uncommon',
    lines: [
      'Лёгкие сервисы и CLI-утилиты',
      'Конкурентность на горутинах',
      'Производительные HTTP-хендлеры',
    ],
  },
  {
    id: 'docker', name: 'Docker', rarity: 'uncommon',
    lines: [
      'Контейнеризация сервисов и БД',
      'docker-compose для dev-окружения',
      'Воспроизводимые деплои',
    ],
  },
  {
    id: 'sqlite', name: 'WebSockets / SQLite', rarity: 'rare',
    lines: [
      'Синхронизация состояния между клиентами',
      'Голос/таймеры/чаты в реальном времени',
      'Встраиваемая БД без лишней инфраструктуры',
    ],
  },
  {
    id: 'blender', name: 'Blender', rarity: 'uncommon',
    lines: [
      'Low-poly и воксельные модели',
      'Экспорт .glb для веба и Unity',
      'Простые анимации и рендеры',
    ],
  },
];

// Ингредиенты-предметы, которые не входят в хотбар, но нужны для рецептов.
export const extraItems = {
  pixel: { name: 'Pixel Art' },
  rag:   { name: 'RAG' },
  voice: { name: 'Voice Chat' },
  tower: { name: 'Tower Defense' },
  apple: { name: 'Appi' },
  map:   { name: 'Карта города' },
};

// Проекты для «Верстака». grid — 9 ячеек (null = пусто), значения — id предметов.
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
    summary: 'Веб-платформа для командной работы без прокрастинации.',
    features: [
      'Синхронизированный Pomodoro-таймер для всей команды',
      'Голосовой чат прямо в комнате',
      'Роадмап задач с прогрессом',
      'Мини-игра Tower Defense на время перерыва',
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
    summary: '2D-платформер про яблоко Appi.',
    features: [
      'Несколько миров с уникальными механиками',
      'Боссы с паттернами атак',
      'Гардероб скинов',
      'Механика бросков',
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
    summary: 'Интеллектуальный гид по городу — концепт и прототип с хакатона.',
    features: [
      'Рекомендации локаций под интересы пользователя',
      'RAG поверх базы мест и отзывов',
      'Разработан за время хакатона командой',
    ],
    links: { code: '', demo: '' },
  },
];

// Ветка достижений. parent — id родителя (для линий-связей).
export const advancements = [
  {
    id: 'college', icon: 'book', frame: 'task',
    title: 'Обучение в AITU College',
    desc: 'Software Engineering: алгоритмы, веб, базы данных, командные проекты.',
    parent: null,
  },
  {
    id: 'practice', icon: 'pickaxe', frame: 'goal',
    title: 'Производственная практика',
    desc: 'Разработка и геймдизайн: от механик и баланса до кода в продакшене.',
    parent: 'college',
  },
  {
    id: 'datathon', icon: 'diamond', frame: 'challenge',
    title: "DATATHON '26",
    desc: 'Участие в соревновании по анализу данных и ML.',
    parent: 'practice',
  },
];

// Команды чата (описания для автодополнения). Обработчики — в ui.js.
export const chatCommands = [
  { cmd: '/cv',                desc: 'скачать резюме' },
  { cmd: '/contacts',          desc: 'показать контакты' },
  { cmd: '/mute',              desc: 'вкл/выкл звук' },
  { cmd: '/help',              desc: 'список команд' },
];
