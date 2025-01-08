import { API_URL,APP_RQ } from './app.js';
import { openIndexedDB } from './indexedDB.js';

export async function load_sympathie() {
    try {
        const sid = localStorage.getItem('SID');
        const response = await fetch(`${API_URL}${APP_RQ}&ARGUMENTS=-Agetsympathie`, {
            headers: {
                'Content-Type': 'application/json',
                'SID': sid
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP-Fehler! Status: ${response.status}`);
        }

        const sympathieData = await response.json();
        const db = await openIndexedDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['sympathie'], 'readwrite');
            const store = transaction.objectStore('sympathie');

            sympathieData.forEach(entry => {
                store.put({
                    SympathieCode: entry.SympathieCode,
                    Sympathie: entry.Sympathie
                });
            });

            transaction.oncomplete = () => resolve();
            transaction.onerror = (event) => reject(event.target.error);
        });
    } catch (error) {
        console.error('Fehler beim Laden der Sympathie:', error);
        throw error;
    }
}
