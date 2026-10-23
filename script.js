/* Coïa — Fiche de personnage interactive
   Données (natures, dictionnaires, sous-compétences) : data.js
   Ici : 1) règles métier  2) fiches et sauvegarde  3) actions  4) affichage  5) événements */

/* ================= 1. RÈGLES MÉTIER (sans DOM) ================= */
const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
const avg = (a, b) => Math.round((a + b) / 2); // arrondi au plus proche (,5 vers le haut)
const palier = lvl => (lvl >= 10 ? 4 : Math.ceil(lvl / 3)); // 1-3, 4-6, 7-9, 10

// Dictionnaire de la nature actuelle ; hors plage : clé la plus proche (première ou dernière)
function lookup(dico, nature, value) {
  const keys = Object.keys(dico[nature]).map(Number);
  return dico[nature][clamp(value, Math.min(...keys), Math.max(...keys))];
}
function derivedFunds(c, nature) {
  return {
    pv: Math.ceil(c.fo * 5 / 2 + 10), maneuvers: Math.ceil(c.ag / 2), dodge: lookup(DICO_ESQ, nature, c.pe),
    mana: Math.ceil(c.sa / 2 + 5), adapt: Math.ceil(c.so / 3) + 1
  };
}
// Dé retenu : Neutre = 1d20 ; Prudent = plus proche de 10,5 ; Greedy = plus éloigné ; égalité : Prudent le plus grand, Greedy le plus petit
function pickDie(a, b, nature) {
  if (nature === 'neutre') return a;
  const da = Math.abs(a - 10.5), db = Math.abs(b - 10.5);
  if (da === db) return nature === 'prudent' ? Math.max(a, b) : Math.min(a, b);
  return (nature === 'prudent') === (da < db) ? a : b;
}
const MATRICES = Object.fromEntries(Object.keys(NATURES).map(n =>
  [n, Array.from({ length: 20 }, (_, i) => Array.from({ length: 20 }, (_, j) => pickDie(i + 1, j + 1, n)))]));
function successRate(nature, value) { // réussite si dé retenu ≤ valeur
  let ok = 0;
  MATRICES[nature].forEach(r => r.forEach(v => { if (v <= value) ok++; }));
  return Math.round(ok / 4);
}
function touchClasses(nature, ag) {
  const c1 = nature === 'prudent' && ag >= NATURES.prudent.min ? 2 : 1;
  const highs = [c1, Math.round(ag * 3 / 10), Math.round(ag * 6 / 10), Math.round(ag * 8 / 10), ag];
  let prev = 0;
  return highs.map(hi => { if (hi <= prev) return '—'; const lo = prev + 1; prev = hi; return lo === hi ? `${lo}` : `${lo}–${hi}`; });
}

/* ================= 2. FICHES ET SAUVEGARDE ================= */
// Phase 1 = répartition des caractéristiques ; 2 = sorts, compétences, points restants ; 3 = fiche de jeu
const KEY = 'coia-fiches-v2', OLD_KEY = 'coia-fiche-v1'; // stockage local : propre au navigateur et à l'appareil
const uid = () => Math.random().toString(36).slice(2, 9);
const TEXT_FIELDS = ['name', 'player', 'age', 'species', 'origin', 'look', 'element', 'inventory', 'notes', 'lore', 'personality', 'goals', 'links', 'traits', 'defects'];

function newSheet(nature = 'neutre') {
  const zero = () => Object.fromEntries(CARACS.map(id => [id, 0]));
  const base = Object.fromEntries(CARACS.map(id => [id, NATURES[nature].min]));
  return {
    id: uid(), ...Object.fromEntries(TEXT_FIELDS.map(f => [f, ''])), level: 1, incant: '',
    nature, creationNature: nature, phase: 1,
    carac: base, p1: { ...base }, kept: 0, mod: zero(), caracInit: null, caracMax: null, fund: null,
    coins: { go: 0, po: 0, pa: 0 }, skills: [], flaws: [], spells: [], cards: [], subPair: {}, chance: 1, theme: 'parchemin', font: 'classique', savedAt: null, changedAt: null, exportedAt: null, createdAt: new Date().toISOString()
  };
}
const blankCard = () => ({ name: '', desc: '', stat: '', type: 'manoeuvre', cast: '', mana: '', range: '', turn: 0, active: false, o: {} });
// Complète une fiche ancienne ou importée avec les valeurs par défaut
function norm(s) {
  const d = newSheet(NATURES[s.nature] ? s.nature : 'neutre'), o = { ...d, ...s };
  o.coins = { ...d.coins, ...s.coins }; o.carac = { ...d.carac, ...s.carac }; o.mod = { ...d.mod, ...s.mod }; o.subPair = { ...s.subPair };
  ['skills', 'flaws', 'spells'].forEach(k => { o[k] = Array.isArray(s[k]) ? s[k] : []; });
  o.spells = o.spells.map(k => ({ ...k, id: k.id || uid() }));
  o.cards = (Array.isArray(s.cards) ? s.cards : []).map(c => ({ ...blankCard(), ...c, o: { ...c.o } }));
  if (s.phase === undefined) { o.phase = s.validated ? 3 : 1; o.p1 = { ...o.carac }; o.creationNature = o.nature; }
  o.createdAt = s.createdAt || s.savedAt || new Date().toISOString();
  o.id = s.id || uid();
  return o;
}

