import { fetchTicketsData } from './fetch_tickets.js';
import { loadTickets } from './load_tickets.js';

function calculateGridHeight() {
    const windowHeight = $(window).height();
    const headerHeight = $('#header').outerHeight(true);
    const searchContainerHeight = $('.search-container').outerHeight(true);
    return windowHeight - headerHeight - searchContainerHeight - 30;
}

async function initializeGrid(ticketsData = null) {
    if (!ticketsData) {
        ticketsData = await fetchTicketsData();
    }

    // Ensure dates and times are parsed correctly as Date and Time objects
    ticketsData = ticketsData.map(entry => {
        if (entry.aktDatum && entry.aktDatum !== '') {
            entry.aktDatum = kendo.parseDate(entry.aktDatum, "dd.MM.yy");
        }
        if (entry.aktZeit && entry.aktZeit !== '') {
            entry.aktZeit = kendo.parseDate(entry.aktZeit, "HH:mm");
        }
        return entry;
    });

    $("#grid").kendoGrid({
        dataSource: {
            data: ticketsData,
            schema: {
                model: {
                    fields: {
                        TicketNr: { type: "number" },
                        Stichwort: { type: "string" },
                        Kunde: { type: "string" },
                        aktDatum: { type: "date" },
                        aktZeit: { type: "date" },
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
                },
                aggregate: [
                    { field: "TicketNr", aggregate: "count" }
                ]
            },
            aggregate: [
                { field: "TicketNr", aggregate: "count" }
            ],
            groupFooterTemplate: "Summe: #=count# Einträge",
            pageSize: 50,
            pageSizes: [10, 20, 50, 100, 500]
        },
        height: calculateGridHeight(),
        pageable: {
            refresh: true,
            pageSizes: [10, 20, 50, 100, 500],
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
        sortable: true,
        filterable: true,
        scrollable: true,
        resizable: true,
        reorderable: true,
        groupable: {
            messages: {
                empty: "Ziehen Sie eine Spaltenüberschrift und legen Sie sie hier ab, um nach dieser Spalte zu gruppieren"
            }
        },
        columns: [
            { field: "TicketNr", title: "Ticket Nr", width: "80px", aggregates: ["count"], groupFooterTemplate: "Summe: #=count#" },
            { field: "Stichwort", title: "Stichwort", width: "150px" },
            { field: "Kunde", title: "Kunde", width: "120px" },
            { field: "aktDatum", title: "Datum", width: "100px", format: "{0:dd.MM.yy}" },
            { field: "aktZeit", title: "Zeit", width: "70px", format: "{0:HH:mm}" },
            { field: "Modell", title: "Modell", width: "150px" },
            { field: "Fehlermeldung", title: "Fehlermeldung", width: "300px", template: "<textarea readonly style='height: 5em; overflow-y: auto; width: 280px;'>#= Fehlermeldung #</textarea>" },
            { field: "Behebung", title: "Behebung", width: "300px", template: "<textarea readonly style='height: 5em; overflow-y: auto; width:280px;'>#= Behebung #</textarea>" },
            { field: "KundenNr", title: "Kunden Nr", width: "100px" },
            { field: "IDNR", title: "IDNR", width: "100px" },
            { field: "SNR", title: "SNR", width: "100px" },
            { field: "Vertragsart", title: "Vertragsart", width: "150px" },
            { field: "Vertragsbereich", title: "Vertragsbereich", width: "150px" },
            { field: "Vertragsnummer", title: "Vertragsnummer", width: "150px" },
            { field: "Ansprechpartner", title: "Ansprechpartner", width: "150px" },
            { field: "Telefon", title: "Telefon", width: "120px" },
            { field: "EMail", title: "E-Mail", width: "150px" }
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

    $("#search").on("input", function () {
        const value = $(this).val();
        const grid = $("#grid").data("kendoGrid");
        grid.dataSource.filter({
            logic: "or",
            filters: [
                { field: "TicketNr", operator: "contains", value: value },
                { field: "Stichwort", operator: "contains", value: value },
                { field: "Kunde", operator: "contains", value: value },
                { field: "Modell", operator: "contains", value: value },
                { field: "Fehlermeldung", operator: "contains", value: value },
                { field: "Behebung", operator: "contains", value: value },
                { field: "KundenNr", operator: "contains", value: value },
                { field: "IDNR", operator: "contains", value: value },
                { field: "SNR", operator: "contains", value: value },
                { field: "Vertragsart", operator: "contains", value: value },
                { field: "Vertragsbereich", operator: "contains", value: value },
                { field: "Vertragsnummer", operator: "contains", value: value },
                { field: "Ansprechpartner", operator: "contains", value: value },
                { field: "Telefon", operator: "contains", value: value },
                { field: "EMail", operator: "contains", value: value }
            ]
        });
    });

    $(window).resize(function () {
        $("#grid").data("kendoGrid").resize();
    });

    document.getElementById('home-icon').addEventListener('click', () => {
        window.location.href = '../html/menue.html';
    });
};

async function refreshData() {
    await loadTickets(); // Ensure data is loaded from server
    const updatedData = await fetchTicketsData(); // Fetch updated data from IndexedDB
    const grid = $("#grid").data("kendoGrid");
    grid.dataSource.data(updatedData);
    grid.refresh(); // Refresh the grid
}

$(document).ready(function () {
    kendo.culture("de-DE");

    $("#daterangepicker").kendoDateRangePicker({
        format: "dd.MM.yy"
    });

    initializeGrid();
});
