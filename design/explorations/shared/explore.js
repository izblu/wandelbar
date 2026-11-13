/**
 * Gemeinsame Bedienlogik der Design-Entwürfe (MD, Runde 1).
 *
 * - Hell/Dunkel: folgt dem System, umschaltbar, per `?theme=dark|light` vorgebbar
 * - Puppenhaus zeichnen, Möbel per Klick auswählen, Eigenschaftenkarte am Möbel ausrichten
 * - Befehlssuche mit Strg+K (bzw. ⌘K)
 * - Werkzeugpalette mit Tastenkürzeln, Ansicht Puppenhaus/Draufsicht, Zoom
 * - Auf dem Handy: ausziehbare Karte von unten (ziehen oder antippen)
 *
 * Kein Inline-Code und keine `style`-Attribute, damit die strenge CSP der App auch hier gilt.
 */
import { formatArea, items, renderHouse, roomArea, rooms } from './dollhouse.js';

const doc = document.documentElement;
const params = new URLSearchParams(location.search);
const darkQuery = matchMedia('(prefers-color-scheme: dark)');
const mobileQuery = matchMedia('(max-width: 720px)');

// ------------------------------------------------------------------ Hell und dunkel

function setTheme(theme) {
  doc.dataset.theme = theme;
  for (const btn of document.querySelectorAll('[data-action="toggle-theme"]')) {
    btn.setAttribute('aria-pressed', String(theme === 'dark'));
  }
}
const requested = params.get('theme');
setTheme(
  requested === 'dark' || requested === 'light' ? requested : darkQuery.matches ? 'dark' : 'light',
);
darkQuery.addEventListener('change', (event) => {
  if (!params.has('theme')) setTheme(event.matches ? 'dark' : 'light');
});
// Für die Übersichtsseite (gleiche Herkunft): Design von außen umschalten
window.wandelbarSetTheme = setTheme;

// ------------------------------------------------------------------ Zustand

const state = { view: 'dollhouse', selected: 'sofa', colors: {}, zoom: 1 };
const svg = document.getElementById('house');
const stage = document.getElementById('stage');
const inspector = document.getElementById('inspector');
const overlay = document.getElementById('overlay');
const leader = overlay?.querySelector('.leader');
const leaderDot = overlay?.querySelector('.leader-dot');
let scene = null;
let frame = 0;

const roomById = Object.fromEntries(rooms.map((r) => [r.id, r]));
const price = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

function focusRect() {
  if (!mobileQuery.matches) return null;
  const item = items.find((it) => it.id === state.selected);
  const room = roomById[item?.room ?? 'wohnen'];
  const e = 0.35;
  return { x0: room.x0 - e, y0: room.y0 - e, x1: room.x1 + e, y1: room.y1 + e };
}

function render() {
  frame = 0;
  if (!svg) return;
  scene = renderHouse(svg, { ...state, focus: focusRect() });
  placeInspector();
}
function scheduleRender() {
  if (!frame) frame = requestAnimationFrame(render);
}

// ------------------------------------------------------------------ Eigenschaftenkarte

function setField(name, value) {
  for (const el of document.querySelectorAll(`[data-field="${name}"]`)) {
    if (el instanceof HTMLInputElement) el.value = value;
    else el.textContent = value;
  }
}

function fillInspector(item) {
  const [w, d, h] = item.dims;
  setField('name', item.name);
  setField('room', roomById[item.room]?.name ?? '');
  setField('room-area', roomById[item.room] ? formatArea(roomArea(roomById[item.room])) : '');
  setField('dims', `${w} × ${d} × ${h} cm`);
  setField('w', String(w));
  setField('d', String(d));
  setField('h', String(h));
  setField('price', price.format(item.price));
  setField('material', item.material);
  const facts = inspector?.querySelector('[data-facts]');
  if (facts) {
    facts.replaceChildren(
      ...(item.facts ?? []).map(([label, value]) => {
        const row = document.createElement('div');
        const dt = document.createElement('dt');
        const dd = document.createElement('dd');
        dt.textContent = label;
        dd.textContent = value;
        row.append(dt, dd);
        return row;
      }),
    );
    facts.hidden = !(item.facts ?? []).length;
  }
  for (const el of document.querySelectorAll('[data-swatches]')) el.hidden = !item.swatchable;
  const chosen = state.colors[item.id];
  for (const input of document.querySelectorAll('input[name="bezug"]')) {
    input.checked = chosen ? `var(${input.value})` === chosen : input.defaultChecked;
  }
  syncSwatchName();
  inspector?.setAttribute('data-item', item.id);
}

