import { API_URL,APP_RQ } from './app.js';
import { openIndexedDB } from './indexedDB.js';

export async function load_gruppen() {
    try {
        const sid = localStorage.getItem('SID');
        const response = await fetch(`${API_URL}${APP_RQ}&ARGUMENTS=-Agetanbahnungsgruppe`, {
            headers: {
                'Content-Type': 'application/json',
                'SID': sid
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const gruppenData = await response.json();
        const db = await openIndexedDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['gruppen'], 'readwrite');
            const store = transaction.objectStore('gruppen');

            gruppenData.forEach(entry => {
                store.put(entry);
            });

            transaction.oncomplete = () => resolve();
            transaction.onerror = (event) => reject(event.target.error);
        });
    } catch (error) {
        console.error('Error loading gruppen data:', error);
        throw error;
    }
}
