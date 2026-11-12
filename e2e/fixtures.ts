import { test as base, expect } from '@playwright/test';

/**
 * Datenschutz-Wächter für alle E2E-Tests.
 *
 * - Schneidet jede Anfrage des Browser-Kontexts mit (auch die des Service Workers).
 * - Jede Anfrage an eine fremde Adresse wird abgebrochen, bevor sie das Netz erreicht,
 *   und lässt den Test scheitern.
 * - Jeder CSP-Verstoß im Dokument lässt den Test scheitern.
 *
 * Der Wächter läuft automatisch in jedem Test, der `test` aus dieser Datei importiert.
 * Nur die Gegenproben schalten das Scheitern mit `expectPrivacyViolations` ab.
 */
export interface PrivacyMonitor {
  /** Adressen fremder Anfragen (abgebrochen, nie gesendet). */
  readonly foreignRequests: string[];
  /** Gemeldete CSP-Verstöße als `Direktive -> blockierte Adresse`. */
  readonly cspViolations: string[];
}

interface PrivacyFixtures {
  expectPrivacyViolations: boolean;
  privacy: PrivacyMonitor;
}

const CSP_VIOLATION_BINDING = '__wandelbarReportCspViolation';

export const test = base.extend<PrivacyFixtures>({
  expectPrivacyViolations: [false, { option: true }],

  privacy: [
    async ({ context, baseURL, expectPrivacyViolations }, use) => {
      if (!baseURL) throw new Error('baseURL fehlt in playwright.config.ts.');
      const appOrigin = new URL(baseURL).origin;
      const foreignRequests = new Set<string>();
      const cspViolations: string[] = [];

      const isForeign = (rawUrl: string): boolean => {
        const url = new URL(rawUrl);
        if (url.protocol === 'data:' || url.protocol === 'blob:') return false;
        return url.origin !== appOrigin;
      };

      context.on('request', (request) => {
        if (isForeign(request.url())) foreignRequests.add(request.url());
      });

      // Sicherheitsnetz: Fremde Anfragen verlassen den Rechner während der Tests nie.
      await context.route(
        (url) => isForeign(url.href),
        async (route) => {
          foreignRequests.add(route.request().url());
          await route.abort('blockedbyclient');
        },
      );

      await context.exposeBinding(CSP_VIOLATION_BINDING, (_source, violation: string) => {
        cspViolations.push(violation);
      });
      await context.addInitScript((bindingName: string) => {
        document.addEventListener('securitypolicyviolation', (event) => {
          const report = (window as unknown as Record<string, (violation: string) => void>)[
            bindingName
          ];
          report?.(`${event.effectiveDirective} -> ${event.blockedURI || '(inline)'}`);
        });
      }, CSP_VIOLATION_BINDING);

      const monitor: PrivacyMonitor = {
        get foreignRequests() {
          return [...foreignRequests];
        },
        cspViolations,
      };

      await use(monitor);

      if (!expectPrivacyViolations) {
        expect(monitor.foreignRequests, 'Anfragen an fremde Adressen').toEqual([]);
        expect(monitor.cspViolations, 'Verstöße gegen die Content-Security-Policy').toEqual([]);
      }
    },
    { auto: true },
  ],
});

export { expect };
