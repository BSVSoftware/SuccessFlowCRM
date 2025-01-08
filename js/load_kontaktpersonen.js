import { API_URL,APP_RQ } from './app.js';

export async function loadKontaktpersonen() {
    try {
        const sid = localStorage.getItem('SID');
        const response = await fetch(`${API_URL}${APP_RQ}&ARGUMENTS=-Agetkontaktpersonen`, {
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
        const kontaktpersonenData = await response.json();
        const db = await openIndexedDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['kontaktpersonen'], 'readwrite');
            const store = transaction.objectStore('kontaktpersonen');

            kontaktpersonenData.forEach(entry => {
                Object.keys(entry).forEach(key => {
                    if (entry[key] === null) {
                        entry[key] = '';
                    }
                });
                const request = store.put(entry);

                request.onerror = (event) => {
                    console.error('Error storing kontaktpersonen data:', event.target.error);
                    showErrorModal('Error storing kontaktpersonen data: ' + event.target.error.message);
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
    } catch (error) {
        console.error('Error loading kontaktpersonen data:', error);
        showErrorModal('Error loading kontaktpersonen data: ' + error.message);
    }
}

function openIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('SuccessFlowCRM', 2);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('kontaktpersonen')) {
                const store = db.createObjectStore('kontaktpersonen', { keyPath: 'PersonNr' });
                store.createIndex('KundenNr', 'KundenNr', { unique: false });
            }
        };
        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => {
            console.error('Error opening indexedDB:', event.target.error);
            showErrorModal('Error opening indexedDB: ' + event.target.error.message);
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
    closeButton.textContent = 'Close';
    closeButton.addEventListener('click', () => {
        modal.remove();
    });

    modal.appendChild(messageElement);
    modal.appendChild(closeButton);
    document.body.appendChild(modal);
}
