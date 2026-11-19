// ============================================================
//  ui.js — the HTML layer over the Void: sections, sound gate,
//  shard quest + hotbar, crafting table, path, book, portal, chat.
// ============================================================
import { profile, contacts, stack, extraItems, projects, journey, book, chatCommands } from './data.js';
import { iconDataURL } from './textures.js';
import { SHARDS, LEVELS } from './world.js';
import { sound } from './sound.js';

const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icon = (name, cls = 'px-icon', alt = '') => `<img class="${cls}" src="${iconDataURL(name)}" alt="${esc(alt)}" width="32" height="32" draggable="false">`;
const ext = (href) => (href.startsWith('http') ? 'target="_blank" rel="noopener"' : '');

const RARITY_COLOR = { common: '#ffffff', uncommon: '#ffff55', rare: '#55ffff', epic: '#ff55ff' };
const SHARD_KEY = 'void-portfolio:shards';
const SOCKET_KEY = 'void-portfolio:sockets';
const QUEST_KEY = 'void-portfolio:quest';
const GATE_KEY = 'void-portfolio:gate';
const TOTAL = stack.length;

function load(k, fallback) { try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch { return fallback; } }
function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } }

function itemInfo(id) {
  const s = stack.find((t) => t.id === id);
  if (s) return { name: s.name, rarity: s.rarity, lines: s.lines, id };
  const e = extraItems[id];
  return { name: e?.name || id, rarity: 'common', lines: [], id };
}

