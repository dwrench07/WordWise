
let cards = [];
let folders = [];
let currentFolderParentId = null;
let totalQuizzes = 0;
let currentFilter = 'all';
let activeTags = new Set();
let selectedFolders = new Set();
let folderSortMode = 'name';
let tagMatchMode = 'OR';
let editingId = null;
let modalTags = [];
let expandedCards = new Set();
let quizCardCount = 20;
let currentDeckFilter = 'all';
let saveTimer = null;
const STORAGE_KEY = 'wordwise_cards_v5';
const QUIZ_KEY = 'wordwise_quizzes_v5';

const TAG_COLORS = [
  { bg: 'rgba(232,93,38,0.12)', fg: '#c44b1a' }, { bg: 'rgba(124,58,237,0.1)', fg: '#6528c7' },
  { bg: 'rgba(5,150,105,0.1)', fg: '#047857' }, { bg: 'rgba(14,116,144,0.1)', fg: '#0b5e73' },
  { bg: 'rgba(212,136,10,0.1)', fg: '#a16b08' }, { bg: 'rgba(220,47,85,0.1)', fg: '#b8234a' },
  { bg: 'rgba(8,145,178,0.1)', fg: '#076e87' }, { bg: 'rgba(219,39,119,0.1)', fg: '#a11d64' },
  { bg: 'rgba(109,40,217,0.1)', fg: '#5b21b6' }, { bg: 'rgba(6,148,162,0.1)', fg: '#047481' },
];

function tagColor(n) { let h = 0; for (let i = 0; i < n.length; i++)h = n.charCodeAt(i) + ((h << 5) - h); return TAG_COLORS[Math.abs(h) % TAG_COLORS.length]; }
function tagHTML(n, s) { const c = tagColor(n); return `<span class="tag" style="background:${c.bg};color:${c.fg};${s ? 'font-size:9px;padding:1px 6px;' : ''}">${esc(n)}</span>`; }
function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function toArr(v) { if (Array.isArray(v)) return v.map(x => String(x).trim()).filter(Boolean); if (typeof v === 'string' && v.trim()) return [v.trim()]; return []; }

