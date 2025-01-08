import { openIndexedDB } from './indexedDB.js';
import { loadTermine }     from './load_termine.js';

$(document).ready(async function () {
    try {
        // 1) MultiSelect initialisieren => leere DataSource
        initMultiMitarbeiter();

        // 2) Laden wir die Mitarbeiter-Liste aus IndexedDB => befüllen die MultiSelect
        await populateMultiMitarbeiter();

        // 3) Scheduler: bereits vorhandene Termine aus IDB laden
        const termineData = await fetchTermineFromIndexedDB();
        initializeScheduler(termineData);

    } catch (error) {
        console.error('Fehler beim Laden der Termine:', error);
    }

    // Back-Button => window.history.back()
    $("#back-button").on("click", function () {
        window.history.back();
    });
    // Home-Icon => menue.html
    $("#home-icon").on("click", function () {
        window.location.href = "../html/menue.html";
    });
    // Refresh => Standard-laden (z.B. currentMitarbeiterNr)
    $("#refresh-button").on("click", async function () {
        try {
            await refreshTermine();
        } catch (error) {
            console.error('Fehler beim Aktualisieren der Termine:', error);
        }
    });

    // Mehrfach-Lade-Knopf
    $("#load-multi-termine").on("click", async function () {
        await loadTermineForMultipleMitarbeiter();
    });
});

/**
 * Legt die Kendo MultiSelect-Struktur an.
 */
function initMultiMitarbeiter() {
    $("#multiMitarbeiter").kendoMultiSelect({
        dataTextField: "Name",         // was angezeigt wird
        dataValueField: "MitarbeiterNr", // interner Wert
        placeholder: "Mitarbeiter auswählen...",
        filter: "contains",
        // autoClose: false, // optional: ob das Popup sofort zugeht
        clearButton: true
    });
}

/**
 * Liest "vertriebler" aus IndexedDB => befüllt MultiSelect "multiMitarbeiter".
 */
async function populateMultiMitarbeiter() {
    const db = await openIndexedDB();
    const tx = db.transaction(["vertriebler"], "readonly");
    const store = tx.objectStore("vertriebler");
    const req = store.getAll();

    return new Promise((resolve, reject) => {
        req.onsuccess = () => {
            const data = req.result || [];
            // Sortieren nach Name (falls gewünscht)
            data.sort((a, b) => a.Name.localeCompare(b.Name));

            // DataSource an KendoMultiSelect geben
            const multi = $("#multiMitarbeiter").data("kendoMultiSelect");
            multi.setDataSource(data);

            resolve();
        };
        req.onerror = e => {
            console.error("Fehler beim Laden der vertriebler:", e.target.error);
            reject(e.target.error);
        };
    });
}

/**
 * Holt alle Termine aus IDB => mappt => returned array
 */
