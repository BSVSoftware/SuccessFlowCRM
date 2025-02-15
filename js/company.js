import { loadVertriebler } from './load_vertriebler.js';
import { loadTelefonbuch } from './load_telefonbuch.js';
import { loadAnbahnungen } from './load_anbahnungen.js';
import { loadKunden } from './load_kunden.js';
import { loadAufgaben } from './load_aufgaben.js';
import { loadAktionen } from './load_aktionen.js';
import { openIndexedDB, initializeDatabase } from './indexedDB.js';

document.addEventListener('DOMContentLoaded', () => {
    const companies = JSON.parse(localStorage.getItem('companies'));
    if (companies) {
        displayCompanySelection(companies);
    } else {
        alert('No companies found. Please log in again.');
        window.location.href = '/CRM/html/login.html';
    }

    document.getElementById('home-icon').addEventListener('click', () => {
        window.location.href = '/CRM/html/login.html';
    });

    $('#fab-items').kendoFloatingActionButton({
        align: 'top start',
        icon: 'more-vertical',
        items: [{
            label: 'IndexedDB löschen',
            icon: 'trash',
            click: async function() {
                try {
                    await deleteDatabase('SuccessFlowCRM');
                    alert('IndexedDB erfolgreich gelöscht');
                } catch (error) {
                    console.error('Fehler beim Löschen der IndexedDB:', error);
                    alert('Fehler beim Löschen der IndexedDB: ' + error.message);
                }
            }
        }, {
            label: 'Zurück zum Login',
            icon: 'arrow-left',
            click: function() {
                window.location.href = '/CRM/html/login.html';
            }
        }]
    });
});

function displayCompanySelection(companies) {
    const companyList = document.getElementById('company-list');
    const loadingIndicator = document.getElementById('loading');
    const loadingStatus = document.getElementById('loading-status');

    companies.forEach(company => {
        const button = document.createElement('button');
        button.textContent = company.name;
        button.addEventListener('click', async () => {
            loadingIndicator.style.display = 'block';
            companyList.style.display = 'none';
            loadingStatus.textContent = 'Loading...';

            const selectedCompany = { ...company };
            let previousCompany;

            try {
                previousCompany = await getPreviousCompany();
            } catch (error) {
                console.error('Error getting previous company:', error);
            }

            localStorage.setItem('selectedCompany', JSON.stringify(selectedCompany));
            localStorage.setItem('SID', company.sid);
            localStorage.setItem('UID', company.id);

            try {
                let dataExists = false;

                try {
                    dataExists = await verifyObjectStores();
                } catch (error) {
                    console.error('Error verifying object stores:', error);
                }

                if (!dataExists || (previousCompany && previousCompany.id !== selectedCompany.id)) {
                    if (previousCompany && previousCompany.id !== selectedCompany.id) {
                        await clearObjectStores();
                    }
                    await initializeDatabase();
                    loadingStatus.textContent = 'Loading Vertriebler...';
                    await loadVertriebler();
                    loadingStatus.textContent = 'Loading Telefonbuch...';
                    await loadTelefonbuch();
                    loadingStatus.textContent = 'Loading Anbahnungen...';
                    await loadAnbahnungen();
                    loadingStatus.textContent = 'Loading Kunden...';
                    await loadKunden();
                    loadingStatus.textContent = 'Loading Aufgaben...';
                    await loadAufgaben();
                    loadingStatus.textContent = 'Loading Aktionen...';
                    await loadAktionen();
                    await setPreviousCompany(selectedCompany);
                }

                window.location.href = '/CRM/html/menue.html';
            } catch (error) {
                showErrorModal('Error loading data: ' + error.message);
                loadingIndicator.style.display = 'none';
                companyList.style.display = 'block';
            }
        });
        companyList.appendChild(button);
    });
}

async function verifyObjectStores() {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
        const expectedStores = ['vertriebler', 'telefonbuch', 'anbahnungen', 'kunden', 'aufgaben', 'aktionen'];
        const actualStores = Array.from(db.objectStoreNames);

        for (const store of expectedStores) {
            if (!actualStores.includes(store)) {
                return resolve(false);
            }
        }

        const transaction = db.transaction(expectedStores, 'readonly');
        transaction.oncomplete = () => resolve(true);
        transaction.onerror = (event) => reject(event.target.error);

        let validData = true;
        expectedStores.forEach(storeName => {
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            request.onsuccess = () => {
                if (!request.result || request.result.length === 0) {
                    validData = false;
                }
            };
            request.onerror = (event) => reject(event.target.error);
        });

        transaction.oncomplete = () => resolve(validData);
    });
}

async function getPreviousCompany() {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
        if (!db.objectStoreNames.contains('metadata')) {
            return reject(new Error("Object store 'metadata' not found"));
        }
        const transaction = db.transaction(['metadata'], 'readonly');
        const store = transaction.objectStore('metadata');
        const request = store.get('previousCompany');

        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

async function setPreviousCompany(company) {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['metadata'], 'readwrite');
        const store = transaction.objectStore('metadata');
        const request = store.put(company, 'previousCompany');

        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event.target.error);
    });
}

async function clearObjectStores() {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
        const objectStoreNames = Array.from(db.objectStoreNames);
        if (objectStoreNames.length === 0) {
            resolve();
            return;
        }

        const transaction = db.transaction(objectStoreNames, 'readwrite');
        transaction.oncomplete = () => resolve();
        transaction.onerror = (event) => reject(event.target.error);

        objectStoreNames.forEach(storeName => {
            const store = transaction.objectStore(storeName);
            const clearRequest = store.clear();
            clearRequest.onsuccess = () => console.log(`Cleared ${storeName} object store`);
            clearRequest.onerror = (event) => console.error(`Failed to clear ${storeName} object store`, event.target.error);
        });
    });
}

async function deleteDatabase(dbName) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase(dbName);
        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event.target.error);
        request.onblocked = () => {
            alert('Datenbank-Löschung blockiert. Bitte schließen Sie alle anderen Tabs oder Fenster, die die Datenbank verwenden.');
            reject(new Error('Datenbank-Löschung blockiert.'));
        };
    });
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
    closeButton.addEventListener('click', async () => {
        modal.remove();
        await clearIndexedDBAndRedirect();
    });

    modal.appendChild(messageElement);
    modal.appendChild(closeButton);
    document.body.appendChild(modal);
}
