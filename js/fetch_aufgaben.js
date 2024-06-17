import { openIndexedDB } from './indexedDB.js';

export async function fetchAufgabenData() {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['aufgaben'], 'readonly');
        const store = transaction.objectStore('aufgaben');
        const request = store.getAll();

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}