function syncSwatchName() {
  const checked = document.querySelector('input[name="bezug"]:checked');
  setField('swatch', checked?.dataset.name ?? '');
}

function select(id) {
  const item = items.find((it) => it.id === id);
  if (!item) return;
  state.selected = id;
  fillInspector(item);
  inspector?.classList.remove('is-entering');
  void inspector?.offsetWidth;
  inspector?.classList.add('is-entering');
  render();
}

function placeInspector() {
  if (!inspector || !stage) return;
  const desktop = !mobileQuery.matches;
  const rect =
    scene && state.selected && state.view === 'dollhouse' ? scene.itemRect(state.selected) : null;
  if (!desktop || !rect) {
    inspector.style.removeProperty('left');
    inspector.style.removeProperty('top');
    leader?.setAttribute('d', '');
    leaderDot?.setAttribute('r', '0');
    inspector.dataset.side = 'none';
    return;
  }
  const sw = stage.clientWidth;
  const sh = stage.clientHeight;
  const cw = inspector.offsetWidth;
  const ch = inspector.offsetHeight;
  const cs = getComputedStyle(stage);
  const read = (name, fallback) => {
    const v = parseFloat(cs.getPropertyValue(name));
    return Number.isFinite(v) ? v : fallback;
  };
  const gap = read('--card-gap', 32);
  const margin = read('--card-margin', 20);
  const safeTop = read('--card-safe-top', margin);
  const safeBottom = read('--card-safe-bottom', margin);
  const prefer = cs.getPropertyValue('--card-prefer').trim() || 'right';

  let side = prefer;
  let left = side === 'right' ? rect.x1 + gap : rect.x0 - gap - cw;
  if (side === 'right' && left + cw > sw - margin) {
    side = 'left';
    left = rect.x0 - gap - cw;
  } else if (side === 'left' && left < margin) {
    side = 'right';
    left = rect.x1 + gap;
  }
  left = Math.max(margin, Math.min(left, sw - cw - margin));
  let top = (rect.y0 + rect.y1) / 2 - ch * 0.38;
  top = Math.max(safeTop, Math.min(top, sh - ch - safeBottom));
  inspector.style.left = `${Math.round(left)}px`;
  inspector.style.top = `${Math.round(top)}px`;
  inspector.dataset.side = side;
  const tailY = Math.max(28, Math.min(ch - 28, rect.ay - top));
  inspector.style.setProperty('--tail-y', `${Math.round(tailY)}px`);

  if (overlay && leader) {
    overlay.setAttribute('viewBox', `0 0 ${sw} ${sh}`);
    const ex = side === 'right' ? left : left + cw;
    const ey = top + tailY;
    const mx = (rect.ax + ex) / 2;
    leader.setAttribute(
      'd',
      `M${rect.ax.toFixed(1)},${rect.ay.toFixed(1)} H${mx.toFixed(1)} V${ey.toFixed(1)} H${ex.toFixed(1)}`,
    );
    leaderDot?.setAttribute('cx', rect.ax.toFixed(1));
    leaderDot?.setAttribute('cy', rect.ay.toFixed(1));
    leaderDot?.setAttribute('r', '5');
  }
}

// ------------------------------------------------------------------ Szene: Auswahl per Klick

svg?.addEventListener('click', (event) => {
  const target = event.target instanceof Element ? event.target.closest('[data-item]') : null;
  if (target instanceof SVGElement && target.dataset.item) select(target.dataset.item);
});

// ------------------------------------------------------------------ Bezug wählen

for (const input of document.querySelectorAll('input[name="bezug"]')) {
  input.addEventListener('change', () => {
    if (!input.checked) return;
    const value = `var(${input.value})`;
    state.colors[state.selected] = value;
    for (const g of svg?.querySelectorAll(
      `.it-${CSS.escape(state.selected)}.m-fabric, .it-${CSS.escape(state.selected)}.m-fabric2`,
    ) ?? []) {
      g.style.setProperty('--c', value);
    }
    syncSwatchName();
  });
}

// ------------------------------------------------------------------ Werkzeuge, Ansicht, Zoom

const tools = [...document.querySelectorAll('.tool[data-tool]')];
function setTool(name) {
  for (const t of tools) t.setAttribute('aria-pressed', String(t.dataset.tool === name));
  doc.dataset.tool = name;
}
for (const t of tools) t.addEventListener('click', () => setTool(t.dataset.tool));

function setView(view) {
  state.view = view;
  for (const b of document.querySelectorAll('[data-view]'))
    b.setAttribute('aria-pressed', String(b.dataset.view === view));
  doc.dataset.view = view;
  render();
}
for (const b of document.querySelectorAll('[data-view]'))
  b.addEventListener('click', () => setView(b.dataset.view));

