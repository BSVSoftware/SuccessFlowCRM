// anbahnungen.js
import { loadAnbahnungen } from './load_anbahnungen.js';
import { openIndexedDB } from './indexedDB.js';
import { fetchAndStoreKunden, loadKundeFromIndexedDB } from './fetch_kunden.js';

$(document).ready(function () {
    // Event-Handler für "Neue Anbahnung"-Symbol
    $("#new-anbahnung-icon").on("click", function (event) {
        event.preventDefault();
        window.location.href = "../html/neue_anbahnung.html";
    });

    // Event-Handler für den FAB (Neue Aufgabe)
    $("#fab").on("click", async function (event) {
        event.preventDefault();

        const grid = $("#grid").data("kendoGrid");
        const selectedRow = grid.select();

        if (selectedRow.length === 0) {
            alert("Bitte wählen Sie eine Anbahnung aus.");
            return;
        }

        const selectedItem = grid.dataItem(selectedRow);

        if (!selectedItem) {
            alert("Fehler beim Abrufen der Daten.");
            return;
        }

        // 1) Anbahnung Nr & KundenNr ins localStorage packen
        localStorage.setItem("currentAnbahnungNr", selectedItem.AnbahnungNr);
        localStorage.setItem("currentKundenNr", selectedItem.KundenNr);
        localStorage.setItem("currentKunde", selectedItem.Kunde);

        // 2) Prüfen, ob Kunde bereits in IndexedDB vorhanden ist
        try {
            const kundeVorhanden = await loadKundeFromIndexedDB(selectedItem.KundenNr);
            if (!kundeVorhanden) {
                // Noch nicht in DB: über REST nachladen und speichern
                console.log(`KundenNr ${selectedItem.KundenNr} nicht in DB gefunden. Lade Kunde via REST...`);
                const geladen = await fetchAndStoreKunden(undefined, selectedItem.KundenNr);

                // Optional: prüfen, ob etwas zurückkam
                if (!geladen || geladen.length === 0) {
                    alert(`KundenNr ${selectedItem.KundenNr} konnte nicht geladen werden.`);
                    return;
                }
                console.log(`Kunde ${selectedItem.KundenNr} erfolgreich aus REST geladen und in DB gespeichert.`);
            } else {
                console.log(`KundenNr ${selectedItem.KundenNr} bereits in DB vorhanden.`);
            }
        } catch (err) {
            console.error("Fehler beim Prüfen / Laden des Kunden:", err);
            alert(`Fehler beim Kundenladen: ${err.message}`);
            return;
        }

        // 3) Navigation, z.B. neue Aufgabe
        window.location.href = "../html/neue_aufgabe.html";
    });


    // Grid initialisieren
    initializeGrid();
});

/**
 * Ermittelt die Höhe für das Grid dynamisch,
 * basierend auf Fenster- und Header-/Search-Höhe.
 */
function calculateGridHeight() {
    const windowHeight = $(window).height();
    const headerHeight = $('#header').outerHeight(true);
    const searchContainerHeight = $('.search-container').outerHeight(true);
    return windowHeight - headerHeight - searchContainerHeight - 30;
}

/**
 * Lädt alle Anbahnungen aus IndexedDB und führt eventuelle Datums-Parsings durch.
 */
async function fetchAnbahnungenData() {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['anbahnungen'], 'readonly');
        const store = transaction.objectStore('anbahnungen');
        const request = store.getAll();

        request.onsuccess = () => {
            const result = request.result.map(entry => {
                if (entry.erstelltam) {
                    entry.erstelltam = kendo.parseDate(entry.erstelltam, "dd.MM.yyyy");
                }
                if (entry.letzteTaetigkeitam) {
                    entry.letzteTaetigkeitam = kendo.parseDate(entry.letzteTaetigkeitam, "dd.MM.yyyy");
                }
                if (entry.TerminDatum) {
                    entry.TerminDatum = kendo.parseDate(entry.TerminDatum, "dd.MM.yyyy");
                }
                if (entry.Abschlussdatum) {
                    entry.Abschlussdatum = kendo.parseDate(entry.Abschlussdatum, "dd.MM.yyyy");
                }
                return entry;
            });
            resolve(result);
        };
        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

