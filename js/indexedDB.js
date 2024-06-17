export async function openIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('SuccessFlowCRM', 1);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('aufgaben')) {
                db.createObjectStore('aufgaben', {keyPath: 'TicketNr'});
            }
            if (!db.objectStoreNames.contains('aktionen')) {
                const store = db.createObjectStore('aktionen', {keyPath: 'AktionNr'});
                store.createIndex('AufgabenNr', 'AufgabenNr', {unique: false});
            }
            if (!db.objectStoreNames.contains('vertriebler')) {
                db.createObjectStore('vertriebler', {keyPath: 'MitarbNr'});
            }
            if (!db.objectStoreNames.contains('telefonbuch')) {
                db.createObjectStore('telefonbuch', {keyPath: 'lfdNr'});
            }
            if (!db.objectStoreNames.contains('anbahnungen')) {
                db.createObjectStore('anbahnungen', {keyPath: 'AnbahnungNr'});
            }
            if (!db.objectStoreNames.contains('kunden')) {
                db.createObjectStore('kunden', {keyPath: 'KundenNr'});
            }
            if (!db.objectStoreNames.contains('metadata')) {
                db.createObjectStore('metadata');
            }
        };
        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.error);
    });
}
    export async function initializeDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('SuccessFlowCRM', 1);
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('aufgaben')) {
                    db.createObjectStore('aufgaben', { keyPath: 'TicketNr' });
                }
                if (!db.objectStoreNames.contains('aktionen')) {
                    const store = db.createObjectStore('aktionen', { keyPath: 'AktionNr' });
                    store.createIndex('AufgabenNr', 'AufgabenNr', { unique: false });
                }
                if (!db.objectStoreNames.contains('vertriebler')) {
                    db.createObjectStore('vertriebler', { keyPath: 'MitarbNr' });
                }
                if (!db.objectStoreNames.contains('telefonbuch')) {
                    db.createObjectStore('telefonbuch', { keyPath: 'lfdNr' });
                }
                if (!db.objectStoreNames.contains('anbahnungen')) {
                    db.createObjectStore('anbahnungen', { keyPath: 'AnbahnungNr' });
                }
                if (!db.objectStoreNames.contains('kunden')) {
                    db.createObjectStore('kunden', { keyPath: 'KundenNr' });
                }
                if (!db.objectStoreNames.contains('metadata')) {
                    db.createObjectStore('metadata');
                }
            };
            request.onsuccess = (event) => resolve(event.target.result);
            request.onerror = (event) => reject(event.target.error);
        });
}