let store, snaps = {}, levelUp = false, cardQuery = '', cardFilter = 'all'; // snaps : version de chaque fiche à l'ouverture (pour Restaurer)
try {
  const raw = localStorage.getItem(KEY), old = localStorage.getItem(OLD_KEY);
  if (raw) store = JSON.parse(raw);
  else if (old) { const s = norm(JSON.parse(old)); store = { active: s.id, order: [s.id], sheets: { [s.id]: s } }; }
} catch (e) { store = null; }
if (!store || !store.order || !store.order.length) { const s = newSheet(); store = { active: s.id, order: [s.id], sheets: { [s.id]: s } }; }
store.order.forEach(id => { store.sheets[id] = norm(store.sheets[id]); snaps[id] = JSON.stringify(store.sheets[id]); });
if (!store.sheets[store.active]) store.active = store.order[0];

const cur = () => store.sheets[store.active];
function persist() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { /* ignoré */ } }
function save() { // une vraie modification de la fiche active
  cur().savedAt = cur().changedAt = new Date().toISOString();
  persist();
}
if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); // demande au navigateur de ne pas effacer les fiches
function addSheet(s) {
  store.sheets[s.id] = s; store.order.push(s.id); snaps[s.id] = JSON.stringify(s); store.active = s.id; levelUp = false;
}

// Valeurs utilisées dans les calculs : réelle + modificateur temporaire en jeu (jamais < 0)
const eff = (s, id) => (s.phase === 3 ? Math.max(0, s.carac[id] + s.mod[id]) : s.carac[id]);
const effAll = s => Object.fromEntries(CARACS.map(id => [id, eff(s, id)]));
const spent = s => CARACS.reduce((t, id) => t + s.carac[id] - NATURES[s.nature].min, 0);
// Comptabilité de la phase 2 : réserve = 9 + points conservés (K) ; 1 pt de carac = 1 pt conservé tant qu'il en reste, sinon 3
function p2(s) {
  const A = CARACS.reduce((t, id) => t + s.carac[id] - s.p1[id], 0), a1 = Math.min(A, s.kept), a2 = A - a1;
  const S = s.skills.reduce((t, k) => t + 2 * k.level, 0) + s.spells.reduce((t, k) => t + k.level, 0);
  return { rest: PHASE2_BASE + s.kept - (a1 + 3 * a2 + S), nextCost: A < s.kept ? 1 : 3 };
}
const canEdit = s => s.phase === 2 || (s.phase === 3 && levelUp);

