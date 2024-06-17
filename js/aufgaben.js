import { fetchAufgabenData } from './fetch_aufgaben.js';
import { fetchAktionenData } from './fetch_aktionen.js';
import { loadAufgaben } from './load_aufgaben.js';
import { loadAktionen } from './load_aktionen.js';
import { openIndexedDB } from './indexedDB.js';

function calculateGridHeight() {
    const windowHeight = $(window).height();
    const headerHeight = $('#header').outerHeight(true);
    const searchContainerHeight = $('.search-container').outerHeight(true);
    return windowHeight - headerHeight - searchContainerHeight - 30; // 20px for padding/margin + 10px for extra space at the bottom
}

async function initializeGrid() {
    const aufgabenData = await fetchAufgabenData();

    $("#grid").kendoGrid({
        dataSource: {
            data: aufgabenData,
            schema: {
                model: {
                    fields: {
                        aktDatum: { type: "date", parse: function(value) { return kendo.parseDate(value, "dd.MM.yyyy"); } },
                        letzteAktionam: { type: "date", parse: function(value) { return kendo.parseDate(value, "dd.MM.yyyy"); } }
                    }
                }
            },
            pageSize: 50,
            pageSizes: [10, 20, 50, 100, 500]
        },
        height: calculateGridHeight(),
        scrollable: true,
        sortable: true,
        resizable: true,
        pageable: {
            refresh: true,
            pageSizes: true,
            buttonCount: 5,
            messages: {
                display: "{0} - {1} von {2} Einträgen",
                empty: "Keine Einträge",
                page: "Seite",
                of: "von {0}",
                itemsPerPage: "Einträge pro Seite",
                first: "Zur ersten Seite",
                previous: "Zurück",
                next: "Weiter",
                last: "Zur letzten Seite",
                refresh: "Aktualisieren"
            }
        },
        groupable: {
            messages: {
                empty: "Ziehen Sie eine Spaltenüberschrift und legen Sie sie hier ab, um nach dieser Spalte zu gruppieren"
            }
        },
        columnMenu: {
            messages: {
                sortAscending: "Aufsteigend sortieren",
                sortDescending: "Absteigend sortieren",
                filter: "Filter",
                columns: "Spalten",
                done: "Fertig",
                settings: "Spalteneinstellungen",
                lock: "Sperren",
                unlock: "Entsperren",
                sort: "Sortierung"
            }
        },
        filterable: true,
        detailTemplate: kendo.template($("#template").html()),
        detailInit: detailInit,
        columns: [
            { field: "TicketNr", title: "Nr.", width: "80px" },
            { field: "Stichwort", title: "Stichwort", width: "150px" },
            { field: "Kunde", title: "Kunde", width: "150px" },
            { field: "aktDatum", title: "erstellt am", width: "150px", format: "{0:dd.MM.yyyy}" },
            { field: "aktZeit", title: "um", width: "80px" },
            { field: "aktuellerStatus", title: "aktueller Status", width: "150px" },
            { field: "letzteAktionam", title: "letzte Aktion am", width: "150px", format: "{0:dd.MM.yyyy}" },
            { field: "aktuelleAktion", title: "aktuelle Aktion", width: "150px" },
            { command: [{ name: "details", text: "Details", click: showDetails }], title: " ", width: "150px" }
        ],
        noRecords: {
            template: "Keine Daten verfügbar"
        },
        dataBound: function () {
            const refreshButton = this.wrapper.find(".k-pager-refresh");
            refreshButton.off("click").on("click", async function () {
                await refreshData();
            });
        }
    });
}

async function refreshData() {
    // Clear IndexedDB
    const db = await openIndexedDB();
    await clearObjectStore(db, 'aufgaben');
    await clearObjectStore(db, 'aktionen');

    // Load new data into IndexedDB
    await loadAufgaben();
    await loadAktionen();

    // Reinitialize the grid with new data
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

async function detailInit(e) {
    const aktionenData = await fetchAktionenData(e.data.TicketNr);

    $("<div/>").appendTo(e.detailCell).kendoGrid({
        dataSource: {
            data: aktionenData
        },
        scrollable: false,
        sortable: true,
        resizable: true,
        columns: [
            { field: "Beschreibung", title: "Aktion", width: "auto" },
            { field: "erstelltam", title: "vom", width: "100px", format: "{0:dd.MM.yyyy}" },
            { field: "neuerStatus", title: "Status", width: "100px" },
            { field: "erledigt", title: "Erledigt", width: "100px", template: '<input type="checkbox" #= erledigt ? "checked=checked" : "" # disabled="disabled" />' }
        ],
        pageable: false,
        filterable: false,
        columnMenu: false,
        header: false
    });
}

function showDetails(e) {
    e.preventDefault();
    const dataItem = $("#grid").data("kendoGrid").dataItem($(e.currentTarget).closest("tr"));
    window.location.href = `/CRM/html/aufgaben_details.html?ticketNr=${dataItem.TicketNr}`;
}

$(document).ready(function () {
    kendo.culture("de-DE");

    $("#daterangepicker").kendoDateRangePicker({
        format: "dd.MM.yyyy"
    });

    initializeGrid();

    document.getElementById('home-icon').addEventListener('click', () => {
        window.location.href = '/CRM/html/menue.html';
    });

    $("#search").on("input", function () {
        const value = $(this).val();
        const grid = $("#grid").data("kendoGrid");
        grid.dataSource.filter({
            logic: "or",
            filters: [
                { field: "TicketNr", operator: "contains", value: value },
                { field: "Stichwort", operator: "contains", value: value },
                { field: "Kunde", operator: "contains", value: value },
                { field: "Warteraum", operator: "contains", value: value },
                { field: "aktDatum", operator: "contains", value: value }
            ]
        });
    });

    $(window).resize(function () {
        $("#grid").data("kendoGrid").resize();
    });

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

    $("#fab").on("click", function () {
        window.location.href = "/CRM/html/neue_aufgabe.html";
    });

    // Initialize Popup Menu
    $("#menu-button").kendoButton({
        click: function() {
            $("#popup-menu").kendoPopup({
                anchor: "#menu-button",
                position: "bottom left",
                collision: "fit flip"
            }).data("kendoPopup").toggle();
        }
    });
});

function filterGrid() {
    const dateRangePicker = $("#daterangepicker").data("kendoDateRangePicker");
    const startDate = dateRangePicker.range().start;
    const endDate = dateRangePicker.range().end;
    const grid = $("#grid").data("kendoGrid");

    grid.dataSource.filter({
        logic: "and",
        filters: [
            {
                field: "letzteAktionam",
                operator: "gte",
                value: startDate
            },
            {
                field: "letzteAktionam",
                operator: "lte",
                value: endDate
            }
        ]
    });

    // Trigger the grid to refresh and apply the filter
    grid.dataSource.read();
}
