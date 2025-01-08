// fetch_kontaktpersonen.js

import { API_URL, APP_RQ } from './app.js';

/**
 * Lädt Kontaktpersonen für eine bestimmte KundenNr:
 *  1) Ruft die REST-API auf und versucht, neue Datensätze zu holen.
 *  2) Speichert nur gültige Datensätze (mit PersonNr) in IndexedDB.
 *  3) Liest per store.getAll() alle Kontaktpersonen aus der IDB
 *     und filtert optional nach dieser KundenNr.
 * Gibt schließlich das gefilterte Array zurück.
 */
export async function fetchKontaktpersonenData(kundenNr) {
    try {
        // KundenNr prüfen
        if (!kundenNr) {
            console.warn('Keine KundenNr übergeben – gebe leeres Array zurück.');
            return [];
        }
        // sicherstellen, dass es eine Zahl ist:
        const kundenNrNum = Number(kundenNr);

        const sid = localStorage.getItem('SID');
        // 1) REST-Aufruf
        const response = await fetch(`${API_URL}${APP_RQ}&ARGUMENTS=-Agetkontaktpersonen`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'SID': sid
            },
            // Je nach Backend-Schema: Array oder einzelnes Objekt
            body: JSON.stringify([
                { KundenNr: kundenNrNum }
            ])
        });

        if (!response.ok) {
            if (response.status === 401) {
                handleUnauthorized();
                return [];
            }
            throw new Error(`Fehler beim Abrufen der Kontaktpersonen: ${response.status} ${response.statusText}`);
        }

        const kontaktpersonenAusRest = await response.json();
        console.log("Erhaltene Kontaktpersonen vom REST:", kontaktpersonenAusRest);

        // 2) Nur gültige Einträge in IDB speichern
        const db = await openIndexedDB();
        if (Array.isArray(kontaktpersonenAusRest) && kontaktpersonenAusRest.length > 0) {
            await storeKontaktpersonenInIndexedDB(db, kontaktpersonenAusRest);
        } else {
            console.warn("Leere oder keine Kontaktpersonen vom REST – nichts zu speichern.");
        }

        // 3) Alle Kontaktpersonen aus IDB lesen (getAll) und nach KundenNr filtern
        const alleKontaktpersonen = await loadKontaktpersonenFromIndexedDB(db, kundenNrNum);

        return alleKontaktpersonen;
    } catch (error) {
        console.error('Fehler beim Abrufen der Kontaktpersonen:', error);
        showErrorModal('Fehler beim Abrufen der Kontaktpersonen: ' + error.message);
        return [];
    }
}

/**
 * Öffnet unsere "SuccessFlowCRM"-IndexedDB, legt bei Bedarf 'kontaktpersonen' an.
 */
async function openIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('SuccessFlowCRM', 5);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('kontaktpersonen')) {
                const store = db.createObjectStore('kontaktpersonen', { keyPath: 'PersonNr' });
                store.createIndex('KundenNr', 'KundenNr', { unique: false });
            }
        };

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };
        request.onerror = (event) => {
            console.error('Error opening indexedDB:', event.target.error);
            showErrorModal('Error opening indexedDB: ' + event.target.error.message);
            reject(event.target.error);
        };
    });
}

/**
 * Speichert nur Kontaktpersonen mit vorhandener PersonNr in den Store 'kontaktpersonen'.
 * Verhindert Key-Path-Fehler durch Null-Werte: wandelt null in ''.
 */
function storeKontaktpersonenInIndexedDB(db, kontaktpersonenData) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['kontaktpersonen'], 'readwrite');
        const store = transaction.objectStore('kontaktpersonen');

        kontaktpersonenData.forEach(entry => {
            if (entry.PersonNr == null) {
                console.warn('Überspringe Kontaktperson ohne PersonNr:', entry);
                return;
            }
            // Null-Felder in leere Strings umwandeln
            Object.keys(entry).forEach(key => {
                if (entry[key] == null) {
                    entry[key] = '';
                }
            });

            const putReq = store.put(entry);
            putReq.onerror = (event) => {
                console.error('Fehler beim Speichern einer Kontaktperson:', event.target.error);
                showErrorModal('Fehler beim Speichern einer Kontaktperson: ' + event.target.error.message);
                reject(event.target.error);
            };
        });

        transaction.oncomplete = () => resolve();
        transaction.onerror = (event) => {
            console.error('Transaction error:', event.target.error);
            showErrorModal('Transaction error: ' + event.target.error.message);
            reject(event.target.error);
        };
    });
}

/**
 * Liest alle Kontaktpersonen aus IDB (getAll) und filtert optional nach KundenNr.
 */
function loadKontaktpersonenFromIndexedDB(db, kundenNrNum) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['kontaktpersonen'], 'readonly');
        const store = transaction.objectStore('kontaktpersonen');
        const getAllReq = store.getAll();

        getAllReq.onsuccess = () => {
            const allData = getAllReq.result || [];
            // Nach KundenNr filtern
            const filtered = allData.filter(kp => kp.KundenNr === kundenNrNum);
            resolve(filtered);
        };
        getAllReq.onerror = (event) => {
            console.error('Fehler beim Lesen der Kontaktpersonen aus IDB:', event.target.error);
            reject(event.target.error);
        };
    });
}

function handleUnauthorized() {
    alert('Ihre Sitzung ist abgelaufen. Bitte loggen Sie sich erneut ein.');
    window.location.href = '../html/login.html';
}

function showErrorModal(message) {
    const existingModal = document.getElementById('error-modal');
    if (existingModal) {
        existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'error-modal';
    modal.style.position = 'fixed';
    modal.style.top = '50%';
    modal.style.left = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.padding = '20px';
    modal.style.backgroundColor = 'white';
    modal.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.1)';
    modal.style.zIndex = '1000';

    const messageElement = document.createElement('p');
    messageElement.textContent = message;

    const closeButton = document.createElement('button');
    closeButton.textContent = 'Schließen';
    closeButton.addEventListener('click', () => {
        modal.remove();
    });

    modal.appendChild(messageElement);
    modal.appendChild(closeButton);
    document.body.appendChild(modal);
}
