import { API_URL,APP_RQ } from './app.js';
import { openIndexedDB } from './indexedDB.js';

export async function load_mitbewerber() {
    try {
        const sid = localStorage.getItem('SID');
        const response = await fetch(`${API_URL}${APP_RQ}&ARGUMENTS=-Agetmitbewerber`, {
            headers: {
                'Content-Type': 'application/json',
                'SID': sid
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP-Fehler! Status: ${response.status}`);
        }

        const mitbewerberData = await response.json();
        const db = await openIndexedDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['mitbewerber'], 'readwrite');
            const store = transaction.objectStore('mitbewerber');

            mitbewerberData.forEach(entry => {
                store.put({
                    MitbewerberNr: Number(entry.MitbewerberNr),
                    Mitbewerber: entry.Mitbewerber
                });
            });

            transaction.oncomplete = () => resolve();
            transaction.onerror = (event) => reject(event.target.error);
        });
    } catch (error) {
        console.error('Fehler beim Laden der Mitbewerber:', error);
        throw error;
    }
}
