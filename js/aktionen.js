import { API_URL, APP_ID } from './app.js';
import { loadAktionen } from './load_aktionen.js';

$(document).ready(function () {
    const fetchAktionenData = async () => {
        const db = await openIndexedDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['aktionen'], 'readonly');
            const store = transaction.objectStore('aktionen');
            const request = store.getAll();

            request.onsuccess = () => {
                const result = request.result.map(entry => {
                    if (entry.erstelltam) entry.erstelltam = new Date(entry.erstelltam).toLocaleDateString('de-DE');
                    if (entry.erledigtam) entry.erledigtam = new Date(entry.erledigtam).toLocaleDateString('de-DE');
                    if (entry.TerminDatum) entry.TerminDatum = new Date(entry.TerminDatum).toLocaleDateString('de-DE');
                    return entry;
                });
                resolve(result);
            };
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    };

    const openIndexedDB = () => {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('SuccessFlowCRM', 1);
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('aktionen')) {
                    db.createObjectStore('aktionen', { keyPath: 'AktionNr' });
                }
            };
            request.onsuccess = (event) => resolve(event.target.result);
            request.onerror = (event) => reject(event.target.error);
        });
    };

    const initializeGrid = async () => {
        const aktionenData = await fetchAktionenData();

        $("#grid").kendoGrid({
            dataSource: {
                data: aktionenData,
                pageSize: 10,
                schema: {
                    model: {
                        fields: {
                            AktionNr: { type: "number" },
                            AufgabenNr: { type: "number" },
                            erstelltam: { type: "date" },
                            erstelltum: { type: "string" },
                            erstelltvon: { type: "string" },
                            Kuerzel: { type: "string" },
                            Aktion: { type: "string" },
                            Beschreibung: { type: "string" },
                            neuerStatus: { type: "string" },
                            externeInfo: { type: "string" },
                            interneInfo: { type: "string" },
                            erledigt: { type: "boolean" },
                            erledigtam: { type: "date" },
                            erledigtum: { type: "string" },
                            Folgestatus: { type: "string" },
                            TerminDatum: { type: "date" },
                            TerminUhrzeit: { type: "string" },
                            TerminDauer: { type: "string" },
                            Kunde: { type: "string" },
                            Kontaktperson: { type: "string" },
                            Stichwort: { type: "string" },
                            EMail: { type: "string" }
                        }
                    }
                },
                filter: {
                    logic: "or",
                    filters: []
                }
            },
            pageable: {
                refresh: true,
                pageSizes: [5, 10, 20, 100, 500],
                buttonCount: 5
            },
            groupable: true,
            sortable: true,
            filterable: true,
            scrollable: true,
            resizable: true,
            reorderable: true,
            columns: [
                { field: "AktionNr", title: "Aktion Nr", width: "150px" },
                { field: "AufgabenNr", title: "Aufgaben Nr", width: "150px" },
                { field: "erstelltam", title: "Erstellt am", width: "150px" },
                { field: "erstelltum", title: "Erstellt um", width: "150px" },
                { field: "erstelltvon", title: "Erstellt von", width: "150px" },
                { field: "Kuerzel", title: "Kürzel", width: "150px" },
                { field: "Aktion", title: "Aktion", width: "150px" },
                { field: "Beschreibung", title: "Beschreibung", width: "150px" },
                { field: "neuerStatus", title: "Neuer Status", width: "150px" },
                { field: "TerminDatum", title: "Termin Datum", width: "150px" }
            ],
            detailTemplate: kendo.template(
                "<div class='detail-view'>" +
                "<p><strong>Aktion Nr:</strong> #: AktionNr #</p>" +
                "<p><strong>Aufgaben Nr:</strong> #: AufgabenNr #</p>" +
                "<p><strong>Erstellt am:</strong> #: erstelltam #</p>" +
                "<p><strong>Erstellt um:</strong> #: erstelltum #</p>" +
                "<p><strong>Erstellt von:</strong> #: erstelltvon #</p>" +
                "<p><strong>Kürzel:</strong> #: Kuerzel #</p>" +
                "<p><strong>Aktion:</strong> #: Aktion #</p>" +
                "<p><strong>Beschreibung:</strong> #: Beschreibung #</p>" +
                "<p><strong>Neuer Status:</strong> #: neuerStatus #</p>" +
                "<p><strong>Externe Info:</strong> #: externeInfo #</p>" +
                "<p><strong>Interne Info:</strong> #: interneInfo #</p>" +
                "<p><strong>Erledigt:</strong> #: erledigt #</p>" +
                "<p><strong>Erledigt am:</strong> #: erledigtam #</p>" +
                "<p><strong>Erledigt um:</strong> #: erledigtum #</p>" +
                "<p><strong>Folgestatus:</strong> #: Folgestatus #</p>" +
                "<p><strong>Termin Datum:</strong> #: TerminDatum #</p>" +
                "<p><strong>Termin Uhrzeit:</strong> #: TerminUhrzeit #</p>" +
                "<p><strong>Termin Dauer:</strong> #: TerminDauer #</p>" +
                "<p><strong>Kunde:</strong> #: Kunde #</p>" +
                "<p><strong>Kontaktperson:</strong> #: Kontaktperson #</p>" +
                "<p><strong>Stichwort:</strong> #: Stichwort #</p>" +
                "<p><strong>E-Mail:</strong> #: EMail #</p>" +
                "</div>"
            ),
            detailInit: function (e) {
                e.detailRow.find(".detail-view").show();
            },
            noRecords: {
                template: "Keine Daten verfügbar"
            }
        });

        // Add event listener for the refresh button in the pager
        $(".k-pager-refresh").on("click", async () => {
            await loadAktionen();
            const updatedData = await fetchAktionenData();
            const grid = $("#grid").data("kendoGrid");
            grid.dataSource.data(updatedData);
        });

        $("#search").on("input", function () {
            const value = $(this).val();
            const grid = $("#grid").data("kendoGrid");
            grid.dataSource.filter({
                logic: "or",
                filters: [
                    { field: "AktionNr", operator: "contains", value: value },
                    { field: "AufgabenNr", operator: "contains", value: value },
                    { field: "erstelltam", operator: "contains", value: value },
                    { field: "erstelltvon", operator: "contains", value: value },
                    { field: "Kuerzel", operator: "contains", value: value }
                ]
            });
        });
    };

    initializeGrid();

    document.getElementById('home-icon').addEventListener('click', () => {
        window.location.href = '/CRM/html/menue.html';
    });
});
