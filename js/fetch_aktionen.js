import { openIndexedDB } from './indexedDB.js';

export async function fetchAktionenData(ticketNr) {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['aktionen'], 'readonly');
        const store = transaction.objectStore('aktionen');
        const index = store.index('AufgabenNr');
        const request = index.getAll(ticketNr);

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}
