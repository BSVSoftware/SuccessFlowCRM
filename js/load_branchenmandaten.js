import { API_URL,APP_RQ } from './app.js';
import { openIndexedDB } from './indexedDB.js';

export async function loadBranchenMandanten() {
    try {
        const sid = localStorage.getItem('SID');
        const db = await openIndexedDB();

        // Mandanten laden und speichern
        await loadMandanten(db, sid);

        // Branchen laden und speichern
        await loadBranchen(db, sid);

    } catch (error) {
        console.error('Error loading Mandanten and Branchen data:', error);
        showErrorModal('Error loading Mandanten and Branchen data: ' + error.message);
    }
}

async function loadMandanten(db, sid) {
    try {
        const response = await fetch(`${API_URL}${APP_RQ}&ARGUMENTS=-Agetmandanten`, {
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

        const mandantenDataString = await response.text();
        const mandantenData = JSON.parse(mandantenDataString);

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['mandanten'], 'readwrite');
            const store = transaction.objectStore('mandanten');

            mandantenData.forEach(entry => {
                const mandantenNr = parseInt(entry.MandantenNr, 10); // Ensure MandantenNr is numeric
                if (!isNaN(mandantenNr)) {
                    const request = store.put({
                        MandantenNr: mandantenNr,
                        Beschreibung: entry.Mandant || ''
                    });

                    request.onerror = (event) => {
                        console.error('Error storing mandanten data:', event.target.error);
                        showErrorModal('Error storing mandanten data: ' + event.target.error.message);
                        reject(event.target.error);
                    };
                }
            });

            transaction.oncomplete = () => resolve();
            transaction.onerror = (event) => {
                console.error('Transaction error:', event.target.error);
                showErrorModal('Transaction error: ' + event.target.error.message);
                reject(event.target.error);
            };
        });

    } catch (error) {
        console.error('Error loading mandanten data:', error);
        showErrorModal('Error loading mandanten data: ' + error.message);
    }
}

async function loadBranchen(db, sid) {
    try {
        const response = await fetch(`${API_URL}${APP_RQ}&ARGUMENTS=-Agetbranchen`, {
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

        const branchenDataString = await response.text();
        const branchenData = JSON.parse(branchenDataString);

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['branchen'], 'readwrite');
            const store = transaction.objectStore('branchen');

            branchenData.forEach(entry => {
                if (entry.BranchenCode && typeof entry.BranchenCode === 'string') {
                    const request = store.put({
                        BranchenCode: entry.BranchenCode,
                        Beschreibung: entry.Branche || ''
                    });

                    request.onerror = (event) => {
                        console.error('Error storing branchen data:', event.target.error);
                        showErrorModal('Error storing branchen data: ' + event.target.error.message);
                        reject(event.target.error);
                    };
                }
            });

            transaction.oncomplete = () => resolve();
            transaction.onerror = (event) => {
                console.error('Transaction error:', event.target.error);
                showErrorModal('Transaction error: ' + event.target.error.message);
                reject(event.target.error);
            };
        });

    } catch (error) {
        console.error('Error loading branchen data:', error);
        showErrorModal('Error loading branchen data: ' + error.message);
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