/* ================= 3. ACTIONS (modifient la fiche active) ================= */
function stepCarac(id, d) {
  const s = cur(), n = NATURES[s.nature];
  if (s.phase === 1) {
    if (d > 0 && s.carac[id] < n.max && spent(s) < n.budget) s.carac[id]++;
    if (d < 0 && s.carac[id] > n.min) s.carac[id]--;
  } else if (s.phase === 2) {
    if (d > 0 && s.carac[id] < n.max && p2(s).rest >= p2(s).nextCost) s.carac[id]++;
    if (d < 0 && s.carac[id] > s.p1[id]) s.carac[id]--;
  } else if (levelUp) { if (d > 0 && s.carac[id] < n.gameMax) s.carac[id]++; }
  else s.mod[id] = Math.max(-s.carac[id], s.mod[id] + d); // malus / bonus temporaire
}
function setCarac(id, target) { // saisie directe : fixe la valeur voulue (ou le modificateur en jeu)
  const s = cur();
  if (s.phase === 3 && !levelUp) { s.mod[id] = Math.max(-s.carac[id], target - s.carac[id]); return; }
  for (let g = 0; g < 40; g++) {
    const v = s.carac[id]; if (v === target) break;
    stepCarac(id, target > v ? 1 : -1); if (s.carac[id] === v) break;
  }
}
function stepFund(id, d) {
  const s = cur(); if (s.phase !== 3) return;
  const f = s.fund[id];
  if (levelUp && d > 0 && id !== 'dodge') { f.max++; f.cur++; } // Level Up : aucun plafond
  else f.cur = id === 'dodge' ? f.cur + d : clamp(f.cur + d, 0, f.max);
}
function stepCell(cell, d) {
  const s = cur(), [kind, id] = cell.split(':');
  if (kind === 'carac') stepCarac(id, d);
  else if (kind === 'fund') stepFund(id, d);
  else if (kind === 'coin') s.coins[id] = Math.max(0, s.coins[id] + d);
  else if (kind === 'chance') s.chance = clamp(s.chance + d, 1, 10);
  else if (kind === 'level') s.level = Math.max(1, s.level + d);
}
function setCell(cell, v) {
  const s = cur(), [kind, id] = cell.split(':');
  if (kind === 'carac') setCarac(id, v);
  else if (kind === 'fund' && s.phase === 3) s.fund[id].cur = id === 'dodge' ? v : clamp(v, 0, s.fund[id].max);
  else if (kind === 'coin') s.coins[id] = Math.max(0, v);
  else if (kind === 'chance') s.chance = clamp(v, 1, 10);
  else if (kind === 'level') s.level = Math.max(1, v);
}
function stepLevel(list, i, d) { // niveaux des compétences (max 3) et des sorts (max 10)
  const s = cur(), it = s[list][i], max = list === 'skills' ? 3 : 10;
  if (d > 0 && it.level < max && (s.phase === 3 ? levelUp : p2(s).rest >= (list === 'skills' ? 2 : 1))) it.level++;
  else if (d < 0 && s.phase === 2 && it.level > 1) it.level--;
}
function addItem(list) {
  const s = cur();
  if (!canEdit(s) || (s.phase === 2 && p2(s).rest < ({ skills: 2, spells: 1 }[list] || 0))) return;
  s[list].push(list === 'skills' ? { name: '', desc: '', level: 1, passive: '' }
    : list === 'spells' ? { id: uid(), name: '', level: 1, d1: '', d2: '', d3: '', d4: '' } : { name: '', desc: '' });
}
function addCard() { const s = cur(); s.cards.push(blankCard()); cardQuery = ''; cardFilter = 'all'; $('cardSearch').value = ''; }
function cardAction(act, i, k) { // boutons des cards : champs éventuels, Lancer, Tour suivant, Fin
  const s = cur(), c = s.cards[i], mana = s.fund && s.fund.mana;
  if (act === 'opt') c.o[k] = '';
  else if (act === 'optdel') delete c.o[k];
  else if (s.phase !== 3) return;
  else if (act === 'end') { c.active = false; c.turn = 0; }
  else if (act === 'cast' || act === 'next') {
    const first = act === 'cast', dur = parseInt(c.o.duration) || 0;
    if (!first && dur && c.turn + 1 > dur) { c.active = false; c.turn = 0; return; } // durée écoulée
    const cost = first ? parseInt(c.mana) || 0 : parseInt(c.o.perTurn) || 0, man = first && c.type === 'manoeuvre' ? 1 : 0;
    if (mana.cur < cost) { alert(`Mana insuffisant (${mana.cur} disponible, ${cost} nécessaire).`); return; }
    if (s.fund.maneuvers.cur < man) { alert('Plus de point de manœuvre disponible.'); return; }
    mana.cur -= cost; s.fund.maneuvers.cur -= man; // lancer une manœuvre consomme 1 point de manœuvre
    if (first) { if ('duration' in c.o || 'perTurn' in c.o) { c.active = true; c.turn = 1; } } else c.turn++;
  }
}
function validate() {
  const s = cur();
  if (s.phase === 1) {
    const x = NATURES[s.nature].budget - spent(s);
    if (!confirm(`Voulez-vous réellement passer à l'ajout des sorts signature et compétences ? Il vous reste ${x} points qui seront disponibles pour la prochaine phase.`)) return;
    s.kept = x; s.p1 = { ...s.carac }; s.creationNature = s.nature; s.phase = 2;
  } else if (s.phase === 2) {
    if (!confirm('Terminer la création ? Les fondamentaux seront calculés et enregistrés.')) return;
    const f = derivedFunds(s.carac, s.nature);
    s.caracInit = { ...s.carac }; s.caracMax = Object.fromEntries(CARACS.map(id => [id, NATURES[s.nature].max]));
    s.fund = Object.fromEntries(FUNDS.map(id => [id, { init: f[id], max: f[id], cur: f[id] }]));
    s.creationNature = s.nature; s.phase = 3;
  }
  commit();
}
function changeNature(next) {
  const s = cur();
  if (s.phase === 1) { s.nature = next; s.carac = newSheet(next).carac; s.p1 = { ...s.carac }; }
  else if (s.phase === 3) {
    if (next !== s.creationNature) { // retour à la nature de création : gratuit
      if (s.fund.adapt.cur < 1) { alert("Adaptabilité insuffisante : changer de nature coûte 1 point d'Adaptabilité."); return render(); }
      if (!confirm(`Changer de nature coûte 1 point d'Adaptabilité (il vous en reste ${s.fund.adapt.cur}). Continuer ?`)) return render();
      s.fund.adapt.cur--;
    }
    s.nature = next; // caractéristiques et maxima conservés
  }
  commit();
}

/* ================= 4. AFFICHAGE ================= */
const $ = id => document.getElementById(id);
const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmtDate = iso => (iso ? new Date(iso).toLocaleString('fr-FR') : '—');
const grow = t => { t.style.height = 'auto'; t.style.height = t.scrollHeight + 2 + 'px'; };

// Cartes générées une seule fois (les champs restent les mêmes ensuite : le focus clavier est conservé)
$('coins').innerHTML = Object.entries(COINS).map(([id, label]) => `<div class="coin"><span>${label}</span><div class="row"><button data-step="coin:${id}" data-d="-1" aria-label="Retirer 1">−</button>
  <input class="cell" data-cell="coin:${id}" id="coin-${id}" type="number" min="0"><button data-step="coin:${id}" data-d="1" aria-label="Ajouter 1">+</button></div></div>`).join('');
