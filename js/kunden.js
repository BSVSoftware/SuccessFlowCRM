import { fetchAndStoreKunden, loadKundeFromIndexedDB, loadKundenFromIndexedDB } from './fetch_kunden.js';
import { fetchKontaktpersonenData } from './fetch_kontaktpersonen.js';
import { fetchAktionenData } from './fetch_aktionen.js';
import { loadAktionen } from './load_aktionen.js';

document.getElementById('back-icon').addEventListener('click', function () {
    const sourcePage = localStorage.getItem("sourcePage");

    if (sourcePage === "neue_anbahnung") {
        console.log("Navigiere zurück zu neue_anbahnung.html");
        localStorage.removeItem("sourcePage");
        window.location.href = "../html/neue_anbahnung.html";
    } else {
        window.history.back();
    }
});

document.getElementById('home-icon').addEventListener('click', () => {
    window.location.href = '../html/menue.html';
});

document.addEventListener('DOMContentLoaded', async () => {
    const currentKundenNr = localStorage.getItem("currentKundenNr");
    let kundenData = [];

    if (currentKundenNr) {
        const kdNr = Number(currentKundenNr);
        const singleKunde = await loadKundeFromIndexedDB(kdNr);
        kundenData = singleKunde ? [singleKunde] : [];
    } else {
        kundenData = await loadKundenFromIndexedDB();
    }

    renderCustomerGrid(kundenData);


    $("#fab-items").kendoFloatingActionButton({
        align: "bottom end",
        icon: "plus",
        themeColor: "primary",
        items: [
            {
                label: "neuer Kunde",
                icon: "k-i-user",
                click: function () {
                    // currentKundenNr entfernen
                    localStorage.removeItem("currentKundenNr");
                    window.location.href = "../html/kunde.html";
                }
            },
            {
                label: "neue Kontaktperson",
                icon: "k-i-user-add",
                click: function () {
                    // currentKontaktpersonNr entfernen
                    localStorage.removeItem("currentKontaktpersonNr");
                    window.location.href = "../html/kontaktperson.html";
                }
            }
        ]
    });

    const searchInput = document.getElementById('search');
    const searchIcon = document.getElementById('search-icon');

    searchIcon.addEventListener('click', async function () {
        await handleSearch(searchInput.value.trim());
    });

    searchInput.addEventListener('keydown', async function (event) {
        if (event.key === 'Enter') {
            await handleSearch(searchInput.value.trim());
        }
    });

    window.addEventListener('resize', () => {
        const grid = $("#grid").data("kendoGrid");
        if (grid) {
            grid.setOptions({ height: calculateGridHeight() });
            grid.resize();
        }
    });
});

async function handleSearch(query) {
    if (query.length >= 3) {
        console.log(`Suche nach: ${query}`);
        // currentKundenNr entfernen, damit nur Suchergebnisse gezeigt werden
        localStorage.removeItem('currentKundenNr');

        const kundenData = await fetchAndStoreKunden(query);
        renderCustomerGrid(kundenData);
    } else {
        alert('Bitte geben Sie mindestens 3 Zeichen für die Suche ein.');
    }
}

