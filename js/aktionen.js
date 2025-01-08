import { API_URL,APP_RQ } from './app.js';
import { fetchAktionenData } from './fetch_aktionen.js';
import { loadAktionen } from './load_aktionen.js';
import { openIndexedDB } from './indexedDB.js';

/**
 * Höhe für das Grid dynamisch berechnen
 */
function calculateGridHeight() {
    const windowHeight = $(window).height();
    const headerHeight = $('#header').outerHeight(true);
    const searchContainerHeight = $('.search-container').outerHeight(true);
    return windowHeight - headerHeight - searchContainerHeight - 30;
}

/**
 * Initialisiert oder aktualisiert das Kendo-Grid für Aktionen
 */
async function initializeGrid(aktionenData = null) {
    if (!aktionenData) {
        // Falls keine Daten als Parameter -> aus IndexedDB/REST laden
        aktionenData = await fetchAktionenData();
    }

    // TerminDatum, TerminUhrzeit ggf. parsen
    aktionenData = aktionenData.map(entry => {
        if (entry.TerminDatum) {
            entry.TerminDatum = kendo.parseDate(entry.TerminDatum, "dd.MM.yyyy");
        }
        if (entry.TerminUhrzeit) {
            // parseDate("HH:mm") => Zeitformat
            entry.TerminUhrzeit = kendo.parseDate(entry.TerminUhrzeit, "HH:mm");
        }
        return entry;
    });

    const existingGrid = $("#grid").data("kendoGrid");
    if (existingGrid) {
        // Grid schon vorhanden => Daten aktualisieren
        existingGrid.dataSource.data(aktionenData);
        existingGrid.refresh();
        return;
    }

    // Erzeugen des Kendo-Grids
    $("#grid").kendoGrid({
        dataSource: {
            data: aktionenData,
            pageSize: 50,
            schema: {
                model: {
                    fields: {
                        AktionNr:      { type: "number" },
                        TerminDatum:   { type: "date" },
                        TerminUhrzeit: { type: "date" },
                        Kunde:         { type: "string" },
                        Stichwort:     { type: "string" },
                        Beschreibung:  { type: "string" },
                        externeInfo:   { type: "string" },
                        erledigt:      { type: "boolean" },
                        AufgabenNr:    { type: "number" }
                    }
                }
            },
            sort: { field: "AktionNr", dir: "desc" }
        },
        height: calculateGridHeight(),
        scrollable: true,
        pageable: true,
        sortable: true,
        filterable: true,
        groupable: {
            messages: {
                empty: "Ziehen Sie eine Spaltenüberschrift hierher, um nach dieser Spalte zu gruppieren"
            }
        },
        detailTemplate: `
            <div class="details-container">
                <h4>Zugehörige Aufgabe</h4>
                <div class="aufgabe-grid"></div>
            </div>
        `,
        detailInit: async function (e) {
            // Ggf. verknüpfte Aufgabe abrufen
            const aufgabeNr = e.data.AufgabenNr;
            if (aufgabeNr) {
                const aufgabeData = await fetchAufgabeByNr(aufgabeNr);
                if (aufgabeData) {
                    $("<div/>").appendTo(e.detailCell.find(".aufgabe-grid")).kendoGrid({
                        dataSource: {
                            data: [aufgabeData],
                            schema: {
                                model: {
                                    fields: {
                                        AufgabenNr:   { type: "number" },
                                        Stichwort:    { type: "string" },
                                        Beschreibung: { type: "string" },
                                        Termin:       { type: "date" }
                                    }
                                }
                            }
                        },
                        scrollable: true,
                        sortable: true,
                        columns: [
                            {
                                field: "AufgabenNr",
                                title: "AufgabenNr",
                                width: 100,
                                template: function (dataItem) {
                                    return `
                                        <a href="../html/aufgaben.html"
                                           class="hyperlink"
                                           onclick="setAufgabenNrFilter(${dataItem.AufgabenNr})">
                                           ${dataItem.AufgabenNr}
                                        </a>`;
                                }
                            },
                            { field: "Stichwort",    title: "Stichwort",    width: 150 },
                            { field: "Beschreibung", title: "Beschreibung", width: 300 },
                            { field: "Termin",       title: "Termin",       width: 100, format: "{0:dd.MM.yyyy}" }
                        ]
                    });
                } else {
                    e.detailCell.find(".aufgabe-grid")
                        .html("<div class='error'>Keine zugehörige Aufgabe gefunden.</div>");
                }
            } else {
                e.detailCell.find(".aufgabe-grid")
                    .html("<div class='error'>Keine AufgabenNr zugeordnet.</div>");
            }
        },
        columns: [
            // 1) Neue Spalte: "Erledigt" (Button)
            {
                title: "",
                width: 60,
                template: `
                    <button class='k-button k-success done-btn'>
                       ...
                    </button>
                `
            },
            // 2) Restliche Spalten
            { field: "AktionNr",     title: "Aktion Nr",    width: 100, sortable: true },
            { field: "TerminDatum",  title: "Termin Datum", width: 120, format: "{0:dd.MM.yyyy}" },
            { field: "TerminUhrzeit",title: "Termin Zeit",  width:  80, format: "{0:HH:mm}" },
            { field: "Kunde",        title: "Kunde",        width: 150 },
            { field: "Stichwort",    title: "Stichwort",    width: 250 },
            { field: "Beschreibung", title: "Beschreibung", width: 300 },
            {
                field: "externeInfo",
                title: "Externe Info",
                width: 300,
                template: dataItem => `
                    <div style="max-height:5em;overflow-y:auto;">
                        ${dataItem.externeInfo || ""}
                    </div>
                `
            },
            {
                field: "erledigt",
                title: "Erledigt (Flag)",
                width: 80,
                template: '<input type="checkbox" #= erledigt ? "checked" : "" # disabled />'
            }
        ],
        noRecords: {
            template: "Keine Daten verfügbar"
        },
        dataBound: function(e) {
            // "Erledigt?"-Button-Handler
            const grid = e.sender;
            grid.tbody.find(".done-btn").on("click", function(evt) {
                const tr = $(evt.target).closest("tr");
                const dataItem = grid.dataItem(tr);

                if (!dataItem || !dataItem.AktionNr) {
                    alert("Fehler: Keine gültige AktionNr gefunden.");
                    return;
                }

                // 1) currentAktionNr im localStorage
                localStorage.setItem("currentAktionNr", dataItem.AktionNr);

                // 2) Weiterleitung zur "aktion_erledigen.html"
                window.location.href = "../html/aktion_erledigen.html";
            });
        }
    });
}

