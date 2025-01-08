import { API_URL,APP_RQ } from './app.js';

export async function saveAnbahnung(anbahnungData) {
    try {
        const sid = localStorage.getItem('SID');

        const response = await fetch(`${API_URL}${APP_RQ}&ARGUMENTS=-Acreateanbahnung`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'SID': sid
            },
            body: JSON.stringify(anbahnungData)
        });

        if (!response.ok) {
            if (response.status === 401) {
                handleUnauthorized();
                return;
            }
            throw new Error(`Fehler beim Speichern der Anbahnung: ${response.status}`);
        }

        const result = await response.json();
        let AnbahnungNr = result[0]?.AnbahnungNr; // Das Feld heißt jetzt "AnbahnungNr"

        // AnbahnungNr prüfen und "A" hinzufügen, falls nicht vorhanden
        if (AnbahnungNr && !AnbahnungNr.startsWith('A')) {
            AnbahnungNr = `A${AnbahnungNr}`;
        }

        if (AnbahnungNr) {
            alert(`Anbahnung erfolgreich erstellt! Anbahnungnummer: ${AnbahnungNr}`);
            return AnbahnungNr;
        } else {
            throw new Error('Anbahnungnummer konnte nicht aus der Antwort extrahiert werden.');
        }

    } catch (error) {
        console.error('Fehler beim Speichern der Anbahnung:', error);
        showErrorModal('Fehler beim Speichern der Anbahnung: ' + error.message);
        throw error;
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
