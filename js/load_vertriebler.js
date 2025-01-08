import { API_URL,APP_RQ } from './app.js';
import { openIndexedDB } from './indexedDB.js';

export async function loadVertriebler() {
    try {
        const sid = localStorage.getItem('SID');
        const response = await fetch(`${API_URL}${APP_RQ}&ARGUMENTS=-Agetvertriebler`, {
            headers: {
                'Content-Type': 'application/json',
                'SID': sid
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                handleUnauthorized();
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const vertrieblerData = await response.json();
        const db = await openIndexedDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['vertriebler'], 'readwrite');
            const store = transaction.objectStore('vertriebler');

            vertrieblerData.forEach(entry => {
                // Bereinigen der Daten
                if (!entry.MitarbNr) {
                    console.warn('Eintrag ohne MitarbeiterNr übersprungen:', entry);
                    return; // Überspringen fehlerhafter Einträge
                }

                // Nullwerte durch leere Strings ersetzen
                Object.keys(entry).forEach(key => {
                    if (entry[key] === null) {
                        entry[key] = '';
                    }
                });

                // Speichern in IndexedDB
                const request = store.put({
                    MitarbeiterNr: entry.MitarbNr,
                    Kuerzel: entry.Kuerzel,
                    Name: entry.Name,
                    EMail: entry.EMail,
                    Benutzer: entry.Benutzer,
                    aktuell: entry.aktuell,
                    Warteraum: entry.Warteraum
                });

                request.onerror = (event) => {
                    console.error('Fehler beim Speichern der Vertriebler-Daten:', event.target.error);
                    reject(event.target.error);
                };
            });

            transaction.oncomplete = () => resolve();
            transaction.onerror = (event) => {
                console.error('Transaktionsfehler:', event.target.error);
                reject(event.target.error);
            };
        });
    } catch (error) {
        console.error('Fehler beim Laden der Vertriebler-Daten:', error);
        showErrorModal('Fehler beim Laden der Vertriebler-Daten: ' + error.message);
    }
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
