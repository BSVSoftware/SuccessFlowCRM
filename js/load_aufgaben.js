import { API_URL } from './app.js';
import { openIndexedDB } from './indexedDB.js';

export async function loadAufgaben() {
    try {
        const sid = localStorage.getItem('SID');
        const response = await fetch(`${API_URL}saRequester&ARGUMENTS=-Agetaufgaben`, {
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
        const aufgabenData = await response.json();
        const db = await openIndexedDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['aufgaben'], 'readwrite');
            const store = transaction.objectStore('aufgaben');

            aufgabenData.forEach(entry => {
                Object.keys(entry).forEach(key => {
                    if (entry[key] === null) {
                        entry[key] = '';
                    }
                });
                const request = store.put({
                    TicketNr: entry.TicketNr,
                    Stichwort: entry.Stichwort,
                    Kunde: entry.Kunde,
                    Warteraum: entry.Warteraum,
                    WarteraumNr: entry.WarteraumNr,
                    aktDatum: entry.aktDatum,
                    aktZeit: entry.aktZeit,
                    Prioritaet: entry.Prioritaet,
                    RestzeitMinuten: entry.RestzeitMinuten,
                    Fehlermeldung: entry.Fehlermeldung,
                    Behebung: entry.Behebung,
                    KundenNr: entry.KundenNr,
                    IDNR: entry.IDNR,
                    SNR: entry.SNR,
                    Vertragsart: entry.Vertragsart,
                    Vertragsbereich: entry.Vertragsbereich,
                    Vertragsnummer: entry.Vertragsnummer,
                    Restkontingent: entry.Restkontingent,
                    Ansprechpartner: entry.Ansprechpartner,
                    Telefon: entry.Telefon,
                    EMail: entry.EMail,
                    extTicketNr: entry.extTicketNr,
                    FahrtpauschaleNr: entry.FahrtpauschaleNr,
                    Modell: entry.Modell,
                    letzteAktionam: entry.letzteAktionam,
                    aktuellerStatus: entry.aktuellerStatus,
                    aktuelleAktion: entry.aktuelleAktion
                });

                request.onerror = (event) => {
                    console.error('Error storing aufgaben data:', event.target.error);
                    showErrorModal('Error storing aufgaben data: ' + event.target.error.message);
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
        console.error('Error loading aufgaben data:', error);
        showErrorModal('Error loading aufgaben data: ' + error.message);
    }
}

function handleUnauthorized() {
    alert('Ihre Sitzung ist abgelaufen. Bitte loggen Sie sich erneut ein.');
    window.location.href = '/CRM/html/login.html';
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
