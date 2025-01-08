// load_aktionsschluessel.js
import { API_URL,APP_RQ } from './app.js';
import { openIndexedDB } from './indexedDB.js';

export async function load_Aktionsschluessel() {
    try {
        const sid = localStorage.getItem('SID');
        const response = await fetch(`${API_URL}${APP_RQ}&ARGUMENTS=-Agetcrmaktionsschluessel`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'SID': sid
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP-Fehler beim Laden der Aktionsschlüssel! Status: ${response.status}`);
        }

        const data = await response.json();
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error("Keine Aktionsschlüssel empfangen oder ungültiges Format.");
        }

        const db = await openIndexedDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['aktionsschluessel'], 'readwrite');
            const store = transaction.objectStore('aktionsschluessel');

            data.forEach(entry => {
                if (!entry.AktionsSchluessel || !entry.Aktion) {
                    console.warn("Ungültiger Datensatz in Aktionsschluessel:", entry);
                    return;
                }
                store.put(entry);
            });

            transaction.oncomplete = () => resolve();
            transaction.onerror = (event) => reject(event.target.error);
        });
    } catch (error) {
        console.error("Fehler beim Laden der Aktionsschlüssel:", error);
        throw error;
    }
}
