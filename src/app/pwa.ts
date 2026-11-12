import { registerSW } from 'virtual:pwa-register';

/**
 * Registriert den Service Worker (nur im Produktions-Build aktiv, im Dev-Server ein No-op).
 * Vorläufig mit automatischem Update; eine Update-Meldung in der Oberfläche folgt mit dem Design.
 */
export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;
  registerSW({ immediate: true });
}
