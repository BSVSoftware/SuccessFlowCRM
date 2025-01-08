import { openIndexedDB } from './indexedDB.js';

export const fetchTicketsData = async () => {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['tickets'], 'readonly');
        const store = transaction.objectStore('tickets');
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(event.target.error);
    });
};
