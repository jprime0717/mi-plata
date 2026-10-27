'use strict';
/* =====================================================================
   Mi Plata — control de gastos personal (PWA, 100% local)
   ===================================================================== */
const APP_VERSION = '1.2.0';
// Si otra página intenta cargar la app dentro de un iframe (clickjacking), no arranca.
if (window.top !== window.self) { document.documentElement.textContent = ''; throw new Error('Mi Plata no se puede abrir dentro de otra página'); }
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseYmd = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const todayStr = () => ymd(new Date());
const addDays = (d, n) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; };
const addMonths = (d, n) => { const x = new Date(d.getFullYear(), d.getMonth() + n, 1); const last = new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate(); x.setDate(Math.min(d.getDate(), last)); return x; };
const daysBetween = (a, b) => Math.round((parseYmd(b) - parseYmd(a)) / 864e5);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const round2 = v => Math.round((+v || 0) * 100) / 100;
const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
const clean = s => s.replace(/\./g, '');
const numStr = n => (n === null || n === undefined || n === '') ? '' : String(n).replace('.', ',');
// Acepta 1.500.000 · 1.500.000,50 · 10,5 · 10.5 (punto decimal si no parece separador de miles).
const parseNum = s => {
  s = String(s ?? '').trim().replace(/[\s$]/g, '');
  if (!s) return 0;
  const neg = /^[-−]/.test(s); s = s.replace(/^[-−]/, '');
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  if (!/^\d*\.?\d*$/.test(s)) return 0;
  const v = parseFloat(s); return isFinite(v) ? (neg ? -v : v) : 0;
};
const safeColor = v => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : '#8395a7';

const fmt = {
  d: new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short' }),
  dy: new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }),
  m: new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }),
  ms: new Intl.DateTimeFormat('es-CO', { month: 'short' }),
  wd: new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long' }),
  wds: new Intl.DateTimeFormat('es-CO', { weekday: 'short', day: 'numeric', month: 'short' }),
};
const NO_DEC = ['COP', 'CLP', 'JPY', 'PYG', 'KRW'];
const nfCache = {};
function money(n, cur) {
  cur = cur || S().currency;
  if (!nfCache[cur]) {
    try { nfCache[cur] = new Intl.NumberFormat('es-CO', { style: 'currency', currency: cur, minimumFractionDigits: 0, maximumFractionDigits: NO_DEC.includes(cur) ? 0 : 2 }); }
    catch { nfCache[cur] = { format: v => cur + ' ' + v.toFixed(2) }; }
  }
  return nfCache[cur].format(+n || 0);
}

const CURRENCIES = [['COP', 'Peso colombiano'], ['USD', 'Dólar estadounidense'], ['EUR', 'Euro'], ['MXN', 'Peso mexicano'], ['ARS', 'Peso argentino'], ['CLP', 'Peso chileno'], ['PEN', 'Sol peruano'], ['BRL', 'Real brasileño'], ['GBP', 'Libra esterlina'], ['CAD', 'Dólar canadiense'], ['PAB', 'Balboa panameño'], ['DOP', 'Peso dominicano']];
const COLORS = ['#ff6b6b', '#ff9f43', '#feca57', '#1dd1a1', '#10ac84', '#48dbfb', '#2e86de', '#5f6ee8', '#a55eea', '#f368e0', '#e84393', '#c8a165', '#8395a7', '#00b894', '#fd7272', '#0abde3'];
const EMOJIS = '🛒 🍔 ☕ 🍕 🍺 🥗 🚌 🚕 ⛽ 🚗 🏍️ 🅿️ 🏠 💡 💧 🔥 📱 🌐 💊 🩺 🦷 🏋️ ⚽ 🚴 🥾 👕 👟 💇 🧴 🎉 🎬 🎮 🎵 📺 📚 🎓 🎁 🐾 👶 ✈️ 🏖️ 🏨 💳 🏦 🧾 🔧 🛠️ 🪴 💻 🖥️ 📦 💼 🏷️ 📈 💰 💵 🐷 💎 🪙 ❤️ ⭐ 🙏 🏥 🚿 🧹 🍼 🎂 🍷 🚬 ⛪ 🏛️ 📄 🛡️ 🔑 🏕️ 🎸'.split(' ');
const FREQ = { daily: 'Diario', weekly: 'Semanal', biweekly: 'Quincenal', monthly: 'Mensual', yearly: 'Anual' };

const ICON = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M3.5 10.5 12 3.8l8.5 6.7V19a1.5 1.5 0 0 1-1.5 1.5h-4.5v-6h-5v6H5A1.5 1.5 0 0 1 3.5 19z"/></svg>',
  wallet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3" y="6.5" width="18" height="13.5" rx="3"/><path d="M5 6.5 15.5 3.6a1.5 1.5 0 0 1 1.9 1.1l.4 1.8"/><circle cx="16.5" cy="13.2" r="1.3" fill="currentColor"/></svg>',
  pie: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M11 3.6A8.5 8.5 0 1 0 20.4 13H11z"/><path d="M14 3.3a8.5 8.5 0 0 1 6.7 6.7H14z"/></svg>',
  sliders: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2.2"/><circle cx="9" cy="17" r="2.2"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/></svg>',
};

/* ===================== Persistencia (IndexedDB + respaldo) ===================== */
const DB = {
  db: null,
  open() {
    return new Promise((res, rej) => {
      if (!('indexedDB' in window)) return rej(new Error('sin IndexedDB'));
      const r = indexedDB.open('miplata', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('kv');
      r.onsuccess = () => { this.db = r.result; res(); };
      r.onerror = () => rej(r.error);
    });
  },
  get(k) { return new Promise((res, rej) => { const q = this.db.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); },
  set(k, v) { return new Promise((res, rej) => { const t = this.db.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k); t.oncomplete = () => res(); t.onerror = () => rej(t.error); }); },
};

let state;
const ui = { tab: 'home', period: 'month', off: 0, acct: 'all', mode: 'cat', exp: {}, custom: null, boff: 0 };
const S = () => state.settings;

function defaultState() {
  const E = [
    ['Mercado', '🛒', 3], ['Restaurantes', '🍔', 1], ['Café y snacks', '☕', 11], ['Transporte', '🚌', 5],
    ['Gasolina', '⛽', 2], ['Carro / Moto', '🚗', 6], ['Arriendo / Casa', '🏠', 7], ['Servicios', '💡', 0],
    ['Internet y celular', '📱', 15], ['Salud', '💊', 14], ['Gym y deporte', '🏋️', 4], ['Ropa', '👕', 8],
    ['Cuidado personal', '🧴', 9], ['Salidas', '🎉', 10], ['Suscripciones', '📺', 12], ['Educación', '📚', 13],
    ['Regalos', '🎁', 0], ['Mascotas', '🐾', 11], ['Viajes', '✈️', 5], ['Créditos y deudas', '💳', 12], ['Otros gastos', '📦', 12],
  ];
  const I = [['Salario', '💼', 3], ['Freelance', '💻', 6], ['Ventas', '🏷️', 1], ['Inversiones', '📈', 4], ['Regalos recibidos', '🎁', 9], ['Otros ingresos', '💰', 2]];
  const mk = (type) => ([n, ic, ci]) => ({ id: uid(), type, name: n, icon: ic, color: COLORS[ci], budget: 0, archived: false });
  return {
    v: 1,
    settings: { currency: 'COP', weekStart: 1, monthStart: 1, theme: 'auto', period: 'month', rates: { USD: 4000, EUR: 4350 }, pinHash: null, pinSalt: null, bioId: null, defaultAccount: null, lastAccount: null, lastBackup: null, installHint: true, pinLen: 4, pinFails: 0, pinLockUntil: 0, backupSnooze: null, lockAfter: 0 },
    accounts: [
      { id: uid(), name: 'Efectivo', icon: '💵', color: COLORS[4], currency: 'COP', initial: 0, include: true, archived: false },
      { id: uid(), name: 'Banco', icon: '🏦', color: COLORS[6], currency: 'COP', initial: 0, include: true, archived: false },
      { id: uid(), name: 'Ahorros', icon: '🐷', color: COLORS[9], currency: 'COP', initial: 0, include: true, archived: false },
    ],
    categories: [...E.map(mk('expense')), ...I.map(mk('income'))],
    tx: [], recurring: [], goals: [],
    budget: { amount: 0 },
  };
}
function migrate(d) {
  const base = defaultState();
  const s = Object.assign({}, base, d);
  s.settings = Object.assign({}, base.settings, d.settings || {});
  s.settings.rates = Object.assign({}, d.settings?.rates || base.settings.rates);
  for (const k of ['accounts', 'categories', 'tx', 'recurring', 'goals']) if (!Array.isArray(s[k])) s[k] = k === 'accounts' || k === 'categories' ? base[k] : [];
  s.budget = Object.assign({ amount: 0 }, d.budget || {});
  s.v = 1;
  return s;
}
let saveT, saveWarnAt = 0, loadProblem = false;
function save() { clearTimeout(saveT); saveT = setTimeout(persist, 120); }
async function persist() {
  clearTimeout(saveT);
  if (!state) return;
  state.savedAt = Date.now();
  const data = JSON.stringify(state);
  let ok = false;
  try { if (DB.db) { await DB.set('state', data); ok = true; } } catch (e) { console.warn('IDB', e); }
  try { localStorage.setItem('miplata_state', data); ok = true; } catch (e) { /* lleno o bloqueado */ }
  if (!ok && Date.now() - saveWarnAt > 60000) { saveWarnAt = Date.now(); toast('No se pudo guardar. Libera espacio en el iPhone y crea un respaldo.'); }
}
async function load() {
  let idbRaw = null, lsRaw = null;
  try { await DB.open(); idbRaw = await DB.get('state'); } catch (e) { console.warn(e); }
  try { lsRaw = localStorage.getItem('miplata_state'); } catch (e) { }
  const parse = r => { try { const o = r ? JSON.parse(r) : null; return o && typeof o === 'object' && Array.isArray(o.tx) ? o : null; } catch { return null; } };
  const a = parse(idbRaw), b = parse(lsRaw);
  // Usa la copia más reciente (por si una de las dos no alcanzó a guardarse).
  const pick = a && b ? ((+b.savedAt || 0) > (+a.savedAt || 0) ? b : a) : (a || b);
  if (!pick && (idbRaw || lsRaw)) {
    // Datos ilegibles: se aparta una copia antes de empezar de cero, para poder recuperarlos.
    const key = 'corrupt_' + Date.now();
    try { if (DB.db) await DB.set(key, idbRaw || lsRaw); } catch (e) { }
    try { localStorage.setItem('miplata_' + key, lsRaw || idbRaw); } catch (e) { }
    loadProblem = true;
  }
  state = pick ? migrate(pick) : defaultState();
  if (!pick) persist();
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) { }
}

/* ===================== Dominio ===================== */
const acct = id => state.accounts.find(a => a.id === id);
const cat = id => state.categories.find(c => c.id === id);
const activeAccounts = () => state.accounts.filter(a => !a.archived);
const cats = type => state.categories.filter(c => c.type === type && !c.archived);
const acur = id => acct(id)?.currency || S().currency;
const rate = cur => cur === S().currency ? 1 : (+S().rates[cur] || 1);
const toMain = (v, cur) => (+v || 0) * rate(cur);
const convert = (v, from, to) => toMain(v, from) / rate(to);
const amtMain = t => toMain(t.amount, acur(t.accountId));
const sumMain = list => list.reduce((s, t) => s + amtMain(t), 0);

function balance(a, upTo) {
  upTo = upTo || todayStr();
  let b = +a.initial || 0;
  for (const t of state.tx) {
    if (t.date > upTo) continue;
    if (t.accountId === a.id) b += t.type === 'income' ? t.amount : -t.amount;
    if (t.type === 'transfer' && t.toAccountId === a.id) b += (t.toAmount ?? t.amount);
  }
  return round2(b);
}
function totalBalance() { return activeAccounts().filter(a => a.include).reduce((s, a) => s + toMain(balance(a), a.currency), 0); }

function rangeFor(p, off, custom) {
  const t = new Date(); t.setHours(0, 0, 0, 0);
  let from, to;
  if (p === 'day') { from = to = addDays(t, off); }
  else if (p === 'week') { const dow = (t.getDay() - S().weekStart + 7) % 7; from = addDays(t, -dow + 7 * off); to = addDays(from, 6); }
  else if (p === 'month') {
    const md = S().monthStart || 1;
    let y = t.getFullYear(), m = t.getMonth();
    if (t.getDate() < md) m -= 1;
    from = new Date(y, m + off, md);
    to = addDays(new Date(from.getFullYear(), from.getMonth() + 1, md), -1);
  }
  else if (p === 'year') { const y = t.getFullYear() + off; from = new Date(y, 0, 1); to = new Date(y, 11, 31); }
  else if (p === 'custom' && custom) {
    const a = parseYmd(custom.a), b = parseYmd(custom.b), span = daysBetween(custom.a, custom.b) + 1;
    from = addDays(a, span * off); to = addDays(b, span * off);
  }
  else { from = new Date(2000, 0, 1); to = new Date(2999, 11, 31); }
  return { from, to, a: ymd(from), b: ymd(to) };
}
const curRange = () => rangeFor(ui.period, ui.off, ui.custom);
const inRange = (d, r) => d >= r.a && d <= r.b;
function periodLabel(p, r) {
  const t = todayStr();
  if (p === 'day') { if (r.a === t) return 'Hoy'; if (r.a === ymd(addDays(new Date(), -1))) return 'Ayer'; return cap(fmt.wd.format(r.from)); }
  if (p === 'week') return `${clean(fmt.d.format(r.from))} – ${clean(fmt.d.format(r.to))}`;
  if (p === 'month') return (S().monthStart || 1) === 1 ? cap(fmt.m.format(r.from)) : `${clean(fmt.d.format(r.from))} – ${clean(fmt.d.format(r.to))}`;
  if (p === 'year') return String(r.from.getFullYear());
  if (p === 'all') return 'Todo el tiempo';
  return `${clean(fmt.dy.format(r.from))} – ${clean(fmt.dy.format(r.to))}`;
}
const PERIOD_NAMES = { day: 'Día', week: 'Semana', month: 'Mes', year: 'Año', all: 'Todo', custom: 'Rango' };
function dateLabel(s) {
  const t = todayStr();
  if (s === t) return 'Hoy';
  if (s === ymd(addDays(new Date(), -1))) return 'Ayer';
  if (s === ymd(addDays(new Date(), 1))) return 'Mañana';
  const d = parseYmd(s);
  return clean(d.getFullYear() === new Date().getFullYear() ? fmt.d.format(d) : fmt.dy.format(d));
}
const matchAcct = t => ui.acct === 'all' || t.accountId === ui.acct || t.toAccountId === ui.acct;