// MARKDOWN SETUP
if (typeof marked !== 'undefined') {
  marked.setOptions({
    highlight: function (code, lang) {
      if (typeof hljs !== 'undefined') {
        const language = hljs.getLanguage(lang) ? lang : 'plaintext';
        return hljs.highlight(code, { language }).value;
      }
      return code;
    },
    breaks: true
  });
}
function renderMarkdown(text) {
  if (!text) return '';
  if (typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
    return DOMPurify.sanitize(marked.parse(text));
  }
  return esc(text);
}
function stripMarkdown(text) {
  if (!text) return '';
  return text.replace(/[#_*~`>]/g, '').replace(/\[(.*?)\]\(.*?\)/g, '$1');
}

function save(immediate = false) {
  if (saveTimer) clearTimeout(saveTimer);
  const performSave = async () => {
    try {
      await localforage.setItem(STORAGE_KEY, JSON.stringify(cards));
      await localforage.setItem(QUIZ_KEY, totalQuizzes.toString());
      await localforage.setItem('wordwise_folders_v5', JSON.stringify(folders));
      await localforage.setItem('wordwise_folderSort_v5', folderSortMode);
    } catch (e) { console.error("Failed to save WordWise data:", e); }
  };
  if (immediate) performSave();
  else saveTimer = setTimeout(performSave, 500);
}

async function load() {
  try {
    const d = await localforage.getItem(STORAGE_KEY);
    if (d) {
      // Handle both stringified and direct object storage for robustness
      cards = typeof d === 'string' ? JSON.parse(d) : d;
    }
    const f = await localforage.getItem('wordwise_folders_v5');
    if (f) folders = typeof f === 'string' ? JSON.parse(f) : f;
    const fs = await localforage.getItem('wordwise_folderSort_v5');
    if (fs) folderSortMode = fs;

    cards.forEach(c => {
      if (!Array.isArray(c.tags)) c.tags = [];
      c.back = toArr(c.back); c.example = toArr(c.example || c.examples);
      if (typeof c.liked === 'undefined') c.liked = false;
      if (typeof c.revisit === 'undefined') c.revisit = false;
      if (typeof c.note === 'undefined') c.note = '';
      // SRS Defaults
      if (typeof c.repetition === 'undefined') c.repetition = 0;
      if (typeof c.interval === 'undefined') c.interval = 0;
      if (typeof c.efactor === 'undefined') c.efactor = 2.5;
      if (typeof c.nextReview === 'undefined') c.nextReview = Date.now();
      if (typeof c.pass === 'undefined') c.pass = 0;
      if (typeof c.fail === 'undefined') c.fail = 0;
    });
    const q = await localforage.getItem(QUIZ_KEY);
    totalQuizzes = parseInt(q || '0');
  } catch (e) {
    console.error("Failed to load WordWise data:", e);
    cards = [];
  }
}
function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

function calculateSM2(card, quality) {
  // quality: 0 (Again), 3 (Hard), 4 (Good), 5 (Easy)
  if (quality >= 3) {
    if (card.repetition === 0) { card.interval = 1; }
    else if (card.repetition === 1) { card.interval = 6; }
    else { card.interval = Math.round(card.interval * card.efactor); }
    card.repetition++;
  } else {
    card.repetition = 0;
    card.interval = 1;
  }
  card.efactor = card.efactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (card.efactor < 1.3) card.efactor = 1.3;
  // Calculate next review in milliseconds (interval * 24 hours)
  card.nextReview = Date.now() + (card.interval * 24 * 60 * 60 * 1000);
}

function getStatus(c) {
  if (c.repetition === 0 && c.pass === 0 && c.fail === 0) return 'new';
  if (Date.now() >= c.nextReview) return 'due';
  if (c.interval > 21) return 'mastered';
  return 'learning';
}
function getAllTags() { const s = new Set(); cards.forEach(c => (c.tags || []).forEach(t => s.add(t))); return [...s].sort(); }
function firstBack(c) { return (c.back && c.back.length > 0) ? c.back[0] : ''; }
function allBackText(c) { return (c.back || []).join(' '); }
function allExampleText(c) { return (c.example || []).join(' '); }

// WORD OF THE DAY
function getWotd() {
  if (cards.length === 0) return null;
  const today = new Date().toISOString().slice(0, 10);
  let seed = 0; for (let i = 0; i < today.length; i++)seed = today.charCodeAt(i) + ((seed << 5) - seed);
  return cards[Math.abs(seed) % cards.length];
}
function renderWotd() {
  const el = document.getElementById('wotdBanner');
  const w = getWotd();
  if (!w) { el.innerHTML = ''; return; }
  const fb = firstBack(w);
  const ex = (w.example && w.example.length > 0) ? w.example[0] : '';
  const isLiked = w.liked;
  el.innerHTML = `<div class="wotd-banner">
    <div class="wotd-label">✦ Word of the Day</div>
    <div class="wotd-word">${esc(w.front)}</div>
    <div class="wotd-meaning markdown-body">${renderMarkdown(fb)}</div>
    ${ex ? `<div class="wotd-example markdown-body">${renderMarkdown(ex)}</div>` : ''}
    <div class="wotd-actions">
      <button class="wotd-like ${isLiked ? 'liked' : ''}" onclick="toggleLike('${w.id}');renderWotd();">${isLiked ? '❤ Liked' : '♡ Like'}</button>
      ${w.back.length > 1 ? `<span style="font-size:11px;color:var(--text3);">+${w.back.length - 1} more meaning${w.back.length > 2 ? 's' : ''}</span>` : ''}
    </div>
  </div>`;
}

function toggleLike(id) {
  const c = cards.find(x => x.id === id);
  if (c) c.liked = !c.liked;
  save(true); updateStats();
}
function toggleRevisit(id) {
  const c = cards.find(x => x.id === id);
  if (c) c.revisit = !c.revisit;
  save(true); updateStats();
}

// TABS
function switchTab(name, el) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('sec-' + name).classList.add('active');
  if (name === 'quiz') showQuizSetup();
  if (name === 'import') {
    document.getElementById('exportArea').value = JSON.stringify(
      cards.map(c => ({ front: c.front, back: c.back, example: c.example, deck: c.deck || '', tags: c.tags || [], liked: !!c.liked, pass: c.pass, fail: c.fail })), null, 2);
  }
}
function updateStats() {
  let pool = cards;
  if (selectedFolders.size > 0) {
    pool = pool.filter(c => {
      if (!c.folderId) return false;
      const anc = [c.folderId, ...getFolderAncestors(c.folderId)];
      return anc.some(id => selectedFolders.has(id));
    });
  }
  const tot = pool.length;
  const mas = pool.filter(c => getStatus(c) === 'mastered').length;
  const str = pool.filter(c => getStatus(c) === 'struggling').length;
  const newc = pool.filter(c => getStatus(c) === 'new').length;

  document.getElementById('statTotal').textContent = tot;
  document.getElementById('statMastered').textContent = mas;
  document.getElementById('statStruggling').textContent = str;
  document.getElementById('statNew').textContent = newc;
  document.getElementById('statLiked').textContent = pool.filter(c => c.liked).length;
  document.getElementById('statRevisit').textContent = pool.filter(c => c.revisit).length;
  document.getElementById('statQuizzes').textContent = totalQuizzes;
}

// TAG FILTER
function renderTagFilter() {
  const tags = getAllTags(); const bar = document.getElementById('tagFilterBar');
  if (tags.length === 0) { bar.innerHTML = ''; return; }
  bar.innerHTML = `<span class="tag-label">Tags:</span>` +
    `<span class="tag-mode-toggle" onclick="toggleTagMatchMode()" title="Click to toggle ANY/ALL mode">${tagMatchMode === 'OR' ? 'Match ANY' : 'Match ALL'}</span>` +
    tags.map(t => { const c = tagColor(t); return `<span class="tag-filter-pill ${activeTags.has(t) ? 'active' : ''}" style="background:${c.bg};color:${c.fg};" onclick="toggleTagFilter('${esc(t).replace(/'/g, "\\'")}')">${esc(t)}</span>`; }).join('') +
    (activeTags.size > 0 ? `<span class="tag-filter-pill" style="background:var(--surface2);color:var(--text2);opacity:1;font-size:10px;" onclick="clearTagFilters()">✕ Clear</span>` : '');
}
function toggleTagFilter(t) { if (activeTags.has(t)) activeTags.delete(t); else activeTags.add(t); renderTagFilter(); renderCards(); }
function clearTagFilters() { activeTags.clear(); renderTagFilter(); renderCards(); }
function toggleTagMatchMode() { tagMatchMode = tagMatchMode === 'OR' ? 'AND' : 'OR'; renderTagFilter(); renderCards(); showQuizSetup(); }

function toggleCard(id) { toggleCardInPlace(id); }

function renderMeanings(a) {
  if (!a || a.length === 0) return '';
  if (a.length === 1) return `<div class="card-meaning markdown-body" style="white-space:normal;">${renderMarkdown(a[0])}</div>`;
  return `<div class="meaning-list">${a.map((m, i) => `<div class="meaning-item"><span class="meaning-num">${i + 1}</span><div class="meaning-text markdown-body">${renderMarkdown(m)}</div></div>`).join('')}</div>`;
}
function renderExamples(a) {
  if (!a || a.length === 0) return '';
  return `<div class="examples-list">${a.map(e => `<div class="card-example markdown-body">${renderMarkdown(e)}</div>`).join('')}</div>`;
}

// INFINITE SCROLL
const PAGE_SIZE = 30;
let filteredCards = [];
let renderedCount = 0;
let isLoadingMore = false;
let scrollObserver = null;

function getFilteredCards() {
  const q = document.getElementById('searchInput').value.toLowerCase();
  return cards.filter(c => {
    const matchSearch = !q || c.front.toLowerCase().includes(q) || allBackText(c).toLowerCase().includes(q) || allExampleText(c).toLowerCase().includes(q) || (c.tags || []).some(t => t.toLowerCase().includes(q));
    let matchFilter = true;
    if (currentFilter === 'liked') matchFilter = !!c.liked;
    else if (currentFilter === 'revisit') matchFilter = !!c.revisit;
    else if (currentFilter !== 'all') matchFilter = getStatus(c) === currentFilter;
    const matchTags = activeTags.size === 0 ||
      (tagMatchMode === 'AND' ? [...activeTags].every(t => (c.tags || []).includes(t)) : [...activeTags].some(t => (c.tags || []).includes(t)));
      
    let matchFolder = true;
    if (selectedFolders.size > 0) {
      if (!c.folderId) {
        matchFolder = false;
      } else {
        const anc = [c.folderId, ...getFolderAncestors(c.folderId)];
        matchFolder = anc.some(id => selectedFolders.has(id));
      }
    }
    
    return matchSearch && matchFilter && matchTags && matchFolder;
  });
}

function renderCardHTML(c) {
  const s = getStatus(c); const isExp = expandedCards.has(c.id);
  const tagsHtml = (c.tags || []).map(t => tagHTML(t, true)).join('');
  const deckHtml = c.deck ? `<span class="deck-tag" style="font-size:10px;padding:2px 8px;">${esc(c.deck)}</span>` : '';
  const fb = firstBack(c); const fbPlain = stripMarkdown(fb); const preview = fbPlain.length > 80 ? fbPlain.substring(0, 80) + '…' : fbPlain;
  const mc = c.back.length > 1 ? `<span style="font-size:10px;color:var(--text3);font-weight:600;margin-left:4px;">${c.back.length} meanings</span>` : '';
  const revisitBtn = `<button class="card-revisit-btn ${c.revisit ? 'revisit' : ''}" onclick="event.stopPropagation();toggleRevisit('${c.id}');patchRevisit('${c.id}');updateStats();" title="${c.revisit ? 'Remove from Revisit' : 'Mark for Revisit'}">${c.revisit ? '★' : '☆'}</button>`;
  const likeBtn = `<button class="card-like-btn ${c.liked ? 'liked' : ''}" onclick="event.stopPropagation();toggleLike('${c.id}');patchCard('${c.id}');renderWotd();updateStats();" title="${c.liked ? 'Unlike' : 'Like'}">${c.liked ? '❤' : '♡'}</button>`;
  return `<div class="card-item ${isExp ? 'expanded' : ''}" data-id="${c.id}">
    <div class="card-header" onclick="toggleCardInPlace('${c.id}')">
      <div class="card-expand-icon">▶</div>
      <div class="card-summary">
        <div class="card-word"><span class="card-word-text">${esc(c.front)}</span>${deckHtml}${mc}</div>
        <div class="card-preview">${esc(preview)}</div>
      </div>
      <div class="card-header-right">
        ${revisitBtn}
        ${likeBtn}
        <span class="badge badge-pass">✓${c.pass}</span>
        <span class="badge badge-fail">✗${c.fail}</span>
        <div class="card-status-dot ${s}"></div>
      </div>
    </div>
    <div class="card-body">
      <div class="card-section-label">Meaning${c.back.length > 1 ? 's' : ''}</div>
      ${renderMeanings(c.back)}
      ${c.example.length > 0 ? `<div class="card-section-label">Example${c.example.length > 1 ? 's' : ''}</div>${renderExamples(c.example)}` : ''}
      ${c.note ? `<div class="card-section-label">Note</div><div class="card-note-block">${esc(c.note)}</div>` : ''}
      ${tagsHtml ? `<div class="card-tags-row">${tagsHtml}</div>` : ''}
      <div class="card-footer">
        <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();editCard('${c.id}')">✎ Edit</button>
        <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();deleteCard('${c.id}')" style="color:var(--red)">✕ Delete</button>
      </div>
    </div>
  </div>`;
}

// Toggle expand without full re-render
function toggleCardInPlace(id) {
  if (expandedCards.has(id)) expandedCards.delete(id); else expandedCards.add(id);
  const el = document.querySelector(`.card-item[data-id="${id}"]`);
  if (el) {
    el.classList.toggle('expanded');
  }
}

// Patch a single card in-place (for like toggle without re-rendering all)
function patchCard(id) {
  const c = cards.find(x => x.id === id);
  if (!c) return;
  const el = document.querySelector(`.card-item[data-id="${id}"]`);
  if (!el) return;
  const btn = el.querySelector('.card-like-btn');
  if (btn) {
    btn.classList.toggle('liked', c.liked);
    btn.textContent = c.liked ? '❤' : '♡';
    btn.title = c.liked ? 'Unlike' : 'Like';
  }
}

function patchRevisit(id) {
  const c = cards.find(x => x.id === id);
  if (!c) return;
  const el = document.querySelector(`.card-item[data-id="${id}"]`);
  if (!el) return;
  const btn = el.querySelector('.card-revisit-btn');
  if (btn) {
    btn.classList.toggle('revisit', c.revisit);
    btn.textContent = c.revisit ? '★' : '☆';
    btn.title = c.revisit ? 'Remove from Revisit' : 'Mark for Revisit';
  }
}

function loadMoreCards() {
  if (isLoadingMore || renderedCount >= filteredCards.length) return;
  isLoadingMore = true;
  const list = document.getElementById('cardList');
  const nextBatch = filteredCards.slice(renderedCount, renderedCount + PAGE_SIZE);
  const html = nextBatch.map(c => renderCardHTML(c)).join('');
  list.insertAdjacentHTML('beforeend', html);
  renderedCount += nextBatch.length;
  updateLoaderState();
  isLoadingMore = false;
}

function updateLoaderState() {
  const loader = document.getElementById('cardLoader');
  const info = document.getElementById('cardCountInfo');
  if (renderedCount < filteredCards.length) {
    loader.style.display = 'block';
    info.textContent = `Showing ${renderedCount} of ${filteredCards.length} cards`;
  } else {
    loader.style.display = 'none';
    if (filteredCards.length > PAGE_SIZE) {
      // Show "all loaded" briefly
      loader.style.display = 'block';
      loader.querySelector('.loader-spinner').style.display = 'none';
      info.textContent = `All ${filteredCards.length} cards loaded`;
      setTimeout(() => { loader.style.display = 'none'; loader.querySelector('.loader-spinner').style.display = 'block'; }, 1500);
    }
  }
}

function initScrollObserver() {
  if (scrollObserver) scrollObserver.disconnect();
  const loader = document.getElementById('cardLoader');
  scrollObserver = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) loadMoreCards();
  }, { rootMargin: '200px' });
  scrollObserver.observe(loader);
}