async function fetchTermineFromIndexedDB() {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(["termine"], "readonly");
        const store = transaction.objectStore("termine");
        const request = store.getAll();

        request.onsuccess = () => {
            const raw = request.result || [];
            const termineData = raw.map(mapTermineForScheduler);
            resolve(termineData);
        };
        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

/**
 * Konvertiert DB-Eintrag in Kendo-Datensatz
 */
function mapTermineForScheduler(termin) {
    return {
        id:          termin.TerminId,
        title:       termin.Beschreibung || "Ohne Beschreibung",
        description: termin.Detail || "",
        start:       convertToDateTime(termin.Termindatum, termin.Begin),
        end:         convertToDateTime(termin.Termindatum, termin.Ende),
        mitarbeiterNr: Number(termin.MitarbeiterNr) || 0
    };
}

function convertToDateTime(dStr, tStr) {
    if (!dStr) return new Date();
    const [dd, mm, yyyy] = dStr.split(".").map(Number);
    let hh = 0, min = 0;
    if (tStr && tStr.includes(":")) {
        [hh, min] = tStr.split(":").map(Number);
    }
    return new Date(yyyy, mm - 1, dd, hh, min);
}

/**
 * Scheduler-Init => Resource pro distinct mitarbeiterNr.
 */
function initializeScheduler(termineData) {
    $("#scheduler").kendoScheduler({
        date: new Date(),
        messages: {
            today:     "Heute",
            save:      "Speichern",
            cancel:    "Abbrechen",
            destroy:   "Löschen",
            allDay:    "Ganzer Tag",
            date:      "Datum",
            event:     "Termin",
            views: {
                day:   "Tag",
                week:  "Woche",
                month: "Monat",
                agenda:"Agenda"
            },
        },
        startTime: new Date(new Date().setHours(8,0,0,0)),
        endTime:   new Date(new Date().setHours(18,0,0,0)),
        height: calculateGridHeight(),
        views: [
            "day",
            { type: "week", selected: true },
            "month",
            "agenda"
        ],
        editable: false,
        // WICHTIG: Hier die Resource definitieren MIT dataTextField/dataValueField/dataColorField
        resources: [{
            field: "mitarbeiterNr",
            name:  "MitarbeiterResource",
            dataTextField: "text",
            dataValueField: "value",
            dataColorField: "color",   // <- damit die Day/Week/Month das farblich umsetzen
            dataSource: [],            // füllen wir in dataBound
            valuePrimitive: true,
            title: "Mitarbeiter"
        }],
        dataSource: {
            data: termineData,
            schema: {
                model: {
                    id: "id",
                    fields: {
                        id: { type: "number" },
                        title: { type: "string" },
                        start: { type: "date" },
                        end:   { type: "date" },
                        // Wichtig: Name passt zu 'field:"mitarbeiterNr"'
                        mitarbeiterNr: { type: "number" }
                    }
                }
            }
        },
        dataBound: function(e) {
            // Resource colors je distinct mitarbeiterNr
            const scheduler = e.sender;
            const dataItems = scheduler.dataSource.view();
            const distinctM = [...new Set(dataItems.map(ev => ev.mitarbeiterNr))];

            // Beliebige Farben definieren
            const MITARBEITER_COLORS = [
                "#FF5733","#33FF57","#3357FF","#AA33FF","#FF33AA",
                "#FFD433","#43FFD4","#B833FF"  // etc.
            ];

            const resourceDs = distinctM.map((mNr, idx) => {
                // color = MITARBEITER_COLORS[idx % ...]
                return {
                    text:  `Mitarbeiter ${mNr}`,         // dataTextField
                    value: mNr,                         // dataValueField
                    color: MITARBEITER_COLORS[idx % MITARBEITER_COLORS.length]
                };
            });

            if (scheduler.resources && scheduler.resources.length > 0) {
                scheduler.resources[0].dataSource.data(resourceDs);
            }
        }
    });
}


/**
 * Ruft loadTermine(...) normal für *einen* Mitarbeiter auf – wir leeren erst die DB,
 * durchlaufen alle ausgewählten IDs und laden nacheinander.
 */
async function loadTermineForMultipleMitarbeiter() {
    const multi = $("#multiMitarbeiter").data("kendoMultiSelect");
    const selectedValues = multi.value(); // array der MitarbeiterNr

    if (!selectedValues || selectedValues.length === 0) {
        alert("Bitte mindestens einen Mitarbeiter auswählen!");
        return;
    }

    // Store 'termine' löschen
    await clearTermineStore();

    // Dann pro MitarbeiterNr => loadTermine(mitNr)
    for (let i = 0; i < selectedValues.length; i++) {
        const mitNr = selectedValues[i];
        console.log("Lade Termine für MitarbeiterNr:", mitNr);
        await loadTermine(mitNr);
    }

    // Scheduler refresh
    const updated = await fetchTermineFromIndexedDB();
    const scheduler = $("#scheduler").data("kendoScheduler");
    scheduler.dataSource.data(updated);
    scheduler.refresh();
}

/**
 * Alle Einträge in 'termine' löschen, damit wir komplett frische Daten bekommen.
 */
async function clearTermineStore() {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(["termine"], "readwrite");
        const store = tx.objectStore("termine");
        const clearReq = store.clear();

        clearReq.onsuccess = () => resolve();
        clearReq.onerror   = e => reject(e.target.error);
    });
}

/**
 * „Standard“-Refresh: loadTermine() für localStorage-MitarbeiterNr + neu binden.
 */
async function refreshTermine() {
    await loadTermine(); // Standard => currentMitarbeiterNr
    const updated = await fetchTermineFromIndexedDB();
    const scheduler = $("#scheduler").data("kendoScheduler");
    scheduler.dataSource.data(updated);
    scheduler.refresh();
    alert("Termine wurden aktualisiert (1 Mitarbeiter).");
}
function calculateGridHeight() {
    const windowHeight = $(window).height();
    const headerHeight = $('#header').outerHeight(true);
    const searchContainerHeight = $('.search-container').outerHeight(true);
    return windowHeight - headerHeight - searchContainerHeight ;
}