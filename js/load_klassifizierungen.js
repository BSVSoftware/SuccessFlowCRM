// load_klassifizierungen.js
import { API_URL,APP_RQ } from './app.js';
import { openIndexedDB } from './indexedDB.js';

export async function load_Klassifizierungen() {
    try {
        const sid = localStorage.getItem('SID');
        const response = await fetch(`${API_URL}${APP_RQ}&ARGUMENTS=-Agetcrmklassifizierungen`, {
            method: 'GET',  // oder 'POST', je nach API
            headers: {
                'Content-Type': 'application/json',
                'SID': sid
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP-Fehler beim Laden der Klassifizierungen! Status: ${response.status}`);
        }

        const data = await response.json();

        // Prüfen, ob wir ein Array erhalten
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error("Keine Klassifizierungen empfangen oder ungültiges Format.");
        }

        const db = await openIndexedDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['klassifizierungen'], 'readwrite');
            const store = transaction.objectStore('klassifizierungen');

            data.forEach(entry => {
                // Optional: Validierung
                if (
                    typeof entry.KlassifizierungNr !== 'number' ||
                    !entry.Klassifizierung
                ) {
                    console.warn("Ungültiger Datensatz in Klassifizierungen:", entry);
                    return; // Überspringen
                }
                store.put(entry);
            });

            transaction.oncomplete = () => resolve();
            transaction.onerror = (event) => reject(event.target.error);
        });
    } catch (error) {
        console.error("Fehler beim Laden der Klassifizierungen:", error);
        throw error;
    }
}
