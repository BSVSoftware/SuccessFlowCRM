import { fetchAufgabenData } from './fetch_aufgaben.js';
import { fetchAktionenData } from './fetch_aktionen.js';
import { loadAufgaben } from './load_aufgaben.js';
import { loadAktionen } from './load_aktionen.js';
import { openIndexedDB } from './indexedDB.js';

/**
 * Berechnet die gewünschte Grid-Höhe dynamisch.
 */
function calculateGridHeight() {
    const windowHeight = $(window).height();
    const headerHeight = $('#header').outerHeight(true);
    const searchContainerHeight = $('.search-container').outerHeight(true);
    return windowHeight - headerHeight - searchContainerHeight - 30;
}

/**
 * Initialisiert das Haupt-Grid für Aufgaben.
 */
async function initializeGrid() {
    // Lokale Aufgabendaten aus IndexedDB / oder fetchAufgabenData() von REST
    const aufgabenData = await fetchAufgabenData(); // Siehe Anmerkung: fetchAufgabenData() parst ggf. Datumsfelder

    $("#grid").kendoGrid({
        dataSource: {
            data: aufgabenData,
            schema: {
                model: {
                    fields: {
                        aktDatum:       { type: "date", parse: value => kendo.parseDate(value, "dd.MM.yyyy") },
                        letzteAktionam: { type: "date", parse: value => kendo.parseDate(value, "dd.MM.yyyy") },
                        Termin:         { type: "date", parse: value => kendo.parseDate(value, "dd.MM.yyyy") },
                        KundenNr:       { type: "number" },
                        Klassifizierung: { type: "string" },
                        erledigt:        { type: "boolean" },
                        Ersteller:      { type: "string" },
                    }
                }
            },
            pageSize: 50,
            sort: { field: "TicketNr", dir: "desc" },
            pageSizes: [10, 20, 50, 100, 500]
        },
        height: calculateGridHeight(),
        scrollable: true,
        sortable: true,
        resizable: true,
        filterable: true,
        selectable: "row",
        groupable: {
            messages: {
                empty: "Ziehen Sie eine Spaltenüberschrift und legen Sie sie hier ab, um nach dieser Spalte zu gruppieren"
            }
        },
        columnMenu: {
            messages: {
                sortAscending:  "Aufsteigend sortieren",
                sortDescending: "Absteigend sortieren",
                filter:         "Filter",
                columns:        "Spalten",
                done:           "Fertig",
                settings:       "Spalteneinstellungen",
                lock:           "Sperren",
                unlock:         "Entsperren",
                sort:           "Sortierung"
            }
        },
        pageable: {
            refresh: true, // Kendo-Refresh-Button
            pageSizes: true,
            buttonCount: 5,
            messages: {
                display:         "{0} - {1} von {2} Einträgen",
                empty:           "Keine Einträge",
                page:            "Seite",
                of:              "von {0}",
                itemsPerPage:    "Einträge pro Seite",
                first:           "Zur ersten Seite",
                previous:        "Zurück",
                next:            "Weiter",
                last:            "Zur letzten Seite",
                refresh:         "Aktualisieren"
            }
        },
        detailTemplate: `<div class="aktionen-grid"></div>`,
        detailInit: async function (e) {
            const aufgabeNr = e.data.TicketNr;
            const kundenNr  = e.data.KundeNr;

            const loader = $("<div class='loading'>Lade Aktionen...</div>");
            e.detailCell.find(".aktionen-grid").append(loader);

            try {
                // Aktionen in IndexedDB aktualisieren
                await loadAktionen(kundenNr, aufgabeNr);
                // Aktionen-Daten für dieses KundenNr + AufgabenNr laden
                const aktionenData = await fetchAktionenData(kundenNr, aufgabeNr);

                if (aktionenData && aktionenData.length > 0) {
                    const aktionenGrid = $("<div/>").appendTo(e.detailCell.find(".aktionen-grid")).kendoGrid({
                        dataSource: {
                            data: aktionenData,
                            schema: {
                                model: {
                                    fields: {
                                        Beschreibung: { type: "string" },
                                        erstelltam:   { type: "date", parse: v => kendo.parseDate(v, "dd.MM.yyyy") },
                                        neuerStatus:  { type: "string" },
                                        erledigt:     { type: "boolean" },
                                        Mitarbeiter:  { type: "string" },
                                        Stichwort:    { type: "string" },
                                        TerminDatum:  { type: "date" },
                                        TerminDauer:  { type: "number" },
                                        TerminUhrzeit:{ type: "date" }
                                    }
                                }
                            },
                            sort: { field: "erstelltam", dir: "desc" }
                        },
                        scrollable: false,
                        sortable:   true,
                        resizable:  true,
                        columns: [
                            {
                                title: "Erledigen",
                                width: "100px",
                                // -> Button nur anzeigen, wenn !erledigt
                                template: function(dataItem) {
                                    // Wenn dataItem.erledigt===true => Button ausblenden
                                    if (dataItem.erledigt) {
                                        return `<button class='k-button k-success' style='display:none'>Erledigen</button>`;
                                    } else {
                                        // Noch nicht erledigt => Button anzeigen
                                        return `<button class='k-button k-success aktion-done-btn'>Erledigen</button>`;
                                    }
                                }
                            },
                            { field: "Mitarbeiter",  title: "Mitarbeiter",  width: "80px" },
                            { field: "Beschreibung", title: "Aktion",       width: "100px" },
                            { field: "Stichwort",    title: "Stichwort",    width: "80px" },
                            {
                                field: "TerminDatum",
                                title: "Termin",
                                width: "80px",
                                format: "{0:dd.MM.yyyy}"
                            },
                            {
                                field: "erstelltam",
                                title: "vom",
                                width: "80px",
                                format: "{0:dd.MM.yyyy}"
                            },
                            { field: "neuerStatus",  title: "Status",   width: "60px" },
                            {
                                field: "erledigt",
                                title: "Erledigt",
                                width: "60px",
                                template: '<input type="checkbox" #= erledigt ? "checked" : "" # disabled />'
                            }
                        ],
                        dataBound: function(ae) {
                            const aGrid = ae.sender;

                            // Klick-Handler für "Erledigen"-Button
                            aGrid.tbody.find(".aktion-done-btn").on("click", function(evt) {
                                const tr = $(evt.target).closest("tr");
                                const aDataItem = aGrid.dataItem(tr);
                                if (aDataItem && aDataItem.AktionNr) {
                                    // 1) currentAktionNr setzen
                                    localStorage.setItem("currentAktionNr", aDataItem.AktionNr);

                                    // 2) Navigieren zu "aktion_erledigen.html"
                                    window.location.href = "../html/aktion_erledigen.html";
                                } else {
                                    console.warn("Keine gültige AktionNr im Datensatz vorhanden!");
                                }
                            });
                        }
                    }).data("kendoGrid");

                    // Grid-Daten zuweisen/refresh
                    aktionenGrid.dataSource.data(aktionenData);
                    aktionenGrid.refresh();

                } else {
                    console.warn("Keine Aktionen verfügbar.");
                    e.detailCell.find(".aktionen-grid").html("<div class='error'>Keine Aktionen verfügbar.</div>");
                }
            } catch (error) {
                console.error("Keine Aktionen geladen:", error);
                e.detailCell.find(".aktionen-grid").html("<div class='error'>Keine Aktionen geladen.</div>");
            } finally {
                loader.remove();
            }
        }
        ,
        dataBound: function() {
            // Falls wir eine "currentAufgabenNr" selektieren möchten
            const currentAufgabenNr = Number(localStorage.getItem("currentAufgabenNr"));
            if (currentAufgabenNr) {
                const grid = this;
                const allData = grid.dataSource.data();
                const matchingRow = allData.find(row => row.TicketNr === currentAufgabenNr);
                if (matchingRow) {
                    const rowIndex = grid.dataSource.indexOf(matchingRow);
                    const row = grid.table.find(`tr[data-uid="${matchingRow.uid}"]`);
                    grid.select(row);
                    console.log(`Zeile mit TicketNr ${currentAufgabenNr} wurde selektiert.`);
                }
            }
        },
        change: function() {
            const grid = this;
            const row = grid.select();
            const dataItem = grid.dataItem(row);
            if (dataItem) {
                localStorage.setItem("currentAufgabenNr", dataItem.TicketNr);
                localStorage.setItem("currentKundenNr", dataItem.KundenNr);
                console.log(`currentAufgabenNr aktualisiert: ${dataItem.TicketNr}`);
            }
        },
        columns: [
            {
                field: "TicketNr",
                title: "Aufgabe",
                width: "80px",
            },
            {
                field: "erledigt",
                title: "Erledigt",
                width: 80,
                // Checkbox nur als Anzeige
                template: '<input type="checkbox" #= erledigt ? "checked" : "" # disabled />'
            },
            {
                command: [{ name: "details", text: "Details", click: showDetails }],
                title: " ",
                width: "100px"
            },
            { field: "Stichwort",       title: "Stichwort",         width: "150px" },
            {
                field: "KundenNr",
                title: "Kunden-Nr",
                width: 120
            },
            { field: "Kunde",           title: "Kunde",             width: "150px" },
            { field: "aktDatum",        title: "erstellt am",       width: "100px", format: "{0:dd.MM.yyyy}" },
            { field: "aktZeit",         title: "um",                width: "80px" },
            { field: "aktuellerStatus", title: "aktueller Status",  width: "150px" },
            { field: "letzteAktionam",  title: "letzte Aktion am",  width: "100px", format: "{0:dd.MM.yyyy}" },
            { field: "Termin",          title: "Termin",            width: "100px", format: "{0:dd.MM.yyyy}" },
            { field: "aktuelleAktion",  title: "aktuelle Aktion",   width: "150px" },
            {
                field: "Klassifizierung",
                title: "Klassifizierung",
                width: 120
            },
            {
                field: "Ersteller",
                title: "Ersteller",
                width: 120
            },
        ],
        noRecords: {
            template: "Keine Daten verfügbar"
        }
    });

    // **Hier** fangen wir den Klick auf den Kendo-Refresh-Button ab
    $(".k-pager-refresh").on("click", async () => {
        await loadAufgaben();                 // 1) Neuladen per REST und in IndexedDB speichern
        const newData = await fetchAufgabenData(); // 2) frisch aus IndexedDB holen
        const grid = $("#grid").data("kendoGrid");
        grid.dataSource.data(newData);        // 3) Grid-Daten aktualisieren
    });
}

