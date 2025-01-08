import { API_URL,APP_RQ } from './app.js';
import { openIndexedDB } from './indexedDB.js';

export async function load_laender() {
    try {
        const sid = localStorage.getItem('SID');
        const response = await fetch(`${API_URL}${APP_RQ}&ARGUMENTS=-Agetlaender`, {
            headers: {
                'Content-Type': 'application/json',
                'SID': sid
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP-Fehler! Status: ${response.status}`);
        }

        const laenderData = await response.json();
        const db = await openIndexedDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['laender'], 'readwrite');
            const store = transaction.objectStore('laender');

            laenderData.forEach(entry => {
                const laenderID = entry.Laenderschluessel + '_' + entry.Sprachschluessel;
                store.put({
                    LaenderID: laenderID,
                    Laenderschluessel: entry.Laenderschluessel,
                    Land: entry.Land,
                    PLZPicture: entry.PLZPicture,
                    Sprachschluessel: entry.Sprachschluessel
                });
            });

            transaction.oncomplete = () => resolve();
            transaction.onerror = (event) => reject(event.target.error);
        });
    } catch (error) {
        console.error('Fehler beim Laden der Laender:', error);
        throw error;
    }
}