function renderCards() {
  filteredCards = getFilteredCards();
  renderedCount = 0;
  const list = document.getElementById('cardList');
  const loader = document.getElementById('cardLoader');

  if (filteredCards.length === 0) {
    list.innerHTML = `<div class="empty"><div class="empty-icon">📚</div><h3>${cards.length === 0 ? 'No cards yet' : 'No matching cards'}</h3><p>${cards.length === 0 ? 'Add your first card or import a deck.' : 'Try adjusting your search, filter, or tags.'}</p></div>`;
    loader.style.display = 'none';
    return;
  }

  // Render first batch
  const firstBatch = filteredCards.slice(0, PAGE_SIZE);
  list.innerHTML = firstBatch.map(c => renderCardHTML(c)).join('');
  renderedCount = firstBatch.length;
  updateLoaderState();
  initScrollObserver();
}

function setFilter(f, el) { currentFilter = f; document.querySelectorAll('.filter-pills .pill').forEach(p => p.classList.remove('active')); el.classList.add('active'); renderCards(); }

// TAG INPUT
function renderModalTags() {
  const wrap = document.getElementById('tagInputWrap'); const input = document.getElementById('mTagInput');
  wrap.querySelectorAll('.tag').forEach(el => el.remove());
  modalTags.forEach((t, i) => {
    const c = tagColor(t); const span = document.createElement('span'); span.className = 'tag'; span.style.background = c.bg; span.style.color = c.fg;
    span.innerHTML = `${esc(t)}<span class="tag-x" data-idx="${i}">&times;</span>`; wrap.insertBefore(span, input);
  });
  wrap.querySelectorAll('.tag-x').forEach(x => { x.onclick = (e) => { e.stopPropagation(); modalTags.splice(parseInt(x.dataset.idx), 1); renderModalTags(); renderTagSuggestions(); }; });
}
function renderTagSuggestions() {
  const existing = getAllTags().filter(t => !modalTags.includes(t)); const el = document.getElementById('tagSuggestions');
  if (existing.length === 0) { el.innerHTML = ''; return; }
  el.innerHTML = existing.slice(0, 12).map(t => { const c = tagColor(t); return `<span class="tag" style="background:${c.bg};color:${c.fg};cursor:pointer;font-size:11px;padding:3px 8px;" onclick="addModalTag('${esc(t).replace(/'/g, "\\'")}')">${esc(t)}</span>`; }).join('');
}
document.getElementById('mTagInput').addEventListener('keydown', function (e) {
  if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addModalTag(this.value); this.value = ''; }
  if (e.key === 'Backspace' && this.value === '' && modalTags.length > 0) { modalTags.pop(); renderModalTags(); renderTagSuggestions(); }
});
function addModalTag(val) { const t = val.replace(/,/g, '').trim(); if (t && !modalTags.includes(t)) { modalTags.push(t); renderModalTags(); renderTagSuggestions(); document.getElementById('mTagInput').value = ''; } }

