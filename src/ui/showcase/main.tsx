import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/index.css';
import { initTheme } from '../theme.ts';
import { Showcase } from './Showcase.tsx';

initTheme();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Das Wurzelelement #root fehlt in bausteine.html.');
}

createRoot(rootElement).render(
  <StrictMode>
    <Showcase />
  </StrictMode>,
);
