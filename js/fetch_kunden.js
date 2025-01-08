import { API_URL,APP_RQ } from './app.js';
import { openIndexedDB } from './indexedDB.js';

/**
 * Lädt Kunden von der REST-API.
 * Optional können ein Volltext (für Suche) und/oder eine KundenNr übergeben werden.
 * Die REST-API entscheidet anhand der übergebenen Parameter, ob ein einzelner Kunde oder mehrere Kunden geliefert werden.
 * Die Ergebnisse werden in der IndexedDB gespeichert (bereits vorhandene Kunden werden aktualisiert).
 *
 * @param {string} [volltext] - Optionaler Suchbegriff für Kunden (nicht numerisch)
 * @param {number} [kundenNr] - Optionale KundenNr (falls eine bestimmte KundenNr geladen werden soll)
 * @returns {Promise<Array>} - Array von Kundendatensätzen
 */
export async function fetchAndStoreKunden(volltext, kundenNr) {
    const sid = localStorage.getItem('SID');
    const body = {};

    if (volltext) {
        body.Volltext = volltext;
    }

    if (kundenNr) {
        body.KundenNr = Number(kundenNr);
    }

    const response = await fetch(`${API_URL}${APP_RQ}&ARGUMENTS=-AgetKunden`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'SID': sid
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        console.error(`Fehler beim Abrufen der Kunden: ${response.statusText}`);
        return [];
    }

    const kundenData = await response.json();
    await storeKundenInIndexedDB(kundenData);
    return kundenData;
}

/**
 * Speichert eine Liste von Kunden in der IndexedDB.
 * Bereits vorhandene Datensätze mit derselben KundenNr werden aktualisiert.
 *
 * @param {Array} customers - Array von Kundendatensätzen
 * @returns {Promise<void>}
 */
export async function storeKundenInIndexedDB(customers) {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['kunden'], 'readwrite');
        const store = transaction.objectStore('kunden');

        customers.forEach(entry => {
            store.put(entry);
        });

        transaction.oncomplete = () => resolve();
        transaction.onerror = (event) => {
            console.error('Fehler beim Speichern der Kunden in IndexedDB:', event.target.error);
            reject(event.target.error);
        };
    });
}

/**
 * Lädt einen Kunden aus der IndexedDB anhand der KundenNr.
 *
 * @param {number} kundenNr - Die KundenNr des gewünschten Kunden
 * @returns {Promise<Object|null>} - Kundendatensatz oder null, wenn nicht gefunden
 */
export async function loadKundeFromIndexedDB(kundenNr) {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['kunden'], 'readonly');
        const store = transaction.objectStore('kunden');
        const request = store.get(kundenNr);

        request.onsuccess = () => {
            resolve(request.result);
        };
        request.onerror = (event) => {
            console.error('Fehler beim Laden des Kunden aus IndexedDB:', event.target.error);
            reject(event.target.error);
        };
    });
}

/**
 * Lädt alle Kunden aus der IndexedDB.
 *
 * @returns {Promise<Array>} - Array aller Kundendatensätze in der IndexedDB
 */
export async function loadKundenFromIndexedDB() {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['kunden'], 'readonly');
        const store = transaction.objectStore('kunden');
        const request = store.getAll();

        request.onsuccess = () => {
            resolve(request.result);
        };
        request.onerror = (event) => {
            console.error('Fehler beim Abrufen der Kunden aus IndexedDB:', event.target.error);
            reject(event.target.error);
        };
    });
}

export async function deleteKundeFromIndexedDB(kundenNr) {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['kunden'], 'readwrite');
        const store = transaction.objectStore('kunden');
        const request = store.delete(kundenNr);

        request.onsuccess = () => resolve();
        request.onerror = (event) => {
            console.error('Fehler beim Löschen des Kunden aus IndexedDB:', event.target.error);
            reject(event.target.error);
        };
    });
}
