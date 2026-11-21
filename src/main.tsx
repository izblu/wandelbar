import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './ui/styles/index.css';
import { App } from './app/App.tsx';
import { registerServiceWorker } from './app/pwa.ts';
import { initTheme } from './ui/theme.ts';
import './app/app.css';

initTheme();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Das Wurzelelement #root fehlt in index.html.');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

registerServiceWorker();
