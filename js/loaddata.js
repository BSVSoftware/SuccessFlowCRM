const API_URL = "https://otc.bsv.net/api/mgwebrequester.dll?appname=flowrequester&prgname=";
const APP_ID = "sfm";

async function loadData() {
    const SID = localStorage.getItem('SID');
    const UID = localStorage.getItem('UID');
    if (!SID || !UID) {
        throw new Error('No company selected or session expired. Please log in again.');
    }

    await getVertriebler(UID, SID);
}

async function getVertriebler(UID, SID) {
    const url = `${API_URL}${APP_RQ}&ARGUMENTS=-Agetvertriebler`;
    const response = await fetch(url, {
        method: 'GET',
        headers: new Headers({
            'UID': UID,
            'SID': SID,
            'APPID': APP_ID,
            'Content-Type': 'application/json'
        })
    });

    if (!response.ok) {
        throw new Error('Failed to fetch vertriebler data');
    }

    let data;
    try {
        data = await response.json();
    } catch (error) {
        throw new Error('Invalid JSON content');
    }

    if (!Array.isArray(data) || data.length === 0 || !data[0].MitarbNr) {
        throw new Error('Invalid JSON content');
    }

    await clearVertrieblerStore(); // Clear existing data before adding new data
    await storeVertrieblerInIndexedDB(data);
}

async function clearVertrieblerStore() {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('vertriebler', 'readwrite');
        transaction.oncomplete = () => resolve();
        transaction.onerror = (event) => reject(event.target.error);

        const store = transaction.objectStore('vertriebler');
        const clearRequest = store.clear();
        clearRequest.onsuccess = () => console.log('Cleared vertriebler object store');
        clearRequest.onerror = (event) => console.error('Failed to clear vertriebler object store', event.target.error);
    });
}

async function storeVertrieblerInIndexedDB(vertriebler) {
    const db = await openIndexedDB();
    const transaction = db.transaction('vertriebler', 'readwrite');
    const store = transaction.objectStore('vertriebler');

    vertriebler.forEach(person => {
        const request = store.add(person);
        request.onsuccess = () => {
            console.log(`Vertriebler ${person.MitarbNr} added successfully`);
        };
        request.onerror = () => {
            console.error(`Error adding vertriebler ${person.MitarbNr}: ${request.error}`);
        };
    });

    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve('All vertriebler stored successfully');
        transaction.onerror = () => reject('Transaction failed');
    });
}

function openIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('SuccessFlowCRM', 2);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('vertriebler')) {
                db.createObjectStore('vertriebler', { keyPath: 'MitarbNr' });
            }
        };
        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.error);
    });
}
