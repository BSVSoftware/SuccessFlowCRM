import { API_URL,APP_RQ } from './app.js';  // API URL importieren

document.addEventListener('DOMContentLoaded', () => {
    const ticketNrInput = document.getElementById('ticketNr');
    const technikerNrInput = document.getElementById('technikerNr');
    const auftragsNrInput = document.getElementById('auftragsNr');
    const statusInput = document.getElementById('status');
    const kundenNrInput = document.getElementById('kundenNr');
    const datumInput = document.getElementById('datum');
    const searchButton = document.getElementById('search-button');

    // Suche bei Klick auf das Such-Symbol
    searchButton.addEventListener('click', searchTickets);

    // Suche bei Enter-Taste in den Eingabefeldern
    document.querySelectorAll('.search-input input').forEach(input => {
        input.addEventListener('keydown', function(event) {
            if (event.key === 'Enter') {
                searchTickets();
            }
        });
    });

    // Funktion für die API-Abfrage
    async function searchTickets() {
        let ticketNr = ticketNrInput.value.trim();
        let technikerNr = technikerNrInput.value.trim();
        let auftragsNr = auftragsNrInput.value.trim();
        const status = statusInput.value.trim();
        let kundennr = kundenNrInput.value.trim();
        const datum = datumInput.value.trim();

        // Numerische Felder in Nummern umwandeln, falls vorhanden
        if (ticketNr) ticketNr = parseInt(ticketNr, 10);  // TicketNr in Zahl umwandeln
        if (technikerNr) technikerNr = parseInt(technikerNr, 10);  // TechnikerNr in Zahl umwandeln
        if (auftragsNr) auftragsNr = parseInt(auftragsNr, 10);  // AuftragsNr in Zahl umwandeln
        if (kundennr) kundennr = parseInt(kundennr, 10);  // KundenNr in Zahl umwandeln

        // Anfrage-Body erstellen
        let requestBody = {};
        if (ticketNr) {
            requestBody.auftragsnr = ticketNr;  // Nur TicketNr senden, wenn vorhanden
        } else {
            // Wenn keine TicketNr, dann die anderen Parameter senden
            if (technikerNr) requestBody.technikernr = technikerNr;
            if (auftragsNr) requestBody.auftragsnr = auftragsNr;
            if (status) requestBody.status = status;
            if (kundennr) requestBody.kundennr = kundennr;
            if (datum) requestBody.datum = datum;
        }

        // Tickets von der API laden
        try {
            const sid = localStorage.getItem('SID');  // SID aus dem localStorage holen

            const response = await fetch(`${API_URL}${APP_RQ}&ARGUMENTS=-Agettickets4`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'SID': sid
                },
                body: JSON.stringify(requestBody)  // Sende den Body als JSON
            });

            if (!response.ok) throw new Error('Fehler beim Abrufen der Tickets');

            const ticketsData = await response.json();  // Tickets als JSON empfangen
            renderTicketsGrid(ticketsData);  // Tickets im Grid anzeigen
        } catch (error) {
            console.error('Fehler beim Laden der Tickets:', error);
        }
    }

    // Funktion zur Anzeige der Tickets im Kendo Grid
    function renderTicketsGrid(ticketsData) {
        $("#grid").kendoGrid({
            dataSource: {
                data: ticketsData,
                pageSize: 20,
                schema: {
                    model: {
                        fields: {
                            TicketNr: { type: "number" },
                            Stichwort: { type: "string" },
                            Kunde: { type: "string" },
                            aktDatum: { type: "string" },  // Datum bleibt String
                            aktZeit: { type: "string" },  // Zeit bleibt String
                            Modell: { type: "string" },
                            Fehlermeldung: { type: "string" },
                            Behebung: { type: "string" },
                            KundenNr: { type: "number" },
                            IDNR: { type: "string" },
                            SNR: { type: "string" },
                            Vertragsart: { type: "string" },
                            Vertragsbereich: { type: "string" },
                            Vertragsnummer: { type: "string" },
                            Ansprechpartner: { type: "string" },
                            Telefon: { type: "string" },
                            EMail: { type: "string" }
                        }
                    }
                }
            },
            height: 550,
            pageable: {
                refresh: true,
                pageSizes: [10, 20, 50, 100],
                buttonCount: 5,
            },
            sortable: true,
            filterable: true,
            columns: [
                { field: "TicketNr", title: "Ticket Nr", width: "80px" },
                { field: "Stichwort", title: "Stichwort", width: "150px" },
                { field: "Kunde", title: "Kunde", width: "120px" },
                { field: "aktDatum", title: "Datum", width: "100px" },
                { field: "aktZeit", title: "Zeit", width: "70px" },
                { field: "Modell", title: "Modell", width: "150px" },
                { field: "Fehlermeldung", title: "Fehlermeldung", width: "300px" },
                { field: "Behebung", title: "Behebung", width: "300px" },
                { field: "KundenNr", title: "Kunden Nr", width: "100px" },
                { field: "Vertragsnummer", title: "Vertragsnummer", width: "150px" },
                { field: "Ansprechpartner", title: "Ansprechpartner", width: "150px" },
                { field: "Telefon", title: "Telefon", width: "120px" },
                { field: "EMail", title: "E-Mail", width: "150px" }
            ],
            noRecords: {
                template: "Keine Tickets gefunden"
            }
        });
    }

    // Zurück zum Menü bei Klick auf das Home-Icon
    document.getElementById('home-icon').addEventListener('click', function () {
        window.location.href = '../html/menue.html';
    });
});