/**
 * Lädt das ObjektStore 'aufgaben' leer, ruft loadAufgaben() auf und aktualisiert das Grid.
 * (Beispiel-Funktion, falls Sie manuell irgendwo aufrufen möchten.)
 */
async function refreshData() {
    const db = await openIndexedDB();
    await clearObjectStore(db, 'aufgaben'); // Optional: store komplett leeren
    await loadAufgaben();                  // Per REST neu laden
    const grid = $("#grid").data("kendoGrid");
    const newData = await fetchAufgabenData();
    grid.dataSource.data(newData);
}

function clearObjectStore(db, storeName) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const clearRequest = store.clear();

        clearRequest.onsuccess = () => resolve();
        clearRequest.onerror = (event) => reject(event.target.error);
    });
}

// Klickhandler "Details"-Button
function showDetails(e) {
    e.preventDefault();
    const dataItem = $("#grid").data("kendoGrid").dataItem($(e.currentTarget).closest("tr"));
    localStorage.setItem("currentAufgabenNr", dataItem.TicketNr);
    window.location.href = `../html/aufgaben_details.html?ticketNr=${dataItem.TicketNr}`;
}

$(document).ready(async function () {
    kendo.culture("de-DE");

    // DateRangePicker
    $("#daterangepicker").kendoDateRangePicker({
        format: "dd.MM.yyyy"
    });

    await initializeGrid();

    $("#only-open-switch").kendoSwitch({
        checked: false,       // anfangs z.B. false
        onLabel:  "Nur offene",
        offLabel: "Alle",
        change: function(e) {
            // e.checked ist bereits ein Boolean
            const isChecked = e.checked;

            const grid = $("#grid").data("kendoGrid");
            if (isChecked) {
                grid.dataSource.filter({
                    field: "erledigt",
                    operator: "eq",
                    value: false
                });
            } else {
                grid.dataSource.filter({});
            }
            grid.dataSource.read();
        }
    });



    $("#clear-filters-btn").on("click", function() {
        // Alle Grid-Filter entfernen
        const grid = $("#grid").data("kendoGrid");
        grid.dataSource.filter({});
        grid.dataSource.read();

        // Den Switch ggf. auf "alle" zurücksetzen
        const kSwitch = $("#only-open-switch").data("kendoSwitch");
        kSwitch.check(false);
    });

    // Falls wir direkt auf "currentAufgabenNr" filtern wollen ...
    const currentAufgabenNr = localStorage.getItem("currentAufgabenNr");
    if (currentAufgabenNr) {
        const grid = $("#grid").data("kendoGrid");
        grid.dataSource.filter({
            field: "TicketNr",
            operator: "eq",
            value: Number(currentAufgabenNr)
        });
    }

    // Klick auf Home-Icon
    document.getElementById('home-icon').addEventListener('click', () => {
        window.location.href = '../html/menue.html';
    });

    // Such-Input
    $("#search").on("input", function () {
        const value = $(this).val();
        const grid = $("#grid").data("kendoGrid");
        grid.dataSource.filter({
            logic: "or",
            filters: [
                { field: "TicketNr",        operator: "contains", value: value },
                { field: "Stichwort",       operator: "contains", value: value },
                { field: "Kunde",           operator: "contains", value: value },
                { field: "Warteraum",       operator: "contains", value: value },
                { field: "aktDatum",        operator: "contains", value: value }
            ]
        });
    });

    // Neue Aufgabe-Button
    document.getElementById('create-icon').addEventListener('click', () => {
        window.location.href = '../html/neue_aufgabe.html';
    });

    // Filter-Symbol
    $("#filter-icon").on("click", function () {
        $("#filter-popup").toggle();
    });

    // Filter übernehmen
    $("#apply-filter").on("click", function () {
        $("#filter-popup").hide();
        filterGrid();
    });

    // Popup
    $("#filter-popup").kendoPopup({
        anchor: "#filter-icon",
        position: "bottom left"
    });

    // FAB
    $("#fab").on("click", function () {
        const grid = $("#grid").data("kendoGrid");
        const selectedItem = grid.dataItem(grid.select());
        if (selectedItem) {
            const aufgabeNr = selectedItem.TicketNr;
            window.location.href = `../html/aktion.html`;
        } else {
            alert('Bitte wählen Sie eine Aufgabe aus.');
        }
    });

    // Beispiel "Filter zurücksetzen"-Button
    $("#clear-filters-btn").on("click", function () {
        const grid = $("#grid").data("kendoGrid");
        // Filter löschen
        grid.dataSource.filter({});
        // Zur 1. Seite
        grid.dataSource.page(1);
        // Suchfeld leeren
        $("#search").val("");
    });

    // Resize
    $(window).resize(function () {
        $("#grid").data("kendoGrid").resize();
    });
});

/**
 * Filtert das Grid nach "letzteAktionam".
 */
function filterGrid() {
    const dateRangePicker = $("#daterangepicker").data("kendoDateRangePicker");
    const startDate = dateRangePicker.range().start;
    const endDate   = dateRangePicker.range().end;
    const grid      = $("#grid").data("kendoGrid");

    grid.dataSource.filter({
        logic: "and",
        filters: [
            { field: "letzteAktionam", operator: "gte", value: startDate },
            { field: "letzteAktionam", operator: "lte", value: endDate }
        ]
    });

    grid.dataSource.read();
}