document.querySelector('[data-action="zoom-in"]')?.addEventListener('click', () => {
  state.zoom = Math.min(1.8, state.zoom * 1.15);
  render();
});
document.querySelector('[data-action="zoom-out"]')?.addEventListener('click', () => {
  state.zoom = Math.max(0.6, state.zoom / 1.15);
  render();
});
for (const btn of document.querySelectorAll('[data-action="toggle-theme"]')) {
  btn.addEventListener('click', () => setTheme(doc.dataset.theme === 'dark' ? 'light' : 'dark'));
}

// ------------------------------------------------------------------ Befehlssuche (Strg+K)

const dialog = document.getElementById('cmdk');
const cmdInput = dialog?.querySelector('input');
const cmdList = dialog?.querySelector('[role="listbox"]');

const commands = [
  {
    group: 'Befehle',
    label: 'Möbel hinzufügen',
    icon: 'sofa',
    key: 'M',
    run: () => setTool('furniture'),
  },
  {
    group: 'Befehle',
    label: 'Wand streichen oder tapezieren',
    icon: 'roller',
    key: 'F',
    run: () => setTool('surface'),
  },
  {
    group: 'Befehle',
    label: 'Abstand messen',
    icon: 'ruler',
    key: 'L',
    run: () => setTool('measure'),
  },
  { group: 'Befehle', label: 'Zur Draufsicht wechseln', icon: 'plan', run: () => setView('plan') },
  {
    group: 'Befehle',
    label: 'Zum Puppenhaus wechseln',
    icon: 'cube',
    run: () => setView('dollhouse'),
  },
  { group: 'Befehle', label: 'Variante „Hell & ruhig“ kopieren', icon: 'layers', run: () => {} },
  { group: 'Befehle', label: 'Einkaufsliste öffnen', icon: 'cart', run: () => {} },
  { group: 'Befehle', label: 'Weiter zu „Erleben“', icon: 'arrow-right', run: () => {} },
  ...items
    .filter((it, i, all) => all.findIndex((o) => o.name === it.name) === i)
    .map((it) => ({
      group: 'In dieser Wohnung',
      label: it.name,
      meta: roomById[it.room]?.name,
      icon: 'sofa',
      run: () => select(it.id),
    })),
  ...rooms.map((r) => ({
    group: 'Räume',
    label: r.name,
    meta: formatArea(roomArea(r)),
    icon: 'plan',
    run: () => {},
  })),
];

let visible = [];
let active = 0;

function iconSvg(name) {
  const ns = 'http://www.w3.org/2000/svg';
  const el = document.createElementNS(ns, 'svg');
  el.setAttribute('class', 'icon');
  el.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS(ns, 'use');
  use.setAttribute('href', `shared/icons.svg#${name}`);
  el.append(use);
  return el;
}

function renderCommands() {
  if (!cmdList || !cmdInput) return;
  const q = cmdInput.value.trim().toLocaleLowerCase('de');
  visible = commands.filter(
    (c) => !q || `${c.label} ${c.meta ?? ''}`.toLocaleLowerCase('de').includes(q),
  );
  active = Math.min(active, Math.max(0, visible.length - 1));
  const nodes = [];
  let group = '';
  visible.forEach((c, i) => {
    if (c.group !== group) {
      group = c.group;
      const head = document.createElement('li');
      head.className = 'cmd-group';
      head.setAttribute('role', 'presentation');
      head.textContent = group;
      nodes.push(head);
    }
    const li = document.createElement('li');
    li.className = 'cmd-item';
    li.id = `cmd-${i}`;
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', String(i === active));
    const label = document.createElement('span');
    label.className = 'cmd-label';
    label.textContent = c.label;
    li.append(iconSvg(c.icon), label);
    if (c.meta) {
      const meta = document.createElement('span');
      meta.className = 'cmd-meta';
      meta.textContent = c.meta;
      li.append(meta);
    }
    if (c.key) {
      const kbd = document.createElement('kbd');
      kbd.textContent = c.key;
      li.append(kbd);
    }
    li.addEventListener('click', () => runCommand(i));
    li.addEventListener('pointermove', () => setActive(i));
    nodes.push(li);
  });
  if (!visible.length) {
    const empty = document.createElement('li');
    empty.className = 'cmd-empty';
    empty.setAttribute('role', 'presentation');
    empty.textContent = 'Nichts gefunden. Versuch es mit „Sofa“, „Wand“ oder „Messen“.';
    nodes.push(empty);
  }
  cmdList.replaceChildren(...nodes);
  cmdInput.setAttribute('aria-activedescendant', visible.length ? `cmd-${active}` : '');
}

