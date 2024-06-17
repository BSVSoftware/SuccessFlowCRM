import { API_URL, APP_ID } from './app.js';

$(document).ready(async function () {
    const urlParams = new URLSearchParams(window.location.search);
    const ticketNr = urlParams.get('ticketNr');

    const fetchAufgabe = async (ticketNr) => {
        const db = await openIndexedDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['aufgaben'], 'readonly');
            const store = transaction.objectStore('aufgaben');
            const request = store.get(Number(ticketNr));

            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject(event.target.error);
        });
    };

    const fetchKunden = async () => {
        const db = await openIndexedDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['kunden'], 'readonly');
            const store = transaction.objectStore('kunden');
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject(event.target.error);
        });
    };

    const openIndexedDB = () => {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('SuccessFlowCRM', 1);
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('aufgaben')) {
                    db.createObjectStore('aufgaben', { keyPath: 'TicketNr' });
                }
                if (!db.objectStoreNames.contains('aktionen')) {
                    const store = db.createObjectStore('aktionen', { keyPath: 'AktionNr' });
                    store.createIndex('AufgabenNr', 'AufgabenNr', { unique: false });
                }
                if (!db.objectStoreNames.contains('kunden')) {
                    db.createObjectStore('kunden', { keyPath: 'KundenNr' });
                }
            };
            request.onsuccess = (event) => resolve(event.target.result);
            request.onerror = (event) => reject(event.target.error);
        });
    };

    const aufgabe = await fetchAufgabe(ticketNr);
    const kunden = await fetchKunden();

    const formItems = [
        { field: "TicketNr", label: "Ticket Nr", editor: "TextBox", editorOptions: { readonly: true } },
        { field: "Stichwort", label: "Stichwort", editor: "TextBox", editorOptions: { readonly: true } },
        { field: "Kunde", label: "Kunde", editor: "TextBox", editorOptions: { readonly: true } },
        { field: "Warteraum", label: "Warteraum", editor: "TextBox", editorOptions: { readonly: true } },
        { field: "aktDatum", label: "Akt Datum", editor: "DatePicker", editorOptions: { readonly: true } },
        { field: "aktZeit", label: "Akt Zeit", editor: "TextBox", editorOptions: { readonly: true } },
        { field: "Prioritaet", label: "Priorität", editor: "TextBox", editorOptions: { readonly: true } },
        { field: "RestzeitMinuten", label: "Restzeit Minuten", editor: "TextBox", editorOptions: { readonly: true } },
        { field: "Fehlermeldung", label: "Fehlermeldung", editor: "TextBox", editorOptions: { readonly: true } },
        { field: "Behebung", label: "Behebung", editor: "TextBox", editorOptions: { readonly: true } },
        { field: "KundenNr", label: "Kunden Nr", editor: "TextBox", editorOptions: { readonly: true } },
        { field: "IDNR", label: "ID NR", editor: "TextBox", editorOptions: { readonly: true } },
        { field: "SNR", label: "SNR", editor: "TextBox", editorOptions: { readonly: true } },
        { field: "Vertragsart", label: "Vertragsart", editor: "TextBox", editorOptions: { readonly: true } },
        { field: "Vertragsbereich", label: "Vertragsbereich", editor: "TextBox", editorOptions: { readonly: true } },
        { field: "Vertragsnummer", label: "Vertragsnummer", editor: "TextBox", editorOptions: { readonly: true } },
        { field: "Restkontingent", label: "Restkontingent", editor: "TextBox", editorOptions: { readonly: true } },
        { field: "Ansprechpartner", label: "Ansprechpartner", editor: "TextBox", editorOptions: { readonly: true } },
        { field: "Telefon", label: "Telefon", editor: "TextBox", editorOptions: { readonly: true } },
        { field: "EMail", label: "E-Mail", editor: "TextBox", editorOptions: { readonly: true } },
        { field: "extTicketNr", label: "Externe Ticket Nr", editor: "TextBox", editorOptions: { readonly: true } },
        { field: "FahrtpauschaleNr", label: "Fahrtpauschale Nr", editor: "TextBox", editorOptions: { readonly: true } },
        { field: "Modell", label: "Modell", editor: "TextBox", editorOptions: { readonly: true } }
    ];

    $("#details").kendoForm({
        formData: aufgabe,
        items: formItems
    });

    $('#fab-items').kendoFloatingActionButton({
        align: 'top start',
        icon: 'more-vertical',
        items: [{
            label: 'Bearbeiten',
            icon: 'edit',
            click: function() {
                $("#details").kendoForm({
                    formData: aufgabe,
                    items: formItems.map(item => {
                        if (item.field === "Stichwort") {
                            return { ...item, editorOptions: { readonly: false } };
                        }
                        return item;
                    })
                });
            }
        }, {
            label: 'Erstellen',
            icon: 'plus',
            click: function() {
                $("#details").kendoForm({
                    formData: {},
                    items: formItems.map(item => {
                        if (item.field === "Stichwort") {
                            return { ...item, editorOptions: { readonly: false } };
                        }
                        if (item.field === "Kunde") {
                            return {
                                ...item,
                                editor: "DropDownList",
                                editorOptions: {
                                    dataSource: kunden,
                                    dataTextField: "Name",
                                    dataValueField: "KundenNr"
                                }
                            };
                        }
                        return item;
                    })
                });
            }
        }]
    });

    document.getElementById('save-button').addEventListener('click', function() {
        // Speichern-Logik hier
        alert('Änderungen gespeichert.');
    });

    document.getElementById('cancel-button').addEventListener('click', function() {
        // Abbruch-Logik hier
        window.location.href = '/CRM/html/aufgaben.html';
    });

    document.getElementById('home-icon').addEventListener('click', () => {
        window.location.href = '/CRM/html/aufgaben.html';
    });
});