/**
 * Lädt eine Aufgabe aus IndexedDB (ObjectStore 'aufgaben') anhand der AufgabenNr
 */
export async function fetchAufgabeByNr(aufgabeNr) {
    try {
        const db = await openIndexedDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(["aufgaben"], "readonly");
            const store = transaction.objectStore("aufgaben");
            const index = store.index("AufgabenNr");
            const request = index.get(aufgabeNr);

            request.onsuccess = () => {
                if (request.result) {
                    const result = {
                        AufgabenNr:   request.result.AufgabenNr,
                        Stichwort:    request.result.Stichwort,
                        Beschreibung: request.result.Beschreibung,
                        Termin:       request.result.Termin
                    };
                    resolve(result);
                } else {
                    console.warn(`Aufgabe ${aufgabeNr} nicht gefunden in IndexedDB.`);
                    resolve(null);
                }
            };
            request.onerror = e => reject(e.target.error);
        });
    } catch (error) {
        console.error("Fehler bei fetchAufgabeByNr:", error);
        return null;
    }
}

/**
 * Löscht das 'aktionen'-ObjectStore und lädt erneut aus REST,
 * dann aktualisiert Grid
 */
async function refreshData() {
    try {
        console.log("Aktionen neu laden...");

        const db = await openIndexedDB();
        await clearObjectStore(db, 'aktionen');

        await loadAktionen();                // REST -> IndexedDB
        const refreshed = await fetchAktionenData(); // neu aus IndexedDB
        const grid = $("#grid").data("kendoGrid");
        if (grid) {
            grid.dataSource.data(refreshed);
            grid.refresh();
        }
        alert("Aktionen aktualisiert.");
    } catch (error) {
        console.error("Fehler bei refreshData:", error);
        alert("Fehler bei der Aktualisierung: " + error.message);
    }
}

function clearObjectStore(db, storeName) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction([storeName], 'readwrite');
        const store = tx.objectStore(storeName);
        const clearReq = store.clear();
        clearReq.onsuccess = () => resolve();
        clearReq.onerror   = e => reject(e.target.error);
    });
}

$(document).ready(async function () {
    kendo.culture("de-DE");

    // Grid initialisieren
    await initializeGrid();

    // DateRangePicker
    $("#daterangepicker").kendoDateRangePicker({ format: "dd.MM.yyyy" });

    // FAB -> Neue Aktion
    document.getElementById("fab").addEventListener("click", function () {
        window.location.href = "../html/aktion.html";
    });

    // Filter-Popup
    $("#filter-icon").on("click", function () {
        $("#filter-popup").toggle();
    });
    $("#apply-filter").on("click", function () {
        $("#filter-popup").hide();
        filterGrid();
    });
    $("#filter-popup").kendoPopup({
        anchor: "#filter-icon",
        position: "bottom left"
    });

    // Refresh-Button
    document.getElementById("refresh-button").addEventListener("click", async () => {
        await refreshData();
    });

    // Back-Button
    document.getElementById("back-button").addEventListener("click", () => {
        window.history.back();
    });

    // Home-Icon
    document.getElementById('home-icon').addEventListener('click', () => {
        console.log("click");
        window.location.href = '../html/menue.html';
    });

    // Popup-Menü
    $("#menu-button").kendoButton({
        click: function () {
            $("#popup-menu").kendoPopup({
                anchor: "#menu-button",
                position: "bottom left",
                collision: "fit flip"
            }).data("kendoPopup").toggle();
        }
    });
});

/**
 * Filtert das Grid via DateRangePicker nach TerminDatum
 */
function filterGrid() {
    const dateRangePicker = $("#daterangepicker").data("kendoDateRangePicker");
    const range = dateRangePicker.range();
    if (range && range.start && range.end) {
        const startDate = kendo.parseDate(range.start, "dd.MM.yyyy");
        const endDate   = kendo.parseDate(range.end,   "dd.MM.yyyy");
        if (!startDate || !endDate) return;

        const grid = $("#grid").data("kendoGrid");
        grid.dataSource.filter({
            logic: "and",
            filters: [
                { field: "TerminDatum", operator: "gte", value: startDate },
                { field: "TerminDatum", operator: "lte", value: endDate }
            ]
        });
        grid.dataSource.read();
    } else {
        const grid = $("#grid").data("kendoGrid");
        grid.dataSource.filter({});
        grid.refresh();
    }
}

// Hilfsfunktion für das Template: Speichert die AufgabenNr
window.setAufgabenNrFilter = function (aufgabenNr) {
    localStorage.setItem("currentAufgabenNr", aufgabenNr);
};