$('stats').innerHTML = CARACS.map(id => `<article class="stat-card"><div class="stat-label">${id.toUpperCase()} · ${CARAC_NAMES[id]}</div>
  <div class="val-row"><input class="stat-value cell" id="${id}" data-cell="carac:${id}" type="number" aria-label="${CARAC_NAMES[id]}"><small id="${id}-real"></small></div>
  <div class="stat-meta"><span id="${id}-info"></span><span id="${id}-r"></span></div>
  <div class="cbtn"><button data-step="carac:${id}" data-d="-1" aria-label="Retirer 1">−</button><button data-step="carac:${id}" data-d="1" aria-label="Ajouter 1">+</button>
  <button class="p3" data-reset="${id}" title="Remettre le modificateur à zéro">↺</button><button class="lvl" data-lvl="carac:${id}">Lvl +1</button></div></article>`).join('');
$('funds').innerHTML = FUNDS.map(id => `<article class="fund-card"><label for="${id}">${FUND_LABELS[id]}</label>
  <input class="cell" id="${id}" data-cell="fund:${id}" type="number"><small class="max" id="${id}-max"></small>
  <div class="cbtn"><button class="p3" data-step="fund:${id}" data-d="-1" aria-label="Retirer 1">−</button><button class="p3" data-step="fund:${id}" data-d="1" aria-label="Ajouter 1">+</button>
  ${id === 'dodge' ? '' : `<button class="lvl" data-lvl="fund:${id}">Lvl +1</button>`}</div></article>`).join('');

const lvlBtns = (l, i, s) => (s.phase === 2 ? `<button data-act="lvl" data-l="${l}" data-i="${i}" data-d="-1" aria-label="Baisser le niveau">−</button>` : '')
  + (canEdit(s) ? `<button data-act="lvl" data-l="${l}" data-i="${i}" data-d="1" aria-label="Monter le niveau">+</button>` : '');
const delBtn = (l, i, s) => (canEdit(s) ? `<button data-act="del" data-l="${l}" data-i="${i}" aria-label="Supprimer">✕</button>` : '');
const ta = (l, i, k, v, rows = 2, ph = '') => `<textarea rows="${rows}" placeholder="${ph}" data-l="${l}" data-i="${i}" data-k="${k}">${esc(v)}</textarea>`;

