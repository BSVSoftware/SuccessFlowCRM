import { API_URL,APP_RQ } from './app.js';

document.addEventListener('DOMContentLoaded', () => {
    kendo.culture("de-DE");

    const urlParams = new URLSearchParams(window.location.search);
    const rechnungNr = urlParams.get('RechnungNr');
    const bruttoBetrag = urlParams.get('BruttoBetrag');

    document.getElementById('RechnungsNr').value = rechnungNr;
    document.getElementById('BruttoBetrag').value = bruttoBetrag;

    document.getElementById('back-icon').addEventListener('click', () => {
        window.history.back();
    });

    document.getElementById('save-button').addEventListener('click', async () => {
        const sid = localStorage.getItem('SID');
        const zahlbetrag = parseFloat(document.getElementById('BruttoBetrag').value) * 100;  // Multiplying by 100 to avoid decimal issues
        const data = {
            RechnungsNr: parseInt(document.getElementById('RechnungsNr').value, 10),
            Zahlbetrag: zahlbetrag,
            Infotext: document.getElementById('Infotext').value
        };

        try {
            const response = await fetch(`${API_URL}${APP_RQ}&ARGUMENTS=-Acreatezahlung`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'SID': sid
                },
                body: JSON.stringify(data)
            });

            if (response.status === 401) {
                alert('Keine Berechtigung!');
                return;
            }

            const responseData = await response.json();

            if (responseData[0] && responseData[0].Status === 'OK') {
                // Set the updated data in localStorage to trigger refresh in the parent page
                localStorage.setItem('updateRechnungNr', data.RechnungsNr);
                localStorage.setItem('updateZahlbetrag', zahlbetrag / 100);

                // Go back to the previous page
                window.history.back();
            } else {
                alert('Fehler beim Speichern der Zahlung: ' + (responseData[0] ? responseData[0].Status : 'Unbekannter Fehler'));
            }
        } catch (error) {
            alert('Fehler beim Speichern der Zahlung!');
            console.error('Error:', error);
        }
    });
});
