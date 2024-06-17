import { API_URL, APP_ID } from './app.js';
import { loadAnbahnungen } from './load_anbahnungen.js';

$(document).ready(function () {
    const fetchAnbahnungenData = async () => {
        const db = await openIndexedDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['anbahnungen'], 'readonly');
            const store = transaction.objectStore('anbahnungen');
            const request = store.getAll();

            request.onsuccess = () => {
                const result = request.result.map(entry => {
                    if (entry.erstelltam) entry.erstelltam = new Date(entry.erstelltam).toLocaleDateString('de-DE');
                    if (entry.letzteTaetigkeitam) entry.letzteTaetigkeitam = new Date(entry.letzteTaetigkeitam).toLocaleDateString('de-DE');
                    if (entry.Abschluss) entry.Abschluss = new Date(entry.Abschluss).toLocaleDateString('de-DE');
                    if (entry.RatingAnpassungam) entry.RatingAnpassungam = new Date(entry.RatingAnpassungam).toLocaleDateString('de-DE');
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
                if (!db.objectStoreNames.contains('anbahnungen')) {
                    db.createObjectStore('anbahnungen', { keyPath: 'AnbahnungNr' });
                }
            };
            request.onsuccess = (event) => resolve(event.target.result);
            request.onerror = (event) => reject(event.target.error);
        });
    };

    const initializeGrid = async () => {
        const anbahnungenData = await fetchAnbahnungenData();

        $("#grid").kendoGrid({
            dataSource: {
                data: anbahnungenData,
                pageSize: 10,
                schema: {
                    model: {
                        fields: {
                            AnbahnungNr: { type: "number" },
                            Besitzer: { type: "string" },
                            Beschreibung: { type: "string" },
                            KundenNr: { type: "number" },
                            Kunde: { type: "string" },
                            Gruppe: { type: "string" },
                            UmsatzPlan: { type: "number" },
                            UmsatzIst: { type: "number" },
                            UmsatzGewichtet: { type: "number" },
                            erstelltam: { type: "date" },
                            Wahrscheinlichkeit: { type: "number" },
                            Abschluss: { type: "date" },
                            letzteTaetigkeitam: { type: "date" },
                            RatingBemerkung: { type: "string" },
                            RatingAnpassungam: { type: "date" }
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
                pageSizes: [5, 10, 20],
                buttonCount: 5
            },
            sortable: true,
            filterable: true,
            scrollable: true,
            resizable: true,
            reorderable: true,
            columns: [
                { field: "AnbahnungNr", title: "Anbahnung Nr", width: "150px" },
                { field: "Besitzer", title: "Besitzer", width: "150px" },
                { field: "Beschreibung", title: "Beschreibung", width: "250px" },
                { field: "Kunde", title: "Kunde", width: "150px" },
                { field: "UmsatzPlan", title: "Umsatz Plan", width: "100px" },
                { field: "UmsatzIst", title: "Umsatz Ist", width: "100px" },
                { field: "Wahrscheinlichkeit", title: "Wahrscheinlichkeit", width: "150px" },
                { field: "Abschluss", title: "Abschluss", width: "150px" },
                { field: "letzteTaetigkeitam", title: "Letzte Tätigkeit am", width: "150px" }
            ],
            detailTemplate: kendo.template(
                "<div class='detail-view'>" +
                "<p><strong>Anbahnung Nr:</strong> #: AnbahnungNr #</p>" +
                "<p><strong>Besitzer:</strong> #: Besitzer #</p>" +
                "<p><strong>Beschreibung:</strong> #: Beschreibung #</p>" +
                "<p><strong>Kunden Nr:</strong> #: KundenNr #</p>" +
                "<p><strong>Kunde:</strong> #: Kunde #</p>" +
                "<p><strong>Gruppe:</strong> #: Gruppe #</p>" +
                "<p><strong>Umsatz Plan:</strong> #: UmsatzPlan #</p>" +
                "<p><strong>Umsatz Ist:</strong> #: UmsatzIst #</p>" +
                "<p><strong>Umsatz Gewichtet:</strong> #: UmsatzGewichtet #</p>" +
                "<p><strong>Erstellt am:</strong> #: erstelltam #</p>" +
                "<p><strong>Wahrscheinlichkeit:</strong> #: Wahrscheinlichkeit #</p>" +
                "<p><strong>Abschluss:</strong> #: Abschluss #</p>" +
                "<p><strong>Letzte Tätigkeit am:</strong> #: letzteTaetigkeitam #</p>" +
                "<p><strong>Rating Bemerkung:</strong> #: RatingBemerkung #</p>" +
                "<p><strong>Rating Anpassung am:</strong> #: RatingAnpassungam #</p>" +
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
            await loadAnbahnungen();
            const updatedData = await fetchAnbahnungenData();
            const grid = $("#grid").data("kendoGrid");
            grid.dataSource.data(updatedData);
        });

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
    };

    initializeGrid();

    document.getElementById('home-icon').addEventListener('click', () => {
        window.location.href = '/CRM/html/menue.html';
    });
});
