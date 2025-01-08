export async function openIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('SuccessFlowCRM', 5); // Version auf 5 erhöhen

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            if (!db.objectStoreNames.contains('aufgaben')) {
                const store = db.createObjectStore('aufgaben', { keyPath: 'TicketNr' });
                store.createIndex('AnbahnungNr', 'AnbahnungNr', { unique: false });
                store.createIndex('AufgabenNr', 'AufgabenNr', { unique: true });
            }

            if (!db.objectStoreNames.contains('aktionen')) {
                const store = db.createObjectStore('aktionen', { keyPath: 'AktionNr' });
                store.createIndex('AufgabenNr', 'AufgabenNr', { unique: false });
                store.createIndex('KundenNr', 'KundenNr', { unique: false });
            } else {
                const transaction = event.target.transaction;
                const store = transaction.objectStore('aktionen');
                if (!store.indexNames.contains('KundenNr')) {
                    store.createIndex('KundenNr', 'KundenNr', { unique: false });
                }
            }

            if (!db.objectStoreNames.contains('vertriebler')) {
                const store = db.createObjectStore('vertriebler', { keyPath: 'MitarbeiterNr' });
                store.createIndex('EMail', 'EMail', { unique: false });
                store.createIndex('Benutzer', 'Benutzer', { unique: false });
            }

            if (!db.objectStoreNames.contains('telefonbuch')) {
                db.createObjectStore('telefonbuch', { keyPath: 'lfdNr' });
            }

            if (!db.objectStoreNames.contains('anbahnungen')) {
                const store = db.createObjectStore('anbahnungen', { keyPath: 'AnbahnungNr' });
                store.createIndex('AnbahnungNr', 'AnbahnungNr', { unique: true });
            }

            if (!db.objectStoreNames.contains('kunden')) {
                const store = db.createObjectStore('kunden', { keyPath: 'KundenNr' });
                store.createIndex('KundenNr', 'KundenNr', { unique: true });
            }

            if (!db.objectStoreNames.contains('kontaktpersonen')) {
                const store = db.createObjectStore('kontaktpersonen', { keyPath: 'PersonNr' });
                store.createIndex('KundenNr', 'KundenNr', { unique: false });
            }

            if (!db.objectStoreNames.contains('metadata')) {
                db.createObjectStore('metadata');
            }

            if (!db.objectStoreNames.contains('tickets')) {
                db.createObjectStore('tickets', { keyPath: 'TicketNr' });
            }

            if (!db.objectStoreNames.contains('mandanten')) {
                db.createObjectStore('mandanten', { keyPath: 'MandantenNr' });
            }

            if (!db.objectStoreNames.contains('branchen')) {
                db.createObjectStore('branchen', { keyPath: 'BranchenCode' });
            }

            if (!db.objectStoreNames.contains('gruppen')) {
                db.createObjectStore('gruppen', { keyPath: 'GruppenNr' });
            }

            if (!db.objectStoreNames.contains('ratings')) {
                db.createObjectStore('ratings', { keyPath: 'RatingNr' });
            }

            if (!db.objectStoreNames.contains('workflows')) {
                const store = db.createObjectStore('workflows', { keyPath: 'Workflow' });
                store.createIndex('WorkflowName', 'WorkflowName', { unique: false });
            }

            if (!db.objectStoreNames.contains('termine')) {
                const store = db.createObjectStore('termine', { keyPath: 'TerminId' });
                store.createIndex('MitarbeiterNr', 'MitarbeiterNr', { unique: false });
                store.createIndex('Termindatum', 'Termindatum', { unique: false });
            }

            if (!db.objectStoreNames.contains('laender')) {
                db.createObjectStore('laender', { keyPath: 'LaenderID' });
            }

            if (!db.objectStoreNames.contains('sympathie')) {
                db.createObjectStore('sympathie', { keyPath: 'SympathieCode' });
            }

            if (!db.objectStoreNames.contains('kpfunktionen')) {
                db.createObjectStore('kpfunktionen', { keyPath: 'Funktion' });
            }
            if (!db.objectStoreNames.contains('grundverloren')) {
                // Grundschluessel ist alphanumerisch, keyPath direkt Grundschluessel
                db.createObjectStore('grundverloren', { keyPath: 'Grundschluessel' });
            }
            // Neuer ObjectStore für mitbewerber
            if (!db.objectStoreNames.contains('mitbewerber')) {
                // MitbewerberNr numerisch, keyPath = 'MitbewerberNr'
                db.createObjectStore('mitbewerber', {keyPath: 'MitbewerberNr'});
            }
            if (!db.objectStoreNames.contains('klassifizierungen')) {
                // keyPath = 'KlassifizierungNr', die Nr ist numerisch
                db.createObjectStore('klassifizierungen', { keyPath: 'KlassifizierungNr' });
            }
            if (!db.objectStoreNames.contains('statusschluessel')) {
                // keyPath = 'StatusSchluessel', alpha => Keypath als String
                db.createObjectStore('statusschluessel', { keyPath: 'StatusSchluessel' });
            }
            if (!db.objectStoreNames.contains('aktionsschluessel')) {
                // keyPath = 'AktionsSchluessel', alpha => Keypath als String
                db.createObjectStore('aktionsschluessel', { keyPath: 'AktionsSchluessel' });
            }
        };

        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

export async function initializeDatabase() {
    await openIndexedDB();
}