function setActive(i) {
  active = i;
  for (const li of cmdList?.querySelectorAll('.cmd-item') ?? [])
    li.setAttribute('aria-selected', String(li.id === `cmd-${i}`));
  cmdInput?.setAttribute('aria-activedescendant', `cmd-${i}`);
  document.getElementById(`cmd-${i}`)?.scrollIntoView({ block: 'nearest' });
}

function runCommand(i) {
  const c = visible[i];
  dialog?.close();
  c?.run();
}

function openSearch() {
  if (!dialog || !cmdInput || dialog.open) return;
  cmdInput.value = '';
  active = 0;
  renderCommands();
  dialog.showModal();
  cmdInput.focus();
}

cmdInput?.addEventListener('input', () => {
  active = 0;
  renderCommands();
});
cmdInput?.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    if (visible.length) setActive((active + 1) % visible.length);
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    if (visible.length) setActive((active - 1 + visible.length) % visible.length);
  } else if (event.key === 'Enter') {
    event.preventDefault();
    runCommand(active);
  }
});
dialog?.addEventListener('click', (event) => {
  if (event.target === dialog) dialog.close();
});
for (const btn of document.querySelectorAll('[data-action="open-search"]'))
  btn.addEventListener('click', openSearch);

document.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    openSearch();
    return;
  }
  const typing =
    event.target instanceof HTMLElement &&
    event.target.closest('input, textarea, select, [contenteditable]');
  if (typing || event.ctrlKey || event.metaKey || event.altKey || dialog?.open) return;
  const map = { v: 'select', m: 'furniture', f: 'surface', l: 'measure' };
  const tool = map[event.key.toLowerCase()];
  if (tool) setTool(tool);
});

// ------------------------------------------------------------------ Handy: Karte von unten

const handle = inspector?.querySelector('.sheet-handle');
let drag = null;
let suppressClick = false;

function setSheet(mode) {
  if (!inspector) return;
  inspector.dataset.sheet = mode;
  handle?.setAttribute('aria-expanded', String(mode === 'open'));
  const label = handle?.querySelector('.sr-only');
  if (label)
    label.textContent = mode === 'open' ? 'Eigenschaften einklappen' : 'Alle Eigenschaften zeigen';
}
setSheet('peek');

handle?.addEventListener('click', () => {
  if (suppressClick) {
    suppressClick = false;
    return;
  }
  setSheet(inspector?.dataset.sheet === 'open' ? 'peek' : 'open');
});

function sheetTravel() {
  if (!inspector) return 0;
  const peek = parseFloat(getComputedStyle(inspector).getPropertyValue('--peek')) || 180;
  return Math.max(0, inspector.offsetHeight - peek);
}

inspector?.addEventListener('pointerdown', (event) => {
  if (!mobileQuery.matches) return;
  if (!(event.target instanceof Element) || !event.target.closest('.sheet-handle, .insp-head'))
    return;
  const travel = sheetTravel();
  drag = {
    id: event.pointerId,
    y: event.clientY,
    start: inspector.dataset.sheet === 'open' ? 0 : travel,
    travel,
    moved: false,
    offset: 0,
  };
});
inspector?.addEventListener('pointermove', (event) => {
  if (!drag || event.pointerId !== drag.id) return;
  const dy = event.clientY - drag.y;
  if (!drag.moved && Math.abs(dy) < 6) return;
  if (!drag.moved) {
    drag.moved = true;
    inspector.setPointerCapture(event.pointerId);
    inspector.classList.add('is-dragging');
  }
  drag.offset = Math.max(0, Math.min(drag.travel, drag.start + dy));
  inspector.style.transform = `translateY(${drag.offset}px)`;
});
function endDrag(event) {
  if (!drag || event.pointerId !== drag.id) return;
  if (drag.moved) {
    suppressClick = true;
    inspector?.classList.remove('is-dragging');
    inspector?.style.removeProperty('transform');
    setSheet(drag.offset < drag.travel / 2 ? 'open' : 'peek');
    setTimeout(() => {
      suppressClick = false;
    }, 0);
  }
  drag = null;
}
inspector?.addEventListener('pointerup', endDrag);
inspector?.addEventListener('pointercancel', endDrag);

// ------------------------------------------------------------------ Start

const initial = items.find((it) => it.id === state.selected);
if (initial) fillInspector(initial);
render();
document.fonts?.ready.then(render);
if (stage) new ResizeObserver(scheduleRender).observe(stage);
mobileQuery.addEventListener('change', () => {
  setSheet('peek');
  render();
});
