import { API_URL,APP_RQ } from './app.js';
import { openIndexedDB } from './indexedDB.js';

export async function loadAktionen(kundenNr = null, aufgabenNr = null, aktionNr = null) {
    return new Promise(async (resolve, reject) => {
        try {
            const sid = localStorage.getItem('SID');
            const requestBody = {};

            // ---------------------------------------
            // NEU: Prüfen, ob keine Parameter gesetzt:
            // ---------------------------------------
            if (!kundenNr && !aufgabenNr && !aktionNr) {
                // -> MitarbeiterNr aus localStorage ziehen (als Fallback)
                const mitarbeiterNrLocal = localStorage.getItem("MitarbeiterNr");
                if (mitarbeiterNrLocal) {
                    // numerisch konvertieren, falls möglich
                    requestBody.MitarbeiterNr = parseInt(mitarbeiterNrLocal, 10) || 0;
                    console.log("Lade Aktionen gefiltert nach MitarbeiterNr:", requestBody.MitarbeiterNr);
                } else {
                    console.warn("Keine Parameter und keine MitarbeiterNr im localStorage gefunden.");
                    // Sie können hier optional abbrechen:
                    // return reject("Keine Parameter und keine MitarbeiterNr gefunden.");
                }
            } else {
                // Parameter hinzufügen, falls sie vorhanden sind
                if (kundenNr)    requestBody.KundenNr    = kundenNr;
                if (aufgabenNr)  requestBody.AufgabenNr  = aufgabenNr;
                if (aktionNr)    requestBody.AktionNr    = aktionNr;
            }

            const db = await openIndexedDB();
            const transaction = db.transaction(['aktionen'], 'readwrite');
            const store = transaction.objectStore('aktionen');

            // Vorhandene Aktionen löschen, falls kein spezifischer Filter (AktionNr) gesetzt ist
            if (!aktionNr) {
                store.clear();  // ggf. nur leeren, wenn man wirklich alle löschen möchte
            }

            transaction.oncomplete = async () => {
                console.log('Lade neue Aktionen von der REST-API...');

                try {
                    const response = await fetch(`${API_URL}${APP_RQ}&ARGUMENTS=-Agetcrmaktionen`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'SID': sid
                        },
                        body: JSON.stringify(requestBody)
                    });

                    if (!response.ok) {
                        if (response.status === 401) {
                            handleUnauthorized();
                            reject('Unauthorized');
                            return;
                        }
                        throw new Error(`HTTP-Fehler! Status: ${response.status}`);
                    }

                    const aktionenData = await response.json();

                    const saveTransaction = db.transaction(['aktionen'], 'readwrite');
                    const saveStore = saveTransaction.objectStore('aktionen');

                    aktionenData.forEach(entry => {
                        // Null-Felder in leere Strings umwandeln
                        Object.keys(entry).forEach(key => {
                            if (entry[key] === null) {
                                entry[key] = '';
                            }
                        });
                        if (!entry.AktionNr) {
                            console.warn("Objekt ohne AktionNr - wird nicht gespeichert:", entry);
                            return; // Überspringen
                        }

                        saveStore.put(entry);
                    });

                    saveTransaction.oncomplete = () => {
                        console.log('Neue Aktionen erfolgreich in IndexedDB gespeichert.');
                        resolve();
                    };

                    saveTransaction.onerror = (event) => {
                        console.error('Fehler beim Speichern der Aktionen:', event.target.error);
                        reject(event.target.error);
                    };
                } catch (apiError) {
                    console.error('Fehler beim Abrufen der Aktionen:', apiError);
                    reject(apiError);
                }
            };

            transaction.onerror = (event) => {
                console.error('Fehler beim Löschen der Aktionen:', event.target.error);
                reject(event.target.error);
            };
        } catch (error) {
            console.error('Fehler beim Laden der Aktionen:', error);
            reject(error);
        }
    });
}

function handleUnauthorized() {
    alert('Ihre Sitzung ist abgelaufen. Bitte loggen Sie sich erneut ein.');
    window.location.href = '../html/login.html';
}
