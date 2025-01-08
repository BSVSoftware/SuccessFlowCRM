import { openIndexedDB } from './indexedDB.js';
import { API_URL,APP_RQ } from './app.js';

document.addEventListener('DOMContentLoaded', async () => {
    const anbahnungNr = Number(localStorage.getItem('currentAnbahnungNr'));
    if (!anbahnungNr) {
        alert("Keine gültige Anbahnung Nr gefunden.");
        window.history.back();
        return;
    }

    // Zurück-Button
    document.getElementById('back-button').addEventListener('click', () => {
        window.history.back();
    });

    // IndexedDB öffnen und Anbahnung laden
    const db = await openIndexedDB();
    const anbahnung = await loadAnbahnungFromIndexedDB(db, anbahnungNr);

    // Kendo Widgets initialisieren
    $("#status").kendoDropDownList({
        dataSource: [
            { text: "Inaktiv", value: 'I' },
            { text: "Aktiv", value: 'A' },
            { text: "Archiviert", value: 'Z' }
        ],
        dataTextField: "text",
        dataValueField: "value"
    });

    $("#anbahnungNr").kendoTextBox({ enabled: false });
    $("#beschreibung").kendoTextBox({ clearButton: true });
    $("#kunden-nr").kendoNumericTextBox({ format: "n0", decimals: 0 });
    $("#kunde").kendoTextBox({ enabled: false });
    $("#abschlussdatum").kendoDatePicker({ format: "dd.MM.yyyy" });
    $("#wahrscheinlichkeit").kendoNumericTextBox({ format: "n0", decimals: 0, min: 0, max: 100 });

    $("#letzteTaetigkeitam").kendoDatePicker({ format: "dd.MM.yyyy", enable: false });
    $("#letzteAktion").kendoTextBox({ enabled: false });
    $("#terminDatum").kendoDatePicker({ format: "dd.MM.yyyy", enable: false });
    $("#umsatzGewichtet").kendoNumericTextBox({ format: "c2", decimals: 2, min: 0, enable: false });
    $("#erstelltam").kendoDatePicker({ format: "dd.MM.yyyy", enable: false });
    $("#besitzerKZ").kendoTextBox({ enabled: false });

    $("#umsatzPlan").kendoNumericTextBox({ format: "c2", decimals: 2, min: 0 });
    $("#bruttonutzen").kendoNumericTextBox({ format: "c2", decimals: 2, min: 0 });

    // Felder für gewonnen:
    $("#umsatzIst").kendoNumericTextBox({ format: "c2", decimals: 2, min: 0 });
    $("#abschlussdatumGewonnen").kendoDatePicker({ format: "dd.MM.yyyy" });
    $("#GeschlossenVermerk").kendoTextArea({ rows: 4 });

    // Felder für verloren:
    // Ratings, Grundverloren, Mitbewerber laden
    await loadOptionsFromStore(db, 'ratings', 'RatingNr', 'Rating', '#rating', true);
    await loadOptionsFromStore(db, 'grundverloren', 'Grundschluessel', 'Grund', '#grund', false);
    await loadOptionsFromStore(db, 'mitbewerber', 'MitbewerberNr', 'Mitbewerber', '#mitbewerber', true);

    $("#rating").data("kendoComboBox");
    $("#grund").data("kendoComboBox");
    $("#mitbewerber").data("kendoComboBox");

    // ComboBox für Statusgeschlossen
    $("#statusgeschlossen").kendoComboBox({
        dataSource: [
            { text: "Offen", value: 0 },
            { text: "Gewonnen", value: 1 },
            { text: "Verloren", value: 2 }
        ],
        dataTextField: "text",
        dataValueField: "value",
        clearButton: true,
        placeholder: "Status wählen",
        change: function(e) {
            const combo = e.sender;
            const numValue = Number(combo.value()); // 0,1,2

            if (numValue === 1) {
                // Gewonnen
                $("#gewonnen-fields").show();
                $("#verloren-fields").hide();
            } else if (numValue === 2) {
                // Verloren
                $("#gewonnen-fields").hide();
                $("#verloren-fields").show();
            } else {
                // Offen
                $("#gewonnen-fields").hide();
                $("#verloren-fields").hide();
            }
        }
    });

    const form = document.getElementById('anbahnung-form');
    const validator = $("#anbahnung-form").kendoValidator().data("kendoValidator");

    // Abbrechen-Button
    document.getElementById('cancel-button').addEventListener('click', () => {
        window.history.back();
    });

    // Kundensuche
    document.getElementById('search-kunde-button').addEventListener('click', async () => {
        const currentKundenNr = $("#kunden-nr").data("kendoNumericTextBox").value() || "";
        if (currentKundenNr) {
            localStorage.setItem("currentKundenNr", currentKundenNr);
        }
        localStorage.setItem("sourcePage", "anbahnung");
        window.location.href = "../html/kunden.html";
    });

    // Daten laden und Felder setzen
    if (anbahnung) {
        $("#status").data("kendoDropDownList").value(anbahnung.Status ?? 'I');
        $("#anbahnungNr").data("kendoTextBox").value(anbahnung.AnbahnungNr ?? "");
        $("#beschreibung").data("kendoTextBox").value(anbahnung.Beschreibung ?? "");
        $("#kunden-nr").data("kendoNumericTextBox").value(anbahnung.KundenNr ?? 0);
        $("#kunde").data("kendoTextBox").value(anbahnung.Kunde ?? "");
        $("#abschlussdatum").data("kendoDatePicker").value(anbahnung.Abschlussdatum ?? null);
        $("#wahrscheinlichkeit").data("kendoNumericTextBox").value(anbahnung.Wahrscheinlichkeit ?? 0);
        $("#letzteTaetigkeitam").data("kendoDatePicker").value(anbahnung.letzteTaetigkeitam ?? null);
        $("#letzteAktion").data("kendoTextBox").value(anbahnung.letzteAktion ?? "");
        $("#terminDatum").data("kendoDatePicker").value(anbahnung.TerminDatum ?? null);
        $("#rating").data("kendoComboBox").value(anbahnung.RatingNr ?? "");
        $("#umsatzPlan").data("kendoNumericTextBox").value(anbahnung.UmsatzPlan ?? 0);
        $("#bruttonutzen").data("kendoNumericTextBox").value(anbahnung.Bruttonutzen ?? 0);
        $("#umsatzGewichtet").data("kendoNumericTextBox").value(anbahnung.UmsatzGewichtet ?? 0);
        $("#erstelltam").data("kendoDatePicker").value(anbahnung.erstelltam ?? null);
        $("#besitzerKZ").data("kendoTextBox").value(anbahnung.BesitzerKZ ?? "");

        // Statusgeschlossen numerisch in der DB
        const geschlossenVal = (anbahnung.Statusgeschlossen != null) ? anbahnung.Statusgeschlossen : 0;
        const statusCmb = $("#statusgeschlossen").data("kendoComboBox");
        statusCmb.value(geschlossenVal);

        // Felder entsprechend Status anzeigen
        if (geschlossenVal === 1) {
            // Gewonnen
            $("#gewonnen-fields").show();
            $("#verloren-fields").hide();
            $("#umsatzIst").data("kendoNumericTextBox").value(anbahnung.UmsatzIst ?? 0);
            $("#abschlussdatumGewonnen").data("kendoDatePicker").value(anbahnung.AbschlussdatumGewonnen ?? null);
            $("#GeschlossenVermerk").val(anbahnung.GeschlossenVermerk ?? "");
        } else if (geschlossenVal === 2) {
            // Verloren
            $("#gewonnen-fields").hide();
            $("#verloren-fields").show();
            $("#grund").data("kendoComboBox").value(anbahnung.Grundschluessel ?? "");
            $("#mitbewerber").data("kendoComboBox").value(anbahnung.MitbewerberNr ?? "");
        } else {
            // Offen
            $("#gewonnen-fields").hide();
            $("#verloren-fields").hide();
        }
    }

    // Formular absenden
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!validator.validate()) {
            return;
        }

        // Aktuellen Wert aus Statusgeschlossen-ComboBox ermitteln
        const statusCmb = $("#statusgeschlossen").data("kendoComboBox");
        const geschlossenVal = Number(statusCmb.value());

        let UmsatzIst = 0;
        let AbschlussdatumGewonnen = "";
        let GeschlossenVermerk = "";
        let Grundschluessel = null;
        let MitbewerberNr = null;

        // Falls "gewonnen" gewählt
        if (geschlossenVal === 1) {
            UmsatzIst = ($("#umsatzIst").data("kendoNumericTextBox").value() || 0) * 100;
            AbschlussdatumGewonnen = dateToString($("#abschlussdatumGewonnen").data("kendoDatePicker").value());
            GeschlossenVermerk = $("#GeschlossenVermerk").val().trim();
        }
        // Falls "verloren" gewählt
        else if (geschlossenVal === 2) {
            Grundschluessel = $("#grund").data("kendoComboBox").value() || null;
            const mitb = $("#mitbewerber").data("kendoComboBox").value();
            MitbewerberNr = mitb ? Number(mitb) : null;
        }

        const data = [{
            AnbahnungNr: anbahnungNr,
            Status: $("#status").data("kendoDropDownList").value(),
            Beschreibung: $("#beschreibung").data("kendoTextBox").value().trim(),
            KundenNr: $("#kunden-nr").data("kendoNumericTextBox").value() || null,
            Kunde: $("#kunde").data("kendoTextBox").value(),
            Abschlussdatum: dateToString($("#abschlussdatum").data("kendoDatePicker").value()),
            Wahrscheinlichkeit: $("#wahrscheinlichkeit").data("kendoNumericTextBox").value() || 0,
            UmsatzPlan: ($("#umsatzPlan").data("kendoNumericTextBox").value() || 0) * 100,
            Bruttonutzen: ($("#bruttonutzen").data("kendoNumericTextBox").value() || 0) * 100,
            RatingNr: $("#rating").data("kendoComboBox").value()
                ? Number($("#rating").data("kendoComboBox").value())
                : null,

            // Numerischer Statusgeschlossen
            Statusgeschlossen: geschlossenVal,

            // Gewonnen-Felder
            UmsatzIst: UmsatzIst,
            AbschlussdatumGewonnen: AbschlussdatumGewonnen,
            GeschlossenVermerk: GeschlossenVermerk,

            // Verloren-Felder
            Grundschluessel: Grundschluessel,
            MitbewerberNr: MitbewerberNr,

            letzteTaetigkeitam: dateToString($("#letzteTaetigkeitam").data("kendoDatePicker").value()),
            letzteAktion: $("#letzteAktion").data("kendoTextBox").value(),
            TerminDatum: dateToString($("#terminDatum").data("kendoDatePicker").value()),
            UmsatzGewichtet: $("#umsatzGewichtet").data("kendoNumericTextBox").value() || 0,
            erstelltam: dateToString($("#erstelltam").data("kendoDatePicker").value()),
            BesitzerKZ: $("#besitzerKZ").data("kendoTextBox").value()
        }];

        try {
            const sid = localStorage.getItem('SID');
            const response = await fetch(`${API_URL}${APP_RQ}&ARGUMENTS=-Aupdanbahnung`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'SID': sid
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`Fehler beim Aktualisieren der Anbahnung: ${response.status}`);
            }

            const result = await response.json();
            alert("Anbahnung erfolgreich aktualisiert!");

            let neuAnbahnungNr = anbahnungNr;
            if (Array.isArray(result) && result.length > 0 && result[0].AnbahnungNr) {
                neuAnbahnungNr = result[0].AnbahnungNr;
                localStorage.setItem("currentAnbahnungNr", neuAnbahnungNr);
            }

            await fetchAndStoreSingleAnbahnung(neuAnbahnungNr);
            window.location.href = "../html/anbahnungen.html";
        } catch (error) {
            console.error("Fehler beim Aktualisieren der Anbahnung:", error);
            alert("Fehler beim Aktualisieren. Bitte versuchen Sie es erneut.");
        }
    });
});