/* ---- Pagos recurrentes ---- */
function occurrence(start, freq, n) {
  const s = parseYmd(start);
  switch (freq) {
    case 'daily': return addDays(s, n);
    case 'weekly': return addDays(s, 7 * n);
    case 'biweekly': return addDays(s, 14 * n);
    case 'monthly': return addMonths(s, n);
    case 'yearly': return addMonths(s, 12 * n);
  }
  return addMonths(s, n);
}
function processRecurring() {
  const t = todayStr(); let made = 0;
  for (const r of state.recurring) {
    if (!r.active) continue;
    let guard = 0;
    while (guard++ < 1000) {
      const d = ymd(occurrence(r.start, r.freq, r.n));
      if (d > t || (r.end && d > r.end)) break;
      const tpl = r.tpl;
      if (acct(tpl.accountId)) {
        const tx = { id: uid(), type: tpl.type, amount: tpl.amount, accountId: tpl.accountId, date: d, note: tpl.note || '', created: Date.now(), recId: r.id };
        if (tpl.type === 'transfer') { tx.toAccountId = tpl.toAccountId; tx.toAmount = tpl.toAmount ?? tpl.amount; } else tx.categoryId = tpl.categoryId;
        state.tx.push(tx); made++;
      }
      r.n++;
    }
  }
  if (made) { save(); }
  return made;
}
const nextOcc = r => ymd(occurrence(r.start, r.freq, r.n));

/* ===================== Utilidades de UI ===================== */
let toastT;
function toast(msg, action) {
  const el = $('#toast');
  el.innerHTML = `<span>${esc(msg)}</span>${action ? `<button>${esc(action.label)}</button>` : ''}`;
  if (action) el.querySelector('button').onclick = () => { el.classList.remove('show'); action.fn(); };
  el.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => el.classList.remove('show'), action ? 5000 : 2200);
}
function openSheet(html, o = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'sheet-wrap';
  const full = (o.cls || '').includes('full');
  wrap.innerHTML = `<div class="backdrop"></div><div class="sheet ${o.cls || ''}" role="dialog" aria-modal="true">${full ? '' : '<div class="grab"></div>'}<div class="sheet-body">${html}</div></div>`;
  $('#sheets').appendChild(wrap);
  wrap._onClose = o.onClose;
  wrap.offsetHeight; // fuerza reflow para animar
  requestAnimationFrame(() => wrap.classList.add('open'));
  wrap.querySelector('.backdrop').addEventListener('click', () => closeSheet(wrap));
  // arrastrar hacia abajo para cerrar
  if (!full) {
    const sh = wrap.querySelector('.sheet'), body = wrap.querySelector('.sheet-body');
    let y0 = null, dy = 0;
    sh.addEventListener('touchstart', e => { if (body.scrollTop > 0 || e.target.closest('input,select,textarea,.emoji-grid')) { y0 = null; return; } y0 = e.touches[0].clientY; dy = 0; }, { passive: true });
    sh.addEventListener('touchmove', e => { if (y0 === null) return; dy = e.touches[0].clientY - y0; if (dy > 0) { sh.style.transition = 'none'; sh.style.transform = `translateY(${dy}px)`; } }, { passive: true });
    sh.addEventListener('touchend', () => { if (y0 === null) return; sh.style.transition = ''; sh.style.transform = ''; if (dy > 90) closeSheet(wrap); y0 = null; });
  }
  return wrap;
}
function closeSheet(w, silent) {
  if (!w || w._closing) return;
  w._closing = true;
  w.classList.remove('open');
  if (!silent && w._onClose) w._onClose();
  setTimeout(() => w.remove(), 260);
}
function choose(title, options) {
  return new Promise(res => {
    const html = `${title ? `<div class="sh-title">${esc(title)}</div>` : ''}<div class="opt-list">${options.map((o, i) => `<button class="opt ${o.sel ? 'sel' : ''} ${o.danger ? 'danger' : ''}" data-i="${i}">${o.icon ? `<span class="oi">${esc(o.icon)}</span>` : ''}<span class="ol"><span>${esc(o.label)}</span>${o.sub ? `<span class="os num">${esc(o.sub)}</span>` : ''}</span>${o.sel ? '<span class="chk">✓</span>' : ''}</button>`).join('')}</div><button class="btn ghost block" data-x>Cancelar</button>`;
    let done = false;
    const el = openSheet(html, { onClose: () => { if (!done) res(null); } });
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-i]');
      if (b) { done = true; closeSheet(el, true); res(options[+b.dataset.i].value); }
      else if (e.target.closest('[data-x]')) closeSheet(el);
    });
  });
}
const confirmDlg = (title, okLabel = 'Eliminar') => choose(title, [{ label: okLabel, value: true, danger: true }]).then(v => !!v);

function fieldHTML(f) {
  const lab = f.label ? `<label class="f-label">${esc(f.label)}</label>` : '';
  switch (f.type) {
    case 'text': return `<div class="field">${lab}<input name="${f.key}" value="${esc(f.value ?? '')}" placeholder="${esc(f.placeholder || '')}" autocomplete="off" maxlength="40"></div>`;
    case 'password': return `<div class="field">${lab}<input type="password" name="${f.key}" autocomplete="new-password" autocapitalize="off" spellcheck="false" maxlength="128"></div>`;
    case 'money': return `<div class="field">${lab}<input name="${f.key}" inputmode="decimal" value="${f.value ? esc(numStr(f.value)) : ''}" placeholder="${esc(f.placeholder || '0')}" autocomplete="off"></div>`;
    case 'int': return `<div class="field">${lab}<input name="${f.key}" inputmode="numeric" pattern="[0-9]*" value="${esc(f.value ?? '')}" placeholder="${esc(f.placeholder || '')}"></div>`;
    case 'date': return `<div class="field">${lab}<input type="date" name="${f.key}" value="${esc(f.value || '')}"></div>`;
    case 'select': return `<div class="field">${lab}<select name="${f.key}">${f.options.map(o => `<option value="${esc(o[0])}" ${String(o[0]) === String(f.value) ? 'selected' : ''}>${esc(o[1])}</option>`).join('')}</select></div>`;
    case 'toggle': return `<label class="field toggle"><span>${esc(f.label)}</span><input type="checkbox" class="switch" name="${f.key}" ${f.value ? 'checked' : ''}></label>${f.hint ? `<p class="hint">${esc(f.hint)}</p>` : ''}`;
    case 'emoji': { const list = EMOJIS.includes(f.value) ? EMOJIS : [f.value, ...EMOJIS]; return `<div class="field" data-field="${f.key}">${lab}<div class="emoji-grid">${list.map(e => `<button type="button" data-emoji="${esc(e)}" class="${e === f.value ? 'sel' : ''}">${esc(e)}</button>`).join('')}</div></div>`; }
    case 'color': return `<div class="field" data-field="${f.key}">${lab}<div class="color-grid">${COLORS.map(c => `<button type="button" data-color="${c}" style="--c:${c}" class="${c === f.value ? 'sel' : ''}" aria-label="color ${c}"></button>`).join('')}</div></div>`;
    case 'hint': return `<p class="hint">${esc(f.text)}</p>`;
  }
  return '';
}
function formSheet(title, fields, opts = {}) {
  return new Promise(res => {
    const vals = {}; fields.forEach(f => { if (f.key) vals[f.key] = f.value; });
    const html = `<div class="sh-title">${esc(title)}</div><form class="form" novalidate>${fields.map(fieldHTML).join('')}<div class="form-actions">${opts.del ? `<button type="button" class="btn danger" data-del>${esc(opts.del)}</button>` : ''}<button type="submit" class="btn primary">${esc(opts.ok || 'Guardar')}</button></div></form>`;
    let done = false;
    const el = openSheet(html, { cls: opts.tall ? 'tall' : '', onClose: () => { if (!done) res(null); } });
    el.addEventListener('click', e => {
      const em = e.target.closest('[data-emoji]');
      if (em) { const k = em.closest('[data-field]').dataset.field; vals[k] = em.dataset.emoji; $$('.sel', em.parentElement).forEach(x => x.classList.remove('sel')); em.classList.add('sel'); return; }
      const co = e.target.closest('[data-color]');
      if (co) { const k = co.closest('[data-field]').dataset.field; vals[k] = co.dataset.color; $$('.sel', co.parentElement).forEach(x => x.classList.remove('sel')); co.classList.add('sel'); return; }
      if (e.target.closest('[data-del]')) { done = true; closeSheet(el, true); res({ __delete: true }); }
    });
    el.querySelector('form').addEventListener('submit', e => {
      e.preventDefault();
      for (const f of fields) {
        if (!f.key || f.type === 'emoji' || f.type === 'color') continue;
        const inp = el.querySelector(`[name="${f.key}"]`); if (!inp) continue;
        if (f.type === 'toggle') vals[f.key] = inp.checked;
        else if (f.type === 'money') vals[f.key] = parseNum(inp.value);
        else if (f.type === 'int') vals[f.key] = parseInt(inp.value, 10) || 0;
        else if (f.type === 'password') vals[f.key] = inp.value;
        else vals[f.key] = inp.value.trim();
      }
      if (opts.validate) { const err = opts.validate(vals); if (err) return toast(err); }
      done = true; closeSheet(el, true); res(vals);
    });
  });
}
async function shareFile(name, content, type) {
  const blob = new Blob([content], { type });
  try {
    const file = new File([blob], name, { type });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: name }); return true; }
  } catch (e) { if (e && e.name === 'AbortError') return false; }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 8000);
  return true;
}
function barHTML(spent, limit) {
  const p = limit > 0 ? spent / limit : 0;
  const cls = p >= 1 ? 'x' : p >= .8 ? 'w' : '';
  return `<div class="bar"><i class="${cls}" style="width:${Math.min(100, p * 100).toFixed(1)}%"></i></div>`;
}

/* ===================== Vistas ===================== */
function render() {
  applyTheme();
  const v = $('#view');
  if (ui.tab === 'home') v.innerHTML = viewHome();
  else if (ui.tab === 'accounts') v.innerHTML = viewAccounts();
  else if (ui.tab === 'budget') v.innerHTML = viewBudget();
  else v.innerHTML = viewMore();
  $('#tabbar').innerHTML = [['home', 'Inicio', ICON.home], ['accounts', 'Cuentas', ICON.wallet], ['budget', 'Presupuesto', ICON.pie], ['more', 'Ajustes', ICON.sliders]]
    .map(([k, l, i]) => `<button data-act="tab" data-tab="${k}" class="${ui.tab === k ? 'on' : ''}">${i}<span>${l}</span></button>`).join('');
  $('#actionbar').innerHTML = ui.tab === 'home'
    ? `<button class="fab exp" data-act="add" data-type="expense" aria-label="Agregar gasto">−</button><button class="fab tr" data-act="add" data-type="transfer" aria-label="Transferencia">⇄</button><button class="fab inc" data-act="add" data-type="income" aria-label="Agregar ingreso">+</button>`
    : '';
}

