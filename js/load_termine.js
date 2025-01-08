import { API_URL,APP_RQ } from './app.js';
import { openIndexedDB } from './indexedDB.js';

/**
 * Lädt die Termine für EXACT einen Mitarbeiter (mitarbeiterNr).
 * Falls kein Parameter => default = localStorage.
 */
export async function loadTermine(mitarbeiterNr = null) {
    try {
        const sid = localStorage.getItem('SID');

        // Fallback: localStorage
        if (!mitarbeiterNr) {
            const stored = localStorage.getItem('MitarbeiterNr');
            if (stored) {
                mitarbeiterNr = parseInt(stored, 10);
            }
        }
        if (!mitarbeiterNr || isNaN(mitarbeiterNr)) {
            console.error('Keine gültige MitarbeiterNr vorhanden.');
            return;
        }

        // Zeitfenster definieren
        const now = new Date();
        const vonDatum = formatDate(now);
        const plus30 = new Date(now);
        plus30.setDate(plus30.getDate() + 30);
        const bisDatum = formatDate(plus30);

        // REST-Call
        const response = await fetch(`${API_URL}${APP_RQ}&ARGUMENTS=-Agettermine`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'SID': sid
            },
            body: JSON.stringify({
                MitarbeiterNr: mitarbeiterNr,
                vonDatum: vonDatum,
                bisDatum: bisDatum
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP-Fehler! Status: ${response.status}`);
        }

        const termineData = await response.json();
        const db = await openIndexedDB();

        // Speichern in IDB
        await new Promise((resolve, reject) => {
            const tx = db.transaction(['termine'], 'readwrite');
            const store = tx.objectStore('termine');

            termineData.forEach(entry => {
                // null => ''
                Object.keys(entry).forEach(k => {
                    if (entry[k] === null) entry[k] = '';
                });
                // Zusätzliche Sicherheit => mitarbeiterNr in den Datensatz
                if (!entry.MitarbeiterNr) {
                    entry.MitarbeiterNr = mitarbeiterNr;
                }
                store.put(entry);
            });

            tx.oncomplete = () => resolve();
            tx.onerror = (event) => reject(event.target.error);
        });

        console.log(`Termine für MitarbeiterNr ${mitarbeiterNr} gespeichert.`);
    } catch (error) {
        console.error('Fehler beim Laden der Termine:', error);
    }
}

function formatDate(d) {
    const day   = ("0" + d.getDate()).slice(-2);
    const month = ("0" + (d.getMonth() + 1)).slice(-2);
    const year  = d.getFullYear();
    return `${day}.${month}.${year}`;
}
