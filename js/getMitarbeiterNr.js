import { openIndexedDB } from './indexedDB.js';

export async function getMitarbeiterNr() {
    try {
        const email = localStorage.getItem('email');
        if (!email) {
            console.error("E-Mail nicht im localStorage gefunden.");
            return null;
        }

        const emailUpperCase = email.toUpperCase();
        const db = await openIndexedDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['vertriebler'], 'readonly');
            const store = transaction.objectStore('vertriebler');
            const index = store.index('Benutzer');
            const request = index.get(emailUpperCase);

            request.onsuccess = (event) => {
                const result = event.target.result;
                if (result) {
                    localStorage.setItem('MitarbeiterNr', result.MitarbeiterNr); // Speichern im localStorage
                    resolve(result.MitarbeiterNr);
                } else {
                    console.warn("Kein Vertriebler mit der angegebenen E-Mail gefunden.");
                    resolve(null);
                }
            };

            request.onerror = (event) => {
                console.error("Fehler beim Suchen der Mitarbeiter-Nummer:", event.target.error);
                reject(event.target.error);
            };
        });
    } catch (error) {
        console.error("Fehler beim Abrufen der Mitarbeiter-Nummer:", error);
        throw error;
    }
}
