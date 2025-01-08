import { API_URL,APP_RQ } from './app.js';

export async function saveInteressent(interessentData) {
    try {
        const sid = localStorage.getItem('SID');

        // Konvertiere Mandant und Vertriebler in numerische Werte, falls nötig
        if (interessentData.mandant) {
            interessentData.mandant = parseInt(interessentData.mandant, 10);
        }
        if (interessentData.vertriebler) {
            interessentData.vertriebler = parseInt(interessentData.vertriebler, 10);
        }

        const response = await fetch(`${API_URL}${APP_RQ}&ARGUMENTS=-Acreatelead`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'SID': sid
            },
            body: JSON.stringify(interessentData)
        });

        if (!response.ok) {
            if (response.status === 401) {
                handleUnauthorized();
                return;
            }
            throw new Error(`Fehler beim Speichern des Interessenten: ${response.status}`);
        }

        const result = await response.json();
        const interessentenNr = result[0]?.interessentenNr;  // Extrahiert interessentenNr aus dem ersten Element des Arrays
        if (interessentenNr) {
            alert(`Interessent erfolgreich erstellt! Interessentennummer: ${interessentenNr}`);
            return interessentenNr;
        } else {
            throw new Error('Interessentennummer konnte nicht aus der Antwort extrahiert werden.');
        }

    } catch (error) {
        console.error('Fehler beim Speichern des Interessenten:', error);
        showErrorModal('Fehler beim Speichern des Interessenten: ' + error.message);
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