function viewHome() {
  const r = curRange();
  const list = state.tx.filter(t => inRange(t.date, r) && matchAcct(t));
  const exp = list.filter(t => t.type === 'expense' && (ui.acct === 'all' || t.accountId === ui.acct));
  const inc = list.filter(t => t.type === 'income' && (ui.acct === 'all' || t.accountId === ui.acct));
  const tE = sumMain(exp), tI = sumMain(inc);
  const byCat = {}; exp.forEach(t => { byCat[t.categoryId] = (byCat[t.categoryId] || 0) + amtMain(t); });
  const a = ui.acct === 'all' ? null : acct(ui.acct);
  const bal = a ? balance(a) : totalBalance();
  const balCur = a ? a.currency : S().currency;

  // dona
  const size = Math.max(280, Math.min(window.innerWidth - 24, 400));
  const c = size / 2, rr = size * 0.27, sw = size * 0.082;
  const isz = Math.round(Math.max(38, Math.min(48, size * 0.125)));
  const R = c - isz / 2 - 3;
  const C = 2 * Math.PI * rr;
  const segs = Object.entries(byCat).map(([id, v]) => ({ v, color: safeColor(cat(id)?.color) })).sort((x, y) => y.v - x.v);
  let parts = `<circle cx="${c}" cy="${c}" r="${rr}" fill="none" stroke="var(--surface2)" stroke-width="${sw}"/>`;
  if (tE > 0) {
    let off = 0; const gap = segs.length > 1 ? 2.5 : 0;
    for (const s of segs) {
      const len = C * s.v / tE, dl = Math.max(len - gap, 0.8);
      parts += `<circle cx="${c}" cy="${c}" r="${rr}" fill="none" stroke="${safeColor(s.color)}" stroke-width="${sw}" stroke-dasharray="${dl.toFixed(2)} ${(C - dl).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 ${c} ${c})"/>`;
      off += len;
    }
  }
  const ec = cats('expense');
  const slots = Math.max(8, Math.min(16, Math.floor((2 * Math.PI * R) / (isz + 9))));
  const ringCats = ec.length > slots ? ec.slice(0, slots - 1) : ec;
  const nRing = ringCats.length + (ec.length > slots ? 1 : 0);
  const ringBtns = ringCats.map((k, i) => {
    const ang = (-90 + i * 360 / nRing) * Math.PI / 180;
    return `<button class="ring-cat ${byCat[k.id] ? 'on' : ''}" data-act="add-cat" data-id="${k.id}" style="--c:${safeColor(k.color)};left:${(c + R * Math.cos(ang)).toFixed(1)}px;top:${(c + R * Math.sin(ang)).toFixed(1)}px;width:${isz}px;height:${isz}px" aria-label="${esc(k.name)}">${esc(k.icon)}</button>`;
  }).join('') + (ec.length > slots ? (() => { const ang = (-90 + (nRing - 1) * 360 / nRing) * Math.PI / 180; return `<button class="ring-cat more" data-act="add" data-type="expense" style="left:${(c + R * Math.cos(ang)).toFixed(1)}px;top:${(c + R * Math.sin(ang)).toFixed(1)}px;width:${isz}px;height:${isz}px" aria-label="Más categorías">•••</button>`; })() : '');
  const eStr = money(tE);
  const fs = eStr.length <= 9 ? 27 : eStr.length <= 12 ? 23 : eStr.length <= 15 ? 19 : 16;

  // presupuesto en centro
  let centerB = '', miniB = '';
  const B = state.budget.amount || 0;
  if (B > 0 && ui.period === 'month' && ui.acct === 'all') {
    const left = B - tE;
    centerB = `<span class="cb num">${left >= 0 ? 'Quedan ' + money(left) : 'Excedido ' + money(-left)}</span>`;
    miniB = `<button class="mini-budget" data-act="tab" data-tab="budget"><div class="l"><span>Presupuesto del mes</span><span class="num ${left < 0 ? 'neg' : 'muted'}">${money(tE)} / ${money(B)}</span></div>${barHTML(tE, B)}</button>`;
  }

  // lista
  let listHTML = '';
  if (ui.mode === 'cat') {
    const grp = (txs, type) => {
      const m = {};
      txs.forEach(t => { (m[t.categoryId] = m[t.categoryId] || []).push(t); });
      const tot = sumMain(txs);
      return Object.entries(m).map(([id, ts]) => ({ c: cat(id) || { name: 'Sin categoría', icon: '❔', color: '#888' }, id, ts, v: sumMain(ts) }))
        .sort((x, y) => y.v - x.v)
        .map(g => {
          const key = type + g.id, open = ui.exp[key];
          return `<button class="row" data-act="toggle-cat" data-key="${key}"><span class="ic round" style="--c:${safeColor(g.c.color)}">${esc(g.c.icon)}</span><span class="grow"><span class="nm">${esc(g.c.name)}</span><span class="sub">${g.ts.length} ${g.ts.length === 1 ? 'movimiento' : 'movimientos'}</span></span><span class="pct num">${tot ? Math.round(g.v / tot * 100) : 0}%</span><span class="am num amt-${type === 'expense' ? 'exp' : 'inc'}">${money(g.v)}</span></button>` +
            (open ? `<div class="subrows">${g.ts.sort((x, y) => y.date.localeCompare(x.date) || y.created - x.created).map(t => `<button class="subrow" data-act="edit-tx" data-id="${t.id}"><span class="grow"><div>${esc(t.note || g.c.name)}</div><div class="d">${dateLabel(t.date)} · ${esc(acct(t.accountId)?.name || '')}${t.recId ? ' · 🔁' : ''}</div></span><span class="num amt-${type === 'expense' ? 'exp' : 'inc'}">${money(t.amount, acur(t.accountId))}</span></button>`).join('')}</div>` : '');
        }).join('');
    };
    const eh = grp(exp, 'expense'), ih = grp(inc, 'income');
    listHTML = (eh ? `<h3 class="sec">Gastos</h3><div class="card">${eh}</div>` : '') + (ih ? `<h3 class="sec">Ingresos</h3><div class="card">${ih}</div>` : '');
  } else {
    const days = {};
    list.slice().sort((x, y) => y.date.localeCompare(x.date) || y.created - x.created).forEach(t => { (days[t.date] = days[t.date] || []).push(t); });
    listHTML = Object.entries(days).map(([d, ts]) => {
      const net = ts.reduce((s, t) => s + (t.type === 'income' ? amtMain(t) : t.type === 'expense' ? -amtMain(t) : 0), 0);
      return `<div class="day-h"><span>${d === todayStr() ? 'Hoy' : d === ymd(addDays(new Date(), -1)) ? 'Ayer' : fmt.wds.format(parseYmd(d))}</span><span class="num">${net ? (net > 0 ? '+' : '') + money(net) : ''}</span></div><div class="card">${ts.map(txRow).join('')}</div>`;
    }).join('');
  }
  if (!list.length) listHTML = `<div class="empty"><span class="e">🪙</span>Sin movimientos en este periodo.<br>Toca una categoría del círculo o el botón <b>−</b> para registrar un gasto.</div>`;

  const standalone = window.navigator.standalone || matchMedia('(display-mode: standalone)').matches;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const install = S().installHint && isIOS && !standalone ? `<div class="banner"><span style="font-size:22px">📲</span><span><b>Instálala en tu iPhone</b>Toca Compartir y luego "Agregar a inicio".</span><button class="x" data-act="hide-install" aria-label="Cerrar">✕</button></div>` : '';

  const lbk = S().lastBackup, lbDays = lbk ? daysBetween(lbk, todayStr()) : null;
  const needBk = state.tx.length >= 10 && (lbDays === null || lbDays >= 7) && !(S().backupSnooze && S().backupSnooze > todayStr());
  const bkBanner = needBk ? `<div class="banner"><span style="font-size:22px">💾</span><span><b>${lbDays === null ? 'Aún no tienes respaldo' : 'Tu último respaldo fue hace ' + lbDays + ' días'}</b>Tus datos solo están en este iPhone. <button data-act="backup" style="color:var(--accent);font-weight:600">Crear respaldo</button></span><button class="x" data-act="snooze-backup" aria-label="Recordar después">✕</button></div>` : '';
  return `${install}${bkBanner}
  <div class="top">
    <button class="acct-btn" data-act="pick-acct">${a ? `<span style="font-size:20px">${esc(a.icon)}</span>` : `<span style="font-size:20px">👛</span>`}<span class="t"><small>${a ? esc(a.name) : 'Todas las cuentas'}</small><b class="num ${bal < 0 ? 'neg' : ''}">${money(bal, balCur)}</b></span><span class="chev">▾</span></button>
    <button class="icon-btn" data-act="search" aria-label="Buscar">${ICON.search}</button>
  </div>
  <div class="period">
    <button class="nav" data-act="prev" ${ui.period === 'all' ? 'disabled' : ''} aria-label="Anterior">‹</button>
    <button class="plabel" data-act="pick-period">${esc(periodLabel(ui.period, r))}<span>▾</span></button>
    <button class="nav" data-act="next" ${ui.period === 'all' ? 'disabled' : ''} aria-label="Siguiente">›</button>
  </div>
  <div class="chart-wrap" style="width:${size}px;height:${size}px">
    <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true">${parts}</svg>
    ${ringBtns}
    <div class="center" style="max-width:${(rr * 2 - sw).toFixed(0)}px"><small>Gastos</small><b class="num" style="font-size:${fs}px">${eStr}</b><span class="ci num">+${money(tI)}</span>${centerB}</div>
  </div>
  <div class="sumrow">
    <div><small>Ingresos</small><b class="num pos">${money(tI)}</b></div>
    <div><small>Gastos</small><b class="num neg">${money(tE)}</b></div>
    <div><small>Balance</small><b class="num ${tI - tE < 0 ? 'neg' : ''}">${money(tI - tE)}</b></div>
  </div>
  ${miniB}
  <div class="seg"><button data-act="mode" data-mode="cat" class="${ui.mode === 'cat' ? 'on' : ''}">Por categoría</button><button data-act="mode" data-mode="date" class="${ui.mode === 'date' ? 'on' : ''}">Por fecha</button></div>
  ${listHTML}`;
}
function txRow(t) {
  if (t.type === 'transfer') {
    const a = acct(t.accountId), b = acct(t.toAccountId);
    return `<button class="row" data-act="edit-tx" data-id="${t.id}"><span class="ic round" style="--c:var(--tr)">⇄</span><span class="grow"><span class="nm">${esc(a?.name || '?')} → ${esc(b?.name || '?')}</span><span class="sub">${esc(t.note || 'Transferencia')}${t.recId ? ' · 🔁' : ''}</span></span><span class="am num amt-tr">${money(t.amount, acur(t.accountId))}</span></button>`;
  }
  const c = cat(t.categoryId) || { name: 'Sin categoría', icon: '❔', color: '#888' };
  const cls = t.type === 'expense' ? 'exp' : 'inc';
  return `<button class="row" data-act="edit-tx" data-id="${t.id}"><span class="ic round" style="--c:${safeColor(c.color)}">${esc(c.icon)}</span><span class="grow"><span class="nm">${esc(t.note || c.name)}</span><span class="sub">${t.note ? esc(c.name) + ' · ' : ''}${esc(acct(t.accountId)?.name || '')}${t.recId ? ' · 🔁' : ''}</span></span><span class="am num amt-${cls}">${t.type === 'expense' ? '−' : '+'}${money(t.amount, acur(t.accountId))}</span></button>`;
}

function viewAccounts() {
  const acts = activeAccounts(), arch = state.accounts.filter(a => a.archived);
  const total = totalBalance();
  const row = a => { const b = balance(a); return `<button class="row" data-act="acct-open" data-id="${a.id}"><span class="ic" style="--c:${safeColor(a.color)}">${esc(a.icon)}</span><span class="grow"><span class="nm">${esc(a.name)}</span><span class="sub">${esc(a.currency)}${a.include ? '' : ' · No suma al total'}${a.currency !== S().currency ? ' · ≈ ' + money(toMain(b, a.currency)) : ''}</span></span><span class="am num ${b < 0 ? 'neg' : ''}">${money(b, a.currency)}</span><span class="chev">›</span></button>`; };
  return `<h1 class="title">Cuentas</h1>
  <div class="card hero"><small>Saldo total</small><b class="num ${total < 0 ? 'neg' : ''}">${money(total)}</b><span class="muted" style="font-size:13px">${acts.filter(a => a.include).length} de ${acts.length} cuentas suman al total</span></div>
  <h3 class="sec">Mis cuentas</h3>
  <div class="card">${acts.map(row).join('') || '<div class="empty">No tienes cuentas activas</div>'}</div>
  <button class="btn block soft" data-act="acct-add">＋ Nueva cuenta</button>
  <button class="btn block soft" data-act="add" data-type="transfer">⇄ Transferir entre cuentas</button>
  ${arch.length ? `<h3 class="sec">Archivadas</h3><div class="card" style="opacity:.6">${arch.map(row).join('')}</div>` : ''}`;
}