// DYNAMIC BACK/EXAMPLE
function renderBackEntries(v) { const c = document.getElementById('mBackList'); c.innerHTML = ''; v.forEach((val, i) => { c.innerHTML += `<div class="entry-row"><span class="entry-num">${i + 1}</span><textarea rows="2" class="mBackEntry" placeholder="Meaning ${i + 1}...">${esc(val)}</textarea>${v.length > 1 ? `<button class="entry-remove" onclick="removeBackEntry(${i})">✕</button>` : ''}</div>`; }); }
function renderExampleEntries(v) { const c = document.getElementById('mExampleList'); c.innerHTML = ''; v.forEach((val, i) => { c.innerHTML += `<div class="entry-row"><span class="entry-num">${i + 1}</span><textarea rows="2" class="mExampleEntry" placeholder="Example ${i + 1}...">${esc(val)}</textarea><button class="entry-remove" onclick="removeExampleEntry(${i})">✕</button></div>`; }); }
function getBackValues() { return [...document.querySelectorAll('.mBackEntry')].map(t => t.value.trim()).filter(Boolean); }
function getExampleValues() { return [...document.querySelectorAll('.mExampleEntry')].map(t => t.value.trim()).filter(Boolean); }
function addBackEntry() { const v = [...document.querySelectorAll('.mBackEntry')].map(t => t.value); v.push(''); renderBackEntries(v); const e = document.querySelectorAll('.mBackEntry'); e[e.length - 1].focus(); }
function removeBackEntry(i) { const v = [...document.querySelectorAll('.mBackEntry')].map(t => t.value); v.splice(i, 1); if (v.length === 0) v.push(''); renderBackEntries(v); }
function addExampleEntry() { const v = [...document.querySelectorAll('.mExampleEntry')].map(t => t.value); v.push(''); renderExampleEntries(v); const e = document.querySelectorAll('.mExampleEntry'); e[e.length - 1].focus(); }
function removeExampleEntry(i) { const v = [...document.querySelectorAll('.mExampleEntry')].map(t => t.value); v.splice(i, 1); renderExampleEntries(v); }

// ADD/EDIT
function openAddModal() {
  editingId = null; modalTags = [];
  document.getElementById('modalTitle').textContent = 'Add New Card';
  document.getElementById('mFront').value = '';
  renderFolderOptions(document.getElementById('mFolderId'), selectedFolders.size === 1 ? [...selectedFolders][0] : null);
  document.getElementById('mNote').value = ''; document.getElementById('mTagInput').value = '';
  renderBackEntries(['']); renderExampleEntries([]); renderModalTags(); renderTagSuggestions();
  document.getElementById('modal').classList.add('show'); setTimeout(() => document.getElementById('mFront').focus(), 50);
}
function editCard(id) {
  const c = cards.find(x => x.id === id); if (!c) return;
  editingId = id; modalTags = [...(c.tags || [])];
  document.getElementById('modalTitle').textContent = 'Edit Card';
  document.getElementById('mFront').value = c.front;
  renderFolderOptions(document.getElementById('mFolderId'), c.folderId || null);
  document.getElementById('mNote').value = c.note || ''; document.getElementById('mTagInput').value = '';
  renderBackEntries(c.back.length > 0 ? [...c.back] : ['']); renderExampleEntries([...c.example]);
  renderModalTags(); renderTagSuggestions(); document.getElementById('modal').classList.add('show');
}
function closeModal() { document.getElementById('modal').classList.remove('show'); }
function saveCard() {
  const front = document.getElementById('mFront').value.trim(); const back = getBackValues(); const example = getExampleValues();
  const folderId = document.getElementById('mFolderId').value || null;
  const note = document.getElementById('mNote').value.trim();
  const pending = document.getElementById('mTagInput').value.trim();
  if (pending) addModalTag(pending); if (!front || back.length === 0) return;
  if (editingId) {
    const c = cards.find(x => x.id === editingId);
    if (c) { c.front = front; c.back = back; c.example = example; c.folderId = folderId; delete c.deck; c.tags = [...modalTags]; c.note = note; }
  } else {
    cards.push({ id: genId(), front, back, example, folderId, note, tags: [...modalTags], liked: false, revisit: false, pass: 0, fail: 0, created: Date.now(), repetition: 0, interval: 0, efactor: 2.5, nextReview: Date.now() });
  }
  save(true); closeModal(); renderAll();
}
function deleteCard(id) { if (!confirm('Delete this card?')) return; cards = cards.filter(c => c.id !== id); expandedCards.delete(id); save(true); renderAll(); }

// QUIZ
let quizCards = [], quizIdx = 0, quizCorrect = 0, quizMode = '';
let quizSelectedTags = new Set();
function getQuizFilteredCards() {
  let pool = cards;
  if (selectedFolders.size > 0) {
    pool = pool.filter(c => {
      if (!c.folderId) return false;
      const anc = [c.folderId, ...getFolderAncestors(c.folderId)];
      return anc.some(id => selectedFolders.has(id));
    });
  }
  return quizSelectedTags.size === 0 ? pool : pool.filter(c =>
    tagMatchMode === 'AND' ? [...quizSelectedTags].every(t => (c.tags || []).includes(t)) : [...quizSelectedTags].some(t => (c.tags || []).includes(t))
  );
}

function showQuizSetup() {
  const area = document.getElementById('quizArea');
  if (cards.length < 2) { area.innerHTML = `<div class="empty"><div class="empty-icon">🧠</div><h3>Need more cards</h3><p>Add at least 2 cards to start a quiz.</p></div>`; return; }
  const allTags = getAllTags(); const pool = getQuizFilteredCards(); const fc = pool.length;
  const likedCount = pool.filter(c => c.liked).length;
  const revisitCount = pool.filter(c => c.revisit).length;
  const dueCount = pool.filter(c => getStatus(c) === 'due').length;
  const countOptions = [5, 10, 15, 20, 30, 50].filter(n => n <= fc);
  if (!countOptions.includes(fc) && fc > 0) countOptions.push(fc);
  countOptions.sort((a, b) => a - b);
  if (quizCardCount > fc) quizCardCount = fc;

  area.innerHTML = `<div class="quiz-setup"><h2>Start a Quiz</h2><p>Choose your quiz mode</p>
    ${allTags.length > 0 ? `<div class="quiz-tag-panel">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <h4>🏷 Filter by Tags <span style="font-weight:400;color:var(--text2);">(select multiple)</span></h4>
        <span class="tag-mode-toggle" onclick="toggleTagMatchMode()" title="Click to toggle ANY/ALL mode">${tagMatchMode === 'OR' ? 'Match ANY' : 'Match ALL'}</span>
      </div>
      <div class="quiz-tag-grid">${allTags.map(t => { const c = tagColor(t); return `<span class="quiz-tag-chip ${quizSelectedTags.has(t) ? 'selected' : ''}" style="background:${c.bg};color:${c.fg};" onclick="toggleQuizTag('${esc(t).replace(/'/g, "\\'")}')">${esc(t)}</span>`; }).join('')}</div>
      <div class="quiz-tag-count">${fc} card${fc !== 1 ? 's' : ''} ${quizSelectedTags.size > 0 ? 'matched' : 'available'}${likedCount > 0 ? ` · ${likedCount} liked` : ''} · ${dueCount} due</div>
      ${quizSelectedTags.size > 0 ? `<span style="font-size:11px;color:var(--accent);cursor:pointer;margin-top:4px;display:inline-block;" onclick="quizSelectedTags.clear();showQuizSetup();">Clear all</span>` : ''}</div>` : ``}
    <div class="quiz-count-row">
      <span>Quiz</span>
      <select class="quiz-count-select" id="quizCountSelect" onchange="quizCardCount=parseInt(this.value)">
        ${countOptions.map(n => `<option value="${n}" ${n === quizCardCount || (n === Math.min(20, fc) && !countOptions.includes(quizCardCount)) ? 'selected' : ''}>${n === fc ? 'All (' + n + ')' : n}</option>`).join('')}
      </select>
      <span>cards</span>
    </div>
    <div class="quiz-options">
      <div class="quiz-option" onclick="startQuiz('flip')"><div class="quiz-option-icon">🔄</div><div class="quiz-option-title">Flashcard Flip</div><div class="quiz-option-desc">Classic reveal & self-grade</div></div>
      <div class="quiz-option" onclick="startQuiz('mc')"><div class="quiz-option-icon">🎯</div><div class="quiz-option-title">Multiple Choice</div><div class="quiz-option-desc">Pick the right answer</div></div>
      <div class="quiz-option" onclick="startQuiz('type')"><div class="quiz-option-icon">⌨️</div><div class="quiz-option-title">Type Answer</div><div class="quiz-option-desc">Type the meaning</div></div>
      <div class="quiz-option" onclick="startQuiz('due')"><div class="quiz-option-icon">⏰</div><div class="quiz-option-title">Due Cards</div><div class="quiz-option-desc">Review cards that are due (${dueCount})</div></div>
      <div class="quiz-option" onclick="startQuiz('liked')"><div class="quiz-option-icon">❤</div><div class="quiz-option-title">Liked Only</div><div class="quiz-option-desc">${likedCount} liked card${likedCount !== 1 ? 's' : ''}</div></div>
      <div class="quiz-option" onclick="startQuiz('revisit')"><div class="quiz-option-icon">★</div><div class="quiz-option-title">Manual Revisit</div><div class="quiz-option-desc">${revisitCount} marked card${revisitCount !== 1 ? 's' : ''}</div></div>
    </div></div>`;
}

