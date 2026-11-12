import { isPreview } from './channel.ts';

/**
 * Leeres App-Gerüst aus M0. Die eigentliche Oberfläche entsteht in der Designphase (MD).
 */
export function App() {
  return (
    <main className="placeholder">
      <h1>Wandelbar</h1>
      <p>Hier entsteht dein Raumplaner.</p>
      {isPreview && (
        <p className="preview-note" role="note">
          Vorschau-Version: Sie speichert ihre Daten getrennt von der Hauptversion. Projekte aus der
          Hauptversion erscheinen hier nicht, und was du hier anlegst, bleibt in der Vorschau.
        </p>
      )}
    </main>
  );
}