function viewBudget() {
  const r = rangeFor('month', ui.boff);
  const mtx = state.tx.filter(t => inRange(t.date, r));
  const exp = mtx.filter(t => t.type === 'expense');
  const spent = sumMain(exp);
  const B = state.budget.amount || 0;
  const t = todayStr(), isCur = inRange(t, r);
  const daysLeft = isCur ? daysBetween(t, r.b) + 1 : 0;
  const daysPassed = isCur ? daysBetween(r.a, t) + 1 : daysBetween(r.a, r.b) + 1;
  const left = B - spent;
  const g = B > 0 ? `<div class="card bcard"><div class="muted" style="font-size:13px">Presupuesto mensual</div>
      <div class="big"><b class="num ${left < 0 ? 'neg' : ''}">${left >= 0 ? money(left) : '−' + money(-left)}</b><span class="muted num">de ${money(B)}</span></div>
      ${barHTML(spent, B)}
      <div class="meta"><span class="num">Gastado ${money(spent)} (${Math.round(spent / B * 100)}%)</span><span class="num">${isCur && left > 0 ? money(left / daysLeft) + '/día · ' + daysLeft + ' días' : (left < 0 ? 'Te pasaste' : '')}</span></div>
      <button class="btn soft block" style="margin-bottom:0" data-act="budget-edit">Editar presupuesto</button></div>`
    : `<div class="card bcard"><div style="font-weight:650;font-size:16px;margin-bottom:4px">Define tu presupuesto del mes</div><div class="muted" style="font-size:13.5px">Te mostraremos cuánto te queda y cuánto puedes gastar por día.</div><button class="btn primary block" style="margin-bottom:0" data-act="budget-edit">Definir presupuesto</button></div>`;
  const bc = cats('expense').filter(c => c.budget > 0).map(c => {
    const s = sumMain(exp.filter(x => x.categoryId === c.id));
    return `<button class="row" data-act="cat-budget" data-id="${c.id}" style="flex-wrap:wrap;gap:8px 12px"><span class="ic round" style="--c:${safeColor(c.color)}">${esc(c.icon)}</span><span class="grow"><span class="nm">${esc(c.name)}</span><span class="sub num">${money(s)} de ${money(c.budget)}</span></span><span class="am num ${s > c.budget ? 'neg' : ''}">${s > c.budget ? '−' + money(s - c.budget) : money(c.budget - s)}</span><span style="flex-basis:100%;padding-left:50px">${barHTML(s, c.budget)}</span></button>`;
  }).join('');
  const goals = state.goals.map(go => {
    const p = go.target > 0 ? go.saved / go.target : 0;
    let extra = '';
    if (go.deadline && go.saved < go.target) {
      const months = Math.max(1, Math.ceil(daysBetween(t, go.deadline) / 30.44));
      extra = daysBetween(t, go.deadline) < 0 ? 'Fecha vencida' : `${money((go.target - go.saved) / months)}/mes · ${months} ${months === 1 ? 'mes' : 'meses'}`;
    } else if (go.saved >= go.target) extra = '¡Meta cumplida! 🎉';
    return `<button class="goal" data-act="goal-open" data-id="${go.id}"><span class="h"><span class="ic round" style="--c:${safeColor(go.color)}">${esc(go.icon)}</span><span class="grow" style="flex:1;display:flex;flex-direction:column;min-width:0"><span style="font-weight:600">${esc(go.name)}</span><span class="muted num" style="font-size:12.5px">${money(go.saved)} de ${money(go.target)}</span></span><b class="num">${Math.round(p * 100)}%</b></span><div class="bar"><i style="width:${Math.min(100, p * 100).toFixed(1)}%;background:${safeColor(go.color)}"></i></div>${extra ? `<span class="muted" style="font-size:12.5px">${extra}</span>` : ''}</button>`;
  }).join('');
  const avg = daysPassed > 0 ? spent / daysPassed : 0;
  return `<h1 class="title">Presupuesto</h1>
  <div class="period"><button class="nav" data-act="bprev" aria-label="Mes anterior">‹</button><span class="plabel">${esc(periodLabel('month', r))}</span><button class="nav" data-act="bnext" aria-label="Mes siguiente">›</button></div>
  ${g}
  <h3 class="sec">Por categoría <button data-act="cat-budgets">Asignar</button></h3>
  ${bc ? `<div class="card">${bc}</div>` : `<div class="card"><div class="empty" style="padding:18px">Pon un tope a categorías como Restaurantes o Salidas y mira cuánto te queda en cada una.</div></div>`}
  <h3 class="sec">Metas de ahorro <button data-act="goal-add">＋ Nueva</button></h3>
  ${goals ? `<div class="card">${goals}</div>` : `<div class="card"><div class="empty" style="padding:18px"><span class="e">🎯</span>Crea una meta: un viaje, un fondo de emergencia, tu casa…</div></div>`}
  <h3 class="sec">Últimos 6 meses</h3>
  <div class="card trend">${trendSVG(ui.boff)}<div class="legend"><span><i style="background:var(--inc)"></i>Ingresos</span><span><i style="background:var(--exp)"></i>Gastos</span><span style="margin-left:auto" class="num">Promedio: ${money(avg)}/día</span></div></div>`;
}
function trendSVG(off) {
  const ms = [];
  for (let i = 5; i >= 0; i--) {
    const r = rangeFor('month', off - i), tx = state.tx.filter(t => inRange(t.date, r));
    ms.push({ l: clean(fmt.ms.format(r.from)), i: sumMain(tx.filter(t => t.type === 'income')), e: sumMain(tx.filter(t => t.type === 'expense')) });
  }
  const max = Math.max(1, ...ms.flatMap(m => [m.i, m.e]));
  const W = 320, H = 150, top = 8, bot = 22, ch = H - top - bot, gw = W / 6, bw = Math.min(16, gw * .28);
  let s = `<line x1="0" x2="${W}" y1="${H - bot + .5}" y2="${H - bot + .5}" stroke="var(--line)"/>`;
  ms.forEach((m, k) => {
    const x = k * gw + gw / 2, hi = ch * m.i / max, he = ch * m.e / max;
    s += `<rect x="${(x - bw - 1.5).toFixed(1)}" y="${(H - bot - hi).toFixed(1)}" width="${bw}" height="${Math.max(hi, 0).toFixed(1)}" rx="3" fill="var(--inc)"/>`;
    s += `<rect x="${(x + 1.5).toFixed(1)}" y="${(H - bot - he).toFixed(1)}" width="${bw}" height="${Math.max(he, 0).toFixed(1)}" rx="3" fill="var(--exp)"/>`;
    s += `<text x="${x}" y="${H - 6}" text-anchor="middle" font-size="11" fill="var(--muted)">${m.l}</text>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Ingresos y gastos de los últimos 6 meses">${s}</svg>`;
}

function viewMore() {
  const st = S();
  const row = (act, icon, label, val, cls = '') => `<button class="srow ${cls}" data-act="${act}"><span class="si">${icon}</span><span class="sl">${label}</span>${val !== undefined ? `<span class="sv">${esc(val)}</span>` : ''}<span class="muted">›</span></button>`;
  const lb = st.lastBackup ? daysBetween(st.lastBackup, todayStr()) : null;
  const lbTxt = lb === null ? 'Nunca' : lb === 0 ? 'Hoy' : `Hace ${lb} ${lb === 1 ? 'día' : 'días'}`;
  const defA = acct(st.defaultAccount);
  return `<h1 class="title">Ajustes</h1>
  <div class="group"><div class="g-title">General</div><div class="card">
    ${row('set-currency', '💱', 'Moneda principal', st.currency)}
    ${row('set-rates', '📊', 'Tasas de cambio', Object.keys(st.rates).filter(k => k !== st.currency).length + ' monedas')}
    ${row('set-week', '📅', 'Inicio de semana', st.weekStart === 1 ? 'Lunes' : 'Domingo')}
    ${row('set-month', '🗓️', 'Inicio del mes', 'Día ' + st.monthStart)}
    ${row('set-theme', '🌗', 'Apariencia', { auto: 'Automática', dark: 'Oscura', light: 'Clara' }[st.theme])}
    ${row('set-defacct', '💳', 'Cuenta predeterminada', defA ? defA.name : 'La última usada')}
  </div></div>
  <div class="group"><div class="g-title">Organización</div><div class="card">
    ${row('cat-manager', '🏷️', 'Categorías', cats('expense').length + cats('income').length + '')}
    ${row('rec-manager', '🔁', 'Pagos recurrentes', state.recurring.filter(r => r.active).length + ' activos')}
  </div></div>
  <div class="group"><div class="g-title">Seguridad</div><div class="card">
    ${row('pin', '🔒', 'Bloqueo con PIN', st.pinHash ? `Activado · ${st.pinLen === 6 ? 6 : 4} dígitos` : 'Desactivado')}
    ${st.pinHash && bioOK ? row('bio', '🙂', 'Face ID / Touch ID', st.bioId ? 'Activado' : 'Desactivado') : ''}
    ${st.pinHash ? row('lock-after', '⏱️', 'Bloquear al salir', LOCK_AFTER[st.lockAfter] || LOCK_AFTER[0]) : ''}
  </div></div>
  <div class="group"><div class="g-title">Tus datos</div><div class="card">
    ${row('backup', '💾', 'Crear respaldo cifrado', lbTxt)}
    ${row('restore', '♻️', 'Restaurar respaldo')}
    ${row('csv', '📄', 'Exportar a Excel (CSV)')}
    ${row('wipe', '🗑️', 'Borrar todos los datos', undefined, 'danger')}
  </div>
  <p class="hint" style="margin-top:8px">Todo se guarda solo en este iPhone. Haz un respaldo cifrado cada semana y guárdalo en Archivos o iCloud.${lb === null || lb > 7 ? ' <b style="color:var(--warn)">Te recomendamos hacer uno ahora.</b>' : ''}</p></div>
  <div class="group"><div class="g-title">Acerca de</div><div class="card">
    ${row('about', '🪙', 'Mi Plata', 'Versión ' + APP_VERSION)}
  </div></div>
`;
}

/* ===================== Registrar / editar movimiento ===================== */
let D = null, TXEL = null;
const KEYS = ['7', '8', '9', '⌫', '4', '5', '6', '÷', '1', '2', '3', '×', ',', '0', '000', '−', 'C', 'OK', '+'];
function defaultDate() {
  const r = curRange(), t = todayStr();
  if (ui.tab !== 'home' || ui.period === 'all' || inRange(t, r)) return t;
  return r.b < t ? r.b : r.a;
}
function defaultAccountId() {
  if (ui.acct !== 'all' && acct(ui.acct) && !acct(ui.acct).archived) return ui.acct;
  for (const id of [S().defaultAccount, S().lastAccount]) { const a = acct(id); if (a && !a.archived) return id; }
  return activeAccounts()[0]?.id || null;
}
function openTx(o = {}) {
  if (!activeAccounts().length) { toast('Primero crea una cuenta'); return; }
  const t = o.tx;
  D = t ? { ...t, expr: String(t.amount), edit: true, repeat: 'none', toAmountManual: t.type === 'transfer' && acur(t.accountId) !== acur(t.toAccountId) ? t.toAmount : null }
    : { type: o.type || 'expense', expr: '', accountId: o.accountId || defaultAccountId(), toAccountId: null, categoryId: o.categoryId || null, date: defaultDate(), note: '', repeat: 'none', edit: false, toAmountManual: null };
  if (D.type === 'transfer' && !D.toAccountId) D.toAccountId = activeAccounts().find(x => x.id !== D.accountId)?.id || null;
  TXEL = openSheet('', { cls: 'full tx-sheet', onClose: () => { D = null; TXEL = null; } });
  renderTx();
  TXEL.addEventListener('click', onTxClick);
  TXEL.addEventListener('input', e => {
    if (!D) return;
    if (e.target.name === 'note') D.note = e.target.value;
    if (e.target.name === 'toAmount') D.toAmountManual = e.target.value.trim() ? parseNum(e.target.value) : null;
  });
}
function renderTx() {
  const body = TXEL.querySelector('.sheet-body');
  const a = acct(D.accountId), b = acct(D.toAccountId);
  const list = D.type === 'transfer' ? [] : cats(D.type);
  const rec = D.recId && state.recurring.find(r => r.id === D.recId);
  const repLbl = D.edit ? (rec ? `🔁 ${FREQ[rec.freq]}${rec.active ? '' : ' (pausado)'}` : null) : (D.repeat === 'none' ? '🔁 No se repite' : `🔁 ${FREQ[D.repeat]}`);
  const diffCur = D.type === 'transfer' && a && b && a.currency !== b.currency;
  const autoTo = diffCur ? round2(convert(evalExpr(D.expr) || 0, a.currency, b.currency)) : 0;
  body.innerHTML = `
  <div class="tx-head">
    <button class="icon-btn" data-a="close" aria-label="Cerrar">✕</button>
    <div class="seg">${[['expense', 'Gasto'], ['income', 'Ingreso'], ['transfer', 'Transferir']].map(([k, l]) => `<button data-a="type" data-v="${k}" class="${D.type === k ? 'on' : ''}">${l}</button>`).join('')}</div>
    ${D.edit ? '<button class="icon-btn" data-a="del" aria-label="Eliminar">🗑️</button>' : '<span class="icon-btn" aria-hidden="true"></span>'}
  </div>
  <div class="amount-box t-${D.type}"><div class="expr num" data-r="expr"></div><div class="amt num" data-r="amt"></div></div>
  <div class="chips">
    <button class="chip" data-a="acc">${a ? esc(a.icon) + ' ' + esc(a.name) : 'Cuenta'} ▾</button>
    ${D.type === 'transfer' ? `<span class="arrow">→</span><button class="chip" data-a="toacc">${b ? esc(b.icon) + ' ' + esc(b.name) : 'Destino'} ▾</button>` : ''}
    <label class="chip">📅 <span data-r="date">${dateLabel(D.date)}</span><input type="date" name="date" value="${D.date}" aria-label="Fecha"></label>
    ${repLbl ? `<button class="chip" data-a="rep">${repLbl}</button>` : ''}
  </div>
  ${diffCur ? `<label class="xfield"><span class="muted">Recibe (${b.currency})</span><input name="toAmount" inputmode="decimal" placeholder="${esc(numStr(autoTo) || 'automático')}" value="${D.toAmountManual != null ? esc(numStr(D.toAmountManual)) : ''}"></label>` : ''}
  <input class="note" name="note" placeholder="Nota (opcional)" value="${esc(D.note || '')}" autocomplete="off" maxlength="120">
  <div class="cat-grid">${D.type === 'transfer' ? '<div class="transfer-hint">⇄ Mueve dinero entre tus cuentas.<br>No cuenta como gasto ni como ingreso.</div>'
      : list.map(c => `<button class="cg ${D.categoryId === c.id ? 'sel' : ''}" data-a="cat" data-id="${c.id}" style="--c:${safeColor(c.color)}"><span class="ic">${esc(c.icon)}</span><span class="cn">${esc(c.name)}</span></button>`).join('') + '<button class="cg" data-a="newcat"><span class="ic add">＋</span><span class="cn">Nueva</span></button>'}</div>
  <div class="keypad">${KEYS.map(k => `<button data-a="key" data-k="${k}" class="k ${k === 'OK' ? 'ok t-' + D.type : ''} ${['⌫', '÷', '×', '−', '+', 'C'].includes(k) ? 'op' : ''}" aria-label="${k === 'OK' ? 'Guardar' : k}">${k === 'OK' ? (D.edit ? 'Guardar cambios' : 'Guardar') : k}</button>`).join('')}</div>`;
  body.querySelector('input[name=date]').addEventListener('change', e => { if (e.target.value) { D.date = e.target.value; body.querySelector('[data-r=date]').textContent = dateLabel(D.date); } });
  updAmt();
}
function evalExpr(e) {
  // Calculadora sin eval(): números y + − × ÷ con precedencia normal.
  if (!e) return 0;
  e = e.replace(/[+\-*/.]+$/, '');
  if (!e) return 0;
  const toks = e.match(/\d+(?:\.\d*)?|[+\-*/]/g);
  if (!toks || toks.join('') !== e || toks.length % 2 === 0) return NaN;
  const stack = [parseFloat(toks[0])];
  for (let i = 1; i < toks.length; i += 2) {
    const op = toks[i], n = parseFloat(toks[i + 1]);
    if (!/^[+\-*/]$/.test(op) || !isFinite(n)) return NaN;
    if (op === '*') stack[stack.length - 1] *= n;
    else if (op === '/') stack[stack.length - 1] /= n;
    else stack.push(op === '-' ? -n : n);
  }
  const v = stack.reduce((x, y) => x + y, 0);
  return isFinite(v) ? v : NaN;
}
function dispExpr(e) {
  return e.replace(/\d+(\.\d*)?/g, m => { const [i, d] = m.split('.'); return Number(i).toLocaleString('es-CO') + (d !== undefined ? ',' + d : ''); })
    .replace(/\*/g, ' × ').replace(/\//g, ' ÷ ').replace(/-/g, ' − ').replace(/\+/g, ' + ');
}
function updAmt() {
  if (!TXEL) return;
  const v = evalExpr(D.expr), cur = acur(D.accountId);
  TXEL.querySelector('[data-r=amt]').textContent = money(isFinite(v) && v > 0 ? v : 0, cur);
  TXEL.querySelector('[data-r=expr]').textContent = /[+\-*/]/.test(D.expr) ? dispExpr(D.expr) : '';
  const ta = TXEL.querySelector('input[name=toAmount]');
  if (ta) { const a = acct(D.accountId), b = acct(D.toAccountId); ta.placeholder = numStr(round2(convert(v || 0, a.currency, b.currency))) || 'automático'; }
}
function pressKey(k) {
  let e = D.expr;
  const ops = '+-*/';
  if (k === 'C') e = '';
  else if (k === '⌫') e = e.slice(0, -1);
  else if (k === 'OK') return saveTx();
  else {
    const c = ({ '−': '-', '×': '*', '÷': '/', ',': '.' })[k] || k;
    const last = e.split(/[+\-*/]/).pop();
    if (ops.includes(c)) { if (!e) return; e = e.replace(/\.$/, ''); if (ops.includes(e.slice(-1))) e = e.slice(0, -1); e += c; }
    else if (c === '.') { if (last.includes('.')) return; e += last === '' ? '0.' : '.'; }
    else {
      const dec = last.split('.')[1];
      if (dec !== undefined && dec.length + c.length > 2) return;
      if (c === '000' && (last === '' || last === '0')) return;
      if (last === '0') e = e.slice(0, -1);
      e += c;
    }
    if (e.replace(/\D/g, '').length > 15) return;
  }
  D.expr = e; updAmt();
}
function saveTx() {
  const v = round2(evalExpr(D.expr));
  if (!(v > 0)) { toast('Escribe un monto'); return; }
  if (!acct(D.accountId)) { toast('Elige una cuenta'); return; }
  if (D.type !== 'transfer' && !D.categoryId) { toast('Elige una categoría'); return; }
  if (D.type === 'transfer' && (!D.toAccountId || D.toAccountId === D.accountId)) { toast('Elige la cuenta destino'); return; }
  const wasEdit = D.edit;
  const t = { id: D.id || uid(), type: D.type, amount: v, accountId: D.accountId, date: D.date, note: (D.note || '').trim(), created: D.created || Date.now() };
  if (D.recId) t.recId = D.recId;
  if (D.type === 'transfer') {
    t.toAccountId = D.toAccountId;
    const fc = acur(D.accountId), tc = acur(D.toAccountId);
    t.toAmount = fc === tc ? v : (D.toAmountManual > 0 ? round2(D.toAmountManual) : round2(convert(v, fc, tc)));
  } else t.categoryId = D.categoryId;
  if (wasEdit) {
    const i = state.tx.findIndex(x => x.id === t.id);
    if (i >= 0) state.tx[i] = t;
  } else {
    if (D.repeat !== 'none') {
      const r = { id: uid(), freq: D.repeat, start: t.date, n: 1, active: true, end: null, tpl: { type: t.type, amount: t.amount, accountId: t.accountId, toAccountId: t.toAccountId, toAmount: t.toAmount, categoryId: t.categoryId, note: t.note } };
      state.recurring.push(r); t.recId = r.id;
    }
    state.tx.push(t);
  }
  S().lastAccount = t.accountId;
  processRecurring();
  save();
  closeSheet(TXEL, true); D = null; TXEL = null;
  render();
  toast(wasEdit ? 'Cambios guardados' : (t.type === 'expense' ? 'Gasto registrado' : t.type === 'income' ? 'Ingreso registrado' : 'Transferencia registrada'));
}
async function onTxClick(e) {
  const b = e.target.closest('[data-a]'); if (!b || !D) return;
  const a = b.dataset.a;
  if (a === 'close') return closeSheet(TXEL);
  if (a === 'key') return pressKey(b.dataset.k);
  if (a === 'type') {
    if (D.type === b.dataset.v) return;
    D.type = b.dataset.v; D.categoryId = null;
    if (D.type === 'transfer' && !D.toAccountId) D.toAccountId = activeAccounts().find(x => x.id !== D.accountId)?.id || null;
    return renderTx();
  }
  if (a === 'cat') {
    D.categoryId = b.dataset.id;
    $$('.cg.sel', TXEL).forEach(x => x.classList.remove('sel')); b.classList.add('sel');
    // Flujo rápido: si ya hay monto en un registro nuevo, tocar la categoría guarda.
    if (!D.edit && evalExpr(D.expr) > 0) saveTx();
    return;
  }
  if (a === 'acc') { const id = await pickAccount(D.accountId, 'Desde la cuenta'); if (id && D) { D.accountId = id; if (D.toAccountId === id) D.toAccountId = activeAccounts().find(x => x.id !== id)?.id || null; D.toAmountManual = null; renderTx(); } return; }
  if (a === 'toacc') { const id = await pickAccount(D.toAccountId, 'Hacia la cuenta', D.accountId); if (id && D) { D.toAccountId = id; D.toAmountManual = null; renderTx(); } return; }
  if (a === 'rep') {
    if (D.edit) {
      const rec = state.recurring.find(r => r.id === D.recId); if (!rec) return;
      const v = await choose(`Se repite: ${FREQ[rec.freq]} · próximo ${dateLabel(nextOcc(rec))}`, [
        { label: rec.active ? 'Pausar repetición' : 'Reanudar repetición', value: 'toggle', icon: rec.active ? '⏸️' : '▶️' },
        { label: 'Dejar de repetir', value: 'stop', icon: '⛔', danger: true }]);
      if (v === 'toggle') { rec.active = !rec.active; if (rec.active) fastForward(rec); save(); }
      if (v === 'stop') { state.recurring = state.recurring.filter(r => r.id !== rec.id); state.tx.forEach(x => { if (x.recId === rec.id) delete x.recId; }); delete D.recId; save(); }
      if (v && D) renderTx();
      return;
    }
    const v = await choose('Repetir', [{ label: 'No se repite', value: 'none', sel: D.repeat === 'none' }, ...Object.entries(FREQ).map(([k, l]) => ({ label: l, value: k, sel: D.repeat === k }))]);
    if (v && D) { D.repeat = v; renderTx(); }
    return;
  }
  if (a === 'del') {
    if (!(await confirmDlg('¿Eliminar este movimiento?'))) return;
    const t = state.tx.find(x => x.id === D.id);
    state.tx = state.tx.filter(x => x.id !== D.id);
    save(); closeSheet(TXEL, true); D = null; TXEL = null; render();
    toast('Movimiento eliminado', { label: 'Deshacer', fn: () => { state.tx.push(t); save(); render(); } });
    return;
  }
  if (a === 'newcat') {
    const c = await editCategory(null, D.type);
    if (c && D) { D.categoryId = c.id; renderTx(); }
  }
}
function pickAccount(sel, title, excl) {
  return choose(title, activeAccounts().filter(a => a.id !== excl).map(a => ({ label: a.name, sub: money(balance(a), a.currency), icon: a.icon, value: a.id, sel: a.id === sel })));
}
function fastForward(rec) {
  // al reanudar, no crear movimientos atrasados del tiempo en pausa
  const t = todayStr(); let g = 0;
  while (g++ < 2000 && ymd(occurrence(rec.start, rec.freq, rec.n)) < t) rec.n++;
}

/* ===================== Editores ===================== */
async function editCategory(c, type) {
  type = c ? c.type : type;
  const hasTx = c && (state.tx.some(t => t.categoryId === c.id) || state.recurring.some(r => r.tpl.categoryId === c.id));
  const fields = [
    { key: 'name', type: 'text', label: 'Nombre', value: c?.name || '', placeholder: type === 'expense' ? 'Ej: Almuerzos' : 'Ej: Bonificación' },
    { key: 'icon', type: 'emoji', label: 'Ícono', value: c?.icon || (type === 'expense' ? '📦' : '💰') },
    { key: 'color', type: 'color', label: 'Color', value: c?.color || COLORS[Math.floor(Math.random() * COLORS.length)] },
  ];
  if (type === 'expense') fields.push({ key: 'budget', type: 'money', label: 'Presupuesto mensual (opcional)', value: c?.budget || 0 });
  const v = await formSheet(c ? 'Editar categoría' : (type === 'expense' ? 'Nueva categoría de gasto' : 'Nueva categoría de ingreso'), fields, {
    tall: true, del: c ? (hasTx ? (c.archived ? 'Mostrar' : 'Ocultar') : 'Eliminar') : null,
    validate: x => !x.name ? 'Ponle un nombre' : null,
  });
  if (!v) return null;
  if (v.__delete) {
    if (hasTx) { c.archived = !c.archived; toast(c.archived ? 'Categoría oculta (sus movimientos se conservan)' : 'Categoría visible'); }
    else { state.categories = state.categories.filter(x => x.id !== c.id); toast('Categoría eliminada'); }
    save(); render(); return null;
  }
  if (c) Object.assign(c, { name: v.name, icon: v.icon, color: v.color, budget: v.budget || 0 });
  else { c = { id: uid(), type, name: v.name, icon: v.icon, color: v.color, budget: v.budget || 0, archived: false }; state.categories.push(c); }
  save(); render(); return c;
}
async function editAccount(a) {
  const hasTx = a && (state.tx.some(t => t.accountId === a.id || t.toAccountId === a.id) || state.recurring.some(r => r.tpl.accountId === a.id || r.tpl.toAccountId === a.id));
  const fields = [
    { key: 'name', type: 'text', label: 'Nombre', value: a?.name || '', placeholder: 'Ej: Nequi, Bancolombia, Tarjeta' },
    { key: 'icon', type: 'emoji', label: 'Ícono', value: a?.icon || '💳' },
    { key: 'color', type: 'color', label: 'Color', value: a?.color || COLORS[6] },
    { key: 'currency', type: 'select', label: 'Moneda', value: a?.currency || S().currency, options: CURRENCIES.map(([c, n]) => [c, `${c} · ${n}`]) },
    { key: 'initial', type: 'money', label: 'Saldo inicial', value: Math.abs(a?.initial || 0), placeholder: '0' },
    { key: 'debt', type: 'toggle', label: 'Es una deuda (saldo negativo)', value: (a?.initial || 0) < 0, hint: 'El saldo inicial es lo que tenía la cuenta antes de empezar a registrar. Para una tarjeta de crédito, escribe lo que debes y activa esta opción.' },
    { key: 'include', type: 'toggle', label: 'Sumar al saldo total', value: a ? a.include : true },
  ];
  if (a) fields.push({ key: 'archived', type: 'toggle', label: 'Archivar cuenta', value: a.archived, hint: 'Una cuenta archivada se oculta pero conserva su historial.' });
  const v = await formSheet(a ? 'Editar cuenta' : 'Nueva cuenta', fields, { tall: true, del: a && !hasTx ? 'Eliminar' : null, validate: x => !x.name ? 'Ponle un nombre' : null });
  if (!v) return;
  if (v.__delete) {
    if (!(await confirmDlg(`¿Eliminar la cuenta "${a.name}"?`))) return;
    state.accounts = state.accounts.filter(x => x.id !== a.id);
    if (ui.acct === a.id) ui.acct = 'all';
    save(); render(); toast('Cuenta eliminada'); return;
  }
  const data = { name: v.name, icon: v.icon, color: v.color, currency: v.currency, initial: round2((v.debt ? -1 : 1) * Math.abs(v.initial)), include: v.include };
  if (a) { Object.assign(a, data, { archived: !!v.archived }); if (a.archived && ui.acct === a.id) ui.acct = 'all'; }
  else state.accounts.push({ id: uid(), ...data, archived: false });
  if (v.currency !== S().currency && !S().rates[v.currency]) S().rates[v.currency] = 1;
  save(); render();
  if (v.currency !== S().currency && S().rates[v.currency] === 1) toast(`Configura la tasa de ${v.currency} en Ajustes`);
}

async function editGoal(go) {
  const v = await formSheet(go ? 'Editar meta' : 'Nueva meta de ahorro', [
    { key: 'name', type: 'text', label: 'Nombre', value: go?.name || '', placeholder: 'Ej: Fondo de emergencia' },
    { key: 'target', type: 'money', label: 'Meta', value: go?.target || 0 },
    { key: 'saved', type: 'money', label: 'Ya ahorrado', value: go?.saved || 0 },
    { key: 'deadline', type: 'date', label: 'Fecha límite (opcional)', value: go?.deadline || '' },
    { key: 'icon', type: 'emoji', label: 'Ícono', value: go?.icon || '🎯' },
    { key: 'color', type: 'color', label: 'Color', value: go?.color || COLORS[3] },
  ], { tall: true, del: go ? 'Eliminar' : null, validate: x => !x.name ? 'Ponle un nombre' : !(x.target > 0) ? 'Define cuánto quieres ahorrar' : null });
  if (!v) return;
  if (v.__delete) { if (await confirmDlg(`¿Eliminar la meta "${go.name}"?`)) { state.goals = state.goals.filter(x => x.id !== go.id); save(); render(); } return; }
  const data = { name: v.name, target: v.target, saved: v.saved, deadline: v.deadline || null, icon: v.icon || '🎯', color: v.color };
  if (go) Object.assign(go, data); else state.goals.push({ id: uid(), ...data, log: [] });
  save(); render();
}
async function openGoal(go) {
  const v = await choose(`${esc(go.icon)} ${go.name}`, [
    { label: 'Abonar', icon: '➕', value: 'add', sub: `Faltan ${money(Math.max(0, go.target - go.saved))}` },
    { label: 'Retirar', icon: '➖', value: 'sub' },
    { label: 'Editar meta', icon: '✏️', value: 'edit' },
  ]);
  if (v === 'edit') return editGoal(go);
  if (v === 'add' || v === 'sub') {
    const r = await formSheet(v === 'add' ? 'Abonar a la meta' : 'Retirar de la meta', [{ key: 'amt', type: 'money', label: 'Monto', value: 0 }], { ok: v === 'add' ? 'Abonar' : 'Retirar', validate: x => !(x.amt > 0) ? 'Escribe un monto' : null });
    if (!r) return;
    go.saved = round2(Math.max(0, go.saved + (v === 'add' ? r.amt : -r.amt)));
    (go.log = go.log || []).push({ d: todayStr(), a: v === 'add' ? r.amt : -r.amt });
    save(); render();
    toast(go.saved >= go.target ? '¡Meta cumplida! 🎉' : 'Meta actualizada');
  }
}

function openCatManager() {
  let type = 'expense';
  const el = openSheet('', { cls: 'tall' });
  const body = el.querySelector('.sheet-body');
  const draw = () => {
    const list = state.categories.filter(c => c.type === type);
    body.innerHTML = `<div class="sh-title">Categorías</div>
      <div class="seg" style="margin-bottom:12px"><button data-t="expense" class="${type === 'expense' ? 'on' : ''}">Gastos</button><button data-t="income" class="${type === 'income' ? 'on' : ''}">Ingresos</button></div>
      <p class="hint" style="margin:0 4px 10px">Las primeras categorías de gasto aparecen alrededor del círculo en Inicio. Ordénalas con las flechas.</p>
      <div class="card">${list.map((c, i) => `<div class="row ${c.archived ? 'dim' : ''}" style="padding-right:8px"><button class="grow" data-e="${c.id}" style="flex-direction:row;align-items:center;gap:12px;display:flex"><span class="ic round" style="--c:${safeColor(c.color)}">${esc(c.icon)}</span><span class="nm">${esc(c.name)}${c.archived ? ' · oculta' : ''}</span></button><button class="icon-btn" style="background:transparent;width:34px" data-up="${c.id}" ${i === 0 ? 'disabled' : ''} aria-label="Subir">▲</button><button class="icon-btn" style="background:transparent;width:34px" data-down="${c.id}" ${i === list.length - 1 ? 'disabled' : ''} aria-label="Bajar">▼</button></div>`).join('')}</div>
      <button class="btn soft block" data-new>＋ Nueva categoría</button>`;
  };
  draw();
  el.addEventListener('click', async e => {
    const t = e.target.closest('[data-t]'); if (t) { type = t.dataset.t; return draw(); }
    const mv = e.target.closest('[data-up],[data-down]');
    if (mv) {
      const id = mv.dataset.up || mv.dataset.down, dir = mv.dataset.up ? -1 : 1;
      const same = state.categories.filter(c => c.type === type);
      const i = same.findIndex(c => c.id === id), j = i + dir;
      if (j < 0 || j >= same.length) return;
      const gi = state.categories.indexOf(same[i]), gj = state.categories.indexOf(same[j]);
      [state.categories[gi], state.categories[gj]] = [state.categories[gj], state.categories[gi]];
      save(); draw(); render(); return;
    }
    const ed = e.target.closest('[data-e]'); if (ed) { await editCategory(cat(ed.dataset.e)); return draw(); }
    if (e.target.closest('[data-new]')) { await editCategory(null, type); draw(); }
  });
}
function openRecManager() {
  const el = openSheet('', { cls: 'tall' });
  const body = el.querySelector('.sheet-body');
  const draw = () => {
    const list = state.recurring;
    body.innerHTML = `<div class="sh-title">Pagos recurrentes</div>
      <p class="hint" style="margin:0 4px 10px">Se crean solos cuando llega la fecha. Para crear uno, registra un movimiento y toca “🔁 No se repite”.</p>
      ${list.length ? `<div class="card">${list.map(r => {
      const t = r.tpl, c = cat(t.categoryId), a = acct(t.accountId);
      const name = t.type === 'transfer' ? `${a?.name || '?'} → ${acct(t.toAccountId)?.name || '?'}` : (t.note || c?.name || '—');
      return `<button class="row ${r.active ? '' : 'dim'}" data-r="${r.id}"><span class="ic round" style="--c:${t.type === 'transfer' ? 'var(--tr)' : safeColor(c?.color)}">${t.type === 'transfer' ? '⇄' : esc(c?.icon || '❔')}</span><span class="grow"><span class="nm">${esc(name)}</span><span class="sub">${FREQ[r.freq]} · ${r.active ? 'próximo ' + dateLabel(nextOcc(r)) : 'pausado'}</span></span><span class="am num amt-${t.type === 'expense' ? 'exp' : t.type === 'income' ? 'inc' : 'tr'}">${money(t.amount, acur(t.accountId))}</span></button>`;
    }).join('')}</div>` : '<div class="card"><div class="empty"><span class="e">🔁</span>No tienes pagos recurrentes todavía.<br>Ej: arriendo, Netflix, salario.</div></div>'}`;
  };
  draw();
  el.addEventListener('click', async e => {
    const b = e.target.closest('[data-r]'); if (!b) return;
    const r = state.recurring.find(x => x.id === b.dataset.r); if (!r) return;
    const v = await choose(`${FREQ[r.freq]} · ${money(r.tpl.amount, acur(r.tpl.accountId))}`, [
      { label: 'Cambiar monto', icon: '✏️', value: 'amt' },
      { label: r.active ? 'Pausar' : 'Reanudar', icon: r.active ? '⏸️' : '▶️', value: 'toggle' },
      { label: 'Eliminar (conserva lo ya registrado)', icon: '🗑️', value: 'del', danger: true },
    ]);
    if (v === 'amt') { const x = await formSheet('Nuevo monto', [{ key: 'a', type: 'money', label: 'Monto para los próximos', value: r.tpl.amount }], { validate: q => !(q.a > 0) ? 'Escribe un monto' : null }); if (x) { r.tpl.amount = round2(x.a); if (r.tpl.type === 'transfer' && acur(r.tpl.accountId) === acur(r.tpl.toAccountId)) r.tpl.toAmount = r.tpl.amount; } }
    if (v === 'toggle') { r.active = !r.active; if (r.active) fastForward(r); processRecurring(); }
    if (v === 'del') { state.recurring = state.recurring.filter(x => x.id !== r.id); state.tx.forEach(t => { if (t.recId === r.id) delete t.recId; }); }
    if (v) { save(); draw(); render(); }
  });
}
function openSearch() {
  const el = openSheet(`<div class="sh-title">Buscar</div><div class="form"><input name="q" placeholder="Nota, categoría, cuenta o monto" autocomplete="off" enterkeyhint="search"></div><div data-res style="margin-top:10px"></div>`, { cls: 'tall' });
  const inp = el.querySelector('input'), res = el.querySelector('[data-res]');
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const draw = () => {
    const q = norm(inp.value.trim());
    if (!q) { res.innerHTML = '<div class="empty">Escribe para buscar en todos tus movimientos.</div>'; return; }
    const qn = q.replace(/[.\s$]/g, '');
    const found = state.tx.filter(t => {
      const hay = norm([t.note, cat(t.categoryId)?.name, acct(t.accountId)?.name, acct(t.toAccountId)?.name].join(' '));
      return hay.includes(q) || (qn && /^\d+$/.test(qn) && String(Math.round(t.amount)).includes(qn));
    }).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 150);
    const tot = sumMain(found.filter(t => t.type === 'expense'));
    res.innerHTML = found.length ? `<div class="day-h"><span>${found.length} resultados</span><span class="num">${tot ? 'Gastos: ' + money(tot) : ''}</span></div><div class="card">${found.map(t => txRow(t).replace('<span class="sub">', `<span class="sub">${dateLabel(t.date)} · `)).join('')}</div>` : '<div class="empty">Sin resultados</div>';
  };
  draw();
  inp.addEventListener('input', draw);
  setTimeout(() => inp.focus(), 280);
  el.addEventListener('click', e => { const b = e.target.closest('[data-act=edit-tx]'); if (b) { const t = state.tx.find(x => x.id === b.dataset.id); closeSheet(el, true); if (t) openTx({ tx: t }); } });
}

/* ===================== Seguridad (PIN + Face ID) ===================== */
let bioOK = false, locked = false, hiddenAt = 0;
async function sha(s) {
  if (!crypto.subtle) throw new Error('sin WebCrypto');
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}
const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function checkBio() { try { bioOK = !!(window.PublicKeyCredential && window.isSecureContext && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()); } catch { bioOK = false; } }
async function bioRegister() {
  const cred = await navigator.credentials.create({ publicKey: {
    challenge: crypto.getRandomValues(new Uint8Array(32)), rp: { name: 'Mi Plata' },
    user: { id: crypto.getRandomValues(new Uint8Array(16)), name: 'mi-plata', displayName: 'Mi Plata' },
    pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
    authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' },
    timeout: 60000, attestation: 'none' } });
  return b64(cred.rawId);
}
async function bioVerify() {
  await navigator.credentials.get({ publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)), allowCredentials: [{ type: 'public-key', id: unb64(S().bioId), transports: ['internal'] }], userVerification: 'required', timeout: 60000 } });
  return true;
}
const pinLen = () => S().pinLen === 6 ? 6 : 4;
function pinPadHTML(title, withBio, len) {
  len = len || pinLen();
  return `<div class="pin"><img class="logo" src="icons/icon-192.png" alt=""><div class="pt" data-pt>${esc(title)}</div><div class="dots" data-dots>${'<i></i>'.repeat(len)}</div>
  <div class="pinpad">${['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(n => `<button data-p="${n}">${n}</button>`).join('')}${withBio ? '<button class="fn" data-bio aria-label="Face ID">🙂<br>Face ID</button>' : '<button class="blank" disabled></button>'}<button data-p="0">0</button><button class="fn" data-p="del" aria-label="Borrar">⌫</button></div></div>`;
}
function attachPin(root, onFull, len, blocked) {
  len = len || pinLen();
  let code = '', busy = false;
  const logo = root.querySelector('.logo'); if (logo) logo.addEventListener('error', () => { logo.hidden = true; });
  const dots = () => $$('[data-dots] i', root).forEach((d, i) => d.classList.toggle('f', i < code.length));
  root.addEventListener('click', async e => {
    const b = e.target.closest('[data-p]'); if (!b || busy) return;
    if (blocked && blocked()) return;
    if (b.dataset.p === 'del') code = code.slice(0, -1);
    else if (code.length < len) code += b.dataset.p;
    dots();
    if (code.length === len) {
      busy = true;
      const c = code; const ok = await onFull(c);
      if (ok === false) { const d = $('[data-dots]', root); d.classList.add('shake'); setTimeout(() => { d.classList.remove('shake'); code = ''; dots(); busy = false; }, 380); }
      else { code = ''; busy = false; }
    }
  });
}
function pinPrompt(title, len) {
  return new Promise(res => {
    let done = false;
    const el = openSheet(pinPadHTML(title, false, len), { onClose: () => { if (!done) res(null); } });
    attachPin(el, c => { done = true; closeSheet(el, true); res(c); return true; }, len);
  });
}
// Límite de intentos: tras 5 fallos, espera de 30 s que se duplica en cada fallo (máx. 15 min).
const PIN_FREE_TRIES = 5;
const LOCK_AFTER = { 0: 'De inmediato', 60: 'Después de 1 min', 300: 'Después de 5 min' };
const lockLeft = () => Math.max(0, Math.ceil(((+S().pinLockUntil || 0) - Date.now()) / 1000));
function registerPinFail() {
  S().pinFails = (+S().pinFails || 0) + 1;
  if (S().pinFails >= PIN_FREE_TRIES) S().pinLockUntil = Date.now() + Math.min(900, 30 * 2 ** (S().pinFails - PIN_FREE_TRIES)) * 1000;
  persist();
}
function clearPinFails() { if (S().pinFails || S().pinLockUntil) { S().pinFails = 0; S().pinLockUntil = 0; persist(); } }
async function checkPin(c) {
  if (lockLeft() > 0) return false;
  if (await sha(S().pinSalt + c) === S().pinHash) { clearPinFails(); return true; }
  registerPinFail(); return false;
}
let lockTick = null;
function showLock() {
  if (!S().pinHash || locked) return;
  locked = true;
  const el = $('#lock');
  el.innerHTML = pinPadHTML('Ingresa tu PIN', !!(S().bioId && bioOK));
  el.hidden = false;
  const pt = el.querySelector('[data-pt]');
  const upd = () => {
    const s = lockLeft();
    if (s > 0) { const m = Math.floor(s / 60); pt.textContent = `Demasiados intentos. Espera ${m ? m + ' min ' : ''}${s % 60} s`; }
    else if (S().pinFails > 0) { const r = PIN_FREE_TRIES - S().pinFails; pt.textContent = r > 0 ? `PIN incorrecto · ${r === 1 ? 'queda 1 intento' : 'quedan ' + r + ' intentos'}` : 'PIN incorrecto · otro error alarga la espera'; }
    else pt.textContent = 'Ingresa tu PIN';
  };
  upd(); clearInterval(lockTick); lockTick = setInterval(upd, 1000);
  const unlock = () => { clearInterval(lockTick); locked = false; el.hidden = true; el.innerHTML = ''; processRecurring() && render(); };
  attachPin(el, async c => { const ok = await checkPin(c); upd(); if (ok) { unlock(); return true; } return false; }, pinLen(), () => lockLeft() > 0);
  const bb = el.querySelector('[data-bio]');
  if (bb) {
    const tryBio = async () => { try { if (await bioVerify()) { clearPinFails(); unlock(); } } catch (e) { /* cancelado */ } };
    bb.addEventListener('click', tryBio);
    setTimeout(tryBio, 350);
  }
}
async function newPin(title) {
  const len = await choose(title, [{ label: 'PIN de 6 dígitos', sub: 'Recomendado', value: 6, icon: '🔐' }, { label: 'PIN de 4 dígitos', value: 4, icon: '🔒' }]);
  if (!len) return null;
  const p1 = await pinPrompt(`Crea tu PIN de ${len} dígitos`, len); if (!p1) return null;
  if (/^(\d)\1+$/.test(p1) || '0123456789'.includes(p1) || '9876543210'.includes(p1)) { toast('Ese PIN es muy fácil de adivinar, elige otro'); return null; }
  const p2 = await pinPrompt('Confírmalo', len); if (!p2) return null;
  if (p1 !== p2) { toast('Los PIN no coinciden, intenta de nuevo'); return null; }
  return { pin: p1, len };
}
async function managePin() {
  if (!crypto.subtle) return toast('Abre la app desde su ícono para usar el PIN');
  if (!S().pinHash) {
    const n = await newPin('Activar bloqueo'); if (!n) return;
    S().pinLen = n.len; S().pinSalt = uid(); S().pinHash = await sha(S().pinSalt + n.pin); clearPinFails(); save(); render();
    toast(bioOK ? 'PIN activado. También puedes activar Face ID' : 'PIN activado');
    return;
  }
  const v = await choose('Bloqueo con PIN', [{ label: 'Cambiar PIN', value: 'change', icon: '🔁' }, { label: 'Desactivar PIN', value: 'off', icon: '🔓', danger: true }]);
  if (!v) return;
  if (lockLeft() > 0) return toast(`Demasiados intentos. Espera ${lockLeft()} s`);
  const cur = await pinPrompt('Ingresa tu PIN actual'); if (!cur) return;
  if (!(await checkPin(cur))) return toast(lockLeft() > 0 ? `PIN incorrecto. Espera ${lockLeft()} s` : 'PIN incorrecto');
  if (v === 'off') { S().pinHash = null; S().pinSalt = null; S().bioId = null; S().pinLen = 4; save(); render(); return toast('PIN desactivado'); }
  const n = await newPin('Nuevo PIN'); if (!n) return;
  S().pinLen = n.len; S().pinSalt = uid(); S().pinHash = await sha(S().pinSalt + n.pin); save(); render(); toast('PIN cambiado');
}
async function manageBio() {
  if (S().bioId) { S().bioId = null; save(); render(); return toast('Face ID desactivado'); }
  try { S().bioId = await bioRegister(); save(); render(); toast('Face ID activado'); }
  catch (e) { toast('No se pudo activar Face ID'); }
}