/**
 * Lädt alle Aufgaben zu einer Anbahnung.
 */
async function fetchAufgabenForAnbahnung(anbahnungNr) {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['aufgaben'], 'readonly');
        const store = transaction.objectStore('aufgaben');
        const index = store.index('AnbahnungNr');
        const request = index.getAll(IDBKeyRange.only(anbahnungNr));

        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

/**
 * Übersetzt A, I, Z in lesbare Bezeichnungen für das Status-Feld.
 * A = Aktiv, I = Inaktiv, Z = Archiviert.
 */
function translateStatus(status) {
    switch (status) {
        case "A":
            return "Aktiv";
        case "Z":
            return "Archiviert";
        // falls 'I' oder unbekannt:
        case "I":
        default:
            return "Inaktiv";
    }
}

/**
 * Filtert Grid-Daten nach letzterTaetigkeitam über das DateRangePicker.
 */
function filterGrid() {
    const dateRangePicker = $("#daterangepicker").data("kendoDateRangePicker");
    const startDate = dateRangePicker.range().start;
    const endDate = dateRangePicker.range().end;
    const grid = $("#grid").data("kendoGrid");

    grid.dataSource.filter({
        logic: "and",
        filters: [
            {
                field: "letzteTaetigkeitam",
                operator: "gte",
                value: startDate
            },
            {
                field: "letzteTaetigkeitam",
                operator: "lte",
                value: endDate
            }
        ]
    });

    grid.dataSource.read();
}

/**
 * Filtert Grid-Daten nach TerminDatum über das DateRangePicker.
 */
function filterTerminGrid() {
    const dateRangePicker = $("#termin-daterangepicker").data("kendoDateRangePicker");
    const startDate = dateRangePicker.range().start;
    const endDate = dateRangePicker.range().end;
    const grid = $("#grid").data("kendoGrid");

    grid.dataSource.filter({
        logic: "and",
        filters: [
            {
                field: "TerminDatum",
                operator: "gte",
                value: startDate
            },
            {
                field: "TerminDatum",
                operator: "lte",
                value: endDate
            }
        ]
    });

    grid.dataSource.read();
}

/**
 * Initialisiert das Hauptgrid für Anbahnungen.
 */
