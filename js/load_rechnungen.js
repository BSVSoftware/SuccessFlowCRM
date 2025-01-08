import { API_URL,APP_RQ } from './app.js';

export async function loadRechnungen() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const kundenNr = parseInt(urlParams.get('KundenNr'), 10);
        const sid = localStorage.getItem('SID');

        const response = await fetch(`${API_URL}${APP_RQ}&ARGUMENTS=-Agetrechnungsbuch`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'SID': sid
            },
            body: JSON.stringify({ KundenNr: kundenNr })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const rechnungenText = await response.text();
        const rechnungen = JSON.parse(rechnungenText);

        $("#grid").kendoGrid({
            dataSource: {
                transport: {
                    read: async function(options) {
                        try {
                            const response = await fetch(`${API_URL}${APP_RQ}&ARGUMENTS=-Agetrechnungsbuch`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'SID': sid
                                },
                                body: JSON.stringify({ KundenNr: kundenNr })
                            });

                            if (!response.ok) {
                                throw new Error(`HTTP error! status: ${response.status}`);
                            }

                            const rechnungenText = await response.text();
                            const rechnungen = JSON.parse(rechnungenText);
                            options.success(rechnungen);
                        } catch (error) {
                            options.error(error);
                        }
                    }
                },
                schema: {
                    model: {
                        fields: {
                            KundenNr: { type: "number" },
                            Kunde: { type: "string" },
                            RechnungNr: { type: "number" },
                            Datum: { type: "date", parse: (value) => kendo.parseDate(value, "dd.MM.yy") },
                            Netto: { type: "number" },
                            Brutto: { type: "number" },
                            bezahlt: { type: "number" }
                        }
                    }
                },
                pageSize: 20
            },
            height: calculateGridHeight(),
            sortable: true,
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
            filterable: true,
            selectable: "row",
            columns: [
                { field: "KundenNr", title: "KundenNr", width: "120px" },
                { field: "Kunde", title: "Kunde", width: "200px" },
                { field: "RechnungNr", title: "Nr.", width: "150px" },
                { field: "Datum", title: "Datum", width: "150px", format: "{0:dd.MM.yy}", filterable: { ui: "datepicker" } },
                { field: "Netto", title: "Netto", width: "100px", format: "{0:c2}", attributes: { "class": "text-right" } },
                { field: "Brutto", title: "Bruttobetrag", width: "150px", format: "{0:c2}", attributes: { "class": "text-right" } },
                { field: "bezahlt", title: "Bezahlt", width: "100px", format: "{0:c2}", attributes: { "class": "text-right" } },
                {
                    command: {
                        text: "Details",
                        click: (e) => {
                            const tr = $(e.target).closest("tr");
                            const data = $("#grid").data("kendoGrid").dataItem(tr);
                            window.location.href = `../html/zahlung.html?RechnungNr=${data.RechnungNr}&BruttoBetrag=${data.Brutto}`;
                        }
                    },
                    title: " ",
                    width: "150px"
                }
            ]
        });
    } catch (error) {
        console.error('Fehler beim Laden der Rechnungen:', error);
    }
}

function calculateGridHeight() {
    const windowHeight = $(window).height();
    const headerHeight = $('#header').outerHeight(true);
    const searchContainerHeight = $('.search-container').outerHeight(true);
    return windowHeight - headerHeight - searchContainerHeight - 30;
}
