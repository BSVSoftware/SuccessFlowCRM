import { loadRechnungen } from './load_rechnungen.js';

window.refreshKendoGrid = async function() {
    const grid = $("#grid").data("kendoGrid");
    if (grid) {
        grid.dataSource.read();
        grid.refresh();
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    kendo.culture("de-DE");
    await loadRechnungen();

    // Check for updated data in localStorage
    const updateRechnungNr = localStorage.getItem('updateRechnungNr');
    const updateZahlbetrag = localStorage.getItem('updateZahlbetrag');

    if (updateRechnungNr && updateZahlbetrag) {
        refreshKendoGrid();
        localStorage.removeItem('updateRechnungNr');
        localStorage.removeItem('updateZahlbetrag');
    }

    $("#search").on("input", function () {
        const value = $(this).val();
        const grid = $("#grid").data("kendoGrid");
        grid.dataSource.filter({
            logic: "or",
            filters: [
                { field: "KundenNr", operator: "contains", value: value },
                { field: "Kunde", operator: "contains", value: value },
                { field: "RechnungNr", operator: "contains", value: value },
                { field: "Datum", operator: "contains", value: value }
            ]
        });
    });

    $("#fab").on("click", function () {
        const grid = $("#grid").data("kendoGrid");
        const selectedItem = grid.dataItem(grid.select());
        if (selectedItem) {
            const RechnungNr = selectedItem.RechnungNr;
            window.location.href = `../html/zahlung.html?RechnungNr=${RechnungNr}&BruttoBetrag=${selectedItem.Brutto}`;
        } else {
            alert('Bitte wählen Sie eine Rechnung aus.');
        }
    });

    $("#home-icon").on("click", function () {
        window.location.href = '../html/menue.html';
    });

    $("#back-icon").on("click", function () {
        window.history.back();
    });

    $("#filter-icon").on("click", function () {
        const grid = $("#grid").data("kendoGrid");
        grid.dataSource.filter({
            logic: "and",
            filters: [
                { field: "bezahlt", operator: "eq", value: 0 },
                { field: "Brutto", operator: "gt", value: 0 }
            ]
        });
    });

    $(window).resize(function () {
        $("#grid").data("kendoGrid").resize();
    });
});

