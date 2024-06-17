import { API_URL, APP_ID } from './app.js';
import { loadTelefonbuch } from './load_telefonbuch.js';

$(document).ready(function () {
    const fetchTelefonbuchData = async () => {
        const db = await openIndexedDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['telefonbuch'], 'readonly');
            const store = transaction.objectStore('telefonbuch');
            const request = store.getAll();

            request.onsuccess = () => {
                resolve(request.result);
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
                if (!db.objectStoreNames.contains('telefonbuch')) {
                    db.createObjectStore('telefonbuch', { keyPath: 'lfdNr' });
                }
            };
            request.onsuccess = (event) => resolve(event.target.result);
            request.onerror = (event) => reject(event.target.error);
        });
    };

    const initializeGrid = async () => {
        const telefonbuchData = await fetchTelefonbuchData();

        $("#grid").kendoGrid({
            dataSource: {
                data: telefonbuchData,
                pageSize: 10,
                schema: {
                    model: {
                        fields: {
                            Name: { type: "string" },
                            Telefon: { type: "string" },
                            EMail: { type: "string" },
                            Ort: { type: "string" }
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
                { field: "Name", title: "Name", width: "200px" },
                { field: "Telefon", title: "Telefon", width: "150px" },
                { field: "EMail", title: "E-Mail" },
                { field: "Ort", title: "Ort" }
            ],
            detailTemplate: kendo.template(
                "<div class='detail-view'>" +
                "<p><strong>Name:</strong> #: Name #</p>" +
                "<p><strong>Telefon:</strong> <a href='tel:#: Telefon #' class='phone-link'>#: Telefon #</a></p>" +
                "<p><strong>E-Mail:</strong> <a href='mailto:#: EMail #' class='email-link'>#: EMail #</a></p>" +
                "<p><strong>Ort:</strong> <a href='https://www.google.com/maps/search/?api=1&query=#: Ort #' target='_blank' class='location-link'>#: Ort #</a></p>" +
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
            await loadTelefonbuch();
            const updatedData = await fetchTelefonbuchData();
            const grid = $("#grid").data("kendoGrid");
            grid.dataSource.data(updatedData);
        });

        $("#search").on("input", function () {
            const value = $(this).val();
            const grid = $("#grid").data("kendoGrid");
            grid.dataSource.filter({
                logic: "or",
                filters: [
                    { field: "Name", operator: "contains", value: value },
                    { field: "Telefon", operator: "contains", value: value },
                    { field: "EMail", operator: "contains", value: value },
                    { field: "Ort", operator: "contains", value: value }
                ]
            });
        });
    };

    initializeGrid();

    document.getElementById('home-icon').addEventListener('click', () => {
        window.location.href = '/CRM/html/menue.html';
    });
});