function toggleQuizTag(t) { if (quizSelectedTags.has(t)) quizSelectedTags.delete(t); else quizSelectedTags.add(t); showQuizSetup(); }
function shuffle(a) { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[r[i], r[j]] = [r[j], r[i]]; } return r; }

function startQuiz(mode) {
  const pool = getQuizFilteredCards();
  quizMode = mode; quizIdx = 0; quizCorrect = 0;
  const count = parseInt(document.getElementById('quizCountSelect')?.value || quizCardCount) || 20;
  if (mode === 'due') { quizCards = shuffle(pool.filter(c => getStatus(c) === 'due')); if (quizCards.length < 2) quizCards = shuffle(pool); }
  else if (mode === 'liked') { quizCards = shuffle(pool.filter(c => c.liked)); if (quizCards.length < 2) { alert('Need at least 2 liked cards.'); return; } }
  else if (mode === 'revisit') { quizCards = shuffle(pool.filter(c => c.revisit)); if (quizCards.length < 2) { alert('Need at least 2 marked cards for revisit.'); return; } }
  else { quizCards = shuffle(pool); }
  if (quizCards.length < 2) { alert('Need at least 2 cards matching criteria.'); return; }
  quizCards = quizCards.slice(0, Math.min(count, quizCards.length));
  showQuizQuestion();
}

function quizMeaningsHTML(a) {
  if (a.length === 1) return `<div class="markdown-body" style="font-size:18px;font-weight:500;color:var(--accent2);line-height:1.5;text-align:left;">${renderMarkdown(a[0])}</div>`;
  return `<div class="quiz-meanings">${a.map((m, i) => `<div class="quiz-meaning-item"><span class="quiz-meaning-num">${i + 1}</span><div class="markdown-body" style="color:var(--accent2);width:100%">${renderMarkdown(m)}</div></div>`).join('')}</div>`;
}
function quizExamplesHTML(a) { return a.length === 0 ? '' : a.map(e => `<div class="quiz-example-text markdown-body" style="opacity:0;transform:translateY(10px);transition:all 0.3s 0.1s;">${renderMarkdown(e)}</div>`).join(''); }

function showQuizQuestion() {
  if (quizIdx >= quizCards.length) { showResults(); return; }
  const card = quizCards[quizIdx]; const pct = ((quizIdx) / quizCards.length * 100).toFixed(0);
  const area = document.getElementById('quizArea');
  const tagsDisp = (card.tags || []).map(t => tagHTML(t, true)).join('');
  const exBlock = quizExamplesHTML(card.example);
  const hdr = `<div class="quiz-progress"><div class="quiz-progress-bar" style="width:${pct}%"></div></div><div class="quiz-tags-display">${tagsDisp}</div><div class="quiz-counter">${quizIdx + 1} / ${quizCards.length}</div><div class="quiz-word">${esc(card.front)}</div>`;
  const hint = card.deck ? `<div class="quiz-hint">${esc(card.deck)}</div>` : '';

  if (quizMode === 'flip' || quizMode === 'revisit') {
    area.innerHTML = `<div class="quiz-card">${hdr}${hint || '<div class="quiz-hint">Tap to reveal</div>'}
      <div class="quiz-answer-block"><div class="quiz-answer-text" id="quizAnswer">${quizMeaningsHTML(card.back)}</div>${exBlock}</div>
      <div class="quiz-actions" id="quizActions"><button class="btn btn-ghost" onclick="revealAnswer()">👁 Reveal</button></div></div>`;
  } else if (quizMode === 'mc' || quizMode === 'due' || quizMode === 'liked') {
    const choices = getMCOptions(card);
    area.innerHTML = `<div class="quiz-card">${hdr}${hint}
      <div class="mc-options">${choices.map(ch => `<div class="mc-btn markdown-body" style="text-align:left;" onclick="checkMC(this,${ch === firstBack(card)})">${renderMarkdown(ch)}</div>`).join('')}</div>
      <div class="quiz-answer-block" style="margin-top:16px;"><div id="quizAnswer" style="display:none;"></div>${exBlock}</div></div>`;
  } else if (quizMode === 'type') {
    area.innerHTML = `<div class="quiz-card">${hdr}${hint}
      <input class="type-input" id="typeInput" placeholder="Type the answer..." onkeydown="if(event.key==='Enter')checkType()">
      <div class="quiz-answer-block"><div class="quiz-answer-text" id="quizAnswer">${quizMeaningsHTML(card.back)}</div>${exBlock}</div>
      <div class="quiz-actions"><button class="btn btn-primary" onclick="checkType()">Check</button></div></div>`;
    setTimeout(() => document.getElementById('typeInput')?.focus(), 100);
  }
}

