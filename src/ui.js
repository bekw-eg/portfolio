// ============================================================
//  ui.js — HTML-слой поверх сцены: секции, хотбар, тултипы,
//  верстак, достижения, контакты и чат.
// ============================================================
import { profile, contacts, stack, extraItems, projects, advancements, chatCommands } from './data.js';
import { iconDataURL } from './textures.js';
import { sound } from './sound.js';

const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icon = (name, cls = 'px-icon', alt = '') => `<img class="${cls}" src="${iconDataURL(name)}" alt="${esc(alt)}" width="32" height="32" draggable="false">`;

const RARITY_COLOR = { common: '#ffffff', uncommon: '#ffff55', rare: '#55ffff', epic: '#ff55ff' };

/** Описание предмета по id (для тултипов в верстаке). */
function itemInfo(id) {
  const s = stack.find((t) => t.id === id);
  if (s) return { name: s.name, rarity: s.rarity, lines: s.lines, id };
  const e = extraItems[id];
  return { name: e?.name || id, rarity: 'common', lines: [], id };
}

export function downloadCV() {
  const a = document.createElement('a');
  a.href = profile.cvUrl;
  a.download = profile.cvFileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// ============================================================
export function initUI() {
  const tooltip = $('#tooltip');

  // ---------- рендер секций ---------------------------------
  $('#surface').innerHTML = `
    <div class="wrap hero">
      <p class="hero__kicker">Одиночная игра · Мир «Портфолио»</p>
      <h1 class="hero__title" data-text="${esc(profile.name)}">${esc(profile.name)}</h1>
      <p class="hero__role">${esc(profile.role)} <span class="splash" aria-hidden="true">Теперь в 2.5D!</span></p>
      <p class="hero__tagline">${esc(profile.tagline)}</p>
      <div class="hero__actions">
        <a class="mc-btn mc-btn--primary" href="#projects" data-action="nav">Смотреть проекты</a>
        <a class="mc-btn" href="#contacts" data-action="nav">${icon('telegram', 'px-icon px-icon--sm')}Контакты</a>
        <button class="mc-btn" data-action="cv">${icon('cv', 'px-icon px-icon--sm')}Резюме PDF</button>
      </div>
      <p class="hero__hint"><kbd>Скролл</kbd> — копать вглубь · <kbd>/</kbd> — чат · <kbd>1–7</kbd> — хотбар · клик по блоку — сломать</p>
    </div>
    <div class="scroll-cue" aria-hidden="true">▼</div>`;

  $('#stack').innerHTML = `
    <div class="wrap">
      <div class="gui inv">
        <h2 class="gui__title">${icon('pickaxe', 'px-icon px-icon--sm')} Стек технологий</h2>
        <p class="gui__text">Мой инструментарий всегда под рукой — он закреплён в хотбаре внизу экрана. Наведи на слот, чтобы узнать, какие задачи я решаю этим инструментом.</p>
        <div class="inv__grid" role="list">
          ${stack.map((t, i) => `
            <button class="slot slot--item" role="listitem" data-item="${t.id}" data-slot="${i}" aria-label="${esc(t.name)}">
              ${icon(t.id, 'px-icon', t.name)}
              <span class="slot__count">${i + 1}</span>
            </button>`).join('')}
          ${Array.from({ length: 2 }, () => '<span class="slot" aria-hidden="true"></span>').join('')}
        </div>
        <ul class="inv__legend">
          ${stack.map((t) => `<li><span style="color:${RARITY_COLOR[t.rarity]}">■</span> ${esc(t.name)}</li>`).join('')}
        </ul>
      </div>
    </div>`;

  $('#projects').innerHTML = `
    <div class="wrap">
      <h2 class="level-title">${icon('pixel', 'px-icon px-icon--sm')} Редстоун-лаборатория · Проекты</h2>
      <div class="gui craft">
        <aside class="craft__book">
          <h3 class="gui__title">Книга рецептов</h3>
          <ul class="recipes" role="tablist" aria-label="Проекты">
            ${projects.map((p) => `
              <li><button class="recipe" role="tab" data-project="${p.id}" aria-selected="false">
                <span class="slot slot--sm">${icon(p.icon, 'px-icon', '')}</span>
                <span class="recipe__text"><strong>${esc(p.title)}</strong><small>${esc(p.stack.join(' + '))}</small></span>
              </button></li>`).join('')}
          </ul>
        </aside>
        <div class="craft__table">
          <h3 class="gui__title">Создание</h3>
          <div class="craft__area">
            <div class="craft__grid" id="craftGrid">
              ${Array.from({ length: 9 }, (_, i) => `<span class="slot" data-cell="${i}"></span>`).join('')}
            </div>
            <span class="craft__arrow" aria-hidden="true"></span>
            <button class="slot slot--result" id="craftResult" aria-label="Результат крафта"></button>
          </div>
          <p class="craft__hint">Выбери рецепт слева — ингредиенты-технологии лягут в сетку 3×3.</p>
        </div>
        <article class="craft__card" id="craftCard" aria-live="polite"></article>
      </div>
    </div>`;

  $('#contacts').innerHTML = `
    <div class="wrap bedrock">
      <h2 class="level-title">${icon('diamond', 'px-icon px-icon--sm')} Уровень бедрока · Бэкграунд и контакты</h2>
      <div class="gui gui--dark adv">
        <h3 class="gui__title">Достижения</h3>
        <ol class="adv__tree">
          ${advancements.map((a, i) => `
            <li class="adv__node adv__node--${a.frame}" style="--i:${i}">
              <button class="adv__frame" data-adv="${a.id}" aria-label="${esc(a.title)}">${icon(a.icon, 'px-icon', '')}</button>
              <div class="adv__info"><strong>${esc(a.title)}</strong><p>${esc(a.desc)}</p></div>
            </li>`).join('')}
        </ol>
      </div>
      <div class="gui contacts">
        <h3 class="gui__title">Связаться со мной</h3>
        <div class="contacts__list">
          ${contacts.map((c) => `
            <a class="mc-btn mc-btn--contact" href="${esc(c.href)}" ${c.href.startsWith('http') ? 'target="_blank" rel="noopener"' : ''} data-sound="click">
              ${icon(c.icon, 'px-icon px-icon--sm', '')}<span>${esc(c.label)}</span><small>${esc(c.value)}</small>
            </a>`).join('')}
          <button class="mc-btn mc-btn--contact mc-btn--cv" data-action="cv">
            ${icon('cv', 'px-icon px-icon--sm', '')}<span>Скачать резюме</span><small>PDF</small>
          </button>
        </div>
      </div>
      <footer class="footer">
        <p>© ${new Date().getFullYear()} ${esc(profile.name)} · Весь мир сгенерирован процедурно: Three.js + Canvas, без внешних ассетов.</p>
        <p class="footer__legal">Фанатская стилизация. Не является официальным продуктом Minecraft, не одобрено Mojang или Microsoft.</p>
      </footer>
    </div>`;

  // ---------- хотбар -----------------------------------------
  const hotbar = $('#hotbar');
  hotbar.innerHTML = stack.map((t, i) => `
    <button class="hotbar__slot" data-item="${t.id}" data-slot="${i}" role="option" aria-selected="${i === 0}" aria-label="${i + 1}: ${esc(t.name)}">
      ${icon(t.id, 'px-icon', '')}
    </button>`).join('');
  let selected = 0;
  const heldName = $('#heldName');
  let heldTimer = 0;

  function selectSlot(i, { silent = false } = {}) {
    selected = (i + stack.length) % stack.length;
    hotbar.querySelectorAll('.hotbar__slot').forEach((el, j) => el.setAttribute('aria-selected', String(j === selected)));
    const t = stack[selected];
    heldName.textContent = t.name;
    heldName.style.color = RARITY_COLOR[t.rarity];
    heldName.classList.add('is-visible');
    clearTimeout(heldTimer);
    heldTimer = setTimeout(() => heldName.classList.remove('is-visible'), 1800);
    if (!silent) sound.slot(selected);
  }

  hotbar.addEventListener('click', (e) => {
    const slot = e.target.closest('.hotbar__slot');
    if (!slot) return;
    selectSlot(+slot.dataset.slot);
    showTooltip(slot, itemInfo(slot.dataset.item), { anchor: 'above' });
  });

  // ---------- тултипы (фиолетовые, как в игре) -------------
  function tooltipHTML(info) {
    return `<strong style="color:${RARITY_COLOR[info.rarity] || '#fff'}">${esc(info.name)}</strong>` +
      info.lines.map((l) => `<span>${esc(l)}</span>`).join('') +
      `<em>portfolio:${esc(info.id)}</em>`;
  }

  function showTooltip(el, info, { anchor = 'cursor', x = 0, y = 0 } = {}) {
    tooltip.innerHTML = tooltipHTML(info);
    tooltip.hidden = false;
    const r = el.getBoundingClientRect();
    const tw = tooltip.offsetWidth, th = tooltip.offsetHeight;
    let left, top;
    if (anchor === 'above') { left = r.left + r.width / 2 - tw / 2; top = r.top - th - 12; }
    else { left = x + 16; top = y - th - 8; if (top < 8) top = y + 20; }
    left = Math.max(8, Math.min(window.innerWidth - tw - 8, left));
    top = Math.max(8, Math.min(window.innerHeight - th - 8, top));
    tooltip.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
  }
  const hideTooltip = () => { tooltip.hidden = true; };

  let lastHover = null;
  document.addEventListener('pointerover', (e) => {
    const el = e.target.closest('[data-item]');
    if (!el || el === lastHover) return;
    lastHover = el;
    if (el.classList.contains('hotbar__slot')) showTooltip(el, itemInfo(el.dataset.item), { anchor: 'above' });
    else showTooltip(el, itemInfo(el.dataset.item), { x: e.clientX, y: e.clientY });
    sound.hover();
  });
  document.addEventListener('pointermove', (e) => {
    if (!lastHover || lastHover.classList.contains('hotbar__slot')) return;
    if (!tooltip.hidden) showTooltip(lastHover, itemInfo(lastHover.dataset.item), { x: e.clientX, y: e.clientY });
  }, { passive: true });
  document.addEventListener('pointerout', (e) => {
    const el = e.target.closest('[data-item]');
    if (el && !el.contains(e.relatedTarget)) { lastHover = null; hideTooltip(); }
  });
  // клавиатурный доступ к тултипам
  document.addEventListener('focusin', (e) => {
    const el = e.target.closest?.('[data-item]');
    if (el) showTooltip(el, itemInfo(el.dataset.item), { anchor: 'above' });
  });
  document.addEventListener('focusout', (e) => { if (e.target.closest?.('[data-item]')) hideTooltip(); });
  window.addEventListener('scroll', () => { if (lastHover && !lastHover.classList.contains('hotbar__slot')) hideTooltip(); }, { passive: true });

  $('#stack').addEventListener('click', (e) => {
    const s = e.target.closest('[data-slot]');
    if (s) selectSlot(+s.dataset.slot);
  });

  // ---------- верстак ------------------------------------------
  const grid = $('#craftGrid');
  const result = $('#craftResult');
  const card = $('#craftCard');
  let craftTimers = [];
  let currentProject = null;

  function renderCard(p) {
    const link = (href, label, ico) => href
      ? `<a class="mc-btn mc-btn--sm" href="${esc(href)}" target="_blank" rel="noopener">${icon(ico, 'px-icon px-icon--sm', '')}${label}</a>`
      : `<span class="mc-btn mc-btn--sm is-disabled" aria-disabled="true">${label} · скоро</span>`;
    card.innerHTML = `
      <header class="craft__card-head">
        <span class="slot slot--sm">${icon(p.icon, 'px-icon', '')}</span>
        <div><h3>${esc(p.title)}</h3><p class="chips">${p.stack.map((s) => `<span>${esc(s)}</span>`).join('')}</p></div>
      </header>
      <p class="craft__summary">${esc(p.summary)}</p>
      <ul class="craft__features">${p.features.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
      <div class="craft__links">${link(p.links.code, 'Код', 'github')}${link(p.links.demo, 'Демо', 'compass')}</div>`;
    card.classList.remove('is-in'); void card.offsetWidth; card.classList.add('is-in');
  }

  function selectProject(id, { silent = false } = {}) {
    const p = projects.find((x) => x.id === id);
    if (!p) return;
    currentProject = p;
    craftTimers.forEach(clearTimeout); craftTimers = [];
    document.querySelectorAll('.recipe').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.project === id)));
    const cells = grid.querySelectorAll('.slot');
    cells.forEach((c) => { c.innerHTML = ''; c.removeAttribute('data-item'); c.classList.remove('is-pop'); });
    result.innerHTML = ''; result.classList.remove('is-ready');
    let step = 0;
    p.grid.forEach((item, i) => {
      if (!item) return;
      const d = step++ * (silent ? 0 : 90);
      craftTimers.push(setTimeout(() => {
        cells[i].innerHTML = icon(item, 'px-icon', itemInfo(item).name);
        cells[i].dataset.item = item;
        cells[i].classList.add('is-pop');
        if (!silent) sound.place(step);
      }, d));
    });
    craftTimers.push(setTimeout(() => {
      result.innerHTML = icon(p.icon, 'px-icon', p.title);
      result.classList.add('is-ready');
      result.setAttribute('aria-label', `Создать: ${p.title}`);
      renderCard(p);
      if (!silent) sound.craft();
    }, silent ? 0 : step * 90 + 120));
  }

  $('#projects').addEventListener('click', (e) => {
    const r = e.target.closest('.recipe');
    if (r) { sound.click(); selectProject(r.dataset.project); return; }
    if (e.target.closest('#craftResult') && currentProject) {
      sound.levelUp();
      toast('Предмет создан!', currentProject.title, currentProject.icon);
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      card.classList.remove('is-in'); void card.offsetWidth; card.classList.add('is-in');
    }
  });
  selectProject(projects[0].id, { silent: true });

  // ---------- достижения --------------------------------------
  $('#contacts').addEventListener('click', (e) => {
    const a = e.target.closest('[data-adv]');
    if (a) {
      const adv = advancements.find((x) => x.id === a.dataset.adv);
      sound.advancement();
      toast('Достижение', adv.title, adv.icon, adv.frame === 'challenge');
    }
  });

  // ---------- общие действия (кнопки data-action) -------------
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action], [data-sound]');
    if (!el) return;
    const action = el.dataset.action;
    if (action === 'cv') { e.preventDefault(); sound.click(); downloadCV(); chatMessage(`Скачивание: ${profile.cvFileName}`, 'system'); }
    else if (action === 'chat') { e.preventDefault(); openChat(); }
    else if (action === 'mute') { e.preventDefault(); sound.toggle(); }
    else sound.click();
  });

  // ---------- звук: кнопка Mute --------------------------------
  const muteBtn = $('#muteBtn');
  const renderMute = (m) => {
    muteBtn.innerHTML = icon(m ? 'sound_off' : 'sound_on', 'px-icon px-icon--sm', '');
    muteBtn.setAttribute('aria-pressed', String(m));
    muteBtn.setAttribute('aria-label', m ? 'Включить звук' : 'Выключить звук');
    muteBtn.title = m ? 'Звук выключен' : 'Звук включён';
  };
  renderMute(sound.muted);
  sound.onChange(renderMute);
  $('#chatBtn').innerHTML = icon('chat', 'px-icon px-icon--sm', '');

  // ---------- тосты (как «Achievement get!») -------------------
  const toasts = $('#toasts');
  function toast(title, text, ico = 'diamond', challenge = false) {
    const el = document.createElement('div');
    el.className = `toast${challenge ? ' toast--challenge' : ''}`;
    el.innerHTML = `${icon(ico, 'px-icon', '')}<div><strong>${esc(title)}</strong><span>${esc(text)}</span></div>`;
    toasts.appendChild(el);
    setTimeout(() => el.classList.add('is-out'), 3600);
    setTimeout(() => el.remove(), 4200);
  }

  // ---------- чат ------------------------------------------------
  const chat = $('#chat');
  const chatLog = $('#chatLog');
  const chatForm = $('#chatForm');
  const chatInput = $('#chatInput');
  const suggest = $('#chatSuggest');
  let suggestions = [];
  let active = 0;

  function chatMessage(html, kind = 'info', raw = false) {
    const li = document.createElement('li');
    li.className = `chat__msg chat__msg--${kind}`;
    li.innerHTML = raw ? html : esc(html);
    chatLog.appendChild(li);
    while (chatLog.children.length > 40) chatLog.firstChild.remove();
    setTimeout(() => li.classList.add('is-old'), 9000);
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  function renderSuggestions() {
    const v = chatInput.value.toLowerCase();
    suggestions = v.startsWith('/') ? chatCommands.filter((c) => c.cmd.startsWith(v) && c.cmd !== v) : [];
    if (!v.startsWith('/')) suggestions = [];
    active = Math.min(active, Math.max(0, suggestions.length - 1));
    suggest.innerHTML = suggestions.map((c, i) => `
      <li role="option" aria-selected="${i === active}" data-cmd="${esc(c.cmd)}">
        <span class="cmd"><b>${esc(c.cmd.slice(0, v.length))}</b>${esc(c.cmd.slice(v.length))}</span><span class="desc">${esc(c.desc)}</span>
      </li>`).join('');
    suggest.hidden = !suggestions.length;
  }

  function openChat(prefill = '/') {
    if (chat.classList.contains('is-open')) { chatInput.focus(); return; }
    chat.classList.add('is-open');
    chatForm.hidden = false;
    chatInput.value = prefill;
    active = 0;
    renderSuggestions();
    sound.chatOpen();
    requestAnimationFrame(() => { chatInput.focus(); chatInput.setSelectionRange(prefill.length, prefill.length); });
  }
  function closeChat() {
    chat.classList.remove('is-open');
    chatForm.hidden = true;
    suggest.hidden = true;
    chatInput.blur();
  }

  const COMMANDS = {
    '/cv': () => { downloadCV(); chatMessage(`Скачивание резюме: ${profile.cvFileName}`, 'system'); },
    '/contacts': () => {
      chatMessage('[Контакты]', 'system');
      contacts.forEach((c) => chatMessage(`${esc(c.label)}: <a href="${esc(c.href)}" ${c.href.startsWith('http') ? 'target="_blank" rel="noopener"' : ''}>${esc(c.value)}</a>`, 'info', true));
    },
    '/mute': () => { const m = sound.toggle(); chatMessage(m ? 'Звук выключен' : 'Звук включён', 'system'); },
    '/help': () => { chatCommands.forEach((c) => chatMessage(`<b>${esc(c.cmd)}</b> — ${esc(c.desc)}`, 'info', true)); },
  };

  function runCommand(input) {
    const v = input.trim().replace(/\s+/g, ' ');
    if (!v) return;
    if (!v.startsWith('/')) { chatMessage(`<b>&lt;Гость&gt;</b> ${esc(v)}`, 'player', true); sound.click(); return; }
    chatMessage(v, 'echo');
    let fn = COMMANDS[v.toLowerCase()];
    if (!fn) {
      const matches = chatCommands.filter((c) => c.cmd.startsWith(v.toLowerCase()));
      if (matches.length === 1) fn = COMMANDS[matches[0].cmd];
    }
    if (fn) { sound.click(); fn(); }
    else { sound.error(); chatMessage(`Неизвестная команда «${v}». Введи /help`, 'error'); }
  }

  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    runCommand(chatInput.value);
    closeChat();
  });
  chatInput.addEventListener('input', () => { active = 0; renderSuggestions(); });
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); closeChat(); return; }
    if (!suggestions.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      active = (active + (e.key === 'ArrowDown' ? 1 : -1) + suggestions.length) % suggestions.length;
      renderSuggestions();
      sound.hover();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      chatInput.value = suggestions[active].cmd;
      renderSuggestions();
      sound.slot(2);
    }
  });
  suggest.addEventListener('pointerdown', (e) => {
    const li = e.target.closest('[data-cmd]');
    if (!li) return;
    e.preventDefault();
    runCommand(li.dataset.cmd);
    closeChat();
  });
  chatInput.addEventListener('blur', () => setTimeout(() => {
    if (document.activeElement !== chatInput) closeChat();
  }, 120));

  // ---------- клавиатура -----------------------------------------
  document.addEventListener('keydown', (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
    if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === '/') { e.preventDefault(); openChat('/'); }
    else if (e.key === 't' || e.key === 'T' || e.key === 'е' || e.key === 'Е') { e.preventDefault(); openChat(''); }
    else if (/^[1-7]$/.test(e.key)) {
      selectSlot(+e.key - 1);
      const el = hotbar.children[+e.key - 1];
      showTooltip(el, itemInfo(el.dataset.item), { anchor: 'above' });
      clearTimeout(selectSlot._t);
      selectSlot._t = setTimeout(hideTooltip, 2200);
    }
  });

  // ---------- HUD: координаты, опыт, первые визиты -------------
  const coords = $('#coords');
  const xpFill = $('#xpFill');
  const xpLvl = $('#xpLvl');
  const BIOMES = { surface: 'Равнины', stack: 'Рудный слой', projects: 'Редстоун-лаборатория', contacts: 'Бедрок · Незер' };
  const FIRST = {
    stack: ['Каменный век', 'Спустись к слою руды', 'pickaxe'],
    projects: ['Время крафта!', 'Найди верстак', 'pixel'],
    contacts: ['Нужно копать глубже', 'Доберись до портала', 'diamond'],
  };
  const visited = new Set(['surface']);
  let mined = 0;
  let lastLvl = -1;

  function updateHud({ y, progress, section }) {
    coords.innerHTML = `XYZ: <b>0</b> / <b>${Math.round(y)}</b> / <b>0</b> <span>· ${esc(BIOMES[section] || '')}${mined ? ` · добыто: ${mined}` : ''}</span>`;
    xpFill.style.transform = `scaleX(${progress.toFixed(4)})`;
    const lvl = Math.round(progress * 30);
    if (lvl !== lastLvl) { xpLvl.textContent = lvl; lastLvl = lvl; }
    document.body.dataset.section = section;
    if (section && !visited.has(section)) {
      visited.add(section);
      const f = FIRST[section];
      if (f) { toast(`Достижение: ${f[0]}`, f[1], f[2]); sound.advancement(); }
    }
  }

  function onBlockBreak(name) {
    mined++;
    if (mined === 1) { toast('Достижение: Начало', 'Сломай первый блок', 'pickaxe'); sound.advancement(); }
    if (name === 'diamond_ore') toast('Алмазы!', 'Ты нашёл алмазную руду', 'diamond', true);
  }

  selectSlot(0, { silent: true });
  heldName.classList.remove('is-visible');
  if (window.matchMedia('(hover: hover)').matches) {
    setTimeout(() => chatMessage('Добро пожаловать! Нажми / чтобы открыть чат, /help — список команд.', 'system'), 1200);
  }

  return { updateHud, onBlockBreak, toast, chatMessage };
}
