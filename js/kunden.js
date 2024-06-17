import { API_URL, APP_ID } from './app.js';
import { loadKunden } from './load_kunden.js';

$(document).ready(function () {
    const fetchKundenData = async () => {
        const db = await openIndexedDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['kunden'], 'readonly');
            const store = transaction.objectStore('kunden');
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
                if (!db.objectStoreNames.contains('kunden')) {
                    db.createObjectStore('kunden', { keyPath: 'KundenNr' });
                }
            };
            request.onsuccess = (event) => resolve(event.target.result);
            request.onerror = (event) => reject(event.target.error);
        });
    };

    const initializeGrid = async () => {
        const kundenData = await fetchKundenData();

        $("#grid").kendoGrid({
            dataSource: {
                data: kundenData,
                pageSize: 10,
                schema: {
                    model: {
                        fields: {
                            KundenNr: { type: "number" },
                            Kunde: { type: "string" },
                            Name1: { type: "string" },
                            Name2: { type: "string" },
                            Name3: { type: "string" },
                            Strasse: { type: "string" },
                            Plz: { type: "string" },
                            Ort: { type: "string" },
                            Land: { type: "string" },
                            TelefonNr: { type: "string" },
                            gesperrt: { type: "boolean" },
                            KundenSicht: { type: "string" },
                            Kontoart: { type: "string" },
                            HotlineSperre: { type: "boolean" },
                            Adresse: { type: "string" },
                            URL: { type: "string" },
                            EMail: { type: "string" },
                            Partner: { type: "string" },
                            Privatperson: { type: "boolean" },
                            Anrede: { type: "string" },
                            Titel: { type: "string" },
                            Vorname: { type: "string" },
                            Nachname: { type: "string" },
                            DSGVO: { type: "boolean" }
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
                { field: "KundenNr", title: "Kunden Nr", width: "150px" },
                { field: "Kunde", title: "Kunde", width: "150px" },
                { field: "Name1", title: "Name 1", width: "150px" },
                { field: "Name2", title: "Name 2", width: "150px" },
                { field: "Name3", title: "Name 3", width: "150px" },
                { field: "Strasse", title: "Strasse", width: "150px" },
                { field: "Plz", title: "PLZ", width: "100px" },
                { field: "Ort", title: "Ort", width: "150px" },
                { field: "Land", title: "Land", width: "100px" },
                { field: "TelefonNr", title: "Telefon Nr", width: "150px" },
                { field: "gesperrt", title: "Gesperrt", width: "100px" },
                { field: "KundenSicht", title: "Kunden Sicht", width: "150px" },
                { field: "Kontoart", title: "Kontoart", width: "100px" },
                { field: "HotlineSperre", title: "Hotline Sperre", width: "100px" },
                { field: "Adresse", title: "Adresse", width: "250px" },
                { field: "URL", title: "URL", width: "150px" },
                { field: "EMail", title: "E-Mail", width: "150px" },
                { field: "Partner", title: "Partner", width: "150px" },
                { field: "Privatperson", title: "Privatperson", width: "100px" },
                { field: "Anrede", title: "Anrede", width: "100px" },
                { field: "Titel", title: "Titel", width: "100px" },
                { field: "Vorname", title: "Vorname", width: "150px" },
                { field: "Nachname", title: "Nachname", width: "150px" },
                { field: "DSGVO", title: "DSGVO", width: "100px" }
            ],
            detailTemplate: kendo.template(
                "<div class='detail-view'>" +
                "<p><strong>Kunden Nr:</strong> #: KundenNr #</p>" +
                "<p><strong>Kunde:</strong> #: Kunde #</p>" +
                "<p><strong>Name 1:</strong> #: Name1 #</p>" +
                "<p><strong>Name 2:</strong> #: Name2 #</p>" +
                "<p><strong>Name 3:</strong> #: Name3 #</p>" +
                "<p><strong>Strasse:</strong> #: Strasse #</p>" +
                "<p><strong>PLZ:</strong> #: Plz #</p>" +
                "<p><strong>Ort:</strong> #: Ort #</p>" +
                "<p><strong>Land:</strong> #: Land #</p>" +
                "<p><strong>Telefon Nr:</strong> #: TelefonNr #</p>" +
                "<p><strong>Gesperrt:</strong> #: gesperrt #</p>" +
                "<p><strong>Kunden Sicht:</strong> #: KundenSicht #</p>" +
                "<p><strong>Kontoart:</strong> #: Kontoart #</p>" +
                "<p><strong>Hotline Sperre:</strong> #: HotlineSperre #</p>" +
                "<p><strong>Adresse:</strong> #: Adresse #</p>" +
                "<p><strong>URL:</strong> #: URL #</p>" +
                "<p><strong>E-Mail:</strong> #: EMail #</p>" +
                "<p><strong>Partner:</strong> #: Partner #</p>" +
                "<p><strong>Privatperson:</strong> #: Privatperson #</p>" +
                "<p><strong>Anrede:</strong> #: Anrede #</p>" +
                "<p><strong>Titel:</strong> #: Titel #</p>" +
                "<p><strong>Vorname:</strong> #: Vorname #</p>" +
                "<p><strong>Nachname:</strong> #: Nachname #</p>" +
                "<p><strong>DSGVO:</strong> #: DSGVO #</p>" +
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
            await loadKunden();
            const updatedData = await fetchKundenData();
            const grid = $("#grid").data("kendoGrid");
            grid.dataSource.data(updatedData);
        });

        $("#search").on("input", function () {
            const value = $(this).val();
            const grid = $("#grid").data("kendoGrid");
            grid.dataSource.filter({
                logic: "or",
                filters: [
                    { field: "KundenNr", operator: "contains", value: value },
                    { field: "Kunde", operator: "contains", value: value },
                    { field: "Name1", operator: "contains", value: value },
                    { field: "Name2", operator: "contains", value: value },
                    { field: "Name3", operator: "contains", value: value },
                    { field: "Strasse", operator: "contains", value: value },
                    { field: "Plz", operator: "contains", value: value },
                    { field: "Ort", operator: "contains", value: value },
                    { field: "Land", operator: "contains", value: value },
                    { field: "TelefonNr", operator: "contains", value: value }
                ]
            });
        });
    };

    initializeGrid();

    document.getElementById('home-icon').addEventListener('click', () => {
        window.location.href = '/CRM/html/menue.html';
    });
});