/**
 * Datum in "dd.MM.yyyy" umwandeln oder leeren String, falls date = null/undefined.
 */
function dateToString(date) {
    return date ? kendo.toString(date, "dd.MM.yyyy") : "";
}

/**
 * Lädt eine einzelne Anbahnung aus IndexedDB.
 */
async function loadAnbahnungFromIndexedDB(db, anbahnungNr) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['anbahnungen'], 'readonly');
        const store = transaction.objectStore('anbahnungen');
        const request = store.get(anbahnungNr);

        request.onsuccess = () => {
            resolve(request.result);
        };
        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

/**
 * Lädt Daten (z.B. grundverloren, mitbewerber) aus IndexedDB und belegt eine Kendo ComboBox.
 */
async function loadOptionsFromStore(db, storeName, valueField, textField, selectSelector, numericValue = false) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.openCursor();
        const data = [];

        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                let val = cursor.value[valueField];
                if (numericValue) {
                    val = Number(val);
                }
                const txt = cursor.value[textField];
                data.push({ text: txt, value: val });
                cursor.continue();
            } else {
                $(selectSelector).kendoComboBox({
                    dataTextField: "text",
                    dataValueField: "value",
                    clearButton: true,
                    placeholder: "Bitte auswählen...",
                    dataSource: data
                });
                resolve();
            }
        };

        request.onerror = (event) => {
            console.error(`Fehler beim Laden von ${storeName}:`, event.target.error);
            reject(event.target.error);
        };
    });
}

/**
 * Lädt eine einzelne Anbahnung von der REST-API und speichert sie in der IndexedDB.
 */
async function fetchAndStoreSingleAnbahnung(anbahnungNr) {
    const sid = localStorage.getItem('SID');
    const response = await fetch(`${API_URL}${APP_RQ}&ARGUMENTS=-Agetanbahnung`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'SID': sid
        },
        body: JSON.stringify({ AnbahnungNr: anbahnungNr })
    });

    if (!response.ok) {
        console.error("Fehler beim Abrufen der einzelnen Anbahnung:", response.statusText);
        return null;
    }

    const anbahnungData = await response.json();
    if (anbahnungData && anbahnungData.length > 0) {
        const db = await openIndexedDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['anbahnungen'], 'readwrite');
            const store = transaction.objectStore('anbahnungen');

            anbahnungData.forEach(entry => {
                store.put(entry);
            });

            transaction.oncomplete = () => resolve();
            transaction.onerror = (event) => reject(event.target.error);
        });
    } else {
        console.warn("Keine Anbahnungsdaten erhalten");
        return null;
    }
}
