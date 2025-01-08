import { openIndexedDB } from './indexedDB.js';

export const fetchVertrieblerData = async () => {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['vertriebler'], 'readonly');
        const store = transaction.objectStore('vertriebler');
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => {
            console.error('Fehler beim Abrufen der Vertriebler-Daten:', event.target.error);
            reject(event.target.error);
        };
    });
};