/** Which page section a shard floats in (nearest camera level). */
function shardSection(s) {
  let best = 'home', d = Infinity;
  for (const [id, y] of Object.entries(LEVELS)) if (Math.abs(y - s.y) < d) { d = Math.abs(y - s.y); best = id; }
  return best;
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
  let scene = null;
  const collected = new Set(load(SHARD_KEY, []).filter((id) => stack.some((t) => t.id === id)));
  let manualSockets = load(SOCKET_KEY, 0);
  const quest = Object.assign({ crafted: false, entered: false }, load(QUEST_KEY, {}));

  // ---------- sections -----------------------------------------
  $('#home').innerHTML = `
    <div class="wrap home">
      <p class="kicker">Singleplayer · Season 2026</p>
      <h1 class="title">${esc(profile.name)}</h1>
      <p class="home__role">${esc(profile.role)} <span class="splash" aria-hidden="true">Now with portals!</span></p>
      <p class="home__tagline">${esc(profile.tagline)}</p>
      <ul class="tags">
        <li>${esc(profile.location)}</li><li>Open to work</li><li>Web · Games · AI</li>
      </ul>
      <div class="home__actions">
        <a class="btn btn--primary" href="#projects">${icon('pixel', 'px-icon px-icon--sm')}View projects</a>
        <button class="btn" data-action="cv">${icon('cv', 'px-icon px-icon--sm')}Resume PDF</button>
      </div>
      <article class="panel quest" aria-label="Quest">
        <header><span class="badge">Quest</span><strong>Explore the Void</strong></header>
        <ul class="quest__list">
          <li data-q="shards"><span class="check"></span>Find the tech shards <em id="qShards">0/${TOTAL}</em></li>
          <li data-q="crafted"><span class="check"></span>Craft a project at the table</li>
          <li data-q="entered"><span class="check"></span>Light the portal and step through</li>
        </ul>
        <p class="quest__reward">Reward: a direct line to me</p>
      </article>
      <p class="hint">Psst. The crystal floating next to my island is clickable.</p>
    </div>
    <div class="scroll-cue" aria-hidden="true">▼</div>`;

  $('#stack').innerHTML = `
    <div class="wrap">
      <p class="eyebrow">Inventory</p>
      <h2 class="h2">Tools I carry</h2>
      <div class="stats">
        <div class="stat"><b>${projects.length}</b><span>projects crafted</span></div>
        <div class="stat"><b>${stack.length}</b><span>tools in the hotbar</span></div>
        <div class="stat"><b>24h</b><span>datathon survived</span></div>
      </div>
      <div class="panel inv">
        <div class="inv__grid" role="list">
          ${stack.map((t, i) => `
            <button class="slot slot--item" role="listitem" data-item="${t.id}" data-slot="${i}" aria-label="${esc(t.name)}">
              ${icon(t.id, 'px-icon', t.name)}<span class="slot__count">${i + 1}</span>
            </button>`).join('')}
        </div>
        <ul class="inv__list">
          ${stack.map((t) => `<li><span class="dot" style="--c:${t.color}"></span><b>${esc(t.name)}</b><span>${esc(t.lines[0])}</span></li>`).join('')}
        </ul>
      </div>
    </div>`;

  $('#projects').innerHTML = `
    <div class="wrap">
      <p class="eyebrow">Crafting table</p>
      <h2 class="h2">Projects</h2>
      <div class="panel craft">
        <aside class="craft__book">
          <h3 class="panel__title">Recipe book</h3>
          <ul class="recipes" role="tablist" aria-label="Projects">
            ${projects.map((p) => `
              <li><button class="recipe" role="tab" data-project="${p.id}" aria-selected="false">
                <span class="slot slot--sm">${icon(p.icon)}</span>
                <span class="recipe__text"><strong>${esc(p.title)}</strong><small>${esc(p.stack.join(' + '))}</small></span>
              </button></li>`).join('')}
          </ul>
        </aside>
        <div class="craft__table">
          <h3 class="panel__title">Crafting</h3>
          <div class="craft__area">
            <div class="craft__grid" id="craftGrid">${Array.from({ length: 9 }, (_, i) => `<span class="slot" data-cell="${i}"></span>`).join('')}</div>
            <span class="craft__arrow" aria-hidden="true">→</span>
            <button class="slot slot--result" id="craftResult" aria-label="Crafting result"></button>
          </div>
          <p class="craft__hint">Pick a recipe, then click the result to craft it.</p>
        </div>
        <article class="craft__card" id="craftCard" aria-live="polite"></article>
      </div>
    </div>`;

  const nowIndex = journey.findIndex((j) => j.status === 'now');
  $('#path').innerHTML = `
    <div class="wrap">
      <p class="eyebrow">The path</p>
      <h2 class="h2">From first line to final pitch</h2>
      <p class="lead">Four islands, four stops. The ship marks where I am now.</p>
      <ol class="path">
        ${journey.map((j, i) => `
          <li class="stop stop--${j.status}" style="--i:${i}">
            ${i === nowIndex ? `<span class="ship" aria-label="I am here">${icon('ship', 'px-icon px-icon--ship')}</span>` : ''}
            <span class="stop__when">${esc(j.when)}${j.status === 'done' ? ' · done' : j.status === 'now' ? ' · now' : ''}</span>
            <div class="stop__card">
              <span class="slot slot--sm">${icon(j.icon)}</span>
              <h3>${esc(j.title)}</h3>
              <p>${esc(j.desc)}</p>
            </div>
          </li>`).join('')}
      </ol>
    </div>`;

  $('#about').innerHTML = `
    <div class="wrap">
      <p class="eyebrow">Questions</p>
      <h2 class="h2">The Book of Answers</h2>
      <div class="book" id="book">
        <nav class="book__toc" aria-label="Chapters">
          <p class="book__label">Contents</p>
          <ol>${book.map((c, i) => `<li><button data-page="${i}">${esc(c.q)}</button></li>`).join('')}</ol>
        </nav>
        <article class="book__page" id="bookPage" aria-live="polite"></article>
      </div>
    </div>`;

  $('#portal').innerHTML = `
    <div class="wrap">
      <p class="eyebrow">The end of the Void</p>
      <h2 class="h2">Light the portal</h2>
      <div class="panel gatepanel">
        <p>Bring the shards you found along the way — each one lights a socket of the gateway. Missing some? Click an empty socket and it will fill itself.</p>
        <div class="sockets" id="sockets">
          ${stack.map((t, i) => `<button class="socket" data-socket="${i}" aria-label="Socket ${i + 1}"></button>`).join('')}
        </div>
        <p class="sockets__count"><b id="socketCount">0/${TOTAL}</b> sockets lit</p>
        <button class="btn btn--primary btn--big" id="enterPortal" disabled>${icon('portal', 'px-icon px-icon--sm')}Enter the portal</button>
      </div>
    </div>`;

  $('#contacts').innerHTML = `
    <div class="wrap credits">
      <p class="eyebrow">You made it</p>
      <h2 class="h2">Thanks for playing.</h2>
      <p class="lead">If you want to build something together — or just talk games, data or the web — here is where to find me.</p>
      <div class="contacts">
        ${contacts.map((c) => `
          <div class="contact">
            <a class="contact__link" href="${esc(c.href)}" ${ext(c.href)}>${icon(c.icon)}<span><b>${esc(c.label)}</b><small>${esc(c.value)}</small></span></a>
            ${c.id === 'email' ? `<button class="copy" data-copy="${esc(c.value)}">copy</button>` : ''}
          </div>`).join('')}
        <div class="contact contact--cv">
          <button class="contact__link" data-action="cv">${icon('cv')}<span><b>Resume</b><small>PDF</small></span></button>
        </div>
      </div>
      <footer class="footer">
        <p>© ${new Date().getFullYear()} ${esc(profile.name)} · Every block is generated in code with Three.js + Canvas.</p>
        <p class="footer__legal">Fan-made styling. Not an official Minecraft product. Not approved by or associated with Mojang or Microsoft.</p>
      </footer>
    </div>`;

  // DOM shards — used when the 3D scene is off (mobile / no WebGL)
  for (const s of SHARDS) {
    const t = stack.find((x) => x.id === s.id);
    const sec = $(`#${shardSection(s)}`);
    const b = document.createElement('button');
    b.className = 'dom-shard';
    b.dataset.shard = s.id;
    b.style.setProperty('--c', t.color);
    b.style.top = `${Math.round(20 + ((LEVELS[shardSection(s)] - s.y) / 22 + 0.5) * 50)}%`;
    b.setAttribute('aria-label', `Collect the ${t.name} shard`);
    b.innerHTML = icon('shard');
    if (collected.has(s.id)) continue;
    sec.appendChild(b);
  }

  // ---------- tooltips ------------------------------------------
  function tooltipHTML(info) {
    return `<strong style="color:${RARITY_COLOR[info.rarity] || '#fff'}">${esc(info.name)}</strong>` +
      info.lines.map((l) => `<span>${esc(l)}</span>`).join('') + `<em>void:${esc(info.id)}</em>`;
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
  const infoFor = (el) => {
    const id = el.dataset.item;
    if (el.classList.contains('hotbar__slot') && !collected.has(id)) {
      return { name: '??? Unknown shard', rarity: 'common', lines: ['Somewhere in the Void a crystal is waiting.', 'Find it and click it to collect.'], id: 'locked' };
    }
    return itemInfo(id);
  };
  let lastHover = null;
  document.addEventListener('pointerover', (e) => {
    const el = e.target.closest('[data-item]');
    if (!el || el === lastHover) return;
    lastHover = el;
    if (el.classList.contains('hotbar__slot')) showTooltip(el, infoFor(el), { anchor: 'above' });
    else showTooltip(el, infoFor(el), { x: e.clientX, y: e.clientY });
    sound.hover();
  });
  document.addEventListener('pointermove', (e) => {
    if (!lastHover || lastHover.classList.contains('hotbar__slot') || tooltip.hidden) return;
    showTooltip(lastHover, infoFor(lastHover), { x: e.clientX, y: e.clientY });
  }, { passive: true });
  document.addEventListener('pointerout', (e) => {
    const el = e.target.closest('[data-item]');
    if (el && !el.contains(e.relatedTarget)) { lastHover = null; hideTooltip(); }
  });
  document.addEventListener('focusin', (e) => { const el = e.target.closest?.('[data-item]'); if (el) showTooltip(el, infoFor(el), { anchor: 'above' }); });
  document.addEventListener('focusout', (e) => { if (e.target.closest?.('[data-item]')) hideTooltip(); });
  window.addEventListener('scroll', () => { if (lastHover && !lastHover.classList.contains('hotbar__slot')) hideTooltip(); }, { passive: true });

  // ---------- hotbar = shard collection -----------------------------
  const hotbar = $('#hotbar');
  const heldName = $('#heldName');
  let heldTimer = 0;
  let selected = 0;
  function renderHotbar() {
    hotbar.innerHTML = stack.map((t, i) => {
      const got = collected.has(t.id);
      return `<button class="hotbar__slot${got ? ' is-got' : ''}" data-item="${t.id}" data-slot="${i}" role="option" aria-selected="${i === selected}" aria-label="${i + 1}: ${got ? esc(t.name) : 'unknown shard'}">
        ${icon(got ? t.id : 'shard_empty')}
      </button>`;
    }).join('');
    $('#shardCount').textContent = `SHARDS ${collected.size}/${TOTAL}`;
    $('#whereBtn').hidden = collected.size >= TOTAL;
  }
  function selectSlot(i, { silent = false } = {}) {
    selected = (i + TOTAL) % TOTAL;
    hotbar.querySelectorAll('.hotbar__slot').forEach((el, j) => el.setAttribute('aria-selected', String(j === selected)));
    const t = stack[selected];
    const got = collected.has(t.id);
    heldName.textContent = got ? t.name : '???';
    heldName.style.color = got ? RARITY_COLOR[t.rarity] : '#9a8fc0';
    heldName.classList.add('is-visible');
    clearTimeout(heldTimer);
    heldTimer = setTimeout(() => heldName.classList.remove('is-visible'), 1800);
    if (!silent) sound.slot(selected);
  }
  hotbar.addEventListener('click', (e) => {
    const slot = e.target.closest('.hotbar__slot');
    if (!slot) return;
    selectSlot(+slot.dataset.slot);
    showTooltip(slot, infoFor(slot), { anchor: 'above' });
  });
  $('#stack').addEventListener('click', (e) => { const s = e.target.closest('[data-slot]'); if (s) selectSlot(+s.dataset.slot); });

  function nextShard() { return SHARDS.find((s) => !collected.has(s.id)); }
  function goToNextShard() {
    const s = nextShard();
    if (!s) return;
    const sec = shardSection(s);
    document.getElementById(sec)?.scrollIntoView({ behavior: 'smooth' });
    chatMessage(`A shard hums somewhere around "${sec}"…`, 'system');
  }
  $('#whereBtn').addEventListener('click', () => { sound.click(); goToNextShard(); });

  function flyToHotbar(id, from) {
    const slot = hotbar.children[stack.findIndex((t) => t.id === id)];
    if (!slot || !from) return;
    const to = slot.getBoundingClientRect();
    const img = document.createElement('img');
    img.src = iconDataURL(id);
    img.className = 'fly';
    img.alt = '';
    img.style.left = `${from.x - 20}px`; img.style.top = `${from.y - 20}px`;
    document.body.appendChild(img);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      img.style.transform = `translate(${to.left + to.width / 2 - from.x}px, ${to.top + to.height / 2 - from.y}px) scale(.9)`;
      img.style.opacity = '0.3';
    }));
    setTimeout(() => img.remove(), 750);
  }

  function collect(id, from) {
    if (collected.has(id)) return;
    collected.add(id);
    save(SHARD_KEY, [...collected]);
    sound.shard();
    flyToHotbar(id, from);
    setTimeout(() => {
      renderHotbar();
      const i = stack.findIndex((t) => t.id === id);
      selectSlot(i, { silent: true });
      hotbar.children[i]?.classList.add('is-new');
    }, 600);
    document.querySelectorAll(`.dom-shard[data-shard="${id}"]`).forEach((b) => b.remove());
    const t = stack.find((x) => x.id === id);
    if (collected.size === 1) toast('Advancement made!', 'Shiny! — collect your first shard', 'shard');
    else if (collected.size === TOTAL) { toast('Challenge complete!', 'Hoarder — all shards collected', 'diamond', true); sound.levelUp(); }
    else toast(`Shard found: ${t.name}`, `${collected.size}/${TOTAL} collected`, id);
    updateSockets();
    renderQuest();
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.dom-shard');
    if (!b) return;
    const r = b.getBoundingClientRect();
    collect(b.dataset.shard, { x: r.left + r.width / 2, y: r.top + r.height / 2 });
  });

  // ---------- quest ------------------------------------------------
  function renderQuest() {
    $('#qShards').textContent = `${collected.size}/${TOTAL}`;
    const done = { shards: collected.size >= TOTAL, crafted: quest.crafted, entered: quest.entered };
    document.querySelectorAll('.quest__list li').forEach((li) => li.classList.toggle('is-done', !!done[li.dataset.q]));
  }

  // ---------- crafting table ---------------------------------------
  const grid = $('#craftGrid');
  const result = $('#craftResult');
  const card = $('#craftCard');
  let timers = [];
  let current = null;
  function renderCard(p) {
    const link = (href, label, ico) => href
      ? `<a class="btn btn--sm" href="${esc(href)}" target="_blank" rel="noopener">${icon(ico, 'px-icon px-icon--sm')}${label}</a>`
      : `<span class="btn btn--sm is-disabled" aria-disabled="true">${label} · soon</span>`;
    card.innerHTML = `
      <header class="craft__card-head">
        <span class="slot slot--sm">${icon(p.icon)}</span>
        <div><h3>${esc(p.title)}</h3><p class="chips">${p.stack.map((s) => `<span>${esc(s)}</span>`).join('')}</p></div>
      </header>
      <p class="craft__summary">${esc(p.summary)}</p>
      <ul class="craft__features">${p.features.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
      <div class="craft__links">${link(p.links.code, 'Code', 'github')}${link(p.links.demo, 'Demo', 'compass')}</div>`;
    card.classList.remove('is-in'); void card.offsetWidth; card.classList.add('is-in');
  }
  function selectProject(id, { silent = false } = {}) {
    const p = projects.find((x) => x.id === id);
    if (!p) return;
    current = p;
    timers.forEach(clearTimeout); timers = [];
    document.querySelectorAll('.recipe').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.project === id)));
    const cells = grid.querySelectorAll('.slot');
    cells.forEach((c) => { c.innerHTML = ''; c.removeAttribute('data-item'); c.classList.remove('is-pop'); });
    result.innerHTML = ''; result.classList.remove('is-ready');
    let step = 0;
    p.grid.forEach((item, i) => {
      if (!item) return;
      const d = step++ * (silent ? 0 : 90);
      timers.push(setTimeout(() => {
        cells[i].innerHTML = icon(item, 'px-icon', itemInfo(item).name);
        cells[i].dataset.item = item;
        cells[i].classList.add('is-pop');
        if (!silent) sound.place(step);
      }, d));
    });
    timers.push(setTimeout(() => {
      result.innerHTML = icon(p.icon, 'px-icon', p.title);
      result.classList.add('is-ready');
      result.setAttribute('aria-label', `Craft: ${p.title}`);
      renderCard(p);
      if (!silent) sound.craft();
    }, silent ? 0 : step * 90 + 120));
  }
  $('#projects').addEventListener('click', (e) => {
    const r = e.target.closest('.recipe');
    if (r) { sound.click(); selectProject(r.dataset.project); return; }
    if (e.target.closest('#craftResult') && current) {
      sound.levelUp();
      toast('Item crafted!', current.title, current.icon);
      card.classList.remove('is-in'); void card.offsetWidth; card.classList.add('is-in');
      if (!quest.crafted) { quest.crafted = true; save(QUEST_KEY, quest); renderQuest(); }
    }
  });
  selectProject(projects[0].id, { silent: true });

  // ---------- book ---------------------------------------------------
  const page = $('#bookPage');
  let pageIdx = 0;
  function renderPage(i, { silent = false } = {}) {
    pageIdx = (i + book.length) % book.length;
    const c = book[pageIdx];
    page.innerHTML = `
      <p class="book__chapter">Chapter ${pageIdx + 1}</p>
      <h3>${esc(c.q)}</h3>
      <p class="book__orn" aria-hidden="true">· · ·</p>
      ${c.a.map((p) => `<p>${esc(p)}</p>`).join('')}
      <footer class="book__nav">
        <button class="book__arrow" data-turn="-1" aria-label="Previous page">‹</button>
        <span>Page ${pageIdx + 1} of ${book.length}</span>
        <button class="book__arrow" data-turn="1" aria-label="Next page">›</button>
      </footer>`;
    document.querySelectorAll('.book__toc button').forEach((b) => b.toggleAttribute('aria-current', +b.dataset.page === pageIdx));
    page.classList.remove('is-turn'); void page.offsetWidth; page.classList.add('is-turn');
    if (!silent) sound.page();
  }
  $('#book').addEventListener('click', (e) => {
    const b = e.target.closest('[data-page]');
    if (b) { renderPage(+b.dataset.page); return; }
    const a = e.target.closest('[data-turn]');
    if (a) renderPage(pageIdx + +a.dataset.turn);
  });
  renderPage(0, { silent: true });

  // ---------- toasts --------------------------------------------------------
  const toasts = $('#toasts');
  function toast(title, text, ico = 'diamond', challenge = false) {
    const el = document.createElement('div');
    el.className = `toast${challenge ? ' toast--challenge' : ''}`;
    el.innerHTML = `${icon(ico)}<div><strong>${esc(title)}</strong><span>${esc(text)}</span></div>`;
    toasts.appendChild(el);
    setTimeout(() => el.classList.add('is-out'), 3600);
    setTimeout(() => el.remove(), 4200);
  }

  // ---------- portal ---------------------------------------------------
  const enterBtn = $('#enterPortal');
  const litCount = () => Math.min(TOTAL, collected.size + manualSockets);
  let wasActive = litCount() >= TOTAL;
  function updateSockets() {
    const n = litCount();
    const got = [...collected];
    document.querySelectorAll('.socket').forEach((s, i) => {
      s.classList.toggle('is-lit', i < n);
      s.innerHTML = i < n ? icon(i < got.length ? got[i] : 'shard') : '';
    });
    $('#socketCount').textContent = `${n}/${TOTAL}`;
    enterBtn.disabled = n < TOTAL;
    const active = n >= TOTAL;
    scene?.setSockets(n);
    scene?.setPortalActive(active);
    document.body.classList.toggle('portal-lit', active);
    if (active && !wasActive) toast('The portal is lit!', 'Step through at the bottom of the Void', 'portal', true);
    wasActive = active;
  }
  $('#sockets').addEventListener('click', (e) => {
    const s = e.target.closest('.socket');
    if (!s || s.classList.contains('is-lit')) return;
    manualSockets = Math.min(TOTAL - collected.size, manualSockets + 1);
    save(SOCKET_KEY, manualSockets);
    sound.socket();
    updateSockets();
  });
  enterBtn.addEventListener('click', () => {
    if (enterBtn.disabled) return;
    sound.portal();
    scene?.portalBurst();
    const flash = $('#flash');
    flash.classList.remove('is-on'); void flash.offsetWidth; flash.classList.add('is-on');
    setTimeout(() => $('#contacts').scrollIntoView({ behavior: 'smooth' }), 450);
    if (!quest.entered) {
      quest.entered = true; save(QUEST_KEY, quest); renderQuest();
      setTimeout(() => toast('Advancement made!', 'The End? — step through the portal', 'portal', true), 900);
    }
  });

  // ---------- generic actions ------------------------------------------
  document.addEventListener('click', (e) => {
    const copy = e.target.closest('[data-copy]');
    if (copy) {
      e.preventDefault();
      navigator.clipboard?.writeText(copy.dataset.copy).then(() => { copy.textContent = 'copied'; setTimeout(() => { copy.textContent = 'copy'; }, 1500); });
      sound.click();
      return;
    }
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const action = el.dataset.action;
    if (action === 'cv') { e.preventDefault(); sound.click(); downloadCV(); chatMessage(`Downloading: ${profile.cvFileName}`, 'system'); }
    else if (action === 'chat') { e.preventDefault(); openChat(); }
    else if (action === 'mute') { e.preventDefault(); sound.toggle(); }
    else if (action === 'music') { e.preventDefault(); if (sound.muted) sound.setMuted(false); else sound.toggleMusic(); }
  });

  // ---------- sound buttons ------------------------------------------------
  const muteBtn = $('#muteBtn');
  const musicBtn = $('#musicBtn');
  const renderSound = () => {
    const m = sound.muted;
    muteBtn.innerHTML = icon(m ? 'sound_off' : 'sound_on', 'px-icon px-icon--sm');
    muteBtn.setAttribute('aria-pressed', String(m));
    muteBtn.title = m ? 'Sound off' : 'Sound on';
    musicBtn.innerHTML = icon('disc', 'px-icon px-icon--sm');
    musicBtn.classList.toggle('is-off', !sound.musicOn);
    musicBtn.title = sound.musicOn ? 'Music on' : 'Music off';
    musicBtn.setAttribute('aria-pressed', String(sound.musicOn));
  };
  renderSound();
  sound.onChange(renderSound);
  $('#chatBtn').innerHTML = icon('chat', 'px-icon px-icon--sm');

  // ---------- chat ------------------------------------------------------
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
  function closeChat() { chat.classList.remove('is-open'); chatForm.hidden = true; suggest.hidden = true; chatInput.blur(); }
  const COMMANDS = {
    '/cv': () => { downloadCV(); chatMessage(`Downloading resume: ${profile.cvFileName}`, 'system'); },
    '/contacts': () => {
      chatMessage('[Contacts]', 'system');
      contacts.forEach((c) => chatMessage(`${esc(c.label)}: <a href="${esc(c.href)}" ${ext(c.href)}>${esc(c.value)}</a>`, 'info', true));
    },
    '/shards': () => { if (!nextShard()) chatMessage('All shards collected. The portal awaits.', 'system'); else goToNextShard(); },
    '/music': () => { const on = sound.toggleMusic(); chatMessage(on ? 'Music on' : 'Music off', 'system'); },
    '/mute': () => { const m = sound.toggle(); chatMessage(m ? 'Sound off' : 'Sound on', 'system'); },
    '/help': () => { chatCommands.forEach((c) => chatMessage(`<b>${esc(c.cmd)}</b> — ${esc(c.desc)}`, 'info', true)); },
  };
  function runCommand(input) {
    const v = input.trim().replace(/\s+/g, ' ');
    if (!v) return;
    if (!v.startsWith('/')) { chatMessage(`<b>&lt;Guest&gt;</b> ${esc(v)}`, 'player', true); sound.click(); return; }
    chatMessage(v, 'echo');
    let fn = COMMANDS[v.toLowerCase()];
    if (!fn) {
      const matches = chatCommands.filter((c) => c.cmd.startsWith(v.toLowerCase()));
      if (matches.length === 1) fn = COMMANDS[matches[0].cmd];
    }
    if (fn) { sound.click(); fn(); } else { sound.error(); chatMessage(`Unknown command "${v}". Type /help`, 'error'); }
  }
  chatForm.addEventListener('submit', (e) => { e.preventDefault(); runCommand(chatInput.value); closeChat(); });
  chatInput.addEventListener('input', () => { active = 0; renderSuggestions(); });
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); closeChat(); return; }
    if (!suggestions.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      active = (active + (e.key === 'ArrowDown' ? 1 : -1) + suggestions.length) % suggestions.length;
      renderSuggestions(); sound.hover();
    } else if (e.key === 'Tab') {
      e.preventDefault(); chatInput.value = suggestions[active].cmd; renderSuggestions(); sound.slot(2);
    }
  });
  suggest.addEventListener('pointerdown', (e) => {
    const li = e.target.closest('[data-cmd]');
    if (!li) return;
    e.preventDefault(); runCommand(li.dataset.cmd); closeChat();
  });
  chatInput.addEventListener('blur', () => setTimeout(() => { if (document.activeElement !== chatInput) closeChat(); }, 120));

  // ---------- keyboard ---------------------------------------------------
  document.addEventListener('keydown', (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
    if (typing || e.ctrlKey || e.metaKey || e.altKey || !$('#gate').hidden) return;
    if (e.key === '/') { e.preventDefault(); openChat('/'); }
    else if (e.key === 't' || e.key === 'T') { e.preventDefault(); openChat(''); }
    else if (/^[1-7]$/.test(e.key)) {
      selectSlot(+e.key - 1);
      const el = hotbar.children[+e.key - 1];
      showTooltip(el, infoFor(el), { anchor: 'above' });
      clearTimeout(selectSlot._t);
      selectSlot._t = setTimeout(hideTooltip, 2200);
    } else if (document.body.dataset.section === 'about') {
      if (e.key === 'ArrowRight') renderPage(pageIdx + 1);
      if (e.key === 'ArrowLeft') renderPage(pageIdx - 1);
    }
  });

  // ---------- sound gate ---------------------------------------------------
  const gate = $('#gate');
  $('#gateDisc').style.backgroundImage = `url(${iconDataURL('disc', 8)})`;
  let gateSeen = false;
  try { gateSeen = sessionStorage.getItem(GATE_KEY) === '1'; } catch { /* ignore */ }
  const closeGate = () => {
    gate.classList.add('is-out');
    document.body.classList.remove('gate-open');
    try { sessionStorage.setItem(GATE_KEY, '1'); } catch { /* ignore */ }
    setTimeout(() => { gate.hidden = true; }, 500);
  };
  $('#gateOn').addEventListener('click', () => { sound.enable(); sound.click(); closeGate(); });
  $('#gateOff').addEventListener('click', () => { sound.setMuted(true); closeGate(); });
  if (!gateSeen) {
    gate.hidden = false;
    document.body.classList.add('gate-open');
    requestAnimationFrame(() => $('#gateOn').focus());
  } else if (!sound.muted) {
    // browsers need a user gesture before audio can start
    window.addEventListener('pointerdown', () => sound.setMuted(false), { once: true });
  }

  // ---------- HUD / first visits ----------------------------------------
  const FIRST = {
    path: ['The Long Road', 'Follow the path of islands', 'compass'],
    portal: ['We Need to Go Deeper', 'Reach the end of the Void', 'portal'],
  };
  const visited = new Set(['home']);
  function updateHud({ section }) {
    document.body.dataset.section = section;
    if (section && !visited.has(section)) {
      visited.add(section);
      const f = FIRST[section];
      if (f) { toast(`Advancement: ${f[0]}`, f[1], f[2]); sound.advancement(); }
    }
  }
  let mined = 0;
  function onBlockBreak() {
    mined++;
    if (mined === 1) { toast('Advancement: Getting Started', 'Break your first block', 'pickaxe'); sound.advancement(); }
  }
  function onAvatar() {
    sound.levelUp();
    const lines = ['Hi! I am Berdibek.', 'I hid seven shards in the Void — find them all.', 'The portal is at the very bottom.', 'Press / for chat commands.'];
    chatMessage(`<b>&lt;Berdibek&gt;</b> ${esc(lines[Math.floor(Math.random() * lines.length)])}`, 'player', true);
  }

  // initial render
  renderHotbar();
  selectSlot(0, { silent: true });
  heldName.classList.remove('is-visible');
  renderQuest();
  updateSockets();

  return {
    updateHud,
    onBlockBreak,
    onAvatar,
    collect,
    toast,
    chatMessage,
    /** Connect the 3D scene: sync collected shards, sockets and the portal. */
    bindScene(s) {
      scene = s;
      collected.forEach((id) => s.hideShard(id));
      s.setSockets(litCount());
      s.setPortalActive(litCount() >= TOTAL);
    },
  };
}