/* ===================== Datos ===================== */
// --- Cifrado de respaldos: PBKDF2-SHA256 (310.000 iteraciones) + AES-256-GCM ---
const TE = new TextEncoder(), TD = new TextDecoder();
const ENC_FORMAT = 'mi-plata-cifrado';
function bytesToB64(u8) { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); }
function b64ToBytes(b) { const s = atob(b); const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; }
async function deriveKey(pw, salt, iter) {
  const base = await crypto.subtle.importKey('raw', TE.encode(pw), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
async function encryptJSON(obj, pw) {
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12)), iter = 310000;
  const key = await deriveKey(pw, salt, iter);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, TE.encode(JSON.stringify(obj))));
  return JSON.stringify({ format: ENC_FORMAT, v: 1, kdf: 'PBKDF2-SHA256', cipher: 'AES-256-GCM', iter, salt: bytesToB64(salt), iv: bytesToB64(iv), data: bytesToB64(ct), created: new Date().toISOString() });
}
async function decryptJSON(w, pw) {
  if (!Number.isInteger(w.iter) || w.iter < 100000 || w.iter > 5e6 || typeof w.salt !== 'string' || typeof w.iv !== 'string' || typeof w.data !== 'string') throw new Error('formato');
  const key = await deriveKey(pw, b64ToBytes(w.salt), w.iter);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64ToBytes(w.iv) }, key, b64ToBytes(w.data));
  return JSON.parse(TD.decode(pt));
}
// Los datos de seguridad de este iPhone (PIN, Face ID) nunca van en el respaldo.
const DEVICE_KEYS = ['pinHash', 'pinSalt', 'bioId', 'pinLen', 'pinFails', 'pinLockUntil', 'backupSnooze', 'lockAfter'];
function backupData() {
  const d = JSON.parse(JSON.stringify(state));
  DEVICE_KEYS.forEach(k => delete d.settings[k]);
  d.app = 'Mi Plata'; d.appVersion = APP_VERSION; d.exported = new Date().toISOString();
  return d;
}
async function doBackup() {
  if (!crypto.subtle) return toast('Abre la app desde su ícono para crear respaldos');
  const mode = await choose('Crear respaldo', [
    { label: 'Cifrado con contraseña', sub: 'Recomendado: nadie puede leerlo sin la contraseña', icon: '🔐', value: 'enc' },
    { label: 'Sin cifrar', sub: 'Cualquiera con el archivo puede leer tus datos', icon: '📄', value: 'plain' }]);
  if (!mode) return;
  let content;
  if (mode === 'enc') {
    const v = await formSheet('Contraseña del respaldo', [
      { type: 'hint', text: 'Guárdala en un lugar seguro, por ejemplo en tu gestor de contraseñas. Sin ella el respaldo no se puede abrir.' },
      { key: 'p1', type: 'password', label: 'Contraseña (mínimo 8 caracteres)' },
      { key: 'p2', type: 'password', label: 'Repítela' }],
      { ok: 'Cifrar respaldo', validate: x => x.p1.length < 8 ? 'Usa al menos 8 caracteres' : x.p1 !== x.p2 ? 'Las contraseñas no coinciden' : null });
    if (!v) return;
    toast('Cifrando respaldo…');
    try { content = await encryptJSON(backupData(), v.p1); } catch (e) { return toast('No se pudo cifrar el respaldo'); }
  } else content = JSON.stringify(backupData(), null, 1);
  const name = `mi-plata-respaldo-${todayStr()}${mode === 'enc' ? '-cifrado' : ''}.json`;
  // Hoja con botón propio: iOS exige un toque directo para abrir "Compartir / Guardar en Archivos".
  const el = openSheet(`<div class="sh-title">Respaldo listo</div><p class="hint" style="text-align:center;margin:0 8px 14px">${mode === 'enc' ? '🔐 Cifrado con AES-256' : '📄 Sin cifrar'} · ${state.tx.length} movimientos<br>Toca el botón y elige <b>Guardar en Archivos</b> (iCloud Drive).</p><button class="btn primary block" data-save>💾 Guardar respaldo</button><button class="btn ghost block" data-x>Cancelar</button>`);
  el.addEventListener('click', async e => {
    if (e.target.closest('[data-x]')) return closeSheet(el);
    if (!e.target.closest('[data-save]')) return;
    const ok = await shareFile(name, content, 'application/json');
    if (ok) { closeSheet(el, true); S().lastBackup = todayStr(); S().backupSnooze = null; save(); render(); toast('Respaldo guardado'); }
  });
}