function renderCustomerGrid(data) {
    const gridElement = $("#grid").data("kendoGrid");

    if (gridElement) {
        gridElement.dataSource.data(data);
        gridElement.refresh();
    } else {
        $("#grid").kendoGrid({
            dataSource: {
                data: data,
                pageSize: 20,
                schema: {
                    model: {
                        fields: {
                            KundenNr: { type: "number" },
                            Kunde: { type: "string" },
                            Adresse: { type: "string" },
                            TelefonNr: { type: "string" },
                            EMail: { type: "string" },
                            Mandant: { type: "string" },
                            UmsatzsteuerId: { type: "string" }
                        }
                    }
                }
            },
            detailExpand: function(e) {
                // e.masterRow ist die Zeile, die expandiert wurde
                // => passendes Datenobjekt abgreifen:
                const dataItem = this.dataItem(e.masterRow);
                if (dataItem && dataItem.KundenNr) {
                    localStorage.setItem("currentKundenNr", dataItem.KundenNr);
                    console.log("currentKundenNr gesetzt durch detailExpand:", dataItem.KundenNr);
                }
            },
            height: calculateGridHeight(),
            scrollable: true,
            pageable: true,
            selectable: "row",
            sortable: true,
            dataBound: function(e) {
                const grid = e.sender;

                // Wenn currentKundenNr vorhanden ist, auswählen und aufklappen
                const currentKundenNr = localStorage.getItem("currentKundenNr");
                if (currentKundenNr) {
                    const data = grid.dataSource.view();
                    const item = data.find(d => d.KundenNr == currentKundenNr);
                    if (item) {
                        let row;
                        grid.tbody.find("tr").each(function() {
                            const dataItem = grid.dataItem(this);
                            if (dataItem && dataItem.KundenNr == currentKundenNr) {
                                row = $(this);
                                return false;
                            }
                        });

                        if (row) {
                            grid.select(row);
                            grid.expandRow(row);
                        }
                    }
                }

                // Detail-Button für Kunden
                grid.tbody.find(".kunden-detail-btn").on("click", function(evt) {
                    const tr = $(evt.target).closest("tr");
                    const dataItem = grid.dataItem(tr);

                    if (dataItem && dataItem.KundenNr) {
                        localStorage.setItem("currentKundenNr", dataItem.KundenNr);
                        console.log("currentKundenNr über Detail-Button gesetzt:", dataItem.KundenNr);
                        window.location.href = "../html/kunde.html";
                    }
                });
            },
            change: function (e) {
                const grid = e.sender;
                const selectedRow = grid.select();
                const selectedDataItem = grid.dataItem(selectedRow);
                if (selectedDataItem && selectedDataItem.KundenNr) {
                    localStorage.setItem("currentKundenNr", selectedDataItem.KundenNr);
                    console.log(`currentKundenNr aktualisiert: ${selectedDataItem.KundenNr}`);
                }
            },
            detailTemplate: `
                <div class="details-container">
                    <h4>Kontaktpersonen</h4>
                    <div class="kontaktpersonen-grid"></div>
                    <h4>Aktionen</h4>
                    <div class="aktionen-grid"></div>
                </div>
            `,
            detailInit: async function (e) {
                const kundenNr = e.data.KundenNr;

                const loader = $("<div class='loading'>Lade Kontaktpersonen...</div>");
                e.detailCell.find(".kontaktpersonen-grid").append(loader);

                try {
                    const kontaktpersonenData = await fetchKontaktpersonenData(kundenNr);
                    $("<div/>").appendTo(e.detailCell.find(".kontaktpersonen-grid")).kendoGrid({
                        dataSource: { data: kontaktpersonenData, pageSize: 5 },
                        scrollable: true,
                        pageable: true,
                        sortable: true,
                        selectable: "row",
                        change: function(ev) {
                            const grid = ev.sender;
                            const selectedRow = grid.select();
                            const dataItem = grid.dataItem(selectedRow);
                            if (dataItem && dataItem.PersonNr) {
                                localStorage.setItem("currentKontaktpersonNr", dataItem.PersonNr);
                                console.log("currentKontaktpersonNr gesetzt:", dataItem.PersonNr);
                            }
                        },
                        columns: [
                            { field: "PersonNr", title: "Person Nr" },
                            { field: "Name", title: "Name" },
                            { field: "Abteilung", title: "Abteilung" },
                            { field: "Funktion", title: "Funktion" },
                            { field: "Sympathie", title: "Sympathie" },
                            { field: "Telefon", title: "Telefon" },
                            { field: "EMail", title: "E-Mail" },
                            {
                                title: "Details",
                                template: `<button class='k-button k-primary detail-btn'>Detail</button>`
                            }
                        ],
                        dataBound: function(e) {
                            const grid = e.sender;
                            grid.tbody.find(".detail-btn").on("click", function(evt) {
                                const tr = $(evt.target).closest("tr");
                                const dataItem = grid.dataItem(tr);

                                if (dataItem && dataItem.PersonNr) {
                                    localStorage.setItem("currentKontaktpersonNr", dataItem.PersonNr);
                                    console.log("currentKontaktpersonNr über Detail-Button gesetzt:", dataItem.PersonNr);
                                    window.location.href = "../html/kontaktperson.html";
                                }
                            });
                        }
                    });

                    await loadAktionen(kundenNr);
                    const aktionenData = await fetchAktionenData(kundenNr);
                    $("<div/>").appendTo(e.detailCell.find(".aktionen-grid")).kendoGrid({
                        dataSource: { data: aktionenData, pageSize: 5 },
                        scrollable: true,
                        pageable: true,
                        sortable: true,
                        selectable: "row",
                        change: function(ae) {
                            const aGrid = ae.sender;
                            const selectedARow = aGrid.select();
                            const aDataItem = aGrid.dataItem(selectedARow);
                            if (aDataItem && aDataItem.AufgabenNr) {
                                // currentAufgabenNr setzen, wenn Aktion selektiert wird
                                localStorage.setItem("currentAufgabenNr", aDataItem.AufgabenNr);
                                console.log("currentAufgabenNr gesetzt:", aDataItem.AufgabenNr);
                            }
                        },
                        columns: [
                            { field: "AufgabenNr", title: "Aufgaben Nr" },
                            { field: "TerminDatum", title: "Termin Datum", format: "{0:dd.MM.yyyy}" },
                            { field: "TerminUhrzeit", title: "Termin Uhrzeit" },
                            { field: "Beschreibung", title: "Beschreibung" },
                            { field: "Stichwort", title: "Stichwort" },
                            {
                                title: "Aufgabe-Details",
                                template: `<button class='k-button k-primary aufgabe-detail-btn'>Aufgabe Detail</button>`
                            },
                            {
                                title: "Aktion-Details",
                                template: `<button class='k-button k-secondary aktion-detail-btn'>Aktion Detail</button>`
                            }
                        ],
                        dataBound: function(ae) {
                            const aGrid = ae.sender;
                            // Aufgabe Detail
                            aGrid.tbody.find(".aufgabe-detail-btn").on("click", function(evt) {
                                const tr = $(evt.target).closest("tr");
                                const aDataItem = aGrid.dataItem(tr);
                                if (aDataItem && aDataItem.AufgabenNr) {
                                    localStorage.setItem("currentAufgabenNr", aDataItem.AufgabenNr);
                                    console.log("currentAufgabenNr über Aufgabe-Detail-Button gesetzt:", aDataItem.AufgabenNr);
                                    window.location.href = "../html/aufgaben_details.html";
                                }
                            });

                            // Aktion Detail
                            aGrid.tbody.find(".aktion-detail-btn").on("click", function(evt) {
                                const tr = $(evt.target).closest("tr");
                                const aDataItem = aGrid.dataItem(tr);
                                if (aDataItem && aDataItem.AktionNr) {
                                    localStorage.setItem("currentAktionNr", aDataItem.AktionNr);
                                    console.log("currentAktionNr über Aktion-Detail-Button gesetzt:", aDataItem.AktionNr);
                                    window.location.href = "../html/aktion.html";
                                } else {
                                    console.warn("Keine AktionNr im Datensatz vorhanden!");
                                }
                            });
                        }
                    });
                } catch (error) {
                    console.error("Fehler beim Laden der Kontaktpersonen:", error);
                    e.detailCell.find(".kontaktpersonen-grid").html("<div class='error'>Fehler beim Laden der Kontaktpersonen.</div>");
                } finally {
                    loader.remove();
                }
            },
            columns: [
                {
                    title: "Details",
                    template: `<button class='k-button k-primary kunden-detail-btn'>Detail</button>`
                },
                { field: "Mandant", title: "Mandant" },
                { field: "KundenNr", title: "Kunden Nr" },
                { field: "Kunde", title: "Kunde" },
                { field: "Adresse", title: "Adresse" },
                { field: "TelefonNr", title: "Telefon" },
                { field: "EMail", title: "E-Mail" },
                { field: "UmsatzsteuerId", title: "UmsatzsteuerId" }
            ]
        });
    }
}

function calculateGridHeight() {
    const windowHeight = window.innerHeight;
    const headerHeight = document.getElementById('header').offsetHeight;
    const paddingBottom = 150;

    return windowHeight - headerHeight - paddingBottom;
}