$('incant').innerHTML = '<option value="">—</option>' + INCANT.map(id => `<option value="${id}">${CARAC_NAMES[id]}</option>`).join('');
$('theme').innerHTML = THEMES.map(t => `<option value="${t.id}">${t.label}</option>`).join('');
$('font').innerHTML = FONTS.map(t => `<option value="${t.id}">${t.label}</option>`).join('');
const plain = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); // recherche sans accents ni casse
function renderCards(s) {
  const e = effAll(s), q = plain(cardQuery);
  const shown = s.cards.map((c, i) => ({ c, i })).filter(({ c }) =>
    (cardFilter === 'all' || c.type === (cardFilter === 'maneuver' ? 'manoeuvre' : cardFilter))
    && (!q || plain([c.name, c.desc, c.cast, c.range, ...Object.values(c.o)].join(' ')).includes(q)));
  $('cardCount').textContent = `${shown.length} / ${s.cards.length} card(s)`;
  document.querySelectorAll('[data-cf]').forEach(b => b.classList.toggle('on', b.dataset.cf === cardFilter));
  $('cards').innerHTML = shown.map(({ c, i }) => {
    const sp = c.stat.startsWith('spell:') ? s.spells.find(k => k.id === c.stat.slice(6)) : null;
    const stat = sp || CARACS.includes(c.stat) ? c.stat : '';
    const p = sp ? palier(sp.level) : 0, save = sp && s.incant ? avg(e.sa, e[s.incant]) - (p - 1) : '—';
    const badge = sp ? `<span class="badge">Sort signature « ${esc(sp.name || 'sans nom')} » : save sans cible ${save} · malus de save (contre cible) ${p - 1}</span>`
      : CARACS.includes(c.stat) ? `<span class="badge">${CARAC_NAMES[c.stat]} · %R : ${successRate(s.nature, e[c.stat])} %</span>` : '';
    const opts = Object.keys(CARD_OPTIONAL), dur = parseInt(c.o.duration) || 0;
    const attr = (k, label, ph = '', type = 'text') => `<label class="field">${label}<input type="${type}" min="0" placeholder="${ph}" data-l="cards" data-i="${i}" data-k="${k}" value="${esc(k.startsWith('o.') ? c.o[k.slice(2)] : c[k])}"></label>`;
    return `<div class="item"><div class="row"><input class="grow" data-l="cards" data-i="${i}" data-k="name" value="${esc(c.name)}" placeholder="Nom de la card">
      <select data-l="cards" data-i="${i}" data-k="type" aria-label="Type">${Object.entries(CARD_TYPES).map(([k, v]) => `<option value="${k}" ${c.type === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
      <select data-l="cards" data-i="${i}" data-k="stat" aria-label="Caractéristique utilisée"><option value="">Lancer : —</option>
        ${CARACS.map(id => `<option value="${id}" ${stat === id ? 'selected' : ''}>${CARAC_NAMES[id]}</option>`).join('')}
        ${s.spells.map(k => `<option value="spell:${k.id}" ${stat === 'spell:' + k.id ? 'selected' : ''}>Sort signature : ${esc(k.name || 'sans nom')}</option>`).join('')}</select>
      <button data-act="del" data-l="cards" data-i="${i}" aria-label="Supprimer">✕</button></div>
      <div class="row">${badge}${c.active ? `<span class="badge">En cours : tour ${c.turn}${dur ? ' / ' + dur : ''}</span>` : ''}</div>
      ${ta('cards', i, 'desc', c.desc, 2, 'Description générale')}
      <div class="grid2">${attr('cast', "Temps d'incantation")}${attr('mana', 'Coût en mana', '0', 'number')}${attr('range', 'Portée')}
        ${opts.filter(k => k in c.o).map(k => `<div class="field">${CARD_OPTIONAL[k].label}<div class="row"><input class="grow" type="${CARD_OPTIONAL[k].num ? 'number' : 'text'}" min="0" data-l="cards" data-i="${i}" data-k="o.${k}" value="${esc(c.o[k])}"><button data-act="optdel" data-i="${i}" data-k="${k}" aria-label="Retirer ce champ">✕</button></div></div>`).join('')}</div>
      <div class="row">${opts.filter(k => !(k in c.o)).map(k => `<button class="chip" data-act="opt" data-i="${i}" data-k="${k}">+ ${CARD_OPTIONAL[k].label}</button>`).join('')}
        <button class="p3" data-act="cast" data-i="${i}">Lancer</button>${c.active ? `<button class="p3" data-act="next" data-i="${i}">Tour suivant</button><button class="p3" data-act="end" data-i="${i}">Fin</button>` : ''}</div></div>`;
  }).join('') || '<div class="hint-line">Aucune card à afficher.</div>';
  document.querySelectorAll('#cards textarea').forEach(grow);
}
function renderTabs() {
  $('sheets').innerHTML = store.order.map(id => `<div class="tab ${id === store.active ? 'active' : ''}">
    <button class="pick" data-tab="${id}">${esc(store.sheets[id].name || 'Sans nom')}</button><button class="x" data-close="${id}" aria-label="Fermer la fiche">✕</button></div>`).join('')
    + '<button data-new>+ Nouvelle fiche</button><button data-import>Importer</button>';
}

function renderLists(s) {
  const e = effAll(s), edit = canEdit(s);
  $('skills').innerHTML = s.skills.map((k, i) => `<div class="item"><div class="row">
      ${k.level === 3 ? `<div class="grow">${ta('skills', i, 'passive', k.passive, 2, 'Texte du passif')}<span class="small">Compétence : ${esc(k.name || 'sans nom')}</span></div>`
        : `<input class="grow" data-l="skills" data-i="${i}" data-k="name" value="${esc(k.name)}" placeholder="Nom de la compétence">`}
      <span class="badge">Niveau ${k.level}/3</span>${lvlBtns('skills', i, s)}${delBtn('skills', i, s)}</div>${ta('skills', i, 'desc', k.desc, 2, 'Description')}</div>`).join('');
  $('spells').innerHTML = s.spells.map((k, i) => {
    const p = palier(k.level), save = s.incant ? avg(e.sa, e[s.incant]) - (p - 1) : '—';
    return `<div class="item"><div class="row"><input class="grow" data-l="spells" data-i="${i}" data-k="name" value="${esc(k.name)}" placeholder="Nom du sort">
      <span class="badge">Niveau ${k.level}/10 · Palier ${p}</span>${lvlBtns('spells', i, s)}${delBtn('spells', i, s)}</div>
      ${[1, 2, 3, 4].filter(q => q <= p).map(q => `<label class="field">Palier ${q}${ta('spells', i, 'd' + q, k['d' + q])}</label>`).join('')}
      <div class="row"><span class="badge">Save sans cible : ${save}</span><span class="badge">Malus de save (contre cible) : ${p - 1}</span></div></div>`;
  }).join('');
  $('flaws').innerHTML = s.flaws.map((k, i) => `<div class="item"><div class="row"><input class="grow" data-l="flaws" data-i="${i}" data-k="name" value="${esc(k.name)}" placeholder="Désavantage">${delBtn('flaws', i, s)}</div>${ta('flaws', i, 'desc', k.desc, 2, 'Description')}</div>`).join('');
  $('addSkill').classList.toggle('hidden', !edit); $('addSpell').classList.toggle('hidden', !edit); $('addFlaw').classList.toggle('hidden', !edit);
  const hint = s.phase === 1 ? 'Disponible à la phase 2 de la création.' : s.phase === 2 ? 'Phase 2 : compétence = 2 points par niveau ; sort = 1 point par niveau.' : '';
  $('skillsHint').textContent = hint; $('spellsHint').textContent = hint;
  renderCards(s);
  $('subs').innerHTML = SUBSKILLS.map(sk => {
    const j = s.subPair[sk.id] || 0, pr = sk.pairs[j], v = avg(e[pr[0]], e[pr[1]]);
    const pairs = sk.pairs.length > 1 ? sk.pairs.map((q, n) => `<button class="chip ${n === j ? 'on' : ''}" data-sub="${sk.id}" data-j="${n}">${q.join('/').toUpperCase()}</button>`).join('')
      : `<span class="small">${pr.join('/').toUpperCase()}</span>`;
    return `<div class="sub-card"><span>${sk.name}</span><strong>${v}</strong><span class="small">%R : ${successRate(s.nature, v)} %</span><div class="row">${pairs}</div></div>`;
  }).join('');
  document.querySelectorAll('textarea').forEach(grow);
}

function render() {
  const s = cur(), n = NATURES[s.nature], ph = s.phase, e = effAll(s);
  document.body.className = `phase${ph}` + (ph === 3 && levelUp ? ' levelup' : '');
  document.querySelectorAll('[data-f]').forEach(el => { el.value = s[el.dataset.f]; });
  $('nature').value = s.nature; $('nature').disabled = ph === 2; $('incant').value = s.incant; $('theme').value = s.theme; $('font').value = s.font;
  document.documentElement.dataset.theme = s.theme; document.documentElement.dataset.font = s.font; $('level').value = s.level;
  $('phaseLabel').textContent = ph === 1 ? 'Phase 1 : caractéristiques' : ph === 2 ? 'Phase 2 : compétences et sorts' : '';

  CARACS.forEach(id => {
    const el = $(id), m = s.mod[id];
    el.value = e[id]; el.title = ph === 3 ? `Maximum de création enregistré : ${s.caracMax[id]}` : '';
    // plage « min–max » sur la ligne du dessous ; valeur réelle en petit à droite de la valeur
    $(id + '-info').textContent = `${n.min}–${ph === 3 ? n.gameMax : n.max}`;
    $(id + '-info').title = ph === 3 ? `Minimum ${n.min}, maximum de jeu ${n.gameMax}` : `Minimum ${n.min}, maximum de création ${n.max}`;
    $(id + '-real').textContent = ph === 1 ? '' : ph === 2 ? `Ph.1 : ${s.p1[id]}` : `Réel : ${s.carac[id]}` + (m ? ` (${m > 0 ? '+' : ''}${m})` : '');
    $(id + '-r').textContent = `%R : ${successRate(s.nature, e[id])} %`;
  });
  document.querySelectorAll('[data-lvl^="carac"]').forEach(b => { b.disabled = s.carac[b.dataset.lvl.split(':')[1]] >= n.gameMax; });

  const q = ph === 2 ? p2(s) : null, sum = CARACS.reduce((t, id) => t + s.carac[id], 0);
  const maxTotal = ph === 3 ? CARACS.reduce((t, id) => t + s.caracMax[id], 0) : 5 * n.max;
  $('pointsCard').classList.toggle('hidden', ph === 3);
  $('pointsLabel').textContent = ph === 1 ? 'Points répartis' : 'Points restants (phase 2)';
  $('points').textContent = ph === 1 ? `${spent(s)} / ${n.budget}` : q ? `${q.rest} (dont ${s.kept} issus de la phase 1)` : '';
  $('success').textContent = `${Math.round(CARACS.reduce((t, id) => t + successRate(s.nature, e[id]), 0) / 5)} %`;
  $('total').textContent = `${sum} / ${maxTotal}`;

  const dv = derivedFunds(s.carac, s.nature); // aperçu dès la phase 1, figé à la fin de la création
  FUNDS.forEach(id => {
    $(id).readOnly = ph !== 3; $(id).value = ph === 3 ? s.fund[id].cur : dv[id];
    $(id + '-max').textContent = ph !== 3 ? '' : id === 'dodge' ? `Création : ${s.fund[id].init}` : `Max : ${s.fund[id].max}`;
  });

  $('hit').value = lookup(DICO_AGI_FOR, s.nature, e.ag); $('damage').value = lookup(DICO_AGI_FOR, s.nature, e.fo);
  Object.keys(COINS).forEach(id => { $('coin-' + id).value = s.coins[id]; });
  $('chance').value = s.chance; $('initiative').value = Math.round((e.ag + e.pe) / 2 + s.chance);
  const cls = touchClasses(s.nature, e.ag);
  document.querySelectorAll('.touch-cell').forEach((cell, i) => {
    cell.querySelector('input').value = cls[i];
    cell.querySelector('.dmg').textContent = cls[i] !== '—' && TOUCH_DICE[i] ? `(+${TOUCH_DICE[i]} dégâts)` : '';
  });

  $('validate').classList.toggle('hidden', ph === 3);
  $('validate').textContent = ph === 1 ? 'Valider' : 'Terminer la création';
  $('validate').disabled = ph === 2 && q.rest !== 0;
  $('levelUp').classList.toggle('hidden', ph !== 3); $('levelUp').textContent = levelUp ? 'Terminer Level Up' : 'Level Up';
  $('restore').disabled = !snaps[s.id];
  $('saveInfo').textContent = `Enregistrement automatique dans ce navigateur, sur cet appareil. Dernier : ${fmtDate(s.savedAt)}`;
  renderTabs(); renderLists(s); renderExport();
}
function commit() { render(); save(); }

// ---- Suivi des exports : ligne d'info, bandeau d'avertissement et message avant fermeture
const dirty = s => s.changedAt && (!s.exportedAt || s.changedAt > s.exportedAt);
const atRisk = () => store.order.map(id => store.sheets[id]).filter(s => dirty(s) && Date.now() - new Date(s.exportedAt || s.createdAt) > EXPORT_REMINDER_H * 3600e3);
function ago(iso) {
  if (!iso) return 'jamais';
  const m = Math.floor((Date.now() - new Date(iso)) / 60000);
  return m < 1 ? "à l'instant" : m < 60 ? `il y a ${m} min` : m < 1440 ? `il y a ${Math.floor(m / 60)} h` : `il y a ${Math.floor(m / 1440)} j`;
}
function renderExport() {
  const s = cur(), risk = atRisk();
  $('exportInfo').textContent = `Dernier export de cette fiche : ${ago(s.exportedAt)}` + (dirty(s) ? ' · modifications non exportées' : '');
  $('exportInfo').classList.toggle('warn', risk.includes(s));
  $('exportWarn').classList.toggle('hidden', !risk.length);
  $('exportWarnText').textContent = `⚠ ${risk.length} fiche${risk.length > 1 ? 's ont' : ' a'} des modifications non exportées depuis plus de ${EXPORT_REMINDER_H} h. Pense à sauvegarder.`;
}
window.addEventListener('beforeunload', e => { if (atRisk().length) { e.preventDefault(); e.returnValue = ''; } });
setInterval(renderExport, 60000);

/* ================= 5. ÉVÉNEMENTS ================= */
// Saisie de texte : enregistrée sans réafficher (le curseur ne bouge pas)
document.addEventListener('input', e => {
  const t = e.target, s = cur(); if (t.tagName === 'SELECT') return;
  if (t.dataset.f) { s[t.dataset.f] = t.value; if (t.dataset.f === 'name') renderTabs(); }
  else if (t.dataset.l) { const it = s[t.dataset.l][+t.dataset.i], k = t.dataset.k; if (k.startsWith('o.')) it.o[k.slice(2)] = t.value; else it[k] = t.value; }
  else return;
  if (t.tagName === 'TEXTAREA') grow(t);
  save(); renderExport();
});
// Cellules numériques : valeur tapée (validée à la sortie du champ ou par Entrée)
document.addEventListener('change', e => {
  const t = e.target;
  if (t.tagName === 'SELECT' && t.dataset.l) { cur()[t.dataset.l][+t.dataset.i][t.dataset.k] = t.value; return commit(); } // type / caractéristique d'une card
  if (!t.classList.contains('cell')) return;
  const v = parseInt(t.value);
  if (!isNaN(v)) setCell(t.dataset.cell, v);
  commit();
});
// Clavier : flèches = changer de champ (cellules, identité, textes) ; + / − = ajuster une cellule ; Entrée valide ; Échap annule
const NAVSEL = '.cell, [data-f], #nature, #incant, #theme, #font, #cardSearch';
document.addEventListener('focusin', e => { if (e.target.classList && e.target.classList.contains('cell')) e.target.select(); });
document.addEventListener('keydown', e => {
  const t = e.target, k = e.key; if (!t.matches || !t.matches(NAVSEL)) return;
  if (t.classList.contains('cell')) {
    if (k === '+' || k === '-') { e.preventDefault(); stepCell(t.dataset.cell, k === '+' ? 1 : -1); commit(); t.select(); return; }
    if (k === 'Enter') { e.preventDefault(); t.blur(); t.focus(); return; }
    if (k === 'Escape') { render(); t.select(); return; }
  }
  if (k.startsWith('Arrow') && shouldNavigate(t, k)) { e.preventDefault(); navigate(t, k); }
});
function shouldNavigate(t, k) { // dans un texte, les flèches ne quittent le champ qu'aux extrémités
  if (t.tagName === 'SELECT') return k === 'ArrowLeft' || k === 'ArrowRight'; // ↑ ↓ changent le choix
  if (t.classList.contains('cell')) return true;
  const multi = t.tagName === 'TEXTAREA', a = t.selectionStart, b = t.selectionEnd, n = t.value.length;
  const start = a === 0 && b === 0, end = a === n && b === n;
  if (k === 'ArrowLeft') return start; if (k === 'ArrowRight') return end;
  return k === 'ArrowUp' ? !multi || start : !multi || end;
}
function navigate(t, key) {
  const cells = [...document.querySelectorAll(NAVSEL)].filter(c => c.offsetParent && !c.disabled), i = cells.indexOf(t);
  let next;
  if (key === 'ArrowRight') next = cells[i + 1]; else if (key === 'ArrowLeft') next = cells[i - 1];
  else { // haut / bas : champ le plus proche dans la rangée suivante
    const r = t.getBoundingClientRect(), dir = key === 'ArrowDown' ? 1 : -1; let best = 1e9;
    cells.forEach(c => { const q = c.getBoundingClientRect(), dy = (q.top - r.top) * dir; if (dy > 10 && dy * 3 + Math.abs(q.left - r.left) < best) { best = dy * 3 + Math.abs(q.left - r.left); next = c; } });
  }
  if (!next) return;
  next.focus();
  if (next.tagName === 'TEXTAREA' || next.type === 'text') { const p = key === 'ArrowLeft' ? next.value.length : 0; next.setSelectionRange(p, p); }
}

document.addEventListener('click', e => {
  const b = e.target.closest('button'), s = cur(); if (!b) return;
  const d = b.dataset; let touch = true; // touch = false : simple navigation, la fiche n'est pas modifiée
  if (d.step) { stepCell(d.step, +d.d); }
  else if (d.lvl) { const [k, id] = d.lvl.split(':'); if (k === 'carac') { if (s.carac[id] < NATURES[s.nature].gameMax) s.carac[id]++; } else { s.fund[id].max++; s.fund[id].cur++; } }
  else if (d.reset) s.mod[d.reset] = 0;
  else if (d.cf) cardFilter = d.cf;
  else if (d.act === 'opt' || d.act === 'optdel' || d.act === 'cast' || d.act === 'next' || d.act === 'end') cardAction(d.act, +d.i, d.k);
  else if (d.sub) s.subPair[d.sub] = +d.j;
  else if (d.act === 'lvl') stepLevel(d.l, +d.i, +d.d);
  else if (d.act === 'del') { if (!confirm('Supprimer cet élément ?')) return; s[d.l].splice(+d.i, 1); }
  else if (b.id === 'addCard') addCard(); else if (b.id === 'addSkill') addItem('skills'); else if (b.id === 'addSpell') addItem('spells'); else if (b.id === 'addFlaw') addItem('flaws');
  else if (d.tab) { store.active = d.tab; levelUp = false; touch = false; }
  else if (d.close) {
    const c = store.sheets[d.close];
    if (!confirm(`Fermer la fiche « ${c.name || 'Sans nom'} » ? Elle sera supprimée de ce navigateur (pensez à l'exporter).`)) return;
    store.order = store.order.filter(id => id !== d.close); delete store.sheets[d.close]; delete snaps[d.close];
    if (!store.order.length) addSheet(newSheet()); else if (store.active === d.close) store.active = store.order[0];
    touch = false;
  }
  else if ('new' in d) { addSheet(newSheet()); touch = false; }
  else if ('import' in d) return $('importFile').click();
  else return;
  if (touch) commit(); else { render(); persist(); }
});
$('nature').addEventListener('change', e => changeNature(e.target.value));
$('incant').addEventListener('change', e => { cur().incant = e.target.value; commit(); });
$('theme').addEventListener('change', e => { cur().theme = e.target.value; commit(); });
$('font').addEventListener('change', e => { cur().font = e.target.value; commit(); });
$('cardSearch').addEventListener('input', e => { cardQuery = e.target.value; renderCards(cur()); });
$('validate').addEventListener('click', validate);
$('levelUp').addEventListener('click', () => { levelUp = !levelUp; render(); });
$('rollChance').addEventListener('click', () => { cur().chance = Math.floor(Math.random() * 10) + 1; commit(); });
$('restore').addEventListener('click', () => { // retour à la version de la fiche à l'ouverture de la page
  const s = cur(), old = JSON.parse(snaps[s.id]);
  if (!confirm(`Êtes-vous sûr de vouloir revenir à la version de votre fiche en date du ${fmtDate(old.savedAt)} ?`)) return;
  store.sheets[s.id] = old; levelUp = false; commit();
});
function download(name, obj) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' }));
  a.download = name; a.click(); URL.revokeObjectURL(a.href);
}
function exportSheets(list, name, payload) { // marque les fiches comme exportées sans les modifier
  download(name, payload);
  const now = new Date().toISOString(); list.forEach(s => { s.exportedAt = now; });
  persist(); renderExport();
}
const slug = t => (t || 'personnage').replace(/\W+/g, '-');
$('export').addEventListener('click', () => { const s = cur(); exportSheets([s], `coia-${slug(s.name)}.json`, s); });
const exportAll = () => { const all = store.order.map(id => store.sheets[id]); exportSheets(all, 'coia-toutes-les-fiches.json', { type: 'coia-all', exportedAt: new Date().toISOString(), sheets: all }); };
$('exportAll').addEventListener('click', exportAll);
$('exportAllWarn').addEventListener('click', exportAll);
$('importFile').addEventListener('change', e => { // l'import (une fiche ou un export complet) ouvre de nouvelles fiches
  const f = e.target.files[0]; if (!f) return;
  f.text().then(txt => {
    const data = JSON.parse(txt), list = data.type === 'coia-all' && Array.isArray(data.sheets) ? data.sheets : [data];
    if (!list.every(d => NATURES[d.nature] && d.carac)) throw new Error('format');
    list.forEach(d => { const s = norm({ ...d, id: uid() }); s.exportedAt = new Date().toISOString(); s.changedAt = null; addSheet(s); });
    render(); persist(); // un import n'est pas une modification
  }).catch(() => alert("Ce fichier n'est pas une fiche valide.")).finally(() => { e.target.value = ''; });
});

render();
