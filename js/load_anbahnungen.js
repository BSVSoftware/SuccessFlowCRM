import { API_URL,APP_RQ } from './app.js';
import { openIndexedDB } from './indexedDB.js';

export async function loadAnbahnungen(anbahnungNr = null) {
    try {
        const sid = localStorage.getItem('SID');

        // API-Endpunkt und Body vorbereiten
        const url = `${API_URL}${APP_RQ}&ARGUMENTS=-Agetanbahnung`;
        const options = {
            method: anbahnungNr ? 'POST' : 'GET',
            headers: {
                'Content-Type': 'application/json',
                'SID': sid,
            },
            body: anbahnungNr ? JSON.stringify({ AnbahnungNr: anbahnungNr }) : null,
        };

        // REST-API-Aufruf
        const response = await fetch(url, options);

        if (!response.ok) {
            if (response.status === 401) {
                handleUnauthorized();
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const anbahnungenData = await response.json();
        const db = await openIndexedDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['anbahnungen'], 'readwrite');
            const store = transaction.objectStore('anbahnungen');

            anbahnungenData.forEach(entry => {
                // Leere Werte ersetzen und AnbahnungNr sicherstellen
                Object.keys(entry).forEach(key => {
                    if (entry[key] === null) {
                        entry[key] = '';
                    }
                });

                if (!entry.AnbahnungNr) {
                    return; // Überspringen
                }

                entry.AnbahnungNr = Number(entry.AnbahnungNr); // AnbahnungNr numerisch sicherstellen

                const request = store.put(entry);

                request.onerror = (event) => {
                    console.error('Error storing anbahnungen data:', event.target.error);
                    showErrorModal('Error storing anbahnungen data: ' + event.target.error.message);
                    reject(event.target.error);
                };
            });

            transaction.oncomplete = () => {
                console.log('Anbahnungen erfolgreich gespeichert.');
                resolve();
            };

            transaction.onerror = (event) => {
                console.error('Transaction error:', event.target.error);
                showErrorModal('Transaction error: ' + event.target.error.message);
                reject(event.target.error);
            };
        });
    } catch (error) {
        console.error('Error loading anbahnungen data:', error);
        showErrorModal('Error loading anbahnungen data: ' + error.message);
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