function getMCOptions(card) {
  const pool = getQuizFilteredCards().length >= 4 ? getQuizFilteredCards() : cards;
  const others = pool.filter(c => c.id !== card.id).map(c => firstBack(c));
  return shuffle([firstBack(card), ...shuffle(others).slice(0, 3)]);
}
function revealQuizExtras() {
  const ans = document.getElementById('quizAnswer'); if (ans) ans.classList.add('show');
  document.querySelectorAll('.quiz-example-text').forEach(el => { el.style.opacity = '1'; el.style.transform = 'translateY(0)'; });
  showQuizNoteArea();
}
function showQuizNoteArea() {
  if (document.querySelector('.quiz-note-section')) return;
  const card = quizCards[quizIdx];
  const noteHtml = `<div class="quiz-note-section">
    <div class="card-section-label">Note</div>
    <textarea class="quiz-note-input" placeholder="Add a note for this card..." oninput="updateQuizNote('${card.id}', this.value)">${esc(card.note || '')}</textarea>
  </div>`;
  const anchor = document.getElementById('quizAnswer');
  if (anchor) anchor.insertAdjacentHTML('afterend', noteHtml);
}
function revealAnswer() {
  revealQuizExtras();
  document.getElementById('quizActions').innerHTML = `
    <button class="btn btn-red" onclick="gradeQuiz(0)">🔴 Again</button>
    <button class="btn btn-orange" onclick="gradeQuiz(3)">🟠 Hard</button>
    <button class="btn btn-green" onclick="gradeQuiz(4)">🟢 Good</button>
    <button class="btn btn-blue" onclick="gradeQuiz(5)">🔵 Easy</button>
  `;
}
function updateQuizNote(id, val) {
  const real = cards.find(c => c.id === id);
  if (real) {
    real.note = val;
    const qCard = quizCards.find(c => c.id === id);
    if (qCard) qCard.note = val;
    save();
  }
}
function checkMC(btn, ok) { document.querySelectorAll('.mc-btn').forEach(b => { b.disabled = true; b.style.pointerEvents = 'none'; }); btn.classList.add(ok ? 'correct' : 'wrong'); revealQuizExtras(); gradeQuiz(ok ? 5 : 0); }
function checkType() {
  const input = document.getElementById('typeInput'); if (!input) return;
  const val = input.value.trim().toLowerCase(); const card = quizCards[quizIdx];
  const ok = val && card.back.some(b => b.toLowerCase().includes(val));
  revealQuizExtras(); input.disabled = true; input.style.borderColor = ok ? 'var(--green)' : 'var(--red)';
  setTimeout(() => gradeQuiz(ok ? 5 : 0), 1200);
}
function gradeQuiz(quality) { // quality 0-5
  const real = cards.find(c => c.id === quizCards[quizIdx].id);
  if (real) {
    calculateSM2(real, quality);
    if (quality >= 3) quizCorrect++;
  }
  save(true); quizIdx++; setTimeout(showQuizQuestion, quality >= 3 ? 400 : 800);
}
function showResults() {
  totalQuizzes++; save(true); updateStats();
  const pct = quizCards.length ? Math.round(quizCorrect / quizCards.length * 100) : 0;
  const tagInfo = quizSelectedTags.size > 0 ? `<div style="margin-bottom:12px;">${[...quizSelectedTags].map(t => tagHTML(t)).join(' ')}</div>` : '';
  document.getElementById('quizArea').innerHTML = `<div class="results"><h2>Quiz Complete!</h2>${tagInfo}<div class="score">${pct}%</div>
    <div class="results-breakdown"><span style="color:var(--green)">✓ ${quizCorrect} correct</span><span style="color:var(--red)">✗ ${quizCards.length - quizCorrect} wrong</span></div>
    <div style="display:flex;gap:12px;justify-content:center;"><button class="btn btn-primary" onclick="showQuizSetup()">New Quiz</button><button class="btn btn-ghost" onclick="switchTab('cards',document.querySelectorAll('.tab')[0])">Review Cards</button></div></div>`;
}

// IMPORT/EXPORT
function exportCards() {
  const data = { type: 'wordwise_folder_export', folders: folders, cards: cards };
  const json = JSON.stringify(data, null, 2);
  navigator.clipboard.writeText(json).then(() => { document.getElementById('exportArea').value = json; alert('Copied!'); }).catch(() => { document.getElementById('exportArea').value = json; });
}
function downloadJSON() {
  const data = { type: 'wordwise_folder_export', folders: folders, cards: cards };
  const json = JSON.stringify(data, null, 2);
  document.getElementById('exportArea').value = json;
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `wordwise_deck_${new Date().toISOString().slice(0, 10)}.json`;
  a.click(); URL.revokeObjectURL(url);
}
function importCards() {
  const raw = document.getElementById('importArea').value.trim(); const msg = document.getElementById('importMsg');
  try {
    const arr = JSON.parse(raw); if (!Array.isArray(arr)) throw new Error('Must be an array');
    let count = 0; arr.forEach(item => {
      if (item.front && item.back) {
        let tags = [];
        if (Array.isArray(item.tags)) tags = item.tags.map(t => String(t).trim()).filter(Boolean);
        else if (typeof item.tags === 'string') tags = item.tags.split(',').map(t => t.trim()).filter(Boolean);
        cards.push({ id: genId(), front: String(item.front), back: toArr(item.back), example: toArr(item.example || item.examples), deck: item.deck || '', folderId: null, note: item.note || '', tags, liked: !!item.liked, revisit: !!item.revisit, pass: parseInt(item.pass) || 0, fail: parseInt(item.fail) || 0, created: Date.now(), repetition: item.repetition || 0, interval: item.interval || 0, efactor: item.efactor || 2.5, nextReview: item.nextReview || Date.now() }); count++;
      }
    });
    save(true); migrateDecksToFolders(); renderAll(); msg.innerHTML = `<span style="color:var(--green)">✓ Imported ${count} cards!</span>`;
    document.getElementById('importArea').value = '';
  } catch (e) { msg.innerHTML = `<span style="color:var(--red)">✗ Invalid JSON: ${esc(e.message)}</span>`; }
}

function exportFolder(id) {
  const validIds = new Set([id, ...getAllDescendants(id)]);
  const exportCards = cards.filter(c => validIds.has(c.folderId));
  const exportFolders = folders.filter(f => validIds.has(f.id));
  const data = { type: 'wordwise_folder_export', folders: exportFolders, cards: exportCards };
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
  const fName = folders.find(x => x.id === id)?.name || "export";
  const dl = document.createElement('a'); dl.setAttribute("href", dataStr); dl.setAttribute("download", `wordwise_${fName}.json`); dl.click();
}

function importData(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = function(event) {
    try {
      const result = event.target.result;
      if (file.name.endsWith('.md')) {
         importMarkdownData(result, file.name);
      } else {
         const imported = JSON.parse(result);
         if (imported.type === 'wordwise_folder_export') {
           importFolderData(imported);
         } else if (Array.isArray(imported)) {
           importJsonCards(imported, file.name);
         } else {
           alert("Unrecognized format.");
         }
      }
    } catch(err) { alert("Import failed."); }
    e.target.value = '';
  };
  reader.readAsText(file);
}

function importJsonCards(importedCards, filename) {
  const folderName = filename.replace(/\.[^/.]+$/, "");
  const rootId = genId();
  folders.push({ id: rootId, name: folderName, parentId: null, expanded: true, created: Date.now() });
  let count = 0;
  importedCards.forEach(c => {
    if (c.front && c.back) {
      if (!c.id) c.id = genId();
      c.folderId = rootId;
      cards.push(c); count++;
    }
  });
  save(true); renderAll(); alert(`Imported ${count} cards into folder "${folderName}".`);
}

function importFolderData(data) {
  const idMap = {};
  data.folders.forEach(f => {
    const newId = genId(); idMap[f.id] = newId;
    f.id = newId; f.created = Date.now();
  });
  data.folders.forEach(f => {
    if (f.parentId && idMap[f.parentId]) f.parentId = idMap[f.parentId];
    else f.parentId = null; 
    folders.push(f);
  });
  let count = 0;
  data.cards.forEach(c => {
    if (c.front && c.back) {
      c.id = genId();
      if (c.folderId && idMap[c.folderId]) c.folderId = idMap[c.folderId];
      else c.folderId = null;
      cards.push(c); count++;
    }
  });
  save(true); renderAll(); alert(`Imported folder structure and ${count} cards.`);
}

