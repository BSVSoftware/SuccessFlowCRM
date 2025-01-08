import { openIndexedDB } from './indexedDB.js';

export async function fetchAktionenData(kundenNr = null, aufgabenNr = null) {
    try {
        const db = await openIndexedDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['aktionen'], 'readonly');
            const store = transaction.objectStore('aktionen');

            let request;
            if (kundenNr || aufgabenNr) {
                // Aktionen für eine spezifische KundenNr oder AufgabenNr abrufen
                request = store.getAll();
            } else {
                // Alle Aktionen abrufen
                request = store.getAll();
            }

            request.onsuccess = () => {
                const allData = request.result;

                // Filtern nach KundenNr und AufgabenNr, falls angegeben
                const filteredData = allData.filter(aktion => {
                    let matchesKundenNr = true;
                    let matchesAufgabenNr = true;

                    if (kundenNr) {
                        matchesKundenNr = aktion.KundenNr === kundenNr;
                    }
                    if (aufgabenNr) {
                        matchesAufgabenNr = aktion.AufgabenNr === aufgabenNr;
                    }

                    return matchesKundenNr && matchesAufgabenNr;
                });

                resolve(filteredData);
            };

            request.onerror = (event) => {
                console.error('Fehler beim Abrufen der Aktionen:', event.target.error);
                reject(event.target.error);
            };
        });
    } catch (error) {
        console.error('Fehler beim Abrufen der Aktionen:', error);
        return [];
    }
}
