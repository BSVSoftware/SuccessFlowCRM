import { API_URL,APP_RQ } from './app.js';
import { openIndexedDB } from './indexedDB.js';

export async function load_grundverloren() {
    try {
        const sid = localStorage.getItem('SID');
        const response = await fetch(`${API_URL}${APP_RQ}&ARGUMENTS=-Agetgrundverloren`, {
            headers: {
                'Content-Type': 'application/json',
                'SID': sid
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP-Fehler! Status: ${response.status}`);
        }

        const grundverlorenData = await response.json();
        const db = await openIndexedDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['grundverloren'], 'readwrite');
            const store = transaction.objectStore('grundverloren');

            grundverlorenData.forEach(entry => {
                store.put({
                    Grundschluessel: entry.Grundschluessel,
                    Grund: entry.Grund,
                    MitbewerberAngeben: !!entry.MitbewerberAngeben // sicherstellen dass boolean
                });
            });

            transaction.oncomplete = () => resolve();
            transaction.onerror = (event) => reject(event.target.error);
        });
    } catch (error) {
        console.error('Fehler beim Laden von grundverloren:', error);
        throw error;
    }
}