function importMarkdownData(mdString, filename) {
  const folderName = filename.replace(/\.[^/.]+$/, "");
  const folderId = genId();
  folders.push({ id: folderId, name: folderName, parentId: null, expanded: true, created: Date.now() });
  
  const lines = mdString.split('\n');
  let currentCard = null;
  let count = 0;
  
  lines.forEach(line => {
    if (line.match(/^#{2,3}\s+(.*)/)) {
      if (currentCard && currentCard.front && currentCard.back.length > 0) {
         cards.push(currentCard); count++;
      }
      currentCard = {
         id: genId(), front: line.replace(/^#{2,3}\s+/, '').trim(),
         back: [], example: [], tags: [], folderId: folderId,
         liked: false, revisit: false, pass: 0, fail: 0, created: Date.now(), repetition:0, interval:0, efactor:2.5, nextReview:Date.now()
      };
    } else if (currentCard) {
      if (line.trim().startsWith('Tags:')) {
         currentCard.tags = line.replace('Tags:', '').split(',').map(t=>t.trim()).filter(Boolean);
      } else if (line.trim() !== '') {
         currentCard.back.push(line);
      }
    }
  });
  if (currentCard && currentCard.front && currentCard.back.length > 0) {
    cards.push(currentCard); count++;
  }
  
  let recentlyAdded = cards.slice(-count);
  recentlyAdded.forEach(c => {
    if (c.back.length > 0) {
      c.back = [c.back.join('\n')];
    }
  });
  
  save(true); renderAll(); alert(`Imported ${count} cards from Markdown into "${folderName}".`);
}

function loadSampleDeck() {
  const sample = [
    { front: "Ephemeral", back: ["Lasting a very short time; transitory", "Fleeting or brief in duration"], example: ["The ephemeral beauty of cherry blossoms draws millions of visitors each spring.", "His fame was ephemeral — forgotten within a year."], tags: ["GRE", "Adjective"], liked: true, deck: "Vocabulary" },
    { front: "Ubiquitous", back: ["Present, appearing, or found everywhere", "So common it's impossible to avoid"], example: ["Smartphones have become ubiquitous in modern society."], tags: ["GRE", "Adjective"], deck: "Vocabulary" },
    { front: "Sycophant", back: ["A person who flatters to gain advantage", "An obsequious yes-man or toady"], example: ["The CEO surrounded himself with sycophants who never challenged his decisions."], tags: ["GRE", "Noun"], liked: true, deck: "Vocabulary" },
    {
      front: "What is a Closure in JavaScript?",
      back: ["A closure is a function having access to the parent scope, even after the parent function has closed.\n\n```javascript\nfunction outer() {\n  let count = 0;\n  return function inner() {\n    count++;\n    console.log(count);\n  };\n}\n```"],
      example: ["Closures are useful for creating private variables."],
      tags: ["JavaScript", "Coding"],
      liked: true,
      deck: "Programming"
    },
    {
      front: "HTTP Methods",
      back: ["Common HTTP methods inside REST APIs:\n\n* **GET**: Read data\n* **POST**: Create new data\n* **PUT**: Update existing data\n* **DELETE**: Remove data"],
      example: ["Fetching a user profile uses `GET /users/123`."],
      tags: ["Web", "Network"],
      deck: "Web Dev"
    },
    {
      front: "Pragmatic",
      back: ["Dealing with things sensibly and realistically", "Based on practical rather than theoretical considerations"],
      example: ["The pragmatic mayor focused on fixing potholes rather than debating ideology."],
      tags: ["GRE", "Adjective"],
      deck: "Vocabulary"
    }
  ];
  document.getElementById('importArea').value = JSON.stringify(sample, null, 2);
  document.getElementById('importMsg').innerHTML = '<span style="color:var(--accent)">Sample loaded — click Import!</span>';
}

let searchTimer = null;
function debouncedRenderCards() { clearTimeout(searchTimer); searchTimer = setTimeout(renderCards, 150); }

/* --- FOLDERS SYSTEM (Phase 2 Logic) --- */
function getRootFolders() { return folders.filter(f => !f.parentId).sort((a,b) => folderSortMode === 'name' ? a.name.localeCompare(b.name) : b.created - a.created); }
function getChildFolders(parentId) { return folders.filter(f => f.parentId === parentId).sort((a,b) => folderSortMode === 'name' ? a.name.localeCompare(b.name) : b.created - a.created); }

function getFolderAncestors(id) {
  let ancestors = [];
  let current = folders.find(f => f.id === id);
  while (current && current.parentId) {
    let parent = folders.find(f => f.id === current.parentId);
    if (!parent) break;
    ancestors.push(parent.id);
    current = parent;
  }
  return ancestors;
}

function getAllDescendants(id) {
  let desc = [];
  const children = folders.filter(f => f.parentId === id);
  for (let c of children) {
    desc.push(c.id);
    desc.push(...getAllDescendants(c.id));
  }
  return desc;
}

function buildFolderHTML(f, level = 0) {
  const children = getChildFolders(f.id);
  const hasChildren = children.length > 0;
  const isExpanded = f.expanded;
  
  const isExplicit = selectedFolders.has(f.id);
  const isImplicit = getFolderAncestors(f.id).some(a => selectedFolders.has(a));
  const isSelected = isExplicit || isImplicit;
  
  const toggleIcon = hasChildren ? `<div class="folder-toggle ${isExpanded ? 'expanded' : ''}" onclick="event.stopPropagation();toggleFolderExpansion('${f.id}')">▶</div>` : `<div class="folder-toggle hidden">▶</div>`;
  const iconHtml = f.icon ? `<div class="folder-icon">${esc(f.icon)}</div>` : `<div class="folder-icon">📁</div>`;
  
  const validFolderIds = new Set([f.id, ...getAllDescendants(f.id)]);
  const count = cards.filter(c => validFolderIds.has(c.folderId)).length;
  
  const actionsHtml = `
    <div class="folder-actions">
      <span onclick="event.stopPropagation();exportFolder('${f.id}')" title="Export">⬇️</span>
      <span onclick="event.stopPropagation();openAddFolderModal('${f.id}')" title="Add Subfolder">➕</span>
      <span onclick="event.stopPropagation();renameFolderPrompt('${f.id}')" title="Rename">✏️</span>
      <span onclick="event.stopPropagation();deleteFolderPrompt('${f.id}')" title="Delete">🗑️</span>
    </div>`;

  return `
    <div class="folder-item-container" data-id="${f.id}">
      <div class="folder-row ${isSelected ? 'selected' : ''}" 
           onclick="toggleFolderSelection('${f.id}', event)" 
           draggable="true" ondragstart="folderDragStart(event, '${f.id}')" 
           ondragover="folderDragOver(event)" ondragleave="folderDragLeave(event)" ondrop="folderDrop(event, '${f.id}')"
           style="padding-left: ${8 + (level * 12)}px;">
        ${toggleIcon}
        ${iconHtml}
        <div class="folder-name" title="${esc(f.name)}">${esc(f.name)}</div>
        ${count > 0 ? `<div class="folder-count">${count}</div>` : ''}
        ${actionsHtml}
      </div>
      <div class="folder-children ${isExpanded ? 'expanded' : ''}">
        ${children.map(child => buildFolderHTML(child, level + 1)).join('')}
      </div>
    </div>
  `;
}

function renderFolders() {
  const tree = document.getElementById('folderTree');
  if (!tree) return;
  const sortBtn = document.getElementById('folderSortBtn');
  if (sortBtn) sortBtn.innerText = folderSortMode === 'name' ? '⇅ Name' : '⇅ Date';
  
  if (folders.length === 0) {
    tree.innerHTML = `<div style="padding:20px;text-align:center;color:var(--text3);font-size:12px;">No folders yet.<br>Click + New Folder</div>`;
    return;
  }
  tree.innerHTML = getRootFolders().map(f => buildFolderHTML(f, 0)).join('');
}

function renderFolderOptions(selectEl, selectedId) {
  const buildOptions = (parentId, level, prefix = '') => {
    let opts = '';
    const children = folders.filter(f => f.parentId === parentId).sort((a,b) => a.name.localeCompare(b.name));
    for (let f of children) {
      const sel = f.id === selectedId ? 'selected' : '';
      opts += `<option value="${f.id}" ${sel}>${esc(prefix + (f.icon?f.icon+' ':'') + f.name)}</option>`;
      opts += buildOptions(f.id, level + 1, prefix + '\u00A0\u00A0\u00A0\u00A0');
    }
    return opts;
  };
  selectEl.innerHTML = `<option value="">-- No Folder --</option>` + buildOptions(null, 0);
}

function openAddFolderModal(parentId) {
  currentFolderParentId = parentId;
  document.getElementById('folderModalTitle').textContent = parentId ? 'New Subfolder' : 'New Folder';
  document.getElementById('fName').value = '';
  document.getElementById('fIcon').value = '';
  document.getElementById('folderModal').classList.add('show');
}
function closeFolderModal() { document.getElementById('folderModal').classList.remove('show'); }
function saveFolder() {
  const name = document.getElementById('fName').value.trim();
  const icon = document.getElementById('fIcon').value.trim();
  if (!name) return;
  folders.push({ id: genId(), name, icon, parentId: currentFolderParentId, expanded: true, created: Date.now() });
  save(true);
  renderFolders();
  closeFolderModal();
}

function deleteFolderPrompt(id) {
  if (confirm("Delete folder and move its contents to the parent level?")) {
    const f = folders.find(x => x.id === id);
    if (!f) return;
    folders.filter(x => x.parentId === id).forEach(child => child.parentId = f.parentId);
    cards.filter(c => c.folderId === id).forEach(c => c.folderId = f.parentId);
    folders = folders.filter(x => x.id !== id);
    selectedFolders.delete(id);
    save(true); renderAll();
  }
}

function renameFolderPrompt(id) {
  const f = folders.find(x => x.id === id);
  if (!f) return;
  const newName = prompt("Rename folder:", f.name);
  if (newName && newName.trim()) {
    f.name = newName.trim();
    save(true); renderFolders();
  }
}

function mergeFolders(sourceId, targetId) {
  if (sourceId === targetId) return;
  cards.filter(c => c.folderId === sourceId).forEach(c => c.folderId = targetId);
  folders.filter(f => f.parentId === sourceId).forEach(f => f.parentId = targetId);
  folders = folders.filter(f => f.id !== sourceId);
  selectedFolders.delete(sourceId);
  save(true); renderAll();
}

function toggleFolderSort() {
  folderSortMode = folderSortMode === 'name' ? 'date' : 'name';
  save(true); renderFolders();
}
function toggleFolderExpansion(id) {
  const f = folders.find(x => x.id === id);
  if (f) {
    f.expanded = !f.expanded;
    save(true);
    renderFolders();
  }
}
function toggleFolderSelection(id, e) {
  if (e && e.stopPropagation) e.stopPropagation();
  
  const isDirect = selectedFolders.has(id);
  const isImplicit = getFolderAncestors(id).some(a => selectedFolders.has(a));
  
  if (isDirect || isImplicit) {
    // Deselect
    selectedFolders.delete(id);
    getFolderAncestors(id).forEach(a => selectedFolders.delete(a));
    getAllDescendants(id).forEach(d => selectedFolders.delete(d));
  } else {
    // Select
    selectedFolders.add(id);
    // Subsume children automatically
    getAllDescendants(id).forEach(d => selectedFolders.delete(d));
  }
  renderAll(); // updates folders, cards list, and stats
}

function renderAll() { renderFolders(); renderWotd(); renderCards(); renderTagFilter(); updateStats(); }
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeModal(); closeFolderModal(); } });

