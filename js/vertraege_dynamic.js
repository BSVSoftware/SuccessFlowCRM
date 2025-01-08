import { API_URL,APP_RQ } from './app.js';

document.addEventListener('DOMContentLoaded', () => {
    const vertragNrInput = document.getElementById('vertragNr');
    const kundenNrInput = document.getElementById('kundenNr');
    const searchButton = document.getElementById('search-button');

    // Event-Listener für das Home-Icon hinzufügen, um zur menue.html zurückzukehren
    document.getElementById('home-icon').addEventListener('click', function() {
        window.location.href = '../html/menue.html';  // Zurück zur Menue-Seite
    });

    // Suche bei Enter-Taste oder Klick auf das Such-Symbol
    vertragNrInput.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            searchContracts();
        }
    });

    kundenNrInput.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            searchContracts();
        }
    });

    searchButton.addEventListener('click', function() {
        searchContracts();
    });

    async function searchContracts() {
        const vertragNr = vertragNrInput.value.trim();
        let kundenNr = kundenNrInput.value.trim();

        // Prüfen, ob KundenNr numerisch ist
        if (kundenNr && !/^\d+$/.test(kundenNr)) {
            showErrorModal('Die KundenNr muss eine numerische Zahl sein.');
            return;
        }

        // KundenNr in eine Zahl umwandeln, wenn sie eingegeben wurde
        if (kundenNr) {
            kundenNr = parseInt(kundenNr, 10);
        }

        if (!vertragNr && !kundenNr) {
            showErrorModal('Bitte geben Sie entweder eine VertragNr oder eine KundenNr ein.');
            return;
        }

        let requestBody = {};
        if (vertragNr) {
            requestBody.VertragNr = vertragNr;
        }
        if (kundenNr) {
            requestBody.KundenNr = kundenNr;  // KundenNr als Zahl übergeben
        }

        try {
            const sid = localStorage.getItem('SID');  // Hole die SID

            const response = await fetch(`${API_URL}${APP_RQ}&ARGUMENTS=-Agetvertraege`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'SID': sid  // Session ID im Header
                },
                body: JSON.stringify(requestBody)  // Body als JSON
            });

            if (response.status === 401) {
                handleUnauthorized();  // Session abgelaufen
                return;
            }

            if (!response.ok) throw new Error('Failed to fetch contracts');

            const vertraegeData = await response.json();  // JSON-Daten empfangen
            renderVertraegeGrid(vertraegeData.Vertraege);  // An Kendo Grid binden
        } catch (error) {
            console.error('Error fetching contracts:', error);
            showErrorModal('Error fetching contracts: ' + error.message);
        }
    }

    // Hauptgrid für Verträge und Detail-Grid für Vertragspositionen
    function renderVertraegeGrid(vertraege) {
        $("#grid").kendoGrid({
            dataSource: {
                data: vertraege,
                pageSize: 20,
                schema: {
                    model: {
                        fields: {
                            Vertragsnummer: { type: "string" },
                            Rechnungsempfaenger: { type: "number" },
                            Vertragstyp: { type: "string" },
                            Vertragsstatus: { type: "string" },
                            Vertragsbeginn: { type: "date" },
                            Vertragsende: { type: "date" },
                            Pauschale: { type: "number" },
                            Laufzeit: { type: "number" }
                        }
                    }
                }
            },
            height: calculateGridHeight(),
            scrollable: true,
            pageable: true,
            detailTemplate: kendo.template("<div class='contract-details'></div>"),
            detailInit: function(e) {
                $("<div/>").appendTo(e.detailCell).kendoGrid({
                    dataSource: {
                        data: e.data.Positionen,  // Vertragspositionen des jeweiligen Vertrags
                        schema: {
                            model: {
                                fields: {
                                    Identnummer: { type: "number" },
                                    Vertragsbeginn: { type: "date" },
                                    Vertragsende: { type: "date" },
                                    Laufzeit: { type: "number" },
                                    Pauschale: { type: "number" },
                                    ModellNummer: { type: "number" },
                                    ModellBezeichnung: { type: "string" },
                                    Serien_Nr: { type: "string" },
                                    InstallDatum: { type: "date" },
                                    Standort: { type: "string" },
                                    Ansprechpartner: { type: "string" }
                                }
                            }
                        }
                    },
                    scrollable: true,
                    pageable: true,
                    columns: [
                        { field: "Identnummer", title: "Identnummer", width: "100px" },
                        { field: "ModellNummer", title: "Modell Nr", width: "100px" },
                        { field: "ModellBezeichnung", title: "Modell Bezeichnung", width: "150px" },
                        { field: "Serien_Nr", title: "Serien-Nr", width: "100px" },
                        { field: "Vertragsbeginn", title: "Vertragsbeginn", width: "150px", format: "{0:dd.MM.yyyy}" },
                        { field: "Vertragsende", title: "Vertragsende", width: "150px", format: "{0:dd.MM.yyyy}" },
                        { field: "Laufzeit", title: "Laufzeit", width: "100px" },
                        { field: "Pauschale", title: "Pauschale", width: "100px", format: "{0:c}" },
                        { field: "InstallDatum", title: "Installationsdatum", width: "150px", format: "{0:dd.MM.yyyy}" },
                        { field: "Standort", title: "Standort", width: "150px" },
                        { field: "Ansprechpartner", title: "Ansprechpartner", width: "150px" }
                    ]
                });
            },
            columns: [
                { field: "Vertragsnummer", title: "Vertrags Nr", width: "150px" },
                { field: "Rechnungsempfaenger", title: "Rechnungsempfänger", width: "150px" },
                { field: "Vertragstyp", title: "Vertrags Typ", width: "150px" },
                { field: "Vertragsstatus", title: "Status", width: "100px" },
                { field: "Vertragsbeginn", title: "Vertragsbeginn", width: "150px", format: "{0:dd.MM.yyyy}" },
                { field: "Vertragsende", title: "Vertragsende", width: "150px", format: "{0:dd.MM.yyyy}" },
                { field: "Laufzeit", title: "Laufzeit", width: "100px" },
                { field: "Pauschale", title: "Pauschale", width: "100px", format: "{0:c}" }
            ]
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
});
/**
 * Höhe für das Grid dynamisch berechnen
 */
function calculateGridHeight() {
    const windowHeight = $(window).height();
    const headerHeight = $('#header').outerHeight(true);
    const searchContainerHeight = $('.search-container').outerHeight(true);
    return windowHeight - headerHeight - searchContainerHeight - 30;
}