// --- Validación estricta de respaldos: solo entra lo que tiene forma correcta ---
function sanitizeImport(d) {
  if (!d || typeof d !== 'object' || !Array.isArray(d.tx) || !Array.isArray(d.accounts) || !Array.isArray(d.categories)) throw new Error('formato');
  let dropped = 0;
  const str = (v, max) => typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, max) : '';
  const isId = v => typeof v === 'string' && /^[a-z0-9_-]{3,40}$/i.test(v);
  const isDate = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && ymd(parseYmd(v)) === v;
  const isNum = (v, min, max) => typeof v === 'number' && isFinite(v) && v >= min && v <= max;
  const color = v => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : COLORS[12];
  const icon = (v, def) => str(v, 16).replace(/[<>&"'`\\=]/g, '').trim() || def;
  const isCur = v => typeof v === 'string' && /^[A-Z]{3}$/.test(v);
  const MAXV = 1e13, seen = new Set();
  const uniq = id => { if (seen.has(id)) return false; seen.add(id); return true; };
  const accounts = [];
  for (const a of d.accounts) {
    if (!a || !isId(a.id) || !isCur(a.currency) || !isNum(+(a.initial ?? 0), -MAXV, MAXV) || !uniq(a.id)) { dropped++; continue; }
    accounts.push({ id: a.id, name: str(a.name, 40) || 'Cuenta', icon: icon(a.icon, '💳'), color: color(a.color), currency: a.currency, initial: round2(+(a.initial ?? 0)), include: a.include !== false, archived: a.archived === true });
  }
  if (!accounts.length) throw new Error('sin cuentas');
  const aIds = new Set(accounts.map(a => a.id));
  const categories = [];
  for (const c of d.categories) {
    if (!c || !isId(c.id) || !['expense', 'income'].includes(c.type) || !uniq(c.id)) { dropped++; continue; }
    categories.push({ id: c.id, type: c.type, name: str(c.name, 40) || 'Categoría', icon: icon(c.icon, '📦'), color: color(c.color), budget: isNum(c.budget, 0, MAXV) ? round2(c.budget) : 0, archived: c.archived === true });
  }
  const cType = new Map(categories.map(c => [c.id, c.type]));
  const okMove = (t) => {
    if (!['expense', 'income', 'transfer'].includes(t.type) || !isNum(t.amount, 0.005, MAXV) || !aIds.has(t.accountId)) return false;
    if (t.type === 'transfer') return aIds.has(t.toAccountId) && t.toAccountId !== t.accountId && (t.toAmount === undefined || t.toAmount === null || isNum(t.toAmount, 0.005, MAXV));
    return cType.get(t.categoryId) === t.type;
  };
  const recurring = [];
  for (const r of Array.isArray(d.recurring) ? d.recurring : []) {
    if (!r || !isId(r.id) || !FREQ[r.freq] || !isDate(r.start) || !Number.isInteger(r.n) || r.n < 0 || r.n > 100000 || !r.tpl || !okMove(r.tpl) || !(r.end == null || isDate(r.end)) || !uniq(r.id)) { dropped++; continue; }
    const t = r.tpl, tpl = { type: t.type, amount: round2(t.amount), accountId: t.accountId, note: str(t.note, 120) };
    if (t.type === 'transfer') { tpl.toAccountId = t.toAccountId; tpl.toAmount = round2(t.toAmount ?? t.amount); } else tpl.categoryId = t.categoryId;
    recurring.push({ id: r.id, freq: r.freq, start: r.start, n: r.n, active: r.active !== false, end: r.end || null, tpl });
  }
  const rIds = new Set(recurring.map(r => r.id));
  const tx = [];
  for (const t of d.tx) {
    if (!t || !isId(t.id) || !isDate(t.date) || !okMove(t) || !uniq(t.id)) { dropped++; continue; }
    const o = { id: t.id, type: t.type, amount: round2(t.amount), accountId: t.accountId, date: t.date, note: str(t.note, 120), created: isNum(t.created, 0, 1e14) ? t.created : Date.now() };
    if (t.type === 'transfer') { o.toAccountId = t.toAccountId; o.toAmount = round2(t.toAmount ?? t.amount); } else o.categoryId = t.categoryId;
    if (rIds.has(t.recId)) o.recId = t.recId;
    tx.push(o);
  }
  const goals = [];
  for (const g of Array.isArray(d.goals) ? d.goals : []) {
    if (!g || !isId(g.id) || !isNum(g.target, 0.01, MAXV) || !isNum(+(g.saved ?? 0), 0, MAXV) || !uniq(g.id)) { dropped++; continue; }
    goals.push({ id: g.id, name: str(g.name, 40) || 'Meta', icon: icon(g.icon, '🎯'), color: color(g.color), target: round2(g.target), saved: round2(+(g.saved ?? 0)), deadline: isDate(g.deadline) ? g.deadline : null,
      log: (Array.isArray(g.log) ? g.log : []).filter(l => l && isDate(l.d) && isNum(l.a, -MAXV, MAXV)).map(l => ({ d: l.d, a: round2(l.a) })).slice(-500) });
  }
  const s = d.settings && typeof d.settings === 'object' ? d.settings : {};
  const rates = {};
  if (s.rates && typeof s.rates === 'object') for (const [k, v] of Object.entries(s.rates)) if (isCur(k) && isNum(v, 1e-9, 1e9)) rates[k] = v;
  const settings = {
    currency: isCur(s.currency) ? s.currency : 'COP',
    weekStart: s.weekStart === 0 ? 0 : 1,
    monthStart: Number.isInteger(s.monthStart) && s.monthStart >= 1 && s.monthStart <= 28 ? s.monthStart : 1,
    theme: ['auto', 'dark', 'light'].includes(s.theme) ? s.theme : 'auto',
    period: ['day', 'week', 'month', 'year', 'all'].includes(s.period) ? s.period : 'month',
    rates, defaultAccount: aIds.has(s.defaultAccount) ? s.defaultAccount : null, lastAccount: aIds.has(s.lastAccount) ? s.lastAccount : null,
    lastBackup: isDate(s.lastBackup) ? s.lastBackup : null, installHint: s.installHint === true,
  };
  const budget = { amount: d.budget && isNum(d.budget.amount, 0, MAXV) ? round2(d.budget.amount) : 0 };
  return { data: { v: 1, settings, accounts, categories, tx, recurring, goals, budget }, dropped };
}
function doRestore() {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'application/json,.json'; inp.hidden = true;
  document.body.appendChild(inp);
  setTimeout(() => inp.remove(), 10 * 60 * 1000);
  inp.onchange = async () => {
    const f = inp.files[0]; if (!f) return;
    if (f.size > 25 * 1024 * 1024) return toast('El archivo es demasiado grande para ser un respaldo');
    let d;
    try { d = JSON.parse(await f.text()); } catch (e) { return toast('Ese archivo no es un respaldo de Mi Plata'); }
    if (d && d.format === ENC_FORMAT) {
      if (!crypto.subtle) return toast('Abre la app desde su ícono para restaurar respaldos cifrados');
      const v = await formSheet('Respaldo cifrado', [{ key: 'p', type: 'password', label: 'Contraseña del respaldo' }], { ok: 'Abrir', validate: x => !x.p ? 'Escribe la contraseña' : null });
      if (!v) return;
      toast('Descifrando…');
      try { d = await decryptJSON(d, v.p); } catch (e) { return toast('Contraseña incorrecta o archivo dañado'); }
    }
    let res;
    try { res = sanitizeImport(d); } catch (e) { return toast('Ese archivo no es un respaldo válido de Mi Plata'); }
    const { data, dropped } = res;
    const msg = `¿Reemplazar tus datos actuales por este respaldo? Trae ${data.tx.length} movimientos y ${data.accounts.length} cuentas${dropped ? ` (se descartan ${dropped} registros dañados)` : ''}.`;
    if (!(await confirmDlg(msg, 'Restaurar'))) return;
    const keep = {}; DEVICE_KEYS.forEach(k => { keep[k] = S()[k]; });
    state = migrate(data); Object.assign(state.settings, keep);
    ui.acct = 'all'; ui.off = 0; processRecurring(); await persist(); render(); toast('Respaldo restaurado');
  };
  inp.click();
}
async function doCSV() {
  const v = await choose('Exportar a CSV', [{ label: 'Periodo visible en Inicio', sub: periodLabel(ui.period, curRange()), value: 'p', icon: '📆' }, { label: 'Todos los movimientos', value: 'all', icon: '🗂️' }]);
  if (!v) return;
  const r = curRange();
  const list = state.tx.filter(t => v === 'all' || inRange(t.date, r)).sort((a, b) => a.date.localeCompare(b.date));
  const T = { expense: 'Gasto', income: 'Ingreso', transfer: 'Transferencia' };
  const rows = [['Fecha', 'Tipo', 'Cuenta', 'Cuenta destino', 'Categoría', 'Monto', 'Moneda', `Monto ${S().currency}`, 'Nota']];
  list.forEach(t => rows.push([t.date, T[t.type], acct(t.accountId)?.name, t.type === 'transfer' ? acct(t.toAccountId)?.name : '', t.type === 'transfer' ? '' : cat(t.categoryId)?.name, (t.type === 'expense' ? -t.amount : t.amount), acur(t.accountId), round2(t.type === 'expense' ? -amtMain(t) : amtMain(t)), t.note]));
  const csv = '﻿' + rows.map(r => r.map(c => typeof c === 'number' ? numStr(c) : `"${String(c ?? '').replace(/^[=+\-@\t\r]/, "'$&").replace(/"/g, '""')}"`).join(';')).join('\r\n');
  shareFile(`mi-plata-${v === 'all' ? 'todo' : r.a + '_' + r.b}.csv`, csv, 'text/csv');
}
async function doWipe() {
  if (!(await confirmDlg('¿Borrar TODOS tus datos? Esto no se puede deshacer.', 'Borrar todo'))) return;
  if (!(await confirmDlg('¿Seguro? Te recomendamos hacer un respaldo antes.', 'Sí, borrar todo'))) return;
  const keep = { theme: S().theme }; ['pinHash', 'pinSalt', 'bioId', 'pinLen', 'lockAfter'].forEach(k => { keep[k] = S()[k]; });
  state = defaultState(); Object.assign(state.settings, keep);
  ui.acct = 'all'; ui.off = 0; await persist(); render(); toast('Datos borrados');
}

/* ===================== Eventos principales ===================== */
const actions = {
  tab: el => { ui.tab = el.dataset.tab; render(); window.scrollTo(0, 0); },
  add: el => openTx({ type: el.dataset.type }),
  'add-cat': el => openTx({ type: 'expense', categoryId: el.dataset.id }),
  'edit-tx': el => { const t = state.tx.find(x => x.id === el.dataset.id); if (t) openTx({ tx: t }); },
  'toggle-cat': el => { const k = el.dataset.key; ui.exp[k] = !ui.exp[k]; render(); },
  mode: el => { ui.mode = el.dataset.mode; render(); },
  prev: () => { ui.off--; render(); },
  next: () => { ui.off++; render(); },
  search: () => openSearch(),
  'snooze-backup': () => { S().backupSnooze = ymd(addDays(new Date(), 3)); save(); render(); toast('Te lo recordamos en 3 días'); },
  'hide-install': () => { S().installHint = false; save(); render(); },
  'pick-period': async () => {
    const v = await choose('Ver por', [...['day', 'week', 'month', 'year', 'all'].map(k => ({ label: PERIOD_NAMES[k], value: k, sel: ui.period === k })), { label: 'Rango de fechas…', value: 'custom', sel: ui.period === 'custom' }, { label: 'Volver a hoy', value: 'today', icon: '↩️' }]);
    if (!v) return;
    if (v === 'today') { ui.off = 0; return render(); }
    if (v === 'custom') {
      const r = curRange();
      const x = await formSheet('Rango de fechas', [{ key: 'a', type: 'date', label: 'Desde', value: ui.period === 'all' ? todayStr() : r.a }, { key: 'b', type: 'date', label: 'Hasta', value: ui.period === 'all' ? todayStr() : r.b }], { ok: 'Aplicar', validate: q => !q.a || !q.b ? 'Elige ambas fechas' : q.a > q.b ? 'La fecha inicial debe ser anterior' : null });
      if (!x) return;
      ui.custom = { a: x.a, b: x.b }; ui.period = 'custom'; ui.off = 0; return render();
    }
    ui.period = v; ui.off = 0; S().period = v; save(); render();
  },
  'pick-acct': async () => {
    const v = await choose('Ver cuenta', [{ label: 'Todas las cuentas', icon: '👛', value: 'all', sel: ui.acct === 'all', sub: money(totalBalance()) }, ...activeAccounts().map(a => ({ label: a.name, icon: a.icon, value: a.id, sel: ui.acct === a.id, sub: money(balance(a), a.currency) }))]);
    if (v) { ui.acct = v; render(); }
  },
  'acct-open': async el => {
    const a = acct(el.dataset.id); if (!a) return;
    const v = await choose(`${esc(a.icon)} ${a.name}`, [{ label: 'Ver movimientos', icon: '📋', value: 'view' }, { label: 'Transferir desde esta cuenta', icon: '⇄', value: 'tr' }, { label: 'Editar cuenta', icon: '✏️', value: 'edit' }]);
    if (v === 'view') { ui.acct = a.archived ? 'all' : a.id; ui.tab = 'home'; ui.mode = 'date'; render(); }
    if (v === 'tr') openTx({ type: 'transfer', accountId: a.id });
    if (v === 'edit') editAccount(a);
  },
  'acct-add': () => editAccount(null),
  bprev: () => { ui.boff--; render(); },
  bnext: () => { ui.boff++; render(); },
  'budget-edit': async () => {
    const v = await formSheet('Presupuesto mensual', [{ key: 'amount', type: 'money', label: '¿Cuánto quieres gastar como máximo al mes?', value: state.budget.amount }, { type: 'hint', text: 'Pon 0 para quitarlo. El mes empieza el día que elegiste en Ajustes (hoy: día ' + S().monthStart + ').' }]);
    if (v) { state.budget.amount = round2(v.amount); save(); render(); }
  },
  'cat-budget': el => editCategory(cat(el.dataset.id)),
  'cat-budgets': async () => {
    const list = cats('expense');
    const v = await formSheet('Presupuesto por categoría', [{ type: 'hint', text: 'Tope mensual para cada categoría. Déjalo vacío para no limitarla.' }, ...list.map(c => ({ key: c.id, type: 'money', label: `${esc(c.icon)} ${c.name}`, value: c.budget, placeholder: 'Sin límite' }))], { tall: true });
    if (!v) return;
    list.forEach(c => { c.budget = round2(v[c.id] || 0); });
    save(); render();
  },
  'goal-add': () => editGoal(null),
  'goal-open': el => { const g = state.goals.find(x => x.id === el.dataset.id); if (g) openGoal(g); },
  'set-currency': async () => {
    const v = await choose('Moneda principal', CURRENCIES.map(([c, n]) => ({ label: `${c} · ${n}`, value: c, sel: S().currency === c })));
    if (!v || v === S().currency) return;
    const old = S().currency;
    const keep = await choose(`Cambiar a ${v}`, [{ label: `Cambiar también mis cuentas en ${old} a ${v}`, value: 'all', icon: '🔄' }, { label: 'Solo la moneda de los totales', value: 'main', icon: '📊' }]);
    if (!keep) return;
    if (keep === 'all') state.accounts.forEach(a => { if (a.currency === old) a.currency = v; });
    S().currency = v; S().rates = {}; save(); render();
    if (state.accounts.some(a => a.currency !== v)) toast('Revisa las tasas de cambio en Ajustes');
  },
  'set-rates': async () => {
    const main = S().currency;
    const curs = [...new Set([...state.accounts.map(a => a.currency), 'USD', 'EUR'])].filter(c => c !== main);
    const v = await formSheet('Tasas de cambio', [{ type: 'hint', text: `Cuántos ${main} equivale 1 unidad de cada moneda. Se usan para sumar cuentas en otras monedas.` }, ...curs.map(c => ({ key: c, type: 'money', label: `1 ${c} = ? ${main}`, value: S().rates[c] || '' }))], { tall: true });
    if (!v) return;
    curs.forEach(c => { if (v[c] > 0) S().rates[c] = v[c]; });
    save(); render(); toast('Tasas actualizadas');
  },
  'set-week': async () => { const v = await choose('La semana empieza el', [{ label: 'Lunes', value: 1, sel: S().weekStart === 1 }, { label: 'Domingo', value: 0, sel: S().weekStart === 0 }]); if (v !== null) { S().weekStart = v; save(); render(); } },
  'set-month': async () => {
    const v = await formSheet('Inicio del mes', [{ type: 'hint', text: 'Si te pagan, por ejemplo, el 15, tu "mes" puede ir del 15 al 14. Elige entre 1 y 28.' }, { key: 'd', type: 'int', label: 'Día de inicio', value: S().monthStart }], { validate: q => q.d < 1 || q.d > 28 ? 'Elige un día entre 1 y 28' : null });
    if (v) { S().monthStart = v.d; save(); render(); }
  },
  'set-theme': async () => { const v = await choose('Apariencia', [['auto', 'Automática (según el iPhone)'], ['dark', 'Oscura'], ['light', 'Clara']].map(([k, l]) => ({ label: l, value: k, sel: S().theme === k }))); if (v) { S().theme = v; save(); render(); } },
  'set-defacct': async () => {
    const v = await choose('Cuenta predeterminada', [{ label: 'La última que usé', value: '__last', sel: !S().defaultAccount }, ...activeAccounts().map(a => ({ label: a.name, icon: a.icon, value: a.id, sel: S().defaultAccount === a.id }))]);
    if (v) { S().defaultAccount = v === '__last' ? null : v; save(); render(); }
  },
  'cat-manager': () => openCatManager(),
  'rec-manager': () => openRecManager(),
  pin: () => managePin(),
  bio: () => manageBio(),
  'lock-after': async () => { const v = await choose('Pedir el PIN al volver a la app', Object.entries(LOCK_AFTER).map(([k, l]) => ({ label: l, value: +k + 1, sel: (S().lockAfter || 0) === +k }))); if (v) { S().lockAfter = v - 1; save(); render(); } },
  backup: () => doBackup(),
  restore: () => doRestore(),
  csv: () => doCSV(),
  wipe: () => doWipe(),
  about: () => choose('Mi Plata ' + APP_VERSION, [{ label: `${state.tx.length} movimientos · ${state.accounts.length} cuentas`, value: null, icon: '📊' }, { label: 'Tus datos nunca salen de este iPhone', value: null, icon: '🔒' }, { label: 'Sin conexiones externas (CSP activa)', value: null, icon: '🛡️' }, { label: 'Respaldos cifrados con AES-256', value: null, icon: '🔐' }]),
};
$('#app').addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el || el.disabled) return;
  const f = actions[el.dataset.act]; if (f) f(el, e);
});
// deslizar el círculo para cambiar de periodo
let sw0 = null;
$('#view').addEventListener('touchstart', e => { sw0 = e.target.closest('.chart-wrap') && ui.period !== 'all' ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null; }, { passive: true });
$('#view').addEventListener('touchend', e => {
  if (!sw0) return; const t = e.changedTouches[0], dx = t.clientX - sw0.x, dy = t.clientY - sw0.y; sw0 = null;
  if (Math.abs(dx) > 60 && Math.abs(dy) < 50) { ui.off += dx < 0 ? 1 : -1; render(); }
});
let rzT; window.addEventListener('resize', () => { clearTimeout(rzT); rzT = setTimeout(() => ui.tab === 'home' && render(), 150); });
const cover = $('#cover');
document.addEventListener('visibilitychange', () => {
  if (!state) return;
  if (document.hidden) {
    hiddenAt = Date.now(); persist();
    // Tapa el contenido para que no se vea en el selector de apps del iPhone.
    if (S().pinHash && cover) cover.hidden = false;
  } else {
    if (S().pinHash && hiddenAt && Date.now() - hiddenAt >= (+S().lockAfter || 0) * 1000) showLock();
    if (cover) cover.hidden = true;
    if (processRecurring()) render();
  }
});
window.addEventListener('pagehide', () => persist());

function applyTheme() {
  const t = S().theme === 'auto' ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : S().theme;
  if (document.documentElement.dataset.theme !== t) {
    document.documentElement.dataset.theme = t;
    $('meta[name=theme-color]')?.setAttribute('content', t === 'light' ? '#f3f4f7' : '#0e1014');
  }
}
matchMedia('(prefers-color-scheme: light)').addEventListener?.('change', () => state && render());

/* ===================== Errores inesperados ===================== */
let errAt = 0;
function reportError(err) {
  console.error(err);
  if (Date.now() - errAt < 5000) return; errAt = Date.now();
  try { toast('Algo falló. Tus datos están a salvo; si se repite, cierra y abre la app.'); } catch (e) { }
}
window.addEventListener('error', e => reportError(e.error || e.message));
window.addEventListener('unhandledrejection', e => reportError(e.reason));

/* ===================== Arranque ===================== */
(async function init() {
  await load();
  ui.period = S().period === 'custom' ? 'month' : (S().period || 'month');
  await checkBio();
  processRecurring();
  render();
  if (S().pinHash) showLock();
  if (loadProblem) toast('No se pudieron leer tus datos guardados. Se apartó una copia; restaura tu último respaldo.');
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => { });
})();