function migrateDecksToFolders() {
  let changed = false;
  let unorderedId = null;
  
  cards.forEach(c => {
    // 1. Migrate legacy deck string if present
    if (c.deck !== undefined) {
      if (c.deck && !c.folderId) {
        let parts = c.deck.split('/').map(p => p.trim()).filter(Boolean);
        let parentId = null;
        for (let pName of parts) {
          let folder = folders.find(f => f.name === pName && f.parentId === parentId);
          if (!folder) {
            folder = { id: genId(), name: pName, parentId: parentId, expanded: true, created: Date.now() };
            folders.push(folder);
          }
          parentId = folder.id;
        }
        if (parentId) c.folderId = parentId;
      }
      delete c.deck;
      changed = true;
    }
    
    // 2. Put any card without a folder into "Unordered"
    if (!c.folderId) {
      if (!unorderedId) {
        let f = folders.find(f => f.name === "Unordered" && f.parentId === null);
        if (f) {
          unorderedId = f.id;
        } else {
          unorderedId = genId();
          folders.push({ id: unorderedId, name: "Unordered", icon: "📦", parentId: null, expanded: true, created: Date.now() - 10000 });
        }
      }
      c.folderId = unorderedId;
      changed = true;
    }
  });
  if (changed) save(true);
}

/* --- DRAG AND DROP --- */
function cardDragStart(e, id) { e.dataTransfer.setData('text/plain', JSON.stringify({type: 'card', id})); }
function folderDragStart(e, id) { e.dataTransfer.setData('text/plain', JSON.stringify({type: 'folder', id})); }
function folderDragOver(e) { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }
function folderDragLeave(e) { e.currentTarget.classList.remove('drag-over'); }
function folderDrop(e, targetFolderId) {
  e.preventDefault(); e.currentTarget.classList.remove('drag-over');
  try {
    const data = JSON.parse(e.dataTransfer.getData('text/plain'));
    if (data.type === 'card') {
      const c = cards.find(x => x.id === data.id);
      if (c && c.folderId !== targetFolderId) {
        c.folderId = targetFolderId; save(true); renderAll();
      }
    } else if (data.type === 'folder') {
      const sourceId = data.id;
      if (sourceId !== targetFolderId) {
        if (targetFolderId !== null) {
          const targetAncestors = getFolderAncestors(targetFolderId);
          if (targetAncestors.includes(sourceId)) { alert("Cannot move a folder into its own subfolder."); return; }
        }
        const f = folders.find(x => x.id === sourceId);
        if (f) { f.parentId = targetFolderId; save(true); renderFolders(); }
      }
    }
  } catch(err) { console.error("Drop error", err); }
}

// async initialization
async function initApp() {
  await load();
  migrateDecksToFolders();
  renderAll();
}
initApp();