async function initializeGrid() {
    const anbahnungenData = await fetchAnbahnungenData();

    $("#grid").kendoGrid({
        dataSource: {
            data: anbahnungenData,
            pageSize: 50,
            schema: {
                model: {
                    fields: {
                        // WICHTIG: Status als string definieren
                        Status: { type: "string" },
                        AnbahnungNr: { type: "number" },
                        Beschreibung: { type: "string" },
                        KundenNr: { type: "number" },
                        Kunde: { type: "string" },
                        Abschlussdatum: { type: "date" },
                        Wahrscheinlichkeit: { type: "number" },
                        letzteTaetigkeitam: { type: "date" },
                        letzteAktion: { type: "string" },
                        TerminDatum: { type: "date" },
                        Rating: { type: "string" },
                        UmsatzPlan: { type: "number" },
                        Bruttonutzen: { type: "number" },
                        UmsatzGewichtet: { type: "number" },
                        Statusgeschlossen: { type: "string" },
                        erstelltam: { type: "date" },
                        BesitzerKZ: { type: "string" }
                    }
                }
            },
            sort: { field: "AnbahnungNr", dir: "desc" }
        },
        pageable: {
            refresh: true,
            pageSizes: [5, 10, 20, 100, 500],
            buttonCount: 5
        },
        height: calculateGridHeight(),
        sortable: true,
        filterable: true,
        scrollable: true,
        resizable: true,
        reorderable: true,
        selectable: "row",
        columns: [
            {
                title: "...",
                template: `<button class='k-button k-primary anbahnung-detail-btn'>...</button>`,
                width: "60px"
            },
            {
                field: "Status",
                title: "Status",
                width: "100px",
                // template nutzt translateStatus
                template: (dataItem) => translateStatus(dataItem.Status)
            },
            { field: "AnbahnungNr", title: "Nr", width: "80px" },
            { field: "Beschreibung", title: "Beschreibung", width: "250px" },
            { field: "KundenNr", title: "KundenNr", width: "100px" },
            { field: "Kunde", title: "Kunde", width: "150px" },
            {
                field: "Abschlussdatum",
                title: "Abschlussdatum",
                width: "120px",
                format: "{0:dd.MM.yyyy}"
            },
            {
                field: "Wahrscheinlichkeit",
                title: "Wahrscheinlichkeit %",
                width: "120px"
            },
            {
                field: "letzteTaetigkeitam",
                title: "Letzte Tätigkeit am",
                width: "130px",
                format: "{0:dd.MM.yyyy}"
            },
            { field: "letzteAktion", title: "Letzte Aktion", width: "120px" },
            {
                field: "TerminDatum",
                title: "Termin",
                width: "100px",
                format: "{0:dd.MM.yyyy}"
            },
            { field: "Rating", title: "Rating", width: "100px" },
            {
                field: "UmsatzPlan",
                title: "UmsatzPlan",
                width: "100px",
                format: "{0:c2}"
            },
            {
                field: "Bruttonutzen",
                title: "Bruttonutzen",
                width: "100px",
                format: "{0:c2}"
            },
            {
                field: "UmsatzGewichtet",
                title: "UmsatzGewichtet",
                width: "120px",
                format: "{0:c2}"
            },
            {
                field: "Statusgeschlossen",
                title: "Statusgeschlossen",
                width: "120px"
            },
            {
                field: "erstelltam",
                title: "Erstellt am",
                width: "100px",
                format: "{0:dd.MM.yyyy}"
            },
            { field: "BesitzerKZ", title: "BesitzerKZ", width: "80px" }

        ],
        detailTemplate: kendo.template($("#template").html()),
        detailInit: async function (e) {
            const detailRow = e.detailRow;
            const anbahnungNr = e.data.AnbahnungNr;

            const aufgabenData = await fetchAufgabenForAnbahnung(anbahnungNr);

            detailRow.find(".aufgaben-grid").kendoGrid({
                dataSource: {
                    data: aufgabenData,
                    pageSize: 10,
                    schema: {
                        model: {
                            fields: {
                                TicketNr: { type: "number" },
                                Stichwort: { type: "string" },
                                aktuellerStatus: { type: "string" },
                                letzteAktionam: { type: "date" },
                                aktuelleAktion: { type: "string" }
                            }
                        }
                    }
                },
                pageable: true,
                sortable: true,
                filterable: true,
                resizable: true,
                selectable: "row",
                change: function () {
                    const selectedRow = this.select();
                    const dataItem = this.dataItem(selectedRow);
                    if (dataItem) {
                        localStorage.setItem("currentAufgabenNr", dataItem.TicketNr);
                        console.log(`currentAufgabenNr aktualisiert: ${dataItem.TicketNr}`);
                    }
                },
                columns: [
                    {
                        field: "TicketNr",
                        title: "Aufgabe",
                        width: "80px",
                        template: function (dataItem) {
                            return `<button class="aufgabe-button" data-ticketnr="${dataItem.TicketNr}">Aktion: ${dataItem.TicketNr}</button>`;
                        }
                    },
                    { field: "Stichwort", title: "Stichwort", width: "150px" },
                    { field: "aktuellerStatus", title: "Status", width: "150px" },
                    {
                        field: "letzteAktionam",
                        title: "Letzte Aktion",
                        width: "100px",
                        format: "{0:dd.MM.yyyy}"
                    },
                    { field: "aktuelleAktion", title: "Aktion", width: "150px" }
                ]
            });
        },
        change: function () {
            const selectedRow = this.select();
            const dataItem = this.dataItem(selectedRow);

            if (dataItem) {
                localStorage.setItem("currentAnbahnungNr", dataItem.AnbahnungNr);
                console.log(`currentAnbahnungNr aktualisiert: ${dataItem.AnbahnungNr}`);
            }
        },
        dataBound: function () {
            // Bei Datanachladen die Zeile mit currentAnbahnungNr selektieren
            const currentAnbahnungNr = Number(localStorage.getItem("currentAnbahnungNr"));
            if (currentAnbahnungNr) {
                const grid = this;
                const allData = grid.dataSource.data();
                const matchingRow = allData.find(row => row.AnbahnungNr === currentAnbahnungNr);
                if (matchingRow) {
                    const row = grid.table.find(`tr[data-uid="${matchingRow.uid}"]`);
                    grid.select(row);
                    console.log(`Zeile mit AnbahnungNr ${currentAnbahnungNr} wurde selektiert.`);
                } else {
                    console.log(`AnbahnungNr ${currentAnbahnungNr} nicht gefunden.`);
                }
            }

            // Event-Delegation für Button in Unter-Grids
            $("#grid").off("click", ".aufgabe-button").on("click", ".aufgabe-button", function () {
                const ticketNr = $(this).data("ticketnr");
                if (ticketNr) {
                    localStorage.setItem("currentAufgabenNr", ticketNr);
                    console.log(`currentAufgabenNr durch Button aktualisiert: ${ticketNr}`);
                    window.location.href = `../html/aufgaben.html?aufgabeNr=${ticketNr}`;
                }
            });

            const grid = this;
            // Klick auf "Details"-Button in der Hauptzeile
            grid.tbody.find(".anbahnung-detail-btn").on("click", function(evt) {
                const tr = $(evt.target).closest("tr");
                const dataItem = grid.dataItem(tr);
                if (dataItem && dataItem.AnbahnungNr) {
                    localStorage.setItem("currentAnbahnungNr", dataItem.AnbahnungNr);
                    console.log("currentAnbahnungNr über Detail-Button gesetzt:", dataItem.AnbahnungNr);
                    window.location.href = "../html/anbahnung.html";
                }
            });
        }
    });

    // Refresh-Button im Pager
    $(".k-pager-refresh").on("click", async () => {
        await loadAnbahnungen(); // REST-API neu laden und in IndexedDB ablegen
        const updatedData = await fetchAnbahnungenData();
        const grid = $("#grid").data("kendoGrid");
        grid.dataSource.data(updatedData);
    });

    // Suche im Grid
    $("#search").on("input", function () {
        const value = $(this).val();
        const grid = $("#grid").data("kendoGrid");
        grid.dataSource.filter({
            logic: "or",
            filters: [
                { field: "AnbahnungNr", operator: "contains", value: value },
                { field: "Besitzer", operator: "contains", value: value },
                { field: "Beschreibung", operator: "contains", value: value },
                { field: "Kunde", operator: "contains", value: value },
                { field: "Gruppe", operator: "contains", value: value }
            ]
        });
    });

    // Datumsfilter-Symbole
    $("#filter-icon").on("click", function() {
        $("#filter-popup").toggle();
    });
    $("#termin-filter-icon").on("click", function() {
        $("#termin-filter-popup").toggle();
    });

    $("#daterangepicker").kendoDateRangePicker({
        format: "dd.MM.yyyy"
    });
    $("#termin-daterangepicker").kendoDateRangePicker({
        format: "dd.MM.yyyy"
    });

    $("#apply-filter").on("click", function () {
        filterGrid();
        $("#filter-popup").hide();
    });
    $("#apply-termin-filter").on("click", function () {
        filterTerminGrid();
        $("#termin-filter-popup").hide();
    });

    // Home-Icon
    document.getElementById('home-icon').addEventListener('click', () => {
        window.location.href = '../html/menue.html';
    });
}
