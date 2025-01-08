import { loadAnbahnungen } from './load_anbahnungen.js';
import { loadAufgaben } from './load_aufgaben.js';
import { loadAktionen } from './load_aktionen.js';
import { openIndexedDB } from './indexedDB.js';

export async function refreshData() {
    const db = await openIndexedDB();

    await clearObjectStores(db, ['anbahnungen', 'aufgaben', 'aktionen']);

    try {
        showLoadingSpinner();
        await loadAnbahnungen();
        await loadAufgaben();
        await loadAktionen();
        hideLoadingSpinner();
        alert('Daten wurden erfolgreich aktualisiert.');
    } catch (error) {
        console.error('Error loading data:', error);
        hideLoadingSpinner();
        showErrorModal('Error loading data: ' + error.message);
    }
}

async function clearObjectStores(db, storeNames) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeNames, 'readwrite');
        transaction.oncomplete = () => resolve();
        transaction.onerror = (event) => reject(event.target.error);

        storeNames.forEach(storeName => {
            const store = transaction.objectStore(storeName);
            const clearRequest = store.clear();
            clearRequest.onsuccess = () => console.log(`Cleared ${storeName} object store`);
            clearRequest.onerror = (event) => console.error(`Failed to clear ${storeName} object store`, event.target.error);
        });
    });
}

function showLoadingSpinner() {
    $("#loading-spinner").show();
    $("#loading-spinner").kendoLoader({
        themeColor: "primary",
        size: "large"
    });
}

function hideLoadingSpinner() {
    const spinner = $("#loading-spinner").data("kendoLoader");
    if (spinner) {
        spinner.hide();
    }
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
