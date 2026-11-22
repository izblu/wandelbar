/**
 * Übersichtsseite: skaliert die eingebetteten Entwürfe auf die Spaltenbreite und schaltet ihr
 * Design (hell/dunkel) gemeinsam um. Alle Seiten liegen auf derselben Herkunft.
 */

const frames = [...document.querySelectorAll('.frame')];
let theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

function fit(frame) {
  const iframe = frame.querySelector('iframe');
  if (!iframe) return;
  const w = Number(frame.dataset.width);
  const h = Number(frame.dataset.height);
  const scale = frame.clientWidth / w;
  iframe.width = String(w);
  iframe.height = String(h);
  iframe.style.transform = `scale(${scale})`;
  frame.style.height = `${Math.round(h * scale)}px`;
}

function applyTheme(iframe) {
  const win = iframe.contentWindow;
  if (win && typeof win.wandelbarSetTheme === 'function') win.wandelbarSetTheme(theme);
}

function setTheme(next) {
  theme = next;
  for (const btn of document.querySelectorAll('[data-theme-choice]')) {
    btn.setAttribute('aria-pressed', String(btn.dataset.themeChoice === theme));
  }
  for (const iframe of document.querySelectorAll('.frame iframe')) applyTheme(iframe);
}

for (const frame of frames) {
  const iframe = frame.querySelector('iframe');
  iframe?.addEventListener('load', () => {
    applyTheme(iframe);
    // Das Skript im Entwurf registriert die Funktion erst nach dem Laden des Moduls.
    setTimeout(() => applyTheme(iframe), 300);
  });
  new ResizeObserver(() => fit(frame)).observe(frame);
  fit(frame);
}

for (const btn of document.querySelectorAll('[data-theme-choice]')) {
  btn.addEventListener('click', () => setTheme(btn.dataset.themeChoice));
}
setTheme(theme);
