// load_statusschluessel.js
import { API_URL,APP_RQ } from './app.js';
import { openIndexedDB } from './indexedDB.js';

export async function load_Statusschluessel() {
    try {
        const sid = localStorage.getItem('SID');
        const response = await fetch(`${API_URL}${APP_RQ}&ARGUMENTS=-Agetcrmstatusschluessel`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'SID': sid
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP-Fehler beim Laden der Statusschlüssel! Status: ${response.status}`);
        }

        const data = await response.json();
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error("Keine Statusschlüssel empfangen oder ungültiges Format.");
        }

        const db = await openIndexedDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['statusschluessel'], 'readwrite');
            const store = transaction.objectStore('statusschluessel');

            data.forEach(entry => {
                // Validierung
                if (!entry.StatusSchluessel || !entry.Status) {
                    console.warn("Ungültiger Datensatz in Statusschluessel:", entry);
                    return;
                }
                store.put(entry);
            });

            transaction.oncomplete = () => resolve();
            transaction.onerror = (event) => reject(event.target.error);
        });
    } catch (error) {
        console.error("Fehler beim Laden der Statusschlüssel:", error);
        throw error;
    }
}
